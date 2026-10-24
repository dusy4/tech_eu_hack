/**
 * The room's listener: Claude Haiku 5.5 reads the conversation and acts on it with tool calls.
 *
 * Runs inside the Vite dev server, so ANTHROPIC_API_KEY never reaches the page. For code facts Haiku
 * calls the repo-analysis MCP server's read tools over streamable HTTP (find_symbol, symbol_relations,
 * search_code, …). Its own three tools are the outputs the room shows:
 *   propose_change   a decision to build, attached to the graph nodes it touches
 *   answer_question  a reply to a question someone asked about the code
 *   show_view        a graph worth drawing (blast radius, flow trace, call tree)
 *
 * POST /api/room/turn   TurnRequest → TurnResponse
 * GET  /api/room/status RoomStatus
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";
import type { Anchor, RoomCall, RoomItem, RoomNode, RoomStatus, TurnRequest, TurnResponse, ViewRequest } from "../src/engine/roomTypes.ts";

export type RoomConfig = { anthropicKey?: string; mcpUrl: string; graphUrl: string; repo: string };

const MODEL = "claude-haiku-5-5";
// One turn is a short burst of research: a few lookups, then the outputs. Past this it's stuck.
const MAX_ROUNDS = 6;
const TURN_MS = 45_000;
const TOOL_MS = 15_000;
// Tool results go back into Haiku's context; the MCP server already caps them at 20k chars.
const RESULT_CHARS = 6_000;
const MAX_BODY = 256 * 1024;

// The MCP tools Haiku may call: read-only, and the ones that ground a sentence in code.
// path_between is left out: it is the slowest tool, and a flow-trace view computes the same path.
const CODE_TOOLS = ["find_symbol", "search_code", "symbol_relations", "get_symbol_body", "get_enclosing_context"];

const SYSTEM = `You are Spelunk's listener. A software team is talking about a codebase in front of a live graph of its code. You read each new sentence of their conversation and act through tools. Nobody reads your text replies; only your tool calls reach the room.

What to do with the new lines (marked NEW):
- A decision, a feature request or a change someone wants ("we should…", "let's add…", "this needs a timeout") → research the code it touches, then call propose_change once per distinct change. Write the change so a coding agent can build it without hearing the conversation: what to add or modify, where, and the expected behaviour.
- A question about how the code works ("who calls…", "where does…", "does X…") → research it, then call answer_question with a short, specific answer (2-4 sentences) naming the symbols and files you found.
- A wish to see structure ("what breaks if we change X", "how does A get to B", "what does X call") → call show_view with the matching view.
- Small talk, agreement, or anything already covered → call nothing.

Rules:
- Ground every claim with the code tools before you use it. Prefer one or two precise lookups (find_symbol, symbol_relations) over broad searches. Never invent a symbol, file or caller.
- Anchors: name the graph nodes a proposal touches by their node id from the "On screen" list when they are on screen. Otherwise use the fully qualified symbol name you confirmed with find_symbol. Use at most 3 anchors.
- Act only on NEW lines; earlier lines were handled in earlier turns. A NEW line that agrees with, repeats or adds a detail to something under "Already proposed" is not a new proposal: call nothing for it.
- Keep titles short and imperative ("Add a timeout to approval requests").
- Questions in "ask" mode are addressed to you directly: always act. A structural question ("how does A reach B", "what breaks if we change X", "what does X call") gets show_view, which is drawn immediately, plus a one-line answer_question; any other question gets answer_question.`;

const anchorList = z.array(z.string().min(1).max(300)).max(3);

const ProposeInput = z.object({
  utterance_id: z.string(),
  title: z.string().min(3).max(120),
  why: z.string().max(400),
  change: z.string().min(10).max(1200),
  anchors: anchorList,
});
const AnswerInput = z.object({
  utterance_id: z.string(),
  question: z.string().min(3).max(400),
  answer: z.string().min(3).max(1500),
  sources: anchorList.optional(),
});
const ViewInput = z.object({
  utterance_id: z.string(),
  view: z.enum(["blast-radius", "flow-trace", "call-tree"]),
  symbol: z.string().max(300).optional(),
  source: z.string().max(300).optional(),
  target: z.string().max(300).optional(),
  title: z.string().min(3).max(120),
  why: z.string().max(400),
});

const OUTPUT_TOOLS: Anthropic.Tool[] = [
  {
    name: "propose_change",
    description:
      "Put a decision or change the team discussed on the graph as a proposal people accept or decline. Accepted proposals go to the team's coding agent, so `change` must stand on its own.",
    input_schema: {
      type: "object",
      properties: {
        utterance_id: { type: "string", description: "Id of the NEW line that led to this proposal." },
        title: { type: "string", description: "Short imperative title, under 80 characters." },
        why: { type: "string", description: "One sentence: why the team wants it, in their terms." },
        change: { type: "string", description: "What to build or modify, where, and the expected behaviour. 1-3 sentences." },
        anchors: { type: "array", items: { type: "string" }, description: "Node ids on screen, or fully qualified symbols, this change touches (max 3)." },
      },
      required: ["utterance_id", "title", "why", "change", "anchors"],
      additionalProperties: false,
    },
  },
  {
    name: "answer_question",
    description: "Answer a question someone asked about the code, after checking it with the code tools.",
    input_schema: {
      type: "object",
      properties: {
        utterance_id: { type: "string" },
        question: { type: "string", description: "The question, restated clearly." },
        answer: { type: "string", description: "2-4 sentences naming the symbols and files." },
        sources: { type: "array", items: { type: "string" }, description: "Node ids or qualified symbols the answer relies on (max 3)." },
      },
      required: ["utterance_id", "question", "answer"],
      additionalProperties: false,
    },
  },
  {
    name: "show_view",
    description:
      "Offer a graph of the code: blast-radius (what depends on `symbol`), flow-trace (how `source` reaches `target`), call-tree (what `symbol` calls).",
    input_schema: {
      type: "object",
      properties: {
        utterance_id: { type: "string" },
        view: { type: "string", enum: ["blast-radius", "flow-trace", "call-tree"] },
        symbol: { type: "string", description: "For blast-radius and call-tree: a confirmed symbol name." },
        source: { type: "string", description: "For flow-trace: where the path starts." },
        target: { type: "string", description: "For flow-trace: where it ends." },
        title: { type: "string" },
        why: { type: "string" },
      },
      required: ["utterance_id", "view", "title", "why"],
      additionalProperties: false,
    },
  },
];

// ── MCP client: one connection, reopened when it breaks ─────────────────────

let mcp: { client: Client; tools: Anthropic.Tool[]; url: string } | undefined;
let mcpConnecting: Promise<typeof mcp> | undefined;

async function connectMcp(url: string) {
  if (mcp?.url === url) return mcp;
  if (mcpConnecting) return mcpConnecting;
  mcpConnecting = (async () => {
    const client = new Client({ name: "spelunk-room", version: "1.0.0" });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", url)));
      const listed = await client.listTools(undefined, { timeout: TOOL_MS });
      const tools = listed.tools
        .filter((t) => CODE_TOOLS.includes(t.name))
        .map((t) => ({ name: t.name, description: (t.description ?? "").slice(0, 800), input_schema: t.inputSchema as Anthropic.Tool.InputSchema }));
      mcp = { client, tools, url };
      return mcp;
    } catch {
      await client.close().catch(() => {});
      return undefined;
    } finally {
      mcpConnecting = undefined;
    }
  })();
  return mcpConnecting;
}

function dropMcp() {
  const old = mcp;
  mcp = undefined;
  old?.client.close().catch(() => {});
}

async function callMcp(url: string, name: string, args: Record<string, unknown>): Promise<{ text: string; ok: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const conn = await connectMcp(url);
    if (!conn) return { text: "The code index is unreachable right now.", ok: false };
    try {
      const r = await conn.client.callTool({ name, arguments: args }, undefined, { timeout: TOOL_MS });
      const text = (Array.isArray(r.content) ? r.content : [])
        .map((c: { type: string; text?: string }) => (c.type === "text" ? c.text ?? "" : ""))
        .join("\n");
      return { text: text.slice(0, RESULT_CHARS) || "(empty result)", ok: !r.isError };
    } catch (e) {
      // A dropped session (server restart) gets one reconnect; a tool error doesn't.
      dropMcp();
      if (attempt === 1) return { text: `Tool failed: ${e instanceof Error ? e.message : String(e)}`, ok: false };
    }
  }
  return { text: "Tool failed.", ok: false };
}

// ── Anchors: from what Haiku names to nodes on screen or symbols in the index ──

const lastPart = (s: string) => s.split("::").slice(-2).join("::");

function matchNode(name: string, nodes: RoomNode[]): RoomNode | undefined {
  const n = name.trim();
  if (!n) return undefined;
  const lower = n.toLowerCase();
  return (
    nodes.find((x) => x.id === n) ??
    nodes.find((x) => x.label.toLowerCase() === lower) ??
    // "rust_agent_core::tool::ApprovalRequiredTool" vs the label "tool::ApprovalRequiredTool"
    nodes.find((x) => lower.endsWith(`::${x.label.toLowerCase()}`) || x.label.toLowerCase().endsWith(`::${lower}`)) ??
    nodes.find((x) => lastPart(x.label).toLowerCase() === lastPart(n).toLowerCase())
  );
}

async function resolveAnchors(names: string[], nodes: RoomNode[], mcpUrl: string, grounded: boolean): Promise<Anchor[]> {
  const out: Anchor[] = [];
  for (const name of [...new Set(names.map((s) => s.trim()).filter(Boolean))].slice(0, 3)) {
    const node = matchNode(name, nodes);
    if (node) {
      out.push({ nodeId: node.id, symbol: node.label, file: node.file });
      continue;
    }
    if (!grounded) continue;
    const r = await callMcp(mcpUrl, "find_symbol", { name: name.replace(/^sym:/, ""), limit: 1 });
    try {
      const m = (JSON.parse(r.text) as { matches?: { qualified_name?: string; path?: string; range?: { start_line?: number } }[] }).matches?.[0];
      // Only symbols the index actually has: an unknown name would put a made-up node on the graph.
      if (m?.qualified_name) out.push({ symbol: m.qualified_name, file: m.path, line: m.range?.start_line });
    } catch {
      /* not JSON: the tool failed, so the anchor is dropped */
    }
  }
  return out;
}

function viewRequest(v: z.infer<typeof ViewInput>): ViewRequest | undefined {
  if (v.view === "flow-trace") return v.source && v.target ? { view: v.view, source: v.source, target: v.target } : undefined;
  return v.symbol ? { view: v.view, symbol: v.symbol } : undefined;
}

// ── One turn ────────────────────────────────────────────────────────────────

const TurnSchema = z.object({
  repo: z.string().min(1).max(200),
  view: z.object({
    title: z.string().max(400),
    question: z.string().max(400),
    nodes: z.array(z.object({ id: z.string().max(300), label: z.string().max(300), kind: z.string().max(40), file: z.string().max(400).optional() })).max(200),
  }),
  transcript: z.array(z.object({ id: z.string().max(100), speaker: z.string().max(60), text: z.string().max(2000) })).min(1).max(40),
  fresh: z.array(z.string().max(100)).min(1).max(40),
  open: z.array(z.string().max(200)).max(60),
  mode: z.enum(["listen", "ask"]),
});

function prompt(req: TurnRequest): string {
  const fresh = new Set(req.fresh);
  const nodes = req.view.nodes.map((n) => `- ${n.id} | ${n.label} | ${n.kind}${n.file ? ` | ${n.file}` : ""}`).join("\n");
  const lines = req.transcript.map((u) => `${fresh.has(u.id) ? "NEW " : ""}[${u.id}] ${u.speaker}: ${u.text}`).join("\n");
  return [
    `Repo: ${req.repo}`,
    `Mode: ${req.mode}`,
    "",
    `On screen: "${req.view.title}" (${req.view.question})`,
    nodes || "(no nodes)",
    "",
    "Already proposed:",
    req.open.length ? req.open.map((t) => `- ${t}`).join("\n") : "(nothing yet)",
    "",
    "Conversation, oldest first:",
    lines,
  ].join("\n");
}

export async function runTurn(cfg: RoomConfig, req: TurnRequest, signal: AbortSignal): Promise<TurnResponse> {
  const started = Date.now();
  const anthropic = new Anthropic({ apiKey: cfg.anthropicKey, timeout: 30_000, maxRetries: 1 });
  const conn = await connectMcp(cfg.mcpUrl);
  const grounded = !!conn;
  const tools = [...(conn?.tools ?? []), ...OUTPUT_TOOLS];
  const calls: RoomCall[] = [];
  const items: RoomItem[] = [];
  const known = new Set(req.transcript.map((u) => u.id));
  // An utterance id Haiku made up falls back to the newest line, so every item still points at what was said.
  const fromId = (id: string) => (known.has(id) ? id : req.fresh[req.fresh.length - 1]);
  let seq = 0;
  const itemId = () => `rm-${started.toString(36)}-${seq++}`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt(req) }];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (signal.aborted) break;
    const response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        system: SYSTEM,
        tools,
        messages,
      },
      { signal },
    );
    // A refusal can cut a tool call off mid-input; never act on that turn.
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") break;
    const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (uses.length === 0) break;
    messages.push({ role: "assistant", content: response.content });

    // Lookups run in parallel; all results go back in one message.
    const results = await Promise.all(
      uses.map(async (use): Promise<Anthropic.ToolResultBlockParam> => {
        const input = (use.input ?? {}) as Record<string, unknown>;
        const reply = (content: string, isError = false): Anthropic.ToolResultBlockParam => ({ type: "tool_result", tool_use_id: use.id, content, is_error: isError || undefined });

        if (use.name === "propose_change") {
          const p = ProposeInput.safeParse(input);
          if (!p.success) return reply(`Invalid input: ${p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, true);
          const anchors = await resolveAnchors(p.data.anchors, req.view.nodes, cfg.mcpUrl, grounded);
          items.push({ type: "proposal", id: itemId(), from: fromId(p.data.utterance_id), kind: "change", title: p.data.title, why: p.data.why, change: p.data.change, anchors });
          return reply(anchors.length ? `Proposed, attached to ${anchors.map((a) => a.symbol).join(", ")}.` : "Proposed (no anchor resolved: name symbols you confirmed).");
        }
        if (use.name === "answer_question") {
          const p = AnswerInput.safeParse(input);
          if (!p.success) return reply(`Invalid input: ${p.error.issues.map((i) => i.message).join("; ")}`, true);
          const sources = await resolveAnchors(p.data.sources ?? [], req.view.nodes, cfg.mcpUrl, grounded);
          items.push({ type: "answer", id: itemId(), from: fromId(p.data.utterance_id), question: p.data.question, answer: p.data.answer, sources });
          return reply("Answer shown to the room.");
        }
        if (use.name === "show_view") {
          const p = ViewInput.safeParse(input);
          const view = p.success ? viewRequest(p.data) : undefined;
          if (!p.success || !view) return reply("Invalid input: blast-radius and call-tree need `symbol`; flow-trace needs `source` and `target`.", true);
          const names = view.view === "flow-trace" ? [view.source, view.target] : [view.symbol];
          items.push({ type: "proposal", id: itemId(), from: fromId(p.data.utterance_id), kind: "view", title: p.data.title, why: p.data.why, anchors: await resolveAnchors(names, req.view.nodes, cfg.mcpUrl, grounded), view });
          return reply("View offered to the room.");
        }
        if (!CODE_TOOLS.includes(use.name) || !grounded) return reply(`Unknown tool ${use.name}.`, true);
        const t0 = Date.now();
        const r = await callMcp(cfg.mcpUrl, use.name, input);
        calls.push({ tool: use.name, arg: String(input.symbol ?? input.name ?? input.query ?? input.source ?? ""), ms: Date.now() - t0, ok: r.ok });
        return reply(r.text, !r.ok);
      }),
    );
    messages.push({ role: "user", content: results });
    // Once the outputs are in, the turn is done: another round would only re-confirm them.
    if (uses.every((u) => OUTPUT_TOOLS.some((t) => t.name === u.name))) break;
  }
  return { items, calls, model: MODEL, grounded, ms: Date.now() - started };
}

// ── HTTP ────────────────────────────────────────────────────────────────────

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("Request body too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Body is not JSON"));
      }
    });
    req.on("error", reject);
  });
}

const send = (res: ServerResponse, status: number, body: unknown) => {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
};

async function reachable(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function status(cfg: RoomConfig): Promise<RoomStatus> {
  const [mcpOk, graph] = await Promise.all([reachable(new URL("/health", cfg.mcpUrl).href), reachable(new URL("/api/v1/health", cfg.graphUrl).href)]);
  return { haiku: !!cfg.anthropicKey, mcp: mcpOk, graph, repo: cfg.repo, model: MODEL };
}

export function roomHandler(cfg: RoomConfig) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = (req.url ?? "").split("?")[0];
    if (path === "/status" && req.method === "GET") return send(res, 200, await status(cfg));
    if (path !== "/turn") return next();
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });
    if (!cfg.anthropicKey) return send(res, 503, { error: "ANTHROPIC_API_KEY is not set" });

    let body: TurnRequest;
    try {
      const parsed = TurnSchema.safeParse(await readJson(req));
      if (!parsed.success) return send(res, 400, { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      body = parsed.data;
    } catch (e) {
      return send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    if (!body.fresh.every((id) => body.transcript.some((u) => u.id === id))) return send(res, 400, { error: "fresh ids must be in the transcript" });

    // The page going away (or a newer turn replacing this one) cancels the model call.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TURN_MS);
    res.on("close", () => {
      if (!res.writableEnded) ctrl.abort();
    });
    try {
      send(res, 200, await runTurn(cfg, body, ctrl.signal));
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return send(res, 503, { error: "The Anthropic key was rejected" });
      if (e instanceof Anthropic.RateLimitError) return send(res, 429, { error: "Rate limited by the Anthropic API, try again shortly" });
      if (e instanceof Anthropic.APIUserAbortError || ctrl.signal.aborted) return send(res, 504, { error: "The listener took too long" });
      if (e instanceof Anthropic.APIError) return send(res, 502, { error: `Anthropic API error ${e.status ?? ""}`.trim() });
      send(res, 500, { error: e instanceof Error ? e.message : String(e) });
    } finally {
      clearTimeout(timer);
    }
  };
}

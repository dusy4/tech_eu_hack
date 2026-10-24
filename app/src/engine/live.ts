import type { Recording, ToolCall, ViewSpec } from "../data/types";
import type { RoomStatus, TurnRequest, TurnResponse, ViewRequest } from "./roomTypes";

/**
 * The live backends, all on the page's own origin (the dev server proxies them, see vite.config.ts):
 *   /api/room      the listener: Claude Haiku 5.5 with the repo-analysis MCP tools
 *   /api/graph     repo-graph-api: ready-to-draw views and code bodies of the indexed repo
 *   /api/handoffs  the MCP server's handoff store, which the team's coding agent reads
 */

export const LIVE_REPO: string = __SPELUNK_REPO__;

export class LiveError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function json<T>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const r = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(init?.timeoutMs ?? 20_000) });
  const body = await r.json().catch(() => undefined);
  if (!r.ok) {
    // repo-graph-api errors are {error: {message}}, the dev-server routes' are {error: "…"}.
    const e = (body as { error?: string | { message?: string } } | undefined)?.error;
    throw new LiveError(typeof e === "string" ? e : e?.message ?? `${url} answered ${r.status}`, r.status);
  }
  return body as T;
}

export const roomStatus = () =>
  json<RoomStatus>("/api/room/status", { timeoutMs: 8000 }).catch((): RoomStatus => ({ haiku: false, mcp: false, graph: false, model: "claude-haiku-5-5" }));

export const roomTurn = (req: TurnRequest, signal: AbortSignal) =>
  json<TurnResponse>("/api/room/turn", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req), signal });

// ── Views from the real index ───────────────────────────────────────────────

const graphBase = () => `/api/graph/repos/${encodeURIComponent(LIVE_REPO)}`;

// repo-graph-api names its calls after the workbench tools; the Agent run panel knows these.
const CALL_NAMES: Record<string, ToolCall["tool"]> = {
  "find-symbol": "find-symbol",
  "callers-of": "callers-of",
  "path-between": "path-between",
  "callees-of": "callees-of",
  "search-code": "search-lexical",
};

/**
 * Makes an API view drawable by the canvas: flow traces mark off-path calls as context and hang
 * them on the caller they branch from, the way the recorded answers do.
 */
export function normalise(rec: Recording): Recording {
  const spec: ViewSpec = { ...rec.spec, nodes: rec.spec.nodes.map((n) => ({ ...n, meta: { ...n.meta } })) };
  if (spec.archetype === "flowTrace") {
    const onPath = new Set(spec.nodes.filter((n) => n.meta?.onPath !== false).map((n) => n.id));
    for (const n of spec.nodes) {
      if (onPath.has(n.id)) continue;
      const parent = spec.edges.find((e) => e.to === n.id && onPath.has(e.from))?.from;
      n.meta = { ...n.meta, context: true, parent };
    }
    // Context nodes the path never branches to would float unattached; they aren't drawn.
    spec.nodes = spec.nodes.filter((n) => !n.meta?.context || n.meta.parent);
  }
  if (spec.steps.length === 0) spec.steps = [{ id: "all", focus: spec.nodes.slice(0, 1).map((n) => n.id), caption: spec.summary }];
  const ids = new Set(spec.nodes.map((n) => n.id));
  spec.edges = spec.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  spec.steps = spec.steps.map((s) => ({ ...s, focus: s.focus.filter((id) => ids.has(id)) }));
  const calls = rec.calls.map((c) => ({ ...c, tool: CALL_NAMES[c.tool] ?? c.tool, reveals: c.reveals.filter((id) => ids.has(id)) }));
  return { spec, calls, live: true };
}

export async function liveView(req: ViewRequest, question?: string): Promise<Recording> {
  const qs = new URLSearchParams(req.view === "flow-trace" ? { source: req.source, target: req.target } : { symbol: req.symbol });
  if (question) qs.set("question", question);
  if (req.view === "blast-radius") qs.set("max_nodes", "40");
  const rec = await json<Recording>(`${graphBase()}/views/${req.view}?${qs}`, { timeoutMs: 45_000 });
  if (!rec?.spec?.nodes?.length) throw new LiveError("That view came back empty.", 404);
  return normalise(rec);
}

export type SymbolBody = {
  symbol: { qualified_name: string; path: string; line: number; end_line: number; signature?: string; kind: string; crate_label?: string };
  code: string;
  code_kind: string;
};

const bodies = new Map<string, Promise<SymbolBody>>();
export function symbolBody(id: string): Promise<SymbolBody> {
  let p = bodies.get(id);
  if (!p) {
    p = json<SymbolBody>(`${graphBase()}/symbols/${encodeURIComponent(id)}/body`);
    // A failed fetch is retried next time instead of being cached.
    p.catch(() => bodies.delete(id));
    bodies.set(id, p);
  }
  return p;
}

// ── Handoffs ────────────────────────────────────────────────────────────────

export type HandoffState = { id: string; status: "open" | "in_progress" | "done" | "dismissed"; note?: string };

export async function handoffState(id: string): Promise<HandoffState> {
  const doc = await json<{ id: string; status: HandoffState["status"]; history?: { note?: string }[] }>(`/api/handoffs/${encodeURIComponent(id)}`, { timeoutMs: 8000 });
  return { id: doc.id, status: doc.status, note: doc.history?.[doc.history.length - 1]?.note || undefined };
}

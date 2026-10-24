import { SYMBOLS, CALLERS_OF_CALLERS, REPO } from "../data/repo";
import { route } from "../engine/router";

/**
 * Code knowledge: the one seam between this UI and whatever indexes the repo
 * (embeddings, an MCP server, or both). The tool names match docs/swe-demo-plan.md.
 *
 * Everything here is mock: it answers from the sample index in data/repo.ts.
 * The real backend implements `KnowledgeBackend` and is swapped in with `setBackend`.
 */

export type CodeHit = { symbol: string; file: string; line: number; score: number; snippet: string };
export type SymbolInfo = { symbol: string; file: string; start: number; code: string; callers: string[]; tests: string[] };

export interface KnowledgeBackend {
  /** Semantic search over code chunks (embeddings). */
  searchCode(query: string, k?: number): Promise<CodeHit[]>;
  findSymbol(name: string): Promise<SymbolInfo | undefined>;
  callersOf(name: string): Promise<string[]>;
}

/** One step of how an answer was reached, as the chat shows it. */
export type AnswerEvent =
  | { type: "tool"; tool: "search-code" | "find-symbol" | "callers-of" | "read-symbol"; arg: string; hits?: CodeHit[]; symbol?: SymbolInfo; callers?: string[] }
  | { type: "text"; delta: string }
  | { type: "sources"; files: { file: string; symbol: string; line: number }[] }
  | { type: "view"; recordingId: string; title: string }
  | { type: "done" };

// ── Mock backend ────────────────────────────────────────────────────────────

const words = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mock: KnowledgeBackend = {
  async searchCode(query, k = 4) {
    await wait(380);
    const q = new Set(words(query));
    return Object.values(SYMBOLS)
      .map((s) => {
        const doc = words(`${s.id} ${s.file} ${s.code}`);
        const overlap = doc.filter((w) => q.has(w)).length;
        // A believable cosine-ish score: mostly 0.6–0.9 for real overlaps.
        const score = overlap ? Math.min(0.93, 0.58 + overlap * 0.05) : 0.41 + (s.id.length % 7) / 100;
        return { symbol: s.id, file: s.file, line: s.start, score: Math.round(score * 100) / 100, snippet: s.code.split("\n").slice(0, 3).join("\n") };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  },
  async findSymbol(name) {
    await wait(220);
    const s = SYMBOLS[name];
    return s && { symbol: s.id, file: s.file, start: s.start, code: s.code, callers: s.callers, tests: s.tests };
  },
  async callersOf(name) {
    await wait(260);
    return SYMBOLS[name]?.callers ?? CALLERS_OF_CALLERS[name] ?? [];
  },
};

let backend: KnowledgeBackend = mock;
export const setBackend = (b: KnowledgeBackend) => (backend = b);
export const isMock = () => backend === mock;

// ── Answering ───────────────────────────────────────────────────────────────

const symbolIn = (text: string) =>
  Object.keys(SYMBOLS)
    .sort((a, b) => b.length - a.length)
    .find((s) => text.toLowerCase().includes(s.toLowerCase()));

/**
 * Answers a question by calling the knowledge tools and narrating what they found.
 * The narration is templated from the tool results; in the product an LLM writes it.
 */
export async function* answer(question: string): AsyncGenerator<AnswerEvent> {
  const hits = await backend.searchCode(question);
  yield { type: "tool", tool: "search-code", arg: question, hits };

  const name = symbolIn(question) ?? hits[0]?.symbol;
  const sym = name ? await backend.findSymbol(name) : undefined;
  if (sym) yield { type: "tool", tool: "read-symbol", arg: sym.symbol, symbol: sym };

  const callers = sym ? await backend.callersOf(sym.symbol) : [];
  if (sym) yield { type: "tool", tool: "callers-of", arg: sym.symbol, callers };

  const lines = sym
    ? [
        `**${sym.symbol}** lives in \`${sym.file}\` at line ${sym.start}.`,
        callers.length ? ` It's called from ${callers.slice(0, 3).map((c) => `\`${c}\``).join(", ")}${callers.length > 3 ? ` and ${callers.length - 3} more` : ""}.` : " Nothing in the index calls it directly.",
        sym.tests.length ? ` ${sym.tests.length} test file${sym.tests.length > 1 ? "s" : ""} cover it, starting with \`${sym.tests[0]}\`.` : " No tests reference it by name.",
        ` The closest other matches were ${hits
          .filter((h) => h.symbol !== sym.symbol)
          .slice(0, 2)
          .map((h) => `\`${h.symbol}\``)
          .join(" and ")}.`,
      ]
    : [`I couldn't pin this to one symbol in ${REPO.slug}. The nearest code is \`${hits[0]?.symbol}\` in \`${hits[0]?.file}\`.`];

  for (const line of lines)
    for (const chunk of line.match(/.{1,14}(\s|$)|.+/g) ?? []) {
      await wait(28);
      yield { type: "text", delta: chunk };
    }

  yield {
    type: "sources",
    files: [...(sym ? [{ file: sym.file, symbol: sym.symbol, line: sym.start }] : []), ...hits.filter((h) => h.symbol !== sym?.symbol).slice(0, 2).map((h) => ({ file: h.file, symbol: h.symbol, line: h.line }))],
  };

  const r = route(question, sym?.symbol);
  if (r.kind === "answer") yield { type: "view", recordingId: r.recording.spec.id, title: r.recording.spec.title };
  yield { type: "done" };
}

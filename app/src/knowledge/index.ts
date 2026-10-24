import { LIVE_REPO } from "../engine/live";
import type { ViewRequest } from "../engine/roomTypes";
import { graphBackend } from "./http";

/**
 * Code knowledge: the one seam between the chat and the index of the repo
 * (repo-graph-api, proxied by the dev server at /api/graph).
 */

export type CodeHit = { id: string; symbol: string; file: string; line: number; score: number; snippet: string };
export type SymbolInfo = { id: string; symbol: string; file: string; start: number; code: string; callers: string[]; tests: string[] };

export interface KnowledgeBackend {
  /** Keyword search over symbols and code bodies (the MCP server's search_code). */
  searchCode(query: string, k?: number): Promise<CodeHit[]>;
  /** By name or by API id. */
  findSymbol(nameOrId: string): Promise<SymbolInfo | undefined>;
  /** By API id. */
  callersOf(id: string): Promise<string[]>;
}

/** One step of how an answer was reached, as the chat shows it. */
export type AnswerEvent =
  | { type: "tool"; tool: "search-code" | "find-symbol" | "callers-of" | "read-symbol"; arg: string; hits?: CodeHit[]; symbol?: SymbolInfo; callers?: string[] }
  | { type: "text"; delta: string }
  | { type: "sources"; files: { file: string; symbol: string; line: number }[] }
  | { type: "view"; view: ViewRequest; title: string }
  | { type: "error"; message: string }
  | { type: "done" };

let backend: KnowledgeBackend = graphBackend(`/api/graph/repos/${encodeURIComponent(LIVE_REPO)}`);
export const setBackend = (b: KnowledgeBackend) => (backend = b);

/**
 * Answers a question by calling the knowledge tools and narrating what they found.
 * The narration is templated from the tool results.
 */
export async function* answer(question: string): AsyncGenerator<AnswerEvent> {
  try {
    const hits = await backend.searchCode(question);
    yield { type: "tool", tool: "search-code", arg: question, hits };
    if (!hits.length) {
      yield { type: "text", delta: `Nothing in ${LIVE_REPO} matches that. Try a symbol or file name.` };
      yield { type: "done" };
      return;
    }

    const sym = await backend.findSymbol(hits[0].id);
    if (sym) yield { type: "tool", tool: "read-symbol", arg: sym.symbol, symbol: sym };

    const callers = sym ? await backend.callersOf(sym.id) : [];
    if (sym) yield { type: "tool", tool: "callers-of", arg: sym.symbol, callers };

    const others = hits.filter((h) => h.id !== sym?.id).slice(0, 2);
    const lines = sym
      ? [
          `**${sym.symbol}** lives in \`${sym.file}\` at line ${sym.start}.`,
          callers.length ? ` It's called from ${callers.slice(0, 3).map((c) => `\`${c}\``).join(", ")}${callers.length > 3 ? ` and ${callers.length - 3} more` : ""}.` : " Nothing in the index calls it directly.",
          others.length ? ` The closest other matches were ${others.map((h) => `\`${h.symbol}\``).join(" and ")}.` : "",
        ]
      : [`The nearest code is \`${hits[0].symbol}\` in \`${hits[0].file}\`.`];

    for (const line of lines) for (const chunk of line.match(/.{1,14}(\s|$)|.+/g) ?? []) yield { type: "text", delta: chunk };

    yield {
      type: "sources",
      files: [...(sym ? [{ file: sym.file, symbol: sym.symbol, line: sym.start }] : []), ...others.map((h) => ({ file: h.file, symbol: h.symbol, line: h.line }))],
    };
    if (sym) yield { type: "view", view: { view: "blast-radius", symbol: sym.id }, title: `What breaks if ${sym.symbol} changes` };
  } catch (e) {
    yield { type: "error", message: `The code index didn't answer: ${(e as Error).message}` };
  }
  yield { type: "done" };
}

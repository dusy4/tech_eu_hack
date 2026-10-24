import type { CodeHit, KnowledgeBackend, SymbolInfo } from "./index";

type ApiSymbol = { id: string; qualified_name: string; display_name?: string; path: string; line: number; end_line: number };

/**
 * KnowledgeBackend over repo-graph-api (/api/v1), which the dev server proxies at `base`.
 * Symbols are named by their display name; their API id travels along for follow-up calls.
 */
export function graphBackend(base: string): KnowledgeBackend {
  async function get<T>(route: string): Promise<T> {
    const r = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(20_000) });
    const body = await r.json().catch(() => undefined);
    if (!r.ok) {
      const e = (body as { error?: { message?: string } } | undefined)?.error;
      throw new Error(e?.message ?? `${route} answered ${r.status}`);
    }
    return body as T;
  }
  const name = (s: { display_name?: string; qualified_name: string }) => s.display_name ?? s.qualified_name;

  return {
    async searchCode(query, k = 4) {
      const res = await get<{ items: { symbol_id: string; qualified_name: string; display_name?: string; path: string; line: number; score: number; preview?: string }[] }>(
        `/search?q=${encodeURIComponent(query)}&limit=${k}`,
      );
      // Scores are BM25, unbounded; scaled to the top hit so the chat can show them as 0–1.
      const top = Math.max(...res.items.map((h) => h.score), 1);
      return res.items.map<CodeHit>((h) => ({ id: h.symbol_id, symbol: name(h), file: h.path, line: h.line, score: Math.round((h.score / top) * 100) / 100, snippet: h.preview ?? "" }));
    },
    async findSymbol(nameOrId) {
      const sym = nameOrId.startsWith("sym:")
        ? { id: nameOrId }
        : (await get<{ items: ApiSymbol[] }>(`/symbols/find?name=${encodeURIComponent(nameOrId)}&limit=1`)).items[0];
      if (!sym) return undefined;
      const body = await get<{ symbol: ApiSymbol; code: string }>(`/symbols/${encodeURIComponent(sym.id)}/body`);
      return { id: body.symbol.id, symbol: name(body.symbol), file: body.symbol.path, start: body.symbol.line, code: body.code, callers: [], tests: [] } satisfies SymbolInfo;
    },
    async callersOf(id) {
      const res = await get<{ items: { symbol?: ApiSymbol; qualified_name: string }[] }>(`/symbols/${encodeURIComponent(id)}/relations/callers?limit=20`);
      return res.items.map((c) => (c.symbol ? name(c.symbol) : c.qualified_name));
    },
  };
}

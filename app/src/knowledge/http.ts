import type { CodeHit, KnowledgeBackend, SymbolInfo } from "./index";

/**
 * KnowledgeBackend over the bridge server (bridge/server.py).
 * Routes and shapes are specified in docs/backend-contract.md.
 */
export function httpBackend(baseUrl: string): KnowledgeBackend {
  const base = baseUrl.replace(/\/+$/, "");

  async function post<T>(route: string, body: object): Promise<T> {
    const r = await fetch(`${base}${route}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const detail = await r.json().catch(() => ({}));
      throw new Error(`${route} failed (${r.status}): ${detail.error ?? r.statusText}`);
    }
    return r.json();
  }

  return {
    searchCode: (query, k = 4) => post<CodeHit[]>("/search-code", { query, k }),
    findSymbol: async (name) => (await post<SymbolInfo | null>("/find-symbol", { name })) ?? undefined,
    callersOf: (name) => post<string[]>("/callers-of", { name }),
  };
}

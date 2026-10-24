import type { ViewSpec } from "../data/types";
import type { Suggestion } from "../engine/suggest";

/**
 * Seam for jev (json-render): fast graph decisions built from what the room is saying.
 *
 * jev turns the conversation into JSON, either a whole view (a ViewSpec, the contract in
 * data/types.ts that the graph already draws) or proposals for the current one. Until it is
 * connected, engine/suggest.ts produces the same proposals from a keyword matcher.
 */

export type JevMessage =
  | { kind: "view"; spec: ViewSpec }
  | { kind: "proposals"; proposals: Suggestion[] };

/** Narrow untrusted JSON from jev to something the UI can draw; undefined when it doesn't fit. */
export function readJev(json: unknown): JevMessage | undefined {
  if (!json || typeof json !== "object") return undefined;
  const m = json as Record<string, unknown>;
  if (m.kind === "view") {
    const s = m.spec as Partial<ViewSpec> | undefined;
    if (s && typeof s.id === "string" && typeof s.archetype === "string" && Array.isArray(s.nodes) && Array.isArray(s.edges) && Array.isArray(s.steps)) {
      return { kind: "view", spec: s as ViewSpec };
    }
  }
  if (m.kind === "proposals" && Array.isArray(m.proposals)) {
    const proposals = (m.proposals as Suggestion[]).filter((p) => p && typeof p.id === "string" && (p.kind === "focus" || p.kind === "ask"));
    return { kind: "proposals", proposals };
  }
  return undefined;
}

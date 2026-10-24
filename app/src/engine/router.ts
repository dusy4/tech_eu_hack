import { RECORDINGS, blastRecording } from "../data/answers";
import { SYMBOLS, CALLERS_OF_CALLERS } from "../data/repo";
import type { Recording } from "../data/types";

export type Routed =
  | { kind: "answer"; recording: Recording }
  | { kind: "speed"; value: number }
  | { kind: "focus"; nodeId: string }
  | { kind: "unknown"; text: string };

const known = new Set([...Object.keys(SYMBOLS), ...Object.keys(CALLERS_OF_CALLERS)]);

function findSymbol(text: string): string | undefined {
  const lower = text.toLowerCase();
  return [...known].sort((a, b) => b.length - a.length).find((s) => lower.includes(s.toLowerCase()));
}

/**
 * Stands in for the harness's intent step: maps a spoken or typed question to a
 * recorded answer, or a follow-up to a patch of the current view.
 */
export function route(text: string, selected?: string): Routed {
  const t = text.toLowerCase().trim();
  if (/\b(slow(er)?|half speed)\b/.test(t)) return { kind: "speed", value: 0.5 };
  if (/\b(fast(er)?|speed (it )?up|double speed)\b/.test(t)) return { kind: "speed", value: 2 };
  if (/normal speed/.test(t)) return { kind: "speed", value: 1 };

  if (/(break|blast|impact|affect|depends on|callers)/.test(t)) {
    const sym = findSymbol(t) ?? (/\b(this|it)\b/.test(t) ? selected : undefined) ?? "commitRoot";
    return { kind: "answer", recording: blastRecording(sym) };
  }
  if (/(tree|render phase|fiber|beginwork|completework|bail)/.test(t)) {
    return { kind: "answer", recording: RECORDINGS[1] };
  }
  if (/(deeper|zoom|focus|show me) /.test(t)) {
    const sym = findSymbol(t);
    if (sym) return { kind: "focus", nodeId: sym };
  }
  if (/(setstate|set state|update the screen|reach(es)? the dom|re-?render|state update|usestate|click)/.test(t)) {
    return { kind: "answer", recording: RECORDINGS[0] };
  }
  return { kind: "unknown", text };
}

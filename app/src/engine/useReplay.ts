import { useEffect, useState } from "react";
import type { Recording } from "../data/types";

export type CallState = "running" | "done";

export type ReplayState = {
  calls: { index: number; state: CallState }[];
  visible: Set<string>;
  summary: boolean;
  ready: boolean;
};

const CALL_MS = 620;
const GAP_MS = 140;

/**
 * Replays a recorded answer the way the live harness streams it: each MCP call
 * shows as running, returns, and reveals the nodes it found. The skeleton is
 * on screen from the first frame.
 */
export function useReplay(rec: Recording, runKey: number, instant = false): ReplayState {
  const key = `${rec.spec.id}:${runKey}`;
  const [tagged, setTagged] = useState<{ key: string; s: ReplayState }>(() => ({ key, s: initial(rec, instant) }));
  // State from a previous answer never renders against the new one.
  const state = tagged.key === key ? tagged.s : initial(rec, instant);
  const setState = (fn: ReplayState | ((s: ReplayState) => ReplayState)) =>
    setTagged((t) => {
      const base = t.key === key ? t.s : initial(rec, instant);
      return { key, s: typeof fn === "function" ? fn(base) : fn };
    });

  useEffect(() => {
    if (instant) {
      setState(initial(rec, true));
      return;
    }
    setState(initial(rec, false));
    const timers: number[] = [];
    let t = 180;
    rec.calls.forEach((call, i) => {
      timers.push(
        window.setTimeout(() => {
          setState((s) => ({ ...s, calls: [...s.calls, { index: i, state: "running" }] }));
        }, t),
      );
      t += CALL_MS;
      timers.push(
        window.setTimeout(() => {
          setState((s) => {
            const visible = new Set(s.visible);
            call.reveals.forEach((id) => visible.add(id));
            return {
              ...s,
              visible,
              calls: s.calls.map((c) => (c.index === i ? { ...c, state: "done" } : c)),
            };
          });
        }, t),
      );
      t += GAP_MS;
    });
    timers.push(
      window.setTimeout(() => {
        // Anything the calls did not reveal explicitly lands with the answer bundle.
        setState((s) => ({ ...s, visible: new Set(rec.spec.nodes.map((n) => n.id)), summary: true }));
      }, t + 100),
    );
    timers.push(window.setTimeout(() => setState((s) => ({ ...s, ready: true })), t + 900));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, runKey, instant]);

  return state;
}

function initial(rec: Recording, done: boolean): ReplayState {
  if (!done) return { calls: [], visible: new Set(), summary: false, ready: false };
  return {
    calls: rec.calls.map((_, index) => ({ index, state: "done" as const })),
    visible: new Set(rec.spec.nodes.map((n) => n.id)),
    summary: true,
    ready: true,
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { Utterance } from "./suggest";
import type { RoomCall, RoomItem, RoomNode, TurnRequest } from "./roomTypes";
import { LiveError, roomTurn } from "./live";

/**
 * Feeds the conversation to the listener (Haiku 5.5 behind /api/room/turn), one request at a time.
 * Sentences that arrive while it is thinking wait and go together in the next turn, so a fast talker
 * never queues a pile of requests, and every result is about the conversation as it stood.
 */

export type ListenerState = {
  busy: boolean;
  error?: string;
  /** Turned off for good, e.g. no key on the server: the caller falls back to the keyword matcher. */
  off: boolean;
  calls: RoomCall[];
  grounded: boolean;
  lastMs?: number;
};

type View = { title: string; question: string; nodes: RoomNode[] };

// Limits the server enforces (server/room.ts); kept here so a long session never gets a 400.
const CONTEXT = 14;
const MAX_FRESH = 8;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function useListener(opts: {
  enabled: boolean;
  repo: string;
  view: () => View;
  open: () => string[];
  onItems: (items: RoomItem[]) => void;
}) {
  const [state, setState] = useState<ListenerState>({ busy: false, off: false, calls: [], grounded: true });
  const latest = useRef(opts);
  latest.current = opts;
  const log = useRef<Utterance[]>([]);
  const queue = useRef<{ id: string; mode: TurnRequest["mode"] }[]>([]);
  const inflight = useRef<AbortController | null>(null);
  const off = useRef(false);
  const retried = useRef(new Set<string>());

  const pump = useCallback(async () => {
    if (inflight.current || off.current || queue.current.length === 0 || !latest.current.enabled) return;
    // A question asked straight to Spelunk goes alone and first; room talk goes in batches.
    const ask = queue.current.find((q) => q.mode === "ask");
    const batch = ask ? [ask] : queue.current.slice(0, MAX_FRESH);
    queue.current = queue.current.filter((q) => !batch.includes(q));
    const fresh = batch.map((b) => b.id);
    const lastFresh = log.current.findIndex((u) => u.id === fresh[fresh.length - 1]);
    const window = log.current.slice(Math.max(0, lastFresh + 1 - CONTEXT), lastFresh + 1);
    const inWindow = fresh.filter((id) => window.some((u) => u.id === id));
    if (inWindow.length === 0) return void pump();

    const v = latest.current.view();
    const req: TurnRequest = {
      repo: latest.current.repo,
      mode: ask ? "ask" : "listen",
      view: { title: clip(v.title, 400), question: clip(v.question, 400), nodes: v.nodes.slice(0, 200).map((n) => ({ id: clip(n.id, 300), label: clip(n.label, 300), kind: clip(n.kind, 40), file: n.file && clip(n.file, 400) })) },
      transcript: window.map((u) => ({ id: u.id, speaker: clip(u.speaker, 60), text: clip(u.text, 2000) })),
      fresh: inWindow,
      open: latest.current.open().slice(-60).map((t) => clip(t, 200)),
    };
    const ctrl = new AbortController();
    inflight.current = ctrl;
    setState((s) => ({ ...s, busy: true, error: undefined }));
    try {
      const res = await roomTurn(req, ctrl.signal);
      if (ctrl.signal.aborted) return;
      latest.current.onItems(res.items);
      setState((s) => ({ ...s, busy: false, calls: res.calls, grounded: res.grounded, lastMs: res.ms }));
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const status = e instanceof LiveError ? e.status : 0;
      if (status === 503 && /key/i.test(String((e as Error).message))) {
        off.current = true;
        setState((s) => ({ ...s, busy: false, off: true, error: "The listener is off: no working Anthropic key on the dev server." }));
        return;
      }
      // Timeouts, rate limits and server hiccups get one more try; a bad request doesn't.
      const again = (status === 0 || status === 429 || status >= 500) && !batch.some((b) => retried.current.has(b.id));
      if (again) {
        batch.forEach((b) => retried.current.add(b.id));
        queue.current = [...batch, ...queue.current];
      }
      setState((s) => ({ ...s, busy: false, error: `Listener: ${(e as Error).message}${again ? ", retrying" : ""}` }));
      if (again) {
        inflight.current = null;
        setTimeout(() => void pump(), 2500);
        return;
      }
    } finally {
      if (inflight.current === ctrl) inflight.current = null;
    }
    void pump();
  }, []);

  /** Something was said (mode "listen") or asked straight to Spelunk ("ask"). */
  const push = useCallback(
    (u: Utterance, mode: TurnRequest["mode"] = "listen") => {
      log.current = [...log.current, u].slice(-200);
      queue.current.push({ id: u.id, mode });
      void pump();
    },
    [pump],
  );

  /** A new conversation: forget the old one and drop any answer still on its way. */
  const reset = useCallback(() => {
    inflight.current?.abort();
    inflight.current = null;
    log.current = [];
    queue.current = [];
    retried.current.clear();
    setState((s) => ({ ...s, busy: false, error: undefined, calls: [] }));
  }, []);

  useEffect(() => {
    if (opts.enabled) void pump();
  }, [opts.enabled, pump]);
  useEffect(() => () => inflight.current?.abort(), []);

  return { ...state, push, reset };
}

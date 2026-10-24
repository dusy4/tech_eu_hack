import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Recording } from "../data/types";
import { useReplay } from "../engine/useReplay";
import GraphCanvas from "../views/GraphCanvas";
import StepStrip from "../ui/Timeline";
import Inspector from "../ui/Inspector";
import AgentRun from "../ui/AgentRun";
import { Icon } from "../ui/Icon";
import { Dock, DockItem, DockSeparator } from "@/components/motion/dock";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { ConversationPanel, ProposalsPanel, type LiveProps, type SuggestionState, type RoomAnswer } from "../ui/LivePanel";
import { anchorsOf, liveScript, type Suggestion, type Utterance } from "../engine/suggest";
import { useLiveTranscript } from "../engine/useLiveTranscript";
import { useListener } from "../engine/useListener";
import { forAgent, sendToAgent, toBatch } from "../engine/agent";
import { handoffState, LIVE_REPO, type HandoffState } from "../engine/live";
import type { RoomItem, RoomStatus, ViewRequest } from "../engine/roomTypes";
import type { GraphProposal } from "../views/GraphCanvas";
import type { ButtonState } from "@/components/motion/button";

type Props = {
  rec: Recording;
  runKey: number;
  instant: boolean;
  asked: string;
  speed: number;
  onSpeed: (s: number) => void;
  focusRequest?: { id: string; n: number };
  pinned: boolean;
  onPin: () => void;
  onOpenInClaude: () => void;
  onAskBlast: (symbol: string) => void;
  /** Ask a question as if it were typed, e.g. from a live suggestion. */
  onAsk: (question: string) => void;
  /** The connected coding agent, if any; accepted proposals go to it. */
  agentName?: string | null;
  /** The chat with the codebase, shown in the right pane's Ask tab. */
  chat?: ReactNode;
  /** Pinned answers, the repo's living documentation, in the Pinned tab. */
  pins?: ReactNode;
  pinCount?: number;
  /** What the dev server has connected: the listener (Haiku), the MCP server, the graph API. */
  status?: RoomStatus;
  /** Draw a view of the real index (a proposal someone accepted). */
  onOpenView?: (view: ViewRequest, question: string) => void;
  /** A question typed or spoken to Spelunk while the listener is on; `n` makes repeats fire. */
  askRequest?: { text: string; n: number };
};

// How often a sent handoff is checked for the agent's progress.
const HANDOFF_POLL_MS = 4000;
// Cards on the canvas; older ones stay in the Proposals tab.
const MAX_CARDS = 8;
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// "Time out tool approval requests after 30 seconds" and "Time out unanswered tool approvals after
// 30 seconds" are one decision: titles sharing most of their words count as the same proposal.
const STOPWORDS = new Set(["the", "a", "an", "to", "of", "in", "on", "for", "and", "or", "with", "when", "add", "make"]);
const wordsOf = (t: string) => new Set(norm(t).split(" ").filter((w) => w && !STOPWORDS.has(w)).map((w) => w.replace(/s$/, "")));
function sameDecision(a: string, b: string) {
  const x = wordsOf(a);
  const y = wordsOf(b);
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / Math.max(1, new Set([...x, ...y]).size) >= 0.6;
}

const STEP_MS = 1600;
const SPEEDS = [0.5, 1, 2];

function useNarrow(px: number) {
  const q = `(max-width: ${px - 1}px)`;
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

function Streamed({ text, on }: { text: string; on: boolean }) {
  if (!on) return <p className="summary" aria-hidden="true" />;
  const words = text.split(/(\s+)/);
  return (
    <p className="summary">
      {words.map((w, i) => (
        <span key={i} className="w" style={{ animationDelay: `${i * 30}ms` }}>{w}</span>
      ))}
    </p>
  );
}

/**
 * The room: one screen for the whole loop. Left, the conversation (the input); centre, the
 * graph answering it; right, what to do about it (proposals to the agent, ask the code, read the code).
 */
export default function AnswerScreen(p: Props) {
  const { rec, runKey, instant, speed } = p;
  const replay = useReplay(rec, runKey, instant);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();
  const [runOpen, setRunOpen] = useState(!instant);
  const [tab, setTab] = useState("proposals");
  const steps = rec.spec.steps;

  // The conversation outlives a single answer, so it isn't reset with the recording.
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [sgState, setSgState] = useState<Record<string, SuggestionState>>({});
  const [flyTo, setFlyTo] = useState<{ id: string; n: number }>();
  const [sendState, setSendState] = useState<ButtonState>("idle");
  const [answers, setAnswers] = useState<RoomAnswer[]>([]);
  // Which handoff each sent proposal went out in, and what the agent has done with it since.
  const [handoffOf, setHandoffOf] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, HandoffState>>({});

  // Without the listener (no Anthropic key on the dev server) the conversation is transcribed but nothing is proposed.
  const listenerOn = !!p.status?.haiku;
  const repo = LIVE_REPO;
  const specRef = useRef(rec.spec);
  specRef.current = rec.spec;
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;
  const statesRef = useRef(sgState);
  statesRef.current = sgState;

  const openViewRef = useRef(p.onOpenView);
  openViewRef.current = p.onOpenView;
  const onItems = useCallback((items: RoomItem[]) => {
    const at = Date.now();
    // A view someone asked Spelunk for directly is drawn at once; from the room it waits for a yes.
    const asked = items.find((i) => i.type === "proposal" && i.kind === "view" && i.view && i.from.startsWith("q-"));
    if (asked?.type === "proposal" && asked.view) openViewRef.current?.(asked.view, asked.title);
    setAnswers((as) => [...as, ...items.flatMap((i) => (i.type === "answer" ? [{ ...i, at }] : []))]);
    setSuggestions((ss) => {
      // The same decision said twice (or proposed twice by the model) shows once.
      const seen = ss.filter((s) => statesRef.current[s.id] !== "rejected").map((s) => s.title);
      const fresh: Suggestion[] = [];
      for (const i of items) {
        if (i.type !== "proposal" || seen.some((t) => sameDecision(t, i.title))) continue;
        seen.push(i.title);
        if (i.kind === "view" && i.view) {
          if (i.from.startsWith("q-")) continue;
          fresh.push({ id: i.id, from: i.from, kind: "view", title: i.title, why: i.why, view: i.view, anchors: i.anchors });
        }
        else if (i.kind === "change") fresh.push({ id: i.id, from: i.from, kind: "change", title: i.title, why: i.why, change: i.change ?? i.why, anchors: i.anchors });
      }
      return [...ss, ...fresh];
    });
  }, []);

  const listener = useListener({
    enabled: listenerOn,
    repo,
    view: () => ({
      title: specRef.current.title,
      question: specRef.current.question,
      nodes: specRef.current.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind, file: n.codeRef?.file })),
    }),
    open: () => suggestionsRef.current.filter((s) => statesRef.current[s.id] !== "rejected").map((s) => s.title),
    onItems,
  });

  const send = async (accepted: Suggestion[]) => {
    const work = accepted.filter(forAgent);
    if (!work.length) return;
    setSendState("loading");
    try {
      const id = await sendToAgent(
        toBatch(repo, { id: rec.spec.id, title: rec.spec.title, asked: p.asked }, work, utterances),
        // The MCP server's store, where the team's agent reads it; otherwise VITE_AGENT_URL.
        p.status?.mcp ? "/api/handoffs" : undefined,
      );
      setSgState((st) => ({ ...st, ...Object.fromEntries(work.map((s) => [s.id, "sent" as const])) }));
      if (id) setHandoffOf((h) => ({ ...h, ...Object.fromEntries(work.map((s) => [s.id, id])) }));
      setSendState("success");
    } catch {
      setSendState("error");
    }
    setTimeout(() => setSendState("idle"), 1800);
  };

  // The agent reports back through update_handoff_status; the room shows it as it happens.
  const watching = useMemo(
    () => [...new Set(Object.values(handoffOf))].filter((id) => !["done", "dismissed"].includes(progress[id]?.status ?? "")),
    [handoffOf, progress],
  );
  useEffect(() => {
    if (!watching.length) return;
    let alive = true;
    const poll = async () => {
      const states = await Promise.all(watching.map((id) => handoffState(id).catch(() => undefined)));
      if (!alive) return;
      setProgress((pr) => {
        const next = { ...pr };
        let changed = false;
        for (const st of states)
          if (st && (pr[st.id]?.status !== st.status || pr[st.id]?.note !== st.note)) {
            next[st.id] = st;
            changed = true;
          }
        return changed ? next : pr;
      });
    };
    void poll();
    const t = setInterval(poll, HANDOFF_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [watching]);

  const script = useMemo(() => liveScript(rec.spec), [rec.spec]);
  const onUtterance = useCallback(
    (u: Utterance) => {
      setUtterances((us) => [...us, u]);
      if (listenerOn) listener.push(u);
    },
    [listenerOn, listener.push],
  );
  const live = useLiveTranscript(script, onUtterance);

  // A question for Spelunk itself goes into the conversation as "You" and straight to the listener.
  useEffect(() => {
    if (!p.askRequest || !listenerOn) return;
    const u: Utterance = { id: `q-${p.askRequest.n}`, speaker: "You", text: p.askRequest.text, at: Date.now() };
    setUtterances((us) => [...us, u]);
    listener.push(u, "ask");
    setTab("proposals");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.askRequest]);
  const suggested = useMemo(
    () =>
      new Set(
        suggestions.flatMap((s) =>
          sgState[s.id] ? [] : anchorsOf(s).flatMap((a) => (a.nodeId && rec.spec.nodes.some((n) => n.id === a.nodeId) ? [a.nodeId] : [])),
        ),
      ),
    [suggestions, sgState, rec.spec],
  );
  const speakerOf = (s: Suggestion) => utterances.find((u) => u.id === s.from)?.speaker;
  const stateOf = (s: Suggestion): GraphProposal["state"] => {
    const st = sgState[s.id];
    if (st === "sent") {
      const h = handoffOf[s.id] ? progress[handoffOf[s.id]]?.status : undefined;
      return h === "in_progress" ? "in_progress" : h === "done" ? "done" : h === "dismissed" ? "dismissed" : "sent";
    }
    return st === "approved" ? "approved" : "pending";
  };
  // On the canvas: everything still in play, newest last, capped so the lane stays readable.
  const cards: GraphProposal[] = useMemo(
    () =>
      suggestions
        .filter((s) => sgState[s.id] !== "rejected" && !(s.kind === "view" && sgState[s.id]))
        .slice(-MAX_CARDS)
        .map((s) => ({
          id: s.id,
          kind: s.kind,
          title: s.title,
          detail: s.kind === "change" ? s.change : s.why,
          speaker: speakerOf(s),
          state: stateOf(s),
          anchors: anchorsOf(s),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suggestions, sgState, handoffOf, progress, utterances],
  );
  // The first time an answer lands, the demo conversation starts by itself so the room is never silent.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!replay.ready || autoStarted.current || live.mode !== "off") return;
    autoStarted.current = true;
    const t = setTimeout(() => live.start("demo"), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay.ready]);
  const applySuggestion = (s: Suggestion) => {
    if (sgState[s.id] && sgState[s.id] !== "rejected") return;
    setSgState((st) => ({ ...st, [s.id]: "approved" }));
    if (s.kind === "ask") return p.onAsk(s.question);
    if (s.kind === "view") return p.onOpenView?.(s.view, s.title);
    // A change or a focus: bring the code it touches into view.
    const target = anchorsOf(s).find((a) => a.nodeId && rec.spec.nodes.some((n) => n.id === a.nodeId))?.nodeId;
    if (!target) return setFlyTo({ id: s.id, n: Date.now() });
    setSelected(target);
    setFlyTo({ id: target, n: Date.now() });
    const idx = steps.findIndex((st) => st.focus.includes(target));
    if (idx >= 0) {
      setPlaying(false);
      setStep(idx);
    }
  };
  const onProposal = useCallback(
    (id: string, verdict: "accept" | "decline") => {
      const s = suggestionsRef.current.find((x) => x.id === id);
      if (!s) return;
      if (verdict === "decline") setSgState((st) => ({ ...st, [id]: "rejected" }));
      else applyRef.current(s);
    },
    [],
  );
  const applyRef = useRef(applySuggestion);
  applyRef.current = applySuggestion;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startedAt = useMemo(() => (instant ? undefined : Date.now()), [rec, runKey, instant]);

  useEffect(() => {
    setStep(0);
    setSelected(undefined);
    setPlaying(false);
  }, [rec, runKey]);

  // The run is the story while the answer builds; once it lands, the sheet folds away and the steps play.
  useEffect(() => {
    setRunOpen(!replay.ready && !instant);
    if (replay.ready && !instant) setPlaying(true);
  }, [replay.ready, instant]);

  useEffect(() => {
    if (!playing) return;
    if (step >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS / speed);
    return () => clearTimeout(t);
  }, [playing, step, speed, steps.length]);

  useEffect(() => {
    if (!p.focusRequest) return;
    const idx = steps.findIndex((s) => s.focus.includes(p.focusRequest!.id));
    setPlaying(false);
    if (idx >= 0) setStep(idx);
    setSelected(p.focusRequest.id);
  }, [p.focusRequest, steps]);

  // The Code tab shows the selection, else the step being played.
  const inspected = useMemo(() => {
    if (selected) return selected;
    if (!replay.ready) return undefined;
    if (rec.spec.archetype === "blastRadius") return rec.spec.nodes[0].id;
    return steps[step]?.focus[0];
  }, [selected, step, steps, rec, replay.ready]);

  const onSelect = (id: string) => {
    setSelected(id);
    setTab("code");
    const idx = steps.findIndex((s) => s.focus.includes(id));
    if (idx >= 0 && rec.spec.archetype !== "blastRadius") {
      setPlaying(false);
      setStep(idx);
    }
  };

  const go = (i: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(steps.length - 1, i)));
  };
  const atEnd = step >= steps.length - 1;
  const files = new Set(rec.spec.sources.map((s) => s.file)).size;

  const liveProps: LiveProps = {
    mode: live.mode,
    done: live.done,
    interim: live.interim,
    speaker: live.speaker,
    analyser: live.analyser,
    engine: live.engine,
    error: live.error,
    utterances,
    suggestions,
    states: sgState,
    answers,
    listener: listenerOn
      ? { on: true, busy: listener.busy, error: listener.error, calls: listener.calls.length, ms: listener.lastMs, grounded: listener.grounded }
      : { on: false, error: listener.error },
    progress: Object.fromEntries(Object.entries(handoffOf).flatMap(([sid, hid]) => (progress[hid] ? [[sid, progress[hid]]] : []))),
    onMode: (m) => {
      if (m === "demo") {
        setUtterances([]);
        setSuggestions([]);
        setAnswers([]);
        listener.reset();
      }
      live.start(m);
    },
    onStop: live.stop,
    onApply: applySuggestion,
    onDismiss: (sg) => setSgState((st) => ({ ...st, [sg.id]: "rejected" })),
    agentName: p.agentName,
    sendState,
    onSend: send,
  };
  const pending = suggestions.filter((s) => !sgState[s.id]).length;
  // On narrower screens the conversation folds into the right pane as a tab, so the graph keeps the middle.
  const narrow = useNarrow(1280);
  useEffect(() => {
    if (!narrow && tab === "talk") setTab("proposals");
  }, [narrow, tab]);

  return (
    <div className="room">
      {!narrow && (
        <aside className="room-side room-left" aria-label="Conversation">
          <ConversationPanel {...liveProps} />
        </aside>
      )}

      <section className="room-center" aria-label="Answer">
        <header className="answer-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="asked">
              <Icon name="mic" size={14} /> <span>“{p.asked}”</span>
              <span className="pill">Live · {LIVE_REPO}</span>
              <span>{rec.spec.nodes.length} {rec.spec.archetype === "algoStepper" ? "fibers" : "symbols"} from {files} {files === 1 ? "file" : "files"}</span>
            </div>
            <h1>{rec.spec.title}</h1>
            <Streamed text={rec.spec.summary} on={replay.summary} />
          </div>
          <div className="actions" style={{ display: "flex", gap: 8, flex: "none" }}>
            {selected && rec.spec.archetype === "flowTrace" && (
              <button className="btn" onClick={() => p.onAskBlast(selected)}>
                <Icon name="ripple" size={14} /> What breaks if I change this?
              </button>
            )}
            <button className="btn" onClick={p.onOpenInClaude}>
              <Icon name="external" size={14} /> Open in Claude
            </button>
          </div>
        </header>

        <div className="stage-canvas">
          <GraphCanvas
            spec={rec.spec}
            visible={replay.visible}
            step={step}
            ready={replay.ready}
            selected={selected}
            onSelect={onSelect}
            suggested={suggested}
            flyTo={flyTo}
            proposals={cards}
            onProposal={onProposal}
          />

          <div className={`run-sheet${runOpen ? " open" : ""}`} aria-hidden={!runOpen}>
            {runOpen && <AgentRun key={`${rec.spec.id}:${runKey}`} rec={rec} startedAt={startedAt} />}
          </div>

          <div className="playbar">
            <Dock size={40} className="playdock">
              <DockItem aria-label="Previous step" onClick={() => go(step - 1)}>
                <Icon name="prev" size={18} />
              </DockItem>
              <DockItem
                aria-label={playing ? "Pause" : atEnd ? "Replay" : "Play"}
                active={playing}
                onClick={() => {
                  if (!replay.ready) return;
                  if (atEnd) {
                    setStep(0);
                    setPlaying(true);
                  } else setPlaying((x) => !x);
                }}
              >
                <Icon name={playing ? "pause" : atEnd ? "replay" : "play"} size={18} stroke={2} />
              </DockItem>
              <DockItem aria-label="Next step" onClick={() => go(step + 1)}>
                <Icon name="next" size={18} />
              </DockItem>
            </Dock>
            <StepStrip spec={rec.spec} step={step} ready={replay.ready} onStep={go} />
            <Dock size={40} className="playdock">
              <DockItem aria-label={`Speed ${speed}×, change`} onClick={() => p.onSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>
                <span className="dock-text num">{speed}×</span>
              </DockItem>
              <DockSeparator />
              <DockItem aria-label="Agent run" active={runOpen} onClick={() => setRunOpen((o) => !o)}>
                <Icon name="flow" size={18} />
              </DockItem>
              <DockItem aria-label={p.pinned ? "Unpin" : "Pin to atlas"} active={p.pinned} onClick={p.onPin}>
                <Icon name="pin" size={18} />
              </DockItem>
            </Dock>
          </div>
        </div>
      </section>

      <aside className="room-side room-right" aria-label="Decisions">
        <Tabs value={tab} onValueChange={setTab} variant="underline" className="room-tabs">
          <TabsList wrapperClassName="room-tablist">
            {narrow && (
              <TabsTrigger value="talk" icon={<Icon name="wave" size={14} />}>
                Talk
              </TabsTrigger>
            )}
            <TabsTrigger value="proposals" icon={<Icon name="sparkles" size={14} />}>
              Proposals{pending ? ` · ${pending}` : ""}
            </TabsTrigger>
            <TabsTrigger value="ask" icon={<Icon name="search" size={14} />}>
              Ask
            </TabsTrigger>
            <TabsTrigger value="code" icon={<Icon name="code" size={14} />}>
              Code
            </TabsTrigger>
            <TabsTrigger value="pins" icon={<Icon name="pin" size={14} />}>
              Pinned{p.pinCount ? ` · ${p.pinCount}` : ""}
            </TabsTrigger>
          </TabsList>
          {narrow && (
            <TabsContent value="talk" className="room-tab">
              <ConversationPanel {...liveProps} />
            </TabsContent>
          )}
          <TabsContent value="proposals" className="room-tab">
            <ProposalsPanel {...liveProps} />
          </TabsContent>
          <TabsContent value="ask" className="room-tab">
            {p.chat}
          </TabsContent>
          <TabsContent value="code" className="room-tab room-code">
            <Inspector spec={rec.spec} nodeId={inspected} />
          </TabsContent>
          <TabsContent value="pins" className="room-tab room-code">
            {p.pins}
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}

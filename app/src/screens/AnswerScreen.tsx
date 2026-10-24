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
import { ConversationPanel, ProposalsPanel, type LiveProps, type SuggestionState } from "../ui/LivePanel";
import { demoScript, suggestFrom, type Suggestion, type Utterance } from "../engine/suggest";
import { useLiveTranscript } from "../engine/useLiveTranscript";
import { sendToAgent, toBatch } from "../engine/agent";
import { REPO } from "../data/repo";
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
};

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
  const send = async (accepted: Suggestion[]) => {
    setSendState("loading");
    try {
      await sendToAgent(toBatch(REPO.slug, { id: rec.spec.id, title: rec.spec.title, asked: p.asked }, accepted, utterances));
      setSgState((st) => ({ ...st, ...Object.fromEntries(accepted.map((s) => [s.id, "sent" as const])) }));
      setSendState("success");
    } catch {
      setSendState("error");
    }
    setTimeout(() => setSendState("idle"), 1800);
  };
  const script = useMemo(() => demoScript(rec.spec), [rec.spec]);
  const onUtterance = useCallback(
    (u: Utterance) => {
      setUtterances((us) => [...us, u]);
      // A node or question already on the list isn't proposed again when someone repeats it.
      const key = (s: Suggestion) => (s.kind === "focus" ? `f:${s.nodeId}` : `a:${s.question}`);
      setSuggestions((ss) => {
        const seen = new Set(ss.map(key));
        return [...ss, ...suggestFrom(u, rec.spec).filter((s) => !seen.has(key(s)))];
      });
    },
    [rec.spec],
  );
  const live = useLiveTranscript(script, onUtterance);
  const suggested = useMemo(
    () => new Set(suggestions.flatMap((s) => (s.kind === "focus" && !sgState[s.id] && rec.spec.nodes.some((n) => n.id === s.nodeId) ? [s.nodeId] : []))),
    [suggestions, sgState, rec.spec],
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
    setSgState((st) => ({ ...st, [s.id]: "approved" }));
    if (s.kind === "ask") return p.onAsk(s.question);
    setSelected(s.nodeId);
    setFlyTo({ id: s.nodeId, n: Date.now() });
    const idx = steps.findIndex((st) => st.focus.includes(s.nodeId));
    if (idx >= 0) {
      setPlaying(false);
      setStep(idx);
    }
  };
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
    onMode: (m) => {
      if (m === "demo") {
        setUtterances([]);
        setSuggestions([]);
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
              <span className="pill">Recorded answer</span>
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
            <Inspector spec={rec.spec} nodeId={inspected} step={step} ready={replay.ready} />
          </TabsContent>
          <TabsContent value="pins" className="room-tab room-code">
            {p.pins}
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}

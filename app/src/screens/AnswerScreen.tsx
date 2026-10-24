import { useEffect, useMemo, useState } from "react";
import type { Recording } from "../data/types";
import { useReplay } from "../engine/useReplay";
import GraphCanvas from "../views/GraphCanvas";
import StepStrip from "../ui/Timeline";
import Inspector from "../ui/Inspector";
import AgentRun from "../ui/AgentRun";
import { Icon } from "../ui/Icon";
import { Dock, DockItem, DockSeparator } from "@/components/motion/dock";
import { Drawer } from "@/components/motion/drawer";

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
};

const STEP_MS = 1600;
const SPEEDS = [0.5, 1, 2];

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
 * The answer is the canvas. Everything else floats over it or slides in on demand:
 * playback in a dock, the agent run in a sheet from the bottom, the selection in a drawer.
 */
export default function AnswerScreen(p: Props) {
  const { rec, runKey, instant, speed } = p;
  const replay = useReplay(rec, runKey, instant);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();
  const [runOpen, setRunOpen] = useState(!instant);
  const [drawer, setDrawer] = useState(false);
  const steps = rec.spec.steps;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startedAt = useMemo(() => (instant ? undefined : Date.now()), [rec, runKey, instant]);

  useEffect(() => {
    setStep(0);
    setSelected(undefined);
    setPlaying(false);
    setDrawer(false);
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

  // The drawer shows the selection, else the step being played.
  const inspected = useMemo(() => {
    if (selected) return selected;
    if (!replay.ready) return undefined;
    if (rec.spec.archetype === "blastRadius") return rec.spec.nodes[0].id;
    return steps[step]?.focus[0];
  }, [selected, step, steps, rec, replay.ready]);

  const onSelect = (id: string) => {
    setSelected(id);
    setDrawer(true);
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

  return (
    <div className="answer">
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
              <Icon name="ripple" size={15} /> What breaks if I change this?
            </button>
          )}
          <button className="btn" onClick={p.onOpenInClaude}>
            <Icon name="external" size={15} /> Open in Claude
          </button>
        </div>
      </header>

      <section className="stage-canvas" aria-label="Answer">
        <GraphCanvas spec={rec.spec} visible={replay.visible} step={step} ready={replay.ready} selected={selected} onSelect={onSelect} />

        <div className={`run-sheet${runOpen ? " open" : ""}`} aria-hidden={!runOpen}>
          {runOpen && <AgentRun key={`${rec.spec.id}:${runKey}`} rec={rec} startedAt={startedAt} />}
        </div>

        <div className="playbar">
          <StepStrip spec={rec.spec} step={step} ready={replay.ready} onStep={go} />
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
            <DockSeparator />
            <DockItem aria-label={`Speed ${speed}×, change`} onClick={() => p.onSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>
              <span className="dock-text num">{speed}×</span>
            </DockItem>
            <DockSeparator />
            <DockItem aria-label="Agent run" active={runOpen} onClick={() => setRunOpen((o) => !o)}>
              <Icon name="flow" size={18} />
            </DockItem>
            <DockItem aria-label="Inspect selection" active={drawer} onClick={() => setDrawer(true)}>
              <Icon name="code" size={18} />
            </DockItem>
            <DockItem aria-label={p.pinned ? "Unpin" : "Pin to atlas"} active={p.pinned} onClick={p.onPin}>
              <Icon name="pin" size={18} />
            </DockItem>
          </Dock>
        </div>
      </section>

      <Drawer open={drawer} onOpenChange={setDrawer} side="right" ariaLabel="Selection" backdropClassName="!bg-black/5 !backdrop-blur-none" className="insp-drawer">
        <div className="drawer-head">
          <span>Selection</span>
          <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>
        <Inspector spec={rec.spec} nodeId={inspected} step={step} ready={replay.ready} />
      </Drawer>
    </div>
  );
}

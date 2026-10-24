import { useEffect, useState } from "react";
import { RECORDINGS, blastRecording } from "./data/answers";
import type { Recording } from "./data/types";
import { REPO } from "./data/repo";
import { route } from "./engine/router";
import { useVoice } from "./engine/useVoice";
import { LIVE_REPO, liveView, roomStatus } from "./engine/live";
import type { RoomStatus, ViewRequest } from "./engine/roomTypes";
import ConnectScreen from "./screens/ConnectScreen";
import AnswerScreen from "./screens/AnswerScreen";
import ChatScreen from "./screens/ChatScreen";
import AskBox from "./ui/AskBox";
import Modal from "./ui/Modal";
import ConnectAgent, { HarnessLogo } from "./ui/ConnectAgent";
import { Icon } from "./ui/Icon";
import ErrorBoundary from "./ui/ErrorBoundary";
import { Button } from "@/components/motion/button";

/** `live` pins re-draw from the index when opened; recorded ones replay. */
export type Pin = { id: string; recId: string; question: string; view: string; symbols: number; files: number; when: string; live?: ViewRequest };

const VIEW_NAME: Record<string, string> = { flowTrace: "Flow trace", algoStepper: "Algorithm stepper", blastRadius: "Blast radius", swimlane: "Call tree" };

// With the index connected, the room opens on the demo's subject: who depends on tool approval.
const FIRST_LIVE: { view: ViewRequest; question: string } = {
  view: { view: "blast-radius", symbol: "ApprovalRequiredTool" },
  question: "What breaks if we change ApprovalRequiredTool?",
};

const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(`spelunk.${k}`);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(`spelunk.${k}`, JSON.stringify(v));
    } catch {
      /* private mode: keep it in memory only */
    }
  },
};

function recById(id: string): Recording {
  return RECORDINGS.find((r) => r.spec.id === id) ?? blastRecording(id.replace(/^blast-/, ""));
}

function Mark() {
  // A lamp beam into a stack of layers: the product's mark, drawn for it.
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#f48120" />
      <path d="M6 15.5h12M7.5 18.5h9M6 12.5l6-6.5 6 6.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FIRST_QUESTION = "How does setState reach the DOM?";

/**
 * One screen. The top bar names the repo and takes questions; below it, the room:
 * the conversation, the graph answering it, and what to do about it. Setup opens in modals.
 */
export default function App() {
  const [agent, setAgent] = useState<string | null>(() => store.get("agent", null));
  const [pins, setPins] = useState<Pin[]>(() => store.get("pins", []));
  // The room opens on a live answer, so there is never an empty screen to explain.
  const [rec, setRec] = useState<Recording>(RECORDINGS[0]);
  const [asked, setAsked] = useState(FIRST_QUESTION);
  const [runKey, setRunKey] = useState(0);
  const [instant, setInstant] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number }>();
  const [toast, setToast] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [claudeOpen, setClaudeOpen] = useState(false);
  // What the dev server has connected; undefined until it answers, and the room waits for it.
  const [status, setStatus] = useState<RoomStatus>();
  const [liveReq, setLiveReq] = useState<ViewRequest>();
  const [askRequest, setAskRequest] = useState<{ text: string; n: number }>();
  const [loadingView, setLoadingView] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const st = await roomStatus();
      if (!alive) return;
      if (st.graph) {
        try {
          const r = await liveView(FIRST_LIVE.view, FIRST_LIVE.question);
          if (!alive) return;
          setRec(r);
          setAsked(FIRST_LIVE.question);
          setLiveReq(FIRST_LIVE.view);
        } catch {
          // The index is up but this view failed: the recorded sample keeps the room usable.
        }
      }
      if (alive) setStatus(st);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const show = (r: Recording, question: string, replay = true) => {
    setRec(r);
    setAsked(question);
    setInstant(!replay);
    setRunKey((k) => k + 1);
  };

  const live = !!rec.live;
  const repoSlug = live ? LIVE_REPO : REPO.slug;

  /** Draws a view of the real index; the previous one stays up until the new one arrives. */
  const openView = async (view: ViewRequest, question: string, replay = true) => {
    if (loadingView) return;
    setLoadingView(true);
    try {
      const r = await liveView(view, question);
      setLiveReq(view);
      show(r, question, replay);
    } catch (e) {
      setToast(`Couldn't draw that view: ${(e as Error).message}`);
    } finally {
      setLoadingView(false);
    }
  };

  const ask = (text: string) => {
    const r = route(text, focusRequest?.id);
    // Playback commands stay local; with the index live, every question goes to the listener.
    if (live && r.kind !== "speed") {
      if (status?.haiku) setAskRequest({ text, n: Date.now() });
      else setToast("The listener is off (no Anthropic key on the dev server), so questions can't be answered live.");
      return;
    }
    if (r.kind === "answer") show(r.recording, text);
    else if (r.kind === "speed") {
      setSpeed(r.value);
      setToast(`Playback speed ${r.value}×`);
    } else if (r.kind === "focus") {
      setFocusRequest({ id: r.nodeId, n: Date.now() });
    } else {
      setToast(`No recording matches “${text}”. This demo replays three answers; pick one from the ask box.`);
    }
  };

  const voice = useVoice(ask);

  const pinned = pins.some((p) => p.recId === rec.spec.id);
  const togglePin = () => {
    const next = pinned
      ? pins.filter((p) => p.recId !== rec.spec.id)
      : [
          {
            id: `${rec.spec.id}-${Date.now()}`,
            recId: rec.spec.id,
            question: asked,
            live: live ? liveReq : undefined,
            view: VIEW_NAME[rec.spec.archetype] ?? rec.spec.archetype,
            symbols: rec.spec.nodes.length,
            files: new Set(rec.spec.sources.map((s) => s.file)).size,
            when: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          },
          ...pins,
        ];
    setPins(next);
    store.set("pins", next);
    setToast(pinned ? "Unpinned" : "Pinned. Find it under Pinned.");
  };

  const connectAgent = (name: string) => {
    setAgent(name);
    store.set("agent", name);
    setToast(`${name} connected. Accepted proposals go to it.`);
  };

  const pinList = (
    <div className="pins">
      {pins.length === 0 ? (
        <p className="live-empty">Pin an answer with the pin button under the graph and it stays here as living documentation for {repoSlug}.</p>
      ) : (
        <ul>
          {pins.map((p) => (
            <li key={p.id}>
              <button className="pin-row" onClick={() => (p.live ? openView(p.live, p.question, false) : show(recById(p.recId), p.question, false))}>
                <b>{p.question}</b>
                <span>
                  {p.view} · {p.symbols} symbols · {p.when}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="one">
      <header className="one-bar">
        <div className="one-brand">
          <Mark />
          <b>Spelunk</b>
          <button className="one-repo" onClick={() => setRepoOpen(true)} title="Add or switch repository">
            <Icon name="github" size={14} /> {repoSlug} <Icon name="arrow" size={12} />
          </button>
        </div>
        <AskBox onAsk={ask} onMic={() => (voice.status === "listening" ? voice.stop() : voice.start())} listening={voice.status === "listening"} inAnswer repo={repoSlug} />
        <div className="one-right">
          <Button size="sm" variant={agent ? "secondary" : "primary"} onClick={() => setAgentOpen(true)}>
            {agent ? <HarnessLogo name={agent} size={16} /> : <Icon name="plug" size={14} />}
            {agent ? `${agent} connected` : "Connect your agent"}
          </Button>
        </div>
      </header>

      <main className="one-room">
        {!status ? (
          <div className="booting" role="status">
            <i className="ar-spin" /> Connecting to the code index…
          </div>
        ) : (
        <ErrorBoundary resetKey={`${rec.spec.id}:${runKey}`}>
          <AnswerScreen
            rec={rec}
            runKey={runKey}
            instant={instant}
            asked={asked}
            speed={speed}
            onSpeed={setSpeed}
            focusRequest={focusRequest}
            pinned={pinned}
            onPin={togglePin}
            onOpenInClaude={() => setClaudeOpen(true)}
            onAskBlast={(sym) => (live ? openView({ view: "blast-radius", symbol: sym }, `What breaks if we change ${rec.spec.nodes.find((n) => n.id === sym)?.label ?? sym}?`) : ask(`What breaks if I change ${sym}?`))}
            status={status}
            onOpenView={(view, question) => openView(view, question)}
            askRequest={askRequest}
            onAsk={ask}
            agentName={agent}
            chat={
              <ChatScreen
                compact
                onOpenView={(id, q) => show(recById(id), q)}
                onMic={() => (voice.status === "listening" ? voice.stop() : voice.start())}
                listening={voice.status === "listening"}
              />
            }
            pins={pinList}
            pinCount={pins.length}
          />
        </ErrorBoundary>
        )}
        {loadingView && (
          <div className="toast" role="status">
            <i className="ar-spin" /> Drawing the view from the index…
          </div>
        )}
      </main>

      {(voice.status === "listening" || voice.status === "denied" || voice.status === "unsupported") && (
        <div className="listen" role="status" aria-live="polite">
          {voice.status === "listening" ? (
            <>
              <div className="wave" aria-hidden="true">
                {voice.levels.map((l, i) => <span key={i} style={{ height: `${Math.max(8, l * 100)}%` }} />)}
              </div>
              <div className="heard">{voice.interim || <span className="t-shimmer" data-text="Listening. Ask a question about the code.">Listening. Ask a question about the code.</span>}</div>
              <div className="row">
                <span className="muted" style={{ fontSize: 12, flex: 1 }}>Asks one question. For the whole room, use Listen in the Conversation pane.</span>
                <button className="btn" onClick={voice.stop}><Icon name="stop" size={14} /> Done</button>
              </div>
            </>
          ) : (
            <div className="row">
              <span style={{ flex: 1 }}>
                {voice.status === "denied" ? "Microphone access is blocked. Allow it in the address bar, or type the question." : "Voice needs Chrome or Edge here. Type the question instead."}
              </span>
              <button className="btn" onClick={() => location.reload()}>Retry</button>
            </div>
          )}
        </div>
      )}

      <Modal open={repoOpen} onClose={() => setRepoOpen(false)} title="Add a repository">
        <ConnectScreen
          onIndexed={() => {
            setRepoOpen(false);
            setToast(`${REPO.slug} is indexed. Ask anything.`);
          }}
          agent={agent}
          onAgent={connectAgent}
        />
      </Modal>

      <Modal open={agentOpen} onClose={() => setAgentOpen(false)} title="Connect your agent">
        <p className="lead">Code intelligence under your coding agent. The Spelunk MCP server gives it 12 read-only tools over this repo's code graph — who calls this, how A reaches B, statement slices. Accepted proposals from the room go to it as one handoff.</p>
        <ConnectAgent connected={agent} onConnected={(n) => { connectAgent(n); setAgentOpen(false); }} />
      </Modal>

      <Modal open={claudeOpen} onClose={() => setClaudeOpen(false)} title="Open this answer in Claude">
        <p className="lead">The same view ships as an MCP App. In Claude Desktop, ChatGPT or VS Code it renders inside the chat, with play and step still working.</p>
        <div className="panel-body" style={{ paddingTop: 0 }}>
          <label className="field-label">Ask Claude</label>
          <pre className="snippet"><code>{`Use spelunk to show the answer "${rec.spec.title}" for ${repoSlug}`}</code></pre>
          <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
            Resource: <span className="mono">ui://spelunk/answer/{rec.spec.id}</span>
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn primary" onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Use spelunk to show the answer "${rec.spec.title}" for ${repoSlug}`);
                setToast("Prompt copied");
              } catch {
                setToast("Copy failed. Select the prompt and copy it by hand.");
              }
              setClaudeOpen(false);
            }}>
              <Icon name="copy" size={14} /> Copy prompt
            </button>
            <button className="btn" onClick={() => { setClaudeOpen(false); setAgentOpen(true); }}>
              <Icon name="plug" size={14} /> Set up Claude
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="toast" role="status">
          <Icon name="tick" size={14} /> {toast}
        </div>
      )}
    </div>
  );
}

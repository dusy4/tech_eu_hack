import { useCallback, useEffect, useState } from "react";
import { RECORDINGS, blastRecording } from "./data/answers";
import type { Recording } from "./data/types";
import { REPO } from "./data/repo";
import { route } from "./engine/router";
import { useVoice } from "./engine/useVoice";
import ConnectScreen from "./screens/ConnectScreen";
import HomeScreen from "./screens/HomeScreen";
import AnswerScreen from "./screens/AnswerScreen";
import AtlasScreen from "./screens/AtlasScreen";
import AskBox from "./ui/AskBox";
import Modal from "./ui/Modal";
import ConnectAgent, { HarnessLogo } from "./ui/ConnectAgent";
import { Icon } from "./ui/Icon";
import ErrorBoundary from "./ui/ErrorBoundary";
import {
  AnimatedSidebarProvider, AnimatedSidebar, AnimatedSidebarHeader, AnimatedSidebarContent, AnimatedSidebarGroup,
  AnimatedSidebarGroupLabel, AnimatedSidebarGroupContent, AnimatedSidebarMenu, AnimatedSidebarMenuItem,
  AnimatedSidebarMenuButton, AnimatedSidebarRail, AnimatedSidebarInset, AnimatedSidebarTrigger,
} from "@/components/motion/animated-sidebar";

export type Pin = { id: string; recId: string; question: string; view: string; symbols: number; files: number; when: string };

type Screen = "connect" | "repo" | "answer" | "atlas";

const VIEW_NAME: Record<string, string> = { flowTrace: "Flow trace", algoStepper: "Algorithm stepper", blastRadius: "Blast radius" };

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

const readHash = (): Screen => {
  const h = location.hash.replace("#/", "");
  return (["connect", "repo", "answer", "atlas"] as Screen[]).includes(h as Screen) ? (h as Screen) : "connect";
};

function recById(id: string): Recording {
  return RECORDINGS.find((r) => r.spec.id === id) ?? blastRecording(id.replace(/^blast-/, ""));
}

function Mark() {
  // A lamp beam into a stack of layers: the product's mark, drawn for it.
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#15596a" />
      <path d="M6 15.5h12M7.5 18.5h9M6 12.5l6-6.5 6 6.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (store.get("indexed", false) && readHash() === "connect" && !location.hash ? "repo" : readHash()));
  const [indexed, setIndexed] = useState(() => store.get("indexed", false));
  const [agent, setAgent] = useState<string | null>(() => store.get("agent", null));
  const [pins, setPins] = useState<Pin[]>(() => store.get("pins", []));
  const [rec, setRec] = useState<Recording | null>(null);
  const [asked, setAsked] = useState("");
  const [runKey, setRunKey] = useState(0);
  const [instant, setInstant] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number }>();
  const [toast, setToast] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [claudeOpen, setClaudeOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(() => readHash() !== "answer");

  const go = useCallback((s: Screen) => {
    if (location.hash !== `#/${s}`) location.hash = `/${s}`;
    setScreen(s);
    if (s === "answer") setNavOpen(false);
    document.getElementById("main")?.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onHash = () => setScreen(readHash());
    window.addEventListener("hashchange", onHash);
    if (!location.hash) location.hash = `/${screen}`;
    return () => window.removeEventListener("hashchange", onHash);
  }, [screen]);

  // Landing on a repo screen by link counts as having the sample repo indexed.
  useEffect(() => {
    if (screen !== "connect" && !indexed) {
      setIndexed(true);
      store.set("indexed", true);
    }
  }, [screen, indexed]);

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
    if (!indexed) {
      setIndexed(true);
      store.set("indexed", true);
    }
    go("answer");
  };

  const ask = (text: string) => {
    const r = route(text, focusRequest?.id);
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

  const pinned = !!rec && pins.some((p) => p.recId === rec.spec.id);
  const togglePin = () => {
    if (!rec) return;
    const next = pinned
      ? pins.filter((p) => p.recId !== rec.spec.id)
      : [
          {
            id: `${rec.spec.id}-${Date.now()}`,
            recId: rec.spec.id,
            question: asked,
            view: VIEW_NAME[rec.spec.archetype] ?? rec.spec.archetype,
            symbols: rec.spec.nodes.length,
            files: new Set(rec.spec.sources.map((s) => s.file)).size,
            when: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          },
          ...pins,
        ];
    setPins(next);
    store.set("pins", next);
    setToast(pinned ? "Removed from the atlas" : "Pinned to the atlas");
  };

  const connectAgent = (name: string) => {
    setAgent(name);
    store.set("agent", name);
    setToast(`${name} connected. Questions it asks will build here.`);
  };

  const onIndexed = () => {
    setIndexed(true);
    store.set("indexed", true);
    go("repo");
  };

  return (
    <AnimatedSidebarProvider open={navOpen} onOpenChange={setNavOpen} className="app-shell">
      <AnimatedSidebar collapsible="icon" className="nav">
        <AnimatedSidebarHeader className="nav-head">
          <Mark />
          <span className="brand-name">Spelunk</span>
        </AnimatedSidebarHeader>
        <AnimatedSidebarContent>
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>{indexed ? REPO.slug : "No repository"}</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton icon={<Icon name="home" />} isActive={screen === "repo"} disabled={!indexed} onSelect={() => go("repo")}>Overview</AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton icon={<Icon name="flow" />} isActive={screen === "answer"} disabled={!rec} onSelect={() => go("answer")}>Current answer</AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton icon={<Icon name="atlas" />} isActive={screen === "atlas"} badge={pins.length || undefined} onSelect={() => go("atlas")}>Atlas</AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
          <AnimatedSidebarGroup>
            <AnimatedSidebarGroupLabel>Workspace</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton icon={<Icon name="folder" />} isActive={screen === "connect"} onSelect={() => go("connect")}>Add repository</AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuItem>
                  <AnimatedSidebarMenuButton icon={agent ? <HarnessLogo name={agent} size={18} /> : <Icon name="plug" />} badge={agent ? "on" : undefined} onSelect={() => setAgentOpen(true)}>
                    {agent ?? "Connect your agent"}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        </AnimatedSidebarContent>
        <AnimatedSidebarRail />
      </AnimatedSidebar>

      <AnimatedSidebarInset className="main">
        <header className="topbar">
          <AnimatedSidebarTrigger className="nav-trigger"><Icon name="menu" size={18} /></AnimatedSidebarTrigger>
          <AskBox onAsk={ask} onMic={() => (voice.status === "listening" ? voice.stop() : voice.start())} listening={voice.status === "listening"} inAnswer={screen === "answer" && !!rec} repo={REPO.slug} />
        </header>

        <main className="sheet" id="main">
          {screen === "connect" && <ConnectScreen onIndexed={onIndexed} agent={agent} onAgent={connectAgent} />}
          {screen === "repo" && <HomeScreen onAsk={ask} pins={pins} onOpenPin={(p) => show(recById(p.recId), p.question, false)} />}
          {screen === "atlas" && <AtlasScreen pins={pins} onOpen={(p) => show(recById(p.recId), p.question)} onAsk={() => voice.start()} />}
          {screen === "answer" && rec && (
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
              onAskBlast={(sym) => ask(`What breaks if I change ${sym}?`)}
            />
            </ErrorBoundary>
          )}
          {screen === "answer" && !rec && (
            <div className="page">
              <div className="title-row"><div><h1>Current answer</h1><p className="sub">Ask a question from the box above and the answer builds here.</p></div></div>
            </div>
          )}
        </main>
      </AnimatedSidebarInset>

      {(voice.status === "listening" || voice.status === "denied" || voice.status === "unsupported") && (
        <div className="listen" role="status" aria-live="polite">
          {voice.status === "listening" ? (
            <>
              <div className="wave" aria-hidden="true">
                {voice.levels.map((l, i) => <span key={i} style={{ height: `${Math.max(8, l * 100)}%` }} />)}
              </div>
              <div className="heard">{voice.interim || <span className="t-shimmer" data-text="Listening. Ask a question about the code.">Listening. Ask a question about the code.</span>}</div>
              <div className="row">
                <span className="muted" style={{ fontSize: 12, flex: 1 }}>Voice through Reason8 when connected; browser speech for now</span>
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

      <Modal open={agentOpen} onClose={() => setAgentOpen(false)} title="Connect your agent">
        <p className="lead">Your agent asks through the Spelunk MCP server, and the answer builds in this window while it works.</p>
        <ConnectAgent connected={agent} onConnected={(n) => { connectAgent(n); setAgentOpen(false); }} />
      </Modal>

      <Modal open={claudeOpen} onClose={() => setClaudeOpen(false)} title="Open this answer in Claude">
        <p className="lead">The same view ships as an MCP App. In Claude Desktop, ChatGPT or VS Code it renders inside the chat, with play and step still working.</p>
        <div className="panel-body" style={{ paddingTop: 0 }}>
          <label className="field-label">Ask Claude</label>
          <pre className="snippet"><code>{`Use spelunk to show the answer "${rec?.spec.title ?? ""}" for ${REPO.slug}`}</code></pre>
          <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
            Resource: <span className="mono">ui://spelunk/answer/{rec?.spec.id}</span>
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn primary" onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Use spelunk to show the answer "${rec?.spec.title}" for ${REPO.slug}`);
                setToast("Prompt copied");
              } catch {
                setToast("Copy failed. Select the prompt and copy it by hand.");
              }
              setClaudeOpen(false);
            }}>
              <Icon name="copy" size={15} /> Copy prompt
            </button>
            <button className="btn" onClick={() => { setClaudeOpen(false); setAgentOpen(true); }}>
              <Icon name="plug" size={15} /> Set up Claude
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="toast" role="status">
          <Icon name="tick" size={15} /> {toast}
        </div>
      )}
    </AnimatedSidebarProvider>
  );
}

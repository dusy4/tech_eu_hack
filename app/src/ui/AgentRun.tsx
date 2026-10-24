import { useEffect, useMemo, useState } from "react";
import type { Recording } from "../data/types";
import { AgentLanes, type Agent, type Handoff, type Task, type Tool } from "../components/agent-lanes/agent-lanes";

// Agent Lanes (Bruno Delorence, MIT) draws the run. Its clock counts minutes from mount;
// at speed 60 one board minute is one second of the replay, so times below are in seconds.
const SPEED = 60;

// Timing mirrors useReplay: calls start at 0.18 s, each runs 0.62 s with 0.14 s between.
const T0 = 0.18, CALL = 0.62, GAP = 0.14;
// Calls answered by meaning, not text, go through the embedder and the reranker.
const SEMANTIC = new Set(["prepare-context", "prepare-answer-bundle"]);
const TOOL: Record<string, Tool> = {
  "find-symbol": "search",
  "search-lexical": "search",
  "callers-of": "code",
  "prepare-context": "doc",
  "prepare-answer-bundle": "doc",
  "repo-overview": "doc",
};

type Planned = Omit<Task, "status" | "start" | "end"> & { start: number; end: number };
type Plan = { agents: Agent[]; tasks: Planned[]; handoffs: Handoff[]; duration: number };

/** The whole run, as it will unfold: who does what, when, and who hands work to whom. */
export function planRun(rec: Recording, orchestrator = "Claude Code"): Plan {
  const agents: Agent[] = [
    { id: "lead", name: "Orchestrator", model: orchestrator, mark: "petal" },
    { id: "index", name: "Spelunk index", model: "MCP: Tantivy, LMDB, RyuGraph", mark: "hex" },
    { id: "embed", name: "Embedder", model: "Qwen embedding, local", mark: "rings" },
    { id: "rerank", name: "Reranker", model: "Qwen reranker, local", mark: "diamond" },
  ];
  const tasks: Planned[] = [
    { id: "plan", agent: "lead", label: "Planned the search", tools: ["chat"], start: 0, end: T0, notes: ["Read the question", "Picked the tools to call"] },
  ];
  const handoffs: Handoff[] = [];
  let prev = "plan";
  rec.calls.forEach((c, i) => {
    const s = T0 + i * (CALL + GAP);
    const e = s + CALL;
    const tool = TOOL[c.tool] ?? "search";
    if (SEMANTIC.has(c.tool)) {
      tasks.push(
        { id: `lex-${i}`, agent: "index", label: "Lexical candidates", tools: ["search"], start: s + 0.02, end: s + 0.2, notes: [`${c.tool} ${c.arg}`, "BM25 over symbols and statements"] },
        { id: `emb-${i}`, agent: "embed", label: "Embedded 40 candidates", tools: ["sync"], start: s + 0.2, end: s + 0.34, notes: ["Query and 40 candidate units", "About 3.8k tokens"] },
        { id: `rr-${i}`, agent: "rerank", label: "Reranked to top 5", tools: ["search"], start: s + 0.34, end: s + 0.52, notes: ["Scored 40 candidates", "Kept the top 5"] },
        { id: `idx-${i}`, agent: "index", label: "Aggregated to symbols", tools: [tool], start: s + 0.52, end: e - 0.02, notes: [`${c.count} results`] },
      );
      handoffs.push({ from: prev, to: `lex-${i}` }, { from: `lex-${i}`, to: `emb-${i}` }, { from: `emb-${i}`, to: `rr-${i}` }, { from: `rr-${i}`, to: `idx-${i}` });
    } else {
      tasks.push({ id: `idx-${i}`, agent: "index", label: `${c.tool} ${c.arg}`, tools: [tool], start: s + 0.02, end: e - 0.02, notes: [`${c.count} results`] });
      handoffs.push({ from: prev, to: `idx-${i}` });
    }
    tasks.push({ id: `read-${i}`, agent: "lead", label: `Read ${c.count} results`, tools: ["chat"], start: e, end: e + GAP, notes: [`From ${c.tool}`] });
    handoffs.push({ from: `idx-${i}`, to: `read-${i}` });
    prev = `read-${i}`;
  });
  const last = T0 + rec.calls.length * (CALL + GAP);
  tasks.push({ id: "spec", agent: "lead", label: "Wrote the view spec", tools: ["code"], start: last, end: last + 0.9, notes: ["Nodes, edges and steps", "Linked each step to its code"] });
  handoffs.push({ from: prev, to: "spec" });
  return { agents, tasks, handoffs, duration: last + 0.9 };
}

/** Live while the replay runs (startedAt set), complete otherwise. */
export default function AgentRun({ rec, startedAt }: { rec: Recording; startedAt?: number }) {
  const plan = useMemo(() => planRun(rec), [rec]);
  const now = () => (startedAt ? (Date.now() - startedAt) / 1000 : plan.duration);
  // The board's clock starts at its own mount, so times are shifted by what had already elapsed.
  const [mounted] = useState(() => ({ at: Date.now(), offset: now() }));
  const [elapsed, setElapsed] = useState(now);

  useEffect(() => {
    if (elapsed >= plan.duration) return;
    // An interval, not animation frames: the data changes a few times a second at most.
    const t = window.setInterval(() => {
      const n = now();
      setElapsed(n);
      if (n >= plan.duration) clearInterval(t);
    }, 120);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, plan]);

  const tasks: Task[] = plan.tasks
    .filter((t) => t.start <= elapsed)
    .map((t) => ({
      ...t,
      start: t.start - mounted.offset,
      ...(t.end <= elapsed ? { status: "done" as const, end: t.end - mounted.offset } : { status: "running" as const, end: undefined }),
    }));
  const present = new Set(tasks.map((t) => t.id));
  const handoffs = plan.handoffs.filter((h) => present.has(h.from) && present.has(h.to));

  return (
    <div className="agent-run">
      <AgentLanes
        key={mounted.at}
        title="Agent run"
        agents={plan.agents}
        tasks={tasks}
        handoffs={handoffs}
        window={Math.ceil(plan.duration) + 1}
        speed={SPEED}
        autoplay={false}
        colorScheme="light"
        className="lanes-embed"
      />
    </div>
  );
}

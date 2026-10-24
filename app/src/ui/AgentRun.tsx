import { useEffect, useMemo, useState } from "react";
import type { Recording } from "../data/types";
import { Icon, type IconName } from "./Icon";

// Timing mirrors useReplay: calls start at 0.18 s, each runs 0.62 s with 0.14 s between.
const T0 = 0.18, CALL = 0.62, GAP = 0.14, WRITE = 0.9;

// The names the repo-analysis MCP server exposes (repo-analysis-workbench/src/mcp_server).
const MCP: Record<string, { name: string; icon: IconName }> = {
  "repo-overview": { name: "repo_overview", icon: "layers" },
  "find-symbol": { name: "find_symbol", icon: "fn" },
  "callers-of": { name: "symbol_relations · callers", icon: "flow" },
  "callees-of": { name: "symbol_relations · callees", icon: "flow" },
  "path-between": { name: "path_between", icon: "flow" },
  "search-lexical": { name: "search_code", icon: "search" },
  "prepare-context": { name: "prepare_answer_bundle", icon: "source" },
  "prepare-answer-bundle": { name: "prepare_answer_bundle", icon: "source" },
};

type Row = { id: string; icon: IconName; name: string; arg?: string; result?: string; start: number; end: number; agent?: boolean };

function plan(rec: Recording): Row[] {
  const rows: Row[] = [{ id: "plan", icon: "claude", name: "Planned the search", start: 0, end: T0, agent: true }];
  rec.calls.forEach((c, i) => {
    const s = T0 + i * (CALL + GAP);
    rows.push({ id: `c${i}`, ...(MCP[c.tool] ?? { name: c.tool.replace(/-/g, "_"), icon: "mcp" as IconName }), arg: c.arg, result: `${c.count} ${c.count === 1 ? "result" : "results"}`, start: s, end: s + CALL });
  });
  const last = T0 + rec.calls.length * (CALL + GAP);
  rows.push({ id: "spec", icon: "claude", name: "Wrote the view", result: `${rec.spec.nodes.length} nodes, ${rec.spec.steps.length} steps`, start: last, end: last + WRITE, agent: true });
  return rows;
}

/** The tool calls behind an answer, one readable row each. Live while the replay runs (startedAt set). */
export default function AgentRun({ rec, startedAt }: { rec: Recording; startedAt?: number }) {
  const rows = useMemo(() => plan(rec), [rec]);
  const total = rows[rows.length - 1].end;
  const now = () => (startedAt ? (Date.now() - startedAt) / 1000 : total);
  const [elapsed, setElapsed] = useState(now);

  useEffect(() => {
    if (elapsed >= total) return;
    // An interval, not animation frames: rows change state a few times a second at most.
    const t = window.setInterval(() => {
      const n = now();
      setElapsed(n);
      if (n >= total) clearInterval(t);
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, rows]);

  const done = elapsed >= total;
  const calls = rec.calls.length;

  return (
    <section className="agent-run" aria-label="Agent run">
      <header className="ar-head">
        <span className="ar-title">Agent run</span>
        <span className="ar-sub">
          <Icon name="mcp" size={14} /> repo-analysis · {calls} tool {calls === 1 ? "call" : "calls"}
        </span>
        <span className={`ar-status${done ? " done" : ""}`}>{done ? `Done in ${total.toFixed(1)} s` : "Running…"}</span>
      </header>
      <ol className="ar-list">
        {rows.map((r) => {
          const state = elapsed >= r.end ? "done" : elapsed >= r.start ? "running" : "pending";
          return (
            <li key={r.id} className={`ar-row ${state}${r.agent ? " agent" : ""}`}>
              <span className="ar-state" aria-label={state}>
                {state === "done" ? <Icon name="tick" size={14} /> : state === "running" ? <i className="ar-spin" /> : <i className="ar-dot" />}
              </span>
              <Icon name={r.icon} size={16} />
              <span className="ar-name">{r.name}</span>
              {r.arg && <span className="ar-arg" title={r.arg}>{r.arg}</span>}
              <span className="ar-result">{state === "done" ? r.result : ""}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

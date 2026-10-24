import { lazy, Suspense } from "react";
import { REPO, PACKAGES, totals, churnColor } from "../data/repo";
import { SUGGESTED } from "../data/answers";
import { Icon } from "../ui/Icon";
import type { Pin } from "../App";

const CodeCity = lazy(() => import("../views/CodeCity"));

const KIND: Record<string, string> = {
  [SUGGESTED[0]]: "Flow trace through 10 functions",
  [SUGGESTED[1]]: "Fiber tree, step by step",
  [SUGGESTED[2]]: "Callers and tests around one function",
};

const LANG_COLORS = ["#15596a", "#8db6c1", "#c8d3d8"];

export default function HomeScreen({ onAsk, pins, onOpenPin }: { onAsk: (q: string) => void; pins: Pin[]; onOpenPin: (p: Pin) => void }) {
  const busiest = [...PACKAGES].sort((a, b) => b.churn - a.churn)[0];
  return (
    <div className="page">
      <div className="title-row">
        <div>
          <h1>{REPO.slug}</h1>
          <p className="sub">
            {totals.symbols.toLocaleString("en-US")} symbols across {PACKAGES.length} packages. Most of this quarter's changes land in {busiest.name}, which has {busiest.churn} commits in 90 days.
          </p>
        </div>
        <div className="actions">
          <button className="btn primary lg" onClick={() => onAsk(SUGGESTED[0])}>
            <Icon name="mic" size={16} /> Ask how setState works
          </button>
        </div>
      </div>

      <div className="home-grid">
        <section className="panel" aria-labelledby="city-h">
          <div className="panel-head">
            <h2 id="city-h">Code city</h2>
            <div className="meta">
              <span>Height is lines of code</span>
              <span className="city-legend">
                Commits in 90 days
                <span className="ramp" aria-hidden="true">
                  {[0.05, 0.25, 0.45, 0.65, 0.95].map((f) => <span key={f} style={{ background: churnColor(f * 184) }} />)}
                </span>
              </span>
            </div>
          </div>
          <div className="city" style={{ marginTop: 12 }}>
            <Suspense fallback={<div className="code-empty">Loading the city…</div>}>
              <CodeCity />
            </Suspense>
            <span className="city-hint">Drag to turn. Hover a block for its numbers.</span>
          </div>
        </section>

        <div className="side-stack">
          <section className="panel" aria-labelledby="try-h">
            <div className="panel-head"><h2 id="try-h">Try asking</h2></div>
            <div className="panel-body">
              <ul className="ask-rows">
                {SUGGESTED.map((q) => (
                  <li key={q}>
                    <div>
                      <div className="q">{q}</div>
                      <div className="kind">{KIND[q]}</div>
                    </div>
                    <button className="btn" onClick={() => onAsk(q)} aria-label={`Ask: ${q}`}>Ask</button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel" aria-labelledby="idx-h">
            <div className="panel-head">
              <h2 id="idx-h">Index</h2>
              <div className="meta">Sample index, {REPO.branch}</div>
            </div>
            <div className="panel-body">
              <dl className="kv" style={{ margin: 0 }}>
                <dt>Files</dt><dd>{totals.files.toLocaleString("en-US")}</dd>
                <dt>Lines of code</dt><dd>{totals.loc.toLocaleString("en-US")}</dd>
                <dt>Symbols</dt><dd>{totals.symbols.toLocaleString("en-US")}</dd>
              </dl>
              <div className="langbar" aria-hidden="true">
                {REPO.languages.map((l, i) => <span key={l.name} style={{ flex: l.share, background: LANG_COLORS[i] }} />)}
              </div>
              <div className="langs">
                {REPO.languages.map((l, i) => (
                  <span key={l.name}><i style={{ background: LANG_COLORS[i] }} />{l.name} {Math.round(l.share * 100)}%</span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="panel" style={{ marginTop: "var(--gap)" }} aria-labelledby="pins-h">
        <div className="panel-head">
          <h2 id="pins-h">Pinned answers</h2>
          <div className="meta"><a href="#/atlas" className="muted">View atlas</a></div>
        </div>
        <div className="panel-body">
          {pins.length === 0 ? (
            <p className="empty" style={{ margin: 0 }}>Nothing pinned yet. Pin an answer and it stays here as living documentation for the repo.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Question</th><th>View</th><th className="num">Symbols</th><th className="num">Pinned</th></tr></thead>
              <tbody>
                {pins.slice(0, 4).map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => onOpenPin(p)}>
                    <td>{p.question}</td>
                    <td className="muted">{p.view}</td>
                    <td className="num">{p.symbols}</td>
                    <td className="num muted">{p.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { LIVE_REPO } from "../engine/live";
import ConnectAgent from "../ui/ConnectAgent";
import { Icon } from "../ui/Icon";

type IndexedRepo = {
  name: string;
  git?: { remote?: string; branch?: string; short_commit?: string };
  indexed_at?: string;
  counts?: { crates?: number; symbols?: number; references?: number; tracked_files?: number };
};

const fmt = (n?: number) => (n ?? 0).toLocaleString("en-US");

/** The repositories repo-graph-api has indexed. Indexing a new one runs outside the page (the index-repo skill). */
export default function ConnectScreen({ onIndexed, agent, onAgent }: { onIndexed: () => void; agent: string | null; onAgent: (n: string) => void }) {
  const [repos, setRepos] = useState<IndexedRepo[]>();
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let alive = true;
    setError("");
    fetch("/api/graph/repos", { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`repo-graph-api answered ${r.status}`))))
      .then((b: { items: IndexedRepo[] }) => alive && setRepos(b.items))
      .catch((e: Error) => alive && (setRepos(undefined), setError(e.message)));
    return () => {
      alive = false;
    };
  }, [tries]);

  return (
    <div className="page">
      <div className="title-row">
        <div>
          <h1>Repositories</h1>
          <p className="sub">Each repository is parsed once into a code graph — symbols, callers, statement slices. The room reads <span className="mono">{LIVE_REPO}</span> (SPELUNK_REPO on the dev server).</p>
        </div>
      </div>

      <div className="connect-grid">
        <section className="panel" aria-labelledby="repo-h">
          <div className="panel-head"><h2 id="repo-h">Indexed</h2></div>
          <div className="panel-body">
            {error ? (
              <div role="alert">
                <p style={{ color: "var(--negative)", margin: 0, fontSize: 13 }}>The code index isn't reachable: {error}</p>
                <p className="muted" style={{ fontSize: 12, margin: "8px 0 12px" }}>Start repo-graph-api (SPELUNK_GRAPH_URL, default 127.0.0.1:18790) and retry.</p>
                <button className="btn" onClick={() => setTries((t) => t + 1)}>Retry</button>
              </div>
            ) : !repos ? (
              <p className="muted" style={{ margin: 0 }}><i className="ar-spin" /> Asking the index…</p>
            ) : repos.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing is indexed yet. Index a repository with the index-repo skill, then reopen this.</p>
            ) : (
              <ul className="stages" style={{ listStyle: "none", padding: 0 }}>
                {repos.map((r) => (
                  <li key={r.name}>
                    <Icon name="github" size={15} />
                    <span>
                      <strong className="mono" style={{ fontWeight: 500 }}>{r.name}</strong>
                      <span className="muted" style={{ fontSize: 12, display: "block" }}>
                        {r.git?.branch ?? "—"}@{r.git?.short_commit ?? "—"} · {fmt(r.counts?.symbols)} symbols · {fmt(r.counts?.tracked_files)} files
                      </span>
                    </span>
                    {r.name === LIVE_REPO ? (
                      <button className="btn primary" style={{ marginLeft: "auto" }} onClick={onIndexed}>Open</button>
                    ) : (
                      <span className="count muted" style={{ marginLeft: "auto", fontSize: 12 }}>Set SPELUNK_REPO={r.name} to open</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="agent-h">
          <div className="panel-head">
            <h2 id="agent-h">Connect your agent</h2>
            <div className="meta">Optional</div>
          </div>
          <p className="muted" style={{ margin: "4px 16px 12px" }}>Your agent queries the same graph through 12 read-only MCP tools. Answers build here while it works.</p>
          <ConnectAgent connected={agent} onConnected={onAgent} />
        </section>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { REPO, totals } from "../data/repo";
import ConnectAgent from "../ui/ConnectAgent";
import { Icon } from "../ui/Icon";

const STAGES = [
  { name: "Inventory files", unit: "files" },
  { name: "Parse symbols", unit: "symbols" },
  { name: "Imports and references", unit: "edges" },
  { name: "Build the graph", unit: "nodes" },
  { name: "Keyword index", unit: "documents" },
  { name: "Summaries", unit: "modules" },
];

// Sample counts the indexer reports per stage for facebook/react.
const COUNTS = [totals.files, totals.symbols, 61302, 79542, 24810, 16];

type Source = { kind: "github"; slug: string } | { kind: "folder"; name: string; files: number };

const parseGithub = (v: string) => {
  const m = v.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i) ?? v.trim().match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
};

export default function ConnectScreen({ onIndexed, agent, onAgent }: { onIndexed: () => void; agent: string | null; onAgent: (n: string) => void }) {
  const [url, setUrl] = useState(REPO.url);
  const [error, setError] = useState("");
  const [source, setSource] = useState<Source | null>(null);
  const [stage, setStage] = useState(-1);
  const timers = useRef<number[]>([]);
  const slug = parseGithub(url);
  const known = slug?.toLowerCase() === REPO.slug;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = (s: Source) => {
    setSource(s);
    setStage(0);
    timers.current.forEach(clearTimeout);
    timers.current = STAGES.map((_, i) => window.setTimeout(() => setStage(i + 1), 700 * (i + 1)));
  };

  const analyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) {
      setError("Enter a GitHub repository link, like github.com/facebook/react.");
      return;
    }
    setError("");
    if (known) onIndexed();
    else run({ kind: "github", slug });
  };

  const pickFolder = async () => {
    const picker = (window as unknown as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
    if (!picker) {
      setError("Folder access needs Chrome or Edge. Paste a GitHub link instead.");
      return;
    }
    try {
      const dir = await picker();
      let files = 0;
      const walk = async (d: FileSystemDirectoryHandle, depth: number) => {
        for await (const [name, h] of (d as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
          if (name === "node_modules" || name.startsWith(".")) continue;
          if (h.kind === "file") files++;
          else if (depth < 6) await walk(h as FileSystemDirectoryHandle, depth + 1);
          if (files > 20000) return;
        }
      };
      await walk(dir, 0);
      setError("");
      run({ kind: "folder", name: dir.name, files });
    } catch {
      // The person closed the picker; nothing to do.
    }
  };

  const done = stage >= STAGES.length;
  const name = source?.kind === "folder" ? source.name : source?.slug;

  return (
    <div className="page">
      <div className="title-row">
        <div>
          <h1>Add a repository</h1>
          <p className="sub">Parse the repository once into a code graph — symbols, callers, statement slices — then ask structural questions and replay the answer, every step linked to its source.</p>
        </div>
      </div>

      <div className="connect-grid">
        <section className="panel" aria-labelledby="repo-h">
          <div className="panel-head"><h2 id="repo-h">Repository</h2></div>
          <div className="panel-body">
            <form onSubmit={analyze}>
              <label className="field-label" htmlFor="gh">GitHub link</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="input-wrap" style={{ flex: 1 }}>
                  <Icon name="github" size={16} />
                  <input id="gh" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="github.com/owner/repo" spellCheck={false} autoComplete="off" />
                </div>
                <button className="btn primary lg" type="submit">{known ? "Open" : "Analyze"}</button>
              </div>
              {error ? (
                <p role="alert" style={{ color: "var(--negative)", margin: "8px 0 0", fontSize: 13 }}>{error}</p>
              ) : known ? (
                <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>Already indexed: {totals.symbols.toLocaleString("en-US")} symbols, ready to ask.</p>
              ) : null}
            </form>

            <div className="or">or</div>

            <button className="btn lg" onClick={pickFolder} style={{ width: "100%", justifyContent: "center" }}>
              <Icon name="folderOpen" size={16} /> Choose a folder on this computer
            </button>
            <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Files are read in the browser. Nothing leaves this machine until you start indexing.</p>

            {source && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <strong className="mono" style={{ fontWeight: 500 }}>{name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {source.kind === "folder" ? `${source.files.toLocaleString("en-US")} files found` : "from GitHub"}
                  </span>
                </div>
                <div className="progress" aria-hidden="true"><span style={{ width: `${(Math.min(stage, STAGES.length) / STAGES.length) * 100}%` }} /></div>
                <ol className="stages" aria-live="polite">
                  {STAGES.map((s, i) => (
                    <li key={s.name}>
                      <span className={i < stage ? "" : "state-wait"}>
                        <Icon name={i < stage ? "tick" : i === stage ? "terminal" : "file"} size={15} />
                      </span>
                      {i === stage ? <span className="t-shimmer" data-text={s.name}>{s.name}</span> : <span className={i > stage ? "muted" : ""}>{s.name}</span>}
                      <span className="count num">{i < stage ? `${COUNTS[i].toLocaleString("en-US")} ${s.unit}` : "—"}</span>
                    </li>
                  ))}
                </ol>
                {done && (
                  <div className="success-line">
                    <Icon name="tick" size={16} />
                    <span style={{ flex: 1 }}>Indexed. Sample data stands in until the backend is connected.</span>
                    <button className="btn primary" onClick={onIndexed}>Open repository</button>
                  </div>
                )}
              </div>
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

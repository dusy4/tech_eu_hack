import { useState } from "react";
import { Icon, type IconName } from "./Icon";

// The MCP server the backend team ships. Local by default; swap for the hosted URL.
export const MCP_URL = "http://localhost:8787/mcp";

/** What one click does: open a deep link, copy to the clipboard, or download a config file. */
type OneClick =
  | { kind: "link"; label: string; href: string }
  | { kind: "copy"; label: string; text: string }
  | { kind: "download"; label: string; text: string; filename: string };

type Harness = {
  id: string;
  name: string;
  logo: IconName | "cursor";
  color: string;
  oneClick: OneClick;
  /** What happens after the click, in one line. */
  after: string;
  how: string;
  snippet?: string;
  extra?: OneClick;
  steps: string[];
};

const httpJson = JSON.stringify({ mcpServers: { spelunk: { type: "http", url: MCP_URL } } }, null, 2);
// Claude Desktop's config file runs local processes, so a remote server goes through mcp-remote.
const desktopJson = JSON.stringify({ mcpServers: { spelunk: { command: "npx", args: ["-y", "mcp-remote", MCP_URL] } } }, null, 2);
const cursorConfig = btoa(JSON.stringify({ url: MCP_URL }));
const vscodeConfig = encodeURIComponent(JSON.stringify({ name: "spelunk", type: "http", url: MCP_URL }));
const claudeCodeCmd = `claude mcp add --transport http spelunk ${MCP_URL}`;

export const HARNESSES: Harness[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    logo: "claude",
    color: "#c15f3c", // taste-skill-ignore: Claude brand colour on its own logo mark only
    oneClick: { kind: "copy", label: "Copy install command", text: claudeCodeCmd },
    after: "Paste it in a terminal in your repo",
    how: "Run this in the repo you want to ask about, or drop the .mcp.json file into the repo root.",
    snippet: claudeCodeCmd,
    extra: { kind: "download", label: "Download .mcp.json", text: httpJson, filename: ".mcp.json" },
    steps: ["Start claude in the repo and approve the spelunk server", "Ask a question; the answer opens here as it builds"],
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    logo: "claude",
    color: "#c15f3c", // taste-skill-ignore: Claude brand colour on its own logo mark only
    oneClick: { kind: "copy", label: "Copy connector URL", text: MCP_URL },
    after: "Settings, Connectors, Add custom connector, paste",
    how: "Add a custom connector with the URL, or paste this into claude_desktop_config.json.",
    snippet: desktopJson,
    extra: { kind: "download", label: "Download config", text: desktopJson, filename: "claude_desktop_config.json" },
    steps: ["Restart Claude Desktop", "Answers render inside the chat as an MCP App, and here"],
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: "cursor",
    color: "#0e0f11",
    oneClick: { kind: "link", label: "Add to Cursor", href: `cursor://anysphere.cursor-deeplink/mcp/install?name=spelunk&config=${cursorConfig}` },
    after: "Cursor opens and asks you to confirm",
    how: "The button opens Cursor with the server filled in.",
    steps: ["Confirm the server in Cursor's MCP settings", "Ask from the agent panel"],
  },
  {
    id: "vscode",
    name: "VS Code",
    logo: "vscode",
    color: "#0065a9",
    oneClick: { kind: "link", label: "Add to VS Code", href: `vscode:mcp/install?${vscodeConfig}` },
    after: "VS Code opens and asks you to trust it",
    how: "The button opens VS Code with the server filled in, for Copilot agent mode.",
    extra: { kind: "link", label: "Add to VS Code Insiders", href: `vscode-insiders:mcp/install?${vscodeConfig}` },
    steps: ["Trust the server when VS Code asks", "Ask from Copilot Chat in agent mode"],
  },
  {
    id: "other",
    name: "Other MCP client",
    logo: "mcp",
    color: "#2b2e31",
    oneClick: { kind: "download", label: "Download mcp.json", text: httpJson, filename: "mcp.json" },
    after: "Import it into any streamable HTTP client",
    how: "Any MCP client that speaks streamable HTTP can use this config.",
    snippet: httpJson,
    steps: ["Point your client at the URL above"],
  },
];

// Cursor's mark (a cube seen corner-on) is not in Hugeicons, so it is drawn here.
function CursorMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4z" fill="currentColor" />
      <path d="M12 2.5v9.5l8.5-4.6M12 12 3.5 7.4M12 12v9.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function HarnessLogo({ name, size = 16 }: { name: string; size?: number }) {
  const h = HARNESSES.find((x) => x.name === name) ?? HARNESSES[HARNESSES.length - 1];
  return (
    <span className="harness-logo" style={{ color: h.color }}>
      {h.logo === "cursor" ? <CursorMark size={size} /> : <Icon name={h.logo} size={size} stroke={1.8} />}
    </span>
  );
}

// The async clipboard API can reject or stall on unfocused pages; fall back to a hidden textarea.
async function copyText(text: string): Promise<boolean> {
  try {
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => setTimeout(() => reject(new Error("clipboard timeout")), 500)),
    ]);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

const ACTION_ICON: Record<OneClick["kind"], IconName> = { link: "external", copy: "copy", download: "download" };
const DONE_WORD: Record<OneClick["kind"], string> = { link: "Opened", copy: "Copied", download: "Downloaded" };

export default function ConnectAgent({ connected, onConnected }: { connected: string | null; onConnected: (name: string) => void }) {
  const [tab, setTab] = useState(HARNESSES[0].id);
  const [done, setDone] = useState<string | null>(null);
  const h = HARNESSES.find((x) => x.id === tab)!;

  const flash = (key: string) => {
    setDone(key);
    setTimeout(() => setDone((d) => (d === key ? null : d)), 1800);
  };

  const run = async (a: OneClick, key: string) => {
    if (a.kind === "copy") {
      if (await copyText(a.text)) flash(key);
      else {
        // Clipboard refused (no focus or permission): show the text where it can be selected.
        const owner = HARNESSES.find((x) => key.endsWith(x.id));
        if (owner) setTab(owner.id);
        flash(`fail-${key}`);
      }
    } else if (a.kind === "download") {
      const url = URL.createObjectURL(new Blob([a.text], { type: "application/json" }));
      const el = document.createElement("a");
      el.href = url;
      el.download = a.filename;
      el.click();
      URL.revokeObjectURL(url);
      flash(key);
    } else {
      flash(key);
    }
  };

  const ActionButton = ({ a, k, primary }: { a: OneClick; k: string; primary?: boolean }) => {
    const body = (
      <>
        <Icon name={done === k ? "tick" : ACTION_ICON[a.kind]} size={15} />
        {done === k ? DONE_WORD[a.kind] : a.label}
      </>
    );
    const cls = `btn${primary ? " primary" : ""}`;
    return a.kind === "link" ? (
      <a className={cls} href={a.href} onClick={() => run(a, k)}>{body}</a>
    ) : (
      <button className={cls} onClick={() => run(a, k)}>{body}</button>
    );
  };

  return (
    <div>
      <div className="quick" role="list" aria-label="One-click setup">
        {HARNESSES.map((x) => {
          const k = `quick-${x.id}`;
          const a = x.oneClick;
          const inner = (
            <>
              <HarnessLogo name={x.name} size={22} />
              <span className="quick-text">
                <span className="quick-name">{x.name}</span>
                <span className="quick-action">
                  {done === k ? `${DONE_WORD[a.kind]}. ${x.after}` : done === `fail-${k}` ? "Copy blocked. Select it in the box below" : a.label}
                </span>
              </span>
              <Icon name={done === k ? "tick" : ACTION_ICON[a.kind]} size={16} className="quick-icon" />
            </>
          );
          return a.kind === "link" ? (
            <a key={x.id} role="listitem" className="quick-tile" href={a.href} onClick={() => run(a, k)}>{inner}</a>
          ) : (
            <button key={x.id} role="listitem" className="quick-tile" onClick={() => run(a, k)}>{inner}</button>
          );
        })}
      </div>

      <div className="manual-label">Manual setup</div>
      <div className="utabs" role="tablist" aria-label="Your agent">
        {HARNESSES.map((x) => (
          <button key={x.id} className="utab" role="tab" aria-selected={x.id === tab} onClick={() => setTab(x.id)}>
            <HarnessLogo name={x.name} />
            {x.name}
          </button>
        ))}
      </div>
      <div className="panel-body" style={{ paddingTop: 16 }}>
        <p style={{ margin: "0 0 12px" }}>{h.how}</p>
        {h.snippet && (
          <pre className="snippet">
            <code>{h.snippet}</code>
            <button className="icon-btn copy" onClick={() => run({ kind: "copy", label: "", text: h.snippet! }, `snip-${h.id}`)} aria-label={done === `snip-${h.id}` ? "Copied" : "Copy"}>
              <Icon name={done === `snip-${h.id}` ? "tick" : "copy"} size={15} />
            </button>
          </pre>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: h.snippet ? 12 : 0 }}>
          {h.oneClick.kind !== "copy" && <ActionButton a={h.oneClick} k={`main-${h.id}`} />}
          {h.extra && <ActionButton a={h.extra} k={`extra-${h.id}`} />}
        </div>
        <ol className="steps-list">
          {h.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          {connected === h.name ? (
            <span className="pill positive"><Icon name="tick" size={12} /> {h.name} connected</span>
          ) : (
            <button className="btn primary" onClick={() => onConnected(h.name)}>
              <Icon name="plug" size={15} /> I've added it
            </button>
          )}
          <span className="muted" style={{ fontSize: 12 }}>Server: <span className="mono">{MCP_URL}</span></span>
        </div>
      </div>
    </div>
  );
}

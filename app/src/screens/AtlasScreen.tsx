import type { Pin } from "../App";
import { Icon } from "../ui/Icon";

export default function AtlasScreen({ pins, onOpen, onAsk }: { pins: Pin[]; onOpen: (p: Pin) => void; onAsk: () => void }) {
  return (
    <div className="page">
      <div className="title-row">
        <div>
          <h1>Atlas</h1>
          <p className="sub">Answers you pinned for facebook/react. Each one replays with its code links, here or inside Claude.</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={onAsk}><Icon name="mic" size={15} /> Ask a question</button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="muted num">{pins.length} {pins.length === 1 ? "answer" : "answers"}</span>
      </div>
      {pins.length === 0 ? (
        <p className="empty">No pinned answers yet. Ask a question, then press Pin under the view.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "46%" }}>Question</th>
              <th>View</th>
              <th className="num">Symbols</th>
              <th className="num">Files</th>
              <th className="num">Pinned</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pins.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => onOpen(p)}>
                <td style={{ fontWeight: 500 }}>{p.question}</td>
                <td className="muted">{p.view}</td>
                <td className="num">{p.symbols}</td>
                <td className="num">{p.files}</td>
                <td className="num muted">{p.when}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn ghost" onClick={(e) => { e.stopPropagation(); onOpen(p); }}>
                    <Icon name="play" size={14} /> Replay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

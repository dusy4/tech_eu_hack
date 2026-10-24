import { useEffect, useRef, useState } from "react";
import { SUGGESTED } from "../data/answers";
import { Icon } from "./Icon";

const FOLLOW_UPS = ["Slower", "Show the render phase as a tree", "What breaks if I change this?"];

export default function AskBox({
  onAsk,
  onMic,
  listening,
  inAnswer,
  repo,
}: {
  onAsk: (q: string) => void;
  onMic: () => void;
  listening: boolean;
  inAnswer: boolean;
  repo: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const list = inAnswer ? FOLLOW_UPS : SUGGESTED;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (text: string) => {
    if (!text.trim()) return;
    onAsk(text.trim());
    setQ("");
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className="ask">
      <form
        className="ask-field"
        onSubmit={(e) => { e.preventDefault(); submit(active >= 0 ? list[active] : q); }}
      >
        <Icon name="search" size={15} className="muted" />
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(list.length - 1, a + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
            if (e.key === "Escape") input.current?.blur();
          }}
          placeholder={inAnswer ? "Follow up: slower, show it as a tree…" : `Ask about ${repo}: who calls this, how A reaches B…`}
          aria-label="Ask the codebase"
          role="combobox"
          aria-expanded={open}
          aria-controls="ask-suggest"
        />
        <span className="kbd hide-phone">Ctrl K</span>
        <button type="button" className={`mic${listening ? " live" : ""}`} onClick={onMic} aria-label={listening ? "Stop listening" : "Ask by voice"} aria-pressed={listening}>
          <Icon name={listening ? "stop" : "mic"} size={15} stroke={2} />
        </button>
      </form>
      {open && (
        <div className="suggest" id="ask-suggest" role="listbox">
          <div className="suggest-label">{inAnswer ? "Follow-ups change the view in place" : "Recorded questions"}</div>
          {list.map((s, i) => (
            <button key={s} role="option" aria-selected={i === active} data-active={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => submit(s)}>
              <Icon name={inAnswer ? "arrow" : "sparkles"} size={14} className="muted" /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

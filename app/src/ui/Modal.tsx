import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/** transitions-dev "modal open / close": open class, then is-closing for the close duration. */
export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [phase, setPhase] = useState<"closed" | "open" | "closing">(open ? "open" : "closed");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPhase("closed");
      const r = requestAnimationFrame(() => setPhase("open"));
      return () => cancelAnimationFrame(r);
    }
    if (phase === "open") {
      setPhase("closing");
      const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur")) || 150;
      const t = setTimeout(() => setPhase("closed"), ms);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    box.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open && phase === "closed") return null;
  return (
    <>
      <div className={`scrim${phase === "open" ? " is-open" : ""}`} onClick={onClose} />
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`dialog t-modal${phase === "open" ? " is-open" : phase === "closing" ? " is-closing" : ""}`}
      >
        <div className="dialog-head">
          <h2>{title}</h2>
          <button className="icon-btn x" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>
        {children}
      </div>
    </>
  );
}

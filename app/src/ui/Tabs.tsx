import { useLayoutEffect, useRef } from "react";

/** transitions-dev "tabs sliding": the pill snaps on first paint, then tweens. */
export default function Tabs<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const move = (animate: boolean) => {
      const tab = bar.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      const p = pill.current;
      if (!tab || !p) return;
      if (!animate) {
        const prev = p.style.transition;
        p.style.transition = "none";
        p.style.transform = `translateX(${tab.offsetLeft}px)`;
        p.style.width = `${tab.offsetWidth}px`;
        void p.offsetWidth;
        p.style.transition = prev;
      } else {
        p.style.transform = `translateX(${tab.offsetLeft}px)`;
        p.style.width = `${tab.offsetWidth}px`;
      }
    };
    move(!first.current);
    first.current = false;
    const onResize = () => move(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [value]);

  return (
    <div className="t-tabs" role="tablist" aria-label={label} ref={bar}>
      <span className="t-tabs-pill" aria-hidden="true" ref={pill} />
      {options.map((o) => (
        <button key={String(o.value)} className="t-tab" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

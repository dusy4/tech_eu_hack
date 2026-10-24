import type { ViewSpec } from "../data/types";
import { groupOf, swatchFor } from "../views/GraphCanvas";

/** The steps as one thin strip of bars in their group's colour, with the current caption above. */
export default function StepStrip({ spec, step, ready, onStep }: { spec: ViewSpec; step: number; ready: boolean; onStep: (i: number) => void }) {
  const steps = spec.steps;
  const colorAt = (i: number) => {
    const st = steps[i];
    if (spec.archetype === "algoStepper") return st.frame?.phase === "beginWork" ? "#2f6fd1" : "#2e9e5b";
    return swatchFor(spec, st.focus[0] ?? "").fill;
  };
  const groupAt = (i: number) => (spec.archetype === "algoStepper" ? steps[i].frame?.phase ?? "" : groupOf(spec, steps[i].focus[0] ?? ""));

  return (
    <div className="strip">
      <div className="strip-caption">
        {ready ? (
          <>
            <span className="strip-of num">{step + 1}/{steps.length}</span>
            <span className="strip-group">{groupAt(step)}</span>
            <span className="strip-text">{steps[step]?.caption}</span>
          </>
        ) : (
          <span className="strip-text t-shimmer" data-text="The agent is reading the code">The agent is reading the code</span>
        )}
      </div>
      <div className="strip-bars" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((st, i) => (
          <button
            key={st.id}
            className={`tl-bar${ready && i === step ? " now" : ""}${ready && i < step ? " past" : ""}`}
            style={{ ["--c" as string]: colorAt(i) }}
            onClick={() => ready && onStep(i)}
            aria-label={`Step ${i + 1}: ${st.caption}`}
            aria-current={ready && i === step ? "step" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

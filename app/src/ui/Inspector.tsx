import type { ViewSpec } from "../data/types";
import { SYMBOLS } from "../data/repo";
import { groupOf, swatchFor } from "../views/GraphCanvas";
import { CodeBlock } from "@/components/agents/code-block";

type Props = { spec: ViewSpec; nodeId?: string; step: number; ready: boolean };

/** The selection drawer's contents: what the node is, and its code (beUI CodeBlock). */
export default function Inspector({ spec, nodeId, step, ready }: Props) {
  const node = spec.nodes.find((n) => n.id === nodeId);
  const frame = ready ? spec.steps[step]?.frame : undefined;
  if (!node) return <p className="pane-empty">Select a node to inspect it.</p>;

  // A fiber shows the work function running on it; a function shows itself.
  const codeId = spec.archetype === "algoStepper" ? (frame?.phase === "completeWork" ? "completeWork" : "beginWork") : node.id;
  const sym = SYMBOLS[codeId];
  const own = SYMBOLS[node.id];
  const sw = swatchFor(spec, node.id);

  const rows: [string, string][] = [];
  if (spec.archetype === "algoStepper") {
    const state = frame?.flagged?.includes(node.id)
      ? "Flagged with Update"
      : frame?.skipped?.includes(node.id)
        ? "Skipped, no work below"
        : frame?.visited?.includes(node.id)
          ? "Visited"
          : "Not reached yet";
    rows.push(["Fiber tag", String(node.meta?.tag)], ["Parent", String(node.meta?.parent ?? "none")], ["This step", state], ["Work", frame?.phase ?? "—"]);
  } else if (own) {
    rows.push(
      ["File", own.file.split("/").pop()!],
      ["Lines", `${own.focus[0]}–${own.focus[1]}`],
      [spec.archetype === "flowTrace" ? "Phase" : "Ring", groupOf(spec, node.id)],
      ["Callers", String(own.callers.length)],
    );
  } else {
    rows.push(["Group", groupOf(spec, node.id)], ["Code", "Not in the sample index"]);
  }

  return (
    <div className="insp">
      <div className="insp-title">
        <i className="insp-swatch" style={{ background: sw.fill }} />
        <span className="insp-name" title={node.label}>{node.label}</span>
        <span className="pill">{node.kind === "fn" ? "function" : node.kind}</span>
      </div>
      <dl className="props">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd title={k === "File" ? own?.file : undefined}>{v}</dd>
          </div>
        ))}
      </dl>
      {sym && (
        <CodeBlock
          code={sym.code}
          language="tsx"
          filename={`${sym.file.split("/").pop()}, lines ${sym.start}–${sym.start + sym.code.split("\n").length - 1}`}
          highlightLines={Array.from({ length: sym.focus[1] - sym.focus[0] + 1 }, (_, i) => sym.focus[0] - sym.start + 1 + i)}
          maxHeight={460}
          wrap
          className="insp-code"
        />
      )}
    </div>
  );
}

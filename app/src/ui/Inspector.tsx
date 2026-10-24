import { useEffect, useState } from "react";
import type { ViewSpec } from "../data/types";
import { SYMBOLS } from "../data/repo";
import { groupOf, swatchFor } from "../views/GraphCanvas";
import { symbolBody, type SymbolBody } from "../engine/live";
import { CodeBlock } from "@/components/agents/code-block";

type Props = { spec: ViewSpec; nodeId?: string; step: number; ready: boolean; live?: boolean };

/** A node of the real index: its location and source, fetched from repo-graph-api. */
function LiveCode({ spec, nodeId }: { spec: ViewSpec; nodeId: string }) {
  const [body, setBody] = useState<{ id: string; b?: SymbolBody; error?: string }>();
  useEffect(() => {
    let alive = true;
    symbolBody(nodeId)
      .then((b) => alive && setBody({ id: nodeId, b }))
      .catch((e: Error) => alive && setBody({ id: nodeId, error: e.message }));
    return () => {
      alive = false;
    };
  }, [nodeId]);
  const node = spec.nodes.find((n) => n.id === nodeId)!;
  const ref = node.codeRef;
  const b = body?.id === nodeId ? body.b : undefined;
  const sym = b?.symbol;
  const start = sym?.line ?? ref?.lines[0];
  const end = sym?.end_line ?? ref?.lines[1];
  const rows: [string, string][] = [
    ["File", (sym?.path ?? ref?.file ?? "—").split("/").slice(-2).join("/")],
    ["Lines", start ? `${start}–${end ?? start}` : "—"],
    [spec.archetype === "blastRadius" ? "Ring" : "Group", groupOf(spec, nodeId)],
    ["Kind", String(sym?.kind ?? node.meta?.symbolKind ?? node.kind)],
  ];
  return (
    <>
      <dl className="props">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd title={k === "File" ? sym?.path ?? ref?.file : undefined}>{v}</dd>
          </div>
        ))}
      </dl>
      {b ? (
        <CodeBlock
          code={b.code}
          language="rust"
          filename={`${sym!.path.split("/").pop()}, lines ${sym!.line}–${sym!.end_line}${b.code_kind === "source" ? "" : " (rebuilt from the index)"}`}
          maxHeight={460}
          wrap
          className="insp-code"
        />
      ) : body?.id === nodeId && body.error ? (
        <p className="pane-empty">Couldn't load the code: {body.error}</p>
      ) : (
        <p className="pane-empty">Loading the code…</p>
      )}
    </>
  );
}

/** The selection drawer's contents: what the node is, and its code (beUI CodeBlock). */
export default function Inspector({ spec, nodeId, step, ready, live }: Props) {
  const node = spec.nodes.find((n) => n.id === nodeId);
  const frame = ready ? spec.steps[step]?.frame : undefined;
  if (!node) return <p className="pane-empty">Select a node to inspect it.</p>;
  const sw = swatchFor(spec, node.id);
  const title = (
    <div className="insp-title">
      <i className="insp-swatch" style={{ background: sw.fill }} />
      <span className="insp-name" title={node.label}>{node.label}</span>
      <span className="pill">{node.kind === "fn" ? "function" : node.kind}</span>
    </div>
  );
  if (live)
    return (
      <div className="insp">
        {title}
        <LiveCode key={node.id} spec={spec} nodeId={node.id} />
      </div>
    );

  // A fiber shows the work function running on it; a function shows itself.
  const codeId = spec.archetype === "algoStepper" ? (frame?.phase === "completeWork" ? "completeWork" : "beginWork") : node.id;
  const sym = SYMBOLS[codeId];
  const own = SYMBOLS[node.id];

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
      {title}
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

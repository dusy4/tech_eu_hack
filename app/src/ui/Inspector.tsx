import { useEffect, useState } from "react";
import type { ViewSpec } from "../data/types";
import { groupOf, swatchFor } from "../views/GraphCanvas";
import { symbolBody, type SymbolBody } from "../engine/live";
import { CodeBlock } from "@/components/agents/code-block";

type Props = { spec: ViewSpec; nodeId?: string };

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
export default function Inspector({ spec, nodeId }: Props) {
  const node = spec.nodes.find((n) => n.id === nodeId);
  if (!node) return <p className="pane-empty">Select a node to inspect it.</p>;
  const sw = swatchFor(spec, node.id);
  return (
    <div className="insp">
      <div className="insp-title">
        <i className="insp-swatch" style={{ background: sw.fill }} />
        <span className="insp-name" title={node.label}>{node.label}</span>
        <span className="pill">{node.kind === "fn" ? "function" : node.kind}</span>
      </div>
      <LiveCode key={node.id} spec={spec} nodeId={node.id} />
    </div>
  );
}

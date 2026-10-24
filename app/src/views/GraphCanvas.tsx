import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap, Panel, Handle, Position,
  getSmoothStepPath, getStraightPath, useReactFlow,
  type Node, type Edge, type NodeProps, type EdgeProps,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import "@xyflow/react/dist/style.css";
import type { ViewSpec, ViewNode } from "../data/types";
import { Icon, type IconName } from "../ui/Icon";

// ── Colour: one solid swatch per category, as in a lineage graph ───────────

export type Swatch = { fill: string; ink: string };
const SW = {
  yellow: { fill: "#f2b53a", ink: "#2a1c00" },
  green: { fill: "#2e9e5b", ink: "#ffffff" },
  blue: { fill: "#2f6fd1", ink: "#ffffff" },
  rose: { fill: "#c93a6a", ink: "#ffffff" },
  plum: { fill: "#4b2e45", ink: "#ffffff" },
  ink: { fill: "#1f2933", ink: "#ffffff" },
} satisfies Record<string, Swatch>;

const PHASE_SW: Record<string, Swatch> = { Update: SW.yellow, Schedule: SW.green, Render: SW.blue, Commit: SW.rose };
const TAG_SW: Record<string, Swatch> = { HostRoot: SW.plum, FunctionComponent: SW.green, HostComponent: SW.blue, HostText: SW.yellow };
const RING_SW = [SW.ink, SW.yellow, SW.green, SW.blue];
const RING_NAME = ["Changed symbol", "Direct callers", "One hop out", "Tests"];

/** The legend group a node belongs to: its phase, fiber tag or ring. */
export function groupOf(spec: ViewSpec, id: string): string {
  const n = spec.nodes.find((x) => x.id === id);
  if (!n) return "";
  if (spec.archetype === "flowTrace") return n.meta?.context ? "Context call" : String(n.meta?.phase);
  if (spec.archetype === "algoStepper") return String(n.meta?.tag);
  return RING_NAME[Number(n.meta?.ring ?? 0)];
}

export function swatchFor(spec: ViewSpec, id: string): Swatch {
  const n = spec.nodes.find((x) => x.id === id);
  if (!n) return SW.ink;
  if (spec.archetype === "flowTrace") {
    const parent = n.meta?.parent ? spec.nodes.find((x) => x.id === n.meta!.parent) : undefined;
    return PHASE_SW[String((parent ?? n).meta?.phase)] ?? SW.ink;
  }
  if (spec.archetype === "algoStepper") return TAG_SW[String(n.meta?.tag)] ?? SW.ink;
  return RING_SW[Number(n.meta?.ring ?? 0)] ?? SW.ink;
}

// ── Node and edge components ───────────────────────────────────────────────

type PillState = "ghost" | "idle" | "past" | "now" | "outline" | "skipped" | "flagged";
type PillData = {
  label: string; icon: IconName; swatch: Swatch; state: PillState; width: number;
  context?: boolean; dim?: boolean; selected?: boolean; badge?: string;
};

function Pill({ data }: NodeProps<Node<PillData>>) {
  const cls = ["gp", `s-${data.state}`, data.context ? "ctx" : "", data.dim ? "dim" : "", data.selected ? "sel" : ""].join(" ");
  return (
    <div className={cls} style={{ width: data.width, ["--fill" as string]: data.swatch.fill, ["--ink" as string]: data.swatch.ink }}>
      <Handle type="target" id="l" position={Position.Left} />
      <Handle type="target" id="t" position={Position.Top} />
      <Handle type="target" id="tb" position={Position.Bottom} />
      <Handle type="source" id="st" position={Position.Top} />
      {data.state !== "ghost" && (
        <>
          <Icon name={data.icon} size={14} stroke={1.8} />
          <span className="gp-label">{data.label}</span>
          {data.badge && <span className="gp-badge">{data.badge}</span>}
        </>
      )}
      <Handle type="source" id="r" position={Position.Right} />
      <Handle type="source" id="b" position={Position.Bottom} />
    </div>
  );
}

type GroupData = { label: string; sub?: string; icon?: IconName; dot?: string; w: number; h: number; kind: "package" | "phase" };

function Group({ data }: NodeProps<Node<GroupData>>) {
  return (
    <div className={`grp g-${data.kind}`} style={{ width: data.w, height: data.h }}>
      <div className="grp-head">
        {data.dot ? <i className="grp-dot" style={{ background: data.dot }} /> : data.icon && <Icon name={data.icon} size={14} />}
        <b>{data.label}</b>
        {data.sub && <span>{data.sub}</span>}
      </div>
    </div>
  );
}

type RingsData = { w: number; h: number; cx: number; cy: number; radii: number[]; xs: number; reached: number };

function Rings({ data }: NodeProps<Node<RingsData>>) {
  return (
    <svg width={data.w} height={data.h} className="rings" aria-hidden="true">
      {data.radii.slice(1).map((r, i) => (
        <g key={r}>
          <ellipse cx={data.cx} cy={data.cy} rx={r * data.xs} ry={r} className={data.reached >= i + 1 ? "ring on" : "ring"} />
          <text x={data.cx} y={data.cy + r - 8} textAnchor="middle" className="ring-label">{RING_NAME[i + 1]}</text>
        </g>
      ))}
    </svg>
  );
}

type DotData = { color: string; lit: boolean; flowing: boolean; current: boolean; dim: boolean; context: boolean; straight: boolean };

function DotEdge(p: EdgeProps<Edge<DotData>>) {
  const d = p.data!;
  const [path] = d.straight
    ? getStraightPath(p)
    : getSmoothStepPath({ ...p, borderRadius: 10, offset: 22 });
  return (
    <g className={`dedge${d.dim ? " dim" : ""}`}>
      <path d={path} className="de-line" stroke={d.lit ? d.color : "#c3cad1"} strokeDasharray={d.context ? "3 4" : undefined} />
      {d.lit && !d.context && <path d={path} className={`de-dots${d.flowing ? " run" : ""}${d.current ? " cur" : ""}`} stroke={d.color} />}
    </g>
  );
}

const nodeTypes = { pill: Pill, box: Group, rings: Rings };
const edgeTypes = { dot: DotEdge };

// ── Layouts ────────────────────────────────────────────────────────────────

const PILL_H = 32;
const pillWidth = (label: string, min = 120) => Math.max(min, Math.round(label.length * 7.4 + 46));

// The flow reads left to right like an architecture diagram: the app, the reconciler's four
// phases, then the DOM, one wide band to suit a wide canvas. Context calls sit above their caller.
// Positions are fixed so nothing jumps between steps.
const FLOW_POS: Record<string, [number, number]> = {
  setCount: [16, 132], "ctx-useState(4)": [16, 80],
  dispatchSetState: [336, 132], enqueueConcurrentHookUpdate: [336, 184], "ctx-requestUpdateLane": [336, 80],
  scheduleUpdateOnFiber: [616, 132], ensureRootIsScheduled: [616, 184], "ctx-markRootUpdated": [616, 80],
  performWorkOnRoot: [896, 132], workLoopSync: [896, 184], "ctx-renderRootSync": [896, 80],
  commitRoot: [1176, 132], commitMutationEffects: [1176, 184], "ctx-commitLayoutEffects": [1176, 80],
  commitTextUpdate: [1496, 132], "ctx-span text: 4 → 5": [1496, 80],
};

const FLOW_GROUPS: (GroupData & { id: string; x: number; y: number })[] = [
  { id: "g-app", kind: "package", label: "fixtures/counter", icon: "file", x: 0, y: 40, w: 264, h: 152 },
  { id: "g-rec", kind: "package", label: "react-reconciler", sub: "8 functions on this path", icon: "layers", x: 304, y: 0, w: 1136, h: 248 },
  { id: "g-Update", kind: "phase", label: "Update", dot: PHASE_SW.Update.fill, x: 320, y: 40, w: 264, h: 192 },
  { id: "g-Schedule", kind: "phase", label: "Schedule", dot: PHASE_SW.Schedule.fill, x: 600, y: 40, w: 264, h: 192 },
  { id: "g-Render", kind: "phase", label: "Render", dot: PHASE_SW.Render.fill, x: 880, y: 40, w: 264, h: 192 },
  { id: "g-Commit", kind: "phase", label: "Commit", dot: PHASE_SW.Commit.fill, x: 1160, y: 40, w: 264, h: 192 },
  { id: "g-dom", kind: "package", label: "react-dom-bindings", icon: "code", x: 1480, y: 40, w: 264, h: 152 },
];

// Fit leaves room for the tool strip and legend on top, and the playback bar below.
const FIT = { padding: { top: "84px", right: "28px", bottom: "150px", left: "28px" }, maxZoom: 1.25 } as const;

const elk = new ELK();

async function treeLayout(spec: ViewSpec): Promise<Record<string, [number, number]>> {
  const res = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "mrtree",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "28",
      "elk.mrtree.spacing.nodeNode": "28",
    },
    children: spec.nodes.map((n) => ({ id: n.id, width: pillWidth(n.label, 140), height: PILL_H })),
    edges: spec.edges.map((e, i) => ({ id: `e${i}`, sources: [e.from], targets: [e.to] })),
  });
  const pos: Record<string, [number, number]> = {};
  res.children?.forEach((c) => (pos[c.id] = [(c.x ?? 0) * 1.25, (c.y ?? 0) * 1.15]));
  return pos;
}

const BLAST = { w: 1000, h: 660, cx: 500, cy: 330, radii: [0, 120, 215, 300], xs: 1.5, start: [0, -Math.PI / 2, 0, -Math.PI / 2] };

function blastLayout(spec: ViewSpec): Record<string, [number, number]> {
  const rings = new Map<number, ViewNode[]>();
  spec.nodes.forEach((n) => {
    const r = Number(n.meta?.ring ?? 0);
    rings.set(r, [...(rings.get(r) ?? []), n]);
  });
  const pos: Record<string, [number, number]> = {};
  rings.forEach((ns, ring) =>
    ns.forEach((n, i) => {
      const w = pillWidth(n.label);
      if (ring === 0) return (pos[n.id] = [BLAST.cx - w / 2, BLAST.cy - PILL_H / 2]);
      const a = BLAST.start.at(ring)! + (i / ns.length) * Math.PI * 2;
      pos[n.id] = [BLAST.cx + Math.cos(a) * BLAST.radii.at(ring)! * BLAST.xs - w / 2, BLAST.cy + Math.sin(a) * BLAST.radii.at(ring)! - PILL_H / 2];
    }),
  );
  return pos;
}

function handlesFor(a: [number, number], b: [number, number]) {
  if (b[1] < a[1] - 20 && Math.abs(a[0] - b[0]) < 40) return { sourceHandle: "st", targetHandle: "tb" };
  if (Math.abs(a[0] - b[0]) < 40 || b[1] - a[1] > 80) return { sourceHandle: "b", targetHandle: "t" };
  return { sourceHandle: "r", targetHandle: "l" };
}

// ── The canvas ─────────────────────────────────────────────────────────────

type Props = {
  spec: ViewSpec;
  visible: Set<string>;
  step: number;
  ready: boolean;
  selected?: string;
  onSelect: (id: string) => void;
  inspector?: boolean;
  onToggleInspector?: () => void;
};

function Inner({ spec, visible, step, ready, selected, onSelect, inspector, onToggleInspector }: Props) {
  const rf = useReactFlow();
  const [hovered, setHovered] = useState<string>();
  const [flowOn, setFlowOn] = useState(true);
  const [follow, setFollow] = useState(false);
  const [showCtx, setShowCtx] = useState(true);
  const [treePos, setTreePos] = useState<Record<string, [number, number]>>();

  useEffect(() => {
    setTreePos(undefined);
    if (spec.archetype === "algoStepper") treeLayout(spec).then(setTreePos);
  }, [spec]);

  const pos = useMemo(() => {
    if (spec.archetype === "flowTrace") return FLOW_POS;
    if (spec.archetype === "blastRadius") return blastLayout(spec);
    return treePos ?? {};
  }, [spec, treePos]);

  const s = spec.steps[step];
  const frame = ready ? s?.frame : undefined;
  const focus = ready ? s?.focus ?? [] : [];
  const mainOrder = spec.nodes.filter((n) => !n.meta?.context).map((n) => n.id);
  const focusIdx = ready && spec.archetype === "flowTrace" ? mainOrder.indexOf(focus[0] ?? "") : -1;
  const reached = ready && spec.archetype === "blastRadius" ? step : -1;

  const isVisible = (n: ViewNode) => (n.meta?.context ? visible.has(String(n.meta.parent)) : visible.has(n.id));

  const neighbours = useMemo(() => {
    if (!hovered) return undefined;
    const set = new Set([hovered]);
    spec.edges.forEach((e) => {
      if (e.from === hovered) set.add(e.to);
      if (e.to === hovered) set.add(e.from);
    });
    return set;
  }, [hovered, spec]);

  const stateOf = (n: ViewNode): PillState => {
    if (!isVisible(n)) return "ghost";
    if (n.meta?.context) return "outline";
    if (spec.archetype === "flowTrace") {
      const i = mainOrder.indexOf(n.id);
      if (!ready) return "idle";
      return i === focusIdx ? "now" : i < focusIdx ? "past" : "idle";
    }
    if (spec.archetype === "algoStepper") {
      if (!frame) return "idle";
      if (focus.includes(n.id)) return "now";
      if (frame.flagged?.includes(n.id)) return "flagged";
      if (frame.skipped?.includes(n.id)) return "skipped";
      return frame.visited?.includes(n.id) ? "past" : "outline";
    }
    const ring = Number(n.meta?.ring ?? 0);
    if (!ready) return "idle";
    if (focus.includes(n.id)) return "now";
    return ring <= reached ? "past" : "outline";
  };

  const iconOf = (n: ViewNode): IconName =>
    n.kind === "test" ? "test" : n.kind === "state" ? "code" : n.kind === "fiber" ? (n.meta?.tag === "HostText" ? "file" : "layers") : "fn";

  const nodes: Node[] = [];
  if (spec.archetype === "flowTrace") {
    FLOW_GROUPS.forEach((g) =>
      nodes.push({ id: g.id, type: "box", position: { x: g.x, y: g.y }, data: g, draggable: false, selectable: false, zIndex: g.kind === "package" ? -2 : -1 }),
    );
  }
  if (spec.archetype === "blastRadius") {
    nodes.push({ id: "rings", type: "rings", position: { x: 0, y: 0 }, data: { ...BLAST, reached }, draggable: false, selectable: false, zIndex: -1 });
  }
  spec.nodes.forEach((n) => {
    const p = pos[n.id];
    if (!p) return;
    if (n.meta?.context && !showCtx) return;
    const width = spec.archetype === "flowTrace" ? 232 : pillWidth(n.label, spec.archetype === "algoStepper" ? 140 : 120);
    nodes.push({
      id: n.id,
      type: "pill",
      position: { x: p[0], y: p[1] },
      draggable: false,
      data: {
        label: n.label,
        icon: iconOf(n),
        swatch: swatchFor(spec, n.id),
        state: stateOf(n),
        width,
        context: !!n.meta?.context,
        dim: !!neighbours && !neighbours.has(n.id),
        selected: selected === n.id,
        badge: frame?.flagged?.includes(n.id) ? "Update" : undefined,
      } satisfies PillData,
    });
  });

  const edges: Edge[] = spec.edges
    .filter((e) => pos[e.from] && pos[e.to] && (showCtx || !e.context))
    .map((e) => {
      // Blast radius flows outward from the changed symbol.
      const [from, to] = spec.archetype === "blastRadius" ? [e.to, e.from] : [e.from, e.to];
      const a = spec.nodes.find((n) => n.id === from)!;
      const b = spec.nodes.find((n) => n.id === to)!;
      const lit = isVisible(a) && isVisible(b);
      let flowing = false;
      let current = false;
      if (ready && spec.archetype === "flowTrace" && !e.context) {
        const ti = mainOrder.indexOf(to);
        flowing = ti <= focusIdx;
        current = ti === focusIdx;
      } else if (ready && spec.archetype === "algoStepper") {
        flowing = !!frame?.visited?.includes(to);
        current = focus.includes(to);
      } else if (ready && spec.archetype === "blastRadius") {
        const ring = Math.max(Number(a.meta?.ring ?? 0), Number(b.meta?.ring ?? 0));
        flowing = ring <= reached;
        current = ring === reached;
      }
      return {
        id: `${from}->${to}`,
        source: from,
        target: to,
        type: "dot",
        ...(spec.archetype === "blastRadius" ? {} : handlesFor(pos[from], pos[to])),
        data: {
          color: swatchFor(spec, spec.archetype === "blastRadius" ? to : from).fill,
          lit,
          flowing: flowing && flowOn,
          current,
          dim: !!neighbours && !(neighbours.has(from) && neighbours.has(to)),
          context: !!e.context,
          straight: spec.archetype === "blastRadius",
        } satisfies DotData,
      };
    });

  // Refit when the answer or the frame changes; timers, not frames, so hidden tabs still lay out.
  useEffect(() => {
    const el = document.querySelector(".canvas-frame");
    if (!el) return;
    let t = 0;
    const fit = () => {
      clearTimeout(t);
      t = window.setTimeout(() => rf.fitView(FIT), 60);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [spec.id, treePos, rf]);

  useEffect(() => {
    if (!follow || !ready || !focus[0] || !pos[focus[0]]) return;
    const [x, y] = pos[focus[0]];
    rf.setCenter(x + 110, y + PILL_H / 2, { zoom: 1.15, duration: 450 });
  }, [follow, ready, step, focus, pos, rf]);

  const legend = useMemo(() => {
    const items = new Map<string, { swatch: Swatch; count: number; outline?: boolean }>();
    const add = (label: string, swatch: Swatch, outline?: boolean) => {
      const cur = items.get(label);
      items.set(label, { swatch, count: (cur?.count ?? 0) + 1, outline });
    };
    spec.nodes.forEach((n) => {
      if (spec.archetype === "flowTrace") {
        if (n.meta?.context) add("Context call", swatchFor(spec, n.id), true);
        else add(String(n.meta?.phase), swatchFor(spec, n.id));
      } else if (spec.archetype === "algoStepper") add(String(n.meta?.tag), swatchFor(spec, n.id));
      else add(RING_NAME[Number(n.meta?.ring ?? 0)], swatchFor(spec, n.id));
    });
    return [...items.entries()];
  }, [spec]);

  const Tool = ({ icon, label, on, onClick }: { icon: IconName; label: string; on?: boolean; onClick: () => void }) => (
    <button className={`tool${on ? " on" : ""}`} onClick={onClick} aria-pressed={on}>
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </button>
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={(_, n) => n.type === "pill" && onSelect(n.id)}
      onNodeMouseEnter={(_, n) => n.type === "pill" && setHovered(n.id)}
      onNodeMouseLeave={() => setHovered(undefined)}
      fitView
      fitViewOptions={FIT}
      minZoom={0.25}
      maxZoom={2}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#c5cdd4" />
      <Panel position="top-left" className="toolstrip">
        <Tool icon="target" label="Fit" onClick={() => rf.fitView({ ...FIT, duration: 400 })} />
        <Tool icon="radar" label="Follow" on={follow} onClick={() => setFollow((f) => !f)} />
        <Tool icon="flow" label="Flow" on={flowOn} onClick={() => setFlowOn((f) => !f)} />
        {spec.archetype === "flowTrace" && <Tool icon="layers" label="Context" on={showCtx} onClick={() => setShowCtx((c) => !c)} />}
        {onToggleInspector && <Tool icon="code" label="Inspector" on={inspector} onClick={onToggleInspector} />}
      </Panel>
      <Panel position="top-right" className="legend" aria-label="Legend">
        {legend.map(([label, v]) => (
          <span key={label} className="legend-row">
            <i className={v.outline ? "sw outline" : "sw"} style={{ background: v.outline ? "#fff" : v.swatch.fill, borderColor: v.swatch.fill }} />
            {label}
            <span className="num">{v.count}</span>
          </span>
        ))}
      </Panel>
      {follow && <MiniMap
        position="bottom-right"
        pannable
        zoomable
        nodeColor={(n) => (n.type === "pill" ? (n.data as PillData).swatch.fill : "transparent")}
        nodeStrokeColor={(n) => (n.type === "box" ? "#9aa6b1" : "transparent")}
        maskColor="rgba(236, 240, 243, 0.65)"
        style={{ width: 150, height: 96 }}
      />}
      <Controls position="bottom-left" showInteractive={false} />
    </ReactFlow>
  );
}

export default function GraphCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

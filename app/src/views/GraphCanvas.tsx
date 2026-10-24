import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap, Panel, Handle, Position,
  getSmoothStepPath, getStraightPath, useReactFlow,
  type Node, type Edge, type NodeProps, type EdgeProps,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import "@xyflow/react/dist/style.css";
import type { ViewSpec, ViewNode } from "../data/types";
import { Icon, type IconName } from "../ui/Icon";
import { NumberTicker } from "@/components/motion/number-ticker";
import { EASE_OUT } from "@/lib/ease";

// ── Colour: one solid swatch per category, as in a lineage graph ───────────

export type Swatch = { fill: string; ink: string };
// Saturated, clearly separate hues, like a Quiver canvas: each group is its own colour at a glance.
const SW = {
  yellow: { fill: "#f5a524", ink: "#2a1a00" },
  green: { fill: "#12a594", ink: "#ffffff" },
  blue: { fill: "#2d72d2", ink: "#ffffff" },
  rose: { fill: "#e5484d", ink: "#ffffff" },
  plum: { fill: "#8e4ec6", ink: "#ffffff" },
  ink: { fill: "#1c2024", ink: "#ffffff" },
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
  context?: boolean; dim?: boolean; selected?: boolean; badge?: string; suggested?: boolean; order: number;
};

// Pills grow out of their ghost when the agent finds the symbol, so the answer reads as being built.
// Entrances only: state changes after that are CSS transitions, which retarget when steps play fast.
function Pill({ data }: NodeProps<Node<PillData>>) {
  const reduce = useReducedMotion();
  const shown = data.state !== "ghost";
  const cls = ["gp", `s-${data.state}`, data.context ? "ctx" : "", data.dim ? "dim" : "", data.selected ? "sel" : "", data.suggested ? "sug" : ""].join(" ");
  return (
    <motion.div
      className={cls}
      style={{ width: data.width, ["--fill" as string]: data.swatch.fill, ["--ink" as string]: data.swatch.ink }}
      initial={false}
      animate={{ transform: data.state === "now" ? "scale(1.06)" : shown || reduce ? "scale(1)" : "scale(0.94)" }}
      whileTap={{ transform: "scale(0.97)", transition: { duration: 0.12 } }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: shown && data.state !== "now" ? Math.min(data.order, 8) * 0.04 : 0 }}
    >
      <Handle type="target" id="l" position={Position.Left} />
      <Handle type="target" id="t" position={Position.Top} />
      <Handle type="target" id="tb" position={Position.Bottom} />
      <Handle type="source" id="st" position={Position.Top} />
      <AnimatePresence initial={false}>
        {shown && (
          <motion.span
            key="c"
            className="gp-in"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px)", filter: "blur(4px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.26, ease: EASE_OUT, delay: Math.min(data.order, 8) * 0.04 }}
          >
            <span className="gp-chip"><Icon name={data.icon} size={15} stroke={2} /></span>
            <span className="gp-label">{data.label}</span>
            {data.badge && <span className="gp-badge">{data.badge}</span>}
          </motion.span>
        )}
      </AnimatePresence>
      {data.suggested && <span className="gp-sug" aria-label="Suggested from the conversation" />}
      <Handle type="source" id="r" position={Position.Right} />
      <Handle type="source" id="b" position={Position.Bottom} />
    </motion.div>
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

// Each ring the impact reaches sends one ripple out from the changed symbol to that ring.
function Rings({ data }: NodeProps<Node<RingsData>>) {
  const reduce = useReducedMotion();
  const r = data.radii[data.reached];
  return (
    <svg width={data.w} height={data.h} className="rings" aria-hidden="true">
      {data.radii
        .map((r, i) => ({ r, i }))
        .slice(1)
        .reverse()
        .map(({ r, i }) => (
          <g key={r} style={{ ["--ring" as string]: RING_SW[i].fill }}>
            <ellipse cx={data.cx} cy={data.cy} rx={r * data.xs} ry={r} className={data.reached >= i ? "ring on" : "ring"} />
            <text x={data.cx} y={data.cy + r - 10} textAnchor="middle" className="ring-label">{RING_NAME[i]}</text>
          </g>
        ))}
      {!reduce && data.reached > 0 && r && (
        <motion.ellipse
          key={data.reached}
          cx={data.cx}
          cy={data.cy}
          className="ripple"
          style={{ stroke: RING_SW[data.reached]?.fill }}
          initial={{ rx: 20 * data.xs, ry: 20, opacity: 0.7 }}
          animate={{ rx: r * data.xs, ry: r, opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
        />
      )}
    </svg>
  );
}

type DotData = { color: string; lit: boolean; flowing: boolean; current: boolean; dim: boolean; context: boolean; straight: boolean };

function DotEdge(p: EdgeProps<Edge<DotData>>) {
  const d = p.data!;
  const [path] = d.straight
    ? getStraightPath(p)
    : getSmoothStepPath({ ...p, borderRadius: 10, offset: 22 });
  // A lit edge draws itself from caller to callee, then the dots start to flow.
  return (
    <g className={`dedge${d.dim ? " dim" : ""}`}>
      <path d={path} className="de-line" stroke="#c3cad1" strokeDasharray={d.context ? "3 4" : undefined} />
      {d.lit && !d.context && (
        <motion.path d={path} className="de-line lit" stroke={d.color} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: EASE_OUT }} />
      )}
      {d.lit && d.context && <path d={path} className="de-line lit" stroke={d.color} strokeDasharray="3 4" />}
      {d.lit && !d.context && <path d={path} className={`de-dots${d.flowing ? " run" : ""}${d.current ? " cur" : ""}`} stroke={d.color} />}
    </g>
  );
}

const nodeTypes = { pill: Pill, box: Group, rings: Rings };
const edgeTypes = { dot: DotEdge };

// ── Layouts ────────────────────────────────────────────────────────────────

// Sized to be read from across a room on a projector: 14px labels at zoom 1, and the fit zooms past 1 when there's space.
const PILL_H = 40;
const FLOW_W = 252;
const pillWidth = (label: string, min = 140) => Math.max(min, Math.round(label.length * 8.3 + 58));

// The flow reads left to right like an architecture diagram: the app, the reconciler's four
// phases, then the DOM, one wide band to suit a wide canvas. Context calls sit above their caller.
// Positions are fixed so nothing jumps between steps.
// Drawn on a 32px-pill grid; FX/FY stretch it to fit the 40px pills.
const FX = 1.1;
const FY = 1.15;
const FLOW_GRID: Record<string, [number, number]> = {
  setCount: [16, 132], "ctx-useState(4)": [16, 80],
  dispatchSetState: [336, 132], enqueueConcurrentHookUpdate: [336, 184], "ctx-requestUpdateLane": [336, 80],
  scheduleUpdateOnFiber: [616, 132], ensureRootIsScheduled: [616, 184], "ctx-markRootUpdated": [616, 80],
  performWorkOnRoot: [896, 132], workLoopSync: [896, 184], "ctx-renderRootSync": [896, 80],
  commitRoot: [1176, 132], commitMutationEffects: [1176, 184], "ctx-commitLayoutEffects": [1176, 80],
  commitTextUpdate: [1496, 132], "ctx-span text: 4 → 5": [1496, 80],
};

const FLOW_POS = Object.fromEntries(Object.entries(FLOW_GRID).map(([k, [x, y]]) => [k, [x * FX, y * FY]])) as Record<string, [number, number]>;

const FLOW_GROUPS_GRID: (GroupData & { id: string; x: number; y: number })[] = [
  { id: "g-app", kind: "package", label: "fixtures/counter", icon: "file", x: 0, y: 40, w: 264, h: 152 },
  { id: "g-rec", kind: "package", label: "react-reconciler", sub: "8 functions on this path", icon: "layers", x: 304, y: 0, w: 1136, h: 248 },
  { id: "g-Update", kind: "phase", label: "Update", dot: PHASE_SW.Update.fill, x: 320, y: 40, w: 264, h: 192 },
  { id: "g-Schedule", kind: "phase", label: "Schedule", dot: PHASE_SW.Schedule.fill, x: 600, y: 40, w: 264, h: 192 },
  { id: "g-Render", kind: "phase", label: "Render", dot: PHASE_SW.Render.fill, x: 880, y: 40, w: 264, h: 192 },
  { id: "g-Commit", kind: "phase", label: "Commit", dot: PHASE_SW.Commit.fill, x: 1160, y: 40, w: 264, h: 192 },
  { id: "g-dom", kind: "package", label: "react-dom-bindings", icon: "code", x: 1480, y: 40, w: 264, h: 152 },
];
const FLOW_GROUPS = FLOW_GROUPS_GRID.map((g) => ({ ...g, x: g.x * FX, y: g.y * FY, w: g.w * FX, h: g.h * FY }));

// Fit leaves room for the tool strip and legend on top, the playback bar below,
// and the conversation panel on the right while it's open.
const fitFor = (right: number) =>
  ({ padding: { top: "76px", right: `${right + 24}px`, bottom: "96px", left: "24px" }, maxZoom: 1.6 }) as const;

const elk = new ELK();

async function treeLayout(spec: ViewSpec): Promise<Record<string, [number, number]>> {
  const res = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "mrtree",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "22",
      "elk.mrtree.spacing.nodeNode": "22",
    },
    children: spec.nodes.map((n) => ({ id: n.id, width: pillWidth(n.label, 150), height: PILL_H })),
    edges: spec.edges.map((e, i) => ({ id: `e${i}`, sources: [e.from], targets: [e.to] })),
  });
  const pos: Record<string, [number, number]> = {};
  res.children?.forEach((c) => (pos[c.id] = [(c.x ?? 0) * 1.2, (c.y ?? 0) * 1.1]));
  return pos;
}

const RADII = [0, 105, 190, 272];
const START = [0, -Math.PI / 2, Math.PI / 6, -Math.PI / 2 + Math.PI / 5];

/**
 * Rings of impact, stretched sideways to the canvas's own shape so a wide screen
 * spends its width on spacing instead of shrinking every label to fit a circle.
 */
function blastLayout(spec: ViewSpec, aspect: number) {
  const widest = Math.max(...spec.nodes.map((n) => pillWidth(n.label)));
  const h = RADII[3] * 2 + PILL_H + 48;
  const xs = Math.min(2.6, Math.max(1.3, (h * aspect - widest) / (RADII[3] * 2)));
  const w = RADII[3] * 2 * xs + widest;
  const geo = { w, h, cx: w / 2, cy: h / 2, radii: RADII, xs };
  const rings = new Map<number, ViewNode[]>();
  spec.nodes.forEach((n) => {
    const r = Number(n.meta?.ring ?? 0);
    rings.set(r, [...(rings.get(r) ?? []), n]);
  });
  const pos: Record<string, [number, number]> = {};
  rings.forEach((ns, ring) =>
    ns.forEach((n, i) => {
      const nw = pillWidth(n.label);
      if (ring === 0) return (pos[n.id] = [geo.cx - nw / 2, geo.cy - PILL_H / 2]);
      const a = START[ring] + (i / ns.length) * Math.PI * 2;
      pos[n.id] = [geo.cx + Math.cos(a) * RADII[ring] * xs - nw / 2, geo.cy + Math.sin(a) * RADII[ring] - PILL_H / 2];
    }),
  );
  // Pills on neighbouring rings can land on each other; nudge the outer one along its ring's vertical until they clear.
  const ringOf = (id: string) => Number(spec.nodes.find((n) => n.id === id)?.meta?.ring ?? 0);
  const ids = Object.keys(pos);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (const a of ids)
      for (const b of ids) {
        if (a >= b) continue;
        const [ax, ay] = pos[a];
        const [bx, by] = pos[b];
        const aw = pillWidth(spec.nodes.find((n) => n.id === a)!.label);
        const bw = pillWidth(spec.nodes.find((n) => n.id === b)!.label);
        const gap = 14;
        if (ax < bx + bw + gap && bx < ax + aw + gap && ay < by + PILL_H + gap && by < ay + PILL_H + gap) {
          const outer = ringOf(a) >= ringOf(b) ? a : b;
          const inner = outer === a ? b : a;
          pos[outer] = [pos[outer][0], pos[outer][1] + (pos[outer][1] >= pos[inner][1] ? 8 : -8)];
          moved = true;
        }
      }
    if (!moved) break;
  }
  return { pos, geo };
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
  /** Nodes the live conversation points at; they pulse until applied or dismissed. */
  suggested?: Set<string>;
  /** Pan to a node, e.g. when a suggestion is applied. `n` makes repeats fire. */
  flyTo?: { id: string; n: number };
  /** Width covered on the right by a floating panel, kept clear when fitting. */
  rightInset?: number;
  /** Extra controls appended to the tool strip. */
  tools?: ReactNode;
};

function Inner({ spec, visible, step, ready, selected, onSelect, inspector, onToggleInspector, suggested, flyTo, rightInset = 0, tools }: Props) {
  const rf = useReactFlow();
  const wrap = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string>();
  const [flowOn, setFlowOn] = useState(true);
  const [follow, setFollow] = useState(false);
  const [showCtx, setShowCtx] = useState(true);
  const [treePos, setTreePos] = useState<Record<string, [number, number]>>();
  const [aspect, setAspect] = useState(2);
  const [availW, setAvailW] = useState(1600);
  const FIT = useMemo(() => fitFor(rightInset), [rightInset]);

  useEffect(() => {
    setTreePos(undefined);
    if (spec.archetype === "algoStepper") treeLayout(spec).then(setTreePos);
  }, [spec]);

  // The usable area's shape, minus the overlays the fit keeps clear. Rounded so small resizes don't relayout.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      const a = (width - rightInset - 48) / Math.max(200, height - 172);
      setAspect(Math.round(Math.max(1, a) * 4) / 4);
      setAvailW(Math.round((width - rightInset - 48) / 50) * 50);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rightInset]);

  const blast = useMemo(() => (spec.archetype === "blastRadius" ? blastLayout(spec, aspect) : undefined), [spec, aspect]);

  const pos = useMemo(() => {
    if (spec.archetype === "flowTrace") return FLOW_POS;
    if (blast) return blast.pos;
    return treePos ?? {};
  }, [spec, treePos, blast]);

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
      nodes.push({ id: g.id, type: "box", position: { x: g.x, y: g.y }, width: g.w, height: g.h, data: g, draggable: false, selectable: false, zIndex: g.kind === "package" ? -2 : -1 }),
    );
  }
  if (spec.archetype === "blastRadius") {
    if (blast) nodes.push({ id: "rings", type: "rings", position: { x: 0, y: 0 }, width: blast.geo.w, height: blast.geo.h, data: { ...blast.geo, reached }, draggable: false, selectable: false, zIndex: -1 });
  }
  const ringIndex = new Map<string, number>();
  if (spec.archetype === "blastRadius") {
    const seen = new Map<number, number>();
    spec.nodes.forEach((n) => {
      const r = Number(n.meta?.ring ?? 0);
      ringIndex.set(n.id, seen.get(r) ?? 0);
      seen.set(r, (seen.get(r) ?? 0) + 1);
    });
  }
  spec.nodes.forEach((n) => {
    const p = pos[n.id];
    if (!p) return;
    if (n.meta?.context && !showCtx) return;
    const width = spec.archetype === "flowTrace" ? FLOW_W : pillWidth(n.label, spec.archetype === "algoStepper" ? 150 : 140);
    nodes.push({
      id: n.id,
      type: "pill",
      position: { x: p[0], y: p[1] },
      // Sizes are known up front, so nodes show without waiting for a DOM measurement.
      width,
      height: PILL_H,
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
        suggested: !!suggested?.has(n.id),
        order: ringIndex.get(n.id) ?? 0,
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
  // The first fit lands instantly; later ones (resize, panel opening) glide so the view never jumps.
  const fitted = useRef(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let t = 0;
    const fit = () => {
      clearTimeout(t);
      t = window.setTimeout(() => {
        rf.fitView({ ...FIT, duration: fitted.current ? 320 : 0 });
        fitted.current = true;
      }, 60);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [spec.id, treePos, blast, FIT, rf]);

  // The flow is one wide band; when fitting it whole would shrink labels past legibility, follow the step instead.
  const FLOW_SPAN = 1760 * FX;
  const tooSmall = spec.archetype === "flowTrace" && availW / FLOW_SPAN < 0.75;
  useEffect(() => {
    if (tooSmall) setFollow(true);
  }, [tooSmall, spec.id]);

  useEffect(() => {
    if (!follow || !ready || !focus[0] || !pos[focus[0]]) return;
    const [x, y] = pos[focus[0]];
    rf.setCenter(x + FLOW_W / 2 + rightInset / 2 / 1.3, y + PILL_H / 2, { zoom: 1.3, duration: 450 });
  }, [follow, ready, step, focus, pos, rf]);

  useEffect(() => {
    if (!flyTo || !pos[flyTo.id]) return;
    const [x, y] = pos[flyTo.id];
    const n = spec.nodes.find((v) => v.id === flyTo.id);
    rf.setCenter(x + pillWidth(n?.label ?? "") / 2 + rightInset / 2 / 1.4, y + PILL_H / 2, { zoom: 1.4, duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo]);

  const legend = useMemo(() => {
    const items = new Map<string, { swatch: Swatch; count: number; found: number; outline?: boolean }>();
    const add = (label: string, swatch: Swatch, found: boolean, outline?: boolean) => {
      const cur = items.get(label);
      items.set(label, { swatch, count: (cur?.count ?? 0) + 1, found: (cur?.found ?? 0) + (found ? 1 : 0), outline });
    };
    spec.nodes.forEach((n) => {
      const found = isVisible(n);
      if (spec.archetype === "flowTrace") {
        if (n.meta?.context) add("Context call", swatchFor(spec, n.id), found, true);
        else add(String(n.meta?.phase), swatchFor(spec, n.id), found);
      } else if (spec.archetype === "algoStepper") add(String(n.meta?.tag), swatchFor(spec, n.id), found);
      else add(RING_NAME[Number(n.meta?.ring ?? 0)], swatchFor(spec, n.id), found);
    });
    return [...items.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, visible]);

  const Tool = ({ icon, label, on, onClick }: { icon: IconName; label: string; on?: boolean; onClick: () => void }) => (
    <button className={`tool${on ? " on" : ""}`} onClick={onClick} aria-pressed={on}>
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </button>
  );

  return (
    <div ref={wrap} className="rf-wrap">
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
        {tools}
      </Panel>
      <Panel position="top-right" className="legend" aria-label="Legend" style={{ marginRight: rightInset ? rightInset + 15 : undefined }}>
        {legend.map(([label, v]) => (
          <span key={label} className="legend-row" style={{ ["--c" as string]: v.swatch.fill }}>
            <i className={v.outline ? "sw outline" : "sw"} style={{ background: v.outline ? "#fff" : v.swatch.fill, borderColor: v.swatch.fill }} />
            {label}
            <NumberTicker value={v.found} startOnView={false} duration={0.5} stagger={0} className="num" />
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
    </div>
  );
}

export default function GraphCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

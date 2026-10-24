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
import type { Anchor } from "../engine/roomTypes";
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

// Views of the real index have no phases: nodes are coloured by the crate they live in.
const CRATE_SW = [SW.blue, SW.green, SW.yellow, SW.plum, SW.rose, SW.ink];
// Each crate in a view gets the next colour, in order of appearance, so neighbours never share one.
const crateOf = (n: ViewNode) => String(n.meta?.crate ?? n.meta?.lane ?? "");
const crateOrder = new WeakMap<ViewSpec, string[]>();
const crateSwatch = (spec: ViewSpec, crate: string) => {
  let order = crateOrder.get(spec);
  if (!order) crateOrder.set(spec, (order = [...new Set(spec.nodes.filter((n) => !n.meta?.context).map(crateOf))]));
  const i = order.indexOf(crate);
  return CRATE_SW[(i < 0 ? order.length : i) % CRATE_SW.length];
};
const byCrate = (spec: ViewSpec) => spec.archetype !== "algoStepper" && spec.archetype !== "blastRadius";

/** The legend group a node belongs to: its phase, fiber tag, ring or crate. */
export function groupOf(spec: ViewSpec, id: string): string {
  const n = spec.nodes.find((x) => x.id === id);
  if (!n) return "";
  if (byCrate(spec)) return n.meta?.context ? "Context call" : `crate ${String(n.meta?.crate ?? n.meta?.lane ?? "?")}`;
  if (spec.archetype === "flowTrace") return n.meta?.context ? "Context call" : String(n.meta?.phase);
  if (spec.archetype === "algoStepper") return String(n.meta?.tag);
  return RING_NAME[Number(n.meta?.ring ?? 0)];
}

export function swatchFor(spec: ViewSpec, id: string): Swatch {
  const n = spec.nodes.find((x) => x.id === id);
  if (!n) return SW.ink;
  if (byCrate(spec)) return crateSwatch(spec, crateOf(n));
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
      animate={{ transform: shown || reduce ? "scale(1)" : "scale(0.96)" }}
      whileTap={{ transform: "scale(0.97)", transition: { duration: 0.12 } }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: shown ? Math.min(data.order, 8) * 0.04 : 0 }}
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

/** A proposal from the conversation, drawn on the graph next to the code it is about. */
export type GraphProposal = {
  id: string;
  kind: "focus" | "ask" | "change" | "view";
  title: string;
  /** The change to build, or why it was proposed. */
  detail?: string;
  speaker?: string;
  state: "pending" | "approved" | "sent" | "in_progress" | "done" | "dismissed";
  anchors: Anchor[];
};

type ProposalData = GraphProposal & { onVerdict?: (id: string, verdict: "accept" | "decline") => void };

const PROPOSAL_W = 300;
const PROPOSAL_H = 168;
const STATE_TEXT: Record<GraphProposal["state"], string> = {
  pending: "",
  approved: "Accepted · ready for the agent",
  sent: "Sent to the agent",
  in_progress: "The agent is building it",
  done: "Built by the agent",
  dismissed: "The agent set it aside",
};

function ProposalCard({ data }: NodeProps<Node<ProposalData>>) {
  const reduce = useReducedMotion();
  const pending = data.state === "pending";
  const label = data.kind === "view" ? "View" : data.kind === "change" ? "Change" : data.kind === "ask" ? "Question" : "Focus";
  return (
    <motion.div
      className={`gprop k-${data.kind} st-${data.state}`}
      style={{ width: PROPOSAL_W, minHeight: PROPOSAL_H }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px) scale(0.98)" }}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      transition={{ duration: 0.26, ease: EASE_OUT }}
    >
      <Handle type="target" id="t" position={Position.Top} />
      <div className="gprop-head">
        <span className="gprop-kind">{label}</span>
        {data.speaker && <span className="gprop-who">from {data.speaker}</span>}
      </div>
      <b className="gprop-title">{data.title}</b>
      {data.detail && <p className="gprop-detail">{data.detail}</p>}
      {pending ? (
        <div className="gprop-actions">
          {/* nodrag/nopan: buttons inside a React Flow node must not start a pan or a drag. */}
          <button
            className="gprop-btn yes nodrag nopan"
            onClick={(e) => {
              e.stopPropagation();
              data.onVerdict?.(data.id, "accept");
            }}
          >
            <Icon name="tick" size={14} /> {data.kind === "view" ? "Show it" : "Accept"}
          </button>
          <button
            className="gprop-btn nodrag nopan"
            onClick={(e) => {
              e.stopPropagation();
              data.onVerdict?.(data.id, "decline");
            }}
          >
            Decline
          </button>
        </div>
      ) : (
        <div className={`gprop-state st-${data.state}`}>
          {data.state === "in_progress" ? <i className="ar-spin" /> : <Icon name="tick" size={14} />} {STATE_TEXT[data.state]}
        </div>
      )}
    </motion.div>
  );
}

/** A symbol a proposal touches that this view doesn't draw: it hangs above the proposal, dashed. */
function GhostSymbol({ data }: NodeProps<Node<{ label: string; file?: string; width: number }>>) {
  return (
    <div className="gp s-outline ctx gghost" style={{ width: data.width, ["--fill" as string]: "#f48120", ["--ink" as string]: "#fff" }} title={data.file}>
      <Handle type="target" id="t" position={Position.Top} />
      <span className="gp-in">
        <span className="gp-chip"><Icon name="fn" size={15} stroke={2} /></span>
        <span className="gp-label">{data.label}</span>
      </span>
      <Handle type="source" id="b" position={Position.Bottom} />
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
        // Drawn at the target ring's size and scaled up from the centre: transform and opacity only.
        <motion.ellipse
          key={data.reached}
          cx={data.cx}
          cy={data.cy}
          rx={r * data.xs}
          ry={r}
          className="ripple"
          style={{ stroke: RING_SW[data.reached]?.fill, transformBox: "fill-box", transformOrigin: "center" }}
          initial={{ transform: "scale(0.08)", opacity: 0.35 }}
          animate={{ transform: "scale(1)", opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
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
        <motion.path d={path} className="de-line lit" stroke={d.color} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, ease: EASE_OUT }} />
      )}
      {d.lit && d.context && <path d={path} className="de-line lit" stroke={d.color} strokeDasharray="3 4" />}
      {d.lit && !d.context && <path d={path} className={`de-dots${d.flowing ? " run" : ""}${d.current ? " cur" : ""}`} stroke={d.color} />}
    </g>
  );
}

const nodeTypes = { pill: Pill, box: Group, rings: Rings, proposal: ProposalCard, ghost: GhostSymbol };
const edgeTypes = { dot: DotEdge };

// ── Layouts ────────────────────────────────────────────────────────────────

// Sized to be read from across a room on a projector: 14px labels at zoom 1, and the fit zooms past 1 when there's space.
const PILL_H = 40;
const pillWidth = (label: string, min = 140) => Math.max(min, Math.round(label.length * 8.3 + 58));

// Fit leaves room for the tool strip and legend on top, the playback bar below,
// and the conversation panel on the right while it's open.
const fitFor = (right: number) =>
  ({ padding: { top: "76px", right: `${right + 24}px`, bottom: "96px", left: "24px" }, maxZoom: 1.6 }) as const;

const elk = new ELK();
const NONE: GraphProposal[] = [];

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

/** Real-repo flows, call trees and the rest: left to right, callers before callees. */
async function layeredLayout(spec: ViewSpec): Promise<Record<string, [number, number]>> {
  const res = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "28",
      "elk.layered.spacing.nodeNodeBetweenLayers": "64",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
    children: spec.nodes.map((n) => ({ id: n.id, width: pillWidth(n.label, 150), height: PILL_H })),
    edges: spec.edges.map((e, i) => ({ id: `e${i}`, sources: [e.from], targets: [e.to] })),
  });
  const pos: Record<string, [number, number]> = {};
  res.children?.forEach((c) => (pos[c.id] = [c.x ?? 0, c.y ?? 0]));
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
  /** Proposals from the conversation, drawn under the graph and linked to the nodes they touch. */
  proposals?: GraphProposal[];
  onProposal?: (id: string, verdict: "accept" | "decline") => void;
};

function Inner({ spec, visible, step, ready, selected, onSelect, inspector, onToggleInspector, suggested, flyTo, rightInset = 0, tools, proposals = NONE, onProposal }: Props) {
  const rf = useReactFlow();
  const wrap = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string>();
  const [flowOn, setFlowOn] = useState(true);
  const [follow, setFollow] = useState(false);
  const [showCtx, setShowCtx] = useState(true);
  const [treePos, setTreePos] = useState<Record<string, [number, number]>>();
  const [aspect, setAspect] = useState(2);
  const FIT = useMemo(() => fitFor(rightInset), [rightInset]);

  useEffect(() => {
    let live = true;
    setTreePos(undefined);
    const layout = spec.archetype === "algoStepper" ? treeLayout : spec.archetype === "blastRadius" ? undefined : layeredLayout;
    // A layout that fails (a malformed view) draws nothing rather than crashing the room.
    layout?.(spec).then((p) => live && setTreePos(p)).catch(() => live && setTreePos({}));
    return () => {
      live = false;
    };
  }, [spec]);

  // The usable area's shape, minus the overlays the fit keeps clear. Rounded so small resizes don't relayout.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      // Laid out for the space actually left beside the panel; nodes glide there (see .react-flow__node in CSS).
      const a = (width - rightInset - 48) / Math.max(200, height - 172);
      setAspect(Math.round(Math.max(1, a) * 4) / 4);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rightInset]);

  const blast = useMemo(() => (spec.archetype === "blastRadius" ? blastLayout(spec, aspect) : undefined), [spec, aspect]);

  const pos = useMemo(() => {
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
    if (spec.archetype !== "blastRadius") {
      // Call trees and other live views: what the steps so far have shown is done.
      if (!ready) return "idle";
      if (focus.includes(n.id)) return "now";
      return spec.steps.slice(0, step).some((st) => st.focus.includes(n.id)) ? "past" : "idle";
    }
    const ring = Number(n.meta?.ring ?? 0);
    if (!ready) return "idle";
    if (focus.includes(n.id)) return "now";
    return ring <= reached ? "past" : "outline";
  };

  const iconOf = (n: ViewNode): IconName =>
    n.kind === "test" ? "test" : n.kind === "state" ? "code" : n.kind === "fiber" ? (n.meta?.tag === "HostText" ? "file" : "layers") : "fn";

  const nodes: Node[] = [];
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
    const width = pillWidth(n.label, spec.archetype === "blastRadius" ? 140 : 150);
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
        ...(spec.archetype === "blastRadius" ? {} : { sourceHandle: "r", targetHandle: "l" }),
        data: {
          color: swatchFor(spec, spec.archetype === "blastRadius" ? to : from).fill,
          lit,
          // Constant motion everywhere pulls the eye from the step being explained: only the current hop moves.
          flowing: flowing && current && flowOn,
          current,
          dim: !!neighbours && !(neighbours.has(from) && neighbours.has(to)),
          context: !!e.context,
          straight: spec.archetype === "blastRadius",
        } satisfies DotData,
      };
    });

  // Proposals sit in a lane under the graph, each under the nodes it touches, linked by a dashed line.
  // Symbols a proposal names that this view doesn't draw hang between the graph and its card.
  const pillBox = new Map(nodes.filter((n) => n.type === "pill").map((n) => [n.id, { x: n.position.x, w: Number(n.width ?? 140) }]));
  const bottom = Math.max(0, ...nodes.filter((n) => n.type !== "box").map((n) => n.position.y + Number(n.height ?? PILL_H)));
  const left = Math.min(0, ...nodes.map((n) => n.position.x));
  const lane = bottom + 150;
  const propPos: Record<string, [number, number]> = {};
  const wanted = proposals
    .map((p) => {
      const on = p.anchors.flatMap((a) => (a.nodeId && pillBox.has(a.nodeId) ? [pillBox.get(a.nodeId)!] : []));
      return { p, want: on.length ? on.reduce((sum, b) => sum + b.x + b.w / 2, 0) / on.length - PROPOSAL_W / 2 : Number.POSITIVE_INFINITY };
    })
    // Stable: cards with no anchor on screen keep their order of arrival at the end of the lane.
    .sort((a, b) => a.want - b.want);
  let cursor = left;
  for (const { p, want } of wanted) {
    const x = Math.max(cursor, Number.isFinite(want) ? want : cursor);
    cursor = x + PROPOSAL_W + 28;
    propPos[p.id] = [x, lane];
    nodes.push({ id: `prop:${p.id}`, type: "proposal", position: { x, y: lane }, width: PROPOSAL_W, height: PROPOSAL_H, draggable: false, selectable: false, zIndex: 5, data: { ...p, onVerdict: onProposal } satisfies ProposalData });
    const color = p.state === "pending" ? "#f48120" : "#12a594";
    const link = (source: string, sourceHandle: string, straight: boolean) =>
      edges.push({ id: `${source}->prop:${p.id}`, source, target: `prop:${p.id}`, sourceHandle, targetHandle: "t", type: "dot", data: { color, lit: true, flowing: false, current: false, dim: false, context: true, straight } satisfies DotData });
    p.anchors
      .filter((a) => !a.nodeId || !pillBox.has(a.nodeId))
      .forEach((a, i) => {
        const label = a.symbol.split("::").slice(-2).join("::");
        const w = Math.min(PROPOSAL_W, pillWidth(label, 140));
        const gid = `ghost:${p.id}:${i}`;
        nodes.push({ id: gid, type: "ghost", position: { x: x + i * 22, y: lane - 84 + i * 10 }, width: w, height: PILL_H, draggable: false, selectable: false, zIndex: 4, data: { label, file: a.file, width: w } });
        link(gid, "b", true);
      });
    p.anchors.forEach((a) => a.nodeId && pillBox.has(a.nodeId) && link(a.nodeId, "b", false));
  }

  // Fit to every node's known box. React Flow's own fitView only counts nodes it has measured, and
  // nodes given an explicit size aren't measured, so it would fit the proposal cards alone.
  const bounds = useRef({ x: 0, y: 0, width: 1, height: 1 });
  {
    const boxes = nodes.filter((n) => n.width && n.height);
    if (boxes.length) {
      const x0 = Math.min(...boxes.map((n) => n.position.x));
      const y0 = Math.min(...boxes.map((n) => n.position.y));
      const x1 = Math.max(...boxes.map((n) => n.position.x + Number(n.width)));
      const y1 = Math.max(...boxes.map((n) => n.position.y + Number(n.height)));
      bounds.current = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    }
  }
  const fitAll = (duration: number) => {
    const el = wrap.current;
    if (!el) return;
    const { width: W, height: H } = el.getBoundingClientRect();
    const [t, r, b, l] = [76, rightInset + 24, 96, 24];
    const box = bounds.current;
    const zoom = Math.max(0.25, Math.min(FIT.maxZoom, (W - l - r) / box.width, (H - t - b) / box.height));
    rf.setViewport(
      { x: l + (W - l - r - box.width * zoom) / 2 - box.x * zoom, y: t + (H - t - b - box.height * zoom) / 2 - box.y * zoom, zoom },
      { duration },
    );
  };

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
        fitAll(fitted.current ? 300 : 0);
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
  }, [spec.id, treePos, blast, FIT, rf, wanted.length]);

  useEffect(() => {
    if (!follow || !ready || !focus[0] || !pos[focus[0]]) return;
    const [x, y] = pos[focus[0]];
    rf.setCenter(x + pillWidth(spec.nodes.find((n) => n.id === focus[0])?.label ?? "", 150) / 2 + rightInset / 2 / 1.3, y + PILL_H / 2, { zoom: Math.max(rf.getZoom(), 0.9), duration: 400 });
  }, [follow, ready, step, focus, pos, rf]);

  // Bringing a node into view: if it's already on screen, the highlight is enough; otherwise
  // pan at the current zoom. Zooming in on a click is disorienting and loses the surroundings.
  useEffect(() => {
    const at = flyTo && (pos[flyTo.id] ?? propPos[flyTo.id]);
    if (!flyTo || !at || !wrap.current) return;
    const [x, y] = at;
    const n = spec.nodes.find((v) => v.id === flyTo.id);
    const w = n ? pillWidth(n.label) : PROPOSAL_W;
    const { width, height } = wrap.current.getBoundingClientRect();
    const a = rf.flowToScreenPosition({ x, y });
    const b = rf.flowToScreenPosition({ x: x + w, y: y + PILL_H });
    const box = wrap.current.getBoundingClientRect();
    const inView = a.x - box.left > 24 && b.x - box.left < width - rightInset - 24 && a.y - box.top > 72 && b.y - box.top < height - 90;
    if (inView) return;
    const zoom = rf.getZoom();
    rf.setCenter(x + w / 2 + rightInset / 2 / zoom, y + PILL_H / 2, { zoom, duration: 400 });
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
      if (byCrate(spec)) add(groupOf(spec, n.id), swatchFor(spec, n.id), found, !!n.meta?.context);
      else if (spec.archetype === "flowTrace") {
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
        <Tool icon="target" label="Fit" onClick={() => fitAll(400)} />
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
            <NumberTicker value={v.found} startOnView={false} duration={0.25} stagger={0} className="num" />
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

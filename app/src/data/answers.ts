import type { Recording, ViewNode, ViewSpec, ToolCall } from "./types";
import { SYMBOLS, CALLERS_OF_CALLERS } from "./repo";

const ref = (id: string) => {
  const s = SYMBOLS[id];
  return s ? { file: s.file, symbol: id, lines: s.focus } : undefined;
};

const fn = (id: string, label: string, phase: string): ViewNode => ({
  id,
  label,
  kind: "fn",
  codeRef: ref(id),
  meta: { phase },
});

// ── 1. How does setState reach the DOM? (FlowTrace) ───────────────────────

const flowNodes: ViewNode[] = [
  fn("setCount", "setCount(count + 1)", "Update"),
  fn("dispatchSetState", "dispatchSetState", "Update"),
  fn("enqueueConcurrentHookUpdate", "enqueueConcurrentHookUpdate", "Update"),
  fn("scheduleUpdateOnFiber", "scheduleUpdateOnFiber", "Schedule"),
  fn("ensureRootIsScheduled", "ensureRootIsScheduled", "Schedule"),
  fn("performWorkOnRoot", "performWorkOnRoot", "Render"),
  fn("workLoopSync", "workLoopSync", "Render"),
  fn("commitRoot", "commitRoot", "Commit"),
  fn("commitMutationEffects", "commitMutationEffects", "Commit"),
  fn("commitTextUpdate", "commitTextUpdate", "Commit"),
];

// Calls off the traced path, drawn quieter beside the node that makes them (sample).
const flowContext: [string, string][] = [
  ["setCount", "useState(4)"],
  ["dispatchSetState", "requestUpdateLane"],
  ["scheduleUpdateOnFiber", "markRootUpdated"],
  ["performWorkOnRoot", "renderRootSync"],
  ["commitRoot", "commitLayoutEffects"],
  ["commitTextUpdate", "span text: 4 → 5"],
];
const contextNodes: ViewNode[] = flowContext.map(([parent, label]) => ({
  id: `ctx-${label}`,
  label,
  kind: label.startsWith("span") ? "state" : "fn",
  meta: { parent, context: true },
}));

const setStateFlow: ViewSpec = {
  id: "setstate-flow",
  archetype: "flowTrace",
  question: "How does setState actually update the screen?",
  title: "How setState reaches the DOM",
  summary:
    "A click queues an update on the fiber, a microtask schedules the root, the render phase finds what changed, and the commit phase writes one text node.",
  nodes: [...flowNodes, ...contextNodes],
  edges: [
    ...flowNodes.slice(1).map((n, i) => ({ from: flowNodes[i].id, to: n.id, kind: "calls" as const })),
    ...contextNodes.map((n) => ({ from: String(n.meta!.parent), to: n.id, kind: "calls" as const, context: true })),
  ],
  steps: [
    { id: "s1", focus: ["setCount"], caption: "The click handler calls the state setter" },
    { id: "s2", focus: ["dispatchSetState"], caption: "dispatchSetState picks a lane and builds the update" },
    { id: "s3", focus: ["enqueueConcurrentHookUpdate"], caption: "The update is queued on the hook and the root is found" },
    { id: "s4", focus: ["scheduleUpdateOnFiber"], caption: "scheduleUpdateOnFiber marks the root as having pending work" },
    { id: "s5", focus: ["ensureRootIsScheduled"], caption: "Rendering is deferred to a microtask after the event" },
    { id: "s6", focus: ["performWorkOnRoot"], caption: "The root renders; a click is a blocking lane, so no time slicing" },
    { id: "s7", focus: ["workLoopSync"], caption: "The work loop walks fibers with beginWork and completeWork" },
    { id: "s8", focus: ["commitRoot"], caption: "commitRoot swaps the finished tree in as root.current" },
    { id: "s9", focus: ["commitMutationEffects"], caption: "Mutation effects visit only fibers flagged with Update" },
    { id: "s10", focus: ["commitTextUpdate"], caption: "One DOM write: the span's text node changes from 4 to 5" },
  ],
  sources: flowNodes.map((n) => ({ file: n.codeRef!.file, symbol: n.id })),
};

const setStateCalls: ToolCall[] = [
  { tool: "find-symbol", arg: "useState setter", count: 3, reveals: ["setCount", "dispatchSetState"] },
  { tool: "search-lexical", arg: "enqueueConcurrentHookUpdate", count: 4, reveals: ["enqueueConcurrentHookUpdate"] },
  { tool: "callers-of", arg: "scheduleUpdateOnFiber", count: 12, reveals: ["scheduleUpdateOnFiber", "ensureRootIsScheduled"] },
  { tool: "find-symbol", arg: "performWorkOnRoot", count: 2, reveals: ["performWorkOnRoot", "workLoopSync"] },
  { tool: "prepare-context", arg: "commit phase, host text", count: 9, reveals: ["commitRoot", "commitMutationEffects"] },
  { tool: "find-symbol", arg: "commitTextUpdate", count: 1, reveals: ["commitTextUpdate"] },
  { tool: "prepare-answer-bundle", arg: "setState → DOM", count: 10, reveals: [] },
];

// ── 2. Show the render phase as a tree (AlgoStepper) ──────────────────────

const fiber = (id: string, label: string, parent: string | undefined, tag: string): ViewNode => ({
  id,
  label,
  kind: "fiber",
  meta: { parent, tag },
});

const fiberNodes: ViewNode[] = [
  fiber("root", "HostRoot", undefined, "HostRoot"),
  fiber("app", "App", "root", "FunctionComponent"),
  fiber("div", "div.app", "app", "HostComponent"),
  fiber("header", "Header", "div", "FunctionComponent"),
  fiber("h1", "h1", "header", "HostComponent"),
  fiber("counter", "Counter", "div", "FunctionComponent"),
  fiber("button", "button", "counter", "HostComponent"),
  fiber("label", "\"Clicked \"", "button", "HostText"),
  fiber("span", "span", "button", "HostComponent"),
  fiber("text", "\"4\" → \"5\"", "span", "HostText"),
];

type Visit = [string, "begin" | "complete", string, ("bailout" | "render" | "flag")?];

const visits: Visit[] = [
  ["root", "begin", "HostRoot has no pending work of its own: clone its children", "bailout"],
  ["app", "begin", "App's props did not change: bail out", "bailout"],
  ["div", "begin", "div.app is unchanged: keep walking down", "bailout"],
  ["header", "begin", "Header has no work in its subtree: skip h1 entirely", "bailout"],
  ["header", "complete", "Header completes; move to its sibling Counter"],
  ["counter", "begin", "Counter has the update lane: call Counter() again", "render"],
  ["button", "begin", "button props are new objects, so reconcile children", "render"],
  ["label", "begin", "\"Clicked \" text is the same", "bailout"],
  ["label", "complete", "No change to commit for this text"],
  ["span", "begin", "span renders its child text", "render"],
  ["text", "begin", "Text fiber receives \"5\""],
  ["text", "complete", "Old text \"4\" ≠ \"5\": mark the fiber with Update", "flag"],
  ["span", "complete", "span bubbles the Update flag to subtreeFlags"],
  ["button", "complete", "button completes, nothing of its own to write"],
  ["counter", "complete", "Counter completes"],
  ["div", "complete", "div.app completes"],
  ["app", "complete", "App completes"],
  ["root", "complete", "The finished tree is ready for commitRoot"],
];

const fiberSteps = visits.map(([id, kind, caption], i) => {
  const done = visits.slice(0, i + 1);
  return {
    id: `f${i + 1}`,
    focus: [id],
    caption,
    frame: {
      phase: kind === "begin" ? "beginWork" : "completeWork",
      visited: [...new Set(done.map((v) => v[0]))],
      skipped: i >= 3 ? ["h1"] : [],
      flagged: done.some((v) => v[3] === "flag") ? ["text"] : [],
    },
  };
});

const renderTree: ViewSpec = {
  id: "render-tree",
  archetype: "algoStepper",
  question: "Show the render phase as a tree",
  title: "The render phase, fiber by fiber",
  summary:
    "React walks down with beginWork and back up with completeWork. Everything outside Counter bails out, and only the text fiber gets an Update flag.",
  nodes: fiberNodes,
  edges: fiberNodes.filter((n) => n.meta?.parent).map((n) => ({ from: String(n.meta!.parent), to: n.id, kind: "child" as const })),
  steps: fiberSteps,
  sources: [
    { file: SYMBOLS.beginWork.file, symbol: "beginWork" },
    { file: SYMBOLS.completeWork.file, symbol: "completeWork" },
    { file: SYMBOLS.workLoopSync.file, symbol: "performUnitOfWork" },
  ],
};

const renderCalls: ToolCall[] = [
  { tool: "find-symbol", arg: "beginWork", count: 2, reveals: ["root", "app", "div"] },
  { tool: "callers-of", arg: "completeUnitOfWork", count: 3, reveals: ["header", "h1", "counter"] },
  { tool: "search-lexical", arg: "attemptEarlyBailoutIfNoUpdate", count: 6, reveals: ["button", "label"] },
  { tool: "find-symbol", arg: "completeWork HostText", count: 1, reveals: ["span", "text"] },
  { tool: "prepare-answer-bundle", arg: "render phase walk", count: 18, reveals: [] },
];

// ── 3. What breaks if I change X? (BlastRadius, built for any symbol) ────

export function blastRecording(target: string): Recording {
  const ring1 = SYMBOLS[target]?.callers ?? CALLERS_OF_CALLERS[target] ?? [];
  const ring2 = [...new Set(ring1.flatMap((c) => CALLERS_OF_CALLERS[c] ?? []))].filter(
    (c) => c !== target && !ring1.includes(c),
  );
  const tests = SYMBOLS[target]?.tests ?? [];
  const nodes: ViewNode[] = [
    { id: target, label: target, kind: "fn", codeRef: ref(target), meta: { ring: 0 } },
    ...ring1.map((id) => ({ id, label: id, kind: "fn" as const, codeRef: ref(id), meta: { ring: 1 } })),
    ...ring2.map((id) => ({ id, label: id, kind: "fn" as const, codeRef: ref(id), meta: { ring: 2 } })),
    ...tests.map((id) => ({ id, label: id, kind: "test" as const, meta: { ring: 3 } })),
  ];
  const edges = [
    ...ring1.map((c) => ({ from: c, to: target, kind: "impacts" as const })),
    ...ring2.map((c) => ({
      from: c,
      to: ring1.find((r) => (CALLERS_OF_CALLERS[r] ?? []).includes(c)) ?? target,
      kind: "impacts" as const,
    })),
    ...tests.map((t) => ({ from: t, to: target, kind: "impacts" as const })),
  ];
  const spec: ViewSpec = {
    id: `blast-${target}`,
    archetype: "blastRadius",
    question: `What breaks if I change ${target}?`,
    title: `Blast radius of ${target}`,
    summary: `${ring1.length} direct callers, ${ring2.length} more one hop out, and ${tests.length} test files exercise it.`,
    nodes,
    edges,
    steps: [
      { id: "b0", focus: [target], caption: `${target}, the symbol you would change` },
      { id: "b1", focus: ring1, caption: `${ring1.length} functions call it directly` },
      { id: "b2", focus: ring2, caption: `${ring2.length} functions reach it one hop further out` },
      { id: "b3", focus: tests, caption: `${tests.length} test files would need to pass again` },
    ],
    sources: [ref(target), ...ring1.map(ref)].filter(Boolean).map((r) => ({ file: r!.file, symbol: r!.symbol })),
  };
  const calls: ToolCall[] = [
    { tool: "find-symbol", arg: target, count: 1, reveals: [target] },
    { tool: "callers-of", arg: target, count: ring1.length, reveals: ring1 },
    { tool: "callers-of", arg: `${ring1.length} callers, depth 2`, count: ring2.length, reveals: ring2 },
    { tool: "search-lexical", arg: `${target} in __tests__`, count: tests.length, reveals: tests },
  ];
  return { spec, calls };
}

export const RECORDINGS: Recording[] = [
  { spec: setStateFlow, calls: setStateCalls },
  { spec: renderTree, calls: renderCalls },
  blastRecording("commitRoot"),
];

export const SUGGESTED = [
  "How does setState actually update the screen?",
  "Show the render phase as a tree",
  "What breaks if I change commitRoot?",
];

import type { ViewSpec } from "../data/types";
import { SYMBOLS, CALLERS_OF_CALLERS } from "../data/repo";
import type { Anchor, ViewRequest } from "./roomTypes";

/**
 * Live suggestions: while people talk about the code, each finished sentence is
 * matched against the graph on screen and the repo's symbols.
 *
 * In the product the harness sends these; this matcher stands in for it and
 * produces the same shape, so the panel and the graph don't change when it does.
 */

export type Utterance = { id: string; speaker: string; text: string; at: number };

export type Suggestion =
  | { id: string; from: string; kind: "focus"; nodeId: string; title: string; why: string }
  | { id: string; from: string; kind: "ask"; question: string; title: string; why: string }
  // From the listener (Haiku): a decision to build, attached to the code it touches…
  | { id: string; from: string; kind: "change"; title: string; why: string; change: string; anchors: Anchor[] }
  // …or a graph worth drawing.
  | { id: string; from: string; kind: "view"; title: string; why: string; view: ViewRequest; anchors: Anchor[] };

/** What a proposal points at on the graph: node ids, plus symbols that aren't drawn yet. */
export const anchorsOf = (s: Suggestion): Anchor[] =>
  s.kind === "focus" ? [{ nodeId: s.nodeId, symbol: s.nodeId }] : s.kind === "ask" ? [] : s.anchors;

// Words too common in this repo to point at one node.
const STOP = new Set([
  "react", "test", "tests", "internal", "root", "work", "fiber", "the", "and", "with", "from", "this", "that",
  "update", "updates", "render", "renderer", "noop", "function", "file", "commit", "sync", "perform", "finish",
]);

/** "ReactHooks-test.internal.js" → ["react", "hooks", "test", "internal", "js"] */
export function words(label: string): string[] {
  return label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((w) => w.toLowerCase())
    .filter(Boolean);
}

/** How a person would say a node's name out loud: tests by their subject, functions as written. */
export function spoken(label: string): string {
  const m = label.match(/^React([A-Za-z]+?)(?:-test|\.test)/);
  if (m) return `the ${words(m[1]).join(" ")} tests`;
  return label;
}

const allSymbols = [...new Set([...Object.keys(SYMBOLS), ...Object.keys(CALLERS_OF_CALLERS)])];

let seq = 0;
const nextId = () => `sg-${Date.now().toString(36)}-${seq++}`;

export function suggestFrom(u: Utterance, spec: ViewSpec): Suggestion[] {
  const text = u.text.toLowerCase();
  const said = new Set(words(u.text));
  const out: Suggestion[] = [];

  // 1. Nodes already on the graph that the sentence names, by full name or a distinctive word.
  const scored = spec.nodes
    // Skip the node the view is already about: pointing at it again adds nothing.
    .filter((n) => !n.meta?.context && !(spec.archetype === "blastRadius" && n.id === spec.nodes[0]?.id))
    .map((n) => {
      if (text.includes(n.label.toLowerCase())) return { n, score: 10, hit: n.label };
      const hits = words(n.label).filter((w) => w.length >= 4 && !STOP.has(w) && said.has(w));
      return { n, score: hits.length, hit: hits.join(" ") };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? 0;
  scored
    .filter((x) => x.score === best)
    .slice(0, 2)
    .forEach(({ n, hit }) =>
      out.push({ id: nextId(), from: u.id, kind: "focus", nodeId: n.id, title: `Show ${n.label}`, why: `You said “${hit}”` }),
    );

  // 2. Questions the sentence implies that the graph on screen doesn't answer yet.
  const sym = allSymbols.sort((a, b) => b.length - a.length).find((s) => text.includes(s.toLowerCase()));
  const target = sym ?? (scored[0]?.n.kind === "fn" ? scored[0].n.id : undefined);
  if (/(break|blow|touch|refactor|change|rename|impact|safe to)/.test(text) && target && !(spec.archetype === "blastRadius" && spec.nodes[0]?.id === target)) {
    out.push({ id: nextId(), from: u.id, kind: "ask", question: `What breaks if I change ${target}?`, title: `Blast radius of ${target}`, why: "Sounds like a change is on the table" });
  }
  if (/(how does|how do|reach(es)? the dom|end to end|walk (me )?through|get(s)? to)/.test(text) && spec.archetype !== "flowTrace") {
    out.push({ id: nextId(), from: u.id, kind: "ask", question: "How does setState reach the DOM?", title: "Trace setState to the DOM", why: "Asks for the path, not the impact" });
  }
  if (/(tree|which (components|fibers)|bail ?out|skipped)/.test(text) && spec.archetype !== "algoStepper") {
    out.push({ id: nextId(), from: u.id, kind: "ask", question: "Show the render phase as a tree", title: "Walk the fiber tree", why: "Talks about the component tree" });
  }
  return out;
}

/**
 * A short scripted discussion between two engineers about the answer on screen,
 * built from its own nodes, so the demo works without a microphone.
 */
export function demoScript(spec: ViewSpec): Omit<Utterance, "id" | "at">[] {
  const fns = spec.nodes.filter((n) => n.kind === "fn" && !n.meta?.context);
  // Only tests a person could name in a word the matcher will catch ("the hooks tests").
  const tests = spec.nodes.filter((n) => n.kind === "test" && words(n.label).some((w) => w.length >= 4 && !STOP.has(w)));
  const pick = (i: number) => fns[Math.min(i, fns.length - 1)]?.label;
  const lines: Omit<Utterance, "id" | "at">[] = [];
  if (spec.archetype === "blastRadius") {
    lines.push({ speaker: "Alex", text: `Okay, so this is everything that leans on ${spec.nodes[0].label}.` });
    if (tests[0]) lines.push({ speaker: "Sam", text: `Honestly ${spoken(tests[0].label)} are the ones I'd worry about first.` });
    if (pick(2)) lines.push({ speaker: "Alex", text: `Does ${pick(2)} call it directly, or only through something else?` });
    if (tests[1]) lines.push({ speaker: "Sam", text: `And ${spoken(tests[1].label)} go through commit too, right?` });
    lines.push({ speaker: "Alex", text: "Before we touch any of it, how does setState even get to the DOM?" });
  } else if (spec.archetype === "flowTrace") {
    lines.push({ speaker: "Alex", text: `So the click starts at ${pick(0)} and goes into the reconciler.` });
    lines.push({ speaker: "Sam", text: `I always lose it around ${pick(3)}, where the work gets scheduled.` });
    lines.push({ speaker: "Alex", text: `Then ${pick(5)} does the actual commit.` });
    lines.push({ speaker: "Sam", text: `If we refactor ${pick(5)}, what breaks?` });
  } else {
    lines.push({ speaker: "Alex", text: `So rendering starts from ${pick(0)} and walks down.` });
    lines.push({ speaker: "Sam", text: `Why does ${pick(2)} get skipped here?` });
    lines.push({ speaker: "Alex", text: `And ${pick(fns.length - 1)} is where the text actually changes.` });
    lines.push({ speaker: "Sam", text: "What breaks if we change commitRoot though?" });
  }
  return lines.filter((l) => !l.text.includes("undefined"));
}

/**
 * A scripted discussion for a view of the real index, so the demo works without a microphone.
 * Unlike the keyword matcher's script, these lines go to the listener (Haiku), which proposes,
 * answers and offers views from them: each beat is written to trigger one of those.
 */
export function liveScript(spec: ViewSpec): Omit<Utterance, "id" | "at">[] {
  const main = spec.nodes.filter((n) => !n.meta?.context);
  const short = (label?: string) => label?.split("::").slice(-2).join("::");
  const lines: Omit<Utterance, "id" | "at">[] = [];
  if (spec.archetype === "blastRadius") {
    const center = short(main[0]?.label);
    const ring1 = main.filter((n) => Number(n.meta?.ring) === 1).map((n) => short(n.label));
    const approval = /approval/i.test(center ?? "");
    lines.push({ speaker: "Alex", text: `Okay, so this is everything that depends on ${center}.` });
    if (ring1[0]) lines.push({ speaker: "Sam", text: `Who actually calls ${ring1[0]}? I can never find where that's used.` });
    lines.push({
      speaker: "Alex",
      text: approval
        ? "I want approvals to time out. If nobody answers within thirty seconds, deny the tool call and log it."
        : `We should add tracing to ${center} so every call shows up in the logs.`,
    });
    lines.push({ speaker: "Sam", text: "Agreed. And let's add a test that a denied approval never runs the inner tool." });
    if (ring1[1]) lines.push({ speaker: "Alex", text: `Before we touch it, what does ${ring1[1]} call?` });
  } else if (spec.archetype === "flowTrace") {
    const first = short(main[0]?.label);
    const last = short(main[main.length - 1]?.label);
    const mid = short(main[Math.floor(main.length / 2)]?.label);
    lines.push({ speaker: "Alex", text: `So the CLI starts in ${first} and ends up in ${last}.` });
    if (mid && mid !== first && mid !== last) lines.push({ speaker: "Sam", text: `What does ${mid} actually do on the way?` });
    lines.push({ speaker: "Alex", text: `We should validate the agent config before ${last} runs, and fail with a clear error message.` });
    lines.push({ speaker: "Sam", text: `And what breaks if we change ${last}?` });
  } else {
    const root = short(main[0]?.label);
    lines.push({ speaker: "Alex", text: `This is what ${root} calls.` });
    lines.push({ speaker: "Sam", text: `Where is ${root} defined, and who calls it?` });
    lines.push({ speaker: "Alex", text: `Let's add logging around ${root} so failures are easier to trace.` });
  }
  return lines.filter((l) => !l.text.includes("undefined"));
}

import type { ViewSpec } from "../data/types";
import { SYMBOLS, CALLERS_OF_CALLERS } from "../data/repo";

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
  | { id: string; from: string; kind: "ask"; question: string; title: string; why: string };

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

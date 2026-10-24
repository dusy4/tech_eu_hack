import type { ViewSpec } from "../data/types";
import type { Anchor, ViewRequest } from "./roomTypes";

/**
 * Live suggestions: the listener (Haiku) turns each finished sentence into proposals
 * grounded in the graph on screen. These are the shapes the panel and the graph draw.
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

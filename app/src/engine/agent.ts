import type { Suggestion, Utterance } from "./suggest";

/**
 * Accepted proposals leave the room here and go to the coding agent.
 * The shape is what the agent receives; the transport is a stand-in until the
 * harness endpoint exists (set VITE_AGENT_URL to POST it for real).
 */
export type ProposalBatch = {
  repo: string;
  answer: { id: string; title: string; asked: string };
  proposals: { title: string; why: string; said: string; action: { kind: "focus"; nodeId: string } | { kind: "ask"; question: string } }[];
};

export function toBatch(repo: string, answer: ProposalBatch["answer"], accepted: Suggestion[], utterances: Utterance[]): ProposalBatch {
  return {
    repo,
    answer,
    proposals: accepted.map((s) => ({
      title: s.title,
      why: s.why,
      said: utterances.find((u) => u.id === s.from)?.text ?? "",
      action: s.kind === "focus" ? { kind: "focus", nodeId: s.nodeId } : { kind: "ask", question: s.question },
    })),
  };
}

export async function sendToAgent(batch: ProposalBatch): Promise<void> {
  const url = import.meta.env.VITE_AGENT_URL as string | undefined;
  if (!url) {
    // No endpoint yet: keep the demo honest about where it stops.
    console.info("[spelunk] proposals for the agent", batch);
    await new Promise((r) => setTimeout(r, 900));
    return;
  }
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(batch) });
  if (!res.ok) throw new Error(`Agent endpoint answered ${res.status}`);
}

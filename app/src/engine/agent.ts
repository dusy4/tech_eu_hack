import type { Suggestion, Utterance } from "./suggest";
import type { Anchor } from "./roomTypes";

/**
 * Accepted proposals leave the room here and go to the coding agent, as one handoff the MCP server
 * stores (repo-analysis-workbench/src/mcp_server/handoffs.py) and agents pull with list_handoffs /
 * get_handoff. View proposals only change what the room looks at, so they don't travel.
 */
export type ProposalAction =
  | { kind: "focus"; nodeId: string }
  | { kind: "ask"; question: string }
  | { kind: "change"; change: string; anchors: Anchor[] };

export type ProposalBatch = {
  repo: string;
  answer: { id: string; title: string; asked: string };
  proposals: { title: string; why: string; said: string; speaker?: string; action: ProposalAction }[];
};

/** Proposals that become work for the agent. */
export const forAgent = (s: Suggestion): s is Exclude<Suggestion, { kind: "view" }> => s.kind !== "view";

export function toBatch(repo: string, answer: ProposalBatch["answer"], accepted: Suggestion[], utterances: Utterance[]): ProposalBatch {
  return {
    repo,
    answer,
    proposals: accepted.filter(forAgent).map((s) => {
      const u = utterances.find((x) => x.id === s.from);
      const action: ProposalAction =
        s.kind === "focus"
          ? { kind: "focus", nodeId: s.nodeId }
          : s.kind === "change"
            ? { kind: "change", change: s.change, anchors: s.anchors }
            : { kind: "ask", question: s.question };
      return { title: s.title, why: s.why, said: u?.text ?? "", speaker: u?.speaker, action };
    }),
  };
}

/**
 * Publishes the batch and returns the handoff id. `url` is the handoff endpoint: the dev server's
 * /api/handoffs proxy when the MCP server is up, else VITE_AGENT_URL. With neither, it only logs.
 */
export async function sendToAgent(batch: ProposalBatch, url?: string): Promise<string | undefined> {
  const target = url ?? (import.meta.env.VITE_AGENT_URL as string | undefined);
  if (!target) {
    // No endpoint: keep the demo honest about where it stops.
    console.info("[spelunk] proposals for the agent", batch);
    await new Promise((r) => setTimeout(r, 900));
    return undefined;
  }
  const res = await fetch(target, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(batch), signal: AbortSignal.timeout(15_000) });
  const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok) throw new Error(body.error ?? `Agent endpoint answered ${res.status}`);
  return body.id;
}

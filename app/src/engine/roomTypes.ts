/**
 * The contract between the room (this app) and the listener behind /api/room/turn
 * (app/server/room.ts): Claude Haiku 5.5 reading the conversation with the repo-analysis
 * MCP tools. Types only, so the dev server and the browser share them.
 */

/** A node of the graph on screen, as the listener sees it. */
export type RoomNode = { id: string; label: string; kind: string; file?: string };

/** Where a proposal belongs: a node on the graph, or a symbol the index knows that isn't drawn yet. */
export type Anchor = { nodeId?: string; symbol: string; file?: string; line?: number };

export type ViewRequest =
  | { view: "blast-radius"; symbol: string }
  | { view: "flow-trace"; source: string; target: string }
  | { view: "call-tree"; symbol: string };

export type RoomItem =
  | {
      type: "proposal";
      id: string;
      /** The utterance that produced it. */
      from: string;
      /** "change": a decision to build; "view": a graph worth drawing. */
      kind: "change" | "view";
      title: string;
      why: string;
      /** For a change: what to do, in a sentence or two, specific enough for a coding agent. */
      change?: string;
      anchors: Anchor[];
      view?: ViewRequest;
    }
  | {
      type: "answer";
      id: string;
      from: string;
      question: string;
      answer: string;
      sources: Anchor[];
    };

export type RoomCall = { tool: string; arg: string; ms: number; ok: boolean };

export type TurnRequest = {
  repo: string;
  /** The view on screen. */
  view: { title: string; question: string; nodes: RoomNode[] };
  /** Recent conversation, oldest first. */
  transcript: { id: string; speaker: string; text: string }[];
  /** Ids in `transcript` the listener hasn't seen yet. */
  fresh: string[];
  /** Proposals already on the table, so the same one isn't made twice. */
  open: string[];
  /** "listen" reacts to the room; "ask" is a question typed or spoken straight to Spelunk. */
  mode: "listen" | "ask";
};

export type TurnResponse = {
  items: RoomItem[];
  calls: RoomCall[];
  model: string;
  /** False when the MCP server was unreachable and Haiku worked from the graph alone. */
  grounded: boolean;
  ms: number;
};

/** GET /api/room/status: what is connected, so the UI can say so instead of failing quietly. */
export type RoomStatus = { haiku: boolean; mcp: boolean; graph: boolean; repo?: string; model: string };

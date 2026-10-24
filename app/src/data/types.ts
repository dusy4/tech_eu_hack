// The one contract this UI owns: what the harness hands over to be drawn.
// Documented in README.md, section 10.

export type Archetype =
  | "flowTrace"
  | "algoStepper"
  | "blastRadius"
  | "stateMachine"
  | "archMap"
  | "swimlane"
  | "liveSpecimen"
  | "schemaMap";

export type NodeKind = "fn" | "class" | "file" | "module" | "test" | "state" | "fiber";

export type CodeRef = { file: string; symbol: string; lines: [number, number] };

export type ViewNode = {
  id: string;
  label: string;
  kind: NodeKind;
  codeRef?: CodeRef;
  /** Archetype-specific placement hints (phase lane, ring, tree parent). */
  meta?: Record<string, string | number | boolean | undefined>;
};

export type ViewEdge = {
  from: string;
  to: string;
  kind: "calls" | "imports" | "transition" | "impacts" | "child" | "sibling";
  label?: string;
  /** A call off the traced path, shown for context. */
  context?: boolean;
};

export type ViewStep = {
  id: string;
  focus: string[];
  caption: string;
  /** For the algorithm stepper: which nodes are done / flagged at this step. */
  frame?: { visited?: string[]; flagged?: string[]; skipped?: string[]; phase?: string };
};

export type ViewSpec = {
  id: string;
  archetype: Archetype;
  question: string;
  title: string;
  summary: string;
  nodes: ViewNode[];
  edges: ViewEdge[];
  steps: ViewStep[];
  sources: { file: string; symbol: string }[];
};

/** One MCP tool call the harness made, as the agent ticker shows it. */
export type ToolCall = {
  tool: "repo-overview" | "find-symbol" | "callers-of" | "callees-of" | "path-between" | "search-lexical" | "prepare-context" | "prepare-answer-bundle" | (string & {});
  arg: string;
  count: number;
  /** Nodes this call discovered; they appear on the canvas when the call returns. */
  reveals: string[];
};

/** A recorded answer: the final spec plus the calls that built it. `live` when it came from the real index. */
export type Recording = { spec: ViewSpec; calls: ToolCall[]; live?: boolean };

export type ViewPatch =
  | { op: "speed"; value: number }
  | { op: "focus"; nodeId: string }
  | { op: "switchArchetype"; to: string }
  | { op: "blast"; nodeId: string };

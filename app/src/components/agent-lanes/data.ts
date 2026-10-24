// Copyright (c) 2026 Bruno Delorence. MIT License.

/*
 * The shapes the lanes draw, and the board the lab shows: four agents, their tasks of the last
 * half hour and the one handoff between them. Times are in minutes from the moment the board
 * mounts: -12 is twelve minutes ago.
 */

/** The tools a task used: a small glyph each, drawn in glyphs.tsx. */
export type Tool = 'search' | 'doc' | 'chat' | 'design' | 'code' | 'ticket' | 'key' | 'sync';

/** An agent's mark on its tile: one per model family. */
export type AgentMark = 'petal' | 'rings' | 'diamond' | 'hex';

/**
 * Where a task stands. A running task, or one waiting for you, reaches up to now; a done or
 * failed one has its end.
 */
export type TaskStatus = 'running' | 'needs' | 'done' | 'failed';

export type Agent = {
  id: string;
  name: string;
  /** The model it runs on, under its name. */
  model: string;
  mark: AgentMark;
};

export type Task = {
  id: string;
  /** The agent whose lane it sits in. */
  agent: string;
  label: string;
  tools: readonly Tool[];
  status: TaskStatus;
  /** When it started, in minutes from mount (negative: before it). */
  start: number;
  /** When it ended, for a done or failed task. */
  end?: number;
  /** What it did, in the tooltip. */
  notes?: readonly string[];
  /** For a task that needs you: what it asks, in the popover with Approve and Reject. */
  ask?: { title: string; body: string };
};

/** A task handing its work to another: a dashed curve from the end of one to the start of the other. */
export type Handoff = { from: string; to: string };

export const AGENTS: readonly Agent[] = [
  { id: 'researcher', name: 'Researcher', model: 'Model A large', mark: 'petal' },
  { id: 'writer', name: 'Writer', model: 'Model A medium', mark: 'petal' },
  { id: 'reviewer', name: 'Reviewer', model: 'Model B pro', mark: 'rings' },
  { id: 'ops', name: 'Ops', model: 'Model C fast', mark: 'diamond' },
];

export const TASKS: readonly Task[] = [
  {
    id: 'competitors',
    agent: 'researcher',
    label: 'Competitor pricing',
    tools: ['search', 'doc'],
    status: 'done',
    start: -27.4,
    end: -16.4,
    notes: ['Compared 6 pricing pages', 'Built a feature table'],
  },
  {
    id: 'interviews',
    agent: 'researcher',
    label: 'Customer interviews',
    tools: ['doc', 'chat'],
    status: 'running',
    start: -9.4,
    notes: ['Read 14 interview notes', 'Grouping quotes by theme'],
  },
  {
    id: 'draft',
    agent: 'writer',
    label: 'Draft pricing page',
    tools: ['design', 'doc'],
    status: 'running',
    start: -15.4,
    notes: ['Outlined the page', 'Wrote plan copy and FAQ'],
  },
  {
    id: 'billing',
    agent: 'reviewer',
    label: 'PR #482 billing',
    tools: ['code', 'ticket'],
    status: 'done',
    start: -29.3,
    end: -19.4,
    notes: ['Checked 12 changed files', 'Left 3 comments'],
  },
  {
    id: 'sync',
    agent: 'ops',
    label: 'Sync CRM',
    tools: ['sync'],
    status: 'failed',
    start: -27.4,
    end: -20.9,
    notes: ['Token expired at step 2', 'Stopped after 3 retries'],
  },
  {
    id: 'keys',
    agent: 'ops',
    label: 'Rotate API keys',
    tools: ['key', 'code'],
    status: 'needs',
    start: -12.4,
    notes: ['Found 2 keys due', 'Checked the jobs using them'],
    ask: {
      title: 'Rotate API keys',
      body: 'Rotate the production payment and model keys? Jobs reconnect in ~30 s.',
    },
  },
];

export const HANDOFFS: readonly Handoff[] = [{ from: 'competitors', to: 'draft' }];

/** The task the demo hands the finished draft to. */
export const REVIEW_TASK: Omit<Task, 'start'> = {
  id: 'review',
  agent: 'reviewer',
  label: 'Review pricing page',
  tools: ['design', 'doc'],
  status: 'running',
  notes: ['Reading the draft'],
};

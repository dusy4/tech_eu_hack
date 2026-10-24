# repo-analysis + Spelunk (tech_eu_hack)

**Code intelligence under your coding agent.** Parse a repository once into a code graph, then give Claude Code
the smallest set of evidence that answers its question, through 12 MCP tools. **Spelunk** is the visual layer on
top: it draws that evidence as a live graph of the real code and turns a team's conversation into decisions the
agent can act on.

This README is the whole project in one place: the pitch, the architecture, who owns what, what works today, the
contracts between the pieces, the demo, and how to run everything. If something here is wrong, fix it here. The
only other docs are deep references owned by one piece (see [Reference docs](#21-reference-docs)).

_Last updated: 24 Oct 2026._

## Contents

**The product**
1. [What we're building](#1-what-were-building)
2. [Spelunk: the agentic loop on top](#2-spelunk-the-agentic-loop-on-top)
3. [What the user sees](#3-what-the-user-sees)

**The system**

4. [Architecture](#4-architecture)
5. [Repo layout](#5-repo-layout)
6. [Who owns what](#6-who-owns-what)
7. [What actually works today](#7-what-actually-works-today)

**Decisions**

8. [Decided](#8-decided)
9. [Open decisions](#9-open-decisions)

**Contracts**

10. [`ViewSpec`: what the graph draws](#10-viewspec-what-the-graph-draws)
11. [Proposals and the handoff](#11-proposals-and-the-handoff)
12. [MCP tools](#12-mcp-tools)
13. [Bridge API (stopgap)](#13-bridge-api-stopgap)

**Demo**

14. [Demo script](#14-demo-script)
15. [Risks and fallbacks](#15-risks-and-fallbacks)

**Running it**

16. [Run the app](#16-run-the-app)
17. [Run the backend](#17-run-the-backend)
18. [Run the bridge](#18-run-the-bridge)

**Reference**

19. [Changes to the vendored workbench](#19-changes-to-the-vendored-workbench)
20. [Backend notes](#20-backend-notes)
21. [Reference docs](#21-reference-docs)

---

## 1. What we're building

Two layers. The core is what the pitch deck presents; Spelunk sits on top of it.

### The core: repo-analysis

| | |
|---|---|
| **Problem** | Coding agents read code like text. Structural questions ("who calls this?", "how does A reach B?") get answered by repeated search-and-open loops |
| **Insight** | Treat code as structure, not prose. Parse once with real parsers, answer from the graph, return only what the question needs. No LLM builds the index |
| **Product** | A local layer **under** the agent, built once per repository and queried many times. It is not an agent and not a chat interface |
| **Grounded in research** | 18 of the 85 papers we reviewed are implemented directly or in their core idea, each mapped to a file and line range ([paper-to-code dashboard](docs/paper-code-mapping/papers-to-code.html)) |
| **Built to be measured** | Recall at k, MRR, nDCG, tokens prepared, files opened and latency, with A/B of retrieval modes and scoring of an outside agent's answers (`src/evaluation/harness.py`) |

How a repository becomes evidence:

```
repository ──▶ parsers ──────────────────▶ stores ───────────────────▶ retrieval ──────────────▶ MCP server
files,         Rust in depth (rust-analyzer  Tantivy keyword index,     classify · gate · scope ·   12 read-only
manifests,     SCIP); tree-sitter tags for   LMDB exact lookups,        find · expand · load ·     tools for
git            6 more languages; Ctags       RyuGraph code graph        bundle (each item says     Claude Code
                                             (21 edge types), summaries why it's there)
```

The graph goes down to the statement: calls, imports, type uses, implements/inherits/overrides, reads and writes,
control and data flow, and which tests touch what.

### On top: Spelunk

A visual layer and a team loop over the same MCP tools ([section 2](#2-spelunk-the-agentic-loop-on-top)). While
the agent gets text evidence, people see it as a graph of the real code. And when a team talks a change through,
Spelunk turns what they say into proposals on that graph, then hands the accepted decisions to the agent.

### Pitch rules

From the deck's own checklist, checked against the code:

- **No performance numbers for our product.** None exist yet. Figures on the problem slides come from the cited
  papers (Codebase-Memory, ContextBench, the code-analysis study), not from us.
- **Say "Rust in depth".** Python, TypeScript and Go get symbol tags and search only, no call graph.
- **The default MCP setup uses no embeddings and no neural reranker.** Ranking is rule-based.

## 2. Spelunk: the agentic loop on top

```
  ① LISTEN          ② EXTRACT              ③ PROPOSE             ④ DECIDE          ⑤ HAND OFF
  Reson8       →    Claude Haiku 5.5   →   live in the view  →   people         →  handoff doc
  live transcript   decisions, questions   highlight a node,     accept or         via MCP to the
  of the room       grounded via MCP       ask, or a new graph   dismiss           team's agent
                    tools
```

| Step | What happens | Built by | State |
|---|---|---|---|
| ① Listen | Reson8 streams the room's speech into utterances (speaker, text, time) | Reson8 (`app/src/engine/reson8.ts`, `useLiveTranscript.ts`) | **Built**, falls back to browser speech |
| ② Extract | Haiku 5.5 reads each new utterance with the recent context and pulls out decisions and questions. It calls MCP tools (`find_symbol`, `symbol_relations`, …) so each one points at real code | Claude Haiku 5.5 (`claude-haiku-5-5`) | **Not built.** A keyword matcher stands in (`app/src/engine/suggest.ts`) |
| ③ Propose | Each extraction becomes a proposal on screen: **focus** a node, **ask** a question, or a whole new **graph** (`ViewSpec`) Haiku builds from the MCP results | Haiku 5.5 → app | Focus and ask: **built** (from the keyword matcher). New graph: **not built** |
| ④ Decide | Accept or dismiss each proposal. Accepted ones apply to the graph and wait in "Ready for the agent" | app (`app/src/ui/LivePanel.tsx`) | **Built** |
| ⑤ Hand off | One click turns the accepted batch into a handoff doc: decisions, who said them, code refs, the graph. It's published through the MCP server so the team's agent can pull it and act | app → MCP server → any agent | UI and payload **built** (`app/src/engine/agent.ts`). Server side **built**: `POST /handoffs` + `list_handoffs` / `get_handoff`; the app still needs `VITE_AGENT_URL` set |

**Why Haiku 5.5:** extraction runs on every sentence, live, so it has to be fast and cheap. Haiku is enough to spot
"we should…" and map a spoken name to a symbol with the MCP tools. If its graphs aren't good enough, a bigger
Claude model builds the `ViewSpec` while Haiku keeps doing extraction (see [open decision 3](#3-what-exactly-does-haiku-do)).

## 3. What the user sees

One screen, the room:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Spelunk   repo ▾        [ Ask or follow up …                     🎙 ]   Agent │
├──────────────┬──────────────────────────────────────────┬────────────────────┤
│ Conversation │  "How does setState reach the DOM?"      │ Proposals · Ask ·  │
│ (live        │  ┌─ chips: Update · Schedule · Render ─┐ │ Code · Pinned      │
│ transcript,  │  │                                      │ │                    │
│ who said     │  │        graph of the real code        │ │ "Show schedule…"   │
│ what, which  │  │   (nodes link to file and line)      │ │  [Accept] [×]      │
│ sentences    │  │                                      │ │                    │
│ made a       │  └──────────────────────────────────────┘ │ Ready for the      │
│ proposal)    │  ⏮ ▶ ⏭   step 4/10: caption …   1×  📌    │ agent: 2 [Send ›]  │
└──────────────┴──────────────────────────────────────────┴────────────────────┘
```

- **Left:** the conversation, live. Each sentence that produced a proposal is tagged.
- **Centre:** the graph. Play it step by step. Click a node to see its code. Proposals light up the node they mean.
- **Right:** proposals to accept or dismiss, a direct Ask box, the code of the selected node, and pinned answers.
  Accepted proposals collect in "Ready for the agent" until someone sends them.
- **Agent run:** a panel listing every MCP tool call behind the current view (tool, argument, result count).

**View types** (archetypes) the graph can take:

| Question shape | View | State |
|---|---|---|
| "How does X get to Y?" | **FlowTrace**: the path through real functions, played step by step | Built |
| "How does this algorithm work?" | **AlgoStepper**: data-structure frames, one per step | Built |
| "What breaks if I change X?" | **BlastRadius**: rings of callers, their callers, then tests | Built. Buildable from `symbol_relations(callers)` without an LLM |
| "How is this system organised?" | **ArchMap / code city**: packages by size and churn | Built (code city) |
| "What states can X be in?" | StateMachine | Planned |
| "What runs in what order?" | Swimlane | Planned |
| "What's the data model?" | SchemaMap | Planned |

## 4. Architecture

```
                 room audio
                     │
                     ▼
              Reson8 (speech → text)
                     │ utterances
                     ▼
  ┌──────────── Spelunk app (app/, React + Vite) ─────────────┐
  │  transcript · graph · proposals · Ready for the agent      │
  └───────┬───────────────────────────────▲──────────┬─────────┘
          │ utterances                    │ proposals │ accepted batch
          ▼                               │ ViewSpec  ▼
   Claude Haiku 5.5  ── NOT BUILT ────────┘     handoff doc ── NOT BUILT
          │ tool calls                               │ published as
          ▼                                          ▼
  ┌──── repo-analysis MCP server (repo-analysis-workbench/src/mcp_server) ────┐
  │  12 read-only code tools                    + handoff (to add)            │
  └───────┬──────────────────────────────────────────────────▲───────────────┘
          ▼                                                   │ MCP
   workbench index of the target repo                Claude Code / Cursor /
   (data/: LMDB, RyuGraph, Tantivy, summaries)        any agent the team uses
          ▲
          │ built once by the index scripts
   target repo in repo_analyse/ (now: rust-agent-framework)
```

The app never reads the index directly. Code facts come through the MCP tools, whether Haiku calls them or the
app does.

## 5. Repo layout

```
tech_eu_hack/
├── app/                       # Spelunk app (React + Vite + Tailwind, Motion, React Flow + ELK)
│   └── src/
│       ├── engine/            # voice (Reson8), suggestions, replay, handoff to the agent
│       ├── knowledge/         # code-knowledge client: sample data or the bridge
│       ├── data/              # ViewSpec types + recorded sample answers for facebook/react
│       ├── views/             # GraphCanvas, CodeCity
│       ├── ui/                # panels: LivePanel, AgentRun, Inspector, ConnectAgent, …
│       └── screens/           # Answer, Chat, Connect, Home, Atlas
├── bridge/                    # stopgap HTTP API from the app to the index (section 13)
├── repo-analysis-workbench/   # indexing + retrieval engine and the MCP server
├── repo_analyse/              # target repos being analysed (clones are gitignored)
├── knowledge/                 # notes on the upstream workbench
├── docs/                      # architecture diagram + research reading list
└── .mcp.json                  # registers the MCP server for Claude Code sessions opened here
```

## 6. Who owns what

| Piece | Folder | Owner | State |
|---|---|---|---|
| Indexing engine (vendored workbench + our changes) | `repo-analysis-workbench/` | Aneeth | Works on Rust. Python/TS/Go get symbols and search only |
| MCP server | `repo-analysis-workbench/src/mcp_server/` | Aneeth | stdio (Claude Code) and HTTP (`:8787/mcp`). 16 tools incl. handoffs, smoke-tested; skills in `.claude/skills/` |
| Target repo | `repo_analyse/` | Aneeth | `rust-agent-framework` (67k lines of Rust) indexed |
| Paper-to-code dashboard | `docs/paper-code-mapping/` | Aram | 85 papers mapped to file and line |
| Pitch deck | not in the repo | ? | 14 slides drafted; team, event and ask still blank (open decision 5) |
| Spelunk app | `app/` | frontend (dusy4) | All screens built, running on **sample data** for facebook/react |
| Haiku extraction and graph building (loop ② ③) | none yet | **nobody** | Not started. The biggest missing piece |
| Handoff through MCP (loop ⑤) | `repo-analysis-workbench/src/mcp_server/handoffs.py` + `app/` | Aneeth (server), frontend (app) | Server built and tested; app needs `VITE_AGENT_URL` |
| HTTP bridge | `bridge/` | frontend | Stopgap so the chat can reach the index (open decision 2) |

## 7. What actually works today

| You can… | Real or sample? |
|---|---|
| Use the 12 MCP tools from Claude Code opened in this folder (after indexing) | **Real** |
| Index a Rust repo and query callers, callees, paths, bodies | **Real.** With the SCIP step, callers include method calls, trait dispatch and cross-crate calls (12/12 on the check set) |
| Talk and see the live transcript (Reson8) | **Real** (needs `RESON8_API_KEY`) |
| Get proposals from what was said | Real time, but a **keyword matcher** against the sample symbols, not Haiku |
| Accept proposals and send them to the agent | **Real** with `VITE_AGENT_URL=http://127.0.0.1:8787/handoffs` and the server in HTTP mode: stored as a handoff that Claude Code/Cursor pull via `list_handoffs` / `get_handoff`. Logs to the console when unset |
| Watch an answer build on the graph, with the agent run listing tool calls | **Replay**: recorded answers played on timers (`app/src/engine/useReplay.ts`), nothing streams yet |
| Play FlowTrace, BlastRadius, AlgoStepper and the code city | Sample: recorded React answers in `app/src/data/` |
| Ask the chat a question | **Real** with the bridge running and `VITE_KNOWLEDGE_URL` set: answers from `rust-agent-framework` with real code, callers and file:line sources. Sample data otherwise |
| "Connect your agent" screen | **Real** when the server runs with `--transport http`: its `http://localhost:8787/mcp` config connects |

## 8. Decided

- **The pitch:** repo-analysis is the core (the deck's story: code intelligence under your coding agent).
  Spelunk is the visual layer and team loop on top.
- **Demo repo:** `rust-agent-framework` (Rust, 67k lines, 19 crates). Only Rust gets the full call graph.
- **Agentic loop on top:** listen → extract → propose → decide → hand off ([section 2](#2-spelunk-the-agentic-loop-on-top)).
  Humans accept every proposal.
- **Voice:** Reson8.
- **Extraction:** Claude Haiku 5.5 (`claude-haiku-5-5`) reads the transcript. It may also build the graphs.
- **Handoff goes out through MCP**, so it works with whatever agent people already use.
- **Code facts come from the repo-analysis MCP server.** Keyword search (BM25) plus the code graph.
- **Rust call graph from rust-analyzer (SCIP).** Compiler-grade references now catch method calls, trait dispatch
  and cross-crate calls: real callers found on Aneeth's check set went from 0/12 to 12/12 (`39a9c81`).
- **No embeddings.** Off by default (`REPO_ANALYSIS_EMBEDDINGS=off`) and nothing depends on them. Pierre removed the
  `qdrant/` and `qwen-mlx/` folders; the optional embedding code inside the workbench is still there.
- **The graph's contract is `ViewSpec`**, owned by the frontend ([section 10](#10-viewspec-what-the-graph-draws)).
- **Domain:** software codebases. Earlier ideas (bio, finance visualisations) are dropped.
- **No jev / json-render.** The placeholder was removed.
- **Demo safety net:** scripted questions replay recorded answers; one is asked live.

## 9. Open decisions

Each needs one owner and one answer.

### 1. Move the app off React

- **The gap:** the demo repo is decided (`rust-agent-framework`), but the app's sample answers, suggested
  questions and the keyword matcher are all about facebook/react.
- **To do:** record 3 answers on `rust-agent-framework` from the real index (for example the deck's demo calls:
  tool approval, `ApprovalRequiredTool` callers, `ChatClientBuilder::build` → `IChatClient`), and rewrite the
  suggested questions. Keep React only as screenshots.

### 2. How does the app reach the MCP server?

- **The clash:** three answers exist:
  - The MCP server only speaks **stdio**, under the name `repo-analysis`. A browser can't use stdio.
  - The Connect screen (`app/src/ui/ConnectAgent.tsx`) advertises an HTTP server called `spelunk` at
    `http://localhost:8787/mcp`, which doesn't exist.
  - `bridge/` is a third, custom HTTP API that duplicates the MCP tools.
- **Recommendation:**
  - Aneeth adds an HTTP transport to the same server (the MCP SDK supports streamable HTTP), at
    `localhost:8787/mcp`.
  - Haiku and the app use that; the Connect screen shows the real config.
  - Delete `bridge/` once that works.
- **Status (24 Oct): server side done.** `server.py --transport http` serves MCP at `http://127.0.0.1:8787/mcp`
  (tested with an MCP client: all 16 tools work over HTTP) with CORS for local dev servers. The Connect screen's
  config now points at a real server (the client-side name `spelunk` is fine). Left for the frontend: switch the chat
  from `bridge/` to MCP over HTTP, then delete `bridge/`.

### 3. What exactly does Haiku do?

- **Open:** extraction only (decisions and questions → focus/ask proposals), or also building whole `ViewSpec`
  graphs?
- **Recommendation:** start with extraction plus BlastRadius (callers rings need no narration). Try Haiku on
  FlowTrace; if the captions or paths are weak, have a bigger Claude model build graphs while Haiku extracts.
- **Also needed:** a small server-side route that holds the Anthropic key (the browser must never see it), the
  same way the dev server already mints Reson8 tokens.

### 4. What is the handoff document, and how does an agent get it?

- **Open:** today the payload is a `ProposalBatch` (section 11) that the app POSTs to `VITE_AGENT_URL`.
- **Recommendation:**
  - Extend the batch into a full doc: decisions, who said each one, code refs (file, symbol, lines), and the graph.
  - Add `list_handoffs` / `get_handoff` tools (or an MCP resource) to the repo-analysis server, so Claude Code or
    Cursor pull it with the MCP connection they already have.
- **Status (24 Oct): server side done (Aneeth).** The app POSTs its `ProposalBatch` to `/handoffs`; the server stores
  it as a handoff doc (decisions, what was said, why, `code_ref` with file and lines resolved from the index) and
  serves it through `list_handoffs` / `get_handoff` / `update_handoff_status` (section 12). The `spelunk-handoff`
  skill walks an agent through picking one up. **Left for the frontend:** set `VITE_AGENT_URL`, and add the speaker
  and the graph to the batch (`proposals[].speaker` is already accepted).

### 5. The benchmark and the deck's blanks

- **The gap:** the deck promises "Claude Code alone vs. Claude Code with this tool", but the case file holds 3
  questions, all about another repo (`agent-kit` in `data/eval/cases/ai-tooling.jsonl`), and no run exists.
- **To do:** write 10–20 questions with expected files and symbols for `rust-agent-framework`, run both setups,
  and report recall, tokens and time. Until then, the pitch rules apply: no numbers for our product.
- **Also blank in the deck:** team name, event and date, names and roles, the ask, contact.

---

## 10. `ViewSpec`: what the graph draws

The one contract the frontend owns. Whoever builds a graph (Haiku, a bigger model, or a recording) hands over
this shape. Source of truth: [`app/src/data/types.ts`](app/src/data/types.ts).

```ts
type ViewSpec = {
  id: string;
  archetype: "flowTrace" | "algoStepper" | "blastRadius" | "stateMachine"
           | "archMap" | "swimlane" | "liveSpecimen" | "schemaMap";
  question: string;
  title: string;
  summary: string;
  nodes: {
    id: string; label: string;
    kind: "fn" | "class" | "file" | "module" | "test" | "state" | "fiber";
    codeRef?: { file: string; symbol: string; lines: [number, number] };
    meta?: Record<string, string | number | boolean | undefined>;   // phase lane, ring, tree parent
  }[];
  edges: {
    from: string; to: string;
    kind: "calls" | "imports" | "transition" | "impacts" | "child" | "sibling";
    label?: string; context?: boolean;                              // context = off the traced path
  }[];
  steps: {
    id: string; focus: string[]; caption: string;
    frame?: { visited?: string[]; flagged?: string[]; skipped?: string[]; phase?: string };
  }[];
  sources: { file: string; symbol: string }[];
};

// One MCP call behind an answer, as the Agent run panel shows it.
type ToolCall = { tool: string; arg: string; count: number; reveals: string[] };   // reveals = node ids
type Recording = { spec: ViewSpec; calls: ToolCall[] };

// Small changes to the current view (voice follow-ups like "slower", "show it as a tree").
type ViewPatch =
  | { op: "speed"; value: number } | { op: "focus"; nodeId: string }
  | { op: "switchArchetype"; to: string } | { op: "blast"; nodeId: string };
```

- The UI can draw a partial spec: nodes arrive before steps.
- Every node that has a `codeRef` links to its file and lines.

## 11. Proposals and the handoff

**Utterance** (from Reson8) and **proposal** (from Haiku; today from the keyword matcher). Source:
[`app/src/engine/suggest.ts`](app/src/engine/suggest.ts).

```ts
type Utterance = { id: string; speaker: string; text: string; at: number };

type Suggestion =
  | { id: string; from: string /* utterance id */; kind: "focus"; nodeId: string;  title: string; why: string }
  | { id: string; from: string;                    kind: "ask";   question: string; title: string; why: string };
  // to add for loop ③: { kind: "view"; spec: ViewSpec; … } for a whole new graph
```

**Handoff payload** (accepted proposals, sent as one batch). Source:
[`app/src/engine/agent.ts`](app/src/engine/agent.ts).

```ts
type ProposalBatch = {
  repo: string;
  answer: { id: string; title: string; asked: string };   // the view the decisions were made on
  proposals: {
    title: string; why: string;
    said: string;                                          // the sentence that produced it
    action: { kind: "focus"; nodeId: string } | { kind: "ask"; question: string };
  }[];
};
```

Today `sendToAgent()` POSTs this to `VITE_AGENT_URL`, or logs it to the console when that isn't set. Open decision
4 turns it into a full handoff doc served by the MCP server.

## 12. MCP tools

The `repo-analysis` server, over **stdio** (Claude Code, via `.mcp.json`) or **streamable HTTP** at
`http://127.0.0.1:8787/mcp` (`server.py --transport http`, for the app, Haiku and remote agents). JSON responses are
capped at 20k chars. Full reference with parameters, latencies and limits:
[MCP Server.md](repo-analysis-workbench/docs/MCP%20Server.md). Claude Code skills that teach agents to use it:
`.claude/skills/repo-analysis`, `spelunk-handoff`, `index-repo`.

| Tool | Use it for |
|---|---|
| `list_repos` | Which repos are indexed |
| `repo_overview` | First look at a repo: summary, crates/packages, languages, entrypoints |
| `summarize_path` | What a directory or file contains |
| `search_code` | Ranked keyword search (BM25, identifier- and path-aware) |
| `find_symbol` | Where a function, method, struct or trait is defined |
| `find_file` | Files by partial path |
| `get_symbol_body` | Source of a function or type |
| `get_enclosing_context` | A symbol's container, siblings and file |
| `symbol_relations` | Follow the graph: `callers`, `callees`, `imports`, `refs`, `reads`, `writes`, `implements`, `inherits` |
| `path_between` | How two symbols connect |
| `statement_slice` | Statements in a function, with what each reads, writes and calls |
| `prepare_answer_bundle` | One-shot evidence for a broad "how does X work?" question |
| `list_handoffs` | Handoffs the team accepted, newest first (default: `open`) |
| `get_handoff` | One handoff: decisions, who said them, why, code refs (file, lines), plus ready-to-follow `instructions` |
| `update_handoff_status` | Agent marks a handoff `in_progress`, `done` (with a note) or `dismissed` (writes) |
| `publish_handoff` | Publish a `ProposalBatch` as a handoff (for the app / Haiku; writes) |

**HTTP routes for the app** (same process, CORS open to `localhost`/`127.0.0.1` dev servers):

| Endpoint | Request | Response |
|---|---|---|
| `POST /handoffs` | a `ProposalBatch` (section 11) | `201 { id, status: "open", proposals }`; `400 { error }` if invalid |
| `GET /handoffs` | `?repo=&status=&limit=` | `{ handoffs: [{ id, status, repo, created_at, title, decisions[] }] }` |
| `GET /handoffs/{id}` | | the full handoff document plus `instructions` (markdown); `404 { error }` |
| `GET /health` | | `{ ok, repos, mcp: "/mcp" }` |

Point the app at it with `VITE_AGENT_URL=http://127.0.0.1:8787/handoffs`. Handoffs are stored as JSON under
`repo-analysis-workbench/data/handoffs/` (one file each); focus decisions get `code_ref` resolved from the index.

## 13. Bridge API (stopgap)

`bridge/server.py` (stdlib Python, `127.0.0.1:18300`) runs the workbench in-process and returns data in the
shapes the app's chat already uses. It duplicates the MCP tools and **goes away** once the app reaches the MCP
server over HTTP (open decision 2).

| Endpoint | Request | Response |
|---|---|---|
| `GET /health` | | `{ ok, repo, indexed, error }` |
| `POST /search-code` | `{ query, k? }` | `CodeHit[]`: `{ symbol, file, line, score (0–1, top hit = 1), snippet }` |
| `POST /find-symbol` | `{ name }` | `SymbolInfo \| null`: `{ symbol, file, start, code, callers[], tests[] }` |
| `POST /callers-of` | `{ name }` | `string[]` of qualified names |
| `POST /answer-bundle` | `{ question, limit? }` | Workbench JSON, passed through as is |

- Errors are `{ "error": "…" }` with 400, 404 or 500. CORS is open for the Vite dev server.
- `callers` and `tests` are best effort: a graph failure gives `[]`, not an error.
- Contract tests: `python -I bridge/test_server.py` (runs against a fake workbench).

---

## 14. Demo script

About 3 minutes on `rust-agent-framework`. Part 1 is the deck's live demo (slide 7); part 2 is Spelunk on top.

**Part 1: the core, in Claude Code** (the agent calls the MCP tools; every response is capped at 20k chars)

| Time | Beat | Tool call |
|---|---|---|
| 0:00 | "How does human-in-the-loop tool approval work?" One call returns the evidence, each item saying why it's there | `prepare_answer_bundle` |
| 0:30 | "Who calls `ApprovalRequiredTool`?" Exact callers, across crates, from the compiler's references | `symbol_relations` (callers) |
| 0:50 | "How does `ChatClientBuilder::build` reach `IChatClient`?" The path through the code | `path_between` |
| 1:10 | "What does `build` read, write and call, line by line?" | `statement_slice` |

**Part 2: Spelunk on top** (the same tools, drawn)

| Time | Beat | Shows |
|---|---|---|
| 1:30 | The same approval question in Spelunk: the flow builds on the graph as the tool calls return; ▶ plays it step by step with the code following | The evidence, visible |
| 2:00 | Two people talk about changing approval; proposals appear and light up `ApprovalRequiredTool` | The room, understood |
| 2:20 | "What breaks if we change it?" → BlastRadius: callers in rings, then tests | Impact before the change |
| 2:40 | Accept, send: the handoff lands in Claude Code through MCP | Talk → decision → agent |

**Safety net:** scripted questions are pre-recorded (`ViewSpec` plus the tool calls) and replay at real speed.
One question is asked live and unscripted. Part 2's live pieces (Haiku, the MCP handoff) are not built yet; until
they are, part 2 runs on recordings (open decisions 1, 3, 4).

## 15. Risks and fallbacks

| Risk | Fallback |
|---|---|
| The call graph misses the demo's path | Rebuild with the SCIP step; check with `scripts/graph_recall_check.py`; curate questions the graph resolves |
| Haiku proposals are noisy or slow | Only propose on sentences that name code; keep the keyword matcher as a backup |
| Haiku's graphs are weak | A bigger Claude model builds the `ViewSpec`; recordings for scripted questions |
| Reson8 is flaky | Browser speech recognition, then the text box |
| Indexing takes too long | Pre-index; the demo says "indexed earlier" |
| No live agent endpoint on stage | Show the handoff doc itself, then open it in Claude Code |

---

## 16. Run the app

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173 (add `?still` to skip the code-city entrance). It runs on sample data by default.
Optional settings go in `app/.env.local` (template: `app/.env.example`):

| Variable | Meaning |
|---|---|
| `RESON8_API_KEY` | Voice. Only the dev server reads it; it mints short-lived browser tokens at `/api/reson8-token` |
| `VITE_KNOWLEDGE_URL` | e.g. `http://127.0.0.1:18300`: the chat uses the bridge instead of sample data |
| `VITE_AGENT_URL` | Where "Send to the agent" POSTs the handoff batch; empty logs it to the console |

## 17. Run the backend

### macOS, Apple Silicon

```bash
brew install rustup universal-ctags
rustup default stable && rustup component add rust-analyzer
export PATH=/opt/homebrew/opt/rustup/bin:$PATH   # rustup from Homebrew is keg-only

cd repo-analysis-workbench
python3 -m venv .venv
.venv/bin/pip install -e ".[tree-sitter]" tree-sitter-rust pytest
cargo build --manifest-path native/Cargo.toml
./scripts/bootstrap.sh

# index a target repo (about 6 minutes for a 67k-line Rust workspace)
git clone --depth 1 https://github.com/Rust-Framework/rust-agent-framework ../repo_analyse/rust-agent-framework
export PYTHON_BIN="$PWD/.venv/bin/python"; WS="$PWD/../repo_analyse"
./scripts/build_scip.sh       --repo rust-agent-framework --workspace-root "$WS"   # Rust call graph, ~1 min
./scripts/parse_repos.sh      --repo rust-agent-framework --workspace-root "$WS"
./scripts/build_index.sh      --repo rust-agent-framework --workspace-root "$WS" \
                              --scip-index "$WS/.scip/rust-agent-framework.scip.json"
./scripts/build_search.sh     --repo rust-agent-framework --workspace-root "$WS"
./scripts/export_summaries.sh --repo rust-agent-framework

# check the MCP server end to end
.venv/bin/python scripts/mcp_smoke_test.py rust-agent-framework
```

Then open Claude Code in `tech_eu_hack/`, approve the `repo-analysis` server, and check `/mcp`.

### Windows

Tested on Windows 10 with Git Bash: the full index of `rust-agent-framework` builds in about 15 minutes (SCIP ~7,
the rest ~8) and all 15 smoke-test calls succeed.

**One-time setup.** Rust's default (MSVC) toolchain needs Visual Studio's linker. Without it, use the GNU toolchain
and WinLibs MinGW instead:

```bash
winget install BrechtSanders.WinLibs.POSIX.UCRT        # gcc + dlltool for the GNU toolchain
rustup toolchain install stable-x86_64-pc-windows-gnu --profile minimal
rustup component add rust-analyzer --toolchain stable-x86_64-pc-windows-gnu
```

**Every shell that builds** (Git Bash). Put MinGW first on `PATH`: Git Bash's own `link` shadows the linker.

```bash
export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu PYTHONUTF8=1
export PATH="$LOCALAPPDATA/Microsoft/WinGet/Packages/BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe/mingw64/bin:$PATH"

cd repo-analysis-workbench
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[tree-sitter]" tree-sitter-rust pytest
cargo build --manifest-path native/Cargo.toml
export PYTHON_BIN="$PWD/.venv/Scripts/python.exe"; WS="$PWD/../repo_analyse"
# then the same clone and index commands as on macOS
.venv/Scripts/python scripts/mcp_smoke_test.py rust-agent-framework
```

`.mcp.json` points at `.venv/bin/python`, which doesn't exist on Windows. Register the server for your user instead:
`claude mcp add repo-analysis --scope user -- "<abs>/repo-analysis-workbench/.venv/Scripts/python.exe" "<abs>/repo-analysis-workbench/src/mcp_server/server.py"`.

## 18. Run the bridge

Needs the backend's `.venv` and an indexed repo.

```bash
WORKBENCH_REPO=rust-agent-framework repo-analysis-workbench/.venv/bin/python bridge/server.py           # macOS
WORKBENCH_REPO=rust-agent-framework repo-analysis-workbench/.venv/Scripts/python.exe bridge/server.py   # Windows
```

| Variable | Default | Meaning |
|---|---|---|
| `WORKBENCH_REPO` | (required) | Indexed repo name (a folder under `data/search/`) |
| `WORKBENCH_DATA` | `repo-analysis-workbench/data` | Workbench data root |
| `WORKBENCH_WORKSPACE` | `repo_analyse` | Where the indexed repos are cloned. The index keeps symbol spans, not text, so `find-symbol` reads the code from here |
| `BRIDGE_PORT` | `18300` | Port, on 127.0.0.1 only |

Then set `VITE_KNOWLEDGE_URL=http://127.0.0.1:18300` in `app/.env.local`.

---

## 19. Changes to the vendored workbench

`repo-analysis-workbench` is vendored from
[prmartinow/repo-analysis-workbench](https://github.com/prmartinow/repo-analysis-workbench) at commit `8318147`
(MIT licence, see its `LICENSE`). Our changes:

- **MCP server** (`src/mcp_server/`, `scripts/mcp_smoke_test.py`, `docs/MCP Server.md`).
- **Keyword-query cache** in `common/native_tool.py` (per process, keyed on index mtime): `prepare_answer_bundle`
  went from ~37 s to ~20 s first call, ~1.7 s repeated.
- **Embeddings optional** (`REPO_ANALYSIS_EMBEDDINGS=off|optional|required`); upstream always required them.
- **Qdrant vector store** (`src/backends/qdrant/`) replacing the single-JSON-file vector index.
- **OpenRouter embedding provider**, streamed into Qdrant batch by batch, resumable, rate-limited, with
  `--skip-unit-kinds` to limit scope.
- **SCIP call graph for Rust** (`src/symbols/scip_bridge.py`, `scripts/build_scip.sh`, `scripts/scip_to_json.py`):
  rust-analyzer's references become CALLS edges. Also fixes rust-analyzer symbol locations, which removed ~1.5k
  phantom duplicate symbols (statements 244k → 33k on `rust-agent-framework`).
- **Windows fixes** (after Aneeth's `39a9c81`, found while indexing on Windows):
  - SCIP document paths are normalised to `/` (`parsers/scip_backend.py`). rust-analyzer on Windows writes `\`, so
    no compiler references attached: callers went missing and ~7.7k duplicate symbols appeared.
  - The native worker's output is decoded as UTF-8 (`common/native_tool.py`); the Windows code page broke search
    on non-ASCII text such as the repo's Chinese comments.
  - The Unix-only `resource` import is optional (`symbols/indexer.py`); the smoke test uses its own interpreter.
- **Rerank penalises test code** unless the question is about tests.
- **Graph recall check** (`scripts/graph_recall_check.py`): compares callers with hand-verified call sites.

## 20. Backend notes

- `tree-sitter-rust` isn't in the workbench's optional dependencies, but its Rust parser needs it.
- With rust-analyzer installed, 5 upstream unit tests fail because they assume optional tools (rust-analyzer,
  tree-sitter) are *not* installed; all tests for our additions pass.
- Without the SCIP step, the Rust call graph misses most method calls, trait dispatch and cross-crate calls
  (links by name only). Always index Rust repos with `build_scip.sh` first.
- Python support in the workbench is shallow (symbols and search only: no call graph). Rust gets the full analysis.
- The embedding chunks are padded with search metadata, so a 1M-token repo becomes ~40M tokens to embed by default.
  One reason embeddings were dropped.

## 21. Reference docs

Everything about the project is in this README. These are deep references for one piece each:

| Doc | What it's for |
|---|---|
| [`MCP Server.md`](repo-analysis-workbench/docs/MCP%20Server.md) | Every MCP tool's parameters, setup, config, measured latencies and limits |
| [`repo_analyse/README.md`](repo_analyse/README.md) | Cloning and indexing a target repo |
| [`repo-analysis-workbench/README.md`](repo-analysis-workbench/README.md) | The upstream workbench |
| [`knowledge/repo-analysis-workbench-guide.md`](knowledge/repo-analysis-workbench-guide.md) | How the upstream workbench works inside (written before our MCP server) |
| [`docs/ilograph.yaml`](docs/ilograph.yaml) | Architecture diagram of the Spelunk app ([Ilograph](https://www.ilograph.com)) |
| [`docs/Research Sources.md`](docs/Research%20Sources.md), [`Research Summaries.md`](docs/Research%20Summaries.md) | Reading list: dependence graphs, impact analysis, code retrieval |
| [`docs/paper-code-mapping/`](docs/paper-code-mapping/papers-to-code.html) | Which of the 85 papers each workbench file implements or approximates: an HTML dashboard, plus the same tables as `.xlsx` and `.csv` (line numbers from backend `416efcf`) |

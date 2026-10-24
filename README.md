# Spelunk (tech_eu_hack)

**Your team talks about the code. Spelunk listens, shows what you mean on a live graph of the real code, and hands
the decisions you accept to your coding agent.**

This README is the whole project in one place: the idea, the agentic loop, the architecture, who owns what, what
works today, the contracts between the pieces, the demo, and how to run everything. If something here is wrong,
fix it here. The only other docs are deep references owned by one piece (see [Reference docs](#21-reference-docs)).

_Last updated: 24 Oct 2026._

## Contents

**The product**
1. [What we're building](#1-what-were-building)
2. [The agentic loop](#2-the-agentic-loop)
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

Code discussions lose their decisions. People talk through a change ("the click goes into the reconciler", "if we
refactor performWorkOnRoot, what breaks?"), someone half-remembers it, and the coding agent never hears it.

Spelunk sits in that conversation and is **agentic** end to end:

- It **listens**. Reson8 transcribes the room live.
- It **understands**. Claude Haiku 5.5 pulls the decisions and questions out of the transcript and grounds them in
  the real code through our MCP server.
- It **shows**. Each one appears on the graph as a proposal: highlight this function, answer this question,
  draw this flow.
- **People decide.** Every proposal is accepted or dismissed by a human. Nothing moves without a yes.
- It **hands off**. The accepted decisions become one handoff document, with what was decided, who said it, and
  the exact code it touches. Any agent (Claude Code, Cursor, …) picks it up through MCP.

Two parts make it work, and each is useful on its own:

| Part | What it is |
|---|---|
| **repo-analysis MCP server** (backend) | Pre-indexes a repo into symbols, a call graph, keyword search and summaries. Gives any coding agent tools like "who calls this?" and "how does A reach B?" instead of grepping |
| **Spelunk app** (frontend) | The room: live transcript, the graph of the code, proposals to accept, and the handoff to the agent |

The backend's benchmark (does Claude Code with these tools understand a codebase better than Claude Code alone,
Cursor or Antigravity?) is our evidence that the MCP helps. It isn't a separate product.

## 2. The agentic loop

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
| ⑤ Hand off | One click turns the accepted batch into a handoff doc: decisions, who said them, code refs, the graph. It's published through the MCP server so the team's agent can pull it and act | app → MCP server → any agent | UI and payload **built** (`app/src/engine/agent.ts`). Publishing through MCP: **not built** |

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
├── qdrant/                    # optional local vector DB (unused, embeddings dropped)
├── qwen-mlx/                  # optional local Qwen3 server (unused, embeddings dropped)
├── knowledge/                 # notes on the upstream workbench
├── docs/                      # architecture diagram + research reading list
└── .mcp.json                  # registers the MCP server for Claude Code sessions opened here
```

## 6. Who owns what

| Piece | Folder | Owner | State |
|---|---|---|---|
| Indexing engine (vendored workbench + our changes) | `repo-analysis-workbench/` | Aneeth | Works on Rust. Python/TS/Go get symbols and search only |
| MCP server | `repo-analysis-workbench/src/mcp_server/` | Aneeth | Works over stdio in Claude Code. 12 tools, smoke-tested |
| Target repo | `repo_analyse/` | Aneeth | `rust-agent-framework` (67k lines of Rust) indexed |
| Spelunk app | `app/` | frontend (dusy4) | All screens built, running on **sample data** for facebook/react |
| Haiku extraction and graph building (loop ② ③) | none yet | **nobody** | Not started. The biggest missing piece |
| Handoff through MCP (loop ⑤) | none yet | **nobody** | UI and payload built; publishing not started |
| HTTP bridge | `bridge/` | frontend | Stopgap so the chat can reach the index (open decision 2) |

## 7. What actually works today

| You can… | Real or sample? |
|---|---|
| Use the 12 MCP tools from Claude Code opened in this folder (after indexing) | **Real** |
| Index a Rust repo and query callers, callees, paths, bodies | **Real**, but the call graph misses many calls ([measured](repo-analysis-workbench/docs/MCP%20Server.md#limitations)) |
| Talk and see the live transcript (Reson8) | **Real** (needs `RESON8_API_KEY`) |
| Get proposals from what was said | Real time, but a **keyword matcher** against the sample symbols, not Haiku |
| Accept proposals and send them to the agent | UI real; sending only logs to the console unless `VITE_AGENT_URL` is set |
| Watch an answer build on the graph, with the agent run listing tool calls | **Replay**: recorded answers played on timers (`app/src/engine/useReplay.ts`), nothing streams yet |
| Play FlowTrace, BlastRadius, AlgoStepper and the code city | Sample: recorded React answers in `app/src/data/` |
| Ask the chat a question | Sample data by default; real index if the bridge runs and `VITE_KNOWLEDGE_URL` is set |
| "Connect your agent" screen | Shows config for an MCP server that doesn't exist in that form (open decision 2) |

## 8. Decided

- **Agentic loop:** listen → extract → propose → decide → hand off ([section 2](#2-the-agentic-loop)). Humans accept
  every proposal.
- **Voice:** Reson8.
- **Extraction:** Claude Haiku 5.5 (`claude-haiku-5-5`) reads the transcript. It may also build the graphs.
- **Handoff goes out through MCP**, so it works with whatever agent people already use.
- **Code facts come from the repo-analysis MCP server.** Keyword search (BM25) plus the code graph.
- **No embeddings.** Qdrant, OpenRouter and Qwen are built but switched off and nothing depends on them.
- **The graph's contract is `ViewSpec`**, owned by the frontend ([section 10](#10-viewspec-what-the-graph-draws)).
- **Domain:** software codebases. Earlier ideas (bio, finance visualisations) are dropped.
- **No jev / json-render.** The placeholder was removed.
- **Demo safety net:** scripted questions replay recorded answers; one is asked live.

## 9. Open decisions

Each needs one owner and one answer.

### 1. Which repo do we demo on?

- **The clash:** the app's sample answers, demo script and suggested questions are about facebook/react
  (JavaScript). The backend indexed `rust-agent-framework`, because only Rust gets a call graph. On React the graph
  views would come out nearly empty.
- **Recommendation:** demo on `rust-agent-framework` (or another Rust repo). Re-record 3 answers and rewrite the
  suggested questions for it. Keep React only as screenshots.

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
- **Owner needed.** It spans the app and the server.

### 5. The call graph misses real calls

- **The clash:** FlowTrace and BlastRadius depend on callers and callees, but the Rust graph misses method-call
  syntax, trait dispatch and cross-crate calls ([measured](repo-analysis-workbench/docs/MCP%20Server.md#limitations)).
- **Options:**
  - Import a SCIP index from rust-analyzer. `build-index --scip-index` exists but hasn't been tried.
  - Pick demo questions whose paths the graph does find.

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

The `repo-analysis` server (stdio, read-only, JSON responses capped at 20k chars). Full reference with parameters,
latencies and limits: [MCP Server.md](repo-analysis-workbench/docs/MCP%20Server.md).

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

To add for the loop: `list_handoffs` / `get_handoff` (open decision 4), and an HTTP transport (open decision 2).

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

About 3 minutes. The beats are written for React because that's what the recordings show; they move to the demo
repo once open decision 1 is settled.

| Time | Beat | Shows |
|---|---|---|
| 0:00 | Open the repo; the code city flies in | Scale |
| 0:20 | Two people talk: "the click starts at setCount and goes into the reconciler…" | The transcript fills live |
| 0:40 | Proposals appear: "Show scheduleUpdateOnFiber" lights the node on the graph | Haiku understood the room |
| 1:00 | Accept two proposals; press ▶ and the flow plays step by step, code following | Grounded in real code |
| 1:40 | "If we refactor performWorkOnRoot, what breaks?" → BlastRadius ripples out to callers and tests | Practical value |
| 2:10 | Send to the agent: the handoff doc lands in Claude Code through MCP, which starts the change | Agentic: talk → decision → agent |
| 2:40 | One benchmark number: Claude Code with our MCP vs without | Proof it helps |

**Safety net:** scripted questions are pre-recorded (`ViewSpec` plus the tool calls) and replay at real speed.
One question is asked live and unscripted.

## 15. Risks and fallbacks

| Risk | Fallback |
|---|---|
| The call graph misses the demo's path | Curate questions the graph resolves; try the SCIP import (open decision 5) |
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

macOS, Apple Silicon.

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
./scripts/parse_repos.sh      --repo rust-agent-framework --workspace-root "$WS"
./scripts/build_index.sh      --repo rust-agent-framework --workspace-root "$WS"
./scripts/build_search.sh     --repo rust-agent-framework --workspace-root "$WS"
./scripts/export_summaries.sh --repo rust-agent-framework

# check the MCP server end to end
.venv/bin/python scripts/mcp_smoke_test.py rust-agent-framework
```

Then open Claude Code in `tech_eu_hack/`, approve the `repo-analysis` server, and check `/mcp`.

## 18. Run the bridge

Needs the backend's `.venv` and an indexed repo.

```bash
WORKBENCH_REPO=rust-agent-framework repo-analysis-workbench/.venv/bin/python bridge/server.py
```

| Variable | Default | Meaning |
|---|---|---|
| `WORKBENCH_REPO` | (required) | Indexed repo name (a folder under `data/search/`) |
| `WORKBENCH_DATA` | `repo-analysis-workbench/data` | Workbench data root |
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

## 20. Backend notes

- `tree-sitter-rust` isn't in the workbench's optional dependencies, but its Rust parser needs it.
- With rust-analyzer installed, 5 upstream unit tests fail because they assume optional tools (rust-analyzer,
  tree-sitter) are *not* installed; all tests for our additions pass.
- The Rust call graph misses many real calls (method-call syntax, trait dispatch, cross-crate); see
  [MCP Server › Limitations](repo-analysis-workbench/docs/MCP%20Server.md#limitations).
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
| [`qwen-mlx/README.md`](qwen-mlx/README.md) | The local Qwen server (unused since embeddings were dropped) |

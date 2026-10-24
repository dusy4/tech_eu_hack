# Start here

Read this page first. It is the one place that says what we are building, how the pieces fit, what works
today, and which decisions are still open. The other docs go deeper on one piece each (see the
[docs map](#docs-map)). If something here is wrong, fix it here first.

_Last updated: 24 Oct 2026, after the backend MCP server landed (`416efcf`)._

## What we're building

**Spelunk: ask a big codebase a question and get an answer you can see, built from the real code.**

Two things make it work, and each is useful on its own:

1. **A code-intelligence MCP server** (backend). It pre-indexes a repo into symbols, a call graph, keyword
   search and summaries, and gives any coding agent (Claude Code, Claude Desktop, Cursor) tools like
   "who calls this?" and "how does A reach B?" instead of grepping.
2. **The Spelunk app** (frontend). You ask by voice or text. An agent calls those MCP tools, and the app
   draws the answer as a playable view (call flow, blast radius, code city), with every node linked to its
   lines of code.

The pitch is both together: *the MCP makes agents understand code; Spelunk makes that understanding visible.*
The backend's benchmark (does Claude Code with these tools beat Claude Code alone?) is our evidence that the
MCP helps, not a separate product.

## How the pieces connect

```
   you (voice / text)
          │
          ▼
   Spelunk app  (app/, React)                 Claude Code / Claude Desktop
          │  asks                                       │
          ▼                                             │
   agent step: Claude + MCP tools  ◄── NOT BUILT        │
          │  calls tools               emits ViewSpec   │
          ▼                                             ▼
   repo-analysis MCP server  (repo-analysis-workbench/src/mcp_server, 12 read-only tools)
          │
          ▼
   workbench index of the target repo  (data/: LMDB, RyuGraph, Tantivy, summaries)
          ▲
          │  built once by the index scripts
   target repo cloned in repo_analyse/  (now: rust-agent-framework)
```

## Who owns what

| Piece | Folder | Owner | State |
|---|---|---|---|
| Indexing engine (vendored workbench + our changes) | `repo-analysis-workbench/` | Aneeth | Works on Rust. Python/TS/Go get symbols and search only |
| MCP server | `repo-analysis-workbench/src/mcp_server/` | Aneeth | Works over stdio in Claude Code. 12 tools, smoke-tested |
| Target repo | `repo_analyse/` | Aneeth | `rust-agent-framework` (67k lines of Rust) indexed |
| Embeddings (Qdrant, OpenRouter, `qwen-mlx/`) | `qdrant/`, `qwen-mlx/` | Aneeth | Built but **switched off**; nothing depends on them |
| Spelunk app | `app/` | frontend (dusy4) | All screens built, running on **sample data** for facebook/react |
| HTTP bridge | `bridge/` | frontend | Stopgap so the chat can reach the index; to be replaced (see decision 3) |
| Agent step that writes `ViewSpec` | none | **nobody** | Not started (see decision 4) |

## What actually works today

| You can… | Real or sample? |
|---|---|
| Use the 12 MCP tools from Claude Code opened in this folder (after indexing) | **Real** |
| Index a Rust repo and query callers, callees, paths, bodies | **Real**, but the call graph misses many calls ([measured](../repo-analysis-workbench/docs/MCP%20Server.md#limitations)) |
| Open the Spelunk app and play the React answers (FlowTrace, BlastRadius, AlgoStepper, code city) | Sample: recorded fixtures in `app/src/data/` |
| Ask the app's chat a question | Sample data by default; real index if the bridge is running and `VITE_KNOWLEDGE_URL` is set |
| Talk to the app by voice (Reson8) | **Real** (needs `RESON8_API_KEY`) |
| "Connect your agent" screen | Shows config for an MCP server that doesn't exist in that form (decision 3) |

## Decided

- **Domain:** software codebases. The bio and finance demos in `viz-playbook.md` are dropped.
- **Agent interface:** MCP. The backend is an MCP server; the app consumes the same tools.
- **UI contract:** `ViewSpec` in `app/src/data/types.ts`, owned by the frontend.
- **Search:** keyword (BM25) plus the code graph. Embeddings stay off unless a measured comparison says
  they help.
- **Voice:** Reson8.
- **Demo safety net:** scripted questions replay recorded answers; one question is asked live.

## Open decisions

These are where the project currently contradicts itself. Each needs one owner and one answer.

### 1. Which repo do we demo on?

- **The clash:** the app's fixtures, demo script and suggested questions are all about facebook/react
  (JavaScript). The backend indexed `rust-agent-framework`, because only Rust gets a call graph. On React
  the graph views would come out nearly empty.
- **Recommendation:** demo on `rust-agent-framework` (or another Rust repo). Re-record 3 fixture answers
  and rewrite the suggested questions for it. Keep React only as screenshots.

### 2. One pitch

- **The clash:** the backend README pitches "does Claude Code understand code better with these tools?"
  (a benchmark). The app docs pitch "watch the answer build itself" (a visual product).
- **Recommendation:** use the line in [What we're building](#what-were-building). Lead with the app;
  show one benchmark number as proof.

### 3. How does the app reach the MCP server?

- **The clash:** three different answers exist:
  - The MCP server only speaks **stdio**, under the name `repo-analysis`. A browser can't use stdio.
  - The app's Connect screen (`app/src/ui/ConnectAgent.tsx`) advertises an HTTP MCP server called
    `spelunk` at `http://localhost:8787/mcp`, which doesn't exist.
  - `bridge/` is a third, custom HTTP API that duplicates the MCP tools.
- **Recommendation:**
  - Aneeth adds an HTTP transport to the same server (the MCP SDK supports streamable HTTP), at
    `localhost:8787/mcp`.
  - The app calls the MCP tools directly, and the Connect screen shows the real config.
  - Delete `bridge/` once that works.

### 4. Who turns tool results into a `ViewSpec`?

- **The clash:** the views need nodes, edges, ordered steps and captions. The MCP returns raw facts and
  writes no text. Nothing in between exists yet.
- **Recommendation:** an agent step in the app. It calls Claude with the MCP tools and a "return a
  `ViewSpec`" instruction, and streams tool-call events to the agent ticker.
  - BlastRadius can be built without an LLM, from `symbol_relations(callers)`.
  - This needs an owner. It is the biggest missing piece.

### 5. The call graph misses real calls

- **The clash:** BlastRadius and FlowTrace depend on callers and callees, but the Rust graph misses
  method-call syntax, trait dispatch and cross-crate calls (measured in `MCP Server.md`).
- **Options:**
  - Import a SCIP index from rust-analyzer. `build-index --scip-index` exists but hasn't been tried.
  - Pick demo questions whose paths the graph does find.

## Docs map

| Doc | What it's for | Status |
|---|---|---|
| `docs/PROJECT.md` (this) | Overview, ownership, decisions | Current |
| [`README.md`](../README.md) | Backend setup and our changes to the workbench | Current (backend only) |
| [`MCP Server.md`](../repo-analysis-workbench/docs/MCP%20Server.md) | The 12 tools, setup, config, measured limits | Current |
| [`repo_analyse/README.md`](../repo_analyse/README.md) | Cloning and indexing a target repo | Current |
| [`app/README.md`](../app/README.md) | Running the app, what's sample vs real | Current, but "Reason8 adapter" note is outdated (Reson8 is wired) |
| [`docs/swe-demo-plan.md`](swe-demo-plan.md) | UX flow, view types, `ViewSpec`, demo script | Current, except the demo repo (decision 1) |
| [`docs/backend-contract.md`](backend-contract.md) | The bridge's HTTP API | **Stopgap**, goes away with decision 3 |
| [`docs/ilograph.yaml`](ilograph.yaml) | Architecture diagram of the Spelunk app | Current for the app |
| [`docs/viz-playbook.md`](viz-playbook.md) | Early brainstorm: visualization libraries, the generic idea | Background only; `swe-demo-plan.md` supersedes it |
| [`knowledge/repo-analysis-workbench-guide.md`](../knowledge/repo-analysis-workbench-guide.md) | How the upstream workbench works | Background; written before our MCP server (says "no MCP server") |
| `docs/Research Sources.md`, `docs/Research Summaries.md` | Reading list: papers on dependence graphs, impact analysis, code retrieval | Background |

# Spelunk (tech_eu_hack)

**Ask a big codebase a question and get an answer you can see, built from the real code.**

This README is the single overview of the whole project: what it is, how the pieces fit, who owns what, what
works today, and which decisions are still open. Other docs go deeper on one piece each (see the
[docs map](#docs-map)). If something here is wrong, fix it here first.

_Last updated: 24 Oct 2026, after the backend MCP server landed (`416efcf`)._

## Contents

**The project**
1. [What we're building](#what-were-building)
2. [How the pieces connect](#how-the-pieces-connect)
3. [Repo layout](#repo-layout)
4. [Who owns what](#who-owns-what)
5. [What actually works today](#what-actually-works-today)

**Decisions**

6. [Decided](#decided)
7. [Open decisions](#open-decisions)
   1. [Which repo do we demo on?](#1-which-repo-do-we-demo-on)
   2. [One pitch](#2-one-pitch)
   3. [How does the app reach the MCP server?](#3-how-does-the-app-reach-the-mcp-server)
   4. [Who turns tool results into a `ViewSpec`?](#4-who-turns-tool-results-into-a-viewspec)
   5. [The call graph misses real calls](#5-the-call-graph-misses-real-calls)

**Running it**

8. [Run the app](#run-the-app)
9. [Run the backend (index a repo, start the MCP server)](#run-the-backend)

**Reference**

10. [Docs map](#docs-map)
11. [Changes to the vendored workbench](#changes-to-the-vendored-workbench)
12. [Backend notes](#backend-notes)

---

## What we're building

Two parts, each useful on its own:

1. **A code-intelligence MCP server** (backend). It pre-indexes a repo into symbols, a call graph, keyword
   search and summaries, and gives any coding agent (Claude Code, Claude Desktop, Cursor) tools like
   "who calls this?" and "how does A reach B?" instead of grepping.
2. **The Spelunk app** (frontend). You ask by voice or text. An agent calls those MCP tools, and the app
   draws the answer as a playable view (call flow, blast radius, code city), with every node linked to its
   lines of code.

The pitch is both together: *the MCP makes agents understand code; Spelunk makes that understanding visible.*
The backend's benchmark (does Claude Code with these tools beat Claude Code alone, or Cursor, or Antigravity?)
is our evidence that the MCP helps, not a separate product.

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

## Repo layout

```
tech_eu_hack/
├── app/                       # Spelunk app (React + Vite)
├── bridge/                    # stopgap HTTP API from the app to the index (see decision 3)
├── docs/                      # plans, contracts, research (see the docs map)
├── .mcp.json                  # registers the MCP server for Claude Code sessions opened here
├── repo-analysis-workbench/   # indexing + retrieval engine and the MCP server
├── repo_analyse/              # target repos being analysed (clones are gitignored)
├── qdrant/                    # optional local vector DB (docker compose)
├── qwen-mlx/                  # optional local Qwen3 embedding/reranker server (Apple MLX)
└── knowledge/                 # analysis notes on the upstream workbench
```

## Who owns what

| Piece | Folder | Owner | State |
|---|---|---|---|
| Indexing engine (vendored workbench + our changes) | `repo-analysis-workbench/` | Aneeth | Works on Rust. Python/TS/Go get symbols and search only |
| MCP server | `repo-analysis-workbench/src/mcp_server/` | Aneeth | Works over stdio in Claude Code. 12 tools, smoke-tested |
| Target repo | `repo_analyse/` | Aneeth | `rust-agent-framework` (67k lines of Rust) indexed |
| Embeddings | `qdrant/`, `qwen-mlx/` | Aneeth | Built but **switched off**; nothing depends on them |
| Spelunk app | `app/` | frontend (dusy4) | All screens built, running on **sample data** for facebook/react |
| HTTP bridge | `bridge/` | frontend | Stopgap so the chat can reach the index; to be replaced (decision 3) |
| Agent step that writes `ViewSpec` | none | **nobody** | Not started (decision 4) |

## What actually works today

| You can… | Real or sample? |
|---|---|
| Use the 12 MCP tools from Claude Code opened in this folder (after indexing) | **Real** |
| Index a Rust repo and query callers, callees, paths, bodies | **Real**, but the call graph misses many calls ([measured](repo-analysis-workbench/docs/MCP%20Server.md#limitations)) |
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

- **The clash:** the backend pitches "does Claude Code understand code better with these tools?"
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

---

## Run the app

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173. By default the app runs on its sample data. Optional settings go in
`app/.env.local` (see `app/.env.example`):
- `RESON8_API_KEY` for voice.
- `VITE_KNOWLEDGE_URL=http://127.0.0.1:18300` to point the chat at the bridge
  ([backend-contract.md](docs/backend-contract.md)).

More in [app/README.md](app/README.md).

## Run the backend

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

---

## Docs map

| Doc | What it's for | Status |
|---|---|---|
| `README.md` (this) | Overview, ownership, decisions, how to run | Current |
| [`MCP Server.md`](repo-analysis-workbench/docs/MCP%20Server.md) | The 12 tools, setup, config, measured limits | Current |
| [`repo_analyse/README.md`](repo_analyse/README.md) | Cloning and indexing a target repo | Current |
| [`app/README.md`](app/README.md) | Running the app, what's sample vs real | Current |
| [`docs/swe-demo-plan.md`](docs/swe-demo-plan.md) | UX flow, view types, `ViewSpec`, demo script | Current, except the demo repo (decision 1) |
| [`docs/backend-contract.md`](docs/backend-contract.md) | The bridge's HTTP API | **Stopgap**, goes away with decision 3 |
| [`docs/ilograph.yaml`](docs/ilograph.yaml) | Architecture diagram of the Spelunk app | Current for the app |
| [`docs/viz-playbook.md`](docs/viz-playbook.md) | Early brainstorm: visualization libraries, the generic idea | Background only; `swe-demo-plan.md` supersedes it |
| [`knowledge/repo-analysis-workbench-guide.md`](knowledge/repo-analysis-workbench-guide.md) | How the upstream workbench works | Background; written before our MCP server (says "no MCP server") |
| [`repo-analysis-workbench/README.md`](repo-analysis-workbench/README.md) | Upstream workbench README | Background |
| [`qwen-mlx/README.md`](qwen-mlx/README.md) | Local embedding/reranker server | Optional, currently unused |
| `docs/Research Sources.md`, `docs/Research Summaries.md` | Reading list: papers on dependence graphs, impact analysis, code retrieval | Background |

## Changes to the vendored workbench

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

## Backend notes

- `tree-sitter-rust` isn't in the workbench's optional dependencies, but its Rust parser needs it.
- With rust-analyzer installed, 5 upstream unit tests fail because they assume optional tools (rust-analyzer,
  tree-sitter) are *not* installed; all tests for our additions pass.
- The Rust call graph misses many real calls (method-call syntax, trait dispatch, cross-crate); see
  [MCP Server › Limitations](repo-analysis-workbench/docs/MCP%20Server.md#limitations).
- Python support in the workbench is shallow (symbols and search only: no call graph). Rust gets the full analysis.
- The embedding chunks are padded with search metadata, so a 1M-token repo becomes ~40M tokens to embed by default.
  Another reason embeddings are off for now.

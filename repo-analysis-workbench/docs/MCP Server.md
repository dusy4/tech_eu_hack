# repo-analysis MCP server

An [MCP](https://modelcontextprotocol.io) server that gives a coding agent such as **Claude Code** direct access to the
workbench's index of a repository: parsed symbols, the code graph, keyword search and summaries.

The idea: instead of discovering a codebase by repeated `grep` and file reads, the agent asks structured questions
("who calls this?", "how does A reach B?", "show me this function") and gets compact, exact answers.

- Code: [`src/mcp_server/server.py`](../src/mcp_server/server.py)
- Transport: stdio (the agent launches the server as a subprocess)
- All tools are **read-only**; nothing in the indexed repo or the index is modified.

---

## How it fits together

```
Claude Code ──(MCP, stdio)──► src/mcp_server/server.py
                                   │  thin wrappers, JSON responses, size-capped
                                   ▼
                              agents/toolkit.py   (the workbench's query API)
                                   │
          ┌────────────────┬───────┴─────────┬──────────────────┐
          ▼                ▼                 ▼                  ▼
   LMDB metadata     RyuGraph graph    Tantivy keyword     summaries
   data/parsed/      data/graph/       data/search/        (in LMDB)
```

The server only **reads** pre-built artifacts. A repo must be indexed first (see [Setup](#setup)), and the answers
reflect the last build, not uncommitted edits.

---

## Tools

`repo` is optional on every tool: it defaults to `REPO_ANALYSIS_DEFAULT_REPO`, or to the only indexed repo if there is
exactly one. Every tool returns compact JSON, capped at `REPO_ANALYSIS_MCP_MAX_CHARS` characters (default 20,000);
larger results end with a `[truncated …]` note telling the agent to narrow the query.

| Tool | Parameters | Use it for |
|---|---|---|
| `list_repos` | none | Which repos are indexed |
| `repo_overview` | `repo` | First call on an unfamiliar repo: summary, crates/packages, languages, sizes, entrypoints |
| `summarize_path` | `path`, `repo` | What a directory or file contains |
| `search_code` | `query`, `repo`, `limit=10`, `kinds`, `path_prefix` | Ranked keyword search (BM25, identifier- and path-aware). `kinds` filters result types, e.g. `["symbol", "function_body", "file", "doc"]` |
| `find_symbol` | `name`, `repo`, `limit=10` | Where a function, method, struct, trait or impl is defined: path, line range, signature |
| `find_file` | `path_pattern`, `repo`, `limit=20` | Files by partial path |
| `get_symbol_body` | `symbol`, `repo` | Source of a function or type, with signature and location |
| `get_enclosing_context` | `symbol`, `repo` | The symbol's container (impl/module/type), siblings and file |
| `symbol_relations` | `symbol`, `relation`, `repo`, `limit=20` | Follow the code graph. `relation` is one of `callers`, `callees`, `imports`, `refs`, `reads`, `writes`, `implements`, `inherits` |
| `path_between` | `source`, `target`, `repo`, `limit=5` | How two symbols connect, e.g. how a CLI command reaches a storage function |
| `statement_slice` | `symbol`, `repo`, `limit=20` | Statements in a function with what each defines, reads, writes and calls |
| `prepare_answer_bundle` | `question`, `repo`, `limit=8` | One-shot evidence for a broad "how does X work?" question: top symbols and files, graph neighbourhoods, summaries, and evidence with the reason each item was included |

Symbol arguments accept a plain name (`ChatClientBuilder`), a method path (`ChatClientBuilder::build`) or a fully
qualified name (`rust_agent_framework::client::ChatClientBuilder`).

### Suggested agent workflow

1. `repo_overview` → orientation.
2. `search_code` or `prepare_answer_bundle` → candidate symbols and files for the question.
3. `find_symbol` / `get_symbol_body` → read the exact code.
4. `symbol_relations` / `path_between` / `statement_slice` → follow structure instead of grepping.
5. Read files directly only to confirm details.

The same guidance is sent to the agent as the server's `instructions` when it connects.

---

## Setup

### 1. Build the index for a repo

Target repos live in [`repo_analyse/`](../../repo_analyse/README.md) at the top of this project.

```bash
cd repo-analysis-workbench
export PATH=/opt/homebrew/opt/rustup/bin:$PATH     # native search worker needs cargo
export PYTHON_BIN="$PWD/.venv/bin/python"
WS="$PWD/../repo_analyse"
./scripts/parse_repos.sh      --repo <repo> --workspace-root "$WS"
./scripts/build_index.sh      --repo <repo> --workspace-root "$WS"
./scripts/build_search.sh     --repo <repo> --workspace-root "$WS"
./scripts/export_summaries.sh --repo <repo>
```

A 67k-line Rust workspace takes about 6 minutes on an M1 Pro. Embeddings are **not** needed (see [Embeddings](#embeddings)).

The MCP SDK is installed with the workbench's dependencies (`mcp==2.3.0`, in the workbench `.venv`).

### 2. Connect Claude Code

**Project scope (this repo).** [`/.mcp.json`](../../.mcp.json) at the top of `tech_eu_hack` registers the server for
any Claude Code session opened in that folder (CLI, desktop app or IDE). Claude Code asks you to approve project MCP
servers the first time. Paths in it are relative to `tech_eu_hack/`.

```json
{
  "mcpServers": {
    "repo-analysis": {
      "type": "stdio",
      "command": "repo-analysis-workbench/.venv/bin/python",
      "args": ["repo-analysis-workbench/src/mcp_server/server.py"],
      "env": { "REPO_ANALYSIS_EMBEDDINGS": "off", "REPO_ANALYSIS_RERANK_PROVIDER": "heuristic" }
    }
  }
}
```

**From another folder** (for example a session opened inside `repo_analyse/<repo>` itself), register it with absolute
paths, either for your user:

```bash
claude mcp add repo-analysis --scope user \
  -e REPO_ANALYSIS_DEFAULT_REPO=<repo> \
  -- "<abs>/tech_eu_hack/repo-analysis-workbench/.venv/bin/python" \
     "<abs>/tech_eu_hack/repo-analysis-workbench/src/mcp_server/server.py"
```

or per run, without changing any config, with `claude -p --mcp-config <file.json> ...`.

Check the connection with `/mcp` inside Claude Code; the server should list 12 tools.

---

## Configuration

| Variable | Default (in the MCP server) | Meaning |
|---|---|---|
| `REPO_ANALYSIS_DATA_DIR` | `<workbench>/data` | Where the index artifacts live |
| `REPO_ANALYSIS_DEFAULT_REPO` | only indexed repo | Repo used when a call omits `repo` |
| `REPO_ANALYSIS_MCP_MAX_CHARS` | `20000` | Size cap per tool response |
| `REPO_ANALYSIS_EMBEDDINGS` | `off` | `off`: never use embeddings. `optional`: use the Qdrant index if one was built. `required`: the workbench's original behaviour (fails without an index) |
| `REPO_ANALYSIS_RERANK_PROVIDER` | `heuristic` | `heuristic` needs nothing extra; `qwen` uses the local reranker in `qwen-mlx/` |

The server adds Homebrew's rustup folder to `PATH` when `cargo` isn't found, because the workbench only uses its native
keyword-search worker when `cargo` is on `PATH`.

---

## Embeddings

Off by default. Everything above works without them; the agent itself bridges vocabulary gaps (it guesses identifiers,
searches and refines). To experiment with semantic search later:

1. Start Qdrant: `docker compose -f qdrant/docker-compose.yml up -d`.
2. Build vectors: `./scripts/build_embeddings.sh --repo <repo> --provider openrouter --skip-unit-kinds statement,semantic_text`
   with `OPENROUTER_API_KEY` set.
3. Set `REPO_ANALYSIS_EMBEDDINGS=optional` in the MCP config.

That makes "with vs without embeddings" a measurable comparison rather than an assumption.

---

## Measured on `rust-agent-framework`

67k lines of Rust, 19 crates, M1 Pro, server launched over stdio with a bare `PATH` (as Claude Code does). All 15
smoke-test calls succeed.

| Tool | Latency | Response |
|---|---|---|
| `list_repos`, `repo_overview`, `summarize_path`, `find_symbol`, `get_symbol_body` | < 0.01 s | 0.3–1.6k chars |
| `search_code`, `find_file` | ~0.15 s | ~2k chars (5 results) |
| `symbol_relations`, `path_between`, `statement_slice` | 0.1–1.7 s | 0.6–5.7k chars |
| `get_enclosing_context` | ~2.7 s | ~8k chars |
| `prepare_answer_bundle` | **~20 s first call**, ~1.7 s repeated | ~14k chars |

What the server does to the raw workbench output:

- **Slimming.** Internal ids, hashes, raw keyword text and nested call/read/write lists are dropped; long strings and
  lists are capped. Raw `search_code` output for 5 hits was ~420k chars; the agent gets ~2.5k.
- **Query cache.** Every keyword query launches the native search worker (~0.2 s each), and a bundle issues ~150 of
  them. Results are cached per server process, keyed on the index's modification time, so repeated and overlapping
  queries are near-instant and a rebuild never serves stale results.
- **Compact bundle.** `prepare_answer_bundle` omits statement slices (listed under `statement_slices_available_for`;
  call `statement_slice` for those), and trims graph neighbourhoods and summaries.

## Limitations

- **The call graph misses many real calls in Rust.** Calls are linked by name, without type inference, and
  effectively within a crate. Checked against the source of `rust-agent-framework`:

  | Symbol | Real call sites | Found by `symbol_relations(callers)` |
  |---|---|---|
  | `ApprovalRequiredTool::new` | 2 (in another crate) | 0 |
  | `requires_approval()` (trait method) | 3 (method-call syntax) | 0 |
  | `ChatClientBuilder::build` (`.build()`) | many | 0 |
  | `FunctionInvokingChatClient::new` | 1 | 1 |

  Method-call syntax (`x.method()`), trait dispatch and cross-crate calls are mostly missing, and same-named methods
  can merge into a phantom container-less symbol (e.g. `rust_agent_core::tool::requires_approval`). Treat empty
  `callers`/`callees` results as "not found by the index", not "no callers". The server's instructions tell the agent
  to verify by reading code. A compiler-grade fix would be importing a SCIP index from rust-analyzer
  (`--scip-index`, supported by `build-index`), not yet tried.
- **Bundle quality is mixed.** For "How does human-in-the-loop tool approval work?" the bundle found the right files
  (`invoke.rs`, `tool.rs`, `run_options.rs`) but its evidence over-weights one test function and misses the
  `ApprovalRequiredTool` struct and the approval docs. Use it as a starting point, then follow up with the precise tools.
- **Index freshness.** Answers come from the last build. Rebuild after significant changes.
- **Language depth.** Rust gets the full graph. Python, TypeScript and Go get symbols and search only (no call graph).
- **Large outputs** are truncated at the size cap; narrow the query or lower `limit`.

---

## Testing

```bash
# unit tests (no index needed)
.venv/bin/python -m pytest tests/unit/test_mcp_server.py -q

# end-to-end over real MCP stdio, against an indexed repo
.venv/bin/python scripts/mcp_smoke_test.py <repo>
```

The smoke test starts the server the way Claude Code does, calls every tool once (four `symbol_relations` variants,
15 calls in total), and prints status, latency, response size and a one-line gist of each result.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Specify repo; indexed repos: …` | More than one repo is indexed: pass `repo` or set `REPO_ANALYSIS_DEFAULT_REPO` |
| `native worker is unavailable` | `cargo` isn't on `PATH` for the server process; add `/opt/homebrew/opt/rustup/bin` to the MCP config's `env.PATH` |
| `Missing embedding index …` | `REPO_ANALYSIS_EMBEDDINGS` is `required`; set it to `off` or `optional` |
| Tool returns empty results for a known symbol | Check the spelling with `find_symbol`, or rebuild the index if the code changed |
| Server not listed in `/mcp` | Open Claude Code in `tech_eu_hack/` (for `.mcp.json`) and approve the project server, or use `claude mcp add` |

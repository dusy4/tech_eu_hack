# tech_eu_hack: backend

Code-understanding backend for coding agents. It indexes a repository into parsed symbols, a code graph,
keyword search and summaries, and exposes all of it to **Claude Code through an MCP server**, so the agent can
answer "who calls this?" or "how does A reach B?" directly instead of grepping and opening files blindly.

The hackathon question: does Claude Code with these tools understand a codebase better, or as well with fewer
tokens, than Claude Code on its own (and other harnesses such as Cursor or Antigravity)?

```
tech_eu_hack/
├── .mcp.json                  # registers the MCP server for Claude Code sessions opened here
├── repo-analysis-workbench/   # indexing + retrieval engine and the MCP server
├── repo_analyse/              # target repos being analysed (clones are gitignored)
├── qdrant/                    # optional local vector DB (docker compose)
├── qwen-mlx/                  # optional local Qwen3 embedding/reranker server (Apple MLX)
└── knowledge/                 # analysis notes on the workbench
```

| Component | What it does | Docs |
|---|---|---|
| `repo-analysis-workbench` | Parses a repo into symbols, statements, a code graph (calls, imports, reads/writes, data flow), a Tantivy keyword index and summaries; answers queries with ranked evidence | [README](repo-analysis-workbench/README.md), [guide](knowledge/repo-analysis-workbench-guide.md) |
| MCP server | 12 read-only tools for Claude Code over stdio | [MCP Server](repo-analysis-workbench/docs/MCP%20Server.md) |
| `repo_analyse/` | Where target repos are cloned and how to index them | [README](repo_analyse/README.md) |
| `qdrant/` + embeddings | Optional semantic search: OpenRouter or local Qwen embeddings stored in Qdrant. **Currently off.** | [MCP Server › Embeddings](repo-analysis-workbench/docs/MCP%20Server.md#embeddings) |
| `qwen-mlx` | Optional local Qwen3 embedding + reranker server on the Metal GPU | [README](qwen-mlx/README.md) |

## Quick start (macOS, Apple Silicon)

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

## Notes

- `tree-sitter-rust` isn't in the workbench's optional dependencies, but its Rust parser needs it.
- With rust-analyzer installed, 5 upstream unit tests fail because they assume optional tools (rust-analyzer,
  tree-sitter) are *not* installed; all tests for our additions pass.
- The Rust call graph misses many real calls (method-call syntax, trait dispatch, cross-crate); see
  [MCP Server › Limitations](repo-analysis-workbench/docs/MCP%20Server.md#limitations).
- Python support in the workbench is shallow (symbols and search only: no call graph). Rust gets the full analysis.
- The embedding chunks are padded with search metadata, so a 1M-token repo becomes ~40M tokens to embed by default.
  Another reason embeddings are off for now.

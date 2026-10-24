# tech_eu_hack: backend

Local code-understanding backend: a repository indexing and retrieval engine plus a local
Qwen3 embedding/reranking server running on Apple Silicon (MLX / Metal).

The goal is to give an LLM coding agent a small, evidence-backed set of code to work from
instead of letting it open files blindly, and to measure whether that beats existing agent
harnesses (Claude Code, Cursor, Antigravity).

```
tech_eu_hack/
├── repo-analysis-workbench/   # indexing + retrieval engine (Python + Rust worker)
├── qwen-mlx/                  # Qwen3 embedding + reranker server on MLX, port 18200
└── knowledge/                 # analysis notes on the workbench
```

| Component | What it does | Details |
|---|---|---|
| `repo-analysis-workbench` | Parses a repo into symbols, statements, a code graph (calls, imports, reads/writes, data flow), a Tantivy keyword index, summaries and embeddings; answers queries with ranked evidence bundles | [README](repo-analysis-workbench/README.md), [guide](knowledge/repo-analysis-workbench-guide.md) |
| `qwen-mlx` | Serves `/v1/embeddings` and `/rerank` for the workbench from Qwen3-Embedding-8B and Qwen3-Reranker-8B on the Metal GPU | [README](qwen-mlx/README.md) |

## Quick start (macOS, Apple Silicon)

Prerequisites: Homebrew, Python 3.10+.

```bash
brew install rustup universal-ctags
rustup default stable && rustup component add rust-analyzer
export PATH=/opt/homebrew/opt/rustup/bin:$PATH   # rustup from Homebrew is keg-only

# 1. Model server
cd qwen-mlx
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
./download_models.sh
./start.sh                      # keep running

# 2. Workbench
cd ../repo-analysis-workbench
python3 -m venv .venv
.venv/bin/pip install -e ".[tree-sitter]" tree-sitter-rust pytest
cargo build --manifest-path native/Cargo.toml
./scripts/bootstrap.sh
```

Index a repo by cloning it **next to** `repo-analysis-workbench/` (the scripts treat the parent folder as the
workspace), then:

```bash
export PYTHON_BIN="$PWD/.venv/bin/python"
./scripts/parse_repos.sh      --repo <target-repo>
./scripts/build_index.sh      --repo <target-repo>
./scripts/build_search.sh     --repo <target-repo>
./scripts/export_summaries.sh --repo <target-repo>
./scripts/build_embeddings.sh --repo <target-repo> --provider qwen
.venv/bin/python src/cli/main.py prepare-answer-bundle --repo <target-repo> "How does X work?"
```

## Notes

- `repo-analysis-workbench` is vendored from
  [prmartinow/repo-analysis-workbench](https://github.com/prmartinow/repo-analysis-workbench) at commit
  `8318147` (MIT licence, see its `LICENSE`). It's unmodified.
- `tree-sitter-rust` isn't in the workbench's optional dependencies, but its Rust parser needs it.
- With rust-analyzer installed, 73 of 78 workbench unit tests pass. The 5 failures are tests that assume
  optional tools (rust-analyzer, tree-sitter) are *not* installed.
- Python support in the workbench is shallow (symbols and search only: no call graph). Rust gets the full
  analysis.

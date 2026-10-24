---
name: index-repo
description: Index a repository for the repo-analysis MCP server and start the server (stdio for Claude Code, HTTP for the Spelunk app). Use when asked to add or analyse a new repo, rebuild a stale index, or get the MCP server or its HTTP endpoint running in this project.
---

# Indexing a repo and running the MCP server

Run everything from `tech_eu_hack/`. Builds are long-running: tell the user before starting one.

## Prerequisites (once per machine)

```bash
brew install rustup universal-ctags
rustup default stable && rustup component add rust-analyzer
export PATH=/opt/homebrew/opt/rustup/bin:$PATH        # Homebrew's rustup is keg-only
cd repo-analysis-workbench
python3 -m venv .venv && .venv/bin/pip install -e ".[tree-sitter]" tree-sitter-rust pytest
cargo build --manifest-path native/Cargo.toml && ./scripts/bootstrap.sh
```

## Index a repo

Target repos live in `repo_analyse/` (gitignored clones).

```bash
git clone --depth 1 <url> repo_analyse/<name>
cd repo-analysis-workbench
export PATH=/opt/homebrew/opt/rustup/bin:$PATH PYTHON_BIN="$PWD/.venv/bin/python"
WS="$PWD/../repo_analyse"
./scripts/build_scip.sh       --repo <name> --workspace-root "$WS"      # Rust only, ~1 min
./scripts/parse_repos.sh      --repo <name> --workspace-root "$WS"
./scripts/build_index.sh      --repo <name> --workspace-root "$WS" --scip-index "$WS/.scip/<name>.scip.json"
./scripts/build_search.sh     --repo <name> --workspace-root "$WS"
./scripts/export_summaries.sh --repo <name>
```

- Skip `build_scip.sh` and `--scip-index` for non-Rust repos (they get symbols and search, no call graph).
- About 4–6 minutes for a 67k-line Rust workspace. Rerun the same steps to rebuild after code changes.
- Embeddings are off; don't run `build_embeddings.sh` unless asked.

## Check it

```bash
.venv/bin/python scripts/mcp_smoke_test.py <name>          # all calls should be "ok"
.venv/bin/python scripts/graph_recall_check.py <name>      # rust-agent-framework's caller check set
```

With more than one repo indexed, tools need `repo=<name>` or `REPO_ANALYSIS_DEFAULT_REPO` set.

## Run the server

- **Claude Code (stdio):** `.mcp.json` at the project root already registers `repo-analysis`; open Claude Code in
  `tech_eu_hack/`, approve the server, check `/mcp`.
- **Spelunk app / HTTP clients:**
  ```bash
  cd repo-analysis-workbench && .venv/bin/python src/mcp_server/server.py --transport http   # 127.0.0.1:8787
  ```
  MCP at `http://127.0.0.1:8787/mcp`; the app posts handoffs to `POST /handoffs` (set `VITE_AGENT_URL` to it);
  `GET /health` lists indexed repos. Another agent can connect with
  `claude mcp add --transport http spelunk http://127.0.0.1:8787/mcp`.

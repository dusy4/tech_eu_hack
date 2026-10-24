# repo_analyse

Target repositories that the workbench analyses. Clone each one here; the clones are
gitignored (they are separate git repositories).

```bash
git clone --depth 1 https://github.com/Rust-Framework/rust-agent-framework repo_analyse/rust-agent-framework
```

Then build its index from `repo-analysis-workbench/`, pointing the workspace root here:

```bash
cd repo-analysis-workbench
export PYTHON_BIN="$PWD/.venv/bin/python"
WS="$PWD/../repo_analyse"
./scripts/parse_repos.sh      --repo rust-agent-framework --workspace-root "$WS"
./scripts/build_index.sh      --repo rust-agent-framework --workspace-root "$WS"
./scripts/build_search.sh     --repo rust-agent-framework --workspace-root "$WS"
./scripts/export_summaries.sh --repo rust-agent-framework
```

Embeddings are switched off for now (`REPO_ANALYSIS_EMBEDDINGS=off`); the MCP server works from the
symbol, graph, keyword and summary indexes.

Currently analysed: [`Rust-Framework/rust-agent-framework`](https://github.com/Rust-Framework/rust-agent-framework)
at `a5eae2e` (MIT).

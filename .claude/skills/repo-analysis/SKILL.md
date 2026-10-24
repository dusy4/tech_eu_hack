---
name: repo-analysis
description: Answer questions about an indexed codebase with the repo-analysis MCP tools (symbols, call graph, keyword search, summaries) instead of grepping and opening many files. Use when asked where something is defined, who calls or uses a function, how a feature works across files or crates, how two parts of the code connect, or what a change would affect, and the repo-analysis MCP server is connected.
---

# Code questions with the repo-analysis MCP server

The `repo-analysis` server has a pre-built index of the repository: every symbol with its file and lines, a call
graph (from rust-analyzer for Rust repos indexed with SCIP), keyword search over code and docs, and summaries. One
tool call often replaces several rounds of `Grep` + `Read`.

The tools are deferred in Claude Code: load them with ToolSearch (`select:mcp__repo-analysis__find_symbol,...`) or
search `repo-analysis` before the first call.

## Pick the tool by the question

| Question | Tool |
|---|---|
| "What is this repo / where do I start?" | `repo_overview`, then `summarize_path` on interesting folders |
| "Where is X defined?" | `find_symbol` (name, `Type::method`, or a qualified name) |
| "Show me X" | `get_symbol_body`; `get_enclosing_context` for its impl/module and siblings |
| "Find code about Y" (no exact name) | `search_code` (use `kinds`, `path_prefix` to narrow) |
| "Who calls X?" / "What does X call?" | `symbol_relations` with `callers` / `callees` |
| "Who imports / references / implements X?" | `symbol_relations` with `imports`, `refs`, `implements`, `inherits` |
| "What does X read or write?" | `symbol_relations` with `reads` / `writes`, or `statement_slice` |
| "How does A reach B?" | `path_between` |
| "If X changes, what breaks?" | `symbol_relations(callers)` on X, then on each caller for transitive impact |
| Broad "how does feature Z work?" | `prepare_answer_bundle` first (slow on first call, ~20 s), then the precise tools on what it surfaces |

## Workflow

1. Orient once per repo with `repo_overview` (skip if you already know the layout).
2. Resolve names with `find_symbol` before calling relation tools, so you pass the exact symbol.
3. Follow structure with `symbol_relations` / `path_between` instead of grepping for call sites.
4. Read only the code that matters with `get_symbol_body`, or `Read` with the file and line range the tools gave you.
5. Cite file paths, line ranges and qualified names in the answer.

## Trust, but verify

- The index reflects the last build, not uncommitted edits. If results look stale, say so (and see the `index-repo`
  skill to rebuild).
- Rust call edges from SCIP are compiler-grade; a few extra name-matched callers can still appear. Before stating a
  caller list as complete or acting on it, open the call sites.
- An empty result means "not found in the index", not "does not exist". For non-Rust code (Python, TS, Go) there are
  symbols and search but no call graph, so fall back to `Grep` for callers.
- Responses are capped at about 20k characters; if a result says `[truncated …]`, narrow the query or lower `limit`.

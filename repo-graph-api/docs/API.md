# repo-graph-api reference

An HTTP API that gives a diagram frontend (the Spelunk app, or anything built on D3, Cytoscape, ELK, ECharts…)
the code graph of a repository indexed by **repo-analysis-workbench**.

It is built on the same code as the workbench's MCP server (`src/mcp_server/server.py`): every MCP tool is
available here as a REST endpoint and calls the same `agents.toolkit` function. On top of that it adds what a
frontend needs and the MCP tools don't provide: whole-repo aggregates (crate and module graphs, hotspots, a file
tree), graph-shaped responses, and ready-to-draw Spelunk `ViewSpec`s.

- Base URL: `http://127.0.0.1:8790` (any port you run it on)
- Machine-readable spec: [`GET /api/v1/openapi.json`](#service) (OpenAPI 3.1); interactive docs at `GET /docs`
- All responses are JSON (UTF-8). Every endpoint is read-only except the three handoff writes.

Contents

1. [How it works](#1-how-it-works)
2. [Running it](#2-running-it)
3. [Conventions](#3-conventions)
4. [MCP tools → endpoints](#4-mcp-tools--endpoints)
5. [Endpoint reference](#5-endpoint-reference)
6. [Which endpoint for which diagram](#6-which-endpoint-for-which-diagram)
7. [Compatibility routes for the Spelunk app](#7-compatibility-routes-for-the-spelunk-app)
8. [Accuracy and limits](#8-accuracy-and-limits)
9. [Configuration](#9-configuration)

---

## 1. How it works

```
frontend ──HTTP──► repo-graph-api (Flask)
                      │
          ┌───────────┼─────────────────────────────┬───────────────────────────────┐
          ▼           ▼                             ▼                               ▼
   agents.toolkit   relations.py / queries.py   views.py                    mcp_server.handoffs
   (workbench,      graph tools + aggregates    ViewSpec builders           (workbench HandoffStore)
    same as MCP)    over the SQLite index
          │                 │
          ▼                 ▼
   data/parsed/<repo>/metadata.lmdb      instance/repo_graph.sqlite
   data/graph/<repo>/graph.db (RyuGraph) (built from the LMDB by the workbench's own loaders)
   data/search/<repo>/tantivy
```

**The index.** `python -m repo_graph_api.indexer` reads the workbench artifacts with the workbench's own code
(`symbols.persistence.load_symbol_index_from_metadata`, `backends.metadata_store`,
`search.indexer.build_documents`) and writes one SQLite file: symbols, references, imports, statements, files,
crates, and the keyword-search documents. Build it once per analysis run; the API opens it read-only.

**Engines.** Two of the workbench's backends need things a given machine may not have. The API detects them at
start-up and reports the result in `GET /api/v1/health`:

| Capability | Workbench engine | When it isn't available | Reported as |
|---|---|---|---|
| Graph tools (`symbol_relations`, `path_between`, `statement_slice`, `get_enclosing_context`, `prepare_answer_bundle`) | RyuGraph `graph.db`, needs the `ryugraph` package (wheels for Python 3.11–3.13) | Answered from the SQLite index (`relations.py`) | `meta.engine`: `workbench` or `index` |
| Keyword search (`search_code`, symbol resolution, fuzzy `find_file`) | Tantivy via a Rust worker, needs `cargo` | The one BM25 query function is swapped for SQLite FTS5 over the same documents; the workbench's query variants, reranking and symbol resolution still run unchanged | `meta.engine`: `tantivy-native` or `index-fts` |
| Everything else (`repo_overview`, `summarize_path`, `find_symbol`, `get_symbol_body`, handoffs) | LMDB | always available | `workbench` |

The diagram endpoints (graphs, hotspots, tree, views) always use the SQLite index, because they aggregate over
every reference in the repo.

## 2. Running it

```bash
cd repo-graph-api
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt          # .venv/bin/python on macOS/Linux

# 1. build the index from a workbench data/ folder (parsed/, raw/, graph/, search/)
.venv/Scripts/python -m repo_graph_api.indexer --data <path-to>/data

# 2. serve
.venv/Scripts/python -m flask --app repo_graph_api run --port 8790
```

The workbench sources are found at `../repo-analysis-workbench/src` (this folder's place in `tech_eu_hack`) or
`../vendor/tech_eu_hack-main/repo-analysis-workbench/src`; set `WORKBENCH_SRC` otherwise. The data folder is remembered in the index, so `REPO_ANALYSIS_DATA_DIR` is only
needed to override it. Rebuild the index whenever the workbench re-indexes the repo (about 15 s for
`rust-agent-framework`; the new file is swapped in atomically).

Tests: `python -m unittest discover -s tests -v` (13 contract tests against the built index) and
`python scripts/smoke.py` (calls every endpoint once and prints status, latency and a summary).

## 3. Conventions

### Paths and repos

Everything repo-specific lives under `/api/v1/repos/{repo}`; `{repo}` is the folder name under `data/parsed/`
(e.g. `rust-agent-framework`). `GET /api/v1/repos` lists them.

### Symbol arguments

Wherever an endpoint takes a symbol (path segment `{symbol}`, or the `symbol` / `source` / `target` query
parameters) you can pass any of these:

| Form | Example |
|---|---|
| Symbol id | `sym:79fd56329bce4062` |
| Plain name | `ToolRegistry` |
| Method path | `WorkflowBuilder::add_node` |
| Fully qualified name | `rust_agent_workflow::builder::workflow_builder::WorkflowBuilder::add_node` |

Names are resolved by the workbench's resolver (`toolkit.resolve_graph_seed`), the same one the MCP tools use.
URL-encode the value (`::` → `%3A%3A`). If a name matches several symbols the API answers **409** with the
candidates; pass one of their ids:

```json
{"error": {"status": 409, "code": "ambiguous_symbol",
  "message": "'build' matches several symbols; pass one of the candidate ids.",
  "details": {"query": "build", "candidates": [
    {"id": "sym:5b6b…", "qualified_name": "rust_agent_framework::builder::AgentBuilder::build", "kind": "method",
     "path": "crates/framework/src/builder.rs", "signature": "pub fn build(self) -> Result<Agent> {"}, "…"]}}}
```

Frontends should resolve once, keep the `id`, and use ids from then on.

### The `Symbol` object

Every symbol in every response has the same shape:

```json
{
  "id": "sym:79fd56329bce4062",
  "name": "add_node",
  "qualified_name": "rust_agent_workflow::builder::workflow_builder::WorkflowBuilder::add_node",
  "display_name": "WorkflowBuilder::add_node",
  "kind": "method",
  "crate": "rust-agent-workflow",
  "crate_label": "workflow",
  "module_path": "rust_agent_workflow::builder::workflow_builder",
  "path": "crates/workflow/src/builder/workflow_builder.rs",
  "line": 41, "end_line": 48,
  "visibility": "pub", "is_public": true, "is_test": false,
  "signature": "pub fn add_node(mut self, id: impl Into<String>, executor: Arc<dyn IExecutor>) -> Self {"
}
```

`display_name` (last two path segments) is the label to draw; `crate_label` is the crate's folder name under
`crates/`, shorter than the package name.

`kind` is one of `function`, `method`, `struct`, `enum`, `trait`, `impl`, `type`, `const`, `static`, `module`,
`field`, `variant`, `local`, `variable`, `config_key`.

### Response shapes

The shape follows what the data will be drawn as, so a frontend can hand it to a library without reshaping:

| Shape | Used by | Fits |
|---|---|---|
| **Node-link** `{nodes: [...], edges: [{id, source, target, …}], meta}` | `/graphs/*`, `/paths` (`graph`) | D3 force / dagre / ELK, Cytoscape (`data.source/target`), vis-network, React Flow |
| **Tree** `{name, path, value, children: [...]}` | `/tree` | `d3.hierarchy` → treemap, sunburst, icicle; ECharts treemap |
| **Matrix** `{crates, labels, values: [[…]]}` | `/graphs/crates/matrix` | `d3.chord`, heatmaps |
| **Page** `{items: [...], total, limit, offset}` | lists, rankings, relations | tables, bar charts |
| **Recording** `{spec: ViewSpec, calls: ToolCall[]}` | `/views/*` | the Spelunk canvas directly (`app/src/data/types.ts`) |

Graph edges always point **from the dependent to what it depends on** (caller → callee, crate → crate it uses);
`meta.edge_direction` says so in words. Blast-radius views reverse this on purpose (`impacts` edges point from the
changed symbol outward).

### Common query parameters

| Parameter | Default | Meaning |
|---|---|---|
| `ref_kinds` | `call,use` | Which references count: `call` (call sites) and/or `use` (imports and type mentions). |
| `include_tests` | `false` (`true` for relations and blast radius) | Count references made from test code. |
| `include_noise` | `false` | Count references the indexer matched by name to generic methods (`len`, `clone`, `as_ref`…) or to local variables. See [§8](#8-accuracy-and-limits). |
| `engine` | `auto` | Graph tools only: `workbench`, `index`, or `auto` (workbench when available). `workbench` on a machine without RyuGraph returns **503** `engine_unavailable`. |
| `limit`, `offset` | per endpoint | Paging. `total` is always the full count. |

Booleans accept `true/false/1/0/yes/no`. Lists are comma-separated.

### `meta` and `filters`

Tool responses carry `meta: {engine, workbench_tool}` naming what answered (`workbench_tool` is the toolkit
function, `null` when the index answered). Aggregates echo the filters they applied under `filters` or
`meta.filters`, so a frontend can show "tests excluded" without tracking its own state.

### Errors

Every error under `/api/v1` has one envelope:

```json
{"error": {"status": 404, "code": "not_found", "message": "symbol 'NoSuchThing' does not exist.",
           "details": {"symbol": "NoSuchThing"}}}
```

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_parameter`, `missing_parameter`, `invalid_handoff` | Bad or missing input; `details.parameter` names it |
| 404 | `not_found`, `route_not_found` | Unknown repo, symbol, crate, file, path, relation, view or URL |
| 409 | `ambiguous_symbol` | Name matches several symbols; `details.candidates` |
| 503 | `engine_unavailable` | `engine=workbench` requested where RyuGraph isn't installed |
| 500 | `internal_error` | Bug; the message names the exception |

### CORS

Same rule as the MCP server: browsers on `http(s)://localhost:*` and `127.0.0.1:*` may call the API (GET, POST,
PATCH). Change it with `REPO_GRAPH_CORS_ORIGIN_REGEX`. The API has no authentication; keep it on localhost.

## 4. MCP tools → endpoints

All 16 tools of the MCP server, and where each lives here. Operations in the OpenAPI spec carry the tool name in
`x-mcp-tool`.

| MCP tool | Endpoint | Engine here |
|---|---|---|
| `list_repos` | `GET /api/v1/repos` | index |
| `repo_overview` | `GET /api/v1/repos/{repo}` | workbench (`project`) + index (totals) |
| `summarize_path` | `GET /api/v1/repos/{repo}/summary?path=` | workbench |
| `search_code` | `GET /api/v1/repos/{repo}/search?q=` | workbench ranking; Tantivy or FTS5 |
| `find_symbol` | `GET /api/v1/repos/{repo}/symbols/find?name=` | workbench |
| `find_file` | `GET /api/v1/repos/{repo}/files/find?pattern=` | workbench |
| `get_symbol_body` | `GET /api/v1/repos/{repo}/symbols/{symbol}/body` | workbench |
| `get_enclosing_context` | `GET /api/v1/repos/{repo}/symbols/{symbol}/context` | workbench or index |
| `symbol_relations` | `GET /api/v1/repos/{repo}/symbols/{symbol}/relations/{relation}` | workbench or index |
| `path_between` | `GET /api/v1/repos/{repo}/paths?source=&target=` | index (+ workbench answer attached) |
| `statement_slice` | `GET /api/v1/repos/{repo}/symbols/{symbol}/statements` | workbench or index |
| `prepare_answer_bundle` | `POST /api/v1/repos/{repo}/answer-bundle` | workbench, or a simpler index bundle |
| `list_handoffs` | `GET /api/v1/handoffs` | workbench `HandoffStore` |
| `get_handoff` | `GET /api/v1/handoffs/{id}` | workbench `HandoffStore` |
| `update_handoff_status` | `PATCH /api/v1/handoffs/{id}` | workbench `HandoffStore` |
| `publish_handoff` | `POST /api/v1/handoffs` | workbench `HandoffStore` |

Differences from the MCP tools, all deliberate:

- **No size cap or slimming.** MCP responses are capped at 20k characters and drop ids for the agent's context
  window. Here ids are kept (frontends need them) and lists are paged instead.
- **One shape per tool.** Whichever engine answers, the response has the same fields. When the workbench answered
  a graph tool, its untouched output is also included under `raw` (or `workbench` for paths).
- **Graph tools take the same `relation` names** (`callers`, `callees`, `imports`, `refs`, `reads`, `writes`,
  `implements`, `inherits`).
- Handoffs are stored in the same folder as the MCP server's (`data/handoffs/`), so both see the same documents.

## 5. Endpoint reference

Paths below are relative to `/api/v1`. `{repo}` and `{symbol}` are explained in [§3](#paths-and-repos).

### Service

| | |
|---|---|
| `GET /health` | `{ok, repos, index: {path, built_at}, data_dir, engines: {graph, search}}`. Each engine reports `engine`, `workbench` (bool) and `reason` when the fallback is in use. |
| `GET /openapi.json` | OpenAPI 3.1 document for every route below. |
| `GET /docs` (no prefix) | Swagger UI over the spec. |

### Repository

#### `GET /repos`
Indexed repos: `{items: [{name, git: {remote, branch, commit, short_commit}, generated_at, indexed_at,
counts: {crates, symbols, references, tracked_files}, artifacts: {metadata_lmdb, graph_db, tantivy}}], total}`.

#### `GET /repos/{repo}` — *repo_overview*
Totals (`tracked_files`, `rust_files`, `crates`, `symbols`, `public_symbols`, `test_symbols`,
`references: {call, use, total, resolved, flagged_noise}`), `language_mix`, `symbol_kinds`, and the workbench's
`project` summary (focus, analysis surfaces, source roots, language mix). Use it for a header and stat tiles.

#### `GET /repos/{repo}/summary?path=` — *summarize_path*
The workbench's summary of a directory or file: `{repo, path, kind: directory|file, summary}`. For a directory the
summary has `files`, `rust_files`, `symbols`, `public_symbols`, `language_counts`, `sample_files`, `tags` and a
one-line `summary`. 404 if neither the path nor a parent directory is known.

### Search and lookup

#### `GET /repos/{repo}/search` — *search_code*

| Parameter | |
|---|---|
| `q` (required) | Query text. Identifiers, paths and words all work (`tool approval`, `WorkflowBuilder add node`). |
| `kinds` | Any of `repo, package, directory, file, symbol, function_body, type_body, doc, statement`. Default: all but `statement`. |
| `path_prefix` | Only results under this path. |
| `limit` | 1–100, default 10. |

```json
{"query": "tool approval",
 "items": [{"kind": "symbol", "symbol_id": "sym:0bc5b68755d26b02", "name": "ToolApprovalResponse",
            "qualified_name": "rust_agent_core::tool::ToolApprovalResponse",
            "display_name": "tool::ToolApprovalResponse", "path": "crates/core/src/tool.rs",
            "line": 210, "end_line": 221, "symbol_kind": "struct", "crate": "rust-agent-core", "visibility": "pub",
            "title": "rust_agent_core::tool::ToolApprovalResponse", "preview": "pub struct ToolApprovalResponse {",
            "score": 131.05}],
 "total": 1, "limit": 1, "filters": {"kinds": [], "path_prefix": null},
 "meta": {"engine": "index-fts", "workbench_tool": "search_code"}}
```

`score` is the workbench reranker's score: comparable within one response, not across queries.

#### `GET /repos/{repo}/symbols/find?name=` — *find_symbol*
Exact definitions by name or qualified name, as `Symbol`s. `limit` default 10.

#### `GET /repos/{repo}/files/find?pattern=` — *find_file*
Files by exact path, then path prefix, then fuzzy path search: `{items: [{path, kind, language, crate,
module_path, score}]}`.

#### `GET /repos/{repo}/symbols` (browse)
A paged, filterable symbol table for lists and pickers. Parameters: `q` (substring of name or qualified name),
`kinds`, `crate`, `path_prefix`, `public_only`, `include_tests`, `sort` (`relevance` default with `q`,
`name`, `references`, `location`), `limit` (≤500), `offset`. Items are `Symbol`s plus `references_in` (non-test,
non-noise references to it). Locals are excluded unless `kinds` includes `local`.

### Symbols

#### `GET /repos/{repo}/symbols/{symbol}`
Everything about one symbol in a single call, for an inspector panel: the `Symbol`, `docstring`, `container`,
`members` (fields, methods, variants), `references_in: {calls, uses, files, crates}`, top `callers` and `callees`
(each a `Symbol` plus `count`), and `implementors` (traits) or `implements` (structs and enums), each
`{impl_symbol_id, trait, trait_symbol_id, type, type_symbol_id, crate, path, line}`. Accepts the common filters
(tests included by default) and `limit` for the caller/callee lists.

#### `GET /repos/{repo}/symbols/{symbol}/body` — *get_symbol_body*
`{symbol, code, code_kind, lines: [{line, text}], preview, body_kind}`. `code_kind` is `source` when
`WORKBENCH_WORKSPACE` points at the repo checkout (exact source by line span), otherwise `statements`: the
indexed statement text, one statement per line. That is close to the source but not byte-exact (comments and
blank lines are missing).

#### `GET /repos/{repo}/symbols/{symbol}/context` — *get_enclosing_context*
`{symbol, container, siblings, members, file: {path, summary}, statement_slice}`. Siblings share the
container and file. `statement_slice` holds the first 8 statements.

#### `GET /repos/{repo}/symbols/{symbol}/relations/{relation}` — *symbol_relations*

| `relation` | Returns |
|---|---|
| `callers` | Functions and methods that call it, each with the number of call sites. |
| `callees` | What it calls. |
| `refs` | Everything it references (calls and uses); each item has `ref_kind`. |
| `imports` | Files that import it with `use` (items are files: `path`, `crate`, `signature`). |
| `reads` / `writes` | Fields and variables its statements read or write. |
| `implements` | For a trait: the types implementing it (`impl` holds the impl block). |
| `inherits` | For a trait: its supertraits. For a struct or enum (Rust has no inheritance): the traits it implements, including std traits as unresolved items. |

Parameters: `limit` (default 20), `offset`, `include_tests` (default **true**), `include_noise`,
`include_external` (default false; adds unresolved std/third-party targets such as `Vec::push`), `engine`.

```json
{"symbol": {"id": "sym:79fd56329bce4062", "display_name": "WorkflowBuilder::add_node", "…": "…"},
 "relation": "callers",
 "items": [{"symbol": {"id": "sym:89d9546f88e33ae2", "display_name": "pipeline::build_dev_pipeline",
                       "crate_label": "coding", "is_test": false, "…": "…"},
            "qualified_name": "rust_agent_coding::pipeline::build_dev_pipeline", "kind": "function",
            "resolved": true, "count": 28,
            "locations": [{"path": "crates/coding/src/pipeline.rs", "line": 221}, "… up to 10"]}],
 "total": 42, "limit": 20, "offset": 0,
 "filters": {"include_tests": true, "include_noise": false, "include_external": false},
 "meta": {"engine": "index", "workbench_tool": null}}
```

`resolved: false` items (only with `include_external`) have `symbol: null` and only a `qualified_name`.

#### `GET /repos/{repo}/symbols/{symbol}/statements` — *statement_slice*
The function's statements in order: `{id, line, end_line, kind (let, expr, if, match, for, return…), text,
nesting_depth, parent_id, previous_id, calls, reads, writes, defines}`. The last four are lists of
`{name, qualified_name, symbol_id, kind}` (`symbol_id` is null for std/third-party targets). `parent_id` gives
the nesting tree and `previous_id` the sequence, so it can be drawn as a control-flow or data-flow diagram.
`limit` default 50.

#### `GET /repos/{repo}/paths?source=&target=` — *path_between*

| Parameter | Default | |
|---|---|---|
| `source`, `target` (required) | | Symbols. |
| `ref_kinds` | `call` | Edge kinds to follow. |
| `direction` | `forward` | `forward` follows caller → callee; `both` also walks edges backwards (finds "meets in the middle" connections). |
| `max_depth` | 8 | ≤ 12. |
| `limit` | 5 | Number of shortest paths returned (all have the minimum length). |

Returns `{source, target, found, length, paths: [{length, nodes: [ids…], edges: [{id, source, target, count,
traversed}]}], graph: {nodes: [Symbol], edges}}`. `graph` is the union of the paths, ready to draw.
`traversed: backward` marks an edge walked against its direction (only with `direction=both`).

#### `POST /repos/{repo}/answer-bundle` — *prepare_answer_bundle*
Body: `{"question": "...", "limit": 8, "engine": "auto"}`. With RyuGraph, the workbench's own bundle under
`bundle`. Without it, a simpler bundle: `symbols` (search hits with `score`, `reason`, top `callers` and
`callees`) and `files` (path summaries), with `meta.note` saying so. The workbench bundle takes 2–18 s; the
simple one takes about 4 s.

### Crates and files

#### `GET /repos/{repo}/crates`
Each crate as a `CrateNode` (below) plus `kinds` (symbol counts by kind), `module_root`, `rust_files`, `bytes`.

#### `GET /repos/{repo}/crates/{crate}`
`{…stats, layer, fan_in, fan_out, dependencies: [...], dependents: [...], modules: [{module_path, symbols}]}`.
Each dependency or dependent is `{crate, label, calls, uses, weight, top_targets}`: what crosses that boundary.
`{crate}` is the package name (`rust-agent-core`).

#### `GET /repos/{repo}/files`
Paged files: `{path, crate, crate_label, language, extension, size_bytes, generated, symbols}`. Filters `crate`,
`language`, `path_prefix`; `sort` = `path` | `size` | `symbols`.

#### `GET /repos/{repo}/files/{path}`
One file: the fields above plus `outline` (its symbols nested by container, each with `children`; locals
excluded unless `include_locals=true`) and `depends_on: [{crate, label, calls, uses, weight, internal}]`.

### Diagrams

#### `GET /repos/{repo}/graphs/crates`
The crate dependency graph. Parameters: common filters, `min_weight` (drop light edges), `top_targets`
(symbols listed per edge, default 5).

```json
{"nodes": [{"id": "rust-agent-core", "label": "core", "root_path": "crates/core", "layer": 0,
            "files": 20, "symbols": 890, "public_symbols": 496, "test_symbols": 17,
            "fan_in": 17, "fan_out": 0, "weighted_in": 4864, "weighted_out": 0}, "…"],
 "edges": [{"id": "rust-agent-framework->rust-agent-core", "source": "rust-agent-framework",
            "target": "rust-agent-core", "calls": 330, "uses": 1400, "weight": 1730,
            "top_targets": [{"symbol_id": "sym:4b4d62f3353796a4", "qualified_name": "rust_agent_core::error::Result",
                             "display_name": "error::Result", "count": 150}, "…"]}, "…"],
 "meta": {"directed": true, "edge_direction": "source depends on target", "layer_count": 5, "cycles": [],
          "filters": {"ref_kinds": ["call", "use"], "include_tests": false, "include_noise": false, "min_weight": 1}}}
```

`layer` is the length of the longest dependency chain below a crate (0 = depends on no workspace crate), so a
layered layout puts `layer` on the y axis. Crates in a dependency cycle share a layer and are listed in
`meta.cycles` (empty for this repo).

#### `GET /repos/{repo}/graphs/crates/matrix`
`{crates, labels, metric, values, row_meaning: "row crate depends on column crate"}` in the same order as
`/graphs/crates` nodes. `metric` = `weight` (default) | `calls` | `uses`. Feed it to `d3.chord` or a heatmap.

#### `GET /repos/{repo}/graphs/modules`
Module-level graph. `depth` keeps that many path segments (`2` → `rust_agent_core::tool`), which keeps the
graph readable. `crate` focuses on one crate, with `scope=internal` (edges inside it) or `touching` (any edge with
an end in it). Nodes: `{id, label, crate, crate_label, depth, symbols}`; edges add `cross_crate`.
Unfiltered and at full depth this is a few hundred nodes, so use `depth=2` and `min_weight≥10` for an overview.

#### `GET /repos/{repo}/graphs/symbols/{symbol}`
Call graph around a symbol, breadth-first: `depth` (1–4, default 1), `direction` (`in` = callers,
`out` = callees, `both`), `ref_kinds` (default `call`), `max_nodes` (default 150). Nodes are `Symbol`s plus
`distance` and `is_root`; edges `{id, source, target, count}`. `meta.truncated` is true when the cap cut the
traversal short.

#### `GET /repos/{repo}/hotspots`
Symbols ranked by how much code depends on them, for bar charts.

| Parameter | Default | |
|---|---|---|
| `metric` | `references` | `references` (sites), `files`, `crates`, `external_crates` (crates other than its own). |
| `kinds` | `function,method` | E.g. `struct,enum,trait,type` for the most-shared types. |
| `crate` | | Only symbols defined in this crate. |

Items are `Symbol`s plus `value` (the chosen metric), `metrics` (all four), `calls`, `uses`, `from_crates`.

#### `GET /repos/{repo}/traits`
Traits ranked by number of implementations: `{name, symbol_id, defined_in, path, line, is_workspace_trait,
implementor_count, crates, implementors: [impl…]}`. std traits (`Default`, `Clone`, `Debug`…) are hidden
unless `include_std=true`. These are the extension points of a framework.

#### `GET /repos/{repo}/tree`
The file tree for treemaps, sunbursts and icicles. `metric` (`symbols` default, `files`, `bytes`) sets `value`;
every node also carries all three. `root` starts at a subdirectory; `depth` collapses deeper levels into their
parent (`collapsed_children` counts what was folded). Children are sorted by `value`, largest first.
`symbols` excludes local variables.

```json
{"name": "rust-agent-framework", "path": "", "type": "directory", "depth": 0, "value": 8172,
 "files": 572, "symbols": 8172, "bytes": 3664143, "metric": "symbols",
 "children": [{"name": "crates", "path": "crates", "type": "directory", "depth": 1, "value": 8144,
               "files": 439, "symbols": 8144, "bytes": 2639131, "children": [], "collapsed_children": 19}, "…"]}
```

### Views (Spelunk `ViewSpec`)

`GET /repos/{repo}/views/{view}` builds a whole diagram. The response is a **`Recording`**, the app's own
type (`app/src/data/types.ts`, README §10):

```ts
{ spec: ViewSpec,                         // nodes, edges, steps, sources: draw it directly
  calls: { tool, arg, count, reveals }[], // the tool calls that found each node, for the build-up animation
  meta: {…} }                             // filters, truncation, cycles…
```

Every node with a location has `codeRef: {file, symbol, lines: [start, end]}`; `meta` on nodes carries the
archetype's placement hints. Every view accepts `question` to override the generated question.

| `{view}` | Archetype | Parameters | Draws |
|---|---|---|---|
| `arch-map` | `archMap` | `min_weight`, filters | Crates (`kind: module`) with `meta.layer`, `fanIn`, `fanOut`; `imports` edges labelled with reference counts; one step per layer, then the busiest boundary. |
| `blast-radius` | `blastRadius` | `symbol`, `depth` (2), `max_nodes` (60), `include_tests` (true) | The symbol (`meta.ring: 0, changed: true`) and everything that references it, ring by ring (`meta.ring`); tests as `kind: test` and flagged in the last step. Edges are `impacts`. |
| `flow-trace` | `flowTrace` | `source`, `target`, `max_depth` (8), `context` (2) | The shortest call path (`meta.onPath`, `meta.order`), one step per hop with the call site in the caption, plus up to `context` off-path callees per hop as `context: true` edges. When there is no path, the two endpoints and `meta.found: false`. |
| `call-tree` | `swimlane` | `symbol`, `depth` (2), `max_nodes` (60) | What a function calls, with `meta.lane` = crate and `meta.depth`, one step per depth. |
| `schema-map` | `schemaMap` | `symbol` (struct, enum or trait) | The type, its fields or variants (`kind: state`, labelled with their declaration), the workspace types those fields use, and the traits it implements (or, for a trait, its implementors). External traits have ids `ext:<name>` and no `codeRef`. |

Example (`flow-trace?source=rust_agent_cli::main&target=DeclAgentBuilder%3A%3Abuild`, trimmed):

```json
{"spec": {"id": "flowTrace-95fdf54f036e", "archetype": "flowTrace",
          "question": "How does rust_agent_cli::main reach DeclAgentBuilder::build?",
          "title": "rust_agent_cli::main → DeclAgentBuilder::build",
          "summary": "`rust_agent_cli::main` reaches `DeclAgentBuilder::build` in 2 calls.",
          "nodes": [{"id": "sym:e5af654a99ae8bce", "label": "rust_agent_cli::main", "kind": "fn",
                     "meta": {"crate": "cli", "symbolKind": "function", "onPath": true, "order": 0},
                     "codeRef": {"file": "crates/cli/src/main.rs", "symbol": "rust_agent_cli::main", "lines": [58, 91]}},
                    "…"],
          "edges": [{"from": "sym:e5af654a99ae8bce", "to": "sym:ddfcc459f110bc2d", "kind": "calls"},
                    {"from": "sym:e5af654a99ae8bce", "to": "sym:152115e09ede4cd4", "kind": "calls", "context": true}, "…"],
          "steps": [{"id": "start", "focus": ["sym:e5af654a99ae8bce"], "caption": "Start at `rust_agent_cli::main`."},
                    {"id": "hop-1", "focus": ["sym:ddfcc459f110bc2d"],
                     "caption": "`rust_agent_cli::main` calls `rust_agent_cli::build_agent_from` at `crates/cli/src/main.rs:70`.",
                     "frame": {"visited": ["sym:e5af654a99ae8bce"]}}, "…"],
          "sources": [{"file": "crates/cli/src/main.rs", "symbol": "rust_agent_cli::main"}, "…"]},
 "calls": [{"tool": "find-symbol", "arg": "rust_agent_cli::main", "count": 1, "reveals": ["sym:e5af654a99ae8bce"]},
           {"tool": "path-between", "arg": "rust_agent_cli::main → DeclAgentBuilder::build", "count": 2, "reveals": ["…"]}],
 "meta": {"found": true}}
```

Guarantees, checked by the test suite: node ids are unique; every edge endpoint, step `focus` id and call
`reveals` id is a node in the spec; node `kind`s are from the `NodeKind` union.

### Handoffs

The workbench's `HandoffStore`, so documents are shared with the MCP server.

| | |
|---|---|
| `GET /handoffs?repo=&status=&limit=` | Newest first. `status` defaults to `open`; `status=` (empty) for all. Items `{id, status, repo, created_at, title, decisions}`. |
| `POST /handoffs` | Body: a `ProposalBatch` (`{repo, answer: {id, title, asked}, proposals: [{title, why, said, action: {kind: "focus", nodeId} \| {kind: "ask", question}}]}`). Returns **201** and the stored document; focus decisions get `code_ref` (path, lines, signature) resolved from the index. |
| `GET /handoffs/{id}` | The document plus `instructions`: markdown an agent can follow. |
| `PATCH /handoffs/{id}` | Body `{status: open \| in_progress \| done \| dismissed, note}`; appended to `history`. |

## 6. Which endpoint for which diagram

| Diagram | Endpoint | Notes |
|---|---|---|
| Architecture overview (layered boxes and arrows) | `/graphs/crates` or `/views/arch-map` | y = `layer`, edge width = `weight`, hover = `top_targets` |
| Chord diagram / dependency heatmap | `/graphs/crates/matrix` | |
| Module map inside one crate | `/graphs/modules?crate=…&scope=internal&depth=3` | |
| "What calls X / what does X call" | `/graphs/symbols/{X}?direction=in\|out&depth=2` or `/views/call-tree` | |
| Change impact | `/views/blast-radius?symbol=X` | rings + tests |
| How A reaches B | `/views/flow-trace` or `/paths` | |
| Control/data flow inside a function | `/symbols/{X}/statements` | `parent_id` for nesting, `reads`/`writes` for data flow |
| Type diagram | `/views/schema-map?symbol=X`, `/traits` | |
| Treemap / sunburst of the codebase | `/tree?metric=symbols\|bytes` | |
| Bar charts: most-called functions, most-shared types | `/hotspots`, `/hotspots?metric=external_crates&kinds=struct,enum,trait,type` | |
| Stat tiles, language mix, symbol kinds | `/repos/{repo}` | |
| Inspector panel for a clicked node | `/symbols/{id}`, `/symbols/{id}/body` | |
| Search box | `/search?q=` then `/symbols/{id}` | |

## 7. Compatibility routes for the Spelunk app

The app talks to the bridge (`VITE_KNOWLEDGE_URL`) and to the MCP server's HTTP routes (`VITE_AGENT_URL`).
This API serves both contracts at the root, unchanged, so the app can be pointed at it without code changes:

```
VITE_KNOWLEDGE_URL=http://127.0.0.1:8790
VITE_AGENT_URL=http://127.0.0.1:8790/handoffs
```

| Route | Contract | Response |
|---|---|---|
| `GET /health` | bridge + MCP | `{ok, repo, repos, indexed, error, mcp: null, api: "/api/v1", engines}` |
| `POST /search-code` `{query, k?}` | bridge | `CodeHit[]`: `{symbol, file, line, score (top = 1), snippet}` |
| `POST /find-symbol` `{name}` | bridge | `SymbolInfo \| null`: `{symbol, file, start, code, callers[], tests[]}` |
| `POST /callers-of` `{name}` | bridge | `string[]` of qualified names |
| `POST /answer-bundle` `{question, limit?}` | bridge | the bundle (workbench's when available) |
| `GET /handoffs`, `POST /handoffs`, `GET /handoffs/{id}` | MCP HTTP | as in the MCP server |

The bridge's own reshaping functions (`code_hits`, `symbol_info`, `_neighbor_names`) are imported from
`bridge/server.py`, so the shapes can't drift. Compatibility routes keep the old error shape `{"error": "…"}`.
They use `REPO_ANALYSIS_DEFAULT_REPO`, or the only indexed repo.

## 8. Accuracy and limits

- **Name-matched references.** The parser resolves some calls by name, so `vec.len()` can be attributed to any
  workspace method called `len`. In this repo that made `ToolRegistry::len` look like the most-called function
  (302 calls, almost all false). The indexer flags references to generic method names (`len`, `is_empty`,
  `as_ref`, `clone`, `iter`, `get`, `push`, …) and to local variables as noise. Every aggregate excludes them
  unless `include_noise=true`. Counts are therefore close estimates, not exact.
- **Unresolved targets.** 54% of references (36,370 of 67,037 here) point outside the workspace (std,
  third-party crates, macros) and have no `symbol_id`. Separately, 8,285 are flagged as noise (the two groups
  overlap). Graphs and rankings only use resolved references; relations show the rest with
  `include_external=true`.
- **Tests.** Aggregates exclude references from test code by default (`include_tests=false`); symbol-centred
  queries (relations, blast radius, symbol detail) include them, because "which tests touch this?" is part of
  the answer.
- **Workbench graph engine.** The RyuGraph path calls the toolkit exactly as the MCP server does and maps its
  output into the shapes above. It wasn't exercised on the machine this API was written on (Python 3.14, no
  `ryugraph` wheel). On Python 3.11–3.13 with `pip install ryugraph` it switches on automatically. Check
  `/api/v1/health` and `meta.engine`, and compare against `engine=index`.
- **Code text.** Without a source checkout (`WORKBENCH_WORKSPACE`), bodies are rebuilt from indexed statements:
  readable, but without comments or exact formatting.
- **Freshness.** Everything reflects the last workbench run and the last index build.
- **Scale.** Aggregates scan every reference (67k here) in 0.1–1 s. Symbol-name resolution goes through the
  workbench resolver (≈0.2–0.3 s); pass ids to skip it.

## 9. Configuration

Environment variables (shared names with the MCP server where they overlap):

| Variable | Default | |
|---|---|---|
| `REPO_ANALYSIS_DATA_DIR` | the folder the index was built from | Workbench `data/` (parsed/, raw/, graph/, search/) |
| `WORKBENCH_SRC` | `../repo-analysis-workbench/src`, else `../vendor/tech_eu_hack-main/…/src` | Workbench sources (`agents/toolkit.py`) |
| `REPO_GRAPH_INDEX` | `instance/repo_graph.sqlite` | The SQLite index |
| `WORKBENCH_WORKSPACE` | unset | Folder with source checkouts (`<workspace>/<repo>`), for exact code bodies |
| `REPO_ANALYSIS_DEFAULT_REPO` | the only indexed repo | Repo used by the compatibility routes |
| `REPO_ANALYSIS_HANDOFF_DIR` | `<data_dir>/handoffs` | Handoff documents (shared with the MCP server) |
| `REPO_GRAPH_ENGINE` | `auto` | Default `engine` for graph tools |
| `REPO_GRAPH_CORS_ORIGIN_REGEX` | `https?://(localhost\|127\.0\.0\.1)(:\d+)?` | Allowed browser origins |
| `REPO_ANALYSIS_EMBEDDINGS`, `REPO_ANALYSIS_RERANK_PROVIDER` | `off`, `heuristic` | Passed to the workbench, same defaults as the MCP server |

# Backend ↔ frontend contract

> **Stopgap.** This HTTP bridge duplicates the `repo-analysis` MCP server's tools. It goes away once the app talks to the MCP server directly. See decision 3 in [the README](../README.md#3-how-does-the-app-reach-the-mcp-server).

This is the one agreement between the UI (`app/`) and the code-understanding backend
(`repo-analysis-workbench/` + `qwen-mlx/`). If either side changes shape, update this file
first.

```
app/ (browser)  ──HTTP JSON──▶  bridge/server.py  ──in-process──▶  repo-analysis-workbench toolkit
                                  port 18300                         └─ data/{search,parsed,graph}
                                                                     └─ qwen-mlx on 18200 (answer-bundle only)
```

- The UI never reads workbench output directly. It only talks to the bridge.
- The bridge owns the reshaping. When the workbench's internal JSON changes, fix it in
  `bridge/server.py`, not in the UI.
- The TypeScript types live in [`app/src/knowledge/index.ts`](../app/src/knowledge/index.ts)
  (`CodeHit`, `SymbolInfo`, `KnowledgeBackend`). The client is
  [`app/src/knowledge/http.ts`](../app/src/knowledge/http.ts).

## Running it

```bash
# 1. index a repo (see README.md): parse_repos, build_index, build_search, …
# 2. start the bridge
WORKBENCH_REPO=<repo-name> python bridge/server.py
# 3. point the UI at it, in app/.env.local
VITE_KNOWLEDGE_URL=http://127.0.0.1:18300
```

| Env var | Default | Meaning |
|---|---|---|
| `WORKBENCH_REPO` | (required) | Name of the indexed repo, i.e. the folder under `data/search/` |
| `WORKBENCH_DATA` | `repo-analysis-workbench/data` | The workbench data root |
| `BRIDGE_PORT` | `18300` | Port the bridge listens on (127.0.0.1 only) |
| `VITE_KNOWLEDGE_URL` | empty | Set in `app/.env.local`. Empty means the UI uses its built-in sample data |

## Conventions

- All endpoints are `POST` with a JSON body, except `GET /health`.
- Success is `200` with the JSON value described below.
- Errors are `{"error": "<message>"}` with `400` (bad input), `404` (unknown route) or `500`
  (workbench failed: missing index, missing dependency, Qwen down).
- `symbol` strings are the workbench's **qualified names** (e.g. `queue::process_queue` for
  Rust, `pkg.module.func` for Python). The UI passes them back unchanged to `find-symbol` and
  `callers-of`.
- Line numbers are 1-based.
- CORS is open (`*`), so the Vite dev server can call the bridge directly.

## Endpoints

### `GET /health`

```json
{ "ok": true, "repo": "my-repo", "indexed": true, "error": null }
```

`ok` is true only when the workbench imports cleanly **and** `data/search/<repo>` exists.
`error` carries the import or load failure (e.g. `ModuleNotFoundError: No module named 'ryugraph'`).

### `POST /search-code` → `CodeHit[]`

Request: `{ "query": "how are jobs retried", "k": 4 }` (`k` is optional, default 4)

```json
[
  { "symbol": "queue::process_queue", "file": "src/queue.rs", "line": 42, "score": 1.0,
    "snippet": "fn process_queue(q: &mut Queue) {\n    while let Some(job) = q.pop() {\n        run(job);" }
]
```

| Field | Type | Notes |
|---|---|---|
| `symbol` | string | Qualified name |
| `file` | string | Repo-relative path |
| `line` | number | Start line of the symbol |
| `score` | number 0–1 | **Relative**: the top hit is always 1.0, the others are scaled to it. It is not a cosine similarity |
| `snippet` | string | First 3 lines of the symbol body, or its preview when there is no body |

Source: `toolkit.search_lexical` (Tantivy BM25) over `symbol`, `function_body` and
`type_body` documents, deduplicated per symbol. This is **keyword search, not embeddings**.
It works without the Qwen server.

### `POST /find-symbol` → `SymbolInfo | null`

Request: `{ "name": "process_queue" }`

```json
{ "symbol": "queue::process_queue", "file": "src/queue.rs", "start": 42,
  "code": "fn process_queue(q: &mut Queue) { … }",
  "callers": ["worker::tick", "main"], "tests": ["tests/queue_test.rs"] }
```

- Returns `null` when the name doesn't resolve, or matches several symbols equally well.
- `code` is the full body when the index has one, otherwise the signature.
- `callers` and `tests` are **best effort**. A graph failure gives `[]`, not an error.
  Graph data is only rich for Rust repos (see Limits).

Source: `toolkit.get_symbol_body`, `toolkit.callers_of`, and graph neighbours over
`TESTS` edges.

### `POST /callers-of` → `string[]`

Request: `{ "name": "queue::process_queue" }` returns `["worker::tick", "main"]`.
These are direct callers only (transitive calls are filtered out), deduplicated, as
qualified names.

Source: `toolkit.callers_of`.

### `POST /answer-bundle` → workbench JSON (passthrough, unstable)

Request: `{ "question": "How does retry handling work?", "limit": 8 }`

Returns `toolkit.prepare_answer_bundle` output **as is**: `plans`, `selected_context`,
graph neighbourhoods, statement slices and provenance. The UI doesn't use it yet. It is
exposed so the backend side can show what a full retrieval returns. It needs the Qwen
server on `127.0.0.1:18200` (or `REPO_ANALYSIS_ALLOW_HEURISTIC_RERANK_FALLBACK=1`).
Treat its shape as unstable until it gets its own section here.

## What the UI does with it

`answer()` in `app/src/knowledge/index.ts` takes these steps:
1. `search-code` with the question.
2. `find-symbol` on the top hit.
3. `callers-of` that symbol.

It narrates the result and lists the sources. The graph views (`ViewSpec` in
`app/src/data/types.ts`) are still recorded samples. Nothing in this contract produces a
`ViewSpec` yet.

## Limits worth knowing

- **Language depth.** The workbench does full analysis (call graph, reads/writes, data flow)
  only for Rust. Python, JS and TS get symbols and search, with little or no call graph, so
  `callers` and `tests` come back mostly empty there. The demo plan's repo (facebook/react,
  JS) falls in this group.
- **Platform.** The `qwen-mlx` server is Apple Silicon only. The three UI endpoints don't
  need it. `answer-bundle` does.
- **Dependencies.** The bridge itself is stdlib Python. The workbench needs `lmdb`,
  `ryugraph` and the rest of its install (see `README.md`), and so does the bridge at runtime.

## Next steps (not built)

- `search-code` over the embedding sidecar instead of BM25, once embeddings are built.
- A `view` endpoint that turns graph neighbourhoods into a `ViewSpec`, so answers draw real
  graphs instead of recordings.

## Contract tests

`python -I bridge/test_server.py` checks every shape above against a fake workbench. Add a
case there whenever this file changes.

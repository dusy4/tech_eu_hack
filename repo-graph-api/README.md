# repo-graph-api

HTTP API that serves a repository's code graph to diagram frontends. It runs on the
[repo-analysis-workbench](../repo-analysis-workbench) and exposes:

- **the 16 MCP-server tools as REST**, calling the same `agents.toolkit` functions;
- **diagram data**: crate and module graphs, a crate matrix, call graphs, hotspots, traits, a file tree;
- **ready-to-draw Spelunk `ViewSpec`s**: arch map, blast radius, flow trace, call tree, schema map;
- **the bridge and handoff routes the Spelunk app already calls**, so the app can switch to it unchanged.

Full reference: [docs/API.md](docs/API.md). Interactive docs at `/docs` once it's running.

## Quick start

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # .venv/bin/python on macOS/Linux
.venv/Scripts/python -m repo_graph_api.indexer --data <path-to-workbench>/data
.venv/Scripts/python -m flask --app repo_graph_api run --port 8790
```

Then:

```bash
curl http://127.0.0.1:8790/api/v1/health
curl "http://127.0.0.1:8790/api/v1/repos/rust-agent-framework/graphs/crates"
curl "http://127.0.0.1:8790/api/v1/repos/rust-agent-framework/views/blast-radius?symbol=ApprovalRequiredTool%3A%3Anew"
```

Point the Spelunk app at it with `VITE_KNOWLEDGE_URL=http://127.0.0.1:8790` and
`VITE_AGENT_URL=http://127.0.0.1:8790/handoffs`.

## Layout

| Path | |
|---|---|
| `repo_graph_api/indexer.py` | Builds `instance/repo_graph.sqlite` from the workbench artifacts, using the workbench's loaders |
| `repo_graph_api/workbench.py` | Imports the workbench; detects RyuGraph and the Rust search worker and installs fallbacks |
| `repo_graph_api/tools.py` | The MCP tools, normalised; workbench first, index fallback |
| `repo_graph_api/relations.py` | Graph tools over the index (callers, paths, statement slices…) |
| `repo_graph_api/queries.py` | Aggregates: crate/module graphs, hotspots, traits, tree, files |
| `repo_graph_api/views.py` | `ViewSpec` builders |
| `repo_graph_api/api.py`, `compat.py`, `docs.py`, `openapi.py` | Routes and the OpenAPI spec |
| `tests/test_api.py` | Contract tests (`python -m unittest discover -s tests -v`) |
| `scripts/smoke.py` | Calls every endpoint once |

## Engines on this machine

`GET /api/v1/health` reports which engine serves graph and search tools. With Python 3.14 there is no
`ryugraph` wheel and no `cargo`, so graph tools and keyword search run on the SQLite index (search still goes
through the workbench's ranking). On Python 3.11–3.13, `pip install ryugraph` switches the graph tools to the
workbench's RyuGraph backend with no code changes.

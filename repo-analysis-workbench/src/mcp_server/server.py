"""MCP server over the repo-analysis-workbench artifacts, plus Spelunk handoffs.

Run:  .venv/bin/python src/mcp_server/server.py                       # stdio (Claude Code launches it)
      .venv/bin/python src/mcp_server/server.py --transport http        # http://127.0.0.1:8787/mcp
HTTP mode also serves the app: POST /handoffs (a ProposalBatch), GET /handoffs,
GET /handoffs/{id} and GET /health, with CORS open to local dev servers.
Env:
  REPO_ANALYSIS_DATA_DIR       artifact root (default: <workbench>/data)
  REPO_ANALYSIS_DEFAULT_REPO   repo used when a tool call omits `repo`
                               (default: the only indexed repo, if exactly one)
  REPO_ANALYSIS_MCP_MAX_CHARS  cap on each tool response (default 20000)
  REPO_ANALYSIS_EMBEDDINGS     defaults to "off" here; "optional" uses the index if built (see retrieval.engine)
  REPO_ANALYSIS_RERANK_PROVIDER defaults to "heuristic" here (no Qwen server needed)
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Callable, Dict, List, Literal, Optional

SRC_ROOT = Path(__file__).resolve().parents[1]
WORKBENCH_ROOT = SRC_ROOT.parent
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

# Defaults that make the server work without the embedding index or the Qwen reranker.
os.environ.setdefault("REPO_ANALYSIS_EMBEDDINGS", "off")
os.environ.setdefault("REPO_ANALYSIS_RERANK_PROVIDER", "heuristic")
# The native search worker requires cargo on PATH; Homebrew's rustup is keg-only.
if shutil.which("cargo") is None and Path("/opt/homebrew/opt/rustup/bin/cargo").exists():
    os.environ["PATH"] = "/opt/homebrew/opt/rustup/bin" + os.pathsep + os.environ.get("PATH", "")

from mcp.server.mcpserver import MCPServer  # noqa: E402
from mcp.types import ToolAnnotations  # noqa: E402

from agents import toolkit  # noqa: E402
from backends.metadata_store import get_metadata_store  # noqa: E402
from mcp_server.handoffs import HandoffError, HandoffStore, handoff_markdown  # noqa: E402


DATA_ROOT = Path(os.environ.get("REPO_ANALYSIS_DATA_DIR", WORKBENCH_ROOT / "data")).resolve()
SEARCH_ROOT = DATA_ROOT / "search"
GRAPH_ROOT = DATA_ROOT / "graph"
PARSED_ROOT = DATA_ROOT / "parsed"
HANDOFF_ROOT = Path(os.environ.get("REPO_ANALYSIS_HANDOFF_DIR", DATA_ROOT / "handoffs")).resolve()
MAX_CHARS = int(os.environ.get("REPO_ANALYSIS_MCP_MAX_CHARS", "20000"))
READ_ONLY = ToolAnnotations(readOnlyHint=True, idempotentHint=True, openWorldHint=False)

Relation = Literal["callers", "callees", "imports", "refs", "reads", "writes", "implements", "inherits"]
RELATIONS: Dict[str, Callable[..., Dict[str, object]]] = {
    "callers": toolkit.callers_of,
    "callees": toolkit.callees_of,
    "imports": toolkit.who_imports,
    "refs": toolkit.refs_of,
    "reads": toolkit.reads_of,
    "writes": toolkit.writes_of,
    "implements": toolkit.implements_of,
    "inherits": toolkit.inherits_of,
}

mcp = MCPServer(
    name="repo-analysis",
    instructions=(
        "Structured code intelligence for pre-indexed repositories: parsed symbols, a code graph "
        "(calls, imports, reads/writes, implementations), keyword search and summaries. Prefer these "
        "tools over reading many files: start with repo_overview or search_code, resolve names with "
        "find_symbol, read code with get_symbol_body, and follow structure with symbol_relations / "
        "path_between. Results come from the last index build and may lag uncommitted edits. "
        "For Rust repos indexed with SCIP, call edges come from rust-analyzer (method calls, trait "
        "dispatch, cross-crate); a few extra name-matched callers can still appear, so verify "
        "important conclusions by reading the code. Decisions a team accepted in Spelunk arrive as "
        "handoffs: list_handoffs, then get_handoff, then update_handoff_status when done."
    ),
)


def indexed_repos() -> List[str]:
    if not PARSED_ROOT.exists():
        return []
    return sorted(path.name for path in PARSED_ROOT.iterdir() if (path / "metadata.lmdb").exists())


def resolve_repo(repo: Optional[str]) -> str:
    if repo:
        return repo
    default = os.environ.get("REPO_ANALYSIS_DEFAULT_REPO")
    if default:
        return default
    repos = indexed_repos()
    if len(repos) == 1:
        return repos[0]
    raise ValueError(f"Specify `repo`; indexed repos: {', '.join(repos) or 'none'}")


# Internal fields an agent never needs: ids, hashes, raw keyword text, retrieval internals.
DROP_KEYS = {
    "searchable", "semantic_summary", "normalized_body_hash", "summary_id", "content_hash", "doc_id",
    "node_id", "symbol_id", "container_symbol_id", "scope_symbol_id", "edge_metadata", "arrived_via",
    "tags", "provider", "confidence", "candidates", "source_candidates", "target_candidates",
    "stage_context", "selected_context", "refinement_hints", "normalized_task",
}
LONG_TEXT_KEYS = {"body", "text", "source", "code", "snippet", "instructions"}
MAX_STRING_CHARS = 600
MAX_CODE_CHARS = 6000
MAX_LIST_ITEMS = 25


def slim(value: object, key: str = "") -> object:
    """Strip internal fields and cap long strings and lists, keeping names, paths,
    line ranges, signatures and code."""
    if isinstance(value, dict):
        out = {}
        for item_key, item in value.items():
            if item_key in DROP_KEYS or item is None or item == [] or item == {}:
                continue
            if item_key == "metadata" and isinstance(item, dict):
                # keep only the location/ownership facts from search metadata
                for meta_key in ("range", "crate", "visibility", "is_test"):
                    if item.get(meta_key) not in (None, "", False) and meta_key not in value:
                        out[meta_key] = slim(item[meta_key], meta_key)
                continue
            out[item_key] = slim(item, item_key)
        return out
    if isinstance(value, list):
        items = [slim(item, key) for item in value[:MAX_LIST_ITEMS]]
        if len(value) > MAX_LIST_ITEMS:
            items.append(f"... {len(value) - MAX_LIST_ITEMS} more")
        return items
    if isinstance(value, str):
        limit = MAX_CODE_CHARS if key in LONG_TEXT_KEYS else MAX_STRING_CHARS
        return value if len(value) <= limit else value[:limit] + f" ...[{len(value) - limit} more chars]"
    return value


def render(payload: object) -> str:
    """Slimmed compact JSON, truncated so a single call can't flood the agent's context."""
    text = json.dumps(slim(payload), ensure_ascii=False, separators=(",", ":"), default=str)
    if len(text) <= MAX_CHARS:
        return text
    return text[:MAX_CHARS] + f'\n... [truncated {len(text) - MAX_CHARS} chars; narrow the query or lower `limit`]'


@mcp.tool(annotations=READ_ONLY)
def list_repos() -> str:
    """List the repositories that have been indexed and can be queried."""
    return render({"repos": indexed_repos(), "default": os.environ.get("REPO_ANALYSIS_DEFAULT_REPO")})


@mcp.tool(annotations=READ_ONLY)
def repo_overview(repo: Optional[str] = None) -> str:
    """High-level map of a repo: summary, packages/crates, languages, sizes, entrypoints.
    Good first call when starting on an unfamiliar codebase."""
    return render(toolkit.repo_overview(PARSED_ROOT, resolve_repo(repo)))


@mcp.tool(annotations=READ_ONLY)
def summarize_path(path: str, repo: Optional[str] = None) -> str:
    """Summary of a directory or file (contained symbols, statements, languages)."""
    return render(toolkit.summarize_path(PARSED_ROOT, resolve_repo(repo), path))


@mcp.tool(annotations=READ_ONLY)
def search_code(
    query: str,
    repo: Optional[str] = None,
    limit: int = 10,
    kinds: Optional[List[str]] = None,
    path_prefix: Optional[str] = None,
) -> str:
    """Ranked keyword search (BM25, identifier- and path-aware) over files, symbols,
    function/type bodies, statements and docs. `kinds` filters result types, e.g.
    ["symbol", "function_body", "file", "doc"]; `path_prefix` limits to a directory."""
    return render(
        toolkit.search_lexical(
            SEARCH_ROOT, resolve_repo(repo), query, limit=limit, kinds=kinds or (), path_prefix=path_prefix
        )
    )


@mcp.tool(annotations=READ_ONLY)
def find_symbol(name: str, repo: Optional[str] = None, limit: int = 10) -> str:
    """Find symbol definitions (functions, methods, structs, traits, impls...) by name or
    qualified name. Returns path, line range and signature."""
    repo_name = resolve_repo(repo)
    return render(toolkit.where_defined(SEARCH_ROOT, PARSED_ROOT, repo_name, name, limit=limit))


@mcp.tool(annotations=READ_ONLY)
def find_file(path_pattern: str, repo: Optional[str] = None, limit: int = 20) -> str:
    """Find files by (partial) path."""
    return render(toolkit.find_file(SEARCH_ROOT, resolve_repo(repo), path_pattern, limit=limit))


@mcp.tool(annotations=READ_ONLY)
def get_symbol_body(symbol: str, repo: Optional[str] = None) -> str:
    """Source code of a function/method/type, plus its signature and location."""
    return render(toolkit.get_symbol_body(SEARCH_ROOT, PARSED_ROOT, resolve_repo(repo), symbol))


@mcp.tool(annotations=READ_ONLY)
def get_enclosing_context(symbol: str, repo: Optional[str] = None) -> str:
    """Where a symbol sits: its container (impl/module/type), siblings and file."""
    return render(
        toolkit.get_enclosing_context(SEARCH_ROOT, GRAPH_ROOT, PARSED_ROOT, resolve_repo(repo), symbol)
    )


@mcp.tool(annotations=READ_ONLY)
def symbol_relations(symbol: str, relation: Relation, repo: Optional[str] = None, limit: int = 20) -> str:
    """Follow the code graph from a symbol. relation: callers (who calls it), callees
    (what it calls), imports (who imports it), refs (references), reads / writes
    (fields and variables it accesses), implements (impls of a trait), inherits."""
    return render(RELATIONS[relation](SEARCH_ROOT, PARSED_ROOT, GRAPH_ROOT, resolve_repo(repo), symbol, limit=limit))


@mcp.tool(annotations=READ_ONLY)
def path_between(source: str, target: str, repo: Optional[str] = None, limit: int = 5) -> str:
    """Shortest connections between two symbols in the code graph, e.g. how a CLI
    command reaches a storage function."""
    return render(
        toolkit.path_between(SEARCH_ROOT, PARSED_ROOT, GRAPH_ROOT, resolve_repo(repo), source, target, limit=limit)
    )


@mcp.tool(annotations=READ_ONLY)
def statement_slice(symbol: str, repo: Optional[str] = None, limit: int = 20) -> str:
    """Statements inside a function with their data flow (what each defines, reads,
    writes and calls)."""
    return render(toolkit.statement_slice(SEARCH_ROOT, PARSED_ROOT, GRAPH_ROOT, resolve_repo(repo), symbol, limit=limit))


@mcp.tool(annotations=READ_ONLY)
def prepare_answer_bundle(question: str, repo: Optional[str] = None, limit: int = 8) -> str:
    """One-shot evidence for a natural-language question: top symbols and files, graph
    neighbourhoods, relevant summaries and evidence items with the reason each was
    included. Use for broad "how does X work" questions; follow up with the
    precise tools above."""
    repo_name = resolve_repo(repo)
    payload = toolkit.prepare_answer_bundle(SEARCH_ROOT, GRAPH_ROOT, PARSED_ROOT, question, repo_name=repo_name, limit=limit)
    for bundle in payload.get("bundles", []):
        # Statement slices are bulky; the agent can call statement_slice for symbols it cares about.
        slices = bundle.pop("statement_slices", [])
        bundle["statement_slices_available_for"] = [item.get("seed") for item in slices]
        bundle["graph_neighborhoods"] = [
            {
                "seed": hood.get("seed"),
                "neighbors": [
                    {key: node.get(key) for key in ("qualified_name", "kind", "edge_type", "direction", "path")}
                    for node in hood.get("results", [])[:8]
                ],
            }
            for hood in bundle.get("graph_neighborhoods", [])
        ]
        # {"project": {...}, "files": [...], "symbols": [...], ...}; the project summary is already top-level.
        summaries = bundle.get("relevant_summaries") or {}
        bundle["relevant_summaries"] = {
            group: [
                {key: item.get(key) for key in ("path", "qualified_name", "title", "summary") if item.get(key)}
                for item in items[:4]
            ]
            for group, items in summaries.items()
            if group != "project" and isinstance(items, list) and items
        }
    return render(payload)


# ---- handoffs ---------------------------------------------------------------


def resolve_code_ref(repo: str, node_id: str) -> Optional[Dict[str, object]]:
    """Best-effort file/line location for a proposal's nodeId (a symbol name or path::name)."""
    store = get_metadata_store(str(PARSED_ROOT), repo)
    candidates = [node_id, node_id.split("::")[-1], node_id.rsplit(".", 1)[-1]]
    for name in dict.fromkeys(candidate for candidate in candidates if candidate):
        matches = toolkit.where_defined(SEARCH_ROOT, PARSED_ROOT, repo, name, limit=1).get("matches") or []
        if matches:
            symbol = store.get_symbol(str(matches[0].get("symbol_id"))) or matches[0]
            span = symbol.get("span") or symbol.get("range") or {}
            return {
                "qualified_name": symbol.get("qualified_name"),
                "kind": symbol.get("kind"),
                "path": symbol.get("path"),
                "start_line": span.get("start_line"),
                "end_line": span.get("end_line"),
                "signature": symbol.get("signature"),
            }
    return None


HANDOFFS = HandoffStore(HANDOFF_ROOT, resolve_code_ref=resolve_code_ref)
HANDOFF_WRITE = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=False)


@mcp.tool(annotations=READ_ONLY)
def list_handoffs(repo: Optional[str] = None, status: Optional[str] = "open", limit: int = 20) -> str:
    """Handoffs a team accepted in Spelunk, newest first. Defaults to status "open";
    pass status=None for all (open, in_progress, done, dismissed)."""
    handoffs = HANDOFFS.list(repo=repo, status=status, limit=limit)
    return render({"count": len(handoffs), "status_filter": status, "handoffs": handoffs})


@mcp.tool(annotations=READ_ONLY)
def get_handoff(handoff_id: str) -> str:
    """One handoff: the decisions, who said them, why, and the code each touches
    (file and lines), plus `instructions` as ready-to-follow markdown."""
    try:
        doc = HANDOFFS.get(handoff_id)
    except HandoffError as exc:
        return render({"error": str(exc)})
    return render({**doc, "instructions": handoff_markdown(doc)})


@mcp.tool(annotations=HANDOFF_WRITE)
def update_handoff_status(handoff_id: str, status: Literal["open", "in_progress", "done", "dismissed"], note: str = "") -> str:
    """Record progress on a handoff: in_progress when you start, done (with a short note of
    what changed) when finished, dismissed if it can't or shouldn't be done."""
    try:
        doc = HANDOFFS.update_status(handoff_id, status, note)
    except HandoffError as exc:
        return render({"error": str(exc)})
    return render({"id": doc["id"], "status": doc["status"], "updated_at": doc["updated_at"]})


@mcp.tool(annotations=HANDOFF_WRITE)
def publish_handoff(handoff: Dict[str, object]) -> str:
    """Publish accepted decisions as a new handoff. `handoff` is a ProposalBatch:
    {repo, answer: {id, title, asked}, proposals: [{title, why, said, action: {kind: "focus", nodeId} |
    {kind: "ask", question}}]}. Used by the Spelunk app / extraction step, not by coding agents."""
    try:
        doc = HANDOFFS.publish(handoff, source="mcp")
    except HandoffError as exc:
        return render({"error": str(exc)})
    return render({"id": doc["id"], "status": doc["status"], "proposals": len(doc["proposals"])})


# ---- HTTP routes for the app (same process as the MCP endpoint) ----------------


@mcp.custom_route("/health", methods=["GET"])
async def http_health(request):
    from starlette.responses import JSONResponse

    return JSONResponse({"ok": True, "repos": indexed_repos(), "mcp": "/mcp"})


@mcp.custom_route("/handoffs", methods=["GET", "POST"])
async def http_handoffs(request):
    from starlette.responses import JSONResponse

    if request.method == "GET":
        params = request.query_params
        return JSONResponse({"handoffs": HANDOFFS.list(repo=params.get("repo"), status=params.get("status"),
                                                        limit=int(params.get("limit", 20)))})
    try:
        doc = HANDOFFS.publish(await request.json(), source="app")
    except (HandoffError, json.JSONDecodeError) as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    return JSONResponse({"id": doc["id"], "status": doc["status"], "proposals": len(doc["proposals"])}, status_code=201)


@mcp.custom_route("/handoffs/{handoff_id}", methods=["GET"])
async def http_handoff(request):
    from starlette.responses import JSONResponse

    try:
        doc = HANDOFFS.get(request.path_params["handoff_id"])
    except HandoffError as exc:
        return JSONResponse({"error": str(exc)}, status_code=404)
    return JSONResponse({**doc, "instructions": handoff_markdown(doc)})


def http_app(host: str):
    """Streamable-HTTP MCP at /mcp plus the routes above, with CORS for local dev servers."""
    from starlette.middleware.cors import CORSMiddleware

    app = mcp.streamable_http_app(host=host)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=os.environ.get("REPO_ANALYSIS_CORS_ORIGIN_REGEX", r"https?://(localhost|127\.0\.0\.1)(:\d+)?"),
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["mcp-session-id"],
    )
    return app


def main() -> None:
    parser = argparse.ArgumentParser(description="repo-analysis MCP server")
    parser.add_argument("--transport", choices=("stdio", "http"), default=os.environ.get("REPO_ANALYSIS_MCP_TRANSPORT", "stdio"))
    parser.add_argument("--host", default=os.environ.get("REPO_ANALYSIS_MCP_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("REPO_ANALYSIS_MCP_PORT", "8787")))
    args = parser.parse_args()
    if args.transport == "stdio":
        mcp.run("stdio")
        return
    import uvicorn

    print(f"[repo-analysis] MCP over HTTP at http://{args.host}:{args.port}/mcp", file=sys.stderr, flush=True)
    uvicorn.run(http_app(args.host), host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()

"""The MCP server's tools as plain functions returning normalised JSON.

Each tool calls the workbench's ``agents.toolkit`` (exactly what
``src/mcp_server/server.py`` calls). The graph tools fall back to
``relations.py`` when the RyuGraph backend isn't available; every response
says which engine answered in ``meta.engine``.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from . import queries, relations, workbench
from .params import ApiError, not_found

ENGINES = ("auto", "workbench", "index")


@dataclass(frozen=True)
class Context:
    con: object
    data_dir: Path
    index_path: Path
    built_at: str
    workspace: Path | None
    default_engine: str

    @property
    def parsed(self) -> Path:
        return self.data_dir / "parsed"

    @property
    def search(self) -> Path:
        return self.data_dir / "search"

    @property
    def graph(self) -> Path:
        return self.data_dir / "graph"


def _meta(engine: str, tool: str | None, **extra) -> dict:
    return {"engine": engine, "workbench_tool": tool, **extra}


def graph_engine(ctx: Context, requested: str | None) -> str:
    """Pick 'workbench' (RyuGraph via the toolkit) or 'index' for a graph tool."""
    requested = requested or ctx.default_engine
    available = workbench.engines().graph == "ryugraph"
    if requested == "workbench" and not available:
        raise ApiError(503, "engine_unavailable", "The workbench graph engine (RyuGraph) is not available here.",
                       {"reason": workbench.engines().graph_reason})
    return "workbench" if requested in ("auto", "workbench") and available else "index"


# --------------------------------------------------------------------------- symbol resolution

def resolve_symbol(ctx: Context, repo: str, query: str):
    """Symbol id, name, `Type::method` or qualified name -> symbols row, with the toolkit's resolver."""
    queries.require_repo(ctx.con, repo)
    query = (query or "").strip()
    if not query:
        raise ApiError(400, "invalid_parameter", "A symbol is required.")
    row = ctx.con.execute("SELECT * FROM symbols WHERE repo = ? AND (id = ? OR qualified_name = ?) ORDER BY kind = 'impl'",
                          (repo, query, query)).fetchone()
    if row is not None:
        return row, "exact"
    _seed, resolved, candidates, how = workbench.toolkit().resolve_graph_seed(ctx.search, ctx.parsed, repo, query, limit=10)
    if how == "ambiguous":
        raise ApiError(409, "ambiguous_symbol", f"'{query}' matches several symbols; pass one of the candidate ids.",
                       {"query": query, "candidates": [_candidate(c) for c in candidates]})
    if not resolved:
        raise not_found("symbol", query)
    row = ctx.con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, resolved["symbol_id"])).fetchone()
    if row is None:
        raise not_found("symbol", query)
    return row, how


def _candidate(c: dict) -> dict:
    return {"id": c.get("symbol_id"), "qualified_name": c.get("qualified_name"), "kind": c.get("kind"),
            "path": c.get("path"), "signature": c.get("signature")}


def _symbol_out(ctx, repo, row) -> dict:
    return queries._symbol(row, queries.crate_labels(ctx.con, repo))


# --------------------------------------------------------------------------- repo-level tools

def list_repos(ctx: Context) -> dict:
    indexed = sorted(p.parent.name for p in ctx.parsed.glob("*/metadata.lmdb"))
    items = queries.list_repos(ctx.con)
    for item in items:
        item["artifacts"] = {"metadata_lmdb": item["name"] in indexed,
                             "graph_db": (ctx.graph / item["name"] / "graph.db").exists(),
                             "tantivy": (ctx.search / item["name"] / "tantivy").exists()}
    return {"items": items, "total": len(items), "meta": _meta("index", "list_repos")}


def repo_overview(ctx: Context, repo: str) -> dict:
    out = queries.repo_overview(ctx.con, repo)
    out["project"] = workbench.toolkit().repo_overview(ctx.parsed, repo).get("project") or None
    out["meta"] = _meta("workbench", "repo_overview")
    return out


def summarize_path(ctx: Context, repo: str, path: str) -> dict:
    queries.require_repo(ctx.con, repo)
    out = workbench.toolkit().summarize_path(ctx.parsed, repo, path.strip("/") or ".")
    if out.get("kind") == "unknown" and not out.get("summary"):
        raise not_found("path", path)
    return {**out, "meta": _meta("workbench", "summarize_path")}


SEARCH_KINDS = ("repo", "package", "directory", "file", "symbol", "function_body", "type_body", "doc", "statement")


def search_code(ctx: Context, repo: str, q: str, kinds: tuple, path_prefix: str | None, limit: int) -> dict:
    queries.require_repo(ctx.con, repo)
    res = workbench.toolkit().search_lexical(ctx.search, repo, q, limit=limit, kinds=kinds, path_prefix=path_prefix)
    items = []
    for r in res.get("results", []):
        meta = r.get("metadata") or {}
        rng = meta.get("range") or {}
        items.append({
            "kind": r.get("kind"), "symbol_id": r.get("symbol_id"), "name": r.get("name"),
            "qualified_name": r.get("qualified_name"), "display_name": queries.short_name(r.get("qualified_name")),
            "path": r.get("path"), "line": rng.get("start_line") or meta.get("line"), "end_line": rng.get("end_line"),
            "symbol_kind": meta.get("kind"), "crate": meta.get("crate"), "visibility": meta.get("visibility"),
            "title": r.get("title"), "preview": r.get("preview"), "score": r.get("score"),
        })
    return {"query": q, "items": items, "total": len(items), "limit": limit,
            "filters": {"kinds": list(kinds), "path_prefix": path_prefix},
            "meta": _meta(workbench.engines().search, "search_code")}


def find_symbol(ctx: Context, repo: str, name: str, limit: int) -> dict:
    queries.require_repo(ctx.con, repo)
    labels = queries.crate_labels(ctx.con, repo)
    try:
        matches = workbench.toolkit().where_defined(ctx.search, ctx.parsed, repo, name, limit=limit).get("matches", [])
    except RuntimeError:  # where_defined's last resort is a RyuGraph lookup
        matches = []
    items = []
    for m in matches:
        row = ctx.con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, m.get("symbol_id"))).fetchone()
        if row is not None:
            items.append(queries._symbol(row, labels))
    return {"query": name, "items": items, "total": len(items), "meta": _meta("workbench", "find_symbol")}


def find_file(ctx: Context, repo: str, pattern: str, limit: int) -> dict:
    queries.require_repo(ctx.con, repo)
    res = workbench.toolkit().find_file(ctx.search, repo, pattern, limit=limit)
    items = []
    for r in res.get("results", []):
        meta = r.get("metadata") or {}
        items.append({"path": r.get("path"), "kind": r.get("kind"), "language": meta.get("language"),
                      "crate": meta.get("crate"), "module_path": meta.get("module_path"), "score": r.get("score")})
    # Exact and prefix matches come from LMDB; only fuzzy patterns reach the search engine.
    return {"pattern": pattern, "items": items, "total": len(items),
            "meta": _meta("workbench", "find_file", search_engine=workbench.engines().search)}


# --------------------------------------------------------------------------- symbol tools

def symbol_body(ctx: Context, repo: str, sym) -> dict:
    """get_symbol_body, plus the statement lines from LMDB (and exact source when a checkout is configured)."""
    from backends.metadata_store import get_metadata_store

    res = workbench.toolkit().get_symbol_body(ctx.search, ctx.parsed, repo, sym["id"])
    body = get_metadata_store(str(ctx.parsed.resolve()), repo).get_symbol_body(sym["id"]) or {}
    lines = [{"line": s.get("line"), "text": s.get("text")} for s in body.get("statements") or []]
    source, source_kind = None, "statements"
    if ctx.workspace and sym["path"] and sym["start_line"]:
        file = Path(ctx.workspace) / repo / sym["path"]
        if file.is_file():
            text = file.read_text(encoding="utf-8", errors="replace").splitlines()
            source = "\n".join(text[sym["start_line"] - 1:sym["end_line"] or sym["start_line"]])
            source_kind = "source"
    if source is None:
        source = "\n".join(l["text"] or "" for l in lines) or sym["signature"]
    doc = res.get("body") or {}
    return {"symbol": _symbol_out(ctx, repo, sym), "code": source, "code_kind": source_kind, "lines": lines,
            "preview": doc.get("preview"), "body_kind": doc.get("kind"), "meta": _meta("workbench", "get_symbol_body")}


def enclosing_context(ctx: Context, repo: str, sym, engine: str | None) -> dict:
    which = graph_engine(ctx, engine)
    tk = workbench.toolkit()
    summary = tk.summarize_path(ctx.parsed, repo, sym["path"]).get("summary") if sym["path"] else None
    out = relations.enclosing_context(ctx.con, repo, sym, summary)
    if which == "workbench":
        raw = tk.get_enclosing_context(ctx.search, ctx.graph, ctx.parsed, repo, sym["id"])
        wb_slice = ((raw.get("context") or {}).get("statement_slice") or {}).get("statements")
        if wb_slice is not None:
            out["statement_slice"] = [_wb_statement(s) for s in wb_slice]
        out["raw"] = raw
    out["meta"] = _meta(which, "get_enclosing_context" if which == "workbench" else None)
    return out


WB_RELATIONS = {"callers": "callers_of", "callees": "callees_of", "imports": "who_imports", "refs": "refs_of",
                "reads": "reads_of", "writes": "writes_of", "implements": "implements_of", "inherits": "inherits_of"}


def symbol_relations(ctx: Context, repo: str, sym, relation: str, *, limit: int, offset: int, include_tests: bool,
                     include_noise: bool, include_external: bool, engine: str | None) -> dict:
    which = graph_engine(ctx, engine)
    if which == "index":
        out = relations.relation(ctx.con, repo, sym, relation, limit=limit, offset=offset, include_tests=include_tests,
                                 include_noise=include_noise, include_external=include_external)
        out["meta"] = _meta("index", None)
        return out
    fn = getattr(workbench.toolkit(), WB_RELATIONS[relation])
    raw = fn(ctx.search, ctx.parsed, ctx.graph, repo, sym["id"], limit=limit + offset)
    items = _wb_neighbors(ctx, repo, raw.get("neighbors") or [])[offset:offset + limit]
    return {"symbol": _symbol_out(ctx, repo, sym), "relation": relation, "items": items, "total": len(items),
            "limit": limit, "offset": offset, "filters": {"note": "workbench engine applies its own filtering"},
            "raw": raw, "meta": _meta("workbench", f"symbol_relations({relation})")}


def statement_slice(ctx: Context, repo: str, sym, *, limit: int, offset: int, engine: str | None) -> dict:
    which = graph_engine(ctx, engine)
    if which == "index":
        out = relations.statement_slice(ctx.con, repo, sym, limit=limit, offset=offset)
        out["meta"] = _meta("index", None)
        return out
    raw = workbench.toolkit().statement_slice(ctx.search, ctx.parsed, ctx.graph, repo, sym["id"], limit=limit + offset)
    stmts = [_wb_statement(s) for s in raw.get("statements") or []][offset:offset + limit]
    return {"symbol": _symbol_out(ctx, repo, sym), "statements": stmts, "total": len(stmts), "limit": limit,
            "offset": offset, "raw": raw, "meta": _meta("workbench", "statement_slice")}


def path_between(ctx: Context, repo: str, src, dst, *, kinds: tuple, direction: str, max_depth: int, limit: int,
                 include_tests: bool, include_noise: bool, engine: str | None) -> dict:
    which = graph_engine(ctx, engine)
    out = relations.path_between(ctx.con, ctx.index_path, ctx.built_at, repo, src, dst, kinds=kinds, direction=direction,
                                 max_depth=max_depth, limit=limit, include_tests=include_tests, include_noise=include_noise)
    if which == "workbench":
        # The workbench's answer is attached as-is; the normalised paths come from the index so the shape is stable.
        out["workbench"] = workbench.toolkit().path_between(ctx.search, ctx.parsed, ctx.graph, repo, src["id"], dst["id"],
                                                            limit=limit)
    out["meta"] = _meta(which, "path_between" if which == "workbench" else None)
    return out


def answer_bundle(ctx: Context, repo: str, question: str, limit: int, engine: str | None) -> dict:
    """prepare_answer_bundle needs search *and* the graph. Without RyuGraph a simpler bundle is built:
    workbench search for candidates, then each top symbol's callers/callees from the index and its path summary."""
    queries.require_repo(ctx.con, repo)
    tk = workbench.toolkit()
    if graph_engine(ctx, engine) == "workbench":
        raw = tk.prepare_answer_bundle(ctx.search, ctx.graph, ctx.parsed, question, repo_name=repo, limit=limit)
        return {"question": question, "bundle": raw, "meta": _meta("workbench", "prepare_answer_bundle")}
    hits = search_code(ctx, repo, question, ("symbol", "function_body", "type_body", "doc"), None, limit * 4)["items"]
    seen, symbols, files = set(), [], {}
    for h in hits:
        sid = h.get("symbol_id")
        if not sid or sid in seen:
            continue
        seen.add(sid)
        row = ctx.con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, sid)).fetchone()
        if row is None:
            continue
        common = dict(limit=5, offset=0, include_tests=False, include_noise=False, include_external=False)
        symbols.append({
            "symbol": _symbol_out(ctx, repo, row), "score": h["score"], "matched_as": h["kind"],
            "reason": f"keyword match on {h['kind'].replace('_', ' ')}",
            "callers": [i["qualified_name"] for i in relations.relation(ctx.con, repo, row, "callers", **common)["items"]],
            "callees": [i["qualified_name"] for i in relations.relation(ctx.con, repo, row, "callees", **common)["items"]],
        })
        if row["path"] and row["path"] not in files:
            files[row["path"]] = tk.summarize_path(ctx.parsed, repo, row["path"]).get("summary")
        if len(symbols) >= limit:
            break
    return {"question": question, "symbols": symbols,
            "files": [{"path": p, "summary": s} for p, s in files.items()],
            "meta": _meta("index", None, note="Simplified bundle: the workbench's prepare_answer_bundle needs RyuGraph.")}


# --------------------------------------------------------------------------- workbench output normalisation

def _wb_neighbors(ctx, repo, neighbors: list) -> list:
    labels = queries.crate_labels(ctx.con, repo)
    out: dict[str, dict] = {}
    for n in neighbors:
        sid = n.get("symbol_id") or (n.get("node_id") if str(n.get("node_id") or "").startswith("sym:") else None)
        key = sid or f"{n.get('qualified_name')}|{n.get('path')}"
        row = ctx.con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, sid)).fetchone() if sid else None
        edge = n.get("edge") or {}
        meta = n.get("edge_metadata") or edge.get("metadata") or {}
        rng = n.get("range") or n.get("span") or {}
        loc = {"path": n.get("path"), "line": meta.get("line") or rng.get("start_line")}
        if key in out:
            out[key]["count"] += 1
            out[key]["locations"].append(loc)
            continue
        out[key] = {"symbol": queries._symbol(row, labels) if row else None,
                    "qualified_name": n.get("qualified_name") or n.get("name"), "kind": n.get("kind"),
                    "resolved": row is not None, "count": 1, "locations": [loc],
                    "edge_type": n.get("edge_type") or edge.get("type"), "direction": n.get("direction")}
    return list(out.values())


def _wb_statement(s: dict) -> dict:
    span = s.get("span") or s.get("range") or {}
    pick = lambda k: [{"name": t.get("name"), "qualified_name": t.get("target_qualified_name") or t.get("qualified_name"),  # noqa: E731
                       "symbol_id": t.get("target_symbol_id") or t.get("symbol_id"), "kind": t.get("target_kind")}
                      for t in s.get(k) or [] if isinstance(t, dict)]
    return {"id": s.get("statement_id") or s.get("node_id"), "line": span.get("start_line") or s.get("line"),
            "end_line": span.get("end_line"), "kind": s.get("kind"), "text": s.get("text"),
            "calls": pick("calls"), "reads": pick("reads"), "writes": pick("writes"), "defines": pick("defines")}

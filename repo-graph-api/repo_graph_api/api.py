"""/api/v1 routes. Thin: parse parameters, resolve symbols, call tools/queries/views."""
from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from . import queries, tools, views, workbench
from .db import get_db
from .params import ApiError, get_bool, get_choice, get_int, get_list, get_str
from .queries import HOTSPOT_METRICS, REF_KINDS, SYMBOL_KINDS, TREE_METRICS, RefFilter
from .relations import RELATIONS

bp = Blueprint("api", __name__)


def ctx() -> tools.Context:
    s = current_app.config["STATE"]
    return tools.Context(con=get_db(), data_dir=s["data_dir"], index_path=s["index_path"], built_at=s["built_at"],
                         workspace=s["settings"].workspace, default_engine=s["settings"].engine)


def ref_filter(default_tests: bool = False, kinds: tuple = REF_KINDS) -> RefFilter:
    return RefFilter(get_list("ref_kinds", kinds, REF_KINDS), get_bool("include_tests", default_tests),
                     get_bool("include_noise", False))


def engine_param() -> str | None:
    return get_choice("engine", current_app.config["STATE"]["settings"].engine, tools.ENGINES)


def required(name: str) -> str:
    value = get_str(name)
    if not value:
        raise ApiError(400, "missing_parameter", f"Query parameter '{name}' is required.", {"parameter": name})
    return value


def symbol_arg(c, repo, value) -> object:
    row, _how = tools.resolve_symbol(c, repo, value)
    return row


# --------------------------------------------------------------------------- service

@bp.get("/health")
def health():
    state = current_app.config["STATE"]
    repos = [r["name"] for r in get_db().execute("SELECT name FROM repos ORDER BY name")]
    return jsonify({"ok": True, "repos": repos, "index": {"path": str(state["index_path"]), "built_at": state["built_at"]},
                    "data_dir": str(state["data_dir"]), "engines": workbench.engines().to_dict()})


# --------------------------------------------------------------------------- MCP tools as REST

@bp.get("/repos")
def list_repos():
    return jsonify(tools.list_repos(ctx()))


@bp.get("/repos/<repo>")
def repo_overview(repo):
    return jsonify(tools.repo_overview(ctx(), repo))


@bp.get("/repos/<repo>/summary")
def summarize_path(repo):
    return jsonify(tools.summarize_path(ctx(), repo, get_str("path") or "."))


@bp.get("/repos/<repo>/search")
def search_code(repo):
    return jsonify(tools.search_code(ctx(), repo, required("q"), get_list("kinds", (), tools.SEARCH_KINDS),
                                     get_str("path_prefix"), get_int("limit", 10, 1, 100)))


@bp.get("/repos/<repo>/symbols/find")
def find_symbol(repo):
    return jsonify(tools.find_symbol(ctx(), repo, required("name"), get_int("limit", 10, 1, 100)))


@bp.get("/repos/<repo>/files/find")
def find_file(repo):
    return jsonify(tools.find_file(ctx(), repo, required("pattern"), get_int("limit", 20, 1, 200)))


@bp.get("/repos/<repo>/symbols/<symbol>/body")
def symbol_body(repo, symbol):
    c = ctx()
    return jsonify(tools.symbol_body(c, repo, symbol_arg(c, repo, symbol)))


@bp.get("/repos/<repo>/symbols/<symbol>/context")
def enclosing_context(repo, symbol):
    c = ctx()
    return jsonify(tools.enclosing_context(c, repo, symbol_arg(c, repo, symbol), engine_param()))


@bp.get("/repos/<repo>/symbols/<symbol>/relations/<relation>")
def symbol_relations(repo, symbol, relation):
    if relation not in RELATIONS:
        raise ApiError(404, "not_found", f"Unknown relation '{relation}'.", {"relations": list(RELATIONS)})
    c = ctx()
    return jsonify(tools.symbol_relations(
        c, repo, symbol_arg(c, repo, symbol), relation, limit=get_int("limit", 20, 1, 500),
        offset=get_int("offset", 0, 0, 100_000), include_tests=get_bool("include_tests", True),
        include_noise=get_bool("include_noise", False), include_external=get_bool("include_external", False),
        engine=engine_param()))


@bp.get("/repos/<repo>/symbols/<symbol>/statements")
def statement_slice(repo, symbol):
    c = ctx()
    return jsonify(tools.statement_slice(c, repo, symbol_arg(c, repo, symbol), limit=get_int("limit", 50, 1, 1000),
                                         offset=get_int("offset", 0, 0, 100_000), engine=engine_param()))


@bp.get("/repos/<repo>/paths")
def path_between(repo):
    c = ctx()
    return jsonify(tools.path_between(
        c, repo, symbol_arg(c, repo, required("source")), symbol_arg(c, repo, required("target")),
        kinds=get_list("ref_kinds", ("call",), REF_KINDS), direction=get_choice("direction", "forward", ("forward", "both")),
        max_depth=get_int("max_depth", 8, 1, 12), limit=get_int("limit", 5, 1, 25),
        include_tests=get_bool("include_tests", False), include_noise=get_bool("include_noise", False),
        engine=engine_param()))


@bp.post("/repos/<repo>/answer-bundle")
def answer_bundle(repo):
    body = request.get_json(silent=True) or {}
    question = str(body.get("question") or "").strip()
    if not question:
        raise ApiError(400, "missing_parameter", "Body field 'question' is required.", {"parameter": "question"})
    limit = body.get("limit", 8)
    if not isinstance(limit, int) or not 1 <= limit <= 20:
        raise ApiError(400, "invalid_parameter", "Body field 'limit' must be an integer between 1 and 20.")
    engine = body.get("engine") or current_app.config["STATE"]["settings"].engine
    if engine not in tools.ENGINES:
        raise ApiError(400, "invalid_parameter", f"Body field 'engine' must be one of: {', '.join(tools.ENGINES)}.")
    return jsonify(tools.answer_bundle(ctx(), repo, question, limit, engine))


# --------------------------------------------------------------------------- browsing

@bp.get("/repos/<repo>/symbols")
def list_symbols(repo):
    return jsonify(queries.search_symbols(
        get_db(), repo, get_str("q"), get_list("kinds", (), SYMBOL_KINDS), get_str("crate"), get_str("path_prefix"),
        get_bool("public_only", False), get_bool("include_tests", False),
        get_choice("sort", "relevance", ("relevance", "name", "references", "location")),
        get_int("limit", 50, 1, 500), get_int("offset", 0, 0, 1_000_000)))


@bp.get("/repos/<repo>/symbols/<symbol>")
def symbol_detail(repo, symbol):
    c = ctx()
    row = symbol_arg(c, repo, symbol)
    return jsonify(queries.symbol_detail(c.con, repo, row["id"], ref_filter(default_tests=True),
                                         get_int("limit", 20, 1, 200)))


@bp.get("/repos/<repo>/crates")
def list_crates(repo):
    con = get_db()
    graph = queries.crate_graph(con, repo, ref_filter())
    stats = queries.crate_stats(con, repo)
    items = [{**stats[n["id"]], **n} for n in graph["nodes"]]
    return jsonify({"items": items, "total": len(items), "filters": graph["meta"]["filters"]})


@bp.get("/repos/<repo>/crates/<crate>")
def crate_detail(repo, crate):
    return jsonify(queries.crate_detail(get_db(), repo, crate, ref_filter()))


@bp.get("/repos/<repo>/files")
def list_files(repo):
    return jsonify(queries.list_files(get_db(), repo, get_str("crate"), get_str("language"), get_str("path_prefix"),
                                      get_choice("sort", "path", ("path", "size", "symbols")),
                                      get_int("limit", 100, 1, 1000), get_int("offset", 0, 0, 1_000_000)))


@bp.get("/repos/<repo>/files/<path:file_path>")
def file_detail(repo, file_path):
    return jsonify(queries.file_detail(get_db(), repo, file_path, get_bool("include_locals", False), ref_filter()))


@bp.get("/repos/<repo>/tree")
def file_tree(repo):
    depth = request.args.get("depth")
    return jsonify(queries.file_tree(get_db(), repo, get_str("root"), get_int("depth", 0, 1, 20) if depth else None,
                                     get_choice("metric", "symbols", TREE_METRICS)))


@bp.get("/repos/<repo>/hotspots")
def hotspots(repo):
    return jsonify(queries.hotspots(
        get_db(), repo, ref_filter(), get_choice("metric", "references", HOTSPOT_METRICS),
        get_list("kinds", queries.CALLABLE_KINDS, SYMBOL_KINDS), get_str("crate"),
        get_int("limit", 25, 1, 500), get_int("offset", 0, 0, 1_000_000)))


@bp.get("/repos/<repo>/traits")
def traits(repo):
    return jsonify(queries.traits(get_db(), repo, get_bool("include_std", False), get_str("crate"),
                                  get_int("limit", 50, 1, 500)))


# --------------------------------------------------------------------------- graphs

@bp.get("/repos/<repo>/graphs/crates")
def crate_graph(repo):
    return jsonify(queries.crate_graph(get_db(), repo, ref_filter(), get_int("min_weight", 1, 1, 1_000_000),
                                       get_int("top_targets", 5, 0, 50)))


@bp.get("/repos/<repo>/graphs/crates/matrix")
def crate_matrix(repo):
    return jsonify(queries.crate_matrix(get_db(), repo, ref_filter(),
                                        get_choice("metric", "weight", ("weight", "calls", "uses"))))


@bp.get("/repos/<repo>/graphs/modules")
def module_graph(repo):
    depth = request.args.get("depth")
    return jsonify(queries.module_graph(
        get_db(), repo, ref_filter(), get_str("crate"), get_int("depth", 0, 1, 10) if depth else None,
        get_choice("scope", "touching", ("touching", "internal")), get_int("min_weight", 1, 1, 1_000_000)))


@bp.get("/repos/<repo>/graphs/symbols/<symbol>")
def symbol_graph(repo, symbol):
    c = ctx()
    row = symbol_arg(c, repo, symbol)
    return jsonify(queries.ego_graph(c.con, repo, row["id"], ref_filter(kinds=("call",)), get_int("depth", 1, 1, 4),
                                     get_choice("direction", "both", ("in", "out", "both")),
                                     get_int("max_nodes", 150, 2, 2000)))


# --------------------------------------------------------------------------- ViewSpecs

@bp.get("/repos/<repo>/views/<archetype>")
def view(repo, archetype):
    if archetype not in views.ARCHETYPES:
        raise ApiError(404, "not_found", f"Unknown view '{archetype}'.", {"views": list(views.ARCHETYPES)})
    c = ctx()
    queries.require_repo(c.con, repo)
    question = get_str("question")
    if archetype == "arch-map":
        out = views.arch_map(c.con, repo, ref_filter(), get_int("min_weight", 1, 1, 1_000_000), question)
    elif archetype == "blast-radius":
        out = views.blast_radius(c.con, repo, symbol_arg(c, repo, required("symbol")), get_int("depth", 2, 1, 4),
                                 get_int("max_nodes", 60, 2, 500), get_bool("include_tests", True), question)
    elif archetype == "flow-trace":
        out = views.flow_trace(c.con, c.index_path, c.built_at, repo, symbol_arg(c, repo, required("source")),
                               symbol_arg(c, repo, required("target")), get_int("max_depth", 8, 1, 12),
                               get_int("context", 2, 0, 10), question)
    elif archetype == "call-tree":
        out = views.call_tree(c.con, repo, symbol_arg(c, repo, required("symbol")), get_int("depth", 2, 1, 4),
                              get_int("max_nodes", 60, 2, 500), question)
    else:
        out = views.schema_map(c.con, repo, symbol_arg(c, repo, required("symbol")), question)
    return jsonify(out)


# --------------------------------------------------------------------------- handoffs (workbench HandoffStore)

def _handoffs():
    return current_app.config["STATE"]["handoffs"]


def _handoff_error(exc) -> ApiError:
    message = str(exc)
    if message.startswith("no handoff"):
        return ApiError(404, "not_found", message)
    return ApiError(400, "invalid_handoff", message)


@bp.get("/handoffs")
def list_handoffs():
    status = request.args.get("status", "open")
    items = _handoffs().list(repo=get_str("repo"), status=status or None, limit=get_int("limit", 20, 1, 500))
    return jsonify({"items": items, "total": len(items), "filters": {"repo": get_str("repo"), "status": status or None}})


@bp.post("/handoffs")
def publish_handoff():
    from mcp_server.handoffs import HandoffError

    try:
        doc = _handoffs().publish(request.get_json(silent=True), source="api")
    except HandoffError as exc:
        raise _handoff_error(exc) from None
    return jsonify(doc), 201


@bp.get("/handoffs/<handoff_id>")
def get_handoff(handoff_id):
    from mcp_server.handoffs import HandoffError, handoff_markdown

    try:
        doc = _handoffs().get(handoff_id)
    except HandoffError as exc:
        raise _handoff_error(exc) from None
    return jsonify({**doc, "instructions": handoff_markdown(doc)})


@bp.patch("/handoffs/<handoff_id>")
def update_handoff(handoff_id):
    from mcp_server.handoffs import HandoffError

    body = request.get_json(silent=True) or {}
    try:
        doc = _handoffs().update_status(handoff_id, str(body.get("status") or ""), str(body.get("note") or ""))
    except HandoffError as exc:
        raise _handoff_error(exc) from None
    return jsonify(doc)


@bp.errorhandler(ApiError)
def _api_error(exc: ApiError):
    return jsonify(exc.to_dict()), exc.status

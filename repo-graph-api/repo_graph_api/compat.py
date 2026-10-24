"""Routes the Spelunk app already calls, in the exact shapes it expects.

* ``bridge/server.py`` (README section 13): POST /search-code, /find-symbol,
  /callers-of, /answer-bundle and GET /health. The reshaping functions are
  imported from the bridge itself so the contract can't drift.
* The MCP server's HTTP routes (section 12): GET/POST /handoffs and
  GET /handoffs/{id}.

Point the app at this server with VITE_KNOWLEDGE_URL=http://127.0.0.1:8790 and
VITE_AGENT_URL=http://127.0.0.1:8790/handoffs.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from . import relations, tools, workbench
from .params import ApiError
from .api import ctx

bp = Blueprint("compat", __name__)
_bridge = None


def bridge():
    """bridge/server.py from the tech_eu_hack checkout, loaded by path (it isn't a package)."""
    global _bridge
    if _bridge is None:
        path = Path(current_app.config["STATE"]["workbench_src"]).resolve().parents[1] / "bridge" / "server.py"
        if not path.exists():
            raise ApiError(503, "bridge_missing", f"bridge/server.py not found at {path}")
        spec = importlib.util.spec_from_file_location("spelunk_bridge_server", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _bridge = module
    return _bridge


class CompatError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def _repo() -> str:
    state = current_app.config["STATE"]
    repo = state["settings"].default_repo
    if repo:
        return repo
    repos = [r["name"] for r in ctx().con.execute("SELECT name FROM repos")]
    if len(repos) == 1:
        return repos[0]
    raise CompatError(400, f"Set REPO_ANALYSIS_DEFAULT_REPO; indexed repos: {', '.join(repos) or 'none'}")


def _body_field(key: str) -> str:
    body = request.get_json(silent=True) or {}
    value = str(body.get(key) or "").strip()
    if not value:
        raise CompatError(400, f"missing '{key}'")
    return value


def _resolve(c, repo, name):
    try:
        row, _ = tools.resolve_symbol(c, repo, name)
        return row
    except ApiError as exc:
        if exc.status in (404, 409):
            return None
        raise


@bp.get("/health")
def health():
    try:
        repo = _repo()
        error = None
    except CompatError as exc:
        repo, error = None, str(exc)
    repos = [r["name"] for r in ctx().con.execute("SELECT name FROM repos ORDER BY name")]
    return jsonify({"ok": error is None, "repo": repo, "repos": repos, "indexed": bool(repo), "error": error,
                    "mcp": None, "api": "/api/v1", "engines": workbench.engines().to_dict()})


@bp.post("/search-code")
def search_code():
    query = _body_field("query")
    k = int((request.get_json(silent=True) or {}).get("k") or 4)
    raw = workbench.toolkit().search_lexical(ctx().search, _repo(), query, limit=k * 3,
                                             kinds=bridge().SEARCH_KINDS)
    return jsonify(bridge().code_hits(raw, k))


@bp.post("/find-symbol")
def find_symbol():
    name = _body_field("name")
    c, repo = ctx(), _repo()
    row = _resolve(c, repo, name)
    if row is None:
        return jsonify(None)
    body = tools.symbol_body(c, repo, row)
    callers = relations.relation(c.con, repo, row, "callers", limit=50, offset=0, include_tests=True,
                                 include_noise=False, include_external=False)["items"]
    shaped_body = {"symbol": {"qualified_name": row["qualified_name"], "path": row["path"]},
                   "body": {"path": row["path"]}, "source": {"start": row["start_line"], "code": body["code"]}}
    callers_resp = {"neighbors": [{"qualified_name": i["qualified_name"]} for i in callers]}
    tests = sorted({i["symbol"]["path"] for i in callers if i["symbol"] and i["symbol"]["is_test"]})
    return jsonify(bridge().symbol_info(shaped_body, callers_resp, {"neighbors": [{"path": p} for p in tests]}))


@bp.post("/callers-of")
def callers_of():
    name = _body_field("name")
    c, repo = ctx(), _repo()
    row = _resolve(c, repo, name)
    if row is None:
        return jsonify([])
    items = relations.relation(c.con, repo, row, "callers", limit=200, offset=0, include_tests=True,
                               include_noise=False, include_external=False)["items"]
    return jsonify(bridge()._neighbor_names({"neighbors": [{"qualified_name": i["qualified_name"]} for i in items]}))


@bp.post("/answer-bundle")
def answer_bundle():
    question = _body_field("question")
    limit = int((request.get_json(silent=True) or {}).get("limit") or 8)
    out = tools.answer_bundle(ctx(), _repo(), question, limit, None)
    return jsonify(out.get("bundle", out))


# --- MCP server HTTP routes -----------------------------------------------------------------

@bp.route("/handoffs", methods=["GET", "POST"])
def handoffs():
    from mcp_server.handoffs import HandoffError

    store = current_app.config["STATE"]["handoffs"]
    if request.method == "GET":
        args = request.args
        return jsonify({"handoffs": store.list(repo=args.get("repo"), status=args.get("status"),
                                               limit=int(args.get("limit", 20)))})
    try:
        doc = store.publish(request.get_json(silent=True), source="app")
    except HandoffError as exc:
        raise CompatError(400, str(exc)) from None
    return jsonify({"id": doc["id"], "status": doc["status"], "proposals": len(doc["proposals"])}), 201


@bp.get("/handoffs/<handoff_id>")
def handoff(handoff_id):
    from mcp_server.handoffs import HandoffError, handoff_markdown

    try:
        doc = current_app.config["STATE"]["handoffs"].get(handoff_id)
    except HandoffError as exc:
        raise CompatError(404, str(exc)) from None
    return jsonify({**doc, "instructions": handoff_markdown(doc)})


@bp.errorhandler(CompatError)
def _compat_error(exc: CompatError):
    return jsonify({"error": str(exc)}), exc.status


@bp.errorhandler(ApiError)
def _api_error(exc: ApiError):
    return jsonify({"error": exc.message}), exc.status

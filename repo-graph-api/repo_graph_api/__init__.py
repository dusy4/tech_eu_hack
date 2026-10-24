"""repo-graph-api: an HTTP API over repo-analysis-workbench for diagram frontends.

    flask --app repo_graph_api run --port 8790
"""
from __future__ import annotations

import re
from pathlib import Path

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from . import workbench
from .config import Settings, default_workbench_src
from .db import close_db, connect
from .params import ApiError


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings or Settings.from_env()
    index_path = Path(settings.index_path)
    meta_con = connect(index_path)  # fails fast with build instructions if the index is missing
    meta = {r["key"]: r["value"] for r in meta_con.execute("SELECT key, value FROM meta")}
    meta_con.close()
    data_dir = Path(settings.data_dir or meta["data_dir"])
    workbench_src = Path(settings.workbench_src or default_workbench_src())
    workbench.load(workbench_src, index_path)

    from mcp_server.handoffs import HandoffStore

    app = Flask(__name__)
    app.json.sort_keys = False
    app.json.ensure_ascii = False
    app.config.update(
        REPO_GRAPH_INDEX=str(index_path),
        STATE={
            "settings": settings, "index_path": index_path, "built_at": meta.get("built_at"),
            "data_dir": data_dir, "workbench_src": workbench_src,
            "handoffs": HandoffStore(settings.handoff_dir or data_dir / "handoffs",
                                     resolve_code_ref=_code_ref_resolver(data_dir)),
        },
    )

    from .api import bp as api_bp
    from .compat import bp as compat_bp
    from .docs import bp as docs_bp

    app.register_blueprint(api_bp, url_prefix="/api/v1")
    app.register_blueprint(docs_bp)
    app.register_blueprint(compat_bp)
    app.teardown_appcontext(close_db)

    origin_re = re.compile(settings.cors_origin_regex)

    @app.before_request
    def _preflight():
        if request.method == "OPTIONS":
            return app.make_default_options_response()

    @app.after_request
    def _cors(response):
        origin = request.headers.get("Origin")
        if origin and origin_re.fullmatch(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Vary"] = "Origin"
        return response

    @app.errorhandler(ApiError)
    def _api_error(exc: ApiError):
        return jsonify(exc.to_dict()), exc.status

    @app.errorhandler(HTTPException)
    def _http_error(exc: HTTPException):
        if not request.path.startswith("/api/"):
            return jsonify({"error": exc.description}), exc.code
        code = {404: "route_not_found", 405: "method_not_allowed"}.get(exc.code, "http_error")
        return jsonify(ApiError(exc.code, code, exc.description).to_dict()), exc.code

    @app.errorhandler(Exception)
    def _unexpected(exc: Exception):
        app.logger.exception("Unhandled error on %s", request.path)
        if not request.path.startswith("/api/"):
            return jsonify({"error": f"{type(exc).__name__}: {exc}"}), 500
        return jsonify(ApiError(500, "internal_error", f"{type(exc).__name__}: {exc}").to_dict()), 500

    return app


def _code_ref_resolver(data_dir: Path):
    """Same lookup as the MCP server's resolve_code_ref: file/lines for a handoff's focus nodeId."""
    def resolve(repo: str, node_id: str):
        from backends.metadata_store import get_metadata_store

        tk = workbench.toolkit()
        parsed, search = data_dir / "parsed", data_dir / "search"
        store = get_metadata_store(str(parsed), repo)
        for name in dict.fromkeys(c for c in (node_id, node_id.split("::")[-1], node_id.rsplit(".", 1)[-1]) if c):
            try:
                matches = tk.where_defined(search, parsed, repo, name, limit=1).get("matches") or []
            except RuntimeError:
                matches = []
            if matches:
                symbol = store.get_symbol(str(matches[0].get("symbol_id"))) or matches[0]
                span = symbol.get("span") or symbol.get("range") or {}
                return {"qualified_name": symbol.get("qualified_name"), "kind": symbol.get("kind"),
                        "path": symbol.get("path"), "start_line": span.get("start_line"),
                        "end_line": span.get("end_line"), "signature": symbol.get("signature")}
        return None

    return resolve

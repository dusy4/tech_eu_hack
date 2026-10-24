"""HTTP bridge between the frontend (app/) and repo-analysis-workbench.

Runs the workbench's toolkit functions in-process and reshapes their output into the
types the UI already uses (app/src/knowledge/index.ts). README.md section 13 is
the spec; keep the two in sync.

    WORKBENCH_REPO=<indexed-repo> python bridge/server.py

Stdlib only. The workbench's own dependencies (lmdb, ryugraph, ...) are imported
lazily, so /health still answers when they are missing.
"""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[1]
WORKBENCH_SRC = ROOT / "repo-analysis-workbench" / "src"
DATA_ROOT = Path(os.environ.get("WORKBENCH_DATA", ROOT / "repo-analysis-workbench" / "data")).resolve()
REPO = os.environ.get("WORKBENCH_REPO", "")
# Where the indexed repos are cloned; symbol code is read from here by line span.
WORKSPACE = Path(os.environ.get("WORKBENCH_WORKSPACE", ROOT / "repo_analyse")).resolve()
PORT = int(os.environ.get("BRIDGE_PORT", "18300"))

SEARCH_KINDS = ("symbol", "function_body", "type_body")
SNIPPET_LINES = 3


class Workbench:
    """The toolkit calls the bridge needs, with the data roots filled in."""

    def __init__(self, data_root: Path, repo: str) -> None:
        if str(WORKBENCH_SRC) not in sys.path:
            sys.path.insert(0, str(WORKBENCH_SRC))
        from agents import toolkit  # noqa: E402  (needs the sys.path entry above)

        self.tk = toolkit
        self.repo = repo
        self.search_root = data_root / "search"
        self.parsed_root = data_root / "parsed"
        self.graph_root = data_root / "graph"

    def search(self, query: str, limit: int) -> Dict[str, Any]:
        return self.tk.search_lexical(self.search_root, self.repo, query, limit=limit, kinds=SEARCH_KINDS)

    def body(self, name: str) -> Dict[str, Any]:
        """get_symbol_body, plus the symbol's source read from the clone: the index keeps spans, not text."""
        result = self.tk.get_symbol_body(self.search_root, self.parsed_root, self.repo, name)
        row = self.tk.resolve_symbol_query(self.search_root, self.parsed_root, self.repo, name) if result.get("symbol") else None
        span = (row or {}).get("span") or (row or {}).get("range") or {}
        source = WORKSPACE / self.repo / str((row or {}).get("path") or "")
        if span.get("start_line") and source.is_file():
            lines = source.read_text(encoding="utf-8", errors="replace").splitlines()
            start, end = int(span["start_line"]), int(span.get("end_line") or span["start_line"])
            result["source"] = {"start": start, "code": "\n".join(lines[start - 1 : end])}
        return result

    def callers(self, name: str) -> Dict[str, Any]:
        return self.tk.callers_of(self.search_root, self.parsed_root, self.graph_root, self.repo, name)

    def tests(self, name: str) -> Dict[str, Any]:
        return self.tk.graph_neighbors_response(
            self.search_root, self.parsed_root, self.graph_root, self.repo, name, edge_types=("TESTS",), direction="in"
        )

    def answer_bundle(self, question: str, limit: int) -> Dict[str, Any]:
        return self.tk.prepare_answer_bundle(self.search_root, self.graph_root, self.parsed_root, question, repo_name=self.repo, limit=limit)


# ── Reshaping workbench output into the contract types ──────────────────────


def _start_line(row: Dict[str, Any]) -> int:
    meta = row.get("metadata") or {}
    span = meta.get("range") or meta.get("span") or row.get("span") or row.get("range") or {}
    return int(span.get("start_line") or row.get("line") or 1)


def _name(row: Dict[str, Any]) -> str:
    return str(row.get("qualified_name") or row.get("name") or row.get("title") or "")


def _neighbor_names(response: Dict[str, Any]) -> List[str]:
    names: List[str] = []
    for n in response.get("neighbors") or []:
        name = _name(n)
        if name and name not in names:
            names.append(name)
    return names


def code_hits(response: Dict[str, Any], k: int) -> List[Dict[str, Any]]:
    """search_lexical results -> CodeHit[]. One hit per symbol, score scaled to 0..1."""
    hits: List[Dict[str, Any]] = []
    seen = set()
    for row in response.get("results") or []:
        key = row.get("symbol_id") or (row.get("path"), _name(row))
        if key in seen or not row.get("path"):
            continue
        seen.add(key)
        text = str(row.get("content") or row.get("preview") or "")
        hits.append(
            {
                "symbol": _name(row),
                "file": row["path"],
                "line": _start_line(row),
                "score": float(row.get("score") or 0.0),
                "snippet": "\n".join(text.splitlines()[:SNIPPET_LINES]),
            }
        )
        if len(hits) == k:
            break
    top = max((h["score"] for h in hits), default=0.0)
    for h in hits:
        h["score"] = round(h["score"] / top, 2) if top > 0 else 0.0
    return hits


def symbol_info(body: Dict[str, Any], callers: Dict[str, Any], tests: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """get_symbol_body + callers_of + TESTS neighbours -> SymbolInfo (or None when unresolved)."""
    symbol = body.get("symbol")
    if not symbol:
        return None
    doc = body.get("body") or {}
    source = body.get("source") or {}
    return {
        "symbol": _name(symbol),
        "file": symbol.get("path") or doc.get("path") or "",
        "start": source.get("start") or (_start_line(doc) if doc else 1),
        "code": str(source.get("code") or doc.get("content") or symbol.get("signature") or ""),
        "callers": _neighbor_names(callers),
        "tests": [n.get("path") or _name(n) for n in tests.get("neighbors") or []],
    }


# ── HTTP ─────────────────────────────────────────────────────────────────────


class Api:
    def __init__(self, open_workbench: Callable[[], Workbench]) -> None:
        self._open = open_workbench
        self._wb: Optional[Workbench] = None
        self.load_error: Optional[str] = None

    def wb(self) -> Workbench:
        if self._wb is None:
            try:
                self._wb = self._open()
                self.load_error = None
            except Exception as e:  # missing deps or data: report, don't crash the server
                self.load_error = f"{type(e).__name__}: {e}"
                raise
        return self._wb

    def health(self) -> Dict[str, Any]:
        try:
            self.wb()
        except Exception:
            pass
        indexed = bool(REPO) and (DATA_ROOT / "search" / REPO).exists()
        return {"ok": self.load_error is None and indexed, "repo": REPO or None, "indexed": indexed, "error": self.load_error}

    def search_code(self, body: Dict[str, Any]) -> List[Dict[str, Any]]:
        k = int(body.get("k") or 4)
        return code_hits(self.wb().search(_required(body, "query"), limit=k * 3), k)

    def find_symbol(self, body: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        name = _required(body, "name")
        wb = self.wb()
        return symbol_info(wb.body(name), _safe(wb.callers, name), _safe(wb.tests, name))

    def callers_of(self, body: Dict[str, Any]) -> List[str]:
        return _neighbor_names(self.wb().callers(_required(body, "name")))

    def answer_bundle(self, body: Dict[str, Any]) -> Dict[str, Any]:
        return self.wb().answer_bundle(_required(body, "question"), limit=int(body.get("limit") or 8))


class BadRequest(Exception):
    pass


def _required(body: Dict[str, Any], key: str) -> str:
    value = str(body.get(key) or "").strip()
    if not value:
        raise BadRequest(f"missing '{key}'")
    return value


def _safe(fn: Callable[[str], Dict[str, Any]], arg: str) -> Dict[str, Any]:
    """Graph calls are best-effort: a repo without a call graph still gets a SymbolInfo."""
    try:
        return fn(arg)
    except Exception:
        return {}


def make_handler(api: Api) -> type:
    routes = {
        "/search-code": api.search_code,
        "/find-symbol": api.find_symbol,
        "/callers-of": api.callers_of,
        "/answer-bundle": api.answer_bundle,
    }

    class Handler(BaseHTTPRequestHandler):
        def _send(self, status: int, payload: Any) -> None:
            data = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(data)))
            self.send_header("access-control-allow-origin", "*")
            self.end_headers()
            self.wfile.write(data)

        def do_OPTIONS(self) -> None:  # CORS preflight from the Vite dev server
            self.send_response(204)
            self.send_header("access-control-allow-origin", "*")
            self.send_header("access-control-allow-methods", "GET, POST, OPTIONS")
            self.send_header("access-control-allow-headers", "content-type")
            self.end_headers()

        def do_GET(self) -> None:
            if self.path == "/health":
                return self._send(200, api.health())
            self._send(404, {"error": f"no route {self.path}"})

        def do_POST(self) -> None:
            route = routes.get(self.path)
            if route is None:
                return self._send(404, {"error": f"no route {self.path}"})
            try:
                length = int(self.headers.get("content-length") or 0)
                body = json.loads(self.rfile.read(length) or b"{}")
                self._send(200, route(body))
            except (BadRequest, json.JSONDecodeError) as e:
                self._send(400, {"error": str(e)})
            except Exception as e:
                self._send(500, {"error": f"{type(e).__name__}: {e}"})

    return Handler


def main() -> None:
    if not REPO:
        sys.exit("Set WORKBENCH_REPO to the name of an indexed repo (a folder under data/search/).")
    api = Api(lambda: Workbench(DATA_ROOT, REPO))
    server = ThreadingHTTPServer(("127.0.0.1", PORT), make_handler(api))
    print(f"bridge: repo={REPO} data={DATA_ROOT} on http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

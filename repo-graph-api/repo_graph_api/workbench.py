"""Adapter around repo-analysis-workbench (the code behind the MCP server).

The API calls the workbench's ``agents.toolkit`` functions, the same ones
``src/mcp_server/server.py`` wraps as MCP tools. Two of the workbench's
backends need things that may be missing on the machine running the API:

* the code graph needs the ``ryugraph`` package (wheels exist for Python
  3.11-3.13 only), and
* keyword search shells out to a Rust worker that needs ``cargo``.

This module detects both. When ``ryugraph`` is missing it registers a stub so
the toolkit still imports, and the graph tools are served from the API's own
index instead (see ``relations.py``). When the Rust worker is missing it swaps
the one function that queries the BM25 index for a SQLite FTS5 query over the
same documents (built by the workbench's own ``search.indexer.build_documents``),
so the workbench's ranking, symbol resolution and reranking still run unchanged.
"""
from __future__ import annotations

import importlib.util
import json
import os
import re
import sqlite3
import sys
import threading
import types
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence

_lock = threading.Lock()
_state: Dict[str, object] = {}


@dataclass(frozen=True)
class Engines:
    graph: str        # "ryugraph" (workbench) or "index" (this API's SQLite index)
    search: str       # "tantivy-native" (workbench) or "index-fts" (SQLite FTS5 fallback)
    graph_reason: Optional[str]
    search_reason: Optional[str]

    def to_dict(self) -> dict:
        return {
            "graph": {"engine": self.graph, "workbench": self.graph == "ryugraph", "reason": self.graph_reason},
            "search": {"engine": self.search, "workbench": self.search == "tantivy-native", "reason": self.search_reason},
        }


def load(workbench_src: Path, index_path: Path) -> Engines:
    """Import the workbench once per process and install the fallbacks it needs."""
    with _lock:
        if "engines" in _state:
            return _state["engines"]  # type: ignore[return-value]
        src = str(Path(workbench_src).resolve())
        if not (Path(src) / "agents" / "toolkit.py").exists():
            raise FileNotFoundError(f"repo-analysis-workbench sources not found at {src} (set WORKBENCH_SRC)")
        if src not in sys.path:
            sys.path.insert(0, src)
        # Same defaults as src/mcp_server/server.py: no embedding index or Qwen reranker needed.
        os.environ.setdefault("REPO_ANALYSIS_EMBEDDINGS", "off")
        os.environ.setdefault("REPO_ANALYSIS_RERANK_PROVIDER", "heuristic")

        graph_reason = None
        if importlib.util.find_spec("ryugraph") is None:
            graph_reason = (f"ryugraph is not installed for Python {sys.version_info.major}.{sys.version_info.minor} "
                            "(wheels exist for 3.11-3.13); graph tools use the API index")
            stub = types.ModuleType("ryugraph")

            def _missing(*_args, **_kwargs):
                raise RuntimeError("ryugraph is not installed")

            stub.Database = stub.Connection = _missing  # type: ignore[attr-defined]
            sys.modules["ryugraph"] = stub

        from common import native_tool  # noqa: E402  (needs the sys.path entry above)
        from backends.tantivy import search as tantivy_search  # noqa: E402
        from search import indexer as search_indexer  # noqa: E402

        search_reason = None
        if not native_tool.native_worker_available():
            search_reason = "the native search worker needs cargo (Rust) on PATH; search uses the API's FTS5 index"
            _state["index_path"] = str(index_path)
            # Both modules import the function by name, so each binding is replaced.
            tantivy_search.query_bm25_index = _fts_query_bm25_index
            search_indexer.query_bm25_index = _fts_query_bm25_index

        from agents import toolkit  # noqa: E402

        _state["toolkit"] = toolkit
        engines = Engines("index" if graph_reason else "ryugraph", "index-fts" if search_reason else "tantivy-native",
                          graph_reason, search_reason)
        _state["engines"] = engines
        return engines


def toolkit():
    return _state["toolkit"]


def engines() -> Engines:
    return _state["engines"]  # type: ignore[return-value]


# --------------------------------------------------------------------------- search fallback

_fts_local = threading.local()


def _fts_connection() -> sqlite3.Connection:
    con = getattr(_fts_local, "con", None)
    if con is None:
        path = Path(str(_state["index_path"])).resolve().as_posix()
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True, check_same_thread=False)
        con.row_factory = sqlite3.Row
        _fts_local.con = con
    return con


def fts_match_expression(query: str) -> Optional[str]:
    """Tokens joined with OR; each token quoted so FTS5 syntax characters are inert."""
    from common.text import tokenize  # workbench tokenizer, so both engines see the same terms

    tokens = [t for t in tokenize(query) if t]
    expanded: List[str] = []
    for token in tokens:
        expanded.append(token)
        expanded.extend(p for p in token.split("_") if p and p != token)
    terms = list(dict.fromkeys(expanded))
    return " OR ".join(f'"{t}"' for t in terms) if terms else None


def _fts_query_bm25_index(index_dir: Path, query: str, *, limit: int = 10, kinds: Sequence[str] = (),
                          path_prefix: Optional[str] = None, symbol_id: Optional[str] = None) -> List[dict]:
    """Drop-in for ``common.native_tool.query_bm25_index`` backed by SQLite FTS5.

    Returns rows in the native worker's result shape (``search.indexer.document_to_result``),
    so ``TantivySearchBackend.search`` and ``rerank_search_results`` treat them identically.
    """
    repo = Path(index_dir).parent.name
    clauses, params = ["d.repo = ?"], [repo]
    if kinds:
        clauses.append(f"d.kind IN ({','.join('?' * len(kinds))})")
        params += list(kinds)
    if path_prefix:
        clauses.append("d.path LIKE ?")
        params.append(path_prefix.rstrip("/") + "%")
    if symbol_id:
        clauses.append("d.symbol_id = ?")
        params.append(symbol_id)
    match = fts_match_expression(query) if query else None
    con = _fts_connection()
    if match:
        sql = f"""SELECT d.*, -bm25(search_fts) AS score FROM search_fts
                  JOIN search_docs d ON d.rowid = search_fts.rowid
                  WHERE search_fts MATCH ? AND {' AND '.join(clauses)}
                  ORDER BY bm25(search_fts) LIMIT ?"""
        rows = con.execute(sql, [match, *params, limit]).fetchall()
    else:
        rows = con.execute(f"SELECT d.*, 1.0 AS score FROM search_docs d WHERE {' AND '.join(clauses)} LIMIT ?",
                           [*params, limit]).fetchall()
    return [{
        "doc_id": r["doc_id"], "kind": r["kind"], "repo": r["repo"], "path": r["path"], "name": r["name"],
        "qualified_name": r["qualified_name"], "symbol_id": r["symbol_id"], "title": r["title"],
        "preview": r["preview"], "score": round(float(r["score"]), 6), "metadata": json.loads(r["metadata"] or "{}"),
    } for r in rows]


_CAMEL = re.compile(r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")


def split_identifiers(text: str) -> str:
    """`WorkflowBuilder add_node` -> `Workflow Builder add node`, appended to FTS text for word-level matches."""
    words = re.findall(r"[A-Za-z][A-Za-z0-9]*", text or "")
    parts = []
    for w in words:
        split = _CAMEL.sub(" ", w)
        if split != w:
            parts.append(split)
    return " ".join(parts)

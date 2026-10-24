"""Build the API's SQLite index from the workbench's artifacts.

Usage::

    python -m repo_graph_api.indexer --data <data_dir> [--workbench-src <src>] [--out instance/repo_graph.sqlite]

Everything is read through the workbench's own code:

* ``symbols.persistence.load_symbol_index_from_metadata`` loads files, symbols,
  imports, references and statements from ``data/parsed/<repo>/metadata.lmdb``;
* ``backends.metadata_store`` supplies each symbol's body (statement text);
* ``search.indexer.build_documents`` produces the keyword-search documents the
  Tantivy index holds, which go into an FTS5 table for the search fallback.

The index adds what the diagram endpoints need and LMDB can't answer quickly:
aggregations across all references (crate and module graphs, hotspots), and a
noise flag on references whose target was matched by name only.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from . import workbench
from .config import default_workbench_src

SCHEMA_VERSION = 2

# Calls are partly resolved by name, so `vec.len()` can land on any workspace
# method called `len`. References to these names are flagged as noise.
GENERIC_METHOD_NAMES = frozenset({
    "len", "is_empty", "as_ref", "as_str", "iter", "clone", "to_string", "get",
    "insert", "push", "contains", "keys", "values", "map", "unwrap", "default",
    "from", "into", "fmt", "eq", "next", "drop", "filter", "display", "remove",
    "is_some", "is_none", "extend", "join", "split", "trim", "parse", "send",
})

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE repos (
    name TEXT PRIMARY KEY, git_remote TEXT, git_branch TEXT, git_ref TEXT,
    generated_at TEXT, indexed_at TEXT NOT NULL, language_mix TEXT NOT NULL,
    tracked_files INTEGER, directories INTEGER, parser TEXT
);
CREATE TABLE crates (
    repo TEXT NOT NULL, name TEXT NOT NULL, label TEXT NOT NULL, root_path TEXT, module_root TEXT,
    PRIMARY KEY (repo, name)
);
CREATE TABLE files (
    repo TEXT NOT NULL, path TEXT NOT NULL, crate TEXT, language TEXT, extension TEXT,
    size_bytes INTEGER, generated INTEGER, module_path TEXT, parser TEXT,
    PRIMARY KEY (repo, path)
);
CREATE TABLE symbols (
    repo TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, qualified_name TEXT NOT NULL,
    kind TEXT NOT NULL, crate TEXT, module_path TEXT, path TEXT, start_line INTEGER, end_line INTEGER,
    visibility TEXT, is_public INTEGER NOT NULL, is_test INTEGER NOT NULL,
    signature TEXT, docstring TEXT, container_id TEXT,
    impl_target TEXT, impl_target_id TEXT, impl_trait TEXT, impl_trait_id TEXT,
    super_traits TEXT,                  -- JSON [{name, qualified_name, symbol_id}]
    PRIMARY KEY (repo, id)
);
CREATE INDEX symbols_qn ON symbols (repo, qualified_name);
CREATE INDEX symbols_name ON symbols (repo, name);
CREATE INDEX symbols_crate_kind ON symbols (repo, crate, kind);
CREATE INDEX symbols_path ON symbols (repo, path);
CREATE INDEX symbols_container ON symbols (repo, container_id);
CREATE INDEX symbols_impl ON symbols (repo, impl_trait_id, impl_target_id);
CREATE TABLE refs (
    repo TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL,
    src_symbol_id TEXT, src_crate TEXT, src_module TEXT, path TEXT, line INTEGER,
    target_symbol_id TEXT, target_qn TEXT, target_name TEXT, target_kind TEXT,
    target_crate TEXT, target_module TEXT,
    is_noise INTEGER NOT NULL, is_test INTEGER NOT NULL,
    PRIMARY KEY (repo, id)
);
CREATE INDEX refs_target ON refs (repo, target_symbol_id);
CREATE INDEX refs_src ON refs (repo, src_symbol_id);
CREATE INDEX refs_crates ON refs (repo, src_crate, target_crate);
CREATE INDEX refs_path ON refs (repo, path);
CREATE TABLE imports (
    repo TEXT NOT NULL, id TEXT NOT NULL, path TEXT, crate TEXT, module_path TEXT, container_id TEXT,
    line INTEGER, signature TEXT, target TEXT, target_qn TEXT, target_symbol_id TEXT, target_kind TEXT,
    target_crate TEXT, visibility TEXT, alias TEXT,
    PRIMARY KEY (repo, id)
);
CREATE INDEX imports_target ON imports (repo, target_symbol_id);
CREATE INDEX imports_path ON imports (repo, path);
CREATE TABLE statements (
    repo TEXT NOT NULL, id TEXT NOT NULL, container_id TEXT, path TEXT, crate TEXT,
    line INTEGER, end_line INTEGER, kind TEXT, text TEXT, nesting_depth INTEGER,
    parent_id TEXT, previous_id TEXT,
    calls TEXT, reads TEXT, writes TEXT, defines TEXT,   -- JSON [{name, qualified_name, symbol_id, kind}]
    PRIMARY KEY (repo, id)
);
CREATE INDEX statements_container ON statements (repo, container_id, line);
CREATE TABLE search_docs (
    rowid INTEGER PRIMARY KEY, repo TEXT NOT NULL, doc_id TEXT NOT NULL, kind TEXT NOT NULL, path TEXT,
    name TEXT, qualified_name TEXT, symbol_id TEXT, title TEXT, preview TEXT, metadata TEXT
);
CREATE INDEX search_docs_symbol ON search_docs (repo, symbol_id);
CREATE VIRTUAL TABLE search_fts USING fts5(text, content='', tokenize='unicode61');
"""


def _is_test_location(path, qn) -> bool:
    path, qn = path or "", qn or ""
    return "/tests/" in path or path.startswith("tests/") or "::tests::" in qn


def _span(rec: dict) -> dict:
    return rec.get("range") or rec.get("span") or {}


def _targets(items) -> str:
    return json.dumps([{"name": i.get("name"), "qualified_name": i.get("target_qualified_name"),
                        "symbol_id": i.get("target_symbol_id"), "kind": i.get("target_kind")}
                       for i in items or []], ensure_ascii=False)


def _load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def index_repo(con: sqlite3.Connection, data_dir: Path, repo: str, workspace: Path | None, log=print) -> dict:
    from symbols.persistence import load_symbol_index_from_metadata
    from backends.metadata_store import get_metadata_store
    from backends.tantivy.search import body_payload_to_result
    from search.indexer import build_documents

    t0 = time.time()
    parsed_root = data_dir / "parsed"
    payload = load_symbol_index_from_metadata(parsed_root, repo)
    if payload is None:
        raise SystemExit(f"{parsed_root / repo / 'metadata.lmdb'} has no schema_version; is it a workbench index?")
    manifest = _load_json(data_dir / "raw" / repo / "manifest.json")
    repo_map = _load_json(data_dir / "raw" / repo / "repo_map.json")
    symbols = {s["symbol_id"]: s for s in payload["symbols"]}
    log(f"[{repo}] loaded {len(symbols):,} symbols, {len(payload['references']):,} references, "
        f"{len(payload['statements']):,} statements, {len(payload['imports']):,} imports ({time.time() - t0:.1f}s)")

    # --- crates ------------------------------------------------------------------------
    paths_by_crate: dict[str, Counter] = defaultdict(Counter)
    roots_by_crate: dict[str, Counter] = defaultdict(Counter)
    for s in symbols.values():
        if s.get("crate"):
            m = re.match(r"(crates/[^/]+)/", s.get("path") or "")
            paths_by_crate[s["crate"]][m.group(1) if m else ""] += 1
            roots_by_crate[s["crate"]][(s.get("module_path") or "").split("::")[0]] += 1
    crates = {}
    for name, counts in paths_by_crate.items():
        root_path = counts.most_common(1)[0][0] or None
        crates[name] = {"label": root_path.split("/")[-1] if root_path else name, "root_path": root_path,
                        "module_root": roots_by_crate[name].most_common(1)[0][0] or None}
    crate_by_root = {c["module_root"]: n for n, c in crates.items() if c["module_root"]}
    crate_of_qn = lambda qn: crate_by_root.get((qn or "").split("::")[0])  # noqa: E731
    con.executemany("INSERT INTO crates VALUES (?,?,?,?,?)",
                    [(repo, n, c["label"], c["root_path"], c["module_root"]) for n, c in crates.items()])

    # --- symbols -----------------------------------------------------------------------------
    by_qn: dict[str, list[str]] = defaultdict(list)
    rows = []
    for sid, s in symbols.items():
        span, qn = _span(s), s["qualified_name"]
        by_qn[qn].append(sid)
        vis = s.get("visibility")
        rows.append((repo, sid, s["name"], qn, s["kind"], s.get("crate"), s.get("module_path"), s.get("path"),
                     span.get("start_line"), span.get("end_line"), vis, int(vis in ("pub", "public")),
                     int(bool(s.get("is_test")) or _is_test_location(s.get("path"), qn)),
                     s.get("signature"), s.get("docstring"), s.get("container_symbol_id"),
                     s.get("impl_target"), s.get("resolved_impl_target_symbol_id"),
                     s.get("impl_trait"), s.get("resolved_impl_trait_symbol_id"),
                     json.dumps([{"name": t.get("name"), "qualified_name": t.get("target_qualified_name"),
                                  "symbol_id": t.get("target_symbol_id")} for t in s.get("resolved_super_traits") or []]
                                or [{"name": n, "qualified_name": None, "symbol_id": None} for n in s.get("super_traits") or []])))
    con.executemany(f"INSERT INTO symbols VALUES ({','.join('?' * 21)})", rows)

    def resolve(tid, tqn):
        if tid in symbols:
            return tid
        candidates = by_qn.get(tqn or "", [])
        return candidates[0] if len(candidates) == 1 else None

    # --- references ----------------------------------------------------------------------------
    rows, resolved = [], 0
    for r in payload["references"]:
        tqn = r.get("target_qualified_name")
        tid = resolve(r.get("target_symbol_id"), tqn)
        target = symbols.get(tid) if tid else None
        resolved += target is not None
        src = symbols.get(r.get("container_symbol_id") or "") or {}
        tname = (tqn or "").split("::")[-1]
        rows.append((
            repo, r["reference_id"], r["kind"], r.get("container_symbol_id"),
            r.get("crate") or src.get("crate") or crate_of_qn(r.get("container_qualified_name")),
            r.get("module_path"), r.get("path"), _span(r).get("start_line"),
            tid, tqn, tname, (target or {}).get("kind") or r.get("target_kind"),
            (target or {}).get("crate") or crate_of_qn(tqn), (target or {}).get("module_path"),
            int(tname in GENERIC_METHOD_NAMES or "@L" in (tqn or "") or (target or {}).get("kind") == "local"),
            int(bool(src.get("is_test")) or _is_test_location(r.get("path"), r.get("container_qualified_name"))),
        ))
    con.executemany(f"INSERT INTO refs VALUES ({','.join('?' * 16)})", rows)

    # --- imports and statements ------------------------------------------------------------------
    con.executemany(f"INSERT INTO imports VALUES ({','.join('?' * 15)})", [
        (repo, i["import_id"], i.get("path"), i.get("crate"), i.get("module_path"), i.get("container_symbol_id"),
         _span(i).get("start_line"), i.get("signature"), i.get("target"), i.get("target_qualified_name"),
         resolve(i.get("target_symbol_id"), i.get("target_qualified_name")), i.get("target_kind"),
         crate_of_qn(i.get("target_qualified_name")), i.get("visibility"), i.get("alias"))
        for i in payload["imports"]])
    con.executemany(f"INSERT INTO statements VALUES ({','.join('?' * 16)})", [
        (repo, st["statement_id"], st.get("container_symbol_id"), st.get("path"), st.get("crate"),
         _span(st).get("start_line"), _span(st).get("end_line"), st.get("kind"), st.get("text"),
         st.get("nesting_depth"), st.get("parent_statement_id"), st.get("previous_statement_id"),
         _targets(st.get("calls")), _targets(st.get("reads")), _targets(st.get("writes")), _targets(st.get("defines")))
        for st in payload["statements"]])

    # --- files ---------------------------------------------------------------------------------
    parsed_files = {f["path"]: f for f in payload["files"]}

    def crate_of_path(path: str):
        best = None
        for name, c in crates.items():
            root = c["root_path"]
            if root and path.startswith(root + "/") and (best is None or len(root) > len(crates[best]["root_path"])):
                best = name
        return best

    con.executemany("INSERT INTO files VALUES (?,?,?,?,?,?,?,?,?)", [
        (repo, f["path"], parsed_files.get(f["path"], {}).get("crate") or crate_of_path(f["path"]), f.get("language"),
         f.get("extension"), f.get("size"), int(bool(f.get("generated"))),
         parsed_files.get(f["path"], {}).get("module_path"), parsed_files.get(f["path"], {}).get("primary_parser_backend"))
        for f in repo_map.get("files", [])])

    # --- search documents (workbench corpus) -------------------------------------------------------
    t1 = time.time()
    docs = list(build_documents(repo, workspace / repo if workspace else data_dir / "__no_source__",
                                manifest, repo_map, payload))
    have_body = {d["symbol_id"] for d in docs if d["kind"] in ("function_body", "type_body")}
    store = get_metadata_store(str(parsed_root.resolve()), repo)
    for sid, s in symbols.items():
        if sid in have_body or s["kind"] not in ("function", "method", "struct", "enum", "trait", "impl", "type"):
            continue
        body = store.get_symbol_body(sid)
        if body and body.get("statements"):
            doc = body_payload_to_result({**s, "repo": repo}, body)
            doc["content"] = " ".join(str(st.get("text") or "") for st in body["statements"])
            docs.append(doc)
    doc_rows, fts_rows = [], []
    for rowid, d in enumerate(docs, start=1):
        meta = d.get("metadata") or {}
        doc_rows.append((rowid, repo, d["doc_id"], d["kind"], d.get("path"), d.get("name"), d.get("qualified_name"),
                         d.get("symbol_id"), d.get("title"), d.get("preview"), json.dumps(meta, ensure_ascii=False)))
        text = " ".join(str(x) for x in (d.get("title"), d.get("name"), d.get("content"), d.get("preview")) if x)
        fts_rows.append((rowid, f"{text} {workbench.split_identifiers(text)}"))
    offset = con.execute("SELECT COALESCE(MAX(rowid), 0) FROM search_docs").fetchone()[0]
    con.executemany("INSERT INTO search_docs VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    [(r[0] + offset, *r[1:]) for r in doc_rows])
    con.executemany("INSERT INTO search_fts (rowid, text) VALUES (?, ?)", [(r[0] + offset, r[1]) for r in fts_rows])
    log(f"[{repo}] {len(docs):,} search documents ({Counter(d['kind'] for d in docs).most_common()}) "
        f"in {time.time() - t1:.1f}s")

    src = manifest.get("source", {})
    inv = manifest.get("file_inventory", {})
    con.execute("INSERT INTO repos VALUES (?,?,?,?,?,?,?,?,?,?)", (
        repo, src.get("git_remote"), src.get("git_branch"), src.get("git_ref"),
        payload.get("generated_at") or manifest.get("generated_at"),
        datetime.now(timezone.utc).isoformat(timespec="seconds"), json.dumps(manifest.get("language_mix", [])),
        inv.get("tracked_files"), inv.get("directories"), payload.get("parser")))
    stats = {"symbols": len(symbols), "references": len(payload["references"]), "resolved_references": resolved,
             "imports": len(payload["imports"]), "statements": len(payload["statements"]),
             "files": len(repo_map.get("files", [])), "crates": len(crates), "search_documents": len(docs)}
    log(f"[{repo}] indexed {stats} in {time.time() - t0:.1f}s")
    return stats


def build_index(data_dir: Path, out: Path, workbench_src: Path, workspace: Path | None = None, log=print) -> dict:
    data_dir, out = Path(data_dir), Path(out)
    repos = sorted(p.parent.name for p in (data_dir / "parsed").glob("*/metadata.lmdb"))
    if not repos:
        raise SystemExit(f"No indexed repos under {data_dir / 'parsed'} (expected <repo>/metadata.lmdb)")
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".building")
    tmp.unlink(missing_ok=True)
    workbench.load(workbench_src, tmp)
    con = sqlite3.connect(tmp)
    con.executescript(SCHEMA)
    summary = {repo: index_repo(con, data_dir, repo, workspace, log) for repo in repos}
    con.executemany("INSERT INTO meta VALUES (?,?)", [
        ("schema_version", str(SCHEMA_VERSION)),
        ("built_at", datetime.now(timezone.utc).isoformat(timespec="seconds")),
        ("data_dir", str(data_dir.resolve())),
    ])
    con.commit()
    con.close()
    tmp.replace(out)  # atomic swap: a running API never opens a half-built index
    log(f"Wrote {out}")
    return summary


def main(argv=None):
    from .config import Settings

    settings = Settings.from_env()
    parser = argparse.ArgumentParser(description="Build the repo-graph-api index from workbench artifacts.")
    parser.add_argument("--data", type=Path, default=settings.data_dir,
                        help="workbench data/ folder (default: $REPO_ANALYSIS_DATA_DIR)")
    parser.add_argument("--workbench-src", type=Path, default=settings.workbench_src or default_workbench_src())
    parser.add_argument("--workspace", type=Path, default=settings.workspace,
                        help="optional folder holding the source checkouts (<workspace>/<repo>) for file text")
    parser.add_argument("--out", type=Path, default=settings.index_path)
    args = parser.parse_args(argv)
    if args.data is None:
        parser.error("--data is required (or set REPO_ANALYSIS_DATA_DIR)")
    build_index(args.data, args.out, args.workbench_src, args.workspace)


if __name__ == "__main__":
    sys.exit(main())

"""The MCP server's graph tools, answered from the API's SQLite index.

Used when the workbench's RyuGraph backend can't run (or when a request asks
for ``engine=index``). Each function mirrors one MCP tool and returns the
API's normalised shapes; ``tools.py`` maps workbench output into the same shapes.
"""
from __future__ import annotations

import json
from collections import defaultdict, deque
from functools import lru_cache

from .queries import _in, _symbol, crate_labels

RELATIONS = ("callers", "callees", "imports", "refs", "reads", "writes", "implements", "inherits")
MAX_LOCATIONS = 10


def _filters(alias: str, include_tests: bool, include_noise: bool) -> str:
    out = []
    if not include_tests:
        out.append(f"{alias}.is_test = 0")
    if not include_noise:
        out.append(f"{alias}.is_noise = 0")
    return (" AND " + " AND ".join(out)) if out else ""


def _item(row, labels, count: int, locations: list, **extra) -> dict:
    """One related symbol. Unresolved targets (std, third-party) have `symbol: null`."""
    sym = _symbol(row, labels) if row is not None and row["id"] else None
    qn, kind = extra.pop("qualified_name", None), extra.pop("kind", None)
    return {"symbol": sym, "qualified_name": sym["qualified_name"] if sym else qn,
            "kind": sym["kind"] if sym else kind, "resolved": sym is not None,
            "count": count, "locations": locations[:MAX_LOCATIONS], **extra}


def _locations(pairs: str | None) -> list[dict]:
    out = []
    for pair in (pairs or "").split("|"):
        if pair:
            path, _, line = pair.rpartition(":")
            out.append({"path": path, "line": int(line) if line.isdigit() else None})
    return out


def _ref_rows(con, repo, where: str, args: list, group_target: bool, limit: int, offset: int):
    key = "r.target_symbol_id, r.target_qn" if group_target else "r.src_symbol_id"
    join = "r.target_symbol_id" if group_target else "r.src_symbol_id"
    sql = f"""SELECT s.*, r.target_qn AS tqn, r.target_kind AS tkind, r.kind AS ref_kind,
                     COUNT(*) AS n, GROUP_CONCAT(r.path || ':' || r.line, '|') AS locs
              FROM refs r LEFT JOIN symbols s ON s.repo = r.repo AND s.id = {join}
              WHERE r.repo = ? AND {where} GROUP BY {key} ORDER BY n DESC, s.qualified_name, r.target_qn
              LIMIT ? OFFSET ?"""
    total = con.execute(f"SELECT COUNT(*) FROM (SELECT 1 FROM refs r WHERE r.repo = ? AND {where} GROUP BY {key})",
                        [repo, *args]).fetchone()[0]
    return con.execute(sql, [repo, *args, limit, offset]).fetchall(), total


def relation(con, repo: str, sym, relation: str, *, limit: int, offset: int, include_tests: bool,
             include_noise: bool, include_external: bool) -> dict:
    labels = crate_labels(con, repo)
    sid = sym["id"]
    flt = _filters("r", include_tests, include_noise)
    items, total = [], 0

    if relation in ("callers",):
        rows, total = _ref_rows(con, repo, f"r.kind = 'call' AND r.target_symbol_id = ? AND r.src_symbol_id IS NOT NULL{flt}",
                                [sid], False, limit, offset)
        items = [_item(r, labels, r["n"], _locations(r["locs"])) for r in rows]

    elif relation in ("callees", "refs"):
        kinds = "r.kind = 'call'" if relation == "callees" else "r.kind IN ('call', 'use')"
        ext = "" if include_external else " AND r.target_symbol_id IS NOT NULL"
        rows, total = _ref_rows(con, repo, f"{kinds} AND r.src_symbol_id = ?{ext}{flt}", [sid], True, limit, offset)
        items = [_item(r, labels, r["n"], _locations(r["locs"]), qualified_name=r["tqn"], kind=r["tkind"],
                       **({"ref_kind": r["ref_kind"]} if relation == "refs" else {})) for r in rows]

    elif relation == "imports":
        where = "i.repo = ? AND (i.target_symbol_id = ? OR i.target_qn = ?)"
        args = [repo, sid, sym["qualified_name"]]
        total = con.execute(f"SELECT COUNT(DISTINCT i.path) FROM imports i WHERE {where}", args).fetchone()[0]
        rows = con.execute(f"""SELECT i.path, i.crate, i.module_path, COUNT(*) n,
                                      GROUP_CONCAT(i.line, '|') lines, MIN(i.signature) signature
                               FROM imports i WHERE {where} GROUP BY i.path ORDER BY i.path LIMIT ? OFFSET ?""",
                           [*args, limit, offset]).fetchall()
        items = [{"symbol": None, "qualified_name": r["module_path"], "kind": "module", "resolved": False,
                  "count": r["n"], "path": r["path"], "crate": r["crate"], "crate_label": labels.get(r["crate"]),
                  "signature": r["signature"],
                  "locations": [{"path": r["path"], "line": int(x)} for x in (r["lines"] or "").split("|") if x.isdigit()]}
                 for r in rows]

    elif relation in ("reads", "writes"):
        agg: dict[tuple, dict] = {}
        for st in con.execute(f"SELECT path, line, {relation} AS t FROM statements WHERE repo = ? AND container_id = ?",
                              (repo, sid)):
            for t in json.loads(st["t"] or "[]"):
                if not t.get("symbol_id") and not include_external:
                    continue
                key = (t.get("symbol_id"), t.get("qualified_name"))
                entry = agg.setdefault(key, {"count": 0, "locations": [], "qualified_name": t.get("qualified_name"),
                                             "kind": t.get("kind")})
                entry["count"] += 1
                entry["locations"].append({"path": st["path"], "line": st["line"]})
        ids = [k[0] for k in agg if k[0]]
        rows = {r["id"]: r for r in con.execute(f"SELECT * FROM symbols WHERE repo = ? AND id IN ({_in(ids)})",
                                                [repo, *ids])} if ids else {}
        ranked = sorted(agg.items(), key=lambda kv: (-kv[1]["count"], kv[1]["qualified_name"] or ""))
        total = len(ranked)
        for (tid, _qn), e in ranked[offset:offset + limit]:
            items.append(_item(rows.get(tid), labels, e["count"], e["locations"], qualified_name=e["qualified_name"],
                               kind=e["kind"]))

    elif relation == "implements":
        where = """repo = ? AND kind = 'impl' AND (impl_trait_id = ?
                   OR (impl_trait_id IS NULL AND (impl_trait = ? OR impl_trait LIKE ?)))"""
        args = [repo, sid, sym["name"], f"%::{sym['name']}"]
        total = con.execute(f"SELECT COUNT(*) FROM symbols WHERE {where}", args).fetchone()[0]
        for impl in con.execute(f"SELECT * FROM symbols WHERE {where} ORDER BY crate, impl_target LIMIT ? OFFSET ?",
                                [*args, limit, offset]).fetchall():
            target = con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, impl["impl_target_id"])).fetchone() \
                if impl["impl_target_id"] else None
            items.append(_item(target, labels, 1, [{"path": impl["path"], "line": impl["start_line"]}],
                               qualified_name=impl["impl_target"], kind="type", impl=_symbol(impl, labels)))

    elif relation == "inherits":
        if sym["kind"] == "trait":
            supers = json.loads(con.execute("SELECT super_traits FROM symbols WHERE repo = ? AND id = ?",
                                            (repo, sid)).fetchone()[0] or "[]")
            for t in supers:
                row = con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, t.get("symbol_id"))).fetchone() \
                    if t.get("symbol_id") else None
                items.append(_item(row, labels, 1, [], qualified_name=t.get("qualified_name") or t.get("name"), kind="trait",
                                   via="supertrait"))
        else:  # Rust has no inheritance; for types this lists the traits they implement
            for impl in con.execute("""SELECT * FROM symbols WHERE repo = ? AND kind = 'impl' AND impl_trait IS NOT NULL
                                       AND impl_target_id = ? ORDER BY impl_trait""", (repo, sid)).fetchall():
                row = con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, impl["impl_trait_id"])).fetchone() \
                    if impl["impl_trait_id"] else None
                items.append(_item(row, labels, 1, [{"path": impl["path"], "line": impl["start_line"]}],
                                   qualified_name=impl["impl_trait"], kind="trait", via="impl", impl=_symbol(impl, labels)))
        total = len(items)
        items = items[offset:offset + limit]

    return {"symbol": _symbol(sym, labels), "relation": relation, "items": items, "total": total,
            "limit": limit, "offset": offset,
            "filters": {"include_tests": include_tests, "include_noise": include_noise, "include_external": include_external}}


# --------------------------------------------------------------------------- statements & context

def statement_slice(con, repo: str, sym, *, limit: int, offset: int) -> dict:
    labels = crate_labels(con, repo)
    total = con.execute("SELECT COUNT(*) FROM statements WHERE repo = ? AND container_id = ?", (repo, sym["id"])).fetchone()[0]
    rows = con.execute("""SELECT * FROM statements WHERE repo = ? AND container_id = ?
                          ORDER BY line, id LIMIT ? OFFSET ?""", (repo, sym["id"], limit, offset)).fetchall()
    return {"symbol": _symbol(sym, labels), "total": total, "limit": limit, "offset": offset, "statements": [{
        "id": r["id"], "line": r["line"], "end_line": r["end_line"], "kind": r["kind"], "text": r["text"],
        "nesting_depth": r["nesting_depth"], "parent_id": r["parent_id"], "previous_id": r["previous_id"],
        "calls": json.loads(r["calls"] or "[]"), "reads": json.loads(r["reads"] or "[]"),
        "writes": json.loads(r["writes"] or "[]"), "defines": json.loads(r["defines"] or "[]"),
    } for r in rows]}


def enclosing_context(con, repo: str, sym, path_summary: dict | None) -> dict:
    labels = crate_labels(con, repo)
    container = con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, sym["container_id"])).fetchone() \
        if sym["container_id"] else None
    siblings = con.execute("""SELECT * FROM symbols WHERE repo = ? AND container_id IS ? AND path = ? AND id != ?
                              AND kind NOT IN ('local') ORDER BY start_line LIMIT 50""",
                           (repo, sym["container_id"], sym["path"], sym["id"])).fetchall()
    members = con.execute("""SELECT * FROM symbols WHERE repo = ? AND container_id = ? AND kind != 'local'
                             ORDER BY start_line LIMIT 100""", (repo, sym["id"])).fetchall()
    return {
        "symbol": _symbol(sym, labels), "container": _symbol(container, labels) if container else None,
        "siblings": [_symbol(r, labels) for r in siblings], "members": [_symbol(r, labels) for r in members],
        "file": {"path": sym["path"], "summary": path_summary},
        "statement_slice": statement_slice(con, repo, sym, limit=8, offset=0)["statements"],
    }


# --------------------------------------------------------------------------- paths

@lru_cache(maxsize=16)
def _adjacency(index_path: str, built_at: str, repo: str, kinds: tuple, include_tests: bool, include_noise: bool):
    """Resolved symbol-to-symbol edges with call-site counts, cached per index build."""
    from .db import connect

    con = connect(index_path)
    try:
        rows = con.execute(f"""SELECT src_symbol_id s, target_symbol_id t, COUNT(*) n FROM refs r
                               WHERE repo = ? AND kind IN ({_in(kinds)}) AND src_symbol_id IS NOT NULL
                               AND target_symbol_id IS NOT NULL AND src_symbol_id != target_symbol_id
                               {_filters('r', include_tests, include_noise)} GROUP BY 1, 2""",
                           [repo, *kinds]).fetchall()
    finally:
        con.close()
    out, inc = defaultdict(dict), defaultdict(dict)
    for r in rows:
        out[r["s"]][r["t"]] = r["n"]
        inc[r["t"]][r["s"]] = r["n"]
    return out, inc


def path_between(con, index_path: str, built_at: str, repo: str, src, dst, *, kinds: tuple, direction: str,
                 max_depth: int, limit: int, include_tests: bool, include_noise: bool) -> dict:
    labels = crate_labels(con, repo)
    out, inc = _adjacency(str(index_path), built_at, repo, kinds, include_tests, include_noise)

    def neighbours(node):
        yield from ((n, "forward") for n in out.get(node, ()))
        if direction == "both":
            yield from ((n, "backward") for n in inc.get(node, ()))

    start, goal = src["id"], dst["id"]
    dist, parents = {start: 0}, defaultdict(list)
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal or dist[node] >= max_depth:
            continue
        for nxt, how in neighbours(node):
            if nxt not in dist:
                dist[nxt] = dist[node] + 1
                queue.append(nxt)
            if dist[nxt] == dist[node] + 1:
                parents[nxt].append((node, how))

    paths: list[list[tuple[str, str]]] = []

    def unwind(node, suffix):
        if len(paths) >= limit:
            return
        if node == start:
            paths.append(list(reversed(suffix)))
            return
        for prev, how in parents[node]:
            unwind(prev, suffix + [(prev, node, how)])

    if goal in dist:
        unwind(goal, [])

    ids = {start, goal} | {x for p in paths for hop in p for x in hop[:2]}
    rows = {r["id"]: _symbol(r, labels) for r in con.execute(
        f"SELECT * FROM symbols WHERE repo = ? AND id IN ({_in(ids)})", [repo, *ids])}

    def edge(a, b, how):
        s, t = (a, b) if how == "forward" else (b, a)
        return {"id": f"{s}->{t}", "source": s, "target": t, "count": out.get(s, {}).get(t, 0),
                "traversed": how}

    path_list = [{"length": len(p), "nodes": [start] + [hop[1] for hop in p],
                  "edges": [edge(a, b, how) for a, b, how in p]} for p in paths]
    graph_edges = {e["id"]: e for p in path_list for e in p["edges"]}
    return {
        "source": rows.get(start), "target": rows.get(goal), "found": bool(paths),
        "length": path_list[0]["length"] if path_list else None, "paths": path_list,
        "graph": {"nodes": [rows[i] for i in ids if i in rows], "edges": list(graph_edges.values())},
        "filters": {"ref_kinds": list(kinds), "direction": direction, "max_depth": max_depth, "limit": limit,
                    "include_tests": include_tests, "include_noise": include_noise},
    }

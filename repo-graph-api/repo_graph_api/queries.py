"""Read queries over the index. Every function returns JSON-ready dicts and lists."""
from __future__ import annotations

import json
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass

from .params import ApiError, not_found

REF_KINDS = ("call", "use")
SYMBOL_KINDS = ("function", "method", "struct", "enum", "trait", "impl", "type", "const", "static",
                "module", "field", "variant", "local", "variable", "config_key")
CALLABLE_KINDS = ("function", "method")
TYPE_KINDS = ("struct", "enum", "trait", "type")
STD_TRAITS = frozenset({
    "Default", "Clone", "Copy", "Debug", "Display", "PartialEq", "Eq", "PartialOrd", "Ord", "Hash",
    "From", "Into", "TryFrom", "Drop", "Serialize", "Deserialize", "Error", "Iterator", "FromStr",
    "AsRef", "Deref", "DerefMut", "Send", "Sync", "Future", "Stream", "Fn", "FnMut", "FnOnce",
})


@dataclass(frozen=True)
class RefFilter:
    """Which references count toward an aggregate."""
    kinds: tuple[str, ...] = REF_KINDS
    include_tests: bool = False
    include_noise: bool = False

    def sql(self, alias: str = "r") -> tuple[str, list]:
        clauses = [f"{alias}.kind IN ({','.join('?' * len(self.kinds))})"]
        if not self.include_tests:
            clauses.append(f"{alias}.is_test = 0")
        if not self.include_noise:
            clauses.append(f"{alias}.is_noise = 0")
        return " AND ".join(clauses), list(self.kinds)

    def describe(self) -> dict:
        return {"ref_kinds": list(self.kinds), "include_tests": self.include_tests, "include_noise": self.include_noise}


def short_name(qn: str | None) -> str | None:
    """`rust_agent_core::tool::ToolRegistry::register` -> `ToolRegistry::register`."""
    if not qn:
        return qn
    parts = qn.split("::")
    return "::".join(parts[-2:]) if len(parts) > 2 else qn


def _in(values) -> str:
    return ",".join("?" * len(values))


def _symbol(row: sqlite3.Row, labels: dict[str, str] | None = None) -> dict:
    out = {
        "id": row["id"], "name": row["name"], "qualified_name": row["qualified_name"],
        "display_name": short_name(row["qualified_name"]), "kind": row["kind"], "crate": row["crate"],
        "module_path": row["module_path"], "path": row["path"], "line": row["start_line"],
        "end_line": row["end_line"], "visibility": row["visibility"], "is_public": bool(row["is_public"]),
        "is_test": bool(row["is_test"]), "signature": row["signature"],
    }
    if labels is not None:
        out["crate_label"] = labels.get(row["crate"])
    return out


# --------------------------------------------------------------------------- repos

def require_repo(con: sqlite3.Connection, repo: str) -> sqlite3.Row:
    row = con.execute("SELECT * FROM repos WHERE name = ?", (repo,)).fetchone()
    if row is None:
        raise not_found("repo", repo)
    return row


def crate_labels(con, repo) -> dict[str, str]:
    return {r["name"]: r["label"] for r in con.execute("SELECT name, label FROM crates WHERE repo = ?", (repo,))}


def index_meta(con) -> dict:
    return {r["key"]: r["value"] for r in con.execute("SELECT key, value FROM meta")}


def list_repos(con) -> list[dict]:
    rows = con.execute("""
        SELECT r.*,
          (SELECT COUNT(*) FROM crates c WHERE c.repo = r.name) AS crates,
          (SELECT COUNT(*) FROM symbols s WHERE s.repo = r.name) AS symbols,
          (SELECT COUNT(*) FROM refs x WHERE x.repo = r.name) AS refs
        FROM repos r ORDER BY r.name""").fetchall()
    return [{
        "name": r["name"], "git": _git(r), "generated_at": r["generated_at"], "indexed_at": r["indexed_at"],
        "counts": {"crates": r["crates"], "symbols": r["symbols"], "references": r["refs"],
                   "tracked_files": r["tracked_files"]},
    } for r in rows]


def _git(r) -> dict:
    return {"remote": r["git_remote"], "branch": r["git_branch"], "commit": r["git_ref"],
            "short_commit": (r["git_ref"] or "")[:7] or None}


def repo_overview(con, repo: str) -> dict:
    r = require_repo(con, repo)
    q = lambda sql: con.execute(sql, (repo,)).fetchall()  # noqa: E731
    kinds = q("SELECT kind, COUNT(*) n FROM symbols WHERE repo = ? GROUP BY kind ORDER BY n DESC")
    refs = {row["kind"]: row["n"] for row in q("SELECT kind, COUNT(*) n FROM refs WHERE repo = ? GROUP BY kind")}
    one = lambda sql: con.execute(sql, (repo,)).fetchone()[0]  # noqa: E731
    return {
        "name": r["name"], "git": _git(r), "generated_at": r["generated_at"], "indexed_at": r["indexed_at"],
        "totals": {
            "tracked_files": r["tracked_files"], "directories": r["directories"],
            "rust_files": one("SELECT COUNT(*) FROM files WHERE repo = ? AND language = 'Rust'"),
            "crates": one("SELECT COUNT(*) FROM crates WHERE repo = ?"),
            "symbols": sum(k["n"] for k in kinds),
            "public_symbols": one("SELECT COUNT(*) FROM symbols WHERE repo = ? AND is_public = 1"),
            "test_symbols": one("SELECT COUNT(*) FROM symbols WHERE repo = ? AND is_test = 1"),
            "references": {"call": refs.get("call", 0), "use": refs.get("use", 0), "total": sum(refs.values()),
                           "resolved": one("SELECT COUNT(*) FROM refs WHERE repo = ? AND target_symbol_id IS NOT NULL"),
                           "flagged_noise": one("SELECT COUNT(*) FROM refs WHERE repo = ? AND is_noise = 1")},
        },
        "language_mix": json.loads(r["language_mix"]),
        "symbol_kinds": [{"kind": k["kind"], "count": k["n"]} for k in kinds],
    }


# --------------------------------------------------------------------------- crates

def crate_stats(con, repo: str) -> dict[str, dict]:
    out = {}
    for c in con.execute("SELECT * FROM crates WHERE repo = ? ORDER BY name", (repo,)):
        out[c["name"]] = {
            "id": c["name"], "label": c["label"], "root_path": c["root_path"], "module_root": c["module_root"],
            "files": 0, "rust_files": 0, "bytes": 0, "symbols": 0, "public_symbols": 0, "test_symbols": 0,
            "kinds": {},
        }
    for row in con.execute("""SELECT crate, COUNT(*) files, SUM(language = 'Rust') rust, SUM(size_bytes) bytes
                              FROM files WHERE repo = ? AND crate IS NOT NULL GROUP BY crate""", (repo,)):
        if row["crate"] in out:
            out[row["crate"]].update(files=row["files"], rust_files=row["rust"], bytes=row["bytes"] or 0)
    for row in con.execute("""SELECT crate, kind, COUNT(*) n, SUM(is_public) pub, SUM(is_test) test
                              FROM symbols WHERE repo = ? AND crate IS NOT NULL GROUP BY crate, kind""", (repo,)):
        c = out.get(row["crate"])
        if c:
            c["kinds"][row["kind"]] = row["n"]
            c["symbols"] += row["n"]
            c["public_symbols"] += row["pub"]
            c["test_symbols"] += row["test"]
    return out


def _layers(nodes: list[str], edges: list[tuple[str, str]]) -> tuple[dict[str, int], list[list[str]]]:
    """Depth of each node in the dependency DAG (0 = depends on nothing).

    Cycles are collapsed with Tarjan's SCC algorithm so every member of a cycle
    shares a layer; the cycles themselves are returned for the caller to report.
    """
    adj = defaultdict(set)
    for s, t in edges:
        adj[s].add(t)
    index, low, on_stack, stack, comp = {}, {}, set(), [], {}
    sccs: list[list[str]] = []

    def strong(v):
        work = [(v, iter(sorted(adj[v])))]
        index[v] = low[v] = len(index)
        stack.append(v)
        on_stack.add(v)
        while work:
            node, it = work[-1]
            advanced = False
            for w in it:
                if w not in index:
                    index[w] = low[w] = len(index)
                    stack.append(w)
                    on_stack.add(w)
                    work.append((w, iter(sorted(adj[w]))))
                    advanced = True
                    break
                if w in on_stack:
                    low[node] = min(low[node], index[w])
            if advanced:
                continue
            work.pop()
            if work:
                low[work[-1][0]] = min(low[work[-1][0]], low[node])
            if low[node] == index[node]:
                members = []
                while True:
                    w = stack.pop()
                    on_stack.discard(w)
                    comp[w] = len(sccs)
                    members.append(w)
                    if w == node:
                        break
                sccs.append(sorted(members))

    for n in sorted(nodes):
        if n not in index:
            strong(n)
    # Tarjan emits components in reverse topological order: dependencies first.
    comp_layer: dict[int, int] = {}
    for ci, members in enumerate(sccs):
        deps = {comp[t] for m in members for t in adj[m] if comp[t] != ci}
        comp_layer[ci] = 1 + max((comp_layer[d] for d in deps), default=-1)
    return {n: comp_layer[comp[n]] for n in nodes}, [m for m in sccs if len(m) > 1]


def crate_graph(con, repo: str, f: RefFilter, min_weight: int = 1, top_targets: int = 5) -> dict:
    require_repo(con, repo)
    stats = crate_stats(con, repo)
    where, params = f.sql()
    rows = con.execute(f"""
        SELECT src_crate s, target_crate t, kind, target_symbol_id tid, target_qn tqn, COUNT(*) n
        FROM refs r
        WHERE repo = ? AND src_crate IS NOT NULL AND target_crate IS NOT NULL AND src_crate != target_crate
          AND {where}
        GROUP BY 1, 2, 3, 4, 5""", [repo, *params]).fetchall()

    agg: dict[tuple[str, str], dict] = {}
    targets: dict[tuple[str, str], Counter] = defaultdict(Counter)
    for r in rows:
        if r["s"] not in stats or r["t"] not in stats:
            continue
        e = agg.setdefault((r["s"], r["t"]), {"calls": 0, "uses": 0})
        e["calls" if r["kind"] == "call" else "uses"] += r["n"]
        targets[(r["s"], r["t"])][(r["tid"], r["tqn"])] += r["n"]

    edges = []
    for (s, t), e in agg.items():
        weight = e["calls"] + e["uses"]
        if weight < min_weight:
            continue
        edges.append({
            "id": f"{s}->{t}", "source": s, "target": t, "calls": e["calls"], "uses": e["uses"], "weight": weight,
            "top_targets": [{"symbol_id": tid, "qualified_name": tqn, "display_name": short_name(tqn), "count": n}
                            for (tid, tqn), n in targets[(s, t)].most_common(top_targets)],
        })
    edges.sort(key=lambda e: -e["weight"])

    layer, cycles = _layers(list(stats), [(e["source"], e["target"]) for e in edges])
    fan_in, fan_out, w_in, w_out = Counter(), Counter(), Counter(), Counter()
    for e in edges:
        fan_out[e["source"]] += 1
        fan_in[e["target"]] += 1
        w_out[e["source"]] += e["weight"]
        w_in[e["target"]] += e["weight"]
    nodes = []
    for name, c in stats.items():
        nodes.append({
            "id": name, "label": c["label"], "root_path": c["root_path"], "layer": layer[name],
            "files": c["files"], "symbols": c["symbols"], "public_symbols": c["public_symbols"],
            "test_symbols": c["test_symbols"],
            "fan_in": fan_in[name], "fan_out": fan_out[name],
            "weighted_in": w_in[name], "weighted_out": w_out[name],
        })
    nodes.sort(key=lambda n: (-n["layer"], n["label"]))
    return {
        "nodes": nodes, "edges": edges,
        "meta": {"repo": repo, "directed": True, "edge_direction": "source depends on target",
                 "layer_count": max(layer.values(), default=-1) + 1, "cycles": cycles,
                 "filters": {**f.describe(), "min_weight": min_weight}},
    }


def crate_detail(con, repo: str, crate: str, f: RefFilter) -> dict:
    graph = crate_graph(con, repo, f)
    node = next((n for n in graph["nodes"] if n["id"] == crate), None)
    if node is None:
        raise not_found("crate", crate)
    stats = crate_stats(con, repo)[crate]
    labels = {n["id"]: n["label"] for n in graph["nodes"]}
    rel = lambda e, other: {"crate": other, "label": labels[other], "calls": e["calls"], "uses": e["uses"],  # noqa: E731
                            "weight": e["weight"], "top_targets": e["top_targets"]}
    modules = con.execute("""SELECT module_path, COUNT(*) n FROM symbols
                             WHERE repo = ? AND crate = ? AND kind != 'local' AND module_path IS NOT NULL
                             GROUP BY module_path ORDER BY n DESC""", (repo, crate)).fetchall()
    return {
        **stats, "layer": node["layer"], "fan_in": node["fan_in"], "fan_out": node["fan_out"],
        "dependencies": [rel(e, e["target"]) for e in graph["edges"] if e["source"] == crate],
        "dependents": [rel(e, e["source"]) for e in graph["edges"] if e["target"] == crate],
        "modules": [{"module_path": m["module_path"], "symbols": m["n"]} for m in modules],
        "filters": f.describe(),
    }


def crate_matrix(con, repo: str, f: RefFilter, metric: str) -> dict:
    graph = crate_graph(con, repo, f)
    order = [n["id"] for n in graph["nodes"]]
    pos = {c: i for i, c in enumerate(order)}
    values = [[0] * len(order) for _ in order]
    for e in graph["edges"]:
        values[pos[e["source"]]][pos[e["target"]]] = e[metric]
    return {"crates": order, "labels": [n["label"] for n in graph["nodes"]], "metric": metric,
            "values": values, "row_meaning": "row crate depends on column crate", "filters": f.describe()}


# --------------------------------------------------------------------------- modules

def _collapse(module: str, depth: int | None) -> str:
    return "::".join(module.split("::")[:depth]) if depth else module


def module_graph(con, repo: str, f: RefFilter, crate: str | None, depth: int | None, scope: str,
                 min_weight: int) -> dict:
    require_repo(con, repo)
    labels = crate_labels(con, repo)
    if crate and crate not in labels:
        raise not_found("crate", crate)
    where, params = f.sql()
    rows = con.execute(f"""
        SELECT src_module sm, target_module tm, src_crate sc, target_crate tc, kind, COUNT(*) n
        FROM refs r
        WHERE repo = ? AND src_module IS NOT NULL AND target_module IS NOT NULL AND {where}
        GROUP BY 1, 2, 3, 4, 5""", [repo, *params]).fetchall()

    agg: dict[tuple[str, str], dict] = {}
    module_crate: dict[str, str] = {}
    for r in rows:
        if crate:
            inside = (r["sc"] == crate, r["tc"] == crate)
            if (scope == "internal" and not all(inside)) or (scope == "touching" and not any(inside)):
                continue
        s, t = _collapse(r["sm"], depth), _collapse(r["tm"], depth)
        if s == t:
            continue
        module_crate.setdefault(s, r["sc"])
        module_crate.setdefault(t, r["tc"])
        e = agg.setdefault((s, t), {"calls": 0, "uses": 0})
        e["calls" if r["kind"] == "call" else "uses"] += r["n"]

    edges = [{"id": f"{s}->{t}", "source": s, "target": t, **e, "weight": e["calls"] + e["uses"],
              "cross_crate": module_crate.get(s) != module_crate.get(t)}
             for (s, t), e in agg.items() if e["calls"] + e["uses"] >= min_weight]
    edges.sort(key=lambda e: -e["weight"])
    used = {e["source"] for e in edges} | {e["target"] for e in edges}

    sizes = Counter()
    for r in con.execute("""SELECT module_path, COUNT(*) n FROM symbols
                            WHERE repo = ? AND module_path IS NOT NULL AND kind != 'local'
                            GROUP BY module_path""", (repo,)):
        sizes[_collapse(r["module_path"], depth)] += r["n"]
    nodes = [{"id": m, "label": m.split("::")[-1], "crate": module_crate.get(m),
              "crate_label": labels.get(module_crate.get(m)), "depth": m.count("::") + 1, "symbols": sizes[m]}
             for m in sorted(used)]
    return {"nodes": nodes, "edges": edges,
            "meta": {"repo": repo, "directed": True, "edge_direction": "source depends on target",
                     "filters": {**f.describe(), "crate": crate, "scope": scope, "depth": depth,
                                 "min_weight": min_weight}}}


# --------------------------------------------------------------------------- symbols

def search_symbols(con, repo: str, q: str | None, kinds: tuple[str, ...], crate: str | None,
                   path_prefix: str | None, public_only: bool, include_tests: bool, sort: str,
                   limit: int, offset: int) -> dict:
    require_repo(con, repo)
    labels = crate_labels(con, repo)
    clauses, params = ["s.repo = ?"], [repo]
    if kinds:
        clauses.append(f"s.kind IN ({_in(kinds)})")
        params += kinds
    else:
        clauses.append("s.kind != 'local'")
    if q:
        clauses.append("(s.name LIKE ? OR s.qualified_name LIKE ?)")
        params += [f"%{q}%", f"%{q}%"]
    if crate:
        clauses.append("s.crate = ?")
        params.append(crate)
    if path_prefix:
        clauses.append("s.path LIKE ?")
        params.append(path_prefix.rstrip("/") + "%")
    if public_only:
        clauses.append("s.is_public = 1")
    if not include_tests:
        clauses.append("s.is_test = 0")
    where = " AND ".join(clauses)
    total = con.execute(f"SELECT COUNT(*) FROM symbols s WHERE {where}", params).fetchone()[0]

    refs_in = """(SELECT COUNT(*) FROM refs r WHERE r.repo = s.repo AND r.target_symbol_id = s.id
                  AND r.is_noise = 0 AND r.is_test = 0)"""
    order = {
        "relevance": "CASE WHEN s.name = ? THEN 0 WHEN s.name LIKE ? THEN 1 ELSE 2 END, references_in DESC, s.name",
        "name": "s.name, s.qualified_name",
        "references": "references_in DESC, s.name",
        "location": "s.path, s.start_line",
    }[sort if (q or sort != "relevance") else "name"]
    order_params = [q, f"{q}%"] if sort == "relevance" and q else []
    rows = con.execute(f"SELECT s.*, {refs_in} AS references_in FROM symbols s WHERE {where} "
                       f"ORDER BY {order} LIMIT ? OFFSET ?", [*params, *order_params, limit, offset]).fetchall()
    return {"items": [{**_symbol(r, labels), "references_in": r["references_in"]} for r in rows],
            "total": total, "limit": limit, "offset": offset}


def require_symbol(con, repo: str, sid: str) -> sqlite3.Row:
    row = con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, sid)).fetchone()
    if row is None:
        raise not_found("symbol", sid)
    return row


def symbol_detail(con, repo: str, sid: str, f: RefFilter, limit: int = 20) -> dict:
    require_repo(con, repo)
    labels = crate_labels(con, repo)
    s = require_symbol(con, repo, sid)
    where, params = f.sql()

    stats = con.execute(f"""SELECT SUM(kind = 'call') calls, SUM(kind = 'use') uses,
                              COUNT(DISTINCT path) files, COUNT(DISTINCT src_crate) crates
                            FROM refs r WHERE repo = ? AND target_symbol_id = ? AND {where}""",
                        [repo, sid, *params]).fetchone()

    def related(sql, args):
        return [{**_symbol(r, labels), "count": r["n"]} for r in con.execute(sql, args).fetchall()]

    callers = related(f"""SELECT s.*, COUNT(*) n FROM refs r JOIN symbols s ON s.repo = r.repo AND s.id = r.src_symbol_id
                          WHERE r.repo = ? AND r.target_symbol_id = ? AND {where}
                          GROUP BY s.id ORDER BY n DESC LIMIT ?""", [repo, sid, *params, limit])
    callees = related(f"""SELECT s.*, COUNT(*) n FROM refs r JOIN symbols s ON s.repo = r.repo AND s.id = r.target_symbol_id
                          WHERE r.repo = ? AND r.src_symbol_id = ? AND {where}
                          GROUP BY s.id ORDER BY n DESC LIMIT ?""", [repo, sid, *params, limit])
    members = [_symbol(r, labels) for r in con.execute(
        """SELECT * FROM symbols WHERE repo = ? AND container_id = ? AND kind != 'local'
           ORDER BY start_line""", (repo, sid))]
    container = con.execute("SELECT * FROM symbols WHERE repo = ? AND id = ?", (repo, s["container_id"])).fetchone() \
        if s["container_id"] else None

    out = {
        **_symbol(s, labels), "docstring": s["docstring"],
        "container": _symbol(container, labels) if container else None,
        "references_in": {"calls": stats["calls"] or 0, "uses": stats["uses"] or 0,
                          "files": stats["files"], "crates": stats["crates"]},
        "callers": callers, "callees": callees, "members": members, "filters": f.describe(),
    }
    if s["kind"] == "trait":
        out["implementors"] = [_impl(r) for r in con.execute(
            """SELECT * FROM symbols WHERE repo = ? AND kind = 'impl' AND (impl_trait_id = ? OR impl_trait = ?
               OR impl_trait LIKE ?) ORDER BY crate, impl_target""", (repo, sid, s["name"], f"%::{s['name']}"))]
    if s["kind"] in ("struct", "enum"):
        out["implements"] = [_impl(r) for r in con.execute(
            """SELECT * FROM symbols WHERE repo = ? AND kind = 'impl' AND impl_trait IS NOT NULL
               AND (impl_target_id = ? OR (impl_target_id IS NULL AND crate = ? AND (impl_target = ? OR impl_target LIKE ?)))
               ORDER BY impl_trait""",
            (repo, sid, s["crate"], s["name"], f"{s['name']}<%"))]
    return out


def _impl(r: sqlite3.Row) -> dict:
    return {"impl_symbol_id": r["id"], "trait": r["impl_trait"], "trait_symbol_id": r["impl_trait_id"],
            "type": r["impl_target"], "type_symbol_id": r["impl_target_id"], "crate": r["crate"],
            "path": r["path"], "line": r["start_line"]}


def ego_graph(con, repo: str, sid: str, f: RefFilter, depth: int, direction: str, max_nodes: int) -> dict:
    require_repo(con, repo)
    labels = crate_labels(con, repo)
    require_symbol(con, repo, sid)
    where, params = f.sql()
    distance = {sid: 0}
    edges: Counter = Counter()
    frontier, truncated = [sid], False
    for hop in range(1, depth + 1):
        found: list[str] = []
        for i in range(0, len(frontier), 500):
            chunk = frontier[i:i + 500]
            queries = []
            if direction in ("out", "both"):
                queries.append(f"""SELECT src_symbol_id s, target_symbol_id t, COUNT(*) n FROM refs r
                                   WHERE repo = ? AND src_symbol_id IN ({_in(chunk)}) AND target_symbol_id IS NOT NULL
                                   AND {where} GROUP BY 1, 2 ORDER BY n DESC""")
            if direction in ("in", "both"):
                queries.append(f"""SELECT src_symbol_id s, target_symbol_id t, COUNT(*) n FROM refs r
                                   WHERE repo = ? AND target_symbol_id IN ({_in(chunk)}) AND src_symbol_id IS NOT NULL
                                   AND {where} GROUP BY 1, 2 ORDER BY n DESC""")
            for sql in queries:
                for r in con.execute(sql, [repo, *chunk, *params]):
                    if r["s"] == r["t"]:
                        continue
                    for node in (r["s"], r["t"]):
                        if node not in distance:
                            if len(distance) >= max_nodes:
                                truncated = True
                                break
                            distance[node] = hop
                            found.append(node)
                    if r["s"] in distance and r["t"] in distance:
                        edges[(r["s"], r["t"])] += r["n"]
        frontier = found
        if not frontier or truncated:
            break

    ids = list(distance)
    rows = []
    for i in range(0, len(ids), 500):
        chunk = ids[i:i + 500]
        rows += con.execute(f"SELECT * FROM symbols WHERE repo = ? AND id IN ({_in(chunk)})", [repo, *chunk]).fetchall()
    nodes = [{**_symbol(r, labels), "distance": distance[r["id"]], "is_root": r["id"] == sid} for r in rows]
    nodes.sort(key=lambda n: (n["distance"], n["qualified_name"]))
    return {
        "nodes": nodes,
        "edges": [{"id": f"{s}->{t}", "source": s, "target": t, "count": n} for (s, t), n in edges.items()],
        "meta": {"repo": repo, "root": sid, "directed": True, "edge_direction": "source references target",
                 "truncated": truncated,
                 "filters": {**f.describe(), "depth": depth, "direction": direction, "max_nodes": max_nodes}},
    }


# --------------------------------------------------------------------------- rankings

HOTSPOT_METRICS = ("references", "files", "crates", "external_crates")


def hotspots(con, repo: str, f: RefFilter, metric: str, kinds: tuple[str, ...], crate: str | None,
             limit: int, offset: int) -> dict:
    require_repo(con, repo)
    labels = crate_labels(con, repo)
    where, params = f.sql()
    clauses, extra = [f"s.kind IN ({_in(kinds)})"], list(kinds)
    if not f.include_tests:
        clauses.append("s.is_test = 0")
    if crate:
        clauses.append("s.crate = ?")
        extra.append(crate)
    base = f"""FROM refs r JOIN symbols s ON s.repo = r.repo AND s.id = r.target_symbol_id
               WHERE r.repo = ? AND {where} AND {' AND '.join(clauses)}"""
    args = [repo, *params, *extra]
    total = con.execute(f"SELECT COUNT(DISTINCT s.id) {base}", args).fetchone()[0]
    rows = con.execute(f"""
        SELECT s.*, COUNT(*) AS references_, COUNT(DISTINCT r.path) AS files,
               COUNT(DISTINCT r.src_crate) AS crates,
               COUNT(DISTINCT CASE WHEN r.src_crate != s.crate THEN r.src_crate END) AS external_crates,
               SUM(r.kind = 'call') AS calls, SUM(r.kind = 'use') AS uses,
               GROUP_CONCAT(DISTINCT r.src_crate) AS from_crates
        {base} GROUP BY s.id
        ORDER BY {'references_' if metric == 'references' else metric} DESC, references_ DESC, s.qualified_name
        LIMIT ? OFFSET ?""", [*args, limit, offset]).fetchall()
    items = []
    for r in rows:
        values = {"references": r["references_"], "files": r["files"], "crates": r["crates"],
                  "external_crates": r["external_crates"]}
        items.append({**_symbol(r, labels), "value": values[metric], "metrics": values,
                      "calls": r["calls"], "uses": r["uses"],
                      "from_crates": sorted((r["from_crates"] or "").split(",")) if r["from_crates"] else []})
    return {"items": items, "total": total, "limit": limit, "offset": offset, "metric": metric,
            "filters": {**f.describe(), "kinds": list(kinds), "crate": crate}}


def traits(con, repo: str, include_std: bool, crate: str | None, limit: int) -> dict:
    require_repo(con, repo)
    rows = con.execute("""SELECT * FROM symbols WHERE repo = ? AND kind = 'impl' AND impl_trait IS NOT NULL
                          ORDER BY crate, impl_target""", (repo,)).fetchall()
    defined = {r["name"]: r for r in con.execute(
        "SELECT * FROM symbols WHERE repo = ? AND kind = 'trait' AND is_test = 0", (repo,))}
    groups: dict[str, list] = defaultdict(list)
    for r in rows:
        name = r["impl_trait"].split("<")[0].split("::")[-1]
        if not include_std and name in STD_TRAITS and name not in defined:
            continue
        if crate and r["crate"] != crate:
            continue
        groups[name].append(r)
    items = []
    for name, impls in sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        t = defined.get(name)
        items.append({
            "name": name, "symbol_id": t["id"] if t else None, "defined_in": t["crate"] if t else None,
            "path": t["path"] if t else None, "line": t["start_line"] if t else None,
            "is_workspace_trait": t is not None, "implementor_count": len(impls),
            "crates": sorted({i["crate"] for i in impls if i["crate"]}),
            "implementors": [_impl(i) for i in impls],
        })
    return {"items": items[:limit], "total": len(items), "filters": {"include_std": include_std, "crate": crate}}


# --------------------------------------------------------------------------- files & tree

def _file_symbol_counts(con, repo: str) -> Counter:
    return Counter({r["path"]: r["n"] for r in con.execute(
        "SELECT path, COUNT(*) n FROM symbols WHERE repo = ? AND kind != 'local' GROUP BY path", (repo,))})


def list_files(con, repo: str, crate: str | None, language: str | None, path_prefix: str | None,
               sort: str, limit: int, offset: int) -> dict:
    require_repo(con, repo)
    labels = crate_labels(con, repo)
    clauses, params = ["f.repo = ?"], [repo]
    if crate:
        clauses.append("f.crate = ?")
        params.append(crate)
    if language:
        clauses.append("f.language = ?")
        params.append(language)
    if path_prefix:
        clauses.append("f.path LIKE ?")
        params.append(path_prefix.rstrip("/") + "%")
    where = " AND ".join(clauses)
    total = con.execute(f"SELECT COUNT(*) FROM files f WHERE {where}", params).fetchone()[0]
    order = {"path": "f.path", "size": "f.size_bytes DESC, f.path", "symbols": "symbols DESC, f.path"}[sort]
    rows = con.execute(f"""
        SELECT f.*, (SELECT COUNT(*) FROM symbols s WHERE s.repo = f.repo AND s.path = f.path AND s.kind != 'local') symbols
        FROM files f WHERE {where} ORDER BY {order} LIMIT ? OFFSET ?""", [*params, limit, offset]).fetchall()
    return {"items": [_file(r, labels) for r in rows], "total": total, "limit": limit, "offset": offset}


def _file(r, labels) -> dict:
    return {"path": r["path"], "crate": r["crate"], "crate_label": labels.get(r["crate"]), "language": r["language"],
            "extension": r["extension"], "size_bytes": r["size_bytes"], "generated": bool(r["generated"]),
            "symbols": r["symbols"]}


def file_detail(con, repo: str, path: str, include_locals: bool, f: RefFilter) -> dict:
    require_repo(con, repo)
    labels = crate_labels(con, repo)
    row = con.execute("""SELECT f.*, (SELECT COUNT(*) FROM symbols s WHERE s.repo = f.repo AND s.path = f.path
                         AND s.kind != 'local') symbols FROM files f WHERE f.repo = ? AND f.path = ?""",
                      (repo, path)).fetchone()
    if row is None:
        raise not_found("file", path)
    syms = con.execute(f"""SELECT * FROM symbols WHERE repo = ? AND path = ? {'' if include_locals else "AND kind != 'local'"}
                           ORDER BY start_line, end_line DESC""", (repo, path)).fetchall()
    nodes = {r["id"]: {**_symbol(r), "children": []} for r in syms}
    outline = []
    for r in syms:
        parent = nodes.get(r["container_id"])
        (parent["children"] if parent else outline).append(nodes[r["id"]])

    where, params = f.sql()
    deps = con.execute(f"""SELECT target_crate c, SUM(kind = 'call') calls, SUM(kind = 'use') uses FROM refs r
                           WHERE repo = ? AND path = ? AND target_crate IS NOT NULL AND {where}
                           GROUP BY target_crate ORDER BY COUNT(*) DESC""", [repo, path, *params]).fetchall()
    return {**_file(row, labels), "outline": outline,
            "depends_on": [{"crate": d["c"], "label": labels.get(d["c"]), "calls": d["calls"], "uses": d["uses"],
                            "weight": d["calls"] + d["uses"], "internal": d["c"] == row["crate"]} for d in deps],
            "filters": {**f.describe(), "include_locals": include_locals}}


TREE_METRICS = ("bytes", "symbols", "files")


def file_tree(con, repo: str, root: str | None, depth: int | None, metric: str) -> dict:
    require_repo(con, repo)
    labels = crate_labels(con, repo)
    counts = _file_symbol_counts(con, repo)
    root = (root or "").strip("/")
    files = con.execute("SELECT * FROM files WHERE repo = ? AND (? = '' OR path = ? OR path LIKE ?)",
                        (repo, root, root, root + "/%")).fetchall()
    if root and not files:
        raise not_found("path", root)

    def new_dir(name, path, level):
        return {"name": name, "path": path, "type": "directory", "depth": level, "children": {},
                "files": 0, "symbols": 0, "bytes": 0}

    tree = new_dir(root.split("/")[-1] if root else repo, root, 0)
    for f in files:
        rel = f["path"][len(root):].strip("/") if root else f["path"]
        parts = rel.split("/")
        node = tree
        for i, part in enumerate(parts[:-1]):
            node = node["children"].setdefault(part, new_dir(part, "/".join(filter(None, [root, *parts[:i + 1]])), i + 1))
        leaf = {"name": parts[-1], "path": f["path"], "type": "file", "depth": len(parts),
                "language": f["language"], "crate": f["crate"], "crate_label": labels.get(f["crate"]),
                "files": 1, "symbols": counts[f["path"]], "bytes": f["size_bytes"] or 0}
        node["children"][parts[-1]] = leaf

    def finish(node):
        if node["type"] == "file":
            node["value"] = node[metric]
            return node
        kids = [finish(c) for c in node["children"].values()]
        for k in ("files", "symbols", "bytes"):
            node[k] = sum(c[k] for c in kids)
        node["value"] = node[metric]
        if depth is not None and node["depth"] >= depth:
            node["children"] = []
            node["collapsed_children"] = len(kids)
        else:
            node["children"] = sorted(kids, key=lambda c: (-c["value"], c["name"]))
        return node

    out = finish(tree)
    out["metric"] = metric
    return out

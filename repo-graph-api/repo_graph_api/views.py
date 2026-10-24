"""Build Spelunk `ViewSpec`s (app/src/data/types.ts, README section 10) from the index.

Each builder returns a `Recording`: ``{"spec": ViewSpec, "calls": ToolCall[]}``,
where ``calls`` lists the tool calls that produced the view and the node ids
each one revealed, so the app can replay the graph appearing call by call.
"""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict

from . import queries, relations
from .queries import RefFilter, short_name

ARCHETYPES = {"arch-map": "archMap", "blast-radius": "blastRadius", "flow-trace": "flowTrace",
              "call-tree": "swimlane", "schema-map": "schemaMap"}
CLASS_KINDS = {"struct", "enum", "trait", "type", "impl"}
STATE_KINDS = {"field", "variant", "const", "static", "local", "variable", "config_key"}


def _id(*parts) -> str:
    return hashlib.sha1(json.dumps(parts, default=str).encode()).hexdigest()[:12]


def node_kind(sym: dict) -> str:
    if sym.get("is_test"):
        return "test"
    kind = sym.get("kind")
    if kind in CLASS_KINDS:
        return "class"
    if kind == "module":
        return "module"
    if kind in STATE_KINDS:
        return "state"
    return "fn"


def symbol_node(sym: dict, **meta) -> dict:
    node = {"id": sym["id"], "label": sym.get("display_name") or sym["name"], "kind": node_kind(sym),
            "meta": {"crate": sym.get("crate_label") or sym.get("crate"), "symbolKind": sym.get("kind"), **meta}}
    if sym.get("path") and sym.get("line"):
        node["codeRef"] = {"file": sym["path"], "symbol": sym["qualified_name"],
                           "lines": [sym["line"], sym.get("end_line") or sym["line"]]}
    return node


def _source(node: dict) -> dict | None:
    ref = node.get("codeRef")
    return {"file": ref["file"], "symbol": ref["symbol"]} if ref else None


def _spec(archetype, question, title, summary, nodes, edges, steps) -> dict:
    sources = [s for s in (_source(n) for n in nodes) if s]
    return {"id": f"{archetype}-{_id(archetype, question, [n['id'] for n in nodes])}", "archetype": archetype,
            "question": question, "title": title, "summary": summary, "nodes": nodes, "edges": edges,
            "steps": steps, "sources": sources[:40]}


def _names(nodes, limit=4) -> str:
    labels = [f"`{n['label']}`" for n in nodes[:limit]]
    more = len(nodes) - limit
    return ", ".join(labels) + (f" and {more} more" if more > 0 else "")


def _call_site(con, repo, src, dst) -> str:
    r = con.execute("""SELECT path, MIN(line) line FROM refs WHERE repo = ? AND src_symbol_id = ? AND target_symbol_id = ?""",
                    (repo, src, dst)).fetchone()
    return f" at `{r['path']}:{r['line']}`" if r and r["path"] else ""


# --------------------------------------------------------------------------- archMap

def arch_map(con, repo: str, f: RefFilter, min_weight: int, question: str | None) -> dict:
    graph = queries.crate_graph(con, repo, f, min_weight=min_weight)
    files = {r["path"] for r in con.execute("SELECT path FROM files WHERE repo = ?", (repo,))}
    nodes = []
    for c in graph["nodes"]:
        node = {"id": c["id"], "label": c["label"], "kind": "module",
                "meta": {"layer": c["layer"], "symbols": c["symbols"], "files": c["files"], "fanIn": c["fan_in"],
                         "fanOut": c["fan_out"], "rootPath": c["root_path"]}}
        for candidate in ("src/lib.rs", "src/main.rs", "Cargo.toml"):
            path = f"{c['root_path']}/{candidate}" if c["root_path"] else None
            if path in files:
                node["codeRef"] = {"file": path, "symbol": c["id"], "lines": [1, 1]}
                break
        nodes.append(node)
    edges = [{"from": e["source"], "to": e["target"], "kind": "imports", "label": f"{e['weight']:,} refs"}
             for e in graph["edges"]]
    by_layer = defaultdict(list)
    for n in nodes:
        by_layer[n["meta"]["layer"]].append(n)
    steps = []
    for layer in sorted(by_layer):
        members = sorted(by_layer[layer], key=lambda n: -n["meta"]["symbols"])
        caption = (f"Foundation: {_names(members)}. These depend on no other workspace crate." if layer == 0 else
                   f"Depth {layer}: {_names(members)}, built on the rows below.")
        steps.append({"id": f"layer-{layer}", "focus": [n["id"] for n in members], "caption": caption,
                      "frame": {"phase": f"layer {layer}"}})
    if graph["edges"]:
        top = graph["edges"][0]
        steps.append({"id": "busiest", "focus": [top["source"], top["target"]],
                      "caption": f"Busiest boundary: `{_label(nodes, top['source'])}` → `{_label(nodes, top['target'])}` "
                                 f"with {top['weight']:,} references."})
    hub = max(nodes, key=lambda n: n["meta"]["fanIn"], default=None)
    summary = (f"{len(nodes)} crates in {graph['meta']['layer_count']} layers with {len(edges)} dependencies"
               + (f"; `{hub['label']}` is used by {hub['meta']['fanIn']} crates." if hub else "."))
    spec = _spec("archMap", question or "How do the crates depend on each other?", f"Crate map of {repo}", summary,
                 nodes, edges, steps)
    calls = [{"tool": "repo-overview", "arg": repo, "count": len(nodes), "reveals": [n["id"] for n in nodes]}]
    return {"spec": spec, "calls": calls, "meta": {"cycles": graph["meta"]["cycles"], "filters": graph["meta"]["filters"]}}


def _label(nodes, nid):
    return next((n["label"] for n in nodes if n["id"] == nid), nid)


# --------------------------------------------------------------------------- blastRadius

def blast_radius(con, repo: str, sym_row, depth: int, max_nodes: int, include_tests: bool, question: str | None) -> dict:
    f = RefFilter(("call", "use"), include_tests=include_tests, include_noise=False)
    ego = queries.ego_graph(con, repo, sym_row["id"], f, depth, "in", max_nodes)
    root = next(n for n in ego["nodes"] if n["is_root"])
    nodes = [symbol_node(n, ring=n["distance"], changed=n["is_root"]) for n in ego["nodes"]]
    # ego edges point from the referencing symbol to what it references; impact flows the other way.
    edges = [{"from": e["target"], "to": e["source"], "kind": "impacts",
              **({"label": f"{e['count']} refs"} if e["count"] > 1 else {})} for e in ego["edges"]]
    rings = defaultdict(list)
    for n in nodes:
        rings[n["meta"]["ring"]].append(n)
    tests = [n for n in nodes if n["kind"] == "test"]
    steps = [{"id": "change", "focus": [root["id"]], "caption": f"Change `{nodes[0]['label']}`."}]
    for ring in range(1, depth + 1):
        members = [n for n in rings.get(ring, []) if n["kind"] != "test"]
        if members:
            word = "direct dependents" if ring == 1 else f"dependents {ring} steps out"
            steps.append({"id": f"ring-{ring}", "focus": [n["id"] for n in members],
                          "caption": f"{len(members)} {word}: {_names(members)}.",
                          "frame": {"visited": [n["id"] for r in range(ring) for n in rings.get(r, [])]}})
    if tests:
        steps.append({"id": "tests", "focus": [n["id"] for n in tests], "caption": f"{len(tests)} tests reach it: {_names(tests)}.",
                      "frame": {"flagged": [n["id"] for n in tests]}})
    crates = {n["meta"]["crate"] for n in nodes[1:] if n["meta"]["crate"]}
    summary = (f"Changing `{nodes[0]['label']}` reaches {len(nodes) - 1} symbols in {len(crates)} crates within "
               f"{depth} steps; {len(tests)} of them are tests." + (" (truncated)" if ego["meta"]["truncated"] else ""))
    spec = _spec("blastRadius", question or f"What breaks if we change {nodes[0]['label']}?",
                 f"Blast radius of {nodes[0]['label']}", summary, nodes, edges, steps)
    calls = [{"tool": "find-symbol", "arg": root["qualified_name"], "count": 1, "reveals": [root["id"]]}]
    for ring in range(1, depth + 1):
        if rings.get(ring):
            calls.append({"tool": "callers-of", "arg": f"ring {ring}", "count": len(rings[ring]),
                          "reveals": [n["id"] for n in rings[ring]]})
    return {"spec": spec, "calls": calls, "meta": {"truncated": ego["meta"]["truncated"], "filters": ego["meta"]["filters"]}}


# --------------------------------------------------------------------------- flowTrace

def flow_trace(con, index_path, built_at, repo: str, src_row, dst_row, max_depth: int, context: int,
               question: str | None) -> dict:
    labels = queries.crate_labels(con, repo)
    res = relations.path_between(con, index_path, built_at, repo, src_row, dst_row, kinds=("call",), direction="forward",
                                 max_depth=max_depth, limit=1, include_tests=False, include_noise=False)
    src, dst = res["source"], res["target"]
    if not res["found"]:
        nodes = [symbol_node(src, onPath=False), symbol_node(dst, onPath=False)]
        spec = _spec("flowTrace", question or f"How does {src['display_name']} reach {dst['display_name']}?",
                     f"{src['display_name']} → {dst['display_name']}",
                     f"No call path from `{src['display_name']}` to `{dst['display_name']}` within {max_depth} calls.",
                     nodes, [], [])
        return {"spec": spec, "calls": [], "meta": {"found": False, "filters": res["filters"]}}

    path = res["paths"][0]
    by_id = {n["id"]: n for n in res["graph"]["nodes"]}
    nodes = [symbol_node(by_id[i], onPath=True, order=k) for k, i in enumerate(path["nodes"])]
    edges = [{"from": e["source"], "to": e["target"], "kind": "calls"} for e in path["edges"]]
    on_path = set(path["nodes"])
    for nid in path["nodes"][:-1]:
        extra = con.execute("""SELECT s.*, COUNT(*) n FROM refs r JOIN symbols s ON s.repo = r.repo AND s.id = r.target_symbol_id
                               WHERE r.repo = ? AND r.src_symbol_id = ? AND r.kind = 'call' AND r.is_noise = 0
                               GROUP BY s.id ORDER BY n DESC LIMIT ?""", (repo, nid, context + 3)).fetchall()
        added = 0
        for row in extra:
            if row["id"] in on_path or added >= context:
                continue
            sym = queries._symbol(row, labels)
            if all(n["id"] != sym["id"] for n in nodes):
                nodes.append(symbol_node(sym, onPath=False))
            edges.append({"from": nid, "to": sym["id"], "kind": "calls", "context": True})
            added += 1
    steps = [{"id": "start", "focus": [path["nodes"][0]], "caption": f"Start at `{nodes[0]['label']}`."}]
    for k, e in enumerate(path["edges"], start=1):
        a, b = by_id[e["source"]], by_id[e["target"]]
        steps.append({"id": f"hop-{k}", "focus": [b["id"]],
                      "caption": f"`{a['display_name']}` calls `{b['display_name']}`{_call_site(con, repo, a['id'], b['id'])}.",
                      "frame": {"visited": path["nodes"][:k]}})
    spec = _spec("flowTrace", question or f"How does {src['display_name']} reach {dst['display_name']}?",
                 f"{src['display_name']} → {dst['display_name']}",
                 f"`{src['display_name']}` reaches `{dst['display_name']}` in {path['length']} calls.", nodes, edges, steps)
    calls = [{"tool": "find-symbol", "arg": src["qualified_name"], "count": 1, "reveals": [src["id"]]},
             {"tool": "find-symbol", "arg": dst["qualified_name"], "count": 1, "reveals": [dst["id"]]},
             {"tool": "path-between", "arg": f"{src['display_name']} → {dst['display_name']}", "count": path["length"],
              "reveals": [n["id"] for n in nodes]}]
    return {"spec": spec, "calls": calls, "meta": {"found": True, "filters": res["filters"]}}


# --------------------------------------------------------------------------- swimlane (call tree)

def call_tree(con, repo: str, sym_row, depth: int, max_nodes: int, question: str | None) -> dict:
    ego = queries.ego_graph(con, repo, sym_row["id"], RefFilter(("call",)), depth, "out", max_nodes)
    nodes = [symbol_node(n, lane=n.get("crate_label") or n.get("crate"), depth=n["distance"]) for n in ego["nodes"]]
    edges = [{"from": e["source"], "to": e["target"], "kind": "calls",
              **({"label": f"×{e['count']}"} if e["count"] > 1 else {})} for e in ego["edges"]]
    root = nodes[0]
    steps = [{"id": "root", "focus": [root["id"]], "caption": f"`{root['label']}` in `{root['meta']['lane']}`."}]
    for d in range(1, depth + 1):
        members = [n for n in nodes if n["meta"]["depth"] == d]
        if members:
            lanes = sorted({n["meta"]["lane"] for n in members if n["meta"]["lane"]})
            steps.append({"id": f"depth-{d}", "focus": [n["id"] for n in members],
                          "caption": f"{'Calls' if d == 1 else f'{d} calls deep'}: {_names(members)} across {', '.join(lanes)}.",
                          "frame": {"phase": f"depth {d}"}})
    lanes = sorted({n["meta"]["lane"] for n in nodes if n["meta"]["lane"]})
    spec = _spec("swimlane", question or f"What does {root['label']} call?", f"What {root['label']} calls",
                 f"`{root['label']}` reaches {len(nodes) - 1} functions in {len(lanes)} crates within {depth} calls."
                 + (" (truncated)" if ego["meta"]["truncated"] else ""), nodes, edges, steps)
    calls = [{"tool": "find-symbol", "arg": root["label"], "count": 1, "reveals": [root["id"]]}] + [
        {"tool": "callees-of", "arg": f"depth {d}", "count": len(m), "reveals": [n["id"] for n in m]}
        for d in range(1, depth + 1) if (m := [n for n in nodes if n["meta"]["depth"] == d])]
    return {"spec": spec, "calls": calls, "meta": {"lanes": lanes, "truncated": ego["meta"]["truncated"]}}


# --------------------------------------------------------------------------- schemaMap

def schema_map(con, repo: str, sym_row, question: str | None) -> dict:
    labels = queries.crate_labels(con, repo)
    root = queries._symbol(sym_row, labels)
    nodes = {root["id"]: symbol_node(root, role="subject")}
    edges, step_fields, step_types, step_traits = [], [], [], []

    members = con.execute("""SELECT * FROM symbols WHERE repo = ? AND container_id = ? AND kind IN ('field', 'variant')
                             ORDER BY start_line""", (repo, root["id"])).fetchall()
    for m in members:
        field = queries._symbol(m, labels)
        node = symbol_node(field, role=m["kind"])
        node["label"] = (m["signature"] or m["name"]).rstrip(",").strip()
        nodes[field["id"]] = node
        edges.append({"from": root["id"], "to": field["id"], "kind": "child"})
        step_fields.append(field["id"])
        for t in con.execute("""SELECT DISTINCT s.* FROM refs r JOIN symbols s ON s.repo = r.repo AND s.id = r.target_symbol_id
                                WHERE r.repo = ? AND r.src_symbol_id = ? AND s.kind IN ('struct', 'enum', 'trait', 'type')
                                AND s.id != ?""", (repo, field["id"], root["id"])):
            ty = queries._symbol(t, labels)
            nodes.setdefault(ty["id"], symbol_node(ty, role="field type"))
            edges.append({"from": field["id"], "to": ty["id"], "kind": "imports", "label": "type"})
            if ty["id"] not in step_types:
                step_types.append(ty["id"])

    if root["kind"] == "trait":
        rel = relations.relation(con, repo, sym_row, "implements", limit=40, offset=0, include_tests=False,
                                 include_noise=False, include_external=False)
        for item in rel["items"]:
            if item["symbol"]:
                nodes.setdefault(item["symbol"]["id"], symbol_node(item["symbol"], role="implementor"))
                edges.append({"from": item["symbol"]["id"], "to": root["id"], "kind": "sibling", "label": "impl"})
                step_traits.append(item["symbol"]["id"])
    else:
        rel = relations.relation(con, repo, sym_row, "inherits", limit=40, offset=0, include_tests=False,
                                 include_noise=False, include_external=False)
        for item in rel["items"]:
            if item["symbol"]:
                nid = item["symbol"]["id"]
                nodes.setdefault(nid, symbol_node(item["symbol"], role="trait"))
            else:  # std / third-party trait: drawn without a codeRef
                nid = f"ext:{item['qualified_name']}"
                nodes.setdefault(nid, {"id": nid, "label": item["qualified_name"], "kind": "class",
                                       "meta": {"role": "trait", "external": True}})
            edges.append({"from": root["id"], "to": nid, "kind": "sibling", "label": "impl"})
            step_traits.append(nid)

    node_list = list(nodes.values())
    steps = [{"id": "subject", "focus": [root["id"]], "caption": f"`{root['display_name']}` ({root['kind']})."}]
    if step_fields:
        steps.append({"id": "fields", "focus": step_fields,
                      "caption": f"{len(step_fields)} {'fields' if root['kind'] == 'struct' else 'members'}."})
    if step_types:
        steps.append({"id": "types", "focus": step_types,
                      "caption": f"Field types from this workspace: {_names([nodes[i] for i in step_types])}."})
    if step_traits:
        word = "Implemented by" if root["kind"] == "trait" else "Implements"
        steps.append({"id": "traits", "focus": step_traits,
                      "caption": f"{word} {_names([nodes[i] for i in step_traits])}."})
    summary = (f"`{root['display_name']}` has {len(step_fields)} fields referencing {len(step_types)} workspace types"
               f" and {'is implemented by' if root['kind'] == 'trait' else 'implements'} {len(step_traits)}"
               f" {'types' if root['kind'] == 'trait' else 'traits'}.")
    spec = _spec("schemaMap", question or f"What is {root['display_name']} made of?", f"Shape of {root['display_name']}",
                 summary, node_list, edges, steps)
    calls = [{"tool": "find-symbol", "arg": root["qualified_name"], "count": 1, "reveals": [root["id"]]},
             {"tool": "get-enclosing-context", "arg": root["display_name"], "count": len(step_fields) + len(step_types),
              "reveals": step_fields + step_types},
             {"tool": "symbol-relations", "arg": "implements" if root["kind"] == "trait" else "inherits",
              "count": len(step_traits), "reveals": step_traits}]
    return {"spec": spec, "calls": calls, "meta": {}}

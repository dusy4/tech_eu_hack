"""OpenAPI 3.1 description of the API, served at /api/v1/openapi.json."""
from __future__ import annotations

from .queries import HOTSPOT_METRICS, REF_KINDS, SYMBOL_KINDS, TREE_METRICS
from .relations import RELATIONS
from .tools import SEARCH_KINDS

REF = lambda name: {"$ref": f"#/components/schemas/{name}"}  # noqa: E731
P = lambda name: {"$ref": f"#/components/parameters/{name}"}  # noqa: E731
S = lambda t, **kw: {"type": t, **kw}  # noqa: E731
NULLABLE = lambda schema: {"anyOf": [schema, {"type": "null"}]}  # noqa: E731
ARR = lambda items: {"type": "array", "items": items}  # noqa: E731


def obj(required=(), **props) -> dict:
    out = {"type": "object", "properties": props}
    if required:
        out["required"] = list(required)
    return out


def q(name, schema, description, required=False) -> dict:
    return {"name": name, "in": "query", "required": required, "schema": schema, "description": description}


def ok(schema, description="OK") -> dict:
    return {"200": {"description": description, "content": {"application/json": {"schema": schema}}},
            "400": {"$ref": "#/components/responses/BadRequest"}, "404": {"$ref": "#/components/responses/NotFound"}}


def op(tag, summary, description, params, response, *, symbol=False, tool=None, extra=None) -> dict:
    responses = ok(response)
    if symbol:
        responses["409"] = {"$ref": "#/components/responses/Ambiguous"}
    if extra:
        responses.update(extra)
    out = {"tags": [tag], "summary": summary, "description": description, "parameters": params, "responses": responses}
    if tool:
        out["x-mcp-tool"] = tool
    return out


PARAMETERS = {
    "repo": {"name": "repo", "in": "path", "required": True, "schema": S("string"),
             "description": "Repository name, as listed by `GET /repos` (e.g. `rust-agent-framework`)."},
    "symbol": {"name": "symbol", "in": "path", "required": True, "schema": S("string"),
               "description": "A symbol id (`sym:…`), plain name (`ToolRegistry`), method path (`ToolRegistry::register`) "
                              "or fully qualified name. Resolved with the workbench's resolver; ambiguous names return 409 "
                              "with candidates. URL-encode it."},
    "ref_kinds": q("ref_kinds", S("string", default="call,use"),
                   f"Comma-separated reference kinds to count: {', '.join(REF_KINDS)}."),
    "include_tests": q("include_tests", S("boolean", default=False), "Count references made from test code."),
    "include_noise": q("include_noise", S("boolean", default=False),
                       "Count references the indexer resolved by name only to generic methods (`len`, `clone`, `as_ref`…) "
                       "or to local variables. Usually false positives."),
    "engine": q("engine", S("string", enum=["auto", "workbench", "index"], default="auto"),
                "`workbench` runs the workbench's RyuGraph tool, `index` uses this API's SQLite index, `auto` prefers the "
                "workbench when available. `meta.engine` reports which one answered."),
    "limit": q("limit", S("integer", minimum=1), "Page size."),
    "offset": q("offset", S("integer", minimum=0, default=0), "Items to skip."),
    "question": q("question", S("string"), "Question shown on the view; a default is generated from the inputs."),
}

SCHEMAS = {
    "Error": obj(["error"], error=obj(["status", "code", "message"], status=S("integer"), code=S("string", examples=[
        "not_found", "invalid_parameter", "missing_parameter", "ambiguous_symbol", "engine_unavailable", "route_not_found",
        "internal_error"]), message=S("string"), details=S("object"))),
    "Meta": obj(["engine"], engine=S("string", description="`workbench`, `index`, `tantivy-native` or `index-fts`."),
                workbench_tool=NULLABLE(S("string", description="The toolkit function that answered, when one did.")),
                note=S("string")),
    "Filters": obj(ref_kinds=ARR(S("string")), include_tests=S("boolean"), include_noise=S("boolean")),
    "Symbol": obj(
        ["id", "name", "qualified_name", "kind"],
        id=S("string", examples=["sym:79fd56329bce4062"]), name=S("string"),
        qualified_name=S("string", examples=["rust_agent_workflow::builder::workflow_builder::WorkflowBuilder::add_node"]),
        display_name=S("string", description="Last two path segments, e.g. `WorkflowBuilder::add_node`."),
        kind=S("string", enum=list(SYMBOL_KINDS)), crate=NULLABLE(S("string")), crate_label=NULLABLE(S("string")),
        module_path=NULLABLE(S("string")), path=NULLABLE(S("string")), line=NULLABLE(S("integer")),
        end_line=NULLABLE(S("integer")), visibility=NULLABLE(S("string")), is_public=S("boolean"),
        is_test=S("boolean"), signature=NULLABLE(S("string"))),
    "Page": obj(["items", "total"], items=ARR({}), total=S("integer"), limit=S("integer"), offset=S("integer")),
    "Location": obj(path=S("string"), line=NULLABLE(S("integer"))),
    "RelatedSymbol": obj(
        ["qualified_name", "resolved", "count"], symbol=NULLABLE(REF("Symbol")), qualified_name=S("string"),
        kind=NULLABLE(S("string")), resolved=S("boolean", description="False for std/third-party targets."),
        count=S("integer", description="Reference sites (calls, reads…) behind this relation."),
        locations=ARR(REF("Location")), ref_kind=S("string"), impl=REF("Symbol"), via=S("string"),
        edge_type=S("string"), direction=S("string")),
    "TargetRef": obj(name=S("string"), qualified_name=NULLABLE(S("string")), symbol_id=NULLABLE(S("string")),
                     kind=NULLABLE(S("string"))),
    "Statement": obj(id=S("string"), line=S("integer"), end_line=S("integer"), kind=S("string"), text=S("string"),
                     nesting_depth=S("integer"), parent_id=NULLABLE(S("string")), previous_id=NULLABLE(S("string")),
                     calls=ARR(REF("TargetRef")), reads=ARR(REF("TargetRef")), writes=ARR(REF("TargetRef")),
                     defines=ARR(REF("TargetRef"))),
    "GraphEdge": obj(["id", "source", "target"], id=S("string"), source=S("string"), target=S("string"),
                     weight=S("integer"), calls=S("integer"), uses=S("integer"), count=S("integer")),
    "CrateNode": obj(["id", "label", "layer"], id=S("string", examples=["rust-agent-core"]), label=S("string", examples=["core"]),
                     root_path=S("string"), layer=S("integer", description="Longest dependency chain below it; 0 = foundation."),
                     files=S("integer"), symbols=S("integer"), public_symbols=S("integer"), test_symbols=S("integer"),
                     fan_in=S("integer"), fan_out=S("integer"), weighted_in=S("integer"), weighted_out=S("integer")),
    "TopTarget": obj(symbol_id=NULLABLE(S("string")), qualified_name=S("string"), display_name=S("string"), count=S("integer")),
    "CrateEdge": {"allOf": [REF("GraphEdge"), obj(top_targets=ARR(REF("TopTarget")))]},
    "CrateGraph": obj(["nodes", "edges", "meta"], nodes=ARR(REF("CrateNode")), edges=ARR(REF("CrateEdge")),
                      meta=obj(directed=S("boolean"), edge_direction=S("string"), layer_count=S("integer"),
                               cycles=ARR(ARR(S("string"))), filters=REF("Filters"))),
    "CrateMatrix": obj(crates=ARR(S("string")), labels=ARR(S("string")), metric=S("string"),
                       values=ARR(ARR(S("integer"))), row_meaning=S("string")),
    "ModuleGraph": obj(nodes=ARR(obj(id=S("string"), label=S("string"), crate=S("string"), crate_label=S("string"),
                                     depth=S("integer"), symbols=S("integer"))),
                       edges=ARR({"allOf": [REF("GraphEdge"), obj(cross_crate=S("boolean"))]}), meta=S("object")),
    "EgoGraph": obj(nodes=ARR({"allOf": [REF("Symbol"), obj(distance=S("integer"), is_root=S("boolean"))]}),
                    edges=ARR(REF("GraphEdge")), meta=obj(root=S("string"), truncated=S("boolean"), filters=S("object"))),
    "TreeNode": obj(["name", "path", "type", "value"], name=S("string"), path=S("string"),
                    type=S("string", enum=["directory", "file"]), depth=S("integer"), value=S("integer"),
                    files=S("integer"), symbols=S("integer"), bytes=S("integer"), language=S("string"), crate=S("string"),
                    children=ARR(REF("TreeNode")), collapsed_children=S("integer")),
    "ViewSpec": obj(
        ["id", "archetype", "question", "title", "summary", "nodes", "edges", "steps", "sources"],
        id=S("string"), archetype=S("string", enum=["archMap", "blastRadius", "flowTrace", "swimlane", "schemaMap"]),
        question=S("string"), title=S("string"), summary=S("string"),
        nodes=ARR(obj(["id", "label", "kind"], id=S("string"), label=S("string"),
                      kind=S("string", enum=["fn", "class", "file", "module", "test", "state", "fiber"]),
                      codeRef=obj(file=S("string"), symbol=S("string"), lines=ARR(S("integer"))), meta=S("object"))),
        edges=ARR(obj(["from", "to", "kind"], **{"from": S("string")}, to=S("string"),
                      kind=S("string", enum=["calls", "imports", "transition", "impacts", "child", "sibling"]),
                      label=S("string"), context=S("boolean"))),
        steps=ARR(obj(id=S("string"), focus=ARR(S("string")), caption=S("string"),
                      frame=obj(visited=ARR(S("string")), flagged=ARR(S("string")), skipped=ARR(S("string")),
                                phase=S("string")))),
        sources=ARR(obj(file=S("string"), symbol=S("string")))),
    "Recording": obj(["spec", "calls"], spec=REF("ViewSpec"),
                     calls=ARR(obj(tool=S("string"), arg=S("string"), count=S("integer"), reveals=ARR(S("string")))),
                     meta=S("object")),
    "Handoff": obj(id=S("string"), status=S("string", enum=["open", "in_progress", "done", "dismissed"]), repo=S("string"),
                   created_at=S("string"), updated_at=S("string"), source=S("string"), answer=S("object"),
                   proposals=ARR(S("object")), history=ARR(S("object")), instructions=S("string")),
    "ProposalBatch": obj(["repo", "proposals"], repo=S("string"), answer=obj(id=S("string"), title=S("string"), asked=S("string")),
                         proposals=ARR(obj(["action"], title=S("string"), why=S("string"), said=S("string"),
                                           action=obj(["kind"], kind=S("string", enum=["focus", "ask"]),
                                                      nodeId=S("string"), question=S("string"))))),
}

RESPONSES = {
    "BadRequest": {"description": "Invalid or missing parameter.", "content": {"application/json": {"schema": REF("Error")}}},
    "NotFound": {"description": "Unknown repo, symbol, crate, file or path.", "content": {"application/json": {"schema": REF("Error")}}},
    "Ambiguous": {"description": "The symbol name matches several symbols; `error.details.candidates` lists them.",
                  "content": {"application/json": {"schema": REF("Error")}}},
}

R, SYM = P("repo"), P("symbol")
FILTERS = [P("ref_kinds"), P("include_tests"), P("include_noise")]
PAGE = lambda items: {"allOf": [REF("Page"), obj(items=ARR(items))]}  # noqa: E731
RECORDING = REF("Recording")

PATHS = {
    "/api/v1/health": {"get": op("Service", "Health and engines", "Index location and build time, and which engine serves "
                                 "graph and search tools on this machine.", [], obj(ok=S("boolean"), repos=ARR(S("string")),
                                 index=S("object"), data_dir=S("string"), engines=S("object")))},
    "/api/v1/repos": {"get": op("MCP tools", "List repositories", "Indexed repos with counts and which artifacts exist.",
                                [], PAGE(S("object")), tool="list_repos")},
    "/api/v1/repos/{repo}": {"get": op("MCP tools", "Repository overview",
                                       "Totals, language mix, symbol kinds, plus the workbench's project summary "
                                       "(`project`: focus, source roots, entrypoints).", [R], S("object"), tool="repo_overview")},
    "/api/v1/repos/{repo}/summary": {"get": op("MCP tools", "Summarize a path", "The workbench summary for a directory or file.",
                                               [R, q("path", S("string", default="."), "Directory or file path.")],
                                               obj(repo=S("string"), path=S("string"), kind=S("string"), summary=S("object"),
                                                   meta=REF("Meta")), tool="summarize_path")},
    "/api/v1/repos/{repo}/search": {"get": op(
        "MCP tools", "Search code", "Ranked keyword search over files, symbols, bodies, docs and statements, ranked by the "
        "workbench's reranker. Uses the native Tantivy worker when `cargo` is available, otherwise SQLite FTS5 over the same "
        "documents.", [R, q("q", S("string"), "Query text.", True),
                       q("kinds", S("string"), f"Comma-separated: {', '.join(SEARCH_KINDS)}."),
                       q("path_prefix", S("string"), "Only results under this path."), {**P("limit")}],
        obj(query=S("string"), items=ARR(obj(kind=S("string"), symbol_id=NULLABLE(S("string")), name=S("string"),
            qualified_name=NULLABLE(S("string")), display_name=NULLABLE(S("string")), path=S("string"), line=NULLABLE(S("integer")),
            symbol_kind=NULLABLE(S("string")), crate=NULLABLE(S("string")), title=S("string"), preview=S("string"),
            score=S("number"))), total=S("integer"), meta=REF("Meta")), tool="search_code")},
    "/api/v1/repos/{repo}/symbols/find": {"get": op(
        "MCP tools", "Find symbol definitions", "Where a name or qualified name is defined (exact matches from LMDB).",
        [R, q("name", S("string"), "Name or qualified name.", True), P("limit")], PAGE(REF("Symbol")), tool="find_symbol")},
    "/api/v1/repos/{repo}/files/find": {"get": op(
        "MCP tools", "Find files", "Files by exact path, prefix, or fuzzy path search.",
        [R, q("pattern", S("string"), "Partial path.", True), P("limit")],
        PAGE(obj(path=S("string"), kind=S("string"), language=S("string"), crate=S("string"), module_path=S("string"),
                 score=S("number"))), tool="find_file")},
    "/api/v1/repos/{repo}/symbols/{symbol}/body": {"get": op(
        "MCP tools", "Symbol source", "Code of a function or type. `code_kind` is `source` when WORKBENCH_WORKSPACE points at "
        "the checkout, else `statements` (the indexed statement lines).", [R, SYM],
        obj(symbol=REF("Symbol"), code=S("string"), code_kind=S("string", enum=["source", "statements"]),
            lines=ARR(obj(line=S("integer"), text=S("string"))), preview=S("string"), body_kind=S("string"), meta=REF("Meta")),
        symbol=True, tool="get_symbol_body")},
    "/api/v1/repos/{repo}/symbols/{symbol}/context": {"get": op(
        "MCP tools", "Enclosing context", "Container, siblings, members, file summary and the first statements.",
        [R, SYM, P("engine")], obj(symbol=REF("Symbol"), container=NULLABLE(REF("Symbol")), siblings=ARR(REF("Symbol")),
                                   members=ARR(REF("Symbol")), file=S("object"), statement_slice=ARR(REF("Statement")),
                                   meta=REF("Meta")), symbol=True, tool="get_enclosing_context")},
    "/api/v1/repos/{repo}/symbols/{symbol}/relations/{relation}": {"get": op(
        "MCP tools", "Follow the code graph",
        "callers / callees (calls), refs (calls and uses from the symbol), imports (files that `use` it), reads / writes "
        "(fields and variables its statements touch), implements (types implementing a trait), inherits (a trait's "
        "supertraits; for a type, the traits it implements). Test callers are included by default.",
        [R, SYM, {"name": "relation", "in": "path", "required": True, "schema": S("string", enum=list(RELATIONS))},
         P("limit"), P("offset"), q("include_tests", S("boolean", default=True), "Include references from tests."),
         P("include_noise"), q("include_external", S("boolean", default=False), "Include unresolved std/third-party targets."),
         P("engine")],
        {"allOf": [PAGE(REF("RelatedSymbol")), obj(symbol=REF("Symbol"), relation=S("string"), meta=REF("Meta"))]},
        symbol=True, tool="symbol_relations")},
    "/api/v1/repos/{repo}/symbols/{symbol}/statements": {"get": op(
        "MCP tools", "Statement slice", "Statements of a function in order, with what each calls, reads, writes and defines.",
        [R, SYM, P("limit"), P("offset"), P("engine")],
        obj(symbol=REF("Symbol"), statements=ARR(REF("Statement")), total=S("integer"), meta=REF("Meta")),
        symbol=True, tool="statement_slice")},
    "/api/v1/repos/{repo}/paths": {"get": op(
        "MCP tools", "Path between two symbols", "Shortest reference paths from `source` to `target` (all shortest paths, "
        "up to `limit`), plus their union as a node-link `graph`.",
        [R, q("source", S("string"), "Start symbol.", True), q("target", S("string"), "End symbol.", True),
         q("ref_kinds", S("string", default="call"), "Edge kinds to follow."),
         q("direction", S("string", enum=["forward", "both"], default="forward"),
           "`forward` follows references from caller to callee; `both` also walks them backwards."),
         q("max_depth", S("integer", default=8, maximum=12), "Longest path searched."), P("limit"),
         P("include_tests"), P("include_noise"), P("engine")],
        obj(source=REF("Symbol"), target=REF("Symbol"), found=S("boolean"), length=NULLABLE(S("integer")),
            paths=ARR(obj(length=S("integer"), nodes=ARR(S("string")), edges=ARR(REF("GraphEdge")))),
            graph=obj(nodes=ARR(REF("Symbol")), edges=ARR(REF("GraphEdge"))), meta=REF("Meta")),
        symbol=True, tool="path_between")},
    "/api/v1/repos/{repo}/answer-bundle": {"post": {
        "tags": ["MCP tools"], "summary": "Answer bundle", "x-mcp-tool": "prepare_answer_bundle",
        "description": "Evidence for a broad question. With RyuGraph, the workbench's own bundle under `bundle`; otherwise "
                       "a simpler bundle (search hits with callers, callees and file summaries).",
        "parameters": [R],
        "requestBody": {"required": True, "content": {"application/json": {"schema": obj(
            ["question"], question=S("string"), limit=S("integer", default=8, maximum=20),
            engine=S("string", enum=["auto", "workbench", "index"]))}}},
        "responses": ok(S("object"))}},

    "/api/v1/repos/{repo}/symbols": {"get": op(
        "Browse", "List and filter symbols", "Paged symbol table. Locals are excluded unless `kinds` asks for them.",
        [R, q("q", S("string"), "Substring of name or qualified name."), q("kinds", S("string"), "Comma-separated symbol kinds."),
         q("crate", S("string"), "Crate id."), q("path_prefix", S("string"), "Path prefix."),
         q("public_only", S("boolean", default=False), "Only `pub` symbols."), P("include_tests"),
         q("sort", S("string", enum=["relevance", "name", "references", "location"], default="relevance"), "Order."),
         P("limit"), P("offset")],
        PAGE({"allOf": [REF("Symbol"), obj(references_in=S("integer"))]}))},
    "/api/v1/repos/{repo}/symbols/{symbol}": {"get": op(
        "Browse", "Symbol detail", "Symbol with docstring, container, members, reference counts, top callers and callees, "
        "and implementors (traits) or implemented traits (types).", [R, SYM, *FILTERS, P("limit")], S("object"), symbol=True)},
    "/api/v1/repos/{repo}/crates": {"get": op(
        "Browse", "List crates", "Every crate with size, symbol-kind counts, layer and fan-in/out.", [R, *FILTERS],
        PAGE({"allOf": [REF("CrateNode"), obj(kinds=S("object"), module_root=S("string"), bytes=S("integer"))]}))},
    "/api/v1/repos/{repo}/crates/{crate}": {"get": op(
        "Browse", "Crate detail", "Stats, dependencies, dependents (with the symbols that cross each boundary) and modules.",
        [R, {"name": "crate", "in": "path", "required": True, "schema": S("string")}, *FILTERS], S("object"))},
    "/api/v1/repos/{repo}/files": {"get": op(
        "Browse", "List files", "Paged file list with symbol counts.",
        [R, q("crate", S("string"), "Crate id."), q("language", S("string"), "e.g. Rust, Markdown."),
         q("path_prefix", S("string"), "Path prefix."), q("sort", S("string", enum=["path", "size", "symbols"]), "Order."),
         P("limit"), P("offset")], PAGE(S("object")))},
    "/api/v1/repos/{repo}/files/{path}": {"get": op(
        "Browse", "File detail", "File info, nested symbol outline, and the crates its code depends on.",
        [R, {"name": "path", "in": "path", "required": True, "schema": S("string"), "description": "File path (slashes allowed)."},
         q("include_locals", S("boolean", default=False), "Include local variables in the outline."), *FILTERS], S("object"))},
    "/api/v1/repos/{repo}/tree": {"get": op(
        "Diagrams", "File tree (treemap / sunburst)", "Nested directories and files; `value` is the chosen metric and every "
        "node also carries files, symbols and bytes.",
        [R, q("root", S("string"), "Subtree root path."), q("depth", S("integer", minimum=1), "Collapse below this depth."),
         q("metric", S("string", enum=list(TREE_METRICS), default="symbols"), "What `value` measures.")], REF("TreeNode"))},
    "/api/v1/repos/{repo}/hotspots": {"get": op(
        "Diagrams", "Hotspots (bar charts)", "Symbols ranked by how much code references them.",
        [R, q("metric", S("string", enum=list(HOTSPOT_METRICS), default="references"),
              "references = sites, files = distinct files, crates = distinct crates, external_crates = other crates only."),
         q("kinds", S("string", default="function,method"), "Symbol kinds to rank, e.g. `struct,enum,trait,type`."),
         q("crate", S("string"), "Only symbols defined in this crate."), *FILTERS, P("limit"), P("offset")],
        PAGE({"allOf": [REF("Symbol"), obj(value=S("integer"), metrics=S("object"), calls=S("integer"), uses=S("integer"),
                                           from_crates=ARR(S("string")))]}))},
    "/api/v1/repos/{repo}/traits": {"get": op(
        "Diagrams", "Traits and implementors", "Traits ranked by implementation count (std traits hidden by default).",
        [R, q("include_std", S("boolean", default=False), "Include Default, Clone, Debug…"), q("crate", S("string"),
          "Only impls in this crate."), P("limit")], PAGE(S("object")))},
    "/api/v1/repos/{repo}/graphs/crates": {"get": op(
        "Diagrams", "Crate dependency graph", "Node-link graph of crates; edge = source depends on target, weighted by "
        "references, with layers for a layered layout.",
        [R, *FILTERS, q("min_weight", S("integer", default=1), "Drop lighter edges."),
         q("top_targets", S("integer", default=5), "Most-referenced symbols listed per edge.")], REF("CrateGraph"))},
    "/api/v1/repos/{repo}/graphs/crates/matrix": {"get": op(
        "Diagrams", "Crate matrix (chord / heatmap)", "Square matrix in layer order; row depends on column.",
        [R, *FILTERS, q("metric", S("string", enum=["weight", "calls", "uses"], default="weight"), "Cell value.")],
        REF("CrateMatrix"))},
    "/api/v1/repos/{repo}/graphs/modules": {"get": op(
        "Diagrams", "Module dependency graph", "Module-level node-link graph; collapse paths with `depth`.",
        [R, *FILTERS, q("crate", S("string"), "Focus on one crate."),
         q("scope", S("string", enum=["touching", "internal"], default="touching"),
           "`internal`: edges inside the crate; `touching`: any edge with an end in it."),
         q("depth", S("integer"), "Keep this many path segments (2 = `rust_agent_core::tool`)."),
         q("min_weight", S("integer", default=1), "Drop lighter edges.")], REF("ModuleGraph"))},
    "/api/v1/repos/{repo}/graphs/symbols/{symbol}": {"get": op(
        "Diagrams", "Symbol neighbourhood (call graph)", "Ego graph around a symbol, breadth-first up to `depth` hops.",
        [R, SYM, q("ref_kinds", S("string", default="call"), "Edge kinds."), P("include_tests"), P("include_noise"),
         q("depth", S("integer", default=1, maximum=4), "Hops."),
         q("direction", S("string", enum=["in", "out", "both"], default="both"), "Callers, callees or both."),
         q("max_nodes", S("integer", default=150), "Node cap; `meta.truncated` says when it was hit.")],
        REF("EgoGraph"), symbol=True)},
}

VIEW_DOCS = {
    "arch-map": ("archMap: crates by layer", [q("min_weight", S("integer", default=1), "Drop lighter edges."), *FILTERS]),
    "blast-radius": ("blastRadius: what depends on a symbol", [
        q("symbol", S("string"), "Symbol to change.", True), q("depth", S("integer", default=2, maximum=4), "Rings."),
        q("max_nodes", S("integer", default=60), "Node cap."), q("include_tests", S("boolean", default=True), "Show tests.")]),
    "flow-trace": ("flowTrace: how one symbol reaches another", [
        q("source", S("string"), "Start symbol.", True), q("target", S("string"), "End symbol.", True),
        q("max_depth", S("integer", default=8), "Longest path."), q("context", S("integer", default=2),
                                                                  "Off-path callees shown per hop.")]),
    "call-tree": ("swimlane: what a function calls, by crate", [
        q("symbol", S("string"), "Root function.", True), q("depth", S("integer", default=2, maximum=4), "Call depth."),
        q("max_nodes", S("integer", default=60), "Node cap.")]),
    "schema-map": ("schemaMap: a type's fields, field types and traits", [q("symbol", S("string"), "Struct, enum or trait.", True)]),
}
for name, (summary, params) in VIEW_DOCS.items():
    PATHS[f"/api/v1/repos/{{repo}}/views/{name}"] = {"get": op(
        "Views (ViewSpec)", summary, "Returns a Spelunk `Recording`: a `ViewSpec` (app/src/data/types.ts) plus the tool calls "
        "that revealed its nodes.", [R, *params, P("question")], RECORDING, symbol=name != "arch-map")}

PATHS.update({
    "/api/v1/handoffs": {
        "get": op("Handoffs", "List handoffs", "Newest first. `status` defaults to `open`; pass `status=` for all.",
                  [q("repo", S("string"), "Repo."), q("status", S("string", default="open"), "Status filter."), P("limit")],
                  PAGE(S("object")), tool="list_handoffs"),
        "post": {"tags": ["Handoffs"], "summary": "Publish a handoff", "x-mcp-tool": "publish_handoff",
                 "description": "Stores a ProposalBatch; focus decisions get `code_ref` resolved from the index.",
                 "requestBody": {"required": True, "content": {"application/json": {"schema": REF("ProposalBatch")}}},
                 "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": REF("Handoff")}}},
                               "400": {"$ref": "#/components/responses/BadRequest"}}}},
    "/api/v1/handoffs/{id}": {
        "get": op("Handoffs", "Get a handoff", "Full document plus `instructions` markdown.",
                  [{"name": "id", "in": "path", "required": True, "schema": S("string")}], REF("Handoff"), tool="get_handoff"),
        "patch": {"tags": ["Handoffs"], "summary": "Update handoff status", "x-mcp-tool": "update_handoff_status",
                  "parameters": [{"name": "id", "in": "path", "required": True, "schema": S("string")}],
                  "requestBody": {"required": True, "content": {"application/json": {"schema": obj(
                      ["status"], status=S("string", enum=["open", "in_progress", "done", "dismissed"]), note=S("string"))}}},
                  "responses": ok(REF("Handoff"))}},
})


def spec(server_url: str) -> dict:
    return {
        "openapi": "3.1.0",
        "info": {"title": "repo-graph-api", "version": "1.0.0",
                 "description": "Code-graph data for diagram frontends, over repo-analysis-workbench. See docs/API.md."},
        "servers": [{"url": server_url}],
        "tags": [{"name": "Service"}, {"name": "MCP tools", "description": "The MCP server's tools as REST."},
                 {"name": "Browse"}, {"name": "Diagrams"}, {"name": "Views (ViewSpec)"}, {"name": "Handoffs"}],
        "paths": PATHS,
        "components": {"schemas": SCHEMAS, "parameters": PARAMETERS, "responses": RESPONSES},
    }

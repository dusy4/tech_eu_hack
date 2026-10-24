"""Call every endpoint once against the configured index and print status, size and a gist.

    python scripts/smoke.py [repo]
"""
import json
import sys
import time
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from repo_graph_api import create_app  # noqa: E402

app = create_app()
client = app.test_client()
repo = sys.argv[1] if len(sys.argv) > 1 else client.get("/api/v1/repos").get_json()["items"][0]["name"]
B = f"/api/v1/repos/{repo}"
add_node = quote("WorkflowBuilder::add_node")

CALLS = [
    ("GET", "/api/v1/health"), ("GET", "/api/v1/repos"), ("GET", B), ("GET", f"{B}/summary?path=crates/core"),
    ("GET", f"{B}/search?q=tool%20approval&limit=5"), ("GET", f"{B}/symbols/find?name=ToolRegistry"),
    ("GET", f"{B}/files/find?pattern=crates/core/src"), ("GET", f"{B}/symbols/{add_node}/body"),
    ("GET", f"{B}/symbols/{add_node}/context"),
    *[("GET", f"{B}/symbols/{s}/relations/{r}?limit=5") for s, r in [
        (add_node, "callers"), (add_node, "callees"), ("ToolRegistry", "imports"), (add_node, "refs"),
        (add_node, "reads"), (add_node, "writes"), ("IExecutor", "implements"), ("ToolRegistry", "inherits")]],
    ("GET", f"{B}/symbols/{add_node}/statements?limit=5"),
    ("GET", f"{B}/paths?source=rust_agent_cli::main&target={quote('DeclAgentBuilder::build')}"),
    ("POST", f"{B}/answer-bundle", {"question": "How does human-in-the-loop tool approval work?", "limit": 4}),
    ("GET", f"{B}/symbols?q=Builder&kinds=struct&limit=5"), ("GET", f"{B}/symbols/ToolRegistry"),
    ("GET", f"{B}/crates"), ("GET", f"{B}/crates/rust-agent-core"), ("GET", f"{B}/files?crate=rust-agent-core&sort=symbols&limit=5"),
    ("GET", f"{B}/files/crates/core/src/tool.rs"), ("GET", f"{B}/tree?depth=2"), ("GET", f"{B}/hotspots?limit=5"),
    ("GET", f"{B}/hotspots?metric=external_crates&kinds=struct,enum,trait,type&limit=5"), ("GET", f"{B}/traits?limit=5"),
    ("GET", f"{B}/graphs/crates"), ("GET", f"{B}/graphs/crates/matrix"), ("GET", f"{B}/graphs/modules?depth=2&min_weight=20"),
    ("GET", f"{B}/graphs/symbols/{add_node}?depth=2&max_nodes=40"),
    ("GET", f"{B}/views/arch-map"), ("GET", f"{B}/views/blast-radius?symbol=ApprovalRequiredTool"),
    ("GET", f"{B}/views/flow-trace?source=rust_agent_cli::main&target={quote('DeclAgentBuilder::build')}"),
    ("GET", f"{B}/views/call-tree?symbol={quote('DeclAgentBuilder::build')}"), ("GET", f"{B}/views/schema-map?symbol=ToolRegistry"),
    ("GET", "/api/v1/handoffs?status="), ("GET", "/api/v1/openapi.json"),
    # errors
    ("GET", f"{B}/symbols/build/body"), ("GET", f"{B}/symbols/NoSuchThing/body"), ("GET", f"{B}/hotspots?metric=bogus"),
    ("GET", "/api/v1/repos/nope"), ("GET", "/api/v1/nope"),
    # compat (bridge + MCP HTTP)
    ("GET", "/health"), ("POST", "/search-code", {"query": "tool approval", "k": 3}),
    ("POST", "/find-symbol", {"name": "ApprovalRequiredTool"}), ("POST", "/callers-of", {"name": "WorkflowBuilder::add_node"}),
    ("GET", "/handoffs"),
]


def gist(body):
    if isinstance(body, list):
        return f"list[{len(body)}] {json.dumps(body[:2], ensure_ascii=False)[:150]}"
    if not isinstance(body, dict):
        return str(body)[:150]
    if "error" in body:
        return f"error {json.dumps(body['error'], ensure_ascii=False)[:180]}"
    parts = []
    for key in ("total", "found", "length"):
        if key in body:
            parts.append(f"{key}={body[key]}")
    for key in ("items", "nodes", "edges", "statements", "paths", "symbols"):
        if isinstance(body.get(key), list):
            parts.append(f"{key}={len(body[key])}")
    if "spec" in body:
        s = body["spec"]
        parts.append(f"{s['archetype']} nodes={len(s['nodes'])} edges={len(s['edges'])} steps={len(s['steps'])}: {s['summary'][:90]}")
    if "meta" in body and isinstance(body["meta"], dict) and "engine" in body["meta"]:
        parts.append(f"engine={body['meta']['engine']}")
    return " ".join(parts) or f"keys={list(body)[:8]}"


failures = 0
for call in CALLS:
    method, url, payload = (call + (None,))[:3]
    t = time.time()
    resp = client.open(url, method=method, json=payload)
    ms = (time.time() - t) * 1000
    body = resp.get_json(silent=True)
    expected_error = any(x in url for x in ("/symbols/build/", "NoSuchThing", "bogus", "/repos/nope", "/api/v1/nope"))
    status_ok = (resp.status_code >= 400) == expected_error
    failures += not status_ok
    print(f"{'ok ' if status_ok else 'BAD'} {resp.status_code} {ms:7.0f}ms {len(resp.data):>8,}B  {method} {url[:95]}")
    print(f"      {gist(body)}")
print(f"\n{len(CALLS) - failures}/{len(CALLS)} behaved as expected")
sys.exit(1 if failures else 0)

"""Print the figures quoted in docs/API.md, so they can be checked against the current index."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from repo_graph_api import create_app  # noqa: E402

c = create_app().test_client()
repo = c.get("/api/v1/repos").get_json()["items"][0]["name"]
g = c.get(f"/api/v1/repos/{repo}/graphs/crates").get_json()
core = next(n for n in g["nodes"] if n["fan_out"] == 0 and n["fan_in"] == max(x["fan_in"] for x in g["nodes"]))
print("core node:", json.dumps(core))
tree = c.get(f"/api/v1/repos/{repo}/tree?depth=1").get_json()
print("tree root:", {k: tree[k] for k in ("files", "symbols", "bytes")})
o = c.get(f"/api/v1/repos/{repo}").get_json()["totals"]["references"]
print("references:", o, f"resolved share {o['resolved'] / o['total']:.1%}")

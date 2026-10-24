"""Print one endpoint's JSON response (trimmed), for eyeballing and for the docs' examples.

    python scripts/show.py GET "/api/v1/repos/<repo>/graphs/crates" [max_chars] [json-body]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from repo_graph_api import create_app  # noqa: E402


def trim(value, depth=0, max_list=3):
    if isinstance(value, dict):
        return {k: trim(v, depth + 1, max_list) for k, v in value.items()}
    if isinstance(value, list):
        out = [trim(v, depth + 1, max_list) for v in value[:max_list]]
        if len(value) > max_list:
            out.append(f"… {len(value) - max_list} more")
        return out
    if isinstance(value, str) and len(value) > 160:
        return value[:157] + "…"
    return value


method, url = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 4000
payload = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
resp = create_app().test_client().open(url, method=method, json=payload)
print(resp.status_code)
print(json.dumps(trim(resp.get_json()), indent=2, ensure_ascii=False)[:limit])

"""Contract tests against a built index (skipped when none is configured).

    python -m unittest discover -s tests -v
"""
import os
import sys
import unittest
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
INDEX = Path(os.environ.get("REPO_GRAPH_INDEX", ROOT / "instance" / "repo_graph.sqlite"))


@unittest.skipUnless(INDEX.exists(), f"no index at {INDEX}; build one with python -m repo_graph_api.indexer")
class ApiContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from repo_graph_api import create_app

        cls.client = create_app().test_client()
        cls.repo = cls.client.get("/api/v1/repos").get_json()["items"][0]["name"]
        cls.base = f"/api/v1/repos/{cls.repo}"

    def get(self, url, status=200):
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status, resp.get_data(as_text=True)[:500])
        return resp.get_json()

    # --- service -----------------------------------------------------------------------
    def test_health_reports_engines(self):
        body = self.get("/api/v1/health")
        self.assertTrue(body["ok"])
        self.assertIn(body["engines"]["graph"]["engine"], ("ryugraph", "index"))
        self.assertIn(body["engines"]["search"]["engine"], ("tantivy-native", "index-fts"))

    def test_openapi_lists_every_route(self):
        spec = self.get("/api/v1/openapi.json")
        documented = set(spec["paths"])
        for rule in self.client.application.url_map.iter_rules():
            if rule.rule.startswith("/api/v1/") and rule.rule != "/api/v1/openapi.json":
                path = rule.rule.replace("<path:file_path>", "{path}").replace("<", "{").replace(">", "}")
                path = path.replace("{handoff_id}", "{id}").replace("{archetype}", "arch-map")
                self.assertIn(path, documented, f"{rule.rule} is missing from openapi.json")

    # --- errors --------------------------------------------------------------------------
    def test_error_envelope(self):
        for url, status, code in [(f"{self.base}/symbols/NoSuchSymbolAnywhere", 404, "not_found"),
                                  (f"{self.base}/hotspots?metric=bogus", 400, "invalid_parameter"),
                                  (f"{self.base}/search", 400, "missing_parameter"),
                                  ("/api/v1/repos/does-not-exist", 404, "not_found"),
                                  ("/api/v1/nowhere", 404, "route_not_found")]:
            err = self.get(url, status)["error"]
            self.assertEqual((err["status"], err["code"]), (status, code), url)

    def test_ambiguous_symbol_returns_candidates(self):
        err = self.get(f"{self.base}/symbols/build/body", 409)["error"]
        self.assertEqual(err["code"], "ambiguous_symbol")
        self.assertGreater(len(err["details"]["candidates"]), 1)
        sid = err["details"]["candidates"][0]["id"]
        self.assertEqual(self.get(f"{self.base}/symbols/{quote(sid)}/body")["symbol"]["id"], sid)

    # --- MCP tools -----------------------------------------------------------------------
    def test_search_and_find(self):
        hits = self.get(f"{self.base}/search?q=tool%20approval&limit=5")["items"]
        self.assertTrue(hits and all("score" in h for h in hits))
        self.assertEqual(self.get(f"{self.base}/symbols/find?name=ToolRegistry")["items"][0]["kind"], "struct")

    def test_relations_shape(self):
        body = self.get(f"{self.base}/symbols/{quote('WorkflowBuilder::add_node')}/relations/callers?limit=3")
        self.assertEqual(body["relation"], "callers")
        self.assertGreater(body["total"], 3)
        for item in body["items"]:
            self.assertTrue(item["resolved"])
            self.assertGreaterEqual(item["count"], 1)
            self.assertTrue(item["locations"])

    def test_path_between(self):
        body = self.get(f"{self.base}/paths?source=rust_agent_cli::main&target={quote('DeclAgentBuilder::build')}")
        self.assertTrue(body["found"])
        path = body["paths"][0]
        self.assertEqual(path["nodes"][0], body["source"]["id"])
        self.assertEqual(path["nodes"][-1], body["target"]["id"])
        self.assertEqual(len(path["edges"]), path["length"])

    # --- diagrams ------------------------------------------------------------------------
    def test_crate_graph_layers_follow_edges(self):
        g = self.get(f"{self.base}/graphs/crates")
        layer = {n["id"]: n["layer"] for n in g["nodes"]}
        if not g["meta"]["cycles"]:
            for e in g["edges"]:
                self.assertGreater(layer[e["source"]], layer[e["target"]], e["id"])

    def test_matrix_matches_graph(self):
        g = self.get(f"{self.base}/graphs/crates")
        m = self.get(f"{self.base}/graphs/crates/matrix")
        self.assertEqual(sum(map(sum, m["values"])), sum(e["weight"] for e in g["edges"]))

    def test_tree_values_add_up(self):
        tree = self.get(f"{self.base}/tree?metric=files")
        self.assertEqual(tree["value"], sum(c["value"] for c in tree["children"]))

    def test_hotspots_sorted(self):
        values = [i["value"] for i in self.get(f"{self.base}/hotspots?limit=20")["items"]]
        self.assertEqual(values, sorted(values, reverse=True))

    # --- views -----------------------------------------------------------------------------
    def assert_valid_viewspec(self, recording):
        spec = recording["spec"]
        ids = {n["id"] for n in spec["nodes"]}
        self.assertEqual(len(ids), len(spec["nodes"]), "duplicate node ids")
        for e in spec["edges"]:
            self.assertIn(e["from"], ids)
            self.assertIn(e["to"], ids)
        for s in spec["steps"]:
            self.assertTrue(set(s["focus"]) <= ids, s["id"])
        for c in recording["calls"]:
            self.assertTrue(set(c["reveals"]) <= ids, c["tool"])
        for n in spec["nodes"]:
            self.assertIn(n["kind"], ("fn", "class", "file", "module", "test", "state", "fiber"))

    def test_views_are_valid_viewspecs(self):
        for query in ["arch-map", "blast-radius?symbol=ApprovalRequiredTool%3A%3Anew",
                      f"flow-trace?source=rust_agent_cli::main&target={quote('DeclAgentBuilder::build')}",
                      f"call-tree?symbol={quote('DeclAgentBuilder::build')}", "schema-map?symbol=ToolRegistry",
                      "schema-map?symbol=IExecutor"]:
            with self.subTest(query=query):
                self.assert_valid_viewspec(self.get(f"{self.base}/views/{query}"))

    # --- compat ------------------------------------------------------------------------------
    def test_bridge_routes_keep_their_shapes(self):
        hits = self.client.post("/search-code", json={"query": "tool approval", "k": 3}).get_json()
        self.assertEqual(set(hits[0]), {"symbol", "file", "line", "score", "snippet"})
        self.assertEqual(hits[0]["score"], 1.0)
        info = self.client.post("/find-symbol", json={"name": "WorkflowBuilder::add_node"}).get_json()
        self.assertEqual(set(info), {"symbol", "file", "start", "code", "callers", "tests"})
        self.assertTrue(info["callers"] and info["tests"])
        self.assertEqual(self.client.post("/find-symbol", json={}).status_code, 400)


if __name__ == "__main__":
    unittest.main()

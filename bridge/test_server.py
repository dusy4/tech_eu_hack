"""Contract tests for the bridge: a fake workbench returning toolkit-shaped dicts,
checked against the shapes in README.md section 13.

    python -I bridge/test_server.py
"""

import json
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent))
import server  # noqa: E402

BODY_DOC = {
    "kind": "function_body",
    "path": "src/queue.rs",
    "content": "fn process_queue(q: &mut Queue) {\n    while let Some(job) = q.pop() {\n        run(job);\n    }\n}",
    "metadata": {"range": {"start_line": 42, "end_line": 46}},
}


class FakeWorkbench:
    def search(self, query, limit):
        return {
            "results": [
                {"symbol_id": "s1", "qualified_name": "queue::process_queue", "path": "src/queue.rs", "score": 8.0, **{k: BODY_DOC[k] for k in ("content", "metadata")}},
                {"symbol_id": "s1", "qualified_name": "queue::process_queue", "path": "src/queue.rs", "score": 7.0},
                {"symbol_id": "s2", "name": "run", "path": "src/run.rs", "score": 4.0, "preview": "fn run(job: Job)"},
                {"symbol_id": None, "kind": "repo", "path": None, "score": 9.0},
            ]
        }

    def body(self, name):
        if name == "missing":
            return {"symbol": None, "body": None}
        if name == "from_clone":  # the real workbench keeps spans, not text: code comes from the clone
            return {"symbol": {"qualified_name": "queue::from_clone", "path": "src/queue.rs", "signature": "fn from_clone()"},
                    "body": {"path": "src/queue.rs", "metadata": {}}, "source": {"start": 7, "code": "fn from_clone() {\n}"}}
        return {"symbol": {"qualified_name": "queue::process_queue", "path": "src/queue.rs"}, "body": BODY_DOC}

    def callers(self, name):
        return {"neighbors": [{"qualified_name": "worker::tick"}, {"name": "main"}, {"qualified_name": "worker::tick"}]}

    def tests(self, name):
        raise RuntimeError("no TESTS edges in this graph")

    def answer_bundle(self, question, limit):
        return {"plans": [], "question": question}


class BridgeContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.make_handler(server.Api(FakeWorkbench)))
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.httpd.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def post(self, path, body):
        req = Request(self.base + path, json.dumps(body).encode(), {"content-type": "application/json"})
        with urlopen(req) as r:
            return json.loads(r.read())

    def test_search_code(self):
        hits = self.post("/search-code", {"query": "process queue", "k": 4})
        self.assertEqual([h["symbol"] for h in hits], ["queue::process_queue", "run"])
        self.assertEqual(set(hits[0]), {"symbol", "file", "line", "score", "snippet"})
        self.assertEqual(hits[0]["score"], 1.0)
        self.assertEqual(hits[1]["score"], 0.5)
        self.assertEqual(hits[0]["line"], 42)
        self.assertEqual(len(hits[0]["snippet"].splitlines()), 3)

    def test_find_symbol(self):
        info = self.post("/find-symbol", {"name": "process_queue"})
        self.assertEqual(set(info), {"symbol", "file", "start", "code", "callers", "tests"})
        self.assertEqual(info["start"], 42)
        self.assertEqual(info["callers"], ["worker::tick", "main"])
        self.assertEqual(info["tests"], [])  # graph error degrades to empty, not 500

    def test_find_symbol_code_from_clone(self):
        info = self.post("/find-symbol", {"name": "from_clone"})
        self.assertEqual((info["start"], info["code"]), (7, "fn from_clone() {\n}"))

    def test_find_symbol_missing_is_null(self):
        self.assertIsNone(self.post("/find-symbol", {"name": "missing"}))

    def test_callers_of(self):
        self.assertEqual(self.post("/callers-of", {"name": "process_queue"}), ["worker::tick", "main"])

    def test_missing_field_is_400(self):
        with self.assertRaises(HTTPError) as ctx:
            self.post("/search-code", {})
        self.assertEqual(ctx.exception.code, 400)
        self.assertIn("error", json.loads(ctx.exception.read()))

    def test_answer_bundle_passthrough(self):
        self.assertEqual(self.post("/answer-bundle", {"question": "why"})["question"], "why")


if __name__ == "__main__":
    unittest.main()

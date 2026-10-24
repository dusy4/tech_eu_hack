import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SRC_ROOT = Path(__file__).resolve().parents[2] / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from mcp_server.handoffs import HandoffError, HandoffStore, handoff_markdown, validate_batch  # noqa: E402


BATCH = {
    "repo": "rust-agent-framework",
    "answer": {"id": "a1", "title": "Tool approval flow", "asked": "How does tool approval work?"},
    "proposals": [
        {"title": "Wrap shell tools in ApprovalRequiredTool", "why": "Production safety",
         "said": "every shell command should need a human yes", "action": {"kind": "focus", "nodeId": "ApprovalRequiredTool"}},
        {"title": "Who handles denied approvals?", "why": "Unclear path",
         "said": "what happens if someone says no?", "action": {"kind": "ask", "question": "What happens on denial?"}},
    ],
}


def resolver(repo, node_id):
    return {"qualified_name": f"core::tool::{node_id}", "path": "crates/core/src/tool.rs", "start_line": 170, "end_line": 173}


class HandoffStoreTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = HandoffStore(Path(self.tmp.name), resolve_code_ref=resolver)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_publish_stores_enriched_document(self) -> None:
        doc = self.store.publish(BATCH)
        self.assertEqual(doc["status"], "open")
        self.assertEqual(doc["proposals"][0]["code_ref"]["path"], "crates/core/src/tool.rs")
        self.assertNotIn("code_ref", doc["proposals"][1])  # ask actions have no code
        self.assertEqual(self.store.get(doc["id"])["repo"], "rust-agent-framework")

    def test_list_filters_and_summarises(self) -> None:
        first = self.store.publish(BATCH)
        self.store.update_status(first["id"], "done", "wrapped run_command")
        second = self.store.publish(BATCH)
        open_ids = [item["id"] for item in self.store.list(status="open")]
        self.assertEqual(open_ids, [second["id"]])
        everything = self.store.list(status=None)
        self.assertEqual(len(everything), 2)
        self.assertEqual(everything[0]["decisions"][0], "Wrap shell tools in ApprovalRequiredTool")

    def test_status_history_and_validation(self) -> None:
        doc = self.store.publish(BATCH)
        updated = self.store.update_status(doc["id"], "in_progress", "starting")
        self.assertEqual([entry["status"] for entry in updated["history"]], ["open", "in_progress"])
        with self.assertRaises(HandoffError):
            self.store.update_status(doc["id"], "finished")
        with self.assertRaises(HandoffError):
            self.store.get("../../etc/passwd")
        with self.assertRaises(HandoffError):
            validate_batch({"repo": "x", "proposals": [{"action": {"kind": "focus"}}]})

    def test_resolver_failure_does_not_lose_the_handoff(self) -> None:
        store = HandoffStore(Path(self.tmp.name), resolve_code_ref=mock.Mock(side_effect=RuntimeError("no index")))
        doc = store.publish(BATCH)
        self.assertIsNone(doc["proposals"][0]["code_ref"])

    def test_markdown_lists_decisions_with_code(self) -> None:
        text = handoff_markdown(self.store.publish(BATCH))
        self.assertIn("1. **Wrap shell tools in ApprovalRequiredTool**", text)
        self.assertIn("crates/core/src/tool.rs:170-173", text)
        self.assertIn("Open question to answer: What happens on denial?", text)


class HandoffHttpRoutesTest(unittest.TestCase):
    def test_post_get_and_cors(self) -> None:
        from starlette.testclient import TestClient
        from mcp_server import server

        with tempfile.TemporaryDirectory() as tmp, \
                mock.patch.object(server, "HANDOFFS", HandoffStore(Path(tmp), resolve_code_ref=resolver)):
            client = TestClient(server.http_app("127.0.0.1"))
            created = client.post("/handoffs", json=BATCH, headers={"Origin": "http://localhost:5173"})
            self.assertEqual(created.status_code, 201)
            self.assertEqual(created.headers.get("access-control-allow-origin"), "http://localhost:5173")
            handoff_id = created.json()["id"]
            self.assertEqual(client.get("/handoffs").json()["handoffs"][0]["id"], handoff_id)
            doc = client.get(f"/handoffs/{handoff_id}").json()
            self.assertIn("instructions", doc)
            self.assertEqual(client.post("/handoffs", json={"repo": "x"}).status_code, 400)
            self.assertEqual(client.get("/handoffs/nope").status_code, 404)


if __name__ == "__main__":
    unittest.main()

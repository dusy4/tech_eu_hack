import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SRC_ROOT = Path(__file__).resolve().parents[2] / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from mcp_server import server  # noqa: E402
from retrieval.engine import embeddings_enabled  # noqa: E402


def call(name: str, **arguments) -> str:
    result = asyncio.run(server.mcp.call_tool(name, arguments))
    return result.content[0].text


class McpServerTest(unittest.TestCase):
    def test_registers_read_only_tools(self) -> None:
        tools = {tool.name: tool for tool in asyncio.run(server.mcp.list_tools())}
        self.assertIn("symbol_relations", tools)
        self.assertIn("prepare_answer_bundle", tools)
        writers = {"publish_handoff", "update_handoff_status"}
        self.assertTrue(all(tool.annotations.read_only_hint for name, tool in tools.items() if name not in writers))
        self.assertFalse(any(tools[name].annotations.read_only_hint for name in writers))

    def test_symbol_relations_dispatches_to_toolkit(self) -> None:
        fake = mock.Mock(return_value={"operation": "callers_of", "results": [{"name": "caller"}]})
        with mock.patch.dict(server.RELATIONS, {"callers": fake}), \
                mock.patch.dict("os.environ", {"REPO_ANALYSIS_DEFAULT_REPO": "demo"}):
            text = call("symbol_relations", symbol="Store::open", relation="callers", limit=3)
        self.assertEqual(json.loads(text)["results"][0]["name"], "caller")
        args, kwargs = fake.call_args
        self.assertEqual(args[3:], ("demo", "Store::open"))
        self.assertEqual(kwargs, {"limit": 3})

    def test_render_truncates_large_payloads(self) -> None:
        with mock.patch.object(server, "MAX_CHARS", 50):
            text = server.render({"body": "x" * 500})
        self.assertTrue(text.startswith('{"body":"xxx'))
        self.assertIn("truncated", text)

    def test_resolve_repo_uses_single_indexed_repo(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            parsed = Path(tmp)
            (parsed / "icm" / "metadata.lmdb").mkdir(parents=True)
            with mock.patch.object(server, "PARSED_ROOT", parsed), mock.patch.dict("os.environ", {}, clear=False):
                os.environ.pop("REPO_ANALYSIS_DEFAULT_REPO", None)
                self.assertEqual(server.resolve_repo(None), "icm")
                (parsed / "other" / "metadata.lmdb").mkdir(parents=True)
                with self.assertRaises(ValueError):
                    server.resolve_repo(None)
                self.assertEqual(server.resolve_repo("other"), "other")


class EmbeddingsModeTest(unittest.TestCase):
    def test_modes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "demo").mkdir()
            with mock.patch.dict("os.environ", {"REPO_ANALYSIS_EMBEDDINGS": "optional"}):
                self.assertFalse(embeddings_enabled(root, "demo"))
                (root / "demo" / "embedding_index.json").write_text("{}", encoding="utf-8")
                self.assertTrue(embeddings_enabled(root, "demo"))
            with mock.patch.dict("os.environ", {"REPO_ANALYSIS_EMBEDDINGS": "off"}):
                self.assertFalse(embeddings_enabled(root, "demo"))
            with mock.patch.dict("os.environ", {"REPO_ANALYSIS_EMBEDDINGS": "required"}):
                self.assertTrue(embeddings_enabled(root, "missing"))


if __name__ == "__main__":
    unittest.main()

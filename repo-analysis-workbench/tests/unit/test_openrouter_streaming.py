import io
import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock


SRC_ROOT = Path(__file__).resolve().parents[2] / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from backends.qdrant.store import collection_name, count_points, drop_collection  # noqa: E402
from embeddings import providers  # noqa: E402
from embeddings.indexer import build_embedding_index  # noqa: E402
from embeddings.providers import EmbeddingQuotaExhausted, embed_with_openrouter  # noqa: E402


MODEL = "test/embed:free"


def search_document(doc_id: str, kind: str, content: str) -> dict:
    return {
        "doc_id": doc_id,
        "kind": kind,
        "path": "src/lib.rs",
        "name": doc_id,
        "qualified_name": f"demo::{doc_id}",
        "symbol_id": None,
        "title": doc_id,
        "preview": content[:40],
        "content": content,
        "_total_docs": 3,
    }


DOCUMENTS = [
    search_document("body_a", "function_body", "fn a() { retry_with_backoff(op, 3) }"),
    search_document("body_b", "function_body", "fn b() { load_config(path) }"),
    search_document("stmt_a", "statement", "let x = 1;"),
]


def fake_embed(texts, model, *, input_type="passage"):
    return [[1.0, float(len(text) % 7), 0.5] for text in texts]


class OpenRouterStreamingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.env = mock.patch.dict(
            "os.environ",
            {"REPO_ANALYSIS_QDRANT_URL": ":memory:", "OPENROUTER_API_KEY": "test-key"},
        )
        self.env.start()
        drop_collection(":memory:", collection_name("demo", MODEL))
        self.tmp = tempfile.TemporaryDirectory()
        self.search_root = Path(self.tmp.name)
        (self.search_root / "demo" / "tantivy").mkdir(parents=True)

    def tearDown(self) -> None:
        self.tmp.cleanup()
        self.env.stop()

    def build(self, embed=fake_embed, **kwargs):
        with mock.patch("embeddings.indexer.iter_search_documents", side_effect=lambda *a, **k: iter([DOCUMENTS])), \
                mock.patch("embeddings.indexer.embed_with_openrouter", side_effect=embed) as embed_mock:
            payload = build_embedding_index(self.search_root, "demo", provider="openrouter", model=MODEL, **kwargs)
        return payload, embed_mock

    def test_streams_units_into_qdrant_and_skips_requested_kinds(self) -> None:
        payload, embed_mock = self.build(skip_unit_kinds=["statement"])

        collection = collection_name("demo", MODEL)
        self.assertEqual(count_points(":memory:", collection), 2)
        self.assertEqual(payload["summary"]["documents"], 2)
        self.assertEqual(payload["vector_store"]["collection"], collection)
        stored = json.loads((self.search_root / "demo" / "embedding_index.json").read_text(encoding="utf-8"))
        self.assertEqual(stored["documents"], [])
        self.assertEqual(stored["provider"], "openrouter")
        embedded_texts = [text for call in embed_mock.call_args_list for text in call.args[0]]
        self.assertFalse(any("let x" in text for text in embedded_texts))

    def test_rerun_resumes_without_re_embedding_and_restart_rebuilds(self) -> None:
        self.build(skip_unit_kinds=["statement"])
        _, second = self.build(skip_unit_kinds=["statement"])
        self.assertEqual(second.call_count, 0)

        _, restarted = self.build(skip_unit_kinds=["statement"], restart=True)
        self.assertEqual(sum(len(call.args[0]) for call in restarted.call_args_list), 2)

    def test_quota_exhaustion_keeps_completed_batches(self) -> None:
        calls = {"n": 0}

        def embed_then_quota(texts, model, *, input_type="passage"):
            calls["n"] += 1
            if calls["n"] > 1:
                raise EmbeddingQuotaExhausted("daily quota")
            return fake_embed(texts, model)

        with mock.patch.dict("os.environ", {"REPO_ANALYSIS_OPENROUTER_BATCH_SIZE": "1"}):
            with self.assertRaises(EmbeddingQuotaExhausted):
                self.build(embed=embed_then_quota, skip_unit_kinds=["statement"])
        self.assertEqual(count_points(":memory:", collection_name("demo", MODEL)), 1)

    def test_skip_unit_kinds_rejected_for_other_providers(self) -> None:
        with self.assertRaises(ValueError):
            build_embedding_index(self.search_root, "demo", provider="hashing", skip_unit_kinds=["statement"])


def http_error(code: int, body: str) -> urllib.error.HTTPError:
    return urllib.error.HTTPError("https://openrouter.ai", code, "error", {}, io.BytesIO(body.encode()))


def ok_response(vectors):
    body = json.dumps({"data": [{"index": i, "embedding": v} for i, v in enumerate(vectors)]}).encode()
    response = mock.MagicMock()
    response.__enter__.return_value.read.return_value = body
    return response


class EmbedWithOpenRouterTest(unittest.TestCase):
    def setUp(self) -> None:
        self.env = mock.patch.dict(
            "os.environ", {"OPENROUTER_API_KEY": "test-key", "REPO_ANALYSIS_OPENROUTER_RPM": "100000"}
        )
        self.env.start()
        self.sleep = mock.patch("embeddings.providers.time.sleep")
        self.sleep.start()

    def tearDown(self) -> None:
        self.sleep.stop()
        self.env.stop()

    def test_sends_input_type_and_normalises_vectors(self) -> None:
        with mock.patch("urllib.request.urlopen", return_value=ok_response([[3.0, 4.0]])) as urlopen:
            vectors = embed_with_openrouter(["q"], MODEL, input_type="query")
        sent = json.loads(urlopen.call_args.args[0].data)
        self.assertEqual(sent["input_type"], "query")
        self.assertEqual(sent["model"], MODEL)
        self.assertEqual(vectors, [[0.6, 0.8]])

    def test_retries_rate_limit_then_succeeds(self) -> None:
        responses = [http_error(429, "Rate limit exceeded: free-models-per-min"), ok_response([[1.0, 0.0]])]
        with mock.patch("urllib.request.urlopen", side_effect=responses) as urlopen:
            vectors = embed_with_openrouter(["a"], MODEL)
        self.assertEqual(urlopen.call_count, 2)
        self.assertEqual(vectors, [[1.0, 0.0]])

    def test_daily_quota_raises_quota_exhausted(self) -> None:
        with mock.patch("urllib.request.urlopen", side_effect=[http_error(429, "Rate limit exceeded: free-models-per-day")]):
            with self.assertRaises(EmbeddingQuotaExhausted):
                embed_with_openrouter(["a"], MODEL)

    def test_resolves_openrouter_provider_with_default_model(self) -> None:
        config = providers.resolve_embedding_provider("openrouter")
        self.assertEqual(config["provider"], "openrouter")
        self.assertEqual(config["model"], providers.DEFAULT_OPENROUTER_MODEL)


if __name__ == "__main__":
    unittest.main()

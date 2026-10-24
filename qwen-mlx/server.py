"""Local Qwen3 embedding + reranker server on Apple MLX (Metal).

Serves the two endpoints repo-analysis-workbench expects on one port:

  POST /v1/embeddings  OpenAI format: {"input": [...], "model": ...}
                       -> {"data": [{"index", "embedding"}], ...}
  POST /rerank         {"query": str, "documents": [str]}
                       -> {"results": [{"index", "score", "relevance_score"}]}
  GET  /health

Both models follow the method on the official Qwen model cards:
  * Qwen3-Embedding: hidden state of the final <|endoftext|> token, L2-normalised.
    Queries get an "Instruct: ...\\nQuery:" prefix; documents do not.
  * Qwen3-Reranker:  P("yes") vs P("no") at the last position of the
    official system/user/assistant prompt.
"""

from __future__ import annotations

import argparse
import gc
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import List, Sequence

import mlx.core as mx
from mlx_lm import load
from transformers import AutoTokenizer

HERE = Path(__file__).resolve().parent
DEFAULT_EMBED_MODEL = HERE / "models" / "Qwen3-Embedding-8B-q8-mlx"
DEFAULT_RERANK_MODEL = HERE / "models" / "Qwen3-Reranker-8B-MLX-4bit"

EMBED_QUERY_TASK = (
    "Given a code search query, retrieve relevant source code, symbols, "
    "or documentation from the repository"
)
RERANK_TASK = (
    "Given a code search query, judge whether the code or documentation "
    "snippet is relevant to answering it"
)
RERANK_PREFIX = (
    "<|im_start|>system\nJudge whether the Document meets the requirements based on "
    'the Query and the Instruct provided. Note that the answer can only be "yes" or "no".'
    "<|im_end|>\n<|im_start|>user\n"
)
RERANK_SUFFIX = "<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"


def batched_by_tokens(seqs: Sequence[List[int]], max_batch_tokens: int):
    """Yield lists of indices, sorted by length, whose padded size fits the budget."""
    order = sorted(range(len(seqs)), key=lambda i: len(seqs[i]))
    batch: List[int] = []
    for i in order:
        longest = max([len(seqs[j]) for j in batch] + [len(seqs[i])])
        if batch and longest * (len(batch) + 1) > max_batch_tokens:
            yield batch
            batch = []
        batch.append(i)
    if batch:
        yield batch


def last_token_hidden(model, seqs: Sequence[List[int]], pad_id: int) -> mx.array:
    """Right-pad, run the transformer body, return the hidden state at each
    sequence's own last token. With causal attention, right padding never
    affects real tokens, so results match unbatched inference."""
    lengths = [len(s) for s in seqs]
    width = max(lengths)
    tokens = mx.array([s + [pad_id] * (width - len(s)) for s in seqs])
    hidden = model.model(tokens)  # (B, L, H), final norm applied
    rows = mx.arange(len(seqs))
    return hidden[rows, mx.array(lengths) - 1]  # (B, H)


def weights_bytes(path: Path) -> int:
    return sum(f.stat().st_size for f in Path(path).glob("*.safetensors"))


def gpu_budget_bytes() -> int:
    """Memory macOS recommends the GPU keep wired (~2/3 of RAM by default)."""
    info_fn = getattr(mx, "device_info", None) or mx.metal.device_info
    return int(info_fn()["max_recommended_working_set_size"])


class QwenMLX:
    """Holds both models. If they don't fit in GPU memory together, only one is
    resident at a time and the other is loaded on demand (swap mode)."""

    def __init__(self, embed_path: Path, rerank_path: Path, max_tokens: int, max_batch_tokens: int, swap: str = "auto"):
        self.paths = {"embed": Path(embed_path), "rerank": Path(rerank_path)}
        self.max_tokens = max_tokens
        self.max_batch_tokens = max_batch_tokens
        self.lock = threading.Lock()
        self.models: dict = {}

        # Tokenizers are small; keep them loaded even when a model is swapped out.
        self.embed_tok = AutoTokenizer.from_pretrained(str(embed_path))
        self.embed_eos = self.embed_tok.convert_tokens_to_ids("<|endoftext|>")
        self.embed_pad = self.embed_tok.pad_token_id if self.embed_tok.pad_token_id is not None else self.embed_eos
        self.rerank_tok = AutoTokenizer.from_pretrained(str(rerank_path))
        self.yes_id = self.rerank_tok.convert_tokens_to_ids("yes")
        self.no_id = self.rerank_tok.convert_tokens_to_ids("no")
        self.rerank_prefix = self.rerank_tok.encode(RERANK_PREFIX, add_special_tokens=False)
        self.rerank_suffix = self.rerank_tok.encode(RERANK_SUFFIX, add_special_tokens=False)
        pad = self.rerank_tok.pad_token_id
        self.rerank_pad = pad if pad is not None else self.rerank_tok.convert_tokens_to_ids("<|endoftext|>")

        need = weights_bytes(embed_path) + weights_bytes(rerank_path)
        budget = gpu_budget_bytes()
        # Leave ~15% of the budget for activations and the Metal buffer cache.
        self.swap = swap == "on" or (swap == "auto" and need > budget * 0.85)
        print(
            f"[qwen-mlx] weights {need / 1e9:.2f} GB, GPU budget {budget / 1e9:.2f} GB -> "
            f"{'swap mode: one model resident at a time' if self.swap else 'both models resident'}",
            flush=True,
        )
        self._model("embed")
        if not self.swap:
            self._model("rerank")

    def _model(self, kind: str):
        """Return the model for `kind`, loading it (and evicting the other in swap mode)."""
        if kind in self.models:
            return self.models[kind]
        if self.swap:
            for other in list(self.models):
                self.models.pop(other)
                gc.collect()
                mx.clear_cache()
                print(f"[qwen-mlx] unloaded {other} model", flush=True)
        t0 = time.time()
        model, _ = load(str(self.paths[kind]))
        if kind == "embed":
            # The embedding model never uses its LM head; free it.
            model.pop("lm_head", None)  # mlx Modules are dicts
        mx.eval(model.parameters())
        self.models[kind] = model
        print(
            f"[qwen-mlx] loaded {kind} model in {time.time() - t0:.1f}s "
            f"(GPU active {mx.get_active_memory() / 1e9:.2f} GB)",
            flush=True,
        )
        return model

    # ---- embeddings -------------------------------------------------------
    def embed(self, texts: Sequence[str], is_query: bool) -> List[List[float]]:
        seqs = []
        for text in texts:
            if is_query:
                text = f"Instruct: {EMBED_QUERY_TASK}\nQuery:{text}"
            ids = self.embed_tok.encode(text, add_special_tokens=False)[: self.max_tokens - 1]
            seqs.append(ids + [self.embed_eos])

        out: List[List[float] | None] = [None] * len(seqs)
        with self.lock:
            model = self._model("embed")
            for batch in batched_by_tokens(seqs, self.max_batch_tokens):
                vecs = last_token_hidden(model, [seqs[i] for i in batch], self.embed_pad)
                vecs = vecs.astype(mx.float32)
                vecs = vecs / mx.maximum(mx.linalg.norm(vecs, axis=-1, keepdims=True), 1e-12)
                mx.eval(vecs)
                for i, vec in zip(batch, vecs.tolist()):
                    out[i] = vec
            mx.clear_cache()
        return out  # type: ignore[return-value]

    # ---- reranking --------------------------------------------------------
    def rerank(self, query: str, documents: Sequence[str]) -> List[float]:
        budget = self.max_tokens - len(self.rerank_prefix) - len(self.rerank_suffix)
        seqs = []
        for doc in documents:
            body = f"<Instruct>: {RERANK_TASK}\n<Query>: {query}\n<Document>: {doc}"
            ids = self.rerank_tok.encode(body, add_special_tokens=False)[:budget]
            seqs.append(self.rerank_prefix + ids + self.rerank_suffix)

        scores: List[float] = [0.0] * len(seqs)
        with self.lock:
            model = self._model("rerank")
            for batch in batched_by_tokens(seqs, self.max_batch_tokens):
                hidden = last_token_hidden(model, [seqs[i] for i in batch], self.rerank_pad)
                if "lm_head" in model:
                    logits = model.lm_head(hidden)
                else:
                    logits = model.model.embed_tokens.as_linear(hidden)
                pair = logits[:, [self.no_id, self.yes_id]].astype(mx.float32)
                probs = mx.softmax(pair, axis=-1)[:, 1]
                mx.eval(probs)
                for i, p in zip(batch, probs.tolist()):
                    scores[i] = float(p)
            mx.clear_cache()
        return scores


class Handler(BaseHTTPRequestHandler):
    engine: QwenMLX
    embed_name = "qwen3-embedding-8b-4bit-mlx"
    rerank_name = "qwen3-reranker-8b-4bit-mlx"

    def log_message(self, fmt, *args):  # quieter default logging
        print(f"[qwen-mlx] {self.address_string()} {fmt % args}", flush=True)

    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/health", "/"):
            self._send(200, {"status": "ok", "gpu_active_gb": round(mx.get_active_memory() / 1e9, 2)})
        elif self.path == "/v1/models":
            self._send(200, {"object": "list", "data": [{"id": self.embed_name}, {"id": self.rerank_name}]})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError) as exc:
            self._send(400, {"error": f"invalid JSON: {exc}"})
            return

        try:
            if self.path in ("/v1/embeddings", "/embeddings"):
                self._embeddings(payload)
            elif self.path in ("/rerank", "/v1/rerank"):
                self._rerank(payload)
            else:
                self._send(404, {"error": "not found"})
        except Exception as exc:  # report model errors to the client
            self._send(500, {"error": f"{type(exc).__name__}: {exc}"})

    def _embeddings(self, payload: dict) -> None:
        texts = payload.get("input")
        if isinstance(texts, str):
            texts = [texts]
        if not isinstance(texts, list) or not all(isinstance(t, str) for t in texts):
            self._send(400, {"error": "'input' must be a string or list of strings"})
            return
        # The workbench marks index-build requests with X-Workload: batch.
        # Anything else is a search query and gets the instruction prefix.
        role = (self.headers.get("X-Embedding-Role") or "").lower()
        if role in ("query", "document"):
            is_query = role == "query"
        else:
            is_query = (self.headers.get("X-Workload") or "").lower() != "batch"
        started = time.time()
        vectors = self.engine.embed(texts, is_query=is_query)
        print(f"[qwen-mlx] embedded {len(texts)} {'query' if is_query else 'document'} text(s) in {time.time() - started:.2f}s", flush=True)
        self._send(200, {
            "object": "list",
            "model": self.embed_name,
            "data": [{"object": "embedding", "index": i, "embedding": v} for i, v in enumerate(vectors)],
        })

    def _rerank(self, payload: dict) -> None:
        query = payload.get("query")
        documents = payload.get("documents") or payload.get("texts")
        if not isinstance(query, str) or not isinstance(documents, list):
            self._send(400, {"error": "need 'query' (string) and 'documents' (list)"})
            return
        documents = [d if isinstance(d, str) else str(d.get("text", "")) for d in documents]
        started = time.time()
        scores = self.engine.rerank(query, documents)
        print(f"[qwen-mlx] reranked {len(documents)} document(s) in {time.time() - started:.2f}s", flush=True)
        results = sorted(
            ({"index": i, "score": s, "relevance_score": s} for i, s in enumerate(scores)),
            key=lambda r: -r["score"],
        )
        top_n = payload.get("top_n")
        if isinstance(top_n, int) and top_n > 0:
            results = results[:top_n]
        self._send(200, {"model": self.rerank_name, "results": results})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", default=os.environ.get("QWEN_MLX_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("QWEN_MLX_PORT", "18200")))
    parser.add_argument("--embed-model", type=Path, default=DEFAULT_EMBED_MODEL)
    parser.add_argument("--rerank-model", type=Path, default=DEFAULT_RERANK_MODEL)
    parser.add_argument("--max-tokens", type=int, default=2048, help="per-text token cap")
    parser.add_argument("--max-batch-tokens", type=int, default=4096, help="padded tokens per forward pass")
    parser.add_argument("--swap", choices=("auto", "on", "off"), default="auto",
                        help="keep one model in GPU memory at a time (auto: only if both don't fit)")
    args = parser.parse_args()

    Handler.engine = QwenMLX(args.embed_model, args.rerank_model, args.max_tokens, args.max_batch_tokens, args.swap)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"[qwen-mlx] listening on http://{args.host}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

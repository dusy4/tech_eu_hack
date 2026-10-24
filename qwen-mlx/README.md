# qwen-mlx

Local Qwen3 embedding + reranker server on Apple MLX (Metal GPU), serving the API that
`repo-analysis-workbench` expects at `http://127.0.0.1:18200`:

| Endpoint | Request | Response |
|---|---|---|
| `POST /v1/embeddings` | `{"input": [str], "model": ...}` (OpenAI format) | `{"data": [{"index", "embedding"}]}` |
| `POST /rerank` | `{"query": str, "documents": [str]}` | `{"results": [{"index", "score", "relevance_score"}]}` |
| `GET /health` | | `{"status": "ok", "gpu_active_gb"}` |

## Models

| Role | Model | Size |
|---|---|---|
| Embedding | [`jedisct1/Qwen3-Embedding-8B-mlx`](https://huggingface.co/jedisct1/Qwen3-Embedding-8B-mlx) (8-bit) | 8.71 GB |
| Reranker | [`galaxycore/Qwen3-Reranker-8B-MLX-4bit`](https://huggingface.co/galaxycore/Qwen3-Reranker-8B-MLX-4bit) | 4.62 GB |

Both follow the official Qwen model cards:
- **Embedding:** hidden state of the final `<|endoftext|>` token, L2-normalised. Search queries get an
  `Instruct: …\nQuery:` prefix; documents don't. The workbench marks index-build requests with
  `X-Workload: batch`, which is how the server tells them apart (override with `X-Embedding-Role: query|document`).
- **Reranker:** probability of "yes" vs "no" at the last position of Qwen's official judge prompt.

**Memory / swap mode.** The two models need ~13.3 GB, more than the ~12.7 GB macOS lets the GPU keep on a
16 GB Mac. With `--swap auto` (default) the server detects this and keeps only one model resident, loading
the other on demand. Index builds only use the embedder, so they never swap; each search query pays a few
seconds to switch to the reranker. On a Mac with more memory both stay loaded.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./download_models.sh          # ~13.3 GB
./start.sh                    # listens on 127.0.0.1:18200
```

Options: `./start.sh --port 18200 --swap auto|on|off --max-tokens 2048 --max-batch-tokens 4096`.

## Checks

- `test_embedding.py` loads only the embedder and checks that four code-search queries each land closest to
  their intended snippet, plus batched-vs-single consistency, speed and GPU memory.
- `check_remote_weights.py <hf-repo> ...` reads a few KB of norm weights from a Hugging Face model over HTTP
  ranges to spot broken conversions (untrained weights are all exactly 1.0) without downloading it.

## Status

- MLX on Metal verified (M1 Pro, 16 GB).
- The 8-bit embedder and the reranker are downloaded and their weights match the official Qwen checkpoints,
  but `test_embedding.py`, the reranker score check and swap mode have **not yet been run** on them.

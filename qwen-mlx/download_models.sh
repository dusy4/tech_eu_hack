#!/usr/bin/env bash
# Download the Qwen3 embedding + reranker models used by server.py (~13.3 GB).
# hf prints its own progress bars; re-running resumes / skips finished files.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export HF_XET_HIGH_PERFORMANCE=1 HF_HUB_DISABLE_TELEMETRY=1

# 8-bit embedder (8.71 GB). Weights verified against Qwen/Qwen3-Embedding-8B
# with check_remote_weights.py. Do NOT use huynguyendbs/Qwen3-Embedding-8B-4bit-MLX:
# its weights are untrained (all norm weights are exactly 1.0).
./.venv/bin/hf download jedisct1/Qwen3-Embedding-8B-mlx --local-dir models/Qwen3-Embedding-8B-q8-mlx

# 4-bit reranker (4.62 GB).
./.venv/bin/hf download galaxycore/Qwen3-Reranker-8B-MLX-4bit --local-dir models/Qwen3-Reranker-8B-MLX-4bit

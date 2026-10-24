#!/usr/bin/env bash
# Start the local Qwen3 embedding + reranker server (Apple MLX / Metal) on :18200.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
exec ./.venv/bin/python server.py "$@"

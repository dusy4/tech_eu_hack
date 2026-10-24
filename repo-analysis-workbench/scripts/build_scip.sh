#!/usr/bin/env bash
# Build a compiler-grade SCIP index for a Rust repo with rust-analyzer and convert it to
# the .scip.json that `build_index.sh --scip-index` imports. The import attaches exact
# references (method calls, trait dispatch, cross-crate calls) to the parsed symbols.
#
# Usage: scripts/build_scip.sh --repo <name> [--workspace-root <dir>]
# Output: <workspace-root>/.scip/<name>.scip.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-$SCRIPT_DIR/../.venv/bin/python}"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)/repo_analyse"
REPO=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --workspace-root) WORKSPACE_ROOT="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$REPO" ]] || { echo "usage: $0 --repo <name> [--workspace-root <dir>]" >&2; exit 2; }
command -v rust-analyzer >/dev/null || { echo "rust-analyzer not found (rustup component add rust-analyzer)" >&2; exit 1; }

OUT_DIR="$WORKSPACE_ROOT/.scip"
mkdir -p "$OUT_DIR"
echo "[build-scip] rust-analyzer scip $WORKSPACE_ROOT/$REPO" >&2
(cd "$WORKSPACE_ROOT/$REPO" && rust-analyzer scip . --output "$OUT_DIR/$REPO.scip")
"$PYTHON_BIN" "$SCRIPT_DIR/scip_to_json.py" "$OUT_DIR/$REPO.scip" "$OUT_DIR/$REPO.scip.json"

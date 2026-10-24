"""Settings, read from environment variables (names shared with the MCP server where they overlap)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]


def default_workbench_src() -> Path:
    """repo-analysis-workbench/src next to this folder (its place in tech_eu_hack), else a vendored checkout."""
    candidates = [
        PACKAGE_ROOT.parent / "repo-analysis-workbench" / "src",
        PACKAGE_ROOT.parent / "vendor" / "tech_eu_hack-main" / "repo-analysis-workbench" / "src",
    ]
    return next((c for c in candidates if (c / "agents" / "toolkit.py").exists()), candidates[0])


def _path(name: str) -> Path | None:
    value = os.environ.get(name)
    return Path(value).expanduser() if value else None


@dataclass(frozen=True)
class Settings:
    data_dir: Path | None            # REPO_ANALYSIS_DATA_DIR: workbench data/ (parsed/, raw/, graph/, search/)
    workbench_src: Path | None       # WORKBENCH_SRC: repo-analysis-workbench/src
    index_path: Path                 # REPO_GRAPH_INDEX: SQLite index built by repo_graph_api.indexer
    workspace: Path | None           # WORKBENCH_WORKSPACE: source checkouts, <workspace>/<repo>
    handoff_dir: Path | None         # REPO_ANALYSIS_HANDOFF_DIR: default <data_dir>/handoffs
    default_repo: str | None         # REPO_ANALYSIS_DEFAULT_REPO
    cors_origin_regex: str           # REPO_GRAPH_CORS_ORIGIN_REGEX
    engine: str                      # REPO_GRAPH_ENGINE: auto | workbench | index

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            data_dir=_path("REPO_ANALYSIS_DATA_DIR"),
            workbench_src=_path("WORKBENCH_SRC"),
            index_path=_path("REPO_GRAPH_INDEX") or PACKAGE_ROOT / "instance" / "repo_graph.sqlite",
            workspace=_path("WORKBENCH_WORKSPACE"),
            handoff_dir=_path("REPO_ANALYSIS_HANDOFF_DIR"),
            default_repo=os.environ.get("REPO_ANALYSIS_DEFAULT_REPO") or None,
            cors_origin_regex=os.environ.get("REPO_GRAPH_CORS_ORIGIN_REGEX", r"https?://(localhost|127\.0\.0\.1)(:\d+)?"),
            engine=os.environ.get("REPO_GRAPH_ENGINE", "auto"),
        )

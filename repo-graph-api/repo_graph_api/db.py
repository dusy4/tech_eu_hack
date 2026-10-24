"""Read-only SQLite access, one connection per request."""
from __future__ import annotations

import sqlite3
from pathlib import Path

from flask import current_app, g


def connect(path: str | Path) -> sqlite3.Connection:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"Index not found at {path}. Build it with: python -m repo_graph_api.indexer --data <data_dir> --out {path}"
        )
    con = sqlite3.connect(f"file:{path.resolve().as_posix()}?mode=ro", uri=True, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = connect(current_app.config["REPO_GRAPH_INDEX"])
    return g.db


def close_db(_exc=None) -> None:
    con = g.pop("db", None)
    if con is not None:
        con.close()

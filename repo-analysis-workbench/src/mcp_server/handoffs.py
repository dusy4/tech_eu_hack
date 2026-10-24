"""Handoff documents: decisions accepted in a Spelunk session, waiting for a coding agent.

The app (or Haiku) publishes a `ProposalBatch` (see app/src/engine/agent.ts); it is stored
as one JSON document per handoff under <data>/handoffs/, enriched with code references
from the index, and served to agents through the MCP tools list_handoffs / get_handoff.
Agents mark progress with update_handoff_status.
"""

from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Dict, List, Optional

STATUSES = ("open", "in_progress", "done", "dismissed")
ACTION_KINDS = ("focus", "ask")

CodeRefResolver = Callable[[str, str], Optional[Dict[str, object]]]


class HandoffError(ValueError):
    """Invalid handoff payload or unknown handoff id."""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def validate_batch(batch: object) -> Dict[str, object]:
    """Check the ProposalBatch shape the app sends; return it normalised."""
    if not isinstance(batch, dict):
        raise HandoffError("handoff must be a JSON object")
    repo = batch.get("repo")
    if not isinstance(repo, str) or not repo.strip():
        raise HandoffError("'repo' is required")
    proposals = batch.get("proposals")
    if not isinstance(proposals, list) or not proposals:
        raise HandoffError("'proposals' must be a non-empty list")
    answer = batch.get("answer") or {}
    if not isinstance(answer, dict):
        raise HandoffError("'answer' must be an object")
    normalised = []
    for index, proposal in enumerate(proposals):
        if not isinstance(proposal, dict):
            raise HandoffError(f"proposal {index} must be an object")
        action = proposal.get("action") or {}
        kind = action.get("kind") if isinstance(action, dict) else None
        if kind not in ACTION_KINDS:
            raise HandoffError(f"proposal {index}: action.kind must be one of {', '.join(ACTION_KINDS)}")
        if kind == "focus" and not action.get("nodeId"):
            raise HandoffError(f"proposal {index}: focus actions need action.nodeId")
        if kind == "ask" and not action.get("question"):
            raise HandoffError(f"proposal {index}: ask actions need action.question")
        normalised.append({
            "title": str(proposal.get("title") or ""),
            "why": str(proposal.get("why") or ""),
            "said": str(proposal.get("said") or ""),
            "speaker": proposal.get("speaker"),
            "action": dict(action),
        })
    return {
        "repo": repo.strip(),
        "answer": {key: answer.get(key) for key in ("id", "title", "asked") if answer.get(key) is not None},
        "proposals": normalised,
    }


class HandoffStore:
    def __init__(self, root: Path, resolve_code_ref: Optional[CodeRefResolver] = None):
        self.root = Path(root)
        self.resolve_code_ref = resolve_code_ref

    def _path(self, handoff_id: str) -> Path:
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", handoff_id or ""):
            raise HandoffError(f"invalid handoff id: {handoff_id!r}")
        return self.root / f"{handoff_id}.json"

    def _write(self, doc: Dict[str, object]) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        path = self._path(str(doc["id"]))
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, path)  # atomic, so readers never see a half-written file

    def publish(self, batch: object, *, source: str = "app") -> Dict[str, object]:
        handoff = validate_batch(batch)
        for proposal in handoff["proposals"]:
            action = proposal["action"]
            if action["kind"] == "focus" and self.resolve_code_ref is not None:
                try:
                    proposal["code_ref"] = self.resolve_code_ref(handoff["repo"], str(action["nodeId"]))
                except Exception:  # code refs are best effort; never lose a handoff over them
                    proposal["code_ref"] = None
        created = now_iso()
        doc = {
            "id": f"{datetime.now(timezone.utc):%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:6]}",
            "status": "open",
            "created_at": created,
            "updated_at": created,
            "source": source,
            **handoff,
            "history": [{"at": created, "status": "open", "note": f"published by {source}"}],
        }
        self._write(doc)
        return doc

    def get(self, handoff_id: str) -> Dict[str, object]:
        path = self._path(handoff_id)
        if not path.exists():
            raise HandoffError(f"no handoff with id {handoff_id!r}")
        return json.loads(path.read_text(encoding="utf-8"))

    def list(self, *, repo: Optional[str] = None, status: Optional[str] = None, limit: int = 20) -> List[Dict[str, object]]:
        if not self.root.exists():
            return []
        docs = []
        for path in sorted(self.root.glob("*.json"), reverse=True):  # ids start with a timestamp: newest first
            try:
                doc = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if repo and doc.get("repo") != repo:
                continue
            if status and doc.get("status") != status:
                continue
            docs.append({
                "id": doc["id"],
                "status": doc.get("status"),
                "repo": doc.get("repo"),
                "created_at": doc.get("created_at"),
                "title": (doc.get("answer") or {}).get("title"),
                "decisions": [proposal.get("title") for proposal in doc.get("proposals", [])],
            })
            if len(docs) >= limit:
                break
        return docs

    def update_status(self, handoff_id: str, status: str, note: str = "") -> Dict[str, object]:
        if status not in STATUSES:
            raise HandoffError(f"status must be one of {', '.join(STATUSES)}")
        doc = self.get(handoff_id)
        at = now_iso()
        doc["status"] = status
        doc["updated_at"] = at
        doc.setdefault("history", []).append({"at": at, "status": status, "note": note})
        self._write(doc)
        return doc


def handoff_markdown(doc: Dict[str, object], repo_root: Optional[str] = None) -> str:
    """The handoff as instructions an agent can act on directly."""
    answer = doc.get("answer") or {}
    lines = [
        f"# Handoff {doc['id']} ({doc.get('status')})",
        "",
        f"Repo: `{doc.get('repo')}`" + (f". Discussed on the view: {answer.get('title')}" if answer.get("title") else ""),
    ]
    if repo_root:
        lines.append(f"Checkout: `{repo_root}` (code paths below are relative to it)")
    if answer.get("asked"):
        lines.append(f"Question the team was looking at: {answer['asked']}")
    lines += ["", "The team accepted these decisions. Each was confirmed by a person; act on them in order.", ""]
    for number, proposal in enumerate(doc.get("proposals", []), start=1):
        action = proposal.get("action") or {}
        speaker = f" ({proposal['speaker']})" if proposal.get("speaker") else ""
        lines.append(f"{number}. **{proposal.get('title')}**")
        if proposal.get("said"):
            lines.append(f"   - Said{speaker}: \"{proposal['said']}\"")
        if proposal.get("why"):
            lines.append(f"   - Why: {proposal['why']}")
        if action.get("kind") == "focus":
            ref = proposal.get("code_ref") or {}
            location = f"{ref.get('path')}:{ref.get('start_line')}-{ref.get('end_line')}" if ref.get("path") else "not found in the index"
            lines.append(f"   - Code: `{ref.get('qualified_name') or action.get('nodeId')}` at {location}")
        elif action.get("kind") == "ask":
            lines.append(f"   - Open question to answer: {action.get('question')}")
    lines += ["", "When finished, call update_handoff_status with status \"done\" and a short note of what changed."]
    return "\n".join(lines)

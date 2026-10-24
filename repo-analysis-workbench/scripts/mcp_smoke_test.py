"""End-to-end smoke test of the MCP server, speaking the real protocol over stdio
(the same way Claude Code launches and calls it).

Usage: .venv/bin/python scripts/mcp_smoke_test.py [repo]
"""

import asyncio
import json
import sys
import time
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

WORKBENCH = Path(__file__).resolve().parents[1]
REPO = sys.argv[1] if len(sys.argv) > 1 else "rust-agent-framework"

CALLS = [
    ("list_repos", {}),
    ("repo_overview", {"repo": REPO}),
    ("summarize_path", {"repo": REPO, "path": "crates/core"}),
    ("search_code", {"repo": REPO, "query": "tool approval", "limit": 5}),
    ("find_symbol", {"repo": REPO, "name": "ChatClientBuilder", "limit": 5}),
    ("find_file", {"repo": REPO, "path_pattern": "approval", "limit": 5}),
    ("get_symbol_body", {"repo": REPO, "symbol": "ApprovalRequiredTool"}),
    ("get_enclosing_context", {"repo": REPO, "symbol": "ChatClientBuilder::build"}),
    ("symbol_relations", {"repo": REPO, "symbol": "ApprovalRequiredTool", "relation": "callers", "limit": 5}),
    ("symbol_relations", {"repo": REPO, "symbol": "ChatClientBuilder::build", "relation": "callees", "limit": 5}),
    ("symbol_relations", {"repo": REPO, "symbol": "IChatClient", "relation": "implements", "limit": 5}),
    ("symbol_relations", {"repo": REPO, "symbol": "IChatClient", "relation": "imports", "limit": 5}),
    ("path_between", {"repo": REPO, "source": "ChatClientBuilder::build", "target": "IChatClient", "limit": 2}),
    ("statement_slice", {"repo": REPO, "symbol": "ChatClientBuilder::build", "limit": 5}),
    ("prepare_answer_bundle", {"repo": REPO, "question": "How does human-in-the-loop tool approval work?", "limit": 5}),
]


def headline(payload: object) -> str:
    """One-line gist of a tool result for the console."""
    if not isinstance(payload, dict):
        return str(payload)[:160]
    for key in ("results", "matches", "neighbors", "paths", "evidence", "repos"):
        value = payload.get(key)
        if isinstance(value, list):
            names = [
                str(item.get("qualified_name") or item.get("name") or item.get("path") or item)[:60]
                if isinstance(item, dict) else str(item)[:60]
                for item in value[:3]
            ]
            return f"{key}={len(value)} e.g. {names}"
    if "bundles" in payload:
        bundle = (payload.get("bundles") or [{}])[0]
        evidence = [e.get("qualified_name") or e.get("path") for e in bundle.get("evidence", [])[:4]]
        return f"evidence={len(bundle.get('evidence', []))} top={evidence}"
    return "keys=" + ",".join(list(payload.keys())[:8])


async def main() -> int:
    params = StdioServerParameters(
        command=sys.executable,  # the venv's python, on macOS, Linux and Windows
        args=[str(WORKBENCH / "src/mcp_server/server.py")],
        cwd=str(WORKBENCH),
    )
    failures = 0
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print(f"server exposes {len(tools.tools)} tools\n")
            for name, args in CALLS:
                started = time.perf_counter()
                result = await session.call_tool(name, args)
                elapsed = time.perf_counter() - started
                text = result.content[0].text if result.content else ""
                status = "ERROR" if result.is_error else "ok"
                try:
                    gist = headline(json.loads(text))
                except json.JSONDecodeError:
                    gist = text[:160].replace("\n", " ")
                failures += result.is_error
                label = f"{name}({args.get('relation', '')})" if name == "symbol_relations" else name
                print(f"{status:<5} {label:<28} {elapsed:6.2f}s {len(text):>7} chars  {gist}")
    print(f"\n{len(CALLS) - failures}/{len(CALLS)} calls succeeded")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

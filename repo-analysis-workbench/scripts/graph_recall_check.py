"""Compare the index's callers with the real call sites for a few known symbols.

Usage: .venv/bin/python scripts/graph_recall_check.py [repo]
"""

import sys
from pathlib import Path

WORKBENCH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WORKBENCH / "src"))

from agents import toolkit  # noqa: E402

DATA = WORKBENCH / "data"
REPO = sys.argv[1] if len(sys.argv) > 1 else "rust-agent-framework"
# symbol -> distinct real calling functions, verified by hand against the source
EXPECTED = {
    "ApprovalRequiredTool::new": 2,          # cross-crate: WorkspaceContextProvider::add_tool / add_tool_arc
    "ITool::requires_approval": 2,           # trait method: FunctionInvokingChatClient::run (x2), NamespacedTool
    "ChatClientBuilder::build": 1,           # method call in AgentBuilder::build (framework/src/builder.rs:301)
    "FunctionInvokingChatClient::new": 7,    # AgentBuilder::build, run_curator, 5 tests in invoke.rs
}

found_total = expected_total = 0
for symbol, expected in EXPECTED.items():
    result = toolkit.callers_of(DATA / "search", DATA / "parsed", DATA / "graph", REPO, symbol, limit=50)
    callers = {
        (node.get("qualified_name"), node.get("path"))
        for node in result.get("neighbors", [])
    }
    found_total += min(len(callers), expected)
    expected_total += expected
    names = sorted(str(name).split("::")[-2:] and "::".join(str(name).split("::")[-2:]) for name, _ in callers)
    print(f"{symbol:<36} expected {expected}  found {len(callers):<3} {names[:5]}")
print(f"\nrecall on these symbols: {found_total}/{expected_total}")

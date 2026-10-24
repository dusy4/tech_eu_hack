import sys
import unittest
from pathlib import Path


SRC_ROOT = Path(__file__).resolve().parents[2] / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from symbols.scip_bridge import bridge_scip_records  # noqa: E402


def primary(symbol_id, path, name, kind, start, end, qualified_name):
    return {"symbol_id": symbol_id, "path": path, "name": name, "kind": kind, "provider": "rust_static",
            "qualified_name": qualified_name, "span": {"start_line": start, "end_line": end}}


def scip_symbol(symbol_id, path, name, line):
    return {"symbol_id": symbol_id, "path": path, "name": name, "kind": "method", "provider": "scip",
            "selection_range": {"start_line": line, "end_line": line}}


def scip_ref(container, target, path, line, kind="use", target_kind="method"):
    return {"reference_id": f"ref-{path}-{line}", "path": path, "kind": kind, "container_symbol_id": container,
            "target_symbol_id": target, "target_kind": target_kind, "span": {"start_line": line}}


PRIMARY = [
    primary("p-struct", "crates/core/src/tool.rs", "ApprovalRequiredTool", "struct", 170, 200,
            "rust_agent_core::tool::ApprovalRequiredTool"),
    primary("p-new", "crates/core/src/tool.rs", "new", "method", 175, 178,
            "rust_agent_core::tool::ApprovalRequiredTool::new"),
    primary("p-setup", "crates/framework/src/context/workspace.rs", "setup", "function", 40, 90,
            "rust_agent_framework::context::workspace::setup"),
]
SCIP_SYMBOLS = [
    scip_symbol("s-new", "crates/core/src/tool.rs", "new", 175),
    scip_symbol("s-setup", "crates/framework/src/context/workspace.rs", "setup", 40),
]


class ScipBridgeTest(unittest.TestCase):
    def test_cross_crate_method_call_becomes_call_on_primary_symbols(self) -> None:
        kept, refs, stats = bridge_scip_records(PRIMARY, [], SCIP_SYMBOLS, [
            scip_ref("s-setup", "s-new", "crates/framework/src/context/workspace.rs", 54),
        ])
        self.assertEqual(kept, [])  # covered by the primary parser, not duplicated
        self.assertEqual(len(refs), 1)
        self.assertEqual(refs[0]["kind"], "call")
        self.assertEqual(refs[0]["target_symbol_id"], "p-new")
        self.assertEqual(refs[0]["target_qualified_name"], "rust_agent_core::tool::ApprovalRequiredTool::new")
        self.assertEqual(refs[0]["container_symbol_id"], "p-setup")
        self.assertEqual(stats["calls"], 1)

    def test_drops_external_targets_and_existing_references(self) -> None:
        existing = [{"container_symbol_id": "p-setup", "target_symbol_id": "p-new", "span": {"start_line": 76}}]
        _, refs, stats = bridge_scip_records(PRIMARY, existing, SCIP_SYMBOLS, [
            scip_ref("s-setup", "s-std-vec-new", "crates/framework/src/context/workspace.rs", 60),  # std, not in repo
            scip_ref("s-setup", "s-new", "crates/framework/src/context/workspace.rs", 76),  # parser already has it
        ])
        self.assertEqual(refs, [])
        self.assertEqual(stats["external_dropped"], 1)
        self.assertEqual(stats["duplicates_dropped"], 1)

    def test_imports_stay_imports_and_types_stay_uses(self) -> None:
        symbols = SCIP_SYMBOLS + [scip_symbol("s-struct", "crates/core/src/tool.rs", "ApprovalRequiredTool", 170)]
        _, refs, _ = bridge_scip_records(PRIMARY, [], symbols, [
            scip_ref(None, "s-new", "crates/framework/src/context/workspace.rs", 3, kind="import"),
            scip_ref("s-setup", "s-struct", "crates/framework/src/context/workspace.rs", 55, target_kind="struct"),
        ])
        self.assertEqual([ref["kind"] for ref in refs], ["import", "use"])
        self.assertIsNone(refs[0]["container_symbol_id"])

    def test_keeps_scip_symbols_for_files_without_primary_coverage(self) -> None:
        python_symbol = scip_symbol("s-py", "src/app.py", "run", 3)
        kept, refs, _ = bridge_scip_records(PRIMARY, [], [python_symbol], [
            scip_ref(None, "s-py", "src/main.py", 9, target_kind="function"),
        ])
        self.assertEqual([symbol["symbol_id"] for symbol in kept], ["s-py"])
        self.assertEqual(refs[0]["kind"], "call")


if __name__ == "__main__":
    unittest.main()

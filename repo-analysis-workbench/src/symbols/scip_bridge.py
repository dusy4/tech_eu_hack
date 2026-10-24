"""Attach compiler-grade SCIP references (e.g. from `rust-analyzer scip`) to the
symbols produced by the primary parsers.

The SCIP importer creates its own symbol records, but graph queries resolve names
against the primary parser's symbols, so imported references never meet them. This
maps each SCIP definition onto the primary symbol with the same file and name whose
span contains it, rewrites references onto those ids, and marks references to
callables as calls so the graph builds CALLS edges for method calls, trait dispatch
and cross-crate calls that name-based resolution misses.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List, Sequence, Set, Tuple

CALLABLE_KINDS = {"function", "fn", "method", "associated_function", "constructor", "abstract_method"}
NON_CALL_REFERENCE_KINDS = {"import", "write"}


def symbol_line_span(symbol: Dict[str, object]) -> Tuple[int, int]:
    span = symbol.get("span") or symbol.get("range") or {}
    start = int(span.get("start_line") or 0)
    return start, int(span.get("end_line") or start)


def selection_line(symbol: Dict[str, object]) -> int:
    span = symbol.get("selection_range") or symbol.get("range") or symbol.get("span") or {}
    return int(span.get("start_line") or 0)


def map_scip_symbols(
    primary_symbols: Iterable[Dict[str, object]],
    scip_symbols: Iterable[Dict[str, object]],
) -> Dict[str, Dict[str, object]]:
    """scip symbol_id -> primary symbol record (same path and name, tightest span containing the definition)."""
    by_path_name: Dict[Tuple[str, str], List[Dict[str, object]]] = defaultdict(list)
    for symbol in primary_symbols:
        if symbol.get("kind") == "local":
            continue
        by_path_name[(str(symbol.get("path") or ""), str(symbol.get("name") or ""))].append(symbol)

    mapping: Dict[str, Dict[str, object]] = {}
    for scip_symbol in scip_symbols:
        line = selection_line(scip_symbol)
        candidates = [
            symbol
            for symbol in by_path_name.get((str(scip_symbol.get("path") or ""), str(scip_symbol.get("name") or "")), [])
            if symbol_line_span(symbol)[0] <= line <= symbol_line_span(symbol)[1]
        ]
        if candidates:
            mapping[str(scip_symbol["symbol_id"])] = min(
                candidates, key=lambda symbol: symbol_line_span(symbol)[1] - symbol_line_span(symbol)[0]
            )
    return mapping


def bridge_scip_records(
    primary_symbols: Sequence[Dict[str, object]],
    primary_references: Sequence[Dict[str, object]],
    scip_symbols: Sequence[Dict[str, object]],
    scip_references: Sequence[Dict[str, object]],
) -> Tuple[List[Dict[str, object]], List[Dict[str, object]], Dict[str, int]]:
    """Return (scip symbols to keep, bridged references, stats).

    SCIP symbols in files the primary parsers already cover are dropped (they would
    duplicate those symbols); references to code outside the repo, and references the
    primary parser already found, are dropped."""
    mapping = map_scip_symbols(primary_symbols, scip_symbols)
    covered_paths = {str(symbol.get("path") or "") for symbol in primary_symbols}
    kept_symbols = [
        symbol
        for symbol in scip_symbols
        if str(symbol["symbol_id"]) not in mapping and str(symbol.get("path") or "") not in covered_paths
    ]
    kept_ids = {str(symbol["symbol_id"]) for symbol in kept_symbols}

    existing: Set[Tuple[object, object, object]] = {
        (reference.get("container_symbol_id"), reference.get("target_symbol_id"), (reference.get("span") or {}).get("start_line"))
        for reference in primary_references
    }
    bridged: List[Dict[str, object]] = []
    stats = {"scip_symbols_mapped": len(mapping), "scip_symbols_kept": len(kept_symbols), "external_dropped": 0,
             "duplicates_dropped": 0, "calls": 0, "references": 0}
    for reference in scip_references:
        target_id = str(reference.get("target_symbol_id") or "")
        target = mapping.get(target_id)
        if target is None and target_id not in kept_ids:
            stats["external_dropped"] += 1
            continue
        container = mapping.get(str(reference.get("container_symbol_id") or ""))
        updated = dict(reference)
        if container is not None:
            updated["container_symbol_id"] = container["symbol_id"]
            updated["container_qualified_name"] = container.get("qualified_name")
            updated["scope_symbol_id"] = container["symbol_id"]
        elif str(reference.get("container_symbol_id") or "") not in kept_ids:
            updated["container_symbol_id"] = None  # file-level reference
            updated["scope_symbol_id"] = None
        if target is not None:
            updated["target_symbol_id"] = target["symbol_id"]
            updated["target_qualified_name"] = target.get("qualified_name")
            updated["target_kind"] = target.get("kind")
        if updated.get("target_kind") in CALLABLE_KINDS and updated.get("kind") not in NON_CALL_REFERENCE_KINDS:
            updated["kind"] = "call"
        key = (updated.get("container_symbol_id"), updated.get("target_symbol_id"), (updated.get("span") or {}).get("start_line"))
        if key in existing:
            stats["duplicates_dropped"] += 1
            continue
        existing.add(key)
        stats["calls" if updated["kind"] == "call" else "references"] += 1
        bridged.append(updated)
    return kept_symbols, bridged, stats

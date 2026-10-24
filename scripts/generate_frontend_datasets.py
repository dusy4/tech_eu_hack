#!/usr/bin/env python3
"""Generates structured datasets for the 18 frontend visualizations
from the pre-indexed data in repo-analysis-workbench/data/rust-agent-framework/.
"""

import json
import time
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "repo-analysis-workbench" / "data"
FRONTEND_DATA = ROOT / "frontend" / "src" / "data"
REPO = "rust-agent-framework"


def main():
    print(f"Generating datasets from {DATA_ROOT} for {REPO}...")
    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)

    raw_dir = DATA_ROOT / "raw" / REPO
    parsed_dir = DATA_ROOT / "parsed" / REPO
    summaries_dir = DATA_ROOT / "summaries" / REPO
    search_dir = DATA_ROOT / "search" / REPO
    logs_dir = DATA_ROOT / "logs"

    manifest = json.load(open(raw_dir / "manifest.json"))
    repo_map = json.load(open(raw_dir / "repo_map.json"))
    build_progress = json.load(open(parsed_dir / "build_progress.json"))
    summaries_progress = json.load(open(summaries_dir / "build_progress.json"))

    # 1. Overview metrics
    overview = {
        "repo": REPO,
        "remote": manifest["source"]["git_remote"],
        "commit": manifest["source"]["git_ref"],
        "branch": manifest["source"]["git_branch"],
        "status": manifest["source"]["git_dirty"],
        "total_files": manifest["file_inventory"]["tracked_files"],
        "total_directories": manifest["file_inventory"]["directories"],
        "total_symbols": build_progress["summary"]["symbols"],
        "total_statements": build_progress["summary"]["statements"],
        "total_tests": build_progress["summary"]["tests"],
        "total_references": build_progress["summary"]["references"],
        "graph_nodes": build_progress["graph_summary"]["nodes"],
        "graph_edges": build_progress["graph_summary"]["edges"],
        "search_documents": 53693,
        "build_elapsed_seconds": round(build_progress["build_metrics"]["elapsed_ms"] / 1000.0, 1),
        "peak_rss_mb": build_progress["build_metrics"]["rss_mb"],
        "language_mix": manifest["language_mix"],
        "extensions": manifest["file_inventory"]["by_extension"],
        "largest_files": manifest["file_inventory"]["largest_files"][:15],
        "edge_counts": build_progress["graph_summary"]["edge_counts"],
        "symbol_kinds": build_progress["summary"]["kind_counts"],
        "statement_kinds": build_progress["summary"]["statement_kind_counts"],
        "provider_counts": build_progress["summary"]["provider_counts"],
    }

    # 2. Crate information & 19x19 Matrix
    crate_roots = manifest["module_graph_seeds"]["crate_roots"]
    crate_names = [Path(c).name for c in crate_roots]

    # Scan 360 file cache files
    file_cache_dir = parsed_dir / "file-cache"
    cache_files = list(file_cache_dir.rglob("*.json"))

    crate_stats = {
        name: {
            "name": name,
            "root": f"crates/{name}",
            "files": 0,
            "bytes": 0,
            "symbols": 0,
            "statements": 0,
            "functions": 0,
            "structs": 0,
            "traits": 0,
            "tests": 0,
            "dependencies": set(),
            "dependents": set(),
            "top_symbols": [],
        }
        for name in crate_names
    }

    # Populate file metrics per crate
    for f in manifest["file_inventory"]["largest_files"]:
        p = f["path"]
        for c in crate_names:
            if p.startswith(f"crates/{c}/"):
                crate_stats[c]["bytes"] += f["size"]

    # Scan file cache
    cross_crate_edges = Counter()
    all_symbols = []
    test_trace_cases = []
    file_parse_latencies = []
    control_flow_samples = []

    for cache_file in cache_files:
        try:
            d = json.load(open(cache_file))
            parsed = d.get("parsed", {})
            crate_raw = parsed.get("crate_name", "")
            src_crate = crate_raw.replace("rust_agent_", "").replace("rust-agent-", "")
            if src_crate not in crate_stats:
                # fallback matching by path
                path = d.get("compiler_probe", {}).get("path", "")
                for c in crate_names:
                    if f"/crates/{c}/" in path:
                        src_crate = c
                        break

            # Parse latency
            probe = d.get("compiler_probe", {})
            latency = d.get("parse_elapsed_ms", probe.get("latency_ms", 0.0))
            f_path = str(cache_file.relative_to(file_cache_dir)).replace(".json", "")
            file_parse_latencies.append({
                "path": f_path,
                "crate": src_crate,
                "latency_ms": round(latency, 2),
                "items": sum(i["count"] for i in probe.get("item_counts", [])),
                "statements": sum(s["count"] for s in probe.get("statement_counts", [])),
                "controls": sum(c["count"] for c in probe.get("control_counts", [])),
            })

            # Control flow sample for complex functions
            controls = probe.get("control_counts", [])
            if any(c.get("count", 0) > 3 for c in controls):
                control_flow_samples.append({
                    "path": f_path,
                    "crate": src_crate,
                    "controls": controls,
                    "statement_counts": probe.get("statement_counts", []),
                })

            if src_crate in crate_stats:
                crate_stats[src_crate]["files"] += 1
                if "/tests/" in str(cache_file) or f_path.endswith("_test.rs") or "test" in f_path:
                    crate_stats[src_crate]["tests"] += 1

            # Extract imports
            for imp in parsed.get("imports", []):
                imp_path = imp.get("path", "")
                if "rust_agent_" in imp_path:
                    target = imp_path.split("::")[0].replace("rust_agent_", "")
                    if target in crate_stats and src_crate in crate_stats and target != src_crate:
                        cross_crate_edges[(src_crate, target)] += 1
                        crate_stats[src_crate]["dependencies"].add(target)
                        crate_stats[target]["dependents"].add(src_crate)

            # Extract symbols
            ts_symbols = d.get("backend_probes", {}).get("tree_sitter_rust", {}).get("symbols", [])
            for sym in ts_symbols:
                kind = sym.get("kind", "")
                name = sym.get("name", "")
                qname = sym.get("qualified_name", name)
                sig = sym.get("signature", "")
                rng = sym.get("range", {})
                item_record = {
                    "name": name,
                    "qualified_name": qname,
                    "kind": kind,
                    "signature": sig,
                    "crate": src_crate,
                    "path": f_path,
                    "start_line": rng.get("start_line", 1),
                    "end_line": rng.get("end_line", 1),
                }
                all_symbols.append(item_record)

                if src_crate in crate_stats:
                    crate_stats[src_crate]["symbols"] += 1
                    if kind == "function":
                        crate_stats[src_crate]["functions"] += 1
                    elif kind in ("struct", "type"):
                        crate_stats[src_crate]["structs"] += 1
                    elif kind == "trait":
                        crate_stats[src_crate]["traits"] += 1

                    if len(crate_stats[src_crate]["top_symbols"]) < 10 and kind in ("function", "struct", "trait"):
                        crate_stats[src_crate]["top_symbols"].append(item_record)

            # Test mappings
            if "test" in f_path or "/tests/" in f_path:
                for sym in ts_symbols:
                    if "test" in sym.get("name", "").lower():
                        test_trace_cases.append({
                            "test_name": sym.get("name"),
                            "test_path": f_path,
                            "crate": src_crate,
                            "target_module": f_path.split("/")[-1].replace("_test.rs", ".rs"),
                        })

        except Exception:
            continue

    # Convert sets to sorted lists in crate_stats
    crate_list = []
    for c in crate_names:
        cs = crate_stats[c]
        cs["dependencies"] = sorted(cs["dependencies"])
        cs["dependents"] = sorted(cs["dependents"])
        crate_list.append(cs)

    # 19x19 Dependency Matrix
    dsm_matrix = []
    for src in crate_names:
        row = []
        for tgt in crate_names:
            cnt = cross_crate_edges.get((src, tgt), 0)
            row.append(cnt)
        dsm_matrix.append({
            "crate": src,
            "row": row,
        })

    # Crate cross edges formatted
    formatted_cross_edges = [
        {"source": src, "target": tgt, "count": count, "type": "IMPORTS"}
        for (src, tgt), count in cross_crate_edges.most_common()
    ]

    # Top slowest files
    file_parse_latencies.sort(key=lambda x: x["latency_ms"], reverse=True)

    # Sort and filter symbols for instant search & display
    curated_symbols = sorted(
        [s for s in all_symbols if s["kind"] in ("struct", "trait", "function", "enum")],
        key=lambda x: (x["crate"], x["name"]),
    )

    # Save to frontend/src/data/repo_data.json
    output_bundle = {
        "overview": overview,
        "crates": crate_list,
        "crate_names": crate_names,
        "dsm_matrix": dsm_matrix,
        "cross_crate_edges": formatted_cross_edges,
        "symbols": curated_symbols[:300],  # high-value curated symbols
        "total_extracted_symbols": len(all_symbols),
        "test_trace_cases": test_trace_cases[:50],
        "slowest_files": file_parse_latencies[:25],
        "control_flow_samples": control_flow_samples[:20],
        "repo_map_tree": repo_map["directories"][:40],
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    target_file = FRONTEND_DATA / "repo_data.json"
    with open(target_file, "w") as f:
        json.dump(output_bundle, f, indent=2)

    print(f"Successfully generated {target_file} ({target_file.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()

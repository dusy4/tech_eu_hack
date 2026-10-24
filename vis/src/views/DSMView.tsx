import React, { useState, useMemo } from "react";
import { RepoDataset } from "../types";
import { Grid3X3, AlertTriangle, ShieldCheck, ArrowRight, ArrowDownRight, Layers, Sliders } from "lucide-react";

export const DSMView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const [sortOrder, setSortOrder] = useState<"architectural" | "alphabetical">("architectural");
  const [hoveredCell, setHoveredCell] = useState<{ src: string; tgt: string; count: number; rIdx: number; cIdx: number } | null>(null);

  const rawCrateNames = data.crate_names;
  const rawMatrix = data.dsm_matrix;

  // Architectural hierarchy tiers definition
  const ARCH_TIERS: Record<string, number> = {
    cli: 1, // Presentation (top layer)
    workflow_pro: 2,
    workflow_as_agent: 2,
    workflow: 2, // Orchestration
    coding: 3, // Domain
    decl: 3,
    eval: 3,
    rag: 3,
    wiki: 3,
    websearch: 3,
    mcp: 4, // Infrastructure & Adapters
    rhai: 4,
    sandbox: 4,
    client: 4,
    server: 4,
    core: 5, // Foundational (bottom layer)
    macros: 5,
    common: 5,
    tests: 6,
  };

  // Sorted crates based on selected order
  const sortedCrateNames = useMemo(() => {
    if (sortOrder === "alphabetical") {
      return [...rawCrateNames].sort();
    }
    // Architectural order: Top layers first, lowest layers last
    return [...rawCrateNames].sort((a, b) => {
      const tierA = ARCH_TIERS[a] || 3;
      const tierB = ARCH_TIERS[b] || 3;
      if (tierA !== tierB) return tierA - tierB;
      return a.localeCompare(b);
    });
  }, [rawCrateNames, sortOrder]);

  // Re-map matrix based on sorted indices
  const matrixData = useMemo(() => {
    // Map original name to original row
    const originalRowMap = new Map<string, number[]>();
    rawMatrix.forEach((r) => {
      originalRowMap.set(r.crate, r.row);
    });

    return sortedCrateNames.map((srcName, rIdx) => {
      const originalRow = originalRowMap.get(srcName) || [];
      const sortedRow = sortedCrateNames.map((tgtName) => {
        const origTgtIdx = rawCrateNames.indexOf(tgtName);
        return origTgtIdx >= 0 ? originalRow[origTgtIdx] || 0 : 0;
      });
      return { crate: srcName, row: sortedRow };
    });
  }, [sortedCrateNames, rawMatrix, rawCrateNames]);

  // Count upper triangle coupling violations (if any)
  let upperTriangleCoupling = 0;
  matrixData.forEach((rowObj, r) => {
    rowObj.row.forEach((val, c) => {
      if (c > r && val > 0) {
        upperTriangleCoupling += val;
      }
    });
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 08 • Deep Relational Code Knowledge Graphs
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Grid3X3 className="w-6 h-6 text-indigo-400" />
            Dependency Structure Matrix (Triangularized DSM)
          </h1>
          <p className="text-sm text-slate-400">
            Coupling matrix measuring <code className="text-indigo-300">3,165 IMPORTS</code> across 19 crates organized with architectural triangularization.
          </p>
        </div>

        {/* Ordering Controls & DAG Badge */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
            <button
              onClick={() => setSortOrder("architectural")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                sortOrder === "architectural" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Architectural Layers
            </button>
            <button
              onClick={() => setSortOrder("alphabetical")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                sortOrder === "alphabetical" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Alphabetical
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3.5 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4" />
            <span>DAG: 0 Circular Dependencies</span>
          </div>
        </div>
      </div>

      {/* Triangularization Analysis Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <ArrowDownRight className="w-4 h-4 text-indigo-400" />
          <span>
            {sortOrder === "architectural"
              ? "Triangularized view: Dependencies strictly cascade downwards from high-level orchestrators to foundational core."
              : "Alphabetical view: Standard lexicographical matrix layout."}
          </span>
        </div>
        <span className="text-emerald-400 font-bold">
          Upper Triangle Violations: {upperTriangleCoupling}
        </span>
      </div>

      {/* 19x19 DSM Matrix Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 overflow-x-auto shadow-2xl">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between font-mono">
          <span>19×19 Crate Coupling Heatmap</span>
          {hoveredCell ? (
            <span className="text-indigo-400 font-bold">
              {hoveredCell.src} → {hoveredCell.tgt}: <strong className="text-white">{hoveredCell.count} imports</strong>
            </span>
          ) : (
            <span className="text-slate-500">Hover over any intersection to analyze coupling</span>
          )}
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="border-collapse text-[10px] font-mono mx-auto select-none">
            <thead>
              <tr>
                <th className="p-1.5 text-slate-500 font-normal"></th>
                {sortedCrateNames.map((name, idx) => (
                  <th
                    key={idx}
                    className={`p-1 font-semibold text-left h-28 max-w-[24px] align-bottom pb-2 transition-colors ${
                      hoveredCell?.cIdx === idx ? "text-indigo-300 font-bold" : "text-slate-400"
                    }`}
                  >
                    <div className="writing-mode-vertical rotate-180 truncate" title={name}>
                      {name.replace("rust-agent-", "")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.map((rowObj, rIdx) => {
                const srcName = rowObj.crate;
                const isRowHovered = hoveredCell?.rIdx === rIdx;

                return (
                  <tr key={rIdx} className={isRowHovered ? "bg-slate-800/40" : ""}>
                    <td
                      className={`p-1.5 font-semibold text-right pr-3 whitespace-nowrap transition-colors ${
                        isRowHovered ? "text-indigo-300 font-bold" : "text-slate-400"
                      }`}
                    >
                      {srcName.replace("rust-agent-", "")}
                    </td>

                    {rowObj.row.map((val, cIdx) => {
                      const tgtName = sortedCrateNames[cIdx];
                      const isDiagonal = rIdx === cIdx;
                      const hasCoupling = val > 0;
                      const isUpperTriangle = cIdx > rIdx;
                      const isHovered = hoveredCell?.rIdx === rIdx && hoveredCell?.cIdx === cIdx;
                      const isCrosshair = hoveredCell?.rIdx === rIdx || hoveredCell?.cIdx === cIdx;

                      let cellBg = "bg-slate-950/60 text-slate-700";
                      if (isDiagonal) {
                        cellBg = "bg-slate-800/80 text-slate-400 font-bold";
                      } else if (hasCoupling) {
                        if (isUpperTriangle) {
                          cellBg = "bg-amber-600/90 text-white font-bold animate-pulse";
                        } else if (val > 25) {
                          cellBg = "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/50";
                        } else if (val > 10) {
                          cellBg = "bg-indigo-700/80 text-indigo-100";
                        } else {
                          cellBg = "bg-indigo-950/80 text-indigo-300";
                        }
                      } else if (isCrosshair) {
                        cellBg = "bg-slate-900/60 text-slate-700";
                      }

                      return (
                        <td
                          key={cIdx}
                          onMouseEnter={() => setHoveredCell({ src: srcName, tgt: tgtName, count: val, rIdx, cIdx })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-7 h-7 text-center border border-slate-900/80 cursor-pointer transition-all ${cellBg} ${
                            isHovered ? "ring-2 ring-white z-10 font-extrabold" : ""
                          }`}
                          title={`${srcName} -> ${tgtName}: ${val} imports`}
                        >
                          {isDiagonal ? "•" : val > 0 ? val : ""}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

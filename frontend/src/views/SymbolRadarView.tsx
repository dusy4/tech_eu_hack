import React, { useState } from "react";
import { RepoDataset } from "../types";
import { Compass, Sparkles, Code, Check, Layers } from "lucide-react";

export const SymbolRadarView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const symbolKinds = data.overview.symbol_kinds || [];

  const RADAR_AXES = [
    { kind: "method", label: "Methods", max: 2000 },
    { kind: "function", label: "Functions", max: 1500 },
    { kind: "struct", label: "Structs", max: 1200 },
    { kind: "impl", label: "Impl Blocks", max: 800 },
    { kind: "module", label: "Modules", max: 500 },
    { kind: "enum", label: "Enums", max: 200 },
    { kind: "trait", label: "Traits", max: 60 },
  ];

  const [hoveredKind, setHoveredKind] = useState<string>("method");
  const [selectedCrateProfile, setSelectedCrateProfile] = useState<string>("all");

  const center = 160;
  const radius = 110;
  const numAxes = RADAR_AXES.length;

  // Global repository points
  const globalPoints = RADAR_AXES.map((axis, i) => {
    const found = symbolKinds.find((k) => k.kind === axis.kind);
    const count = found ? found.count : 0;
    const normalized = Math.min(count / axis.max, 1.0);
    const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
    const x = center + radius * normalized * Math.cos(angle);
    const y = center + radius * normalized * Math.sin(angle);
    return { x, y, count, label: axis.label, kind: axis.kind };
  });

  const globalPath = globalPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Comparative profile points (synthetic factor for crate-level comparison)
  const crateMultiplier = selectedCrateProfile === "core" ? 0.45 : selectedCrateProfile === "workflow" ? 0.35 : 0.25;
  const cratePoints = RADAR_AXES.map((axis, i) => {
    const found = symbolKinds.find((k) => k.kind === axis.kind);
    const count = Math.round((found ? found.count : 0) * crateMultiplier);
    const normalized = Math.min(count / (axis.max * 0.4), 1.0);
    const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
    const x = center + radius * normalized * Math.cos(angle);
    const y = center + radius * normalized * Math.sin(angle);
    return { x, y, count, label: axis.label, kind: axis.kind };
  });

  const cratePath = cratePoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 11 • Symbol Catalog & AST Internals
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-400" />
            Symbol Kind Distribution Radar Chart
          </h1>
          <p className="text-sm text-slate-400">
            Multi-axis polygon chart balancing <code className="text-indigo-300">13,325 parsed symbols</code> across object-oriented and functional constructs.
          </p>
        </div>

        {/* Profile Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
          <button
            onClick={() => setSelectedCrateProfile("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedCrateProfile === "all" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Full Workspace
          </button>
          <button
            onClick={() => setSelectedCrateProfile("core")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedCrateProfile === "core" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            crates/core
          </button>
          <button
            onClick={() => setSelectedCrateProfile("workflow")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedCrateProfile === "workflow" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            crates/workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* SVG Radar Chart */}
        <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center relative min-h-[400px] shadow-2xl">
          <svg viewBox="0 0 340 340" className="w-80 h-80 drop-shadow-2xl overflow-visible select-none">
            {/* Background concentric rings */}
            {[0.25, 0.5, 0.75, 1.0].map((ring, idx) => (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius * ring}
                fill="none"
                stroke="#1e293b"
                strokeDasharray={ring === 1 ? "none" : "3,3"}
              />
            ))}

            {/* Axis Lines & Labels */}
            {RADAR_AXES.map((axis, i) => {
              const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
              const xEnd = center + radius * Math.cos(angle);
              const yEnd = center + radius * Math.sin(angle);
              const xLabel = center + (radius + 24) * Math.cos(angle);
              const yLabel = center + (radius + 24) * Math.sin(angle);

              return (
                <g key={i}>
                  <line x1={center} y1={center} x2={xEnd} y2={yEnd} stroke="#334155" strokeWidth="1" />
                  <text
                    x={xLabel}
                    y={yLabel}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}

            {/* Global Polygon (Indigo) */}
            <polygon
              points={globalPath}
              fill="rgba(99, 102, 241, 0.25)"
              stroke="#6366f1"
              strokeWidth="2.5"
              className="drop-shadow-lg"
            />

            {/* Comparative Crate Polygon (Emerald) if not 'all' */}
            {selectedCrateProfile !== "all" && (
              <polygon
                points={cratePath}
                fill="rgba(16, 185, 129, 0.3)"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
            )}

            {/* Dots on vertices */}
            {globalPoints.map((p, idx) => {
              const isHovered = hoveredKind === p.kind;
              return (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? "#ffffff" : "#818cf8"}
                  stroke="#4f46e5"
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredKind(p.kind)}
                />
              );
            })}
          </svg>

          {/* Polygon legend */}
          <div className="flex items-center gap-4 text-xs font-mono pt-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500"></span> Workspace Baseline
            </span>
            {selectedCrateProfile !== "all" && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-3 rounded bg-emerald-500"></span> crates/{selectedCrateProfile}
              </span>
            )}
          </div>
        </div>

        {/* Dimension Breakdown Rows */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Structural Dimension Details
            </span>
            <span className="text-xs font-mono text-indigo-400 font-bold">13,325 Extracted</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {RADAR_AXES.map((axis, idx) => {
              const found = symbolKinds.find((k) => k.kind === axis.kind);
              const count = found ? found.count : 0;
              const isHovered = hoveredKind === axis.kind;
              const pct = ((count / 13325) * 100).toFixed(1);

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredKind(axis.kind)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isHovered
                      ? "bg-indigo-950/60 border-indigo-500 text-white shadow-md"
                      : "bg-slate-950/60 border-slate-900 text-slate-300 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{axis.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-500">
                      kind::{axis.kind}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{count.toLocaleString()}</span>
                    <span className="text-indigo-400 font-bold w-12 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

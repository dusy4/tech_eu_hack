import React, { useState } from "react";
import { RepoDataset } from "../types";
import { Gauge, Clock, HardDrive, Cpu, CheckCircle, Activity, Layers } from "lucide-react";

export const BuildTimelineView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const STAGES = [
    {
      name: "1. Inventory & Manifest Scan",
      time: "0.0s - 1.4s",
      startSec: 0.0,
      endSec: 1.4,
      duration: "1.4s",
      rss: 100.9,
      desc: "Discovered 572 files across 123 directories and parsed Cargo workspace manifests.",
    },
    {
      name: "2. Compiler Probing & AST Parsing",
      time: "1.4s - 65.6s",
      startSec: 1.4,
      endSec: 65.6,
      duration: "64.2s",
      rss: 699.1,
      desc: "Ran rust-analyzer LSP and Tree-sitter across 360 compilation units, extracting 13,325 symbols.",
    },
    {
      name: "3. RyuGraph Network Construction",
      time: "65.6s - 75.2s",
      startSec: 65.6,
      endSec: 75.2,
      duration: "9.6s",
      rss: 645.0,
      desc: "Assembled 75,705 relational nodes and 594,585 typed edges into graph.db (123 MB).",
    },
    {
      name: "4. Tantivy BM25 Lexical Indexing",
      time: "75.2s - 80.4s",
      startSec: 75.2,
      endSec: 80.4,
      duration: "5.2s",
      rss: 412.0,
      desc: "Compiled 53,693 searchable documents with full token posting lists and metadata docstore.",
    },
    {
      name: "5. Hierarchical Summarization Sync",
      time: "80.4s - 105.1s",
      startSec: 80.4,
      endSec: 105.1,
      duration: "24.7s",
      rss: 320.0,
      desc: "Aggregated 4-tier project, crate, directory, and file summaries into metadata.lmdb.",
    },
  ];

  const [hoveredStageIdx, setHoveredStageIdx] = useState<number | null>(1); // default to peak AST stage

  const maxTime = 105.1;
  const maxRss = 750; // MB
  const chartW = 800;
  const chartH = 220;

  // Compute RSS memory curve points
  const memoryPoints = [
    { t: 0.0, rss: 45 },
    { t: 1.4, rss: 100.9 },
    { t: 20.0, rss: 340 },
    { t: 45.0, rss: 580 },
    { t: 65.6, rss: 699.1 },
    { t: 75.2, rss: 645.0 },
    { t: 80.4, rss: 412.0 },
    { t: 95.0, rss: 350.0 },
    { t: 105.1, rss: 320.0 },
  ];

  const pathPoints = memoryPoints.map((p) => {
    const x = (p.t / maxTime) * chartW;
    const y = chartH - (p.rss / maxRss) * chartH;
    return `${x},${y}`;
  });

  const memorySvgPath = `M 0,${chartH} L ` + pathPoints.join(" L ") + ` L ${chartW},${chartH} Z`;
  const memoryLinePath = "M " + pathPoints.join(" L ");

  const activeStage = hoveredStageIdx !== null ? STAGES[hoveredStageIdx] : STAGES[1];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 18 • Compiler Diagnostics & Telemetry
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Gauge className="w-6 h-6 text-indigo-400" />
            Build Resource Profile & Dual-Axis Stage Timeline
          </h1>
          <p className="text-sm text-slate-400">
            Real-time execution telemetry recording resource footprint, phase timings, and peak RSS memory curve.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span className="text-amber-400 font-bold">699.1 MB Peak RSS</span>
          <span>•</span>
          <span className="text-indigo-400 font-bold">105.1s End-to-End</span>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>AST Parse Duration</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">64.2s</div>
          <p className="text-xs text-slate-500 font-sans">Single-threaded rustc AST extraction & type resolution.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>Peak RSS Memory</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">699.1 MB</div>
          <p className="text-xs text-slate-500 font-sans">Occurred during full-repo AST fusion and symbol indexing.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>Throughput Efficiency</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">5.5 files/sec</div>
          <p className="text-xs text-slate-500 font-sans">Average AST parse & extraction speed across 360 units.</p>
        </div>
      </div>

      {/* Dual-Axis SVG Area Chart Canvas */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
          <span className="text-amber-400 font-bold">Resident Set Size (RSS Memory MB)</span>
          <span className="text-slate-500">Wall-Clock Elapsed Time: 0s → 105.1s</span>
          <span className="text-indigo-400 font-bold">Stage Duration</span>
        </div>

        <div className="relative w-full overflow-hidden select-none">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-52 overflow-visible">
            {/* Horizontal Grid lines */}
            {[200, 400, 600].map((val) => {
              const y = chartH - (val / maxRss) * chartH;
              return (
                <g key={val}>
                  <line x1="0" y1={y} x2={chartW} y2={y} stroke="#1e293b" strokeDasharray="3,3" />
                  <text x="8" y={y - 4} fill="#64748b" fontSize="9px" fontFamily="monospace">
                    {val} MB
                  </text>
                </g>
              );
            })}

            {/* Stage Band Underlays */}
            {STAGES.map((st, i) => {
              const x1 = (st.startSec / maxTime) * chartW;
              const w = ((st.endSec - st.startSec) / maxTime) * chartW;
              const isHovered = hoveredStageIdx === i;

              return (
                <rect
                  key={i}
                  x={x1}
                  y="0"
                  width={w}
                  height={chartH}
                  fill={isHovered ? "rgba(99, 102, 241, 0.15)" : i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent"}
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredStageIdx(i)}
                />
              );
            })}

            {/* Memory RSS Area */}
            <path d={memorySvgPath} fill="rgba(245, 158, 11, 0.15)" />
            <path d={memoryLinePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

            {/* Memory Points */}
            {memoryPoints.map((p, i) => {
              const cx = (p.t / maxTime) * chartW;
              const cy = chartH - (p.rss / maxRss) * chartH;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill="#f59e0b"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </div>

        {/* Interactive Stages Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
          {STAGES.map((stage, idx) => {
            const isHovered = hoveredStageIdx === idx;
            return (
              <button
                key={idx}
                onMouseEnter={() => setHoveredStageIdx(idx)}
                className={`p-3 rounded-xl border text-left font-mono transition-all ${
                  isHovered
                    ? "bg-indigo-600 text-white font-bold border-indigo-400 shadow-md shadow-indigo-600/30"
                    : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-[10px] opacity-80 truncate">Stage {idx + 1}</div>
                <div className="text-xs font-bold truncate pt-0.5">{stage.name.split(". ")[1]}</div>
                <div className="text-[10px] pt-1 opacity-90">{stage.duration}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Detail Inspector */}
      {activeStage && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">{activeStage.name}</h3>
            <span className="text-amber-400 font-bold">
              Peak Stage RSS: {activeStage.rss} MB
            </span>
          </div>
          <p className="text-slate-300 font-sans leading-relaxed text-xs">{activeStage.desc}</p>
          <div className="flex items-center gap-4 text-slate-500 pt-1 text-[11px]">
            <span>Time Window: {activeStage.time}</span>
            <span>•</span>
            <span>Duration: {activeStage.duration}</span>
          </div>
        </div>
      )}
    </div>
  );
};

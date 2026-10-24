import React, { useState } from "react";
import { RepoDataset } from "../types";
import { Activity, Clock, AlertTriangle, FileCode, Cpu, Sliders, Layers } from "lucide-react";

export const ParseWaterfallView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const slowestFiles = data.slowest_files || [];
  const maxLatency = slowestFiles.length > 0 ? slowestFiles[0].latency_ms : 1000;

  const [filterThreshold, setFilterThreshold] = useState<number>(0);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  const filteredSlowest = slowestFiles.filter((f) => f.latency_ms >= filterThreshold);
  const selectedFile = filteredSlowest[selectedFileIndex] || filteredSlowest[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 16 • Compiler Diagnostics & Telemetry
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            Compilation & Parse Latency Waterfall (Gantt Diagnostics)
          </h1>
          <p className="text-sm text-slate-400">
            Per-compilation-unit benchmark timings highlighting compilation bottlenecks across 360 source files.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterThreshold(0)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterThreshold === 0 ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              All Units
            </button>
            <button
              onClick={() => setFilterThreshold(600)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterThreshold === 600 ? "bg-amber-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              &gt;600ms Only
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
            <span className="text-amber-400 font-bold">65.6s Total Time</span>
            <span>•</span>
            <span>Top 25 Slowest</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency Waterfall List (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between font-mono">
            <span>Compilation Phase Duration (Max: {maxLatency.toFixed(1)} ms)</span>
            <span className="text-slate-500">{filteredSlowest.length} Units Displayed</span>
          </div>

          <div className="space-y-3">
            {filteredSlowest.map((file, idx) => {
              const pct = Math.min((file.latency_ms / maxLatency) * 100, 100);
              const isCritical = file.latency_ms > 800;
              const isSelected = selectedFile?.path === file.path;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 font-mono text-xs ${
                    isSelected
                      ? "bg-slate-950 border-indigo-500 shadow-lg shadow-indigo-950/40"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-4">
                      <span className="text-slate-500 font-mono w-5 text-right">{idx + 1}.</span>
                      <span className="font-bold text-white truncate">{file.path.split("/").pop()}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                        crates/{file.crate}
                      </span>
                    </div>

                    <span className={`font-bold shrink-0 ${isCritical ? "text-rose-400" : "text-amber-300"}`}>
                      {file.latency_ms.toFixed(1)} ms
                    </span>
                  </div>

                  {/* Multi-phase segmented progress bar */}
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                    {/* Tree-sitter lex (approx 20%) */}
                    <div
                      style={{ width: `${pct * 0.2}%` }}
                      className="h-full bg-indigo-500"
                      title="Tree-sitter parse: 20%"
                    />
                    {/* rust-analyzer semantic probe (approx 80%) */}
                    <div
                      style={{ width: `${pct * 0.8}%` }}
                      className={`h-full ${isCritical ? "bg-rose-500" : "bg-amber-400"}`}
                      title="rust-analyzer semantic type probe: 80%"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span className="truncate">{file.path}</span>
                    <span className="shrink-0 space-x-2">
                      <span>{file.items} items</span>
                      <span>•</span>
                      <span>{file.statements} stmts</span>
                      <span>•</span>
                      <span>{file.controls} branches</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Unit Diagnostic Inspector (1 col) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 font-mono text-xs shadow-xl">
            <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              Bottleneck Diagnostics
            </div>

            {selectedFile ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Target File</span>
                  <span className="text-white font-bold text-sm break-all">
                    {selectedFile.path.split("/").pop()}
                  </span>
                  <span className="text-[10px] text-slate-400 block pt-0.5 break-all">
                    {selectedFile.path}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Wall-Clock Latency</span>
                    <span className="text-amber-400 font-bold text-base">
                      {selectedFile.latency_ms.toFixed(1)} ms
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Crate Scope</span>
                    <span className="text-indigo-300 font-bold text-base">
                      {selectedFile.crate}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase block">Syntactic Mass</span>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Parsed Items:</span>
                    <strong className="text-white">{selectedFile.items}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Statements:</span>
                    <strong className="text-white">{selectedFile.statements}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Control Branches:</span>
                    <strong className="text-white">{selectedFile.controls}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                Select a file to view detailed compiler bottleneck telemetry.
              </div>
            )}
          </div>

          {/* Phase legend */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs font-mono">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Multi-Phase Latency Segments
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-indigo-500"></span>
                <span className="text-slate-300">Tree-sitter Syntactic Lexing (~20%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400"></span>
                <span className="text-slate-300">rust-analyzer Semantic Type Probe (~80%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

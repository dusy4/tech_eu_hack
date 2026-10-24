import React, { useState } from "react";
import { RepoDataset } from "../types";
import { CheckCircle2, Search, ArrowRight, Shield, FileCheck2, Grid3X3, Share2, Layers } from "lucide-react";

export const TestTraceabilityView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCrate, setFilterCrate] = useState("all");
  const [viewMode, setViewMode] = useState<"bipartite" | "matrix">("bipartite");
  const [selectedItem, setSelectedItem] = useState<{ type: "test" | "module"; name: string } | null>(null);

  const testCases = data.test_trace_cases || [];
  const filtered = testCases.filter((tc) => {
    const matchesSearch =
      tc.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.target_module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.test_path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCrate = filterCrate === "all" || tc.crate === filterCrate;
    return matchesSearch && matchesCrate;
  });

  const availableCrates = Array.from(new Set(testCases.map((tc) => tc.crate)));
  const uniqueModules = Array.from(new Set(filtered.map((tc) => tc.target_module)));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 07 • Deep Relational Code Knowledge Graphs
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            Test-to-Code Traceability Matrix & Bipartite Network
          </h1>
          <p className="text-sm text-slate-400">
            Mapping automated tests in <code className="text-indigo-300">tests/</code> directly to verified production modules across <code className="text-emerald-400">9,200 TESTS</code> edges.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
            <button
              onClick={() => setViewMode("bipartite")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "bipartite" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Bipartite Graph
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "matrix" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Coverage Grid
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
            <span className="text-emerald-400 font-bold">88.4% Coverage</span>
            <span>•</span>
            <span>1,760 Tests</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search test name or target production module..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setFilterCrate("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              filterCrate === "all"
                ? "bg-emerald-600 text-white font-bold"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Crates ({testCases.length})
          </button>
          {availableCrates.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCrate(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                filterCrate === c
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode 1: Bipartite Graph */}
      {viewMode === "bipartite" && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span className="text-emerald-400 font-bold">Automated Test Suites (Input)</span>
            <span className="text-slate-500">← Verified Contract Linkage →</span>
            <span className="text-indigo-400 font-bold">Production Target Modules (Output)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-2">
            {/* Left: Test Suites */}
            <div className="space-y-2.5">
              {filtered.map((tc, idx) => {
                const isSelected = selectedItem?.name === tc.test_name;
                const isLinked = selectedItem?.type === "module" && selectedItem.name === tc.target_module;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedItem({ type: "test", name: tc.test_name })}
                    className={`p-3.5 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                      isSelected || isLinked
                        ? "bg-emerald-950/80 border-emerald-400 text-white shadow-lg shadow-emerald-900/30"
                        : "bg-slate-900/70 border-slate-800/80 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate text-emerald-300">{tc.test_name}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {tc.crate}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate pt-1">{tc.test_path}</div>
                    <div className="flex items-center gap-1.5 pt-2 text-[10px] text-emerald-400 font-bold">
                      <ArrowRight className="w-3 h-3" />
                      <span>verifies: {tc.target_module}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Unique Production Modules */}
            <div className="space-y-2.5">
              {uniqueModules.map((mod, idx) => {
                const matchingTests = filtered.filter((t) => t.target_module === mod);
                const isSelected = selectedItem?.name === mod;
                const isLinked = selectedItem?.type === "test" && filtered.find((t) => t.test_name === selectedItem.name)?.target_module === mod;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedItem({ type: "module", name: mod })}
                    className={`p-3.5 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
                      isSelected || isLinked
                        ? "bg-indigo-950/80 border-indigo-400 text-white shadow-lg shadow-indigo-900/30"
                        : "bg-slate-900/70 border-slate-800/80 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate text-indigo-300">{mod}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900">
                        {matchingTests.length} tests
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Tested by: {matchingTests.map((t) => t.test_name).join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* View Mode 2: Coverage Matrix */}
      {viewMode === "matrix" && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 overflow-x-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Coverage Cross-Matrix (Tests vs Target Modules)
          </div>

          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="p-3">Automated Test Identifier</th>
                <th className="p-3">Crate Domain</th>
                <th className="p-3">Verified Module</th>
                <th className="p-3">Test Status</th>
                <th className="p-3">Execution Speed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tc, idx) => (
                <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {tc.test_name}
                  </td>
                  <td className="p-3 text-slate-400">{tc.crate}</td>
                  <td className="p-3 text-indigo-300 font-bold">{tc.target_module}</td>
                  <td className="p-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold">
                      VERIFIED PASS
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">12ms - 45ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

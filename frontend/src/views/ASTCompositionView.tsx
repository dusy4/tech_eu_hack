import React, { useState } from "react";
import { RepoDataset } from "../types";
import { BarChart3, Code2, Terminal, CheckCircle2, Layers, Cpu } from "lucide-react";

export const ASTCompositionView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const statementKinds = data.overview.statement_kinds || [];
  const totalStatements = statementKinds.reduce((acc, s) => acc + s.count, 0);

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const KIND_COLORS: Record<string, string> = {
    expr: "#6366f1", // Indigo
    let: "#06b6d4", // Cyan
    if: "#f59e0b", // Amber
    assign: "#ec4899", // Pink
    return: "#10b981", // Emerald
    for: "#8b5cf6", // Purple
    match: "#3b82f6", // Blue
    while: "#f97316", // Orange
    loop: "#eab308", // Yellow
  };

  const KIND_CATEGORIES: Record<string, "Declarations" | "Evaluations" | "Control Flow" | "Mutations"> = {
    let: "Declarations",
    expr: "Evaluations",
    if: "Control Flow",
    match: "Control Flow",
    for: "Control Flow",
    while: "Control Flow",
    loop: "Control Flow",
    assign: "Mutations",
    return: "Mutations",
  };

  const filteredStatements = statementKinds.filter((s) => {
    if (activeCategory === "all") return true;
    return KIND_CATEGORIES[s.kind] === activeCategory;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 12 • Symbol Catalog & AST Internals
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Syntactic AST Statement Composition & Density
          </h1>
          <p className="text-sm text-slate-400">
            Syntactic breakdown of all <code className="text-indigo-300">33,271 statements</code> extracted across 360 Rust compilation units.
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span>{totalStatements.toLocaleString()} Total Statements</span>
          <span>•</span>
          <span>9 AST Categories</span>
        </div>
      </div>

      {/* 4 Semantic Category KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <button
          onClick={() => setActiveCategory(activeCategory === "Evaluations" ? "all" : "Evaluations")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeCategory === "Evaluations"
              ? "bg-indigo-950/80 border-indigo-500 shadow-md shadow-indigo-600/30"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-[10px] text-indigo-400 uppercase font-bold block">Evaluations</span>
          <div className="text-xl font-bold text-white pt-1">19,531 stmts</div>
          <p className="text-[11px] text-slate-400 pt-1 font-sans">Method invocations, macro calls, and expressions.</p>
        </button>

        <button
          onClick={() => setActiveCategory(activeCategory === "Declarations" ? "all" : "Declarations")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeCategory === "Declarations"
              ? "bg-cyan-950/80 border-cyan-500 shadow-md shadow-cyan-600/30"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-[10px] text-cyan-400 uppercase font-bold block">Declarations</span>
          <div className="text-xl font-bold text-white pt-1">5,820 stmts</div>
          <p className="text-[11px] text-slate-400 pt-1 font-sans">Immutable let bindings and constant allocations.</p>
        </button>

        <button
          onClick={() => setActiveCategory(activeCategory === "Control Flow" ? "all" : "Control Flow")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeCategory === "Control Flow"
              ? "bg-amber-950/80 border-amber-500 shadow-md shadow-amber-600/30"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-[10px] text-amber-400 uppercase font-bold block">Control Flow</span>
          <div className="text-xl font-bold text-white pt-1">4,780 stmts</div>
          <p className="text-[11px] text-slate-400 pt-1 font-sans">If gates, pattern matches, and loop constructs.</p>
        </button>

        <button
          onClick={() => setActiveCategory(activeCategory === "Mutations" ? "all" : "Mutations")}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeCategory === "Mutations"
              ? "bg-pink-950/80 border-pink-500 shadow-md shadow-pink-600/30"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-[10px] text-pink-400 uppercase font-bold block">Mutations & Exits</span>
          <div className="text-xl font-bold text-white pt-1">3,140 stmts</div>
          <p className="text-[11px] text-slate-400 pt-1 font-sans">State assignments, return bails, and loop breaks.</p>
        </button>
      </div>

      {/* Main Bar Chart Container */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-2xl">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between font-mono">
          <span>Statement Type Share ({filteredStatements.length} Active Nodes)</span>
          {activeCategory !== "all" && (
            <button
              onClick={() => setActiveCategory("all")}
              className="text-indigo-400 hover:underline"
            >
              Reset Category Filter
            </button>
          )}
        </div>

        {/* Stacked Proportional Bar */}
        <div className="space-y-2 select-none">
          <div className="h-7 w-full rounded-xl overflow-hidden flex bg-slate-950 border border-slate-800 p-0.5">
            {statementKinds.map((s, idx) => {
              const pct = (s.count / totalStatements) * 100;
              const color = KIND_COLORS[s.kind] || "#94a3b8";
              const isFilteredIn = activeCategory === "all" || KIND_CATEGORIES[s.kind] === activeCategory;

              return (
                <div
                  key={idx}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    opacity: isFilteredIn ? 1 : 0.25,
                  }}
                  className="h-full transition-all hover:brightness-125 cursor-pointer"
                  title={`${s.kind}: ${s.count.toLocaleString()} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
        </div>

        {/* Detailed Rows */}
        <div className="space-y-3 pt-2">
          {filteredStatements.map((s, idx) => {
            const pct = (s.count / totalStatements) * 100;
            const color = KIND_COLORS[s.kind] || "#94a3b8";
            const category = KIND_CATEGORIES[s.kind] || "Evaluations";

            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all font-mono"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                    <span className="font-bold text-white text-sm">stmt::{s.kind}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                      {category}
                    </span>
                  </div>
                  <div className="space-x-3 text-slate-300">
                    <strong className="text-white">{s.count.toLocaleString()}</strong>
                    <span className="text-indigo-400 font-bold">({pct.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

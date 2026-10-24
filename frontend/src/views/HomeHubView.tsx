import React from "react";
import {
  Boxes,
  LayoutGrid,
  Layers,
  PieChart,
  GitFork,
  Network,
  CheckCircle2,
  Grid3X3,
  ArrowRightLeft,
  Workflow,
  Compass,
  BarChart3,
  Code2,
  ZoomIn,
  Search,
  Activity,
  Cpu,
  Gauge,
  ArrowRight,
  Sparkles,
  GitCommit,
  HardDrive,
  Clock,
} from "lucide-react";
import { RepoDataset, VizId } from "../types";
import { VIZ_METADATA } from "../vizConfig";

interface HomeHubProps {
  data: RepoDataset;
  onSelectViz: (id: VizId) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Boxes,
  LayoutGrid,
  Layers,
  PieChart,
  GitFork,
  Network,
  CheckCircle2,
  Grid3X3,
  ArrowRightLeft,
  Workflow,
  Compass,
  BarChart3,
  Code2,
  ZoomIn,
  Search,
  Activity,
  Cpu,
  Gauge,
};

export const HomeHubView: React.FC<HomeHubProps> = ({ data, onSelectViz }) => {
  const { overview } = data;

  const families = [
    { key: "macro", title: "1. Macro Architecture & Footprint", color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400" },
    { key: "graph", title: "2. Deep Relational Code Knowledge Graphs", color: "from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400" },
    { key: "symbols", title: "3. Symbol Catalog & AST Internals", color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400" },
    { key: "summaries", title: "4. Architectural Zoom & Search", color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400" },
    { key: "compiler", title: "5. Compiler Diagnostics & Telemetry", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              18 Visualizations Live Studio
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {overview.repo}
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              High-precision code intelligence dashboard generated directly from Rust AST compilers, LMDB symbol stores, and the 75k-node RyuGraph relational knowledge engine.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-2">
              <span className="flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                Commit: {overview.commit.slice(0, 8)}
              </span>
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                {overview.total_files} Tracked Files
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Build: {overview.build_elapsed_seconds}s
              </span>
            </div>
          </div>
          <button
            onClick={() => onSelectViz("crate-topology")}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 group shrink-0"
          >
            Launch Visualizer 1
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Topline KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Crates</span>
          <div className="text-2xl font-extrabold text-white">{data.crate_names.length}</div>
          <span className="text-[11px] text-cyan-400 font-mono">19 modules</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Symbols</span>
          <div className="text-2xl font-extrabold text-white">{overview.total_symbols.toLocaleString()}</div>
          <span className="text-[11px] text-indigo-400 font-mono">13.3k in LMDB</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Graph Nodes</span>
          <div className="text-2xl font-extrabold text-white">{overview.graph_nodes.toLocaleString()}</div>
          <span className="text-[11px] text-purple-400 font-mono">75.7k entities</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Graph Edges</span>
          <div className="text-2xl font-extrabold text-white">{overview.graph_edges.toLocaleString()}</div>
          <span className="text-[11px] text-pink-400 font-mono">594.5k relations</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Function Calls</span>
          <div className="text-2xl font-extrabold text-white">97,398</div>
          <span className="text-[11px] text-emerald-400 font-mono">CALLS edges</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Search Index</span>
          <div className="text-2xl font-extrabold text-white">53,693</div>
          <span className="text-[11px] text-amber-400 font-mono">Tantivy BM25 docs</span>
        </div>
      </div>

      {/* 18 Visualizations Grid Grouped by Family */}
      <div className="space-y-8">
        {families.map((fam) => {
          const items = VIZ_METADATA.filter((v) => v.family === fam.key);
          return (
            <div key={fam.key} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  {fam.title}
                </h2>
                <span className="text-xs text-slate-400 font-mono">{items.length} Visualizations</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const Icon = ICON_MAP[item.iconName] || Boxes;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectViz(item.id)}
                      className="group cursor-pointer p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-slate-800/80 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-300 font-mono">
                            {item.metric}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] font-semibold text-slate-400 group-hover:text-indigo-400 transition-colors">
                        <span>Open Visualization</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

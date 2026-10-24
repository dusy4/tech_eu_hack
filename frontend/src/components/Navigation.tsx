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
  Home,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { VizId } from "../types";
import { VIZ_METADATA } from "../vizConfig";

interface NavigationProps {
  currentViz: VizId;
  onSelectViz: (id: VizId) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
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

export const Navigation: React.FC<NavigationProps> = ({ currentViz, onSelectViz }) => {
  const families = [
    { key: "macro", title: "Macro Architecture" },
    { key: "graph", title: "Code Knowledge Graphs" },
    { key: "symbols", title: "Symbols & AST Slices" },
    { key: "summaries", title: "Architectural Zoom & Search" },
    { key: "compiler", title: "Compiler Diagnostics" },
  ];

  return (
    <aside className="w-72 bg-slate-900/90 border-r border-slate-800/80 flex flex-col h-screen select-none shrink-0 overflow-hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Repo Intelligence
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight">rust-agent-framework</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Hub / Main Home Button */}
        <div>
          <button
            onClick={() => onSelectViz("hub")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
              currentViz === "hub"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Home className="w-4 h-4 text-indigo-400 group-hover:text-white" />
            <span className="flex-1 text-left font-semibold">Studio Hub Overview</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              18 Viz
            </span>
          </button>
        </div>

        {/* Grouped by Family */}
        {families.map((fam) => {
          const items = VIZ_METADATA.filter((v) => v.family === fam.key);
          return (
            <div key={fam.key} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {fam.title}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = ICON_MAP[item.iconName] || Boxes;
                  const isActive = currentViz === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectViz(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left group ${
                        isActive
                          ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
                        }`}
                      />
                      <span className="truncate flex-1">{item.title}</span>
                      <ChevronRight
                        className={`w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isActive ? "opacity-100 text-white" : "text-slate-500"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Pre-indexed
        </span>
        <span className="font-mono text-slate-500">75.7k Nodes</span>
      </div>
    </aside>
  );
};

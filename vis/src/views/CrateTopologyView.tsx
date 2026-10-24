import React, { useState } from "react";
import { RepoDataset } from "../types";
import { Boxes, ArrowRight, ArrowLeft, Code, Layers, FileCode, CheckCircle2, Shield } from "lucide-react";

export const CrateTopologyView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const [selectedCrate, setSelectedCrate] = useState<string>("core");
  const [activeLayer, setActiveLayer] = useState<string>("all");

  const activeCrate = data.crates.find((c) => c.name === selectedCrate) || data.crates[0];
  const inEdges = data.cross_crate_edges.filter((e) => e.target === selectedCrate);
  const outEdges = data.cross_crate_edges.filter((e) => e.source === selectedCrate);

  // Architectural Layer classification based on dependency hierarchy
  const CRATE_LAYERS: Record<string, { layer: string; label: string; desc: string; color: string }> = {
    cli: { layer: "presentation", label: "Entrypoint Layer", desc: "Binary entrypoints and user commands", color: "from-blue-500/20 to-indigo-500/10 border-blue-500/40 text-blue-400" },
    decl: { layer: "orchestration", label: "Workflow & Agent Layer", desc: "Declarative agent DSL & runtime compilers", color: "from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-400" },
    workflow: { layer: "orchestration", label: "Workflow & Agent Layer", desc: "State machine execution & checkpoint engine", color: "from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-400" },
    "workflow-pro": { layer: "orchestration", label: "Workflow & Agent Layer", desc: "Advanced multi-agent orchestration patterns", color: "from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-400" },
    coding: { layer: "domain", label: "Domain Capabilities", desc: "Autonomous coding pipelines & code editing", color: "from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400" },
    rag: { layer: "domain", label: "Domain Capabilities", desc: "Vector indexing & context retrieval", color: "from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400" },
    websearch: { layer: "domain", label: "Domain Capabilities", desc: "Web search tools & content extraction", color: "from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400" },
    "websearch-ai": { layer: "domain", label: "Domain Capabilities", desc: "AI-enhanced web search synthesis", color: "from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400" },
    wiki: { layer: "domain", label: "Domain Capabilities", desc: "Knowledge graph & document indexing", color: "from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400" },
    client: { layer: "infrastructure", label: "Infrastructure Layer", desc: "LLM clients (OpenAI, Anthropic, Agnes)", color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400" },
    host: { layer: "infrastructure", label: "Infrastructure Layer", desc: "OS hosting & execution runtime", color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400" },
    llama: { layer: "infrastructure", label: "Infrastructure Layer", desc: "Local model inference connector", color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400" },
    mcp: { layer: "infrastructure", label: "Infrastructure Layer", desc: "Model Context Protocol server & bridge", color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400" },
    openapi: { layer: "infrastructure", label: "Infrastructure Layer", desc: "OpenAPI client generator & bindings", color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400" },
    rhai: { layer: "infrastructure", label: "Infrastructure Layer", desc: "Rhai scripting language execution sandbox", color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400" },
    sandbox: { layer: "infrastructure", label: "Infrastructure Layer", desc: "Isolated environment runner", color: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400" },
    core: { layer: "foundational", label: "Foundational Kernel", desc: "Base traits, error types, and session models", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400" },
    framework: { layer: "foundational", label: "Foundational Kernel", desc: "Core decorators & invocation harness", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400" },
    macros: { layer: "foundational", label: "Foundational Kernel", desc: "Procedural macros & AST derive attributes", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400" },
  };

  const layersList = [
    { key: "all", label: "All 19 Crates" },
    { key: "presentation", label: "1. Presentation Layer" },
    { key: "orchestration", label: "2. Orchestration Layer" },
    { key: "domain", label: "3. Domain Capabilities" },
    { key: "infrastructure", label: "4. Infrastructure Layer" },
    { key: "foundational", label: "5. Foundational Kernel" },
  ];

  const filteredCrates = activeLayer === "all"
    ? data.crates
    : data.crates.filter((c) => CRATE_LAYERS[c.name]?.layer === activeLayer);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 01 • Macro Architecture
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-400" />
            Workspace Crate Topology & Layered Architecture
          </h1>
          <p className="text-sm text-slate-400">
            Hierarchical architectural DAG mapping inter-crate dependencies and boundary contracts across all 19 workspace crates.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span className="text-emerald-400 font-bold">19 Crates</span>
          <span>•</span>
          <span>42 Dependency Pairs</span>
          <span>•</span>
          <span className="text-indigo-400">5 Architectural Tiers</span>
        </div>
      </div>

      {/* Layer Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        {layersList.map((l) => (
          <button
            key={l.key}
            onClick={() => setActiveLayer(l.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeLayer === l.key
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crates Grid / Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredCrates.map((c) => {
              const isSelected = c.name === selectedCrate;
              const layerInfo = CRATE_LAYERS[c.name] || { color: "from-slate-800 to-slate-900 border-slate-700 text-slate-300", label: "Crate" };
              const hasIn = inEdges.some((e) => e.source === c.name);
              const hasOut = outEdges.some((e) => e.target === c.name);

              let badgeColor = `bg-gradient-to-br ${layerInfo.color}`;
              if (isSelected) {
                badgeColor = "bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/40 font-bold scale-[1.02]";
              } else if (hasIn) {
                badgeColor = "bg-emerald-950/40 border-emerald-500/60 text-emerald-300";
              } else if (hasOut) {
                badgeColor = "bg-amber-950/40 border-amber-500/60 text-amber-300";
              }

              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedCrate(c.name)}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${badgeColor}`}
                >
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider opacity-75">
                      {layerInfo.label}
                    </span>
                    <div className="font-bold text-sm tracking-tight truncate">{c.name}</div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-80 pt-3 font-mono border-t border-white/10 mt-2">
                    <span>{c.files} files</span>
                    <span>{c.symbols} sym</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Crate Connection Visualizer */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Coupling Topology: <span className="text-indigo-400 font-mono">{activeCrate.name}</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                In-degree: {inEdges.length} | Out-degree: {outEdges.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Inbound Dependents */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Depended on by ({inEdges.length} Crates)
                </div>
                {inEdges.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-950/40 border border-slate-800/40">
                    No downstream crates import this module (terminal layer).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inEdges.map((e, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs text-emerald-200 flex items-center justify-between font-mono"
                      >
                        <span className="font-bold">{e.source}</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300">
                          {e.count} imports
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outbound Dependencies */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Depends on ({outEdges.length} Crates)
                </div>
                {outEdges.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-950/40 border border-slate-800/40">
                    Zero internal crate dependencies (leaf kernel crate).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {outEdges.map((e, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200 flex items-center justify-between font-mono"
                      >
                        <span className="font-bold">{e.target}</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-900/50 text-amber-300">
                          {e.count} imports
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Crate Detail Drawer */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Crate Architecture Inspector
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-2xl">
            <div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-bold tracking-wider">
                {CRATE_LAYERS[activeCrate.name]?.label || "Crate"}
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-2 font-mono">{activeCrate.name}</h2>
              <p className="text-xs text-slate-400 pt-1 leading-relaxed">
                {CRATE_LAYERS[activeCrate.name]?.desc || "Workspace compilation module"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-mono">Source Files</div>
                <div className="text-lg font-bold text-white font-mono">{activeCrate.files}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-mono">Byte Size</div>
                <div className="text-lg font-bold text-white font-mono">
                  {(activeCrate.bytes / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-mono">Functions</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">{activeCrate.functions}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-mono">Structs / Types</div>
                <div className="text-lg font-bold text-cyan-400 font-mono">{activeCrate.structs}</div>
              </div>
            </div>

            {/* Top Exported Symbols in this Crate */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-400" />
                Key Exported Symbols ({activeCrate.top_symbols.length})
              </h4>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeCrate.top_symbols.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3">No exported symbols found in index.</p>
                ) : (
                  activeCrate.top_symbols.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-300 font-mono">{s.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {s.kind}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{s.signature}</div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 font-mono pt-0.5">
                        <FileCode className="w-3 h-3 text-slate-600" />
                        {s.path}:{s.start_line}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { RepoDataset } from "../types";
import { ZoomIn, ZoomOut, Layers, ChevronRight, Folder, FileCode, Package, Code2, ArrowRight } from "lucide-react";

export const FourTierZoomView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const [currentTier, setCurrentTier] = useState<number>(1);
  const [selectedCrate, setSelectedCrate] = useState<string>("workflow");
  const [selectedModule, setSelectedModule] = useState<string>("engine.rs");

  const TIERS = [
    { level: 1, name: "System Context", label: "Workspace Architectural Overview" },
    { level: 2, name: "Container / Crate", label: "19 Workspace Crates" },
    { level: 3, name: "Component / Module", label: "Subsystem Directory Scopes" },
    { level: 4, name: "Code / Symbol", label: "Compilation Units & AST Details" },
  ];

  const activeCrateData = data.crates.find((c) => c.name === selectedCrate) || data.crates[0];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 14 • Architectural Zoom & Search
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ZoomIn className="w-6 h-6 text-indigo-400" />
            4-Tier Hierarchical Architectural Zoom (C4 Model)
          </h1>
          <p className="text-sm text-slate-400">
            Progressive semantic zooming from macro system context down to compiler compilation units.
          </p>
        </div>

        {/* Zoom Stepper Buttons */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl font-mono text-xs">
          <button
            onClick={() => setCurrentTier((prev) => Math.max(prev - 1, 1))}
            disabled={currentTier === 1}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-bold text-indigo-400 px-3">
            Tier {currentTier} / 4
          </span>

          <button
            onClick={() => setCurrentTier((prev) => Math.min(prev + 1, 4))}
            disabled={currentTier === 4}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tier Selector Stepper */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TIERS.map((t) => (
          <button
            key={t.level}
            onClick={() => setCurrentTier(t.level)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              currentTier === t.level
                ? "bg-indigo-600 text-white font-bold border-indigo-400 shadow-md shadow-indigo-600/30"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="text-[10px] uppercase font-mono opacity-80">Tier {t.level}</div>
            <div className="text-xs font-bold truncate">{t.name}</div>
          </button>
        ))}
      </div>

      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
        <button
          onClick={() => setCurrentTier(1)}
          className={`hover:text-indigo-400 transition-colors ${currentTier === 1 ? "text-indigo-400 font-bold" : "text-slate-400"}`}
        >
          System Context
        </button>
        {currentTier >= 2 && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <button
              onClick={() => setCurrentTier(2)}
              className={`hover:text-indigo-400 transition-colors ${currentTier === 2 ? "text-indigo-400 font-bold" : "text-slate-400"}`}
            >
              crates/{selectedCrate}
            </button>
          </>
        )}
        {currentTier >= 3 && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <button
              onClick={() => setCurrentTier(3)}
              className={`hover:text-indigo-400 transition-colors ${currentTier === 3 ? "text-indigo-400 font-bold" : "text-slate-400"}`}
            >
              src/{selectedModule}
            </button>
          </>
        )}
        {currentTier >= 4 && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-bold">WorkflowEngine::run (AST)</span>
          </>
        )}
      </div>

      {/* Dynamic Tier Viewport */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-2xl">
        {/* Tier 1: System Context */}
        {currentTier === 1 && (
          <div className="space-y-4">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
              Tier 1 • System Context & External Interfaces
            </span>
            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <h3 className="text-xl font-bold text-white">rust-agent-framework</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Autonomous AI agent orchestration workspace comprising 19 modular crates. Connects external LLM providers (Anthropic, OpenAI, DeepSeek) through asynchronous streaming clients and persists execution state in local SQLite / LMDB journals.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Workspace Crates</span>
                  <span className="text-white font-bold">19 Crates</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Total Source Files</span>
                  <span className="text-white font-bold">572 Files (362 Rust)</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Codebase Volume</span>
                  <span className="text-emerald-400 font-bold">
                    {(data.overview.language_mix.reduce((acc, l) => acc + l.bytes, 0) / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setCurrentTier(2)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30"
                >
                  <span>Zoom In to Container / Crate Level</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tier 2: Container / Crate Level */}
        {currentTier === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                Tier 2 • Container / Crate Boundaries (Click to Zoom In)
              </span>
              <span className="text-xs font-mono text-slate-400">Selected: {selectedCrate}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.crates.map((c) => {
                const isSelected = selectedCrate === c.name;
                return (
                  <button
                    key={c.name}
                    onClick={() => {
                      setSelectedCrate(c.name);
                      setCurrentTier(3);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white font-bold border-indigo-400 shadow-lg shadow-indigo-600/30"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-sm truncate">{c.name}</span>
                      <span className="text-[10px] opacity-80">{c.symbols} symbols</span>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 font-mono truncate">{c.root}</div>
                    <div className="flex items-center justify-between pt-3 text-[10px] font-mono border-t border-slate-900 mt-2">
                      <span>{c.files} files</span>
                      <span className="text-indigo-300 font-bold">{(c.bytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier 3: Component / Module Level */}
        {currentTier === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                Tier 3 • Internal Modules in crates/{selectedCrate}
              </span>
              <button
                onClick={() => setCurrentTier(2)}
                className="text-xs font-mono text-indigo-400 hover:underline"
              >
                ← Back to Crates
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {["lib.rs", "engine.rs", "checkpoint.rs", "state.rs", "types.rs", "error.rs"].map((modName, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedModule(modName);
                    setCurrentTier(4);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedModule === modName
                      ? "bg-indigo-600 text-white font-bold border-indigo-400 shadow-md shadow-indigo-600/30"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-sm">{modName}</span>
                    <FileCode className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 font-mono">
                    crates/{selectedCrate}/src/{modName}
                  </div>
                  <div className="pt-2 text-[10px] text-emerald-400 font-mono">
                    Click to zoom into AST code statements →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tier 4: Code / Symbol Level */}
        {currentTier === 4 && (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                Tier 4 • Code Symbol & AST Compilation Unit
              </span>
              <button
                onClick={() => setCurrentTier(3)}
                className="text-xs text-indigo-400 hover:underline"
              >
                ← Back to Modules
              </button>
            </div>

            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-base">WorkflowEngine::run</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-bold">
                  METHOD
                </span>
              </div>
              <code className="text-xs text-indigo-300 block bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                pub async fn run(&amp;mut self, session: Arc&lt;ISession&gt;) -&gt; Result&lt;WorkflowOutput&gt;
              </code>
              <p className="text-slate-400 text-xs font-sans">
                Contains 17 statement nodes, 3 control flow branches, and generates 4 RyuGraph CALLS edges.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

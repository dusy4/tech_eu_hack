import React, { useState } from "react";
import repoData from "./data/repo_data.json";
import { RepoDataset, VizId } from "./types";
import { Navigation } from "./components/Navigation";
import { VIZ_METADATA } from "./vizConfig";

// All 18 Views + Home Hub
import { HomeHubView } from "./views/HomeHubView";
import { CrateTopologyView } from "./views/CrateTopologyView";
import { TreemapView } from "./views/TreemapView";
import { IcicleView } from "./views/IcicleView";
import { LanguageDonutView } from "./views/LanguageDonutView";
import { CallGraphView } from "./views/CallGraphView";
import { TraitContractView } from "./views/TraitContractView";
import { TestTraceabilityView } from "./views/TestTraceabilityView";
import { DSMView } from "./views/DSMView";
import { DataFlowView } from "./views/DataFlowView";
import { ControlFlowView } from "./views/ControlFlowView";
import { SymbolRadarView } from "./views/SymbolRadarView";
import { ASTCompositionView } from "./views/ASTCompositionView";
import { StatementSliceView } from "./views/StatementSliceView";
import { FourTierZoomView } from "./views/FourTierZoomView";
import { BM25SearchView } from "./views/BM25SearchView";
import { ParseWaterfallView } from "./views/ParseWaterfallView";
import { ToolchainAttributionView } from "./views/ToolchainAttributionView";
import { BuildTimelineView } from "./views/BuildTimelineView";
import { ChevronDown, ExternalLink } from "lucide-react";

export const App: React.FC = () => {
  const [currentViz, setCurrentViz] = useState<VizId>("hub");
  const data = repoData as unknown as RepoDataset;

  const currentMeta = VIZ_METADATA.find((v) => v.id === currentViz);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <Navigation currentViz={currentViz} onSelectViz={setCurrentViz} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {currentViz === "hub" ? (
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Studio Hub Overview
              </span>
            ) : (
              <>
                <span className="text-xs font-mono text-indigo-400">
                  {currentMeta?.familyTitle}
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-xs font-bold text-white">
                  {currentMeta?.title}
                </span>
              </>
            )}
          </div>

          {/* Quick-Jump Dropdown */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={currentViz}
                onChange={(e) => setCurrentViz(e.target.value as VizId)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono py-1.5 pl-3 pr-8 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
              >
                <option value="hub">⭐ Studio Hub (All 18 Visualizations)</option>
                <optgroup label="Family 1: Macro Architecture & Footprint">
                  <option value="crate-topology">01. Workspace Crate Topology</option>
                  <option value="treemap">02. Directory & File Treemap</option>
                  <option value="icicle">03. Directory Depth Icicle Tree</option>
                  <option value="language-donut">04. Language & Extension Donut</option>
                </optgroup>
                <optgroup label="Family 2: Deep Relational Code Knowledge Graphs">
                  <option value="call-graph">05. Call Graph Network</option>
                  <option value="traits">06. Trait & Contract UML Map</option>
                  <option value="tests">07. Test Traceability Matrix</option>
                  <option value="dsm">08. Dependency Structure Matrix</option>
                  <option value="data-flow">09. Data-Flow & Mutation Hubs</option>
                  <option value="control-flow">10. Intra-Function Control Flow</option>
                </optgroup>
                <optgroup label="Family 3: Symbol Catalog & AST Internals">
                  <option value="symbol-radar">11. Symbol Kind Distribution Radar</option>
                  <option value="ast-composition">12. AST Statement Composition</option>
                  <option value="statement-slice">13. Statement Slicer & Code Viewer</option>
                </optgroup>
                <optgroup label="Family 4: Architectural Zoom & Search">
                  <option value="4tier-zoom">14. 4-Tier Architectural Zoom</option>
                  <option value="bm25-search">15. Lexical BM25 Search Explorer</option>
                </optgroup>
                <optgroup label="Family 5: Compiler Performance & Telemetry">
                  <option value="parse-waterfall">16. Parse Latency Waterfall</option>
                  <option value="toolchain-attribution">17. Compiler Toolchain Attribution</option>
                  <option value="build-timeline">18. Build Resource Profile</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="hidden sm:inline">19 Crates • 75.7k Nodes</span>
            </div>
          </div>
        </header>

        {/* View Body */}
        <main className="flex-1 overflow-y-auto">
          {currentViz === "hub" && <HomeHubView data={data} onSelectViz={setCurrentViz} />}
          {currentViz === "crate-topology" && <CrateTopologyView data={data} />}
          {currentViz === "treemap" && <TreemapView data={data} />}
          {currentViz === "icicle" && <IcicleView data={data} />}
          {currentViz === "language-donut" && <LanguageDonutView data={data} />}
          {currentViz === "call-graph" && <CallGraphView data={data} />}
          {currentViz === "traits" && <TraitContractView data={data} />}
          {currentViz === "tests" && <TestTraceabilityView data={data} />}
          {currentViz === "dsm" && <DSMView data={data} />}
          {currentViz === "data-flow" && <DataFlowView data={data} />}
          {currentViz === "control-flow" && <ControlFlowView data={data} />}
          {currentViz === "symbol-radar" && <SymbolRadarView data={data} />}
          {currentViz === "ast-composition" && <ASTCompositionView data={data} />}
          {currentViz === "statement-slice" && <StatementSliceView data={data} />}
          {currentViz === "4tier-zoom" && <FourTierZoomView data={data} />}
          {currentViz === "bm25-search" && <BM25SearchView data={data} />}
          {currentViz === "parse-waterfall" && <ParseWaterfallView data={data} />}
          {currentViz === "toolchain-attribution" && <ToolchainAttributionView data={data} />}
          {currentViz === "build-timeline" && <BuildTimelineView data={data} />}
        </main>
      </div>
    </div>
  );
};

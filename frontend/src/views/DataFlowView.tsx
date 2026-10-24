import React, { useState } from "react";
import { RepoDataset } from "../types";
import { ArrowRightLeft, Database, Edit3, Eye, ShieldAlert, ArrowRight, Activity, ShieldCheck } from "lucide-react";

interface StateHub {
  state: string;
  crate: string;
  path: string;
  reads: number;
  writes: number;
  mutation_ratio: string;
  description: string;
  sources: string[];
  sinks: string[];
}

export const DataFlowView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const READ_WRITE_HUBS: StateHub[] = [
    {
      state: "WorkflowState::checkpoint_data",
      crate: "workflow",
      path: "crates/workflow/src/checkpoint/manager.rs",
      reads: 1420,
      writes: 380,
      mutation_ratio: "21.1%",
      description: "Core execution journal tracking step results, transition phases, and branch triggers.",
      sources: ["cli::runner", "workflow::orchestration", "tests::engine"],
      sinks: ["sqlite::journal_store", "disk::snapshot", "telemetry::emitter"],
    },
    {
      state: "CodingPipeline::session_buffer",
      crate: "coding",
      path: "crates/coding/src/state.rs",
      reads: 980,
      writes: 210,
      mutation_ratio: "17.6%",
      description: "Diff and patch accumulation buffer for multi-file transactional code mutations.",
      sources: ["agent::executor", "compiler::diagnostic_feedback"],
      sinks: ["git2::workspace_patch", "filesystem::atomic_write"],
    },
    {
      state: "MemorySession::message_history",
      crate: "core",
      path: "crates/core/src/session.rs",
      reads: 2140,
      writes: 190,
      mutation_ratio: "8.1%",
      description: "Append-only message array storing chat dialog turns and tool execution outputs.",
      sources: ["client::chat_client", "rag::context_builder", "websearch::tool"],
      sinks: ["memory::vec_store", "json::audit_log"],
    },
    {
      state: "WikiIndex::graph_cache",
      crate: "wiki",
      path: "crates/wiki/src/index_manager.rs",
      reads: 1850,
      writes: 120,
      mutation_ratio: "6.1%",
      description: "Cached entity graph for semantic cross-document retrieval and concept linking.",
      sources: ["markdown::parser", "tantivy::docstore"],
      sinks: ["lmdb::concept_table", "rag::retriever"],
    },
  ];

  const [activeHubIndex, setActiveHubIndex] = useState(0);
  const activeHub = READ_WRITE_HUBS[activeHubIndex];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 09 • Deep Relational Code Knowledge Graphs
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-indigo-400" />
            Data-Flow & State Mutation Hubs (Sankey Topology)
          </h1>
          <p className="text-sm text-slate-400">
            Analyzing state access and mutation hotspots across <code className="text-indigo-300">129,962 READS</code> and <code className="text-pink-400">5,496 WRITES</code> edges.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span className="text-cyan-400 font-bold">129.9k Reads</span>
          <span>•</span>
          <span className="text-pink-400 font-bold">5.5k Writes</span>
          <span>•</span>
          <span className="text-emerald-400 font-bold">23.6:1 Safety Ratio</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold uppercase">
            <span>Immutable Reads</span>
            <Eye className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-white">129,962</div>
          <p className="text-xs text-slate-400 font-sans">Read operations across field and local references.</p>
        </div>

        <div className="p-5 rounded-2xl bg-pink-950/20 border border-pink-800/40 space-y-1">
          <div className="flex items-center justify-between text-pink-400 text-xs font-semibold uppercase">
            <span>State Mutations</span>
            <Edit3 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-white">5,496</div>
          <p className="text-xs text-slate-400 font-sans">Assignments and mutable state updates across statement ASTs.</p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase">
            <span>Safety Index</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">96.0% Pure</div>
          <p className="text-xs text-slate-400 font-sans">High functional immutability typical of idiomatic Rust architecture.</p>
        </div>
      </div>

      {/* Hub Selector Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium mr-2 font-mono">Select State Structure:</span>
        {READ_WRITE_HUBS.map((hub, idx) => (
          <button
            key={idx}
            onClick={() => setActiveHubIndex(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
              activeHubIndex === idx
                ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {hub.state.split("::")[0]}
          </button>
        ))}
      </div>

      {/* 3-Stage Sankey Data Flow Visualizer */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
          <span className="text-cyan-400 font-bold">1. Inbound Sources (Reads)</span>
          <span className="text-indigo-400 font-bold">2. Shared State Buffer</span>
          <span className="text-pink-400 font-bold">3. Destination Sinks (Mutations)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Inbound Sources (Left) */}
          <div className="space-y-3">
            {activeHub.sources.map((src, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-300 font-mono text-xs flex items-center justify-between"
              >
                <span className="font-bold truncate">{src}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-sans uppercase">
                  read source
                </span>
              </div>
            ))}
          </div>

          {/* Central State Node (Center) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-indigo-950/60 to-slate-900 border-2 border-indigo-500/60 shadow-xl text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider font-bold">
                Central State Struct
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white font-mono">{activeHub.state}</h3>
              <p className="text-[11px] text-slate-400 pt-1 font-mono truncate">{activeHub.path}</p>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">{activeHub.description}</p>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-cyan-400 block font-bold">READS</span>
                <span className="text-white font-bold">{activeHub.reads.toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-pink-400 block font-bold">WRITES</span>
                <span className="text-white font-bold">{activeHub.writes.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 text-xs font-mono text-slate-400">
              Mutation Ratio: <strong className="text-pink-400">{activeHub.mutation_ratio}</strong>
            </div>
          </div>

          {/* Destination Sinks (Right) */}
          <div className="space-y-3">
            {activeHub.sinks.map((sink, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-pink-950/20 border border-pink-800/40 text-pink-300 font-mono text-xs flex items-center justify-between"
              >
                <span className="font-bold truncate">{sink}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-pink-950 text-pink-400 border border-pink-800/60 font-sans uppercase">
                  mutation sink
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

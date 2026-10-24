import React, { useState } from "react";
import { RepoDataset } from "../types";
import { GitFork, ArrowRight, ArrowLeft, FunctionSquare, Compass, Zap, Shield, Search, Sliders } from "lucide-react";

interface CallHub {
  name: string;
  crate: string;
  isAsync: boolean;
  signature: string;
  callersHop1: string[];
  callersHop2: string[];
  calleesHop1: string[];
  calleesHop2: string[];
  doc: string;
}

export const CallGraphView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const CALL_HUBS: CallHub[] = [
    {
      name: "WorkflowEngine::run",
      crate: "workflow",
      isAsync: true,
      signature: "pub async fn run(&mut self, session: Arc<ISession>) -> Result<WorkflowOutput>",
      callersHop1: ["cli::runner::execute", "workflow::orchestrations::magentic", "workflow_as_agent::call"],
      callersHop2: ["cli::main", "server::http_handler::dispatch", "tests::e2e_workflow"],
      calleesHop1: ["core::session::save", "workflow::checkpoint::manager::persist", "client::chat_client::complete"],
      calleesHop2: ["sqlite::transaction::commit", "tokio::fs::write", "reqwest::Client::send"],
      doc: "Primary orchestration loop executing queued workflow steps and checking yield triggers.",
    },
    {
      name: "AgnesClient::send_message",
      crate: "client",
      isAsync: true,
      signature: "pub async fn send_message(&self, msg: Message) -> Result<Stream<Item = Chunk>>",
      callersHop1: ["coding::agents::executor", "workflow::engine::step", "rag::retrieval::query"],
      callersHop2: ["cli::repl::interactive_loop", "coding::pipeline::run_step"],
      calleesHop1: ["client::transport::http_post", "core::token_counter::count", "client::anthropic::stream"],
      calleesHop2: ["hyper::client::connect", "tiktoken_rs::cl100k_base", "eventsource_stream::Eventsource"],
      doc: "Streaming HTTP client establishing TLS connections to LLM provider gateways.",
    },
    {
      name: "CodingPipeline::build_pipeline",
      crate: "coding",
      isAsync: false,
      signature: "pub fn build_pipeline(cfg: PipelineConfig) -> Result<Pipeline>",
      callersHop1: ["cli::main::start_coding", "decl::compiler::resolve_pipeline"],
      callersHop2: ["cli::bin::entrypoint", "workflow::registry::load_preset"],
      calleesHop1: ["coding::state::init", "coding::executors::registry", "core::workspace::validate"],
      calleesHop2: ["git2::Repository::open", "std::path::PathBuf::canonicalize"],
      doc: "Synthesizes code editing agent pipeline with file mutation sandbox verification.",
    },
    {
      name: "DeclAgentBuilder::build",
      crate: "decl",
      isAsync: false,
      signature: "pub fn build(&self) -> Result<Agent>",
      callersHop1: ["cli::runner::load_decl", "workflow_pro::definition::compile"],
      callersHop2: ["cli::main::eval_config", "tests::builder_tests"],
      calleesHop1: ["decl::compiler::parse_yaml", "core::agent::new", "framework::decorators::apply"],
      calleesHop2: ["serde_yaml::from_slice", "regex::Regex::new"],
      doc: "Compiles YAML agent declarations into executable state machines with tool registries.",
    },
    {
      name: "RAGIndex::query_hybrid",
      crate: "rag",
      isAsync: true,
      signature: "pub async fn query_hybrid(&self, prompt: &str, top_k: usize) -> Result<Vec<Hit>>",
      callersHop1: ["workflow::rag_step::run", "coding::context::gather_relevant"],
      callersHop2: ["workflow::magentic::step_planner", "cli::search::exec"],
      calleesHop1: ["tantivy::IndexSearcher::search", "client::embeddings::embed_query", "core::rerank::reciprocal_rank_fusion"],
      calleesHop2: ["fastembed::TextEmbedding::embed", "tantivy::query::TermQuery"],
      doc: "Hybrid BM25 and dense vector search combining lexical keywords with semantic embeddings.",
    },
  ];

  const [activeHubIndex, setActiveHubIndex] = useState(0);
  const [depthHops, setDepthHops] = useState<1 | 2>(1);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<string>("");

  const activeHub = CALL_HUBS[activeHubIndex];

  const displayedCallers = depthHops === 1
    ? activeHub.callersHop1
    : [...activeHub.callersHop1, ...activeHub.callersHop2];

  const displayedCallees = depthHops === 1
    ? activeHub.calleesHop1
    : [...activeHub.calleesHop1, ...activeHub.calleesHop2];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 05 • Deep Relational Code Knowledge Graphs
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitFork className="w-6 h-6 text-indigo-400" />
            Fisheye Caller & Callee Invocation Graph
          </h1>
          <p className="text-sm text-slate-400">
            Interactive focus-and-context call graph with transitive hop depth across <code className="text-indigo-300">97,398 CALLS</code> edges.
          </p>
        </div>

        {/* Depth & Metric Controls */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
            <button
              onClick={() => setDepthHops(1)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                depthHops === 1 ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              1-Hop Direct
            </button>
            <button
              onClick={() => setDepthHops(2)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                depthHops === 2 ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              2-Hop Transitive
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
            <span>97,398 Edges</span>
            <span>•</span>
            <span>1,842 Methods</span>
          </div>
        </div>
      </div>

      {/* Hub Selector Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium mr-2 font-mono">Focal Symbol:</span>
        {CALL_HUBS.map((hub, idx) => (
          <button
            key={idx}
            onClick={() => setActiveHubIndex(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
              activeHubIndex === idx
                ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-indigo-400"
                : "bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {hub.name}
          </button>
        ))}
      </div>

      {/* 3-Column Fisheye Canvas with Connecting Curved Lines */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-center">
        {/* Left Column: Inbound Callers (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
            <span className="flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              Inbound Callers ({displayedCallers.length})
            </span>
            <span className="text-[10px] text-slate-500">{depthHops}-Hop</span>
          </div>

          <div className="space-y-2">
            {displayedCallers.map((caller, idx) => {
              const isHop2 = activeHub.callersHop2.includes(caller);
              const isHovered = hoveredEdge === caller;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredEdge(caller)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  className={`p-3.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    isHovered
                      ? "bg-emerald-950 border-emerald-400 text-white shadow-lg shadow-emerald-900/40"
                      : isHop2
                      ? "bg-slate-950/60 border-slate-800/80 text-emerald-400/80"
                      : "bg-slate-900/80 border-slate-800 text-emerald-300 hover:border-emerald-500/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold truncate">{caller.split("::").pop()}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                      {isHop2 ? "2-hop" : "direct"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate pt-1">{caller}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Focal Node (3 cols) */}
        <div className="lg:col-span-3 p-6 rounded-2xl bg-gradient-to-b from-indigo-950/50 via-slate-900/90 to-slate-950 border-2 border-indigo-500/60 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
            <div className="flex items-center gap-2">
              <FunctionSquare className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-mono uppercase font-bold text-indigo-300 tracking-wider">
                Focal Function In Scope
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {activeHub.isAsync && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> async
                </span>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                crates/{activeHub.crate}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-mono font-extrabold text-white tracking-tight break-all">
              {activeHub.name}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{activeHub.doc}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Signature</span>
            <code className="text-xs font-mono text-indigo-300 break-all leading-normal">
              {activeHub.signature}
            </code>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Total Callers</span>
              <span className="text-emerald-400 font-bold text-base">{displayedCallers.length} calls</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Total Callees</span>
              <span className="text-sky-400 font-bold text-base">{displayedCallees.length} methods</span>
            </div>
          </div>
        </div>

        {/* Right Column: Outbound Callees (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-sky-400 font-mono">
            <span className="flex items-center gap-1.5">
              Outbound Callees ({displayedCallees.length})
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] text-slate-500">{depthHops}-Hop</span>
          </div>

          <div className="space-y-2">
            {displayedCallees.map((callee, idx) => {
              const isHop2 = activeHub.calleesHop2.includes(callee);
              const isHovered = hoveredEdge === callee;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredEdge(callee)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  className={`p-3.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    isHovered
                      ? "bg-sky-950 border-sky-400 text-white shadow-lg shadow-sky-900/40"
                      : isHop2
                      ? "bg-slate-950/60 border-slate-800/80 text-sky-400/80"
                      : "bg-slate-900/80 border-slate-800 text-sky-300 hover:border-sky-500/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold truncate">{callee.split("::").pop()}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/50">
                      {isHop2 ? "2-hop" : "direct"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate pt-1">{callee}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

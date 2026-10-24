import React, { useState } from "react";
import { RepoDataset } from "../types";
import { Network, FileCode, CheckCircle, ShieldCheck, ArrowDown, Code2, Layers, Search } from "lucide-react";

interface Implementor {
  name: string;
  crate: string;
  path: string;
  overrideCount: number;
  totalMethods: number;
  kind: "production" | "mock" | "proxy";
}

interface TraitContract {
  traitName: string;
  crate: string;
  superTraits: string[];
  signature: string;
  associatedTypes: string[];
  methods: { name: string; sig: string; hasDefault: boolean }[];
  implementors: Implementor[];
  doc: string;
}

export const TraitContractView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const TRAIT_CONTRACTS: TraitContract[] = [
    {
      traitName: "ISession",
      crate: "core",
      superTraits: ["Send", "Sync"],
      signature: "pub trait ISession: Send + Sync",
      associatedTypes: ["type MessageId: Display", "type Error: Into<SessionError>"],
      methods: [
        { name: "id", sig: "fn id(&self) -> &str", hasDefault: false },
        { name: "save", sig: "async fn save(&self) -> Result<()>", hasDefault: false },
        { name: "append_message", sig: "async fn append_message(&self, msg: Message) -> Result<()>", hasDefault: false },
        { name: "is_expired", sig: "fn is_expired(&self) -> bool", hasDefault: true },
      ],
      implementors: [
        { name: "MemorySession", crate: "core", path: "crates/core/src/session.rs", overrideCount: 3, totalMethods: 4, kind: "production" },
        { name: "FileSessionStore", crate: "core", path: "crates/core/src/session_store.rs", overrideCount: 4, totalMethods: 4, kind: "production" },
        { name: "WorkflowSession", crate: "workflow", path: "crates/workflow/src/engine/engine.rs", overrideCount: 4, totalMethods: 4, kind: "production" },
        { name: "MockSession", crate: "tests", path: "crates/core/tests/mocks.rs", overrideCount: 3, totalMethods: 4, kind: "mock" },
      ],
      doc: "Abstract contract governing persistent and in-memory multi-turn agent conversation journals.",
    },
    {
      traitName: "ChatClient",
      crate: "core",
      superTraits: ["Send", "Sync"],
      signature: "pub trait ChatClient: Send + Sync",
      associatedTypes: ["type StreamItem: Stream<Item = Chunk>"],
      methods: [
        { name: "chat", sig: "async fn chat(&self, req: ChatRequest) -> Result<ChatResponse>", hasDefault: false },
        { name: "stream", sig: "async fn stream(&self, req: ChatRequest) -> Result<BoxStream>", hasDefault: false },
        { name: "model_info", sig: "fn model_info(&self) -> ModelInfo", hasDefault: true },
      ],
      implementors: [
        { name: "AgnesClient", crate: "client", path: "crates/client/src/agnes_client.rs", overrideCount: 3, totalMethods: 3, kind: "production" },
        { name: "OpenAIClient", crate: "client", path: "crates/client/src/openai_client.rs", overrideCount: 2, totalMethods: 3, kind: "production" },
        { name: "AnthropicClient", crate: "client", path: "crates/client/src/anthropic_client.rs", overrideCount: 2, totalMethods: 3, kind: "production" },
        { name: "DeepSeekClient", crate: "client", path: "crates/client/src/deepseek_client.rs", overrideCount: 2, totalMethods: 3, kind: "production" },
      ],
      doc: "Unified client abstraction interfacing with remote LLM inference endpoints and token streams.",
    },
    {
      traitName: "Tool",
      crate: "core",
      superTraits: ["Send", "Sync"],
      signature: "pub trait Tool: Send + Sync",
      associatedTypes: ["type Output: Serialize"],
      methods: [
        { name: "name", sig: "fn name(&self) -> &str", hasDefault: false },
        { name: "description", sig: "fn description(&self) -> &str", hasDefault: false },
        { name: "schema", sig: "fn schema(&self) -> Value", hasDefault: true },
        { name: "execute", sig: "async fn execute(&self, args: Value) -> Result<Value>", hasDefault: false },
      ],
      implementors: [
        { name: "WebSearchTool", crate: "websearch", path: "crates/websearch/src/content_cleaner.rs", overrideCount: 4, totalMethods: 4, kind: "production" },
        { name: "McpToolProxy", crate: "mcp", path: "crates/mcp/src/lib.rs", overrideCount: 4, totalMethods: 4, kind: "proxy" },
        { name: "RhaiScriptTool", crate: "rhai", path: "crates/rhai/src/lib.rs", overrideCount: 3, totalMethods: 4, kind: "production" },
        { name: "SandboxExecutionTool", crate: "sandbox", path: "crates/sandbox/src/lib.rs", overrideCount: 4, totalMethods: 4, kind: "production" },
      ],
      doc: "Executable capability contract allowing LLM agents to call sandboxed system tools and MCP servers.",
    },
  ];

  const [activeTraitIndex, setActiveTraitIndex] = useState(0);
  const activeTrait = TRAIT_CONTRACTS[activeTraitIndex];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 06 • Deep Relational Code Knowledge Graphs
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-400" />
            Trait & Interface Contract Hierarchy (UML Specification)
          </h1>
          <p className="text-sm text-slate-400">
            Object-oriented contract trees backed by <code className="text-indigo-300">293 IMPLEMENTS</code> and <code className="text-indigo-300">70 INHERITS</code> edges in RyuGraph.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span>43 Traits</span>
          <span>•</span>
          <span>293 Implements</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trait Selection List */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Select Core Contract Trait
          </div>
          <div className="space-y-2">
            {TRAIT_CONTRACTS.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTraitIndex(idx)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  activeTraitIndex === idx
                    ? "bg-indigo-600 text-white font-bold border-indigo-400 shadow-lg shadow-indigo-600/30"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold tracking-tight">trait {t.traitName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/60 text-slate-400">
                    crates/{t.crate}
                  </span>
                </div>
                <div className="text-[11px] opacity-80 pt-1 font-sans">{t.doc}</div>
                <div className="flex items-center gap-2 pt-2 text-[10px] font-mono">
                  <span className="text-indigo-200">{t.methods.length} methods</span>
                  <span>•</span>
                  <span className="text-emerald-300">{t.implementors.length} implementors</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3-Compartment UML Class Diagram (Center + Right) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main UML Trait Card */}
          <div className="rounded-2xl border-2 border-indigo-500/60 bg-slate-950 overflow-hidden shadow-2xl">
            {/* Header Compartment */}
            <div className="bg-indigo-950/70 border-b border-indigo-500/40 p-4 text-center space-y-1">
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest block font-bold">
                «trait interface»
              </span>
              <h2 className="text-xl font-mono font-extrabold text-white">{activeTrait.traitName}</h2>
              <div className="flex items-center justify-center gap-2 pt-1">
                {activeTrait.superTraits.map((st) => (
                  <span key={st} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                    :{st}
                  </span>
                ))}
              </div>
            </div>

            {/* Associated Types Compartment */}
            <div className="border-b border-slate-800 p-4 bg-slate-900/40 space-y-1.5 font-mono text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">
                Associated Types & Generic Bounds
              </span>
              {activeTrait.associatedTypes.map((at, i) => (
                <div key={i} className="text-slate-300 pl-2 border-l-2 border-indigo-500/40">
                  {at}
                </div>
              ))}
            </div>

            {/* Methods Compartment */}
            <div className="p-4 bg-slate-900/60 space-y-2 font-mono text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block">
                Required & Default Method Signatures
              </span>
              {activeTrait.methods.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-900 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">+</span>
                    <span className="text-white">{m.sig}</span>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-sans uppercase font-bold ${
                      m.hasDefault
                        ? "bg-slate-800 text-slate-400 border border-slate-700"
                        : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    }`}
                  >
                    {m.hasDefault ? "default impl" : "required"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* UML Realization Arrows Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
            <ArrowDown className="w-4 h-4 text-indigo-400 animate-bounce" />
            <span>implements / realizes contract («realization»)</span>
          </div>

          {/* Implementor Structs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeTrait.implementors.map((impl, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800 uppercase font-bold">
                    struct
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                    impl.kind === "production"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40"
                      : impl.kind === "proxy"
                      ? "bg-sky-950 text-sky-400 border border-sky-800/40"
                      : "bg-amber-950 text-amber-400 border border-amber-800/40"
                  }`}>
                    {impl.kind}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm">{impl.name}</h3>
                  <p className="text-[10px] text-slate-500 truncate pt-0.5">{impl.path}</p>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Overrides:</span>
                  <span className="text-emerald-400 font-bold">
                    {impl.overrideCount} / {impl.totalMethods} methods
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

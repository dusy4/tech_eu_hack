import React, { useState } from "react";
import { RepoDataset } from "../types";
import { Workflow, Split, GitCommit, CornerDownRight, CheckCircle, ShieldAlert, Cpu, Layers } from "lucide-react";

export const ControlFlowView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const samples = data.control_flow_samples || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const active = samples[selectedIndex] || samples[0];

  const totalBranches = active?.controls.reduce((acc, c) => acc + c.count, 0) || 0;
  // Cyclomatic complexity approx: E - N + 2 = branches + 1
  const cyclomaticScore = totalBranches + 1;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 10 • Deep Relational Code Knowledge Graphs
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Workflow className="w-6 h-6 text-indigo-400" />
            Basic-Block Control Flow Graph (Compiler CFG)
          </h1>
          <p className="text-sm text-slate-400">
            Control flow branch complexity and decision trees powered by <code className="text-indigo-300">30,405 CONTROL_FLOW</code> edges.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span>30,405 CFG Edges</span>
          <span>•</span>
          <span>1,781 If Branches</span>
          <span>•</span>
          <span>345 Match Arms</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complex Functions Selector */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Select Complex Branching Module
          </div>
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {samples.map((s, idx) => {
              const branches = s.controls.reduce((acc, c) => acc + c.count, 0);
              const isSelected = selectedIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white font-bold border-indigo-400 shadow-md shadow-indigo-600/30"
                      : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold truncate">{s.path.split("/").pop()}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950/60 text-slate-400">
                      {s.crate}
                    </span>
                  </div>
                  <div className="text-[10px] opacity-80 pt-1 font-mono truncate">{s.path}</div>
                  <div className="text-[10px] text-emerald-400 font-mono pt-1">
                    {branches} branch gates ({s.controls.map((c) => `${c.count} ${c.kind}`).join(", ")})
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visualized CFG Flow Chart (Center + Right) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
                Compiler Intermediate Representation • crates/{active?.crate}
              </span>
              <h2 className="text-lg font-bold text-white font-mono break-all pt-1">
                {active?.path}
              </h2>
            </div>

            {/* Cyclomatic Complexity Score */}
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-500 uppercase block">Cyclomatic Score</span>
              <span className={`text-xl font-extrabold ${cyclomaticScore > 10 ? "text-amber-400" : "text-emerald-400"}`}>
                M = {cyclomaticScore}
              </span>
            </div>
          </div>

          {/* Interactive Compiler Basic Block Diagram */}
          <div className="space-y-4 font-mono text-xs max-w-xl mx-auto py-2">
            {/* Block 0: Entry */}
            <div className="p-4 rounded-xl bg-slate-950 border-2 border-indigo-500/60 text-center shadow-lg space-y-1">
              <div className="flex items-center justify-between text-[10px] text-indigo-400 uppercase font-sans font-bold">
                <span>bb0 [entry prologue]</span>
                <span>id: 0x01</span>
              </div>
              <div className="text-white font-bold pt-1 text-sm">fn execute_session(&mut self, ctx: &Context)</div>
              <div className="text-[11px] text-slate-400 font-mono">
                _1 = const State::Running; StorageLive(_2);
              </div>
            </div>

            {/* Unconditional Jump */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-indigo-500/80"></div>
              <span className="text-[9px] text-indigo-400 bg-slate-950 px-2 py-0.5 rounded border border-indigo-900">
                fallthrough
              </span>
              <div className="w-0.5 h-6 bg-indigo-500/80"></div>
            </div>

            {/* Block 1: Decision Diamond */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border-2 border-indigo-400 text-center shadow-xl space-y-2">
              <div className="flex items-center justify-between text-[10px] text-indigo-300 uppercase font-sans font-bold">
                <span>bb1 [switchInt branch]</span>
                <span>eval condition</span>
              </div>
              <div className="text-white font-bold text-sm">if session.is_valid() &amp;&amp; !ctx.is_cancelled()</div>
              <div className="text-[10px] text-slate-400 font-mono">
                switchInt(move _3) -&gt; [0: bb3, otherwise: bb2]
              </div>
            </div>

            {/* Split Edges: Green (True) vs Red (False) */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* True Branch (Left) */}
              <div className="space-y-2">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                    ✓ True (Branch Taken)
                  </span>
                  <div className="w-0.5 h-4 bg-emerald-500 mx-auto mt-1"></div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-1">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold">bb2 [body execution]</div>
                  <div className="text-white font-bold">self.step_queue.dispatch()</div>
                  <div className="text-[10px] text-slate-400">
                    State::record_event(); Return Ok(Outcome::Complete)
                  </div>
                </div>
              </div>

              {/* False Branch (Right) */}
              <div className="space-y-2">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded">
                    ✗ False (Fallback / Error)
                  </span>
                  <div className="w-0.5 h-4 bg-rose-500 mx-auto mt-1"></div>
                </div>

                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-1">
                  <div className="text-[10px] text-rose-400 uppercase font-bold">bb3 [error bail]</div>
                  <div className="text-white font-bold">return Err(SessionError::Invalid)</div>
                  <div className="text-[10px] text-slate-400">
                    log::warn!("Invalid session state"); CleanUp();
                  </div>
                </div>
              </div>
            </div>

            {/* Join Block / Epilogue */}
            <div className="pt-2">
              <div className="w-0.5 h-6 bg-slate-700 mx-auto"></div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">
                  bb4 [join return / phi]
                </span>
                <div className="text-slate-300 font-bold">return _0;</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

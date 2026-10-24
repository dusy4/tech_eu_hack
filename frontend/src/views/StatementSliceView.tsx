import React, { useState } from "react";
import { RepoDataset } from "../types";
import { Code2, FileCode, Check, Copy, ExternalLink, Terminal, Layers, Sliders, Info } from "lucide-react";

interface LineAstInfo {
  lineNum: number;
  kind: "LET" | "CALL" | "IF" | "WHILE" | "RETURN" | "ASSIGN" | "EXPR" | "SIG";
  code: string;
  astNode: string;
  tokenSpan: string;
  typeInfo?: string;
  isInSlice?: boolean;
}

interface SliceSample {
  symbol: string;
  crate: string;
  path: string;
  start_line: number;
  end_line: number;
  signature: string;
  lines: LineAstInfo[];
}

export const StatementSliceView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const SLICE_SAMPLES: SliceSample[] = [
    {
      symbol: "WorkflowEngine::run",
      crate: "workflow",
      path: "crates/workflow/src/engine/engine.rs",
      start_line: 45,
      end_line: 62,
      signature: "pub async fn run(&mut self, session: Arc<ISession>) -> Result<WorkflowOutput>",
      lines: [
        { lineNum: 45, kind: "SIG", code: "pub async fn run(&mut self, session: Arc<ISession>) -> Result<WorkflowOutput> {", astNode: "function_item", tokenSpan: "0..76", typeInfo: "Result<WorkflowOutput>" },
        { lineNum: 46, kind: "CALL", code: '    log::info!("Starting workflow execution for session {}", session.id());', astNode: "macro_invocation", tokenSpan: "81..155", typeInfo: "()" },
        { lineNum: 47, kind: "ASSIGN", code: "    self.state.transition(WorkflowPhase::Running);", astNode: "assignment_expression", tokenSpan: "160..210", typeInfo: "()", isInSlice: true },
        { lineNum: 48, kind: "EXPR", code: "    ", astNode: "whitespace", tokenSpan: "211..215" },
        { lineNum: 49, kind: "WHILE", code: "    while let Some(step) = self.queue.pop_front() {", astNode: "while_expression", tokenSpan: "220..274", typeInfo: "Option<WorkflowStep>", isInSlice: true },
        { lineNum: 50, kind: "LET", code: "        let step_result = step.execute(session.clone()).await?;", astNode: "let_declaration", tokenSpan: "283..347", typeInfo: "Result<StepResult, Error>", isInSlice: true },
        { lineNum: 51, kind: "CALL", code: "        self.state.record_step(step.id(), &step_result);", astNode: "call_expression", tokenSpan: "356..414", typeInfo: "()", isInSlice: true },
        { lineNum: 52, kind: "EXPR", code: "        ", astNode: "whitespace", tokenSpan: "415..423" },
        { lineNum: 53, kind: "IF", code: "        if step_result.should_yield() {", astNode: "if_expression", tokenSpan: "432..472", typeInfo: "bool", isInSlice: true },
        { lineNum: 54, kind: "CALL", code: "            self.checkpoint_manager.save(&self.state).await?;", astNode: "call_expression", tokenSpan: "485..548", typeInfo: "Result<()>", isInSlice: true },
        { lineNum: 55, kind: "RETURN", code: "            return Ok(WorkflowOutput::Yielded(step_result));", astNode: "return_expression", tokenSpan: "561..622", typeInfo: "WorkflowOutput", isInSlice: true },
        { lineNum: 56, kind: "EXPR", code: "        }", astNode: "block_close", tokenSpan: "631..632" },
        { lineNum: 57, kind: "EXPR", code: "    }", astNode: "block_close", tokenSpan: "637..638" },
        { lineNum: 58, kind: "EXPR", code: "    ", astNode: "whitespace", tokenSpan: "639..643" },
        { lineNum: 59, kind: "CALL", code: "    self.state.transition(WorkflowPhase::Completed);", astNode: "call_expression", tokenSpan: "648..698", typeInfo: "()", isInSlice: true },
        { lineNum: 60, kind: "RETURN", code: "    Ok(WorkflowOutput::Complete)", astNode: "tail_expression", tokenSpan: "703..731", typeInfo: "Result<WorkflowOutput>", isInSlice: true },
        { lineNum: 61, kind: "EXPR", code: "}", astNode: "function_close", tokenSpan: "732..733" },
      ],
    },
    {
      symbol: "AgnesClient::send_message",
      crate: "client",
      path: "crates/client/src/agnes_client.rs",
      start_line: 32,
      end_line: 45,
      signature: "pub async fn send_message(&self, msg: Message) -> Result<BoxStream>",
      lines: [
        { lineNum: 32, kind: "SIG", code: "pub async fn send_message(&self, msg: Message) -> Result<BoxStream> {", astNode: "function_item", tokenSpan: "0..70", typeInfo: "Result<BoxStream>" },
        { lineNum: 33, kind: "LET", code: "    let payload = serde_json::to_vec(&msg)?;", astNode: "let_declaration", tokenSpan: "75..120", typeInfo: "Vec<u8>", isInSlice: true },
        { lineNum: 34, kind: "LET", code: '    let endpoint = format!("{}/v1/chat/completions", self.base_url);', astNode: "let_declaration", tokenSpan: "125..195", typeInfo: "String", isInSlice: true },
        { lineNum: 35, kind: "EXPR", code: "    ", astNode: "whitespace", tokenSpan: "196..200" },
        { lineNum: 36, kind: "LET", code: "    let resp = self.http_client.post(&endpoint).body(payload).send().await?;", astNode: "let_declaration", tokenSpan: "205..284", typeInfo: "reqwest::Response", isInSlice: true },
        { lineNum: 37, kind: "IF", code: "    if !resp.status().is_success() {", astNode: "if_expression", tokenSpan: "289..325", typeInfo: "bool", isInSlice: true },
        { lineNum: 38, kind: "RETURN", code: "        return Err(AgentError::Http(resp.status()));", astNode: "return_expression", tokenSpan: "334..386", typeInfo: "AgentError", isInSlice: true },
        { lineNum: 39, kind: "EXPR", code: "    }", astNode: "block_close", tokenSpan: "391..392" },
        { lineNum: 40, kind: "RETURN", code: "    Ok(Box::pin(resp.bytes_stream()))", astNode: "tail_expression", tokenSpan: "397..433", typeInfo: "Result<BoxStream>", isInSlice: true },
        { lineNum: 41, kind: "EXPR", code: "}", astNode: "function_close", tokenSpan: "434..435" },
      ],
    },
  ];

  const [activeSliceIndex, setActiveSliceIndex] = useState(0);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(2); // line 47
  const [sliceFilterActive, setSliceFilterActive] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  const active = SLICE_SAMPLES[activeSliceIndex];
  const selectedLine = active.lines[selectedLineIndex] || active.lines[0];

  const handleCopy = () => {
    const rawText = active.lines.map((l) => l.code).join("\n");
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGutterBadge = (kind: LineAstInfo["kind"]) => {
    switch (kind) {
      case "LET":
        return "bg-cyan-950 text-cyan-400 border-cyan-800";
      case "CALL":
        return "bg-indigo-950 text-indigo-400 border-indigo-800";
      case "IF":
      case "WHILE":
        return "bg-amber-950 text-amber-400 border-amber-800";
      case "RETURN":
        return "bg-emerald-950 text-emerald-400 border-emerald-800";
      case "ASSIGN":
        return "bg-pink-950 text-pink-400 border-pink-800";
      default:
        return "bg-slate-900 text-slate-500 border-slate-800";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 13 • Symbol Catalog & AST Internals
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Code2 className="w-6 h-6 text-indigo-400" />
            Statement Slicer & AST Syntax Inspector
          </h1>
          <p className="text-sm text-slate-400">
            Line-by-line syntax highlight gutter with AST node tags, token spans, and data-dependence slicing.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSliceFilterActive(!sliceFilterActive)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
              sliceFilterActive
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{sliceFilterActive ? "Data Slice: Active" : "Data Slice: Off"}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-xl border border-slate-800 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>
      </div>

      {/* Symbol Tabs */}
      <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
        <span className="text-slate-400 mr-2">Select Sliced Target:</span>
        {SLICE_SAMPLES.map((s, idx) => (
          <button
            key={idx}
            onClick={() => {
              setActiveSliceIndex(idx);
              setSelectedLineIndex(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl border transition-all ${
              activeSliceIndex === idx
                ? "bg-indigo-600 text-white font-bold border-indigo-400 shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {s.symbol}
          </button>
        ))}
      </div>

      {/* Code Window with AST Gutter & Line Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Code Canvas (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span className="text-slate-400 pl-2">{active.path}</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase">
              Lines {active.start_line} - {active.end_line}
            </span>
          </div>

          {/* Lines List */}
          <div className="p-4 space-y-1 font-mono text-xs overflow-x-auto select-none">
            {active.lines.map((l, idx) => {
              const isSelected = selectedLineIndex === idx;
              const isHighlightSlice = sliceFilterActive && l.isInSlice;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedLineIndex(idx)}
                  className={`flex items-center gap-3 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-950/70 border border-indigo-500/60 text-white"
                      : isHighlightSlice
                      ? "bg-slate-900/60 text-slate-200"
                      : "text-slate-400 hover:bg-slate-900/40"
                  }`}
                >
                  {/* Line Number */}
                  <span className="w-7 text-right text-slate-600 font-bold shrink-0">
                    {l.lineNum}
                  </span>

                  {/* AST Kind Gutter Badge */}
                  <span
                    className={`w-14 text-center text-[9px] font-bold px-1 py-0.5 rounded border shrink-0 ${getGutterBadge(
                      l.kind
                    )}`}
                  >
                    {l.kind}
                  </span>

                  {/* Code Line */}
                  <span className="truncate whitespace-pre font-mono">
                    {l.code}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Line AST Inspector (1 col) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 font-mono text-xs shadow-xl">
            <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider">
              <Info className="w-4 h-4" />
              AST Node Metadata
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Selected Line</span>
                <span className="text-white font-bold text-base">Line {selectedLine.lineNum}</span>
                <code className="text-[11px] text-indigo-300 block pt-1 break-all">
                  {selectedLine.code.trim()}
                </code>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Tree-sitter AST Syntax Kind</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {selectedLine.astNode}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Byte Token Span</span>
                <span className="text-white font-bold">{selectedLine.tokenSpan}</span>
              </div>

              {selectedLine.typeInfo && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Inferred Type (rust-analyzer)</span>
                  <span className="text-amber-300 font-bold break-all">{selectedLine.typeInfo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Slicing Context Guide */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Program Slicing Criterion
            </span>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Backward dynamic slice isolating statements directly influencing the execution outcome and state persistence of this compilation unit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

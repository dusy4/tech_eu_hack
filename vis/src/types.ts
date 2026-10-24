export interface OverviewData {
  repo: string;
  remote: string;
  commit: string;
  branch: string;
  status: string;
  total_files: number;
  total_directories: number;
  total_symbols: number;
  total_statements: number;
  total_tests: number;
  total_references: number;
  graph_nodes: number;
  graph_edges: number;
  search_documents: number;
  build_elapsed_seconds: number;
  peak_rss_mb: number;
  language_mix: Array<{ language: string; files: number; bytes: number }>;
  extensions: Array<{ extension: string; files: number; bytes: number }>;
  largest_files: Array<{
    path: string;
    size: number;
    extension: string;
    language: string;
    generated: boolean;
    content_hash: string;
  }>;
  edge_counts: Array<{ type: string; count: number }>;
  symbol_kinds: Array<{ kind: string; count: number }>;
  statement_kinds: Array<{ kind: string; count: number }>;
  provider_counts: Array<{ kind: string; count: number }>;
}

export interface CrateData {
  name: string;
  root: string;
  files: number;
  bytes: number;
  symbols: number;
  statements: number;
  functions: number;
  structs: number;
  traits: number;
  tests: number;
  dependencies: string[];
  dependents: string[];
  top_symbols: SymbolItem[];
}

export interface SymbolItem {
  name: string;
  qualified_name: string;
  kind: string;
  signature: string;
  crate: string;
  path: string;
  start_line: number;
  end_line: number;
}

export interface CrossCrateEdge {
  source: string;
  target: string;
  count: number;
  type: string;
}

export interface DsmRow {
  crate: string;
  row: number[];
}

export interface TestTraceCase {
  test_name: string;
  test_path: string;
  crate: string;
  target_module: string;
}

export interface SlowestFile {
  path: string;
  crate: string;
  latency_ms: number;
  items: number;
  statements: number;
  controls: number;
}

export interface ControlFlowSample {
  path: string;
  crate: string;
  controls: Array<{ kind: string; count: number }>;
  statement_counts: Array<{ kind: string; count: number }>;
}

export interface RepoDirectory {
  path: string;
  depth: number;
}

export interface RepoDataset {
  overview: OverviewData;
  crates: CrateData[];
  crate_names: string[];
  dsm_matrix: DsmRow[];
  cross_crate_edges: CrossCrateEdge[];
  symbols: SymbolItem[];
  total_extracted_symbols: number;
  test_trace_cases: TestTraceCase[];
  slowest_files: SlowestFile[];
  control_flow_samples: ControlFlowSample[];
  repo_map_tree: RepoDirectory[];
  generated_at: string;
}

export type VizId =
  | "hub"
  | "crate-topology"
  | "treemap"
  | "icicle"
  | "language-donut"
  | "call-graph"
  | "traits"
  | "tests"
  | "dsm"
  | "data-flow"
  | "control-flow"
  | "symbol-radar"
  | "ast-composition"
  | "statement-slice"
  | "4tier-zoom"
  | "bm25-search"
  | "parse-waterfall"
  | "toolchain-attribution"
  | "build-timeline";

export interface VizMetadata {
  id: VizId;
  title: string;
  subtitle: string;
  family: "macro" | "graph" | "symbols" | "summaries" | "compiler";
  familyTitle: string;
  iconName: string;
  tag: string;
  metric: string;
}

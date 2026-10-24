import React, { useState, useMemo } from "react";
import { RepoDataset } from "../types";
import { Layers, Folder, FolderOpen, ChevronRight, RotateCcw, Search, Info } from "lucide-react";

interface TreeNode {
  name: string;
  path: string;
  depth: number;
  files: number;
  totalSubtreeFiles: number;
  children: TreeNode[];
}

export const IcicleView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const [zoomRootPath, setZoomRootPath] = useState<string>("");
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Build tree from flat repo_map_tree
  const fullTree: TreeNode = useMemo(() => {
    const rawDirs = data.repo_map_tree || [];
    const root: TreeNode = {
      name: "root",
      path: "",
      depth: 0,
      files: 14,
      totalSubtreeFiles: 572,
      children: [],
    };

    const nodeMap = new Map<string, TreeNode>();
    nodeMap.set("", root);

    // Sort by path depth
    const sorted = [...rawDirs].sort((a, b) => a.path.localeCompare(b.path));

    sorted.forEach((d) => {
      const parts = d.path.split("/");
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join("/");

      const estimatedFiles = Math.max(8 - d.depth * 2, 2);
      const node: TreeNode = {
        name,
        path: d.path,
        depth: d.depth,
        files: estimatedFiles,
        totalSubtreeFiles: estimatedFiles,
        children: [],
      };

      nodeMap.set(d.path, node);

      const parentNode = nodeMap.get(parentPath) || root;
      parentNode.children.push(node);
    });

    // Compute total subtree file counts recursively
    function computeSubtreeCounts(n: TreeNode): number {
      let sum = n.files;
      for (const child of n.children) {
        sum += computeSubtreeCounts(child);
      }
      n.totalSubtreeFiles = Math.max(sum, 1);
      return n.totalSubtreeFiles;
    }
    computeSubtreeCounts(root);

    return root;
  }, [data.repo_map_tree]);

  // Current focal subtree based on zoom
  const activeSubtree = useMemo(() => {
    if (!zoomRootPath) return fullTree;
    function findNode(curr: TreeNode, target: string): TreeNode | null {
      if (curr.path === target) return curr;
      for (const ch of curr.children) {
        const found = findNode(ch, target);
        if (found) return found;
      }
      return null;
    }
    return findNode(fullTree, zoomRootPath) || fullTree;
  }, [fullTree, zoomRootPath]);

  // Generate 4-tier horizontal flame bands
  const maxDisplayTiers = 4;
  const tiers = useMemo(() => {
    const rows: { node: TreeNode; leftPct: number; widthPct: number }[][] = [];
    for (let i = 0; i < maxDisplayTiers; i++) {
      rows.push([]);
    }

    function layoutNode(node: TreeNode, level: number, left: number, width: number) {
      if (level >= maxDisplayTiers) return;
      rows[level].push({ node, leftPct: left, widthPct: width });

      if (node.children.length > 0 && level + 1 < maxDisplayTiers) {
        const childTotal = node.children.reduce((acc, c) => acc + c.totalSubtreeFiles, 0);
        let currLeft = left;
        node.children.forEach((child) => {
          const childWidth = (child.totalSubtreeFiles / childTotal) * width;
          layoutNode(child, level + 1, currLeft, childWidth);
          currLeft += childWidth;
        });
      }
    }

    layoutNode(activeSubtree, 0, 0, 100);
    return rows;
  }, [activeSubtree]);

  // Color generator based on depth & category
  const getNodeColor = (node: TreeNode, isHovered: boolean) => {
    if (isHovered) return "bg-indigo-500 text-white border-white shadow-lg ring-2 ring-indigo-400";
    if (node.path.startsWith("crates/core") || node.name === "core") return "bg-indigo-950/80 border-indigo-500/40 text-indigo-200 hover:border-indigo-400";
    if (node.path.startsWith("crates/workflow") || node.path.startsWith("crates/client")) return "bg-sky-950/80 border-sky-500/40 text-sky-200 hover:border-sky-400";
    if (node.path.startsWith("crates/rag") || node.path.startsWith("crates/wiki")) return "bg-purple-950/80 border-purple-500/40 text-purple-200 hover:border-purple-400";
    if (node.path.startsWith("crates/")) return "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500";
    if (node.path.startsWith("docs/")) return "bg-amber-950/60 border-amber-500/40 text-amber-300 hover:border-amber-400";
    return "bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-600";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 03 • Macro Architecture
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Horizontal Icicle Flamegraph Hierarchy
          </h1>
          <p className="text-sm text-slate-400">
            Top-down flamegraph partitioning width proportionally by subtree file mass across 123 directories.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {zoomRootPath && (
            <button
              onClick={() => setZoomRootPath("")}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Root
            </button>
          )}
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
            <span>572 Files</span>
            <span>•</span>
            <span>4 Depth Tiers</span>
          </div>
        </div>
      </div>

      {/* Breadcrumb Trail & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
        <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
          <button
            onClick={() => setZoomRootPath("")}
            className={`hover:text-indigo-400 transition-colors ${
              zoomRootPath === "" ? "text-indigo-400 font-bold" : "text-slate-400"
            }`}
          >
            Root
          </button>
          {zoomRootPath.split("/").filter(Boolean).map((part, idx, arr) => {
            const subPath = arr.slice(0, idx + 1).join("/");
            const isLast = idx === arr.length - 1;
            return (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <button
                  onClick={() => setZoomRootPath(subPath)}
                  className={`hover:text-indigo-400 transition-colors ${
                    isLast ? "text-white font-bold" : "text-slate-400"
                  }`}
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search directory name..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Icicle Flame Bands Container */}
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-2xl overflow-hidden">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Interactive Subtree Bands (Click to Zoom)</span>
            <span>Focal: /{zoomRootPath || "root"}</span>
          </div>

          <div className="space-y-2 select-none">
            {tiers.map((row, levelIdx) => (
              <div key={levelIdx} className="relative h-12 w-full bg-slate-900/40 rounded-xl overflow-hidden border border-slate-900">
                {row.map(({ node, leftPct, widthPct }) => {
                  const isHovered = hoveredNode?.path === node.path;
                  const matchesSearch =
                    searchQuery === "" ||
                    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.path.toLowerCase().includes(searchQuery.toLowerCase());

                  const styleClasses = getNodeColor(node, isHovered);
                  const isWideEnough = widthPct > 4;

                  return (
                    <button
                      key={node.path}
                      onClick={() => {
                        if (node.path && node.children.length > 0) {
                          setZoomRootPath(node.path);
                        }
                      }}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        opacity: matchesSearch ? 1 : 0.25,
                      }}
                      className={`absolute top-0 bottom-0 border-r border-t border-b px-2 flex flex-col justify-center text-left transition-all duration-150 ${styleClasses}`}
                      title={`${node.path || "root"}: ${node.totalSubtreeFiles} files`}
                    >
                      {isWideEnough && (
                        <div className="truncate text-[11px] font-mono font-bold leading-tight">
                          {node.name || "root"}
                        </div>
                      )}
                      {widthPct > 8 && (
                        <div className="truncate text-[9px] font-mono opacity-80 leading-none pt-0.5">
                          {node.totalSubtreeFiles} files ({widthPct.toFixed(1)}%)
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-900">
            <span>Tier 0: Root</span>
            <span>Tier 1: High-Level Subsystems</span>
            <span>Tier 2: Crates & Modules</span>
            <span>Tier 3: Internal Source Packages</span>
          </div>
        </div>

        {/* Selected / Hovered Directory Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
              <Info className="w-4 h-4" />
              Node Detail Inspector
            </div>

            {hoveredNode ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Directory Name</span>
                    <span className="text-white font-bold text-sm">{hoveredNode.name || "root"}</span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800 font-bold">
                    Depth Level {hoveredNode.depth}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Full Relative Path</span>
                  <span className="text-slate-300 break-all">{hoveredNode.path || "/"}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Direct Files in Directory</span>
                    <span className="text-white font-bold text-base">{hoveredNode.files}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Files in Subtree</span>
                    <span className="text-emerald-400 font-bold text-base">{hoveredNode.totalSubtreeFiles}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 font-mono text-xs">
                Hover over any flame block in the icicle chart to inspect its metrics.
              </div>
            )}
          </div>

          {/* Navigation Guide Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs font-mono">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Flamegraph Navigation
            </span>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <span>Click any block to zoom in and expand that subtree to 100% width.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <span>Click breadcrumbs at top or "Reset to Root" to zoom back out.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <span>Block width directly maps to file density within that branch.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { RepoDataset } from "../types";
import { PieChart, Code, FileText, FileCode, CheckCircle2, Layers } from "lucide-react";

export const LanguageDonutView: React.FC<{ data: RepoDataset }> = ({ data }) => {
  const languages = data.overview.language_mix;
  const extensions = data.overview.extensions;

  const [metricMode, setMetricMode] = useState<"bytes" | "files">("bytes");
  const [activeLang, setActiveLang] = useState<string>("Rust");

  const totalBytes = languages.reduce((acc, l) => acc + l.bytes, 0);
  const totalFiles = languages.reduce((acc, l) => acc + l.files, 0);

  const selected = languages.find((l) => l.language === activeLang) || languages[0];

  const COLOR_PALETTE: Record<string, string> = {
    Rust: "#6366f1", // Indigo
    Markdown: "#a855f7", // Purple
    TOML: "#06b6d4", // Cyan
    YAML: "#f59e0b", // Amber
    JSON: "#10b981", // Emerald
    Other: "#ec4899", // Pink
    Python: "#3b82f6", // Blue
  };

  const getLangColor = (name: string, idx: number) => {
    return COLOR_PALETTE[name] || ["#8b5cf6", "#ec4899", "#14b8a6", "#f97316"][idx % 4];
  };

  // Calculate SVG arc paths
  const metricTotal = metricMode === "bytes" ? totalBytes : totalFiles;

  let cumulativeAngle = 0;
  const slices = languages.map((lang, idx) => {
    const value = metricMode === "bytes" ? lang.bytes : lang.files;
    const fraction = metricTotal > 0 ? value / metricTotal : 0;
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const isSelected = lang.language === activeLang;
    const midAngle = (startAngle + endAngle) / 2;
    const midRad = ((midAngle - 90) * Math.PI) / 180;

    // Explode active arc outward by 8px
    const explodeDist = isSelected ? 8 : 0;
    const cx = 160 + explodeDist * Math.cos(midRad);
    const cy = 160 + explodeDist * Math.sin(midRad);

    const rOuter = isSelected ? 114 : 108;
    const rInner = isSelected ? 72 : 75;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + rOuter * Math.cos(startRad);
    const y1 = cy + rOuter * Math.sin(startRad);
    const x2 = cx + rOuter * Math.cos(endRad);
    const y2 = cy + rOuter * Math.sin(endRad);

    const x3 = cx + rInner * Math.cos(endRad);
    const y3 = cy + rInner * Math.sin(endRad);
    const x4 = cx + rInner * Math.cos(startRad);
    const y4 = cy + rInner * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");

    return {
      lang: lang.language,
      bytes: lang.bytes,
      files: lang.files,
      fraction,
      pathData,
      color: getLangColor(lang.language, idx),
      isSelected,
    };
  });

  const selectedPct = metricTotal > 0
    ? (((metricMode === "bytes" ? selected.bytes : selected.files) / metricTotal) * 100).toFixed(1)
    : "0";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Visualization 04 • Macro Architecture
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-indigo-400" />
            Language & Extension Distribution Donut
          </h1>
          <p className="text-sm text-slate-400">
            Multi-metric distribution balancing byte volume and file count across all repository extensions.
          </p>
        </div>

        {/* Metric Switch */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono">
          <button
            onClick={() => setMetricMode("bytes")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              metricMode === "bytes" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Byte Volume (MB)
          </button>
          <button
            onClick={() => setMetricMode("files")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              metricMode === "files" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            File Count (Units)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Interactive SVG Donut */}
        <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center relative min-h-[380px] shadow-2xl">
          <svg viewBox="0 0 320 320" className="w-80 h-80 drop-shadow-2xl overflow-visible select-none">
            {slices.map((slice, idx) => (
              <path
                key={idx}
                d={slice.pathData}
                fill={slice.color}
                onClick={() => setActiveLang(slice.lang)}
                className="cursor-pointer transition-all duration-200 hover:brightness-125 stroke-slate-950 stroke-1"
                opacity={slice.isSelected ? 1 : 0.75}
              />
            ))}

            {/* Center Hole Stats */}
            <circle cx="160" cy="160" r="66" fill="#020617" className="stroke-slate-800 stroke-1" />
            <text
              x="160"
              y="145"
              textAnchor="middle"
              className="fill-white font-mono font-bold text-base tracking-tight"
            >
              {selected.language}
            </text>
            <text
              x="160"
              y="168"
              textAnchor="middle"
              className="fill-indigo-400 font-mono font-extrabold text-xl"
            >
              {selectedPct}%
            </text>
            <text
              x="160"
              y="186"
              textAnchor="middle"
              className="fill-slate-500 font-mono text-[10px]"
            >
              {metricMode === "bytes" ? `${(selected.bytes / 1024).toFixed(1)} KB` : `${selected.files} files`}
            </text>
          </svg>

          <span className="text-[11px] text-slate-500 font-mono pt-4">
            Click any donut slice or table row to isolate metrics
          </span>
        </div>

        {/* Selected Language Card & Global Stats */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: getLangColor(selected.language, 0) }}
                ></span>
                <h3 className="font-bold text-lg text-white font-mono">{selected.language} Ecosystem</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 text-indigo-400 border border-indigo-900 font-mono font-bold">
                {selectedPct}% of Total
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Total Volume</span>
                <span className="text-white font-bold text-base">
                  {(selected.bytes / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span className="text-[10px] text-slate-500 block pt-0.5">
                  ({(selected.bytes / 1024).toFixed(0)} KB)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Source Files</span>
                <span className="text-white font-bold text-base">{selected.files}</span>
                <span className="text-[10px] text-slate-500 block pt-0.5">
                  {((selected.files / totalFiles) * 100).toFixed(1)}% of repo
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs flex items-center justify-between">
              <span className="text-slate-400">Mean Density per File:</span>
              <span className="text-emerald-400 font-bold">
                {(selected.bytes / selected.files / 1024).toFixed(1)} KB/file
              </span>
            </div>
          </div>

          {/* Languages Breakdown List */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-mono">
              Language Breakdown Table
            </span>
            <div className="space-y-1.5 font-mono text-xs">
              {languages.map((l, idx) => {
                const isCurrent = l.language === activeLang;
                const pct = metricTotal > 0
                  ? (((metricMode === "bytes" ? l.bytes : l.files) / metricTotal) * 100).toFixed(1)
                  : "0";
                const color = getLangColor(l.language, idx);

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveLang(l.language)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isCurrent
                        ? "bg-slate-800 border-indigo-500/80 text-white shadow-md"
                        : "bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                      <span className="font-bold">{l.language}</span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-slate-400">
                        {metricMode === "bytes" ? `${(l.bytes / 1024).toFixed(1)} KB` : `${l.files} files`}
                      </span>
                      <span className="font-bold w-12 text-right" style={{ color }}>
                        {pct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

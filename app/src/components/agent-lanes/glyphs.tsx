// Copyright (c) 2026 Bruno Delorence. MIT License.

/*
 * The small drawings: a glyph for each tool a task uses, a mark for each agent's tile, the
 * header's sparkle and the warning triangle, drawn on a 16-unit grid and sized by
 * the stylesheet. Ink-coloured strokes take --glyph-ink, so they turn light at night; the
 * coloured ones keep their colour on both schemes.
 */

import type { AgentMark, Tool } from './data';

const INK = { stroke: 'var(--glyph-ink)' };

function ToolPath({ tool }: { tool: Tool }) {
  switch (tool) {
    case 'search':
      return (
        <>
          <circle cx="6.8" cy="6.8" r="4.3" fill="none" stroke="#2f7cf6" strokeWidth="2.2" />
          <path d="M10.2 10.2l3.6 3.6" stroke="#18a46b" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 'doc':
      return (
        <>
          <path
            d="M3.2 2.2h6.6l3.2 3.2v8.4H3.2z"
            fill="none"
            style={INK}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9.6 2.4v3.2h3.2" fill="none" style={INK} strokeWidth="1.4" />
          <path d="M5.6 8.6h4.8M5.6 11.2h3.4" style={INK} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case 'chat':
      return (
        <>
          <path
            d="M2 4.6A2.6 2.6 0 0 1 4.6 2h6.8A2.6 2.6 0 0 1 14 4.6v4.2a2.6 2.6 0 0 1-2.6 2.6H7.2L4 14.2v-2.9A2.6 2.6 0 0 1 2 8.8z"
            fill="#8b5cf6"
          />
          <circle cx="5.4" cy="6.7" r="1.05" fill="#fff" />
          <circle cx="8" cy="6.7" r="1.05" fill="#fff" />
          <circle cx="10.6" cy="6.7" r="1.05" fill="#fff" />
        </>
      );
    case 'design':
      return (
        <>
          <circle cx="5" cy="5" r="3.2" fill="#ff5f57" />
          <rect x="8.6" y="1.8" width="5.6" height="6.4" rx="1.6" fill="#8b5cf6" />
          <path d="M4.8 9l3.6 5.4H1.2z" fill="#14b8e8" strokeLinejoin="round" />
          <circle cx="11.4" cy="11.6" r="2.6" fill="#22c55e" />
        </>
      );
    case 'code':
      return (
        <path
          d="M5.4 4.2L1.8 8l3.6 3.8M10.6 4.2L14.2 8l-3.6 3.8M9.1 2.8L6.9 13.2"
          fill="none"
          style={INK}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'ticket':
      return (
        <>
          <circle cx="8" cy="8" r="6.6" fill="#5b5bd6" />
          <path
            d="M5.1 8.2l2 2 3.8-4.2"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case 'key':
      return (
        <>
          <rect x="0.8" y="0.8" width="14.4" height="14.4" rx="3.4" fill="#6a4cf0" />
          <circle cx="6" cy="8" r="2.3" fill="none" stroke="#fff" strokeWidth="1.6" />
          <path
            d="M8.2 8h4.4M11.2 8v2"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case 'sync':
      return (
        <>
          <path
            d="M13 6.4A5.2 5.2 0 0 0 3.6 4.8M3 9.6a5.2 5.2 0 0 0 9.4 1.6"
            fill="none"
            stroke="#ef5a3c"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M3.4 1.6v3.6H7M12.6 14.4v-3.6H9"
            fill="none"
            stroke="#ef5a3c"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
  }
}

export function ToolGlyph({ tool, className }: { tool: Tool; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <ToolPath tool={tool} />
    </svg>
  );
}

function MarkPath({ mark }: { mark: AgentMark }) {
  switch (mark) {
    case 'petal':
      // Four rounded petals around a small open heart.
      return (
        <g fill="#d9614c">
          <ellipse cx="8" cy="4" rx="2.1" ry="3.3" />
          <ellipse cx="8" cy="12" rx="2.1" ry="3.3" />
          <ellipse cx="4" cy="8" rx="3.3" ry="2.1" />
          <ellipse cx="12" cy="8" rx="3.3" ry="2.1" />
          <circle cx="8" cy="8" r="1.3" fill="var(--tile)" />
        </g>
      );
    case 'rings':
      return (
        <g fill="none" style={INK} strokeWidth="1.6">
          <circle cx="6" cy="8" r="4.4" />
          <circle cx="10" cy="8" r="4.4" />
        </g>
      );
    case 'diamond':
      return (
        <>
          <path d="M8 1.2l6.8 6.8L8 14.8 1.2 8z" fill="#2f5bff" strokeLinejoin="round" />
          <path d="M8 5.4L10.6 8 8 10.6 5.4 8z" fill="var(--tile)" />
        </>
      );
    case 'hex':
      return <path d="M8 1.4l5.7 3.3v6.6L8 14.6l-5.7-3.3V4.7z" fill="#16a34a" />;
  }
}

export function AgentGlyph({ mark, className }: { mark: AgentMark; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <MarkPath mark={mark} />
    </svg>
  );
}

/** The header's mark: a four-point sparkle with a small one beside it. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6.6 1.2c.5 3.1 2.1 4.7 5.2 5.2-3.1.5-4.7 2.1-5.2 5.2-.5-3.1-2.1-4.7-5.2-5.2 3.1-.5 4.7-2.1 5.2-5.2z"
        fill="var(--sparkle)"
      />
      <circle cx="12.8" cy="13" r="1.5" fill="var(--sparkle-dot)" />
    </svg>
  );
}

export function Warning({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 2.2l6.6 11.6H1.4z" fill="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

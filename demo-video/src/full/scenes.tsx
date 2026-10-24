// The full demo's scenes other than the Spelunk room: native clip frames, the core, the handoff and the close.
import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, staticFile} from 'remotion';
import {BlockWordmark} from '../components/snap-cn/block-wordmark';
import {C, DISPLAY, FONT, Kicker, Logo, MONO, Mark, Pill, Pointer, enter, rise, useT} from './ui';

const STAGE = {dark: '#0e0e0f', light: '#f5f5f4'};

/** A rendered native interface clip (public/native/<name>.mp4), slightly inset under a chapter kicker. */
export function NativeClip({name, theme, n, label}: {name: string; theme: 'dark' | 'light'; n: string; label: string}) {
 const t = useT();
 const s = 0.9;
 return <AbsoluteFill style={{background: STAGE[theme], opacity: rise(t, 0, 0.25)}}>
  <div style={{position: 'absolute', left: (1920 * (1 - s)) / 2, top: 92, width: 1920 * s, height: 1080 * s}}>
   <OffthreadVideo src={staticFile(`native/${name}.mp4`)} muted style={{width: '100%', height: '100%'}}/>
  </div>
  <Kicker n={n} label={label} dark={theme === 'dark'} t={t}/>
 </AbsoluteFill>;
}

const CRATES = ['cli', 'client', 'coding', 'core', 'decl', 'framework', 'host', 'llama', 'macros', 'mcp', 'openapi', 'rag', 'rhai', 'sandbox', 'websearch', 'websearch-ai', 'wiki', 'workflow', 'workflow-pro'];
const TOOLS = ['list_repos', 'repo_overview', 'summarize_path', 'search_code', 'find_symbol', 'find_file', 'get_symbol_body', 'get_enclosing_context', 'symbol_relations', 'path_between', 'statement_slice', 'prepare_answer_bundle', 'list_handoffs', 'get_handoff', 'update_handoff_status', 'publish_handoff'];

function Panel({x, y, w, h, title, sub, children, style}: {x: number; y: number; w: number; h: number; title: string; sub?: string; children: ReactNode; style?: CSSProperties}) {
 return <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)', overflow: 'hidden', ...style}}>
  <div style={{padding: '18px 22px 14px', borderBottom: `1px solid ${C.rule}`}}>
   <div style={{fontSize: 22, fontWeight: 700, color: C.text}}>{title}</div>
   {sub && <div style={{fontSize: 16, color: C.muted, marginTop: 4}}>{sub}</div>}
  </div>
  {children}
 </div>;
}

function Arrow({x, y, w, label, chip, t, at}: {x: number; y: number; w: number; label: string; chip?: string; t: number; at: number}) {
 const p = rise(t, at, 0.6);
 return <div style={{position: 'absolute', left: x, top: y, width: w, textAlign: 'center', opacity: p}}>
  <div style={{fontSize: 16, fontWeight: 600, color: C.muted, marginBottom: 8}}>{label}</div>
  <svg width={w} height="20"><line x1="4" y1="10" x2={4 + (w - 18) * p} y2="10" stroke={C.brand} strokeWidth="3" strokeLinecap="round"/><path d={`M${w - 14} 3l9 7-9 7`} fill="none" stroke={C.brand} strokeWidth="3" strokeLinecap="round" opacity={p}/></svg>
  {chip && <div style={{marginTop: 10}}><Pill bg={C.brandTint} color={C.brandInk} style={{fontSize: 14}}>{chip}</Pill></div>}
 </div>;
}

type GNode = {id: string; label: string; kind: string; x: number; y: number};
const G_NODES: GNode[] = [
 {id: 'itool', label: 'ITool', kind: 'trait', x: 155, y: 70},
 {id: 'ichat', label: 'IChatClient', kind: 'trait', x: 475, y: 70},
 {id: 'art', label: 'ApprovalRequiredTool', kind: 'struct', x: 155, y: 230},
 {id: 'fic', label: 'FunctionInvokingChatClient', kind: 'struct', x: 475, y: 230},
 {id: 'add', label: 'add_tool', kind: 'fn', x: 155, y: 390},
 {id: 'build', label: 'ChatClientBuilder::build', kind: 'fn', x: 475, y: 390},
 {id: 'scope', label: 'ScopePolicy', kind: 'enum', x: 155, y: 530},
];
const G_EDGES: [string, string, string][] = [['art', 'itool', 'implements'], ['fic', 'ichat', 'implements'], ['fic', 'art', ''], ['add', 'art', 'calls'], ['add', 'scope', 'reads']];

function MiniGraph({t, at}: {t: number; at: number}) {
 const byId = Object.fromEntries(G_NODES.map((n) => [n.id, n]));
 return <div style={{position: 'absolute', left: 8, top: 112, width: 624, height: 580}}>
  <svg width="624" height="580" style={{position: 'absolute', inset: 0}}>
   {G_EDGES.map(([a, b, l], i) => {
    const A = byId[a], B = byId[b];
    const p = rise(t, at + 0.9 + i * 0.18, 0.5);
    const vert = A.x === B.x;
    const x1 = vert ? A.x : A.x - 140 * Math.sign(A.x - B.x), y1 = vert ? A.y - 24 * Math.sign(A.y - B.y) : A.y;
    const xe = vert ? B.x : B.x + 140 * Math.sign(A.x - B.x), ye = vert ? B.y + 24 * Math.sign(A.y - B.y) : B.y;
    const x2 = x1 + (xe - x1) * p, y2 = y1 + (ye - y1) * p;
    return <g key={i} opacity={p > 0 ? 1 : 0}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b9c2ca" strokeWidth="2"/>{p > 0.95 && l && <text x={vert ? x1 + 10 : (x1 + xe) / 2} y={vert ? (y1 + ye) / 2 + 4 : y1 - 8} textAnchor={vert ? 'start' : 'middle'} fontSize="13" fill={C.faint} fontFamily={MONO}>{l}</text>}</g>;
   })}
  </svg>
  {G_NODES.map((n, i) => <div key={n.id} style={{position: 'absolute', left: n.x - 140, top: n.y - 24, width: 280, height: 48, borderRadius: 8, background: n.id === 'art' ? C.brandTint : C.surface, border: `1.5px solid ${n.id === 'art' ? C.brand : C.border}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', boxSizing: 'border-box', ...enter(t, at + i * 0.12, 8)}}>
   <span style={{fontFamily: MONO, fontSize: 12, color: C.faint, width: 40, flex: 'none'}}>{n.kind}</span>
   <span style={{fontFamily: MONO, fontSize: n.label.length > 22 ? 13.5 : 16, fontWeight: 600, color: C.text, whiteSpace: 'nowrap'}}>{n.label}</span>
  </div>)}
 </div>;
}

/** 02 · The core: repository → parsers → code graph → 16 MCP tools. */
export function CoreScene() {
 const t = useT();
 return <AbsoluteFill style={{background: C.ground, fontFamily: FONT, opacity: rise(t, 0, 0.25)}}>
  <Kicker n="02" label="The core: repo-analysis" t={t}/>
  <div style={{position: 'absolute', left: 64, top: 92, fontFamily: DISPLAY, fontSize: 56, fontWeight: 600, letterSpacing: '-0.02em', color: C.text, ...enter(t, 0.3, 12)}}>Parse once. Answer from the graph.</div>
  <Panel x={64} y={220} w={430} h={790} title="rust-agent-framework" sub="19 crates · 67k lines of Rust" style={enter(t, 0.6, 14)}>
   <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, padding: 22}}>
    {CRATES.map((c, i) => <span key={c} style={{fontFamily: MONO, fontSize: 17, padding: '7px 12px', borderRadius: 6, background: C.raised, color: C.text, ...enter(t, 1.0 + i * 0.12, 6, 0.3)}}>{c}</span>)}
   </div>
  </Panel>
  <Arrow x={500} y={520} w={130} label="parse once" chip="rust-analyzer SCIP" t={t} at={4.4}/>
  <Panel x={640} y={220} w={640} h={790} title="Code graph" sub="calls · refs · implements · reads / writes · tests" style={enter(t, 6.4, 14)}>
   <MiniGraph t={t} at={6.8}/>
   <div style={{position: 'absolute', left: 22, bottom: 20, display: 'flex', gap: 10, ...enter(t, 8.4, 6)}}>
    <Pill bg={C.brandTint} color={C.brandInk}>Rust in depth</Pill>
    <Pill>tree-sitter tags for 6 more languages</Pill>
   </div>
  </Panel>
  <Arrow x={1286} y={520} w={110} label="MCP" t={t} at={10.4}/>
  <Panel x={1400} y={220} w={456} h={790} title="repo-analysis MCP server" sub="16 tools · stdio or HTTP" style={enter(t, 10.5, 14)}>
   <div style={{padding: '12px 22px'}}>
    {TOOLS.map((n, i) => <div key={n} style={{display: 'flex', alignItems: 'center', gap: 10, height: 37, fontFamily: MONO, fontSize: 18, color: i >= 12 ? C.brandInk : C.text, ...enter(t, 10.9 + i * 0.2, 6, 0.3)}}>
     <span style={{width: 7, height: 7, borderRadius: 4, background: i >= 12 ? C.brand : '#9aa3ab'}}/>{n}
    </div>)}
   </div>
  </Panel>
 </AbsoluteFill>;
}

/** 03 · Spelunk wordmark. */
export function WordmarkScene() {
 const t = useT();
 return <AbsoluteFill style={{background: C.ground, opacity: rise(t, 0, 0.2)}}>
  <BlockWordmark text="Spelunk" fontSize={190} fontFamily="Inter" colors={[C.brand, '#fde3c8', '#f9b77a']} color={C.text} background={C.ground}/>
  <div style={{position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', fontFamily: FONT, fontSize: 40, fontWeight: 500, color: C.muted, ...enter(t, 1.4, 10)}}>The same graph, for the whole room.</div>
 </AbsoluteFill>;
}

const DOC: [number, string, string?][] = [
 [0, '{'],
 [1, '"id": ', '"20261024-153012-a1b2c3"'],
 [1, '"repo": ', '"rust-agent-framework"'],
 [1, '"status": ', '"open"'],
 [1, '"decisions": ['],
 [2, '{ "title": ', '"Add a reason the approver sees"'],
 [2, '  "said": ', '"…should carry a reason we can show them"'],
 [2, '  "who": ', '"Tom"'],
 [2, '  "code_ref": ', '"crates/core/src/tool.rs:170-178" }'],
 [1, '],'],
 [1, '"instructions": ', '"1. Add an optional reason to …"'],
 [0, '}'],
];

/** 08 · The handoff: Spelunk → POST /handoffs → MCP server → any coding agent. */
export function HandoffScene() {
 const t = useT();
 const press = t > 0.75 && t < 0.95;
 const sent = t >= 0.95;
 const px = interpolate(t, [0, 0.7], [380, 300], {extrapolateRight: 'clamp'}), py = interpolate(t, [0, 0.7], [640, 592], {extrapolateRight: 'clamp'});
 const agents: [string, ReactNode, string, number][] = [
  ['Claude Code', <Logo name="claudecode-color" size={34}/>, 'spelunk-handoff skill', 6.8],
  ['Cursor', <Logo name="cursor" size={30}/>, 'MCP over HTTP', 7.4],
  ['Any MCP client', <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 18, color: C.teal}}>{'{ }'}</span>, 'stdio or HTTP', 8.0],
 ];
 return <AbsoluteFill style={{background: C.ground, fontFamily: FONT, opacity: rise(t, 0, 0.25)}}>
  <Kicker n="05" label="Hand off" t={t}/>
  {/* Spelunk's "Ready for the agent" tray */}
  <div style={{position: 'absolute', left: 64, top: 380, width: 440, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 22, boxShadow: '0 8px 24px rgba(16,24,40,.06)', ...enter(t, 0.05, 10)}}>
   <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16}}><Mark size={24}/><b style={{fontSize: 20}}>Spelunk</b><span style={{color: C.muted, fontSize: 16}}>· rust-agent-framework</span></div>
   <div style={{fontSize: 14, fontWeight: 700, letterSpacing: '.08em', color: C.muted}}>READY FOR THE AGENT · 1</div>
   <div style={{marginTop: 12, fontSize: 17, color: C.text, display: 'grid', gap: 8}}>
    <div><span style={{color: C.positive}}>✓</span> Add a reason the approver sees</div>
    <div style={{color: C.faint}}>✕ Rename ScopePolicy::ApproveOutside (declined)</div>
   </div>
   <div style={{marginTop: 18, height: 46, borderRadius: 6, background: sent ? C.positive : C.brand, color: '#fff', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${press ? 0.97 : 1})`}}>{sent ? 'Sent to the agent ✓' : 'Send 1 to the agent ›'}</div>
  </div>
  {t < 1.6 && <Pointer x={px} y={py} pressed={press}/>}
  <Arrow x={512} y={540} w={96} label="" t={t} at={1.0}/>
  {/* the handoff document */}
  <div style={{position: 'absolute', left: 620, top: 250, width: 600, background: '#101418', borderRadius: 10, padding: '18px 22px', boxShadow: '0 16px 40px rgba(16,24,40,.18)', ...enter(t, 1.2, 16, 0.5)}}>
   <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 15, color: '#9aa4ae', marginBottom: 12}}><span>handoffs/20261024-153012-a1b2c3.json</span><span style={{color: '#7ee2a8'}}>{t > 3.4 ? 'POST /handoffs · 201' : ''}</span></div>
   {DOC.map(([ind, k, v], i) => <div key={i} style={{fontFamily: MONO, fontSize: 17, lineHeight: '30px', paddingLeft: ind * 22, color: '#d7dde3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: rise(t, 1.5 + i * 0.16, 0.25)}}>{k}{v && <span style={{color: '#f6b26b'}}>{v}</span>}</div>)}
  </div>
  <Arrow x={1226} y={360} w={86} label="" t={t} at={3.6}/>
  {/* the MCP server */}
  <div style={{position: 'absolute', left: 1320, top: 250, width: 536, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 22, boxShadow: '0 8px 24px rgba(16,24,40,.06)', ...enter(t, 3.8, 12)}}>
   <div style={{fontSize: 22, fontWeight: 700}}>repo-analysis MCP server</div>
   <div style={{fontSize: 16, color: C.muted, marginTop: 4}}>Stored as JSON · 127.0.0.1:8787</div>
   <div style={{marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, fontFamily: MONO, fontSize: 16}}><span>20261024-153012-a1b2c3</span><Pill bg={C.brandTint} color={C.brandInk} style={{fontSize: 13}}>open</Pill></div>
   <div style={{marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap'}}>{['list_handoffs', 'get_handoff', 'update_handoff_status'].map((n, i) => <span key={n} style={{fontFamily: MONO, fontSize: 15, padding: '5px 10px', borderRadius: 6, background: C.raised, ...enter(t, 4.6 + i * 0.25, 4, 0.3)}}>{n}</span>)}</div>
  </div>
  {/* agents that can pull it */}
  <div style={{position: 'absolute', left: 1320, top: 520, width: 536, display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, color: C.muted, ...enter(t, 6.4, 6)}}>
   <svg width="18" height="40"><path d="M9 0v32M3 26l6 8 6-8" fill="none" stroke={C.brand} strokeWidth="2.5" strokeLinecap="round"/></svg>
   any connected coding agent pulls it
  </div>
  {agents.map(([name, logo, sub, at], i) => <div key={name} style={{position: 'absolute', left: 1320, top: 580 + i * 100, width: 536, height: 84, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', boxSizing: 'border-box', ...enter(t, at, 10)}}>
   <span style={{width: 40, display: 'flex', justifyContent: 'center'}}>{logo}</span>
   <div><div style={{fontSize: 21, fontWeight: 700}}>{name}</div><div style={{fontSize: 15, color: C.muted, fontFamily: MONO}}>{sub}</div></div>
  </div>)}
 </AbsoluteFill>;
}

/** 10 · The handoff is marked done in Spelunk, then the closing card. */
export function CloseScene({dur}: {dur: number}) {
 const t = useT();
 const status = t < 0.6 ? ['Open', C.brandTint, C.brandInk] : t < 1.5 ? ['In progress', '#e3eef7', C.teal] : ['Done ✓', C.posBg, C.positive];
 const cardOut = 1 - rise(t, 3.0, 0.45);
 const end = interpolate(t, [dur - 0.8, dur - 0.05], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
 const lines: [string, number][] = [['Talk it through.', 3.6], ['Decide together.', 5.0], ['Let the agent build it.', 6.4]];
 return <AbsoluteFill style={{background: C.ground, fontFamily: FONT, opacity: rise(t, 0, 0.25)}}>
  <div style={{position: 'absolute', left: 460, top: 330, width: 1000, opacity: cardOut, transform: `scale(${0.98 + 0.02 * cardOut})`}}>
   <div style={{background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, boxShadow: '0 16px 40px rgba(16,24,40,.08)', ...enter(t, 0.05, 10)}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12}}><Mark size={28}/><b style={{fontSize: 24}}>Spelunk</b><span style={{color: C.muted, fontSize: 20}}>· Handoffs</span></div>
    <div style={{marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
     <span style={{fontFamily: MONO, fontSize: 22}}>20261024-153012-a1b2c3</span>
     <Pill bg={status[1]} color={status[2]} style={{fontSize: 20, padding: '6px 16px'}}>{status[0]}</Pill>
    </div>
    <div style={{marginTop: 16, fontSize: 24, fontWeight: 600}}>Add a reason the approver sees</div>
    <div style={{marginTop: 16, display: 'flex', gap: 14, alignItems: 'flex-start', opacity: rise(t, 1.5, 0.4)}}>
     <Logo name="claudecode-color" size={30}/>
     <div style={{fontSize: 20, color: C.muted, lineHeight: 1.45}}><b style={{color: C.text}}>Claude Code</b> · update_handoff_status(done): ApprovalRequiredTool now carries an optional reason the approval request shows. crates/core/src/tool.rs</div>
    </div>
   </div>
  </div>
  <div style={{position: 'absolute', inset: 0, opacity: rise(t, 3.2, 0.5) * end}}>
   <div style={{position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34}}>
    <Mark size={130}/>
    <span style={{fontFamily: DISPLAY, fontSize: 168, fontWeight: 700, letterSpacing: '-0.035em', color: C.text}}>Spelunk</span>
   </div>
   <div style={{position: 'absolute', left: 0, right: 0, top: 540, display: 'flex', justifyContent: 'center', gap: 22, fontFamily: DISPLAY, fontSize: 50, fontWeight: 600, letterSpacing: '-0.01em'}}>
    {lines.map(([s, at], i) => <span key={s} style={{color: i === 2 ? C.brandInk : C.text, ...enter(t, at, 10)}}>{s}</span>)}
   </div>
   <div style={{position: 'absolute', left: 0, right: 0, top: 720, textAlign: 'center', fontSize: 24, color: C.muted, lineHeight: 1.7, ...enter(t, 8.0, 8)}}>
    <div>repo-analysis: a code graph under your agent · 16 MCP tools · Rust in depth</div>
    <div>Reson8 live transcription · Claude Haiku 5.5 · hands off to Claude Code, Cursor or any MCP client</div>
   </div>
  </div>
 </AbsoluteFill>;
}

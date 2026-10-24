// 04–06 · The Spelunk room: listen (Reson8) → extract (Claude Haiku 5.5 + MCP tools) → propose on the graph → decide.
// A recreation of the Spelunk app's layout and tokens (app/src/styles.css) over rust-agent-framework's real symbols;
// the live Haiku loop was still being finished in app/ when this was made, so this scene is staged, not captured.
import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {C, FONT, Logo, MONO, Mark, Pill, Pointer, enter, rise, useT} from './ui';

type Utt = {who: 'Maya' | 'Tom'; spk: 1 | 2; text: string; at: number; end: number; tag?: [string, number]};
const UTTS: Utt[] = [
 {who: 'Maya', spk: 1, text: 'When a tool needs approval, people only see the tool’s name.', at: 1.0, end: 4.2},
 {who: 'Tom', spk: 2, text: 'So ApprovalRequiredTool should carry a reason we can show them.', at: 4.6, end: 8.2, tag: ['1 proposal', 19.5]},
 {who: 'Maya', spk: 1, text: 'Wait, who actually checks requires_approval?', at: 13.2, end: 15.6, tag: ['1 answer', 24.8]},
 {who: 'Tom', spk: 2, text: 'And let’s rename ApproveOutside while we’re at it.', at: 16.2, end: 18.6, tag: ['1 proposal', 26.8]},
];

type Node = {id: string; label: string; sub: string; kind: string; x: number; y: number};
const NODES: Node[] = [
 {id: 'itool', label: 'ITool', sub: 'core/src/tool.rs', kind: 'trait', x: 585, y: 180},
 {id: 'ichat', label: 'IChatClient', sub: 'core/src/chat_client.rs', kind: 'trait', x: 585, y: 300},
 {id: 'build', label: 'ChatClientBuilder::build', sub: 'core/src/chat_client.rs', kind: 'fn', x: 585, y: 420},
 {id: 'art', label: 'ApprovalRequiredTool', sub: 'core/src/tool.rs:170', kind: 'struct', x: 890, y: 180},
 {id: 'tar', label: 'ToolApprovalResponse', sub: 'core/src/tool.rs', kind: 'struct', x: 890, y: 300},
 {id: 'scope', label: 'ScopePolicy', sub: 'core/src/workspace.rs', kind: 'enum', x: 890, y: 420},
 {id: 'add', label: 'add_tool', sub: 'WorkspaceContextProvider', kind: 'fn', x: 1290, y: 180},
 {id: 'addArc', label: 'add_tool_arc', sub: 'WorkspaceContextProvider', kind: 'fn', x: 1290, y: 300},
 {id: 'fic', label: 'FunctionInvokingChatClient', sub: 'framework/src/decorators/invoke.rs', kind: 'struct', x: 1290, y: 420},
];
const NW = 290, NH = 56;
const EDGES: [string, string, string, number][] = [
 ['art', 'itool', '', 0], ['build', 'ichat', 'returns', 0], ['add', 'art', 'wraps', 12.6], ['addArc', 'art', 'wraps', 12.6], ['fic', 'art', 'checks', 16.6],
];
/** When Haiku's tool calls land on each node (it lights up), and when a decision lets it go again. */
const HOT: Record<string, [number, number][]> = {
 art: [[10.9, 99]], add: [[12.6, 18.0]], addArc: [[12.6, 18.0]], fic: [[16.6, 99]], scope: [[20.5, 34.4]],
};

type Call = {at: number; done: number; fn: string; args: string; result: string; own?: boolean};
const CALLS: Call[] = [
 {at: 10.2, done: 10.9, fn: 'find_symbol', args: '"ApprovalRequiredTool"', result: 'struct · crates/core/src/tool.rs:170'},
 {at: 11.8, done: 12.6, fn: 'symbol_relations', args: '"ApprovalRequiredTool", "callers"', result: 'add_tool, add_tool_arc · crates/framework'},
 {at: 15.9, done: 16.6, fn: 'search_code', args: '"requires_approval"', result: 'FunctionInvokingChatClient · invoke.rs:437'},
 {at: 18.9, done: 19.4, fn: 'propose', args: 'node: ApprovalRequiredTool', result: 'change proposed to the room', own: true},
 {at: 19.9, done: 20.5, fn: 'find_symbol', args: '"ScopePolicy::ApproveOutside"', result: 'enum variant · crates/core/src/workspace.rs'},
 {at: 24.2, done: 24.7, fn: 'answer', args: 'node: FunctionInvokingChatClient', result: 'answer posted on the graph', own: true},
 {at: 26.2, done: 26.7, fn: 'propose', args: 'node: ScopePolicy', result: 'change proposed to the room', own: true},
];

// decisions
const P1_AT = 19.5, A_AT = 24.8, P2_AT = 26.8, ACCEPT = 32.3, DECLINE = 34.2;

const words = (s: string, t: number, a: number, b: number) => {
 const w = s.split(' ');
 const n = Math.max(0, Math.min(w.length, Math.ceil(((t - a) / (b - a)) * w.length)));
 return w.slice(0, n).join(' ');
};

function hot(id: string, t: number) {
 return (HOT[id] ?? []).some(([a, b]) => t >= a && t < b);
}

function NodeBox({n, t}: {n: Node; t: number}) {
 const h = hot(n.id, t);
 const firstHot = HOT[n.id]?.[0]?.[0] ?? 999;
 const pulse = t >= firstHot && t < firstHot + 0.6 ? 1 + 0.06 * Math.sin(((t - firstHot) / 0.6) * Math.PI) : 1;
 const dim = t > 10 && !h && !['art', 'fic'].includes(n.id) ? 0.55 : 1;
 return <div style={{position: 'absolute', left: n.x - NW / 2, top: n.y - NH / 2, width: NW, height: NH, boxSizing: 'border-box', borderRadius: 8,
  background: h ? '#fff7ef' : C.surface, border: `1.5px solid ${h ? C.brand : C.border}`, boxShadow: h ? '0 0 0 4px rgba(244,129,32,.18)' : '0 1px 2px rgba(16,24,40,.05)',
  padding: '7px 12px', transform: `scale(${pulse})`, opacity: dim}}>
  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
   <span style={{fontFamily: MONO, fontSize: 12, color: h ? C.brandInk : C.faint}}>{n.kind}</span>
   <span style={{fontFamily: MONO, fontSize: n.label.length > 22 ? 14 : 16, fontWeight: 600, color: C.text, whiteSpace: 'nowrap'}}>{n.label}</span>
  </div>
  <div style={{fontFamily: MONO, fontSize: 11.5, color: C.faint, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{n.sub}</div>
 </div>;
}

function Btn({children, primary, style}: {children: ReactNode; primary?: boolean; style?: CSSProperties}) {
 return <span style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 32, padding: '0 14px', borderRadius: 4, fontSize: 15, fontWeight: 600,
  background: primary ? C.brand : C.surface, color: primary ? '#fff' : C.text, border: primary ? 'none' : `1px solid ${C.border}`, ...style}}>{children}</span>;
}

/** A proposal or answer card, attached under its node with a small notch. */
function Card({x, y, at, t, kind, title, quote, who, children, w = 340}: {x: number; y: number; at: number; t: number; kind: 'Change' | 'Answer'; title: string; quote: string; who: string; children?: ReactNode; w?: number}) {
 if (t < at) return null;
 const p = rise(t, at, 0.35);
 const answer = kind === 'Answer';
 return <div style={{position: 'absolute', left: x - w / 2, top: y, width: w, opacity: p, transform: `translateY(${(1 - p) * -8}px) scale(${0.96 + 0.04 * p})`, transformOrigin: 'top center'}}>
  <div style={{position: 'absolute', left: w / 2 - 8, top: -7, width: 14, height: 14, background: C.surface, borderLeft: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, transform: 'rotate(45deg)'}}/>
  <div style={{background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${answer ? C.teal : C.brand}`, borderRadius: 8, padding: '12px 14px', boxShadow: '0 10px 28px rgba(16,24,40,.14)'}}>
   <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: '.06em', color: answer ? C.teal : C.brandInk}}>
    <Logo name="claude-color" size={15}/>{answer ? 'ANSWER' : 'PROPOSAL'} <span style={{color: C.faint, fontWeight: 500, letterSpacing: 0}}>· Haiku · from {who}</span>
   </div>
   <div style={{fontSize: 18, fontWeight: 700, color: C.text, marginTop: 6, lineHeight: 1.3}}>{title}</div>
   <div style={{fontSize: 14, color: C.muted, marginTop: 5, lineHeight: 1.4}}>{quote}</div>
   {children}
  </div>
 </div>;
}

export function RoomScene() {
 const t = useT();
 const accepted = t >= ACCEPT, declined = t >= DECLINE;
 const p2Out = 1 - rise(t, DECLINE + 0.5, 0.45);
 const ready = accepted ? 1 : 0;
 // the pointer: from the right rail to P1's Accept, then to P2's Decline
 const ptr = (() => {
  const a: [number, number, number][] = [[29.6, 1700, 700], [31.9, 760, 352], [32.6, 760, 352], [33.8, 868, 616], [35.5, 868, 616]];
  if (t < a[0][0]) return null;
  for (let i = 0; i < a.length - 1; i++) {
   const [t0, x0, y0] = a[i], [t1, x1, y1] = a[i + 1];
   if (t <= t1) {
    const k = interpolate(t, [t0, t1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    return {x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e};
   }
  }
  return {x: a[a.length - 1][1], y: a[a.length - 1][2]};
 })();
 const pressed = (t > ACCEPT - 0.18 && t < ACCEPT + 0.05) || (t > DECLINE - 0.18 && t < DECLINE + 0.05);
 const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
 const shownCalls = CALLS.filter((c) => t >= c.at).slice(-5);
 const proposals: [string, string, number, string][] = [
  ['Add a reason the approver sees', 'ApprovalRequiredTool', P1_AT, accepted ? 'Accepted' : 'Waiting'],
  ['Who checks requires_approval()?', 'FunctionInvokingChatClient', A_AT, 'Answered'],
  ['Rename ScopePolicy::ApproveOutside', 'ScopePolicy', P2_AT, declined ? 'Declined' : 'Waiting'],
 ];
 const listening = t < 30;

 return <AbsoluteFill style={{background: C.ground, fontFamily: FONT, color: C.text, opacity: rise(t, 0, 0.3)}}>
  {/* header */}
  <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 64, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14}}>
   <Mark size={28}/><b style={{fontSize: 21}}>Spelunk</b>
   <span style={{display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 6, background: C.raised, fontFamily: MONO, fontSize: 15}}>rust-agent-framework ›</span>
   <div style={{marginLeft: 120, width: 640, height: 38, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 14px', color: C.faint, fontSize: 16, justifyContent: 'space-between'}}>
    <span>Ask or follow up …</span><span style={{width: 28, height: 28, borderRadius: 4, background: listening ? C.brand : C.raised, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14}}>●</span>
   </div>
   <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 15, fontWeight: 600}}><Logo name="claudecode-color" size={18}/>Claude Code connected</div>
  </div>

  {/* left: the conversation, live */}
  <div style={{position: 'absolute', left: 0, top: 64, bottom: 0, width: 400, background: C.surface, borderRight: `1px solid ${C.border}`, padding: '18px 20px', boxSizing: 'border-box'}}>
   <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
    <span style={{fontSize: 14, fontWeight: 700, letterSpacing: '.08em', color: C.muted}}>CONVERSATION</span>
    <Pill bg={listening ? C.brandTint : C.raised} color={listening ? C.brandInk : C.muted} style={{fontSize: 14}}>
     <span style={{display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 12}}>{[0, 1, 2, 3].map((i) => <i key={i} style={{width: 3, background: 'currentColor', borderRadius: 1, height: listening ? 4 + 8 * Math.abs(Math.sin(t * 7 + i * 1.3)) : 3}}/>)}</span>
     {listening ? 'Live · Reson8' : 'Paused · Reson8'}
    </Pill>
   </div>
   <div style={{fontSize: 13.5, color: C.faint, marginTop: 6}}>Live transcript with speaker diarisation</div>
   <div style={{marginTop: 18, display: 'grid', gap: 16}}>
    {UTTS.filter((u) => t >= u.at - 0.2).map((u, i) => {
     const live = t < u.end;
     return <div key={i} style={enter(t, u.at - 0.2, 8, 0.3)}>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.muted}}>
       <span style={{width: 26, height: 26, borderRadius: 13, background: u.spk === 1 ? '#3d5a80' : '#1b8a6b', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700}}>{u.who[0]}</span>
       <b style={{color: C.text}}>{u.who}</b><span>· Speaker {u.spk}</span>
       {u.tag && t >= u.tag[1] && <Pill bg={u.tag[0].includes('answer') ? C.tealTint : C.brandTint} color={u.tag[0].includes('answer') ? C.teal : C.brandInk} style={{fontSize: 12, padding: '2px 8px'}}>{u.tag[0]}</Pill>}
      </div>
      <div style={{marginTop: 6, marginLeft: 34, padding: '10px 13px', borderRadius: 8, background: live ? C.surface : C.raised, border: live ? `1px dashed ${'#b3b9bf'}` : '1px solid transparent', fontSize: 18, lineHeight: 1.45, minHeight: 26}}>
       {words(u.text, t, u.at, u.end)}{live && <span style={{display: 'inline-block', width: 2, height: 18, background: C.brand, marginLeft: 3, verticalAlign: -2, opacity: Math.floor(t * 3) % 2}}/>}
      </div>
     </div>;
    })}
   </div>
  </div>

  {/* centre: the graph of the real code */}
  <div style={{position: 'absolute', left: 430, top: 76, fontSize: 15, color: C.muted, display: 'flex', gap: 12, alignItems: 'center'}}>
   <b style={{color: C.text, fontSize: 17}}>Tool approval</b><span>· 9 symbols from 6 files · rust-agent-framework</span>
  </div>
  {[['crates/core', 430, 1040], ['crates/framework', 1070, 1510]].map(([l, a, b]) => <div key={l as string} style={{position: 'absolute', left: a as number, top: 108, width: (b as number) - (a as number), height: 380, border: `1px dashed ${C.border}`, borderRadius: 10, background: 'rgba(255,255,255,.45)'}}>
   <span style={{position: 'absolute', left: 12, top: 8, fontFamily: MONO, fontSize: 13, color: C.faint}}>{l}</span>
  </div>)}
  <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
   {EDGES.map(([a, b, label, at], i) => {
    const A = byId[a], B = byId[b];
    const x1 = A.x < B.x ? A.x + NW / 2 : A.x > B.x ? A.x - NW / 2 : A.x, x2 = A.x < B.x ? B.x - NW / 2 : A.x > B.x ? B.x + NW / 2 : B.x;
    const y1 = A.x === B.x ? A.y - NH / 2 : A.y, y2 = A.x === B.x ? B.y + NH / 2 : B.y + (A.y - B.y) * 0.12;
    const p = at ? rise(t, at, 0.5) : 1;
    const lit = at && t >= at;
    return <g key={i}>
     <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={lit ? C.brand : '#b9c2ca'} strokeWidth={lit ? 2.5 : 1.8}/>
     {p > 0.9 && label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fontSize="12" fill={lit ? C.brandInk : C.faint} fontFamily={MONO}>{label}</text>}
    </g>;
   })}
  </svg>
  {NODES.map((n) => <NodeBox key={n.id} n={n} t={t}/>)}

  {/* proposals and answers, on the graph */}
  {!accepted ? <Card x={890} y={216} at={P1_AT} t={t} kind="Change" who="Tom" title="Add a reason the approver sees" quote="“ApprovalRequiredTool should carry a reason we can show them.”">
   <div style={{display: 'flex', gap: 8, marginTop: 10}}><Btn primary>Accept</Btn><Btn>Decline</Btn></div>
  </Card> : <div style={{position: 'absolute', left: 890 - 170, top: 216, width: 340, ...enter(t, ACCEPT, 4, 0.3)}}>
   <div style={{background: C.posBg, color: C.positive, borderRadius: 8, padding: '10px 14px', fontSize: 16, fontWeight: 700, border: `1px solid #b5e8c6`}}>✓ Accepted · ready for the agent</div>
  </div>}
  <Card x={1290} y={456} at={A_AT} t={t} kind="Answer" who="Maya" title="FunctionInvokingChatClient checks requires_approval()" quote="Before it runs a tool, it asks requires_approval(); ApprovalRequiredTool returns true. invoke.rs:437, 596"/>
  {p2Out > 0 && <div style={{opacity: p2Out}}>
   <Card x={890} y={456} at={P2_AT} t={t} kind="Change" who="Tom" title="Rename ScopePolicy::ApproveOutside" quote="“Let’s rename ApproveOutside while we’re at it.”">
    {declined ? <div style={{marginTop: 10, fontSize: 15, fontWeight: 700, color: C.negative}}>✕ Declined</div> : <div style={{display: 'flex', gap: 8, marginTop: 10}}><Btn primary>Accept</Btn><Btn>Decline</Btn></div>}
   </Card>
  </div>}

  {/* Haiku at work */}
  <div style={{position: 'absolute', left: 430, top: 760, width: 1080, height: 290, background: '#101418', borderRadius: 10, padding: '16px 20px', boxSizing: 'border-box', ...enter(t, 0.8, 12, 0.6)}}>
   <div style={{display: 'flex', alignItems: 'center', gap: 10, color: '#e9edf1', fontSize: 17, fontWeight: 600}}>
    <Logo name="claude-color" size={20}/>Claude Haiku 5.5<span style={{fontFamily: MONO, fontSize: 14, color: '#8f9aa5', fontWeight: 400}}>claude-haiku-5-5 · reads each new sentence · MCP: repo-analysis</span>
   </div>
   <div style={{marginTop: 12, display: 'grid', gap: 6}}>
    {shownCalls.length === 0 && <div style={{fontFamily: MONO, fontSize: 16.5, lineHeight: '34px', color: '#6f7a85'}}>waiting for a sentence about the code{'.'.repeat(1 + (Math.floor(t * 2) % 3))}</div>}
    {shownCalls.map((c) => {
     const done = t >= c.done;
     return <div key={c.at} style={{display: 'flex', gap: 12, fontFamily: MONO, fontSize: 16.5, lineHeight: '34px', whiteSpace: 'nowrap', ...enter(t, c.at, 6, 0.25)}}>
      <span style={{color: done ? '#7ee2a8' : '#f6b26b', width: 14}}>{done ? '✓' : '●'}</span>
      <span style={{color: c.own ? '#f6b26b' : '#9cc7ff'}}>{c.fn}</span><span style={{color: '#c7ced5', marginLeft: -12}}>({c.args})</span>
      <span style={{color: '#6f7a85'}}>→</span><span style={{color: done ? '#e9edf1' : '#6f7a85'}}>{done ? c.result : '…'}</span>
     </div>;
    })}
   </div>
  </div>

  {/* right: proposals list and the tray */}
  <div style={{position: 'absolute', right: 0, top: 64, bottom: 0, width: 380, background: C.surface, borderLeft: `1px solid ${C.border}`, padding: '16px 18px', boxSizing: 'border-box'}}>
   <div style={{display: 'flex', gap: 18, fontSize: 16, borderBottom: `1px solid ${C.rule}`, paddingBottom: 10}}>
    <b>Proposals · {proposals.filter((p) => t >= p[2]).length}</b><span style={{color: C.muted}}>Ask</span><span style={{color: C.muted}}>Code</span>
   </div>
   <div style={{marginTop: 14, display: 'grid', gap: 10}}>
    {proposals.filter((p) => t >= p[2]).map(([title, node, at, st]) => {
     const col = st === 'Accepted' ? [C.posBg, C.positive] : st === 'Declined' ? [C.negBg, C.negative] : st === 'Answered' ? [C.tealTint, C.teal] : [C.brandTint, C.brandInk];
     return <div key={title} style={{border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', ...enter(t, at, 6, 0.3)}}>
      <div style={{fontSize: 15.5, fontWeight: 600}}>{title}</div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6}}>
       <span style={{fontFamily: MONO, fontSize: 12.5, color: C.faint}}>{node}</span>
       <Pill bg={col[0]} color={col[1]} style={{fontSize: 12.5, padding: '2px 9px'}}>{st}</Pill>
      </div>
     </div>;
    })}
   </div>
   <div style={{position: 'absolute', left: 18, right: 18, bottom: 18}}>
    <div style={{fontSize: 13.5, fontWeight: 700, letterSpacing: '.08em', color: C.muted}}>READY FOR THE AGENT · {ready}</div>
    {accepted && <div style={{fontSize: 15, marginTop: 8, ...enter(t, ACCEPT, 4, 0.3)}}><span style={{color: C.positive}}>✓</span> Add a reason the approver sees</div>}
    <div style={{marginTop: 12, height: 44, borderRadius: 6, background: ready ? C.brand : '#f7c9a0', color: '#fff', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{ready ? 'Send 1 to the agent ›' : 'Accept proposals to send them'}</div>
   </div>
  </div>

  {ptr && <Pointer x={ptr.x} y={ptr.y} pressed={pressed}/>}
 </AbsoluteFill>;
}

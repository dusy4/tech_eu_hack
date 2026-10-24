// Shared look for the full demo's own scenes: the Spelunk app's tokens (app/src/styles.css), fonts and helpers.
import type {CSSProperties, ReactNode} from 'react';
import {Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig, Img} from 'remotion';
import {loadFont as loadJakarta} from '@remotion/google-fonts/PlusJakartaSans';
import {loadFont as loadHost} from '@remotion/google-fonts/HostGrotesk';
import {loadFont as loadPlex} from '@remotion/google-fonts/IBMPlexMono';

export const FONT = loadJakarta('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']}).fontFamily;
export const DISPLAY = loadHost('normal', {weights: ['500', '600', '700'], subsets: ['latin']}).fontFamily;
export const MONO = loadPlex('normal', {weights: ['400', '500', '600'], subsets: ['latin']}).fontFamily;

export const C = {
 ground: '#f5f6f7', surface: '#ffffff', raised: '#eef1f3', border: '#dde2e7', rule: '#e8ebed',
 text: '#16181c', muted: '#565c63', faint: '#8a9096',
 brand: '#f48120', brandInk: '#b4530a', brandTint: 'rgba(244,129,32,0.12)',
 positive: '#1e7b4f', posBg: '#dcfae5', negative: '#c4242a', negBg: '#ffedea',
 teal: '#1b6c80', tealTint: 'rgba(27,108,128,0.10)', ink: '#0e0f11',
};

/** Seconds since the start of the current Sequence. */
export function useT() {
 const f = useCurrentFrame();
 const {fps} = useVideoConfig();
 return f / fps;
}

const ease = Easing.bezier(0.22, 1, 0.36, 1);
/** 0→1 between at and at+dur, eased out (the app's --ease-smooth-out). */
export function rise(t: number, at: number, dur = 0.4) {
 return interpolate(t, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
}
/** Opacity + small lift for an element that appears at `at`. */
export function enter(t: number, at: number, dy = 10, dur = 0.4): CSSProperties {
 const p = rise(t, at, dur);
 return {opacity: p, transform: `translateY(${(1 - p) * dy}px)`};
}

export function Mark({size = 28}: {size?: number}) {
 return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="6" fill={C.brand}/><path d="M6 15.5h12M7.5 18.5h9M6 12.5l6-6.5 6 6.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function Logo({name, size = 24, style}: {name: 'claudecode-color' | 'cursor' | 'claude-color'; size?: number; style?: CSSProperties}) {
 return <Img src={staticFile(`logos/${name}.svg`)} style={{width: size, height: size, ...style}}/>;
}

export function Pill({children, bg = C.raised, color = C.text, style}: {children: ReactNode; bg?: string; color?: string; style?: CSSProperties}) {
 return <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: bg, color, fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', ...style}}>{children}</span>;
}

/** A macOS-style arrow pointer. */
export function Pointer({x, y, pressed = false}: {x: number; y: number; pressed?: boolean}) {
 return <svg width="34" height="34" viewBox="0 0 24 24" style={{position: 'absolute', left: x - 6, top: y - 3, transform: `scale(${pressed ? 0.88 : 1})`, transformOrigin: '6px 3px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.3))'}}>
  <path d="M5 2.5v17.2l4.3-4.2 2.9 6.6 2.7-1.2-2.9-6.5h6z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"/>
 </svg>;
}

/** Chapter kicker above a native clip or scene. */
export function Kicker({n, label, dark = false, t}: {n: string; label: string; dark?: boolean; t: number}) {
 return <div style={{position: 'absolute', left: 64, top: 38, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, ...enter(t, 0.15, 8)}}>
  <span style={{fontFamily: MONO, fontSize: 18, color: dark ? '#f6a65c' : C.brandInk, fontWeight: 600}}>{n}</span>
  <span style={{fontSize: 24, fontWeight: 600, color: dark ? '#f2f2f2' : C.text, letterSpacing: '-0.01em'}}>{label}</span>
 </div>;
}

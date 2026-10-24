// The full demo's timeline, in seconds. Every beat's voiceover clip (public/audio/vo/<id>.mp3) is placed at
// scene start + voAt; the native clips (public/native/*.mp4) were rendered with beat times that assume these offsets.
// SCRIPT.md is the human-readable version of this file.
import vo from '../vo-timings.json';
import bed from '../music-bed.json';

export const FPS = 30;
export type VoId = keyof typeof vo;

export const SCENES = {
 problem: {from: 0, dur: 14.0},
 core: {from: 14.0, dur: 15.8},
 mcp: {from: 29.8, dur: 13.8},
 spelunk: {from: 43.6, dur: 4.8},
 room: {from: 48.4, dur: 35.5},
 handoff: {from: 83.9, dur: 11.1},
 skill: {from: 95.0, dur: 6.6},
 build: {from: 101.6, dur: 14.4},
 close: {from: 116.0, dur: bed.seconds - 116.0},
} as const;

/** Voiceover placements: [beat id, absolute start in seconds]. */
export const VO: [VoId, number][] = [
 ['problem', SCENES.problem.from + 0.6],
 ['core', SCENES.core.from + 0.5],
 ['mcp', SCENES.mcp.from + 0.4],
 ['spelunk', SCENES.spelunk.from + 0.6],
 ['listen', SCENES.room.from + 0.6],
 ['extract', SCENES.room.from + 9.7],
 ['propose', SCENES.room.from + 18.3],
 ['decide', SCENES.room.from + 29.3],
 ['handoff', SCENES.handoff.from + 0.4],
 ['skill', SCENES.skill.from + 0.4],
 ['build', SCENES.build.from + 0.4],
 ['close', SCENES.close.from + 3.5],
];

export const voDuration = (id: VoId) => vo[id].duration;
export const voWords = (id: VoId) => vo[id].words as [string, number, number][];
export const TOTAL = bed.seconds;
export const frames = (s: number) => Math.round(s * FPS);

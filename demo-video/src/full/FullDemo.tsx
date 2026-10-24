// The finished Spelunk demo (1920×1080, 30 fps). Script: SCRIPT.md. Timeline: ./timeline.ts.
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import {FPS, SCENES, VO, frames, voDuration} from './timeline';
import {CloseScene, CoreScene, HandoffScene, NativeClip, WordmarkScene} from './scenes';
import {RoomScene} from './room';

/** Music volume: a soft bed under speech, a little fuller between lines, and a gentle fade-in. */
function musicVolume(f: number) {
 const t = f / FPS;
 let duck = 0;
 for (const [id, at] of VO) {
  const end = at + voDuration(id);
  duck = Math.max(duck, interpolate(t, [at - 0.35, at, end, end + 0.6], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
 }
 const fadeIn = interpolate(t, [0, 0.6], [0, 1], {extrapolateRight: 'clamp'});
 return fadeIn * (0.42 - 0.24 * duck);
}

const S = (k: keyof typeof SCENES) => ({from: frames(SCENES[k].from), durationInFrames: frames(SCENES[k].from + SCENES[k].dur) - frames(SCENES[k].from)});

export function FullDemo() {
 const {durationInFrames} = useVideoConfig();
 return <AbsoluteFill style={{background: '#f5f6f7'}}>
  <Audio src={staticFile('audio/music-bed.wav')} volume={musicVolume}/>
  {VO.map(([id, at]) => <Sequence key={id} from={frames(at)} durationInFrames={frames(voDuration(id)) + 2} name={`vo:${id}`}>
   <Audio src={staticFile(`audio/vo/${id}.mp3`)} volume={1}/>
  </Sequence>)}
  <Sequence {...S('problem')} name="01 problem"><NativeClip name="terminal-before" theme="dark" n="01" label="Coding agents read code like text"/></Sequence>
  <Sequence {...S('core')} name="02 core"><CoreScene/></Sequence>
  <Sequence {...S('mcp')} name="03 mcp"><NativeClip name="terminal-mcp" theme="dark" n="03" label="The same question, with repo-analysis in Claude Code"/></Sequence>
  <Sequence {...S('spelunk')} name="04 spelunk"><WordmarkScene/></Sequence>
  <Sequence {...S('room')} name="05 room"><RoomScene/></Sequence>
  <Sequence {...S('handoff')} name="07 handoff"><HandoffScene/></Sequence>
  <Sequence {...S('skill')} name="08 skill"><NativeClip name="skill-install" theme="light" n="06" label="The spelunk-handoff skill ships with the repo"/></Sequence>
  <Sequence {...S('build')} name="09 build"><NativeClip name="approval-gate" theme="dark" n="07" label="Claude Code works the handoff"/></Sequence>
  <Sequence from={frames(SCENES.close.from)} durationInFrames={durationInFrames - frames(SCENES.close.from)} name="10 close"><CloseScene dur={SCENES.close.dur}/></Sequence>
 </AbsoluteFill>;
}

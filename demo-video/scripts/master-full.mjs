// Master the full demo's audio to -16 LUFS integrated, -1.5 dBTP (two-pass loudnorm, linear); the video stream is copied.
//   out/spelunk-full-demo.raw.mp4 (Remotion render) → out/spelunk-full-demo.mp4
import {execFileSync, spawnSync} from 'node:child_process';
import {rmSync} from 'node:fs';

const src = 'out/spelunk-full-demo.raw.mp4', dst = 'out/spelunk-full-demo.mp4';
const target = 'I=-16:TP=-1.5:LRA=11';
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-vn', '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'});
const m = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{'), probe.stderr.lastIndexOf('}') + 1));
const af = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', src, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-af', af,
 '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-y', dst], {stdio: 'inherit'});
rmSync(src);
console.log(`Mastered ${dst}: measured ${m.input_i} LUFS / ${m.input_tp} dBTP, normalised to -16 LUFS / -1.5 dBTP.`);

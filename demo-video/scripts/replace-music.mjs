import {execFileSync} from 'node:child_process';
import {copyFile,rename,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';

const video='out/spelunk-demo.mp4';
const backup='out/spelunk-demo-synth.mp4';
try {await copyFile(video,backup,constants.COPYFILE_EXCL);} catch(error) {if(error.code!=='EEXIST') throw error;}
const run=args=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error',...args],{stdio:'inherit'});
run(['-i','public/audio/elevenlabs-original.mp3','-af','atrim=0:62,asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=in:st=0:d=0.4,afade=t=out:st=59.8:d=2.2,apad=whole_dur=62','-t','62','-ar','48000','-ac','2','-c:a','pcm_s16le','-y','public/audio/elevenlabs-score.wav']);
run(['-i',video,'-i','public/audio/elevenlabs-score.wav','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-af','volume=0.85','-t','62','-movflags','+faststart','-y','out/spelunk-demo-elevenlabs.mp4']);
const hash=file=>execFileSync('ffmpeg',['-v','error','-i',file,'-map','0:v:0','-c:v','copy','-f','hash','-hash','sha256','-'],{encoding:'utf8'}).trim();
const before=hash(video),after=hash('out/spelunk-demo-elevenlabs.mp4');
if(before!==after) throw new Error('Video stream changed while replacing soundtrack.');
await rename('out/spelunk-demo-elevenlabs.mp4',video);
await writeFile('out/music-verification.json',JSON.stringify({provider:'ElevenLabs',instrumental:true,duration:62,videoStreamUnchanged:before===after,videoStreamHash:after,backup},null,2));
console.log('Replaced soundtrack; video stream is byte-for-byte identical.');

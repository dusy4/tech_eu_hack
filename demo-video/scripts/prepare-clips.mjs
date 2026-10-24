import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const source='public/captures/session.webm';
const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',source],{encoding:'utf8'}));
const marks=JSON.parse(await readFile('out/capture-marks.json','utf8'));
const preroll=duration-marks.blastReady-5.5;
const cuts=[['conversation',preroll+marks.conversation,13],['accept',preroll+marks.accept-.7,8],['blast',preroll+marks.blastReady-6,11]];
for(const [name,start,length] of cuts) execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(start),'-i',source,'-t',String(length),'-vf','fps=30','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-an','-y',`public/captures/${name}.mp4`],{stdio:'inherit'});

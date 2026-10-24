import {mkdir,writeFile} from 'node:fs/promises';
const sampleRate=44100,seconds=62;
const buffer=Buffer.alloc(44+sampleRate*seconds*2);
buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(sampleRate,24);buffer.writeUInt32LE(sampleRate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(buffer.length-44,40);
const chords=[[130.813,164.814,195.998,246.942],[110,130.813,164.814,195.998],[87.307,130.813,174.614,220],[97.999,146.832,195.998,246.942]];
for(let i=0;i<sampleRate*seconds;i++){
 const t=i/sampleRate,beat=60/104,bar=beat*8,phase=t%bar;
 const chord=chords[Math.floor(t/bar)%chords.length];
 const envelope=Math.min(1,t/1.8,(seconds-t)/3.5)*Math.min(1,phase/.25,(bar-phase)/.5);
 let v=0;
 for(const [j,f] of chord.entries()) v+=.018*Math.sin(2*Math.PI*f*t+.4*Math.sin(t*.4+j));
 const pluckPhase=t%(beat/2),note=chord[Math.floor(t/(beat/2))%4]*4;
 v+=.055*Math.exp(-pluckPhase*13)*Math.sin(Math.PI*Math.min(1,pluckPhase/.007)/2)*Math.sin(2*Math.PI*note*pluckPhase);
 const kick=t%beat;
 v+=.045*Math.exp(-kick*22)*Math.sin(2*Math.PI*(46*kick+2*(1-Math.exp(-kick*25))));
 buffer.writeInt16LE(Math.round(v*envelope*32767),44+i*2);
}
await mkdir('public/audio',{recursive:true});
await writeFile('public/audio/score.wav',buffer);

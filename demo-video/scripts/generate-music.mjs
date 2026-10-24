import {mkdir,writeFile} from 'node:fs/promises';

const key=process.env.ELEVENLABS_API_KEY;
if(!key) throw new Error('Set ELEVENLABS_API_KEY before generating music.');
const request={
 model_id:'music_v2_5',
 music_length_ms:62000,
 force_instrumental:true,
 prompt:'Compose an original 62-second instrumental soundtrack for Spelunk, a refined software product demo about engineers discussing code, a live code graph, human decisions, and a coding-agent handoff. Modern minimal electronic, sophisticated and optimistic, 104 BPM, warm rounded analog bass, glassy plucked synth arpeggios, subtle crisp percussion, airy restrained pads. Clean professional mix with space for reading interface captions. No vocals, no choir, no spoken words. First 0-3 seconds: intriguing sparse pulse. 3-8 seconds: elegant brief rising logo reveal, gentle impact. 8-26 seconds: establish a confident steady groove with light playful plucks as the conversation appears. 26-34 seconds: small rhythmic lift for accepted decisions. 34-37 seconds: short restrained breakdown creating anticipation. 37-48 seconds: add a brighter arpeggio and satisfying forward momentum for a code impact graph. 48-56 seconds: pull drums back slightly for a focused handoff. 56-62 seconds: final uplifting brand resolve, musical cadence and a clean gentle ending at 62 seconds. No huge cinematic trailer hits, no aggressive EDM drop, no stock corporate ukulele.'
};
await mkdir('public/audio',{recursive:true});
await mkdir('out',{recursive:true});
await writeFile('public/audio/elevenlabs-request.json',JSON.stringify(request,null,2));
console.log('Generating 62-second instrumental with ElevenLabs Music.');
const response=await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192',{
 method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(600000)
});
if(!response.ok){
 const message=(await response.text()).replaceAll(key,'[redacted]');
 throw new Error(`ElevenLabs ${response.status}: ${message.slice(0,1500)}`);
}
const bytes=Buffer.from(await response.arrayBuffer());
await writeFile('public/audio/elevenlabs-original.mp3',bytes);
await writeFile('public/audio/elevenlabs-metadata.json',JSON.stringify({provider:'ElevenLabs',model:request.model_id,songId:response.headers.get('song-id'),requestedDuration:62,bytes:bytes.length,generatedAt:new Date().toISOString(),apiReference:'https://elevenlabs.io/docs/api-reference/music/compose'},null,2));
console.log(`Saved generated music (${bytes.length} bytes).`);

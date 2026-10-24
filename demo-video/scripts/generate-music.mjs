import {mkdir,writeFile} from 'node:fs/promises';

const key=process.env.ELEVENLABS_API_KEY;
if(!key) throw new Error('Set ELEVENLABS_API_KEY before generating music.');
const request={
 model_id:'music_v2_5',
 music_length_ms:62000,
 force_instrumental:true,
 prompt:'Original 62-second instrumental for a fast, vibrant startup launch film. Feel like an ambitious young software company shipping something genuinely new: confident, playful, kinetic, immediately memorable. 144 BPM. Forward-driving electro-house meets UK garage and punchy indie dance. A distinctive short, bright, slightly cheeky synth hook, syncopated rubbery bass, dry hard-hitting kick, sharp snare/clap, crisp shuffled hi-hats, chopped synth stabs, little bitcrushed digital accents and tight rhythmic glitches. Bright major-key energy with attitude. Upfront polished mix, powerful bass, short punchy transients. An actual catchy track rather than generic corporate background music. Instrumental only: absolutely no vocals, humming, speech or vocal samples. Start with an instantly engaging hook and beat in the FIRST SECOND, no ambient intro. 0-3 seconds: punchy hook and rhythm immediately. 3-8 seconds: quick rising synth flourish into a strong logo-reveal impact, with the groove continuing. 8-26 seconds: full propulsive groove, introduce a variation or new rhythmic detail every 4 bars; playful fast arpeggios behind the main hook. 26-34 seconds: lift intensity with extra percussion and bass syncopation. 34-37 seconds: very short glitchy rhythmic stop-and-restart with an exciting snare pickup, keep the pulse. 37-48 seconds: biggest, brightest groove, wide hook, crisp energetic drums; satisfying momentum. 48-56 seconds: change to a tighter percussive bass-led groove with small digital fills, still fast and lively. 56-62 seconds: bring back the signature hook for a confident final statement, then a crisp deliberate final hit and short decay, fully ended by 62 seconds. Avoid cinematic orchestration, pads that wash out the beat, sentimental piano, generic motivational corporate pop, ukulele, leisurely lo-fi, huge festival EDM drops or long build-ups. Fresh, colorful, punchy, exciting, unmistakably a startup demo-day launch.'
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

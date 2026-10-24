/**
 * Reson8 realtime speech-to-text (docs.reson8.dev): mic → 16 kHz PCM16 → WebSocket,
 * back come interim and final transcripts with a speaker id per segment (diarisation).
 */

export type Reson8Transcript = { text: string; final: boolean; speaker?: number };

export type Reson8Session = { analyser: AnalyserNode; stop: () => void };

const URL = "wss://api.reson8.dev/v1/speech-to-text/realtime";

/** A token from our dev-server route, or undefined when Reson8 isn't configured. */
export async function reson8Token(): Promise<string | undefined> {
  try {
    const r = await fetch("/api/reson8-token");
    if (!r.ok) return undefined;
    const j = (await r.json()) as { access_token?: string };
    return j.access_token;
  } catch {
    return undefined;
  }
}

// Converts the mic's float samples to little-endian 16-bit PCM in ~0.25 s chunks, off the main thread.
const WORKLET = `
class Pcm16 extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(4096); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.buffer.slice(0)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("pcm16", Pcm16);`;

export async function startReson8(token: string, onTranscript: (t: Reson8Transcript) => void, onError: (msg: string) => void): Promise<Reson8Session> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  // Asking the context for 16 kHz makes the browser resample for us.
  const ctx = new AudioContext({ sampleRate: 16000 });
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);

  const qs = new URLSearchParams({
    encoding: "pcm_s16le",
    sample_rate: "16000",
    channels: "1",
    include_interim: "true",
    diarize: "true",
    max_speakers: "4",
    language: "en",
  });
  const ws = new WebSocket(`${URL}?${qs}`, ["bearer", token]);
  ws.binaryType = "arraybuffer";
  ws.onmessage = (e) => {
    if (typeof e.data !== "string") return;
    const m = JSON.parse(e.data) as { type: string; text?: string; is_final?: boolean; speaker_id?: number };
    if (m.type === "transcript" && m.text) onTranscript({ text: m.text, final: m.is_final !== false, speaker: m.speaker_id });
  };
  ws.onerror = () => onError("Reson8 connection failed.");
  ws.onclose = (e) => {
    if (e.code !== 1000) onError(`Reson8 closed the stream (${e.code}).`);
  };

  const url = globalThis.URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
  await ctx.audioWorklet.addModule(url);
  const node = new AudioWorkletNode(ctx, "pcm16");
  node.port.onmessage = (e) => ws.readyState === WebSocket.OPEN && ws.send(e.data as ArrayBuffer);
  src.connect(node);

  return {
    analyser,
    stop: () => {
      node.port.onmessage = null;
      if (ws.readyState === WebSocket.OPEN) ws.close(1000);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    },
  };
}

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice input. The Reason8 adapter slots in here; until its API is confirmed this
 * uses the browser's speech recognition (Chrome) and the mic level for the waveform.
 */
export type VoiceStatus = "idle" | "listening" | "unsupported" | "denied";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function useVoice(onFinal: (text: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [interim, setInterim] = useState("");
  const [levels, setLevels] = useState<number[]>(() => Array(24).fill(0));
  const rec = useRef<Recognition | null>(null);
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  const stopAudio = () => {
    const a = audio.current;
    if (!a) return;
    cancelAnimationFrame(a.raf);
    a.stream.getTracks().forEach((t) => t.stop());
    a.ctx.close();
    audio.current = null;
    setLevels(Array(24).fill(0));
  };

  const stop = useCallback(() => {
    rec.current?.stop();
    stopAudio();
  }, []);

  const start = useCallback(async () => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        setLevels(Array.from({ length: 24 }, (_, i) => buf[i + 2] / 255));
        audio.current!.raf = requestAnimationFrame(tick);
      };
      audio.current = { ctx, stream, raf: requestAnimationFrame(tick) };
    } catch {
      setStatus("denied");
      return;
    }
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else text += res[0].transcript;
      }
      setInterim(finalText + text);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setStatus("denied");
    };
    r.onend = () => {
      stopAudio();
      setStatus((s) => (s === "listening" ? "idle" : s));
      setInterim("");
      if (finalText.trim()) finalRef.current(finalText.trim());
    };
    rec.current = r;
    setInterim("");
    setStatus("listening");
    r.start();
  }, []);

  useEffect(() => () => {
    rec.current?.abort();
    stopAudio();
  }, []);

  return { status, interim, levels, start, stop };
}

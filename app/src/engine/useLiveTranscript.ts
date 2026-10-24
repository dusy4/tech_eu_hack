import { useCallback, useEffect, useRef, useState } from "react";
import type { Utterance } from "./suggest";

/**
 * The conversation feed for live suggestions. "demo" replays a scripted discussion;
 * "mic" listens continuously in the browser (Reason8 diarisation slots in here later),
 * and every finished sentence comes out as one utterance.
 */
export type LiveMode = "off" | "demo" | "mic";

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

const LINE_MS = 3400;

export function useLiveTranscript(script: Omit<Utterance, "id" | "at">[], onUtterance: (u: Utterance) => void) {
  const [mode, setMode] = useState<LiveMode>("off");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);
  // Who is talking right now, and (mic only) the audio analyser the voice orb listens to.
  const [speaker, setSpeaker] = useState<string>();
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const emit = useRef(onUtterance);
  emit.current = onUtterance;
  const rec = useRef<Recognition | null>(null);

  // Demo: one line every few seconds, typed into the interim slot first so it reads as speech.
  useEffect(() => {
    if (mode !== "demo") return;
    setDone(false);
    let i = 0;
    let typing = 0;
    let next = 0;
    const say = () => {
      const line = script[i];
      if (!line) {
        setDone(true);
        return;
      }
      let c = 0;
      setSpeaker(line.speaker);
      typing = window.setInterval(() => {
        c += 3;
        setInterim(line.text.slice(0, c));
        if (c >= line.text.length) {
          clearInterval(typing);
          setInterim("");
          setSpeaker(undefined);
          emit.current({ ...line, id: `u-${Date.now()}-${i}`, at: Date.now() });
          i += 1;
          next = window.setTimeout(say, LINE_MS - line.text.length * 8);
        }
      }, 24);
    };
    next = window.setTimeout(say, 500);
    return () => {
      clearInterval(typing);
      clearTimeout(next);
      setInterim("");
      setSpeaker(undefined);
    };
  }, [mode, script, run]);

  // Mic: continuous recognition that restarts itself, since browsers end it after a pause.
  useEffect(() => {
    if (mode !== "mic") return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!Ctor) {
      setError("Live listening needs Chrome or Edge. Playing the demo conversation instead.");
      setMode("demo");
      return;
    }
    let alive = true;
    let audio: { ctx: AudioContext; stream: MediaStream } | undefined;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        if (!alive) return stream.getTracks().forEach((t) => t.stop());
        const ctx = new AudioContext();
        const node = ctx.createAnalyser();
        node.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(node);
        audio = { ctx, stream };
        setAnalyser(node);
      })
      .catch(() => {
        /* recognition reports the permission error itself */
      });
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          const t = res[0].transcript.trim();
          if (t) emit.current({ id: `u-${Date.now()}-${i}`, speaker: "You", text: t, at: Date.now() });
        } else text += res[0].transcript;
      }
      setInterim(text);
      setSpeaker(text ? "You" : undefined);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        alive = false;
        setError("Microphone access is blocked. Allow it in the address bar, or play the demo conversation.");
        setMode("off");
      }
    };
    r.onend = () => {
      if (alive) r.start();
    };
    rec.current = r;
    setError(undefined);
    r.start();
    return () => {
      alive = false;
      r.abort();
      rec.current = null;
      audio?.stream.getTracks().forEach((t) => t.stop());
      audio?.ctx.close();
      setAnalyser(null);
      setInterim("");
      setSpeaker(undefined);
    };
  }, [mode]);

  // Starting again replays the demo from the top.
  const start = useCallback((m: Exclude<LiveMode, "off">) => {
    setMode(m);
    setRun((r) => r + 1);
  }, []);
  const stop = useCallback(() => setMode("off"), []);
  return { mode, interim, speaker, analyser, error, done, start, stop };
}

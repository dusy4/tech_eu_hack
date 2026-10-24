import { useCallback, useEffect, useRef, useState } from "react";
import type { Utterance } from "./suggest";
import { reson8Token, startReson8 } from "./reson8";

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

const WORD_MS = 300;
// Silence between speakers, long enough to read the suggestion that just appeared.
const PAUSE_MS = 1600;

export function useLiveTranscript(script: Omit<Utterance, "id" | "at">[], onUtterance: (u: Utterance) => void) {
  const [mode, setMode] = useState<LiveMode>("off");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);
  // Who is talking right now, and (mic only) the audio analyser the voice orb listens to.
  const [speaker, setSpeaker] = useState<string>();
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [engine, setEngine] = useState<"reson8" | "browser">();
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
      // Words arrive at about speaking pace (~3 a second), not as a character flicker.
      const ws = line.text.split(" ");
      let c = 0;
      setSpeaker(line.speaker);
      typing = window.setInterval(() => {
        c += 1;
        setInterim(ws.slice(0, c).join(" "));
        if (c >= ws.length) {
          clearInterval(typing);
          next = window.setTimeout(() => {
            setInterim("");
            setSpeaker(undefined);
            emit.current({ ...line, id: `u-${Date.now()}-${i}`, at: Date.now() });
            i += 1;
            next = window.setTimeout(say, PAUSE_MS);
          }, 350);
        }
      }, WORD_MS);
    };
    next = window.setTimeout(say, 500);
    return () => {
      clearInterval(typing);
      clearTimeout(next);
      setInterim("");
      setSpeaker(undefined);
    };
  }, [mode, script, run]);

  // Mic: Reson8 when the dev server has a key (real diarisation, so each voice gets its own name),
  // otherwise the browser's recogniser, which hears one speaker and restarts itself after pauses.
  useEffect(() => {
    if (mode !== "mic") return;
    let alive = true;
    let cleanup = () => {};

    const startBrowser = () => {
      const Ctor =
        (window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
      if (!Ctor) {
        setError("Live listening needs Chrome or Edge, or a Reson8 key. Playing the demo conversation instead.");
        setMode("demo");
        return;
      }
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
      setEngine("browser");
      r.start();
      cleanup = () => {
        r.abort();
        rec.current = null;
        audio?.stream.getTracks().forEach((t) => t.stop());
        audio?.ctx.close();
      };
    };

    setError(undefined);
    (async () => {
      const token = await reson8Token();
      if (!alive) return;
      if (token) {
        try {
          let n = 0;
          const sess = await startReson8(
            token,
            (t) => {
              const who = t.speaker === undefined ? "You" : `Speaker ${t.speaker + 1}`;
              if (t.final) {
                setInterim("");
                setSpeaker(undefined);
                if (t.text.trim()) emit.current({ id: `u-${Date.now()}-${n++}`, speaker: who, text: t.text.trim(), at: Date.now() });
              } else {
                setInterim(t.text);
                setSpeaker(who);
              }
            },
            (msg) => setError(msg),
          );
          if (!alive) return sess.stop();
          setEngine("reson8");
          setAnalyser(sess.analyser);
          cleanup = sess.stop;
          return;
        } catch {
          setError("Couldn't start Reson8; using the browser's recogniser.");
        }
      }
      startBrowser();
    })();

    return () => {
      alive = false;
      cleanup();
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
  return { mode, interim, speaker, analyser, engine, error, done, start, stop };
}

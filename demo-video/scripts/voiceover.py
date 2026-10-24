"""Voice the narration with ElevenLabs and cut it into one clip per beat.

    python -I scripts/voiceover.py            (from demo-video/)

Reads src/narration.json, sends the whole narration in one text-to-speech call (one consistent take, with
character timestamps), then cuts it at the beat boundaries into public/audio/vo/<beat>.mp3 and writes
src/vo-timings.json (duration of every beat clip, plus word timings for captions).

The key comes from ELEVENLABS_API_KEY in the environment and is never written anywhere.
The full take is cached in public/audio/vo/vo-full.mp3 + vo-align.json: delete them to voice it again.
Same approach as the ai-games-offer shorts renderer (make_news_short.voiceover): eleven_v3 with timestamps.
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CFG = ROOT / "src" / "narration.json"
OUT = ROOT / "public" / "audio" / "vo"
TIMINGS = ROOT / "src" / "vo-timings.json"


def run(args):
    subprocess.run(args, check=True)


def tts(cfg, text):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY first.")
    body = json.dumps({
        "text": text,
        "model_id": cfg["model"],
        "voice_settings": {"stability": cfg.get("stability", 0.5), "similarity_boost": 0.8},
    }).encode()
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voice_id']}/with-timestamps?output_format=mp3_44100_128"
    for _ in range(10):
        try:
            req = urllib.request.Request(url, data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=300))
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode("utf8", "replace").replace(key, "[redacted]")
            if "busy" not in msg and e.code != 429:
                sys.exit(f"ElevenLabs {e.code}: {msg}")
            time.sleep(10)
    sys.exit("ElevenLabs stayed busy")


def words_of(al):
    """[word, start, end] for every spoken word (v3 audio tags like [calm] are dropped)."""
    words, cur, ws, we = [], "", 0.0, 0.0
    for ch, t0, t1 in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append([cur, ws, we])
            cur = ""
            continue
        if not cur:
            ws = t0
        cur, we = cur + ch, t1
    if cur:
        words.append([cur, ws, we])
    return [w for w in words if not (w[0].startswith("[") and w[0].endswith("]"))]


def main():
    cfg = json.loads(CFG.read_text(encoding="utf8"))
    OUT.mkdir(parents=True, exist_ok=True)
    full, align = OUT / "vo-full.mp3", OUT / "vo-align.json"
    text = " ".join(b["say"] for b in cfg["beats"])
    if not (full.exists() and align.exists()):
        d = tts(cfg, text)
        full.write_bytes(base64.b64decode(d["audio_base64"]))
        align.write_text(json.dumps(d["alignment"]), encoding="utf8")
        print("voiced", len(text), "characters")
    al = json.loads(align.read_text(encoding="utf8"))
    words = words_of(al)
    total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(full)],
                                 capture_output=True, text=True, check=True).stdout)
    beats, wi = [], 0
    for b in cfg["beats"]:
        n = len(b["say"].split())
        ws = words[wi:wi + n]
        wi += n
        beats.append({"id": b["id"], "start": ws[0][1], "end": ws[-1][2], "words": ws})
    if wi != len(words):
        print(f"WARNING: {len(words)} spoken words, {wi} expected; check the alignment")
    timings = {}
    for i, b in enumerate(beats):
        # cut halfway into the pauses around the beat so no breath or tail is clipped
        a = 0.0 if i == 0 else (beats[i - 1]["end"] + b["start"]) / 2
        z = total if i == len(beats) - 1 else (b["end"] + beats[i + 1]["start"]) / 2
        a = max(a, b["start"] - 0.25)
        z = min(z, b["end"] + 0.35)
        clip = OUT / f"{b['id']}.mp3"
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{z:.3f}", "-i", str(full),
             "-af", "afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse", "-c:a", "libmp3lame", "-b:a", "192k", str(clip)])
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(clip)],
                                   capture_output=True, text=True, check=True).stdout)
        timings[b["id"]] = {"duration": round(dur, 3), "words": [[w, round(s - a, 3), round(e - a, 3)] for w, s, e in b["words"]]}
        print(f"{b['id']:9s} {dur:6.2f} s  ({b['start']:.2f}-{b['end']:.2f} in the take)")
    TIMINGS.write_text(json.dumps(timings, indent=1), encoding="utf8")
    print("total speech", round(sum(t["duration"] for t in timings.values()), 1), "s")


if __name__ == "__main__":
    main()

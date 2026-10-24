"""QA for out/spelunk-full-demo.mp4 (run from demo-video/: python -I scripts/qa-full.py).

- format: 1920x1080, 30 fps, H.264 + AAC, length matches the composition;
- full decode with no errors; integrated loudness (EBU R128) and true peak;
- contact sheets (one frame every 3 s) and a frame at the middle of every voiceover beat → out/qa/;
- blink scan: a jump into a frame and straight back out (the drivers-ed-shorts qa_video.py check), ignoring scene cuts;
- writes out/spelunk-full-demo.srt from the voiceover timings.
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
VIDEO = ROOT / "out" / "spelunk-full-demo.mp4"
QA = ROOT / "out" / "qa"
FPS = 30


def sh(args, **kw):
    return subprocess.run(args, capture_output=True, text=True, check=True, **kw)


def timeline():
    """Scene starts and voiceover placements, read from src/full/timeline.ts."""
    src = (ROOT / "src" / "full" / "timeline.ts").read_text(encoding="utf8")
    scenes = {m[0]: (float(m[1]), m[2]) for m in re.findall(r"(\w+): \{from: ([\d.]+), dur: ([^}]+)\}", src)}
    vo = [(m[0], scenes[m[1]][0] + float(m[2])) for m in re.findall(r"\['(\w+)', SCENES\.(\w+)\.from \+ ([\d.]+)\]", src)]
    return scenes, vo


def main():
    QA.mkdir(parents=True, exist_ok=True)
    meta = json.loads(sh(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)]).stdout)
    v = next(s for s in meta["streams"] if s["codec_type"] == "video")
    a = next(s for s in meta["streams"] if s["codec_type"] == "audio")
    dur = float(meta["format"]["duration"])
    bed = json.loads((ROOT / "src" / "music-bed.json").read_text())["seconds"]
    assert (v["width"], v["height"], v["avg_frame_rate"]) == (1920, 1080, "30/1"), v
    assert abs(dur - bed) < 0.15, (dur, bed)
    print(f"format ok: {v['width']}x{v['height']} {v['avg_frame_rate']} {v['codec_name']} + {a['codec_name']}, {dur:.2f} s")
    err = sh(["ffmpeg", "-v", "error", "-i", str(VIDEO), "-f", "null", "-"]).stderr.strip()
    print("decode:", "clean" if not err else err[:400])
    loud = sh(["ffmpeg", "-hide_banner", "-i", str(VIDEO), "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    summ = loud[loud.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1)
    tp = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1)
    print(f"loudness: {i} LUFS integrated, true peak {tp} dBFS")

    for k, start in enumerate(range(0, int(dur), 48)):
        sh(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", "48", "-i", str(VIDEO), "-vf", "fps=1/3,scale=480:-1,tile=4x4",
            "-frames:v", "1", str(QA / f"sheet-{k}.jpg")])
    scenes, vo = timeline()
    words = json.loads((ROOT / "src" / "vo-timings.json").read_text(encoding="utf8"))
    for bid, at in vo:
        mid = at + words[bid]["duration"] * 0.6
        sh(["ffmpeg", "-v", "error", "-y", "-ss", f"{mid:.2f}", "-i", str(VIDEO), "-frames:v", "1", str(QA / f"beat-{bid}.png")])

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(VIDEO), "-vf", "scale=240:135", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, 135, 240).astype(np.float32)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    cuts = {round(s * FPS) + o for s, _ in scenes.values() for o in range(-2, 9)}
    flagged = []
    for n in range(2, len(d) - 2):
        if n in cuts or n + 1 in cuts:
            continue
        local = np.median(np.r_[d[max(0, n - 6):n - 1], d[n + 2:n + 7]])
        if d[n] > max(6.0, 4 * local) and max(d[n + 1], d[n - 1]) > max(5.0, 3 * local):
            flagged.append(n + 1)
    print(f"blink scan: {len(f)} frames, {len(flagged)} candidates", [round(x / FPS, 2) for x in flagged[:20]])

    def ts(x):
        ms = int(round(x * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    narration = {b["id"]: b["say"] for b in json.loads((ROOT / "src" / "narration.json").read_text(encoding="utf8"))["beats"]}
    cues, n = [], 1
    for bid, at in vo:
        ws = words[bid]["words"]
        # one cue per sentence-ish chunk (break after . , : ? when the chunk is long enough)
        chunk = []
        for w in ws:
            chunk.append(w)
            if (w[0][-1] in ".?:" or (w[0][-1] == "," and len(chunk) >= 6)) or len(chunk) >= 12:
                cues.append((n, at + chunk[0][1], at + chunk[-1][2] + 0.2, " ".join(c[0] for c in chunk)))
                n, chunk = n + 1, []
        if chunk:
            cues.append((n, at + chunk[0][1], at + chunk[-1][2] + 0.2, " ".join(c[0] for c in chunk)))
            n += 1
        assert narration[bid].split() == [w[0] for w in ws]
    fixes = {"Resonate": "Reson8", "Approval Required Tool": "ApprovalRequiredTool", "Find symbol": "find_symbol",
             "Symbol relations": "symbol_relations", "spelunk handoff": "spelunk-handoff", "rust analyzer": "rust-analyzer"}
    out = []
    for k, a_, b_, text in cues:
        for x, y in fixes.items():
            text = text.replace(x, y)
        out.append(f"{k}\n{ts(a_)} --> {ts(b_)}\n{text}\n")
    (ROOT / "out" / "spelunk-full-demo.srt").write_text("\n".join(out), encoding="utf8")
    print(f"captions: {len(out)} cues-> out/spelunk-full-demo.srt; sheets and beat frames -> out/qa/")


if __name__ == "__main__":
    main()

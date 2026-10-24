"""Stretch the 62-second ElevenLabs "mellow" score into a bed for the full demo, without new generation.

    python -I scripts/music-bed.py <target seconds>      (from demo-video/)

Plays public/audio/elevenlabs-mellow-original.mp3 from the top, jumps back twice to a musically matching earlier
point (searched by waveform similarity near the wanted jump length, so the loop lands on the same beat and bar),
and keeps the track's own ending. Writes public/audio/music-bed.wav (48 kHz stereo) and src/music-bed.json with
the exact length, which the composition uses as its duration. The source files are never modified.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "audio" / "elevenlabs-mellow-original.mp3"
OUT = ROOT / "public" / "audio" / "music-bed.wav"
META = ROOT / "src" / "music-bed.json"
SR = 48000


def load():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(SRC), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def envelope(x, hop=480):
    m = x.mean(axis=1)
    n = len(m) // hop
    e = np.log1p(1000 * (m[: n * hop].reshape(n, hop) ** 2).sum(axis=1))
    return np.maximum(0, np.diff(e, prepend=e[0]))  # onset strength, 100 per second


def best_jump(x, env, j, want):
    """Return k (seconds) < j where the audio after k best matches the audio after j, with j - k near `want`."""
    fr, w = 100, 400  # 4 s of onsets
    a = env[int(j * fr): int(j * fr) + w]
    best, bk = -2.0, None
    for d in np.arange(want - 2.5, want + 2.5, 0.01):
        k = j - d
        if k < 4:
            continue
        b = env[int(k * fr): int(k * fr) + w]
        c = np.corrcoef(a, b)[0, 1]
        if c > best:
            best, bk = c, k
    # fine alignment on the waveform, +-15 ms
    m = x.mean(axis=1)
    ref = m[int(j * SR): int(j * SR) + SR // 2]
    best_f, kf = -2.0, bk
    for off in range(-720, 721, 8):
        s = int(bk * SR) + off
        c = np.dot(ref, m[s: s + len(ref)]) / (np.linalg.norm(ref) * np.linalg.norm(m[s: s + len(ref)]) + 1e-9)
        if c > best_f:
            best_f, kf = c, s / SR
    return kf, best, best_f


def main():
    target = float(sys.argv[1])
    x = load()
    total = len(x) / SR
    env = envelope(x)
    extra = target - total
    if extra <= 0:
        sys.exit("target is shorter than the source; trim it in the composition instead")
    jumps = [(40.0, extra / 2), (40.0, extra / 2)]
    pieces, t, report = [], 0.0, []
    xf = int(0.12 * SR)
    for j, want in jumps:
        k, c1, c2 = best_jump(x, env, j, want)
        pieces.append((t, j))
        report.append({"from": round(j, 3), "to": round(k, 3), "onsetCorr": round(float(c1), 3), "waveCorr": round(float(c2), 3)})
        t = k
    pieces.append((t, total))
    out = np.zeros((0, 2), np.float32)
    for a, b in pieces:
        seg = x[int(a * SR): int(b * SR) + xf]
        if len(out):
            fade = np.linspace(0, np.pi / 2, xf)[:, None]
            out[-xf:] = out[-xf:] * np.cos(fade) + seg[:xf] * np.sin(fade)
            seg = seg[xf:]
        out = np.concatenate([out, seg])
    out = out[: len(out) - xf]
    pcm = (np.clip(out, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", str(OUT)], input=pcm, check=True)
    length = len(out) / SR
    META.write_text(json.dumps({"source": SRC.name, "seconds": round(length, 3), "jumps": report}, indent=1), encoding="utf8")
    print(json.dumps({"seconds": round(length, 3), "jumps": report}))


if __name__ == "__main__":
    main()

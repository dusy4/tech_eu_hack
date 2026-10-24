# Spelunk demo videos

Two compositions live here:

- **`SpelunkFullDemo`**: the finished 2:11 demo (1920 × 1080, 30 fps, narrated). Script and beats: [`SCRIPT.md`](SCRIPT.md). Export: `out/spelunk-full-demo.mp4`.
- **`SpelunkDemo`**: the earlier 62-second music-only cut (1280 × 720), documented below the full demo's section.

## Full demo: rebuild

```powershell
cd D:\tech_eu_hack\demo-video
npm ci
npm run check                       # typecheck
npm run render:full                 # Remotion render, then audio mastered to -16 LUFS → out/spelunk-full-demo.mp4
npm run qa:full                     # decode check, loudness, contact sheet, blink scan → out/qa/
```

The render uses generated files that sit in this folder: `public/native/*.mp4`, `public/audio/vo/*.mp3`, `public/audio/music-bed.wav`, `src/vo-timings.json`, `src/music-bed.json`. Rebuild those only when you change them:

| What | Edit | Rebuild |
|---|---|---|
| Native interface clips (Claude Code terminals, skills page, permission prompt) | the `CONFIG` block at the top of `src/native/<clip>/index.html` | `node scripts/render-native.mjs [clip]` (HyperFrames, pinned `hyperframes@0.8.162`, ~1 min per clip). The components' motion kit is gitignored for licence reasons and copied in from `D:\ai-games-offer\vendor\everestchris-components` (override with `NATIVE_KIT`). See `src/native/NOTICE.md`. |
| Narration | `src/narration.json` (one line per beat) | delete `public/audio/vo/vo-full.mp3` and `vo-align.json`, set `ELEVENLABS_API_KEY`, run `python -I scripts/voiceover.py`. One `eleven_v3` take with timestamps, cut per beat; writes `src/vo-timings.json`. Then check every beat still fits its scene in `src/full/timeline.ts` (`voAt` + duration < scene length). |
| Music bed | nothing: it reuses the ElevenLabs "mellow" score | `python -I scripts/music-bed.py <seconds>` loops `elevenlabs-mellow-original.mp3` on bar boundaries to the target length; the composition's length follows `src/music-bed.json`. |
| Scene timing, Spelunk scenes | `src/full/timeline.ts`, `src/full/*.tsx` | `npm run render:full` |

What is real and what is staged (also in `SCRIPT.md`): every symbol, path, line number and count shown comes from the `rust-agent-framework` checkout in `../repo_analyse/`. The Claude Code clips are scripted renders of native interface components, not recordings, and the Spelunk room (`src/full/room.tsx`) is a recreation of the app's layout and tokens, because the live Haiku loop was still being built in `app/`. To swap in real footage later, record the app, drop the clip into `public/captures/`, and replace `<RoomScene/>` in `src/full/FullDemo.tsx` with an `OffthreadVideo` of it (keep the scene length in `timeline.ts`).

Captions: `out/spelunk-full-demo.srt` is written by `npm run qa:full` from the voiceover timings (not burned in).

## Short cut: `SpelunkDemo` (62 s)

A 62-second, 1280 × 720, 30 fps product demo. All video visuals use actual Snapcn registry components: `TextReveal`, `TextBuild`, `BlockWordmark`, `ScreenRecording`, and `TerminalSimulator`. Layout wrappers and the Remotion timeline only arrange these components. App footage is captured from the real local Spelunk frontend.

The film uses the existing React sample answers and scripted discussion. It shows accepting proposals and inspecting the blast radius. The terminal shot is an explicitly labeled illustration of the structured handoff; it does not claim that external agent delivery is connected. No benchmark claims are included.

### Watch and edit

- Export: `out/spelunk-demo.mp4`
- Composition: `src/video.tsx`
- ElevenLabs instrumental: `public/audio/elevenlabs-score.wav`, generated with Music v2.5 and mastered for this cut. Current direction: 144 BPM, vibrant electro-house / UK garage, punchy drums, syncopated bass, a bright signature synth hook, immediate momentum and a sharp closing hit. Prompt and non-secret generation metadata are alongside it. The earlier mellow track is retained under `public/audio/elevenlabs-mellow-*`; the original synthesized fallback is `public/audio/score.wav`.
- Source attribution: `snapcn-sources.json`, with the upstream MIT license in `SNAPCN-LICENSE`

```powershell
cd D:\tech_eu_hack\demo-video
npm ci
npm run studio
npm run check
npm run render
```

Remotion can download its headless browser automatically. To use an installed Chromium, append `-- --browser-executable="C:\path\to\chrome.exe"` to the render command.

### Capture again

Run the frontend in another terminal (`cd ../app; npm run dev -- --host 127.0.0.1`). Set `CHROME_PATH` to your Chromium executable if needed, then:

```powershell
npm run capture
node scripts/prepare-clips.mjs
npm run render
```

Capture uses only the frontend's built-in demonstration and local input. It does not send proposals to an external agent. Capture timings are saved to `out/capture-marks.json`.

### Generate or replace the music

Set `ELEVENLABS_API_KEY` in the process environment, then run `node scripts/generate-music.mjs`. The script reads the key from the environment and never saves it. Run `node scripts/replace-music.mjs` to master the track, replace the existing MP4's audio without re-encoding its video, and verify the video stream hash. The original export is preserved as `out/spelunk-demo-synth.mp4`. Run `node scripts/verify.mjs` for a full decode check. Music generation uses the authenticated account's ElevenLabs credits.

### Timeline

| Time | Shot |
| --- | --- |
| 0–3s | The problem: discussions lose decisions |
| 3–8s | Spelunk wordmark and positioning |
| 8–13s | Actual app reveal |
| 13–26s | Conversation and symbol proposals |
| 26–34s | Human acceptance and the decision tray |
| 34–37s | Impact question |
| 37–48s | Blast radius, callers, and tests |
| 48–56s | Labeled handoff payload illustration |
| 56–62s | Brand close |

Components were copied directly from the public registry at https://snapcn.dev/r/, including their shared dependencies. Their source remains unmodified. Registry reference: https://snapcn.dev/. The optional Claude Code video toolkit was not needed.

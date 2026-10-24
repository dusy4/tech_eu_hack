# Spelunk demo

A 62-second, 1280 × 720, 30 fps product demo. All video visuals use actual Snapcn registry components: `TextReveal`, `TextBuild`, `BlockWordmark`, `ScreenRecording`, and `TerminalSimulator`. Layout wrappers and the Remotion timeline only arrange these components. App footage is captured from the real local Spelunk frontend.

The film uses the existing React sample answers and scripted discussion. It shows accepting proposals and inspecting the blast radius. The terminal shot is an explicitly labeled illustration of the structured handoff; it does not claim that external agent delivery is connected. No benchmark claims are included.

## Watch and edit

- Export: `out/spelunk-demo.mp4`
- Composition: `src/video.tsx`
- ElevenLabs instrumental: `public/audio/elevenlabs-score.wav`, generated with Music v2.5 and mastered for this cut. Prompt and non-secret generation metadata are alongside it. The original synthesized fallback is retained in `public/audio/score.wav`.
- Source attribution: `snapcn-sources.json`, with the upstream MIT license in `SNAPCN-LICENSE`

```powershell
cd D:\tech_eu_hack\demo-video
npm ci
npm run studio
npm run check
npm run render
```

Remotion can download its headless browser automatically. To use an installed Chromium, append `-- --browser-executable="C:\path\to\chrome.exe"` to the render command.

## Capture again

Run the frontend in another terminal (`cd ../app; npm run dev -- --host 127.0.0.1`). Set `CHROME_PATH` to your Chromium executable if needed, then:

```powershell
npm run capture
node scripts/prepare-clips.mjs
npm run render
```

Capture uses only the frontend's built-in demonstration and local input. It does not send proposals to an external agent. Capture timings are saved to `out/capture-marks.json`.

## Generate or replace the music

Set `ELEVENLABS_API_KEY` in the process environment, then run `node scripts/generate-music.mjs`. The script reads the key from the environment and never saves it. Run `node scripts/replace-music.mjs` to master the track, replace the existing MP4's audio without re-encoding its video, and verify the video stream hash. The original export is preserved as `out/spelunk-demo-synth.mp4`. Run `node scripts/verify.mjs` for a full decode check. Music generation uses the authenticated account's ElevenLabs credits.

## Timeline

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

# Gemini skin

A faithful HTML/CSS recreation of the current Gemini app (gemini.google.com and the desktop app, Oct 2026 build: the I/O 2026 redesign plus the Oct 13 Gemini 4 Argon update), with the mobile drawer, Gemini Live, the Task view and Canvas. Light and dark. Use it whenever a component shows Gemini, so every component shows the same Gemini.

Truth: `research/ui-references/gemini/` and its `UI-NOTES.md`. What maps to which frame, the measurements, and what was extrapolated are in `DECISIONS.md`.

## Files
| File | What it is |
|---|---|
| `skin.css` | All styles, scoped under `.sk-gemini`. Light by default; dark via `data-theme="dark"` on the root (or any ancestor). Every colour is a `--gm-*` custom property. Ships `@font-face` for Google Sans / Google Sans Code from `fonts/`. |
| `fonts/` | Google Sans (OFL, latin + latin-ext, variable 400–700) and Google Sans Code. Local files, no network. |
| `img/` | Account photos for the avatar: `avatar-alex.jpg`, `avatar-camille.jpg` (160×160 Unsplash face crops, Unsplash License). Reference them as `assets/skins/gemini/img/…` from a component. |
| `icons.js` | `window.SKIN_ICONS_GEMINI` (inline SVG strings, `currentColor`; the spark and Google app marks keep brand colours) and `window.SKIN_GEMINI` (deterministic GSAP helpers). |
| `snippets.html` | Canonical markup for every piece, light and dark side by side. Serve `library/` over http and open `_skins/gemini/snippets.html`. |
| `demo/` | HyperFrames demo: variant 0 home, typing and sending; 1 agent reply streaming, then the pointer opens the new Sheet link; 2 model picker open, picking 4 Argon. |

## Use it in a component
```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/gemini/skin.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="assets/skins/gemini/icons.js"></script>

<div style="zoom: 1.7; width: 1129px; height: 635px">   <!-- real CSS px, scaled for video -->
  <div class="sk-gemini gm-app" data-theme="light">       <!-- or "dark" -->
    … copy from snippets.html …
  </div>
</div>
<script>
  SKIN_GEMINI.mountIcons(document);   // fills every <span class="gm-ico" data-gm-icon="name">
</script>
```
- **All sizes are the real app's CSS px** (16px body, 64px composer pill, 36px greeting). Scale with `zoom` (or a transform) on a wrapper, never by editing sizes. The demo shows a 1129×635 viewport at `zoom: 1.7`, so body text lands at about 27px on the 1080p frame, like a launch-video screen crop.
- **Fonts:** Google Sans is the real family and is open source, so the skin ships it (`fonts/`). The capture/sync script copies the whole skin folder, fonts included. Inter is only the fallback.
- **Icons:** `SKIN_GEMINI.icon("mic")` returns `<span class="gm-ico">svg</span>`; size any icon with `--gm-ico: 20px`.
- **Brand mark:** `spark` is the multicolour four-point sparkle (red top, yellow left, blue right, green bottom). It is the only multicolour element in the UI chrome; everything else is monochrome outline icons. Google file marks (`gsheets`, `gslides`, `gdocs`, `gdrive`, `gmail`, `gphotos`) keep their brand colours inside answers.
- **Avatar:** the signed-in account is always a photo, never initials: `<div class="gm-avatar gm-avatar--ring"><img src="assets/skins/gemini/img/avatar-alex.jpg" alt=""></div>` (36px with the four-colour account ring) or plain `.gm-avatar > img` (32px). Preload the image before you build the timeline (the demo does `new Image()` in its `Promise.all`). Initials (`.gm-avatar` with text) are for contacts inside cards only.
- **Rail and glow:** the light rail is a solid `#fdfdfd` panel; the dark rail is transparent (`--gm-rail-bg`). `.gm-home-bg` bleeds `--gm-rail-w` (72px) past both sides of `.gm-main`, so the dark navy glow runs edge to edge under the rail and stays centred on the column. Keep `.gm-home-bg` inside `.gm-main`.

## Pieces and class names
| Piece | Markup root | States / modifiers |
|---|---|---|
| App frame | `.gm-app` > `.gm-rail` + `.gm-main` | `.gm-home-bg` inside `.gm-main` for the home gradient (bleeds under the rail) |
| Collapsed rail | `.gm-rail` > `.gm-rail__logo`, `.gm-rail__btn` ×6, `.gm-rail__spacer`, settings, `.gm-avatar.gm-avatar--ring > img` | `.gm-rail__btn.is-active` (filled circle), `.is-hover`; `.gm-badge-dot`; transparent in dark |
| Avatar | `.gm-avatar > img` (32px) / `.gm-avatar.gm-avatar--ring > img` (36px, ring + gap) | text inside = initials (contacts only) |
| Expanded sidebar (macOS, May) | `.gm-sidebar` > `.gm-sidebar__top`, `.gm-seg`, `.gm-nav` > `.gm-nav-item`, `.gm-nav-section`, `.gm-recent`, `.gm-profile` | `.gm-nav-item.is-active`; `.gm-window` + `.gm-traffic` for a window |
| Top bar | `.gm-topbar` > `.gm-topbar__title` + `.gm-topbar__actions` | — |
| Home | `.gm-home` (set `--gm-home-top`) > `.gm-greeting` (> `.gm-greeting__line` ×2) + `.gm-composer` + `.gm-mode-toggle` | greeting: "Hi Alex, / what can I help with?" (Chat), "What can I take off your plate?" (Task) |
| Chat \| Task toggle | `.gm-mode-toggle` > `.gm-mode` ×2 | `.gm-mode.is-active` |
| Composer | `.gm-composer` > `.gm-composer__input` (`__placeholder`, `__text`, `.gm-caret`) + `.gm-composer__bar` (plus, `__spacer`, `.gm-model-chip`, mic, `.gm-send`) | idle = 64px pill, no send; `.is-expanded.has-text` = 2-row card + send; `.is-generating` = stop square; `--gm-composer-w` sets width |
| Tool chip | `.gm-tool-chip` (after the +) | "Canvas" |
| Model chip | `.gm-model-chip` > label + `.gm-model-chip__down` + `.gm-model-chip__up` | `.is-open` = filled pill, chevron up |
| Model menu | `.gm-model-menu` > `.gm-model-option` (`__check`, `__name`, `__desc`) | `.is-selected` (check), `.is-hover` (fill). Place `right:0; top:calc(100% + 5px)` under the chip |
| Tools menu | `.gm-tools-menu` > `.gm-tools-menu__title` + `.gm-tools-item` | `.is-hover` |
| Conversation | `.gm-chat` > `.gm-topbar`, `.gm-thread` > `.gm-thread__inner`, `.gm-chat__dock` (composer + `.gm-disclaimer`) | `--gm-col-w` column width (712 default); the dock fades content above it |
| User message | `.gm-turn-user` > `.gm-bubble` (+ `.gm-turn-user__actions`) | actions show on hover |
| Model message | `.gm-turn-model` > [`.gm-thought-line`] [`.gm-thinking`] `.gm-answer` + `.gm-msg-actions` | no bubble, no avatar |
| Thinking / working | `.gm-thinking` > `.gm-thinking__head` (`__glyph` dots + `__label`) + `.gm-steps` > `.gm-step` | `.gm-step.has-icon` + `.gm-step__icon` (`.is-logo` for Drive etc.); label "Thinking it through…" → "Finished thinking ⌄" |
| Answer bits | `.gm-answer` (p, h3, ul, code, pre), `.gm-doc-link`, `.gm-app-link`, `.gm-mention` | `.gm-doc-link--app` + a product mark (`gsheets`/`gslides`/`gdocs`) for Google files, plain `.gm-doc-link` + `pageEmoji` for a generic doc; `.is-hover` darkens the underline. Streamed with `SKIN_GEMINI.streamWords` |
| Action row | `.gm-msg-actions` > `.gm-icon-btn` × (thumbUp, thumbDown, redo, share, copy, more) | — |
| Gmail draft card | `.gm-mail` > `__head`, `__row`, `__body`, `__foot` | extrapolated from UI-NOTES |
| Task view | `.gm-tasks` > `.gm-tasks__list` (`.gm-create-task`, `.gm-list-head`, `.gm-task-row`) + `.gm-task-card` | `.gm-task-row.is-active`, `.gm-unread`, `.gm-needs`, `.gm-done-chip` |
| Canvas | `.gm-split` > `.gm-split__chat` + `.gm-canvas` (`__bar`, `__seg`, `__body`, `__code`) | toolbar extrapolated |
| Mobile | `.gm-mobile` > `.gm-m-home`, `.gm-m-topbar`, `.gm-m-composer`, `.gm-drawer` | 1x phone px; drawer `.gm-nav-item.is-brief` = lavender pill |
| Gemini Live | `.gm-live` > `__glow`, `__transcript`, `__card`, `__bar` > `.gm-live__btn` ×4 + `.gm-live__orb` | always dark; `.is-on-camera`, `.is-active-cam` |
| Pointer | `.gm-pointer` with `cursorArrow` / `cursorHand` | macOS arrow; hand over buttons |

## Motion helpers (`window.SKIN_GEMINI`)
All are seek-safe: they only add `set`/`to` tweens to the timeline you pass (no callbacks, no clocks, no random).
- `icon(name, cls)`: icon markup string.
- `mountIcons(root)`: fill `[data-gm-icon]` elements. Call once before building the timeline.
- `typeText(tl, el, text, at, {cps=22, jitter=0.35})`: one span per character, revealed at a believable, deterministic cadence; returns the end time.
- `streamWords(tl, container, at, {wps=24, fade=0.22})`: wraps words (`.gm-stream-unit` elements count as one) and fades them in 2–3-word chunks, like Gemini's stream; returns the end time.
- `thinkingDots(tl, svg, t0, t1, period=0.9)`: the rising three-dot wave on the "Thinking it through…" glyph.
- `caretBlink(tl, el, t0, t1, period=1)`.

The composer's pill ↔ card morph is not a class swap (class swaps are not seek-safe): the demo lays the composer out as the card, then tweens its height 64 ↔ 128 and the x/y transforms of the input, the bar, the +, the chip + mic and the send button (`PILL` offsets). Copy `setPill` / `morphToCard` / `morphToPill` from `demo/index.html`. Sending from home = press the send button, `morphToPill`, translate the composer down to the dock, fade the greeting, toggle and `.gm-home-bg`, and lift the prompt into a `.gm-turn-user` bubble (v0).

## Model names
From `research/landscape-2026-10.md` and the Oct 13–14 official frames: the picker lists **3.8 Flash** (All-around help) and **4 Argon** (Complex tasks); the chip shows the short name ("Flash", "Argon"). Plans: AI Plus, AI Pro, AI Ultra (profile line reads "Ultra").

## Demo
```
bash tools/v2/capture.sh library/_skins/gemini/demo <round> <hero-time>   # hero 3.7 since round 2
```
Edit only the files in `library/_skins/gemini/`; `demo/assets/skins/` is a synced copy.

Keywords: Gemini, Google, gemini.google.com, Gemini app, Gemini 4 Argon, 3.8 Flash, composer, model picker, Chat | Task, Task mode, Spark, Canvas, Gemini Live, Daily brief, Notebooks, sparkle, light, dark.

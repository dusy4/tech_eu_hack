# Claude skin

A faithful HTML/CSS recreation of the current Claude app (claude.ai web and the macOS desktop app, the merged "one Claude" UI from Sept 2026), in light and dark. Use it whenever a component shows Claude, so every component shows the same Claude.

Truth: `research/ui-references/claude/` and its `UI-NOTES.md`. What maps to which frame, and what was extrapolated, is in `DECISIONS.md`.

## Files
| File | What it is |
|---|---|
| `skin.css` | All styles, scoped under `.sk-claude`. Light by default; dark via `data-theme="dark"` on the root (or any ancestor). Every colour is a `--ck-*` custom property. |
| `icons.js` | `window.SKIN_ICONS_CLAUDE` (inline SVG strings, 20px grid, `currentColor`) and `window.SKIN_CLAUDE` (deterministic GSAP helpers). |
| `snippets.html` | Canonical markup for every piece. Open it in a browser to see all of them in light and dark. |
| `demo/` | HyperFrames demo at `zoom: 2`: variant 0 windowless home (type, Output → `Docs ×`, send), 1 working state + streamed serif reply, 2 model picker opened by the hand pointer, Sonnet 5.5 picked. |

## Use it in a component
```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/claude/skin.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="assets/skins/claude/icons.js"></script>

<div style="zoom: 2">                          <!-- present at 2x, like Anthropic's zoomed launch renders -->
  <div class="sk-claude" data-theme="light">  <!-- or "dark" -->
    <div class="cl-window" style="width: 640px; height: 440px"> … copy from snippets.html … </div>
  </div>
</div>
<script>
  SKIN_CLAUDE.mountIcons(document);           // fills every [data-icon]
</script>
```
- All sizes are the real app's CSS px. Scale with `zoom` on a wrapper, never by editing sizes.
  - **Default presentation: `zoom: 2`.** UI text lands at 29–32px and serif prose at 33px on a 1080p frame, matching the official zoomed renders (30–40px).
  - **Home / new chat: windowless.** Put `.cl-main.is-home` straight on the frame (the official home renders have no window chrome). The 560px composer becomes 1120px.
  - **Conversations:** the compact window (sidebar collapsed, 640×440) becomes 1280×880, about 67% of the frame width.
  - The full window with sidebar (1100–1300 wide) needs `zoom` ≈ 1.2–1.3, which leaves text near 20px. Use it only when the sidebar is the point.
- Fonts are stand-ins: Inter for Anthropic Sans, Source Serif 4 for Anthropic Serif, JetBrains Mono for Anthropic Mono. Don't `@import` fonts.
  - The skin tunes them to the official ink coverage. Don't override these per component:
    - UI: Inter 430, `#000`, `font-variation-settings: "opsz" 32`;
    - greeting: Source Serif 480 at `"opsz" 30`;
    - prose: 470 at `"opsz" 24`.
  - Source Serif's automatic display cut is much too thin for Claude's serif.
- Pointer: `.cl-pointer` + `data-icon="pointer"` (arrow, over menus) or `.cl-pointer.is-hand` + `data-icon="hand"` (over the model control). `pointerAt`/`pointerTo` take the **tip** position.
- Set starting states with `gsap.set` before you build the timeline, not with `tl.set(…, 0)`. A seek that starts at 0 never renders a timeline set at 0.
- Spark: `<span class="cl-spark" data-icon="spark"></span>` is the official Claude mark in clay `#d97757`. Use `data-icon="sparkAnimated"` when it should pulse.

## Pieces and class names
| Piece | Markup root | States / modifiers |
|---|---|---|
| App window (macOS) | `.cl-window` > (`.cl-sidebar`) + `.cl-main` | set `width/height` inline |
| Traffic lights | `.cl-traffic` (3 `<span>`) | — |
| Sidebar | `.cl-sidebar` > `.cl-sb-top`, `.cl-sb-nav`, `.cl-sb-section`, `.cl-sb-spacer`, `.cl-sb-foot` | `.cl-sb-item.is-selected`, `.is-hover`, `.is-muted`; Recents rows `.cl-sb-recent`; optional `.cl-modeswitch` (Chat \| Code) |
| Topbar | `.cl-topbar` | `.is-collapsed` (traffic lights, sidebar toggle, ← → live here); `.cl-title`, `.cl-tag`, `.cl-topbar-end` |
| Home | `.cl-main.is-home` > `.cl-home` > `.cl-home-inner` > `.cl-greeting` | set `padding-top` on `.cl-home` to place the block |
| Composer (home) | `.cl-composer.is-home` > `.cl-attachments?`, `.cl-input`, `.cl-composer-bar` | idle: placeholder + mic, waveform, ⌄; typing: text + clay `.cl-send`, plus `.is-focus` (darker hairline); `.is-hover` (pointer over the box) |
| Composer (conversation) | `.cl-composer.is-reply` | idle and while Claude works: `.cl-return` (⏎). No official frame shows a stop button. Typing: `.cl-send` |
| Control row (under the box) | `.cl-controls` (`.is-home` on the home screen) | `.cl-ctl` (`.is-open` pill, `.is-iconic`, `.is-chev`), `.cl-chip-output` (`Slides ×`; `.is-docs` / `.is-design` take their tile colour), `.cl-model` > `.cl-model-name` (`.is-open`) + `.cl-effort`, `.cl-auto`, optional `.cl-ring` (`data-icon="ring"`, context gauge) |
| Model picker | `.cl-menu.cl-picker` | `.cl-menu-head` "Models", `.cl-menu-item` (`.is-hover`, `.is-more`), `.cl-kbd` digit, `.cl-check` with `data-icon="checkBold"` on the current model, `.cl-menu-sep`, "More models ›", optional sliding `.cl-menu-hl`. Anchor it with `bottom: calc(100% + 9px); right: -5px` on the model label. |
| Output menu | `.cl-menu.cl-output-menu` | `.cl-tile.is-docs/.is-slides/.is-design`, `.cl-beta`, `.cl-menu-item.is-artifact` + `.cl-hint`. Opens with `left: -8px; top: calc(100% + 11px)` under the Output pill. |
| + menu | `.cl-menu.cl-plus-menu` | `.cl-menu-item.is-on` = blue "Search the web ✓" |
| Connectors submenu | `.cl-menu.cl-connectors` | `.cl-search-field`, `.cl-logo`, `.cl-toggle` (`.is-off`) with `toggleOn/toggleOff` icons |
| User message | `.cl-msg-user` > `.cl-bubble` | — |
| Assistant message | `.cl-msg-ai` > `.cl-prose` (serif) | `.cl-prose.is-sans` for agentic sessions; `code`, `a` styled |
| Action row | `.cl-actions` > `.cl-iconbtn` × (copy, speaker, thumbsUp, thumbsDown, retry, [wrench]) | — |
| Spark under latest reply | `.cl-spark.cl-tail-spark` | pulse it while streaming |
| Working indicator | `.cl-working` > spark + `.cl-working-title` + `.cl-working-sub` > `.cl-shimmer` | animate with `sparkPulse` + `shimmer` |
| Step summary | `.cl-steps` | `.is-ink` (darker, 16px, agentic session style) |
| Artifact card | `.cl-artifact-card` > `.cl-artifact-tile` + `.cl-artifact-meta` + `.cl-btn` | tile `.is-slides/.is-docs/.is-design` (default = dashboard) |
| Artifact panel | `.cl-split` > `.cl-chatcol` + `.cl-panel` > `.cl-panel-head`, `.cl-panel-band?`, `.cl-panel-body` | `.cl-comment-toggle`, `.cl-btn.is-dark` (Share) |
| Claude Docs | `.cl-doc-toolbar`, `.cl-doc` > `.cl-doc-title`, `.cl-doc-chips`, `.cl-doc-body` | `.cl-claude-cursor` (terracotta "Claude" tag) |
| Pointer | `.cl-pointer` + `data-icon="pointer"`; `.cl-pointer.is-hand` + `data-icon="hand"` | white fill, black outline (as in Anthropic's renders). Arrow over menus, hand over the model control. Move it with `pointerAt` / `pointerTo` (tip coordinates). |
| Usage meters | `.cl-usage` > `.cl-usage-row` > `.cl-usage-bar` (`--pct`) | extrapolated |

## Motion helpers (`window.SKIN_CLAUDE`)
All are seek-safe: they only add tweens/sets with absolute values to the timeline you pass.
- `mountIcons(root)`: fill `[data-icon]` elements. Call once before building the timeline.
- `sparkPulse(tl, el, at, duration, cycle=0.9)`: the official working pulse (asterisk → smaller → solid dot → bursts out larger → settles). `el` holds `sparkAnimated`. Returns the end time.
- `shimmer(tl, el, at, duration, period=1.6)`: the moving grey highlight on `.cl-shimmer`.
- `typeText(tl, el, text, at, cps=22)`: typing into `textContent`; returns the end time. Safe to seek backwards.
- `streamWords(tl, container, at, wps=14, fade=0.35, {grow})`: splits text into words once and streams them with Claude's soft leading-edge fade. With `{grow: true}` the reply takes space only as words arrive, so the spark under it moves down like the real app. Returns the end time.
- `caretBlink(tl, el, t0, t1, period=1)`: blink a `.cl-caret`.
- `pointerTip(ptr)`: the tip offset inside the pointer box (arrow tip or fingertip), in CSS px.
- `pointerAt(tl, ptr, x, y, at)`: place the pointer so its **tip** is at (x, y). With `at` ≤ 0 it applies immediately (`gsap.set`).
- `pointerTo(tl, ptr, x, y, at, dur, press)`: move the tip to (x, y) with `power2.inOut`, optionally press (scale 0.92 about the tip) and release. Returns the end time.
- `press(tl, el, at)`: a button press (scale 0.94 and back), e.g. the send button.
- `ringFill(tl, ringEl, from, to, at, dur)`: grow the context ring's blue arc (0–100%) from 12 o'clock.

## Model names
Use current names from `research/landscape-2026-10.md`: Opus 5.5 (default), Fable 5.1, Sonnet 5.5. Effort labels: Low / Medium / High.
- **Picker list:** use the newest official one (Oct 5): Opus 5.5 · Fable 5.1 · Sonnet 5.5 · **Haiku 4.5**, with digits 1–4.
- Haiku 5.5 shipped Oct 7, but no official picker shows it yet.

## Demo
```
bash tools/v2/capture.sh library/_skins/claude/demo <round> <hero-time>    # hero time 3.8 (5.0 s composition)
```
Edit only the files in `library/_skins/claude/`; `demo/assets/skins/` is a synced copy.

Keywords: Claude, claude.ai, Anthropic, desktop app, chat, composer, model picker, Opus 5.5, Sonnet 5.5, artifact, Docs, Slides, Dashboard, connectors, spark, light, dark.

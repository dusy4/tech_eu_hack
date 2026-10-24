# Codex skin

A faithful HTML/CSS recreation of OpenAI Codex as it looks in October 2026: the **Codex section of the ChatGPT desktop app** (macOS, light and dark) and the **Codex CLI**. Use it whenever a component shows Codex, so every component shows the same Codex.

Truth: `research/ui-references/openai-codex/` and its `UI-NOTES.md`. What maps to which frame, and what was extrapolated, is in `DECISIONS.md`.

## Files
| File | What it is |
|---|---|
| `skin.css` | All styles, scoped under `.sk-codex`. Light by default; dark via `data-theme="dark"` on the root (or any ancestor). Every colour is a `--cx-*` custom property. |
| `icons.js` | `window.SKIN_ICONS_CODEX`: inline SVG strings (24px grid, `currentColor`, 1.6–1.75 strokes) plus a non-enumerable `mount(root)` that fills every `[data-cx-icon="name"]`. Also `window.SKIN_CODEX_DIM_SELECTOR` (see Contrast below). |
| `snippets.html` | Canonical markup for every piece. Open it in a browser to see all of them in light and dark side by side. |
| `demo/` | HyperFrames demo: variant 0 home + typing + **Work in** menu, 1 thread finishing a run + Changes panel, 2 CLI finishing the same task. |

## Use it in a component
```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/codex/skin.css">
<script src="assets/skins/codex/icons.js"></script>

<div class="scaler" style="transform: scale(1.55); transform-origin: 0 0">   <!-- present at ~1.45–1.6x -->
  <div class="sk-codex cx-window" data-theme="light" style="width: 900px; height: 640px">
    … copy a piece from snippets.html …
  </div>
</div>
<script>
  SKIN_ICONS_CODEX.mount(document);            // after the DOM is built
</script>
```
- Every size is a macOS logical point (1x). Scale the whole window from a wrapper; never edit sizes.
  - **Compact window, home or single thread** (≈900×640): scale **1.55** → body text ≈ 23px, window ≈ 73% of a 1080p frame.
  - **Full workspace** (rail + sidebar + thread + right panel, ≈1240×700, sidebar 214, right panel 440): scale **1.46** → body ≈ 20px, window ≈ 94%, like OpenAI's own Code Review launch frames. Use it only when the three panes are the point; otherwise show a single thread at 1.55.
  - **CLI** (≈1060×672, `--cx-t-size: 14px` → 120×30 cells): scale **1.5** → ≈ 21px monospace. Fewer rows fit at bigger type, so keep the transcript short (truncate command output to its tail, as the TUI does).
- Fonts are stand-ins: Inter for the macOS system font (SF Pro), JetBrains Mono for SF Mono / the terminal font. Don't `@import` fonts.
- Measure positions (pointer targets, menu anchors) after `document.fonts.ready`, then build the timeline.

## Pieces and class names
| Piece | Markup root | States / modifiers |
|---|---|---|
| App window | `.cx-window` > `.cx-titlebar` + `.cx-body` (`.cx-rail` + `.cx-panel`) | set width/height inline; the panel is an inset rounded card |
| Title bar | `.cx-tb-lead` (`.cx-traffic`, `.cx-tb-btn`), `.cx-tb-sep`, `.cx-tb-main`, `.cx-tb-side`, `.cx-tb-right` | `.cx-tb-btn.is-off` (dimmed →), `.is-on` (split toggle); tabs `.cx-tab` (`.is-active` white pill, `.is-grow`, `.is-dim`); set `--cx-lead-w` = rail + sidebar width, `--cx-rp-w` = right panel width + 5 |
| Icon rail | `.cx-rail` > `.cx-rail-btn` (+ `.cx-rail-div`, `.cx-rail-foot` > `.cx-avatar-app`) | `.is-active` (grey tile); `.cx-rail-dot` = blue "new" dot on Home. Order: home, cards, clock, plugins, more │ pr, openai, calendar |
| Sidebar | `.cx-sidebar` (`--cx-sb-w`) > `.cx-sb-head` (`.cx-sb-title` "Codex ⌄", `.cx-ib`, `.cx-ib.cx-bell`), `.cx-sb-item` "New chat", `.cx-sb-div`, `.cx-sb-label` "Priority" | task rows `.cx-task` (`.is-selected`) with `.cx-task-title`, `.cx-task-meta` (folder + project), `.cx-task-status` > `.cx-unread` (magenta) or `.cx-spin` (spinner). Code Review: `.cx-sb-search`, `.cx-pr-row` |
| Empty home | `.cx-main` > `.cx-home` (`.cx-home-logo` with `data-cx-icon="codex"`, `.cx-home-title`) + `.cx-dock` | `padding-bottom` on `.cx-home` moves the block up; `--cx-composer-max` on `.cx-dock` |
| Context tray | `.cx-tray` > `.cx-tray-chip` | `.is-dim` (grey "Choose project"), `.is-open` (chip whose menu is open). Cloud state: `box` "Choose environment" + `cloud` "Cloud" |
| Composer | `.cx-cwrap` > (`.cx-tray`) + `.cx-composer` > `.cx-input` + `.cx-cfoot` | input: text + `.cx-caret`, or `.cx-placeholder` ("Do anything", home and thread alike in Oct 2026; "Ask for follow-up changes" is the Apr 2026 / IDE copy); `.cx-mention` for a blue @plugin; `.is-compact` single-row variant |
| Composer footer | `.cx-cbtn` (+), `.cx-perm` (⚙ Custom), `.cx-grow`, `.cx-model` (`.cx-bolt` + name + `.cx-effort` + `.cx-chev`), `.cx-cbtn` (mic), `.cx-send` | `.cx-send[data-state]` = `empty` (pale blue ↑) · `ready` (blue ↑) · `working` (blue ■ stop). `.cx-model.is-open` when the picker is open |
| Work in menu | `.cx-menu` > `.cx-menu-label` + `.cx-menu-item` (`.cx-i`, label, `.cx-check`) | `.is-checked`, `.is-hover`; anchor `bottom` above the tray, `left` on the chip; `transform-origin` is bottom-left |
| Model picker (extrapolated) | `.cx-menu` with `.cx-menu-item.is-tall` > `.cx-col` + `.cx-sub`, `.cx-menu-sep`, `.cx-toggle` | `.cx-toggle.is-on` |
| User message | `.cx-user` > `.cx-bubble` | light-blue bubble, right-aligned; `.cx-chip-comment` ("1 comment") above it |
| Work status | `.cx-worked` | live: inner `span.cx-shimmer` "Working for 1m 17s" + `.cx-status-sub`; done: "Worked for 1m 19s" + chevron-right icon |
| Assistant reply | `.cx-ai` (`p`, `ol`, `code`, `a`, `.cx-fileref`) | no bubble, no avatar |
| Action row | `.cx-actions` > `.cx-ib` × (copy, thumb-up, thumb-down, fork) | — |
| Files-changed card | `.cx-files` > `.cx-files-head` (`.cx-files-tile`, title, `.cx-files-counts`, `.cx-files-undo`, `.cx-btn`) + `.cx-files-row` | `.cx-plus` / `.cx-minus` counts |
| Right panel / diff | `.cx-rpanel` (`--cx-rp-w`) > `.cx-rp-head` (`.cx-pill`, `.cx-pill-group`) + `.cx-diff-scroll` > `.cx-dfile` + `.cx-code` > `.cx-unmod` / `.cx-ln` | `.cx-ln` = `.n` (line number) + `.c` (code). `.cx-ln.add` / `.del`: 3pt left bar (solid green / dotted red), the number cell a paler wash with a **coloured number**, the code cell the full tint. File badges `.cx-badge.ts/.js/.img`. Tokens: `.tk-k` keywords, `.tk-f` **function calls (purple)**, `.tk-p` identifiers, `.tk-s` strings, `.tk-n` numbers/booleans, `.tk-c` comments. Code is 12pt at `--cx-code-weight` (380) |
| Code Review | `.cx-seg` (Summary │ Changes), `.cx-pr-open`, `.cx-pr-title`, `.cx-activity-row`, `.cx-btn.is-dark` ("Submit review ⌄" / "Merge ⌄") | — |
| Approval (desktop, extrapolated) | `.cx-approval` > `.cx-approval-q`, `.cx-approval-cmd`, `.cx-approval-opt` | `.is-hover` |
| CLI window | `.cx-term` > `.cx-term-bar` + `.cx-term-body` (`--cx-t-size`) | lines `.cx-tl` (`.is-indent`, `.is-item` hanging bullet), `.cx-t-gap`, `.cx-t-fill` |
| CLI pieces | header `>_ OpenAI Codex (v…)`, blue tagline `.cx-t-blue`, user prompt band `.cx-t-band`, cells `• Explored / Edited / Ran` with `└` trees, diff rows `<div class="cx-tl cx-t-add">` / `cx-t-del` (class on the **row**, so the tint runs the full width), `.cx-t-rule` "─ Worked for …", status `.cx-t-shimmer` "Working (12s • esc to interrupt)", composer `.cx-t-composer` + `.cx-t-cursor` + `.cx-t-ph` placeholder, footer `.cx-t-yellow` model line + dim hints "← for agents · **?** for shortcuts" | voice mode: `.cx-t-dot` + "listening"; command center: `.cx-t-tab-on`, `.cx-t-sel` (periwinkle row); approval `.cx-t-approval` |

## Motion (how the real app behaves)
- **Typing**: one keystroke per `tl.set(span, { text: { value: prompt.slice(0, i + 1) } }, t)` into the span before `.cx-caret`, never a linear tween. Aim for ~25 characters a second with uneven gaps and a longer hold before each word (see v0 in `demo/index.html`). Hide `.cx-placeholder` and flip `.cx-send` to `ready` on the first character. Hide the caret when focus leaves (a chip click).
- **Pointer**: `SKIN_ICONS_CODEX.pointer` (22×30, hotspot 3,2.4) in an absolutely positioned box; move with GSAP `x/y` (`power2.inOut`, 0.5–0.6 s); press = pointer `scale .9` + target `scale .96` for 80 ms, release 120 ms.
- **Menu**: `fromTo({opacity:0, scale:.96, y:6}, {opacity:1, scale:1, y:0, duration:.24, ease:"expo.out"})`; close with a 140 ms fade.
- **Working → done**: shimmer the `.cx-shimmer` text by tweening `backgroundPosition` 100% → 0%; tick the seconds; swap to "Worked for …" + chevron, fade `.cx-status-sub`, then stream the reply in 1–3 word chunks, then the files card (`y 6 → 0`, 350 ms). Send goes `working` → `empty`; the sidebar spinner stops.
- **Autoscroll**: the demo's v1 grows the live block line by line and slides the thread column up once it overflows (see `demo/index.html`).
- **CLI**: everything is a hard cut, never a fade. Cells print whole. The status timer ticks in real seconds and reaches the "Worked for" figure; then, in the **same frame**, the `• Working` row disappears and the `─ Worked for …` rule prints. The final message commits **whole wrapped lines** about 0.18 s apart (group the word spans by `offsetTop` and `tl.set` each row's `opacity` to 1). The block cursor blinks at 0.53 s.

## Contrast
Real Codex greys (placeholder, effort label, metadata, "Worked for…") are below WCAG AA in the product too. Mark them as set dressing so HyperFrames' contrast audit skips them:
```js
document.querySelectorAll(SKIN_CODEX_DIM_SELECTOR).forEach((el) => el.setAttribute("data-layout-ignore", ""));
```

## Names to use
Models: **GPT-6 Astra**, **GPT-6.1 Sol** (chip: name in ink + effort in grey: Low / Medium / High / Extra High). CLI status line: `gpt-6-Astra low ultrafast`. Permission chip: "Custom". Work in: This computer / Cloud / Remote. Activity accent is magenta `#ff00be`.

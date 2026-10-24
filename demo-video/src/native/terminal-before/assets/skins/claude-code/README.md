# Claude Code skin

A faithful HTML/CSS recreation of Claude Code as it looks in October 2026: the terminal CLI (any macOS terminal, fullscreen renderer) and the Code side of the Claude desktop app (sessions, new-session home, Projects beta, diff pane; claude.ai/code uses the same UI). Light and dark. Use it whenever a component shows Claude Code, so every component shows the same Claude Code.

Truth: `research/ui-references/claude-code/` and its `UI-NOTES.md`. What maps to which frame, and what was extrapolated, is in `DECISIONS.md`.

## Files
| File | What it is |
|---|---|
| `skin.css` | All styles, scoped under `.sk-cc`. Light by default; dark via `data-theme="dark"` on `.sk-cc` or any ancestor. Every colour is a custom property: `--cct-*` for the terminal, `--ccd-*` for the desktop app, `--cc-clay*` for the brand. |
| `icons.js` | `window.SKIN_ICONS_CLAUDE_CODE` (inline SVG strings) and `window.SKIN_CLAUDE_CODE` (helpers, below). |
| `snippets.html` | Canonical markup for every piece, rendered side by side in light and dark. Open it in a browser and copy from the `<template>`s. |
| `demo/` | HyperFrames demo. Variant 0 = CLI session, 1 = desktop session, 2 = Projects threads. |

## Use it in a component
```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/claude-code/skin.css">
<script src="assets/skins/claude-code/icons.js"></script>

<div class="sk-cc" data-theme="light">            <!-- or "dark" -->
  <div class="cc-term" style="width:1440px; --cct-fs:24px; --cct-lh:1.6"> … </div>   <!-- CLI -->
  <div class="cc-win" style="width:1200px; height:700px; zoom:1.34"> … </div>         <!-- desktop -->
</div>
<script>SKIN_CLAUDE_CODE.mount(document);</script>  <!-- fills <i data-cc-icon> and <i data-cc-g> -->
```
- **Terminal size** comes from two variables on `.cc-term`: `--cct-fs` (font size; 24px reads well at 1080p) and `--cct-lh` (1.6 matches the official videos). Everything is laid out in cells (`ch`) and rows (`lh × 1em`), so it stays aligned at any size.
- **Desktop sizes** are the real app's CSS px (body 15.5px, sidebar ≈ 296px). Scale a whole window with `zoom` on `.cc-win` (the demo uses 1.3–1.34), never by editing sizes.
- **Fonts:** JetBrains Mono for the terminal and code; Inter for the desktop UI (stand-in for Anthropic Sans). Don't `@import` fonts. `.cc-win` tracks Inter in (`--ccd-track: -0.017em`) and sets it a step heavier (`--ccd-w: 450`), with `--ccd-w-med: 520` for titles and `--ccd-w-semi: 630` for headings, because Anthropic Sans is narrower and darker. Use these tokens rather than raw weights, so new pieces match.
- **Glyphs:** the shipped font subsets have no `❯ ● ⎿ ✻ ⏵⏵ ⏸ ✔ ← → ▲`, so every terminal symbol is an SVG sized to one mono cell. Put a glyph that starts a row inside `<span class="cc-gut">` so it sits on the text baseline. With the helper: `SKIN_CLAUDE_CODE.gut('dot')`.

## Helpers (`window.SKIN_CLAUDE_CODE`)
| Call | Returns |
|---|---|
| `icon(name)` | desktop icon SVG (20-unit grid, `currentColor` stroke) |
| `g(name)` | `<i class="cc-g">` terminal glyph, one cell wide (`ff` is two cells) |
| `gut(name)` | the same glyph inside a `.cc-gut` gutter cell |
| `ring(pct)` | usage ring for the composer under-row (0..1) |
| `glyphs[name]` | raw glyph SVG (for stacking spinner frames) |
| `mount(root)` | fills every `<i data-cc-icon="…">` and `<i data-cc-g="…">` under `root` |

Glyph names: `chev` ❯, `dot` ●, `elbow` ⎿, `ff` ⏵⏵, `pause` ⏸, `larr` ←, `rarr` →, `check` ✔, `tick` ✓, `cross` ✗, `ring` ○, `half` ◐, `tri` ▲, `square` / `squarex` (task list), `spark` ✻, spinner frames `sp0`–`sp5` (`· ✢ ✳ ✶ ✻ ✽`), `dspark` (the desktop's thin six-spoke ✻).

Desktop icon names: `sidebar search arrow-left arrow-right arrow-up chat code terminal diff globe more-v share split expand close plus projects artifacts customize chev-down chev-up chev-right sliders bug st-idle st-active st-pr st-merged cloud laptop folder folder-plus branch bolt gear overview library clock list file copy check checkbox-on checkbox-off mic stop-circle stop-target stop-square return claude-spark clawd work-spark` (`work-spark` = `dspark` cropped square, for `.cc-work`).

## Pieces and class names
### Terminal (`.cc-term`)
| Piece | Markup | States |
|---|---|---|
| Window | `.cc-term` > `.cc-term-bar` (`.cc-lights`, `.cc-term-title` = `✳ <task>`) + `.cc-cli` | omit the bar for a frameless crop |
| Transcript | `.cc-cli` > `.cc-tx` (rows) + `.cc-tx-fill` last | top-anchored; once it overflows, the oldest rows scroll off the top. Give `.cc-tx` a height of N rows to clip on row boundaries. |
| Header line | `.cc-l.cc-hdr` | `✻ Claude Code · ~/path` |
| Blank row before a block | add `.cc-b` | |
| User turn | `.cc-u` > `.cc-gut`(chev) + text | full-width grey band, dim `❯` |
| Assistant prose | `.cc-a` > `.cc-gut`(dot) + text | identifiers: `.cc-id` (suggestion blue) |
| Collapsed work | `.cc-sum` | "Thought for 4s, searched for 1 pattern, read 2 files" |
| Tool call | `.cc-t` > `.cc-gut`(dot) + `<span class="cc-tn">Bash</span>(args)` | default green = done; `.is-run` grey (blink it); `.is-err` red |
| Result | `.cc-r` > `.cc-gut`(elbow) + `.cc-rb` | `.is-cont` = continuation row without the elbow |
| Diff | `.cc-r.is-cont` > `.cc-rb.cc-diff` > `.cc-dl` (`.is-add` / `.is-rem`) > `.cc-ln`, sign, code | words: `.cc-w-add` / `.cc-w-rem` |
| Spinner | `.cc-spin` > `.cc-gut`(sp0–sp5) + `.cc-verb` "Cogitating…" + `.cc-dim` "(12s · ↓ 1.2k tokens)", then a `.cc-r` tip | shimmer: tween `--cc-shim` 100% → 0% on `.cc-verb` |
| Post-turn | `.cc-done` | "✻ Worked for 38s" |
| Input | `.cc-input` > `.cc-rule`, `.cc-pline` (gutter chev + text + `.cc-cursor`), `.cc-rule` | placeholder `.cc-ph`; bash mode: `.cc-bash-mode` on `.cc-input` |
| Footer | `.cc-foot` | `.cc-mode-auto` / `-accept` / `-plan` / `-manual` (only the label is coloured), `.cc-hint` "(shift+tab to cycle)", `.cc-pr.is-approved/-pending/-changes` |
| Status line | `.cc-status`, `.cc-meter` (`--v`) | docs example |
| Permission prompt | `.cc-perm` > `.cc-perm-title`, `.cc-dash`, `.cc-opt` (`.is-sel`) | |
| `/model` picker | `.cc-pick` > `.cc-pick-title`, `.cc-mrow` (`.is-sel`, `.is-cur`), `.cc-effort` | |
| `/effort` picker | `.cc-pick` > `.cc-pick-title.is-plain`, `.cc-slider` (`--at`) | stop `.is-sel` |
| Agent view | `.cc-agent-row` (`.is-sel`), `.cc-st-needs/-work/-done` | |
| Task list | `.cc-todo` (`.is-done` strikethrough, `.is-doing` bold) | |

### Desktop app (`.cc-win`)
| Piece | Markup | States |
|---|---|---|
| Window | `.cc-win` (`--ccd-side-w`) > `.cc-side` + `.cc-main` [+ `.cc-panel`] | `.no-side` (sidebar collapsed), `.has-panel` (`--ccd-panel-w`) |
| Sidebar | `.cc-side` > `.cc-side-top` (lights, icons, `.cc-toggle` Chat/Code), `.cc-nav`, `.cc-side-label`, `.cc-grp` > `.cc-grp-h` + `.cc-srow`, `.cc-side-foot` | rows use the softer `--ccd-ink2`; `.cc-srow.is-sel` = grey fill, body ink, medium; status icons `st-idle/-active/-pr/-merged`, project `st-proj` |
| Header | `.cc-head` > env icon, `.cc-title`, `.cc-chip`, `.cc-head-r` | `.has-lights` when the sidebar is collapsed; Projects: `.cc-proj-ic`, `.cc-btn-soft` Overview |
| Chat | `.cc-chat` > `.cc-col` | `.is-bottom` = anchored to the composer; the content fades out under the header through a 42px mask (no overlay) |
| User message | `.cc-umsg` | right-aligned, rounded 10 |
| Assistant text | `.cc-amsg` > `p` / `ol` | inline code `.cc-code`; `.is-compact` = line-height 1.4 (Projects coordinator chat) |
| Gaps | `.cc-m-gap` (`.is-s` 12, default 22, `.is-l` 30, `.is-xl` 56) | `.is-xl` around user bubbles in the Projects coordinator chat |
| Status rows | `.cc-stat` (`.cc-dots`, `.cc-shim`, `.cc-timer`) | `.is-muted` for "Searching x ›" |
| Tool group | `.cc-tsum` (summary + counts + ⌄) + `.cc-card` > `.cc-trow` | |
| Edited card | `.cc-card` > `.cc-edit-h` (Undo, View changes) + `.cc-frow` | |
| Counts | `.cc-counts` > `.cc-add` / `.cc-rem` | |
| Working spark | `.cc-work` > `SKIN_CLAUDE_CODE.icon('work-spark')` (or `<i data-cc-icon="work-spark">`) | six thin clay spokes; animate with a slow turn and an opacity breathe, never by swapping in the CLI's petal frames |
| Composer | `.cc-dock` > `.cc-col` > `.cc-composer` (`.cc-field`, `.cc-caret`, `.cc-send`) + `.cc-under` | idle `return` icon (`.is-return`); typing = text + caret; working, **local** session: `stop-square` (`.is-stop-sq`, a dim outline); working, **cloud** session or Projects: `stop-target` (`.is-stop`); `.is-tall` on the home |
| Home | `.cc-greet`, `.cc-usage` (`.cc-seg`, `.cc-tiles` > `.cc-tile`, `.cc-heat` > `i.h1–h4`, `.cc-moby`), `.cc-envs` > `.cc-env-chip`, `.cc-clawd` | |
| Popovers | `.cc-pop` > `.cc-pop-row` (`.is-hi`), `.cc-pop-sep`, `.cc-pop-pad`, `.cc-eff-track` (`--at`), `.cc-bar` (`--v`), `.cc-pop-kv` | |
| Projects | `.cc-tcard` (`.cc-tdot` `.is-done/.is-wait`, `.cc-tt`, `.cc-ts`), `.cc-prchip`, `.cc-btn` (`.is-black`), `.cc-panel` > `.cc-panel-tabs`, `.cc-welcome`, `.cc-secs` > `.cc-secbar`, `.cc-secdesc`, `.cc-thr`, `.cc-showmore`, `.cc-prbar` | |
| Diff pane | `.cc-diffpane` > `.cc-dp-h`, `.cc-dp-body` > `.cc-tree` (`.cc-tree-row.is-sel`) + `.cc-code-view` > `.cc-cv-file`, `.cc-cl` (`.is-add/.is-rem`), `.cc-k`, `.cc-s` | |
| Pills | `.cc-pill` | "Diff +9 -2", "Create PR" |

## Motion notes (what the real product does)
- **CLI:** the prompt is typed after `❯` with the block cursor following. Enter moves it into the transcript as the grey band. The spinner glyph ping-pongs through `· ✢ ✳ ✶ ✻ ✽` (about 120 ms a frame) while the verb shimmers. A running tool's `●` blinks grey, then turns green when its `⎿` result lands. The footer shows `esc to interrupt` while a turn runs.
- **Desktop:** the sent message lands as a bubble; the send icon becomes the stop icon; the thin orange spark turns slowly and breathes under the last message; each tool row grows the card from 0 to 41px (animate `height`, the row clips), while the summary line re-words itself; the "Edited N files" card lands when the turn ends.
- **Projects:** the coordinator's thread cards fan out one at a time, newest on top in the Threads panel; every working status shimmers continuously, each card out of step with the others; the clay dots pulse as a wave and rest at full opacity; "Claude is working 2m 1s" ticks.

## Render the demo
```bash
cd library/_skins/claude-code/demo
npx hyperframes render . --variables '{"variant":"1","theme":"dark"}'
```

# Cursor skin

A faithful HTML/CSS recreation of **Cursor 3.x (Aug to Oct 2026)**: the Agents Window (macOS screen frame, sidebar, New Chat empty state, thread, composer, model picker, Context Usage popover, right rail, Changes split panel), plus the cloud-agent Git header, Settings cards, the `agent` CLI and an extrapolated classic-editor inline diff. Light and dark.

Reference frames: `research/ui-references/cursor/` (read `UI-NOTES.md` first). What is faithful and what was extrapolated: `DECISIONS.md`.

## Use it in a component

```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/cursor/skin.css">
<script src="assets/skins/cursor/icons.js"></script>
```

1. Put everything inside one root with class `sk-cursor`. That root carries the colour tokens.
2. Theme: light by default. Add `data-theme="dark"` to the root (or any ancestor).
3. Copy the block you need from `snippets.html` (open it in a browser; append `#dark` for dark).
4. Icons: `window.SKIN_ICONS_CURSOR[name]` is an SVG string. Wrap it in `<span class="cu-i">…</span>` (15px, `currentColor`), or write `<span class="cu-i" data-cu-icon="name"></span>` and call `SKIN_CURSOR.hydrate(root)`. Sizes: `.cu-i.sm` 13, `.cu-i.xs` 11, `.cu-i.lg` 17.
5. Real logos (the Cursor cube etc.) are in `assets/logos/`; `icons.cursorLogo` is the same mark inline.

### Presenting it on video
The official frames are screen recordings, so present the skin as one. Author a **1280×720pt screen**, `<div class="sk-cursor cu-screen">`, holding a `.cu-menubar` (macOS menu bar, 24pt) and a `.cu-window` that fills the rest. Scale the whole thing with `transform: scale(1.5)` to fill 1920×1080. Body text (14px) lands at 21px and sidebar text at about 19.5px, the same density as the official frames. Don't float a small zoomed window on a stage; it reads as staged.

`.cu-window.is-floating` (macOS radius + shadow) is still there for components that need a window inside a diagram. Sidebar width is `--cu-side-w` (220), thread column `--cu-col-w` (640), empty-state stack `--cu-stack-w` (578), right rail `--cu-rail-w`, side panel `--cu-panel-w` (default 55%).

Fonts: the skin uses `system-ui` (SF Pro on the macOS renderer, Inter elsewhere) and Menlo for code. Don't override `--cu-font` with Inter.

## Class map

| Piece | Classes |
|---|---|
| Screen | `.cu-screen` › `.cu-menubar` (`.cu-mb-apple`, `b` app name, menu `span`s, `.cu-mb-status` › `.cu-i`, `.cu-mb-clock`) + `.cu-window` |
| Window | `.cu-window` (+ `.is-floating`), `.cu-traffic`, `.cu-iconbtn` (`.is-on`, `.is-muted`) |
| Sidebar | `.cu-sidebar` › `.cu-side-top`, `.cu-nav` › `.cu-nav-row` (`.is-active`), `.cu-side-scroll` › `.cu-group` › `.cu-group-head` (`.cu-label`, filter `.cu-iconbtn.is-on` = purple), `.cu-repo`, `.cu-agent` (`.is-active`, `.is-more`) › `.cu-agent-status`, `.cu-agent-title`, `.cu-agent-meta`, `.cu-agent-time` / `.cu-agent-diff`; `.cu-user` › `.cu-avatar`, `.cu-user-name`, `.cu-user-org` |
| Row status | `.cu-dot` (blue unread), `.cu-dot.is-attn` (amber), `.cu-ring` (idle new agent), `.cu-braille` (running; step through `icons.brailleFrames` every ~80 ms) |
| Title bar / tabs | `.cu-titlebar` › `.cu-title`, `.cu-title-meta`, `.cu-ide-link`; `.cu-tabs` › `.cu-tab` (`.is-active`, `.is-icon`, `.is-git` = "⑂ +N −N"), `.cu-tab-sep` |
| Empty state | `.cu-empty` › `.cu-empty-stack` › `.cu-ctx` (`.cu-pick`), composer, `.cu-suggest` › `.cu-chip` (`.cu-kbd`); `.cu-hint` |
| Composer | `.cu-composer` (`.is-tall` empty-state, `.is-glass` frosted over a **Canvas** tab only) › `.cu-plus`, `.cu-mode.is-plan` / `.cu-mode.is-ask`, `.cu-input` › `.cu-typed`, `.cu-caret` (`.is-before`), `.cu-ph`; `.cu-model` (`.is-pressed`, never filled) › `.cu-name`, `.cu-effort`; `.cu-send[data-state]`; `.cu-under` › `.cu-pick`, `.cu-loader`; `.cu-glass-pill` ("Worked for …", Canvas only) |
| Thread | `.cu-thread`, `.cu-prompt` (`.is-pinned`), `.cu-worked` (grey "Worked for 3m 41s ›"), `.cu-step` › `.cu-verb`, `.cu-file`, `.cu-chev`; `.cu-doc` (h3, p, ul, `code`), `.cu-codecard` › `.cu-codecard-head` (`.cu-lines`), `.cu-pre` › `.ln-row`; `.cu-table` (`td.mono`); `.cu-shimmer` (drive `--cu-shimmer` 0→100%, or `.is-live`); `.cu-actions` |
| Syntax | `.k` keyword, `.t` type, `.s` string, `.f` function, `.v` identifier, `.p` property, `.n` number, `.c` comment, `.g` tag |
| Menus | `.cu-menu` › `.cu-menu-search`, `.cu-menu-group` › `.cu-menu-item` (`.is-selected` shows `.cu-check`, `.is-hover`) › `.cu-name`, `.cu-effort`, `.cu-desc`, `.cu-status` (`.is-warn`); `.cu-menu-sep`, `.cu-menu-label` |
| Context Usage | `.cu-ctxpop` › `.cu-ctxpop-head`, `.cu-ctxpop-sum`, `.cu-ubar` (spans coloured with `--cu-u-*`), `.cu-urow` › `.cu-sw`, `.cu-ulabel`, `.cu-uval` |
| Right rail | `.cu-rail` › `.cu-rail-label`, `.cu-rail-row` |
| Split view | `.cu-split` › `.cu-chatcol` (title bar, `.cu-body` › `.cu-center` › thread + `.cu-dock`) + `.cu-panel.is-side` |
| Changes | `.cu-panel` (`.is-side` for the right-hand panel) › `.cu-tabs` (`.cu-tab.is-git`), `.cu-panel-bar` (`.cu-loc`, `.cu-splitbtn` › `.cu-sb-main`, `.cu-sb-more`; `.is-busy`, `.is-ghost`), `.cu-changes-sum` (summary row; after the PR, the PR row with `.cu-badge-open`, title, `.cu-pr-num`), `.cu-panel-scroll` › `.cu-panel-inner` › `.cu-filecard` › `.cu-filecard-head` (`.cu-ftype.ts/.sql`, `.cu-path` › `.cu-dir`, `.cu-new`, `.cu-checkbox`), `.cu-diff` › `.cu-dl` (`.is-add`, `.is-del`) › `.ln`, `.code`; `.cu-dl-fold`; `.cu-sticky-head` (overlay copy of the current file header) |
| Cloud agent | `.cu-subtabs`, `.cu-pr` › `.cu-pr-top` (`.cu-pr-title`, `.cu-pr-num`), `.cu-pr-meta` › `.cu-badge-open`; `.cu-count` |
| Settings | `.cu-settings` › `.cu-set-label`, `.cu-set-card` › `.cu-set-row` › `.cu-set-text` (`.cu-set-title`, `.cu-set-desc`), `.cu-toggle` (`.is-on`), `.cu-field`, `.cu-select`, `.cu-btn-outline`, `.cu-connected` |
| CLI | `.cu-cli` (dark in both themes) › `.hex`, `b`, `.dim`, `.mid`, `.acc`, `.cu-cli-box` › `.ttl`, `.cu-cli-input` |
| IDE (extrapolated) | `.cu-editor` › `.cu-ed-tabs` › `.cu-ed-tab`, `.cu-ed-crumbs`, `.cu-ed-code` (uses `.cu-dl`), `.cu-hunk-actions`, `.cu-review-bar` |
| Pointer | `.cu-pointer` wrapping `icons.pointer` (macOS arrow; hotspot at the tip, `transform-origin` set for press) |

## States worth animating
- **Send button**: `data-state="mic"` (empty) → `"send"` (first character typed) → `"stop"` (generating) → back to `"mic"`.
- **Typing**: reveal characters into `.cu-typed`, hide `.cu-ph` on the first one; the caret (`.cu-caret`) follows the text.
- **Model picker**: press the `.cu-model` label (`.is-pressed`, no fill), the `.cu-menu` opens upward from it (fade + 6px rise, 200 ms, `power3.out`); rows take `.is-hover` as the pointer crosses them. Click a row: move `.is-selected` to it, fade the menu out (120 ms) and swap the label's name + effort.
- **Pinned prompt + scroll**: let the reply come to rest on a prose line cut by the card's bottom edge, never on a card or table edge (see `demo/index.html`, v1).
- **Streaming**: reveal word spans in chunks of 2–4; code and table rows one per ~150 ms; keep `.cu-prompt.is-pinned` at the top and auto-scroll the content under it; `.cu-shimmer` reads "Generating…" until done. The sidebar row shows `.cu-braille` while running and the `.cu-under` row shows a spinning `.cu-loader`.
- **Create PR**: press scale 0.96 → `.cu-splitbtn.is-busy` with a spinning `.cu-loader` and "Creating PR…" (about 1 s) → `.cu-splitbtn.is-ghost` "View PR ↗". The summary row becomes the PR row (green Open chip, title, `#N ↗`). Put a PR glyph on the agent's sidebar row.
- **Diff scroll**: translate `.cu-panel-inner` (seek-safe) and show a `.cu-sticky-head` copy of the file header at the top once the real one reaches it. Rest the scroll on a line boundary under the header.
- **Changes open**: use the split view. Never float the composer or a "Worked for" pill over the diff.

## Demo
`demo/index.html` (variables `variant` 0/1/2 and `theme` light/dark):
A 1280×720pt screen (menu bar + window) at 1.5×.
- **0**: empty New Chat. A prompt is typed, the pointer opens the 9-row model picker, sweeps up to Opus 5.5 Medium and picks it; the label changes.
- **1**: Ask-mode reply streaming under the pinned prompt card (steps, heading, code card, table, rollout note), Composer 2.5, right rail open.
- **2**: finished agent in the chat column, with the Changes panel on the right. The diff scrolls under a sticky file header, then Create PR → "Creating PR…" → "View PR ↗" with the Open PR row.

Outside HyperFrames, `index.html?variant=2&theme=dark&t=4.4` previews a variant at a given time.

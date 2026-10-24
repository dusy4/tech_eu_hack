# Perplexity skin

A recreation of Perplexity as of Sep–Oct 2026. It covers the web app (Search and Computer modes) running inside the Comet browser, the answer page, and Comet's Assistant side panel with its agent timeline. It has a light theme and a dark theme. It's built from the official frames in `research/ui-references/perplexity/`.

**Scale 1 matches the official 1080p frames.** For example, the home heading is about 34px (33.5px, tracked tight to approach pplxSans), the sidebar is 214px wide, the composer is 832px wide and the thread column is 860px. Present it bigger for video with `transform: scale(...)` on a wrapper, and don't animate that same wrapper with GSAP. What the demo uses:
- **Page crops** (no window chrome, the framing of Perplexity's own launch videos): `.px-crop` at scale 1.38–1.42. Body text lands at about 27–28px and the composer or answer column spans about 60% of the frame.
- **The Comet window, cropped**: `.px-window` at 1278 × 662, scale 1.68, placed so its bottom-right corner sits at (1848, 1030) on the 1080p frame. The window's left part and the top of the tab strip run off the frame, so the toolbar, the page and the Assistant panel fill it, and the panel's step titles land at about 25px. Showing the whole window at a readable size isn't possible: it fills the frame edge to edge.

## Use it in a component
```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/perplexity/skin.css">
<script src="assets/skins/perplexity/icons.js"></script>
```
1. Copy the markup you need from `snippets.html`. Open that file in a browser to see every piece rendered.
2. Wrap everything in `.sk-pplx`. The `.px-window` and `.px-crop` elements can carry it themselves.
3. Set the theme with `data-theme="light"` or `data-theme="dark"` on `.sk-pplx` or on any ancestor, such as `<html>`.
4. Icons work two ways:
   - Write `<i data-ic="name"></i>` placeholders, then call `window.pplxHydrate(rootEl)` once the markup is in the DOM.
   - Or build the markup yourself from `window.SKIN_ICONS_PERPLEXITY.name`.

   Icons size with `font-size`, because `svg.pxi` is a 1em square.
5. Fonts are lookalikes: pplxSans maps to **Inter**, pplxSerif to **Source Serif 4** and pplxMono to **JetBrains Mono**. The skin itself loads no fonts.
6. Favicons and company logos: use the cited sites' real marks (`anthropic`, `openai`, `claude` in icons.js, or `assets/logos/`) on a `.px-fav` disc (see the action row in `snippets.html`). Cite only sites whose real favicon you can show, and keep the favicons in the same order as the chips. Avoid generic globes and coloured letter circles; they read as fake.

## Pieces and class names
| Piece | Root class | Notes |
|---|---|---|
| Comet window | `.px-window` | `--px-w` / `--px-h` set the size (default 1400×880). Inside: `.px-tabstrip` (`.px-traffic`, `.px-tab.is-active`, `.px-tab-new`, `.px-tabstrip-end`, `.px-profile`), then `.px-frame` > `.px-toolbar` (`.px-nav`, `.px-url`, `.px-toolbar-end`, `.px-tb-sep`, `.px-assistant-btn`) and `.px-viewport`. Toolbar order: star, link `\|` puzzle, download `\|` reader, voice `\|` Assistant (drop the middle pair and its divider on sites without them). "Assistant" and the tab title are regular weight, mid-grey |
| Page crop | `.px-crop` | Full-bleed page with the product's page colour. Put a `.px-main` inside (it fills the crop) and a `.px-home` or `.px-thread` in that |
| Favicon tile | `.px-favicon` | Black rounded square holding a white mark (the Perplexity logo, or a site's). Inverted in dark. Add `.is-round` for a round tile |
| Web app | `.px-app` | Holds `.px-sidebar` and `.px-main` |
| Sidebar | `.px-sidebar` | Children: `.px-sb-head` (logo, search, collapse), `.px-sb-nav` > `.px-sb-item[.is-active]` (New uses `.px-sb-plus`), `.px-sb-groups` > `.px-sb-group` (Pinned / Projects / Sessions ›), `.px-sb-foot` (`.px-avatar`, `.px-user`, `.px-bell`) |
| Home (Search) | `.px-home` | `.px-home-label` reads "Search"; `.px-home-title` reads "What do you want to know?"; then the composer |
| Home (Computer) | `.px-home.is-computer` | `.px-home-glyph` (monitor), then `.px-home-serif` ("What should we work on?") |
| Composer | `.px-composer` | Holds `.px-input` (`.px-placeholder`, typed text, `.px-caret`) and `.px-ctrls`. The controls are: `.px-icon-btn` (+), `.px-seg` > `.px-seg-opt[.is-on / .is-ghost]` (Search ▾ / Computer), `.px-spacer`, `.px-model` ("Model ▾"; `.is-pill` for the effort pill "⁘ High ▾"), `.px-icon-btn.px-mic`, `.px-round` |
| Composer variants | `.is-followup` (thread dock), `.is-assist` (Comet panel) | `.px-composer-foot` is the "Work in a project / Connect an app" strip that sits under a Computer composer |
| "+" menu | `.px-menu` | Built from `.px-menu-item` (icon, label, `.px-trail` chevron, or `.px-trail.is-check` teal check), `.px-menu-sep` and `.px-badge` (Max) |
| Effort popover | `.px-effort` | `--px-level: 0–100%` sets the dotted teal fill. Contains `.px-effort-head`, `.px-slider` (`-fill`, `-knob`, `-end`) and `.px-effort-row` (Custom ›) |
| Model picker | `.px-picker` | Built from `.px-picker-card` groups, `.px-picker-label` (with `.px-toggle[.is-on]`) and `.px-picker-row` (vendor glyph, name, `.px-trail` check) |
| Thread | `.px-thread-head`, `.px-scroll` > `.px-thread`, `.px-dock` | The thread column is 860px wide |
| User message | `.px-q` | Right-aligned pale bubble. For Computer prompts, add `.px-files` > `.px-file` chips under it |
| Working steps | `.px-steps` > `.px-step` | Each step is an icon (`globeSearch`, `code`, `scanText`), grey text, then `.px-chev` |
| Thinking | `.px-thinking` | The teal Perplexity mark. Animate it gently and remove it when streaming starts |
| Answer | `.px-answer` | Serif body. Use `p`, `h3`, `ul > li`. Bullets are grey |
| Citation chip | `.px-cite` | Icon (`shield` for the web, `paperclip` for files), a mono label, then `.px-cite-more` "+N". `.is-file` fades out long filenames |
| Table | `.px-table` | Cells use the sans face, with a tinted bold header row and a hairline grid. Chips can sit inline in a cell |
| Action row | `.px-actions` | Share, download, copy and rewrite icons, then `.px-sources` (`.px-favs` > `.px-fav`, "N sources"). `.px-fav` is a 24px disc overlapping the previous one by 9px; put the site's mark inside (16px) and set `background` / `color` per site |
| Computer card | `.px-card.px-usage` | Holds `.px-usage-row` and `.px-usage-btn` |
| Comet page area | `.px-site` | Your web page goes here. `.px-agent-glow` is the cyan edge glow while the agent drives. Don't draw rings around what the agent clicks (no reference shows one); let the page's own state change |
| Assistant panel | `.px-assist` | 364px wide. Contains `.px-assist-head` (⋯), `.px-assist-body`, `.px-assist-empty` (faint Comet mark) and `.px-ctx-wrap` > `.px-ctx` (page-context tab) + `.px-composer.is-assist` |
| Agent timeline | `.px-agent` > `.px-agent-step[.is-active]` | Each step has `.px-agent-dot`, `.px-agent-title` (15px) and `.px-agent-sub` (12.5px: an icon, `click`, `pageRead`, `pageScroll` or `typing`, plus the label) |
| Agent pill | `.px-agent-pill` | Replaces the panel's ↑ button while the agent runs: `<div class="px-agent-pill"><span>Working…</span><span class="px-pill-stop"></span></div>`. Dark teal `#193d44`, pale text, cyan `#6ee7f2` stop square. Use "Typing…" while the agent types |
| Pointer | `.px-pointer` | The white, dark-outlined arrow from Perplexity's own videos (34px). Its tip is 0.1em from the left and 0.06em from the top of the box. Move it with GSAP `x` / `y` |

## States
- **Composer**
  - Idle: placeholder, plus the voice button `.px-round` with the `voice` icon.
  - Typing: text, a teal `.px-caret`, and `.px-round` with `arrowRight`.
  - Hover (pointer resting on send): `.px-round.is-hover`. Pressed: scale the button to 0.92 for about 90 ms.
  - Generating (web app): `.px-round.is-stop` with the `stop` icon.
  - The Comet panel's send button uses `arrowUp`. While the agent runs it becomes `.px-agent-pill` (dark teal, "Working…" or "Typing…", cyan stop square), and turns back into `arrowUp` when the run ends.
- **Mode toggle:** Search is active by default (`.px-seg-opt.is-on` on Search). In Computer mode, Search collapses to an icon-only `.is-ghost` segment and Computer gets `.is-on` and a chevron.
- **Sidebar:** `.is-active` on the current page's row. On the home screen, that's the New row.
- **Agent step:** steps start grey (the sub-label a step lighter than the title). Only the current step gets `.is-active`, which gives it a teal dot and dark text. When the run ends, drop `.is-active`, clear the glow, and swap the pill back to `arrowUp`.
- **Assistant button:** `.is-on` may mark the open panel, but the real button looks the same either way (regular grey).

## Motion notes (as the demo does it)
- **Typing:** each character is a span. Reveal them with `tl.set(span, {display: "inline"}, t)`; this is seek-safe. Keep the placeholder absolutely positioned so the caret starts at the left edge, and hide it at the first key. Cross-fade the voice button into the send arrow at the same moment. Cadence is about 46–76 ms per character, a little longer after spaces.
- **Pointer:** fade it in off to the lower right, glide to the target in 0.8 s with `power2.inOut`, set the hover state on arrival, press later.
- **Streaming:** wrap each word in `<span class="w">` (opacity 0) and reveal 3-word chunks every 48 ms. A chip pops in (opacity, plus scale from 0.92) once its sentence is done. Keep each `li` at opacity 0 until its first chunk, so its bullet doesn't show early.
- **Tables:** stream row by row. Start the table at opacity 0 and grow it with `clip-path: inset(0 0 <rest>px 0 round 10px)` down to each new row, so an empty frame never shows.
- **Agent:** add one step about every 0.75 s and move `.is-active` to the newest. Show each action on the page itself: open the popover, tick the box, flip Save to Saved (about 0.4 s after the step appears, with a 0.94 press, about 0.17 s apart in a run). Swap the ↑ button for the pill when the request is sent (tween the slot's width so the mic doesn't jump). If the timeline outgrows the panel, scroll its content up with `power2.inOut` and fade a `--px-panel` gradient in at the top.

## Colour tokens
Every colour is a `--px-*` custom property on `.sk-pplx`, and the dark block overrides them. The key ones:

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--px-bg` | #faf7f4 (warm) | #161412 | Page background |
| `--px-sidebar` | #f3f0ed | #1c1a18 | Sidebar |
| `--px-composer` | #fefcfa | #22201e | Composer |
| `--px-accent` | #0f6e74 | #45a8b4 | Teal: the only accent |
| `--px-btn` / `--px-btn-hover` | #25231f / #3a3833 | #ebe8e5 / #ffffff | Round voice and send button |
| `--px-seg-on` / `--px-track` | #ffffff / #f0eeec | #1f1d1c / #2a2826 | Active segment / toggle track (dark's active segment is darker than the composer) |
| `--px-chrome-ink` / `--px-tab-ink` | #464947 / #474a48 | #c4c1bd / #c9c6c2 | "Assistant" label, tab title (regular weight) |
| `--px-tb-sep` | #ebe8e5 | white 8% | Toolbar dividers |
| `--px-fav-bg` / `--px-fav-edge` | #ffffff / warm 13% | #2b2925 / white 7% | Source favicon discs |
| `--px-pill` / `--px-pill-ink` / `--px-pill-stop` | #193d44 / #e6f3f4 / #6ee7f2 | same | Comet agent pill |

Teal appears only on the thinking mark, the caret, the active agent dot, toggles, the slider, checks, the Max badge, the agent glow and the agent pill.

## Demo
`demo/` is a HyperFrames project (6 s, variables `variant` 0/1/2 and `theme` light/dark):
- **0:** Search home, cropped at scale 1.42. A question is typed, the pointer presses send, and the thread opens.
- **1:** Answer page, cropped at scale 1.38. Steps, then a streamed serif answer with a table and citation chips, then the sources row.
- **2:** Comet window cropped at scale 1.68. The Assistant runs a four-step agent task on a fictional company directory (filter, tick, read, save six), with the "Working…" pill and the cyan edge glow.

Render one with `npx hyperframes render . --variables '{"variant":"1","theme":"dark"}'`. Edit the files in `library/_skins/perplexity/`, never the copies under `demo/assets/skins/`.

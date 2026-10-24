# Grok skin (`grok`)

A faithful HTML/CSS recreation of **grok.com** (web, light and dark), the **Grok iOS** app and the **Grok Bot** desktop app, as of October 2026. Every component that shows Grok or Grok Bot uses this skin, so they all show the same product.

Files:

| File | What it is |
|---|---|
| `skin.css` | All styles, scoped under `.sk-grok`. Every colour is a custom property. Light by default, dark with `data-theme="dark"`. |
| `icons.js` | `window.SKIN_ICONS_GROK`: inline SVG strings for every icon, the Grok mark, the Grok Bot avatars, plus `avatar()` and `hydrate()` helpers. |
| `snippets.html` | Canonical, commented markup for every piece. Open it in a browser to see them all. |
| `DECISIONS.md` | What matches which reference frame, and what was extrapolated. |
| `demo/` | HyperFrames demo, 3 variants × light/dark: 0 = grok.com home, type → mode menu → pick Expert; 1 = grok.com logged-out send → user bubble + "Continue your conversation" gate; 2 = Grok Bot window (list · chat with maya · profile panel). |

## Using it in a component

```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/grok/skin.css">
<script src="assets/skins/grok/icons.js"></script>

<div class="sk-grok" data-theme="dark">  <!-- omit data-theme for light -->
  … markup copied from snippets.html …
</div>
<script>
  SKIN_ICONS_GROK.hydrate(document.querySelector(".sk-grok"));
</script>
```

- `hydrate(root)` replaces every `<i data-ic="name">` with that icon's inline SVG (keeping its class and id). It also replaces every `<span data-av="hex" data-color="#f5b24c" data-size="42" [data-online] [data-badge]>` with a Grok Bot avatar.
- `SKIN_ICONS_GROK.avatar(shape, colour, size)` returns avatar markup as a string. Shapes: `cloud`, `hex`, `round`, `octa`, `drop`, `pill`, `house`, `leaf`, `tri`, `grok`.
- Fonts: the skin sets `font-family: Inter`, the stand-in for grok.com's universalSans. Don't `@import` fonts in a component; link `assets/fonts/fonts.css`.

### Scale for video

Every size in the skin is at **native UI scale**:

- grok.com is 1:1 with a browser viewport (measured from the live DOM at 1920×1080).
- Grok Bot is 1:1 with the 1585 px-wide official stream crop.
- iOS is in points (393×852).

Lay the UI out at native size, then scale a wrapper (`#cam` in `demo/index.html`: `translate(…) scale(…)` around a focus point, plus at most a 1–2.5 % push-in). **Keep the product's identifying chrome in frame**: a crop that cuts the logo, header and footer reads as a generic chat UI.

- **grok.com:** don't crop the 1920×1080 page. Lay it out as a smaller browser window, **1152×648**, and show that window full-frame at **×1.667** (1920 / 1152). The logo, Imagine · ⚙ · Sign in · Sign up and the footer terms all stay on camera, and the composer spans 65 % of the frame with 27 px text. Set `--gk-home-top: 167px` on `.gk-page` (25.7 % of the window height, the same share as the live 278 px at 1080).
- **Grok Bot:** show the whole **1585×892** window (list · chat · profile panel) at **×1.2114** (1920 / 1585). It fills the frame exactly; bubble text lands at 21 px.

## Class map## Class map

Prefixes: `gk-` grok.com web · `gi-` Grok iOS · `gb-` Grok Bot desktop.

### grok.com
| Piece | Classes | States |
|---|---|---|
| Page | `.gk-page` (warm `#f9f8f7` / `#131211`) | |
| Header (logged out) | `.gk-header`, `.gk-logo`, `.gk-ghost` ("Imagine"), `.gk-iconbtn`, `.gk-pill.is-outline` ("Sign in"), `.gk-pill.is-solid` ("Sign up") | `.gk-pill.is-sm` |
| Home | `.gk-home`, `.gk-heading` ("What should we explore?") | |
| Composer | `.gk-composer` > `.gk-input` (`.gk-placeholder`, typed text, `.gk-caret`) + `.gk-row` (`.gk-iconbtn` plus · `.gk-spacer` · `.gk-chip` · `.gk-send`) | idle (send at 40 %) · `.is-typing` (solid blue send) · `.is-generating` (stop square) · `.gk-send.is-hover` |
| Mode chip | `.gk-chip` > `.gk-chip-label` ("Fast") + `.gk-chev-down` + `.gk-chev-up` icons | `.is-hover` (grey pill) · `.is-open` (grey pill, bold, chevron up). After a pick, set the label ("Expert") and drop `.is-open`. |
| Mode menu | `.gk-menu.is-under-chip` (child of `.gk-composer`) > `.gk-menu-item` (icon, `.gk-label`, `.gk-check`) + `.gk-upsell` | `.gk-menu-item.is-hover` |
| Logged-out gate | `.gk-thread` > `.gk-msg-user` (11 px gap) + `.gk-gate` (`.gk-gate-title`, `.gk-gate-sub`, `.gk-pill.is-solid` "Sign up for free", `.gk-gate-list`) | `.gk-pill.is-solid.is-hover`. This is what a **logged-out send** shows: the bubble and the gate, no reply, no composer, no footer. |
| Logged-in app (**extrapolated**, no reference) | `.gk-app` > `.gk-sidebar` (`.gk-nav-item`, `.is-search`, `.is-active`, `.gk-side-label`, `.gk-hist-item`) + `.gk-main` | Prefer the logged-out flow until a logged-in capture exists. |
| Conversation | `.gk-thread` > `.gk-msg-user` > `.gk-bubble`; `.gk-msg-ai` (markdown: `p`, `h3`, lists, `code`, `pre`, `.gk-table`; **extrapolated**) | |
| Thinking | `.gk-thinking` > `.gk-shimmer` "Thinking" (animate `background-position` 100 % → −50 %), then plain "Thought for 3s" + chevron | |
| Reply actions | `.gk-actions` > `.gk-iconbtn` × 6 | |
| Docked composer | `.gk-dock` > `.gk-composer` | |
| Streaming | wrap words in `span.gk-tok` (opacity 0) and fade each in turn | |

Mode names: **Fast / Auto / Expert / Heavy** (the chip shows the mode, not a model). The upsell row reads **Premium — Unlock extended capabilities**. Models, if a component names one: Grok 4.7 (current), 4.6, 4.5.

### Grok iOS
`.gi-screen` > `.gi-top` (`.gi-round` menu · `.gi-seg` Ask / Imagine / Build with `.is-active` · `.gi-round` compose), `.gi-thread` (`.gi-user` outlined pill, `.gi-ai` plain text, `.gi-post` X-post embed: `.gi-post-av`, `.gi-post-head`, `.gi-post-media`, `.gi-post-stats`), `.gi-composer` (`.gi-ph`, `.gi-plus`, `.gi-chip` "Expert ⌄", `.gi-speak` white "Speak" pill). Place it inside the device skin's iPhone frame.

### Grok Bot desktop
| Piece | Classes | States / notes |
|---|---|---|
| App | `.gb-app` (1585×892 reference; set width/height inline for other crops) | |
| Bot list | `.gb-list` > `.gb-list-tools` (`.gb-tool` search, plus), `.gb-primary` (big avatar, `.gb-name`, `.gb-tag`), `.gb-group`, `.gb-row`, `.gb-fold` (collapsed: label + count; `.is-open`: label only, rows follow), `.gb-list-fade`, `.gb-more-unreads`, `.gb-list-foot` (`.gb-me`, `.gb-connect` + `.gb-applogos`) | `.gb-row.is-selected`, `.is-hover`, `.gb-unread-dot`, avatar `data-online` / `data-badge` |
| Chat | `.gb-chat` (set `--gb-bot` to the bot's bubble colour) > `.gb-chat-head`/`.gb-head-pill`, `.gb-thread` (`.is-scrolled` = top fade), `.gb-time`, `.gb-relay`, `.gb-msg` (`.is-user`), `.gb-bubble`, `.gb-hover-actions`, `.gb-dismissed`, `.gb-status` + `.gb-shimmer` | `.gb-chat.is-solo` when the profile panel is closed (centred column) |
| Question card | `.gb-q` > `.gb-q-opts` > `.gb-q-opt` (`<b>A</b>…`) + `.gb-q-own` | |
| Team-bot setup | `.gb-setup` rows, `.gb-pub` published card, `.gb-btn.is-solid` / `.is-ghost` | |
| Composer | `.gb-composer` > `.gb-circle` (plus) · `.gb-ph` or `.gb-typed` · `.gb-circle.is-mic` (mic) · `.gb-voice` (waveform; swap to `arrowUp` once text is typed) | light: "+" in a faint `#f0f0f0` circle, mic a near-bare grey glyph; dark: both bare glyphs |
| Profile panel | `.gb-panel` (530 px, hairline left edge) > 78 px avatar, `.gb-p-name`, `.gb-p-role`, `.gb-tabs` (Details / Library / Computer; `.is-active` = grey pill `#efefef` / `#2a2a2a`), `.gb-p-label` (+ `.gb-dev`), `.gb-p-card` (`#fdfdfd`, 1 px `#ececec`), `.gb-p-screen` + `.gb-p-caption` | |
| Recording bar | `.gb-rec` ("maya is watching and learning", red ■ timer, ✕) | |

**User bubbles take the colour of the bot you are talking to.** Bot colours seen in the official streams:

| Bot | Avatar | Bubble (`--gb-bot`) | Shape |
|---|---|---|---|
| bobo (primary, "life stabilizer") | `#4a90f9` | | `cloud` |
| maya ("community") | `#f5b24c` | `#b87829` | `hex` |
| dex ("designer") | `#ee4e5b` | `#b22f34` | `octa` |
| penny ("sourcing") | `#57c0b0` | | `round` |
| Dex (unassigned, "designer") | `#a083f5` | | `drop` |
| Sample support bot | `#9d7a5b` | | `tri` |
| GTM Helper (team bot) | `#cd3e85` | `#b33471` | `house` |
| Grok Bot (stock) | `#000000` (light) · `#ececec` on a dark list | | `grok` + `data-badge` |

### Icons (`SKIN_ICONS_GROK`)
`grok` (mark) · header: `imagine settings share` · composer: `plus chevronDown chevronUp chevronRight arrowUp arrowDown stop check mic paperclip waveform` · modes: `fast auto expert heavy` · gate: `imageSparkle skills file chat` · sidebar: `search newChat voice projects history sidebar` · actions: `refresh copy thumbUp thumbDown more` · iOS: `menu compose xVerified xReply xRepost xLike xViews` · Grok Bot: `emoji reply monitor link team key cube cloudDown close star stopRec dot appDrive appGmail appGithub` · avatars: `bot-cloud bot-hex bot-round bot-octa bot-drop bot-pill bot-house bot-leaf bot-tri bot-grok`.

## Motion notes
- Type at a human cadence with a seeded keystroke schedule (see `keySchedule` in the demo). The send button goes from 40 % to solid blue at the first character.
- The mode menu opens from its top-right origin: opacity 0 → 1, `translateY(-6px) scale(.97)` → none, 200 ms, `power3.out`. Rows highlight when the pointer is over them.
- Picking a mode: on release the check moves to the picked row, the menu closes in 150 ms, and the chip relabels ("Expert ⌄", grey text, no pill).
- A logged-out send: heading, composer and footer clear (200 ms), the user bubble lands at the top of the column, then the gate card rises in with its feature list staggered.
- Replies stream word by word (`.gk-tok`, about 0.2 s fade each). Table rows appear when their first cell arrives.
- Grok Bot messages grow in at the bottom of a bottom-anchored thread with the `.sk-grow` helper (animate `grid-template-rows` 0fr → 1fr).
- The status verb (`.gb-shimmer`, `.gk-shimmer`) sweeps by animating `background-position`.

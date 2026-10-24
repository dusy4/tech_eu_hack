# ChatGPT skin

A faithful HTML/CSS recreation of ChatGPT as it looks in October 2026 (GPT-6, Intelligent UI, Chat | Work, Space, dots), in light and dark. Use it whenever a component shows ChatGPT, so that every component shows the same ChatGPT.

The truth is `research/ui-references/chatgpt/` and its `UI-NOTES.md`. `DECISIONS.md` says which piece maps to which official frame and what was extrapolated.

## Files
| File | What it is |
|---|---|
| `skin.css` | All styles, scoped under `.sk-chatgpt`. Light by default; dark with `data-theme="dark"` on the root or any ancestor. Every colour is a `--cg-*` custom property (the Chrome frame uses `--cb-*`). Optional account colour with `data-accent="green"` or `"blue"`. |
| `icons.js` | `window.SKIN_ICONS_CHATGPT`: inline SVG strings on a 24 grid, in `currentColor`. `SKIN_ICONS_CHATGPT.mount(root)` fills every empty `<i class="cg-i" data-i="name">`. |
| `snippets.html` | Canonical markup for every piece. Open it in a browser to see all of them in light and dark. |
| `demo/` | The HyperFrames demo. **0**: chatgpt.com in Chrome, home → type → send → the GPT-6 reply streams. **1**: the same chat, where the pointer drags a slider in the Intelligent UI card. **2**: the desktop app in Work, with the model/reasoning picker, a follow-up and send. |

## Use it in a component
```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/chatgpt/skin.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="assets/skins/chatgpt/icons.js"></script>

<div style="position:absolute; left:100px; top:38px">        <!-- place on the stage -->
  <div style="zoom: 1.1">                                    <!-- present at video scale -->
    <div class="sk-chatgpt cg-window cg-browser" data-theme="light" data-accent="green" style="width:1564px; height:912px">
      <div class="cg-browser-tabs">…</div>
      <div class="cg-browser-bar">…</div>
      <div class="cg-browser-page"><div class="cg-web">… copy from snippets.html …</div></div>
    </div>
  </div>
</div>
<script> SKIN_ICONS_CHATGPT.mount(document); </script>
```
- **All sizes are the real product's CSS px.** Scale with `zoom` on a wrapper, never by editing sizes.
- **One zoom per surface:**
  - chatgpt.com: 1.1 (24px answer prose lands at 26px). Use the same window (1564×912 in Chrome) on every chatgpt.com screen of a component, so two screens never disagree.
  - Desktop app (`.cg-desk`): 1.5 (16px prose lands at 24px).
  - iOS (`.cg-ios`): about 1.6.
- **Show chatgpt.com inside Chrome** (`.cg-browser`), as every official web frame does. Drop the frame only for a tight crop of the thread.
- To measure an element in the window's own px under zoom, use `(rect - windowRect) * windowCSSWidth / windowRect.width` (see `box()` in `demo/index.html`).
- Absolutely positioned overlays (the pointer, menus) must be direct children of the window root, because `box()` measures from it. Inside `.cg-browser-page` they would be offset by the 90px Chrome frame.
- Fonts are stand-ins: Inter for OpenAI Sans, JetBrains Mono for mono. The skin never loads fonts.
- `.cg-window` adds the floating-window radius, hairline and the DESIGN.md window shadow. Drop it to fill a frame edge to edge.
- `.cg-web.is-classic` switches the web thread to the classic 16px prose and 768px column. The GPT-6 web demos use 24px prose.
- The chatgpt.com screens in the official GPT-6 demos use a green account (`data-accent="green"`). Use it for chatgpt.com unless the component needs the plain black button.

## Surfaces
| Surface | Root | Contents |
|---|---|---|
| Chrome (macOS) | `.cg-browser` | `.cg-browser-tabs` (`.cg-traffic`, `.cg-browser-tsearch`, `.cg-browser-tab` > `.cg-browser-fav` + `.cg-browser-title` + `.cg-browser-x`, `.cg-browser-new`) · `.cg-browser-bar` (`.cg-browser-btn` (`.is-off`), `.cg-omni` > `.cg-omni-info` + `.cg-omni-url` + `.cg-omni-star`, `.cg-browser-sep`, `.cg-browser-profile` > `.cg-browser-avatar`) · `.cg-browser-page` |
| chatgpt.com | `.cg-web` | `.cg-rail` (52px icon rail, `.cg-rail-foot` avatar) · `.cg-top` (`.cg-top-center` with `.cg-toggle` Chat \| Work on the home; `.cg-top-right` Share / ⋯ / contents tile in a conversation) · `.cg-main` > `.cg-scroll` > `.cg-col.cg-thread` · `.cg-dock` (disclaimer **above** the composer) · `.cg-home` (greeting + composer) |
| Desktop app (macOS) | `.cg-desk` | `.cg-tb` title bar (`.cg-traffic`, `.cg-tb-btn` (`.is-dim`), `.cg-tb-sep`, `.cg-tb-title` or `.cg-tab` (`.is-on`), `.cg-tb-right`) · `.cg-drail` rail (`.cg-drail-btn.is-active` + `.cg-badge`, `.cg-drail-sep`, avatar) · `.cg-dcard` inset content (`.cg-minimap`, `.cg-scroll`, `.cg-ddock`) · `.cg-panel` (Space / chats; add `.has-panel` to the card) |
| iOS | `.cg-ios` (393×852) | `.cg-ios-status`, `.cg-ios-head` > `.cg-ios-round`, `.cg-ios-body`, `.cg-ios-h` + `.cg-ios-caps`, `.cg-composer--ios` with `.cg-ios-circ` |
| Voice mode | `.cg-voice` | `.cg-orb` > `.cg-orb-clouds`, `.cg-voice-bar` (`.cg-voice-ask`, `.cg-voice-circ`, `.is-end`) |
| dots | `.cg-dots`, `.cg-call` | `.cg-dot-msg` (`.is-me`), `.cg-dot-action`, `.cg-dot-typing`; call: `.cg-call-top`, `.cg-call-row` > `.cg-call-btn` (`.is-light`, `.is-end`) |

## Pieces and states
| Piece | Markup | States |
|---|---|---|
| Web composer | `.cg-composer.cg-composer--pill` > `.cg-c-plus`, `.cg-c-input` (`.cg-c-ph` placeholder, `.cg-c-text`, `.cg-caret`), `.cg-c-right` (`.cg-c-model` "Instant ⌄", `.cg-c-mic`, `.cg-c-btn`) | 808×56 in **every** state; it never resizes. `.cg-c-model.is-open`. (`.is-compact`, 614×43, only reproduces the Monty Hall demo's reduced page zoom. Never animate into it.) |
| Primary button | `.cg-c-btn[data-state]` with `.cg-b-voice`, `.cg-b-send`, `.cg-b-stop` (+ optional `span.cg-b-busy`) | `voice` (empty) · `send` (text) · `stop` (generating) · `busy` · `.is-disabled` |
| Work composer | `.cg-composer.cg-composer--work` > `.cg-c-input` + `.cg-c-row` (`.cg-c-plus`, `.cg-perm`, `.cg-c-spacer`, `.cg-c-model` with `.cg-m-name` + `.cg-m-effort`, optional `.cg-m-bolt`, mic, button) | `.cg-perm.is-auto` (blue Auto-review) · `.is-line` single-line pill · `.cg-tray` context tray above (`span.is-on`, `.is-open`) |
| Menus | `.cg-menu` > `.cg-menu-label`, `.cg-menu-item` (`.cg-menu-text` + `.cg-menu-desc`, `.cg-menu-check`, `.cg-menu-sub`), `.cg-menu-sep` | `.is-hover`, `.is-pressed`, `.is-selected` (shows ✓) |
| User message | `.cg-turn.cg-turn--user` > `.cg-user` | web: a pill (`.is-multi` for 2+ lines); desktop: a radius-20 rectangle; the accent tints it |
| Assistant | `.cg-ai` (no bubble): `h1`/`h2`/`h3`, `p`, lists, `code`, `.cg-link` | stream words as `<span class="cg-w">`, with the colour going from `--cg-stream-tint` to ink |
| Action row | `.cg-actions` > `.cg-act` ×6 (copy, thumb-up, thumb-down, share, regenerate, more) | `.is-hover` |
| Working | `.cg-thinking` (pulsing dot) · `.cg-shimmer` (animate `--cg-shimmer-x` from 100% to 0%) · `.cg-status` "Worked for 40s ›" | `.cg-status.is-plain` (no rule) |
| Artifact card | `.cg-artifact` > `.cg-artifact-icon`, `.cg-artifact-text` (title, kind), `.cg-btn-ghost` "Open" | — |
| Intelligent UI | `.cg-iui` > `.cg-iui-title`/`-sub` or `.cg-iui-eyebrow`, `.cg-iui-big`, `.cg-iui-delta`, `.cg-iui-row`, `.cg-slider` (`--k` 0–1) > `.cg-slider-knob`; `.cg-radios` > `.cg-radio.is-on`; `.cg-tiles` > `.cg-tile--blue/green/red`; `.cg-iui-result`; `.cg-table` | `.cg-slider-knob.is-active` while dragged |
| Pointer | `.cg-cursor` > `<i class="cg-i" data-i="cursor">` (22×30, hotspot 3,2) | press with scale 0.9 |

## Tokens worth knowing
- **Page and chrome:** `--cg-page`, `--cg-chrome`, `--cg-rail`.
- **Text:** `--cg-text`, `--cg-text-2`, `--cg-text-3`.
- **Messages and composer:** `--cg-user-bubble`, `--cg-composer`.
- **Primary button:** `--cg-btn`, `--cg-btn-ink`, `--cg-btn-busy`.
- **Menus and links:** `--cg-menu`, `--cg-link`, `--cg-blue`.
- **Streaming and tiles:** `--cg-stream-tint`, `--cg-tile-*`.
- **Prose size per surface:** `--cg-read`, `--cg-read-lh`.
- **Chrome frame:** `--cb-frame`, `--cb-bar`, `--cb-omni`, `--cb-chip`.

## Motion notes (what the real product does)
- **Typing.** The round button swaps from waveform to ↑ on the first character.
- **Send.** One frame does all of this together:
  - the field clears;
  - ■ replaces ↑;
  - the URL becomes `chatgpt.com/c/<id>`;
  - the user pill posts.

  From the home screen the composer then glides to the bottom **at the same size**. The black dot breathes, then words stream in tinted with the account colour and settle to ink.
- **End of the reply.** When the reply ends, ■ goes back to the waveform in one frame, and the action row fades in.
- **Intelligent UI.** Cards are used, not just shown. The pointer presses a knob, drags it, and the figures update step by step.
- **Pickers** grow from their chip (scale 0.96 → 1 with opacity, 150ms, origin at the chip), right-aligned above it, and close in 150ms. Fade the chip's hover plate by its alpha only (from `rgba(r,g,b,0)`), never through black.

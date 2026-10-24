# Device skin (`.sk-device`)

Device chrome that other skins and components sit inside: an iPhone 17 Pro with the iOS 26 lock screen and notifications, a macOS 26 Tahoe desktop with its menu bar, windows and notification banner, Safari 26 and Chrome (GM3) browser frames, and the macOS pointer.

| Piece | Root class | Size (pt = CSS px) |
|---|---|---|
| iPhone (iOS 26, Dynamic Island) | `.dv-iphone` → `.dv-iphone__glass` → `.dv-screen` | body 430 × 902, screen 402 × 874 |
| Status bar, island, home bar | `.dv-statusbar`, `.dv-island`, `.dv-home-indicator` | bar 54 tall |
| iOS lock screen | `.dv-lock` (+ `.dv-wall-ios`) | fills `.dv-screen` |
| iOS notification | `.dv-notif` in `.dv-notif-stack` / `.dv-notif-list` (in `.dv-notif-area`, `--list` = under the clock) | 382 wide on the lock screen |
| Communication notification lead | `.dv-notif__sender` > `.dv-avatar` + `.dv-appicon` (badge) | avatar 38, badge 17 |
| App icons | `.dv-appicon.dv-appicon--<app>` | `--s` (default 38) |
| macOS 26 desktop + menu bar | `.dv-desktop`, `.dv-menubar` (`__apple`, `__app`, `__item`, `__icon`, `__clock`) | 1512 × 851 (or sized to the frame), bar 24 |
| macOS window | `.dv-window` (+ `--toolbar`, `__titlebar`, `__sidebar`, `__rim`) | any |
| macOS notification banner | `.dv-mac-notif` (+ `--corner`, `.is-hover`; `__close.is-pressed`) | 360 wide |
| Safari 26 window | `.dv-window.dv-window--toolbar.dv-safari` | any (toolbar 56) |
| Safari Start Page | `.dv-startpage` > `.dv-startpage__inner` > `.dv-favs` / `.dv-privacy` | fills `.dv-safari__page` |
| Chrome window (GM3) | `.dv-chrome` | any (tab strip 44 + toolbar 46) |
| Chrome New Tab Page | `.dv-ntp` (`__links`, `__logo`, `__search`, `__tiles`, `__custom`) | fills `.dv-chrome__page` |
| macOS pointer | `.dv-cursor` (+ `.is-hand`, `.is-ibeam`, `--white`) | 22 × 30 |

## Use it in a component

```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/device/skin.css">
<script src="assets/skins/device/icons.js"></script>
```

1. Wrap the device in an element with `class="sk-device"` and `data-theme="light|dark"` (from the `theme` variable). The theme flips the OS appearance: iOS/macOS dark mode, Chrome dark, the iPhone finish (Silver vs Deep Blue), dark app-icon variants, the Start Page.
2. Copy the markup for the piece from `snippets.html`. Icons: inline `${SKIN_ICONS_DEVICE.name}` from JS, or keep the `data-dv-icon="name"` placeholders and call `SKIN_DEVICE_HYDRATE(rootEl)` once.
3. Scale with `zoom`, not `transform: scale` (keeps text sharp). Put the zoom on an inner element and position an unzoomed outer box, so positions stay in frame pixels.
4. Put the product UI inside: another skin's app inside `.dv-screen` (leave the top 54 px and bottom 34 px safe areas), or a page inside `.dv-safari__page` / `.dv-chrome__page`.

## Framing at 1080p (the craft bar)
Present devices the way a launch video crops a screen, with body text at about 26–32 px on the frame. Never a small full device floating in empty space. Whatever the crop, keep the element that identifies the device in frame: the iPhone's Dynamic Island, status bar and clock; the Mac's whole menu bar (Apple menu and app menus as well as the status items); the browser's tab strip and toolbar.

| Shot | Zoom | Crop | Example in `demo/` |
|---|---|---|---|
| iPhone lock screen | 1.7–1.8 | Top of the phone ~40 px under the frame edge: island, status bar, date, clock and the notification list; the bottom bleeds off. The device stays recognisable | variant 0 |
| iPhone notification close-up | 1.9–2.0 | Bottom half of the phone (stack + quick actions), top bleeds off. Use only after the phone has been seen whole or with its island | – |
| macOS desktop + banner | 2.0 | The whole screen: size `.dv-desktop` to the frame (`width:960px;height:540px` at zoom 2) so the full menu bar (Apple menu, app menus, status items, clock) and the banner are both in frame | variant 1 |
| Browser window | 1.5–1.6 | A ~1000 × 600 pt window, centred, 60 px margins | variant 2 |
| Full iPhone | 1.15 | Whole phone, full frame height (only when the whole screen matters) | – |

Cropped wrappers need `data-layout-allow-overflow` so `hyperframes check` accepts the intentional bleed.

## States and motion recipes

- **iOS notification arrives, List view** (newest on top): wrap each card in a slot. The slots below move down by (new card height + 8) over 0.55 s `expo.out`; 0.1 s later the new card pops in: opacity 0 → 1 (0.25 s), `scale .94 → 1, y −16 → 0` (0.6 s `expo.out`). Layout offsets on the slots, the entrance on the `.dv-notif` (keeps the backdrop blur intact). Never crossfade one card into another.
- **iOS notification arrives, Stack view** (bottom-anchored): `fromTo(card, {y:40, opacity:0, scale:.96}, {y:0, opacity:1, scale:1, duration:.6, ease:'expo.out'})`; the older card → `y:10, scaleX:.93` (origin bottom), fade its contents, clip it to a 10 px sliver: `clipPath: inset(<h-10>px 0 0 0 round 0 0 26px 26px)`. Static slivers: `.dv-notif-peek--1/--2`.
- **Messages / messaging apps**: use the communication lead (`.dv-notif__sender` with `.dv-avatar` initials or a photo, plus the app icon as a 17 pt badge), not the bare app icon.
- **Lock screen vs app**: on the lock screen leave `.dv-statusbar__time` empty and use `.dv-statusbar--light` + `.dv-home-indicator--light`. In apps, show `9:41`.
- **macOS banner**: slides in from the right screen edge: `fromTo(banner, {x:420}, {x:0, duration:.6, ease:'expo.out'})`. Pointer on the card body (not its edge) → fade in `.dv-mac-notif__close` (or add `.is-hover`). Dismiss: pointer onto the ×, press (pointer `.88`, × `scale .9` + `.is-pressed`), then `to(banner, {x:420, duration:.32, ease:'power2.in'})`. Don't leave the pointer hovering with nothing happening.
- **Pointer**: move `.dv-cursor` with GSAP `x/y` (hotspot = arrow tip), `power2.inOut`. `.is-hand` over links/buttons, `.is-ibeam` over text fields. Click = `scale:.88` for 0.08 s and back in 0.12 s. macOS hides the pointer while typing: fade it out once typing starts.
- **Chrome omnibox**: idle (tune chip + host, path in `.dv-path`) → focused (`box-shadow: inset 0 0 0 2px var(--dv-cr-link)`, placeholder "Search Google or type a URL") → typing (`.dv-chrome__popup` card over the omnibox, inline autocomplete in `.dv-auto`, row 1 selected with the GM3 focus bar, row 2 = a search for exactly what was typed, completions bold the untyped part) → Enter (popup closes at once, favicon becomes `cr_spinner` and rotates, reload becomes `cr_stop`, the old page stays until first paint) → loaded (favicon + page title, `claude.ai/new` with `/new` in `.dv-path`).
- **New Tab**: the tab has no favicon (leave `.dv-chrome__favicon` empty and it collapses); the page is `.dv-ntp` (Google wordmark, search box with mic + Lens, Gmail/Images/apps/avatar, shortcuts, Customize Chrome). When the new page loads, swap it in on first paint, with no fade.
- **Safari loading**: `.dv-safari__progress` `scaleX 0 → 1`, then fade. Start Page: empty, unfocused address field with the magnifier and "Search or enter website name" centred together (`.dv-safari__ph`).
- **Deterministic text changes** (typing, tab titles): drive them from one `onUpdate` tween over the whole timeline that computes state from time, as the demo does. No `Math.random`, no `Date.now`.

## Tokens

All colours are custom properties on `.sk-device` (`--dv-hw-*`, `--dv-ios-*`, `--dv-mac-*`, `--dv-sp-*`, `--dv-cr-*`, `--dv-g-*` (Google wordmark), `--dv-ai-*`, `--dv-tl-*`), redefined under `[data-theme="dark"]`. Override a token on a wrapper to tint something, e.g. `--dv-ios-wall` for a different wallpaper or `--dv-mac-wall` for the desktop.

## Icon names (`SKIN_ICONS_DEVICE`)

- iOS: `ios_signal ios_wifi ios_battery ios_lock ios_flashlight ios_camera`
- Menu bar: `mac_apple mac_wifi mac_battery mac_spotlight mac_control_center`
- Window / Safari: `sidebar chev_left chev_right chev_down chev_down_small share plus tabs reload page_menu close_x ellipsis search sp_shield`
- Chrome: `cr_back cr_forward cr_reload cr_stop cr_tune cr_star cr_puzzle cr_kebab cr_close cr_plus cr_tab_search cr_search cr_globe cr_history cr_spinner cr_profile cr_new_tab_favicon cr_apps cr_customize`
- Google (New Tab Page): `glyph_google_wordmark` (272 × 92, colours from `--dv-g-*`), `g_mic`, `g_lens`
- Pointer: `cursor_arrow cursor_hand cursor_ibeam`
- App / site glyphs: `glyph_openai glyph_grok glyph_claude glyph_apple glyph_github glyph_vercel glyph_google glyph_perplexity glyph_messages glyph_mail glyph_slack glyph_whatsapp`

## Demo
`demo/index.html`:
- variant 0 = iPhone lock screen, top of the phone: island, status bar, date, clock, and a List of notifications; Maya Chen (Messages, contact avatar) and then ChatGPT arrive on top, pushing the older cards down.
- variant 1 = the whole macOS screen: full Safari menu bar, a Safari Start Page window, a Grok banner slides in; the pointer hovers it, clicks its ×, the banner leaves, and a ChatGPT banner arrives.
- variant 2 = Chrome: the New Tab Page → type "clau", accept the autocomplete → claude.ai paints → click into the composer, type, click Send → the conversation view with Claude working.

The claude.ai page inside Chrome is demo content built from `research/ui-references/claude/`, not part of this skin; use the Claude skin for real Claude UI.

```
bash tools/v2/capture.sh library/_skins/device/demo <round> 5.1
```
Edit only the files in `library/_skins/device/`; `demo/assets/skins/` is a synced copy.

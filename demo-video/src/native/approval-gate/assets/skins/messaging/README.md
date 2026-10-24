# Messaging skin

Three messaging surfaces an AI agent talks to you through, as they look in October 2026:

| Surface | Root | Size (scale 1) |
|---|---|---|
| **iMessage**, Messages app on iOS 26 (Liquid Glass) | `.sk-ios.sk-imsg` | iPhone 17 Pro screen, 402 × 874 pt |
| **WhatsApp** for iOS (iOS 26 / Liquid Glass chat screen) | `.sk-ios.sk-wa` | 402 × 874 pt |
| **Slack** desktop for macOS (2023+ layout: tab rail, sidebar, channel) | `.sk-slack` | any; 1100 × 630 by default |
| Bare iPhone 17 Pro body around either iOS screen | `.msg-phone` | 430 × 902 (screen inset 14) |

No official reference folder exists for these apps (the manifest lists none), so the skin is built from knowledge of the current apps plus the official dots and Muse frames in `research/ui-references/`. `DECISIONS.md` says what is standard, what is iOS 26-specific, what was extrapolated and what changed in round 2.

## Use it in a component

```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/skins/messaging/skin.css">
<script src="assets/skins/messaging/icons.js"></script>
```

1. Copy the markup you need from `snippets.html` (open it in a browser to see every piece rendered in both themes).
2. Theme: `data-theme="light|dark"` on the root or any ancestor (the demo sets it on `<html>` from the `theme` variable).
3. Icons: write `<span data-ic="name"></span>` and call `SKIN_ICONS_MESSAGING.mount(rootEl)` once after the markup is in the DOM. Every glyph uses `currentColor`.
4. Keyboard: `<div class="ios-kb caps"></div>` and `el.innerHTML = SKIN_ICONS_MESSAGING.keyboard(['I','The','I’m'])`, then `mount()`. Update the three QuickType cells (`.p0 .p1 .p2`) as text is typed; drop `.caps` after the first letter, add it back on an empty field.
5. Present with `zoom` on a wrapper (keeps text sharp), never `transform: scale` on the same element GSAP animates.
   - **Phone:** `zoom: 1.55`. 17 pt message text lands at ~26 px and the phone spans ~35% of the frame width. The phone is 1398 px tall at that zoom, so crop it like a launch video: in the demo it sits 64 px from the top with the keyboard up (`.kb-up`), so the header, the thread, the composer and the QuickType bar + top key row are on screen and the frame edge cuts between key rows 1 and 2. With the keyboard down, crop the other way: let the phone rise off the top edge and keep the composer in frame.
   - **Slack:** `zoom: 1.72` on a 730 × 586 window (`--sl-w: 730px; --sl-h: 586px; --sl-side-w: 214px` on `.sk-slack`): 1256 × 1008 px on the frame (65% of the width), 15 px body text at ~26 px. The default window is 1100 × 630 for stills.
6. Fonts:
   - **Slack is set in Lato**, its real typeface (Slack-Lato is Lato). The skin ships Lato 400 / 400 italic / 700 / 900 (OFL) in `fonts/` and declares it in `skin.css`; nothing else to link. Use 900 for names and titles, 700 for bold UI, 400 for body. Lato only loads once something asks for it, so before measuring text call `document.fonts.load('900 15px Lato')` (and 400 / 700).
   - SF Pro (iOS) maps to **Inter** from `assets/fonts/fonts.css`; code uses **JetBrains Mono**.
7. Logos and avatars:
   - Real marks from `assets/logos/` (`grok.svg` inverted on black for the Grok Bot avatar, `github.svg` for unfurl footers).
   - Contact photos (icons.js, full colour): `av-blossie` (= `av-dots`, the dots agent's puffy cloud), `av-muse` (Muse's plush mascot), `wa-avatar` (WhatsApp's grey default), or `.ios-mono` (iOS monogram), or an `<img>`.
   - Slack people: `avatars/maya-chen.jpg`, `sam-rivera.jpg`, `priya-shah.jpg`, `jules-ortiz.jpg`, `me.jpg` (the signed-in user). These are AI-generated faces (StyleGAN), not real people. Reference them as `assets/skins/messaging/avatars/<name>.jpg` from a component.

## iOS pieces (both apps)

| Piece | Class | Notes |
|---|---|---|
| Status bar | `.ios-status` > `.ios-time`, `.ios-status-r` (`ios-signal`, `ios-wifi`, `ios-battery`) | 54 pt tall, 9:41 |
| Glass material | `.ios-glass` | Liquid Glass fill + specular rim + lift shadow. Put it on buttons, capsules, fields |
| Glass button | `.ios-btn` (+ `.back`, `.facetime`, `.count`) | 44 pt circle; `.count` makes the "‹ 3" capsule |
| Scroll edge | `.ios-edge-top` (`--edge-top-h`), `.ios-edge-bottom` | Blur + fade into `--edge-bg` behind the floating header |
| Keyboard | `.ios-kb` (+ `.caps`) | 336 pt: QuickType bar (`.ios-kb-predict`), 4 rows, emoji/dictation foot |
| Home indicator | `.ios-home` | |
| Phone body | `.msg-phone` > `.msg-phone-island`, `.msg-phone-btn.(action|volup|voldn|side|cam)` | Silver in light, graphite in dark. The device skin owns the richer phone and lock screen |

Root state: `.kb-up` on `.sk-imsg` / `.sk-wa` lifts the composer 8 pt above the keyboard and pads the thread.

## iMessage (`.sk-imsg`)

| Piece | Class | Notes |
|---|---|---|
| Header | `.imsg-head` > `.ios-btn.back`, `.imsg-av`, `.imsg-name` (glass capsule with ›), `.ios-btn.facetime` | Avatar 54 pt under the Dynamic Island |
| Thread | `.imsg-thread` | Bottom-anchored flex column; older messages slide up under the header. Clips everything below the newest message |
| Timestamp | `.imsg-stamp` | `<b>Today</b> 9:41 AM`; first stamp of a chat can read `iMessage<br>…`. Print one when more than ~1 hour separates two messages |
| Bubble row | `.imsg-row.recv` / `.imsg-row.sent` (+ `.sms` green, `.gap` between groups, `.tb` room for a tapback) | Same side, same group: no `.gap` (2 pt) |
| Bubble | `.imsg-b` (+ `.tail` on the last bubble of a group, `.emoji-only`, `.rich`) | 17 pt / 22 pt, r19, max 270 pt. Sent `#0A84FF`, received `#E9E9EB` / `#262629` |
| Receipt | `.imsg-receipt` > `span` | Under the **last** sent bubble only. "Delivered" → `<b>Read</b> 9:41 AM`; stack both spans and crossfade. Remove it when the other side replies |
| Typing | `.imsg-typing` > `i × 3` | Grey bubble with thought-bubble tail; pulse the dots in turn |
| Rich link | `.imsg-b.rich` > `.imsg-link` (`.compact` + `.imsg-link-ico`, or `.imsg-link-img` on top) | Compact = title + domain, the site's own icon right: `<div class="imsg-link-ico site" data-ic="gcal">` for calendar.google.com. `.imsg-cal` (Apple date tile) only for Apple Calendar `.ics` invites |
| Tapback | `.imsg-tapback` (+ `.grey` for someone else's) | Child of the bubble; `heart`, `thumbs-up` glyphs |
| Composer | `.imsg-composer` > `.imsg-plus`, `.imsg-field` (`.ph`, `.txt`, `.mic`, `.imsg-send`) | Idle: placeholder "iMessage" + mic. `.has-text` on the field: text + `.imsg-caret`, mic → blue ↑ |

## WhatsApp (`.sk-wa`)

| Piece | Class | Notes |
|---|---|---|
| Wallpaper | `.wa-wall` | Default doodle wallpaper on `#EFEAE2` / `#0B141A`; the nav-bar scroll edge blends into it in both themes |
| Header | `.wa-head` > `.ios-btn.back(.count)`, `.wa-title` (`.wa-av` with `data-ic="av-muse"` or an `<img>`, `.wa-name`, `.wa-sub-wrap` > `.wa-sub`), `.wa-actions-pill` (video, call) | Stack "online" and "typing…" subs and crossfade |
| Date chip | `.wa-chip` | "Today", "Yesterday" |
| Bubble | `.wa-row.in` / `.wa-row.out` (+ `.gap`) > `.wa-b` (+ `.tail`) | End with `<span class="wa-sp"></span><span class="wa-meta">9:41 …</span>`. The bubble hugs its text; the spacer is the meta's width (34 pt in, 52 pt out), so a short message keeps its time inline |
| Ticks | `wa-tick` (sent), `wa-ticks` (delivered), `.wa-meta.read` (blue `#53BDEB`) | |
| Typing | `.wa-typing` > `i × 3` | |
| Link preview | `.wa-preview` (`.wa-preview-img` optional) > `.wa-preview-body` (title, desc, url) then `.lnk` | |
| Composer | `.wa-composer` > `.wa-plus`, `.wa-field` (`.ph`, `.txt`, `wa-sticker`), `.wa-icon × 2` (camera, mic), `.wa-send` | `.has-text` on `.wa-composer`: camera + mic hide, green send shows |

## Slack (`.sk-slack`)

| Piece | Class | Notes |
|---|---|---|
| Title bar | `.sl-top` > `.sl-lights`, `.sl-search-wrap` (`.sl-history`, `.sl-search`), `.sl-top-r` | |
| Tab rail | `.sl-rail` > `.sl-ws`, `.sl-tab(.on)` > `.sl-tab-ic` (+ `.dot`), `.sl-rail-foot` (`.sl-new`, `.sl-me` > `<img>`) | Home, DMs, Activity, Files, More |
| Panel | `.sl-panel` (`--sl-side-w`, default 250) > `.sl-side` + `.sl-main` | Rounded inset into the aubergine frame |
| Sidebar | `.sl-side-head`, `.sl-item` (`.on`, `.unread`, `.sl-badge`, `.mini`; `.mini.photo` > `<img>` for people), `.sl-sec` | |
| Channel header | `.sl-ch-head` > `.sl-ch-name`, `.sl-ch-r` (`.sl-members`, `.sl-huddle`, `.sl-icon-btn`) | |
| Tabs | `.sl-tabs` > `span(.on)` | Messages · Add canvas · Files · + (drop Files in a narrow window) |
| List | `.sl-list` (bottom-anchored) > `.sl-day`, `.sl-msg` (`.cont`, `.hl`) | |
| Message | `.sl-av` (`<img>` photo, or a bot mark on a tile), `.sl-msg-head` (`.sl-name` 900, `.sl-app` "APP", `.sl-time`), `.sl-text` (`code`, `.sl-mention`, `a`) | |
| Unfurl | `.sl-unfurl` (`--bar`) > `.sl-unfurl-author` (round 16 px icon + name), `.sl-unfurl-title`, `.sl-unfurl-desc` (optional), `.sl-unfurl-foot` (service icon, `owner/repo`, `<i>|</i>`, "Added by GitHub") | The GitHub app's PR unfurl: green `#1F883D` bar for an open PR |
| Extras | `.sl-card`, `.sl-btns` > `.sl-btn(.primary)`, `.sl-reacts` > `.sl-react(.mine/.add)`, `.sl-thread` (`.faces` with photos) | |
| Composer | `.sl-composer(.focus)` > `.sl-fmt`, `.sl-input` (`.ph` or text + `.sl-caret`), `.sl-bar` (… `.sl-send(.ready)`) | Green split send button when there is text |
| Typing line | `.sl-typing` | "**Grok Bot** is typing…" |

## Motion recipes (as in `demo/index.html`)

- **Typing into a field:** one linear driver tween over the whole timeline whose `onUpdate` computes the typed string from time (a fixed per-character schedule with a small deterministic jitter), toggles `.has-text`, `.caps` and the QuickType cells. Seek-safe; no `Math.random`.
- **Insert a message (send or reply):** append it at the end of the thread inside a wrapper (`.rv`, `justify-content: flex-end`). Grow the wrapper's height 0 → measured height (`power3.out`, ~0.34 s) so the list scrolls up, and draw the bubble **whole, in place**: opacity 0 → 1 and scale 0.95 → 1 from its tail corner, starting ~40% into the growth. Never slide it up from the composer; the phone threads clip everything below the newest message.
- **Send:** press the send button (scale 0.86 for 90 ms, back in 120 ms), clear the field, then insert the bubble. If over an hour has passed since the previous message, insert a `.imsg-stamp` in the same wrapper.
- **Reply:** typing indicator in (scale 0.7 → 1), dots pulse in turn every 0.6 s, collapse it as the reply is inserted. iMessage: collapse the Delivered/Read receipt at the same moment.
- **Read receipts / ticks:** crossfade "Delivered" → "Read 9:41 AM"; WhatsApp: one tick → two grey → blue.
- **Slack streaming:** wrap words in spans, fade them in 1–3 at a time every ~75 ms, and grow the message wrapper line by line with `overflow: hidden` (measure line bottoms once with `offsetTop`). The unfurl and the reactions each open their space, then fade in whole.

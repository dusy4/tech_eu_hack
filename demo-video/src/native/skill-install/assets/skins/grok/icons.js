/* Grok + Grok Bot skin icons.
   window.SKIN_ICONS_GROK = { name: "<svg …>" }.
   Line icons: 24×24 viewBox, stroke = currentColor, round caps. Size them with CSS (width/height on the svg).
   Bot avatars ("bot-*"): 64×64, body = currentColor, eyes use class "eye"/"eye-dot" (colour var(--gb-eye), set by skin.css).
   Helpers: SKIN_ICONS_GROK.avatar(shape, color, size) returns a sized avatar string. */
(function () {
  const L = (body, sw) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.75) +
    '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  const F = (body, vb) =>
    '<svg viewBox="' + (vb || "0 0 24 24") + '" fill="currentColor" aria-hidden="true">' + body + "</svg>";

  // Eyes: two thick, slightly slanted rounded dashes that read as cut-outs (stroke var(--gb-eye), set by
  // skin.css: white in light, near-black in dark). Measured on the @grok streams: each eye is ~22% of the
  // avatar tall, the pair ~28% apart, sitting right of centre on most bots.
  // EYES([x1, y1], [x2, y2], h, w): centres, dash height and stroke width in the 64-unit box.
  const EYE = (cx, cy, h) => { const d = (h / 2), s = d * 0.16; return "M" + (cx - s).toFixed(2) + " " + (cy - d).toFixed(2) + "L" + (cx + s).toFixed(2) + " " + (cy + d).toFixed(2); };
  const EYES = (l, r, h, w) => '<path class="eye" stroke-width="' + (w || 5.4) + '" d="' + EYE(l[0], l[1], h || 8.6) + EYE(r[0], r[1], h || 8.6) + '"/>';
  // Round dot eyes (team bots such as "GTM Helper").
  const DOTS = (l, r, rad) => '<circle class="eye-dot" cx="' + l[0] + '" cy="' + l[1] + '" r="' + rad + '"/><circle class="eye-dot" cx="' + r[0] + '" cy="' + r[1] + '" r="' + rad + '"/>';
  // Body: filled shape plus a fat round-joined stroke of the same colour, which gives the soft rounded
  // corners of the real blobs. Bodies fill ~92% of the 64-unit box like the reference avatars.
  const AV = (shape, eyes, sw) =>
    '<svg class="gb-av-svg" viewBox="0 0 64 64" aria-hidden="true"><g fill="currentColor" stroke="currentColor" stroke-width="' + (sw || 11) + '" stroke-linejoin="round">' +
    shape + '</g><g fill="none" stroke-linecap="round">' + eyes + "</g></svg>";

  const I = {
    /* ---------- brand ---------- */
    // Grok mark (slashed circle). Same geometry as assets/logos/grok.svg.
    grok: F('<path fill-rule="evenodd" d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"/>'),

    /* ---------- grok.com header ---------- */
    imagine: L('<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="15.2" cy="8.9" r="1.7" fill="currentColor" stroke="none"/><path d="M3.8 15.6c2.4-2.2 5-2.9 7.6-.9 1.4 1.1 2 2.6 2.1 5.6"/>', 2),
    settings: L('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>', 2),
    share: L('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>'),

    /* ---------- composer ---------- */
    plus: L('<path d="M12 4.5v15M4.5 12h15"/>', 1.6),
    chevronDown: L('<path d="m6 9 6 6 6-6"/>', 1.75),
    chevronUp: L('<path d="m18 15-6-6-6 6"/>', 1.75),
    chevronRight: L('<path d="m9 18 6-6-6-6"/>', 1.75),
    arrowUp: L('<path d="M12 19V5.5M5.5 12 12 5.5 18.5 12"/>', 2),
    arrowDown: L('<path d="M12 5v13.5M5.5 12 12 18.5 18.5 12"/>', 2),
    stop: F('<rect x="7" y="7" width="10" height="10" rx="2"/>'),
    check: L('<path d="M20 6 9 17l-5-5"/>', 1.75),
    mic: L('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>'),
    paperclip: L('<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>'),
    // Voice / "Speak" waveform (filled bars)
    waveform: F('<rect x="3" y="9.5" width="2" height="5" rx="1"/><rect x="7" y="6" width="2" height="12" rx="1"/><rect x="11" y="3" width="2" height="18" rx="1"/><rect x="15" y="7" width="2" height="10" rx="1"/><rect x="19" y="10" width="2" height="4" rx="1"/>'),

    /* ---------- mode menu (Fast / Auto / Expert / Heavy) ---------- */
    fast: L('<path d="M13.2 2.6 4.6 13.4a.6.6 0 0 0 .47.98H11l-1.2 7.1a.3.3 0 0 0 .54.22l8.6-10.8a.6.6 0 0 0-.47-.98H12.6l1.14-7.1a.3.3 0 0 0-.54-.22Z"/>', 1.6),
    auto: L('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>', 1.6),
    expert: L('<path d="M15 14.5c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8.5c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 21.5h4"/>', 1.6),
    heavy: L('<rect x="3.5" y="10" width="6.5" height="5.25" rx="1.4"/><rect x="3.5" y="15.25" width="6.5" height="5.25" rx="1.4"/><rect x="10" y="15.25" width="6.5" height="5.25" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>', 1.6),

    /* ---------- logged-out gate feature list ---------- */
    imageSparkle: L('<path d="M20.5 11V8a4.5 4.5 0 0 0-4.5-4.5H8A4.5 4.5 0 0 0 3.5 8v8A4.5 4.5 0 0 0 8 20.5h3"/><circle cx="9" cy="9.5" r="1.4"/><path d="M3.8 15.5 7 12.6a2 2 0 0 1 2.7 0l2.3 2.1"/><path d="M17.5 13.5v7M14 17h7"/>', 1.6),
    skills: L('<rect x="3.5" y="10" width="6.5" height="5.25" rx="1.4"/><rect x="3.5" y="15.25" width="6.5" height="5.25" rx="1.4"/><rect x="10" y="15.25" width="6.5" height="5.25" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/>', 1.6),
    file: L('<path d="M14.5 3.5H8A2.5 2.5 0 0 0 5.5 6v12A2.5 2.5 0 0 0 8 20.5h8a2.5 2.5 0 0 0 2.5-2.5V7.5z"/><path d="M14 3.5V8h4.5"/>', 1.6),
    chat: L('<path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5Z"/>', 1.6),

    /* ---------- logged-in sidebar (extrapolated) ---------- */
    search: L('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/>'),
    newChat: L('<path d="M12 3.5H6A2.5 2.5 0 0 0 3.5 6v12A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5v-6"/><path d="M18.4 3.1a2.1 2.1 0 0 1 3 3l-8.6 8.6-3.9 1 1-3.9Z"/>'),
    voice: L('<path d="M2.5 10v3"/><path d="M6.5 6v11"/><path d="M10.5 3v18"/><path d="M14.5 8v7"/><path d="M18.5 5v13"/><path d="M22 10v3"/>'),
    projects: L('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
    history: L('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
    sidebar: L('<rect x="3" y="3.5" width="18" height="17" rx="3.5"/><path d="M9.5 3.5v17"/>'),

    /* ---------- assistant action row ---------- */
    refresh: L('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3.5v5h-5"/>'),
    copy: L('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>'),
    thumbUp: L('<path d="M7 10v11.5"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>'),
    thumbDown: L('<path d="M17 14V2.5"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>'),
    more: F('<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>'),

    /* ---------- iOS ---------- */
    menu: L('<path d="M5 9h14M5 15h14"/>', 2),
    compose: L('<path d="M12 3.5H6.5a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3V12"/><path d="M18.4 3.1a2.1 2.1 0 0 1 3 3l-8.6 8.6-3.9 1 1-3.9Z"/>', 2),
    xVerified: F('<path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.35 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.19 3.91-.82s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34Z"/><path fill="#fff" d="m10.54 16.2-3.75-3.74 1.41-1.42 2.25 2.25 4.96-5.4 1.47 1.36z"/>'),
    xReply: L('<path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5Z"/>', 1.6),
    xRepost: L('<path d="m17 2.5 3.5 3.5L17 9.5"/><path d="M3.5 11V9a3 3 0 0 1 3-3h14"/><path d="m7 21.5-3.5-3.5L7 14.5"/><path d="M20.5 13v2a3 3 0 0 1-3 3h-14"/>', 1.6),
    xLike: L('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>', 1.6),
    xViews: L('<path d="M5 20.5V12M10 20.5V4.5M15 20.5V9M20 20.5v-5"/>', 1.6),

    /* ---------- Grok Bot ---------- */
    emoji: L('<circle cx="12" cy="12" r="9.5"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.4"/>', 1.6),
    reply: L('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', 1.6),
    monitor: L('<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 16.5v4"/>', 1.6),
    link: L('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', 1.8),
    team: L('<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M12 11h.01M15 11h.01M10.5 21v-4h3v4"/>', 1.6),
    key: L('<circle cx="7.5" cy="12" r="3.5"/><path d="M11 12h10.5M18 12v3M21 12v2.5"/>', 1.6),
    cube: L('<path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4Z"/><path d="M12 12 4.3 7.6M12 12l7.7-4.4M12 12v9"/>', 1.6),
    cloudDown: L('<path d="M12 13v8l-3.5-3.5M12 21l3.5-3.5"/><path d="M4.4 15.1A6.5 6.5 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.24"/>', 1.8),
    close: L('<path d="M18 6 6 18M6 6l12 12"/>', 1.75),
    star: F('<path d="M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.87 6.5 19.75l1.05-6.12L3.1 9.3l6.15-.9Z"/>'),
    stopRec: F('<rect x="4" y="4" width="16" height="16" rx="2.5"/>'),
    dot: F('<circle cx="12" cy="12" r="4"/>'),

    /* ---------- Grok Bot "Connect apps" stacked app marks (brand colours baked in) ---------- */
    appDrive: '<svg viewBox="0 0 87.3 78" aria-hidden="true"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>',
    appGmail: '<svg viewBox="52 42 88 66" aria-hidden="true"><path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/><path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/><path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/><path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/><path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/></svg>',
    appGithub: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.08 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"/></svg>',

    /* ---------- Grok Bot avatars (blobs with cut-out eyes) ---------- */
    // bobo (primary bot): lumpy cloud, eyes high and right of centre
    "bot-cloud": AV('<ellipse cx="34" cy="38" rx="26" ry="20" stroke="none"/><circle cx="22" cy="25" r="14" stroke="none"/><circle cx="41" cy="21" r="15" stroke="none"/><circle cx="12.5" cy="38" r="10" stroke="none"/>', EYES([33.5, 25], [44.5, 24.5], 9, 6.6)),
    // maya: rounded hexagon tilted ~15°, big eyes on the centre line
    "bot-hex": AV('<path d="M37.8 10.3 53.7 26.2 47.9 47.9 26.2 53.7 10.3 37.8 16.1 16.1Z"/>', EYES([27, 33.5], [39.5, 32.5], 10, 7.2)),
    // penny: soft circle, small eyes up and to the right
    "bot-round": AV('<ellipse cx="32" cy="32.5" rx="29" ry="28" stroke="none"/>', EYES([38, 22], [47, 21.5], 7, 5.6)),
    // dex: irregular rounded heptagon, eyes left of centre
    "bot-octa": AV('<path d="M28.0 9.3 47.7 14.2 54.3 33.1 45.7 51.0 25.8 54.1 11.2 40.8 11.2 20.7Z"/>', EYES([25.5, 32.5], [38.5, 31.5], 10.5, 7.4)),
    // droplet (e.g. a purple "Dex"), eyes up and to the right
    "bot-drop": AV('<path d="M35 6C49 10 59 25 59 38 59 52 47 60 32 60 17 60 5 51 5 37 5 23 20 3 35 6Z" stroke="none"/>', EYES([38, 24], [47, 23.5], 7.5, 5.6)),
    "bot-pill": AV('<rect x="8" y="20" width="48" height="24" rx="12"/>', EYES([27, 32], [37, 31.5], 8, 6)),
    // team bot ("GTM Helper"): house-shaped pentagon with round dot eyes low on the left
    "bot-house": AV('<path d="M32 8.5 55.5 22V55.5H8.5V22Z"/>', DOTS([20, 43], [35, 43], 4.6), 8),
    "bot-leaf": AV('<path d="M55.0 32.0 43.5 51.9 20.5 51.9 9.0 32.0 20.5 12.1 43.5 12.1Z"/>', EYES([28, 32], [39.5, 31.5], 9.5, 7)),
    // "Sample support bot": rounded triangle pointing right, eyes lying almost flat near the top
    "bot-tri": AV('<path d="M17 10C24 9 47 24 54 33 57 37 51 41 44 44 33 49 19 55 13 54 9 53 9 40 10 30 11 20 12 11 17 10Z"/>', '<path class="eye" stroke-width="5.2" d="M26 20 30 24.5M38.5 22.5 42.5 27"/>', 9),
    // the stock "Grok Bot" bot: black ball, small eyes up and to the right
    "bot-grok": AV('<circle cx="32" cy="32" r="29" stroke="none"/>', EYES([39, 19], [48, 18.5], 7, 5.2)),
  };

  /* avatar(shape, colour, size) → sized avatar markup. shape: cloud|hex|round|octa|drop|pill|house|leaf|tri|grok */
  I.avatar = function (shape, color, size) {
    const svg = I["bot-" + shape] || I["bot-round"];
    return '<span class="gb-av" style="color:' + color + ";width:" + size + "px;height:" + size + 'px">' + svg + "</span>";
  };

  /* hydrate(root): replace every <i data-ic="name" class="…" id="…"> with the inline svg (class/id kept),
     and every <span data-av="hex" data-color="#f5b24c" data-size="42" [data-online]> with a bot avatar. */
  I.hydrate = function (root) {
    root = root || document;
    root.querySelectorAll("[data-ic]").forEach(function (el) {
      const t = document.createElement("template");
      t.innerHTML = (I[el.dataset.ic] || "").trim();
      const svg = t.content.firstChild;
      if (!svg) return;
      if (el.getAttribute("class")) svg.setAttribute("class", el.getAttribute("class"));
      if (el.id) svg.id = el.id;
      el.replaceWith(svg);
    });
    root.querySelectorAll("[data-av]").forEach(function (el) {
      const t = document.createElement("template");
      t.innerHTML = I.avatar(el.dataset.av, el.dataset.color, +el.dataset.size).trim();
      const av = t.content.firstChild;
      if (el.getAttribute("style")) av.setAttribute("style", av.getAttribute("style") + ";" + el.getAttribute("style"));
      if (el.getAttribute("class")) av.className = "gb-av " + el.getAttribute("class");
      if (el.id) av.id = el.id;
      if (el.dataset.online != null) { const d = document.createElement("span"); d.className = "gb-online"; av.appendChild(d); }
      if (el.dataset.badge != null) { const d = document.createElement("span"); d.className = "gb-badge"; d.innerHTML = I.star; av.appendChild(d); }
      el.replaceWith(av);
    });
  };

  window.SKIN_ICONS_GROK = I;
})();

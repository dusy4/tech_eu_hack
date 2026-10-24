/* ChatGPT skin — icon set (Oct 2026)
 * window.SKIN_ICONS_CHATGPT            : { name: "<svg …>" } inline SVG strings, 24×24 viewBox, currentColor.
 * window.SKIN_ICONS_CHATGPT.mount(root) : fills every empty <i class="cg-i" data-i="name"> under root (non-enumerable).
 * window.SKIN_ICONS_CHATGPT.svg(name)   : returns one SVG string (non-enumerable).
 *
 * Line icons are drawn against the official frames in research/ui-references/chatgpt:
 * 1.7-unit strokes on a 24 grid, round caps and joins. The OpenAI knot uses the same path as
 * assets/logos/openai.svg. The voice waveform's bar ratios are measured from the iOS frame.
 * Deterministic: no randomness, no clocks. Every <mask>/<gradient> id is unique per icon.
 */
(function () {
  var S = function (body, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + body + '</svg>';
  };
  var F = function (body, vb) {
    return '<svg viewBox="' + (vb || '0 0 24 24') + '" fill="currentColor" aria-hidden="true">' + body + '</svg>';
  };
  var KNOT = 'M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z';
  var SHIELD = 'M12 3.4 5.3 5.9v5.5c0 4.2 2.8 7.4 6.7 9.1 3.9-1.7 6.7-4.9 6.7-9.1V5.9Z';

  var I = {
    /* ── composer ─────────────────────────────────────────── */
    plus: S('<path d="M12 4.8v14.4M4.8 12h14.4"/>', ' stroke-width="1.75"'),
    mic: S('<rect x="9" y="3.2" width="6" height="11.2" rx="3"/><path d="M5.6 11.2a6.4 6.4 0 0 0 12.8 0M12 17.6v3.2"/>'),
    'mic-off': S('<path d="M15 9.4V6.2a3 3 0 0 0-5.7-1.3M9 9v2.2a3 3 0 0 0 5.1 2.1M18.4 11.2a6.4 6.4 0 0 1-1 3.4M5.6 11.2a6.4 6.4 0 0 0 10.5 4.9M12 17.6v3.2M4 4l16 16"/>'),
    /* voice mode: four bars (short, tallest, tall, short) — ratios measured from the iOS frame */
    voice: S('<path d="M4.8 9.9v4.2M9.6 4.1v15.8M14.4 7v10M19.2 9.9v4.2"/>', ' stroke-width="2"'),
    send: S('<path d="M12 19.2V5.2M5.9 11.2 12 5.1l6.1 6.1"/>', ' stroke-width="2.2"'),
    stop: F('<rect x="6.6" y="6.6" width="10.8" height="10.8" rx="2.2"/>'),
    'chevron-down': S('<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>'),
    'chevron-up': S('<path d="m6.5 14.5 5.5-5.5 5.5 5.5"/>'),
    'chevron-right': S('<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>'),
    'chevron-left': S('<path d="m14.5 6.5-5.5 5.5 5.5 5.5"/>'),
    'arrow-left': S('<path d="M19 12H5.5M11 6.2 5.2 12l5.8 5.8"/>'),
    'arrow-right': S('<path d="M5 12h13.5M13 6.2l5.8 5.8-5.8 5.8"/>'),
    'arrow-down': S('<path d="M12 5v13.5M6.2 13 12 18.8l5.8-5.8"/>', ' stroke-width="1.9"'),
    'trend-up': S('<path d="m3.5 17 5.6-5.6 3.8 3.8 7.6-7.6M14.6 7.6h5.9v5.9"/>', ' stroke-width="1.9"'),
    attach: S('<path d="m16.5 10.5-6.2 6.2a2.6 2.6 0 0 1-3.7-3.7l7-7a4.2 4.2 0 0 1 6 6l-7 7a5.8 5.8 0 0 1-8.2-8.2l6.3-6.3"/>'),
    check: S('<path d="m5 12.6 4.4 4.4L19 7.4"/>', ' stroke-width="1.9"'),
    close: S('<path d="M6 6l12 12M18 6 6 18"/>', ' stroke-width="1.9"'),

    /* ── message actions ──────────────────────────────────── */
    copy: S('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2"/>'),
    'thumb-up': S('<path d="M7.5 10.5v9.5M15 5.9 14.2 10h5a2 2 0 0 1 1.9 2.5l-1.8 6.2A2 2 0 0 1 17.4 20H5a1.5 1.5 0 0 1-1.5-1.5V12A1.5 1.5 0 0 1 5 10.5h2.2a2 2 0 0 0 1.8-1.1L11.6 4a2.4 2.4 0 0 1 3.4 1.9Z"/>'),
    'thumb-down': S('<path d="M16.5 13.5V4M9 18.1 9.8 14h-5a2 2 0 0 1-1.9-2.5l1.8-6.2A2 2 0 0 1 6.6 4H19a1.5 1.5 0 0 1 1.5 1.5V12a1.5 1.5 0 0 1-1.5 1.5h-2.2a2 2 0 0 0-1.8 1.1L12.4 20A2.4 2.4 0 0 1 9 18.1Z"/>'),
    speaker: S('<path d="M11 5 6.6 8.5H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2.6L11 19Z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.5 6.2a8.2 8.2 0 0 1 0 11.6"/>'),
    share: S('<path d="M12 14.6V3.9M7.6 8.1 12 3.7l4.4 4.4M5 12.6v5.6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.6"/>'),
    regenerate: S('<path d="M20 12a8 8 0 1 1-2.6-5.9L20 8.5"/><path d="M20 3.8v4.7h-4.7"/>'),
    more: F('<circle cx="5.4" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.6" cy="12" r="1.6"/>'),
    'more-vert': F('<circle cx="12" cy="5.4" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18.6" r="1.6"/>'),
    branch: S('<circle cx="6.5" cy="5.5" r="2"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="17.5" cy="8.5" r="2"/><path d="M6.5 7.5v9M17.5 10.5c0 3.5-4 3.5-8.5 6"/>'),

    /* ── chatgpt.com rail (Chat) ─────────────────────────── */
    knot: F('<path d="' + KNOT + '"/>'),
    edit: S('<path d="M11.4 4.2H6.6a2.4 2.4 0 0 0-2.4 2.4v10.8a2.4 2.4 0 0 0 2.4 2.4h10.8a2.4 2.4 0 0 0 2.4-2.4v-4.8"/><path d="M17.7 3.7a1.9 1.9 0 0 1 2.7 2.7l-7.3 7.3-3.4.8.8-3.4Z"/>'),
    search: S('<circle cx="10.8" cy="10.8" r="6.6"/><path d="m20 20-4.4-4.4"/>'),
    library: S('<rect x="3.8" y="3.8" width="7" height="7" rx="2"/><rect x="13.2" y="3.8" width="7" height="7" rx="3.5"/><rect x="3.8" y="13.2" width="7" height="7" rx="2"/><rect x="13.2" y="13.2" width="7" height="7" rx="2"/>'),
    pin: S('<path d="m14.2 3.6 6.2 6.2M15.4 4.8l-3.9 4.4-4.3.4-1.6 1.6 7 7 1.6-1.6.4-4.3 4.4-3.9M8.9 15.1 3.6 20.4"/>'),
    chat: S('<path d="M12 3.6a8.4 8.4 0 0 1 0 16.8c-1.4 0-2.7-.34-3.9-.95L3.7 20.3l.9-4.1A8.4 8.4 0 0 1 12 3.6Z"/>'),
    'chat-dashed': S('<path d="M12 3.6a8.4 8.4 0 0 1 0 16.8c-1.4 0-2.7-.34-3.9-.95L3.7 20.3l.9-4.1A8.4 8.4 0 0 1 12 3.6Z" stroke-dasharray="2.4 2.6"/>'),
    personalize: S('<circle cx="12" cy="12" r="8.4"/><path d="M8.6 13.6c.9 1.3 2 1.9 3.4 1.9s2.5-.6 3.4-1.9M9.3 9.6h.01M14.7 9.6h.01"/>'),
    scheduled: S('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l2.9 1.9"/>'),
    project: S('<path d="M3.6 7.4a2 2 0 0 1 2-2h3.9l2 2.2h6.9a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z"/>'),

    /* ── desktop rail (Work) ─────────────────────────────── */
    home: S('<path d="M4.2 10.2 12 4l7.8 6.2V19a1.5 1.5 0 0 1-1.5 1.5H15v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H5.7A1.5 1.5 0 0 1 4.2 19Z"/>'),
    'home-fill': F('<path d="M11.06 3.05a1.5 1.5 0 0 1 1.88 0l7.5 6a1.5 1.5 0 0 1 .56 1.17V19a2 2 0 0 1-2 2h-3.6v-5.4a1.5 1.5 0 0 0-1.5-1.5h-3.8a1.5 1.5 0 0 0-1.5 1.5V21H5a2 2 0 0 1-2-2v-8.78a1.5 1.5 0 0 1 .56-1.17Z"/>'),
    space: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><defs><mask id="cgSpM" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><rect x="9.2" y="3.2" width="11" height="14.5" rx="2.4" transform="rotate(13 14.7 10.45)" fill="#000" stroke="#000" stroke-width="3.4"/></mask></defs><g mask="url(#cgSpM)"><rect x="3.6" y="6.4" width="11" height="14.5" rx="2.4" transform="rotate(-11 9.1 13.65)"/></g><rect x="9.2" y="3.2" width="11" height="14.5" rx="2.4" transform="rotate(13 14.7 10.45)"/></svg>',
    'space-fill': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><defs><mask id="cgSpF" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><rect x="9.2" y="3.2" width="11" height="14.5" rx="2.4" transform="rotate(13 14.7 10.45)" fill="#000" stroke="#000" stroke-width="3.2"/></mask></defs><g mask="url(#cgSpF)"><rect x="3.6" y="6.4" width="11" height="14.5" rx="2.4" transform="rotate(-11 9.1 13.65)"/></g><rect x="9.2" y="3.2" width="11" height="14.5" rx="2.4" transform="rotate(13 14.7 10.45)"/></svg>',
    clock: S('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l-2 3"/>'),
    /* plugins: a hooked "@" ring (open at the lower right, its right side curls in like the @ stem)
       with a plug at 45deg inside, prongs up-left (desktop rail + chatgpt.com Work rail, measured) */
    plug: S('<path d="M16.6 20.2A9 9 0 1 1 21 12.4c0 1.7-1.2 3-2.8 3-.8 0-1.5-.3-2-.8"/><g transform="translate(11.5 12.4) rotate(-45)"><rect x="-2.8" y="-2.5" width="5.6" height="5.2" rx="1.6"/><path d="M-1.2-2.5v-2.3M1.2-2.5v-2.3M0 2.7v1.4"/></g>', ' stroke-width="1.6"'),
    at: S('<circle cx="12" cy="12" r="3.6"/><path d="M15.6 8.5v4.4a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.4 7"/>'),
    pr: S('<circle cx="6.5" cy="5.6" r="2.2"/><circle cx="6.5" cy="18.4" r="2.2"/><circle cx="17.5" cy="18.4" r="2.2"/><path d="M6.5 7.8v8.4M13 5.6h2.5a2 2 0 0 1 2 2v8.6M15 3.6l-2 2 2 2"/>'),
    calendar: S('<rect x="3.6" y="5" width="16.8" height="15.4" rx="2.6"/><path d="M3.6 10h16.8M8 3v3.4M16 3v3.4"/>'),
    sidebar: S('<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="3"/><path d="M8.6 8.4v7.2"/>'),
    'panel-right': S('<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="3"/><path d="M14.6 4.6v14.8"/>'),
    'new-tab': S('<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3"/><path d="M12 8.4v7.2M8.4 12h7.2"/>'),
    gauge: S('<path d="M5 18.3a8.4 8.4 0 1 1 14 0"/><path d="m12 14 3.4-3.6"/><circle cx="12" cy="14" r="0.6" fill="currentColor"/>'),
    checklist: S('<circle cx="6.2" cy="7.2" r="2.2"/><circle cx="6.2" cy="16.8" r="2.2"/><path d="M11.4 7.2H20M11.4 16.8H20"/>'),
    expand: S('<path d="M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5 13.5 10.5M4.5 19.5l6-6"/>'),

    /* ── Work composer, artifacts, Space ─────────────────── */
    laptop: S('<rect x="4.6" y="5.6" width="14.8" height="10.2" rx="1.6"/><path d="M2.6 19h18.8"/>'),
    folder: S('<path d="M3.6 7.4a2 2 0 0 1 2-2h3.9l2 2.2h6.9a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2Z"/>'),
    cloud: S('<path d="M17.5 18.5H8a5.5 5.5 0 1 1 5.2-7.3h1.3a3.7 3.7 0 0 1 3 7.3Z"/>'),
    globe: S('<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.3 2.3 3.4 5.2 3.4 8.6s-1.1 6.3-3.4 8.6c-2.3-2.3-3.4-5.2-3.4-8.6S9.7 5.7 12 3.4Z"/>'),
    'shield-check': S('<path d="' + SHIELD + '"/><path d="m9.1 12 2.1 2.1 3.9-4"/>'),
    /* "Approve for me": shield with a small prompt mark */
    approve: S('<path d="' + SHIELD + '"/><path d="m9.4 10 2 1.8-2 1.8M12.8 14.2h2"/>'),
    gear: S('<circle cx="12" cy="12" r="3"/><path d="M12 2.8 13.6 5l2.6-.6.8 2.6 2.6.8-.6 2.6 2.2 1.6-2.2 1.6.6 2.6-2.6.8-.8 2.6-2.6-.6L12 21.2 10.4 19l-2.6.6-.8-2.6-2.6-.8.6-2.6L2.8 12 5 10.4l-.6-2.6 2.6-.8.8-2.6 2.6.6Z"/>'),
    bolt: S('<path d="M13.2 2.8 4.6 13.2h6.6l-1 8 8.6-10.4h-6.6Z"/>'),
    'bolt-fill': F('<path d="M13.2 2.8 4.6 13.2h6.6l-1 8 8.6-10.4h-6.6Z"/>'),
    page: S('<rect x="5" y="3.6" width="14" height="16.8" rx="2.6"/><path d="M8.8 9.6h6.4M8.8 13.2h6.4"/>'),
    image: S('<rect x="3.6" y="4" width="16.8" height="16" rx="2.6"/><circle cx="9" cy="9.5" r="1.7"/><path d="m4 17 4.6-4.4a1.5 1.5 0 0 1 2.1 0L14 16l2-1.8a1.5 1.5 0 0 1 2 0l2.5 2.3"/>'),
    sites: S('<rect x="3.6" y="3.6" width="7" height="7" rx="1.8"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.8"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.8"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.8"/>'),
    all: S('<path d="M5 4.5v15M9 4.5v15"/><path d="m12.6 5.2 3.6-.9 3.7 14.6-3.6.9Z"/>'),
    stack: S('<rect x="3.6" y="4" width="16.8" height="16" rx="2.6"/><path d="M3.6 8.6h16.8M3.6 13.2h16.8"/>'),
    bell: S('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>'),
    trash: S('<path d="M4.5 6.5h15M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.7M6.5 6.5l.8 12.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8l.8-12.2"/>'),
    sparkle: S('<path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5Z"/>'),
    external: S('<path d="M13.5 4.5h6v6M19.5 4.5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
    telescope: S('<path d="m4.2 13.4 12.4-6.6 1.9 3.5-12.4 6.6ZM16.6 6.8l2.6-1.4 2 3.6-2.7 1.3M10 16.4l-2.2 4.2M11.6 15.6l2.6 5"/>'),
    terminal: S('<path d="m6 8.5 3.5 3.5L6 15.5M12 16h6"/>'),
    code: S('<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5"/>'),
    book: S('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z"/>'),
    brain: S('<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.3A3 3 0 0 0 6.5 18 3 3 0 0 0 12 19V6a2 2 0 0 0-3-1.5ZM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.3 3 3 0 0 1-2.5 5.2A3 3 0 0 1 12 19"/>'),
    mail: S('<rect x="3.5" y="5.5" width="17" height="13" rx="2.4"/><path d="m4.5 7 7.5 6 7.5-6"/>'),

    /* ── iOS, voice mode, dots ───────────────────────────── */
    menu: S('<path d="M4.6 9h14.8M4.6 15h9"/>', ' stroke-width="1.9"'),
    sliders: S('<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>'),
    'person-circle': S('<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="10" r="3"/><path d="M6.6 18.6a6.4 6.4 0 0 1 10.8 0"/>'),
    'phone-end': F('<path d="M12 9c3.6 0 6.8 1 8.9 2.6.7.5.9 1.4.6 2.2l-.6 1.6a1.4 1.4 0 0 1-1.6.9l-2.7-.6a1.4 1.4 0 0 1-1.1-1.2l-.2-1.6c-1-.3-2.1-.5-3.3-.5s-2.3.2-3.3.5l-.2 1.6a1.4 1.4 0 0 1-1.1 1.2l-2.7.6a1.4 1.4 0 0 1-1.6-.9l-.6-1.6c-.3-.8-.1-1.7.6-2.2C5.2 10 8.4 9 12 9Z"/>'),
    'speaker-fill': F('<path d="M11.5 4.6a.6.6 0 0 1 1 .5v13.8a.6.6 0 0 1-1 .5L7 15.5H4.2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1H7Z"/><path d="M16 8.6a4.8 4.8 0 0 1 0 6.8M18.8 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
    video: S('<rect x="3" y="6.5" width="12.5" height="11" rx="2.4"/><path d="m15.5 10.5 5-3v9l-5-3"/>'),
    camera: S('<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="3.4"/>'),
    signal: F('<rect x="1" y="9" width="3" height="4" rx="1"/><rect x="6" y="6.5" width="3" height="6.5" rx="1"/><rect x="11" y="4" width="3" height="9" rx="1"/><rect x="16" y="1" width="3" height="12" rx="1"/>', '0 0 20 14'),
    wifi: F('<path d="M10 3.2c2.9 0 5.5 1.1 7.5 2.9l1.4-1.5A12.6 12.6 0 0 0 10 1 12.6 12.6 0 0 0 1.1 4.6l1.4 1.5A10.9 10.9 0 0 1 10 3.2Zm0 4.1c1.8 0 3.4.7 4.6 1.8l1.5-1.5A8.7 8.7 0 0 0 10 5.1c-2.4 0-4.5.9-6.1 2.5l1.5 1.5A6.6 6.6 0 0 1 10 7.3Zm0 4.2c.8 0 1.4.3 1.9.8L10 14.2l-1.9-1.9c.5-.5 1.1-.8 1.9-.8Z"/>', '0 0 20 14'),
    battery: '<svg viewBox="0 0 28 14" aria-hidden="true"><rect x="0.6" y="0.6" width="23.4" height="12.8" rx="3.8" fill="none" stroke="currentColor" stroke-opacity="0.38" stroke-width="1.2"/><rect x="2.4" y="2.4" width="19.8" height="9.2" rx="2.3" fill="currentColor"/><path d="M25.6 4.8v4.4c.9-.3 1.5-1.2 1.5-2.2s-.6-1.9-1.5-2.2Z" fill="currentColor" fill-opacity="0.45"/></svg>',

    /* ── Chrome (macOS) toolbar: chatgpt.com is always shown in Chrome in the official demos ── */
    reload: S('<path d="M19.2 12a7.2 7.2 0 1 1-2.1-5.1"/><path d="M19.4 4.6v4.2h-4.2"/>', ' stroke-width="1.8"'),
    tune: S('<path d="M4 8.2h7.2M4 15.8h3.6M14.8 15.8H20"/><circle cx="15.6" cy="8.2" r="2.4"/><circle cx="11.2" cy="15.8" r="2.4"/>', ' stroke-width="1.8"'),
    star: S('<path d="m12 3.9 2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.9l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z"/>', ' stroke-width="1.7"'),
    puzzle: S('<path d="M9.4 5.6a2.2 2.2 0 0 1 4.4 0v1.2h3.4a1 1 0 0 1 1 1v3.4h1.2a2.2 2.2 0 0 1 0 4.4h-1.2v3.4a1 1 0 0 1-1 1H6.4a1 1 0 0 1-1-1v-3.6h1.1a2.1 2.1 0 0 0 0-4.2H5.4V7.8a1 1 0 0 1 1-1h3Z"/>', ' stroke-width="1.7"'),
    'more-vert': F('<circle cx="12" cy="5.6" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="18.4" r="1.7"/>'),
    'tab-search': S('<path d="m7.5 10 4.5 4.5 4.5-4.5"/>', ' stroke-width="2"'),

    /* ── macOS pointer (22×30 box, hotspot at 3,2) ──────── */
    cursor: '<svg viewBox="0 0 22 30" aria-hidden="true"><path d="M3 2v22.6l5.6-5.3 3.5 8.2 3.9-1.6-3.4-8.1h7.6Z" fill="#0d0d0d" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>',

    /* ── dot avatar (cloud blob, sky blue; abstract per landscape note) ── */
    'dot-avatar': '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="cgDotG" cx="40%" cy="34%" r="70%"><stop offset="0" stop-color="#d9f1ff"/><stop offset=".55" stop-color="#8fd0f4"/><stop offset="1" stop-color="#4fa9e0"/></radialGradient></defs><path d="M32 7c4.6 0 7.4 3.1 8.6 6 3-.9 7.4-.3 9.4 3.3 2 3.5.9 6.9-.7 9.2 2.6 1.6 5.2 4.6 4.3 8.8-.9 4-4.3 5.6-7.3 5.8.6 3 .1 7.1-3.6 9.1-3.6 2-7.2.6-9.4-1.2-2 2.6-5 4.4-8.6 3.6-3.9-.9-5.4-4.3-5.6-7.3-3 .4-7-.7-8.6-4.5-1.6-3.8.6-7.2 3-9-2-2.4-3-6.3-.6-9.6 2.4-3.3 6.6-3.5 9.4-2.4C24.4 10.2 27.4 7 32 7Z" fill="url(#cgDotG)"/><ellipse cx="26.5" cy="31" rx="2.6" ry="3.6" fill="#10283a"/><ellipse cx="37.5" cy="31" rx="2.6" ry="3.6" fill="#10283a"/><circle cx="27.3" cy="29.8" r=".9" fill="#fff"/><circle cx="38.3" cy="29.8" r=".9" fill="#fff"/></svg>'
  };

  Object.defineProperty(I, 'svg', {
    enumerable: false,
    value: function (name) { return I[name] || ''; }
  });
  Object.defineProperty(I, 'mount', {
    enumerable: false,
    value: function (root) {
      var scope = root || document;
      var els = scope.querySelectorAll('i.cg-i[data-i]');
      for (var k = 0; k < els.length; k++) {
        var n = els[k].getAttribute('data-i');
        if (I[n] && !els[k].firstChild) els[k].innerHTML = I[n];
      }
      return els.length;
    }
  });
  window.SKIN_ICONS_CHATGPT = I;
})();

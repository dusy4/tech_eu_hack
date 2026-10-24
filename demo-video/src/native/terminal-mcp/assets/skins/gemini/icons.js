/* Gemini skin icons: window.SKIN_ICONS_GEMINI
 * Inline SVG strings. Outline icons use stroke="currentColor" so they take the
 * text colour of their container; size them with the container (.gm-ico, or
 * width/height on the svg). All drawn on a 24×24 grid with round caps to match
 * the Material Symbols Rounded look of the real app (see DECISIONS.md).
 * Multicolour marks (spark, Google app logos) keep their brand colours.
 */
(function () {
  var S = function (body, sw) {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  var F = function (body) {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">' + body + '</svg>';
  };

  // Gemini sparkle (2025+ multicolour mark). Path + gradients from assets/logos/gemini-color.svg (LobeHub pack).
  var SPARK_PATH = 'M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z';
  var spark =
    '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient gradientUnits="userSpaceOnUse" id="gmSparkG" x1="7" x2="11" y1="15.5" y2="12"><stop stop-color="#08B962"/><stop offset="1" stop-color="#08B962" stop-opacity="0"/></linearGradient>' +
    '<linearGradient gradientUnits="userSpaceOnUse" id="gmSparkR" x1="8" x2="11.5" y1="5.5" y2="11"><stop stop-color="#F94543"/><stop offset="1" stop-color="#F94543" stop-opacity="0"/></linearGradient>' +
    '<linearGradient gradientUnits="userSpaceOnUse" id="gmSparkY" x1="3.5" x2="17.5" y1="13.5" y2="12"><stop stop-color="#FABC12"/><stop offset=".46" stop-color="#FABC12" stop-opacity="0"/></linearGradient>' +
    '</defs>' +
    '<path d="' + SPARK_PATH + '" fill="#3186FF"/>' +
    '<path d="' + SPARK_PATH + '" fill="url(#gmSparkG)"/>' +
    '<path d="' + SPARK_PATH + '" fill="url(#gmSparkR)"/>' +
    '<path d="' + SPARK_PATH + '" fill="url(#gmSparkY)"/>' +
    '</svg>';

  window.SKIN_ICONS_GEMINI = {
    /* brand */
    spark: spark,
    sparkMono: F('<path d="' + SPARK_PATH + '"/>'),

    /* composer */
    plus: S('<path d="M12 4v16M4 12h16"/>', 1.6),
    mic: S('<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>', 1.9),
    send: S('<path d="M12 19.5V5M5.75 11.25 12 5l6.25 6.25"/>', 2.3),
    /* paper plane (Material "send") for Gmail-card Send buttons */
    sendPlane: F('<path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15 12l-11.61 1.87z"/>'),
    stop: F('<rect x="6.75" y="6.75" width="10.5" height="10.5" rx="1.8"/>'),
    chevronDown: S('<path d="m6 9.25 6 6 6-6"/>', 2),
    chevronUp: S('<path d="m6 14.75 6-6 6 6"/>', 2),
    chevronRight: S('<path d="m9.5 6 6 6-6 6"/>', 1.9),
    check: S('<path d="m4.75 12.5 4.5 4.5 10-10"/>', 2.1),
    attach: S('<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7.1-7.1l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.6 1.6 0 0 1-2.3-2.3l7.3-7.3"/>'),

    /* rail / drawer (Sept 2026 build) */
    newChat: S('<path d="M11.25 4.1A8 8 0 1 0 19.9 12.8"/><path d="m9.4 14.6.9-3.6 7.4-7.4a1.9 1.9 0 0 1 2.7 2.7l-7.4 7.4z"/>'),
    search: S('<circle cx="10.5" cy="10.5" r="6.75"/><path d="m15.6 15.6 4.9 4.9"/>'),
    dailyBrief: S('<rect x="4" y="5.5" width="16" height="15" rx="3.5"/><path d="M8.5 3.25v3.5M15.5 3.25v3.5M8.9 13.4l2.2 2.2 4.1-4.1"/>'),
    images: S('<rect x="3.5" y="3.5" width="17" height="17" rx="4.25"/><path d="M3.9 15.3c1.6-1.5 3.6-1.7 5.6-.6M7.4 17.7c4.3 1.4 9-.4 9.8-5.1.4-2.2-.1-4.2-1-5.4-.2 3.8-2.4 6.7-6.3 7.4"/>'),
    /* Videos (Sept rail + both drawers): rounded box; the lid is a short floating rule (not
       touching either wall) with two slashes leaning down-right from the top edge to it */
    videos: S('<rect x="3" y="5.25" width="18" height="13.5" rx="3.6"/><path d="M6.3 9h11.1M7.4 5.25 10.4 9M13.6 5.25 16.6 9"/>'),
    library: S('<rect x="4" y="4" width="6.5" height="9" rx="1.3"/><rect x="13.5" y="4" width="6.5" height="5" rx="1.3"/><rect x="4" y="16" width="6.5" height="4" rx="1.3"/><rect x="13.5" y="12" width="6.5" height="8" rx="1.3"/>'),
    sparkAgent: S('<path d="M13.5 3.5c3.6.1 6.9 3.4 7 7l-4.3 4.3-7-7z"/><path d="m9.2 7.8-3.3.2-2.4 2.4 3.6 1.1M16.2 14.8l-.2 3.3-2.4 2.4-1.1-3.6M7 17l-3 3"/>'),
    notebook: S('<path d="M7 3.5h8.5a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 3.5z"/><path d="M9 3.5v17"/>'),
    notebookTasks: S('<path d="M6.5 3.5h11v13h-11z"/><path d="M9 7.5h6M9 11h6M5 16.5h14v4H5z"/>'),
    toggle: S('<rect x="2.5" y="7" width="19" height="10" rx="5"/><circle cx="16.4" cy="12" r="2.2"/>'),
    clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    settings: S('<path d="M12.22 2.75h-.44a1.9 1.9 0 0 0-1.9 1.9v.17a1.9 1.9 0 0 1-.95 1.64l-.41.24a1.9 1.9 0 0 1-1.9 0l-.14-.08a1.9 1.9 0 0 0-2.6.7l-.21.36a1.9 1.9 0 0 0 .7 2.6l.14.09a1.9 1.9 0 0 1 .95 1.64v.48a1.9 1.9 0 0 1-.95 1.65l-.14.08a1.9 1.9 0 0 0-.7 2.6l.21.36a1.9 1.9 0 0 0 2.6.7l.14-.08a1.9 1.9 0 0 1 1.9 0l.41.24a1.9 1.9 0 0 1 .95 1.64v.17a1.9 1.9 0 0 0 1.9 1.9h.44a1.9 1.9 0 0 0 1.9-1.9v-.17a1.9 1.9 0 0 1 .95-1.64l.41-.24a1.9 1.9 0 0 1 1.9 0l.14.08a1.9 1.9 0 0 0 2.6-.7l.21-.37a1.9 1.9 0 0 0-.7-2.6l-.14-.07a1.9 1.9 0 0 1-.95-1.65v-.48a1.9 1.9 0 0 1 .95-1.65l.14-.08a1.9 1.9 0 0 0 .7-2.6l-.21-.36a1.9 1.9 0 0 0-2.6-.7l-.14.08a1.9 1.9 0 0 1-1.9 0l-.41-.24a1.9 1.9 0 0 1-.95-1.64v-.17a1.9 1.9 0 0 0-1.9-1.9z"/><circle cx="12" cy="12" r="3"/>', 1.6),
    pin: S('<path d="M9 3.75h6M10 3.75v5.5l-2.75 4h9.5L14 9.25v-5.5M12 13.25v7"/>', 1.7),
    menu: S('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    close: S('<path d="M6 6l12 12M18 6 6 18"/>', 1.8),
    more: F('<circle cx="12" cy="5.5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="18.5" r="1.7"/>'),
    sidebar: S('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>'),

    /* message actions */
    copy: S('<rect x="8.5" y="8" width="11" height="12.5" rx="2.2"/><path d="M5.25 15.5V6a2.25 2.25 0 0 1 2.25-2.25h7.5"/>'),
    edit: S('<path d="m4.5 19.5 1-4.4L15.6 5a2.1 2.1 0 0 1 3 3L8.5 18.1z"/>'),
    thumbUp: S('<path d="M7.5 10.5v9.5H5a1.5 1.5 0 0 1-1.5-1.5V12A1.5 1.5 0 0 1 5 10.5zM7.5 10.5 11.2 3.6a2.1 2.1 0 0 1 2.4 2.5l-.7 3.6h5.6a2 2 0 0 1 2 2.4l-1.2 6.3a2 2 0 0 1-2 1.6H7.5"/>'),
    thumbDown: S('<path d="M16.5 13.5V4H19a1.5 1.5 0 0 1 1.5 1.5V12a1.5 1.5 0 0 1-1.5 1.5zM16.5 13.5l-3.7 6.9a2.1 2.1 0 0 1-2.4-2.5l.7-3.6H5.5a2 2 0 0 1-2-2.4l1.2-6.3a2 2 0 0 1 2-1.6h9.8"/>'),
    redo: S('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.75h-4.75"/>'),
    share: S('<circle cx="17.5" cy="5.75" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.25" r="2.5"/><path d="m8.7 10.8 6.6-3.8M8.7 13.2l6.6 3.8"/>', 1.7),
    undo: S('<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a5 5 0 0 1 0 10h-3"/>'),
    redoArrow: S('<path d="m15 14 4.5-4.5L15 5"/><path d="M19.5 9.5H9a5 5 0 0 0 0 10h3"/>'),
    code: S('<path d="m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5"/>'),
    download: S('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>'),
    cloudDone: S('<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5a4 4 0 0 1-.5 8z"/><path d="m9.5 14 1.8 1.8 3.4-3.4"/>', 1.7),

    /* agent progress */
    /* 3 dots rising left to right (17x14 box, Oct 2026 promo); animate each <circle> */
    thinkingDots: '<svg viewBox="0 0 17 14" width="17" height="14" fill="currentColor" aria-hidden="true"><circle cx="2.2" cy="11.6" r="1.75"/><circle cx="8.4" cy="8.2" r="1.6"/><circle cx="14.6" cy="2.9" r="1.6"/></svg>',
    /* screen outline + flat solid stand bar (Oct 2026 promo step icon) */
    monitor: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><rect x="1.9" y="3.1" width="20.2" height="13.9" rx="2.7" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M6.9 17.9h10.2v1.8a1.6 1.6 0 0 1-1.6 1.6H8.5a1.6 1.6 0 0 1-1.6-1.6z" fill="currentColor"/></svg>',
    globe: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5s1.1-6.1 3.5-8.5z"/>', 1.6),

    /* tools menu (+) */
    createImage: S('<rect x="7.5" y="3.5" width="13" height="13" rx="2.2"/><path d="M4 7.5v10.25A2.25 2.25 0 0 0 6.25 20H16.5"/><path d="M11 13.5c2.3.6 4.9-.5 5.3-3 .2-1.2-.1-2.3-.6-3-.1 2-1.2 3.6-3.4 4"/>', 1.7),
    canvas: S('<rect x="7.5" y="3.5" width="13" height="13" rx="2.2"/><path d="M4 7.5v10.25A2.25 2.25 0 0 0 6.25 20H16.5"/><path d="M14 7v6M11 10h6"/>', 1.7),
    deepResearch: S('<path d="M19.3 10.6A8 8 0 1 0 10.6 19.3"/><path d="M3.5 10.5c2.6.4 4.3 1.6 5 3.8M11.5 4c-1.4 1.5-1.6 3.5-.4 5 1.1 1.4 3.2 1.4 4.1 2.8"/><circle cx="16.5" cy="16.5" r="2.75"/><path d="m18.6 18.6 2.2 2.2"/>', 1.7),
    createVideo: S('<path d="M4 9h16v9.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5V9M8.5 4l-1.5 5M13.5 4 12 9M18.5 4 17 9"/>', 1.7),
    createMusic: F('<circle cx="9" cy="17" r="3.1"/><path d="M10.6 17V4.5h6.2v3.2h-3.7V17z"/>'),
    guidedLearning: S('<path d="M3 6.5c3-1.2 6-1 9 1 3-2 6-2.2 9-1v12.25c-3-1.2-6-1-9 1-3-2-6-2.2-9-1zM12 7.5v12.25"/><path d="M15.5 6.3v4.2l1.4-1 1.4 1V5.9" stroke-width="1.4"/>', 1.7),

    /* Live */
    camera: S('<rect x="3" y="5.5" width="14" height="13" rx="3.5"/><path d="M20.25 9v6"/>', 1.9),
    shareScreen: S('<rect x="3" y="4.5" width="18" height="15" rx="3.5"/><path d="M12 15.5V8.75M9 11.5l3-3 3 3"/>', 1.9),

    /* pointers (macOS) */
    cursorArrow: '<svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><path d="M7 3.5v18.6l4.6-4.4 3 7 3.2-1.4-3-6.9h6.5z" fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    cursorHand: '<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="M11 17.2V5.4a1.8 1.8 0 0 1 3.6 0v7.1a1.7 1.7 0 0 1 3.4.1v.8a1.7 1.7 0 0 1 3.4.2v1a1.6 1.6 0 0 1 3.2.2v6.6c0 4.3-2.7 7.1-6.6 7.1h-1.4c-2.5 0-4.1-.9-5.4-2.7l-4.3-6.3a1.8 1.8 0 0 1 2.7-2.3z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/><path d="M14.6 17.2v4.3M18 17.4v4.1M21.4 17.6v3.9" stroke="#000" stroke-width="1.2" stroke-linecap="round"/></svg>',

    /* Google app marks used inside answers and cards (simplified, brand colours) */
    gdrive: '<svg viewBox="0 0 87.3 78" width="24" height="24" aria-hidden="true"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>',
    gmail: '<svg viewBox="52 42 88 66" width="24" height="18" aria-hidden="true"><path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/><path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/><path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/><path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/><path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/></svg>',
    gdocs: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M14.5 2H6.2A2.2 2.2 0 0 0 4 4.2v15.6A2.2 2.2 0 0 0 6.2 22h11.6a2.2 2.2 0 0 0 2.2-2.2V7.5z" fill="#4285f4"/><path d="M14.5 2v4.3a1.2 1.2 0 0 0 1.2 1.2H20z" fill="#a1c2fa"/><path d="M8 12h8M8 15h8M8 18h5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    gslides: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M14.5 2H6.2A2.2 2.2 0 0 0 4 4.2v15.6A2.2 2.2 0 0 0 6.2 22h11.6a2.2 2.2 0 0 0 2.2-2.2V7.5z" fill="#fbbc04"/><path d="M14.5 2v4.3a1.2 1.2 0 0 0 1.2 1.2H20z" fill="#fde293"/><rect x="7.5" y="11" width="9" height="6.5" rx=".8" fill="none" stroke="#fff" stroke-width="1.6"/></svg>',
    /* Google Sheets file mark: green page, pale folded corner with its shadow, white table of
       3 rows x 2 columns (narrow first column). Page fills the box height: size with --gm-ico. */
    gsheets: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6.6 2h8.4l4.6 4.6v13.8a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 20.4V3.6A1.6 1.6 0 0 1 6.6 2z" fill="#0f9d58"/><path d="M15 6.6 19.6 11.2V6.6z" fill="#0b8043" opacity=".55"/><path d="M15 2v3.4a1.2 1.2 0 0 0 1.2 1.2h3.4z" fill="#87ceac"/><path d="M8.1 11.2h7.8v7.2H8.1z" fill="#fff"/><path d="M9 12.1h1.9v1.2H9zM11.8 12.1h3.2v1.2h-3.2zM9 14.2h1.9v1.2H9zM11.8 14.2h3.2v1.2h-3.2zM9 16.3h1.9v1.2H9zM11.8 16.3h3.2v1.2h-3.2z" fill="#0f9d58"/></svg>',
    gphotos: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 12V2.6a4.7 4.7 0 0 1 0 9.4z" fill="#ea4335"/><path d="M12 12h9.4a4.7 4.7 0 0 1-9.4 0z" fill="#4285f4"/><path d="M12 12v9.4a4.7 4.7 0 0 1 0-9.4z" fill="#34a853"/><path d="M12 12H2.6a4.7 4.7 0 0 1 9.4 0z" fill="#fbbc04"/></svg>',
    /* Noto-style page emoji Gemini puts before generated-doc links (Spark demo) */
    pageEmoji: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M14.8 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V6.7z" fill="#e3f2fd" stroke="#90a4ae" stroke-width=".9"/><path d="M14.8 2.5v3.2a1 1 0 0 0 1 1H19" fill="#bbdefb" stroke="#90a4ae" stroke-width=".9" stroke-linejoin="round"/><path d="M8 10h8M8 12.75h8M8 15.5h8M8 18.25h5" stroke="#90caf9" stroke-width="1.1" stroke-linecap="round"/></svg>'
  };

  /* Fill every <span class="gm-ico" data-gm-icon="name"></span> under root. */
  window.gmFillIcons = function (root) {
    var els = (root || document).querySelectorAll('[data-gm-icon]');
    for (var i = 0; i < els.length; i++) {
      var svg = window.SKIN_ICONS_GEMINI[els[i].getAttribute('data-gm-icon')];
      if (svg) els[i].innerHTML = svg;
    }
  };

  /* ------------------------------------------------------------------------
     window.SKIN_GEMINI: deterministic, seek-safe GSAP helpers. They only add
     tweens/sets to the timeline you pass (no callbacks, no clocks, no random).
     ------------------------------------------------------------------------ */
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  window.SKIN_GEMINI = {
    /* '<span class="gm-ico extra">svg</span>' */
    icon: function (name, cls) {
      return '<span class="gm-ico' + (cls ? ' ' + cls : '') + '">' + (window.SKIN_ICONS_GEMINI[name] || '') + '</span>';
    },
    mountIcons: function (root) { window.gmFillIcons(root); },

    /* Typing into a composer: fills `el` with one span per character, hidden until
       its keystroke. Cadence: cps chars/s with a deterministic +-jitter. Returns end time. */
    typeText: function (tl, el, text, at, opts) {
      opts = opts || {};
      var cps = opts.cps || 22, jitter = opts.jitter == null ? 0.35 : opts.jitter;
      el.innerHTML = text.split('').map(function (ch) { return '<span class="gm-ch">' + esc(ch) + '</span>'; }).join('');
      var chars = el.querySelectorAll('.gm-ch'), t = at;
      tl.set(chars, { display: 'none' }, 0);
      for (var i = 0; i < chars.length; i++) {
        tl.set(chars[i], { display: 'inline' }, t);
        var wob = (((i * 37) % 11) / 10 - 0.5) * jitter;   // deterministic -0.5..0.5
        var pause = /[ ,.]/.test(text[i]) ? 0.25 : 0;      // tiny hitch after spaces/punctuation
        t += (1 / cps) * (1 + wob + pause);
      }
      return t;
    },

    /* Streamed reply: wraps the words of every text node under `container` in spans
       (elements with class .gm-stream-unit count as one unit) and fades them in
       in chunks of 2-3 words, like Gemini's chunked stream. Returns end time. */
    streamWords: function (tl, container, at, opts) {
      opts = opts || {};
      var wps = opts.wps || 24, fade = opts.fade || 0.22, units = [];
      (function walk(node) {
        var kids = Array.prototype.slice.call(node.childNodes);
        kids.forEach(function (k) {
          if (k.nodeType === 3) {
            var parts = k.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
            parts.forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
              var s = document.createElement('span'); s.className = 'gm-w'; s.textContent = p; frag.appendChild(s); units.push(s);
            });
            node.replaceChild(frag, k);
          } else if (k.nodeType === 1) {
            if (k.classList.contains('gm-stream-unit')) units.push(k); else walk(k);
          }
        });
      })(container);
      tl.set(units, { opacity: 0 }, 0);
      var t = at, i = 0, n = 0;
      while (i < units.length) {
        var size = (n % 3 === 1) ? 3 : 2;
        tl.to(units.slice(i, i + size), { opacity: 1, duration: fade, ease: 'power1.out' }, t);
        t += size / wps; i += size; n++;
      }
      return t;
    },

    /* "Thinking it through..." glyph: the three dots brighten in a rising wave. */
    thinkingDots: function (tl, svgEl, t0, t1, period) {
      period = period || 0.9;
      var dots = svgEl.querySelectorAll('circle');
      tl.set(dots, { opacity: 0.4 }, 0);
      for (var t = t0; t < t1 - 0.05; t += period) {
        for (var d = 0; d < dots.length; d++) {
          var s = t + d * 0.14;
          if (s >= t1) break;
          tl.to(dots[d], { opacity: 1, duration: 0.2, ease: 'power1.out' }, s);
          tl.to(dots[d], { opacity: 0.4, duration: 0.32, ease: 'power1.in' }, s + 0.2);
        }
      }
      tl.to(dots, { opacity: 1, duration: 0.2 }, t1);
    },

    /* Text caret blink between t0 and t1 (visible at t1). */
    caretBlink: function (tl, el, t0, t1, period) {
      period = period || 1.0;
      for (var b = t0; b < t1 - 0.05; b += period) {
        tl.set(el, { opacity: 0 }, b);
        tl.set(el, { opacity: 1 }, Math.min(b + period / 2, t1));
      }
    }
  };
})();

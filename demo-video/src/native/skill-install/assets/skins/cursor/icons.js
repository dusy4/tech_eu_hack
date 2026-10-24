/* Cursor skin icons. window.SKIN_ICONS_CURSOR = { name: "<svg…>" }.
   24x24 outline icons drawn to match the Agents Window (Lucide-like strokes,
   1.75 stroke, round caps). Wrap them in <span class="cu-i">…</span>, which
   sizes them to 15px and colours them with currentColor.
   Real logos (cursor.svg, grok.svg, …) live in assets/logos/. */
(function () {
  var S = function (body, sw) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.75) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  var F = function (body) {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + body + '</svg>';
  };
  window.SKIN_ICONS_CURSOR = {
    /* --- sidebar nav --- */
    newChat: S('<path d="M3.6 4.6h16.8L10.2 20.2 8.7 12.1z"/><path d="M3.6 4.6l5.1 7.5"/>'),
    search: S('<circle cx="10.8" cy="10.8" r="6.6"/><path d="m20 20-4.4-4.4"/>'),
    automations: S('<rect x="3.8" y="8.2" width="16.4" height="11.6" rx="2.6"/><path d="M12 8.2V4.6"/><path d="M9.2 12.8v2.4M14.8 12.8v2.4"/>'),
    customize: S('<rect x="14.2" y="3.4" width="6.4" height="6.4" rx="1.3"/><path d="M10.2 20.6V8.6a1 1 0 0 0-1-1H4.4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.8a1 1 0 0 0-1-1H3.4"/>'),
    sidebar: S('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M9 4.5v15"/>'),
    panelRight: S('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M15 4.5v15"/>'),
    arrowLeft: S('<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>'),
    arrowRight: S('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
    filter: S('<path d="M4 6.5h16M7 12h10M10 17.5h4"/>'),
    folderPlus: S('<path d="M20.5 19.5h-17a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5h4.3l2 2.5h10.7A1.5 1.5 0 0 1 22 8.5V18a1.5 1.5 0 0 1-1.5 1.5z"/><path d="M15 10.5v6M12 13.5h6"/>'),
    folderOpen: S('<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>'),
    cloud: S('<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>'),
    prDraft: S('<circle cx="6" cy="5.5" r="2.5"/><path d="M6 8v13"/><circle cx="18" cy="18.5" r="2.5"/><path d="M18 5v1M18 10v1.5"/>'),
    pr: S('<circle cx="6" cy="5.5" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M6 8v13"/><path d="M13 5.5h3a2 2 0 0 1 2 2V16"/>'),
    settings: S('<path d="M12 2.8l7.9 4.6v9.2L12 21.2l-7.9-4.6V7.4z"/><circle cx="12" cy="12" r="3"/>'),
    ellipsis: F('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
    arrowUpRight: S('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>'),
    minimize: S('<path d="m14 10 7-7M20 10h-6V4M3 21l7-7M4 14h6v6"/>'),
    toc: S('<path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13"/>'),

    /* --- composer --- */
    plus: S('<path d="M12 5v14M5 12h14"/>'),
    chevronDown: S('<path d="m6 9 6 6 6-6"/>', 2),
    chevronUp: S('<path d="m6 15 6-6 6 6"/>', 2),
    chevronRight: S('<path d="m9 6 6 6-6 6"/>', 2),
    mic: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8.6" y="2.6" width="6.8" height="12.4" rx="3.4" fill="currentColor"/><path d="M18.6 11a6.6 6.6 0 0 1-13.2 0M12 17.6v3.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    arrowUp: S('<path d="M12 19.5V5"/><path d="m5.5 11 6.5-6.5 6.5 6.5"/>', 2.4),
    stop: F('<rect x="5" y="5" width="14" height="14" rx="2.4"/>'),
    plan: S('<circle cx="5" cy="6.5" r="1.9"/><circle cx="5" cy="17.5" r="1.9"/><path d="M10.5 6.5H21M10.5 12H21M10.5 17.5H21"/>'),
    ask: S('<path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5Z"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.6-2.7 2.6"/><path d="M12 16.6h.01"/>'),
    x: S('<path d="M18 6 6 18M6 6l12 12"/>'),
    branch: S('<circle cx="6" cy="18.5" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M6 3v13"/><path d="M18 8.5a9 9 0 0 1-9 9"/>'),
    laptop: S('<rect x="4.5" y="5" width="15" height="10.5" rx="1.6"/><path d="M2.5 19h19"/>'),
    shift: S('<path d="M9 19v-6H5l7-8 7 8h-4v6z"/>', 1.6),
    loader: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-opacity=".25" stroke-width="2.4"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    /* "running" glyph on in-progress sidebar rows: frame 0 of the braille spinner below */
    running: null,

    /* --- thread --- */
    fileCode: S('<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="m10 9.5-2.5 2.5 2.5 2.5M14 9.5l2.5 2.5-2.5 2.5"/>'),
    file: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    files: S('<path d="M15.5 2.5H9.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6.5z"/><path d="M15.5 2.5v4h4"/><path d="M4.5 7.5v12a2 2 0 0 0 2 2h9"/>'),
    textFile: S('<path d="M4 6h16M4 12h16M4 18h10"/>'),
    explore: S('<circle cx="10.8" cy="10.8" r="6.6"/><path d="m20 20-4.4-4.4"/>'),
    pencil: S('<path d="M16.9 3.6a2.1 2.1 0 0 1 3 3L8.5 18 4 19.5l1.5-4.5z"/>'),
    terminal: S('<path d="m4.5 17 6-5-6-5"/><path d="M12.5 19h7"/>'),
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M12 3a13.5 13.5 0 0 0 0 18 13.5 13.5 0 0 0 0-18"/><path d="M3 12h18"/>'),
    diff: S('<path d="M12 3.5v12M6 9.5h12M6 20.5h12"/>'),
    canvas: S('<path d="m14.6 3.4 6 6-8.9 8.9a3 3 0 0 1-2.1.9H5.5v-4.1a3 3 0 0 1 .9-2.1z"/><path d="m11.5 6.5 6 6"/>'),
    link: S('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7.1l1.7-1.7"/>'),
    copy: S('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>'),
    fork: S('<circle cx="12" cy="18.5" r="2.4"/><circle cx="6" cy="5.5" r="2.4"/><circle cx="18" cy="5.5" r="2.4"/><path d="M18 8v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8M12 12v4"/>'),
    thumbUp: S('<path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7A2 2 0 0 1 17.5 21H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z"/>'),
    thumbDown: S('<path d="M17 14V3"/><path d="M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.6l2.3-7A2 2 0 0 1 6.5 3H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.8a2 2 0 0 0-1.8 1.1L12 22a3.1 3.1 0 0 1-3-3.9Z"/>'),
    check: S('<path d="M20 6.5 9 17.5l-5-5"/>', 2),
    checkCircle: S('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
    sparkle: S('<path d="M12 3.5v17M3.5 12h17"/>'),

    /* --- changes / diff --- */
    revert: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    list: S('<path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01M8 6h12.5M8 12h12.5M8 18h12.5"/>', 2),
    chevronsUpDown: S('<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>'),
    gitCommit: S('<circle cx="12" cy="12" r="3.5"/><path d="M3 12h5.5M15.5 12H21"/>'),
    split: S('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M12 4.5v15"/>'),

    /* --- CLI --- */
    hexagon: F('<path d="M12 1.8 21 7v10l-9 5.2L3 17V7z"/>'),

    /* --- brand (same mark as assets/logos/cursor.svg) --- */
    cursorLogo: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z"/></svg>',

    /* macOS arrow pointer (for demo clicks; wrap in .cu-pointer) */
    pointer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2.2v17.2l4.05-3.85 2.85 6.45 2.95-1.25-2.8-6.35h5.75z" fill="#0b0b0b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    /* --- macOS menu bar (screen-recording presentation; .cu-menubar) --- */
    apple: '<svg viewBox="0 0 17 20" fill="currentColor" aria-hidden="true"><path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.8 1.1 7.4c-1.8 3.2-.5 7.9 1.3 10.4.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.4zM11.5 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z"/></svg>',
    wifi: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 19.6l2.5-2.9a3.6 3.6 0 0 0-5 0z"/><path d="M12 12.4c1.9 0 3.6.7 4.9 1.9l1.5-1.8A9.4 9.4 0 0 0 12 10a9.4 9.4 0 0 0-6.4 2.5l1.5 1.8A7.2 7.2 0 0 1 12 12.4z"/><path d="M12 7.4c3.2 0 6 1.2 8.2 3.2l1.5-1.8A14.6 14.6 0 0 0 12 5a14.6 14.6 0 0 0-9.7 3.8l1.5 1.8A12.3 12.3 0 0 1 12 7.4z"/></svg>',
    battery: '<svg viewBox="0 0 30 16" aria-hidden="true"><rect x="1" y="2.5" width="24" height="11" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="1.2"/><rect x="3" y="4.5" width="15" height="7" rx="1.8" fill="currentColor"/><path d="M26.8 6.2v3.6c.9-.3 1.4-1 1.4-1.8s-.5-1.5-1.4-1.8z" fill="currentColor" fill-opacity=".55"/></svg>',
    controlCenter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4.5" width="18" height="6" rx="3"/><circle cx="17.9" cy="7.5" r="1.7" fill="currentColor" stroke="none"/><rect x="3" y="13.5" width="18" height="6" rx="3"/><circle cx="6.1" cy="16.5" r="1.7" fill="currentColor" stroke="none"/></svg>',
    spotlight: S('<circle cx="10.5" cy="10.5" r="6"/><path d="m19.5 19.5-4.6-4.6"/>', 2),

    /* --- extra: @-menu / context --- */
    atSign: S('<circle cx="12" cy="12" r="3.6"/><path d="M15.6 8.4v5.1a2.5 2.5 0 0 0 5 0V12a8.6 8.6 0 1 0-3.4 6.9"/>'),
    chevronLeft: S('<path d="m15 6-6 6 6 6"/>', 2),
    publish: S('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7.1l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7.1l1.7-1.7"/>')
  };

  /* Braille spinner frames (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏), drawn as dots so they match the UI font weight.
     Step through them every ~80 ms (see README: "Running agent glyph"). */
  var DOT = { 1: [8.5, 5], 2: [8.5, 12], 3: [8.5, 19], 4: [15.5, 5], 5: [15.5, 12], 6: [15.5, 19] };
  var FR = [[1, 2, 4], [1, 4, 5], [1, 4, 5, 6], [4, 5, 6], [3, 4, 5, 6], [3, 5, 6], [2, 3, 6], [1, 2, 3, 6], [1, 2, 3], [1, 2, 3, 4]];
  var frames = FR.map(function (on) {
    var b = '';
    for (var k = 1; k <= 6; k++) {
      b += '<circle cx="' + DOT[k][0] + '" cy="' + DOT[k][1] + '" r="2.3" opacity="' + (on.indexOf(k) >= 0 ? 1 : 0.18) + '"/>';
    }
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + b + '</svg>';
  });
  window.SKIN_ICONS_CURSOR.running = frames[0];
  window.SKIN_ICONS_CURSOR.brailleFrames = frames;

  /* Helper: fill every [data-cu-icon="name"] inside root with its SVG (used by snippets.html). */
  window.SKIN_CURSOR = {
    icons: window.SKIN_ICONS_CURSOR,
    hydrate: function (root) {
      var I = window.SKIN_ICONS_CURSOR;
      (root || document).querySelectorAll('[data-cu-icon]').forEach(function (el) {
        var n = el.getAttribute('data-cu-icon');
        if (I[n] && typeof I[n] === 'string') el.innerHTML = I[n];
      });
    }
  };
})();

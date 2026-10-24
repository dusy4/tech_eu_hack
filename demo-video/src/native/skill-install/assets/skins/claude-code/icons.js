/* Claude Code skin: icons and terminal glyphs.
 *
 *   window.SKIN_ICONS_CLAUDE_CODE   map of name -> inline SVG string
 *   window.SKIN_CLAUDE_CODE         helpers:
 *       .icon(name)                 -> '<svg …>' (desktop UI icon, 20-unit grid, currentColor stroke)
 *       .g(name)                    -> '<i class="cc-g cc-g-NAME"><svg…></i>' terminal glyph sized to the mono cell
 *       .gut(name)                  -> the same glyph wrapped in a .cc-gut gutter cell (first cell of ● / ❯ / ✻ rows)
 *       .ring(pct)                  -> usage ring SVG (0..1)
 *       .mount(root)                -> replaces every <i data-cc-icon="name"> and <i data-cc-g="name"> under root
 *
 * Why glyphs are SVG: the shipped JetBrains Mono / Inter subsets have no ❯ ⎿ ● ⏵ ⏸ ✻ ✔ ← → ▲ ○,
 * so every terminal symbol is drawn here, sized to one monospace cell (1ch × 1em), so columns stay aligned.
 * No randomness, no clocks: everything here is static strings.
 */
(function () {
  var S = function (body, vb, extra) {
    return '<svg viewBox="' + (vb || '0 0 20 20') + '" fill="none" stroke="currentColor" stroke-width="1.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + body + '</svg>';
  };

  // gear: 8 teeth, generated (deterministic)
  function gearPath() {
    var cx = 10, cy = 10, ro = 7.4, ri = 5.6, n = 8, d = '';
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, w = Math.PI / n;
      var pts = [
        [a0 - w * 0.62, ri], [a0 - w * 0.36, ro], [a0 + w * 0.36, ro], [a0 + w * 0.62, ri]
      ];
      pts.forEach(function (p, k) {
        var x = (cx + Math.cos(p[0]) * p[1]).toFixed(2), y = (cy + Math.sin(p[0]) * p[1]).toFixed(2);
        d += (i === 0 && k === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
      });
    }
    return d + 'Z';
  }

  var I = {
    /* ---- window / title bar ---- */
    'sidebar':     S('<rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.5"/><path d="M7.5 3.75v12.5"/>'),
    'search':      S('<circle cx="8.75" cy="8.75" r="5.25"/><path d="M12.6 12.6 16.75 16.75"/>'),
    'arrow-left':  S('<path d="M16.25 10H4.25M9 5.25 4.25 10 9 14.75"/>'),
    'arrow-right': S('<path d="M3.75 10h12M11 5.25 15.75 10 11 14.75"/>'),
    'arrow-up':    S('<path d="M10 16.25V4.25M5.25 9 10 4.25 14.75 9"/>'),
    'chat':        S('<path d="M2.9 8.3C2.9 5.7 5.2 3.6 8 3.6s5.1 2.1 5.1 4.7S10.8 13 8 13c-.75 0-1.45-.13-2.08-.38L3.3 13.6l.72-2.35A4.4 4.4 0 0 1 2.9 8.3Z"/><path d="M14.7 7.1c1.45.72 2.4 2.1 2.4 3.65 0 .95-.36 1.84-.98 2.55l.6 2.15-2.35-.9c-.55.18-1.15.28-1.77.28-1.6 0-3-.65-3.92-1.65"/>'),
    'code':        S('<path d="M6.25 6 2.5 10l3.75 4M13.75 6l3.75 4-3.75 4M11.4 4.25 8.6 15.75"/>'),
    'terminal':    S('<rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.25"/><path d="m6.25 8 2.5 2-2.5 2M10.5 12.5h3.25"/>'),
    'diff':        S('<rect x="3.75" y="2.75" width="12.5" height="14.5" rx="2"/><path d="M10 5.75v5M7.5 8.25h5M7.5 13.75h5"/>'),
    'globe':       S('<circle cx="10" cy="10" r="7.25"/><path d="M2.75 10h14.5M10 2.75c1.95 2 2.95 4.4 2.95 7.25S11.95 15.25 10 17.25C8.05 15.25 7.05 12.85 7.05 10S8.05 4.75 10 2.75Z"/>'),
    'more-v':      S('<circle cx="10" cy="4.5" r="1.05" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="1.05" fill="currentColor" stroke="none"/><circle cx="10" cy="15.5" r="1.05" fill="currentColor" stroke="none"/>'),
    'share':       S('<path d="M10 12.25V3.25M6.75 6.25 10 3l3.25 3.25"/><path d="M6.75 8.75h-1.5A1.5 1.5 0 0 0 3.75 10.25v5a1.5 1.5 0 0 0 1.5 1.5h9.5a1.5 1.5 0 0 0 1.5-1.5v-5a1.5 1.5 0 0 0-1.5-1.5h-1.5"/>'),
    'split':       S('<rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.25"/><path d="M11.5 3.75v12.5"/>'),
    'expand':      S('<path d="M11.75 3.5h4.75v4.75M16.5 3.5l-5 5M8.25 16.5H3.5v-4.75M3.5 16.5l5-5"/>'),
    'close':       S('<path d="m5.25 5.25 9.5 9.5M14.75 5.25l-9.5 9.5"/>'),

    /* ---- sidebar nav ---- */
    'plus':        S('<path d="M10 4.25v11.5M4.25 10h11.5"/>'),
    'projects':    S('<path d="M5.5 4.25h9"/><rect x="3.25" y="7" width="13.5" height="9.25" rx="2.25"/>'),
    'artifacts':   S('<path d="M7 3.25 10.6 9.4H3.4Z"/><circle cx="14" cy="6.6" r="2.85"/><rect x="3.6" y="11.6" width="5.4" height="5.4" rx="1.2"/><circle cx="14" cy="14.3" r="2.85"/>'),
    'customize':   S('<rect x="2.75" y="6.25" width="14.5" height="10" rx="2"/><path d="M7.25 6.25V5A1.25 1.25 0 0 1 8.5 3.75h3A1.25 1.25 0 0 1 12.75 5v1.25M2.75 10.5h14.5"/>'),
    'chev-down':   S('<path d="M5.75 8 10 12.25 14.25 8"/>'),
    'chev-up':     S('<path d="M5.75 12 10 7.75 14.25 12"/>'),
    'chev-right':  S('<path d="M8 5.75 12.25 10 8 14.25"/>'),
    'sliders':     S('<path d="M6.5 3v7.1M6.5 14.9V17M13.5 3v2.1M13.5 9.9V17"/><circle cx="6.5" cy="12.5" r="2.4"/><circle cx="13.5" cy="7.5" r="2.4"/>'),
    'bug':         S('<path d="M10 6.25c2.35 0 3.75 1.9 3.75 4.75S12.35 16.5 10 16.5 6.25 13.85 6.25 11 7.65 6.25 10 6.25Z"/><path d="M10 9v7.5M7.6 6.9 6.2 4.6M12.4 6.9l1.4-2.3M6.25 10H3.5M16.5 10h-2.75M6.4 13.25 4 15M13.6 13.25 16 15M6.35 8 4.25 6.75M13.65 8l2.1-1.25"/>'),

    /* ---- session status (sidebar rows) ---- */
    'st-idle':     S('<circle cx="10" cy="10" r="2.6"/>', null, ' stroke-width="1.2"'),
    'st-active':   S('<circle cx="10" cy="10" r="3.1" fill="currentColor" stroke="none"/>'),
    'st-pr':       S('<circle cx="5.5" cy="4.75" r="1.75"/><circle cx="5.5" cy="15.25" r="1.75"/><circle cx="14.5" cy="15.25" r="1.75"/><path d="M5.5 6.5v7M14.5 13.5V8.6a2 2 0 0 0-2-2H9.4M11.1 4.85 9.25 6.6l1.85 1.75"/>'),
    'st-merged':   S('<circle cx="5.75" cy="4.75" r="1.75"/><circle cx="14.5" cy="14.75" r="1.75"/><path d="M5.75 6.5v10.25M5.75 9.25c0 3.1 2.9 5.5 6.95 5.5"/>'),

    /* ---- environment chips / header ---- */
    'cloud':       S('<path d="M6.1 15.5h8.15a3.25 3.25 0 0 0 .38-6.48A4.75 4.75 0 0 0 5.6 8.05 3.75 3.75 0 0 0 6.1 15.5Z"/>'),
    'laptop':      S('<rect x="4" y="4.5" width="12" height="8.5" rx="1.25"/><path d="M2.25 15.75h15.5"/>'),
    'folder':      S('<path d="M2.75 6A1.75 1.75 0 0 1 4.5 4.25h3.1l1.75 2h6.15A1.75 1.75 0 0 1 17.25 8v6.25A1.75 1.75 0 0 1 15.5 16h-11a1.75 1.75 0 0 1-1.75-1.75Z"/>'),
    'folder-plus': S('<path d="M2.75 6A1.75 1.75 0 0 1 4.5 4.25h3.1l1.75 2h6.15A1.75 1.75 0 0 1 17.25 8v6.25A1.75 1.75 0 0 1 15.5 16h-11a1.75 1.75 0 0 1-1.75-1.75Z"/><path d="M10 8.6v4.8M7.6 11h4.8"/>'),
    'branch':      S('<circle cx="6" cy="4.75" r="1.75"/><circle cx="6" cy="15.25" r="1.75"/><circle cx="14" cy="6.25" r="1.75"/><path d="M6 6.5v7M14 8c0 3.6-8 2.4-8 5.5"/>'),
    'bolt':        S('<path d="M11.1 2.75 4.75 11.1h4.9l-.75 6.15 6.35-8.35h-4.9Z"/>'),
    'gear':        S('<path d="' + gearPath() + '"/><circle cx="10" cy="10" r="2.4"/>', null, ' stroke-width="1.3"'),
    'overview':    S('<path d="m3 5.6 1.45 1.45L7 4.5M3 12.6l1.45 1.45L7 11.5M10 5.75h7M10 12.75h7"/>'),
    'library':     S('<rect x="4.25" y="2.75" width="11.5" height="14.5" rx="2"/><path d="M7.25 7h5.5M7.25 10h5.5M7.25 13h3"/>'),
    'clock':       S('<circle cx="10" cy="10" r="7"/><path d="M10 6v4.25l2.75 1.75"/>'),
    'list':        S('<path d="M7.75 5.5h8.5M7.75 10h8.5M7.75 14.5h8.5"/><circle cx="4" cy="5.5" r=".95" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r=".95" fill="currentColor" stroke="none"/><circle cx="4" cy="14.5" r=".95" fill="currentColor" stroke="none"/>'),
    'file':        S('<path d="M5.75 2.75h5.5l4 4v9a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5v-11.5a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M11 2.75V7h4.25"/>'),
    'copy':        S('<rect x="6.75" y="6.75" width="10.5" height="10.5" rx="2"/><path d="M13.25 4.5v-.25a1.5 1.5 0 0 0-1.5-1.5h-7.5a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h.25"/>'),
    'check':       S('<path d="m4.5 10.5 3.5 3.5 7.5-8"/>'),
    'checkbox-on': S('<rect x="2.5" y="2.5" width="15" height="15" rx="3.5" fill="currentColor" stroke="none"/><path d="m6.1 10.2 2.65 2.65 5.15-5.6" stroke="#fff" stroke-width="1.9"/>'),
    'checkbox-off':S('<rect x="3" y="3" width="14" height="14" rx="3.25"/>'),

    /* ---- composer ---- */
    'mic':         S('<rect x="7.25" y="2.75" width="5.5" height="9" rx="2.75"/><path d="M4.75 9.5a5.25 5.25 0 0 0 10.5 0M10 14.75v2.5"/>'),
    'stop-circle': S('<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3.1" fill="currentColor" stroke="none"/>', null, ' stroke-width="1.5"'),
    /* local-session stop: outlined rounded square, ~12px at 1x in a 17px box (desktop-dark-session-tool-group.png) */
    'stop-square': S('<rect x="3.7" y="3.7" width="12.6" height="12.6" rx="2"/>', null, ' stroke-width="1.5"'),
    'stop-target': S('<circle cx="10" cy="10" r="6.9"/><circle cx="10" cy="10" r="3" fill="currentColor" stroke="none"/>', null, ' stroke-width="1.55"'),
    'return':      S('<path d="M16 4.75v4.5A2.5 2.5 0 0 1 13.5 11.75H4.5M7.75 8.5 4.5 11.75 7.75 15"/>'),

    /* ---- brand marks ---- */
    /* Claude spark (official mark path, from assets/logos/claude-color.svg) — desktop greeting */
    'claude-spark': '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#D97757" d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"/></svg>',
    /* Clawd, the pixel mascot that sits on the composer edge (drawn from desktop-dark-new-session-home.png, 4px grid) */
    'clawd': '<svg viewBox="0 0 22 16" shape-rendering="crispEdges" aria-hidden="true"><g fill="var(--cc-clay, #D97757)">' +
      '<rect x="3" y="0" width="16" height="12"/><rect x="0" y="6" width="3" height="4"/><rect x="19" y="6" width="3" height="4"/>' +
      '<rect x="3" y="12" width="2" height="3"/><rect x="7" y="12" width="2" height="3"/><rect x="13" y="12" width="2" height="3"/><rect x="17" y="12" width="2" height="3"/></g>' +
      '<g fill="var(--cc-clawd-eye, #141414)"><rect x="5" y="4" width="2" height="2"/><rect x="15" y="4" width="2" height="2"/></g></svg>'
  };

  /* ---- terminal glyphs: one mono cell = 60 x 100 units (1ch x 1em); line centre y=50 ---- */
  var G = function (body, w) {
    return '<svg viewBox="0 0 ' + (w || 60) + ' 100" overflow="visible" style="display:block;width:100%;height:100%" aria-hidden="true">' + body + '</svg>';
  };
  var spokes = function (n, r0, r1, wTip, rot) { // teardrop spokes (✻ ✽ ✢), narrow end at centre
    var out = '';
    for (var i = 0; i < n; i++) {
      var a = (rot || 0) + i * 360 / n;
      out += '<path transform="rotate(' + a + ' 30 50)" d="M30 ' + (50 - r0) + ' C' + (30 - wTip) + ' ' + (50 - r1 * 0.55) + ' ' + (30 - wTip) + ' ' + (50 - r1) + ' 30 ' + (50 - r1) +
        ' C' + (30 + wTip) + ' ' + (50 - r1) + ' ' + (30 + wTip) + ' ' + (50 - r1 * 0.55) + ' 30 ' + (50 - r0) + 'Z"/>';
    }
    return out;
  };
  var petals = function (n, r0, r1, w0, w1, rot) { // thin tapered spokes, narrow at the centre, round outer tip (desktop ✻)
    var out = '';
    for (var i = 0; i < n; i++) {
      var a = (rot || 0) + i * 360 / n, yt = 50 - r1 + w1;
      out += '<path transform="rotate(' + a + ' 30 50)" d="M' + (30 - w0) + ' ' + (50 - r0) + 'L' + (30 - w1) + ' ' + yt +
        'A' + w1 + ' ' + w1 + ' 0 0 1 ' + (30 + w1) + ' ' + yt + 'L' + (30 + w0) + ' ' + (50 - r0) + 'Z"/>';
    }
    return out;
  };
  var lines = function (n, r, sw, rot) { // straight spokes (✳)
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<path transform="rotate(' + ((rot || 0) + i * 360 / n) + ' 30 50)" d="M30 50V' + (50 - r) + '" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round"/>';
    }
    return out;
  };

  var GL = {
    'chev':   G('<path fill="currentColor" d="M7 14h19l19 35.5-19 35.5H7l19-35.5Z"/>'),                                 // ❯ (heavy, cap-height, flat-cut ends)
    'elbow':  G('<path d="M11 13V81H56" fill="none" stroke="currentColor" stroke-width="5.5"/>'),               // ⎿ (cap-top to baseline, one cell wide)
    'dot':    G('<circle cx="30" cy="50" r="26" fill="currentColor"/>'),                                          // ●
    'ff':     G('<path fill="currentColor" d="M3 32 43 57 3 82ZM49 32 89 57 49 82Z"/>', 120),                    // ⏵⏵ (2 cells, x-height centred)
    'pause':  G('<rect x="12" y="31" width="13" height="52" rx="1" fill="currentColor"/><rect x="33" y="31" width="13" height="52" rx="1" fill="currentColor"/>'), // ⏸
    'larr':   G('<path d="M52 50H10M27 32 9 50l18 18" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'), // ←
    'rarr':   G('<path d="M8 50h42M33 32l18 18-18 18" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'), // →
    'check':  G('<path d="M8 52 23 68 53 30" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>'), // ✔
    'tick':   G('<path d="M10 52 24 66 51 32" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'),  // ✓
    'cross':  G('<path d="M13 31 47 69M47 31 13 69" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>'),                    // ✗
    'ring':   G('<circle cx="30" cy="50" r="19" fill="none" stroke="currentColor" stroke-width="5.5"/>'),        // ○
    'half':   G('<circle cx="30" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="6"/><path d="M30 30a20 20 0 0 1 0 40Z" fill="currentColor"/>'), // ◐
    'tri':    G('<path fill="currentColor" d="M30 24 52 72H8Z"/>'),                                              // ▲
    'bar':    G('<rect x="0" y="0" width="60" height="100" fill="currentColor"/>'),                               // █
    'square': G('<rect x="11" y="31" width="38" height="38" rx="3" fill="none" stroke="currentColor" stroke-width="6"/>'), // ☐
    'squarex':G('<rect x="11" y="31" width="38" height="38" rx="3" fill="none" stroke="currentColor" stroke-width="6"/><path d="M20 50 27 58 41 41" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'), // ☒ done task
    /* spinner frames: · ✢ ✳ ✶ ✻ ✽  (claude colour) */
    'sp0':    G('<circle cx="30" cy="50" r="6" fill="currentColor"/>'),
    'sp1':    G('<g fill="currentColor">' + spokes(4, 2, 27, 7, 0) + '</g>'),
    'sp2':    G('<g>' + lines(8, 25, 6.5, 0) + '</g>'),
    'sp3':    G('<g fill="currentColor">' + spokes(6, 0, 26, 6, 0) + '<circle cx="30" cy="50" r="7"/></g>'),
    'sp4':    G('<g fill="currentColor">' + spokes(6, 3, 27, 8, 0) + '</g>'),
    'sp5':    G('<g fill="currentColor">' + spokes(8, 3, 27, 7, 0) + '</g>'),
    'spark':  G('<g fill="currentColor">' + spokes(6, 3, 27, 8, 0) + '</g>'),  // ✻ (header line, agent view)
    /* desktop working spark: six thin spokes that taper into the centre (desktop-dark-session-tool-group.png) */
    'dspark': G('<g fill="currentColor">' + petals(6, 3, 27, 1.7, 3.9, 0) + '</g>')
  };

  var api = {
    icons: I,
    glyphs: GL,
    icon: function (n) { return I[n] || ''; },
    g: function (n, cls) {
      var wide = n === 'ff' ? ' cc-g-2' : '';
      return '<i class="cc-g cc-g-' + n + wide + (cls ? ' ' + cls : '') + '">' + (GL[n] || '') + '</i>';
    },
    /* gutter cell for hanging rows (● ❯ ✻ …): <span class="cc-gut"><i class="cc-g">…</i></span> */
    gut: function (n, cls) { return '<span class="cc-gut' + (cls ? ' ' + cls : '') + '">' + api.g(n) + '</span>'; },
    /* usage ring: pct 0..1. Light/dark colours come from CSS (.cc-ring) */
    ring: function (pct) {
      var r = 6.25, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct || 0));
      return '<svg class="cc-ring" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="' + r + '" fill="none" class="cc-ring-track" stroke-width="2"/>' +
        '<circle cx="10" cy="10" r="' + r + '" fill="none" class="cc-ring-fill" stroke-width="2" stroke-linecap="round" stroke-dasharray="' + (c * p).toFixed(2) + ' ' + c.toFixed(2) + '" transform="rotate(-90 10 10)"/></svg>';
    },
    mount: function (root) {
      root = root || document;
      root.querySelectorAll('[data-cc-icon]').forEach(function (el) {
        var n = el.getAttribute('data-cc-icon');
        if (n === 'ring') { el.innerHTML = api.ring(parseFloat(el.getAttribute('data-pct') || '0')); }
        else el.innerHTML = I[n] || '';
        el.classList.add('cc-i');
      });
      root.querySelectorAll('[data-cc-g]').forEach(function (el) {
        var n = el.getAttribute('data-cc-g');
        el.innerHTML = GL[n] || '';
        el.classList.add('cc-g', 'cc-g-' + n);
        if (n === 'ff') el.classList.add('cc-g-2');
      });
    }
  };

  // desktop working spark as a square icon (the dspark glyph cropped to its circle): <span class="cc-work"> + icon('work-spark')
  I['work-spark'] = GL.dspark.replace('viewBox="0 0 60 100"', 'viewBox="2 22 56 56"');

  // icon map also carries the glyphs under "g-<name>" so a single lookup table covers everything
  Object.keys(GL).forEach(function (k) { I['g-' + k] = GL[k]; });

  window.SKIN_ICONS_CLAUDE_CODE = I;
  window.SKIN_CLAUDE_CODE = api;
})();

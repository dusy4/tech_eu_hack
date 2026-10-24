/*
 * Claude skin: icons + deterministic motion helpers.
 *
 *   <script src="assets/skins/claude/icons.js"></script>
 *
 * Exposes
 *   window.SKIN_ICONS_CLAUDE   map of inline SVG strings (20x20 grid, stroke = currentColor)
 *   window.SKIN_CLAUDE         helpers: icon(), mountIcons(), sparkPulse(), shimmer(), typeText(),
 *                              streamWords(), caretBlink(), pointerTip(), pointerAt(), pointerTo(),
 *                              press(), ringFill()
 *
 * Icons are drawn to match the official Claude frames in research/ui-references/claude/
 * (thin 1.5px strokes, round caps, 20px grid). The spark is the official Claude mark
 * (assets/logos/claude-color.svg path) so it is pixel-faithful.
 * Everything here is deterministic: no Math.random, no Date.now.
 */
(function () {
  var S = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var F = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"';
  function s(body) { return '<svg ' + S + '>' + body + '</svg>'; }
  function f(body) { return '<svg ' + F + '>' + body + '</svg>'; }

  // Official Claude spark (from assets/logos/claude-color.svg, 24x24 grid).
  var SPARK_PATH = 'M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z';

  var I = {
    // --- brand ---------------------------------------------------------------
    // The spark: fill = currentColor, so set color: var(--ck-clay) (the .cl-spark class does this).
    spark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + SPARK_PATH + '"/></svg>',
    // Spark wrapped for the working pulse: an inner <g> that the pulse helper scales, plus a centre dot.
    sparkAnimated: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="overflow:visible"><g class="cl-spark-rays"><path d="' + SPARK_PATH + '"/></g><circle class="cl-spark-dot" cx="12" cy="12" r="0"/></svg>',

    // --- composer ------------------------------------------------------------
    plus: s('<path d="M10 4v12M4 10h12"/>'),
    mic: s('<rect x="7.25" y="2.75" width="5.5" height="9.5" rx="2.75"/><path d="M4.75 9.5a5.25 5.25 0 0 0 10.5 0M10 14.75v2.5"/>'),
    // voice mode: seven thin bars
    waveform: s('<path d="M3 8.5v3M5.5 6.5v7M8 4v12M10.5 7v6M13 5v10M15.5 7.5v5M18 9v2"/>'),
    send: s('<path d="M10 16V4.5M5 9.25L10 4.25l5 5" stroke-width="2"/>'),
    arrowUp: s('<path d="M10 16V4.5M5 9.25L10 4.25l5 5"/>'),
    stop: f('<rect x="5.5" y="5.5" width="9" height="9" rx="1.75"/>'),
    returnKey: s('<path d="M16 4.5v5a2 2 0 0 1-2 2H4.5M7.75 8.25L4.5 11.5l3.25 3.25"/>'),
    paperclip: s('<path d="M15.5 9.5l-5.6 5.6a3.5 3.5 0 0 1-5-5l6.3-6.3a2.35 2.35 0 0 1 3.3 3.3l-6.2 6.2a1.2 1.2 0 0 1-1.7-1.7L12.3 6"/>'),
    chevronDown: s('<path d="M5.5 8l4.5 4.5L14.5 8"/>'),
    chevronUp: s('<path d="M5.5 12l4.5-4.5 4.5 4.5"/>'),
    chevronRight: s('<path d="M8 5.5l4.5 4.5L8 14.5"/>'),
    chevronLeft: s('<path d="M12 5.5L7.5 10l4.5 4.5"/>'),
    check: s('<path d="M4.5 10.5l3.5 3.5 7.5-8"/>'),
    // picker check (Sept + Oct picker frames): wider glyph, heavier stroke so the blue reads saturated
    checkBold: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.6 10.6l4.1 4.1L16.4 5.6"/></svg>',
    close: s('<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>'),
    // context ring at the end of the control row (picker-sep, session frames): grey track and a blue
    // arc that fills clockwise from 12 o'clock (~15% in picker-sep, ~5% in session). It is a gauge, not a
    // spinner: set the fill with SKIN_CLAUDE.ringFill(), or edit stroke-dasharray (0-100) on .cl-ring-arc.
    ring: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke-width="2.4" aria-hidden="true"><circle cx="10" cy="10" r="7.6" stroke="var(--ck-ring-track)"/><circle class="cl-ring-arc" cx="10" cy="10" r="7.6" stroke="var(--ck-ring-arc)" stroke-linecap="round" pathLength="100" stroke-dasharray="15 100" transform="rotate(-90 10 10)"/></svg>',
    // the hollow bullet in front of Recents items
    bullet: s('<circle cx="10" cy="10" r="3.1"/>'),

    // --- window / sidebar ----------------------------------------------------
    sidebar: s('<rect x="3" y="3.5" width="14" height="13" rx="2"/><path d="M8 3.5v13"/>'),
    search: s('<circle cx="8.75" cy="8.75" r="5.25"/><path d="M12.75 12.75l3.75 3.75"/>'),
    arrowLeft: s('<path d="M16 10H4.5M9 5l-5 5 5 5"/>'),
    arrowRight: s('<path d="M4 10h11.5M11 5l5 5-5 5"/>'),
    openWindow: s('<path d="M11.5 3.5h5v5M16.5 3.5L10 10M14.5 11.5v3.5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5h3.5"/>'),
    // Artifacts nav icon: triangle over circle + square
    artifacts: s('<path d="M9.4 3.2l3.1 5.1H6.3z"/><circle cx="6.6" cy="13.4" r="3.1"/><rect x="11" y="10.4" width="5.8" height="6.2" rx="1"/>'),
    customize: s('<rect x="3" y="6.5" width="14" height="10" rx="2"/><path d="M7.5 6.5V5A1.5 1.5 0 0 1 9 3.5h2A1.5 1.5 0 0 1 12.5 5v1.5M3 11h14"/>'),
    projects: s('<rect x="3.5" y="6.75" width="13" height="9.75" rx="1.75"/><path d="M5.25 3.75h9.5M3.5 10.25h13"/>'),
    routines: s('<path d="M11.25 2.75L4.75 11h5l-1 6.25L15.25 9h-5z"/>'),
    filter: s('<path d="M6.5 3.5v3.25M6.5 11.25v5.25M13.5 3.5v6M13.5 13.75v2.75"/><circle cx="6.5" cy="9" r="2"/><circle cx="13.5" cy="11.75" r="2"/>'),
    chat: s('<path d="M7.5 12.5H6l-2.5 2v-2.4A3 3 0 0 1 2.5 10V6.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V7"/><path d="M17.5 13.5a3 3 0 0 0-3-3h-3a3 3 0 0 0 0 6h3l2 1.75V15.6a3 3 0 0 0 1-2.1z"/>'),
    code: s('<path d="M6.75 6L3 10l3.75 4M13.25 6L17 10l-3.25 4M11.25 4.5l-2.5 11"/>'),
    bug: s('<path d="M7 6.5a3 3 0 0 1 6 0"/><rect x="6" y="6.5" width="8" height="9.5" rx="4"/><path d="M10 9v7M6 10H3M17 10h-3M6.2 13.5L3.5 15.5M13.8 13.5l2.7 2M6.5 7.5L4 5.5M13.5 7.5L16 5.5"/>'),
    gear: s('<circle cx="10" cy="10" r="2.5"/><path d="M10 2.75v2M10 15.25v2M17.25 10h-2M4.75 10h-2M15.1 4.9l-1.4 1.4M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3L4.9 4.9"/>'),

    // --- topbar (agentic session) -----------------------------------------------
    terminal: s('<path d="M4 5.5l4.5 4.5L4 14.5M10.5 15h6"/>'),
    diffBox: s('<rect x="3.5" y="3.5" width="13" height="13" rx="1.75"/><path d="M10 6v5M7.5 8.5h5M7.5 13.5h5"/>'),
    globe: s('<circle cx="10" cy="10" r="7"/><ellipse cx="10" cy="10" rx="3" ry="7"/><path d="M3 10h14"/>'),
    dotsVertical: f('<circle cx="10" cy="4.5" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="10" cy="15.5" r="1.4"/>'),
    dotsHorizontal: f('<circle cx="4.5" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="15.5" cy="10" r="1.4"/>'),

    // --- message actions ---------------------------------------------------------
    copy: s('<rect x="7" y="7" width="9.5" height="9.5" rx="2"/><path d="M13 7V5.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2V11a2 2 0 0 0 2 2H7"/>'),
    speaker: s('<path d="M3.5 8v4h2.75L10 15.25V4.75L6.25 8z"/><path d="M13 7.75a3.2 3.2 0 0 1 0 4.5M15.25 5.75a6 6 0 0 1 0 8.5"/>'),
    thumbsUp: s('<path d="M6.5 9v7.5H4.25a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM6.5 9l2.8-5.6a1.75 1.75 0 0 1 2.2 2.1L10.9 8.5h4.3a1.6 1.6 0 0 1 1.57 1.9l-1.08 5.3a1.6 1.6 0 0 1-1.57 1.3H6.5"/>'),
    thumbsDown: s('<g transform="rotate(180 10 10)"><path d="M6.5 9v7.5H4.25a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM6.5 9l2.8-5.6a1.75 1.75 0 0 1 2.2 2.1L10.9 8.5h4.3a1.6 1.6 0 0 1 1.57 1.9l-1.08 5.3a1.6 1.6 0 0 1-1.57 1.3H6.5"/></g>'),
    retry: s('<path d="M16.25 10a6.25 6.25 0 1 1-1.9-4.5"/><path d="M15 2.75v3.5h-3.5"/>'),
    wrench: s('<path d="M12.6 3.4a3.75 3.75 0 0 0-4.2 5.1L3.5 13.4a1.6 1.6 0 0 0 2.3 2.3l4.9-4.9a3.75 3.75 0 0 0 5.1-4.2l-2.3 2.3-2.1-.4-.4-2.1z"/>'),
    pencil: s('<path d="M12.5 4.5l3 3L7 16H4v-3z"/>'),

    // --- + menu / connectors -----------------------------------------------------
    connectors: s('<rect x="3" y="10.5" width="6.5" height="6.5" rx="1"/><rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1"/><rect x="3" y="3" width="6.5" height="6.5" rx="1"/><rect x="11.75" y="3" width="5" height="5" rx="1"/>'),
    plugins: s('<path d="M7 3v3.5M13 3v3.5M5 6.5h10V9a5 5 0 0 1-10 0zM10 14v3.5"/>'),
    skills: s('<path d="M5.5 3.5h8a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H6"/><path d="M5.5 3.5a2 2 0 0 0-2 2V14a1 1 0 0 0 1 1h1M5.5 3.5V15a2 2 0 0 0 .5 1.5M8.5 7.5h4.5M8.5 10.5h4.5M8.5 13.5h2.5"/>'),
    folder: s('<path d="M3 6a1.5 1.5 0 0 1 1.5-1.5h3.25l1.75 2h6a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/>'),
    clock: s('<circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.75 1.75"/>'),

    // --- outputs / artifacts -----------------------------------------------------
    docs: s('<path d="M11.25 3H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5V7.25z"/><path d="M11.25 3v4.25h4.25"/>'),
    slides: s('<path d="M7 12H4.5A1.5 1.5 0 0 1 3 10.5v-5A1.5 1.5 0 0 1 4.5 4h7A1.5 1.5 0 0 1 13 5.5V8"/><rect x="7" y="8" width="10" height="8" rx="1.5"/>'),
    design: s('<path d="M10 3a7 7 0 0 0 0 14c1 0 1.5-.6 1.5-1.4 0-.9-.7-1.2-.7-2 0-.8.6-1.35 1.45-1.35H14a3 3 0 0 0 3-3C17 5.9 13.9 3 10 3z"/><circle cx="6.6" cy="9.6" r=".9" fill="currentColor" stroke="none"/><circle cx="8.6" cy="6.5" r=".9" fill="currentColor" stroke="none"/><circle cx="12.1" cy="6.4" r=".9" fill="currentColor" stroke="none"/><circle cx="14.1" cy="9.1" r=".9" fill="currentColor" stroke="none"/>'),
    chart: s('<path d="M3.5 3.5v13h13"/><path d="M6.25 12.75l3.25-4 2.75 2.5 4-5.5"/>'),
    lock: s('<rect x="4.75" y="8.75" width="10.5" height="8" rx="1.75"/><path d="M7 8.75V6.5a3 3 0 0 1 6 0v2.25"/>'),
    org: s('<path d="M3.5 16.5V6l5-2.5v13M8.5 16.5h8V9.5l-8-2M11 11.5h2.5M11 14h2.5M5.75 8.5v.01M5.75 11.5v.01M5.75 14.25v.01"/>'),
    share: s('<path d="M10 12.25V3.5M6.75 6.75L10 3.5l3.25 3.25M4 10.5v5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-5"/>'),
    expand: s('<path d="M11.75 3.5h4.75v4.75M16.5 3.5l-5 5M8.25 16.5H3.5v-4.75M3.5 16.5l5-5"/>'),
    comment: f('<path d="M10 3.25c-3.9 0-7 2.7-7 6.1 0 1.9 1 3.6 2.6 4.75L5 16.75l3.25-1.4c.56.1 1.15.15 1.75.15 3.9 0 7-2.7 7-6.1S13.9 3.25 10 3.25z"/>'),
    calendar: s('<rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/>'),
    table: s('<rect x="3" y="4" width="14" height="12" rx="1.75"/><path d="M3 8h14M8 8v8"/>'),
    image: s('<rect x="3" y="3.5" width="14" height="13" rx="2"/><circle cx="7.5" cy="8" r="1.5"/><path d="M3.5 14.5l4-3.75 3 2.75 2-1.75 4 3.25"/>'),
    checklist: s('<path d="M3.5 5.75l1.5 1.5 2.75-3M10.5 6h6M3.5 12.75l1.5 1.5 2.75-3M10.5 13h6"/>'),
    download: s('<path d="M10 3.5v9M6.5 9l3.5 3.5L13.5 9M4 16.5h12"/>'),
    play: s('<path d="M6.5 4.5v11l9-5.5z"/>'),
    pointerSelect: s('<path d="M4.5 3.5l11 5-4.75 1.75L8.75 15z"/>'),
    database: s('<ellipse cx="10" cy="5" rx="6" ry="2.25"/><path d="M4 5v10c0 1.25 2.7 2.25 6 2.25s6-1 6-2.25V5M4 10c0 1.25 2.7 2.25 6 2.25s6-1 6-2.25"/>'),
    textT: s('<path d="M4.5 5V3.75h11V5M10 3.75v12.5M7.75 16.25h4.5"/>'),
    // macOS-style arrow pointer as drawn in Anthropic's launch renders (white fill, black outline).
    // Use inside .cl-pointer; the tip is at (1.5, 1.5) of the 19x28 viewBox (scaled by the box size).
    pointer: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 28" aria-hidden="true"><path d="M1.5 1.5v21.2l5.1-4.9 3.3 7.6 3.6-1.6-3.3-7.4h7.1z" fill="currentColor" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    // Pointing hand, as over the model control / composer in the Sept 18 renders (picker-sep, session).
    // Use inside .cl-pointer.is-hand; the fingertip is at (9.8, 0.65) of the 22x27 viewBox.
    hand: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 27" aria-hidden="true"><path d="M8.1 2.4c0-1 .75-1.75 1.7-1.75s1.7.75 1.7 1.75v7.1c.1-.9.8-1.5 1.65-1.5.9 0 1.6.65 1.6 1.6v.9c.15-.8.8-1.3 1.6-1.3.85 0 1.55.65 1.55 1.55v1.1c.2-.7.8-1.15 1.5-1.15.85 0 1.5.7 1.5 1.55v4.6c0 4.4-2.8 7.6-7 7.6h-1.6c-2.4 0-3.9-.9-5.3-2.8L1.6 15.6c-.7-.95-.5-2.1.4-2.65.85-.5 1.85-.3 2.5.45l1.9 2.15c.4.45.75.35.75-.2z" fill="currentColor" stroke="#000" stroke-width="1.25" stroke-linejoin="round"/><path d="M11.5 9.6v4.6M14.75 10.5v3.8M17.9 11.6v3" stroke="#000" stroke-width="1.1" stroke-linecap="round" fill="none"/></svg>',
    toggleOn: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 20" aria-hidden="true"><rect x="0" y="1" width="32" height="18" rx="9" fill="currentColor"/><circle cx="23" cy="10" r="7" fill="#fff"/></svg>',
    toggleOff: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 20" aria-hidden="true"><rect x="0" y="1" width="32" height="18" rx="9" fill="currentColor" opacity=".28"/><circle cx="9" cy="10" r="7" fill="#fff"/></svg>'
  };

  window.SKIN_ICONS_CLAUDE = I;

  // ---------------------------------------------------------------------------------
  // Helpers (all seek-safe: they only add tweens/sets to the timeline you pass in,
  // with absolute values, so any frame can be rendered first)
  // ---------------------------------------------------------------------------------
  var FX = {};

  /** Returns the SVG string for an icon name. */
  FX.icon = function (name) { return I[name] || ''; };

  /** Fills every element with data-icon="name" inside root with its SVG. Call once before building the timeline. */
  FX.mountIcons = function (root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      if (!el.firstChild) el.innerHTML = I[el.getAttribute('data-icon')] || '';
    });
  };

  /**
   * Working pulse of the spark (official behaviour, To5nrYqvR44 ~0:14, ~0.9 s per cycle):
   * full asterisk -> smaller -> collapses to a solid dot -> bursts back out larger -> settles.
   * el = the element holding SKIN_ICONS_CLAUDE.sparkAnimated. Ends on the resting mark.
   */
  FX.sparkPulse = function (tl, el, at, duration, cycle) {
    cycle = cycle || 0.9;
    var rays = el.querySelector('.cl-spark-rays');
    var dot = el.querySelector('.cl-spark-dot');
    if (!rays) return at;
    var n = Math.max(1, Math.round(duration / cycle));
    var o = { svgOrigin: '12 12' };
    function v(extra) { var r = {}; for (var k in o) r[k] = o[k]; for (var k2 in extra) r[k2] = extra[k2]; return r; }
    if (at <= 0) { gsap.set(rays, v({ scale: 1, rotation: 0 })); gsap.set(dot, { attr: { r: 0 } }); }
    else { tl.set(rays, v({ scale: 1, rotation: 0 }), at); tl.set(dot, { attr: { r: 0 } }, at); }
    for (var i = 0; i < n; i++) {
      var t = at + i * cycle;
      var r0 = i * 22;                       // each cycle lands a little further round
      tl.to(rays, v({ scale: 0.6, rotation: r0 + 8, duration: cycle * 0.28, ease: 'power2.in' }), t)
        .to(rays, v({ scale: 0.16, rotation: r0 + 12, duration: cycle * 0.16, ease: 'power2.in' }), t + cycle * 0.28)
        .to(dot, { attr: { r: 3.3 }, duration: cycle * 0.12, ease: 'power2.out' }, t + cycle * 0.32)
        .to(dot, { attr: { r: 0 }, duration: cycle * 0.14, ease: 'power2.in' }, t + cycle * 0.5)
        .to(rays, v({ scale: 1.14, rotation: r0 + 19, duration: cycle * 0.24, ease: 'power3.out' }), t + cycle * 0.46)
        .to(rays, v({ scale: 1, rotation: r0 + 22, duration: cycle * 0.3, ease: 'power2.inOut' }), t + cycle * 0.7);
    }
    tl.set(rays, v({ scale: 1, rotation: 0 }), at + n * cycle);
    return at + n * cycle;
  };

  /** Moving shimmer across a .cl-shimmer text line (the grey working sub-line). */
  FX.shimmer = function (tl, el, at, duration, period) {
    period = period || 1.6;
    var n = Math.max(1, Math.ceil(duration / period));
    for (var i = 0; i < n; i++) {
      tl.fromTo(el, { backgroundPosition: '130% 0' }, { backgroundPosition: '-30% 0', duration: period, ease: 'none', immediateRender: i === 0 }, at + i * period);
    }
  };

  /** Types text into el (textContent) at chars-per-second cps. Returns the end time. */
  FX.typeText = function (tl, el, text, at, cps) {
    cps = cps || 22;
    var proxy = { n: 0 };
    var dur = text.length / cps;
    tl.fromTo(proxy, { n: 0 }, {
      n: text.length, duration: dur, ease: 'none',
      onUpdate: function () { el.textContent = text.slice(0, Math.round(proxy.n)); }
    }, at);
    return at + dur;
  };

  /**
   * Splits container's text nodes into word spans (once) and reveals them word by word with the
   * soft leading-edge fade Claude uses while streaming. Returns the end time.
   * opts.grow = true: words (and empty paragraphs) take no space until they arrive, so the
   * reply grows line by line and anything under it (the spark) moves down, like the real app.
   */
  FX.streamWords = function (tl, container, at, wps, fade, opts) {
    wps = wps || 14; fade = fade || 0.35; opts = opts || {};
    if (!container.__clSplit) {
      var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      var nodes = []; var n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function (node) {
        var parts = node.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          var sp = document.createElement('span'); sp.className = 'cl-w'; sp.textContent = p; frag.appendChild(sp);
        });
        node.parentNode.replaceChild(frag, node);
      });
      container.__clSplit = true;
    }
    var words = Array.prototype.slice.call(container.querySelectorAll('.cl-w'));
    var blocks = Array.prototype.slice.call(container.children);
    // starting state is applied now (not as a timeline set at 0, which a seek starting at 0 never renders)
    if (opts.grow) {
      gsap.set(words, { display: 'none', opacity: 0 });
      blocks.forEach(function (b) { gsap.set(b, { display: 'none' }); });
    } else {
      gsap.set(words, { opacity: 0 });
    }
    words.forEach(function (w, i) {
      var t = at + i / wps;
      if (opts.grow) {
        var b = blocks.filter(function (bl) { return bl.contains(w); })[0];
        if (b && b.querySelector('.cl-w') === w) tl.set(b, { display: '' }, t);
        tl.set(w, { display: 'inline' }, t);
      }
      tl.to(w, { opacity: 1, duration: fade, ease: 'power1.out' }, t);
    });
    return at + words.length / wps + fade;
  };

  /** Blinking text caret (.cl-caret) between t0 and t1. */
  FX.caretBlink = function (tl, el, t0, t1, period) {
    period = period || 1.0;
    for (var t = t0; t < t1; t += period) {
      tl.set(el, { opacity: 1 }, t).set(el, { opacity: 0 }, Math.min(t + period / 2, t1));
    }
    tl.set(el, { opacity: 1 }, t1);
  };

  /**
   * Tip of a .cl-pointer inside its box, in CSS px (arrow: top-left tip; .is-hand: fingertip).
   * Read after layout (the box size comes from skin.css).
   */
  FX.pointerTip = function (ptr) {
    var hand = ptr.classList.contains('is-hand');
    return { x: ptr.offsetWidth * (hand ? 9.8 / 22 : 1.5 / 19), y: ptr.offsetHeight * (hand ? 0.65 / 27 : 1.5 / 28) };
  };

  /** Places a .cl-pointer so its tip sits at (x, y) in its offset parent's CSS px, at time `at`. */
  FX.pointerAt = function (tl, ptr, x, y, at) {
    var tip = FX.pointerTip(ptr);
    if (at <= 0) gsap.set(ptr, { x: x - tip.x, y: y - tip.y });
    else tl.set(ptr, { x: x - tip.x, y: y - tip.y }, at);
  };

  /**
   * Moves a .cl-pointer so its tip lands on (x, y) (offset parent's CSS px) with power2.inOut, and
   * optionally presses it (scale 0.92 about the tip, then release). Returns the time the move (and press) ends.
   */
  FX.pointerTo = function (tl, ptr, x, y, at, dur, press) {
    var tip = FX.pointerTip(ptr);
    var origin = tip.x + 'px ' + tip.y + 'px';
    tl.to(ptr, { x: x - tip.x, y: y - tip.y, duration: dur, ease: 'power2.inOut' }, at);
    var t = at + dur;
    if (press) {
      tl.to(ptr, { scale: 0.92, duration: 0.07, ease: 'power1.in', transformOrigin: origin }, t + 0.04)
        .to(ptr, { scale: 1, duration: 0.12, ease: 'power2.out', transformOrigin: origin }, t + 0.13);
      t += 0.25;
    }
    return t;
  };

  /** Presses a button element (scale 0.94 and back), e.g. the send button under the pointer. */
  FX.press = function (tl, el, at) {
    tl.to(el, { scale: 0.94, duration: 0.07, ease: 'power1.in' }, at)
      .to(el, { scale: 1, duration: 0.14, ease: 'power2.out' }, at + 0.09);
    return at + 0.23;
  };

  /** Fills the context ring (data-icon="ring") from `from`% to `to`% over [at, at+duration]. */
  FX.ringFill = function (tl, el, from, to, at, duration) {
    var arc = el.querySelector('.cl-ring-arc');
    if (!arc) return at;
    tl.fromTo(arc, { attr: { 'stroke-dasharray': from + ' 100' } }, { attr: { 'stroke-dasharray': to + ' 100' }, duration: duration, ease: 'power1.inOut' }, at);
    return at + duration;
  };

  window.SKIN_CLAUDE = FX;
})();

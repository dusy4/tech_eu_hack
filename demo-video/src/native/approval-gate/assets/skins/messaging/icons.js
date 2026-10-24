/* Messaging skin icons: iMessage (iOS 26), WhatsApp (iOS), Slack (macOS desktop).
   window.SKIN_ICONS_MESSAGING = { name: "<svg…>" }.
   Every glyph uses currentColor, so colour comes from the CSS of its container.
   Helpers (non-enumerable): SKIN_ICONS_MESSAGING.mount(root) fills every [data-ic="name"] element under root;
   SKIN_ICONS_MESSAGING.keyboard(predictions) returns the iOS 26 keyboard's inner markup.
   Glyphs are drawn to match SF Symbols (iOS), WhatsApp's 2024+ iOS icon set and Slack's
   outline set (1.5px at 20px). Status-bar glyphs are drawn at their native point size. */
(function () {
  function S(body, o) {
    o = o || {};
    var fill = o.fill ? 'currentColor' : 'none';
    var stroke = o.fill ? 'none' : 'currentColor';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (o.vb || '0 0 24 24') + '" width="100%" height="100%" fill="' + fill +
      '" stroke="' + stroke + '" stroke-width="' + (o.sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }
  var I = {};

  /* ---------- iOS status bar (native pt sizes) ---------- */
  I['ios-signal'] = S('<rect x="0" y="7.6" width="3.2" height="4.4" rx="1"/><rect x="4.9" y="5.4" width="3.2" height="6.6" rx="1"/><rect x="9.8" y="2.9" width="3.2" height="9.1" rx="1"/><rect x="14.7" y="0.3" width="3.2" height="11.7" rx="1"/>', { vb: '0 0 18 12', fill: true });
  I['ios-wifi'] = S('<path d="M8.5 11.8 6.1 9.4a3.4 3.4 0 0 1 4.8 0z"/><path d="M3.27 6.57a7.4 7.4 0 0 1 10.46 0l-1.69 1.69a5 5 0 0 0-7.08 0z"/><path d="M.44 3.74a11.4 11.4 0 0 1 16.12 0l-1.7 1.7a9 9 0 0 0-12.72 0z"/>', { vb: '0 0 17 12', fill: true });
  I['ios-battery'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 13" width="100%" height="100%" aria-hidden="true"><rect x=".5" y=".5" width="24" height="12" rx="3.8" fill="none" stroke="currentColor" stroke-opacity=".36"/><rect x="2" y="2" width="21" height="9" rx="2.3" fill="currentColor"/><path d="M26 4.4v4.2c.85-.3 1.45-1.15 1.45-2.1S26.85 4.7 26 4.4z" fill="currentColor" fill-opacity=".4"/></svg>';

  /* ---------- iOS glyphs (SF Symbols look) ---------- */
  I['chev-left'] = S('<path d="M15.2 4.6 7.8 12l7.4 7.4"/>', { sw: 2.5 });
  I['chev-right'] = S('<path d="M9 5.5 15.5 12 9 18.5"/>', { sw: 2.4 });
  I['chev-down'] = S('<path d="M6 9.5l6 6 6-6"/>', { sw: 2.2 });
  I['video'] = S('<rect x="2.4" y="6.2" width="13.2" height="11.6" rx="3.2"/><path d="M15.6 10.3l4.6-2.7c.6-.35 1.3.08 1.3.77v7.26c0 .69-.7 1.12-1.3.77l-4.6-2.7"/>', { sw: 1.8 });
  I['video-fill'] = S('<rect x="2" y="6" width="14" height="12" rx="3.4"/><path d="M17 10.2l3.8-2.5c.7-.45 1.7.05 1.7.9v6.8c0 .85-1 1.35-1.7.9L17 13.8z"/>', { fill: true });
  I['phone'] = S('<path d="M6.7 3.4H5.6c-1.2 0-2.3 1.1-2.1 2.4.9 7.5 7 13.6 14.6 14.5 1.3.2 2.4-.9 2.4-2.1v-1.1c0-.8-.5-1.4-1.3-1.6l-2.5-.6c-.6-.15-1.2.05-1.6.5l-1 1.1c-2.5-1.2-4.6-3.3-5.8-5.8l1.1-1c.45-.4.65-1 .5-1.6l-.6-2.5C8.1 3.9 7.5 3.4 6.7 3.4z"/>', { sw: 1.8 });
  I['plus'] = S('<path d="M12 4.8v14.4M4.8 12h14.4"/>', { sw: 2.2 });
  I['mic'] = S('<rect x="8.8" y="2.8" width="6.4" height="11.4" rx="3.2"/><path d="M5.4 11.2a6.6 6.6 0 0 0 13.2 0M12 17.8v3.2"/>', { sw: 1.9 });
  I['arrow-up'] = S('<path d="M12 19.2V5.4M5.9 11.5 12 5.4l6.1 6.1"/>', { sw: 2.7 });
  I['heart'] = S('<path d="M12 20.6s-7.6-4.6-9.3-9.5C1.5 7.6 3.8 4.4 7.1 4.4c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.3 0 5.6 3.2 4.4 6.7-1.7 4.9-9.3 9.5-9.3 9.5z"/>', { fill: true });
  I['thumbs-up'] = S('<path d="M2.5 10.5h3.6v10H2.5zM8 20.5V10l3.9-6.6c.3-.5.9-.8 1.5-.6 1 .3 1.6 1.3 1.4 2.3L14.1 9h5.2c1.4 0 2.4 1.3 2 2.6l-2.3 7.2c-.3.9-1.1 1.6-2.1 1.6z"/>', { fill: true });
  I['person'] = S('<circle cx="12" cy="8.2" r="4.4"/><path d="M3.6 21c.7-4.3 4.1-6.9 8.4-6.9s7.7 2.6 8.4 6.9z"/>', { fill: true });
  I['apps'] = S('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>', { sw: 1.8 });

  /* ---------- iOS keyboard ---------- */
  I['kb-shift'] = S('<path d="M12 3.6 3.4 12.4h4.5v7.2h8.2v-7.2h4.5z"/>', { sw: 1.7 });
  I['kb-shift-on'] = S('<path d="M12 3.6 3.4 12.4h4.5v7.2h8.2v-7.2h4.5z"/>', { fill: true });
  I['kb-delete'] = S('<path d="M8.6 5.5h10.6a2.3 2.3 0 0 1 2.3 2.3v8.4a2.3 2.3 0 0 1-2.3 2.3H8.6L2.6 12z"/><path d="M11.3 9.2l5.4 5.6M16.7 9.2l-5.4 5.6"/>', { sw: 1.7 });
  I['kb-emoji'] = S('<circle cx="12" cy="12" r="9.2"/><path d="M8 14.2c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4"/><circle cx="9" cy="9.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="9.6" r="1.1" fill="currentColor" stroke="none"/>', { sw: 1.7 });
  I['kb-globe'] = S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>', { sw: 1.6 });

  /* ---------- WhatsApp (iOS) ---------- */
  I['wa-video'] = S('<rect x="2.4" y="6" width="13.4" height="12" rx="3.4"/><path d="M15.8 10.4 20.4 7.7c.6-.35 1.3.08 1.3.77v7.06c0 .69-.7 1.12-1.3.77l-4.6-2.7"/>', { sw: 1.75 });
  I['wa-phone'] = I['phone'];
  I['wa-plus'] = S('<path d="M12 4.6v14.8M4.6 12h14.8"/>', { sw: 2 });
  I['wa-sticker'] = S('<path d="M20.2 13.2V7.4a3.6 3.6 0 0 0-3.6-3.6H7.4a3.6 3.6 0 0 0-3.6 3.6v9.2a3.6 3.6 0 0 0 3.6 3.6h5.8z"/><path d="M20.2 13.2h-3.4a3.6 3.6 0 0 0-3.6 3.6v3.4"/><path d="M8.3 13.6c1 1.2 2.4 1.7 3.9 1.5"/><circle cx="9.2" cy="9.6" r=".95" fill="currentColor" stroke="none"/><circle cx="14.6" cy="9.6" r=".95" fill="currentColor" stroke="none"/>', { sw: 1.7 });
  I['wa-camera'] = S('<path d="M2.9 8.6A2.6 2.6 0 0 1 5.5 6h1.9l1.5-2.1h6.2L16.6 6h1.9a2.6 2.6 0 0 1 2.6 2.6v8.8a2.6 2.6 0 0 1-2.6 2.6h-13a2.6 2.6 0 0 1-2.6-2.6z"/><circle cx="12" cy="12.8" r="3.7"/>', { sw: 1.7 });
  I['wa-mic'] = S('<rect x="8.9" y="2.8" width="6.2" height="11.2" rx="3.1"/><path d="M5.4 11.2a6.6 6.6 0 0 0 13.2 0M12 17.8v3.4"/>', { sw: 1.75 });
  I['wa-send'] = S('<path d="M4.3 20.3 21 12.8c.65-.3.65-1.3 0-1.6L4.3 3.7c-.7-.3-1.45.35-1.2 1.1L5.2 11l8.3 1-8.3 1-2.1 6.2c-.25.75.5 1.4 1.2 1.1z"/>', { fill: true });
  I['wa-ticks'] = S('<path d="M1.2 6.4l3.1 3.1L11.1 1.6M8.1 8.9l.6.6 6.8-7.9"/>', { vb: '0 0 17 11', sw: 1.45 });
  I['wa-tick'] = S('<path d="M2.2 6.4l3.1 3.1L12.1 1.6"/>', { vb: '0 0 14 11', sw: 1.45 });
  I['wa-lock'] = S('<rect x="5" y="10.6" width="14" height="10" rx="2.4"/><path d="M8.2 10.6V8a3.8 3.8 0 0 1 7.6 0v2.6"/>', { sw: 1.9 });
  I['wa-reply'] = S('<path d="M9.6 6.6 4.6 11.6l5 5"/><path d="M4.6 11.6h9.6a5.6 5.6 0 0 1 5.6 5.6v1.4"/>', { sw: 1.9 });
  I['wa-link'] = S('<path d="M13.5 4.5h6v6M19.5 4.5l-8.2 8.2"/><path d="M18 14v3.6a2 2 0 0 1-2 2H6.4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H10"/>', { sw: 1.9 });
  I['wa-avatar'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true"><circle cx="20" cy="20" r="20" style="fill:var(--wa-avatar-bg,#DFE5E7)"/><circle cx="20" cy="15.6" r="6.8" style="fill:var(--wa-avatar-fg,#fff)"/><path d="M7.4 32.6c2.3-5.2 7-8.2 12.6-8.2s10.3 3 12.6 8.2A19.9 19.9 0 0 1 20 40a19.9 19.9 0 0 1-12.6-7.4z" style="fill:var(--wa-avatar-fg,#fff)"/></svg>';

  /* ---------- Slack (desktop, 20px grid, 1.5px stroke) ---------- */
  var L = function (b, o) { o = o || {}; o.vb = o.vb || '0 0 20 20'; o.sw = o.sw || 1.5; return S(b, o); };
  I['sl-home'] = L('<path d="M3.6 8.7 10 3.7l6.4 5V16a1 1 0 0 1-1 1h-3.1v-4.4H7.7V17H4.6a1 1 0 0 1-1-1z"/>');
  I['sl-home-fill'] = L('<path d="M3.6 8.7 10 3.7l6.4 5V16a1 1 0 0 1-1 1h-3.1v-4.4H7.7V17H4.6a1 1 0 0 1-1-1z"/>', { fill: true });
  I['sl-dms'] = L('<path d="M3.2 6.4a3 3 0 0 1 3-3h5.1a3 3 0 0 1 3 3v2.4a3 3 0 0 1-3 3H8.1l-2.8 2.1v-2.3a3 3 0 0 1-2.1-2.9z"/><path d="M16.3 8a2.8 2.8 0 0 1 .9 2.1v2.3a2.8 2.8 0 0 1-1.6 2.5v1.9l-2.6-1.7h-2.4a2.8 2.8 0 0 1-2.2-1.1"/>');
  I['sl-bell'] = L('<path d="M10 3.4a4.6 4.6 0 0 0-4.6 4.6v2.7l-1.3 2.4a.7.7 0 0 0 .6 1h10.6a.7.7 0 0 0 .6-1l-1.3-2.4V8A4.6 4.6 0 0 0 10 3.4z"/><path d="M8.2 16.4a2 2 0 0 0 3.6 0"/>');
  I['sl-later'] = L('<path d="M6 3.4h8a1 1 0 0 1 1 1v12.4l-5-3.1-5 3.1V4.4a1 1 0 0 1 1-1z"/>');
  I['sl-more'] = L('<circle cx="4.6" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="15.4" cy="10" r="1.5"/>', { fill: true });
  I['sl-kebab'] = L('<circle cx="10" cy="4.6" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="15.4" r="1.5"/>', { fill: true });
  I['sl-plus'] = L('<path d="M10 4.2v11.6M4.2 10h11.6"/>', { sw: 1.6 });
  I['sl-back'] = L('<path d="M16 10H4.4M9 5.2 4.2 10 9 14.8"/>');
  I['sl-fwd'] = L('<path d="M4 10h11.6M11 5.2l4.8 4.8-4.8 4.8"/>');
  I['sl-clock'] = L('<circle cx="10" cy="10" r="6.6"/><path d="M10 6.4V10l2.4 1.6"/>');
  I['sl-search'] = L('<circle cx="8.8" cy="8.8" r="5.2"/><path d="m12.7 12.7 3.8 3.8"/>');
  I['sl-help'] = L('<circle cx="10" cy="10" r="7"/><path d="M8.1 8.1a2 2 0 1 1 2.8 1.8c-.6.3-.9.7-.9 1.3v.4"/><circle cx="10" cy="13.9" r=".55" fill="currentColor" stroke="none"/>');
  I['sl-compose'] = L('<path d="M15.6 10.6V15a1.6 1.6 0 0 1-1.6 1.6H5A1.6 1.6 0 0 1 3.4 15V6A1.6 1.6 0 0 1 5 4.4h4.4"/><path d="M14.2 3.5a1.45 1.45 0 0 1 2.1 2.1L10.4 11.5l-2.8.7.7-2.8z"/>');
  I['sl-sliders'] = L('<path d="M3.5 6h7.3M15.3 6h1.2M3.5 14h1.2M9.2 14h7.3"/><circle cx="13" cy="6" r="2.1"/><circle cx="7" cy="14" r="2.1"/>');
  I['sl-caret-down'] = L('<path d="M5.6 7.6h8.8L10 12.6z"/>', { fill: true });
  I['sl-caret-right'] = L('<path d="M7.6 5.6v8.8l5-4.4z"/>', { fill: true });
  I['sl-chev-down'] = L('<path d="m6 8 4 4 4-4"/>', { sw: 1.6 });
  I['sl-hash'] = L('<path d="M8.3 3.4 6.7 16.6M13.4 3.4l-1.6 13.2M3.9 7.6h12.6M3.5 12.4h12.6"/>', { sw: 1.55 });
  I['sl-lock'] = L('<rect x="4.4" y="8.8" width="11.2" height="8" rx="1.6"/><path d="M6.9 8.8V6.6a3.1 3.1 0 0 1 6.2 0v2.2"/>');
  I['sl-headphones'] = L('<path d="M3.6 13.2v-2.6a6.4 6.4 0 0 1 12.8 0v2.6"/><path d="M3.6 12.2h1.8a1.2 1.2 0 0 1 1.2 1.2v2.4A1.2 1.2 0 0 1 5.4 17h-.6a1.2 1.2 0 0 1-1.2-1.2zM16.4 12.2h-1.8a1.2 1.2 0 0 0-1.2 1.2v2.4a1.2 1.2 0 0 0 1.2 1.2h.6a1.2 1.2 0 0 0 1.2-1.2z"/>');
  I['sl-message'] = L('<path d="M3.8 5.6a2.2 2.2 0 0 1 2.2-2.2h8a2.2 2.2 0 0 1 2.2 2.2v6.2a2.2 2.2 0 0 1-2.2 2.2H9.2L5.6 16.8V14a2.2 2.2 0 0 1-1.8-2.2z"/>');
  I['sl-canvas'] = L('<path d="M5.6 3.4h5.8l3 3v10.2a1 1 0 0 1-1 1H5.6a1 1 0 0 1-1-1V4.4a1 1 0 0 1 1-1z"/><path d="M11.2 3.6v3h3M7.2 10.4h5.6M7.2 13.4h3.6"/>');
  I['sl-files'] = L('<path d="M3.4 6a1.6 1.6 0 0 1 1.6-1.6h3.2l1.6 1.8h5.2A1.6 1.6 0 0 1 16.6 7.8v7.6a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6z"/>');
  I['sl-threads'] = L('<path d="M3.8 5.6a2.2 2.2 0 0 1 2.2-2.2h8a2.2 2.2 0 0 1 2.2 2.2v6.2a2.2 2.2 0 0 1-2.2 2.2H9.2L5.6 16.8V14a2.2 2.2 0 0 1-1.8-2.2z"/><path d="M7 7.4h6M7 10.2h4"/>');
  I['sl-sent'] = L('<path d="M3.4 4 16.8 10 3.4 16l2-6z"/><path d="M5.4 10h4.8"/>');
  I['sl-book'] = L('<path d="M4.4 4.6a1.2 1.2 0 0 1 1.2-1.2h9v11.2H5.6a1.2 1.2 0 0 0-1.2 1.2z"/><path d="M4.4 15.8a1.2 1.2 0 0 0 1.2 1.2h9v-2.4"/>');
  I['sl-bold'] = L('<path d="M6 3.9h4.8a3 3 0 0 1 0 6H6zM6 9.9h5.6a3.1 3.1 0 0 1 0 6.2H6z"/>', { sw: 1.8 });
  I['sl-italic'] = L('<path d="M9 3.9h6M5 16.1h6M12.4 3.9l-4.8 12.2"/>');
  I['sl-strike'] = L('<path d="M3.6 10h12.8"/><path d="M13.6 6.6c-.4-1.5-1.8-2.6-3.7-2.6-2 0-3.5 1.1-3.5 2.6 0 1 .6 1.7 1.6 2.2M6.2 13.2c.4 1.7 2 2.8 3.9 2.8 2.2 0 3.7-1.2 3.7-2.9"/>');
  I['sl-link'] = L('<path d="M8.6 11.4a3.2 3.2 0 0 0 4.6.2l2.4-2.4a3.2 3.2 0 0 0-4.6-4.6l-1.2 1.2"/><path d="M11.4 8.6a3.2 3.2 0 0 0-4.6-.2l-2.4 2.4a3.2 3.2 0 0 0 4.6 4.6l1.2-1.2"/>');
  I['sl-list-ol'] = L('<path d="M8.6 5.4h8M8.6 10h8M8.6 14.6h8M3.6 4.4h1.2v3M3.4 12.4c.2-.7.8-1 1.4-1 .7 0 1.2.4 1.2 1 0 .9-1.7 1.6-2.6 3h2.6"/>', { sw: 1.4 });
  I['sl-list-ul'] = L('<path d="M8 5.4h8.6M8 10h8.6M8 14.6h8.6"/><circle cx="4.4" cy="5.4" r=".9" fill="currentColor" stroke="none"/><circle cx="4.4" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="4.4" cy="14.6" r=".9" fill="currentColor" stroke="none"/>');
  I['sl-quote'] = L('<path d="M4.6 4v12M8.6 6.4h7.4M8.6 10h7.4M8.6 13.6h4.6"/>');
  I['sl-code'] = L('<path d="M7.4 6 3.4 10l4 4M12.6 6l4 4-4 4"/>');
  I['sl-codeblock'] = L('<rect x="3" y="3.4" width="14" height="13.2" rx="2"/><path d="M8.2 8 6 10l2.2 2M11.8 8 14 10l-2.2 2"/>');
  I['sl-plus-circle'] = L('<path d="M10 6.6v6.8M6.6 10h6.8"/>', { sw: 1.6 });
  I['sl-aa'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true"><text x="1.6" y="13.6" font-family="Inter, sans-serif" font-size="11.5" font-weight="600" fill="currentColor" letter-spacing="-.2">Aa</text><path d="M2 16.4h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  I['sl-emoji'] = L('<circle cx="10" cy="10" r="6.9"/><path d="M7.1 11.6c.7 1.2 1.7 1.8 2.9 1.8s2.2-.6 2.9-1.8"/><circle cx="7.7" cy="8.3" r=".85" fill="currentColor" stroke="none"/><circle cx="12.3" cy="8.3" r=".85" fill="currentColor" stroke="none"/>');
  I['sl-at'] = L('<circle cx="10" cy="10" r="2.9"/><path d="M12.9 10v1.2a2 2 0 0 0 4 0V10a6.9 6.9 0 1 0-2.8 5.6"/>');
  I['sl-video'] = L('<rect x="2.6" y="5.4" width="10.4" height="9.2" rx="2"/><path d="m13 8.6 3.4-2.1c.4-.25.9.05.9.5v6c0 .45-.5.75-.9.5L13 11.4"/>');
  I['sl-mic'] = L('<rect x="7.6" y="2.8" width="4.8" height="9" rx="2.4"/><path d="M4.8 9.6a5.2 5.2 0 0 0 10.4 0M10 14.8v2.6"/>');
  I['sl-slash'] = L('<rect x="3" y="3" width="14" height="14" rx="3"/><path d="m11.8 6.4-3.6 7.2"/>');
  I['sl-send'] = L('<path d="M3.2 3.6c-.4-.2-.9.2-.7.7L4.8 10l-2.3 5.7c-.2.5.3.9.7.7L17.4 10.6c.5-.2.5-1 0-1.2zM4.8 10h5.8" />', { fill: true });
  I['sl-react'] = L('<path d="M16.8 9.2a6.9 6.9 0 1 1-6-6"/><path d="M7.1 11.6c.7 1.2 1.7 1.8 2.9 1.8s2.2-.6 2.9-1.8"/><circle cx="7.7" cy="8.3" r=".85" fill="currentColor" stroke="none"/><circle cx="12.3" cy="8.3" r=".85" fill="currentColor" stroke="none"/><path d="M15.4 1.8v4.4M13.2 4h4.4"/>');
  I['sl-reply'] = I['sl-threads'];
  I['sl-check'] = L('<path d="m4.4 10.4 3.6 3.6 7.6-8"/>', { sw: 1.8 });
  I['sl-pr'] = L('<circle cx="5.6" cy="4.8" r="1.9"/><circle cx="5.6" cy="15.2" r="1.9"/><circle cx="14.4" cy="15.2" r="1.9"/><path d="M5.6 6.7v6.6M14.4 13.3V8.4a2.4 2.4 0 0 0-2.4-2.4H9.2M10.8 4.2 9 6l1.8 1.8"/>');
  I['slack-logo'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127 127" width="100%" height="100%" aria-hidden="true"><path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/><path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0"/><path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z" fill="#2EB67D"/><path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E"/></svg>';

  /* ---------- Contact photos (full colour; each fills its circle) ---------- */
  /* Blossie, the dots agent: a pale-aqua puffy cloud with two dark eyes on sky blue
     (drawn from OpenAI's own call screen, research/ui-references/chatgpt/mobile-dot-chat-and-call.png). */
  I['av-dots'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 54" width="100%" height="100%" aria-hidden="true"><defs>' +
    '<linearGradient id="msg-bl-bg" x1="0.2" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#a6dcf8"/><stop offset="1" stop-color="#4ea9e9"/></linearGradient>' +
    '<radialGradient id="msg-bl-body" cx="0.4" cy="0.28" r="0.82"><stop offset="0" stop-color="#f0fcff"/><stop offset="0.5" stop-color="#c6eef8"/><stop offset="1" stop-color="#94d4ee"/></radialGradient>' +
    '<radialGradient id="msg-bl-shade" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#1b5f9c" stop-opacity="0.32"/><stop offset="1" stop-color="#1b5f9c" stop-opacity="0"/></radialGradient>' +
    '</defs><rect width="54" height="54" fill="url(#msg-bl-bg)"/><g transform="translate(27 28.6) scale(1.18) translate(-27 -28.6)"><ellipse cx="27" cy="41.2" rx="15" ry="3.4" fill="url(#msg-bl-shade)"/>' +
    '<path d="M27.00 17.20A6.63 6.63 0 0 1 36.38 19.87A5.71 5.71 0 0 1 41.38 26.62A5.35 5.35 0 0 1 39.64 34.30A6.22 6.22 0 0 1 31.99 39.31A6.79 6.79 0 0 1 22.01 39.31A6.22 6.22 0 0 1 14.36 34.30A5.35 5.35 0 0 1 12.62 26.62A5.71 5.71 0 0 1 17.62 19.87A6.63 6.63 0 0 1 27.00 17.20Z" fill="url(#msg-bl-body)"/>' +
    '<ellipse cx="23.7" cy="25.6" rx="0.95" ry="1.25" fill="#173f50" transform="rotate(-8 23.7 25.6)"/><ellipse cx="30.4" cy="26.1" rx="0.95" ry="1.25" fill="#173f50" transform="rotate(-8 30.4 26.1)"/></g></svg>';
  I['av-blossie'] = I['av-dots'];
  /* Muse: the plush hooded mascot every Muse user starts from (drawn after the official Muse tour,
     research/ui-references/meta-ai/muse-app-library-artifacts.png), on Muse's pale-blue backdrop. */
  I['av-muse'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true"><defs>' +
    '<linearGradient id="msg-mu-bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#eaf3ff"/><stop offset="1" stop-color="#b5d3fa"/></linearGradient>' +
    '<radialGradient id="msg-mu-fur" cx="0.36" cy="0.24" r="0.9"><stop offset="0" stop-color="#f4ebe0"/><stop offset="0.55" stop-color="#dfcdb8"/><stop offset="1" stop-color="#b99f84"/></radialGradient>' +
    '<radialGradient id="msg-mu-face" cx="0.42" cy="0.3" r="0.8"><stop offset="0" stop-color="#fdf6ee"/><stop offset="1" stop-color="#ead8c5"/></radialGradient>' +
    '<filter id="msg-mu-fuzz" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0.16 0"/><feComposite in2="SourceGraphic" operator="in"/><feComposite in="SourceGraphic" operator="over"/></filter>' +
    '</defs><rect width="40" height="40" fill="url(#msg-mu-bg)"/>' +
    '<path d="M20 6.2c-6.7 0-10.8 4.9-10.8 11.4v5.9c0 3.4-1.7 5.8-4.5 8.8C3.5 33.6 3 35.8 3 40h34c0-4.2-.5-6.4-1.7-7.7-2.8-3-4.5-5.4-4.5-8.8v-5.9C30.8 11.1 26.7 6.2 20 6.2z" fill="url(#msg-mu-fur)" filter="url(#msg-mu-fuzz)"/>' +
    '<path d="M11.4 30.5c2.6 1.9 5.4 2.7 8.6 2.7s6-.8 8.6-2.7" stroke="#a88d72" stroke-opacity="0.35" stroke-width="0.8" fill="none" stroke-linecap="round"/>' +
    '<rect x="12.9" y="12.6" width="14.2" height="11" rx="5.5" fill="#c4ab90" opacity="0.55"/>' +
    '<rect x="13.2" y="12.9" width="13.6" height="10.6" rx="5.3" fill="url(#msg-mu-face)"/>' +
    '<circle cx="17.3" cy="17.9" r="1.05" fill="#2b221d"/><circle cx="22.7" cy="17.9" r="1.05" fill="#2b221d"/>' +
    '<path d="M18.9 20.2q1.1 .95 2.2 0" stroke="#2b221d" stroke-width="0.62" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="15.5" cy="20.3" rx="1.35" ry="0.8" fill="#f09d92" opacity="0.5"/><ellipse cx="24.5" cy="20.3" rx="1.35" ry="0.8" fill="#f09d92" opacity="0.5"/></svg>';
  /* Google Calendar app icon (2020 mark: four-colour frame, folded red corner, blue "31"),
     for link previews of calendar.google.com. */
  I['gcal'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true">' +
    '<rect x="44" y="44" width="105" height="105" fill="#fff"/>' +
    '<path d="M16 0h133v44H44v105H0V16A16 16 0 0 1 16 0z" fill="#4285F4"/>' +
    '<path d="M149 0h35a16 16 0 0 1 16 16v28h-51z" fill="#1967D2"/>' +
    '<path d="M149 44h51v105h-51z" fill="#FBBC04"/>' +
    '<path d="M44 149h105v51H44z" fill="#34A853"/>' +
    '<path d="M0 149h44v51H16A16 16 0 0 1 0 184z" fill="#188038"/>' +
    '<path d="M149 149h51l-51 51z" fill="#EA4335"/>' +
    '<text x="96.5" y="127" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="500" font-size="80" letter-spacing="-3" fill="#1A73E8">31</text></svg>';

  Object.defineProperty(I, 'mount', {
    enumerable: false,
    value: function (root) {
      (root || document).querySelectorAll('[data-ic]').forEach(function (el) {
        var svg = I[el.getAttribute('data-ic')];
        if (svg) el.innerHTML = svg;
      });
    }
  });
  /* iOS 26 keyboard markup: SKIN_ICONS_MESSAGING.keyboard(['I','The','I’m']) returns the inner HTML of
     <div class="ios-kb caps">. Letters are lowercase; .caps on .ios-kb shows capitals. Call mount() after. */
  Object.defineProperty(I, 'keyboard', {
    enumerable: false,
    value: function (predict) {
      var p = predict || ['I', 'The', 'I\u2019m'];
      var L = function (str) { return str.split('').map(function (c) { return '<span class="ios-kb-key l">' + c + '</span>'; }).join(''); };
      var row = function (keys, cls) { return '<div class="ios-kb-row ' + cls + '">' + keys + '</div>'; };
      return '<div class="ios-kb-predict"><span class="p0">' + p[0] + '</span><i></i><span class="p1">' + p[1] + '</span><i></i><span class="p2">' + p[2] + '</span></div>' +
        '<div class="ios-kb-rows">' +
        row(L('qwertyuiop'), 'r1') +
        row(L('asdfghjkl'), 'r2') +
        row('<span class="ios-kb-key fn shift"><span data-ic="kb-shift-on"></span></span>' + L('zxcvbnm') + '<span class="ios-kb-key fn"><span data-ic="kb-delete"></span></span>', 'r3') +
        row('<span class="ios-kb-key fn wide">123</span><span class="ios-kb-key space">space</span><span class="ios-kb-key fn wide">return</span>', 'r4') +
        '</div><div class="ios-kb-foot"><span data-ic="kb-emoji"></span><span data-ic="mic"></span></div>';
    }
  });
  window.SKIN_ICONS_MESSAGING = I;
})();

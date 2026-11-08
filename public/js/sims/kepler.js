/* Кеплер заңдары: эллипс орбита, Кеплер теңдеуі M = E − e·sinE, тең уақытта тең аудан, T² = a³ (жыл, а.б.). */
(function () {
  var PRESETS = { custom: null, earth: [1, 0.017], mars: [1.52, 0.093], mercury: [0.39, 0.206], halley: [17.8, 0.967] };
  function solveE(M, e) { var E = e > 0.8 ? Math.PI : M; for (var i = 0; i < 30; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
  function pos(a, e, M) { var E = solveE(M, e); return [a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E)]; }
  function params(P) { var p = PRESETS[P.preset]; return p ? { a: p[0], e: p[1] } : { a: P.a, e: P.e }; }
  Sim.create({
    aspect: 0.62, autoplay: true, keepRunning: true,
    hint: 'Боялған секторлар — орбитаның тең уақыт бөліктерінде сызылған аудандар.',
    controls: [
      { type: 'select', key: 'preset', label: 'Дене', value: 'custom', options: [['custom', 'Өз орбитам'], ['earth', 'Жер'], ['mars', 'Марс'], ['mercury', 'Меркурий'], ['halley', 'Галлей кометасы']] },
      { type: 'range', key: 'a', label: 'Үлкен жарты ось a', min: 0.5, max: 5, step: 0.1, value: 1.5, unit: 'а.б.', digits: 1 },
      { type: 'range', key: 'e', label: 'Эксцентриситет e', min: 0, max: 0.9, step: 0.01, value: 0.5, digits: 2 },
      { type: 'check', key: 'areas', label: 'Тең аудандарды көрсету', value: true, live: true },
    ],
    readouts: [
      { key: 'T', label: 'Период T = a^(3/2)', unit: 'жыл', digits: 2 },
      { key: 'rp', label: 'Перигелий a(1 − e)', unit: 'а.б.', digits: 2 },
      { key: 'ra', label: 'Афелий a(1 + e)', unit: 'а.б.', digits: 2 },
      { key: 'r', label: 'Қазіргі қашықтық r', unit: 'а.б.', digits: 2 },
      { key: 'v', label: 'Жылдамдық v', unit: 'км/с', digits: 1 },
      { key: 'k', label: 'v_перигелий / v_афелий', digits: 2 },
    ],
    init: function (api) { api.S.M = 0; api.S.t = 0; },
    onLive: function () {},
    step: function (api, dt) { var S = api.S; S.t += dt; S.M = (S.M + 2 * Math.PI * dt / 8) % (2 * Math.PI); }, // бір айналым экранда 8 с
    read: function (api) {
      var q = params(api.P), p = pos(q.a, q.e, api.S.M), r = Math.hypot(p[0], p[1]);
      var v = 29.78 * Math.sqrt(2 / r - 1 / q.a); // вис-вива, км/с
      return { T: Math.pow(q.a, 1.5), rp: q.a * (1 - q.e), ra: q.a * (1 + q.e), r: r, v: v, k: (1 + q.e) / (1 - q.e) };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, q = params(P), a = q.a, e = q.e, b = a * Math.sqrt(1 - e * e);
      var k = Math.min((W - 60) / (2 * a), (H - 60) / (2 * b));
      var cx = W / 2 + a * e * k, cy = H / 2; // фокус (Күн) экранда
      var X = function (x) { return cx + x * k; }, Y = function (y) { return cy - y * k; };
      ctx.fillStyle = '#081322'; ctx.fillRect(0, 0, W, H);
      // тең аудандар: 12 бөлік
      if (P.areas) {
        for (var s = 0; s < 12; s += 2) {
          ctx.beginPath(); ctx.moveTo(cx, cy);
          for (var j = 0; j <= 20; j++) { var pp = pos(a, e, 2 * Math.PI * (s + j / 20) / 12); ctx.lineTo(X(pp[0]), Y(pp[1])); }
          ctx.closePath(); ctx.fillStyle = 'rgba(124,196,255,.22)'; ctx.fill();
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (var i = 0; i <= 200; i++) { var p = pos(a, e, 2 * Math.PI * i / 200); if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }
      ctx.stroke();
      // Күн, екінші фокус, центр
      var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
      D.circle(ctx, cx, cy, 7, '#ffd25e');
      if (e > 0.02) { D.circle(ctx, X(-2 * a * e), cy, 3, null, 'rgba(255,255,255,.5)', 1); D.text(ctx, 'F₂', X(-2 * a * e), cy - 8, { size: 10, align: 'center', color: '#c4d3e0' }); }
      var pl = pos(a, e, S.M);
      D.line(ctx, cx, cy, X(pl[0]), Y(pl[1]), 'rgba(255,255,255,.4)', 1);
      D.circle(ctx, X(pl[0]), Y(pl[1]), 6, '#7cc4ff');
      D.text(ctx, 'перигелий', X(a * (1 - e)) + 6, cy + 14, { size: 10, color: '#c4d3e0' });
      D.text(ctx, 'афелий', X(-a * (1 + e)) - 4, cy + 14, { size: 10, color: '#c4d3e0', align: 'right' });
      D.text(ctx, 'T = ' + api.fmt(Math.pow(a, 1.5), 2) + ' жыл', 12, 22, { size: 13, mono: true, color: '#ffd25e', weight: '600' });
    },
  });
})();

/* Иінтірек: M = F·l. Тепе-теңдік M₁ = M₂ болғанда. Бөліктер — 10 см. */
(function () {
  var g = 9.8;
  Sim.create({
    aspect: 0.56, static: true, resetLabel: false,
    hint: 'Бір бөлік — 10 см.',
    controls: [
      { type: 'range', key: 'm1', label: 'Сол жақ жүк m₁', min: 0.1, max: 3, step: 0.1, value: 1, unit: 'кг', digits: 1 },
      { type: 'range', key: 'd1', label: 'Сол жақ иін l₁ (бөлік)', min: 1, max: 6, step: 1, value: 4, digits: 0 },
      { type: 'range', key: 'm2', label: 'Оң жақ жүк m₂', min: 0.1, max: 3, step: 0.1, value: 2, unit: 'кг', digits: 1 },
      { type: 'range', key: 'd2', label: 'Оң жақ иін l₂ (бөлік)', min: 1, max: 6, step: 1, value: 3, digits: 0 },
    ],
    readouts: [
      { key: 'M1', label: 'M₁ = m₁g·l₁', unit: 'Н·м' },
      { key: 'M2', label: 'M₂ = m₂g·l₂', unit: 'Н·м' },
      { key: 'st', label: 'Күйі' },
      { key: 'gain', label: 'Күштен ұтыс F₁/F₂' },
    ],
    init: function () {},
    step: function () {},
    read: function (api) {
      var P = api.P, M1 = P.m1 * g * P.d1 / 10, M2 = P.m2 * g * P.d2 / 10, d = M1 - M2;
      return { M1: M1, M2: M2, st: Math.abs(d) < 1e-9 ? 'тепе-теңдік ✓' : d > 0 ? 'сол жағы төмен түседі' : 'оң жағы төмен түседі', gain: P.m1 / P.m2 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D;
      var M1 = P.m1 * P.d1, M2 = P.m2 * P.d2, diff = M1 - M2;
      var ang = Math.abs(diff) < 1e-9 ? 0 : Math.max(-0.2, Math.min(0.2, -diff * 0.05));
      var cx = W / 2, cy = H * 0.42, L = Math.min(W * 0.42, 320), u = L / 6;
      // тірек
      ctx.fillStyle = C.line; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 26, cy + 60); ctx.lineTo(cx + 26, cy + 60); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.bg2; ctx.fillRect(cx - 120, cy + 60, 240, 8);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.fillStyle = C.brass; ctx.fillRect(-L - 8, -6, 2 * L + 16, 12);
      for (var i = -6; i <= 6; i++) {
        D.line(ctx, i * u, -6, i * u, 6, '#ffffff', 1);
        if (i) D.text(ctx, String(Math.abs(i)), i * u, -10, { size: 10, align: 'center', color: C.muted, mono: true });
      }
      D.circle(ctx, 0, 0, 5, C.ink);
      function weight(pos, m, color) {
        var x = pos * u, s = 20 + m * 9;
        ctx.save(); ctx.translate(x, 6); ctx.rotate(-ang);
        D.line(ctx, 0, 0, 0, 34, C.ink, 1.5);
        ctx.fillStyle = color; ctx.fillRect(-s / 2, 34, s, s);
        D.text(ctx, api.fmt(m, 1) + ' кг', 0, 34 + s + 14, { size: 11, align: 'center', color: C.muted });
        D.arrow(ctx, 0, 34 + s / 2, 0, 34 + s / 2 + m * 16, C.red, 2);
        ctx.restore();
      }
      weight(-P.d1, P.m1, C.blue);
      weight(P.d2, P.m2, C.orange);
      ctx.restore();
      var ok = Math.abs(diff) < 1e-9;
      D.text(ctx, ok ? 'M₁ = M₂ — иінтірек тепе-теңдікте' : (diff > 0 ? 'M₁ > M₂' : 'M₁ < M₂'), cx, H - 18, { size: 14, align: 'center', weight: '600', color: ok ? C.good : C.bad });
    },
  });
})();

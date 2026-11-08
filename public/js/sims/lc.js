/* Тербелмелі контур: Lq'' + Rq' + q/C = 0. Уақыт 100 есе баяулатылған. */
(function () {
  var U0 = 10, SLOW = 100;
  Sim.create({
    aspect: 0.62, substeps: 20,
    hint: 'Уақыт 100 есе баяулатылған: нақты период мыңдаған есе қысқа.',
    controls: [
      { type: 'range', key: 'L', label: 'Индуктивтілік L', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'Гн', digits: 1 },
      { type: 'range', key: 'C', label: 'Сыйымдылық C', min: 10, max: 200, step: 10, value: 50, unit: 'мкФ', digits: 0 },
      { type: 'range', key: 'R', label: 'Кедергі R', min: 0, max: 60, step: 2, value: 0, unit: 'Ом', digits: 0 },
    ],
    readouts: [
      { key: 'T', label: 'Период T = 2π√(LC)', unit: 'мс', digits: 2 },
      { key: 'nu', label: 'Жиілік ν', unit: 'Гц', digits: 1 },
      { key: 'q', label: 'Заряд q', unit: 'мкКл', digits: 0 },
      { key: 'i', label: 'Ток i', unit: 'мА', digits: 1 },
      { key: 'we', label: 'Электр өрісі энергиясы', unit: 'мДж', digits: 2 },
      { key: 'wm', label: 'Магнит өрісі энергиясы', unit: 'мДж', digits: 2 },
    ],
    init: function (api) { var S = api.S, C = api.P.C * 1e-6; S.q = C * U0; S.i = 0; S.t = 0; S.h = []; S.hl = -1; },
    step: function (api, dt) {
      var S = api.S, P = api.P, C = P.C * 1e-6, h = dt / SLOW;
      // жартылай имплицитті Эйлер (энергияны жақсы сақтайды)
      S.i += (-(S.q / C) - P.R * S.i) / P.L * h;
      S.q += S.i * h;
      S.t += h;
      if (S.t - S.hl > 0.0004) { S.hl = S.t; S.h.push([S.t * 1000, S.q / (C * U0), -S.i * Math.sqrt(P.L / C) / U0]); if (S.h.length > 1400) S.h.shift(); }
    },
    read: function (api) {
      var S = api.S, P = api.P, C = P.C * 1e-6, T = 2 * Math.PI * Math.sqrt(P.L * C);
      return { T: T * 1000, nu: 1 / T, q: S.q * 1e6, i: S.i * 1000, we: S.q * S.q / (2 * C) * 1000, wm: P.L * S.i * S.i / 2 * 1000 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, Cc = api.C, D = api.D, C = P.C * 1e-6;
      var x0 = 40, y0 = 50, w = W * 0.3, h = H * 0.45;
      ctx.strokeStyle = Cc.ink; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, w, h);
      // конденсатор (сол жақ)
      ctx.fillStyle = Cc.bg; ctx.fillRect(x0 - 20, y0 + h / 2 - 10, 40, 20);
      D.line(ctx, x0 - 20, y0 + h / 2 - 6, x0 + 20, y0 + h / 2 - 6, Cc.ink, 3); D.line(ctx, x0 - 20, y0 + h / 2 + 6, x0 + 20, y0 + h / 2 + 6, Cc.ink, 3);
      var qn = S.q / (C * U0);
      var n = Math.round(Math.abs(qn) * 5);
      for (var i = 0; i < n; i++) {
        D.text(ctx, qn > 0 ? '+' : '−', x0 - 16 + i * 7, y0 + h / 2 - 10, { size: 10, color: qn > 0 ? Cc.red : Cc.blue, weight: '700' });
        D.text(ctx, qn > 0 ? '−' : '+', x0 - 16 + i * 7, y0 + h / 2 + 20, { size: 10, color: qn > 0 ? Cc.blue : Cc.red, weight: '700' });
      }
      // электр өрісі сызықтары
      ctx.globalAlpha = Math.min(1, Math.abs(qn));
      for (var j = -1; j <= 1; j++) D.line(ctx, x0 + j * 10, y0 + h / 2 - 4, x0 + j * 10, y0 + h / 2 + 4, Cc.purple, 1.5);
      ctx.globalAlpha = 1;
      // катушка (оң жақ)
      var kx = x0 + w;
      ctx.fillStyle = Cc.bg; ctx.fillRect(kx - 12, y0 + h / 2 - 40, 24, 80);
      for (var t = 0; t < 7; t++) { ctx.strokeStyle = Cc.orange; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(kx, y0 + h / 2 - 34 + t * 11, 12, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
      var inorm = S.i * Math.sqrt(P.L / C) / U0;
      ctx.globalAlpha = Math.min(1, Math.abs(inorm));
      ctx.strokeStyle = Cc.good; ctx.lineWidth = 1.5;
      for (var m = 1; m <= 2; m++) { ctx.beginPath(); ctx.ellipse(kx, y0 + h / 2, 24 * m, 52, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (Math.abs(inorm) > 0.05) D.arrow(ctx, x0 + w / 2 - 20 * Math.sign(-S.i), y0, x0 + w / 2 + 20 * Math.sign(-S.i), y0, Cc.good, 2.5, 'i');
      // энергия бағаналары
      var we = S.q * S.q / (2 * C), wm = P.L * S.i * S.i / 2, W0 = C * U0 * U0 / 2;
      var bx = x0, base = H - 30, bh = H * 0.28;
      [['W_E', we, Cc.purple], ['W_M', wm, Cc.good], ['W', we + wm, Cc.accent]].forEach(function (b, i) {
        var x = bx + i * 48, hh = b[1] / W0 * bh;
        ctx.fillStyle = Cc.bg2; ctx.fillRect(x, base - bh, 30, bh);
        ctx.fillStyle = b[2]; ctx.fillRect(x, base - hh, 30, hh);
        D.text(ctx, b[0], x + 15, base + 14, { size: 10, align: 'center', color: Cc.muted });
      });
      // q(t), i(t)
      var T = 2 * Math.PI * Math.sqrt(P.L * C) * 1000, t1 = S.t * 1000, span = 3 * T, t0 = Math.max(0, t1 - span);
      D.plot(ctx, { x: W * 0.48, y: 40, w: W * 0.48, h: H - 100 }, {
        xmin: t0, xmax: t0 + span, ymin: -1.15, ymax: 1.15, xlabel: 't, мс', ylabel: 'q/q₀ (күлгін), i/i₀ (жасыл)',
        series: [{ pts: S.h.map(function (p) { return [p[0], p[1]]; }), color: Cc.purple }, { pts: S.h.map(function (p) { return [p[0], p[2]]; }), color: Cc.good }],
      });
    },
  });
})();

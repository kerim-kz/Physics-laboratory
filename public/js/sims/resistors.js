/* Резисторларды тізбектей және параллель жалғау. Электрондардың жылжу жылдамдығы ток күшіне пропорционал. */
(function () {
  function calc(P) {
    if (P.mode === 'series') {
      var R = P.R1 + P.R2, I = P.U / R;
      return { R: R, I: I, I1: I, I2: I, U1: I * P.R1, U2: I * P.R2 };
    }
    var Rp = P.R1 * P.R2 / (P.R1 + P.R2);
    return { R: Rp, I: P.U / Rp, I1: P.U / P.R1, I2: P.U / P.R2, U1: P.U, U2: P.U };
  }
  function resistor(ctx, x, y, w, h, label, C, D, vertical) {
    ctx.fillStyle = C.bg; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    if (vertical) { ctx.fillRect(x - h / 2, y - w / 2, h, w); ctx.strokeRect(x - h / 2, y - w / 2, h, w); D.text(ctx, label, x + h / 2 + 6, y + 4, { size: 12, weight: '600' }); }
    else { ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.strokeRect(x - w / 2, y - h / 2, w, h); D.text(ctx, label, x, y - h / 2 - 6, { size: 12, align: 'center', weight: '600' }); }
  }
  function meter(ctx, x, y, letter, val, unit, C, D, api) {
    D.circle(ctx, x, y, 15, C.bg, C.ink, 2);
    D.text(ctx, letter, x, y + 5, { size: 14, align: 'center', weight: '600' });
    D.text(ctx, api.fmt(val, 2) + ' ' + unit, x, y + 32, { size: 11, align: 'center', mono: true, color: C.accent, weight: '600', bg: C.bg });
  }
  function pointAt(pts, d) {
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= l) return [a[0] + (b[0] - a[0]) * d / l, a[1] + (b[1] - a[1]) * d / l];
      d -= l;
    }
    return pts[pts.length - 1];
  }
  function plen(pts) { var s = 0; for (var i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  Sim.create({
    aspect: 0.6, autoplay: true,
    hint: 'Нүктелер — электрондар емес, токтың шартты бағыты (+ → −).',
    controls: [
      { type: 'select', key: 'mode', label: 'Жалғау', value: 'series', options: [['series', 'Тізбектей'], ['parallel', 'Параллель']], live: true },
      { type: 'range', key: 'U', label: 'Көздің кернеуі U', min: 1, max: 24, step: 1, value: 12, unit: 'В', digits: 0, live: true },
      { type: 'range', key: 'R1', label: 'Кедергі R₁', min: 1, max: 50, step: 1, value: 4, unit: 'Ом', digits: 0, live: true },
      { type: 'range', key: 'R2', label: 'Кедергі R₂', min: 1, max: 50, step: 1, value: 8, unit: 'Ом', digits: 0, live: true },
    ],
    readouts: [
      { key: 'R', label: 'Жалпы кедергі R', unit: 'Ом' },
      { key: 'I', label: 'Жалпы ток I', unit: 'А' },
      { key: 'I1', label: 'I₁', unit: 'А' }, { key: 'I2', label: 'I₂', unit: 'А' },
      { key: 'U1', label: 'U₁', unit: 'В' }, { key: 'U2', label: 'U₂', unit: 'В' },
      { key: 'P', label: 'Жалпы қуат P = UI', unit: 'Вт' },
    ],
    init: function (api) { api.S.ph = 0; },
    onLive: function () {},
    step: function (api, dt) { api.S.ph += dt; },
    read: function (api) { var c = calc(api.P); c.P = api.P.U * c.I; return c; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, c = calc(P);
      var L = W * 0.12, Rr = W * 0.88, T = H * 0.18, B = H * 0.82, mid = W * 0.5;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L, B); ctx.lineTo(L, T); ctx.lineTo(Rr, T); ctx.lineTo(Rr, B); ctx.lineTo(L, B); ctx.stroke();
      if (P.mode === 'parallel') { ctx.beginPath(); ctx.moveTo(mid, T); ctx.lineTo(mid, B); ctx.stroke(); }
      // ток көзі (сол жақ)
      ctx.fillStyle = C.bg; ctx.fillRect(L - 14, H / 2 - 16, 28, 32);
      D.line(ctx, L - 14, H / 2 - 6, L + 14, H / 2 - 6, C.ink, 3); D.line(ctx, L - 7, H / 2 + 6, L + 7, H / 2 + 6, C.ink, 3);
      D.text(ctx, '+', L + 18, H / 2 - 6, { size: 12, weight: '600' }); D.text(ctx, '−', L + 18, H / 2 + 12, { size: 12, weight: '600' });
      D.text(ctx, P.U + ' В', L - 20, H / 2 + 4, { size: 12, align: 'right', mono: true, weight: '600' });
      // резисторлар
      if (P.mode === 'series') {
        resistor(ctx, W * 0.4, T, 70, 22, 'R₁ = ' + P.R1 + ' Ом', C, D);
        resistor(ctx, Rr, H / 2, 70, 22, 'R₂ = ' + P.R2 + ' Ом', C, D, true);
        meter(ctx, W * 0.7, T, 'A', c.I, 'А', C, D, api);
        meter(ctx, W * 0.4, T + 62, 'V', c.U1, 'В', C, D, api);
        D.line(ctx, W * 0.4 - 35, T, W * 0.4 - 35, T + 62, C.muted, 1, [3, 3]); D.line(ctx, W * 0.4 + 35, T, W * 0.4 + 35, T + 62, C.muted, 1, [3, 3]);
        meter(ctx, Rr - 70, H / 2, 'V', c.U2, 'В', C, D, api);
      } else {
        resistor(ctx, mid, H / 2, 70, 22, 'R₁ = ' + P.R1 + ' Ом', C, D, true);
        resistor(ctx, Rr, H / 2, 70, 22, 'R₂ = ' + P.R2 + ' Ом', C, D, true);
        meter(ctx, (L + mid) / 2, T, 'A', c.I, 'А', C, D, api);
        meter(ctx, mid, B - 40, 'A', c.I1, 'А', C, D, api);
        meter(ctx, Rr, B - 40, 'A', c.I2, 'А', C, D, api);
        meter(ctx, (mid + Rr) / 2, H / 2, 'V', c.U1, 'В', C, D, api);
      }
      // токтың «тамшылары»
      var list = P.mode === 'series' ? [[[[L, H / 2], [L, T], [Rr, T], [Rr, B], [L, B], [L, H / 2]], c.I]] : [[[[L, H / 2], [L, T], [mid, T], [mid, B], [L, B], [L, H / 2]], c.I1], [[[mid, T], [Rr, T], [Rr, B], [mid, B]], c.I2]];
      list.forEach(function (f) {
        var pts = f[0], len = plen(pts), sp = Math.min(220, 18 * f[1]), gap = 34;
        for (var d = (S.ph * sp) % gap; d < len; d += gap) { var p = pointAt(pts, d); D.circle(ctx, p[0], p[1], 3.5, C.orange); }
      });
    },
  });
})();

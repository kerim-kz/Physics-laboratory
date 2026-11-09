/* Ом заңы: I = U/R. Резистордың вольт-амперлік сипаттамасы — түзу, қыздыру шамынікі — иілген (қызған сайын кедергісі артады). */
(function () {
  function current(P, U) {
    if (P.el === 'lamp') { var R = 5 + 35 * (1 - Math.exp(-U / 4)); return U / R; }
    return U / P.R;
  }
  function gauge(ctx, api, x, y, r, val, max, unit, label) {
    var C = api.C, D = api.D;
    ctx.save();
    ctx.fillStyle = C.bg; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (var i = 0; i <= 10; i++) {
      var a = Math.PI + i / 10 * Math.PI, l = i % 5 ? 6 : 11;
      D.line(ctx, x + Math.cos(a) * (r - l), y + Math.sin(a) * (r - l), x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2), C.ink, 1);
      if (i % 5 === 0) D.text(ctx, api.fmt(max * i / 10, max < 2 ? 1 : 0), x + Math.cos(a) * (r - 22), y + Math.sin(a) * (r - 22) + 4, { size: 9, align: 'center', mono: true, color: C.muted });
    }
    var ang = Math.PI + Math.min(1, Math.max(0, val / max)) * Math.PI;
    D.line(ctx, x, y, x + Math.cos(ang) * (r - 8), y + Math.sin(ang) * (r - 8), C.red, 2.5);
    D.circle(ctx, x, y, 4, C.ink, null, 0, true);
    D.text(ctx, label, x, y - r * 0.38, { size: 15, align: 'center', weight: '700' });
    D.text(ctx, api.fmt(val, 2) + ' ' + unit, x, y + 18, { size: 12, align: 'center', mono: true, weight: '600' });
    ctx.restore();
  }
  Sim.create({
    aspect: 0.62, static: true, resetLabel: false,
    hint: 'Кернеуді өзгертіп, «Өлшеуді жазу» арқылы I(U) кестесін толтыр.',
    controls: [
      { type: 'select', key: 'el', label: 'Тізбектегі элемент', value: 'res', options: [['res', 'Резистор'], ['lamp', 'Қыздыру шамы']] },
      { type: 'range', key: 'R', label: 'Резистордың кедергісі R', min: 2, max: 50, step: 1, value: 10, unit: 'Ом', digits: 0 },
      { type: 'range', key: 'U', label: 'Кернеу U', min: 0, max: 12, step: 0.5, value: 6, unit: 'В', digits: 1 },
    ],
    readouts: [
      { key: 'U', label: 'Вольтметр U', unit: 'В' },
      { key: 'I', label: 'Амперметр I', unit: 'А', digits: 3 },
      { key: 'R', label: 'Кедергі R = U / I', unit: 'Ом', digits: 1 },
      { key: 'P', label: 'Қуат P = UI', unit: 'Вт' },
    ],
    init: function () {},
    step: function () {},
    read: function (api) {
      var P = api.P, I = current(P, P.U);
      return { U: P.U, I: I, R: I > 0 ? P.U / I : null, P: P.U * I };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D, I = current(P, P.U), lamp = P.el === 'lamp';
      // схема
      var L = 40, Rr = W * 0.5, T = 50, B = H * 0.55;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(L, T, Rr - L, B - T);
      ctx.fillStyle = C.bg; ctx.fillRect(L - 14, (T + B) / 2 - 14, 28, 28);
      D.line(ctx, L - 13, (T + B) / 2 - 5, L + 13, (T + B) / 2 - 5, C.ink, 3); D.line(ctx, L - 7, (T + B) / 2 + 5, L + 7, (T + B) / 2 + 5, C.ink, 3);
      D.text(ctx, api.fmt(P.U, 1) + ' В', L + 18, (T + B) / 2 + 4, { size: 11, mono: true });
      var ex = (L + Rr) / 2;
      if (lamp) {
        var glow = Math.min(1, P.U * I / 4);
        if (glow > 0.02) { var gr = ctx.createRadialGradient(ex, T, 2, ex, T, 50); gr.addColorStop(0, 'rgba(255,220,120,' + glow + ')'); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ex, T, 50, 0, Math.PI * 2); ctx.fill(); }
        D.circle(ctx, ex, T, 16, C.bg, C.ink, 2, true);
        D.line(ctx, ex - 11, T - 11, ex + 11, T + 11, C.ink, 1.5); D.line(ctx, ex - 11, T + 11, ex + 11, T - 11, C.ink, 1.5);
      } else {
        ctx.fillStyle = C.bg; ctx.fillRect(ex - 34, T - 11, 68, 22); ctx.strokeRect(ex - 34, T - 11, 68, 22);
        D.text(ctx, P.R + ' Ом', ex, T - 18, { size: 11, align: 'center', weight: '600' });
      }
      gauge(ctx, api, Rr, (T + B) / 2 + 30, 46, I, lamp ? 0.5 : Math.max(0.5, Math.ceil(12 / P.R * 2) / 2), 'А', 'A');
      gauge(ctx, api, ex, B + 70, 46, P.U, 12, 'В', 'V');
      D.line(ctx, ex - 40, B, ex - 40, B + 40, C.muted, 1, [3, 3]); D.line(ctx, ex + 40, B, ex + 40, B + 40, C.muted, 1, [3, 3]);
      // I(U) сипаттамасы
      var pts = []; for (var u = 0; u <= 12.001; u += 0.25) pts.push([u, current(P, u)]);
      var imax = Math.max(0.2, current(P, 12) * 1.15);
      var g1 = D.plot(ctx, { x: W * 0.62, y: 40, w: W * 0.34, h: H - 100 }, { xmin: 0, xmax: 12, ymin: 0, ymax: imax, xlabel: 'U, В', ylabel: 'I, А', series: [{ pts: pts, color: lamp ? C.orange : C.accent }] });
      D.circle(ctx, g1.X(P.U), g1.Y(I), 5, C.bad, null, 0, true);
      D.text(ctx, lamp ? 'Шам: сипаттама иілген' : 'Резистор: сипаттама — түзу', W * 0.62 + 6, 58, { size: 11, weight: '600', color: lamp ? C.orange : C.accent });
    },
  });
})();

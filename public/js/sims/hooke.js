/* Гук заңы: F = kΔl. Серіппелерді тізбектей (1/k = 1/k₁ + 1/k₂) және параллель (k = k₁ + k₂) жалғау. */
(function () {
  var g = 9.8;
  function keq(P) {
    if (P.mode === 'one') return P.k1;
    if (P.mode === 'series') return P.k1 * P.k2 / (P.k1 + P.k2);
    return P.k1 + P.k2;
  }
  function spring(ctx, x, y1, y2, color, coils) {
    var n = coils || 12, w = 10, L = y2 - y1;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y1);
    ctx.lineTo(x, y1 + 6);
    for (var i = 0; i <= n; i++) ctx.lineTo(x + (i % 2 ? w : -w) * (i === 0 || i === n ? 0 : 1), y1 + 6 + (L - 12) * i / n);
    ctx.lineTo(x, y2); ctx.stroke(); ctx.restore();
  }
  Sim.create({
    aspect: 0.62, static: true, resetLabel: false,
    hint: 'Сызғыш бойынша ұзаруды өлше.',
    controls: [
      { type: 'select', key: 'mode', label: 'Жалғау түрі', value: 'one', options: [['one', 'Бір серіппе (k₁)'], ['series', 'Тізбектей'], ['parallel', 'Параллель']] },
      { type: 'range', key: 'k1', label: 'Қатаңдық k₁', min: 10, max: 200, step: 10, value: 50, unit: 'Н/м', digits: 0 },
      { type: 'range', key: 'k2', label: 'Қатаңдық k₂', min: 10, max: 200, step: 10, value: 50, unit: 'Н/м', digits: 0 },
      { type: 'range', key: 'm', label: 'Жүктің массасы m', min: 0, max: 1, step: 0.05, value: 0.3, unit: 'кг', digits: 2 },
    ],
    readouts: [
      { key: 'F', label: 'Серпімділік күші F = mg', unit: 'Н' },
      { key: 'k', label: 'Жүйенің қатаңдығы k', unit: 'Н/м', digits: 1 },
      { key: 'dl', label: 'Ұзару Δl', unit: 'см', digits: 1 },
      { key: 'dl1', label: 'Бірінші серіппенің ұзаруы', unit: 'см', digits: 1 },
    ],
    init: function () {},
    step: function () {},
    read: function (api) {
      var P = api.P, F = P.m * g, k = keq(P), dl = F / k;
      var dl1 = P.mode === 'parallel' ? dl : F / P.k1;
      return { F: F, k: k, dl: dl * 100, dl1: dl1 * 100 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D;
      var top = 30;
      var cm = (H - 120) / 30; // 30 см сызғыш
      var F = P.m * g;
      var L0 = 8 * cm; // серіппенің бастапқы ұзындығы 8 см
      var cx = W * 0.3;
      ctx.fillStyle = C.line; ctx.fillRect(cx - 90, top - 10, 180, 10);
      var bottom;
      var avail = H - 70 - top - (P.mode === 'series' ? 2 * L0 / 1.3 : L0) - (26 + P.m * 16);
      var need = (P.mode === 'series' ? F / P.k1 + F / P.k2 : F / keq(P)) * 100 * cm;
      var f = need > avail ? avail / need : 1;
      if (f < 1) D.text(ctx, 'Ұзару сызғыштан асып кетті — сурет қысылып көрсетілген', 16, H - 12, { size: 11, color: C.brass, weight: '600' });
      if (P.mode === 'parallel') {
        var d = F / keq(P) * 100 * cm * f;
        spring(ctx, cx - 28, top, top + L0 + d, C.blue);
        spring(ctx, cx + 28, top, top + L0 + d, C.purple);
        D.line(ctx, cx - 40, top + L0 + d, cx + 40, top + L0 + d, C.ink, 3);
        bottom = top + L0 + d;
      } else if (P.mode === 'series') {
        var d1 = F / P.k1 * 100 * cm * f, d2 = F / P.k2 * 100 * cm * f;
        spring(ctx, cx, top, top + L0 / 1.3 + d1, C.blue, 9);
        D.circle(ctx, cx, top + L0 / 1.3 + d1, 4, C.ink);
        spring(ctx, cx, top + L0 / 1.3 + d1, top + 2 * L0 / 1.3 + d1 + d2, C.purple, 9);
        bottom = top + 2 * L0 / 1.3 + d1 + d2;
      } else {
        var dd = F / P.k1 * 100 * cm * f;
        spring(ctx, cx, top, top + L0 + dd, C.blue);
        bottom = top + L0 + dd;
      }
      var base = P.mode === 'series' ? top + 2 * L0 / 1.3 : top + L0;
      // жүк
      var bw = 34 + P.m * 30;
      ctx.fillStyle = C.brass; ctx.fillRect(cx - bw / 2, bottom, bw, 26 + P.m * 16);
      D.text(ctx, api.fmt(P.m, 2) + ' кг', cx, bottom + 18, { size: 11, align: 'center', color: '#fff', weight: '600' });
      // сызғыш
      var rx = cx + 80;
      ctx.fillStyle = C.bg2; ctx.fillRect(rx, top, 30, 30 * cm);
      for (var i = 0; i <= 30; i++) {
        var y = top + i * cm;
        D.line(ctx, rx, y, rx + (i % 5 ? 7 : 14), y, C.ink, 1);
        if (i % 5 === 0) D.text(ctx, String(i), rx + 16, y + 4, { size: 10, mono: true, color: C.muted });
      }
      D.line(ctx, cx + 20, base, rx, base, C.muted, 1, [3, 3]);
      D.line(ctx, cx + 20, bottom, rx, bottom, C.accent, 1.5, [3, 3]);
      // F(Δl) графигі
      var kq = keq(P), dmax = 0.4;
      var r = { x: W * 0.58, y: 40, w: W * 0.38, h: H - 110 };
      var g1 = D.plot(ctx, r, { xmin: 0, xmax: dmax * 100, ymin: 0, ymax: 10, xlabel: 'Δl, см', ylabel: 'F, Н',
        series: [{ pts: [[0, 0], [Math.min(dmax, 10 / kq) * 100, Math.min(10, kq * dmax)]], color: C.accent }] });
      var dlc = F / kq * 100;
      if (dlc <= dmax * 100) D.circle(ctx, g1.X(dlc), g1.Y(F), 5, C.bad);
      D.text(ctx, 'k = F / Δl', r.x + 10, r.y + 18, { size: 12, mono: true, weight: '600' });
    },
  });
})();

/* Гук заңы: F = kΔl. Серіппелерді тізбектей (1/k = 1/k₁ + 1/k₂) және параллель (k = k₁ + k₂) жалғау. */
(function () {
  var g = 9.8;
  function keq(P) {
    if (P.mode === 'one') return P.k1;
    if (P.mode === 'series') return P.k1 * P.k2 / (P.k1 + P.k2);
    return P.k1 + P.k2;
  }
  var R = window.Real;
  // Металл серіппе (шынайы көрініс): көк — бірінші, күлгін реңк — екінші серіппе
  function spring(ctx, x, y1, y2, color, coils) {
    R.spring(ctx, x, y1, x, y2, { coils: coils || 12, r: 10, wire: 2.2, color: color === api0.C.purple ? '#a99bc4' : '#9fb2c4' });
  }
  var api0 = { C: Sim.C };
  Sim.create({
    tools: ['ruler'],
    scale: function (api) { return api._sc || null; },
    aspect: 0.62, static: true, resetLabel: false, grid: false,
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
      api._sc = { px: cm, unit: 'см' };
      var F = P.m * g;
      var L0 = 8 * cm; // серіппенің бастапқы ұзындығы 8 см
      var cx = W * 0.3;
      R.scene(ctx, W, H, 'lab', { table: H - 20 });
      R.block(ctx, cx - 90, top - 14, 180, 12, 'iron', { depth: 6, shadow: false });
      var bottom;
      var avail = H - 70 - top - (P.mode === 'series' ? 2 * L0 / 1.3 : L0) - (26 + P.m * 16);
      var need = (P.mode === 'series' ? F / P.k1 + F / P.k2 : F / keq(P)) * 100 * cm;
      var f = need > avail ? avail / need : 1;
      if (f < 1) D.text(ctx, 'Ұзару сызғыштан асып кетті — сурет қысылып көрсетілген', 16, H - 12, { size: 11, color: C.brass, weight: '600' });
      if (P.mode === 'parallel') {
        var d = F / keq(P) * 100 * cm * f;
        spring(ctx, cx - 28, top, top + L0 + d, C.blue);
        spring(ctx, cx + 28, top, top + L0 + d, C.purple);
        R.block(ctx, cx - 40, top + L0 + d - 3, 80, 6, 'steel', { depth: 3, shadow: false });
        bottom = top + L0 + d;
      } else if (P.mode === 'series') {
        var d1 = F / P.k1 * 100 * cm * f, d2 = F / P.k2 * 100 * cm * f;
        spring(ctx, cx, top, top + L0 / 1.3 + d1, C.blue, 9);
        R.sphere(ctx, cx, top + L0 / 1.3 + d1, 4, '#8f99a3');
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
      R.cylinder(ctx, cx - bw / 2, bottom, bw, 26 + P.m * 16, 'brass', { shadow: false, ry: 4, label: api.fmt(P.m, 2) + ' кг', labelSize: 11 });
      // сызғыш
      var rx = cx + 80;
      R.ruler(ctx, rx + 30, top - 4, 30 * cm + 8, cm, { vertical: true, width: 30 });
      D.line(ctx, cx + 20, base, rx, base, C.muted, 1, [3, 3]);
      D.line(ctx, cx + 20, bottom, rx, bottom, C.accent, 1.5, [3, 3]);
      // F(Δl) графигі
      var kq = keq(P), dmax = 0.4;
      var r = { x: W * 0.58, y: 40, w: W * 0.38, h: H - 110 };
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.9)'; R.rr(ctx, r.x - 44, r.y - 24, r.w + 58, r.h + 60, 10); ctx.fill(); ctx.restore();
      var g1 = D.plot(ctx, r, { xmin: 0, xmax: dmax * 100, ymin: 0, ymax: 10, xlabel: 'Δl, см', ylabel: 'F, Н',
        series: [{ pts: [[0, 0], [Math.min(dmax, 10 / kq) * 100, Math.min(10, kq * dmax)]], color: C.accent }] });
      var dlc = F / kq * 100;
      if (dlc <= dmax * 100) D.circle(ctx, g1.X(dlc), g1.Y(F), 5, C.bad);
      D.text(ctx, 'k = F / Δl', r.x + 10, r.y + 18, { size: 12, mono: true, weight: '600' });
    },
  });
})();

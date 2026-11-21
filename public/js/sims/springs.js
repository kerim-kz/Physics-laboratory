/* Серіппелерді тізбектей және параллель жалғау. Тізбектей: 1/k = 1/k₁ + 1/k₂; параллель: k = k₁ + k₂. Ұзарудың өлшенуі. */
(function () {
  var R = window.Real, g = 9.81;
  function keff(P) { return P.mode === 'series' ? 1 / (1 / P.k1 + 1 / P.k2) : P.mode === 'parallel' ? P.k1 + P.k2 : P.k1; }
  Sim.create({
    aspect: 0.62, grid: false, static: true,
    hint: 'Бірдей жүкті бір серіппеге, екі серіппеге тізбектей, сосын параллель іл. Ұзаруларды салыстырып, жүйенің қатаңдығын тап.',
    controls: [
      { type: 'select', key: 'mode', label: 'Жалғау', value: 'series', options: [['one', 'Бір серіппе (k₁)'], ['series', 'Тізбектей'], ['parallel', 'Параллель']] },
      { type: 'range', key: 'k1', label: 'Бірінші серіппенің қатаңдығы k₁', min: 20, max: 100, step: 10, value: 40, unit: 'Н/м', digits: 0 },
      { type: 'range', key: 'k2', label: 'Екінші серіппенің қатаңдығы k₂', min: 20, max: 100, step: 10, value: 40, unit: 'Н/м', digits: 0 },
      { type: 'range', key: 'm', label: 'Жүктің массасы m', min: 100, max: 500, step: 50, value: 200, unit: 'г', digits: 0 },
    ],
    readouts: [
      { key: 'F', label: 'Жүктің салмағы P = mg', unit: 'Н', digits: 2 },
      { key: 'dl', label: 'Жүйенің ұзаруы Δl', unit: 'см', digits: 2 },
      { key: 'k', label: 'Жүйенің қатаңдығы k = P/Δl', unit: 'Н/м', digits: 1 },
    ],
    init: function () {}, step: function () { return false; },
    read: function (api) { var P = api.P, F = P.m / 1000 * g, k = keff(P); return { F: F, dl: F / k * 100, k: k }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, table = H * 0.94, F = P.m / 1000 * g, top = 34, ppc = Math.min(9, (table - top - 70) / 68); // px/см (ең ұзын жағдай сыйсын)
      R.scene(ctx, W, H, 'lab', { table: table });
      var sx = W * 0.42;
      R.block(ctx, sx - 120, table - 12, 200, 12, 'iron', { depth: 6 });
      R.cylinder(ctx, sx - 116, top - 10, 8, table - 12 - top + 10, 'steel', { shadow: false });
      R.block(ctx, sx - 116, top - 12, 200, 10, 'iron', { depth: 4, shadow: false });
      var L0 = 8; // еркін ұзындығы, см
      var hookY;
      if (P.mode === 'parallel') {
        var dl = F / (P.k1 + P.k2) * 100, y2 = top + (L0 + dl) * ppc;
        R.spring(ctx, sx - 22, top, sx - 22, y2, { coils: 10, r: 8 }); R.spring(ctx, sx + 22, top, sx + 22, y2, { coils: 10, r: 8, color: '#b98a5a' });
        R.block(ctx, sx - 34, y2, 68, 6, 'steel', { depth: 3, shadow: false });
        hookY = y2 + 6;
        R.tag(ctx, 'k₁', sx - 48, top + 30, { size: 10 }); R.tag(ctx, 'k₂', sx + 48, top + 30, { size: 10 });
      } else if (P.mode === 'series') {
        var d1 = F / P.k1 * 100, d2 = F / P.k2 * 100, ym = top + (L0 + d1) * ppc, yb = ym + 8 + (L0 + d2) * ppc;
        R.spring(ctx, sx, top, sx, ym, { coils: 10, r: 8 }); ctx.fillStyle = '#7d878f'; ctx.fillRect(sx - 5, ym, 10, 8);
        R.spring(ctx, sx, ym + 8, sx, yb, { coils: 10, r: 8, color: '#b98a5a' });
        hookY = yb;
        R.tag(ctx, 'k₁', sx + 34, (top + ym) / 2, { size: 10 }); R.tag(ctx, 'k₂', sx + 34, (ym + yb) / 2, { size: 10 });
      } else {
        var d0 = F / P.k1 * 100; hookY = top + (L0 + d0) * ppc;
        R.spring(ctx, sx, top, sx, hookY, { coils: 10, r: 8 });
        R.tag(ctx, 'k₁', sx + 34, (top + hookY) / 2, { size: 10 });
      }
      R.weight(ctx, sx, hookY, P.m, { label: P.m + ' г' });
      // сызғыш
      R.ruler(ctx, sx + 92, top, table - top - 20, ppc, { vertical: true, width: 24 });
      ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx - 30, hookY); ctx.lineTo(sx + 70, hookY); ctx.stroke();
      var k = keff(P);
      var txt = P.mode === 'series' ? '1/k = 1/k₁ + 1/k₂ → k = ' + Sim.fmt(k, 1) + ' Н/м' : P.mode === 'parallel' ? 'k = k₁ + k₂ = ' + k + ' Н/м' : 'k = k₁ = ' + k + ' Н/м';
      R.tag(ctx, txt, W > 640 ? W * 0.78 : W * 0.5, W > 640 ? 60 : 18, { size: W < 600 ? 10 : 12.5, color: '#0b6b78' });
      if (W > 640) R.tag(ctx, 'Δl = mg / k = ' + Sim.fmt(F / k * 100, 2) + ' см', W * 0.78, 92, { size: 12, color: '#b4342a' });
    },
  });
})();

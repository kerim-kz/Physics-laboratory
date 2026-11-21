/* Кирхгоф ережелері: екі ток көзі және үш тармақты тармақталған тізбек. Түйіндегі токтардың қосындысы нөлге тең; тұйық контурдағы кернеулердің түсуінің қосындысы ЭҚК-тердің қосындысына тең. */
(function () {
  var R = window.Real;
  function solve(P) { // A түйінінің потенциалы (B = 0)
    var V = (P.E1 / P.R1 + P.E2 / P.R2) / (1 / P.R1 + 1 / P.R2 + 1 / P.R3);
    return { V: V, I1: (P.E1 - V) / P.R1, I2: (P.E2 - V) / P.R2, I3: V / P.R3 };
  }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.15, grid: false, keepRunning: true, autoplay: true,
    hint: 'ЭҚК мен кедергілерді өзгертіп, үш тармақтағы токтарды бақыла. Ток теріс шықса, оның нақты бағыты сызбадағыға қарама-қарсы.',
    controls: [
      { type: 'range', key: 'E1', label: 'ЭҚК ℰ₁', min: 0, max: 12, step: 0.5, value: 9, unit: 'В', digits: 1, live: true },
      { type: 'range', key: 'E2', label: 'ЭҚК ℰ₂', min: 0, max: 12, step: 0.5, value: 4.5, unit: 'В', digits: 1, live: true },
      { type: 'range', key: 'R1', label: 'R₁', min: 1, max: 20, step: 1, value: 4, unit: 'Ом', digits: 0, live: true },
      { type: 'range', key: 'R2', label: 'R₂', min: 1, max: 20, step: 1, value: 6, unit: 'Ом', digits: 0, live: true },
      { type: 'range', key: 'R3', label: 'R₃', min: 1, max: 20, step: 1, value: 10, unit: 'Ом', digits: 0, live: true },
    ],
    readouts: [
      { key: 'I1', label: 'I₁ (ℰ₁ тармағы, жоғары)', unit: 'А', digits: 3 },
      { key: 'I2', label: 'I₂ (ℰ₂ тармағы, жоғары)', unit: 'А', digits: 3 },
      { key: 'I3', label: 'I₃ (R₃ тармағы, төмен)', unit: 'А', digits: 3 },
      { key: 'node', label: 'A түйіні: I₁ + I₂ − I₃', unit: 'А', digits: 3 },
      { key: 'loop', label: 'Сол контур: I₁R₁ + I₃R₃ − ℰ₁', unit: 'В', digits: 3 },
    ],
    init: function (api) { api.S.ph = [0, 0, 0]; },
    step: function (api, dt) { var s = solve(api.P); api.S.ph[0] += s.I1 * dt * 60; api.S.ph[1] += s.I2 * dt * 60; api.S.ph[2] += s.I3 * dt * 60; },
    read: function (api) { var P = api.P, s = solve(P); return { I1: s.I1, I2: s.I2, I3: s.I3, node: s.I1 + s.I2 - s.I3, loop: s.I1 * P.R1 + s.I3 * P.R3 - P.E1 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, s = solve(P), wide = W > 640;
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      var x1 = wide ? W * 0.1 : 34, x3 = wide ? W * 0.62 : W - 34, x2 = (x1 + x3) / 2, yT = wide ? H * 0.16 : H * 0.1, yB = wide ? H * 0.84 : H * 0.6;
      // тармақтар бойындағы сымдар (ток бағыты: сол және оң — жоғары, ортаңғы — төмен)
      var L1 = [[x1, yB], [x1, yT], [x2, yT]], L2 = [[x3, yB], [x3, yT], [x2, yT]], L3 = [[x2, yT], [x2, yB]], Lb1 = [[x2, yB], [x1, yB]], Lb2 = [[x2, yB], [x3, yB]];
      R.wire(ctx, L1, { color: '#c0392b', phase: S.ph[0] * 22, current: Math.abs(s.I1) > 0.002 });
      R.wire(ctx, L2, { color: '#c0392b', phase: S.ph[1] * 22, current: Math.abs(s.I2) > 0.002 });
      R.wire(ctx, L3, { color: '#c0392b', phase: S.ph[2] * 22, current: Math.abs(s.I3) > 0.002 });
      R.wire(ctx, Lb1, { color: '#2b2f33', phase: S.ph[0] * 22, current: Math.abs(s.I1) > 0.002 });
      R.wire(ctx, Lb2, { color: '#2b2f33', phase: S.ph[1] * 22, current: Math.abs(s.I2) > 0.002 });
      // ток көздері (вертикаль: + жоғарыда)
      function cell(x, y, E, lbl) { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2); R.battery(ctx, -36, -13, 72, 26, { label: E.toFixed(1).replace('.', ',') + ' В' }); ctx.restore(); R.tag(ctx, lbl, x + (wide || x < W / 2 ? 30 : -30), y, { size: 11 }); }
      cell(x1, (yT + yB) / 2 + 40, P.E1, 'ℰ₁'); cell(x3, (yT + yB) / 2 + 40, P.E2, 'ℰ₂');
      // резисторлар
      function res(x, y, lbl, vert) { if (vert) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2); R.resistor(ctx, 0, 0, 70, {}); ctx.restore(); R.tag(ctx, wide ? lbl : lbl.split(' ')[0], x + (wide || x < W / 2 ? 36 : -30), y, { size: 11 }); } else { R.resistor(ctx, x, y, 70, {}); R.tag(ctx, lbl, x, y - 22, { size: 11 }); } }
      res(x1, (yT + yB) / 2 - 50, 'R₁ = ' + P.R1 + ' Ом', true); res(x3, (yT + yB) / 2 - 50, 'R₂ = ' + P.R2 + ' Ом', true); res(x2, (yT + yB) / 2, 'R₃ = ' + P.R3 + ' Ом', true);
      // түйіндер
      [[x2, yT, 'A'], [x2, yB, 'B']].forEach(function (n) { R.sphere(ctx, n[0], n[1], 6, '#2b2f33'); R.tag(ctx, n[2], n[0], n[1] + (n[2] === 'A' ? -18 : 18), { size: 12, weight: '700' }); });
      // ток бағыттары
      function arrow(x, y, dir, I, lbl) { var col = I >= 0 ? '#0b8a7a' : '#b4342a', d = I >= 0 ? dir : -dir; R.force(ctx, x, y + 18 * d, x, y - 18 * d, col); if (wide || x === x2) R.tag(ctx, lbl + ' = ' + Math.abs(I).toFixed(2).replace('.', ',') + ' А', x + (x === x2 ? 52 : x < x2 ? 50 : -50), y, { size: 10.5, color: col }); }
      arrow(x1, yT + 40, 1, s.I1, 'I₁'); arrow(x3, yT + 40, 1, s.I2, 'I₂'); arrow(x2, yB - 40, -1, s.I3, 'I₃');
      // ережелер панелі
      if (wide) {
        var px = W * 0.83;
        ctx.save(); R.rr(ctx, px - 105, 30, 210, H - 60, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.93)'; ctx.fill(); ctx.restore();
        var f = function (v) { return v.toFixed(2).replace('.', ','); };
        [['I ереже (A түйіні)', '#0b6b78'], ['I₁ + I₂ = I₃', null], [f(s.I1) + ' + ' + f(s.I2) + ' = ' + f(s.I3), null], ['', null], ['II ереже (сол контур)', '#0b6b78'], ['I₁R₁ + I₃R₃ = ℰ₁', null], [f(s.I1 * P.R1) + ' + ' + f(s.I3 * P.R3) + ' = ' + f(P.E1), null], ['', null], ['II ереже (оң контур)', '#0b6b78'], ['I₂R₂ + I₃R₃ = ℰ₂', null], [f(s.I2 * P.R2) + ' + ' + f(s.I3 * P.R3) + ' = ' + f(P.E2), null]].forEach(function (q, i) {
          if (q[0]) R.txt(ctx, q[0], px, 54 + i * 24, { size: q[1] ? 11.5 : 12, weight: q[1] ? '700' : '600', color: q[1] || (R.isDark() ? '#e6ecf0' : '#1b2329'), mono: !q[1] });
        });
      } else {
        R.tag(ctx, 'I₁ + I₂ = I₃;  I₁R₁ + I₃R₃ = ℰ₁;  I₂R₂ + I₃R₃ = ℰ₂', W / 2, H * 0.72, { size: 9.5, color: '#0b6b78' });
      }
    },
  });
})();

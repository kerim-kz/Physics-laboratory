/* Конденсатордың резистор арқылы зарядталуы: U_C = E(1 − e^(−t/RC)), разрядталуы: U_C = U₀e^(−t/RC). */
(function () {
  Sim.create({
    aspect: 0.62, substeps: 10,
    hint: 'Ауыстырып-қосқыш: зарядтау ↔ разрядтау. Мәндер жалғасып кетеді.',
    controls: [
      { type: 'select', key: 'mode', label: 'Кілт', value: 'charge', options: [['charge', 'Зарядтау (көзге қосу)'], ['discharge', 'Разрядтау (резисторға тұйықтау)']], live: true },
      { type: 'range', key: 'E', label: 'Көздің ЭҚК-і E', min: 1, max: 12, step: 1, value: 9, unit: 'В', digits: 0 },
      { type: 'range', key: 'R', label: 'Кедергі R', min: 1, max: 50, step: 1, value: 10, unit: 'кОм', digits: 0 },
      { type: 'range', key: 'C', label: 'Сыйымдылық C', min: 100, max: 2000, step: 100, value: 500, unit: 'мкФ', digits: 0 },
    ],
    readouts: [
      { key: 'tau', label: 'Уақыт тұрақтысы τ = RC', unit: 'с', digits: 1 },
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 1 },
      { key: 'u', label: 'Конденсатор кернеуі U_C', unit: 'В' },
      { key: 'q', label: 'Заряд q = CU', unit: 'мКл', digits: 2 },
      { key: 'i', label: 'Ток I', unit: 'мА', digits: 3 },
      { key: 'w', label: 'Энергия W = CU²/2', unit: 'мДж', digits: 2 },
    ],
    init: function (api) { var S = api.S; S.u = 0; S.t = 0; S.h = [[0, 0]]; S.hi = [[0, api.P.E / api.P.R]]; S.hl = 0; },
    onLive: function () {},
    step: function (api, dt) {
      var S = api.S, P = api.P, R = P.R * 1e3, C = P.C * 1e-6, tau = R * C;
      var target = P.mode === 'charge' ? P.E : 0;
      S.u += (target - S.u) * (1 - Math.exp(-dt / tau));
      S.t += dt;
      if (S.t - S.hl > 0.05) { S.hl = S.t; S.h.push([S.t, S.u]); S.hi.push([S.t, (target - S.u) / P.R]); if (S.h.length > 1200) { S.h.shift(); S.hi.shift(); } }
      if (S.t > 600) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, target = P.mode === 'charge' ? P.E : 0, C = P.C * 1e-6;
      return { tau: P.R * 1e3 * C, t: S.t, u: S.u, q: C * S.u * 1e3, i: (target - S.u) / P.R, w: C * S.u * S.u / 2 * 1e3 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      // схема
      var x0 = 30, y0 = 40, w = W * 0.36, h = H * 0.42;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.strokeRect(x0, y0, w, h);
      ctx.fillStyle = C.bg; ctx.fillRect(x0 - 12, y0 + h / 2 - 14, 24, 28);
      D.line(ctx, x0 - 12, y0 + h / 2 - 5, x0 + 12, y0 + h / 2 - 5, C.ink, 3); D.line(ctx, x0 - 6, y0 + h / 2 + 5, x0 + 6, y0 + h / 2 + 5, C.ink, 3);
      D.text(ctx, 'E', x0 - 18, y0 + h / 2 + 4, { size: 12, align: 'right', weight: '600' });
      ctx.fillStyle = C.bg; ctx.fillRect(x0 + w / 2 - 30, y0 - 10, 60, 20); ctx.strokeRect(x0 + w / 2 - 30, y0 - 10, 60, 20);
      D.text(ctx, 'R', x0 + w / 2, y0 - 16, { size: 12, align: 'center', weight: '600' });
      // конденсатор
      var cx = x0 + w, cy = y0 + h / 2;
      ctx.fillStyle = C.bg; ctx.fillRect(cx - 24, cy - 10, 48, 20);
      D.line(ctx, cx - 22, cy - 6, cx + 22, cy - 6, C.ink, 3); D.line(ctx, cx - 22, cy + 6, cx + 22, cy + 6, C.ink, 3);
      var n = Math.round(S.u / Math.max(1, P.E) * 6);
      for (var i = 0; i < n; i++) { D.text(ctx, '+', cx - 18 + i * 7, cy - 10, { size: 10, color: C.red, weight: '600' }); D.text(ctx, '−', cx - 18 + i * 7, cy + 18, { size: 10, color: C.blue, weight: '600' }); }
      D.text(ctx, 'C', cx + 28, cy + 4, { size: 12, weight: '600' });
      // кілт
      var charge = P.mode === 'charge';
      D.text(ctx, charge ? 'Кілт: көзге қосулы' : 'Кілт: көз ажыратылған, C резистор арқылы разрядталады', x0, y0 + h + 26, { size: 12, color: charge ? C.good : C.brass, weight: '600' });
      // графиктер
      var tau = P.R * P.C * 1e-3, tmax = Math.max(5 * tau, 10), t0 = Math.max(0, S.t - tmax);
      D.plot(ctx, { x: W * 0.5, y: 30, w: W * 0.46, h: H * 0.38 }, { xmin: t0, xmax: t0 + tmax, ymin: 0, ymax: 12.5, ylabel: 'U_C, В', series: [{ pts: S.h, color: C.accent }, { pts: [[t0, P.E], [t0 + tmax, P.E]], color: C.muted, dash: [4, 4], width: 1 }] });
      D.plot(ctx, { x: W * 0.5, y: H * 0.56, w: W * 0.46, h: H * 0.32 }, { xmin: t0, xmax: t0 + tmax, ymin: -P.E / P.R * 1.15, ymax: P.E / P.R * 1.15, xlabel: 't, с', ylabel: 'I, мА', series: [{ pts: S.hi, color: C.orange }] });
      if (S.t === 0) D.text(ctx, '0,63·E деңгейіне τ уақытта жетеді', W * 0.5 + 6, 30 + H * 0.38 - 8, { size: 10, color: C.muted });
    },
  });
})();

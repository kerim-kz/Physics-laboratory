/* Конденсатордың резистор арқылы зарядталуы: U_C = E(1 − e^(−t/RC)), разрядталуы: U_C = U₀e^(−t/RC). */
(function () {
  var RL = window.Real;
  Sim.create({
    grid: false,
    tools: ['stopwatch'],
    aspect: 0.62, aspectNarrow: 1.35, substeps: 10,
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
      RL.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      var wide = W > 640, charge = P.mode === 'charge', Imax = P.E / P.R, I = (charge ? P.E - S.u : -S.u) / P.R, ph = S.t * 40 * Math.sign(I);
      var x0 = wide ? 50 : 30, x1 = wide ? W * 0.42 : W - 30, yT = wide ? 50 : 34, yB = wide ? H * 0.5 : H * 0.3, xs = x0 + (x1 - x0) * 0.32;
      // ауыстырып-қосқыш: көз тармағы (сол) немесе разряд тармағы (шам арқылы)
      var on = Math.abs(I) > Imax * 0.01;
      var cyy = (yT + yB) / 2;
      RL.wire(ctx, [[xs, yT], [x1, yT], [x1, cyy - 10]], { color: '#c0392b', phase: ph * 20, current: on });
      RL.wire(ctx, [[x1, cyy + 12], [x1, yB], [x0, yB], [x0, yT + 30]], { color: '#c0392b', phase: ph * 20, current: on });
      ctx.save(); ctx.translate(x0, (yT + yB) / 2 + 10); ctx.rotate(-Math.PI / 2); RL.battery(ctx, -32, -12, 64, 24, { label: P.E + ' В' }); ctx.restore();
      RL.wire(ctx, [[x0, yT + 30], [x0, yT], [xs - 40, yT]], { color: '#c0392b', phase: ph * 20, current: on && charge });
      // разряд тармағы: шам
      var bx = xs - 20, by = (yT + yB) / 2 + 6;
      RL.wire(ctx, [[xs - 20, yT + 26], [bx, by - 18]], { color: '#2b2f33', phase: ph * 20, current: on && !charge });
      RL.wire(ctx, [[bx, by + 16], [bx, yB]], { color: '#2b2f33', phase: ph * 20, current: on && !charge });
      RL.bulb(ctx, bx, by, 12, charge ? 0 : Math.min(1, Math.abs(I) / Imax * 1.4));
      // ауыстырып-қосқыштың тұтқасы
      ctx.strokeStyle = '#c9cfd4'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(xs, yT); ctx.lineTo(charge ? xs - 40 : xs - 20, charge ? yT : yT + 26); ctx.stroke();
      RL.sphere(ctx, xs, yT, 5, '#2b2f33'); RL.sphere(ctx, xs - 40, yT, 4, '#b7bec4'); RL.sphere(ctx, xs - 20, yT + 26, 4, '#b7bec4');
      RL.tag(ctx, charge ? 'зарядтау' : 'разрядтау', xs - 20, yT - 22, { size: 10.5, color: charge ? '#0b8a7a' : '#b4560f' });
      // резистор
      RL.resistor(ctx, (xs + x1) / 2, yT, 70, {}); RL.tag(ctx, 'R = ' + P.R + ' кОм', (xs + x1) / 2, yT - 22, { size: 10.5 });
      // конденсатор: екі пластина, зарядтар
      var cy = (yT + yB) / 2, pw = 46;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      RL.block(ctx, x1 - pw / 2, cy - 10, pw, 6, 'copper', { depth: 2, shadow: false }); RL.block(ctx, x1 - pw / 2, cy + 6, pw, 6, 'copper', { depth: 2, shadow: false });
      ctx.fillStyle = wide ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0)';
      var n = Math.round(S.u / 12 * 8);
      for (var i = 0; i < n; i++) { RL.txt(ctx, '+', x1 - pw / 2 + 4 + i * 5.5, cy - 17, { size: 10, color: '#b4342a', weight: '700' }); RL.txt(ctx, '−', x1 - pw / 2 + 4 + i * 5.5, cy + 20, { size: 10, color: '#1f5fd1', weight: '700' }); }
      RL.tag(ctx, 'C = ' + P.C + ' мкФ', x1 - 70, cy, { size: 10.5 });
      if (wide) { RL.meter(ctx, x1 - 70, yB + 50, 26, S.u, 12, { letter: 'V', step: 2 }); RL.tag(ctx, 'U_C = ' + S.u.toFixed(2).replace('.', ',') + ' В', x1 - 70, yB + 92, { size: 10.5, mono: true, color: '#0b6b78' }); }
      // графиктер
      var tau = P.R * P.C * 1e-3, tmax = Math.max(5 * tau, 10), t0 = Math.max(0, S.t - tmax);
      var gx = wide ? W * 0.52 : 46, gw = wide ? W * 0.44 : W - 64, g1y = wide ? 30 : H * 0.5, g1h = wide ? H * 0.38 : H * 0.2, g2y = wide ? H * 0.56 : H * 0.76, g2h = wide ? H * 0.32 : H * 0.16;
      ctx.save(); RL.rr(ctx, gx - 44, g1y - 18, gw + 56, (g2y + g2h + 30) - (g1y - 18), 8); ctx.fillStyle = RL.isDark() ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var o1 = D.plot(ctx, { x: gx, y: g1y, w: gw, h: g1h }, { xmin: t0, xmax: t0 + tmax, ymin: 0, ymax: 12.5, ylabel: 'U_C, В', series: [{ pts: S.h, color: C.accent }, { pts: [[t0, P.E], [t0 + tmax, P.E]], color: C.muted, dash: [4, 4], width: 1 }] });
      D.plot(ctx, { x: gx, y: g2y, w: gw, h: g2h }, { xmin: t0, xmax: t0 + tmax, ymin: -P.E / P.R * 1.15, ymax: P.E / P.R * 1.15, xlabel: 't, с', ylabel: 'I, мА', series: [{ pts: S.hi, color: C.orange }] });
      // τ белгісі: 0,63E деңгейі
      ctx.strokeStyle = '#0b8a7a'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(o1.X(t0), o1.Y(0.632 * P.E)); ctx.lineTo(o1.X(t0 + tmax), o1.Y(0.632 * P.E)); ctx.stroke(); ctx.setLineDash([]);
      RL.tag(ctx, '0,63·E — τ уақытта жетеді', gx + gw - 90, o1.Y(0.632 * P.E) - 12, { size: 9.5, color: '#0b6b78' });
    },
  });
})();

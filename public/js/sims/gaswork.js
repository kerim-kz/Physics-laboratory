/* Термодинамиканың бірінші заңы: цилиндрдегі газды тұрақты қысымда қыздыру. Поршень көтеріліп, газ жұмыс атқарады.
   Q = ΔU + A', A' = pΔV. Бір атомды идеал газ үшін ΔU = 3/2 · pΔV. */
(function () {
  var R = window.Real;
  var S0 = 0.01, P0 = 101325; // поршень ауданы 100 см², атмосфералық қысым
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Газды қыздыр: берілген жылудың бір бөлігі ішкі энергияға, бір бөлігі жұмысқа кетеді.',
    controls: [
      { type: 'range', key: 'm', label: 'Поршень үстіндегі жүк', min: 0, max: 40, step: 5, value: 20, unit: 'кг', digits: 0 },
      { type: 'range', key: 'Pw', label: 'Қыздырғыш қуаты', min: 5, max: 40, step: 5, value: 15, unit: 'Вт', digits: 0 },
    ],
    readouts: [
      { key: 'p', label: 'Газ қысымы p (тұрақты)', unit: 'кПа', digits: 1 },
      { key: 'Q', label: 'Берілген жылу Q', unit: 'Дж', digits: 0 },
      { key: 'A', label: 'Газдың жұмысы A\' = pΔV', unit: 'Дж', digits: 0 },
      { key: 'dU', label: 'Ішкі энергия өзгерісі ΔU', unit: 'Дж', digits: 0 },
      { key: 'T', label: 'Газ температурасы', unit: '°C', digits: 1 },
      { key: 'h', label: 'Поршеньнің көтерілуі', unit: 'см', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.Q = 0; S.t = 0; },
    step: function (api, dt) { var S = api.S; S.t += dt; S.Q += api.P.Pw * dt * 3; if (S.Q > 1200) return false; },
    read: function (api) {
      var S = api.S, P = api.P, p = P0 + P.m * 9.8 / S0, V0 = S0 * 0.2, T0 = 293;
      var A = S.Q * 0.4, dV = A / p, T = T0 * (V0 + dV) / V0; // изобаралық: Q = 5/2 pΔV
      return { p: p / 1000, Q: S.Q, A: A, dU: S.Q - A, T: T - 273, h: dV / S0 * 100 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.9;
      R.scene(ctx, W, H, 'lab', { table: table });
      var p = P0 + P.m * 9.8 / S0, A = S.Q * 0.4, h = A / p / S0; // м
      var cx = W * 0.35, cw = 140, ch = H * 0.62, cy = table - 60 - ch, px = 600; // 1 м = 600 px
      var gasTop = table - 60 - 0.2 * px - h * px;
      // цилиндр
      ctx.save();
      var gl = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0); gl.addColorStop(0, 'rgba(190,220,235,.45)'); gl.addColorStop(0.25, 'rgba(255,255,255,.65)'); gl.addColorStop(1, 'rgba(150,190,210,.45)');
      ctx.fillStyle = gl; ctx.fillRect(cx - cw / 2, cy, cw, ch);
      var T = 293 * (0.2 + h) / 0.2, hot = Math.min(1, (T - 293) / 150);
      ctx.fillStyle = 'rgba(' + Math.round(200 + 55 * hot) + ',' + Math.round(220 - 90 * hot) + ',' + Math.round(240 - 160 * hot) + ',.45)';
      ctx.fillRect(cx - cw / 2 + 3, gasTop, cw - 6, table - 60 - gasTop);
      var r = R.rng(9), sp = 1 + hot * 2;
      for (var i = 0; i < 40; i++) { var x = cx - cw / 2 + 10 + ((r() * (cw - 20) + S.t * 40 * sp * (r() - 0.5)) % (cw - 20) + (cw - 20)) % (cw - 20), y = gasTop + 6 + ((r() * (table - 66 - gasTop) + S.t * 50 * sp * (r() - 0.5)) % (table - 72 - gasTop) + (table - 72 - gasTop)) % Math.max(1, table - 72 - gasTop); R.sphere(ctx, x, y, 3.5, '#d9733a'); }
      ctx.strokeStyle = 'rgba(80,110,130,.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - cw / 2, cy); ctx.lineTo(cx - cw / 2, table - 60); ctx.lineTo(cx + cw / 2, table - 60); ctx.lineTo(cx + cw / 2, cy); ctx.stroke();
      ctx.restore();
      // поршень + жүк
      R.block(ctx, cx - cw / 2 + 3, gasTop - 18, cw - 6, 18, 'steel', { depth: 0, shadow: false });
      if (P.m > 0) { var s = Math.cbrt(P.m / 20); R.cylinder(ctx, cx - 30 * s, gasTop - 18 - 46 * s, 60 * s, 44 * s, 'iron', { shadow: false, label: P.m + ' кг' }); }
      // қыздырғыш
      R.block(ctx, cx - cw / 2 - 10, table - 58, cw + 20, 20, 'iron', { depth: 6, shadow: false });
      ctx.strokeStyle = S.t > 0 ? '#ff6a2a' : '#7a3a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); for (var k = 0; k <= 12; k++) ctx.lineTo(cx - cw / 2 + k * cw / 12, table - 48 + (k % 2 ? -4 : 4)); ctx.stroke();
      R.force(ctx, cx + cw / 2 + 30, table - 120, cx + cw / 2 + 30, table - 120 - 50, '#d2382b', 'Q → ΔU + A\'');
      // p–V диаграммасы
      var D = api.D, V0 = 2, V = 2 + h * S0 * 1000; // литр
      D.plot(ctx, { x: W * 0.62, y: H * 0.12, w: W * 0.32, h: H * 0.5 }, { xmin: 0, xmax: 6, ymin: 0, ymax: 160, xlabel: 'V, л', ylabel: 'p, кПа', series: [{ pts: [[V0, p / 1000], [V, p / 1000]], color: '#d2382b', width: 3 }], marker: [V, p / 1000] });
      R.tag(ctx, 'A\' = p·ΔV — графиктің астындағы аудан', W * 0.78, H * 0.7, { size: 10.5 });
    },
  });
})();

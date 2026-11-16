/* Джоуль — Ленц заңы: калориметрдегі спираль суды қыздырады. Q = I²Rt. Тізбектей жалғанған мыс пен нихромды салыстыру. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Ток күшін екі есе арттырып көр: бөлінетін жылу неше есе артады?',
    controls: [
      { type: 'range', key: 'I', label: 'Ток күші I', min: 0.5, max: 4, step: 0.5, value: 2, unit: 'А' },
      { type: 'range', key: 'Rs', label: 'Спиральдың кедергісі R', min: 2, max: 20, step: 1, value: 10, unit: 'Ом', digits: 0 },
      { type: 'range', key: 'm', label: 'Калориметрдегі су массасы', min: 0.1, max: 0.5, step: 0.05, value: 0.2, unit: 'кг', digits: 2 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 0 },
      { key: 'Q', label: 'Бөлінген жылу Q = I²Rt', unit: 'кДж', digits: 2 },
      { key: 'T', label: 'Су температурасы', unit: '°C', digits: 1 },
      { key: 'P', label: 'Қуат P = I²R', unit: 'Вт', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt * 20; var T = 20 + Math.pow(api.P.I, 2) * api.P.Rs * api.S.t / (4200 * api.P.m); if (T > 95 || api.S.t > 1200) return false; },
    read: function (api) { var P = api.P, Q = P.I * P.I * P.Rs * api.S.t; return { t: api.S.t, Q: Q / 1000, T: 20 + Q / (4200 * P.m), P: P.I * P.I * P.Rs }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.88, Q = P.I * P.I * P.Rs * S.t, T = 20 + Q / (4200 * P.m);
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.36, cw = 170, ch = 190, cy = table - ch;
      R.cylinder(ctx, cx - cw / 2 - 12, cy - 6, cw + 24, ch + 6, 'aluminum', {});
      R.vessel(ctx, cx - cw / 2, cy + 10, cw, ch - 16, (ch - 16) * 0.8, {});
      // спираль
      var hot = Math.min(1, P.I * P.I * P.Rs / 160);
      ctx.save(); ctx.strokeStyle = 'rgb(' + Math.round(120 + 135 * hot) + ',' + Math.round(80 + 40 * hot) + ',60)'; ctx.lineWidth = 3;
      ctx.beginPath(); for (var i = 0; i <= 60; i++) { var x = cx - 50 + i * 100 / 60, y = cy + ch - 50 + Math.sin(i * 1.2) * 12; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#7a8189'; ctx.fillRect(cx - 54, cy - 30, 5, ch - 20); ctx.fillRect(cx + 50, cy - 30, 5, ch - 20);
      // көпіршіктер (жылу)
      for (var b = 0; b < 8 * hot * Math.min(1, S.t / 30); b++) { var bx = cx - 45 + ((b * 37 + S.t * 3) % 90), by = cy + ch - 60 - ((S.t * 20 + b * 23) % (ch - 90)); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(bx, by, 2, 0, 7); ctx.stroke(); }
      R.thermometer(ctx, cx + 30, cy - 120, 220, T, 0, 100, { step: 20 });
      // қорек көзі және амперметр
      var bat = R.battery(ctx, W * 0.62, H * 0.18, 140, 30, { label: 'Ток көзі' });
      R.meter(ctx, W * 0.82, H * 0.5, 42, P.I, 5, { letter: 'A', step: 1 });
      R.wire(ctx, [[bat.plus.x, bat.plus.y], [W * 0.82, bat.plus.y], [W * 0.82, H * 0.5 - 40]], { color: '#c0392b' });
      R.wire(ctx, [[W * 0.82 - 23, H * 0.5 + 26], [W * 0.82 - 23, table - 220 + 0], [cx + 52, cy - 30]], { color: '#c0392b' });
      R.wire(ctx, [[bat.minus.x, bat.minus.y], [cx - 52, bat.minus.y], [cx - 52, cy - 30]], { color: '#222' });
      R.tag(ctx, 'Q = I²Rt = ' + Sim.fmt(Q / 1000, 2) + ' кДж', W * 0.62, H - 18, { size: 12, color: '#b4342a' });
    },
  });
})();

/* Шектелген ішектегі тұрғын толқын: y = 2A·sin(kx)·cos(ωt), λₙ = 2L/n, νₙ = n·v/(2L), v = √(T/μ). */
(function () {
  Sim.create({
    aspect: 0.6, autoplay: true, keepRunning: true,
    hint: 'Түйіндер (қозғалмайтын нүктелер) мен шоқтарды санап көр.',
    controls: [
      { type: 'range', key: 'n', label: 'Гармоника нөмірі n', min: 1, max: 8, step: 1, value: 3, digits: 0, live: true },
      { type: 'range', key: 'L', label: 'Ішектің ұзындығы L', min: 0.4, max: 2, step: 0.05, value: 1, unit: 'м', digits: 2, live: true },
      { type: 'range', key: 'T', label: 'Керілу күші T', min: 10, max: 200, step: 5, value: 80, unit: 'Н', digits: 0, live: true },
      { type: 'range', key: 'mu', label: 'Сызықтық тығыздық μ', min: 1, max: 10, step: 0.5, value: 5, unit: 'г/м', digits: 1, live: true },
      { type: 'check', key: 'parts', label: 'Түскен және шағылған толқындарды көрсету', value: false, live: true },
    ],
    readouts: [
      { key: 'v', label: 'Толқын жылдамдығы v = √(T/μ)', unit: 'м/с', digits: 1 },
      { key: 'lam', label: 'Толқын ұзындығы λ = 2L/n', unit: 'м', digits: 3 },
      { key: 'f', label: 'Жиілік ν = v/λ', unit: 'Гц', digits: 1 },
      { key: 'nodes', label: 'Түйіндер саны (ұштарымен)', digits: 0 },
      { key: 'anti', label: 'Шоқтар саны', digits: 0 },
    ],
    init: function (api) { api.S.ph = 0; },
    onLive: function () {},
    step: function (api, dt) { api.S.ph += dt * 2 * Math.PI * 0.9; }, // көрнекілік үшін баяулатылған
    read: function (api) {
      var P = api.P, v = Math.sqrt(P.T / (P.mu / 1000)), lam = 2 * P.L / P.n;
      return { v: v, lam: lam, f: v / lam, nodes: P.n + 1, anti: P.n };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var x0 = 50, x1 = 50 + (W - 100) * P.L / 2, cy = H * 0.45, A = Math.min(70, H * 0.17);
      // тіректер
      ctx.fillStyle = C.line; ctx.fillRect(x0 - 12, cy - 60, 12, 120); ctx.fillRect(x1, cy - 60, 12, 120);
      var k = P.n * Math.PI / (x1 - x0), c = Math.cos(S.ph);
      // қабықша (ең үлкен ауытқу)
      ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = C.accent; ctx.lineWidth = 1;
      [1, -1].forEach(function (sg) { ctx.beginPath(); for (var x = x0; x <= x1; x += 2) { var y = cy - sg * A * Math.sin(k * (x - x0)); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); });
      ctx.restore();
      if (P.parts) {
        [[1, C.orange], [-1, C.purple]].forEach(function (pr) {
          ctx.save(); ctx.strokeStyle = pr[1]; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath();
          for (var x = x0; x <= x1; x += 2) { var y = cy - A / 2 * Math.sin(k * (x - x0) - pr[0] * S.ph) * (pr[0]); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
          ctx.stroke(); ctx.restore();
        });
      }
      // ішек
      ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath();
      for (var x2 = x0; x2 <= x1; x2 += 2) { var y2 = cy - A * Math.sin(k * (x2 - x0)) * c; if (x2 === x0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); }
      ctx.stroke(); ctx.restore();
      // түйіндер мен шоқтар
      for (var i = 0; i <= P.n; i++) { var xn = x0 + i * (x1 - x0) / P.n; D.circle(ctx, xn, cy, 5, C.red, null, 0, true); D.text(ctx, 'Т', xn, cy + 22, { size: 10, align: 'center', color: C.red, weight: '700' }); }
      for (var j = 0; j < P.n; j++) { var xa = x0 + (j + 0.5) * (x1 - x0) / P.n; D.text(ctx, 'Ш', xa, cy - A - 10, { size: 10, align: 'center', color: C.accent, weight: '700' }); }
      // λ белгісі
      var lamPx = 2 * (x1 - x0) / P.n;
      if (lamPx < W - 60) { var yb = H - 40; D.line(ctx, x0, yb, x0 + lamPx, yb, C.brass, 2); D.line(ctx, x0, yb - 6, x0, yb + 6, C.brass, 2); D.line(ctx, x0 + lamPx, yb - 6, x0 + lamPx, yb + 6, C.brass, 2); D.text(ctx, 'λ', x0 + lamPx / 2, yb - 8, { size: 13, align: 'center', color: C.brass, weight: '700' }); }
      D.text(ctx, 'Т — түйін, Ш — шоқ. Көршілес түйіндердің арақашықтығы λ/2.', 14, 20, { size: 12, color: C.muted });
    },
  });
})();

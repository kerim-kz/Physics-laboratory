/* Серіппелі маятник: m·x'' = −k·x − b·x' (горизонталь, үйкеліссіз бет). */
(function () {
  var R = window.Real;
  var WINDOW = 10; // графиктегі уақыт терезесі, с

  function stepRK(S, P, h) {
    var f = function (x, v) { return (-P.k * x - P.b * v) / P.m; };
    var k1x = S.v, k1v = f(S.x, S.v);
    var k2x = S.v + k1v * h / 2, k2v = f(S.x + k1x * h / 2, S.v + k1v * h / 2);
    var k3x = S.v + k2v * h / 2, k3v = f(S.x + k2x * h / 2, S.v + k2v * h / 2);
    var k4x = S.v + k3v * h, k4v = f(S.x + k3x * h, S.v + k3v * h);
    S.x += h * (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
    S.v += h * (k1v + 2 * k2v + 2 * k3v + k4v) / 6;
  }

  Sim.create({
    grid: false,
    tools: ['ruler', 'stopwatch'],
    scale: function (api) { return api._sc || null; },
    aspect: 1,
    controls: [
      { type: 'range', key: 'm', label: 'Жүк массасы m', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'кг', digits: 1 },
      { type: 'range', key: 'k', label: 'Серіппе қатаңдығы k', min: 5, max: 200, step: 5, value: 40, unit: 'Н/м', digits: 0 },
      { type: 'range', key: 'A', label: 'Амплитуда x_m', min: 0.02, max: 0.2, step: 0.01, value: 0.1, unit: 'м', digits: 2 },
      { type: 'range', key: 'b', label: 'Кедергі коэффициенті b', min: 0, max: 2, step: 0.05, value: 0, unit: 'кг/с', digits: 2 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'x', label: 'Ығысу x', unit: 'м', digits: 3 },
      { key: 'v', label: 'Жылдамдық v', unit: 'м/с', digits: 3 },
      { key: 'tm', label: 'Өлшенген период T', unit: 'с', digits: 3 },
      { key: 'tf', label: 'T = 2π√(m/k)', unit: 'с', digits: 3 },
      { key: 'E', label: 'Толық энергия E', unit: 'Дж', digits: 4 },
    ],
    init: function (api) {
      var S = api.S, P = api.P;
      S.x = P.A; S.v = 0; S.t = 0; S.hist = [[0, P.A]]; S.last = null; S.T = null;
    },
    substeps: 20,
    step: function (api, dt) {
      var S = api.S, P = api.P, prev = S.x;
      stepRK(S, P, dt);
      S.t += dt;
      if (prev > 0 && S.x <= 0) {
        var tc = S.t - dt * (S.x / (S.x - prev));
        if (S.last !== null) S.T = tc - S.last;
        S.last = tc;
      }
      if (!S.hist.length || S.t - S.hist[S.hist.length - 1][0] > 0.02) S.hist.push([S.t, S.x]);
      while (S.hist.length && S.hist[0][0] < S.t - WINDOW) S.hist.shift();
    },
    read: function (api) {
      var S = api.S, P = api.P;
      return { t: S.t, x: S.x, v: S.v, tm: S.T, tf: 2 * Math.PI * Math.sqrt(P.m / P.k), E: P.k * S.x * S.x / 2 + P.m * S.v * S.v / 2 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var table = Math.max(130, H * 0.4), y = table - 40, wall = 34, eq = W * 0.4, k = Math.min((W * 0.4 - 100) / 0.2, 1400);
      api._sc = { px: k, unit: 'м' };
      var side = 34 + Math.sqrt(P.m) * 12, bx = eq + S.x * k;
      R.scene(ctx, W, table + 34, 'lab', { table: table });
      ctx.fillStyle = C.bg; ctx.fillRect(0, table + 34, W, H - table - 34);
      // ауа жастықшалы жол (тесіктері бар алюминий профиль)
      R.block(ctx, wall - 10, table - 18, W * 0.8, 14, 'aluminum', { depth: 6 });
      ctx.fillStyle = 'rgba(0,0,0,.35)'; for (var hx = wall + 6; hx < wall + W * 0.8 - 20; hx += 14) { ctx.beginPath(); ctx.arc(hx, table - 11, 1.2, 0, 7); ctx.fill(); }
      // сызғыш (x, см)
      R.ruler(ctx, eq - 0.2 * k - 4, table - 4, 0.4 * k + 8, k / 100, { width: 16, from: -20 });
      // қабырға (тірек)
      R.block(ctx, wall - 18, y - 56, 16, table - 18 - (y - 56), 'iron', { depth: 6, shadow: false });
      R.spring(ctx, wall - 2, y, bx - side / 2, y, { coils: 14, r: 10, wire: 2 });
      // арбаша-жүк (ауада қалықтайды)
      R.block(ctx, bx - side / 2, y - side / 2, side, side, 'brass', { depth: 8, shadow: false, label: api.fmt(P.m, 1) + ' кг' });
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(bx - side / 2 + 2, table - 18 - 2, side - 4, 2);
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(210,56,43,.8)'; ctx.beginPath(); ctx.moveTo(eq, y - side / 2 - 30); ctx.lineTo(eq, table - 4); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'x = 0', eq, y - side / 2 - 38, { size: 10 });
      if (Math.abs(S.v) > 0.005) R.force(ctx, bx, y - side / 2 - 14, bx + Math.max(-120, Math.min(120, S.v * 140)), y - side / 2 - 14, '#1f5fd1', 'v');
      if (Math.abs(S.x) > 0.003) R.force(ctx, bx, y + side / 2 - 8, bx - Math.max(-90, Math.min(90, P.k * S.x * 1.6)), y + side / 2 - 8, '#e0761b', 'F серп');
      // энергия бағаналары
      var Ek = P.m * S.v * S.v / 2, Ep = P.k * S.x * S.x / 2, E0 = P.k * P.A * P.A / 2;
      var nar = W < 600, bw = nar ? 18 : 28, bs = nar ? 24 : 42, bx0 = W - (nar ? 84 : 150), bh = Math.min(90, table * (nar ? 0.3 : 0.55)), base = 24 + bh;
      ctx.save(); R.rr(ctx, bx0 - 10, 10, bs * 3 + 10, bh + 40, 8); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.85)' : 'rgba(255,255,255,.85)'; ctx.fill(); ctx.restore();
      [['Eк', Ek, '#e0761b'], ['Eп', Ep, '#7a3fb0'], ['E', Ek + Ep, '#0b8a7a']].forEach(function (r, i) {
        var h = E0 > 0 ? r[1] / E0 * bh : 0, x = bx0 + i * bs;
        ctx.fillStyle = R.isDark() ? '#2a333b' : '#e6eaed'; ctx.fillRect(x, base - bh, bw, bh);
        ctx.fillStyle = r[2]; ctx.fillRect(x, base - Math.min(bh, h), bw, Math.min(bh, h));
        D.text(ctx, r[0], x + bw / 2, base + 14, { size: 11, align: 'center', color: C.muted });
      });
      // x(t) графигі
      var t0 = Math.max(0, S.t - WINDOW), gy = table + 50;
      D.plot(ctx, { x: 50, y: gy, w: W - 80, h: H - gy - 36 }, { xmin: t0, xmax: t0 + WINDOW, ymin: -0.22, ymax: 0.22, xlabel: 't, с', ylabel: 'x(t), м',
        series: [{ pts: S.hist, color: C.blue }], marker: [S.t, S.x] });
    },
  });
})();

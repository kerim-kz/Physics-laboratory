/* Серіппелі маятник: m·x'' = −k·x − b·x' (горизонталь, үйкеліссіз бет). */
(function () {
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
    aspect: 0.66,
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
      var y = 70, wall = 30, eq = W * 0.42, k = (W * 0.42 - 90) / 0.2 * 0.8;
      var bx = eq + S.x * k, side = 30 + Math.sqrt(P.m) * 14;
      // қабырға мен бет
      ctx.fillStyle = C.line; ctx.fillRect(wall - 12, y - 45, 12, 90);
      D.line(ctx, wall, y + side / 2, W - 160, y + side / 2, C.muted, 2);
      // серіппе (ирек)
      var coils = 14, sx = wall, ex = bx - side / 2;
      ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, y);
      for (var i = 1; i <= coils * 2; i++) ctx.lineTo(sx + (ex - sx) * i / (coils * 2 + 1), y + (i % 2 ? -10 : 10));
      ctx.lineTo(ex, y); ctx.stroke(); ctx.restore();
      // жүк
      ctx.fillStyle = C.blue; ctx.fillRect(bx - side / 2, y - side / 2, side, side);
      D.text(ctx, api.fmt(P.m, 1) + ' кг', bx, y + 4, { size: 11, align: 'center', color: '#fff', weight: '600' });
      D.line(ctx, eq, y - 50, eq, y + side / 2 + 8, C.muted, 1, [3, 3]);
      D.text(ctx, 'x = 0', eq, y - 54, { size: 10, align: 'center', color: C.muted });
      if (Math.abs(S.v) > 0.005) D.arrow(ctx, bx, y - side / 2 - 12, bx + S.v * 120, y - side / 2 - 12, C.accent, 2, 'v');
      // энергия
      var Ek = P.m * S.v * S.v / 2, Ep = P.k * S.x * S.x / 2, E0 = P.k * P.A * P.A / 2;
      var bx0 = W - 140, bh = 90, base = 130;
      [['Eк', Ek, C.orange], ['Eп', Ep, C.purple], ['E', Ek + Ep, C.accent]].forEach(function (r, i) {
        var h = E0 > 0 ? r[1] / E0 * bh : 0, x = bx0 + i * 40;
        ctx.fillStyle = C.bg2; ctx.fillRect(x, base - bh, 28, bh);
        ctx.fillStyle = r[2]; ctx.fillRect(x, base - Math.min(bh, h), 28, Math.min(bh, h));
        D.text(ctx, r[0], x + 14, base + 14, { size: 11, align: 'center', color: C.muted });
      });
      // x(t) графигі
      var t0 = Math.max(0, S.t - WINDOW);
      D.plot(ctx, { x: 50, y: 175, w: W - 80, h: H - 215 }, { xmin: t0, xmax: t0 + WINDOW, ymin: -0.22, ymax: 0.22, xlabel: 't, с', ylabel: 'x(t), м',
        series: [{ pts: S.hist, color: C.blue }], marker: [S.t, S.x] });
    },
  });
})();

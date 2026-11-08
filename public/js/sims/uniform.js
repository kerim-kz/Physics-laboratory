/* Бірқалыпты қозғалыс: екі көлік, x = x₀ + vt. Кездесу — x(t) графиктерінің қиылысуы. */
(function () {
  var TMAX = 30;
  function meet(P) {
    var dv = P.va - P.vb;
    if (Math.abs(dv) < 1e-9) return null;
    var t = (P.xb - 0) / dv;
    return t > 0 && t <= TMAX ? t : null;
  }
  Sim.create({
    aspect: 0.66,
    hint: 'Графиктердің қиылысқан нүктесі — кездесу.',
    controls: [
      { type: 'range', key: 'va', label: 'Көк көліктің жылдамдығы v₁', min: -10, max: 30, step: 1, value: 15, unit: 'м/с', digits: 0 },
      { type: 'range', key: 'xb', label: 'Қызыл көліктің бастапқы координатасы x₀₂', min: 0, max: 400, step: 10, value: 300, unit: 'м', digits: 0 },
      { type: 'range', key: 'vb', label: 'Қызыл көліктің жылдамдығы v₂', min: -20, max: 20, step: 1, value: -5, unit: 'м/с', digits: 0 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 1 },
      { key: 'x1', label: 'x₁ = v₁t', unit: 'м', digits: 0 },
      { key: 'x2', label: 'x₂ = x₀₂ + v₂t', unit: 'м', digits: 0 },
      { key: 'd', label: 'Арақашықтық |x₂ − x₁|', unit: 'м', digits: 0 },
      { key: 'tm', label: 'Кездесу уақыты (есеп)', unit: 'с', digits: 1 },
      { key: 'xm', label: 'Кездесу орны', unit: 'м', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt * 2; if (api.S.t >= TMAX) { api.S.t = TMAX; return false; } },
    read: function (api) {
      var S = api.S, P = api.P, x1 = P.va * S.t, x2 = P.xb + P.vb * S.t, tm = meet(P);
      return { t: S.t, x1: x1, x2: x2, d: Math.abs(x2 - x1), tm: tm === null ? 'кездеспейді' : tm, xm: tm === null ? null : P.va * tm };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var xmin = -100, xmax = 500, roadY = 70;
      var X = function (x) { return 30 + (x - xmin) / (xmax - xmin) * (W - 60); };
      // жол
      ctx.fillStyle = C.bg2; ctx.fillRect(20, roadY - 24, W - 40, 48);
      D.line(ctx, 20, roadY, W - 20, roadY, C.line, 1, [10, 10]);
      for (var m = -100; m <= 500; m += 100) {
        D.line(ctx, X(m), roadY + 24, X(m), roadY + 30, C.muted, 1);
        D.text(ctx, m + ' м', X(m), roadY + 44, { size: 10, align: 'center', color: C.muted, mono: true });
      }
      function car(x, color, dir) {
        var px = X(x);
        if (px < 10 || px > W - 10) return;
        ctx.fillStyle = color;
        ctx.fillRect(px - 16, roadY - 16, 32, 14);
        ctx.fillRect(px - 9 + dir * 3, roadY - 24, 16, 9);
        D.circle(ctx, px - 9, roadY, 4, C.ink); D.circle(ctx, px + 9, roadY, 4, C.ink);
      }
      car(P.va * S.t, C.blue, P.va >= 0 ? 1 : -1);
      car(P.xb + P.vb * S.t, C.red, P.vb >= 0 ? 1 : -1);
      // x(t) графигі
      var r = { x: 50, y: 140, w: W - 80, h: H - 180 };
      var pts1 = [], pts2 = [];
      for (var t = 0; t <= TMAX; t += 0.5) { pts1.push([t, P.va * t]); pts2.push([t, P.xb + P.vb * t]); }
      var g = D.plot(ctx, r, { xmin: 0, xmax: TMAX, ymin: -200, ymax: 600, xlabel: 't, с', ylabel: 'x, м',
        series: [{ pts: pts1, color: C.blue, dash: [4, 4], width: 1.2 }, { pts: pts2, color: C.red, dash: [4, 4], width: 1.2 },
          { pts: pts1.filter(function (p) { return p[0] <= S.t; }), color: C.blue }, { pts: pts2.filter(function (p) { return p[0] <= S.t; }), color: C.red }] });
      var tm = meet(P);
      if (tm !== null) {
        D.circle(ctx, g.X(tm), g.Y(P.va * tm), 5, null, C.good, 2);
        D.text(ctx, 'кездесу', g.X(tm) + 8, g.Y(P.va * tm) - 8, { size: 11, color: C.good, weight: '600' });
      }
    },
  });
})();

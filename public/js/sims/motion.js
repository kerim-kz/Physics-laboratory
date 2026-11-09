/* Бірқалыпты үдемелі қозғалыс: x(t) = x₀ + v₀t + at²/2, v(t) = v₀ + at. */
(function () {
  var TMAX = 10;
  function pos(P, t) { return P.x0 + P.v0 * t + P.a * t * t / 2; }
  function vel(P, t) { return P.v0 + P.a * t; }

  Sim.create({
    tools: ['ruler', 'stopwatch'],
    scale: function (api) { return api._sc || null; },
    aspect: 0.72,
    hint: 'Алдымен графиктерді болжап көр, содан кейін «Бастау» бас.',
    controls: [
      { type: 'range', key: 'x0', label: 'Бастапқы координата x₀', min: -20, max: 20, step: 1, value: 0, unit: 'м', digits: 0 },
      { type: 'range', key: 'v0', label: 'Бастапқы жылдамдық v₀', min: -10, max: 20, step: 0.5, value: 2, unit: 'м/с', digits: 1 },
      { type: 'range', key: 'a', label: 'Үдеу a', min: -4, max: 4, step: 0.1, value: 1, unit: 'м/с²', digits: 1 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 2 },
      { key: 'x', label: 'Координата x', unit: 'м', digits: 2 },
      { key: 'v', label: 'Жылдамдық v', unit: 'м/с', digits: 2 },
      { key: 's', label: 'Орын ауыстыру s = x − x₀', unit: 'м', digits: 2 },
      { key: 'l', label: 'Жүрілген жол', unit: 'м', digits: 2 },
    ],
    init: function (api) {
      var P = api.P, S = api.S;
      S.t = 0; S.path = 0; S.hist = [[0, P.x0, P.v0]];
      // Барлық 10 секундтағы шекараларды алдын ала есептеп, масштабты таңдаймыз.
      var xs = [], vs = [];
      for (var i = 0; i <= 100; i++) { var t = i / 10; xs.push(pos(P, t)); vs.push(vel(P, t)); }
      S.xmin = Math.min.apply(null, xs); S.xmax = Math.max.apply(null, xs);
      S.vmin = Math.min.apply(null, vs.concat([0])); S.vmax = Math.max.apply(null, vs.concat([0]));
      var pad = Math.max(2, (S.xmax - S.xmin) * 0.08);
      S.xmin -= pad; S.xmax += pad;
      var vp = Math.max(1, (S.vmax - S.vmin) * 0.1);
      S.vmin -= vp; S.vmax += vp;
    },
    step: function (api, dt) {
      var S = api.S, P = api.P;
      var t2 = Math.min(TMAX, S.t + dt);
      S.path += Math.abs(vel(P, (S.t + t2) / 2)) * (t2 - S.t);
      S.t = t2;
      S.hist.push([S.t, pos(P, S.t), vel(P, S.t)]);
      if (S.t >= TMAX) return false;
    },
    substeps: 4,
    read: function (api) {
      var S = api.S, P = api.P, x = pos(P, S.t);
      return { t: S.t, x: x, v: vel(P, S.t), s: x - P.x0, l: S.path };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      // ---- жол ----
      var top = 24, trackY = 92, left = 30, right = W - 30;
      var X = function (x) { return left + (x - S.xmin) / (S.xmax - S.xmin) * (right - left); };
      api._sc = { px: (right - left) / (S.xmax - S.xmin), unit: 'м' };
      D.line(ctx, left, trackY, right, trackY, C.line, 3);
      var step = Math.pow(10, Math.floor(Math.log10((S.xmax - S.xmin) / 4)));
      if ((S.xmax - S.xmin) / step > 12) step *= 5; else if ((S.xmax - S.xmin) / step > 6) step *= 2;
      for (var g = Math.ceil(S.xmin / step) * step; g <= S.xmax; g += step) {
        var gx = X(g);
        D.line(ctx, gx, trackY, gx, trackY + 7, C.muted, 1);
        D.text(ctx, api.fmt(g, step < 1 ? 1 : 0), gx, trackY + 20, { size: 10, align: 'center', color: C.muted, mono: true });
      }
      D.text(ctx, 'x, м', right, trackY + 34, { size: 11, align: 'right', color: C.muted });
      // бастапқы нүкте
      D.line(ctx, X(P.x0), trackY - 30, X(P.x0), trackY, C.muted, 1, [3, 3]);
      D.text(ctx, 'x₀', X(P.x0) + 4, trackY - 30, { size: 11, color: C.muted });
      // арбаша
      var x = pos(P, S.t), cx = X(x);
      ctx.fillStyle = C.blue;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - 22, trackY - 30, 44, 22, 5); else ctx.rect(cx - 22, trackY - 30, 44, 22);
      ctx.fill();
      D.circle(ctx, cx - 12, trackY - 5, 5, C.ink);
      D.circle(ctx, cx + 12, trackY - 5, 5, C.ink);
      var v = vel(P, S.t);
      if (Math.abs(v) > 0.05) D.arrow(ctx, cx, trackY - 42, cx + Math.max(-80, Math.min(80, v * 6)), trackY - 42, C.accent, 2.5, 'v');
      if (Math.abs(P.a) > 0.05) D.arrow(ctx, cx, trackY - 58, cx + P.a * 15, trackY - 58, C.orange, 2.5, 'a');
      D.text(ctx, 't = ' + api.fmt(S.t, 1) + ' с', left, top, { size: 13, weight: '600', mono: true });
      // ---- графиктер ----
      var gy = trackY + 62, gh = H - gy - 34, gw = (W - 110) / 2;
      var xs = S.hist.map(function (h) { return [h[0], h[1]]; });
      var vs = S.hist.map(function (h) { return [h[0], h[2]]; });
      D.plot(ctx, { x: 46, y: gy, w: gw, h: gh }, { xmin: 0, xmax: TMAX, ymin: S.xmin, ymax: S.xmax, xlabel: 't, с', ylabel: 'x(t), м',
        series: [{ pts: xs, color: C.blue }], marker: [S.t, x] });
      D.plot(ctx, { x: 46 + gw + 56, y: gy, w: gw, h: gh }, { xmin: 0, xmax: TMAX, ymin: S.vmin, ymax: S.vmax, xlabel: 't, с', ylabel: 'v(t), м/с',
        series: [{ pts: vs, color: C.accent }], marker: [S.t, v] });
    },
  });
})();

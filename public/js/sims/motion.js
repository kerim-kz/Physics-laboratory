/* Бірқалыпты үдемелі қозғалыс: x(t) = x₀ + v₀t + at²/2, v(t) = v₀ + at. */
(function () {
  var R = window.Real;
  var TMAX = 10;
  function pos(P, t) { return P.x0 + P.v0 * t + P.a * t * t / 2; }
  function vel(P, t) { return P.v0 + P.a * t; }

  Sim.create({
    grid: false,
    tools: ['ruler', 'stopwatch'],
    scale: function (api) { return api._sc || null; },
    aspect: 1,
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
      // ---- жол (сыртқы көрініс: автокөлік түзу жолмен қозғалады) ----
      var top = 24, ground = Math.max(120, H * 0.36), trackY = ground + 26, left = 40, right = W - 40;
      var X = function (x) { return left + (x - S.xmin) / (S.xmax - S.xmin) * (right - left); };
      api._sc = { px: (right - left) / (S.xmax - S.xmin), unit: 'м' };
      R.scene(ctx, W, ground + 58, 'outdoor', { ground: ground, road: true, clouds: true });
      ctx.fillStyle = C.bg; ctx.fillRect(0, ground + 58, W, H - ground - 58);
      // координата осі (жол жиегіндегі бағаналар)
      var step = Math.pow(10, Math.floor(Math.log10((S.xmax - S.xmin) / 4)));
      if ((S.xmax - S.xmin) / step > 12) step *= 5; else if ((S.xmax - S.xmin) / step > 6) step *= 2;
      for (var g = Math.ceil(S.xmin / step) * step; g <= S.xmax; g += step) {
        var gx = X(g);
        ctx.fillStyle = '#f2efe6'; ctx.fillRect(gx - 2, ground - 26, 4, 26); ctx.fillStyle = Math.abs(g) < 1e-9 ? '#d2382b' : '#3a4148'; ctx.fillRect(gx - 2, ground - 26, 4, 6);
        R.txt(ctx, api.fmt(g, step < 1 ? 1 : 0), gx, ground - 34, { size: 10, mono: true, color: R.isDark() ? '#e6ecf0' : '#1d2a33', weight: '600' });
      }
      R.tag(ctx, 'x, м', right + 8, ground - 34, { size: 10 });
      // бастапқы нүкте
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(P.x0), ground - 20); ctx.lineTo(X(P.x0), ground + 52); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'x₀', X(P.x0) + 14, ground - 10, { size: 10 });
      // стробоскоп: көліктің әр 1 с сайынғы орны
      var cw = Math.min(84, W * 0.11);
      for (var ts = 1; ts < S.t - 1e-6; ts += 1) { ctx.globalAlpha = 0.22; R.car(ctx, X(pos(P, ts)), trackY + 10, cw, '#2f7fd1', pos(P, ts) * 6, { flip: vel(P, ts) < 0 }); ctx.globalAlpha = 1; }
      // көлік
      var x = pos(P, S.t), cx = X(x), v = vel(P, S.t);
      R.car(ctx, cx, trackY + 10, cw, '#2f7fd1', x * 6, { flip: v < 0 || (Math.abs(v) < 1e-9 && P.a < 0) });
      if (Math.abs(v) > 0.05) R.force(ctx, cx, trackY - cw * 0.55, cx + Math.max(-110, Math.min(110, v * 7)), trackY - cw * 0.55, '#1f5fd1', 'v');
      if (Math.abs(P.a) > 0.05) R.force(ctx, cx, trackY - cw * 0.55 - 26, cx + P.a * 18, trackY - cw * 0.55 - 26, '#e0761b', 'a');
      R.lcd(ctx, left - 26, top - 12, 110, 26, 't = ' + api.fmt(S.t, 1) + ' с', { size: 13 });
      // ---- графиктер ----
      var gy = ground + 76, gh = H - gy - 34, gw = (W - 110) / 2;
      var xs = S.hist.map(function (h) { return [h[0], h[1]]; });
      var vs = S.hist.map(function (h) { return [h[0], h[2]]; });
      D.plot(ctx, { x: 46, y: gy, w: gw, h: gh }, { xmin: 0, xmax: TMAX, ymin: S.xmin, ymax: S.xmax, xlabel: 't, с', ylabel: 'x(t), м',
        series: [{ pts: xs, color: C.blue }], marker: [S.t, x] });
      D.plot(ctx, { x: 46 + gw + 56, y: gy, w: gw, h: gh }, { xmin: 0, xmax: TMAX, ymin: S.vmin, ymax: S.vmax, xlabel: 't, с', ylabel: 'v(t), м/с',
        series: [{ pts: vs, color: C.accent }], marker: [S.t, v] });
    },
  });
})();

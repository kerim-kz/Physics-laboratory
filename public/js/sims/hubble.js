/* Әлемнің кеңеюі: «мейізді нан» моделі — кез келген галактикадан қарағанда басқалары қашықтыққа пропорционал жылдамдықпен алыстайды (Хаббл заңы v = Hr). Қызыл ығысу, Әлемнің жасы, Үлкен жарылыс. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.3, grid: false, keepRunning: true, autoplay: true,
    hint: 'Кез келген галактиканы бақылаушы ретінде таңда (басу арқылы): одан қараған да басқа галактикалар қашықтыққа пропорционал жылдамдықпен алыстайды. Әлемнің «центрі» жоқ!',
    controls: [
      { type: 'range', key: 'H', label: 'Хаббл тұрақтысы H', min: 50, max: 100, step: 1, value: 70, unit: 'км/(с·Мпк)', digits: 0 },
      { type: 'check', key: 'run', label: 'Кеңею', value: true, live: true },
    ],
    readouts: [
      { key: 'age', label: 'Әлемнің жасы t ≈ 1/H', unit: 'млрд жыл', digits: 1 },
      { key: 'a', label: 'Масштаб факторы a(t)', digits: 2 },
      { key: 'z', label: 'Ең алыс галактиканың қызыл ығысуы z', digits: 3 },
    ],
    init: function (api) { var S = api.S, rnd = R.rng(17); S.a = 1; S.g = []; for (var i = 0; i < 40; i++) S.g.push({ x: (rnd() - 0.5) * 1.6, y: (rnd() - 0.5) * 1, c: rnd() }); S.obs = 0; S.hist = []; },
    step: function (api, dt) { var S = api.S, P = api.P; if (P.run) { S.a *= 1 + dt * P.H / 70 * 0.06; if (S.a > 2.2) S.a = 1; } },
    pointer: { down: function (api, p) { var S = api.S, W = api.W, H = api.H, best = 0, bd = 1e9; S.g.forEach(function (g, i) { var x = W * 0.3 + g.x * S.a * W * 0.16, y = H * 0.32 + g.y * S.a * H * 0.24, d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = i; } }); S.obs = best; } },
    read: function (api) { var S = api.S, P = api.P, o = S.g[S.obs], dmax = 0; S.g.forEach(function (g) { dmax = Math.max(dmax, Math.hypot(g.x - o.x, g.y - o.y)); }); return { age: 977.8 / P.H, a: S.a, z: dmax * 0.05 * (S.a - 0.6) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark(), o = S.g[S.obs];
      R.scene(ctx, W, H, 'space', { count: 120 });
      var cx = wide ? W * 0.3 : W / 2, cy = wide ? H * 0.42 : H * 0.24, sx = (wide ? W * 0.16 : W * 0.3) * S.a, sy = (wide ? H * 0.24 : H * 0.12) * S.a;
      // торлы «кеңістік»
      ctx.strokeStyle = 'rgba(120,140,200,.18)'; ctx.lineWidth = 1;
      for (var gxl = -1; gxl <= 1; gxl += 0.25) { ctx.beginPath(); ctx.moveTo(cx + gxl * sx, cy - 0.6 * sy); ctx.lineTo(cx + gxl * sx, cy + 0.6 * sy); ctx.stroke(); }
      for (var gyl = -0.5; gyl <= 0.5; gyl += 0.25) { ctx.beginPath(); ctx.moveTo(cx - sx, cy + gyl * sy); ctx.lineTo(cx + sx, cy + gyl * sy); ctx.stroke(); }
      var ox = cx + o.x * sx, oy = cy + o.y * sy, pts = [];
      S.g.forEach(function (g, i) {
        var x = cx + g.x * sx, y = cy + g.y * sy, d = Math.hypot(g.x - o.x, g.y - o.y), red = Math.min(1, d * 0.6);
        if (i !== S.obs) { var vx = (g.x - o.x) * 26, vy = (g.y - o.y) * 26; ctx.strokeStyle = 'rgba(255,120,100,' + (0.3 + red * 0.5) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vx, y + vy); ctx.stroke(); pts.push([d * 100 * S.a, d * 100 * S.a * P.H]); }
        ctx.fillStyle = 'rgb(255,' + Math.round(230 - red * 120) + ',' + Math.round(200 - red * 150) + ')';
        ctx.beginPath(); ctx.ellipse(x, y, 5, 3, g.c * 3, 0, 7); ctx.fill();
      });
      R.sphere(ctx, ox, oy, 7, '#6fb6ff'); R.tag(ctx, 'бақылаушы', ox, oy - 18, { size: 9.5 });
      // Хаббл диаграммасы
      var gx = wide ? W * 0.62 : 56, gy = wide ? 30 : H * 0.5, gw = wide ? W * 0.34 : W - 76, gh = wide ? H - 80 : H - gy - 46;
      ctx.save(); R.rr(ctx, gx - 50, gy - 16, gw + 62, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var o2 = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 400, ymin: 0, ymax: 400 * 100, xlabel: 'r, Мпк', ylabel: 'v, км/с', series: [{ pts: [[0, 0], [400, 400 * P.H]], color: '#7a3fb0', width: 2 }] });
      pts.forEach(function (p) { if (p[0] <= 400) api.D.circle(ctx, o2.X(p[0]), o2.Y(p[1]), 3, '#d2382b', null, 0, true); });
      R.tag(ctx, 'v = H·r,  H = ' + P.H, gx + gw * 0.35, gy + 14, { size: 10.5, color: '#7a3fb0' });
      R.tag(ctx, 'Алыстаған сайын қызыл ығысу артады: z ≈ v/c', wide ? W * 0.3 : W / 2, H - 16, { size: W < 600 ? 9.5 : 11, color: '#0b3f4a' });
    },
  });
})();

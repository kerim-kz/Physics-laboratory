/* Айнымалы жұлдыздар — цефеидалар: жарқырау периодты өзгереді. Период — жарқырау тәуелділігі арқылы абсолют жұлдыздық шаманы, ал көрінерлік шамамен салыстырып қашықтықты анықтау («стандарт шырақ»). */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.3, grid: false, keepRunning: true, autoplay: true,
    hint: 'Жарықтылық қисығынан периодты өлше, период — жарқырау графигінен M-ді тап, содан кейін m − M = 5 lg r − 5 формуласымен жұлдызға дейінгі қашықтықты есепте.',
    controls: [
      { type: 'range', key: 'P', label: 'Цефеиданың периоды P', min: 2, max: 50, step: 1, value: 10, unit: 'тәулік', digits: 0 },
      { type: 'range', key: 'r', label: 'Нақты қашықтық (жасырын тексеру үшін)', min: 100, max: 50000, step: 100, value: 2000, unit: 'пк', digits: 0 },
    ],
    readouts: [
      { key: 'M', label: 'Абсолют жұлдыздық шама M', digits: 2 },
      { key: 'm', label: 'Орташа көрінерлік шама m', digits: 2 },
      { key: 'd', label: 'Есептелген қашықтық r = 10^((m − M + 5)/5)', unit: 'пк', digits: 0 },
      { key: 'L', label: 'Жарқырау (Күн жарқырауымен)', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var c = calc(api.P); return { M: c.M, m: c.m, d: Math.pow(10, (c.m - c.M + 5) / 5), L: Math.pow(10, (4.83 - c.M) / 2.5) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, c = calc(P), wide = W > 640, dark = R.isDark(), td = S.t * 3; // тәулік
      R.scene(ctx, W, H, 'space', { count: 200 });
      var ph = (td % P.P) / P.P, br = light(ph);
      // жұлдыз
      var sx = wide ? W * 0.16 : W * 0.5, sy = wide ? H * 0.32 : 64, sr = 22 + 10 * br;
      var g = ctx.createRadialGradient(sx, sy, 2, sx, sy, sr * 2.4); g.addColorStop(0, 'rgba(255,245,210,1)'); g.addColorStop(0.35, 'rgba(255,220,140,' + (0.6 + 0.4 * br) + ')'); g.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, sr * 2.4, 0, 7); ctx.fill();
      R.tag(ctx, 'фаза ' + Math.round(ph * 100) + ' %', sx, sy + 62, { size: 10 });
      // жарықтылық қисығы
      var gx = wide ? W * 0.36 : 50, gy = wide ? 26 : 140, gw = wide ? W * 0.6 : W - 66, gh = wide ? H * 0.36 : H * 0.24;
      ctx.save(); R.rr(ctx, gx - 44, gy - 16, gw + 56, gh + 44, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var t0 = Math.max(0, td - P.P * 2.5), pts = []; for (var t = t0; t <= t0 + P.P * 3; t += P.P / 60) pts.push([t, c.m + 0.4 - 0.8 * light((t % P.P) / P.P)]);
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: t0, xmax: t0 + P.P * 3, ymin: c.m + 0.7, ymax: c.m - 0.7, xlabel: 't, тәулік', ylabel: 'm', series: [{ pts: pts, color: '#e0a800', width: 2.4 }], marker: [td, c.m + 0.4 - 0.8 * br] });
      R.txt(ctx, 'Көрінерлік жұлдыздық шама (ось төңкерілген: жоғары — жарық)', gx + gw / 2, gy + 8, { size: 9.5, color: '#5b6670' });
      // период — жарқырау тәуелділігі
      var g2x = wide ? W * 0.36 : 50, g2y = gy + gh + 50, g2w = gw, g2h = H - g2y - 40;
      ctx.save(); R.rr(ctx, g2x - 44, g2y - 16, g2w + 56, g2h + 44, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var pl = []; for (var lp = 0.2; lp <= 1.8; lp += 0.02) pl.push([lp, -2.43 * (lp - 1) - 4.05]);
      var o = api.D.plot(ctx, { x: g2x, y: g2y, w: g2w, h: g2h }, { xmin: 0.2, xmax: 1.8, ymin: -1.5, ymax: -7.5, xlabel: 'lg P (тәулік)', ylabel: 'M', series: [{ pts: pl, color: '#7a3fb0', width: 2.4 }], marker: [Math.log10(P.P), c.M] });
      R.tag(ctx, 'M = −2,43(lg P − 1) − 4,05', g2x + g2w * 0.65, o.Y(-2.5), { size: 10.5, color: '#7a3fb0' });
      if (!wide) return;
      R.tag(ctx, 'Генриетта Ливитт (1912): «стандарт шырақ»', sx, H - 30, { size: 10 });
    },
  });
  function light(ph) { return ph < 0.2 ? ph / 0.2 : 1 - (ph - 0.2) / 0.8; } // жылдам жарқырап, баяу сөнеді
  function calc(P) { var M = -2.43 * (Math.log10(P.P) - 1) - 4.05, m = M + 5 * Math.log10(P.r) - 5; return { M: M, m: m }; }
})();

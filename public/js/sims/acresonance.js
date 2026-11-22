/* Кернеулер резонансы: тізбектей RLC тізбегіндегі токтың жиілікке тәуелділігі (резонанс қисығы). Резонанста шам ең жарық, ал катушкадағы кернеу желі кернеуінен Q есе үлкен. */
(function () {
  var R = window.Real, U = 10;
  function calc(P, f) { var w = 2 * Math.PI * f, XL = w * P.L, XC = 1 / (w * P.C * 1e-6), Z = Math.sqrt(P.R * P.R + Math.pow(XL - XC, 2)); return { I: U / Z, UL: U / Z * XL, UC: U / Z * XC, Z: Z }; }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.3, grid: false, static: true,
    hint: 'Генератордың жиілігін өзгертіп, шамның ең жарық жанатын жиілігін тап. Активті кедергіні азайтқанда резонанс қисығы қалай өзгереді?',
    controls: [
      { type: 'range', key: 'f', label: 'Генератордың жиілігі ν', min: 20, max: 300, step: 1, value: 80, unit: 'Гц', digits: 0 },
      { type: 'range', key: 'R', label: 'Активті кедергі R', min: 2, max: 60, step: 2, value: 10, unit: 'Ом', digits: 0 },
      { type: 'range', key: 'L', label: 'Индуктивтілік L', min: 0.05, max: 0.5, step: 0.05, value: 0.2, unit: 'Гн', digits: 2 },
      { type: 'range', key: 'C', label: 'Сыйымдылық C', min: 5, max: 100, step: 5, value: 20, unit: 'мкФ', digits: 0 },
    ],
    readouts: [
      { key: 'f0', label: 'Резонанс жиілігі ν₀ = 1/(2π√LC)', unit: 'Гц', digits: 1 },
      { key: 'I', label: 'Ток I (U = 10 В)', unit: 'А', digits: 3 },
      { key: 'UL', label: 'Катушкадағы кернеу U<sub>L</sub>', unit: 'В', digits: 1 },
      { key: 'Q', label: 'Сапалылық Q = (1/R)√(L/C)', digits: 1 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var P = api.P, c = calc(P, P.f); return { f0: 1 / (2 * Math.PI * Math.sqrt(P.L * P.C * 1e-6)), I: c.I, UL: c.UL, Q: Math.sqrt(P.L / (P.C * 1e-6)) / P.R }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, c = calc(P, P.f), f0 = 1 / (2 * Math.PI * Math.sqrt(P.L * P.C * 1e-6)), wide = W > 640, dark = R.isDark(), Imax = U / P.R;
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      // тізбек
      var x0 = wide ? 40 : 24, x1 = wide ? W * 0.4 : W - 24, yT = wide ? 50 : 34, yB = wide ? H * 0.5 : H * 0.26;
      R.wire(ctx, [[x0, (yT + yB) / 2 - 20], [x0, yT], [x1, yT], [x1, yB], [x0, yB], [x0, (yT + yB) / 2 + 20]], { color: '#c0392b' });
      R.sphere(ctx, x0, (yT + yB) / 2, 18, '#2b2f33'); R.txt(ctx, '~', x0, (yT + yB) / 2 + 1, { size: 18, color: '#fff', weight: '700' });
      R.tag(ctx, P.f + ' Гц', x0 + 46, (yT + yB) / 2, { size: 10 });
      var s1 = x0 + (x1 - x0) * 0.3, s2 = x0 + (x1 - x0) * 0.62;
      R.bulb(ctx, s1, yT + 2, 14, Math.min(1, c.I / Imax * 1.1)); R.tag(ctx, 'шам (R)', s1, yT - 30, { size: 10 });
      ctx.strokeStyle = '#b87333'; ctx.lineWidth = 3; for (var k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(s2 - 24 + k * 8, yT, 4.5, 11, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); } R.tag(ctx, 'L', s2, yT - 22, { size: 10.5 });
      R.block(ctx, x1 - 15, (yT + yB) / 2 - 2, 30, 4, 'copper', { depth: 1, shadow: false }); R.block(ctx, x1 - 15, (yT + yB) / 2 + 6, 30, 4, 'copper', { depth: 1, shadow: false }); R.tag(ctx, 'C', x1 - 30, (yT + yB) / 2 + 4, { size: 10.5 });
      R.meter(ctx, (x0 + x1) / 2, yB, 22, c.I, Math.max(0.2, Math.ceil(Imax * 10) / 10), { letter: 'A' });
      R.meter(ctx, s2, yT + 52, 20, c.UL, Math.max(20, Math.ceil(c.UL / 20 + 1) * 20), { letter: 'V' }); R.tag(ctx, 'U_L = ' + c.UL.toFixed(0) + ' В', s2 + 56, yT + 52, { size: 10, color: '#7a3fb0' });
      // резонанс қисықтары
      var gx = wide ? W * 0.5 : 46, gy = wide ? 26 : yB + 56, gw = wide ? W * 0.46 : W - 62, gh = wide ? H * 0.78 : H - yB - 110;
      ctx.save(); R.rr(ctx, gx - 44, gy - 16, gw + 56, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var cur = [], low = [], hi = [];
      for (var f = 20; f <= 300; f += 1) { cur.push([f, calc(P, f).I]); low.push([f, calc({ R: P.R * 3, L: P.L, C: P.C }, f).I]); hi.push([f, calc({ R: Math.max(1, P.R / 2), L: P.L, C: P.C }, f).I]); }
      var ym = Math.max(0.1, U / Math.max(1, P.R / 2) * 1.08);
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 20, xmax: 300, ymin: 0, ymax: ym, xlabel: 'ν, Гц', ylabel: 'I, А', series: [{ pts: hi, color: 'rgba(122,63,176,.8)', dash: [5, 4], width: 1.8 }, { pts: low, color: 'rgba(31,95,209,.8)', dash: [5, 4], width: 1.8 }, { pts: cur, color: '#d2382b', width: 2.6 }], marker: [P.f, c.I] });
      if (f0 > 20 && f0 < 300) { ctx.strokeStyle = '#0b8a7a'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(o.X(f0), gy); ctx.lineTo(o.X(f0), gy + gh); ctx.stroke(); ctx.setLineDash([]); R.tag(ctx, 'ν₀ = ' + f0.toFixed(0) + ' Гц', o.X(f0), gy + 14, { size: 10, color: '#0b6b78' }); }
      R.txt(ctx, 'үзік: R/2 (күлгін) және 3R (көк) кезіндегі қисықтар', gx + gw / 2, gy + gh + 30, { size: 9.5, color: '#5b6670' });
    },
  });
})();

/* Радиациядан қорғану: уақыт, қашықтық, қорғаныш. Нүктелік γ-көздің доза қуаты I ∝ 1/r², қорғаныш қабатында I = I₀·2^(−d/d½). Дозиметр. */
(function () {
  var R = window.Real;
  var MAT = { none: ['Жоқ', 1, null], water: ['Су', 18, 'water'], concrete: ['Бетон', 6, 'concrete'], steel: ['Болат', 2.2, 'steel'], lead: ['Қорғасын', 1.0, 'lead'] }; // жартылай әлсірету қалыңдығы, см (Co-60 γ)
  var I1 = 400; // 1 м қашықтықтағы доза қуаты, мкЗв/сағ
  function dose(P) { var m = MAT[P.mat], f = P.mat === 'none' ? 1 : Math.pow(2, -P.d / m[1]); return I1 / (P.r * P.r) * f; }
  Sim.create({
    aspect: 0.6, grid: false, keepRunning: true, autoplay: true,
    hint: 'Дозиметрді көзден алыстатып, қорғаныш қабатын қойып көр. Қашықтықты 2 есе арттырғанда доза қуаты неше есе кемиді?',
    controls: [
      { type: 'range', key: 'r', label: 'Көзден дозиметрге дейінгі қашықтық r', min: 0.5, max: 6, step: 0.25, value: 1, unit: 'м', digits: 2, live: true },
      { type: 'select', key: 'mat', label: 'Қорғаныш материалы', value: 'none', options: Object.keys(MAT).map(function (k) { return [k, MAT[k][0] + (k === 'none' ? '' : ' (d½ ≈ ' + String(MAT[k][1]).replace('.', ',') + ' см)')]; }), live: true },
      { type: 'range', key: 'd', label: 'Қорғаныштың қалыңдығы d', min: 0, max: 20, step: 1, value: 0, unit: 'см', digits: 0, live: true },
      { type: 'range', key: 'tm', label: 'Сәулелену аймағында болу уақыты', min: 1, max: 60, step: 1, value: 10, unit: 'мин', digits: 0, live: true },
    ],
    readouts: [
      { key: 'I', label: 'Доза қуаты', unit: 'мкЗв/сағ', digits: 2 },
      { key: 'Dt', label: 'Алынған доза H = I·t', unit: 'мкЗв', digits: 2 },
      { key: 'bg', label: 'Табиғи фоннан неше есе көп (0,15 мкЗв/сағ)', digits: 1 },
      { key: 'yr', label: 'Жылдық шектен үлесі (1 мЗв = 1000 мкЗв)', unit: '%', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; api.S.clicks = []; },
    step: function (api, dt) {
      var S = api.S, I = dose(api.P); S.t += dt;
      var cps = Math.min(60, I * 0.25 + 0.4); // санағыш шертулері (көрнекілік)
      if (Math.random() < cps * dt) S.clicks.push(S.t);
      S.clicks = S.clicks.filter(function (c) { return S.t - c < 0.12; });
    },
    read: function (api) { var P = api.P, I = dose(P), Dt = I * P.tm / 60; return { I: I, Dt: Dt, bg: I / 0.15, yr: Dt / 1000 * 100 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.78, I = dose(P);
      R.scene(ctx, W, H, 'lab', { table: table, tiles: true });
      var sx = W * 0.1, ppm = (W * 0.78) / 6.2;
      // метрлік белгілер
      for (var m = 0; m <= 6; m++) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sx + 24 + m * ppm, table + 4, 2, 10); R.txt(ctx, m + ' м', sx + 24 + m * ppm, table + 24, { size: 10, color: '#3a2a1a' }); }
      // қорғасын контейнер (ашық) және Co-60 көзі
      R.block(ctx, sx - 16, table - 60, 48, 60, 'lead', { depth: 8 });
      ctx.fillStyle = '#1b1f24'; ctx.fillRect(sx + 18, table - 40, 14, 20);
      var g = ctx.createRadialGradient(sx + 26, table - 30, 1, sx + 26, table - 30, 14); g.addColorStop(0, 'rgba(255,240,140,.95)'); g.addColorStop(1, 'rgba(255,240,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx + 26, table - 30, 14, 0, 7); ctx.fill();
      R.tag(ctx, 'Co-60 (γ)', sx + 8, table - 78, { size: 10.5 });
      // радиация белгісі
      trefoil(ctx, sx + 8, table - 112, 14);
      // сәуле конусы
      var dx = sx + 24 + P.r * ppm;
      ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#e0a21b'; ctx.beginPath(); ctx.moveTo(sx + 32, table - 30); ctx.lineTo(W, table - 30 - (W - sx) * 0.22); ctx.lineTo(W, table - 30 + (W - sx) * 0.12); ctx.closePath(); ctx.fill(); ctx.restore();
      // қорғаныш
      var mt = MAT[P.mat];
      if (P.mat !== 'none' && P.d > 0) {
        var wpx = Math.max(6, P.d * 3), shx = sx + 40 + Math.min(P.r * ppm * 0.35, 60);
        if (mt[2] === 'water') { R.vessel(ctx, shx, table - 120, wpx + 10, 120, 110, { liquid: 'water' }); }
        else R.block(ctx, shx, table - 120, wpx, 120, mt[2], { depth: 8 });
        R.tag(ctx, mt[0] + ', ' + P.d + ' см', shx + wpx / 2, table - 134, { size: 10 });
      }
      // дозиметр
      var flash = S.clicks.length > 0;
      R.block(ctx, dx - 6, table - 70, 64, 70, '#e7b92f', { depth: 8 });
      R.lcd(ctx, dx, table - 62, 52, 22, I >= 100 ? Math.round(I) + '' : Sim.fmt(I, 2).replace('.', ','), { size: 11, bg: I > 20 ? '#f5c0b5' : flash ? '#e9f7c0' : '#b8d0a0' });
      R.txt(ctx, 'мкЗв/сағ', dx + 26, table - 28, { size: 8.5, color: '#3a2a08' });
      ctx.fillStyle = flash ? '#ff5040' : '#6b2a20'; ctx.beginPath(); ctx.arc(dx + 26, table - 14, 4, 0, 7); ctx.fill();
      R.tag(ctx, 'Дозиметр', dx + 26, table - 86, { size: 10.5 });
      // I(r) графигі
      var gx = W * 0.5, gy = 28, gw = W * 0.44, gh = H * 0.34;
      if (W > 640) {
        ctx.save(); R.rr(ctx, gx - 44, gy - 16, gw + 56, gh + 50, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore();
        var pts = []; for (var rr = 0.75; rr <= 6; rr += 0.05) pts.push([rr, dose({ r: rr, mat: P.mat, d: P.d })]);
        api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 6, ymin: 0, ymax: 720, xlabel: 'r, м', ylabel: 'I, мкЗв/сағ', series: [{ pts: pts, color: '#d2382b' }], marker: [P.r, Math.min(720, I)] });
      }
      R.tag(ctx, 'Қорғанудың үш тәсілі: уақыт · қашықтық · қорғаныш', W * (W > 640 ? 0.25 : 0.5), 22, { size: W < 600 ? 10 : 11.5, color: '#0b6b78' });
    },
  });
  function trefoil(ctx, x, y, r) {
    ctx.save(); ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1f24';
    for (var i = 0; i < 3; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a - 0.52, a + 0.52); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1f24'; ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, 7); ctx.fill();
    ctx.restore();
  }
})();

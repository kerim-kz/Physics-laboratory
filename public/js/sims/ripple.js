/* Толқындар ваннасы: екі когерентті көздің толқындарының интерференциясы, саңылаудағы дифракция және Гюйгенс принципі (екінші реттік толқындар). */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true, autoplay: true,
    hint: 'Екі көздің интерференциясында тербелмейтін сызықтар (минимумдар) пайда болады. Саңылау тәжірибесінде саңылау енін толқын ұзындығымен салыстыр: саңылау тар болса, толқын көлеңке аймағына айналып өтеді.',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'two', options: [['two', 'Екі көз — интерференция'], ['slit', 'Саңылау — дифракция'], ['huy', 'Гюйгенс принципі']], live: true },
      { type: 'range', key: 'lam', label: 'Толқын ұзындығы λ', min: 14, max: 50, step: 2, value: 28, unit: 'мм', digits: 0, live: true },
      { type: 'range', key: 'd', label: 'Көздер арасы / саңылау ені', min: 20, max: 160, step: 5, value: 80, unit: 'мм', digits: 0, live: true },
    ],
    readouts: [
      { key: 'r', label: 'd / λ', digits: 2 },
      { key: 'n', label: 'Максимумдар саны (екі көз)', digits: 0 },
      { key: 'th', label: 'Бірінші минимумның бұрышы (саңылау)', unit: '°', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var P = api.P, r = P.d / P.lam; return { r: r, n: 2 * Math.floor(r) + 1, th: P.lam < P.d ? Math.asin(P.lam / P.d) * 180 / Math.PI : null }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, mmpx = W / 600, lam = P.lam * mmpx, k = 2 * Math.PI / lam, w = 2 * Math.PI * 1.2, t = S.t;
      var img = ctx.createImageData(Math.ceil(W / 3), Math.ceil(H / 3)), data = img.data, cw = img.width, chh = img.height;
      var srcs = [], wallX = W * 0.25;
      if (P.mode === 'two') srcs = [[W * 0.15, H / 2 - P.d * mmpx / 2], [W * 0.15, H / 2 + P.d * mmpx / 2]];
      else { var n = P.mode === 'huy' ? 7 : Math.max(3, Math.round(P.d * mmpx / 6)); for (var i = 0; i < n; i++) srcs.push([wallX, H / 2 - P.d * mmpx / 2 + (i + 0.5) * P.d * mmpx / n]); }
      for (var y = 0; y < chh; y++) for (var x = 0; x < cw; x++) {
        var px = x * 3, py = y * 3, v = 0;
        if (P.mode !== 'two' && px < wallX) v = Math.cos(k * px - w * t);
        else { for (var s = 0; s < srcs.length; s++) { var r = Math.hypot(px - srcs[s][0], py - srcs[s][1]) + 0.5; v += Math.cos(k * r - w * t + (P.mode === 'two' ? 0 : k * wallX)) / Math.sqrt(r / 30 + 1); } v = v / (P.mode === 'two' ? 1.2 : Math.max(1, srcs.length * 0.45)); }
        var c = Math.max(-1, Math.min(1, v)), idx = (y * cw + x) * 4;
        data[idx] = 40 + 60 * (c + 1); data[idx + 1] = 110 + 60 * (c + 1); data[idx + 2] = 170 + 40 * (c + 1); data[idx + 3] = 255;
      }
      var off = document.createElement('canvas'); off.width = cw; off.height = chh; off.getContext('2d').putImageData(img, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, W, H); ctx.restore();
      if (P.mode === 'two') { srcs.forEach(function (s0) { R.sphere(ctx, s0[0], s0[1], 6, '#d2382b'); }); }
      else {
        ctx.fillStyle = '#4a525b'; ctx.fillRect(wallX - 4, 0, 8, H / 2 - P.d * mmpx / 2); ctx.fillRect(wallX - 4, H / 2 + P.d * mmpx / 2, 8, H / 2);
        if (P.mode === 'huy') srcs.forEach(function (s0) { ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; var rr = ((t * w / k) % lam); for (var j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(s0[0], s0[1], rr + j * lam, -Math.PI / 2, Math.PI / 2); ctx.stroke(); } R.sphere(ctx, s0[0], s0[1], 3.5, '#f1c40f'); });
      }
      R.tag(ctx, P.mode === 'two' ? 'Интерференция: Δd = kλ — максимум, Δd = (k + ½)λ — минимум' : P.mode === 'slit' ? 'Дифракция: саңылау ені λ-мен шамалас болғанда толқын кедергіні айналып өтеді' : 'Гюйгенс: толқын майданының әр нүктесі — екінші реттік толқындардың көзі', W / 2, 18, { size: W < 600 ? 9 : 11.5, color: '#0b3f4a' });
      R.tag(ctx, 'λ = ' + P.lam + ' мм', W - 60, H - 16, { size: 10.5 });
    },
  });
})();

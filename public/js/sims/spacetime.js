/* Лоренц түрлендірулері: жарық жылдамдығына жақын жылдамдықпен қозғалатын пойыз. Бір мезеттілік салыстырмалы: вагонның ортасынан шыққан жарық вагон ішінде екі ұшына бір мезетте жетеді, ал перронда — әр түрлі мезетте. Минковский диаграммасы. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.4, grid: false, keepRunning: true, autoplay: true,
    hint: 'Вагонның ортасында жарық жарқ етеді. Вагондағы бақылаушы үшін жарық алдыңғы және артқы қабырғаға бір мезетте жетеді, ал перрондағы бақылаушы үшін артқы қабырғаға ертерек жетеді.',
    controls: [
      { type: 'range', key: 'b', label: 'Пойыздың жылдамдығы v/c', min: 0, max: 0.9, step: 0.05, value: 0.6, digits: 2 },
      { type: 'select', key: 'frame', label: 'Санақ жүйесі', value: 'ground', options: [['ground', 'Перрондағы бақылаушы (K)'], ['train', 'Вагондағы бақылаушы (K′)']] },
    ],
    readouts: [
      { key: 'g', label: 'Лоренц факторы γ', digits: 3 },
      { key: 'L', label: 'Вагонның ұзындығы перроннан (l₀ = 1 жар.-мкс)', unit: 'жар.-мкс', digits: 3 },
      { key: 'dt', label: 'K жүйесіндегі жету уақыттарының айырымы', unit: 'мкс', digits: 3 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt * 0.25; if (api.S.t > 2.6) api.S.t = 0; },
    read: function (api) { var b = api.P.b, g = 1 / Math.sqrt(1 - b * b), L = 1 / g; return { g: g, L: L, dt: (L / 2) / (1 - b) - (L / 2) / (1 + b) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, b = P.b, g = 1 / Math.sqrt(1 - b * b), t = S.t, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'outdoor', { ground: wide ? H * 0.5 : H * 0.34 });
      var gy = wide ? H * 0.5 : H * 0.34, sc = wide ? W * 0.22 : W * 0.3; // 1 жар.-мкс → px
      var ground = P.frame === 'ground';
      // K жүйесінде: вагон центрі x = v t, ұзындығы L = 1/γ. K′-те: вагон тұрақты (L₀ = 1), перрон −v жылдамдықпен қозғалады.
      var Lcar = ground ? 1 / g : 1, cx0 = W * 0.42, carX = ground ? cx0 + b * t * sc : cx0;
      var back = carX - Lcar / 2 * sc, front = carX + Lcar / 2 * sc, cy = gy - 46;
      // перрон белгілері
      for (var m = -6; m <= 8; m++) { var mx = cx0 + m * sc * 0.25 - (ground ? 0 : b * t * sc); if (mx < 0 || mx > W) continue; ctx.fillStyle = '#6b7178'; ctx.fillRect(mx, gy - 4, 2, 10); }
      ctx.fillStyle = '#8f99a3'; ctx.fillRect(0, gy + 4, W, 6);
      // вагон
      ctx.save(); R.rr(ctx, back, cy - 36, front - back, 60, 8); var cg = ctx.createLinearGradient(0, cy - 36, 0, cy + 24); cg.addColorStop(0, '#2f7fd1'); cg.addColorStop(1, '#1f4f9b'); ctx.fillStyle = cg; ctx.fill(); ctx.restore();
      for (var w = 0; w < 2; w++) R.sphere(ctx, back + (front - back) * (0.25 + w * 0.5), cy + 26, 9, '#2b2f33');
      // жарық импульстері (ортадан)
      var flashX = ground ? cx0 : carX; // K жүйесінде жарқыл t = 0 мезетте вагон ортасында (x = cx0)
      var lx = flashX - t * sc, rx = flashX + t * sc;
      var hitBack = ground ? (Lcar / 2) / (1 + b) : 0.5, hitFront = ground ? (Lcar / 2) / (1 - b) : 0.5;
      ctx.fillStyle = '#ffe066';
      if (t < hitBack) { ctx.beginPath(); ctx.arc(lx, cy - 6, 6, 0, 7); ctx.fill(); } else { R.tag(ctx, 'артқы: t = ' + hitBack.toFixed(2).replace('.', ','), back, cy - 52, { size: 10, color: '#b4342a' }); ctx.fillStyle = 'rgba(255,224,102,.9)'; ctx.fillRect(back, cy - 36, 6, 60); }
      ctx.fillStyle = '#ffe066';
      if (t < hitFront) { ctx.beginPath(); ctx.arc(rx, cy - 6, 6, 0, 7); ctx.fill(); } else { R.tag(ctx, 'алдыңғы: t = ' + hitFront.toFixed(2).replace('.', ','), front, cy - 52, { size: 10, color: '#0b6b78' }); ctx.fillStyle = 'rgba(255,224,102,.9)'; ctx.fillRect(front - 6, cy - 36, 6, 60); }
      if (t < 0.08) { var fg = ctx.createRadialGradient(flashX, cy - 6, 1, flashX, cy - 6, 30); fg.addColorStop(0, 'rgba(255,240,150,1)'); fg.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(flashX, cy - 6, 30, 0, 7); ctx.fill(); }
      R.tag(ctx, ground ? 'K: вагон ' + (1 / g).toFixed(2).replace('.', ',') + ' есе қысқарған, v = ' + b + 'c →' : 'K′: вагон тыныштықта, перрон ← ' + b + 'c', W / 2, 18, { size: W < 600 ? 10 : 12, color: '#0b3f4a' });
      // Минковский диаграммасы
      var dx = wide ? W * 0.1 : 46, dy = gy + 30, dw = wide ? W * 0.8 : W - 62, dh = H - dy - 40;
      ctx.save(); R.rr(ctx, dx - 40, dy - 14, dw + 52, dh + 44, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var o = api.D.plot(ctx, { x: dx, y: dy, w: dw, h: dh }, { xmin: -1.2, xmax: 1.8, ymin: 0, ymax: 1.6, xlabel: 'x, жар.-мкс (K)', ylabel: 'ct', series: [
        { pts: [[0, 0], [-1.2, 1.2]], color: 'rgba(224,160,0,.8)', dash: [4, 3] }, { pts: [[0, 0], [1.6, 1.6]], color: 'rgba(224,160,0,.8)', dash: [4, 3] },
        { pts: [[-0.5 / g, 0], [-0.5 / g + b * 1.6, 1.6]], color: '#1f5fd1', width: 2 }, { pts: [[0.5 / g, 0], [0.5 / g + b * 1.6, 1.6]], color: '#1f5fd1', width: 2 },
        { pts: [[-1.2, -1.2 * b], [1.8, 1.8 * b]].map(function (p) { return [p[0], p[1] + (0.5 / g) / (1 + b) - b * (-(0.5 / g) / (1 + b))]; }), color: 'rgba(122,63,176,.6)', dash: [6, 4] },
      ] });
      var tb = (0.5 / g) / (1 + b), tf = (0.5 / g) / (1 - b);
      api.D.circle(ctx, o.X(-tb), o.Y(tb), 5, '#d2382b', null, 0, true); api.D.circle(ctx, o.X(tf), o.Y(tf), 5, '#0b8a7a', null, 0, true);
      R.txt(ctx, 'сары — жарық, көк — вагон ұштарының дүниелік сызықтары, күлгін — K′ үшін бір мезеттілік сызығы', dx + dw / 2, dy + dh + 28, { size: W < 600 ? 8.5 : 10, color: '#5b6670' });
    },
  });
})();

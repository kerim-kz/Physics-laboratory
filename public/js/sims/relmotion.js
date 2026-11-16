/* Қозғалыстың салыстырмалылығы: тас жолдағы екі көлік. Бақылаушы — жол бойында немесе бірінші көлікте. */
(function () {
  var R = window.Real;
  var PXM = 2.2; // 1 м = 2,2 px
  Sim.create({
    aspect: 0.5, grid: false,
    hint: 'Бақылаушыны ауыстыр: бірінші көліктен қарағанда екінші көліктің жылдамдығы қандай?',
    controls: [
      { type: 'select', key: 'dir', label: 'Қозғалыс бағыты', value: 'same', options: [['same', 'Бір бағытта (қуып жету)'], ['opp', 'Қарама-қарсы (кездесу)']] },
      { type: 'range', key: 'v1', label: 'Көк көліктің жылдамдығы v₁', min: 30, max: 120, step: 5, value: 60, unit: 'км/сағ', digits: 0 },
      { type: 'range', key: 'v2', label: 'Қызыл көліктің жылдамдығы v₂', min: 30, max: 120, step: 5, value: 90, unit: 'км/сағ', digits: 0 },
      { type: 'range', key: 'd0', label: 'Бастапқы арақашықтық', min: 100, max: 400, step: 10, value: 250, unit: 'м', digits: 0 },
      { type: 'select', key: 'obs', label: 'Бақылаушы', value: 'ground', options: [['ground', 'Жол бойында'], ['car1', 'Көк көлікте']], live: true },
    ],
    readouts: [
      { key: 'vrel', label: 'Қызыл көліктің көк көлікке қатысты жылдамдығы', unit: 'км/сағ', digits: 0 },
      { key: 'vrelms', label: 'Сол, м/с', unit: 'м/с', digits: 1 },
      { key: 'gap', label: 'Арақашықтық', unit: 'м', digits: 0 },
      { key: 't', label: 'Уақыт', unit: 'с', digits: 1 },
      { key: 'tm', label: 'Кездесу (қуып жету) уақыты d₀ / v_сал', unit: 'с', digits: 1 },
    ],
    init: function (api) {
      var S = api.S, P = api.P; S.t = 0; S.x1 = 0; S.x2 = P.dir === 'same' ? -P.d0 : P.d0; S.met = false; S.prevGap = undefined;
      // Жол бойындағы бақылаушының камерасы бүкіл қозғалыс бойы қозғалмайды: шекараларын алдын ала есептейміз.
      var v1 = P.v1 / 3.6, v2 = (P.dir === 'same' ? 1 : -1) * P.v2 / 3.6, close = P.dir === 'same' ? v2 - v1 : v1 - v2;
      var tEnd = close > 0 ? P.d0 / close + 4 : 30;
      var xs = [0, S.x2, v1 * tEnd, S.x2 + v2 * tEnd];
      S.lo = Math.min.apply(null, xs) - 60; S.hi = Math.max.apply(null, xs) + 60;
    },
    step: function (api, dt) {
      var P = api.P, S = api.S, v1 = P.v1 / 3.6, v2 = (P.dir === 'same' ? 1 : -1) * P.v2 / 3.6;
      S.t += dt; S.x1 += v1 * dt; S.x2 += v2 * dt;
      var gap = S.x2 - S.x1;
      if (S.prevGap !== undefined && S.prevGap * gap <= 0 && !S.met) { S.met = true; S.tmet = S.t; }
      S.prevGap = gap;
      if ((S.met && S.t - S.tmet > 4) || S.t > 30 && !S.met) return false;
    },
    read: function (api) {
      var P = api.P, S = api.S;
      var vrel = P.dir === 'same' ? Math.abs(P.v2 - P.v1) : P.v1 + P.v2;
      var closing = P.dir === 'same' ? (P.v2 - P.v1) / 3.6 : (P.v1 + P.v2) / 3.6;
      return { vrel: vrel, vrelms: vrel / 3.6, gap: Math.abs(S.x2 - S.x1), t: S.t, tm: closing > 0 ? P.d0 / closing : '— (жетпейді)' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, ground = H * 0.55;
      // Жол бойындағы бақылаушы: жол қозғалмайды, екі көлік де көрінетіндей масштаб таңдалады.
      // Көліктегі бақылаушы: камера көк көлікпен бірге жүреді.
      var lo = S.lo, hi = S.hi;
      var scale = P.obs === 'ground' ? Math.min(1, (W - 60) / ((hi - lo) * PXM)) : 1;
      var cam = P.obs === 'car1' ? S.x1 : (lo + hi) / 2;
      var X = function (x) { return W * (P.obs === 'car1' ? 0.4 : 0.5) + (x - cam) * PXM * scale; };
      R.scene(ctx, W, H, 'outdoor', { ground: ground, road: false, clouds: true });
      // жол (екі жолақты)
      var ry = ground + 10, rh = H - ry - 18;
      ctx.fillStyle = '#4a4e54'; ctx.fillRect(0, ry, W, rh);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, ry + 3, W, 2); ctx.fillRect(0, ry + rh - 5, W, 2);
      var shift = -cam * PXM * scale;
      ctx.fillStyle = '#e9e6dc';
      for (var dx = ((shift % 60) + 60) % 60 - 60; dx < W; dx += 60) ctx.fillRect(dx, ry + rh / 2 - 1.5, 32, 3);
      // километр бағандары (әр 50 м)
      for (var m = -2000; m <= 4000; m += 50) {
        var px = X(m);
        if (px < -20 || px > W + 20) continue;
        ctx.fillStyle = '#f5f5f0'; ctx.fillRect(px - 3, ry - 26, 6, 22); ctx.fillStyle = '#d23a2a'; ctx.fillRect(px - 3, ry - 26, 6, 5);
        if (m % 100 === 0) R.txt(ctx, m + ' м', px, ry - 34, { size: 9, color: '#24323b' });
      }
      var y1 = ry + rh * 0.78, y2 = ry + rh * (P.dir === 'same' ? 0.78 : 0.36);
      if (P.dir === 'same') y2 = ry + rh * 0.36;
      R.car(ctx, X(S.x1), y1, P.obs === 'car1' ? 120 : 90, '#2f6fd1', S.x1 * PXM);
      R.car(ctx, X(S.x2), y2, P.obs === 'car1' ? 120 : 90, '#d23a2a', S.x2 * PXM, { flip: P.dir === 'opp' });
      var vrel = P.dir === 'same' ? P.v2 - P.v1 : -(P.v1 + P.v2);
      R.tag(ctx, P.obs === 'car1' ? 'Көк көліктен қарағанда: қызыл көлік ' + Math.abs(vrel) + ' км/сағ жылдамдықпен ' + (vrel > 0 ? 'жақындап озып барады' : vrel < 0 ? 'қарсы келеді' : 'орнында тұрғандай') : 'Жол бойындағы бақылаушы: екі көлік те қозғалады',
        W / 2, 20, { size: 12 });
    },
  });
})();

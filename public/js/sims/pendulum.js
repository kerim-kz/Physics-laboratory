/* Математикалық маятник: θ'' = −(g/l)·sin θ (шағын бұрыш жуықтауынсыз, RK4). */
(function () {
  var R = window.Real;
  var PLANETS = { earth: 9.8, moon: 1.62, mars: 3.71, jupiter: 24.8, x: 6.3 };

  function acc(th, P) { return -(PLANETS[P.planet] / P.l) * Math.sin(th); }
  function rk4(S, P, h) {
    var k1t = S.w, k1w = acc(S.th, P);
    var k2t = S.w + k1w * h / 2, k2w = acc(S.th + k1t * h / 2, P);
    var k3t = S.w + k2w * h / 2, k3w = acc(S.th + k2t * h / 2, P);
    var k4t = S.w + k3w * h, k4w = acc(S.th + k3t * h, P);
    S.th += h * (k1t + 2 * k2t + 2 * k3t + k4t) / 6;
    S.w += h * (k1w + 2 * k2w + 2 * k3w + k4w) / 6;
  }

  Sim.create({
    grid: false,
    tools: ['ruler', 'angle', 'stopwatch'],
    scale: function (api) { return api._sc || null; },
    aspect: 0.62,
    hint: 'Секундомер: тербеліс саны N мен уақыт t бойынша T = t/N.',
    controls: [
      { type: 'range', key: 'l', label: 'Жіп ұзындығы l', min: 0.1, max: 2.5, step: 0.05, value: 1, unit: 'м', digits: 2 },
      { type: 'range', key: 'amp', label: 'Бастапқы ауытқу θ₀', min: 2, max: 80, step: 1, value: 10, unit: '°', digits: 0 },
      { type: 'select', key: 'planet', label: 'Планета', value: 'earth', options: [['earth', 'Жер (g = 9,8 м/с²)'], ['moon', 'Ай (g = 1,62 м/с²)'], ['mars', 'Марс (g = 3,71 м/с²)'], ['jupiter', 'Юпитер (g = 24,8 м/с²)'], ['x', 'Х планета (g белгісіз)']] },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'n', label: 'Толық тербеліс саны N', digits: 0 },
      { key: 'tm', label: 'Өлшенген период T', unit: 'с', digits: 3 },
      { key: 'tf', label: 'T = 2π√(l/g)', unit: 'с', digits: 3 },
      { key: 'diff', label: 'Айырмашылық', unit: '%', digits: 1 },
      { key: 'g', label: 'Еркін түсу үдеуі g', unit: 'м/с²' },
    ],
    init: function (api) {
      var S = api.S, P = api.P;
      S.th = P.amp * Math.PI / 180; S.w = 0; S.t = 0; S.n = 0; S.lastCross = null; S.T = null; S.trail = [];
    },
    substeps: 20,
    step: function (api, dt) {
      var S = api.S, P = api.P;
      var prev = S.th;
      rk4(S, P, dt);
      S.t += dt;
      // Тепе-теңдік қалпынан бір бағытта өтуді ұстаймыз (оңнан солға).
      if (prev > 0 && S.th <= 0) {
        var tc = S.t - dt * (S.th / (S.th - prev));
        if (S.lastCross !== null) { S.T = tc - S.lastCross; S.n++; }
        S.lastCross = tc;
      }
    },
    read: function (api) {
      var S = api.S, P = api.P, g = PLANETS[P.planet];
      var tf = 2 * Math.PI * Math.sqrt(P.l / g);
      return {
        t: S.t, n: S.n, tm: S.T, tf: P.planet === 'x' ? null : tf,
        diff: S.T && P.planet !== 'x' ? (S.T - tf) / tf * 100 : null,
        g: P.planet === 'x' ? '? (өзің тап)' : g,
      };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var g = PLANETS[P.planet];
      var px0 = W * 0.38, py0 = 30, k = (H - 80) / 2.6;
      api._sc = { px: k, unit: 'м' };
      var bx = px0 + Math.sin(S.th) * P.l * k, by = py0 + Math.cos(S.th) * P.l * k;
      // тірек
      R.scene(ctx, W, H, 'lab', { table: H - 18 });
      R.block(ctx, px0 - 60, py0 - 12, 120, 10, 'iron', { depth: 6, shadow: false });
      // тік сызық және амплитуда
      D.line(ctx, px0, py0, px0, py0 + P.l * k + 20, C.soft, 1, [4, 4]);
      var a0 = P.amp * Math.PI / 180;
      ctx.save(); ctx.strokeStyle = C.soft; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(px0, py0, P.l * k, Math.PI / 2 - a0, Math.PI / 2 + a0); ctx.stroke(); ctx.restore();
      // транспортир (тіректің астында)
      var pr = Math.min(70, P.l * k * 0.45);
      ctx.save(); ctx.fillStyle = 'rgba(240,244,248,.55)'; ctx.strokeStyle = 'rgba(60,80,100,.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px0 - pr, py0); ctx.arc(px0, py0, pr, Math.PI, 0, true); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (var dg = -90; dg <= 90; dg += 5) { var ar = (90 - dg) * Math.PI / 180, l1 = dg % 10 === 0 ? 9 : 5; ctx.beginPath(); ctx.moveTo(px0 + Math.cos(ar) * pr, py0 + Math.sin(ar) * pr); ctx.lineTo(px0 + Math.cos(ar) * (pr - l1), py0 + Math.sin(ar) * (pr - l1)); ctx.stroke(); if (dg % 30 === 0 && dg) R.txt(ctx, Math.abs(dg) + '°', px0 + Math.cos(ar) * (pr - 18), py0 + Math.sin(ar) * (pr - 18), { size: 8, color: '#38424b' }); }
      ctx.restore();
      // жіп пен жүк (жез шар)
      D.line(ctx, px0, py0, bx, by, '#444', 1.3);
      R.sphere(ctx, bx, by, 13, '#c9a24a', { shadowY: H - 16 });
      R.tag(ctx, api.fmt(S.th * 180 / Math.PI, 1) + '°', px0 + (bx > px0 ? -34 : 34), py0 + pr + 12, { size: 10 });
      R.tag(ctx, 'l = ' + api.fmt(P.l, 2) + ' м', px0 + 40, py0 + P.l * k * 0.72, { size: 10.5 });
      // энергия бағандары
      var m = 1;
      var E = m * g * P.l * (1 - Math.cos(a0));
      var Ep = m * g * P.l * (1 - Math.cos(S.th));
      var Ek = Math.max(0, E - Ep);
      var bx0 = W - 150, bh = H - 110, base = H - 40;
      D.text(ctx, 'Энергия', bx0, 40, { size: 12, weight: '600' });
      [['Eк', Ek, C.orange], ['Eп', Ep, C.purple], ['E', E, C.accent]].forEach(function (r, i) {
        var h = E > 0 ? r[1] / E * bh : 0, x = bx0 + i * 44;
        ctx.fillStyle = C.bg2; ctx.fillRect(x, base - bh, 30, bh);
        ctx.fillStyle = r[2]; ctx.fillRect(x, base - h, 30, h);
        D.text(ctx, r[0], x + 15, base + 16, { size: 11, align: 'center', color: C.muted });
      });
      // секундомер
      R.lcd(ctx, 16, H - 52, 150, 28, api.fmt(S.t, 2) + ' с  N=' + S.n, { size: 13 });
      if (P.amp > 15) D.text(ctx, 'Үлкен амплитуда: T формуладағыдан ұзағырақ', 20, 24, { size: 12, color: C.brass, weight: '600' });
    },
  });
})();

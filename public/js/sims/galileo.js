/* Галилейдің салыстырмалылық принципі: бірқалыпты қозғалған арбадан доп тік жоғары лақтырылады.
   Арбадағы бақылаушы — түзу сызық, жердегі бақылаушы — парабола. Жылдамдық — салыстырмалы, үдеу мен уақыт — инвариантты. */
(function () {
  var R = window.Real, g = 9.81;
  Sim.create({
    aspect: 0.58, grid: false,
    hint: 'Санақ жүйесін ауыстырып көр. Доптың траекториясы мен жылдамдығы өзгереді, ал ұшу уақыты мен үдеуі ше?',
    controls: [
      { type: 'range', key: 'u', label: 'Арбаның жылдамдығы u', min: 0, max: 6, step: 0.5, value: 3, unit: 'м/с' },
      { type: 'range', key: 'v0', label: 'Допты жоғары лақтыру жылдамдығы (арбаға қатысты)', min: 2, max: 8, step: 0.5, value: 6, unit: 'м/с' },
      { type: 'select', key: 'frame', label: 'Санақ жүйесі', value: 'ground', options: [['ground', 'Жермен байланысты'], ['cart', 'Арбамен байланысты']], live: true },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t (екі жүйеде бірдей)', unit: 'с', digits: 2 },
      { key: 'vg', label: 'Доптың жылдамдығы Жерге қатысты', unit: 'м/с', digits: 2 },
      { key: 'vc', label: 'Доптың жылдамдығы арбаға қатысты', unit: 'м/с', digits: 2 },
      { key: 'a', label: 'Үдеуі (екі жүйеде бірдей)', unit: 'м/с²', digits: 2 },
      { key: 'h', label: 'Биіктігі (екі жүйеде бірдей)', unit: 'м', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { var S = api.S, T = 2 * api.P.v0 / g; S.t = Math.min(T, S.t + dt * 0.7); if (S.t >= T) return false; },
    read: function (api) {
      var P = api.P, t = api.S.t, vy = P.v0 - g * t;
      return { t: t, vg: Math.hypot(P.u, vy), vc: Math.abs(vy), a: g, h: P.v0 * t - g * t * t / 2 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, ground = H * 0.82, T = 2 * P.v0 / g, hmax = P.v0 * P.v0 / (2 * g);
      var k = Math.min((ground - 90) / Math.max(hmax, 1.5), (W * 0.7) / Math.max(P.u * T + 2, 4)); // px/м
      var cartGround = P.frame === 'cart';
      var x0 = W * 0.15, camX = cartGround ? P.u * S.t * k : 0; // арба жүйесінде камера арбамен бірге
      R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true });
      // жердегі бағаналар (жүйе ауысқанда «жылжиды»)
      for (var m = -4; m < 40; m += 1) { var px = x0 + m * k - camX; if (px < -10 || px > W + 10) continue; ctx.fillStyle = m % 5 === 0 ? '#f2efe6' : 'rgba(242,239,230,.55)'; ctx.fillRect(px - 1, ground, 2, m % 5 === 0 ? 12 : 6); if (m % 5 === 0) R.txt(ctx, m + ' м', px, ground + 22, { size: 9.5, color: '#163018' }); }
      var cx = x0 + P.u * S.t * k - camX, cw = 1.4 * k, chh = 0.5 * k;
      // арба
      R.block(ctx, cx - cw / 2, ground - chh - 0.25 * k, cw, chh, 'plasticBlue', { depth: 6 });
      R.wheel(ctx, cx - cw * 0.3, ground - 0.13 * k, 0.13 * k, P.u * S.t / 0.13); R.wheel(ctx, cx + cw * 0.3, ground - 0.13 * k, 0.13 * k, P.u * S.t / 0.13);
      var top = ground - chh - 0.25 * k;
      // доп траекториясы
      ctx.save(); ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
      for (var i = 0; i <= 60; i++) {
        var tt = S.t * i / 60, bx = cartGround ? x0 + P.u * S.t * k - camX : x0 + P.u * tt * k, by = top - (P.v0 * tt - g * tt * tt / 2) * k;
        if (cartGround) bx = cx;
        if (i) ctx.lineTo(bx, by); else ctx.moveTo(bx, by);
      }
      ctx.stroke(); ctx.restore();
      var ballY = top - (P.v0 * S.t - g * S.t * S.t / 2) * k;
      R.sphere(ctx, cx, ballY - 8, 8, '#e0761b', { shadowY: ground });
      // жылдамдық векторы
      var vy = P.v0 - g * S.t, vs = Math.min(10, 40 / Math.max(1, P.v0)) * 1.6, vx = cartGround ? 0 : P.u;
      if (Math.hypot(vx, vy) > 0.1) R.force(ctx, cx, ballY - 8, cx + vx * vs, ballY - 8 - vy * vs, '#1f5fd1', 'v');
      R.force(ctx, cx + 26, ballY - 8, cx + 26, ballY - 8 + 30, '#0b8a7a', 'g');
      R.tag(ctx, cartGround ? 'Арбадағы бақылаушы: доп тік ұшып, қайта арбаға түседі' : 'Жердегі бақылаушы: доп парабола сызады, бірақ бәрібір арбаға түседі', W / 2, 22, { size: W < 600 ? 9.5 : 12, color: '#0b6b78' });
      R.tag(ctx, 'Инвариант: t, a = g, биіктік · Салыстырмалы: жылдамдық, траектория', W / 2, 50, { size: W < 600 ? 9 : 11, color: '#5a2d86' });
    },
  });
})();

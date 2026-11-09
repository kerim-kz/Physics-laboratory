/* Механикалық толқын: y(x, t) = A·sin 2πν(t − x/v), толқын көзі x = 0 нүктесінде t = 0 сәтте іске қосылады. */
(function () {
  var L = 4, N = 121, MARK = 30;

  Sim.create({
    tools: ['stopwatch'],
    aspect: 0.5,
    autoplay: true,
    controls: [
      { type: 'range', key: 'A', label: 'Амплитуда A', min: 0.2, max: 1.5, step: 0.1, value: 0.8, unit: 'см', digits: 1, live: true },
      { type: 'range', key: 'nu', label: 'Жиілік ν', min: 0.25, max: 2, step: 0.05, value: 1, unit: 'Гц', digits: 2 },
      { type: 'range', key: 'v', label: 'Таралу жылдамдығы v', min: 1, max: 4, step: 0.1, value: 2, unit: 'м/с', digits: 1 },
      { type: 'select', key: 'type', label: 'Толқын түрі', value: 'tr', live: true, options: [['tr', 'Көлденең толқын'], ['lo', 'Бойлық толқын']] },
    ],
    readouts: [
      { key: 'lam', label: 'Толқын ұзындығы λ = v/ν', unit: 'м' },
      { key: 'T', label: 'Период T = 1/ν', unit: 'с' },
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'front', label: 'Толқын алды x = v·t', unit: 'м' },
    ],
    init: function (api) { api.S.t = 0; },
    keepRunning: true,
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) {
      var P = api.P, S = api.S;
      return { lam: P.v / P.nu, T: 1 / P.nu, t: S.t, front: Math.min(L, P.v * S.t) };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, C = api.C, D = api.D;
      var left = 30, right = W - 30, mid = H * 0.5, kx = (right - left) / L, ky = Math.min(36, H * 0.18);
      var lam = P.v / P.nu;
      var disp = function (x) { var ph = S.t - x / P.v; return ph > 0 ? Math.sin(2 * Math.PI * P.nu * ph) : 0; };
      D.line(ctx, left, mid, right, mid, C.soft, 1, [4, 4]);
      if (P.type === 'tr') {
        ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.2; ctx.beginPath();
        for (var i = 0; i < N; i++) { var x = i / (N - 1) * L, px = left + x * kx, py = mid - disp(x) * P.A * ky; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.stroke(); ctx.restore();
        for (var j = 0; j < N; j += 2) {
          var xx = j / (N - 1) * L;
          D.circle(ctx, left + xx * kx, mid - disp(xx) * P.A * ky, j === MARK ? 7 : 4, j === MARK ? C.red : C.blue);
        }
      } else {
        // бойлық: бөлшектер толқынның таралу бағытымен ығысады
        var amp = Math.min(0.12, lam / 6) * P.A / 1.5;
        for (var q = 0; q < N; q++) {
          var x0 = q / (N - 1) * L, x1 = x0 + disp(x0) * amp, px1 = left + x1 * kx;
          D.line(ctx, px1, mid - 40, px1, mid + 40, q === MARK ? C.red : C.blue, q === MARK ? 3 : 1.3);
        }
      }
      // толқын көзі және λ белгісі
      D.circle(ctx, left, mid, 6, C.ink);
      D.text(ctx, 'толқын көзі', left, mid + 62, { size: 11, color: C.muted });
      var firstCrest = (S.t - 0.25 / P.nu) * P.v; // фазасы π/2 болатын ең алыс нүкте
      var xc = firstCrest - Math.ceil(Math.max(0, firstCrest - L) / lam) * lam;
      if (xc > 0 && xc - lam >= 0 && P.type === 'tr') {
        var a = left + (xc - lam) * kx, b = left + xc * kx, yb = mid - P.A * ky - 18;
        D.line(ctx, a, yb, b, yb, C.orange, 1.5);
        D.line(ctx, a, yb - 5, a, yb + 5, C.orange, 1.5); D.line(ctx, b, yb - 5, b, yb + 5, C.orange, 1.5);
        D.text(ctx, 'λ = ' + api.fmt(lam, 2) + ' м', (a + b) / 2, yb - 8, { size: 12, align: 'center', color: C.orange, weight: '600' });
      }
      for (var m = 0; m <= L; m++) { D.line(ctx, left + m * kx, H - 28, left + m * kx, H - 22, C.muted, 1); D.text(ctx, m + ' м', left + m * kx, H - 10, { size: 10, align: 'center', color: C.muted, mono: true }); }
    },
  });
})();

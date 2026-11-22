/* Айнымалы ток тізбегіндегі активті және реактивті кедергілер: резистор, катушка, конденсатор. Ток пен кернеудің фазалары және кедергінің жиілікке тәуелділігі. */
(function () {
  var R = window.Real, Um = 10;
  var EL = { R: 'Резистор (R)', L: 'Катушка (L)', C: 'Конденсатор (C)' };
  function X(P, f) { return P.el === 'R' ? P.R : P.el === 'L' ? 2 * Math.PI * f * P.L : 1 / (2 * Math.PI * f * P.C * 1e-6); }
  function phi(P) { return P.el === 'R' ? 0 : P.el === 'L' ? Math.PI / 2 : -Math.PI / 2; } // кернеу токтан озады
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.45, grid: false, keepRunning: true, autoplay: true,
    hint: 'Элементті таңдап, жиілікті өзгерт. Катушкада кернеу токтан π/2-ге озады, конденсаторда π/2-ге қалады. Кедергі жиілікке қалай тәуелді?',
    controls: [
      { type: 'select', key: 'el', label: 'Тізбектегі элемент', value: 'L', options: Object.keys(EL).map(function (k) { return [k, EL[k]]; }), live: true },
      { type: 'range', key: 'f', label: 'Жиілік ν', min: 10, max: 500, step: 10, value: 50, unit: 'Гц', digits: 0, live: true },
      { type: 'range', key: 'R', label: 'R', min: 10, max: 200, step: 10, value: 50, unit: 'Ом', digits: 0, live: true },
      { type: 'range', key: 'L', label: 'L', min: 0.05, max: 1, step: 0.05, value: 0.2, unit: 'Гн', digits: 2, live: true },
      { type: 'range', key: 'C', label: 'C', min: 5, max: 200, step: 5, value: 50, unit: 'мкФ', digits: 0, live: true },
    ],
    readouts: [
      { key: 'X', label: 'Кедергі (R, X<sub>L</sub> = ωL немесе X<sub>C</sub> = 1/ωC)', unit: 'Ом', digits: 1 },
      { key: 'I', label: 'Ток амплитудасы I<sub>m</sub> = U<sub>m</sub>/X', unit: 'А', digits: 3 },
      { key: 'ph', label: 'Кернеудің токтан озуы φ', text: true },
      { key: 'Pa', label: 'Орташа қуат', unit: 'Вт', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var P = api.P, x = X(P, P.f), Im = Um / x; return { X: x, I: Im, ph: P.el === 'R' ? '0 (фазалары бірдей)' : P.el === 'L' ? '+π/2 (кернеу озады)' : '−π/2 (кернеу қалады)', Pa: P.el === 'R' ? Um * Im / 2 : 0 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, x = X(P, P.f), Im = Um / x, f = phi(P), wide = W > 640, dark = R.isDark(), ws = 2 * Math.PI * 0.4; // экрандағы баяулатылған жиілік
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      // элементтің суреті
      var ex = wide ? W * 0.13 : W * 0.5, ey = wide ? H * 0.22 : H * 0.1;
      ctx.save(); R.rr(ctx, ex - 90, ey - 50, 180, 110, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
      R.wire(ctx, [[ex - 80, ey + 10], [ex - 44, ey + 10]], { color: '#c0392b' }); R.wire(ctx, [[ex + 44, ey + 10], [ex + 80, ey + 10]], { color: '#c0392b' });
      if (P.el === 'R') R.resistor(ctx, ex, ey + 10, 88, {});
      else if (P.el === 'L') { ctx.strokeStyle = '#b87333'; ctx.lineWidth = 3; for (var k = 0; k < 9; k++) { ctx.beginPath(); ctx.ellipse(ex - 36 + k * 9, ey + 10, 5, 14, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); } }
      else { R.block(ctx, ex - 8, ey - 14, 5, 48, 'copper', { depth: 1, shadow: false }); R.block(ctx, ex + 3, ey - 14, 5, 48, 'copper', { depth: 1, shadow: false }); R.wire(ctx, [[ex - 44, ey + 10], [ex - 8, ey + 10]], { color: '#c0392b' }); R.wire(ctx, [[ex + 8, ey + 10], [ex + 44, ey + 10]], { color: '#c0392b' }); }
      R.txt(ctx, EL[P.el], ex, ey - 36, { size: 11.5, weight: '700' });
      // фазорлар
      var pcx = ex, pcy = wide ? H * 0.62 : H * 0.32, pr = wide ? Math.min(W * 0.1, H * 0.2) : Math.min(W * 0.2, H * 0.1), th = ws * S.t;
      ctx.save(); R.rr(ctx, pcx - pr - 30, pcy - pr - 20, 2 * pr + 60, 2 * pr + 44, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
      api.D.arrow(ctx, pcx, pcy, pcx + Math.cos(th) * pr * 0.7, pcy - Math.sin(th) * pr * 0.7, '#1f5fd1', 2.5, 'I');
      api.D.arrow(ctx, pcx, pcy, pcx + Math.cos(th + f) * pr, pcy - Math.sin(th + f) * pr, '#d2382b', 2.5, 'U');
      R.txt(ctx, 'Векторлық диаграмма', pcx, pcy + pr + 14, { size: 10, color: '#5b6670' });
      // u(t), i(t)
      var gx = wide ? W * 0.33 : 46, gy = wide ? 24 : pcy + pr + 40, gw = wide ? W * 0.63 : W - 62, gh = wide ? H * 0.38 : H * 0.22;
      ctx.save(); R.rr(ctx, gx - 40, gy - 14, gw + 52, gh * 2 + 90, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var t0 = Math.max(0, S.t - 4), pu = [], pi = [];
      for (var t = t0; t <= t0 + 5; t += 0.02) { pu.push([t, Math.sin(ws * t + f)]); pi.push([t, 0.7 * Math.sin(ws * t)]); }
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: t0, xmax: t0 + 5, ymin: -1.2, ymax: 1.2, xlabel: 't (баяулатылған)', ylabel: 'u, i', series: [{ pts: pu, color: '#d2382b', width: 2.4 }, { pts: pi, color: '#1f5fd1', width: 2.4 }] });
      R.txt(ctx, 'қызыл — u(t), көк — i(t)', gx + gw / 2, gy + 8, { size: 10, color: '#5b6670' });
      // X(ν) графигі
      var g2y = gy + gh + 50, pts = [], xmax = 0; for (var fr = 10; fr <= 500; fr += 5) { var xv = X(P, fr); pts.push([fr, xv]); xmax = Math.max(xmax, Math.min(xv, 2000)); }
      api.D.plot(ctx, { x: gx, y: g2y, w: gw, h: gh }, { xmin: 0, xmax: 500, ymin: 0, ymax: Math.max(50, Math.min(xmax * 1.1, 1500)), xlabel: 'ν, Гц', ylabel: 'X, Ом', series: [{ pts: pts, color: '#0b8a7a', width: 2.5 }], marker: [P.f, Math.min(x, 1500)] });
      R.txt(ctx, P.el === 'R' ? 'R жиілікке тәуелсіз' : P.el === 'L' ? 'X_L = 2πνL — жиілікпен түзу өседі' : 'X_C = 1/(2πνC) — жиілік артқанда кемиді', gx + gw / 2, g2y + 8, { size: 10, color: '#0b6b78' });
      void Im;
    },
  });
})();

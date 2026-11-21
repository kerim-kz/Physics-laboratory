/* Тепе-теңдік түрлері: ойыс бетте (орнықты), дөңес бетте (орнықсыз), жазық бетте (талғаусыз) тұрған шар. Шарды итеріп, потенциалдық энергияның графигімен салыстыр. */
(function () {
  var R = window.Real, g = 9.81, K = 0.6; // бет пішіні y = ±K x², м
  function y(P, x) { return P.type === 'stable' ? K * x * x : P.type === 'unstable' ? -K * x * x : 0; }
  function dy(P, x) { return P.type === 'stable' ? 2 * K * x : P.type === 'unstable' ? -2 * K * x : 0; }
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true,
    hint: '«Итеру» батырмасын бас. Шар тепе-теңдік күйіне қайта орала ма? Потенциалдық энергия графигімен байланыстыр.',
    controls: [
      { type: 'select', key: 'type', label: 'Беттің пішіні', value: 'stable', options: [['stable', 'Ойыс (орнықты тепе-теңдік)'], ['unstable', 'Дөңес (орнықсыз тепе-теңдік)'], ['neutral', 'Жазық (талғаусыз тепе-теңдік)']] },
    ],
    buttons: [{ label: 'Итеру', onClick: function (api) { api.S.v += 0.35; api.play(); } }],
    readouts: [
      { key: 'x', label: 'Ығысу x', unit: 'см', digits: 1 },
      { key: 'Ep', label: 'Eₚ = mgy (m = 1 кг)', unit: 'Дж', digits: 3 },
      { key: 'kind', label: 'Тепе-теңдік', text: true },
    ],
    init: function (api) { api.S.x = 0; api.S.v = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, n = 10;
      for (var i = 0; i < n; i++) { var h = dt / n, s = dy(P, S.x), a = -g * s / (1 + s * s) - 0.15 * S.v; S.v += a * h; S.x += S.v * h; }
      if (Math.abs(S.x) > 1.1) { S.x = Math.sign(S.x) * 1.1; S.v = 0; return false; }
    },
    read: function (api) { var P = api.P, S = api.S; return { x: S.x * 100, Ep: g * y(P, S.x), kind: P.type === 'stable' ? 'орнықты: Eₚ — минимум' : P.type === 'unstable' ? 'орнықсыз: Eₚ — максимум' : 'талғаусыз: Eₚ = const' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 0.98 });
      var cx = wide ? W * 0.3 : W * 0.5, base = H * (wide ? 0.62 : 0.5), k = Math.min(wide ? W * 0.22 : W * 0.4, H * 0.3) / 1.1;
      var X = function (x) { return cx + x * k; }, Y = function (x) { return base - y(P, x) * k; };
      // бет (ағаш науа)
      ctx.save(); ctx.beginPath(); ctx.moveTo(X(-1.15), Y(-1.15)); for (var i = -115; i <= 115; i += 3) ctx.lineTo(X(i / 100), Y(i / 100)); ctx.lineTo(X(1.15), base + k * 0.95); ctx.lineTo(X(-1.15), base + k * 0.95); ctx.closePath();
      ctx.clip(); R.paintFace(ctx, X(-1.2), base - k * 1, k * 2.4, k * 2, 'oak', 0); ctx.restore();
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); for (var j = -115; j <= 115; j += 3) { var px = X(j / 100), py = Y(j / 100); if (j === -115) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke();
      // шар (бетке нормаль бойымен ығысқан)
      var s = dy(P, S.x), nlen = Math.sqrt(1 + s * s), r = 16, bx = X(S.x) - (-s) * r / nlen * -1 * 0, by = Y(S.x);
      var nx = -s / nlen, ny = 1 / nlen; // беттің жоғарғы нормалі (физикалық)
      R.sphere(ctx, X(S.x) + nx * r, by - ny * r, r, '#d2382b');
      void bx;
      // Eₚ(x) графигі
      var gx = wide ? W * 0.6 : 40, gy = wide ? 40 : H * 0.72, gw = wide ? W * 0.36 : W - 60, gh = wide ? H * 0.5 : H * 0.22;
      ctx.save(); R.rr(ctx, gx - 30, gy - 16, gw + 40, gh + 40, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
      var pts = []; for (var q = -110; q <= 110; q += 4) pts.push([q / 100, g * y(P, q / 100)]);
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: -1.1, xmax: 1.1, ymin: -8, ymax: 8, xlabel: 'x, м', ylabel: 'Eₚ, Дж', series: [{ pts: pts, color: '#7a3fb0' }], marker: [S.x, g * y(P, S.x)] });
    },
  });
})();

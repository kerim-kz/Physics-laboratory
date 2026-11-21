/* Обербек маятнигі: айналмалы қозғалыс динамикасының негізгі теңдеуі M = Iε. Шкивке оралған жіпке ілінген жүк түседі; айқастағы жүктердің орны инерция моментін өзгертеді. */
(function () {
  var R = window.Real, g = 9.81, r = 0.02, m0 = 0.1, I0 = 0.002, Hh = 0.8; // шкив радиусы, айқас жүгі, айқас пен шкив, түсу биіктігі
  function I(P) { return I0 + 4 * m0 * Math.pow(P.Rw / 100, 2); }
  function acc(P) { var m = P.m / 1000; return m * g * r * r / (I(P) + m * r * r); }
  Sim.create({
    aspect: 0.66, grid: false,
    hint: 'Айқастағы жүктерді осьтен алыстатсаң, жүктің түсу уақыты қалай өзгереді? Өлшеу нәтижесі бойынша инерция моментін есепте.',
    controls: [
      { type: 'range', key: 'Rw', label: 'Айқастағы жүктердің осьтен қашықтығы', min: 5, max: 25, step: 1, value: 15, unit: 'см', digits: 0 },
      { type: 'range', key: 'm', label: 'Түсетін жүктің массасы m', min: 50, max: 300, step: 25, value: 150, unit: 'г', digits: 0 },
    ],
    readouts: [
      { key: 't', label: 'Түсу уақыты t (0,8 м)', unit: 'с', digits: 2 },
      { key: 'a', label: 'Жүктің үдеуі a = 2h/t²', unit: 'м/с²', digits: 3 },
      { key: 'eps', label: 'Бұрыштық үдеу ε = a/r', unit: 'рад/с²', digits: 2 },
      { key: 'M', label: 'Жіптің күш моменті M = m(g − a)r', unit: 'Н·м', digits: 4 },
      { key: 'I', label: 'Инерция моменті I = M/ε', unit: 'кг·м²', digits: 4 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { var S = api.S, a = acc(api.P), T = Math.sqrt(2 * Hh / a); S.t = Math.min(T, S.t + dt); if (S.t >= T) return false; },
    read: function (api) {
      var S = api.S, P = api.P, a = acc(P), T = Math.sqrt(2 * Hh / a), done = S.t >= T - 1e-9;
      if (!done) return { t: S.t, a: null, eps: null, M: null, I: null };
      var M = P.m / 1000 * (g - a) * r, eps = a / r;
      return { t: T, a: a, eps: eps, M: M, I: M / eps };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, a = acc(P), table = H * 0.97;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.38, cy = H * 0.3, arm = Math.min(W * 0.25, H * 0.26), phi = (a * S.t * S.t / 2) / r;
      // тірек
      R.block(ctx, cx - 30, cy + 20, 14, table - cy - 20, 'iron', { depth: 6, shadow: false }); R.block(ctx, cx - 30, cy - 6, 30, 12, 'iron', { depth: 4, shadow: false });
      // айқас (алдыңғы көрініс)
      for (var i = 0; i < 4; i++) {
        var an = phi + i * Math.PI / 2, ex = cx + Math.cos(an) * arm, ey = cy + Math.sin(an) * arm;
        ctx.strokeStyle = '#8d959c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        var wr = P.Rw / 25 * arm;
        R.sphere(ctx, cx + Math.cos(an) * wr, cy + Math.sin(an) * wr, 11, '#c9a24a');
      }
      ctx.fillStyle = '#59616a'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#b8c0c7'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 7); ctx.fill(); ctx.fillStyle = '#59616a'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
      // жіп және жүк
      var drop = (a * S.t * S.t / 2) / Hh, y0 = cy + 30, yEnd = table - 40, yw = y0 + drop * (yEnd - y0 - 30);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx + 24, cy); ctx.lineTo(cx + 24, yw); ctx.stroke();
      R.weight(ctx, cx + 24, yw, P.m, { label: P.m + ' г' });
      R.ruler(ctx, cx + 84, y0, yEnd - y0, (yEnd - y0 - 30) / 80, { vertical: true, width: 22 });
      R.lcd(ctx, W * 0.66, 30, 120, 28, S.t.toFixed(2).replace('.', ',') + ' с', { size: 14 });
      R.tag(ctx, 'I = I₀ + 4m₀R² = ' + Sim.fmt(I(P), 4) + ' кг·м² (теория)', W * 0.72, 86, { size: 11, color: '#0b6b78' });
      R.tag(ctx, 'M = Iε', W * 0.72, 116, { size: 12, color: '#b4342a' });
    },
  });
})();

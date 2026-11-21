/* Қисықсызықты қозғалыс: дөңгелек трассадағы автокөлік үдей (немесе тежеле) қозғалады. Тангенциал үдеу a_τ, нормаль үдеу a_n = v²/R, толық үдеу. Жоғарыдан көрініс. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'a_τ = 0 болғанда толық үдеу қайда бағытталған? Тангенциал үдеуді өзгертіп, толық үдеу векторының бағытын бақыла.',
    controls: [
      { type: 'range', key: 'Rr', label: 'Трассаның радиусы R', min: 20, max: 80, step: 5, value: 50, unit: 'м', digits: 0 },
      { type: 'range', key: 'v0', label: 'Бастапқы жылдамдық v₀', min: 0, max: 20, step: 1, value: 5, unit: 'м/с', digits: 0 },
      { type: 'range', key: 'at', label: 'Тангенциал үдеу a_τ', min: -3, max: 3, step: 0.5, value: 1.5, unit: 'м/с²' },
    ],
    readouts: [
      { key: 'v', label: 'Жылдамдық v', unit: 'м/с', digits: 2 },
      { key: 'an', label: 'Нормаль үдеу a_n = v²/R', unit: 'м/с²', digits: 2 },
      { key: 'a', label: 'Толық үдеу a = √(a_τ² + a_n²)', unit: 'м/с²', digits: 2 },
      { key: 'w', label: 'Бұрыштық жылдамдық ω = v/R', unit: 'рад/с', digits: 3 },
      { key: 'eps', label: 'Бұрыштық үдеу ε = a_τ/R', unit: 'рад/с²', digits: 3 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.phi = 0; S.v = api.P.v0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, n = 10;
      for (var i = 0; i < n; i++) { var h = dt / n; S.v = Math.max(0, Math.min(30, S.v + P.at * h)); S.phi += S.v / P.Rr * h; S.t += h; }
      if (S.phi > 4 * Math.PI || (S.v <= 0 && P.at <= 0) || S.v >= 30) return false;
    },
    read: function (api) { var S = api.S, P = api.P, an = S.v * S.v / P.Rr, at = (S.v <= 0 && P.at < 0) || (S.v >= 30 && P.at > 0) ? 0 : P.at; return { v: S.v, an: an, a: Math.hypot(at, an), w: S.v / P.Rr, eps: at / P.Rr }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, dark = R.isDark();
      ctx.fillStyle = dark ? '#2f5a33' : '#79ad5a'; ctx.fillRect(0, 0, W, H);
      var cx = W * (W > 640 ? 0.4 : 0.5), cy = H / 2, rpx = Math.min(H * 0.38, W * 0.34), k = rpx / P.Rr;
      // асфальт сақина
      ctx.strokeStyle = '#4a4e54'; ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(cx, cy, rpx, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.setLineDash([12, 12]); ctx.beginPath(); ctx.arc(cx, cy, rpx, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = dark ? '#24452a' : '#5c9443'; ctx.beginPath(); ctx.arc(cx, cy, rpx - 17, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
      // көлік (жоғарыдан): сағат тіліне қарсы
      var a = -S.phi, x = cx + Math.cos(a) * rpx, y = cy + Math.sin(a) * rpx;
      var tx = Math.sin(a), ty = -Math.cos(a); // жанама (қозғалыс бағыты)
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(ty, tx));
      R.rr(ctx, -16, -8, 32, 16, 4); ctx.fillStyle = '#d2382b'; ctx.fill(); ctx.fillStyle = 'rgba(170,215,240,.9)'; ctx.fillRect(2, -6, 7, 12); ctx.fillRect(-12, -6, 5, 12);
      ctx.restore();
      // векторлар
      var at = (S.v <= 0 && P.at < 0) ? 0 : P.at, an = S.v * S.v / P.Rr, sc = Math.min(22, 120 / Math.max(3, Math.hypot(at, an)));
      var nx = (cx - x) / rpx, ny = (cy - y) / rpx;
      if (S.v > 0.05) R.force(ctx, x, y, x + tx * S.v * 4, y + ty * S.v * 4, '#1f5fd1', 'v');
      if (Math.abs(at) > 0.01) R.force(ctx, x, y, x + tx * at * sc, y + ty * at * sc, '#e0761b', 'a_τ');
      if (an > 0.01) R.force(ctx, x, y, x + nx * an * sc, y + ny * an * sc, '#0b8a7a', 'a_n');
      if (an > 0.01 && Math.abs(at) > 0.01) R.force(ctx, x, y, x + (tx * at + nx * an) * sc, y + (ty * at + ny * an) * sc, '#d2382b', 'a');
      R.tag(ctx, 'R = ' + P.Rr + ' м', cx, cy + 20, { size: 10.5 });
      if (W > 640) {
        var bx = W * 0.71;
        ctx.save(); R.rr(ctx, bx - 10, 30, W * 0.27, 150, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.85)' : 'rgba(255,255,255,.9)'; ctx.fill(); ctx.restore();
        [['a_τ — жылдамдық модулін өзгертеді', '#e0761b'], ['a_n — жылдамдық бағытын өзгертеді', '#0b8a7a'], ['a = √(a_τ² + a_n²)', '#d2382b'], ['ε = a_τ / R,  ω = v / R', '#1f5fd1']].forEach(function (r, i) {
          R.txt(ctx, r[0], bx, 56 + i * 30, { size: 10.5, color: r[1], align: 'left', weight: '600' });
        });
      }
    },
  });
})();

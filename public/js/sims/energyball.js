/* Кинетикалық және потенциалдық энергия: шар жоғары лақтырылады немесе биіктіктен құлайды.
   Ek, Ep және толық энергия E бағаналарымен көрсетіледі. Ауа кедергісі қосылса, E кемиді (жылуға айналады). */
(function () {
  var R = window.Real;
  var G = 9.8;
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Шар көтерілгенде кинетикалық энергия потенциалдық энергияға айналады, құлағанда — керісінше.',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'up', options: [['up', 'Тік жоғары лақтыру'], ['drop', 'Биіктіктен құлату']] },
      { type: 'range', key: 'm', label: 'Шардың массасы m', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'кг' },
      { type: 'range', key: 'v0', label: 'Бастапқы жылдамдық v₀ (лақтыру)', min: 4, max: 18, step: 1, value: 14, unit: 'м/с', digits: 0 },
      { type: 'range', key: 'h0', label: 'Бастапқы биіктік h₀ (құлату)', min: 2, max: 15, step: 1, value: 10, unit: 'м', digits: 0 },
      { type: 'check', key: 'air', label: 'Ауа кедергісі', value: false },
    ],
    readouts: [
      { key: 'h', label: 'Биіктік h', unit: 'м', digits: 2 },
      { key: 'v', label: 'Жылдамдық v', unit: 'м/с', digits: 2 },
      { key: 'Ek', label: 'Eₖ = mv²/2', unit: 'Дж', digits: 1 },
      { key: 'Ep', label: 'Eₚ = mgh', unit: 'Дж', digits: 1 },
      { key: 'E', label: 'E = Eₖ + Eₚ', unit: 'Дж', digits: 1 },
    ],
    init: function (api) { var P = api.P, S = api.S; S.t = 0; S.h = P.mode === 'up' ? 0 : P.h0; S.v = P.mode === 'up' ? P.v0 : 0; S.E0 = 0.5 * P.m * S.v * S.v + P.m * G * S.h; S.trail = []; },
    substeps: 4,
    step: function (api, dt) {
      var P = api.P, S = api.S, k = P.air ? 0.05 / P.m : 0;
      S.t += dt;
      S.v += (-G - k * S.v * Math.abs(S.v)) * dt; S.h += S.v * dt;
      if (S.h <= 0) { S.h = 0; S.v = 0; return false; }
    },
    read: function (api) {
      var P = api.P, S = api.S, Ek = 0.5 * P.m * S.v * S.v, Ep = P.m * G * S.h;
      return { h: S.h, v: Math.abs(S.v), Ek: Ek, Ep: Ep, E: Ek + Ep };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, ground = H * 0.9, hmax = 17;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true });
      var mpx = (ground - 40) / hmax, bx = W * 0.3;
      // биіктік шкаласы (бағана)
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(bx - 70, ground - hmax * mpx, 8, hmax * mpx);
      for (var m = 0; m <= hmax; m += 1) {
        var y = ground - m * mpx; ctx.fillStyle = '#334'; ctx.fillRect(bx - 74, y - 0.5, m % 5 === 0 ? 16 : 10, 1);
        if (m % 5 === 0) R.txt(ctx, m + ' м', bx - 92, y, { size: 9.5, color: '#fff' });
      }
      if (P.mode === 'drop') R.block(ctx, bx - 30, ground - P.h0 * mpx, 60, 8, 'oak', { depth: 6, shadow: false });
      var r = 9 + P.m * 5;
      R.sphere(ctx, bx, ground - S.h * mpx - r, r, '#e05a2a', { shadowY: ground });
      if (Math.abs(S.v) > 0.2) R.force(ctx, bx + r + 8, ground - S.h * mpx - r, bx + r + 8, ground - S.h * mpx - r - S.v * 5, '#1f5fd1', 'v');
      // энергия бағаналары
      var Ek = 0.5 * P.m * S.v * S.v, Ep = P.m * G * S.h, E0 = S.E0 || 1;
      var gx = W * 0.58, gw = 54, gh = ground - 60, gy = ground;
      [['Eₖ', Ek, '#e05a2a'], ['Eₚ', Ep, '#1f5fd1'], ['E', Ek + Ep, '#1d7a45']].forEach(function (b, i) {
        var x = gx + i * (gw + 26), h = b[1] / E0 * (gh - 30);
        ctx.fillStyle = 'rgba(255,255,255,.75)'; R.rr(ctx, x - 6, gy - gh - 6, gw + 12, gh + 12, 8); ctx.fill();
        var g = ctx.createLinearGradient(x, 0, x + gw, 0); g.addColorStop(0, R.shade(b[2], -0.2)); g.addColorStop(0.4, R.shade(b[2], 0.25)); g.addColorStop(1, R.shade(b[2], -0.3));
        ctx.fillStyle = g; ctx.fillRect(x, gy - h, gw, h);
        R.txt(ctx, b[0], x + gw / 2, gy - gh + 8, { size: 13, color: b[2] });
        R.txt(ctx, Sim.fmt(b[1], 1) + ' Дж', x + gw / 2, gy - Math.max(h, 12) - 10, { size: 10, color: '#1b2329' });
      });
    },
  });
})();

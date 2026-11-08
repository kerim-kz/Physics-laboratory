/* Шеңбер бойымен бірқалыпты қозғалыс: v = 2πR/T, ω = 2π/T, a = v²/R. */
(function () {
  Sim.create({
    aspect: 0.62, autoplay: true,
    hint: 'Көк көрсеткі — жылдамдық, қызыл — центрге тартқыш үдеу.',
    controls: [
      { type: 'range', key: 'R', label: 'Радиус R', min: 0.5, max: 3, step: 0.1, value: 2, unit: 'м', digits: 1, live: true },
      { type: 'range', key: 'T', label: 'Период T', min: 1, max: 10, step: 0.5, value: 4, unit: 'с', digits: 1, live: true },
      { type: 'check', key: 'trail', label: 'Ізін көрсету', value: true, live: true },
    ],
    readouts: [
      { key: 'v', label: 'Сызықтық жылдамдық v', unit: 'м/с' },
      { key: 'w', label: 'Бұрыштық жылдамдық ω', unit: 'рад/с' },
      { key: 'nu', label: 'Айналу жиілігі ν', unit: 'Гц' },
      { key: 'a', label: 'Центрге тартқыш үдеу a', unit: 'м/с²' },
      { key: 'n', label: 'Айналым саны N', digits: 0 },
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 1 },
    ],
    init: function (api) { api.S.phi = 0; api.S.t = 0; },
    onLive: function () {},
    step: function (api, dt) { var S = api.S; S.t += dt; S.phi += 2 * Math.PI / api.P.T * dt; },
    read: function (api) {
      var P = api.P, v = 2 * Math.PI * P.R / P.T;
      return { v: v, w: 2 * Math.PI / P.T, nu: 1 / P.T, a: v * v / P.R, n: Math.floor(api.S.phi / (2 * Math.PI)), t: api.S.t };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var cx = W * 0.4, cy = H / 2, k = (H / 2 - 40) / 3, r = P.R * k;
      ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      var phi = S.phi % (2 * Math.PI);
      if (P.trail) {
        ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.globalAlpha = 0.45; ctx.beginPath();
        if (S.phi >= 2 * Math.PI) ctx.arc(cx, cy, r, 0, Math.PI * 2); else ctx.arc(cx, cy, r, 0, -phi, true);
        ctx.stroke(); ctx.restore();
      }
      D.circle(ctx, cx, cy, 4, C.ink);
      var x = cx + r * Math.cos(phi), y = cy - r * Math.sin(phi);
      D.line(ctx, cx, cy, x, y, C.muted, 1);
      var v = 2 * Math.PI * P.R / P.T, a = v * v / P.R;
      var vs = Math.min(100, 12 + v * 12), as = Math.min(100, 10 + a * 6);
      var tx = -Math.sin(phi), ty = -Math.cos(phi); // сағат тіліне қарсы айналудағы жанама
      D.arrow(ctx, x, y, x + tx * vs, y + ty * vs, C.blue, 2.5, 'v');
      D.arrow(ctx, x, y, x + (cx - x) / r * as, y + (cy - y) / r * as, C.red, 2.5, 'a');
      D.circle(ctx, x, y, 9, C.orange, C.ink, 1.5);
      D.text(ctx, 'R = ' + api.fmt(P.R, 1) + ' м', cx + 8, cy - 8, { size: 11, color: C.muted });
      // формулалар тақтасы
      var bx = W * 0.72;
      D.text(ctx, 'v = 2πR / T', bx, 50, { size: 14, mono: true, weight: '600' });
      D.text(ctx, 'ω = 2π / T', bx, 78, { size: 14, mono: true, weight: '600' });
      D.text(ctx, 'v = ωR', bx, 106, { size: 14, mono: true, weight: '600' });
      D.text(ctx, 'a = v² / R', bx, 134, { size: 14, mono: true, weight: '600', color: C.red });
      D.text(ctx, 'v ⟂ a әрқашан', bx, 170, { size: 12, color: C.muted });
    },
  });
})();

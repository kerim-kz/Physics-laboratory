/* Доплер эффектісі: қозғалатын көз шеңберлік толқын фронттарын шығарады.
   Алдыңғы бақылаушы: f' = f·c/(c − v), артқы: f' = f·c/(c + v). v > c болса — Мах конусы. */
(function () {
  var CPX = 120; // экрандағы толқын жылдамдығы, px/с (дыбыс жылдамдығы 340 м/с-қа сәйкес)
  Sim.create({
    aspect: 0.58, autoplay: true,
    hint: 'Дыбыс жылдамдығы c = 340 м/с.',
    controls: [
      { type: 'range', key: 'k', label: 'Көз жылдамдығы v / c', min: 0, max: 1.5, step: 0.05, value: 0.5, digits: 2 },
      { type: 'range', key: 'f', label: 'Көздің жиілігі f', min: 200, max: 1000, step: 50, value: 400, unit: 'Гц', digits: 0 },
    ],
    readouts: [
      { key: 'v', label: 'Көз жылдамдығы v', unit: 'м/с', digits: 0 },
      { key: 'fa', label: 'Алдыңғы бақылаушы естиді', unit: 'Гц', digits: 0 },
      { key: 'fb', label: 'Артқы бақылаушы естиді', unit: 'Гц', digits: 0 },
      { key: 'la', label: 'Алдындағы толқын ұзындығы', unit: 'см', digits: 1 },
      { key: 'lb', label: 'Артындағы толқын ұзындығы', unit: 'см', digits: 1 },
      { key: 'mach', label: 'Мах саны' },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.x = 0.12 * (api.W || 600); S.fronts = []; S.next = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, W = api.W;
      S.t += dt;
      S.x += P.k * CPX * dt;
      if (S.x > W * 0.92) { S.x = W * 0.08; S.fronts = []; }
      var period = 1 / (P.f / 200); // визуал: 400 Гц → 2 фронт/с
      if (S.t >= S.next) { S.fronts.push({ x: S.x, t: S.t }); S.next = S.t + period; }
      S.fronts = S.fronts.filter(function (f) { return (S.t - f.t) * CPX < W * 1.2; });
    },
    read: function (api) {
      var P = api.P, c = 340, v = P.k * c;
      return {
        v: v, fa: P.k < 1 ? P.f * c / (c - v) : 'дыбыс жетпейді (v ≥ c)', fb: P.f * c / (c + v),
        la: P.k < 1 ? (c - v) / P.f * 100 : null, lb: (c + v) / P.f * 100, mach: api.fmt(P.k, 2) + (P.k > 1 ? ' — дыбыстан жылдам' : ''),
      };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, cy = H / 2;
      S.fronts.forEach(function (f) {
        var r = (S.t - f.t) * CPX;
        ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.globalAlpha = Math.max(0.15, 1 - r / (W * 0.9));
        ctx.beginPath(); ctx.arc(f.x, cy, r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      if (P.k > 1) {
        var a = Math.asin(1 / P.k), L = W;
        D.line(ctx, S.x, cy, S.x - L * Math.cos(a), cy - L * Math.sin(a), C.bad, 2);
        D.line(ctx, S.x, cy, S.x - L * Math.cos(a), cy + L * Math.sin(a), C.bad, 2);
        D.text(ctx, 'Мах конусы (соққы толқыны)', 14, 22, { size: 12, color: C.bad, weight: '600' });
      }
      // көз
      ctx.fillStyle = C.red; ctx.fillRect(S.x - 16, cy - 8, 32, 16);
      D.circle(ctx, S.x, cy, 4, '#fff');
      if (P.k > 0) D.arrow(ctx, S.x + 18, cy, S.x + 18 + 20 + P.k * 30, cy, C.ink, 2, 'v');
      // бақылаушылар
      function ear(x, label) {
        D.circle(ctx, x, cy + 70, 11, C.orange, C.ink, 1.5);
        D.text(ctx, label, x, cy + 100, { size: 11, align: 'center', color: C.muted, weight: '600' });
      }
      ear(W - 30, 'алдында');
      ear(30, 'артында');
    },
  });
})();

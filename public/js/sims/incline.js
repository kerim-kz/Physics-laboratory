/* Көлбеу жазықтықтағы дене: күштер, үдеу, сырғанау шарты tg α > μ. */
(function () {
  var g = 9.8, LEN = 2; // көлбеу жазықтықтың ұзындығы, м

  function phys(P) {
    var a = P.angle * Math.PI / 180;
    var N = P.m * g * Math.cos(a), Fpar = P.m * g * Math.sin(a), Fmax = P.mu * N;
    var slides = Fpar > Fmax + 1e-9;
    return { rad: a, N: N, Fpar: Fpar, Ffr: slides ? Fmax : Fpar, slides: slides, acc: slides ? g * (Math.sin(a) - P.mu * Math.cos(a)) : 0 };
  }

  Sim.create({
    tools: ['angle', 'stopwatch'],
    aspect: 0.62,
    hint: 'Тыныштық үйкеліс коэффициенті сырғанау коэффициентіне тең деп алынған.',
    controls: [
      { type: 'range', key: 'angle', label: 'Көлбеулік бұрышы α', min: 0, max: 60, step: 1, value: 30, unit: '°', digits: 0 },
      { type: 'range', key: 'mu', label: 'Үйкеліс коэффициенті μ', min: 0, max: 1, step: 0.05, value: 0.3, digits: 2 },
      { type: 'range', key: 'm', label: 'Дене массасы m', min: 0.5, max: 10, step: 0.5, value: 2, unit: 'кг', digits: 1 },
      { type: 'check', key: 'comp', label: 'Ауырлық күшінің құраушыларын көрсету', value: true, live: true },
    ],
    readouts: [
      { key: 'state', label: 'Күйі' },
      { key: 'acc', label: 'Үдеу a', unit: 'м/с²' },
      { key: 'N', label: 'Тіректің реакция күші N', unit: 'Н' },
      { key: 'Ffr', label: 'Үйкеліс күші', unit: 'Н' },
      { key: 'Fpar', label: 'mg sin α', unit: 'Н' },
      { key: 'tg', label: 'tg α', digits: 2 },
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'tb', label: 'Төменге жету уақыты', unit: 'с' },
    ],
    init: function (api) { var S = api.S; S.ph = phys(api.P); S.s = 0; S.t = 0; },
    onLive: function () {},
    step: function (api, dt) {
      var S = api.S;
      if (!S.ph.slides) { S.t += dt; return S.t < 3; }
      S.t += dt;
      S.s = Math.min(LEN, S.ph.acc * S.t * S.t / 2);
      if (S.s >= LEN) return false;
    },
    read: function (api) {
      var S = api.S, ph = S.ph;
      return {
        state: ph.slides ? 'сырғанайды' : 'тыныштықта', acc: ph.acc, N: ph.N, Ffr: ph.Ffr, Fpar: ph.Fpar,
        tg: Math.tan(ph.rad), t: S.t, tb: ph.slides ? Math.sqrt(2 * LEN / ph.acc) : null,
      };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, ph = S.ph;
      var a = ph.rad;
      var baseY = H - 40, x0 = 60;
      var Lpx = Math.min((W - 140) / Math.max(0.3, Math.cos(a)), (H - 90) / Math.max(0.2, Math.sin(a) || 0.2), W * 0.8);
      Lpx = Math.min(Lpx, (W - 140) / Math.cos(a));
      var topX = x0, topY = baseY - Lpx * Math.sin(a);
      var botX = x0 + Lpx * Math.cos(a), botY = baseY;
      // жазықтық
      ctx.fillStyle = C.bg2; ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(botX, botY); ctx.lineTo(topX, botY); ctx.closePath(); ctx.fill(); ctx.stroke();
      D.line(ctx, 20, baseY, W - 20, baseY, C.muted, 2);
      // бұрыш доғасы
      ctx.save(); ctx.strokeStyle = C.orange; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(botX, botY, 42, Math.PI, Math.PI + a, false); ctx.stroke(); ctx.restore();
      D.text(ctx, 'α = ' + P.angle + '°', botX - 92, botY - 10, { size: 12, color: C.orange, weight: '600' });
      // дене
      var side = 46, along = 30 + (S.s / LEN) * (Lpx - 2 * 30 - side);
      var ux = Math.cos(a), uy = Math.sin(a);   // жазықтық бойымен төмен
      var nx = Math.sin(a), ny = -Math.cos(a);  // беттен сыртқа қарай нормаль (жоғары-оңға)
      var cx = topX + ux * (along + side / 2) + nx * side / 2;
      var cy = topY + uy * (along + side / 2) + ny * side / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = C.blue; ctx.fillRect(-side / 2, -side / 2, side, side);
      ctx.restore();
      D.text(ctx, P.m + ' кг', cx, cy + 4, { size: 11, align: 'center', color: '#fff', weight: '600' });
      // күштер (mg = 90 px)
      var k = 90 / (P.m * g);
      var mg = P.m * g;
      D.arrow(ctx, cx, cy, cx, cy + mg * k, C.purple, 2.5, 'mg');
      D.arrow(ctx, cx, cy, cx + nx * ph.N * k, cy + ny * ph.N * k, C.accent, 2.5, 'N');
      if (ph.Ffr > 0.01) D.arrow(ctx, cx - ux * side / 2, cy - uy * side / 2, cx - ux * (side / 2 + ph.Ffr * k), cy - uy * (side / 2 + ph.Ffr * k), C.red, 2.5, 'Fүйк');
      if (P.comp) {
        D.arrow(ctx, cx, cy, cx + ux * ph.Fpar * k, cy + uy * ph.Fpar * k, C.purple, 1.2, 'mg sin α');
        D.arrow(ctx, cx, cy, cx - nx * ph.N * k, cy - ny * ph.N * k, C.purple, 1.2, 'mg cos α');
      }
      var msg = ph.slides ? 'tg α = ' + api.fmt(Math.tan(a), 2) + ' > μ = ' + api.fmt(P.mu, 2) + ' — дене сырғанайды' : 'tg α = ' + api.fmt(Math.tan(a), 2) + ' ≤ μ = ' + api.fmt(P.mu, 2) + ' — дене тыныштықта';
      D.text(ctx, msg, W - 20, 24, { size: 13, align: 'right', weight: '600', color: ph.slides ? C.bad : C.good });
    },
  });
})();

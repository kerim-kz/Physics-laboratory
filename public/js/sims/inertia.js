/* Инерция: стақанның үстіндегі картонның үстінде тиын. Картонды баяу тартса — тиын бірге кетеді,
   шапшаң шертсе — тиын инерциясымен орнында қалып, стақанға түседі. */
(function () {
  var R = window.Real;
  var MU = 0.3, G = 9.8, CARD = 0.10, GLASSR = 0.035, COINR = 0.012, SLOW = 12; // 12 есе баяулатылған
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Картонды тарту үдеуін өзгертіп, «Бастау» бас. Қозғалыс 12 есе баяулатылған.',
    controls: [
      { type: 'range', key: 'a', label: 'Картонды тарту шапшаңдығы (үдеуі)', min: 1, max: 60, step: 1, value: 40, unit: 'м/с²', digits: 0 },
      { type: 'select', key: 'coin', label: 'Тиын', value: 'coin', options: [['coin', 'Тиын (100 теңге)'], ['eraser', 'Өшіргіш (резеңке)']] },
    ],
    readouts: [
      { key: 'res', label: 'Нәтиже', text: true },
      { key: 'dx', label: 'Тиынның ығысуы (картон шыққанша)', unit: 'см', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.xc = 0; S.vc = 0; S.xk = 0; S.vk = 0; S.on = true; S.y = 0; S.vy = 0; S.done = false; },
    step: function (api, dt) {
      var P = api.P, S = api.S, mu = P.coin === 'coin' ? MU : 0.8, a = P.a;
      dt /= SLOW;
      S.t += dt;
      // картон: a үдеумен 0,15 м жүргенше тартылады, сосын бірқалыпты
      if (S.xc < 0.15) S.vc += a * dt;
      S.xc += S.vc * dt;
      if (S.on) {
        // тиын картонмен бірге қозғала ала ма? Үйкеліс беретін ең үлкен үдеу — μg
        var ak = Math.min(a, mu * G);
        if (S.xc >= 0.15) ak = S.vk < S.vc ? mu * G : 0;
        S.vk = Math.min(S.vc, S.vk + ak * dt); S.xk += S.vk * dt;
        if (S.xc - S.xk > CARD / 2 + COINR * 0.2) S.on = false; // картонның шеті тиыннан өтіп кетті
        else if (S.xk > GLASSR + 0.03) { S.done = true; S.inGlass = false; } // тиын картонмен бірге стақаннан алыстады
      } else {
        S.xk += S.vk * dt;
        var inside = Math.abs(S.xk) < GLASSR - COINR * 0.5;
        S.vy += G * dt; S.y += S.vy * dt;
        var floor = inside ? 0.09 : 0.105;
        if (S.y >= floor) { S.y = floor; S.vk = 0; S.vy = 0; S.done = true; S.inGlass = inside; }
      }
      if (S.done || S.t > 3) return false;
    },
    read: function (api) {
      var S = api.S;
      return { res: !S.done ? '…' : S.inGlass ? 'Тиын стақанға түсті: инерциясымен орнында қалды' : 'Тиын картонмен бірге кетті', dx: S.xk * 100 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.82, px = Math.min(W, 1000) * 2.4; // 1 м → px
      R.scene(ctx, W, H, 'lab', { table: table });
      var gx = W * 0.42, gw = GLASSR * 2 * px, gh = 0.1 * px, gtop = table - gh;
      R.vessel(ctx, gx - gw / 2, gtop, gw, gh, gh * 0.15, {});
      // картон
      var cardX = gx - CARD / 2 * px + S.xc * px, cardY = gtop - 4;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 3;
      ctx.fillStyle = '#f4f0e4'; ctx.fillRect(cardX, cardY, CARD * px, 4);
      ctx.fillStyle = '#c8382c'; ctx.fillRect(cardX + 3, cardY, CARD * px - 6, 1.5);
      ctx.restore();
      // тиын (бүйірінен — жұқа диск)
      var kx = gx + S.xk * px, ky = S.on ? cardY - 3 : cardY - 3 + S.y * px;
      var cw = COINR * 2 * px;
      if (P.coin === 'coin') {
        var g = ctx.createLinearGradient(kx - cw / 2, 0, kx + cw / 2, 0); g.addColorStop(0, '#9c8a4a'); g.addColorStop(0.4, '#f3e3a0'); g.addColorStop(1, '#8a7a3a');
        ctx.fillStyle = g; R.rr(ctx, kx - cw / 2, ky - 4, cw, 5, 2); ctx.fill();
      } else R.block(ctx, kx - cw / 2, ky - 10, cw, 10, 'plasticRed', { depth: 5, shadow: false });
      // шерту күшінің бағыты
      if (S.t < 0.02 && !S.done) R.force(ctx, cardX - 70, cardY + 2, cardX - 8, cardY + 2, '#1f5fd1', 'F');
      R.tag(ctx, P.a > (P.coin === 'coin' ? MU : 0.8) * G ? 'Тарту үдеуі үйкеліс бере алатын үдеуден үлкен → тиын сырғиды' : 'Үйкеліс тиынды картонмен бірге тартып әкетеді',
        W / 2, 22, { size: 11.5 });
    },
  });
})();

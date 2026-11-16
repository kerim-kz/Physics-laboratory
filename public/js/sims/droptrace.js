/* Тамшылатқышы бар арбаша: тамшылар тең уақыт аралығында (0,5 с) тамып, қағаз жолаққа із қалдырады.
   Бірқалыпты қозғалыста іздер арасы бірдей, үдемелі қозғалыста — артады, баяулағанда — азаяды. */
(function () {
  var R = window.Real;
  var DT = 0.5; // тамшылар арасындағы уақыт, с
  Sim.create({
    aspect: 0.5, grid: false,
    hint: 'Тамшылар әр 0,5 секунд сайын тамады. Іздердің арақашықтығын сызғышпен өлшеп, қозғалыс түрін анықта.',
    controls: [
      { type: 'select', key: 'mode', label: 'Қозғалыс түрі', value: 'uniform', options: [['uniform', 'Бірқалыпты'], ['acc', 'Жылдамдайды (бірқалыпсыз)'], ['dec', 'Баяулайды (бірқалыпсыз)']] },
      { type: 'range', key: 'v', label: 'Бастапқы жылдамдық', min: 0.05, max: 0.3, step: 0.01, value: 0.12, unit: 'м/с', digits: 2 },
    ],
    tools: ['ruler'],
    scale: function (api) { return { px: api.S.pxm, unit: 'м' }; },
    readouts: [
      { key: 't', label: 'Уақыт', unit: 'с', digits: 1 },
      { key: 'n', label: 'Тамшылар саны', digits: 0 },
      { key: 'last', label: 'Соңғы екі із арасы', unit: 'см', digits: 1 },
      { key: 'v', label: 'Арбашаның жылдамдығы', unit: 'м/с', digits: 3 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.x = 0; S.v = api.P.v; S.drops = []; S.next = 0; S.falling = []; },
    step: function (api, dt) {
      var P = api.P, S = api.S, a = P.mode === 'acc' ? 0.02 : P.mode === 'dec' ? -P.v * P.v / (2 * 1.1) : 0;
      S.t += dt;
      S.v = Math.max(0, S.v + a * dt);
      S.x += S.v * dt;
      if (S.t >= S.next) { S.falling.push({ x: S.x, h: 0, vy: 0 }); S.next += DT; }
      S.falling.forEach(function (d) { d.vy += 9.8 * dt * 0.6; d.h += d.vy * dt * 60; });
      S.falling = S.falling.filter(function (d) { if (d.h >= 34) { S.drops.push(d.x); return false; } return true; });
      if (S.x > 1.15 || (P.mode === 'dec' && S.v < 0.002 && S.falling.length === 0)) return false;
    },
    read: function (api) {
      var d = api.S.drops, n = d.length;
      return { t: api.S.t, n: n, last: n > 1 ? (d[n - 1] - d[n - 2]) * 100 : null, v: api.S.v };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, table = H * 0.42;
      R.scene(ctx, W, H, 'lab', { table: table });
      var x0 = W * 0.06, pxm = (W * 0.86) / 1.2; S.pxm = pxm;
      // қағаз жолақ
      var py = table + (H - table) * 0.45;
      ctx.save();
      ctx.fillStyle = '#fbfaf4'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.fillRect(x0 - 10, py - 18, W * 0.9, 36); ctx.restore();
      // тамшы іздері
      S.drops.forEach(function (x, i) {
        var cx = x0 + x * pxm;
        var g = ctx.createRadialGradient(cx, py, 0.5, cx, py, 6);
        g.addColorStop(0, 'rgba(40,60,160,.85)'); g.addColorStop(1, 'rgba(40,60,160,.15)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, py, 5.5, 4, 0, 0, 7); ctx.fill();
        R.txt(ctx, String(i), cx, py + 13, { size: 8.5, color: '#5a6670', mono: true });
      });
      // арбаша рельсте (үстелде)
      var cx = x0 + S.x * pxm, cy = table + 8;
      R.block(ctx, cx - 40, cy - 34, 80, 22, 'plasticBlue', { depth: 8 });
      R.wheel(ctx, cx - 24, cy - 6, 8, S.x * pxm / 8); R.wheel(ctx, cx + 24, cy - 6, 8, S.x * pxm / 8);
      // тамшылатқыш (бөтелке + түтік)
      ctx.save();
      var bx = cx - 12, by = cy - 86;
      var g2 = ctx.createLinearGradient(bx, 0, bx + 24, 0); g2.addColorStop(0, 'rgba(190,220,235,.6)'); g2.addColorStop(0.3, 'rgba(255,255,255,.8)'); g2.addColorStop(1, 'rgba(150,190,210,.6)');
      ctx.fillStyle = g2; R.rr(ctx, bx, by, 24, 46, 6); ctx.fill(); ctx.strokeStyle = 'rgba(80,110,130,.7)'; ctx.stroke();
      ctx.fillStyle = 'rgba(50,70,170,.75)'; ctx.fillRect(bx + 2, by + 18, 20, 26);
      ctx.fillStyle = '#7d868e'; ctx.fillRect(cx - 2, cy - 40, 4, 52);
      ctx.restore();
      S.falling.forEach(function (d) {
        var dx = x0 + d.x * pxm;
        R.sphere(ctx, dx, cy + 12 + d.h * ((py - cy - 12) / 34), 3, '#3046b0');
      });
      R.tag(ctx, api.P.mode === 'uniform' ? 'Іздер арасы бірдей → бірқалыпты қозғалыс' : api.P.mode === 'acc' ? 'Іздер арасы артады → жылдамдық өседі' : 'Іздер арасы азаяды → жылдамдық кемиді', W / 2, H - 16, { size: 12 });
    },
  });
})();

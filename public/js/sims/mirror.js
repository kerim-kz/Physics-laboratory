/* Жазық айна: кескін айнаға симметриялы, шағылу бұрышы түсу бұрышына тең. Зат пен көзді тінтуірмен жылжыт. */
(function () {
  Sim.create({
    tools: ['ruler', 'angle'],
    scale: function (api) { return api._sc || null; },
    aspect: 0.62, static: true, resetLabel: false,
    hint: 'Шамды (затты) немесе көзді тартып жылжыт.',
    controls: [
      { type: 'check', key: 'many', label: 'Бірнеше сәулені көрсету', value: false },
      { type: 'check', key: 'normal', label: 'Перпендикулярды (нормальды) көрсету', value: true },
    ],
    readouts: [
      { key: 'a', label: 'Түсу бұрышы α', unit: '°', digits: 1 },
      { key: 'b', label: 'Шағылу бұрышы β', unit: '°', digits: 1 },
      { key: 'd', label: 'Заттан айнаға дейін', unit: 'см', digits: 0 },
      { key: 'f', label: 'Айнадан кескінге дейін', unit: 'см', digits: 0 },
    ],
    init: function (api) { var S = api.S; S.ox = 0.25; S.oy = 0.45; S.ex = 0.15; S.ey = 0.78; S.grab = null; },
    pointer: {
      down: function (api, p) {
        var S = api.S, W = api.W, H = api.H;
        var dO = Math.hypot(p.x - S.ox * W, p.y - S.oy * H), dE = Math.hypot(p.x - S.ex * W, p.y - S.ey * H);
        S.grab = dO < 40 && dO <= dE ? 'o' : dE < 40 ? 'e' : null;
      },
      move: function (api, p, down) {
        var S = api.S, W = api.W, H = api.H;
        if (!down || !S.grab) return;
        var x = Math.max(0.04, Math.min(0.44, p.x / W)), y = Math.max(0.08, Math.min(0.92, p.y / H));
        if (S.grab === 'o') { S.ox = x; S.oy = y; } else { S.ex = x; S.ey = y; }
        api.draw();
      },
      up: function (api) { api.S.grab = null; },
    },
    step: function () {},
    read: function (api) {
      var S = api.S, W = api.W || 600, H = api.H || 380, mx = 0.5 * W;
      var ox = S.ox * W, oy = S.oy * H, ex = S.ex * W, ey = S.ey * H;
      var ix = 2 * mx - ox;
      var t = (mx - ex) / (ix - ex), hy = ey + (oy - ey) * t; // айнадағы шағылу нүктесі
      var a = Math.atan2(Math.abs(hy - oy), mx - ox) * 180 / Math.PI;
      var b = Math.atan2(Math.abs(hy - ey), mx - ex) * 180 / Math.PI;
      var cm = 100 / (0.5 * W); // айнаға дейінгі жарты ен = 100 см
      return { a: a, b: b, d: (mx - ox) * cm, f: (ix - mx) * cm };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var mx = W / 2, ox = S.ox * W, oy = S.oy * H, ex = S.ex * W, ey = S.ey * H, ix = 2 * mx - ox;
      api._sc = { px: (W / 2) / 100, unit: 'см' };
      // айна
      ctx.fillStyle = C.bg2; ctx.fillRect(mx, 20, 10, H - 40);
      for (var y = 24; y < H - 20; y += 10) D.line(ctx, mx + 10, y, mx + 18, y - 8, C.muted, 1);
      D.line(ctx, mx, 20, mx, H - 20, C.accent, 3);
      function ray(ty) {
        var t = (mx - ex) / (ix - ex), hy = ey + (oy - ey) * t;
        if (ty !== undefined) hy = ty;
        D.line(ctx, ox, oy, mx, hy, C.orange, 2);
        if (ty === undefined) {
          D.arrow(ctx, mx, hy, ex, ey, C.orange, 2);
          D.line(ctx, mx, hy, ix, oy, C.orange, 1, [5, 5]);
          if (P.normal) { D.line(ctx, mx - 90, hy, mx, hy, C.muted, 1, [3, 3]); D.text(ctx, 'нормаль', mx - 94, hy - 4, { size: 10, align: 'right', color: C.muted }); }
          var a = Math.atan2(oy - hy, mx - ox), b = Math.atan2(ey - hy, mx - ex);
          ctx.strokeStyle = C.brass; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(mx, hy, 34, Math.PI, Math.PI - a, a > 0); ctx.stroke();
          ctx.beginPath(); ctx.arc(mx, hy, 44, Math.PI, Math.PI - b, b > 0); ctx.stroke();
        } else {
          var dx = mx - ox, dy = hy - oy, k = 2;
          D.line(ctx, mx, hy, mx - dx * k, hy + dy * k, C.orange, 1, null);
          D.line(ctx, mx, hy, ix, oy, C.orange, 1, [4, 6]);
        }
      }
      if (P.many) for (var i = 0; i < 5; i++) ray(60 + i * (H - 120) / 4);
      ray();
      // зат (шам) және кескін
      function candle(x, y, ghost) {
        ctx.globalAlpha = ghost ? 0.4 : 1;
        ctx.fillStyle = C.brass; ctx.fillRect(x - 6, y, 12, 34);
        ctx.fillStyle = C.orange; ctx.beginPath(); ctx.ellipse(x, y - 8, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      candle(ox, oy, false); candle(ix, oy, true);
      D.text(ctx, 'зат', ox, oy + 52, { size: 11, align: 'center', color: C.muted });
      D.text(ctx, 'жалған кескін', ix, oy + 52, { size: 11, align: 'center', color: C.muted });
      D.line(ctx, ox, oy + 60, ix, oy + 60, C.soft, 1, [2, 4]);
      // көз
      ctx.fillStyle = C.bg; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(ex, ey, 16, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      D.circle(ctx, ex + 4, ey, 4, C.ink);
      D.text(ctx, 'көз', ex, ey + 24, { size: 11, align: 'center', color: C.muted });
    },
  });
})();

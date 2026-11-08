/* Еркін түсу: тас пен қағаз шар. Ауа кедергісі F = k v² (квадраттық), Айда ауа жоқ. */
(function () {
  var G = { earth: 9.8, moon: 1.62 };
  var BODIES = [
    { name: 'Тас', m: 1, k: 0.0005, r: 12 },
    { name: 'Қағаз шар', m: 0.005, k: 0.0004, r: 10 },
  ];
  Sim.create({
    aspect: 0.66,
    hint: 'Екі дене бір мезгілде құлатылады.',
    controls: [
      { type: 'range', key: 'h', label: 'Биіктік h', min: 5, max: 100, step: 5, value: 45, unit: 'м', digits: 0 },
      { type: 'check', key: 'air', label: 'Ауа кедергісін ескеру', value: false },
      { type: 'select', key: 'planet', label: 'Қай жерде?', value: 'earth', options: [['earth', 'Жер (g = 9,8 м/с²)'], ['moon', 'Ай (g = 1,62 м/с², ауа жоқ)']] },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'v1', label: 'Тастың жылдамдығы', unit: 'м/с', digits: 1 },
      { key: 'v2', label: 'Қағаз шардың жылдамдығы', unit: 'м/с', digits: 1 },
      { key: 't1', label: 'Тастың құлау уақыты', unit: 'с' },
      { key: 't2', label: 'Шардың құлау уақыты', unit: 'с' },
      { key: 'tf', label: 'Есеп: t = √(2h/g)', unit: 'с' },
    ],
    substeps: 10,
    init: function (api) {
      var S = api.S;
      S.t = 0; S.lastH = -1; S.b = BODIES.map(function () { return { y: 0, v: 0, done: null }; }); S.hist = [[], []];
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, g = G[P.planet], air = P.air && P.planet === 'earth';
      S.t += dt;
      var all = true;
      S.b.forEach(function (b, i) {
        if (b.done !== null) return;
        var B = BODIES[i];
        var a = g - (air ? B.k * b.v * b.v / B.m : 0);
        b.v += a * dt; b.y += b.v * dt;
        if (b.y >= P.h) { b.y = P.h; b.done = S.t; } else all = false;
      });
      if (S.t - S.lastH > 0.04 || all) S.lastH = S.t, S.b.forEach(function (b, i) { S.hist[i].push([S.t, b.v]); });
      if (all) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P;
      return { t: S.t, v1: S.b[0].v, v2: S.b[1].v, t1: S.b[0].done, t2: S.b[1].done, tf: Math.sqrt(2 * P.h / G[P.planet]) };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var top = 30, bot = H - 40, X0 = 70, k = (bot - top) / P.h;
      ctx.fillStyle = C.bg2; ctx.fillRect(40, bot, W * 0.45 - 30, 16);
      var step = P.h > 50 ? 10 : 5;
      for (var m = 0; m <= P.h; m += step) {
        var y = top + m * k;
        D.line(ctx, 40, y, 48, y, C.muted, 1);
        D.text(ctx, (P.h - m) + ' м', 36, y + 4, { size: 10, align: 'right', color: C.muted, mono: true });
      }
      [[X0 + 50, C.ink, C.muted], [X0 + 140, C.orange, C.brass]].forEach(function (c, i) {
        var b = S.b[i], B = BODIES[i];
        var y = top + b.y * k - B.r;
        D.circle(ctx, c[0], Math.min(y, bot - B.r), B.r, i ? '#f3ead8' : C.muted, c[1], 1.5);
        D.text(ctx, B.name, c[0], bot + 30, { size: 11, align: 'center', color: C.muted });
      });
      var vmax = Math.max(5, Math.sqrt(2 * G[P.planet] * P.h) * 1.1);
      var tmax = Math.max(1, Math.sqrt(2 * P.h / G[P.planet]) * (P.air && P.planet === 'earth' ? 2.2 : 1.15));
      D.plot(ctx, { x: W * 0.52, y: 40, w: W * 0.44, h: H - 100 }, {
        xmin: 0, xmax: tmax, ymin: 0, ymax: vmax, xlabel: 't, с', ylabel: 'v, м/с',
        series: [{ pts: S.hist[0], color: C.ink }, { pts: S.hist[1], color: C.orange, dash: [6, 4] }],
      });
      if (P.air && P.planet === 'moon') D.text(ctx, 'Айда ауа жоқ — кедергі есептелмейді', W * 0.52, H - 20, { size: 11, color: C.brass, weight: '600' });
    },
  });
})();

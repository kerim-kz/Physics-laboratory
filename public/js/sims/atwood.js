/* Атвуд машинасы: a = (m₁ − m₂)g / (m₁ + m₂), T = 2m₁m₂g / (m₁ + m₂). Блок пен жіп салмақсыз. */
(function () {
  var G = { earth: 9.8, moon: 1.62, mars: 3.71 };
  var LIM = 1.2; // жүктің ең үлкен жылжуы, м
  function acc(P) { return (P.m1 - P.m2) * G[P.planet] / (P.m1 + P.m2); }
  Sim.create({
    tools: ['ruler', 'stopwatch'],
    scale: function (api) { return api._sc || null; },
    aspect: 0.64,
    hint: 'Жүйе тыныштықтан босатылады.',
    controls: [
      { type: 'range', key: 'm1', label: 'Сол жақ жүк m₁', min: 0.1, max: 5, step: 0.1, value: 3, unit: 'кг', digits: 1 },
      { type: 'range', key: 'm2', label: 'Оң жақ жүк m₂', min: 0.1, max: 5, step: 0.1, value: 2, unit: 'кг', digits: 1 },
      { type: 'select', key: 'planet', label: 'Планета', value: 'earth', options: [['earth', 'Жер (9,8 м/с²)'], ['moon', 'Ай (1,62 м/с²)'], ['mars', 'Марс (3,71 м/с²)']] },
    ],
    readouts: [
      { key: 'a', label: 'Үдеу a (формула)', unit: 'м/с²' },
      { key: 'T', label: 'Жіптің керілуі T', unit: 'Н' },
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 's', label: 'Жол s', unit: 'м' },
      { key: 'am', label: 'Өлшенген a = 2s/t²', unit: 'м/с²' },
      { key: 'v', label: 'Жылдамдық v', unit: 'м/с' },
    ],
    init: function (api) { api.S.t = 0; api.S.s = 0; api.S.v = 0; },
    step: function (api, dt) {
      var S = api.S, a = acc(api.P);
      S.t += dt; S.v += a * dt; S.s += S.v * dt;
      if (Math.abs(S.s) >= LIM) { S.s = Math.sign(S.s) * LIM; return false; }
      if (a === 0 && S.t > 3) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, g = G[P.planet];
      return { a: acc(P), T: 2 * P.m1 * P.m2 * g / (P.m1 + P.m2), t: S.t, s: Math.abs(S.s), am: S.t > 0.05 ? 2 * Math.abs(S.s) / (S.t * S.t) : null, v: Math.abs(S.v) };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var cx = W * 0.38, py = 50, R = 34, k = (H - 170) / (2 * LIM);
      api._sc = { px: k, unit: 'м' };
      ctx.fillStyle = C.line; ctx.fillRect(cx - 70, 10, 140, 8);
      D.line(ctx, cx, 18, cx, py, C.ink, 2);
      D.circle(ctx, cx, py, R, C.bg2, C.ink, 2); D.circle(ctx, cx, py, 4, C.ink);
      var y0 = py + 30 + LIM * k;
      var y1 = y0 + S.s * k, y2 = y0 - S.s * k;
      function box(x, y, m, color, label) {
        var s = 26 + m * 7;
        D.line(ctx, x, py, x, y, C.ink, 1.5);
        ctx.fillStyle = color; ctx.fillRect(x - s / 2, y, s, s);
        D.text(ctx, label + ' = ' + api.fmt(m, 1) + ' кг', x, y + s + 15, { size: 11, align: 'center', color: C.muted });
        return s;
      }
      var s1 = box(cx - R, y1, P.m1, C.blue, 'm₁');
      var s2 = box(cx + R, y2, P.m2, C.orange, 'm₂');
      var g = G[P.planet], T = 2 * P.m1 * P.m2 * g / (P.m1 + P.m2), fk = 2.2;
      D.arrow(ctx, cx - R - s1 / 2 - 12, y1 + s1 / 2, cx - R - s1 / 2 - 12, y1 + s1 / 2 + P.m1 * g * fk, C.red, 2, 'm₁g');
      D.arrow(ctx, cx - R - s1 / 2 - 12, y1 + s1 / 2, cx - R - s1 / 2 - 12, y1 + s1 / 2 - T * fk, C.good, 2, 'T');
      D.arrow(ctx, cx + R + s2 / 2 + 12, y2 + s2 / 2, cx + R + s2 / 2 + 12, y2 + s2 / 2 + P.m2 * g * fk, C.red, 2, 'm₂g');
      D.arrow(ctx, cx + R + s2 / 2 + 12, y2 + s2 / 2, cx + R + s2 / 2 + 12, y2 + s2 / 2 - T * fk, C.good, 2, 'T');
      ctx.fillStyle = C.bg2; ctx.fillRect(cx - 120, H - 24, 240, 10);
      var bx = W * 0.66;
      D.text(ctx, 'm₁a = m₁g − T', bx, 60, { size: 14, mono: true, weight: '600' });
      D.text(ctx, 'm₂a = T − m₂g', bx, 88, { size: 14, mono: true, weight: '600' });
      D.text(ctx, 'a = (m₁ − m₂)g / (m₁ + m₂)', bx, 126, { size: 13, mono: true, color: C.accent, weight: '600' });
      if (P.m1 === P.m2) D.text(ctx, 'm₁ = m₂: жүйе тепе-теңдікте', bx, 160, { size: 12, color: C.brass, weight: '600' });
    },
  });
})();

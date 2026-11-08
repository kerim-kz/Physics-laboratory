/* Скейт-трек: дене y(x) қисығы бойымен сырғанайды. Лагранж теңдеуі: x'' = −(g + y''x'²)·y' / (1 + y'²) − c·x'.
   Тұтқырлық үйкеліс (c) механикалық энергияны ішкі энергияға (жылуға) айналдырады. */
(function () {
  var g = 9.8;
  var TRACKS = {
    u: { name: 'U-тәрізді', y: function (x) { return x * x / 9; }, d: function (x) { return 2 * x / 9; }, dd: function () { return 2 / 9; } },
    w: { name: 'W-тәрізді', y: function (x) { var q = x * x - 16; return q * q / 120 + 0.2; }, d: function (x) { return 4 * x * (x * x - 16) / 120; }, dd: function (x) { return (12 * x * x - 64) / 120; } },
    v: { name: 'Төбешікті', y: function (x) { return 4 - 3.6 * Math.exp(-((x + 2) * (x + 2)) / 4) - 2.2 * Math.exp(-((x - 3) * (x - 3)) / 2) + 0.03 * x * x; },
      d: function (x) { return 3.6 * (x + 2) / 2 * Math.exp(-((x + 2) * (x + 2)) / 4) + 2.2 * (x - 3) * Math.exp(-((x - 3) * (x - 3)) / 2) + 0.06 * x; },
      dd: null },
  };
  function ydd(T, x) { if (T.dd) return T.dd(x); var h = 1e-3; return (T.d(x + h) - T.d(x - h)) / (2 * h); }
  Sim.create({
    aspect: 0.62, substeps: 30,
    hint: 'Энергия бағаналарын бақыла: E = Eк + Eп + Q тұрақты.',
    controls: [
      { type: 'select', key: 'track', label: 'Жол пішіні', value: 'u', options: [['u', 'U-тәрізді'], ['w', 'W-тәрізді'], ['v', 'Төбешікті']] },
      { type: 'range', key: 'x0', label: 'Бастапқы орны x₀', min: -6, max: -1, step: 0.1, value: -5, unit: 'м', digits: 1 },
      { type: 'range', key: 'c', label: 'Үйкеліс (кедергі)', min: 0, max: 0.5, step: 0.01, value: 0, digits: 2 },
      { type: 'range', key: 'm', label: 'Масса m', min: 20, max: 80, step: 5, value: 50, unit: 'кг', digits: 0 },
    ],
    readouts: [
      { key: 'h', label: 'Биіктік h', unit: 'м' },
      { key: 'v', label: 'Жылдамдық v', unit: 'м/с' },
      { key: 'ek', label: 'Кинетикалық энергия Eк', unit: 'Дж', digits: 0 },
      { key: 'ep', label: 'Потенциалдық энергия Eп', unit: 'Дж', digits: 0 },
      { key: 'q', label: 'Ішкі энергия (жылу) Q', unit: 'Дж', digits: 0 },
      { key: 'e', label: 'Толық энергия', unit: 'Дж', digits: 0 },
    ],
    init: function (api) {
      var S = api.S, P = api.P, T = TRACKS[P.track];
      S.x = P.x0; S.u = 0; S.E0 = P.m * g * T.y(P.x0); S.t = 0;
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, T = TRACKS[P.track];
      var yp = T.d(S.x), ypp = ydd(T, S.x);
      var acc = -(g + ypp * S.u * S.u) * yp / (1 + yp * yp) - P.c * S.u;
      S.u += acc * dt; S.x += S.u * dt; S.t += dt;
      if (S.x < -6.2) { S.x = -6.2; S.u = Math.abs(S.u) * 0.2; }
      if (S.x > 6.2) { S.x = 6.2; S.u = -Math.abs(S.u) * 0.2; }
    },
    read: function (api) {
      var S = api.S, P = api.P, T = TRACKS[P.track], yp = T.d(S.x);
      var v = Math.abs(S.u) * Math.sqrt(1 + yp * yp), h = T.y(S.x);
      var ek = P.m * v * v / 2, ep = P.m * g * h;
      return { h: h, v: v, ek: ek, ep: ep, q: Math.max(0, S.E0 - ek - ep), e: S.E0 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, T = TRACKS[P.track];
      var w = W * 0.7, X = function (x) { return 20 + (x + 6.5) / 13 * (w - 30); }, k = (w - 30) / 13;
      var Y = function (y) { return H - 40 - y * k; };
      // жол
      ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath();
      for (var x = -6.3; x <= 6.3; x += 0.05) { if (x === -6.3) ctx.moveTo(X(x), Y(T.y(x))); else ctx.lineTo(X(x), Y(T.y(x))); }
      ctx.stroke(); ctx.restore();
      D.line(ctx, 10, Y(0), w, Y(0), C.soft, 1, [4, 4]);
      D.text(ctx, 'h = 0', 14, Y(0) - 4, { size: 10, color: C.muted, mono: true });
      // бастапқы биіктік деңгейі
      var h0 = T.y(P.x0);
      D.line(ctx, 10, Y(h0), w, Y(h0), C.brass, 1, [6, 4]);
      D.text(ctx, 'бастапқы деңгей', w - 4, Y(h0) - 4, { size: 10, color: C.brass, align: 'right' });
      // скейтер
      var yp = T.d(S.x), ang = Math.atan(yp), px = X(S.x), py = Y(T.y(S.x));
      ctx.save(); ctx.translate(px, py); ctx.rotate(-ang);
      ctx.fillStyle = C.brass; ctx.fillRect(-14, -6, 28, 4);
      D.circle(ctx, -9, -1, 2.5, C.ink); D.circle(ctx, 9, -1, 2.5, C.ink);
      ctx.fillStyle = C.blue; ctx.fillRect(-4, -26, 8, 20);
      D.circle(ctx, 0, -31, 6, C.orange);
      ctx.restore();
      // энергия бағаналары
      var v = Math.abs(S.u) * Math.sqrt(1 + yp * yp), ek = P.m * v * v / 2, ep = P.m * g * T.y(S.x), q = Math.max(0, S.E0 - ek - ep);
      var bx = w + 20, bw = 30, base = H - 40, bh = H - 110, E = Math.max(1, S.E0);
      [['Eк', ek, C.orange], ['Eп', ep, C.purple], ['Q', q, C.red], ['E', S.E0, C.accent]].forEach(function (b, i) {
        var x = bx + i * (bw + 10), hh = Math.min(bh, b[1] / E * bh);
        ctx.fillStyle = C.bg2; ctx.fillRect(x, base - bh, bw, bh);
        ctx.fillStyle = b[2]; ctx.fillRect(x, base - hh, bw, hh);
        D.text(ctx, b[0], x + bw / 2, base + 16, { size: 11, align: 'center', color: C.muted, weight: '600' });
      });
      D.text(ctx, 'Энергия', bx, base - bh - 10, { size: 12, weight: '600' });
    },
  });
})();

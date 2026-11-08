/* Көкжиекке бұрыш жасай лақтыру (ауа кедергісіз). */
(function () {
  var PLANETS = { earth: 9.8, moon: 1.62, mars: 3.71, jupiter: 24.8 };
  var traces = [];
  var COLORS = ['blue', 'orange', 'purple', 'teal', 'red', 'brass'];

  function flight(P) {
    var g = PLANETS[P.planet], a = P.angle * Math.PI / 180;
    var vy = P.v0 * Math.sin(a), vx = P.v0 * Math.cos(a);
    var T = (vy + Math.sqrt(vy * vy + 2 * g * P.h0)) / g;
    return { g: g, vx: vx, vy: vy, T: T, L: vx * T, H: P.h0 + vy * vy / (2 * g), tTop: vy / g };
  }

  Sim.create({
    aspect: 0.6,
    hint: 'Бірнеше траектория сақталады — салыстыр.',
    controls: [
      { type: 'range', key: 'v0', label: 'Бастапқы жылдамдық v₀', min: 1, max: 40, step: 0.5, value: 20, unit: 'м/с', digits: 1 },
      { type: 'range', key: 'angle', label: 'Лақтыру бұрышы α', min: 0, max: 90, step: 1, value: 45, unit: '°', digits: 0 },
      { type: 'range', key: 'h0', label: 'Бастапқы биіктік h₀', min: 0, max: 30, step: 1, value: 0, unit: 'м', digits: 0 },
      { type: 'select', key: 'planet', label: 'Планета', value: 'earth', options: [['earth', 'Жер (g = 9,8 м/с²)'], ['moon', 'Ай (g = 1,62 м/с²)'], ['mars', 'Марс (g = 3,71 м/с²)'], ['jupiter', 'Юпитер (g = 24,8 м/с²)']] },
    ],
    buttons: [{ label: 'Іздерді тазарту', onClick: function (api) { traces = []; api.reset(); } }],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'x', label: 'Қашықтық x', unit: 'м' },
      { key: 'y', label: 'Биіктік y', unit: 'м' },
      { key: 'v', label: 'Жылдамдық модулі', unit: 'м/с' },
      { key: 'T', label: 'Ұшу уақыты (есептелген)', unit: 'с' },
      { key: 'L', label: 'Ұшу қашықтығы (есептелген)', unit: 'м' },
      { key: 'H', label: 'Ең үлкен биіктік (есептелген)', unit: 'м' },
    ],
    init: function (api) {
      var S = api.S;
      S.f = flight(api.P);
      S.t = 0; S.done = false; S.pts = [];
      S.speed = Math.max(1, S.f.T / 4);
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, f = S.f;
      S.t = Math.min(f.T, S.t + dt * S.speed);
      S.pts.push([f.vx * S.t, P.h0 + f.vy * S.t - f.g * S.t * S.t / 2]);
      if (S.t >= f.T) {
        S.done = true;
        traces.push({ pts: S.pts.slice(), color: COLORS[traces.length % COLORS.length], label: P.v0 + ' м/с, ' + P.angle + '°' });
        if (traces.length > 6) traces.shift();
        return false;
      }
    },
    substeps: 3,
    read: function (api) {
      var S = api.S, P = api.P, f = S.f;
      var vy = f.vy - f.g * S.t;
      return { t: S.t, x: f.vx * S.t, y: Math.max(0, P.h0 + f.vy * S.t - f.g * S.t * S.t / 2), v: Math.hypot(f.vx, vy), T: f.T, L: f.L, H: f.H };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, f = S.f;
      var maxX = Math.max(10, f.L), maxY = Math.max(5, f.H);
      traces.forEach(function (tr) { tr.pts.forEach(function (p) { if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1]; }); });
      var padL = 50, padB = 40, padT = 20, padR = 20;
      var k = Math.min((W - padL - padR) / (maxX * 1.08), (H - padB - padT) / (maxY * 1.12));
      var X = function (x) { return padL + x * k; };
      var Y = function (y) { return H - padB - y * k; };
      // жер және шкала
      ctx.fillStyle = C.bg2; ctx.fillRect(0, Y(0), W, padB);
      D.line(ctx, 0, Y(0), W, Y(0), C.muted, 2);
      var step = Math.pow(10, Math.floor(Math.log10(maxX / 3)));
      if (maxX / step > 10) step *= 5; else if (maxX / step > 5) step *= 2;
      for (var g = 0; g <= maxX * 1.08; g += step) {
        D.line(ctx, X(g), Y(0), X(g), Y(0) + 6, C.muted, 1);
        D.text(ctx, api.fmt(g, 0), X(g), Y(0) + 18, { size: 10, align: 'center', color: C.muted, mono: true });
      }
      D.text(ctx, 'x, м', W - padR, Y(0) + 32, { size: 11, align: 'right', color: C.muted });
      // мұнара
      if (P.h0 > 0) { ctx.fillStyle = C.line; ctx.fillRect(X(0) - 8, Y(P.h0), 16, P.h0 * k); D.text(ctx, 'h₀ = ' + P.h0 + ' м', X(0) + 12, Y(P.h0 / 2), { size: 11, color: C.muted }); }
      // бұрын лақтырылғандар
      traces.forEach(function (tr) {
        ctx.save(); ctx.strokeStyle = C[tr.color] || C.muted; ctx.globalAlpha = 0.55; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); tr.pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.stroke(); ctx.restore();
        var e = tr.pts[tr.pts.length - 1];
        if (e) D.text(ctx, tr.label, X(e[0]), Y(0) - 6, { size: 10, align: 'center', color: C[tr.color] });
      });
      // болжамды бастапқы бағыт
      var a = P.angle * Math.PI / 180;
      D.arrow(ctx, X(0), Y(P.h0), X(0) + Math.cos(a) * 60, Y(P.h0) - Math.sin(a) * 60, C.accent, 2.5, 'v₀');
      // ағымдағы траектория
      if (S.pts.length > 1) {
        ctx.save(); ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath();
        S.pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); });
        ctx.stroke(); ctx.restore();
      }
      var x = f.vx * S.t, y = Math.max(0, P.h0 + f.vy * S.t - f.g * S.t * S.t / 2);
      D.circle(ctx, X(x), Y(y), 7, C.red, C.ink, 1.5);
      if (S.t > 0 && !S.done) {
        var vy = f.vy - f.g * S.t;
        D.arrow(ctx, X(x), Y(y), X(x) + f.vx * 2.2, Y(y), C.accent, 1.5);
        D.arrow(ctx, X(x), Y(y), X(x), Y(y) - vy * 2.2, C.orange, 1.5);
      }
      if (S.speed > 1.05) D.text(ctx, 'уақыт ' + api.fmt(S.speed, 1) + ' есе жылдамдатылған', W - padR, padT, { size: 11, align: 'right', color: C.muted });
    },
  });
})();

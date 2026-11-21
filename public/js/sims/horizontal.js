/* Горизонталь лақтыру: ғимарат төбесінен лақтырылған доп пен еркін түскен доп. x = v₀t, y = h − gt²/2. */
(function () {
  var R = window.Real, g = 9.81;
  function geo(P, W, H) {
    var tf = Math.sqrt(2 * P.h / g), L = P.v0 * tf;
    var ground = H * 0.86, bx = Math.max(70, W * 0.16); // ғимараттың шеті
    var k = Math.min((ground - 40) / Math.max(P.h, 10), (W - bx - 60) / Math.max(L, 10)); // px/м
    return { tf: tf, L: L, ground: ground, bx: bx, k: k };
  }
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Екі доп бір мезгілде жерге түсе ме? Стробоскоп іздерінің горизонталь және вертикаль аралықтарын салыстыр.',
    controls: [
      { type: 'range', key: 'v0', label: 'Бастапқы горизонталь жылдамдық v₀', min: 0, max: 20, step: 1, value: 10, unit: 'м/с', digits: 0 },
      { type: 'range', key: 'h', label: 'Лақтыру биіктігі h', min: 5, max: 45, step: 5, value: 20, unit: 'м', digits: 0 },
      { type: 'check', key: 'twin', label: 'Екінші доп сол мезетте еркін түседі', value: true },
      { type: 'check', key: 'vec', label: 'Жылдамдық векторы және құраушылары', value: true, live: true },
      { type: 'check', key: 'strobe', label: 'Стробоскоп іздері (әр 0,2 с) және проекциялар', value: true, live: true },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 2 },
      { key: 'x', label: 'x = v₀t', unit: 'м', digits: 2 },
      { key: 'y', label: 'Биіктік y = h − gt²/2', unit: 'м', digits: 2 },
      { key: 'v', label: 'Жылдамдық v = √(v₀² + (gt)²)', unit: 'м/с', digits: 2 },
      { key: 'tf', label: 'Ұшу уақыты √(2h/g)', unit: 'с', digits: 2 },
      { key: 'L', label: 'Ұшу қашықтығы v₀√(2h/g)', unit: 'м', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) {
      var S = api.S, tf = Math.sqrt(2 * api.P.h / g);
      S.t = Math.min(tf, S.t + dt * Math.max(0.6, tf / 3.2));
      if (S.t >= tf) return false;
    },
    read: function (api) {
      var P = api.P, t = api.S.t, tf = Math.sqrt(2 * P.h / g);
      return { t: t, x: P.v0 * t, y: P.h - g * t * t / 2, v: Math.hypot(P.v0, g * t), tf: tf, L: P.v0 * tf };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, G = geo(P, W, H), k = G.k, ground = G.ground, bx = G.bx;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true });
      var top = ground - P.h * k;
      // ғимарат (кірпіш)
      R.block(ctx, bx - 64, top, 64, ground - top, 'brick', { depth: 10 });
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
      for (var yy = top + 12; yy < ground; yy += 12) { ctx.beginPath(); ctx.moveTo(bx - 64, yy); ctx.lineTo(bx, yy); ctx.stroke(); }
      ctx.restore();
      for (var wy = top + 22; wy < ground - 30; wy += 46) { ctx.fillStyle = 'rgba(170,210,235,.85)'; ctx.fillRect(bx - 48, wy, 30, 22); ctx.strokeStyle = '#e8e2d6'; ctx.lineWidth = 2; ctx.strokeRect(bx - 48, wy, 30, 22); }
      var r = Math.max(6, Math.min(11, k * 0.35)), x0 = bx + 12 + r;
      var X = function (t) { return x0 + P.v0 * t * k; }, Y = function (t) { return top - r + (g * t * t / 2 * k) * (ground - top + r - r) / (ground - top); };
      // жердегі метрлік белгілер
      var stepM = P.v0 * G.tf > 40 ? 10 : 5;
      for (var m = 0; x0 + m * k < W - 10; m += stepM) {
        ctx.fillStyle = '#f2efe6'; ctx.fillRect(x0 + m * k - 1, ground, 2, 8);
        R.txt(ctx, m + ' м', x0 + m * k, ground + 18, { size: 9.5, color: R.isDark() ? '#e6ecf0' : '#163018', weight: '600' });
      }
      // траектория (толық — нүктелі, жүрілгені — тұтас)
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath();
      for (var i = 0; i <= 60; i++) { var tt = G.tf * i / 60; if (i) ctx.lineTo(X(tt), Y(tt)); else ctx.moveTo(X(tt), Y(tt)); }
      ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (var j = 0; j <= 60; j++) { var t2 = S.t * j / 60; if (j) ctx.lineTo(X(t2), Y(t2)); else ctx.moveTo(X(t2), Y(t2)); }
      ctx.stroke(); ctx.restore();
      // стробоскоп іздері және проекциялары
      if (P.strobe) {
        for (var ts = 0.2; ts < S.t; ts += 0.2) {
          ctx.globalAlpha = 0.35; R.sphere(ctx, X(ts), Y(ts), r, '#e8892b');
          if (P.twin) R.sphere(ctx, x0, Y(ts), r, '#2f7fd1');
          ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
          ctx.beginPath(); ctx.moveTo(X(ts), Y(ts)); ctx.lineTo(X(ts), ground); ctx.moveTo(x0, Y(ts)); ctx.lineTo(X(ts), Y(ts)); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = '#ffd34d'; ctx.fillRect(X(ts) - 1.5, ground - 3, 3, 6);
        }
      }
      if (P.twin) R.sphere(ctx, x0, Y(S.t), r, '#2f7fd1', { shadowY: ground });
      R.sphere(ctx, X(S.t), Y(S.t), r, '#e8892b', { shadowY: ground });
      // жылдамдық векторы
      if (P.vec && S.t < G.tf - 1e-6) {
        var s = Math.min(4.5, 110 / Math.max(1, Math.hypot(P.v0, g * G.tf))) * (W < 600 ? 0.8 : 1), vx = P.v0, vy = g * S.t;
        var px = X(S.t), py = Y(S.t);
        if (vx > 0) R.force(ctx, px, py, px + vx * s, py, '#0b8a7a', 'vₓ');
        if (vy > 0.3) R.force(ctx, px, py, px, py + vy * s, '#1f5fd1', 'v_y');
        if (vx > 0 && vy > 0.3) R.force(ctx, px, py, px + vx * s, py + vy * s, '#d2382b', 'v');
      }
      R.tag(ctx, 'h = ' + P.h + ' м', bx - 32, top - 18, { size: 11 });
      if (S.t >= G.tf - 1e-6) R.tag(ctx, 'L = ' + Sim.fmt(G.L, 1) + ' м,  t = ' + Sim.fmt(G.tf, 2) + ' с', Math.min(W - 90, X(G.tf)), ground - 40, { size: 12, color: '#0b6b78' });
    },
  });
})();

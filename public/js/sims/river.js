/* Жылдамдықтарды қосу: қайық өзенді кесіп өтеді. v⃗ = v⃗₁ + v⃗₂ (суға қатысты жылдамдық + ағыс жылдамдығы). Жоғарыдан қарағандағы көрініс. */
(function () {
  var R = window.Real;
  var D_M = 120; // өзеннің ені, м
  function kin(P) {
    var a = P.ang * Math.PI / 180;
    var vx = P.vr - P.vb * Math.sin(a), vy = P.vb * Math.cos(a);
    var t = D_M / vy;
    return { vx: vx, vy: vy, v: Math.hypot(vx, vy), t: t, drift: vx * t };
  }
  Sim.create({
    aspect: 0.66, grid: false,
    hint: 'Қайықтың тұмсығын ағысқа қарсы бұрып көр: қай бұрышта қайық дәл қарсы жағаға өтеді? Ең тез өту үшін қайықты қалай бағыттау керек?',
    controls: [
      { type: 'range', key: 'vb', label: 'Қайықтың суға қатысты жылдамдығы v₁', min: 1, max: 6, step: 0.5, value: 4, unit: 'м/с' },
      { type: 'range', key: 'vr', label: 'Ағыс жылдамдығы v₂', min: 0, max: 4, step: 0.5, value: 2, unit: 'м/с' },
      { type: 'range', key: 'ang', label: 'Тұмсығының бағыты (ағысқа қарсы бұрыш)', min: -60, max: 75, step: 5, value: 0, unit: '°', digits: 0 },
      { type: 'check', key: 'tri', label: 'Жылдамдықтар үшбұрышын көрсету', value: true, live: true },
    ],
    readouts: [
      { key: 'v', label: 'Жағаға қатысты жылдамдық v', unit: 'м/с', digits: 2 },
      { key: 't', label: 'Өзеннен өту уақыты', unit: 'с', digits: 1 },
      { key: 'drift', label: 'Ағыспен ығысу (ағыс бойымен)', unit: 'м', digits: 1 },
      { key: 'path', label: 'Жағаға қатысты орын ауыстыру', unit: 'м', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; api.S.trail = []; api.S.flow = 0; },
    step: function (api, dt) {
      var S = api.S, k = kin(api.P), speed = k.t / 7; // өту ~7 с экрандық уақыт
      S.flow += dt * api.P.vr * speed;
      S.t = Math.min(k.t, S.t + dt * speed);
      if (S.t >= k.t) return false;
    },
    read: function (api) {
      var k = kin(api.P), S = api.S, done = S.t >= k.t - 1e-9;
      return { v: k.v, t: done ? k.t : S.t, drift: k.vx * S.t, path: Math.hypot(k.vx * S.t, k.vy * S.t) };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, k = kin(P);
      var bankH = Math.max(46, H * 0.14), top = bankH, bot = H - bankH, sc = (bot - top) / D_M; // px/м
      var x0 = W * 0.28; // старт нүктесі
      var dark = R.isDark();
      // жағалаулар (шөп, құм)
      [[0, top], [bot, H - bot]].forEach(function (b, i) {
        var g = ctx.createLinearGradient(0, b[0], 0, b[0] + b[1]);
        g.addColorStop(0, dark ? '#2f5a33' : '#79ad5a'); g.addColorStop(1, dark ? '#24452a' : '#5c9443');
        ctx.fillStyle = g; ctx.fillRect(0, b[0], W, b[1]);
        var sy = i === 0 ? top - 10 : bot;
        ctx.fillStyle = dark ? '#6d6450' : '#d9c79a'; ctx.fillRect(0, sy, W, 10);
      });
      var rr = R.rng(7);
      for (var i = 0; i < W / 70; i++) { R.tree(ctx, rr() * W, top - 14, 22 + rr() * 16); }
      // су
      var wg = ctx.createLinearGradient(0, top, 0, bot);
      wg.addColorStop(0, dark ? '#1d4a6a' : '#4f9bd0'); wg.addColorStop(0.5, dark ? '#225679' : '#5aa8db'); wg.addColorStop(1, dark ? '#1d4a6a' : '#4f9bd0');
      ctx.fillStyle = wg; ctx.fillRect(0, top, W, bot - top);
      // ағыс сызықтары (ағыспен бірге жылжиды)
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      var r2 = R.rng(11), shift = S.flow * sc;
      for (var j = 0; j < 40; j++) {
        var y = top + 8 + r2() * (bot - top - 16), len = 18 + r2() * 26, bx = r2() * (W + 80);
        var edge = 1 - Math.pow(Math.abs((y - (top + bot) / 2) / ((bot - top) / 2)), 3); // жағаға жақын баяу
        var x = ((bx + shift * edge) % (W + 80)) - 40;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len / 2, y - 2, x + len, y); ctx.stroke();
      }
      ctx.restore();
      R.tag(ctx, 'Ағыс бағыты →  v₂ = ' + Sim.fmt(P.vr, 1) + ' м/с', W - 110, top + 18, { size: 11, color: '#0b4a78' });
      // жағалау белгілері
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x0, bot); ctx.lineTo(x0, top); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'A', x0, bot + 18, { size: 11 }); R.tag(ctx, 'B (дәл қарсы)', x0, top - 22, { size: 10.5 });
      // траектория
      var px = x0 + k.vx * S.t * sc, py = bot - k.vy * S.t * sc;
      ctx.save(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(x0, bot); ctx.lineTo(px, py); ctx.stroke(); ctx.restore();
      if (S.t >= k.t - 1e-9) R.tag(ctx, 'ығысу ' + Sim.fmt(k.drift, 1) + ' м', (x0 + px) / 2, top + 26, { size: 11, color: '#7a4b00' });
      // қайық: тұмсығы суға қатысты жылдамдық бағытында
      var a = P.ang * Math.PI / 180, head = Math.atan2(-P.vb * Math.cos(a), -P.vb * Math.sin(a));
      boat(ctx, px, py, head, Math.min(44, W * 0.07));
      // жылдамдықтар үшбұрышы
      if (P.tri) {
        var s = Math.min(24, W / 42); // px әр м/с
        var b1 = { x: px - P.vb * Math.sin(a) * s, y: py - P.vb * Math.cos(a) * s };
        R.force(ctx, px, py, b1.x, b1.y, '#1f5fd1', 'v₁');
        if (P.vr > 0) R.force(ctx, b1.x, b1.y, b1.x + P.vr * s, b1.y, '#0b8a7a', 'v₂');
        R.force(ctx, px, py, px + k.vx * s, py - k.vy * s, '#d2382b', 'v');
      }
      R.tag(ctx, 'Өзеннің ені ' + D_M + ' м', 70, (top + bot) / 2, { size: 10.5 });
    },
  });
  function boat(ctx, x, y, ang, L) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    var w = L * 0.36;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(2, 3, L * 0.55, w * 0.6, 0, 0, 7); ctx.fill();
    var g = ctx.createLinearGradient(0, -w / 2, 0, w / 2); g.addColorStop(0, '#e9eef2'); g.addColorStop(1, '#9fb0bd');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(L * 0.55, 0); ctx.quadraticCurveTo(L * 0.2, -w * 0.62, -L * 0.45, -w / 2); ctx.lineTo(-L * 0.45, w / 2); ctx.quadraticCurveTo(L * 0.2, w * 0.62, L * 0.55, 0); ctx.fill();
    ctx.strokeStyle = '#5f6f7b'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-L * 0.3, -w * 0.32, L * 0.12, w * 0.64);
    ctx.fillStyle = '#7a5230'; ctx.fillRect(-L * 0.05, -w * 0.4, L * 0.05, w * 0.8); ctx.fillRect(L * 0.18, -w * 0.32, L * 0.05, w * 0.64);
    ctx.restore();
  }
})();

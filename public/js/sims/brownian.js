/* Броун қозғалысы және диффузия: молекулалар жылдамдығы √T-ға пропорционал, соқтығысулар серпімді. */
(function () {
  var N = 160, rS = 3, rB = 16, mS = 1, mB = 40;
  function speed(T) { return 26 * Math.sqrt(T / 100); }
  function gauss() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random()); }
  function init(api) {
    var S = api.S, P = api.P, W = api.W || 600, H = api.H || 380;
    S.p = [];
    var v = speed(P.T);
    for (var i = 0; i < N; i++) {
      var left = i < N / 2;
      S.p.push({ x: P.mode === 'diff' ? (left ? Math.random() * W * 0.45 + 10 : W * 0.55 + Math.random() * W * 0.43) : Math.random() * W, y: Math.random() * H, vx: gauss() * v, vy: gauss() * v, c: left ? 0 : 1 });
    }
    S.B = { x: W / 2, y: H / 2, vx: 0, vy: 0, trail: [] };
    S.T = P.T; S.t = 0; S.wall = P.mode === 'diff' ? 1.2 : 0;
  }

  Sim.create({
    aspect: 0.62, autoplay: true, substeps: 4,
    hint: 'Температураны өзгертіп көр.',
    controls: [
      { type: 'select', key: 'mode', label: 'Режим', value: 'brown', options: [['brown', 'Броун бөлшегі'], ['diff', 'Екі газдың диффузиясы']] },
      { type: 'range', key: 'T', label: 'Температура T', min: 50, max: 800, step: 10, value: 300, unit: 'К', digits: 0, live: true },
    ],
    readouts: [
      { key: 'T', label: 'Абсолют температура', unit: 'К', digits: 0 },
      { key: 'tc', label: 'Цельсий бойынша', unit: '°C', digits: 0 },
      { key: 'v', label: 'Молекулалардың орташа жылдамдығы', unit: 'бірлік', digits: 1 },
      { key: 'mix', label: 'Араласу дәрежесі', unit: '%', digits: 0 },
    ],
    onResize: function (api) { if (!api.S.t) { for (var k in api.S) delete api.S[k]; init(api); } },
    init: init,
    onLive: function (api) {
      var S = api.S, f = Math.sqrt(api.P.T / S.T);
      S.p.forEach(function (q) { q.vx *= f; q.vy *= f; });
      S.B.vx *= f; S.B.vy *= f; S.T = api.P.T;
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, W = api.W, H = api.H, B = S.B;
      S.t += dt; if (S.wall > 0) S.wall -= dt;
      S.p.forEach(function (q) {
        q.x += q.vx * dt; q.y += q.vy * dt;
        var midWall = S.wall > 0 && P.mode === 'diff';
        if (q.x < rS) { q.x = rS; q.vx = Math.abs(q.vx); }
        if (q.x > W - rS) { q.x = W - rS; q.vx = -Math.abs(q.vx); }
        if (q.y < rS) { q.y = rS; q.vy = Math.abs(q.vy); }
        if (q.y > H - rS) { q.y = H - rS; q.vy = -Math.abs(q.vy); }
        if (midWall) {
          if (q.c === 0 && q.x > W / 2 - rS) { q.x = W / 2 - rS; q.vx = -Math.abs(q.vx); }
          if (q.c === 1 && q.x < W / 2 + rS) { q.x = W / 2 + rS; q.vx = Math.abs(q.vx); }
        }
        if (P.mode === 'brown') {
          var dx = q.x - B.x, dy = q.y - B.y, d = Math.hypot(dx, dy);
          if (d < rS + rB && d > 0) {
            var nx = dx / d, ny = dy / d;
            var rel = (q.vx - B.vx) * nx + (q.vy - B.vy) * ny;
            if (rel < 0) {
              var j = 2 * rel / (1 / mS + 1 / mB);
              q.vx -= j / mS * nx; q.vy -= j / mS * ny;
              B.vx += j / mB * nx; B.vy += j / mB * ny;
            }
            q.x = B.x + nx * (rS + rB); q.y = B.y + ny * (rS + rB);
          }
        }
      });
      if (P.mode === 'brown') {
        B.x += B.vx * dt; B.y += B.vy * dt;
        if (B.x < rB) { B.x = rB; B.vx = Math.abs(B.vx); }
        if (B.x > W - rB) { B.x = W - rB; B.vx = -Math.abs(B.vx); }
        if (B.y < rB) { B.y = rB; B.vy = Math.abs(B.vy); }
        if (B.y > H - rB) { B.y = H - rB; B.vy = -Math.abs(B.vy); }
        var last = B.trail[B.trail.length - 1];
        if (!last || Math.hypot(last[0] - B.x, last[1] - B.y) > 3) { B.trail.push([B.x, B.y]); if (B.trail.length > 600) B.trail.shift(); }
      }
    },
    read: function (api) {
      var S = api.S, P = api.P, W = api.W, right = 0, n0 = 0;
      S.p.forEach(function (q) { if (q.c === 0) { n0++; if (q.x > W / 2) right++; } });
      return { T: P.T, tc: P.T - 273, v: speed(P.T) * 1.25, mix: P.mode === 'diff' ? Math.min(100, right / (n0 / 2) * 100) : null };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      if (P.mode === 'brown' && S.B.trail.length > 1) {
        ctx.save(); ctx.strokeStyle = C.brass; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7; ctx.beginPath();
        S.B.trail.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
        ctx.stroke(); ctx.restore();
      }
      S.p.forEach(function (q) {
        var col = P.mode === 'diff' ? (q.c ? C.red : C.blue) : C.muted;
        D.circle(ctx, q.x, q.y, rS, col);
      });
      if (P.mode === 'brown') D.circle(ctx, S.B.x, S.B.y, rB, C.orange, C.ink, 1.5);
      if (P.mode === 'diff' && S.wall > 0) D.line(ctx, W / 2, 0, W / 2, H, C.ink, 3);
      D.text(ctx, P.mode === 'brown' ? 'Үлкен бөлшекті молекулалар жан-жақтан соғып, ретсіз қозғалтады' : 'Қалқа алынғаннан кейін газдар өздігінен араласады',
        10, 18, { size: 12, bg: C.bg, color: C.ink, weight: '600' });
    },
  });
})();

/* Критикалық масса: уран-235 шарындағы тізбекті реакция. Шар кішкентай болса, нейтрондардың көбі бетінен ұшып шығып, реакция сөнеді (k < 1); радиус критикалықтан үлкен болса, нейтрондар саны көшкін тәрізді өседі (k > 1). Байытудың және шағылдырғыштың әсері. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, keepRunning: true, autoplay: true,
    hint: 'Шардың радиусын біртіндеп арттырып, нейтрондар саны тұрақты болатын (k = 1) критикалық өлшемді тап. Шағылдырғыш қосылғанда критикалық масса қалай өзгереді?',
    controls: [
      { type: 'range', key: 'r', label: 'Шардың радиусы r', min: 2, max: 12, step: 0.5, value: 6, unit: 'см', digits: 1 },
      { type: 'range', key: 'enr', label: 'Уран-235 үлесі (байыту)', min: 20, max: 95, step: 5, value: 90, unit: '%', digits: 0 },
      { type: 'check', key: 'refl', label: 'Нейтрон шағылдырғыш (бериллий)', value: false },
    ],
    readouts: [
      { key: 'm', label: 'Шардың массасы (ρ = 19 г/см³)', unit: 'кг', digits: 1 },
      { key: 'k', label: 'Көбею коэффициенті k', digits: 2 },
      { key: 'N', label: 'Нейтрондар саны', digits: 0 },
      { key: 'st', label: 'Күйі', text: true },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.nn = []; for (var i = 0; i < 6; i++) spawn(S, 0, 0); S.N = 6; S.hist = [[0, 6]]; S.flash = []; S.esc = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P, k = kf(P), rn = P.r / 12; S.t += dt;
      var born = [];
      S.nn.forEach(function (n) {
        n.x += n.vx * dt * 0.25; n.y += n.vy * dt * 0.25; n.life -= dt;
        if (Math.hypot(n.x, n.y) > rn * 0.95) { n.vx = -n.vx; n.vy = -n.vy; }
        if (n.life <= 0) { n.dead = true; if (Math.random() < k / 2.5) { S.flash.push({ x: n.x, y: n.y, a: 1 }); var m = Math.random() < 0.5 ? 2 : 3; for (var j = 0; j < m; j++) born.push([n.x, n.y]); } else S.esc.push({ x: n.x, y: n.y, vx: n.x || 0.01, vy: n.y || 0.01, a: 1 }); }
      });
      S.nn = S.nn.filter(function (n) { return !n.dead; });
      born.forEach(function (b2) { if (S.nn.length < 700) spawn(S, b2[0], b2[1]); });
      if (!S.nn.length) for (var i = 0; i < 3; i++) spawn(S, 0, 0); // сыртқы көз (космостық сәуле, өздігінен бөліну)
      S.flash.forEach(function (f) { f.a -= dt * 3; }); S.flash = S.flash.filter(function (f) { return f.a > 0; });
      S.esc.forEach(function (e) { var l = Math.hypot(e.vx, e.vy); e.x += e.vx / l * dt * 0.6; e.y += e.vy / l * dt * 0.6; e.a -= dt; }); S.esc = S.esc.filter(function (e) { return e.a > 0; }).slice(-200);
      S.N = S.nn.length; if (Math.floor(S.t * 5) > S.hist.length - 1) S.hist.push([S.t, S.N]); if (S.hist.length > 300) S.hist.shift();
    },
    read: function (api) { var P = api.P, S = api.S, k = kf(P); return { m: 4 / 3 * Math.PI * Math.pow(P.r, 3) * 19 / 1000, k: k, N: S.N, st: k < 0.97 ? 'субкритикалық: реакция сөнеді' : k < 1.03 ? 'критикалық: k ≈ 1' : 'аса критикалық: көшкін!' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark(), k = kf(P);
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      var cx = wide ? W * 0.27 : W / 2, cy = wide ? H / 2 : H * 0.28, Rmax = wide ? Math.min(W * 0.22, H * 0.42) : Math.min(W * 0.42, H * 0.24), rp = P.r / 12 * Rmax;
      if (P.refl) { ctx.fillStyle = 'rgba(160,170,180,.35)'; ctx.beginPath(); ctx.arc(cx, cy, rp + 12, 0, 7); ctx.fill(); }
      var g = ctx.createRadialGradient(cx - rp * 0.3, cy - rp * 0.3, 2, cx, cy, rp); g.addColorStop(0, '#9aa38a'); g.addColorStop(1, '#4e5643'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rp, 0, 7); ctx.fill();
      S.flash.forEach(function (f) { var x = cx + f.x * Rmax, y = cy + f.y * Rmax, gg = ctx.createRadialGradient(x, y, 1, x, y, 10); gg.addColorStop(0, 'rgba(255,220,120,' + f.a + ')'); gg.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); });
      S.esc.forEach(function (n) { ctx.fillStyle = 'rgba(111,182,255,' + n.a * 0.6 + ')'; ctx.beginPath(); ctx.arc(cx + n.x * Rmax, cy + n.y * Rmax, 2, 0, 7); ctx.fill(); });
      S.nn.forEach(function (n) { ctx.fillStyle = '#6fb6ff'; ctx.beginPath(); ctx.arc(cx + n.x * Rmax, cy + n.y * Rmax, 2, 0, 7); ctx.fill(); });
      R.tag(ctx, 'U-235, r = ' + P.r + ' см', cx, cy + Rmax + 18, { size: 10.5 });
      // N(t) графигі
      var gx = wide ? W * 0.56 : 50, gy = wide ? 30 : cy + Rmax + 50, gw = wide ? W * 0.4 : W - 66, gh = wide ? H - 80 : H - gy - 46;
      ctx.save(); R.rr(ctx, gx - 44, gy - 16, gw + 56, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var t0 = Math.max(0, S.t - 20), pts = S.hist.filter(function (p) { return p[0] >= t0; });
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: t0, xmax: t0 + 20, ymin: 0, ymax: Math.max(50, Math.max.apply(null, pts.map(function (p) { return p[1]; })) * 1.2), xlabel: 't', ylabel: 'нейтрондар саны', series: [{ pts: pts, color: k > 1.03 ? '#d2382b' : k < 0.97 ? '#1f5fd1' : '#0b8a7a', width: 2.5 }] });
      R.tag(ctx, 'k = ' + k.toFixed(2).replace('.', ','), gx + gw - 40, gy + 14, { size: 12, color: k > 1.03 ? '#b4342a' : '#0b6b78' });
    },
  });
  function spawn(S, x, y) { var a = Math.random() * 6.283; S.nn.push({ x: x, y: y, vx: Math.cos(a), vy: Math.sin(a), life: -0.5 * Math.log(Math.random() + 1e-9) }); }
  // бір топты диффузиялық жуықтау: k = k∞ / (1 + (πM/r_эфф)²); шағылдырғыш тиімді радиусты ≈ 3 см арттырады
  function kf(P) { var kinf = 1 + 1.3 * (P.enr - 15) / 78, re = P.r + (P.refl ? 3 : 0), M = 3.16; return kinf / (1 + Math.pow(Math.PI * M / re, 2)); }
})();

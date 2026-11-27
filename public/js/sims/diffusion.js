/* Диффузия: суық және ыстық суға тамызылған сия. Температура жоғары болған сайын молекулалар жылдам
   қозғалады, сондықтан сия тезірек таралады. Екі стақан қатар салыстырылады. */
(function () {
  var R = window.Real;
  var N = 420;
  function mk(seed) {
    var r = R.rng(seed), a = [];
    for (var i = 0; i < N; i++) a.push({ x: 0.5 + (r() - 0.5) * 0.08, y: 0.12 + r() * 0.08 });
    return a;
  }
  Sim.create({
    aspect: 0.6, grid: false,
    hint: '«Бастау» бас: сия суық және ыстық суда қалай таралады? Уақыт 30 есе жылдамдатылған.',
    controls: [
      { type: 'range', key: 't1', label: 'Сол жақ стақан: су температурасы', min: 2, max: 40, step: 1, value: 10, unit: '°C', digits: 0 },
      { type: 'range', key: 't2', label: 'Оң жақ стақан: су температурасы', min: 40, max: 95, step: 1, value: 80, unit: '°C', digits: 0 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт (нақты)', unit: 'с', digits: 0 },
      { key: 'm1', label: 'Сол жақ: араласу дәрежесі', unit: '%', digits: 0 },
      { key: 'm2', label: 'Оң жақ: араласу дәрежесі', unit: '%', digits: 0 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.a = mk(1); S.b = mk(2); },
    step: function (api, dt) {
      var S = api.S, P = api.P;
      dt = Math.min(isFinite(dt) ? dt : 0, 0.05);
      S.t += dt * 30;
      [[S.a, P.t1], [S.b, P.t2]].forEach(function (pair) {
        var D = 0.0006 * Math.sqrt((pair[1] + 273) / 283) * Math.exp((pair[1] - 10) / 30); // диффузия коэффициенті (салыстырмалы)
        var s = Math.sqrt(2 * D * dt * 30);
        pair[0].forEach(function (m) {
          m.x += (Math.random() - 0.5) * 2.4 * s; m.y += (Math.random() - 0.5) * 2.4 * s + 0.0004 * dt * 30;
          if (m.x < 0.02) m.x = 0.04 - m.x; if (m.x > 0.98) m.x = 1.96 - m.x;
          if (m.y < 0.1) m.y = 0.2 - m.y; if (m.y > 0.98) m.y = 1.96 - m.y;
          // үлкен қадамнан (вкладка қайта ашылғанда) кейін де бөлшек ыдыстан шықпасын
          if (!isFinite(m.x) || !isFinite(m.y)) { m.x = 0.5; m.y = 0.5; }
          m.x = Math.min(0.98, Math.max(0.02, m.x)); m.y = Math.min(0.98, Math.max(0.1, m.y));
        });
      });
      if (S.t > 1800) return false;
    },
    read: function (api) {
      var S = api.S;
      // Араласу дәрежесі: бөлшектердің шашырауы (стандарт ауытқу) толық біркелкі таралудағы мәнмен салыстырылады
      function sd(a, k) { var m = 0, v = 0; a.forEach(function (p) { m += p[k]; }); m /= a.length; a.forEach(function (p) { v += (p[k] - m) * (p[k] - m); }); return Math.sqrt(v / a.length); }
      function mix(a) { return Math.min(100, 100 * Math.sqrt((sd(a, 'x') / 0.277) * (sd(a, 'y') / 0.254))); }
      return { t: S.t, m1: mix(S.a), m2: mix(S.b) };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.88;
      R.scene(ctx, W, H, 'lab', { table: table });
      var bw = Math.min(W * 0.3, 240), bh = table - 70;
      [[W * 0.27, S.a, P.t1], [W * 0.68, S.b, P.t2]].forEach(function (g) {
        var x = g[0] - bw / 2, y = table - bh;
        R.vessel(ctx, x, y, bw, bh, bh * 0.9, { liquid: g[2] > 50 ? 'rgba(140,190,235,1)' : 'water' });
        ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + bh * 0.1, bw - 4, bh * 0.9 - 2); ctx.clip();
        g[1].forEach(function (m) {
          var px = x + m.x * bw, py = y + m.y * bh;
          var gr = ctx.createRadialGradient(px, py, 0, px, py, 7);
          gr.addColorStop(0, 'rgba(70,20,140,.28)'); gr.addColorStop(1, 'rgba(70,20,140,0)');
          ctx.fillStyle = gr; ctx.fillRect(px - 7, py - 7, 14, 14);
        });
        ctx.restore();
        if (g[2] > 50) for (var i = 0; i < 5; i++) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); var sx = x + bw * (0.25 + i * 0.12), sy = y - 10; ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx - 8, sy - 14, sx + 8, sy - 24, sx, sy - 38 - Math.sin(S.t / 20 + i) * 5); ctx.stroke(); }
        R.thermometer(ctx, g[0] + bw / 2 + 26, y + 10, Math.min(bh - 20, 200), g[2], 0, 100, { step: 20 });
        R.tag(ctx, g[2] + ' °C', g[0], y - 52, { size: 12, color: g[2] > 50 ? '#b4342a' : '#1f5fd1' });
      });
    },
  });
})();

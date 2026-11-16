/* Жылу процестерінің қайтымсыздығы: перде алынғанда газдар өздігінен араласады, ыстық пен суық дене
   температураларын теңестіреді. Кері процесс өздігінен ешқашан жүрмейді. */
(function () {
  var R = window.Real;
  var N = 160;
  Sim.create({
    aspect: 0.6, grid: false,
    hint: '«Бастау» бас: перде алынады. Уақытты «кері айналдыруға» тырыс — газдар қайта бөлінбейді.',
    controls: [{ type: 'select', key: 'mode', label: 'Тәжірибе', value: 'mix', options: [['mix', 'Екі газдың араласуы'], ['heat', 'Ыстық және суық газдың жанасуы']] }],
    readouts: [
      { key: 'left', label: 'Сол жақтағы көк бөлшектер', unit: '%', digits: 0 },
      { key: 'tl', label: 'Сол жақтың орташа энергиясы', digits: 2 },
      { key: 'tr', label: 'Оң жақтың орташа энергиясы', digits: 2 },
    ],
    init: function (api) {
      var S = api.S, heat = api.P.mode === 'heat'; S.p = []; S.t = 0;
      for (var i = 0; i < N; i++) {
        var left = i < N / 2, sp = heat ? (left ? 1.6 : 0.5) : 1;
        var a = Math.random() * 7;
        S.p.push({ x: left ? Math.random() * 0.48 : 0.52 + Math.random() * 0.46, y: Math.random(), vx: Math.cos(a) * sp * 0.3, vy: Math.sin(a) * sp * 0.3, c: left ? 0 : 1 });
      }
    },
    step: function (api, dt) {
      var S = api.S; S.t += dt;
      var wall = S.t < 0.6; // перде алғашқы сәтте ғана
      S.p.forEach(function (p) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 0.01) { p.x = 0.01; p.vx = Math.abs(p.vx); } if (p.x > 0.99) { p.x = 0.99; p.vx = -Math.abs(p.vx); }
        if (p.y < 0.01) { p.y = 0.01; p.vy = Math.abs(p.vy); } if (p.y > 0.99) { p.y = 0.99; p.vy = -Math.abs(p.vy); }
        if (wall && Math.abs(p.x - 0.5) < 0.02) p.vx = -p.vx;
      });
      // жұп соқтығыстар (энергия алмасу)
      for (var i = 0; i < S.p.length; i++) for (var j = i + 1; j < S.p.length; j++) {
        var a = S.p[i], b = S.p[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.0004 && d2 > 0) {
          var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) { a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny; }
        }
      }
    },
    read: function (api) {
      var S = api.S, L = S.p.filter(function (p) { return p.x < 0.5; }), Rr = S.p.filter(function (p) { return p.x >= 0.5; });
      var e = function (a) { return a.length ? a.reduce(function (s, p) { return s + p.vx * p.vx + p.vy * p.vy; }, 0) / a.length * 10 : 0; };
      return { left: L.filter(function (p) { return p.c === 0; }).length / (N / 2) * 100, tl: e(L), tr: e(Rr) };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, heat = api.P.mode === 'heat', table = H * 0.9;
      R.scene(ctx, W, H, 'lab', { table: table });
      var bw = Math.min(W * 0.8, 700), bh = table - 60, bx = (W - bw) / 2, by = table - bh - 10;
      R.vessel(ctx, bx, by, bw, bh, 0, {});
      ctx.fillStyle = '#5a6168'; ctx.fillRect(bx - 4, by - 8, bw + 8, 8);
      if (S.t < 0.6) { ctx.fillStyle = 'rgba(90,97,104,' + (1 - S.t / 0.6) + ')'; ctx.fillRect(bx + bw / 2 - 3, by, 6, bh); }
      S.p.forEach(function (p) {
        var sp = Math.hypot(p.vx, p.vy), col = heat ? 'rgb(' + Math.min(255, Math.round(80 + sp * 300)) + ',' + Math.round(110 - Math.min(80, sp * 60)) + ',' + Math.max(60, Math.round(230 - sp * 300)) + ')' : (p.c ? '#e0643a' : '#2f6fd1');
        R.sphere(ctx, bx + p.x * bw, by + p.y * bh, 5, col);
      });
      R.tag(ctx, heat ? 'Энергия ыстық газдан суық газға беріледі — температуралар теңеседі' : 'Газдар өздігінен араласады, бірақ өздігінен бөлінбейді', W / 2, 22, { size: 11.5 });
    },
  });
})();

/* Тізбекті ядролық реакция: уран-235 ядросын нейтрон бөлгенде 2–3 жаңа нейтрон ұшып шығып, ~200 МэВ энергия бөлінеді. */
(function () {
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function build(api) {
    var S = api.S, P = api.P, W = api.W || 640, H = api.H || 400;
    S.nuc = []; S.neu = []; S.fl = []; S.fis = 0; S.abs = 0; S.t = 0; S.hist = [[0, 0]];
    var cols = 15, rows = 9, dx = (W - 80) / cols, dy = (H - 90) / rows;
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var x = 60 + i * dx + rnd(-6, 6), y = 60 + j * dy + rnd(-6, 6);
      var type = Math.random() * 100 < P.enr ? 'u5' : 'u8';
      S.nuc.push({ x: x, y: y, type: type, alive: true });
    }
    // басқарушы (жұтушы) стерженьдер
    S.rods = [];
    for (var r = 0; r < P.rods; r++) S.rods.push(60 + (r + 0.5) * (W - 80) / P.rods);
    S.neu.push({ x: 10, y: H / 2, vx: 160, vy: 0 });
  }
  Sim.create({
    aspect: 0.62, substeps: 4,
    hint: 'Байыту дәрежесі мен басқарушы стерженьдер реакцияның жүрісіне қалай әсер етеді?',
    controls: [
      { type: 'range', key: 'enr', label: 'Уран-235 үлесі (байыту)', min: 5, max: 100, step: 5, value: 60, unit: '%', digits: 0 },
      { type: 'range', key: 'rods', label: 'Басқарушы стерженьдер саны', min: 0, max: 6, step: 1, value: 0, digits: 0 },
    ],
    readouts: [
      { key: 'fis', label: 'Бөлінген ядролар саны', digits: 0 },
      { key: 'neu', label: 'Ұшып жүрген нейтрондар', digits: 0 },
      { key: 'abs', label: 'Жұтылған нейтрондар', digits: 0 },
      { key: 'E', label: 'Бөлінген энергия (≈ 200 МэВ × N)', unit: 'МэВ', digits: 0 },
      { key: 'Ej', label: 'Джоульмен', unit: 'Дж' },
    ],
    onResize: function (api) { if (!api.S.t) { for (var k in api.S) delete api.S[k]; build(api); } },
    init: build,
    step: function (api, dt) {
      var S = api.S, P = api.P, W = api.W, H = api.H;
      S.t += dt;
      var born = [];
      S.neu = S.neu.filter(function (n) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0 || n.x > W || n.y < 0 || n.y > H) return false;
        for (var r = 0; r < S.rods.length; r++) if (Math.abs(n.x - S.rods[r]) < 5 && n.y > 30) { S.abs++; return false; }
        for (var i = 0; i < S.nuc.length; i++) {
          var u = S.nuc[i];
          if (!u.alive || Math.abs(u.x - n.x) > 9 || Math.abs(u.y - n.y) > 9) continue;
          if (u.type === 'u5') {
            u.alive = false; S.fis++; S.fl.push({ x: u.x, y: u.y, t: 0 });
            var k = Math.random() < 0.5 ? 2 : 3;
            for (var j = 0; j < k; j++) { var a = rnd(0, 2 * Math.PI); born.push({ x: u.x, y: u.y, vx: 150 * Math.cos(a), vy: 150 * Math.sin(a) }); }
            return false;
          }
          if (Math.random() < 0.02) { S.abs++; return false; } // уран-238 нейтронды сирек жұтады
        }
        return true;
      });
      S.neu = S.neu.concat(born).slice(0, 600);
      S.fl.forEach(function (f) { f.t += dt * 2; });
      S.fl = S.fl.filter(function (f) { return f.t < 1; });
      if (!S.lh || S.t - S.lh > 0.1) { S.lh = S.t; S.hist.push([S.t, S.fis]); }
      if (!S.neu.length && S.t > 0.5) return false;
    },
    read: function (api) { var S = api.S; return { fis: S.fis, neu: S.neu.length, abs: S.abs, E: S.fis * 200, Ej: S.fis * 200 * 1.602e-13 }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, C = api.C, D = api.D;
      ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, W, H);
      S.rods.forEach(function (x) { ctx.fillStyle = '#5b6470'; ctx.fillRect(x - 4, 30, 8, H - 30); });
      S.nuc.forEach(function (u) {
        if (!u.alive) return;
        D.circle(ctx, u.x, u.y, 8, u.type === 'u5' ? '#e0a33a' : '#56708f', null, 0);
      });
      S.fl.forEach(function (f) {
        var g = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 30 * (0.4 + f.t));
        g.addColorStop(0, 'rgba(255,240,180,' + (1 - f.t) + ')'); g.addColorStop(1, 'rgba(255,120,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 30 * (0.4 + f.t), 0, Math.PI * 2); ctx.fill();
      });
      S.neu.forEach(function (n) { D.circle(ctx, n.x, n.y, 2.6, '#9fe7ff', null, 0, true); });
      D.text(ctx, '● уран-235 (бөлінеді)', 14, 20, { size: 11, color: '#e0a33a', weight: '600' });
      D.text(ctx, '● уран-238', 170, 20, { size: 11, color: '#8fa7c4', weight: '600' });
      D.text(ctx, '· нейтрон', 260, 20, { size: 11, color: '#9fe7ff', weight: '600' });
      if (S.rods.length) D.text(ctx, '▌ басқарушы стержень (нейтронды жұтады)', 340, 20, { size: 11, color: '#aab4c0', weight: '600' });
    },
  });
})();

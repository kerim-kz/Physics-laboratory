/* Термоядролық синтез: токамактағы дейтерий-тритий плазмасы. Ядролар Кулондық тосқауылды жеңу үшін өте жоғары температура керек. D + T → ⁴He + n + 17,6 МэВ. */
(function () {
  var R = window.Real, kB = 8.617e-5; // эВ/К
  function rate(T) { // синтез ықтималдығы (сапалық): Гамов шыңына жуық
    var keV = kB * T * 1e6 / 1000; return Math.exp(-19.94 / Math.cbrt(keV)) * 14600; // T — млн К; 150 млн К-де ~3 реакция/с
  }
  Sim.create({
    aspect: 0.6, grid: false, keepRunning: true, autoplay: true,
    hint: 'Плазманың температурасын арттыр: қай температурадан бастап синтез реакциялары жиі жүре бастайды? Магнит өрісін өшірсе не болады?',
    controls: [
      { type: 'range', key: 'T', label: 'Плазманың температурасы', min: 1, max: 200, step: 1, value: 20, unit: 'млн К', digits: 0, live: true },
      { type: 'check', key: 'B', label: 'Магнит өрісі плазманы ұстап тұр', value: true, live: true },
    ],
    readouts: [
      { key: 'E', label: 'Бөлшектің орташа энергиясы 3/2·kT', unit: 'кэВ', digits: 2 },
      { key: 'n', label: 'Синтез реакциялары (барлығы)', digits: 0 },
      { key: 'W', label: 'Бөлінген энергия', unit: 'МэВ', digits: 1 },
      { key: 'st', label: 'Күй', text: true },
    ],
    init: function (api) {
      var S = api.S, rr = R.rng(5); S.p = []; S.n = 0; S.fl = []; S.neu = []; S.t = 0; S.lost = 0;
      for (var i = 0; i < 70; i++) S.p.push({ a: rr() * 6.283, r: rr() * 0.8, va: (rr() - 0.5), vr: (rr() - 0.5), k: i % 2 ? 'd' : 't' });
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, sp = Math.sqrt(P.T) * 0.12; S.t += dt;
      S.p.forEach(function (q) {
        q.a += q.va * sp * dt * 2; q.r += q.vr * sp * dt * 0.6;
        if (q.r > 0.95) { if (P.B) { q.r = 0.95; q.vr = -Math.abs(q.vr); } else q.gone = true; }
        if (q.r < 0.05) { q.r = 0.05; q.vr = Math.abs(q.vr); }
      });
      var before = S.p.length; S.p = S.p.filter(function (q) { return !q.gone; }); S.lost += before - S.p.length;
      if (Math.random() < rate(P.T) * dt * S.p.length / 70) {
        var d = S.p.find(function (q) { return q.k === 'd'; }), t = S.p.find(function (q) { return q.k === 't'; });
        if (d && t) { S.fl.push({ a: d.a, r: d.r, t: S.t }); S.neu.push({ a: d.a, r: d.r, s: 0 }); S.n++; d.k = 'he'; t.gone = true; S.p = S.p.filter(function (q) { return !q.gone; }); S.p.push({ a: Math.random() * 6.283, r: Math.random() * 0.8, va: Math.random() - 0.5, vr: Math.random() - 0.5, k: Math.random() < 0.5 ? 'd' : 't' }); }
      }
      S.fl = S.fl.filter(function (f) { return S.t - f.t < 0.5; });
      S.neu.forEach(function (q) { q.s += dt * 1.6; }); S.neu = S.neu.filter(function (q) { return q.s < 1; });
      S.p.forEach(function (q) { if (q.k === 'he' && Math.random() < dt * 0.3) { q.k = Math.random() < 0.5 ? 'd' : 't'; } }); // күл (гелий) біртіндеп алмастырылады
    },
    read: function (api) {
      var S = api.S, P = api.P, E = 1.5 * kB * P.T * 1e6 / 1000;
      var st = !P.B && S.lost > 5 ? 'Плазма қабырғаға тиіп суыды — синтез тоқтады' : P.T < 50 ? 'Температура жеткіліксіз: Кулон тосқауылы жеңілмейді' : P.T < 100 ? 'Синтез сирек жүреді' : 'Синтез жиі жүреді (ИТЭР деңгейі ~150 млн К)';
      return { E: E, n: S.n, W: S.n * 17.6, st: st };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S;
      R.scene(ctx, W, H, 'wall', {});
      var cx = W * (W > 640 ? 0.36 : 0.5), cy = H * 0.5, Rx = Math.min(W * 0.26, H * 0.3), Ry = Rx * 1.25;
      // токамак камерасы (D-тәрізді қима) және магнит катушкалары
      for (var i = 0; i < 10; i++) { var a = i / 10 * 6.283; ctx.save(); ctx.translate(cx + Math.cos(a) * Rx * 1.22, cy + Math.sin(a) * Ry * 1.18); ctx.rotate(a); R.block(ctx, -9, -16, 18, 32, 'copper', { depth: 4, shadow: false }); ctx.restore(); }
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, Rx * 1.08, Ry * 1.06, 0, 0, 7); ctx.fillStyle = '#5b636b'; ctx.fill(); ctx.beginPath(); ctx.ellipse(cx, cy, Rx, Ry, 0, 0, 7); ctx.fillStyle = '#0a0d14'; ctx.fill(); ctx.restore();
      // плазма жарқылы
      var hot = Math.min(1, P.T / 150), pg = ctx.createRadialGradient(cx, cy, 5, cx, cy, Rx);
      pg.addColorStop(0, 'rgba(255,' + Math.round(120 + 100 * hot) + ',' + Math.round(200 * hot) + ',' + (0.25 + 0.5 * hot) + ')'); pg.addColorStop(1, 'rgba(200,60,160,0)');
      if (P.B || S.lost < 20) { ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(cx, cy, Rx * 0.92, Ry * 0.92, 0, 0, 7); ctx.fill(); }
      // бөлшектер
      S.p.forEach(function (q) { var x = cx + Math.cos(q.a) * q.r * Rx * 0.92, y = cy + Math.sin(q.a) * q.r * Ry * 0.92; ctx.fillStyle = q.k === 'd' ? '#7fb8ff' : q.k === 't' ? '#ff9f6b' : '#ffe08a'; ctx.beginPath(); ctx.arc(x, y, q.k === 'he' ? 4 : 3, 0, 7); ctx.fill(); });
      S.fl.forEach(function (f) { var x = cx + Math.cos(f.a) * f.r * Rx * 0.92, y = cy + Math.sin(f.a) * f.r * Ry * 0.92, a = 1 - (S.t - f.t) / 0.5; var g = ctx.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, 'rgba(255,255,220,' + a + ')'); g.addColorStop(1, 'rgba(255,255,220,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); });
      S.neu.forEach(function (q) { var rr = q.r + q.s * 1.4, x = cx + Math.cos(q.a) * rr * Rx * 0.92, y = cy + Math.sin(q.a) * rr * Ry * 0.92; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); });
      R.tag(ctx, 'ҚТМ токамагы (Курчатов қ.) — қазақстандық термоядролық қондырғы', W / 2, 20, { size: W < 600 ? 9 : 11 });
      if (W > 640) {
        var lx = W * 0.7, ly = H * 0.3;
        [['#7fb8ff', 'Дейтерий ²H'], ['#ff9f6b', 'Тритий ³H'], ['#ffe08a', 'Гелий ⁴He'], ['#ffffff', 'Нейтрон n (17,6 МэВ-тің 14,1 МэВ-і)']].forEach(function (it, i) { ctx.fillStyle = it[0]; ctx.beginPath(); ctx.arc(lx, ly + i * 24, 5, 0, 7); ctx.fill(); R.txt(ctx, it[1], lx + 12, ly + i * 24, { size: 11, color: R.isDark() ? '#e6ecf0' : '#1b2329', align: 'left' }); });
        R.tag(ctx, '²H + ³H → ⁴He + n + 17,6 МэВ', lx + 90, ly + 120, { size: 12, color: '#b4342a', mono: true });
      }
    },
  });
})();

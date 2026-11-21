/* Резерфорд тәжірибесі: α-бөлшектердің алтын фольгадан шашырауы. Томсон моделінде ауытқу аз, Резерфорд (ядролық) моделінде сирек α-бөлшектер үлкен бұрышқа ауытқиды.
   Кулон итеруі: соқтығысу параметрі b бойынша ауытқу бұрышы tg(θ/2) = d/(2b), d — ең жақын келу қашықтығы (маңдайлай соқтығыста). */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true, autoplay: true,
    hint: 'Резерфорд моделінде α-бөлшектердің көбі фольгадан түзу өтеді, бірақ кейбіреуі кері шашырайды. Томсон моделімен салыстыр.',
    controls: [
      { type: 'select', key: 'model', label: 'Атом моделі', value: 'ruth', options: [['ruth', 'Резерфорд: оң заряд кішкентай ядрода'], ['thom', 'Томсон: оң заряд бүкіл атомға таралған («мейізді кекс»)']] },
      { type: 'select', key: 'view', label: 'Көрініс', value: 'micro', options: [['micro', 'Бір атомның маңы (үлкейтілген)'], ['macro', 'Тәжірибе қондырғысы (ZnS экран)']], live: true },
      { type: 'range', key: 'E', label: 'α-бөлшектердің энергиясы', min: 3, max: 8, step: 0.5, value: 5, unit: 'МэВ', digits: 1 },
    ],
    readouts: [
      { key: 'n', label: 'Барлық тіркелген α', digits: 0 },
      { key: 'n10', label: 'Ауытқуы > 10°', digits: 0 },
      { key: 'n90', label: 'Ауытқуы > 90° (кері шашырау)', digits: 0 },
      { key: 'd', label: 'Ядроға ең жақын келу қашықтығы (алтын)', unit: 'фм', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.p = []; S.n = 0; S.n10 = 0; S.n90 = 0; S.flash = []; S.t = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt;
      var dmin = 1.44 * 2 * 79 / P.E; // фм: d = k·2e·79e / E
      // санау: нақты атомдағыдай (соқтығысу параметрі 0…4000 фм)
      for (var i = 0; i < 6; i++) {
        if (Math.random() < dt * 40) {
          var bfm = Math.random() * 4000 + 1e-3, th = P.model === 'ruth' ? 2 * Math.atan(dmin / (2 * bfm)) : Math.abs(randn()) * 0.01;
          S.n++; var deg = th * 180 / Math.PI; if (deg > 10) S.n10++; if (deg > 90) S.n90++;
          S.flash.push({ th: th * (Math.random() < 0.5 ? -1 : 1), t: S.t });
        }
      }
      S.flash = S.flash.filter(function (f) { return S.t - f.t < 0.6; });
      // үлкейтілген көрініс: ядро маңындағы траекториялар (Кулон итеруі, сандық интегралдау)
      var G = S.G; if (!G) return;
      if (Math.random() < dt * 9) S.p.push({ x: -G.cx + 6, y: (Math.random() * 2 - 1) * G.ar * 0.85, vx: G.v0, vy: 0, tr: [] });
      var K = G.d0 * G.v0 * G.v0 / 2, n = 30;
      S.p.forEach(function (q) {
        for (var k = 0; k < n; k++) {
          var h = dt / n, r = Math.hypot(q.x, q.y) || 1e-6, ax, ay;
          if (P.model === 'ruth') { ax = K * q.x / (r * r * r); ay = K * q.y / (r * r * r); }
          else if (r < G.ar) { ax = K * q.x / Math.pow(G.ar, 3) * 0.3; ay = K * q.y / Math.pow(G.ar, 3) * 0.3; } else { ax = 0; ay = 0; }
          q.vx += ax * h; q.vy += ay * h; q.x += q.vx * h; q.y += q.vy * h;
        }
        q.tr.push([q.x, q.y]); if (q.tr.length > 400) q.tr.shift();
      });
      S.p = S.p.filter(function (q) { return Math.abs(q.x) < G.cx + 30 && Math.abs(q.y) < G.cy + 30; });
    },
    read: function (api) { var S = api.S; return { n: S.n, n10: S.n10, n90: S.n90, d: 1.44 * 2 * 79 / api.P.E }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S;
      R.scene(ctx, W, H, 'space', { seed: 2, count: 60 });
      if (P.view === 'macro') return macro(api, ctx, W, H);
      var cx = W / 2, cy = H / 2, ruth = P.model === 'ruth';
      // атом аумағы
      var ar = Math.min(W, H) * 0.42;
      if (!ruth) {
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ar); g.addColorStop(0, 'rgba(255,140,120,.35)'); g.addColorStop(1, 'rgba(255,140,120,.12)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, ar, 0, 7); ctx.fill();
        var rr = R.rng(9); ctx.fillStyle = '#7fb8ff'; for (var i = 0; i < 30; i++) { var a = rr() * 6.28, r = Math.sqrt(rr()) * ar * 0.9; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, 0, 7); ctx.fill(); }
        R.tag(ctx, 'Оң заряд атомның бүкіл көлеміне таралған', cx, cy - ar - 14, { size: 11 });
      } else {
        ctx.strokeStyle = 'rgba(127,184,255,.25)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(cx, cy, ar, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        var ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14); ng.addColorStop(0, '#ffe08a'); ng.addColorStop(1, '#d2382b');
        ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
        R.tag(ctx, 'Ядро (+79e)', cx + 40, cy - 22, { size: 10.5 });
        R.txt(ctx, 'Ядро маңы үлкейтіліп көрсетілген: шын мәнінде ядро атомнан ~100 000 есе кіші, сондықтан кері шашырау өте сирек', cx, H - 14, { size: 9.5, color: '#9fb0bd' });
      }
      // α траекториялары
      S.G = { cx: cx, cy: cy, ar: ar, v0: W * 0.45, d0: 22 * 5 / P.E };
      S.p.forEach(function (q) {
        ctx.strokeStyle = 'rgba(255,214,102,.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
        q.tr.forEach(function (p, i) { if (i) ctx.lineTo(cx + p[0], cy + p[1]); else ctx.moveTo(cx + p[0], cy + p[1]); });
        ctx.stroke();
        ctx.fillStyle = '#ffd666'; ctx.beginPath(); ctx.arc(cx + q.x, cy + q.y, 3, 0, 7); ctx.fill();
      });
      R.tag(ctx, 'α-бөлшектер ағыны →', 80, 22, { size: 10.5, color: '#8a6100' });
    },
  });
  function randn() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random()); }
  function macro(api, ctx, W, H) {
    var P = api.P, S = api.S, cx = W * 0.55, cy = H * 0.52, Rr = Math.min(W * 0.32, H * 0.4);
    // ZnS экран (шеңбер)
    ctx.strokeStyle = 'rgba(160,230,170,.6)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, 7); ctx.stroke();
    R.tag(ctx, 'Мырыш сульфиді (ZnS) экраны', cx - Rr * 0.75, cy + Rr * 0.85, { size: 10.5 });
    // көз (қорғасын блок) және шоқ
    R.block(ctx, W * 0.03, cy - 20, 50, 40, 'lead', { depth: 6 });
    ctx.fillStyle = 'rgba(255,214,102,.5)'; ctx.fillRect(W * 0.03 + 50, cy - 2, cx - W * 0.03 - 50, 4);
    // алтын фольга
    ctx.fillStyle = '#e2b43c'; ctx.fillRect(cx - 2, cy - 28, 4, 56);
    R.tag(ctx, 'Алтын фольга', cx, cy + 46, { size: 10.5 });
    // жарқылдар
    S.flash.forEach(function (f) {
      var a = Math.max(0, 1 - (S.t - f.t) / 0.6), x = cx + Math.cos(-f.th) * Rr, y = cy + Math.sin(-f.th) * Rr;
      var g = ctx.createRadialGradient(x, y, 0, x, y, 10); g.addColorStop(0, 'rgba(200,255,200,' + a + ')'); g.addColorStop(1, 'rgba(200,255,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
    });
    // микроскоп
    R.tag(ctx, 'Жарқылдарды микроскоппен санау', cx + Rr * 0.6, cy + Rr + 20, { size: 10 });
    R.tag(ctx, P.model === 'ruth' ? 'Сирек α кері шашырайды → ядро бар!' : 'Барлық α дерлік түзу өтеді', W / 2, 22, { size: 11.5, color: '#8a6100' });
  }
})();

/* Идеал газдың екі өлшемді моделі. Қысым қабырғаға соқтығысқан бөлшектердің импульсі бойынша өлшенеді. */
(function () {
  var R = window.Real;
  var BOX_H = 0.7;           // ыдыс биіктігі (шартты бірлік)
  var WIN = 4;               // қысымды орташалау терезесі, с (ұзағырақ — флуктуация азырақ)
  function sigma(T) { return 0.25 * Math.sqrt(T / 300); } // жылдамдық құраушысының стандартты ауытқуы
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  // Салыстыру үшін: N = 100, T = 300 К, V = V₀ кезіндегі теориялық қысым = 1 шартты бірлік.
  function pTheory(N, T, V) { return (N * sigma(T) * sigma(T)) / (V * BOX_H) / ((100 * sigma(300) * sigma(300)) / (1 * BOX_H)); }

  Sim.create({
    hint: 'Температураны не көлемді өзгерт: бөлшектердің қабырғаға соғылуы мен қысым қалай өзгереді?',
    grid: false,
    aspect: 0.6,
    autoplay: true,
    keepRunning: true,
    controls: [
      { type: 'range', key: 'N', label: 'Бөлшектер саны N', min: 20, max: 400, step: 10, value: 100, digits: 0 },
      { type: 'range', key: 'T', label: 'Абсолют температура T', min: 100, max: 1000, step: 10, value: 300, unit: 'К', digits: 0, live: true },
      { type: 'range', key: 'V', label: 'Көлем V (V₀ бірлігімен)', min: 0.3, max: 1, step: 0.05, value: 1, digits: 2, live: true },
    ],
    onLive: function (api, key) {
      var S = api.S, P = api.P;
      if (key === 'T') {
        var f = Math.sqrt(P.T / S.T);
        S.ps.forEach(function (p) { p.vx *= f; p.vy *= f; });
        S.T = P.T;
      }
      if (key === 'V') S.ps.forEach(function (p) { if (p.x > P.V) p.x = P.V * Math.random(); });
      S.imp = []; S.t0 = S.t;
    },
    readouts: [
      { key: 'pm', label: 'Өлшенген қысым p', unit: 'шартты бірлік' },
      { key: 'pt', label: 'Теориялық қысым p = nkT', unit: 'шартты бірлік' },
      { key: 'ratio', label: 'pV / (NT) (N=100, T=300 К кезіндегіге қатысты)', digits: 2 },
      { key: 'v', label: 'Орташа квадраттық жылдамдық', unit: 'шартты бірлік', digits: 3 },
    ],
    init: function (api) {
      var S = api.S, P = api.P;
      S.T = P.T; S.t = 0; S.t0 = 0; S.imp = [];
      S.ps = [];
      for (var i = 0; i < P.N; i++) S.ps.push({ x: Math.random() * P.V, y: Math.random() * BOX_H, vx: gauss() * sigma(P.T), vy: gauss() * sigma(P.T) });
      // аз бөлшекте кездейсоқ іріктеудің орташа v²-і T-ге сәйкес келмеуі мүмкін — дәл ⟨v²⟩ = 2σ² болатындай масштабтаймыз
      var v2 = S.ps.reduce(function (a, p) { return a + p.vx * p.vx + p.vy * p.vy; }, 0) / S.ps.length, f = Math.sqrt(2 * sigma(P.T) * sigma(P.T) / v2);
      S.ps.forEach(function (p) { p.vx *= f; p.vy *= f; });
    },
    substeps: 2,
    step: function (api, dt) {
      var S = api.S, P = api.P, imp = 0;
      S.t += dt;
      S.ps.forEach(function (p) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 0) { p.x = -p.x; p.vx = -p.vx; imp += 2 * Math.abs(p.vx); }
        if (p.x > P.V) { p.x = 2 * P.V - p.x; p.vx = -p.vx; imp += 2 * Math.abs(p.vx); }
        if (p.y < 0) { p.y = -p.y; p.vy = -p.vy; imp += 2 * Math.abs(p.vy); }
        if (p.y > BOX_H) { p.y = 2 * BOX_H - p.y; p.vy = -p.vy; imp += 2 * Math.abs(p.vy); }
      });
      S.imp.push([S.t, imp]);
      while (S.imp.length && S.imp[0][0] < S.t - WIN) S.imp.shift();
    },
    read: function (api) {
      var S = api.S, P = api.P;
      var span = Math.min(WIN, S.t - S.t0);
      var total = S.imp.reduce(function (a, r) { return a + r[1]; }, 0);
      // 2D қысым = күш / периметр; салыстыру үшін сол бірлікке келтіреміз.
      var perim = 2 * (P.V + BOX_H);
      var pRaw = span > 1 ? total / span / perim : null;
      var ref = (100 * sigma(300) * sigma(300)) / (1 * BOX_H);
      var pm = pRaw === null ? null : pRaw / ref;
      var v2 = S.ps.reduce(function (a, p) { return a + p.vx * p.vx + p.vy * p.vy; }, 0) / S.ps.length;
      return { pm: pm, pt: pTheory(P.N, P.T, P.V), ratio: pm === null ? null : pm * P.V / (P.N / 100 * P.T / 300), v: Math.sqrt(v2) };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var pad = 30, k = Math.min((W - 2 * pad - 60) / 1, (H - 2 * pad) / BOX_H);
      var ox = pad, oy = pad;
      // ыдыс
      R.scene(ctx, W, H, 'wall');
      // шыны цилиндр, металл поршень
      var gl = ctx.createLinearGradient(0, oy, 0, oy + BOX_H * k); gl.addColorStop(0, 'rgba(200,230,245,.45)'); gl.addColorStop(0.2, 'rgba(255,255,255,.6)'); gl.addColorStop(1, 'rgba(160,200,220,.45)');
      ctx.fillStyle = gl; ctx.fillRect(ox, oy, 1 * k, BOX_H * k);
      ctx.strokeStyle = 'rgba(80,120,140,.85)'; ctx.lineWidth = 3; ctx.strokeRect(ox, oy, 1 * k, BOX_H * k);
      R.block(ctx, ox + P.V * k, oy + 2, 12, BOX_H * k - 4, 'steel', { depth: 0, shadow: false });
      var rod = ctx.createLinearGradient(0, oy + BOX_H * k / 2 - 4, 0, oy + BOX_H * k / 2 + 4); rod.addColorStop(0, '#9aa3ab'); rod.addColorStop(0.5, '#eef1f3'); rod.addColorStop(1, '#6c757d');
      ctx.fillStyle = rod; ctx.fillRect(ox + P.V * k + 12, oy + BOX_H * k / 2 - 4, (1 - P.V) * k + 40, 8);
      // бөлшектер (жылдамдыққа қарай түс)
      var s = sigma(P.T);
      S.ps.forEach(function (p) {
        var sp = Math.hypot(p.vx, p.vy) / (s * 2.2);
        R.sphere(ctx, ox + p.x * k, oy + p.y * k, 3.6, sp > 1 ? '#d2382b' : sp > 0.55 ? '#e0861f' : '#2f6fd1');
      });
      D.text(ctx, 'V = ' + api.fmt(P.V, 2) + ' V₀', ox + 6, oy + BOX_H * k + 18, { size: 12, mono: true, color: C.muted });
      D.text(ctx, 'T = ' + P.T + ' К', ox + 120, oy + BOX_H * k + 18, { size: 12, mono: true, color: C.muted });
      D.text(ctx, 'көк — баяу, қызғылт сары — орташа, қызыл — жылдам бөлшектер', W - pad, oy + BOX_H * k + 18, { size: 11, align: 'right', color: C.muted });
    },
  });
})();

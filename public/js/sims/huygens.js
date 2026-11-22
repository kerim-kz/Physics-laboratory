/* Гюйгенс принципі: толқын майданының әр нүктесі екінші реттік толқындардың көзі. Шағылу және сыну заңдарын толқын майданын тұрғызу арқылы қорыту. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.0, grid: false, keepRunning: true, autoplay: true,
    hint: 'Жазық толқын майданы шекараға көлбеу түседі. Шекараның әр нүктесіне толқын жеткенде, ол жерден екінші реттік толқын шығады. Олардың ортақ жанамасы — жаңа толқын майданы.',
    controls: [
      { type: 'select', key: 'mode', label: 'Құбылыс', value: 'refl', options: [['refl', 'Шағылу'], ['refr', 'Сыну']], live: true },
      { type: 'range', key: 'a', label: 'Түсу бұрышы α', min: 10, max: 70, step: 5, value: 40, unit: '°', digits: 0, live: true },
      { type: 'range', key: 'n', label: 'Екінші ортаның салыстырмалы сыну көрсеткіші n', min: 1, max: 2.4, step: 0.1, value: 1.5, digits: 1, live: true },
    ],
    readouts: [
      { key: 'b', label: 'Шағылу / сыну бұрышы', unit: '°', digits: 1 },
      { key: 'v', label: 'Жылдамдықтар қатынасы v₁/v₂ = n', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t = (api.S.t + dt * 0.25) % 1.4; },
    read: function (api) { var P = api.P, a = P.a * Math.PI / 180; return { b: P.mode === 'refl' ? P.a : Math.asin(Math.sin(a) / P.n) * 180 / Math.PI, v: P.n }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, a = P.a * Math.PI / 180, yb = H * 0.55, x0 = W * 0.22, x1 = W * 0.78, L = x1 - x0, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      ctx.fillStyle = P.mode === 'refl' ? 'rgba(150,160,170,.55)' : 'rgba(120,180,230,' + (0.15 + (P.n - 1) * 0.2) + ')'; ctx.fillRect(0, yb, W, H - yb);
      ctx.strokeStyle = dark ? '#ddd' : '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, yb); ctx.lineTo(W, yb); ctx.stroke();
      R.txt(ctx, P.mode === 'refl' ? 'айна' : 'n₂ (баяу орта)', W - 70, yb + 18, { size: 11, color: '#5b6670' });
      // толқын майданы AB: A шекараға жеткенде B әлі CB = L sin α қашықтықта. Уақыт параметрі u ∈ [0,1]: B шекараға жетеді.
      var u = Math.min(1, S.t), v1 = L * Math.sin(a); // B нүктесі жүретін жол
      var ux = Math.sin(a), uy = Math.cos(a); // түсетін сәуле бағыты (оңға-төмен)
      // түсетін толқын майдандары (параллель сызықтар)
      ctx.strokeStyle = 'rgba(31,95,209,.85)'; ctx.lineWidth = 2;
      var Ax = x0, Bx0 = x1 - 0, front = function (s) { // s — майданның шекарадан қашықтығы бойынша жылжуы
        // A нүктесі шекарада (x0, yb); майдан бағыты сәулеге перпендикуляр
        var cx = x0 + ux * s, cy = yb + uy * s; return [[cx - uy * 400, cy + ux * 400], [cx + uy * 400, cy - ux * 400]];
      };
      void Ax; void Bx0;
      // түсетін толқын майданының әлі шекараға жетпеген бөлігі: шекарадағы нүктеден (x0 + L·u) B нүктесіне дейін
      var Bx = x1 - ux * v1 * (1 - u), By = yb - uy * v1 * (1 - u);
      if (u < 1) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + L * u, yb); ctx.lineTo(Bx, By); ctx.stroke(); R.tag(ctx, 'түсетін толқын майданы', (x0 + L * u + Bx) / 2 - 40, (yb + By) / 2 - 14, { size: 10, color: '#1f5fd1' }); }
      // сәулелер
      api.D.arrow(ctx, x0 - ux * 160, yb - uy * 160, x0, yb, '#e0a800', 2.2);
      api.D.arrow(ctx, x1 - ux * 160, yb - uy * 160, x1, yb, '#e0a800', 2.2);
      // екінші реттік толқындар: шекараның әр нүктесіне толқын жеткен сәттен бастап өседі
      var n = P.mode === 'refl' ? 1 : P.n, tang = [];
      for (var i = 0; i <= 6; i++) {
        var px = x0 + L * i / 6, arrive = (i / 6), r = Math.max(0, (u - arrive)) * v1 / n;
        if (r <= 0) continue;
        ctx.strokeStyle = 'rgba(210,56,43,.7)'; ctx.lineWidth = 1.4; ctx.beginPath();
        if (P.mode === 'refl') ctx.arc(px, yb, r, Math.PI, 2 * Math.PI); else ctx.arc(px, yb, r, 0, Math.PI);
        ctx.stroke(); R.sphere(ctx, px, yb, 3, '#d2382b');
        tang.push([px, r]);
      }
      // жаңа толқын майданы (жанама) және шағылған/сынған сәуле
      var b = P.mode === 'refl' ? a : Math.asin(Math.sin(a) / P.n);
      if (u > 0.05) {
        var Bx2 = x0 + L * u, rA = u * v1 / n, sgn = P.mode === 'refl' ? -1 : 1;
        var tx = x0 + rA * Math.sin(b), ty = yb + sgn * rA * Math.cos(b);
        ctx.strokeStyle = '#0b8a7a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(Bx2, yb); ctx.stroke();
        api.D.arrow(ctx, x0, yb, x0 + Math.sin(b) * 170, yb + sgn * Math.cos(b) * 170, '#0b8a7a', 2.4, P.mode === 'refl' ? 'шағылған' : 'сынған');
        R.tag(ctx, 'жаңа толқын майданы', (tx + Bx2) / 2, (ty + yb) / 2 + sgn * 18, { size: 10, color: '#0b6b78' });
      }
      // нормаль және бұрыштар
      ctx.strokeStyle = 'rgba(90,100,110,.7)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x0, yb - 150); ctx.lineTo(x0, yb + 150); ctx.stroke(); ctx.setLineDash([]);
      R.tag(ctx, 'α = ' + P.a + '°', x0 - 50, yb - 60, { size: 11, color: '#b4560f' });
      R.tag(ctx, (P.mode === 'refl' ? 'γ = ' : 'β = ') + (b * 180 / Math.PI).toFixed(1).replace('.', ',') + '°', x0 + 56, yb + (P.mode === 'refl' ? -60 : 60), { size: 11, color: '#0b6b78' });
      R.tag(ctx, P.mode === 'refl' ? 'Шағылу заңы: γ = α' : 'Сыну заңы: sin α / sin β = v₁/v₂ = n', W / 2, 20, { size: W < 600 ? 10 : 12, color: '#0b3f4a' });
    },
  });
})();

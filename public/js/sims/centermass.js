/* №8 зертханалық жұмыс: жазық фигураның массалар центрін ілу әдісімен анықтау.
   Фигураны бір тесігінен ілгенде, массалар центрі ілу нүктесі арқылы өтетін тік сызықта (тіктеуіште) жатады. */
(function () {
  var R = window.Real;
  // Фигуралар (пішіні — көпбұрыш, бірлік: px шамасы 1); тесіктер — шетіндегі нүктелер
  var SHAPES = {
    l: { name: 'Г тәрізді пластина', pts: [[0, 0], [60, 0], [60, 120], [140, 120], [140, 170], [0, 170]], holes: [[10, 10], [130, 160], [50, 10]] },
    tri: { name: 'Үшбұрыш', pts: [[0, 170], [160, 170], [40, 0]], holes: [[42, 14], [150, 162], [8, 160]] },
    blob: { name: 'Дұрыс емес пішін (Қазақстан картасына ұқсас)', pts: [[0, 60], [40, 20], [110, 30], [170, 0], [230, 40], [260, 110], [200, 150], [120, 140], [60, 160], [10, 120]], holes: [[45, 28], [250, 105], [70, 150]] },
  };
  // Көпбұрыштың ауданы мен массалар центрі
  function centroid(p) {
    var A = 0, cx = 0, cy = 0;
    for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length], c = a[0] * b[1] - b[0] * a[1]; A += c; cx += (a[0] + b[0]) * c; cy += (a[1] + b[1]) * c; }
    A /= 2; return [cx / (6 * A), cy / (6 * A)];
  }
  Sim.create({
    aspect: 0.62, grid: false, autoplay: true, keepRunning: true,
    hint: 'Фигураны әр тесігінен іліп, тіктеуіш сызығын белгіле. Сызықтардың қиылысы — массалар центрі.',
    controls: [
      { type: 'select', key: 'shape', label: 'Фигура', value: 'l', options: Object.keys(SHAPES).map(function (k) { return [k, SHAPES[k].name]; }) },
      { type: 'select', key: 'hole', label: 'Ілу тесігі', value: '0', options: [['0', 'A'], ['1', 'B'], ['2', 'C']], live: true },
      { type: 'check', key: 'cm', label: 'Массалар центрін көрсету', value: false, live: true },
    ],
    buttons: [{ label: 'Сызықты белгілеу', onClick: function (api) { var S = api.S; if (S.lines.indexOf(api.P.hole) < 0) S.lines.push(api.P.hole); } }],
    readouts: [
      { key: 'n', label: 'Белгіленген сызықтар', digits: 0 },
      { key: 'st', label: 'Күйі', text: true },
    ],
    init: function (api) { var S = api.S; S.lines = []; S.ang = 0.6; S.om = 0; },
    onLive: function (api, key) { if (key === 'hole') { api.S.ang = 0.7; api.S.om = 0; } },
    step: function (api, dt) {
      var S = api.S, sh = SHAPES[api.P.shape], h = sh.holes[+api.P.hole], c = centroid(sh.pts);
      // тепе-теңдік бұрышы: массалар центрі ілу нүктесінің дәл астында
      var eq = Math.atan2(c[0] - h[0], c[1] - h[1]);
      var target = eq; // массалар центрі ілу нүктесінің дәл астына келеді
      S.om += ((target - S.ang) * 18 - S.om * 2.2) * dt; S.ang += S.om * dt;
    },
    read: function (api) { var n = api.S.lines.length; return { n: n, st: n < 2 ? 'кемінде екі сызық керек' : 'массалар центрі — сызықтардың қиылысында' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, sh = SHAPES[P.shape], c = centroid(sh.pts), k = Math.min(W, H) / 330;
      R.scene(ctx, W, H, 'wall');
      var px = W * 0.45, py = 60; // ілгек (шеге)
      var hole = sh.holes[+P.hole];
      // фигураны ілу нүктесі айналасында бұру
      var T = function (p, ang) { var dx = (p[0] - hole[0]) * k, dy = (p[1] - hole[1]) * k, c2 = Math.cos(ang), s2 = Math.sin(ang); return [px + dx * c2 - dy * s2, py + dx * s2 + dy * c2]; };
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      ctx.beginPath(); sh.pts.forEach(function (p, i) { var q = T(p, S.ang); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath();
      ctx.fillStyle = '#d9b47a'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); sh.pts.forEach(function (p, i) { var q = T(p, S.ang); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.clip();
      var bb = 600; R.paintFace(ctx, px - bb, py - bb, bb * 2, bb * 2, 'pine', 0); ctx.restore();
      // белгіленген сызықтар (фигурамен бірге бұрылады)
      var names = ['A', 'B', 'C'];
      S.lines.forEach(function (hi) {
        var h2 = sh.holes[+hi], dir = [c[0] - h2[0], c[1] - h2[1]], L = Math.hypot(dir[0], dir[1]);
        var a = [h2[0] - dir[0] / L * 20, h2[1] - dir[1] / L * 20], b = [h2[0] + dir[0] / L * 400, h2[1] + dir[1] / L * 400];
        var qa = T(a, S.ang), qb = T(b, S.ang);
        ctx.save(); ctx.beginPath(); sh.pts.forEach(function (p, i) { var q = T(p, S.ang); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.clip();
        ctx.strokeStyle = '#1f3fa8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(qa[0], qa[1]); ctx.lineTo(qb[0], qb[1]); ctx.stroke(); ctx.restore();
      });
      sh.holes.forEach(function (h3, i) { var q = T(h3, S.ang); ctx.fillStyle = '#3a2a14'; ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 7); ctx.fill(); R.txt(ctx, names[i], q[0] + 12, q[1] + 10, { size: 11, color: '#3a2a14' }); });
      // тіктеуіш
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, H - 60); ctx.stroke();
      ctx.save(); ctx.fillStyle = '#7a5a2a'; ctx.beginPath(); ctx.moveTo(px - 8, H - 60); ctx.lineTo(px + 8, H - 60); ctx.lineTo(px, H - 40); ctx.closePath(); ctx.fill(); ctx.restore();
      R.sphere(ctx, px, py, 6, '#9aa3ab');
      if (P.cm || S.lines.length >= 2) { var q = T(c, S.ang); R.sphere(ctx, q[0], q[1], 6, '#d2382b'); R.tag(ctx, 'массалар центрі', q[0] + 64, q[1], { size: 10.5, color: '#b4342a' }); }
    },
  });
})();

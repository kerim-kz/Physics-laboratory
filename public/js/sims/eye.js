/* Көз — оптикалық жүйе. Қалыпты көз, жақыннан көргіштік (миопия) және алыстан көргіштік (гиперметропия),
   оларды шашыратқыш және жинағыш линзалы көзілдірікпен түзету. Аккомодация. */
(function () {
  var R = window.Real;
  // L — көз алмасының эффективті ұзындығы (м), D0 — бұлшықет босаңсыған кездегі оптикалық күш, A — аккомодация қоры
  var EYES = { normal: ['Қалыпты көз', 1 / 60, 60, 4], myopia: ['Жақыннан көргіштік (миопия)', 1 / 57, 60, 4], hyper: ['Алыстан көргіштік (гиперметропия)', 1 / 63, 60, 4] };
  function calc(P) {
    var e = EYES[P.eye], L = e[1], d = P.dist === 'far' ? 1e9 : 0.25, Dg = P.glasses ? +P.Dg : 0;
    var need = 1 / L + 1 / d - Dg, De = Math.max(e[2], Math.min(e[2] + e[3], need));
    var Dt = De + Dg - 1 / d, f = 1 / Dt;
    return { L: L, f: f, De: De, sharp: Math.abs(f - L) < 0.0002 };
  }
  Sim.create({
    aspect: 0.56, grid: false, static: true, resetLabel: false,
    hint: 'Көз түрін және нәрсенің қашықтығын таңда. Сәулелер торқабықта жинала ма? Қажет болса көзілдірік кигіз.',
    controls: [
      { type: 'select', key: 'eye', label: 'Көз', value: 'myopia', options: Object.keys(EYES).map(function (k) { return [k, EYES[k][0]]; }) },
      { type: 'select', key: 'dist', label: 'Нәрсе', value: 'far', options: [['far', 'Алыста (тақта, жол белгісі)'], ['near', 'Жақын (кітап, 25 см)']] },
      { type: 'check', key: 'glasses', label: 'Көзілдірік кию', value: false },
      { type: 'range', key: 'Dg', label: 'Көзілдірік линзасының оптикалық күші', min: -6, max: 6, step: 0.5, value: -3, unit: 'дптр' },
    ],
    readouts: [
      { key: 'De', label: 'Көз линзасының оптикалық күші', unit: 'дптр', digits: 1 },
      { key: 'f', label: 'Кескін көз бұршағынан', unit: 'мм', digits: 2 },
      { key: 'L', label: 'Торқабыққа дейін', unit: 'мм', digits: 2 },
      { key: 'st', label: 'Кескін', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var c = calc(api.P); return { De: c.De, f: c.f * 1000, L: c.L * 1000, st: c.sharp ? 'торқабықта — анық' : c.f < c.L ? 'торқабықтың алдында — бұлыңғыр' : 'торқабықтың артында — бұлыңғыр' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, c = calc(P), cy = H * 0.5;
      R.scene(ctx, W, H, 'wall');
      var lensX = W * 0.5, k = (W * 0.38) / 0.018; // 1 м → px (көз масштабы)
      var Lpx = c.L * k, fpx = c.f * k;
      // көз алмасы
      ctx.save();
      var eg = ctx.createRadialGradient(lensX + Lpx * 0.45, cy - 20, 20, lensX + Lpx * 0.5, cy, Lpx * 0.62);
      eg.addColorStop(0, '#fff7f2'); eg.addColorStop(1, '#efd6cf');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(lensX + Lpx * 0.5 - 6, cy, Lpx * 0.56, H * 0.36, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c9a6a0'; ctx.lineWidth = 3; ctx.stroke();
      // торқабық
      ctx.strokeStyle = '#c0504a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(lensX + Lpx * 0.5 - 6, cy, Lpx * 0.56, H * 0.36, 0, -0.9, 0.9); ctx.stroke();
      // мөлдір қабық пен көз бұршағы
      ctx.fillStyle = 'rgba(160,200,230,.35)'; ctx.beginPath(); ctx.ellipse(lensX - 10, cy, 26, H * 0.22, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill();
      var th = 10 + (c.De - 60) * 3;
      ctx.fillStyle = 'rgba(210,230,250,.85)'; ctx.beginPath(); ctx.ellipse(lensX, cy, th, H * 0.13, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(120,150,180,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      // көзілдірік
      var gx = lensX - 90;
      if (P.glasses) {
        var conv = +P.Dg > 0, hh = H * 0.24;
        ctx.save(); ctx.fillStyle = 'rgba(190,225,245,.6)'; ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 2;
        ctx.beginPath();
        if (conv) ctx.ellipse(gx, cy, 9, hh, 0, 0, 7);
        else { ctx.moveTo(gx - 10, cy - hh); ctx.lineTo(gx + 10, cy - hh); ctx.quadraticCurveTo(gx + 2, cy, gx + 10, cy + hh); ctx.lineTo(gx - 10, cy + hh); ctx.quadraticCurveTo(gx - 2, cy, gx - 10, cy - hh); }
        ctx.fill(); ctx.stroke(); ctx.restore();
        R.tag(ctx, (conv ? '+' : '') + Sim.fmt(+P.Dg, 1) + ' дптр', gx, cy - hh - 16, { size: 10.5 });
      }
      // сәулелер
      var ys = [-H * 0.11, -H * 0.05, H * 0.05, H * 0.11];
      ctx.save(); ctx.strokeStyle = 'rgba(230,160,30,.9)'; ctx.lineWidth = 1.6;
      ys.forEach(function (y0) {
        var startX = 10, sy = P.dist === 'far' ? cy + y0 : cy + y0 * 0.25, y1 = cy + y0;
        ctx.beginPath(); ctx.moveTo(startX, sy); ctx.lineTo(lensX, y1);
        // көз ішінде: фокусқа қарай түзу, торқабыққа дейін
        var endX = lensX + Lpx * 0.98, t = (endX - lensX) / fpx, ey = y1 + (cy - y1) * t;
        ctx.lineTo(endX, ey); ctx.stroke();
      });
      ctx.restore();
      // фокус нүктесі
      ctx.fillStyle = c.sharp ? '#1d7a45' : '#d2382b'; ctx.beginPath(); ctx.arc(lensX + fpx, cy, 4, 0, 7); ctx.fill();
      // бұлыңғыр кескін (торқабықтағы дақ)
      var blur = Math.abs(1 - Lpx / fpx) * H * 0.11 * 2;
      ctx.fillStyle = 'rgba(230,160,30,.35)'; ctx.beginPath(); ctx.ellipse(lensX + Lpx * 0.98, cy, 4, Math.max(3, blur), 0, 0, 7); ctx.fill();
      R.txt(ctx, P.dist === 'far' ? 'алыстағы нәрседен' : 'жақын нәрседен (25 см)', 70, cy - H * 0.2, { size: 10.5, color: '#333' });
      R.tag(ctx, c.sharp ? 'Анық көреді' : c.f < c.L ? 'Бұлыңғыр: кескін торқабықтың алдында' : 'Бұлыңғыр: кескін торқабықтың артында', W / 2, H - 18, { size: 12, color: c.sharp ? '#1d7a45' : '#b4342a' });
    },
  });
})();

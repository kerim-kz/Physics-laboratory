/* Ламинарлы және турбулентті ағыс: шыны құбырдағы суға бояу ағызылады (Рейнольдс тәжірибесі). Re = ρvd/η. */
(function () {
  var R = window.Real;
  var LIQ = { water: ['Су (20 °C)', 1000, 0.001], oil: ['Күнбағыс майы', 920, 0.05], glyc: ['Глицерин', 1260, 1.4] };
  function Re(P) { var L = LIQ[P.liq]; return L[1] * (P.v / 100) * (P.d / 1000) / L[2]; }
  Sim.create({
    aspect: 0.56, grid: false, keepRunning: true, autoplay: true,
    hint: 'Ағын жылдамдығын біртіндеп арттыр. Бояу ағыны қай кезде шашырап, иірімдер пайда болады? Рейнольдс санына қара.',
    controls: [
      { type: 'select', key: 'liq', label: 'Сұйық', value: 'water', options: Object.keys(LIQ).map(function (k) { return [k, LIQ[k][0]]; }), live: true },
      { type: 'range', key: 'v', label: 'Ағын жылдамдығы v', min: 1, max: 30, step: 1, value: 4, unit: 'см/с', digits: 0, live: true },
      { type: 'range', key: 'd', label: 'Құбырдың диаметрі d', min: 10, max: 40, step: 5, value: 20, unit: 'мм', digits: 0, live: true },
    ],
    readouts: [
      { key: 'Re', label: 'Рейнольдс саны Re = ρvd/η', digits: 0 },
      { key: 'kind', label: 'Ағыс түрі', text: true },
    ],
    init: function (api) { api.S.t = 0; api.S.p = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P, re = Re(P), turb = Math.max(0, Math.min(1, (re - 2000) / 2000));
      S.t += dt;
      for (var i = 0; i < 3; i++) S.p.push({ x: 0, y: 0, vy: 0, age: 0 });
      S.p.forEach(function (q) {
        var prof = 1 - Math.pow(q.y, 2); // параболалық профиль
        q.x += (0.07 + 0.55 * P.v / 30) * dt * (0.4 + prof) * (1 - turb * 0.3);
        if (turb > 0) { q.vy += (Math.random() - 0.5) * turb * 60 * dt; q.vy *= 0.9; q.y += q.vy * dt + Math.sin(q.x * 25 + S.t * 3) * turb * 0.01; }
        q.y = Math.max(-0.95, Math.min(0.95, q.y)); q.age += dt;
      });
      S.p = S.p.filter(function (q) { return q.x < 1; }).slice(-2400);
    },
    read: function (api) { var re = Re(api.P); return { Re: re, kind: re < 2000 ? 'ламинарлы (қабатты)' : re < 4000 ? 'өтпелі' : 'турбулентті (құйынды)' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.88;
      R.scene(ctx, W, H, 'lab', { table: table });
      var x0 = Math.max(96, W * 0.1), x1 = W * 0.95, cy = H * 0.45, rr = 10 + P.d * Math.min(1.7, H * 0.0035);
      // бак
      R.vessel(ctx, x0 - 76, cy - 90, 70, 180, 150, { liquid: P.liq === 'oil' ? 'oil' : P.liq === 'glyc' ? 'honey' : 'water' });
      // шыны құбыр
      ctx.fillStyle = P.liq === 'water' ? 'rgba(120,180,230,.35)' : P.liq === 'oil' ? 'rgba(230,200,90,.35)' : 'rgba(230,220,180,.4)';
      ctx.fillRect(x0, cy - rr, x1 - x0, rr * 2);
      ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2; ctx.strokeRect(x0, cy - rr, x1 - x0, rr * 2);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x0, cy - rr + 3, x1 - x0, 3);
      // бояу ине
      ctx.strokeStyle = '#59616a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 20, cy - rr - 40); ctx.lineTo(x0 + 20, cy - rr); ctx.lineTo(x0 + 30, cy); ctx.stroke();
      // бояу бөлшектері
      ctx.fillStyle = 'rgba(200,30,40,.55)';
      S.p.forEach(function (q) { var x = x0 + 30 + q.x * (x1 - x0 - 30), y = cy + q.y * (rr - 3); ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); });
      // жылдамдық профилі
      var re = Re(P), lam = re < 2000;
      var px = x1 - 80;
      ctx.strokeStyle = '#1f5fd1'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (var j = -10; j <= 10; j++) { var yy = j / 10, u = lam ? 1 - yy * yy : Math.min(1, 1.15 * (1 - Math.pow(Math.abs(yy), 6))); var X = px + u * 50, Y = cy + yy * (rr - 2); if (j === -10) ctx.moveTo(px, Y); ctx.lineTo(X, Y); }
      ctx.stroke(); ctx.beginPath(); ctx.moveTo(px, cy - rr); ctx.lineTo(px, cy + rr); ctx.stroke();
      R.tag(ctx, 'Жылдамдық профилі', px + 25, cy + rr + 18, { size: 10 });
      R.tag(ctx, 'Re = ' + Math.round(re) + ' → ' + (re < 2000 ? 'ламинарлы ағыс' : re < 4000 ? 'өтпелі режим' : 'турбулентті ағыс'), W / 2, 24, { size: 12.5, color: re < 2000 ? '#0b6b78' : '#b4342a' });
    },
  });
})();

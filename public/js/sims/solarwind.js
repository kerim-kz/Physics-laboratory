/* Күн — Жер байланыстары: күн желі (зарядталған бөлшектер ағыны) Жердің магнитосферасымен әрекеттеседі. Бөлшектер магнит өрісінің сызықтары бойымен полюстерге түсіп, полярлық шұғыла тудырады. Күн белсенділігінің әсері. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.0, grid: false, keepRunning: true, autoplay: true,
    hint: 'Күн белсенділігін арттыр: күн желі күшейіп, магнитосфера сығылады, полярлық шұғыла жарқырай түседі. Жердің магнит өрісі болмаса не болар еді?',
    controls: [
      { type: 'range', key: 'act', label: 'Күн белсенділігі (жарқылдар)', min: 0.1, max: 1, step: 0.05, value: 0.4, digits: 2 },
      { type: 'check', key: 'mag', label: 'Жердің магнит өрісі', value: true, live: true },
    ],
    readouts: [
      { key: 'v', label: 'Күн желінің жылдамдығы', unit: 'км/с', digits: 0 },
      { key: 'rm', label: 'Магнитопаузаға дейін', unit: 'R⊕', digits: 1 },
      { key: 'kp', label: 'Магниттік дауыл индексі Kp', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; api.S.p = []; api.S.aur = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, W = api.W, H = api.H, ex = W * 0.68, ey = H * 0.5, re = Math.min(W, H) * 0.06, rm = calc(P).rm * re;
      S.t += dt; S.aur = S.aur * Math.pow(0.4, dt);
      for (var i = 0; i < 40 * P.act * dt * 10; i++) S.p.push({ x: 0, y: Math.random() * H, vx: (200 + 400 * P.act) * (0.8 + Math.random() * 0.4), vy: 0, q: Math.random() < 0.5 ? 1 : -1, cap: false });
      S.p.forEach(function (p) {
        if (p.cap) { p.th += dt * 2; var r = p.L * Math.pow(Math.sin(p.th), 2); p.x = ex + r * Math.cos(p.th) * p.side; p.y = ey - r * Math.sin(p.th) * (p.hem); if (r < re * 1.05) { p.dead = true; S.aur += 0.08; } return; }
        var dx = p.x - ex, dy = p.y - ey, d = Math.hypot(dx, dy);
        if (P.mag && d < rm * 1.05 && dx < 0) {
          if (Math.random() < 0.06) { p.cap = true; p.side = -1; p.hem = dy < 0 ? 1 : -1; p.L = d; p.th = Math.PI / 2 - Math.asin(Math.min(1, Math.abs(dy) / d)) * 0; }
          else { var nx = dx / d, ny = dy / d, vn = p.vx * nx + p.vy * ny; p.vx -= 2 * vn * nx * 0.9; p.vy -= 2 * vn * ny * 0.9 + 0; p.vy += ny * 40; }
        }
        if (!P.mag && d < re) { p.dead = true; S.aur += 0.02; }
        p.x += p.vx * dt * 0.6; p.y += p.vy * dt * 0.6; p.vy *= 0.995;
        if (p.x > W + 10 || p.y < -10 || p.y > H + 10) p.dead = true;
      });
      S.p = S.p.filter(function (p) { return !p.dead; }).slice(-900);
    },
    read: function (api) { var c = calc(api.P); return { v: 300 + 600 * api.P.act, rm: api.P.mag ? c.rm : 0, kp: Math.round(api.P.act * 9) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, ex = W * 0.68, ey = H * 0.5, re = Math.min(W, H) * 0.06, rm = calc(P).rm * re;
      R.scene(ctx, W, H, 'space', { count: 160 });
      // Күн
      var sg = ctx.createRadialGradient(-W * 0.1, ey, 10, -W * 0.1, ey, W * 0.32); sg.addColorStop(0, '#fff2c0'); sg.addColorStop(0.5, 'rgba(255,170,60,.9)'); sg.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(-W * 0.1, ey, W * 0.32, 0, 7); ctx.fill();
      if (P.act > 0.6) { ctx.fillStyle = 'rgba(255,200,90,' + (P.act - 0.6) + ')'; ctx.beginPath(); ctx.ellipse(W * 0.17, ey - H * 0.15, 30, 14, -0.4, 0, 7); ctx.fill(); }
      // магнитосфера: дипольдік сызықтар, күн жақта сығылған
      if (P.mag) {
        ctx.strokeStyle = 'rgba(120,180,255,.45)'; ctx.lineWidth = 1.3;
        [1.6, 2.4, 3.4, 4.6, 6].forEach(function (L) {
          [1, -1].forEach(function (side) {
            ctx.beginPath();
            for (var th = 0.15; th <= Math.PI - 0.15; th += 0.03) { var r = L * re * Math.pow(Math.sin(th), 2), comp = side < 0 ? Math.min(1, rm / (L * re)) : 1 + (L > 3 ? (L - 3) * 0.6 : 0); var x = ex + side * r * Math.sin(th) * (side < 0 ? comp : comp), y = ey - r * Math.cos(th); if (th === 0.15) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
            ctx.stroke();
          });
        });
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.ellipse(ex + rm * 0.6, ey, rm * 1.6, rm * 1.25, 0, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke(); ctx.setLineDash([]);
        R.tag(ctx, 'магнитопауза', ex - rm - 10, ey - rm * 1.1, { size: 10 });
      }
      // бөлшектер
      S.p.forEach(function (p) { ctx.fillStyle = p.q > 0 ? 'rgba(255,140,120,.85)' : 'rgba(140,200,255,.85)'; ctx.fillRect(p.x, p.y, 2, 2); });
      // Жер
      var eg = ctx.createRadialGradient(ex - re * 0.3, ey - re * 0.3, 2, ex, ey, re); eg.addColorStop(0, '#6fb6ff'); eg.addColorStop(1, '#1f4f9b'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, re, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(60,160,90,.8)'; ctx.beginPath(); ctx.ellipse(ex - re * 0.2, ey + re * 0.1, re * 0.4, re * 0.3, 0.4, 0, 7); ctx.fill();
      // полярлық шұғыла
      var a = Math.min(1, S.aur);
      if (P.mag && a > 0.02) [-1, 1].forEach(function (h) { var gg = ctx.createRadialGradient(ex, ey + h * re * 0.95, 1, ex, ey + h * re * 0.95, re * 0.9); gg.addColorStop(0, 'rgba(90,255,150,' + a + ')'); gg.addColorStop(1, 'rgba(90,255,150,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(ex, ey + h * re * 0.95, re * 0.9, re * 0.35, 0, 0, 7); ctx.fill(); });
      R.tag(ctx, P.mag ? 'Магнитосфера күн желінен қорғайды; бөлшектер полюстерде шұғыла тудырады' : 'Магнит өрісі жоқ: күн желі атмосфераны «үрлеп» әкетеді (Марс сияқты)', W / 2, 20, { size: W < 600 ? 9.5 : 11.5, color: '#0b3f4a' });
      R.tag(ctx, 'Жер', ex, ey + re + 16, { size: 10 });
    },
  });
  function calc(P) { return { rm: 10 * Math.pow(0.4 / P.act, 1 / 6) * 0.55 }; } // магнитопауза R⊕ (масштабталған)
})();

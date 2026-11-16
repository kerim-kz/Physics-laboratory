/* Паскаль заңы: поршеньді итергенде шардың барлық тесіктерінен су бірдей қысыммен атқылайды. */
(function () {
  var R = window.Real;
  var HOLES = 9;
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Поршеньге түсірілген қысым сұйықтың барлық нүктелеріне өзгеріссіз беріледі — су ағыстары барлық бағытта бірдей.',
    controls: [
      { type: 'range', key: 'F', label: 'Поршеньге түсірілген күш F', min: 0, max: 40, step: 2, value: 20, unit: 'Н', live: true },
      { type: 'select', key: 'fl', label: 'Шардың ішінде', value: 'water', options: [['water', 'Су'], ['smoke', 'Түтін (газ)']], live: true },
    ],
    readouts: [
      { key: 'S', label: 'Поршень ауданы S', unit: 'см²', digits: 0 },
      { key: 'p', label: 'Қосымша қысым p = F / S', unit: 'кПа', digits: 1 },
      { key: 'eq', label: 'Тесіктердегі қысым', text: true },
    ],
    init: function (api) { api.S.drops = []; api.S.t = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, p = P.F / 0.0012; // поршень ауданы 12 см²
      S.t += dt;
      var v0 = Math.sqrt(2 * p / 1000) * 22; // ағыстың бастапқы жылдамдығы (px/с)
      if (P.F > 0) for (var i = 0; i < HOLES; i++) {
        if (Math.random() < 0.8) {
          var a = Math.PI * 0.15 + i / (HOLES - 1) * Math.PI * 1.7 + Math.PI / 2;
          S.drops.push({ a: a, d: 0, vx: Math.cos(a) * v0 * (0.9 + Math.random() * 0.2), vy: Math.sin(a) * v0 * (0.9 + Math.random() * 0.2), x: 0, y: 0, life: 0 });
        }
      }
      var g = P.fl === 'water' ? 520 : -20;
      S.drops.forEach(function (d) { d.vy += g * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life += dt; });
      S.drops = S.drops.filter(function (d) { return d.life < (P.fl === 'water' ? 1.2 : 1.6); });
    },
    read: function (api) { var p = api.P.F / 0.0012 / 1000; return { S: 12, p: p, eq: api.P.F > 0 ? 'бәрінде бірдей: ' + Sim.fmt(p, 1) + ' кПа' : '—' }; },
    onLive: function () {},
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.92;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.5, cy = H * 0.5, r = Math.min(W, H) * 0.14;
      // ағыстар (шардың артында)
      S.drops.forEach(function (d) {
        var x = cx + Math.cos(d.a) * r + d.x, y = cy + Math.sin(d.a) * r + d.y;
        if (P.fl === 'water') { ctx.fillStyle = 'rgba(70,140,220,' + Math.max(0, 0.8 - d.life * 0.5) + ')'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(160,160,160,' + Math.max(0, 0.35 - d.life * 0.2) + ')'; ctx.beginPath(); ctx.arc(x, y, 4 + d.life * 10, 0, 7); ctx.fill(); }
      });
      // цилиндр мен поршень (сол жақта)
      var tw = 44, tl = W * 0.28, tx = cx - r - tl, ty = cy - tw / 2;
      var gl = ctx.createLinearGradient(0, ty, 0, ty + tw); gl.addColorStop(0, 'rgba(200,230,245,.5)'); gl.addColorStop(0.3, 'rgba(255,255,255,.7)'); gl.addColorStop(1, 'rgba(150,190,210,.5)');
      ctx.fillStyle = gl; ctx.fillRect(tx, ty, tl, tw);
      var push = P.F / 40 * tl * 0.25 + Math.sin(S.t * 3) * 0;
      ctx.fillStyle = P.fl === 'water' ? 'rgba(90,160,225,.55)' : 'rgba(170,170,170,.45)';
      ctx.fillRect(tx + 30 + push, ty + 3, tl - 30 - push, tw - 6);
      R.block(ctx, tx + 18 + push, ty + 2, 14, tw - 4, 'rubber', { depth: 0, shadow: false });
      var rod = ctx.createLinearGradient(0, cy - 4, 0, cy + 4); rod.addColorStop(0, '#9aa3ab'); rod.addColorStop(0.5, '#eef1f3'); rod.addColorStop(1, '#6c757d');
      ctx.fillStyle = rod; ctx.fillRect(tx - 60 + push, cy - 4, 80, 8);
      ctx.fillStyle = '#3a3f45'; R.rr(ctx, tx - 76 + push, cy - 22, 16, 44, 4); ctx.fill();
      if (P.F > 0) R.force(ctx, tx - 140 + push, cy, tx - 80 + push, cy, '#d2382b', 'F');
      // шыны шар
      var g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(0.6, P.fl === 'water' ? 'rgba(110,175,235,.6)' : 'rgba(190,190,190,.55)'); g.addColorStop(1, P.fl === 'water' ? 'rgba(50,110,190,.75)' : 'rgba(120,120,120,.7)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(70,100,120,.7)'; ctx.lineWidth = 2; ctx.stroke();
      for (var i = 0; i < HOLES; i++) {
        var a = Math.PI * 0.15 + i / (HOLES - 1) * Math.PI * 1.7 + Math.PI / 2;
        ctx.fillStyle = '#334'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.4, cy - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, 7); ctx.fill();
    },
  });
})();

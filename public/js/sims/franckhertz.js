/* Франк — Герц тәжірибесі: сынап буы бар түтікте электрондар үдетіледі. Энергиясы 4,9 эВ-қа жеткенде атомдармен серпімсіз соқтығысып, энергиясын жоғалтады — анод тогы күрт кемиді. Атомдағы энергия деңгейлерінің дискреттілігінің дәлелі. */
(function () {
  var R = window.Real, E1 = 4.9;
  function current(U) { // анод тогының сапалық моделі
    var n = Math.floor(U / E1), rem = U - n * E1, base = Math.pow(Math.max(0, U), 1.5) * 0.06;
    var dip = rem < 0.9 && n > 0 ? 1 - 0.75 * (1 - rem / 0.9) : 1;
    return Math.max(0, base * (0.55 + 0.45 * dip) - (U > 0.5 ? 0 : 0));
  }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, keepRunning: true, autoplay: true,
    hint: 'Үдетуші кернеуді арттырып, анод тогының графигін тұрғыз. Ток қай кернеулерде күрт кемиді? Максимумдар арасы неге 4,9 В?',
    controls: [
      { type: 'range', key: 'U', label: 'Үдетуші кернеу U', min: 0, max: 20, step: 0.1, value: 6, unit: 'В', digits: 1, live: true },
    ],
    readouts: [
      { key: 'I', label: 'Анод тогы (салыстырмалы)', digits: 2 },
      { key: 'n', label: 'Бір электронның серпімсіз соқтығысу саны', digits: 0 },
      { key: 'lam', label: 'Қозған атом шығаратын УК сәуле λ = hc/eU', unit: 'нм', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; api.S.e = []; api.S.glow = []; },
    step: function (api, dt) {
      var S = api.S, U = api.P.U; S.t += dt;
      if (Math.random() < dt * 10) S.e.push({ x: 0, E: 0, y: Math.random() });
      S.e.forEach(function (e) { e.x += dt * 0.35; e.E = U * e.x - (e.lost || 0); if (e.E >= E1 && Math.random() < dt * 25) { e.lost = (e.lost || 0) + E1; e.E -= E1; S.glow.push({ x: e.x, y: e.y, a: 1 }); } });
      S.e = S.e.filter(function (e) { return e.x < 1; });
      S.glow.forEach(function (g) { g.a -= dt * 1.5; }); S.glow = S.glow.filter(function (g) { return g.a > 0; });
    },
    read: function (api) { var U = api.P.U; return { I: current(U), n: Math.floor(U / E1), lam: 6.626e-34 * 3e8 / (1.602e-19 * E1) * 1e9 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      // түтік
      var tx = 30, ty = 40, tw = wide ? W * 0.46 : W - 60, th = wide ? H * 0.34 : H * 0.2;
      ctx.save(); R.rr(ctx, tx, ty, tw, th, th / 2); ctx.fillStyle = 'rgba(200,230,245,.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(tx + 14, ty + th * 0.2, 6, th * 0.6); R.txt(ctx, 'катод', tx + 18, ty + th + 12, { size: 9.5, color: '#5b6670' });
      ctx.strokeStyle = '#7d878f'; ctx.lineWidth = 1.5; for (var k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(tx + tw - 40, ty + th * 0.15 + k * th * 0.1); ctx.lineTo(tx + tw - 40, ty + th * 0.2 + k * th * 0.1); ctx.stroke(); }
      R.txt(ctx, 'тор', tx + tw - 40, ty + th + 12, { size: 9.5, color: '#5b6670' });
      ctx.fillStyle = '#59616a'; ctx.fillRect(tx + tw - 18, ty + th * 0.2, 6, th * 0.6); R.txt(ctx, 'анод', tx + tw - 14, ty - 8, { size: 9.5, color: '#5b6670' });
      // сынап атомдары
      var rnd = R.rng(4); for (var a = 0; a < 40; a++) { ctx.fillStyle = 'rgba(150,160,175,.55)'; ctx.beginPath(); ctx.arc(tx + 30 + rnd() * (tw - 80), ty + 8 + rnd() * (th - 16), 4, 0, 7); ctx.fill(); }
      S.glow.forEach(function (g) { var gx = tx + 20 + g.x * (tw - 60), gy = ty + 8 + g.y * (th - 16); var gg = ctx.createRadialGradient(gx, gy, 1, gx, gy, 14); gg.addColorStop(0, 'rgba(190,140,255,' + g.a + ')'); gg.addColorStop(1, 'rgba(190,140,255,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, gy, 14, 0, 7); ctx.fill(); });
      S.e.forEach(function (e) { var ex = tx + 20 + e.x * (tw - 60), ey = ty + 8 + e.y * (th - 16), f = Math.min(1, Math.max(0, e.E) / E1); ctx.fillStyle = 'rgb(' + Math.round(40 + 200 * f) + ',' + Math.round(120 + 60 * f) + ',255)'; ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, 7); ctx.fill(); });
      R.tag(ctx, 'Hg атомы 4,9 эВ энергия алғанда қозады да, УК фотон (253,7 нм) шығарады', tx + tw / 2, ty + th + 32, { size: W < 600 ? 8.5 : 10 });
      // энергия деңгейлері
      if (wide) {
        var lx = tx + 20, ly = ty + th + 60, lh = H - ly - 30;
        ctx.save(); R.rr(ctx, lx - 10, ly - 10, tw * 0.4, lh + 20, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
        [[0, 'E₁ (негізгі)'], [4.9, 'E₂ = E₁ + 4,9 эВ'], [6.7, 'E₃'], [10.4, 'иондану']].forEach(function (q) { var y = ly + lh - q[0] / 10.4 * lh; ctx.strokeStyle = q[0] === 10.4 ? '#b4342a' : '#0b6b78'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + tw * 0.18, y); ctx.stroke(); R.txt(ctx, q[1], lx + tw * 0.2, y, { size: 9.5, align: 'left', color: dark ? '#e6ecf0' : '#33404a' }); });
        api.D.arrow(ctx, lx + tw * 0.09, ly + lh, lx + tw * 0.09, ly + lh - 4.9 / 10.4 * lh, '#7a3fb0', 2);
      }
      // I(U) графигі
      var gx = wide ? W * 0.6 : 50, gy = wide ? 30 : ty + th + 60, gw = wide ? W * 0.36 : W - 66, gh = wide ? H - 80 : H - gy - 46;
      ctx.save(); R.rr(ctx, gx - 44, gy - 16, gw + 56, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var pts = [], done = []; for (var u = 0; u <= 20; u += 0.05) { pts.push([u, current(u)]); if (u <= P.U) done.push([u, current(u)]); }
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 20, ymin: 0, ymax: 5.6, xlabel: 'U, В', ylabel: 'I (анод)', series: [{ pts: pts, color: 'rgba(120,130,140,.35)', dash: [4, 4] }, { pts: done, color: '#d2382b', width: 2.6 }], marker: [P.U, current(P.U)] });
      [4.9, 9.8, 14.7].forEach(function (v) { ctx.strokeStyle = 'rgba(122,63,176,.5)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(o.X(v), gy); ctx.lineTo(o.X(v), gy + gh); ctx.stroke(); ctx.setLineDash([]); });
      R.tag(ctx, 'ΔU = 4,9 В', o.X(7.35), gy + 14, { size: 10, color: '#7a3fb0' });
    },
  });
})();

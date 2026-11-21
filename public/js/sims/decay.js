/* Радиоактивті ыдырау: әр ядро dt уақытта p = 1 − 2^(−dt/T) ықтималдықпен ыдырайды. */
(function () {
  var RL = window.Real, SPR = {};
  // Шар бейнесін бір рет салып, кейін көшіреміз (мыңдаған ядро үшін жылдам).
  function sprite(r, c1, c2) {
    var key = r.toFixed(1) + c1;
    if (SPR[key]) return SPR[key];
    var cv = document.createElement('canvas'), d = Math.ceil(r * 2 + 2); cv.width = cv.height = d;
    var x = cv.getContext('2d'), g = x.createRadialGradient(d / 2 - r * 0.35, d / 2 - r * 0.35, r * 0.1, d / 2, d / 2, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c1); g.addColorStop(1, c2);
    x.fillStyle = g; x.beginPath(); x.arc(d / 2, d / 2, r, 0, 7); x.fill();
    return (SPR[key] = cv);
  }
  Sim.create({
    grid: false,
    aspect: 0.66,
    controls: [
      { type: 'select', key: 'N0', label: 'Бастапқы ядролар саны N₀', value: '400', options: [['100', '100'], ['400', '400'], ['1600', '1600'], ['2500', '2500']] },
      { type: 'range', key: 'T', label: 'Жартылай ыдырау периоды T', min: 1, max: 8, step: 0.5, value: 3, unit: 'с', digits: 1 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'tt', label: 't / T', digits: 2 },
      { key: 'N', label: 'Ыдырамаған ядролар N', digits: 0 },
      { key: 'Nt', label: 'Заң бойынша N₀·2^(−t/T)', digits: 0 },
      { key: 'pct', label: 'N / N₀', unit: '%', digits: 1 },
    ],
    init: function (api) {
      var S = api.S, n = +api.P.N0;
      S.t = 0; S.alive = new Uint8Array(n).fill(1); S.N = n; S.hist = [[0, n]];
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, p = 1 - Math.pow(2, -dt / P.T);
      S.fresh = [];
      for (var i = 0; i < S.alive.length; i++) if (S.alive[i] && Math.random() < p) { S.alive[i] = 0; S.N--; S.fresh.push(i); }
      S.rate = (S.rate || 0) * 0.9 + (S.fresh.length / Math.max(dt, 1e-3)) * 0.1;
      S.t += dt;
      S.hist.push([S.t, S.N]);
      if (S.N === 0 || S.t >= 6 * P.T) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, n = +P.N0;
      return { t: S.t, tt: S.t / P.T, N: S.N, Nt: n * Math.pow(2, -S.t / P.T), pct: S.N / n * 100 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, n = +P.N0, wide = W > 640;
      RL.scene(ctx, W, H, 'lab', { table: H * 0.92 });
      // үлгі салынған қорғасын табақша (жоғарыдан көрініс)
      var gw = Math.min(W * 0.42, H - 70), ox = 24, oy = 34;
      RL.block(ctx, ox - 12, oy - 12, gw + 24, gw + 24, 'lead', { depth: 8 });
      ctx.fillStyle = '#1a1e23'; ctx.fillRect(ox - 2, oy - 2, gw + 4, gw + 4);
      var side = Math.round(Math.sqrt(n)), cell = gw / side, r = Math.max(1.2, cell * 0.42);
      var alive = sprite(r, '#b8f070', '#3f7a1a'), dead = sprite(r, '#8a929a', '#3a4046');
      var rr = RL.rng(n);
      for (var i = 0; i < n; i++) {
        var x = ox + (i % side + 0.5) * cell + (rr() - 0.5) * cell * 0.25, y = oy + (Math.floor(i / side) + 0.5) * cell + (rr() - 0.5) * cell * 0.25;
        ctx.drawImage(S.alive[i] ? alive : dead, x - r - 1, y - r - 1);
      }
      // жаңа ыдыраулар: жарқыл
      (S.fresh || []).forEach(function (i) {
        var x = ox + (i % side + 0.5) * cell, y = oy + (Math.floor(i / side) + 0.5) * cell;
        var g = ctx.createRadialGradient(x, y, 0, x, y, cell * 1.6 + 4); g.addColorStop(0, 'rgba(255,250,200,.9)'); g.addColorStop(1, 'rgba(255,250,200,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, cell * 1.6 + 4, 0, 7); ctx.fill();
      });
      RL.tag(ctx, wide ? 'Радиоактивті үлгі: жасыл — ыдырамаған, сұр — ыдыраған ядролар' : 'жасыл — ыдырамаған', ox + gw / 2, oy - 24, { size: wide ? 10.5 : 9 });
      // Гейгер санағышы
      var rate = S.rate || 0;
      if (wide) {
        RL.cylinder(ctx, ox + gw + 26, oy + 10, 18, gw * 0.7, 'aluminum', { shadow: false });
        RL.lcd(ctx, ox + gw + 6, oy + gw * 0.7 + 30, 70, 26, Math.round(rate) + ' /с', { size: 12, bg: (S.fresh || []).length ? '#e9f7c0' : '#b8d0a0' });
        RL.txt(ctx, 'Санағыш', ox + gw + 40, oy + gw * 0.7 + 68, { size: 10, color: RL.isDark() ? '#c9d2d9' : '#3a4148' });
      }
      var theory = [];
      for (var t = 0; t <= 6 * P.T; t += P.T / 20) theory.push([t, n * Math.pow(2, -t / P.T)]);
      var px = ox + gw + (wide ? 120 : 60), py = 30, pw = W - px - 20, ph = H - 80;
      ctx.save(); RL.rr(ctx, px - 44, py - 18, pw + 56, ph + 52, 10); ctx.fillStyle = RL.isDark() ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
      D.plot(ctx, { x: px, y: py, w: pw, h: ph }, { xmin: 0, xmax: 6 * P.T, ymin: 0, ymax: n * 1.05, xlabel: 't, с', ylabel: 'N(t)',
        series: [{ pts: theory, color: C.muted, dash: [5, 4], width: 1.5 }, { pts: S.hist, color: C.accent }], marker: [S.t, S.N] });
      for (var k = 1; k <= 5; k++) { var X = px + k / 6 * pw; ctx.fillStyle = 'rgba(210,56,43,.5)'; ctx.fillRect(X, py, 1, ph); RL.txt(ctx, k + 'T', X, py + 10, { size: 9, color: '#b4342a' }); }
      if (wide) D.text(ctx, 'үзік сызық — ыдырау заңы', px + pw - 4, py + 22, { size: 11, align: 'right', color: C.muted });
    },
  });
})();

/* Заттың үш күйі: қатты дене, сұйық және газ молекулаларының орналасуы мен қозғалысы. */
(function () {
  var R = window.Real;
  var N = 64;
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Температураны өзгерт: молекулалар қалай қозғалады? Күйді ауыстырып, орналасуын салыстыр.',
    controls: [
      { type: 'select', key: 'st', label: 'Заттың күйі', value: 'liquid', options: [['solid', 'Қатты дене (мұз)'], ['liquid', 'Сұйық (су)'], ['gas', 'Газ (бу)']] },
      { type: 'range', key: 'T', label: 'Температура', min: 1, max: 10, step: 1, value: 5, digits: 0, live: true, format: function (v) { return ['', 'өте суық', 'суық', 'салқын', 'салқын', 'орташа', 'жылы', 'жылы', 'ыстық', 'ыстық', 'өте ыстық'][v]; } },
    ],
    readouts: [
      { key: 'shape', label: 'Пішіні', text: true },
      { key: 'vol', label: 'Көлемі', text: true },
      { key: 'move', label: 'Молекулалардың қозғалысы', text: true },
    ],
    init: function (api) {
      var S = api.S, st = api.P.st;
      S.m = [];
      var cols = 8;
      for (var i = 0; i < N; i++) {
        var c = i % cols, r = Math.floor(i / cols);
        var hx = 0.15 + c * 0.1 + (r % 2) * 0.05, hy = 0.92 - r * 0.1;
        S.m.push({ hx: hx, hy: hy, x: st === 'gas' ? Math.random() : hx, y: st === 'gas' ? Math.random() : st === 'liquid' ? 0.95 - Math.random() * 0.45 : hy, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), ph: Math.random() * 6 });
      }
    },
    step: function (api, dt) {
      var S = api.S, st = api.P.st, sp = 0.05 + api.P.T * 0.03;
      S.m.forEach(function (m) {
        if (st === 'solid') { m.ph += dt * (8 + api.P.T * 2); m.x = m.hx + Math.sin(m.ph) * 0.004 * api.P.T; m.y = m.hy + Math.cos(m.ph * 1.3) * 0.004 * api.P.T; return; }
        m.x += m.vx * sp * dt * (st === 'gas' ? 6 : 1.4); m.y += m.vy * sp * dt * (st === 'gas' ? 6 : 1.4);
        if (st === 'liquid') { m.vy += 0.6 * dt; if (Math.random() < 0.05) { m.vx += (Math.random() - 0.5) * 0.8; m.vy += (Math.random() - 0.5) * 0.8; } }
        var top = st === 'liquid' ? 0.45 : 0.03;
        if (m.x < 0.04) { m.x = 0.04; m.vx = Math.abs(m.vx); } if (m.x > 0.96) { m.x = 0.96; m.vx = -Math.abs(m.vx); }
        if (m.y < top) { m.y = top; m.vy = Math.abs(m.vy); } if (m.y > 0.96) { m.y = 0.96; m.vy = -Math.abs(m.vy) * 0.9; }
        var v = Math.hypot(m.vx, m.vy); if (v > 1.2) { m.vx *= 1.2 / v; m.vy *= 1.2 / v; }
      });
      if (st === 'liquid') for (var i = 0; i < S.m.length; i++) for (var j = i + 1; j < S.m.length; j++) {
        var a = S.m[i], b = S.m[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3;
        if (d < 0.07) { var k = (0.07 - d) / d * 0.5; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
      }
    },
    read: function (api) {
      var st = api.P.st;
      return {
        shape: st === 'solid' ? 'сақтайды' : 'сақтамайды (ыдыстың пішінін алады)',
        vol: st === 'gas' ? 'сақтамайды (бүкіл ыдысты толтырады)' : 'сақтайды',
        move: st === 'solid' ? 'орнының маңында тербеледі' : st === 'liquid' ? 'тербеліп, орын ауыстырып секіреді' : 'ретсіз, жылдам ұшады',
      };
    },
    onLive: function () {},
    draw: function (api, ctx, W, H) {
      var S = api.S, st = api.P.st, table = H * 0.88;
      R.scene(ctx, W, H, 'lab', { table: table });
      // шыны ыдыс (жабық)
      var bw = Math.min(W * 0.46, 420), bh = table - 50, bx = W * 0.27 - bw / 2 + W * 0.13, by = 34;
      R.vessel(ctx, bx, by, bw, bh, st === 'liquid' ? bh * 0.55 : 0, {});
      ctx.fillStyle = '#5a6168'; ctx.fillRect(bx - 6, by - 10, bw + 12, 10);
      var r = Math.min(bw, bh) * 0.045;
      S.m.forEach(function (m) { R.sphere(ctx, bx + m.x * bw, by + m.y * bh, r, st === 'solid' ? '#5aa9d6' : st === 'liquid' ? '#2f7fd1' : '#9bb8cf'); });
      if (st === 'solid') {
        ctx.save(); ctx.strokeStyle = 'rgba(40,90,130,.35)'; ctx.lineWidth = 1;
        S.m.forEach(function (a, i) { S.m.forEach(function (b, j) { if (j > i && Math.hypot(a.hx - b.hx, a.hy - b.hy) < 0.115) { ctx.beginPath(); ctx.moveTo(bx + a.x * bw, by + a.y * bh); ctx.lineTo(bx + b.x * bw, by + b.y * bh); ctx.stroke(); } }); });
        ctx.restore();
      }
      R.thermometer(ctx, W * 0.86, 40, Math.min(240, bh - 20), -20 + api.P.T * 12, -20, 110, { step: 20 });
    },
  });
})();

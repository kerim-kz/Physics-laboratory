/* Вектордың координата осьтеріндегі проекциялары: a_x = a cos α, a_y = a sin α. Векторларды қосу проекциялар арқылы. Дәптер парағындағы сызба. */
(function () {
  var R = window.Real;
  var U = 1; // бір тор көзі = 1 бірлік
  Sim.create({
    aspect: 0.62, grid: false, static: true,
    hint: 'Вектордың ұшын (немесе басын) тінтуірмен сүйреп жылжыт. Проекцияның таңбасы вектор мен осьтің арасындағы бұрышқа қалай тәуелді?',
    controls: [
      { type: 'select', key: 'mode', label: 'Режим', value: 'one', options: [['one', 'Бір вектордың проекциялары'], ['sum', 'Екі векторды қосу: c = a + b']] },
      { type: 'check', key: 'vals', label: 'Сандық мәндерін көрсету', value: true },
    ],
    readouts: [
      { key: 'a', label: '|a| = √(a<sub>x</sub>² + a<sub>y</sub>²)', digits: 2 },
      { key: 'al', label: 'α (Ox осінен)', unit: '°', digits: 0 },
      { key: 'ax', label: 'a<sub>x</sub> = a cos α', digits: 2 },
      { key: 'ay', label: 'a<sub>y</sub> = a sin α', digits: 2 },
      { key: 'cx', label: 'c<sub>x</sub> = a<sub>x</sub> + b<sub>x</sub>', digits: 2 },
      { key: 'cy', label: 'c<sub>y</sub> = a<sub>y</sub> + b<sub>y</sub>', digits: 2 },
    ],
    init: function (api) {
      var S = api.S;
      S.a = { x0: -4, y0: -2, x1: 3, y1: 3 };
      S.b = { x0: 3, y0: 3, x1: 7, y1: 0 };
      S.drag = null;
    },
    step: function () { return false; },
    read: function (api) {
      var S = api.S, a = S.a, ax = a.x1 - a.x0, ay = a.y1 - a.y0, sum = api.P.mode === 'sum';
      var bx = S.b.x1 - S.b.x0, by = S.b.y1 - S.b.y0;
      return { a: Math.hypot(ax, ay), al: ((Math.atan2(ay, ax) * 180 / Math.PI) + 360) % 360, ax: ax, ay: ay, cx: sum ? ax + bx : null, cy: sum ? ay + by : null };
    },
    pointer: {
      down: function (api, p) {
        var S = api.S, G = api.S.G; if (!G) return;
        var pts = [['a', 'x1', 'y1'], ['a', 'x0', 'y0']];
        if (api.P.mode === 'sum') pts.unshift(['b', 'x1', 'y1']);
        var best = null, bd = 26;
        pts.forEach(function (q) { var v = S[q[0]], d = Math.hypot(G.X(v[q[1]]) - p.x, G.Y(v[q[2]]) - p.y); if (d < bd) { bd = d; best = q; } });
        S.drag = best;
      },
      move: function (api, p, down) {
        var S = api.S, G = S.G; if (!down || !S.drag || !G) return;
        var q = S.drag, v = S[q[0]];
        var gx = Math.round(G.ix(p.x) * 2) / 2, gy = Math.round(G.iy(p.y) * 2) / 2;
        gx = Math.max(G.xmin, Math.min(G.xmax, gx)); gy = Math.max(G.ymin, Math.min(G.ymax, gy));
        if (q[0] === 'a' && q[1] === 'x0') { var dx = gx - v.x0, dy = gy - v.y0; v.x0 = gx; v.y0 = gy; v.x1 += dx; v.y1 += dy; }
        else { v[q[1]] = gx; v[q[2]] = gy; }
        if (q[0] === 'a' && q[1] === 'x1' || q[1] === 'x0') { var bx = S.b.x1 - S.b.x0, by = S.b.y1 - S.b.y0; S.b.x0 = S.a.x1; S.b.y0 = S.a.y1; S.b.x1 = S.b.x0 + bx; S.b.y1 = S.b.y0 + by; }
      },
      up: function (api) { api.S.drag = null; },
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, D = api.D, sum = P.mode === 'sum';
      var dark = R.isDark();
      // дәптер парағы
      ctx.fillStyle = dark ? '#1c2228' : '#fbfaf5'; ctx.fillRect(0, 0, W, H);
      var cell = Math.max(18, Math.min(34, Math.min(W / 22, H / 14)));
      ctx.strokeStyle = dark ? 'rgba(120,160,200,.16)' : 'rgba(80,130,190,.22)'; ctx.lineWidth = 1;
      for (var gx = (W / 2) % cell; gx < W; gx += cell) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); ctx.stroke(); }
      for (var gy = (H / 2) % cell; gy < H; gy += cell) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(214,72,72,.55)'; ctx.beginPath(); ctx.moveTo(cell * 1.5, 0); ctx.lineTo(cell * 1.5, H); ctx.stroke();
      var ox = W / 2 + 0.5, oy = H / 2 + 0.5; // тор сызықтары дәл осы нүктеден өтеді
      var G = S.G = {
        X: function (v) { return ox + v * cell; }, Y: function (v) { return oy - v * cell; },
        ix: function (x) { return (x - ox) / cell; }, iy: function (y) { return (oy - y) / cell; },
        xmin: -Math.floor(W / 2 / cell) + 1, xmax: Math.floor(W / 2 / cell) - 1, ymin: -Math.floor(H / 2 / cell) + 1, ymax: Math.floor(H / 2 / cell) - 1,
      };
      var ink = dark ? '#dfe6ec' : '#1b2329';
      // осьтер
      D.arrow(ctx, 8, oy, W - 8, oy, ink, 1.6); D.arrow(ctx, ox, H - 8, ox, 8, ink, 1.6);
      D.text(ctx, 'x', W - 16, oy - 10, { size: 14, weight: '700', color: ink }); D.text(ctx, 'y', ox + 10, 18, { size: 14, weight: '700', color: ink });
      for (var i = G.xmin; i <= G.xmax; i++) if (i && i % 2 === 0) D.text(ctx, String(i), G.X(i), oy + 15, { size: 10, align: 'center', color: dark ? '#9aa7b2' : '#5b6670' });
      for (var j = G.ymin; j <= G.ymax; j++) if (j && j % 2 === 0) D.text(ctx, String(j), ox - 8, G.Y(j) + 4, { size: 10, align: 'right', color: dark ? '#9aa7b2' : '#5b6670' });
      D.text(ctx, '0', ox - 8, oy + 15, { size: 10, align: 'right', color: dark ? '#9aa7b2' : '#5b6670' });
      // проекциялар
      function proj(v, color, yOff, xOff) {
        var x0 = G.X(v.x0), x1 = G.X(v.x1), y0 = G.Y(v.y0), y1 = G.Y(v.y1);
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = R.alpha(color, 0.7); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, oy + yOff); ctx.moveTo(x1, y1); ctx.lineTo(x1, oy + yOff);
        ctx.moveTo(x0, y0); ctx.lineTo(ox + xOff, y0); ctx.moveTo(x1, y1); ctx.lineTo(ox + xOff, y1); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.globalAlpha = 0.85; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(x0, oy + yOff); ctx.lineTo(x1, oy + yOff); ctx.moveTo(ox + xOff, y0); ctx.lineTo(ox + xOff, y1); ctx.stroke(); ctx.restore();
      }
      function vec(v, color, name) {
        var x0 = G.X(v.x0), x1 = G.X(v.x1), y0 = G.Y(v.y0), y1 = G.Y(v.y1);
        R.force(ctx, x0, y0, x1, y1, color);
        R.tag(ctx, name, (x0 + x1) / 2 - (y1 - y0) * 0.12, (y0 + y1) / 2 + (x1 - x0) * 0.12 - 4, { size: 13, color: color, weight: '700' });
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0, y0, 4, 0, 7); ctx.fill();
      }
      var a = S.a, b = S.b;
      proj(a, '#1f5fd1', -3, -3);
      if (sum) {
        proj(b, '#0b8a7a', 3, 3);
        var c = { x0: a.x0, y0: a.y0, x1: b.x1, y1: b.y1 };
        proj(c, '#d2382b', 9, 9);
        vec(b, '#0b8a7a', 'b'); vec(c, '#d2382b', 'c');
      }
      vec(a, '#1f5fd1', 'a');
      // бұрыш
      if (!sum) {
        var ang = Math.atan2(a.y1 - a.y0, a.x1 - a.x0);
        ctx.save(); ctx.strokeStyle = '#a8701a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(G.X(a.x0), G.Y(a.y0)); ctx.lineTo(G.X(a.x0) + cell * 1.6, G.Y(a.y0)); ctx.stroke();
        ctx.beginPath(); ctx.arc(G.X(a.x0), G.Y(a.y0), cell * 1.1, 0, -ang, ang > 0); ctx.stroke(); ctx.restore();
        R.tag(ctx, 'α', G.X(a.x0) + Math.cos(-ang / 2) * cell * 1.6, G.Y(a.y0) + Math.sin(-ang / 2) * cell * 1.6, { size: 11, color: '#a8701a' });
      }
      if (P.vals) {
        var ax = a.x1 - a.x0, ay = a.y1 - a.y0;
        var lines = sum
          ? ['a_x + b_x = ' + Sim.fmt(ax, 1) + ' + (' + Sim.fmt(b.x1 - b.x0, 1) + ') = ' + Sim.fmt(b.x1 - a.x0, 1) + ' = c_x', 'a_y + b_y = ' + Sim.fmt(ay, 1) + ' + (' + Sim.fmt(b.y1 - b.y0, 1) + ') = ' + Sim.fmt(b.y1 - a.y0, 1) + ' = c_y', '|c| = √(c_x² + c_y²) = ' + Sim.fmt(Math.hypot(b.x1 - a.x0, b.y1 - a.y0), 2)]
          : ['a_x = x₁ − x₀ = ' + Sim.fmt(ax, 1), 'a_y = y₁ − y₀ = ' + Sim.fmt(ay, 1), ax === 0 ? 'a_x = 0: a ⟂ Ox' : ax < 0 ? 'a_x < 0: доғал бұрыш' : 'a_x > 0: сүйір бұрыш'];
        var fs = W < 520 ? 10 : 12;
        lines.forEach(function (s, k) { R.tag(ctx, s, cell * 1.9, 18 + k * (fs + 12), { size: fs, align: 'left', mono: true, color: k === 2 ? '#a8701a' : sum ? '#d2382b' : '#1f5fd1' }); });
      }
    },
  });
})();

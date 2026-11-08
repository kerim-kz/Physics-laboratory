/* Нүктелік зарядтардың электр өрісі: E = kq/r², суперпозиция, күш сызықтары. Ені 1 м деп алынады. */
(function () {
  var K = 9e9, NC = 1e-9;
  var charges = [];
  var mouse = null, drag = null;

  function field(api, x, y) {
    var Ex = 0, Ey = 0, m = api.W; // px → м: 1 м = W px
    charges.forEach(function (c) {
      var dx = (x - c.x) / m, dy = (y - c.y) / m, r2 = dx * dx + dy * dy;
      if (r2 < 1e-8) return;
      var r = Math.sqrt(r2), E = K * c.q * NC / r2;
      Ex += E * dx / r; Ey += E * dy / r;
    });
    return [Ex, Ey];
  }
  function potential(api, x, y) {
    var V = 0, m = api.W;
    charges.forEach(function (c) { var r = Math.hypot((x - c.x) / m, (y - c.y) / m); if (r > 1e-4) V += K * c.q * NC / r; });
    return V;
  }
  function preset(api, kind) {
    var W = api.W, H = api.H;
    if (kind === 'dipole') charges = [{ x: W * 0.36, y: H / 2, q: 2 }, { x: W * 0.64, y: H / 2, q: -2 }];
    else if (kind === 'same') charges = [{ x: W * 0.36, y: H / 2, q: 2 }, { x: W * 0.64, y: H / 2, q: 2 }];
    else charges = [];
  }

  function traceLines(api, ctx) {
    var C = api.C, src = charges.filter(function (c) { return c.q > 0; }), sign = 1;
    if (!src.length) { src = charges.filter(function (c) { return c.q < 0; }); sign = -1; }
    ctx.save(); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.85;
    src.forEach(function (c) {
      var n = 8 * Math.abs(c.q);
      for (var i = 0; i < n; i++) {
        var a = (i + 0.5) / n * Math.PI * 2, x = c.x + Math.cos(a) * 10, y = c.y + Math.sin(a) * 10;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (var s = 0; s < 900; s++) {
          var e = field(api, x, y), len = Math.hypot(e[0], e[1]);
          if (len === 0) break;
          // RK2 қадамы
          var hx = sign * e[0] / len * 2.5, hy = sign * e[1] / len * 2.5;
          var e2 = field(api, x + hx, y + hy), l2 = Math.hypot(e2[0], e2[1]) || 1;
          x += sign * (e[0] / len + e2[0] / l2) * 2.5; y += sign * (e[1] / len + e2[1] / l2) * 2.5;
          ctx.lineTo(x, y);
          if (x < -20 || y < -20 || x > api.W + 20 || y > api.H + 20) break;
          var hit = charges.some(function (o) { return o !== c && Math.sign(o.q) !== Math.sign(c.q) && Math.hypot(x - o.x, y - o.y) < 9; });
          if (hit) break;
        }
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  Sim.create({
    static: true,
    aspect: 0.62,
    hint: 'Бос жерді бас — заряд қосылады. Зарядты сүйреп жылжыт.',
    controls: [
      { type: 'select', key: 'mode', label: 'Шерткенде', value: 'pos', live: true, options: [['pos', 'оң заряд қосу'], ['neg', 'теріс заряд қосу'], ['del', 'зарядты өшіру']] },
      { type: 'range', key: 'q', label: 'Жаңа заряд модулі', min: 1, max: 5, step: 1, value: 2, unit: 'нКл', digits: 0, live: true },
      { type: 'check', key: 'vec', label: 'Кернеулік векторлары', value: true, live: true },
      { type: 'check', key: 'lines', label: 'Күш сызықтары', value: true, live: true },
    ],
    buttons: [
      { label: 'Диполь', onClick: function (api) { preset(api, 'dipole'); } },
      { label: 'Екі оң заряд', onClick: function (api) { preset(api, 'same'); } },
      { label: 'Тазарту', onClick: function (api) { preset(api, 'none'); } },
    ],
    readouts: [
      { key: 'n', label: 'Зарядтар саны', digits: 0 },
      { key: 'E', label: 'Курсордағы кернеулік E', unit: 'Н/Кл', digits: 0 },
      { key: 'phi', label: 'Курсордағы потенциал φ', unit: 'В', digits: 1 },
      { key: 'r', label: 'Жақын зарядқа дейін', unit: 'см', digits: 1 },
    ],
    resetLabel: false,
    init: function (api) { if (!charges.length && api.W) preset(api, 'dipole'); },
    onResize: function (api) { if (!charges.length) preset(api, 'dipole'); },
    pointer: {
      down: function (api, p) {
        var hit = charges.find(function (c) { return Math.hypot(p.x - c.x, p.y - c.y) < 16; });
        if (hit && api.P.mode === 'del') { charges.splice(charges.indexOf(hit), 1); return; }
        if (hit) { drag = hit; return; }
        if (api.P.mode !== 'del') charges.push({ x: p.x, y: p.y, q: api.P.mode === 'pos' ? api.P.q : -api.P.q });
      },
      move: function (api, p, down) { mouse = p; if (down && drag) { drag.x = p.x; drag.y = p.y; } },
      up: function () { drag = null; },
      leave: function () { mouse = null; },
    },
    read: function (api) {
      if (!mouse) return { n: charges.length, E: null, phi: null, r: null };
      var e = field(api, mouse.x, mouse.y), r = Infinity;
      charges.forEach(function (c) { r = Math.min(r, Math.hypot(mouse.x - c.x, mouse.y - c.y) / api.W * 100); });
      return { n: charges.length, E: Math.hypot(e[0], e[1]), phi: potential(api, mouse.x, mouse.y), r: isFinite(r) ? r : null };
    },
    draw: function (api, ctx, W, H) {
      var C = api.C, D = api.D, P = api.P;
      if (P.lines && charges.length) traceLines(api, ctx);
      if (P.vec && charges.length) {
        for (var y = 22; y < H; y += 34) for (var x = 22; x < W; x += 34) {
          var e = field(api, x, y), len = Math.hypot(e[0], e[1]);
          if (!len) continue;
          var near = charges.some(function (c) { return Math.hypot(x - c.x, y - c.y) < 18; });
          if (near) continue;
          var l = Math.min(15, 3 + Math.log10(1 + len) * 3);
          ctx.globalAlpha = Math.min(1, 0.25 + Math.log10(1 + len) / 5);
          D.arrow(ctx, x - e[0] / len * l / 2, y - e[1] / len * l / 2, x + e[0] / len * l / 2, y + e[1] / len * l / 2, C.accent, 1.2);
          ctx.globalAlpha = 1;
        }
      }
      charges.forEach(function (c) {
        var r = 9 + Math.abs(c.q) * 1.6;
        D.circle(ctx, c.x, c.y, r, c.q > 0 ? C.red : C.blue, C.ink, 1.2);
        D.text(ctx, (c.q > 0 ? '+' : '−') + Math.abs(c.q), c.x, c.y + 4, { size: 11, align: 'center', color: '#fff', weight: '700' });
      });
      // масштаб
      D.line(ctx, 16, H - 16, 16 + W * 0.1, H - 16, C.ink, 2);
      D.text(ctx, '10 см', 16, H - 22, { size: 11, color: C.muted });
      if (mouse) {
        var e2 = field(api, mouse.x, mouse.y), l2 = Math.hypot(e2[0], e2[1]);
        if (l2) D.arrow(ctx, mouse.x, mouse.y, mouse.x + e2[0] / l2 * 40, mouse.y + e2[1] / l2 * 40, C.orange, 2.5, 'E');
      }
    },
  });
})();

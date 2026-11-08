/* Зарядталған бөлшектің біртекті магнит өрісіндегі қозғалысы: R = mv/(|q|B), T = 2πm/(|q|B). */
(function () {
  var PART = {
    e: { m: 9.11e-31, q: -1.6e-19, name: 'электрон' },
    p: { m: 1.67e-27, q: 1.6e-19, name: 'протон' },
    a: { m: 6.64e-27, q: 3.2e-19, name: 'α-бөлшек' },
  };
  function calc(P) {
    var pt = PART[P.part], v = P.v * 1e6, B = P.B * 1e-3;
    var R = pt.m * v / (Math.abs(pt.q) * B), T = 2 * Math.PI * pt.m / (Math.abs(pt.q) * B);
    return { pt: pt, v: v, B: B, R: R, T: T, F: Math.abs(pt.q) * v * B, w: 2 * Math.PI / T };
  }
  function lenStr(api, m) {
    if (m >= 1) return api.fmt(m, 2) + ' м';
    if (m >= 0.01) return api.fmt(m * 100, 2) + ' см';
    if (m >= 1e-3) return api.fmt(m * 1000, 2) + ' мм';
    return api.fmt(m * 1e6, 1) + ' мкм';
  }

  Sim.create({
    aspect: 0.62,
    autoplay: true,
    keepRunning: true,
    hint: 'Бір айналым экранда ≈ 3 секундқа созылады.',
    controls: [
      { type: 'select', key: 'part', label: 'Бөлшек', value: 'p', options: [['p', 'Протон (q = +e)'], ['e', 'Электрон (q = −e)'], ['a', 'α-бөлшек (q = +2e)']] },
      { type: 'range', key: 'v', label: 'Жылдамдық v', min: 0.5, max: 20, step: 0.5, value: 2, unit: '·10⁶ м/с', digits: 1 },
      { type: 'range', key: 'B', label: 'Магнит индукциясы B', min: 1, max: 100, step: 1, value: 50, unit: 'мТл', digits: 0 },
      { type: 'select', key: 'dir', label: 'Өріс бағыты', value: 'in', options: [['in', 'Бізден ары (×)'], ['out', 'Бізге қарай (•)']] },
    ],
    readouts: [
      { key: 'R', label: 'Траектория радиусы R' },
      { key: 'T', label: 'Айналу периоды T', unit: 'с' },
      { key: 'F', label: 'Лоренц күші F', unit: 'Н' },
      { key: 'dirtxt', label: 'Айналу бағыты' },
    ],
    init: function (api) { api.S.ph = 0; api.S.c = calc(api.P); },
    step: function (api, dt) { api.S.ph += dt * 2 * Math.PI / 3; },
    read: function (api) {
      var c = api.S.c, P = api.P;
      var ccw = (c.pt.q > 0) === (P.dir === 'in');
      return { R: lenStr(api, c.R), T: c.T, F: c.F, dirtxt: ccw ? 'сағат тіліне қарсы' : 'сағат тілімен' };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, c = S.c;
      // өріс белгілері
      for (var y = 24; y < H; y += 40) for (var x = 24; x < W; x += 40) {
        if (P.dir === 'in') { D.line(ctx, x - 4, y - 4, x + 4, y + 4, C.soft, 1.5); D.line(ctx, x - 4, y + 4, x + 4, y - 4, C.soft, 1.5); }
        else D.circle(ctx, x, y, 2.5, C.soft);
      }
      var rp = Math.min(W, H) * 0.36; // радиус экранда
      var ccw = (c.pt.q > 0) === (P.dir === 'in');
      var cx = W / 2, cy = H / 2;
      // бастапқыда бөлшек шеңбердің төменгі (немесе жоғарғы) нүктесінде, жылдамдығы оңға қарай
      var start = ccw ? Math.PI / 2 : -Math.PI / 2; // экран координатасындағы бұрыш (y төмен)
      var ang = start + (ccw ? -S.ph : S.ph);
      var px = cx + rp * Math.cos(ang), py = cy + rp * Math.sin(ang);
      ctx.save(); ctx.strokeStyle = C.line; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, rp, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      // жүріп өткен доға
      ctx.save(); ctx.strokeStyle = c.pt.q > 0 ? C.red : C.blue; ctx.lineWidth = 2.5; ctx.beginPath();
      var steps = Math.min(200, Math.floor(S.ph / 0.03));
      for (var i = 0; i <= steps; i++) { var a = start + (ccw ? -1 : 1) * Math.min(S.ph, Math.PI * 2) * i / Math.max(1, steps); var X = cx + rp * Math.cos(a), Y = cy + rp * Math.sin(a); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
      ctx.stroke(); ctx.restore();
      // жылдамдық (жанама) және күш (центрге)
      var tx = ccw ? Math.sin(ang) : -Math.sin(ang), ty = ccw ? -Math.cos(ang) : Math.cos(ang);
      D.arrow(ctx, px, py, px + tx * 60, py + ty * 60, C.accent, 2.5, 'v');
      D.arrow(ctx, px, py, px + (cx - px) / rp * 50, py + (cy - py) / rp * 50, C.orange, 2.5, 'F');
      D.circle(ctx, px, py, 8, c.pt.q > 0 ? C.red : C.blue, C.ink, 1.2);
      D.text(ctx, c.pt.q > 0 ? '+' : '−', px, py + 4, { size: 11, align: 'center', color: '#fff', weight: '700' });
      // радиус және масштаб
      D.line(ctx, cx, cy, cx + rp, cy, C.muted, 1, [3, 3]);
      D.text(ctx, 'R = ' + lenStr(api, c.R), cx + rp / 2, cy - 6, { size: 12, align: 'center', weight: '600', bg: C.bg });
      D.text(ctx, c.pt.name, 16, 24, { size: 13, weight: '600' });
    },
  });
})();

/* Жарықтың шағылуы мен сынуы: sin α / sin β = n₂ / n₁, толық ішкі шағылу. */
(function () {
  var MED = { air: [1.0, 'Ауа'], water: [1.33, 'Су'], ice: [1.31, 'Мұз'], glyc: [1.47, 'Глицерин'], glass: [1.5, 'Шыны'], diamond: [2.42, 'Алмаз'] };
  var OPTS = Object.keys(MED).map(function (k) { return [k, MED[k][1] + ' (n = ' + String(MED[k][0]).replace('.', ',') + ')']; });
  var deg = function (r) { return r * 180 / Math.PI; };

  function calc(P) {
    var n1 = MED[P.m1][0], n2 = MED[P.m2][0], a = P.alpha * Math.PI / 180;
    var s = n1 * Math.sin(a) / n2;
    return { n1: n1, n2: n2, a: a, tir: s > 1, b: s > 1 ? null : Math.asin(s), crit: n1 > n2 ? Math.asin(n2 / n1) : null };
  }

  Sim.create({
    tools: ['angle'],
    static: true,
    resetLabel: false,
    aspect: 0.7,
    hint: 'Түсетін сәулені тышқанмен немесе саусақпен бұруға болады.',
    controls: [
      { type: 'select', key: 'm1', label: 'Бірінші орта (жоғарғы)', value: 'air', options: OPTS },
      { type: 'select', key: 'm2', label: 'Екінші орта (төменгі)', value: 'glass', options: OPTS },
      { type: 'range', key: 'alpha', label: 'Түсу бұрышы α', min: 0, max: 89, step: 0.5, value: 40, unit: '°', digits: 1 },
    ],
    readouts: [
      { key: 'a', label: 'Түсу бұрышы α', unit: '°', digits: 1 },
      { key: 'g', label: 'Шағылу бұрышы γ', unit: '°', digits: 1 },
      { key: 'b', label: 'Сыну бұрышы β' },
      { key: 'ratio', label: 'sin α / sin β' },
      { key: 'n21', label: 'n₂ / n₁', digits: 3 },
      { key: 'crit', label: 'Шекті бұрыш α₀' },
    ],
    init: function () {},
    pointer: {
      down: function (api, p) { this.move(api, p, true); },
      move: function (api, p, down) {
        if (!down) return;
        var cx = api.W / 2, cy = api.H / 2;
        if (p.y >= cy - 4) return;
        var a = Math.atan2(Math.abs(p.x - cx), cy - p.y) * 180 / Math.PI;
        api.set('alpha', Math.round(Math.min(89, a) * 2) / 2);
      },
    },
    read: function (api) {
      var c = calc(api.P);
      return {
        a: api.P.alpha, g: api.P.alpha,
        b: c.tir ? 'жоқ (толық ішкі шағылу)' : api.fmt(deg(c.b), 1) + ' °',
        ratio: c.tir || api.P.alpha === 0 ? '—' : api.fmt(Math.sin(c.a) / Math.sin(c.b), 3),
        n21: c.n2 / c.n1,
        crit: c.crit === null ? 'жоқ (n₁ ≤ n₂)' : api.fmt(deg(c.crit), 1) + ' °',
      };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D, c = calc(P);
      var cx = W / 2, cy = H / 2, L = Math.min(W, H) * 0.46;
      var tint = function (n) { return 'rgba(70,140,220,' + Math.min(0.42, (n - 1) * 0.28) + ')'; };
      ctx.fillStyle = tint(c.n1); ctx.fillRect(0, 0, W, cy);
      ctx.fillStyle = tint(c.n2); ctx.fillRect(0, cy, W, H - cy);
      D.line(ctx, 0, cy, W, cy, C.muted, 2);
      D.line(ctx, cx, 10, cx, H - 10, C.muted, 1, [5, 5]);
      D.text(ctx, MED[P.m1][1] + ', n₁ = ' + api.fmt(c.n1, 2), 14, 22, { size: 13, weight: '600' });
      D.text(ctx, MED[P.m2][1] + ', n₂ = ' + api.fmt(c.n2, 2), 14, H - 14, { size: 13, weight: '600' });
      // түсетін сәуле
      var sx = cx - L * Math.sin(c.a), sy = cy - L * Math.cos(c.a);
      ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 6;
      D.arrow(ctx, sx, sy, cx - (cx - sx) * 0.08, cy - (cy - sy) * 0.08, C.orange, 3);
      D.line(ctx, cx - (cx - sx) * 0.1, cy - (cy - sy) * 0.1, cx, cy, C.orange, 3);
      ctx.restore();
      // шағылған сәуле (толық ішкі шағылуда — толық жарықтықпен)
      ctx.save(); ctx.globalAlpha = c.tir ? 1 : 0.45;
      D.arrow(ctx, cx, cy, cx + L * Math.sin(c.a), cy - L * Math.cos(c.a), C.orange, c.tir ? 3 : 2);
      ctx.restore();
      // сынған сәуле
      if (!c.tir) D.arrow(ctx, cx, cy, cx + L * Math.sin(c.b), cy + L * Math.cos(c.b), C.red, 3);
      // бұрыш доғалары
      ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink;
      ctx.beginPath(); ctx.arc(cx, cy, 44, -Math.PI / 2 - c.a, -Math.PI / 2); ctx.stroke();
      if (!c.tir) { ctx.beginPath(); ctx.arc(cx, cy, 52, Math.PI / 2 - c.b, Math.PI / 2); ctx.stroke(); }
      ctx.restore();
      D.text(ctx, 'α', cx - 14 - 40 * Math.sin(c.a / 2), cy - 50 * Math.cos(c.a / 2), { size: 14, weight: '700' });
      D.text(ctx, 'γ', cx + 6 + 40 * Math.sin(c.a / 2), cy - 50 * Math.cos(c.a / 2), { size: 14, weight: '700', color: C.muted });
      if (!c.tir) D.text(ctx, 'β', cx + 6 + 50 * Math.sin(c.b / 2), cy + 66 * Math.cos(c.b / 2), { size: 14, weight: '700', color: C.red });
      if (c.tir) D.text(ctx, 'Толық ішкі шағылу!', W - 14, cy + 30, { size: 15, align: 'right', weight: '700', color: C.bad });
    },
  });
})();

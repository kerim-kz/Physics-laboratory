/* Сфералық айналар: ойыс және дөңес айнадағы кескін. Негізгі сәулелер: оське параллель → фокус арқылы,
   фокус арқылы → оське параллель, оптикалық центр (полюс) арқылы → симметриялы шағылады. 1/F = 1/d + 1/f. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, grid: false, static: true, resetLabel: false,
    hint: 'Шамды айнаға жақындатып-алыстат: кескін қай кезде шын, қай кезде жалған болады?',
    controls: [
      { type: 'select', key: 'type', label: 'Айна', value: 'concave', options: [['concave', 'Ойыс (жинағыш)'], ['convex', 'Дөңес (шашыратқыш)']] },
      { type: 'range', key: 'd', label: 'Айнадан нәрсеге дейінгі қашықтық d', min: 4, max: 60, step: 1, value: 30, unit: 'см', digits: 0 },
      { type: 'range', key: 'F', label: 'Фокус аралығы F', min: 6, max: 20, step: 1, value: 12, unit: 'см', digits: 0 },
    ],
    readouts: [
      { key: 'f', label: 'Айнадан кескінге дейін f', unit: 'см', digits: 1 },
      { key: 'G', label: 'Ұлғайту Γ = |f| / d', digits: 2 },
      { key: 'kind', label: 'Кескін', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) {
      var P = api.P, F = P.type === 'concave' ? P.F : -P.F, d = P.d, f = 1 / (1 / F - 1 / d);
      var real = f > 0;
      return { f: f, G: Math.abs(f / d), kind: Math.abs(d - F) < 0.5 ? 'кескін жоқ (шексіздікте)' : (real ? 'шын, төңкерілген, ' : 'жалған, тура, ') + (Math.abs(f / d) > 1 ? 'үлкейтілген' : 'кішірейтілген') };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, cc = P.type === 'concave', F = cc ? P.F : -P.F, d = P.d, f = 1 / (1 / F - 1 / d);
      R.scene(ctx, W, H, 'wall');
      var mx = W * 0.72, ay = H * 0.55, k = (W * 0.66) / 64; // 1 см
      // ось, F, C
      ctx.strokeStyle = 'rgba(60,70,80,.5)'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(W, ay); ctx.stroke(); ctx.setLineDash([]);
      [[F, 'F'], [2 * F, 'C']].forEach(function (p) { var x = mx - p[0] * k; ctx.fillStyle = '#1b2329'; ctx.beginPath(); ctx.arc(x, ay, 3.5, 0, 7); ctx.fill(); R.txt(ctx, p[1], x, ay + 16, { size: 12, color: '#1b2329' }); });
      // айна (күміс доға)
      var Rad = Math.abs(2 * F) * k, half = H * 0.34, a = Math.asin(Math.min(0.95, half / Rad));
      ctx.save(); ctx.lineWidth = 9; ctx.strokeStyle = '#7d868e';
      ctx.beginPath(); if (cc) ctx.arc(mx - Rad, ay, Rad, -a, a); else ctx.arc(mx + Rad, ay, Rad, Math.PI - a, Math.PI + a); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = '#e8eef2'; ctx.stroke();
      ctx.restore();
      // нәрсе — шам
      var ox = mx - d * k, oh = 70;
      candle(ctx, ox, ay, oh, false);
      // кескін
      var ix = mx - f * k, ih = oh * (-f / d);
      if (isFinite(f) && Math.abs(f) < 400) {
        ctx.save(); ctx.globalAlpha = f > 0 ? 0.85 : 0.45; candle(ctx, ix, ay, Math.abs(ih), ih < 0); ctx.restore();
      }
      // негізгі сәулелер
      var top = ay - oh;
      ctx.lineWidth = 1.6;
      var ray = function (pts, col, dash) { ctx.save(); ctx.strokeStyle = col; if (dash) ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore(); };
      var itop = ay - ih;
      // 1) параллель → фокус арқылы (немесе фокустан келгендей)
      ray([[ox, top], [mx, top]], '#e0a020');
      var ext = function (x1, y1, x2, y2, L2) { var dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy); return [x1 + dx / l * L2, y1 + dy / l * L2]; };
      if (f > 0) { ray([[mx, top], ext(mx, top, ix, itop, Math.hypot(ix - mx, itop - top) + 120)], '#e0a020'); }
      else { var q = ext(mx - F * k, ay, mx, top, 2000); ray([[mx, top], [2 * mx - q[0], 2 * top - q[1]]], '#e0a020'); ray([[mx, top], [ix, itop]], '#e0a020', true); }
      // 2) полюс арқылы — симметриялы
      ray([[ox, top], [mx, ay]], '#2f9a5c');
      var rb = [mx - (mx - ox) * 1.6, ay + (ay - top) * 1.6];
      ray([[mx, ay], rb], '#2f9a5c');
      if (f < 0) ray([[mx, ay], [ix, itop]], '#2f9a5c', true);
      R.tag(ctx, cc ? 'Ойыс айна' : 'Дөңес айна', mx, 20, { size: 11 });
    },
  });
  function candle(ctx, x, ay, h, inv) {
    ctx.save(); ctx.translate(x, ay); if (inv) ctx.scale(1, -1);
    var w = Math.max(6, h * 0.2);
    var g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#d9c9a0'); g.addColorStop(0.4, '#fbf3dc'); g.addColorStop(1, '#c9b78a');
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h * 0.75, w, h * 0.75);
    R.flame(ctx, 0, -h * 0.75, h * 0.28, 0);
    ctx.restore();
  }
})();

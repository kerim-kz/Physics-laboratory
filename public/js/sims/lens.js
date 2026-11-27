/* Жұқа линза: 1/F = 1/d + 1/f, Γ = |f|/d. F < 0 — шашыратқыш линза. Ұзындықтар — см. */
(function () {
  var R = window.Real;
  function calc(P) {
    var F = P.type === 'conv' ? P.F : -P.F, d = P.d, h = P.h;
    if (Math.abs(d - F) < 1e-6) return { F: F, d: d, h: h, inf: true };
    var f = d * F / (d - F);
    return { F: F, d: d, h: h, f: f, H: -h * f / d, G: Math.abs(f) / d, real: f > 0 };
  }

  Sim.create({
    hint: 'Нәрсені линзадан алыстатып-жақындат: кескін қай кезде нақты, қай кезде жалған болады?',
    grid: false,
    tools: ['ruler', 'angle'],
    scale: function (api) { return api._sc || null; },
    static: true,
    resetLabel: false,
    aspect: 0.58,
    controls: [
      { type: 'select', key: 'type', label: 'Линза түрі', value: 'conv', options: [['conv', 'Жинағыш линза'], ['div', 'Шашыратқыш линза']] },
      { type: 'range', key: 'F', label: 'Фокус аралығы |F|', min: 2, max: 12, step: 0.5, value: 6, unit: 'см', digits: 1 },
      { type: 'range', key: 'd', label: 'Нәрседен линзаға дейін d', min: 1, max: 40, step: 0.5, value: 15, unit: 'см', digits: 1 },
      { type: 'range', key: 'h', label: 'Нәрсе биіктігі h', min: 1, max: 4, step: 0.5, value: 2, unit: 'см', digits: 1 },
    ],
    readouts: [
      { key: 'f', label: 'Линзадан кескінге дейін f' },
      { key: 'D', label: 'Оптикалық күш D = 1/F', unit: 'дптр', digits: 1 },
      { key: 'G', label: 'Ұлғайту Γ = |f|/d', digits: 2 },
      { key: 'H', label: 'Кескін биіктігі' },
      { key: 'kind', label: 'Кескін сипаты' },
    ],
    init: function () {},
    read: function (api) {
      var c = calc(api.P);
      var D = 100 / c.F;
      if (c.inf) return { f: '∞', D: D, G: null, H: '—', kind: 'кескін жоқ: сәулелер параллель шығады (d = F)' };
      var kind = (c.real ? 'шын, төңкерілген, ' : 'жорамал, тура, ') + (c.G > 1.005 ? 'үлкейген' : c.G < 0.995 ? 'кішірейген' : 'нәрсемен бірдей');
      return { f: api.fmt(c.f, 1) + ' см' + (c.real ? '' : ' (жорамал)'), D: D, G: c.G, H: api.fmt(Math.abs(c.H), 2) + ' см', kind: kind };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D, c = calc(P);
      // Масштаб: нәрсе, екі фокус және кескін (60 см-ге дейін) көрінетіндей.
      var half = Math.max(c.d, 2 * Math.abs(c.F), c.inf ? 0 : Math.min(60, Math.abs(c.f))) * 1.15;
      var cx = W / 2, cy = H * 0.55, k = Math.min((W / 2 - 20) / half, (H * 0.42) / Math.max(c.h, c.inf ? c.h : Math.min(30, Math.abs(c.H || 0))) );
      var X = function (x) { return cx + x * k; }, Y = function (y) { return cy - y * k; };
      api._sc = { px: k, unit: 'см' };
      D.line(ctx, 0, cy, W, cy, C.muted, 1.2);
      // оптикалық орындық (рельс) және шыны линза
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      var rg = ctx.createLinearGradient(0, H - 26, 0, H - 8); rg.addColorStop(0, '#d5dade'); rg.addColorStop(1, '#5c646b');
      ctx.fillStyle = rg; ctx.fillRect(10, H - 26, W - 20, 14);
      D.line(ctx, 0, cy, W, cy, C.muted, 1.2);
      var lh = Math.min(H * 0.42, 12 * k), lw = 12;
      ctx.save();
      var lg = ctx.createLinearGradient(cx - lw, 0, cx + lw, 0); lg.addColorStop(0, 'rgba(150,205,235,.55)'); lg.addColorStop(0.45, 'rgba(235,248,255,.85)'); lg.addColorStop(1, 'rgba(120,180,215,.55)');
      ctx.fillStyle = lg; ctx.strokeStyle = 'rgba(60,110,140,.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (P.type === 'conv') ctx.ellipse(cx, cy, lw, lh, 0, 0, 7);
      else { ctx.moveTo(cx - lw, cy - lh); ctx.lineTo(cx + lw, cy - lh); ctx.quadraticCurveTo(cx + 2, cy, cx + lw, cy + lh); ctx.lineTo(cx - lw, cy + lh); ctx.quadraticCurveTo(cx - 2, cy, cx - lw, cy - lh); }
      ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#4b5258'; ctx.fillRect(cx - 4, cy + lh, 8, H - 26 - cy - lh);
      // фокустар
      [-2, -1, 1, 2].forEach(function (m) {
        var x = X(m * P.F);
        D.circle(ctx, x, cy, 3, C.ink);
        D.text(ctx, (Math.abs(m) === 2 ? '2F' : 'F'), x, cy + 18, { size: 11, align: 'center', color: C.muted });
      });
      // нәрсе
      var ox = X(-c.d), oy = Y(c.h);
      D.arrow(ctx, ox, cy, ox, oy, C.blue, 3, 'h');
      if (c.inf) {
        var xe = (W - cx) / k;
        D.line(ctx, ox, oy, cx, oy, C.orange, 1.7);
        D.line(ctx, cx, oy, X(xe), Y(c.h * (1 - xe / c.F)), C.orange, 1.7);
        D.line(ctx, ox, oy, X(xe), Y(-c.h * xe / c.d), C.red, 1.7);
        D.text(ctx, 'Сынған сәулелер параллель — кескін жоқ', W - 14, 24, { size: 13, align: 'right', weight: '600', color: C.bad });
        return;
      }
      var y1 = function (x) { return c.h * (1 - x / c.F); };   // 1-сәуле линзадан кейін
      var y2 = function (x) { return -c.h * x / c.d; };        // 2-сәуле (оптикалық центр)
      var y3 = -c.h * c.F / (c.d - c.F);                         // 3-сәуле линзадан кейін (оське параллель)
      var xr = (W - cx) / k;
      ctx.save(); ctx.lineWidth = 1.7;
      // 1: оське параллель → фокус арқылы
      D.line(ctx, ox, oy, cx, oy, C.orange, 1.7);
      D.line(ctx, cx, oy, X(xr), Y(y1(xr)), C.orange, 1.7);
      // 2: оптикалық центр арқылы
      D.line(ctx, ox, oy, X(xr), Y(y2(xr)), C.red, 1.7);
      // 3: фокус арқылы → оське параллель
      D.line(ctx, ox, oy, cx, Y(y3), C.purple, 1.7);
      D.line(ctx, cx, Y(y3), X(xr), Y(y3), C.purple, 1.7);
      ctx.restore();
      var ix = X(c.f), iy = Y(c.H);
      if (!c.real) {
        // жорамал кескін: сынған сәулелердің жалғасы
        D.line(ctx, cx, oy, ix, iy, C.orange, 1.2, [5, 4]);
        D.line(ctx, cx, Y(y3), ix, Y(y3), C.purple, 1.2, [5, 4]);
        D.line(ctx, cx, cy, ix, iy, C.red, 1.2, [5, 4]);
      }
      ctx.save(); if (!c.real) ctx.setLineDash([6, 4]);
      D.arrow(ctx, ix, cy, ix, iy, C.good, 3, "h'");
      ctx.restore();
      D.text(ctx, (c.real ? 'Шын кескін' : 'Жорамал кескін'), ix, c.H > 0 ? iy - 10 : iy + 18, { size: 12, align: 'center', weight: '600', color: C.good });
      D.text(ctx, 'd = ' + api.fmt(c.d, 1) + ' см', (ox + cx) / 2, cy + 36, { size: 11, align: 'center', color: C.muted, mono: true });
    },
  });
})();

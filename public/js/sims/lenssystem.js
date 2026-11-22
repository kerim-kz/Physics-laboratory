/* Линзалар жүйесінде кескін салу: бірінші линзаның кескіні екінші линза үшін нәрсе болады. Сипаттамалық сәулелер, жұқа линза формуласы, жүйенің үлкейтуі. */
(function () {
  var R = window.Real;
  function img(d, F) { return Math.abs(d - F) < 1e-6 ? Infinity : d * F / (d - F); } // жұқа линза: 1/d + 1/f = 1/F
  Sim.create({
    aspect: 0.55, aspectNarrow: 0.95, grid: false, static: true,
    hint: 'Бірінші линзаның кескінін тауып, оны екінші линза үшін нәрсе ретінде қарастыр. Объектив пен окуляр жүйесі микроскоп пен телескопты қалай құрайды?',
    controls: [
      { type: 'range', key: 'd1', label: 'Нәрседен 1-линзаға дейін d₁', min: 6, max: 40, step: 1, value: 15, unit: 'см', digits: 0 },
      { type: 'range', key: 'F1', label: '1-линзаның фокус аралығы F₁', min: -15, max: 20, step: 1, value: 10, unit: 'см', digits: 0 },
      { type: 'range', key: 'F2', label: '2-линзаның фокус аралығы F₂', min: -15, max: 20, step: 1, value: 8, unit: 'см', digits: 0 },
      { type: 'range', key: 'L', label: 'Линзалар арасы l', min: 10, max: 70, step: 1, value: 45, unit: 'см', digits: 0 },
    ],
    readouts: [
      { key: 'f1', label: '1-линзаның кескіні f₁', unit: 'см', digits: 1 },
      { key: 'f2', label: '2-линзаның кескіні f₂', unit: 'см', digits: 1 },
      { key: 'G', label: 'Жүйенің үлкейтуі Γ = Γ₁·Γ₂', digits: 2 },
      { key: 'kind', label: 'Соңғы кескін', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var c = calc(api.P); return { f1: isFinite(c.f1) ? c.f1 : null, f2: isFinite(c.f2) ? c.f2 : null, G: isFinite(c.G) ? c.G : null, kind: !isFinite(c.f2) ? 'шексіздікте' : (c.f2 > 0 ? 'нақты, ' : 'жалған, ') + (c.G < 0 ? 'төңкерілген, ' : 'тура, ') + (Math.abs(c.G) > 1 ? 'үлкейтілген' : 'кішірейтілген') }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, c = calc(P), dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      var axis = H * 0.5, x1 = W * 0.3, sc = (W * 0.62) / Math.max(60, P.L + 25), x2 = x1 + P.L * sc, h0 = 4 * sc * 0.9;
      ctx.save(); R.rr(ctx, 8, 8, W - 16, H - 16, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.9)'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(90,100,110,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, axis); ctx.lineTo(W - 12, axis); ctx.stroke();
      function lens(x, F, lbl) {
        var hh = H * 0.36; ctx.strokeStyle = '#1f5fd1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, axis - hh); ctx.lineTo(x, axis + hh); ctx.stroke();
        var conv = F > 0; ctx.fillStyle = '#1f5fd1';
        [-1, 1].forEach(function (s) { ctx.beginPath(); var y = axis + s * hh; ctx.moveTo(x, y); ctx.lineTo(x - 7, y - s * (conv ? 9 : -9)); ctx.lineTo(x + 7, y - s * (conv ? 9 : -9)); ctx.closePath(); ctx.fill(); });
        [F, -F].forEach(function (f) { var fx = x + f * sc; if (fx > 12 && fx < W - 12) { api.D.circle(ctx, fx, axis, 3.5, '#0b8a7a', null, 0, true); } });
        R.tag(ctx, lbl + ' (F = ' + F + ' см)', x, axis - hh - 14, { size: 10 });
      }
      function arrow(x, h, col, lbl, dash) { ctx.save(); if (dash) ctx.setLineDash([5, 4]); api.D.arrow(ctx, x, axis, x, axis - h, col, 3); ctx.restore(); R.tag(ctx, lbl, x, axis - h - (h > 0 ? 14 : -14), { size: 10, color: col }); }
      lens(x1, P.F1, 'L₁'); lens(x2, P.F2, 'L₂');
      var xo = x1 - P.d1 * sc; arrow(xo, h0, '#d2382b', 'нәрсе');
      // 1-линза сәулелері
      if (isFinite(c.f1) && Math.abs(c.f1) < 200) {
        var xi1 = x1 + c.f1 * sc, hi1 = h0 * c.G1;
        ray([[xo, axis - h0], [x1, axis - h0], [xi1, axis - hi1]], '#e0a800', c.f1 < 0, false, x2);
        ray([[xo, axis - h0], [x1, axis], [xi1, axis - hi1]], '#e0a800', c.f1 < 0, false, x2);
        arrow(xi1, hi1, '#7a3fb0', 'аралық кескін', true);
        if (isFinite(c.f2) && Math.abs(c.f2) < 300) {
          var xi2 = x2 + c.f2 * sc, hi2 = hi1 * c.G2;
          ray([[xi1, axis - hi1], [x2, axis], [xi2, axis - hi2]], '#0b8a7a', c.f2 < 0, true);
          var yk = axis - hi1 * (1 - (x2 - xi1) / ((x2 - xi1) || 1) * 0); // аралық кескіннен оптикалық оське параллель сәуле
          ray([[xi1, axis - hi1], [x2, axis - hi1], [xi2, axis - hi2]], '#0b8a7a', c.f2 < 0, true);
          void yk;
          if (Math.abs(hi2) < H) arrow(xi2, hi2, '#0b8a7a', 'соңғы кескін', c.f2 < 0);
        }
      }
      R.tag(ctx, '1/d + 1/f = 1/F;   Γ = Γ₁·Γ₂', W / 2, H - 20, { size: 11.5, color: '#0b3f4a' });
      function ray(pts, col, virt, faint, stopX) {
        ctx.strokeStyle = col; ctx.lineWidth = faint ? 1.4 : 1.8; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]);
        // линзадан кейін: нақты кескін — сәуле кескінге дейін және одан ары; жалған — сәуле кері созындысы үзік
        var dx = pts[2][0] - pts[1][0], dy = pts[2][1] - pts[1][1], len = Math.hypot(dx, dy) || 1, ext = 2000;
        if (virt) { dx = -dx; dy = -dy; }
        if (stopX && dx > 0) ext = Math.min(ext, (stopX - pts[1][0]) / (dx / len));
        ctx.lineTo(pts[1][0] + dx / len * ext, pts[1][1] + dy / len * ext);
        ctx.stroke();
        if (virt) { ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.stroke(); ctx.setLineDash([]); }
        ctx.globalAlpha = 1;
      }
    },
  });
  function calc(P) {
    var f1 = img(P.d1, P.F1), G1 = isFinite(f1) ? -f1 / P.d1 : Infinity, d2 = P.L - f1, f2 = isFinite(f1) ? img(d2, P.F2) : Infinity, G2 = isFinite(f2) ? -f2 / d2 : Infinity;
    if (Math.abs(P.F1) < 0.5 || Math.abs(P.F2) < 0.5) { f1 = Infinity; }
    return { f1: f1, f2: f2, G1: G1, G2: G2, G: G1 * G2 };
  }
})();

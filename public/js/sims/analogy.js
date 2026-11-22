/* Механикалық және электрмагниттік тербелістердің ұқсастығы: серіппелі маятник пен тербелмелі контур қатар. Ығысу ↔ заряд, жылдамдық ↔ ток, масса ↔ индуктивтілік, қатаңдық ↔ 1/C. Энергия бағандары. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.5, grid: false, keepRunning: true, autoplay: true,
    hint: 'Екі жүйе бірдей теңдеумен сипатталады. Массаны (индуктивтілікті) арттырып, период қалай өзгеретінін екі жүйеде салыстыр. Кедергі — үйкелістің баламасы.',
    controls: [
      { type: 'range', key: 'm', label: 'Масса m ↔ индуктивтілік L', min: 0.5, max: 4, step: 0.5, value: 1, unit: 'кг ↔ Гн', digits: 1 },
      { type: 'range', key: 'k', label: 'Қатаңдық k ↔ 1/C', min: 4, max: 40, step: 2, value: 16, unit: 'Н/м ↔ 1/Ф', digits: 0 },
      { type: 'range', key: 'b', label: 'Үйкеліс ↔ кедергі R', min: 0, max: 1, step: 0.05, value: 0.1, digits: 2 },
    ],
    readouts: [
      { key: 'T', label: 'Период T = 2π√(m/k) = 2π√(LC)', unit: 'с', digits: 2 },
      { key: 'x', label: 'Ығысу x ↔ заряд q', digits: 2 },
      { key: 'v', label: 'Жылдамдық v ↔ ток i', digits: 2 },
      { key: 'E', label: 'Толық энергия', unit: 'Дж', digits: 3 },
    ],
    init: function (api) { var S = api.S; S.x = 0.5; S.v = 0; S.t = 0; S.hist = []; },
    substeps: 10,
    step: function (api, dt) {
      var S = api.S, P = api.P, a = (-P.k * S.x - P.b * S.v) / P.m;
      S.v += a * dt; S.x += S.v * dt; S.t += dt;
      S.hist.push([S.t, S.x]); if (S.hist.length > 3000) S.hist.shift();
    },
    read: function (api) { var S = api.S, P = api.P; return { T: 2 * Math.PI * Math.sqrt(P.m / P.k), x: S.x, v: S.v, E: P.k * S.x * S.x / 2 + P.m * S.v * S.v / 2 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark(), E0 = P.k * 0.25 / 2, Ep = P.k * S.x * S.x / 2, Ek = P.m * S.v * S.v / 2;
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      var colW = wide ? W / 2 : W, topH = wide ? H * 0.62 : H * 0.36;
      function panel(x, y, w, h, title) { ctx.save(); R.rr(ctx, x + 8, y + 8, w - 16, h - 16, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(250,248,242,.93)'; ctx.fill(); ctx.restore(); R.txt(ctx, title, x + w / 2, y + 24, { size: 12, weight: '700' }); }
      // 1) серіппелі маятник
      var x1 = 0, y1 = 0; panel(x1, y1, colW, topH, 'Серіппелі маятник');
      var wall = x1 + 34, cy = y1 + topH * 0.5, eq = x1 + colW * 0.45, sc = colW * 0.18, bx = eq + S.x * sc;
      ctx.fillStyle = '#6b7178'; ctx.fillRect(wall - 8, cy - 30, 8, 60);
      R.spring(ctx, wall, cy, bx - 20, cy, { coils: 10, r: 8 });
      R.block(ctx, bx - 20, cy - 20, 40, 40, 'brass', { depth: 4 }); R.txt(ctx, 'm', bx, cy, { size: 12, weight: '700', color: '#3a2a08' });
      ctx.strokeStyle = 'rgba(90,100,110,.5)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(eq, cy - 36); ctx.lineTo(eq, cy + 36); ctx.stroke(); ctx.setLineDash([]);
      if (Math.abs(S.v) > 0.03) R.force(ctx, bx, cy - 32, bx + S.v * 18, cy - 32, '#1f5fd1', 'v');
      bars(x1 + colW - 70, y1 + 44, topH - 70, Ek / E0, Ep / E0, 'mv²/2', 'kx²/2');
      // 2) тербелмелі контур
      var x2 = wide ? colW : 0, y2 = wide ? 0 : topH; panel(x2, y2, colW, topH, 'Тербелмелі контур');
      var lx = x2 + colW * 0.2, rx = x2 + colW * 0.55, ty = y2 + topH * 0.28, by = y2 + topH * 0.78, mid = (ty + by) / 2, ph = S.t * S.v * 60;
      R.wire(ctx, [[lx, mid - 26], [lx, ty], [rx, ty], [rx, mid - 30]], { color: '#c0392b', phase: S.t * 50 * Math.sign(-S.v), current: Math.abs(S.v) > 0.03 });
      R.wire(ctx, [[rx, mid + 30], [rx, by], [lx, by], [lx, mid + 6]], { color: '#c0392b', phase: S.t * 50 * Math.sign(-S.v), current: Math.abs(S.v) > 0.03 });
      void ph;
      // конденсатор (пластиналар, заряд белгілері)
      R.block(ctx, lx - 22, mid - 30, 44, 5, 'copper', { depth: 2, shadow: false }); R.block(ctx, lx - 22, mid + 4, 44, 5, 'copper', { depth: 2, shadow: false });
      var nq = Math.round(Math.abs(S.x) * 10), sg = S.x >= 0;
      for (var i = 0; i < nq; i++) { R.txt(ctx, sg ? '+' : '−', lx - 18 + i * 7, mid - 38, { size: 10, weight: '700', color: sg ? '#b4342a' : '#1f5fd1' }); R.txt(ctx, sg ? '−' : '+', lx - 18 + i * 7, mid + 18, { size: 10, weight: '700', color: sg ? '#1f5fd1' : '#b4342a' }); }
      var gE = ctx.createLinearGradient(0, mid - 25, 0, mid + 4); ctx.fillStyle = 'rgba(224,118,27,' + Math.min(0.5, Ep / E0 * 0.5) + ')'; ctx.fillRect(lx - 20, mid - 24, 40, 27); void gE;
      R.tag(ctx, 'C', lx - 36, mid - 12, { size: 11 });
      // катушка (магнит өрісі)
      ctx.strokeStyle = '#b87333'; ctx.lineWidth = 3; for (var k = 0; k < 8; k++) { ctx.beginPath(); ctx.ellipse(rx, mid - 28 + k * 8, 14, 4, 0, 0, Math.PI); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(31,95,209,' + Math.min(0.8, Ek / E0) + ')'; ctx.lineWidth = 1.5;
      for (var j = 1; j <= 3; j++) { ctx.beginPath(); ctx.ellipse(rx, mid, 18 + j * 9, 34 + j * 6, 0, 0, 7); ctx.stroke(); }
      R.tag(ctx, 'L', rx + 50, mid, { size: 11 });
      bars(x2 + colW - 70, y2 + 44, topH - 70, Ek / E0, Ep / E0, 'Li²/2', 'q²/2C');
      // ортақ график x(t) ↔ q(t)
      var gx = 50, gy = (wide ? topH : topH * 2) + 18, gw = W - 70, gh = H - gy - 44;
      ctx.save(); R.rr(ctx, gx - 40, gy - 14, gw + 54, gh + 44, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var t0 = Math.max(0, S.t - 10), pts = S.hist.filter(function (h) { return h[0] >= t0; });
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: t0, xmax: t0 + 10, ymin: -0.6, ymax: 0.6, xlabel: 't, с', ylabel: 'x ↔ q', series: [{ pts: pts, color: '#0b8a7a', width: 2 }] });
      R.tag(ctx, 'x″ + (k/m)x = 0   ↔   q″ + (1/LC)q = 0', gx + gw / 2, gy + 10, { size: W < 600 ? 9.5 : 11.5, color: '#0b6b78' });
      function bars(x, y, h, fk, fp, lk, lp) {
        [[fk, '#1f5fd1', lk], [fp, '#e0761b', lp]].forEach(function (b, i) {
          var bh = Math.max(0, Math.min(1, b[0])) * h; ctx.fillStyle = 'rgba(120,130,140,.18)'; ctx.fillRect(x + i * 30, y, 22, h);
          ctx.fillStyle = b[1]; ctx.fillRect(x + i * 30, y + h - bh, 22, bh); R.txt(ctx, b[2], x + i * 30 + 11, y + h + 12, { size: 9, color: b[1], weight: '700' });
        });
      }
    },
  });
})();

/* Масс-спектрометр: иондар жылдамдық сүзгісінен (қиылысқан E және B өрістері, v = E/B) өтіп, магнит өрісінде жартылай шеңбермен қозғалады: r = mv/(qB). Изотоптар әртүрлі нүктеге түседі. */
(function () {
  var R = window.Real, u = 1.6605e-27, e = 1.602e-19;
  var ISO = { ne: ['Неон: ²⁰Ne және ²²Ne', 20, 22, '#d2382b', '#1f5fd1'], c: ['Көміртек: ¹²C және ¹⁴C', 12, 14, '#0b8a7a', '#7a3fb0'], cl: ['Хлор: ³⁵Cl және ³⁷Cl', 35, 37, '#e0761b', '#2b8a3e'], u: ['Уран: ²³⁵U және ²³⁸U', 235, 238, '#b4342a', '#1f5fd1'] };
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.1, grid: false, keepRunning: true, autoplay: true,
    hint: 'Жылдамдық сүзгісі тек v = E/B жылдамдықты иондарды өткізеді. Магнит индукциясын өзгертіп, изотоптардың іздері арасындағы қашықтықты бақыла.',
    controls: [
      { type: 'select', key: 'iso', label: 'Иондар (заряды +e)', value: 'ne', options: Object.keys(ISO).map(function (k) { return [k, ISO[k][0]]; }), live: true },
      { type: 'range', key: 'E', label: 'Сүзгідегі электр өрісі E', min: 5, max: 40, step: 1, value: 20, unit: 'кВ/м', digits: 0, live: true },
      { type: 'range', key: 'B', label: 'Магнит индукциясы B', min: 0.05, max: 0.5, step: 0.01, value: 0.1, unit: 'Тл', digits: 2, live: true },
    ],
    readouts: [
      { key: 'v', label: 'Өткен иондардың жылдамдығы v = E/B', unit: 'км/с', digits: 0 },
      { key: 'r1', label: 'Жеңіл изотоп r₁ = m₁v/(qB)', unit: 'см', digits: 2 },
      { key: 'r2', label: 'Ауыр изотоп r₂', unit: 'см', digits: 2 },
      { key: 'dx', label: 'Іздер арасы Δx = 2(r₂ − r₁)', unit: 'мм', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; api.S.ions = []; api.S.hits = [0, 0]; },
    step: function (api, dt) {
      var S = api.S; S.t += dt;
      if (Math.random() < dt * 14) S.ions.push({ s: 0, k: Math.random() < 0.5 ? 0 : 1, bad: Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0 });
      S.ions.forEach(function (q) { q.s += dt * 0.5; });
      S.ions = S.ions.filter(function (q) { if (q.s >= 1 && !q.bad) S.hits[q.k]++; return q.s < 1; });
    },
    read: function (api) { var c = calc(api.P); return { v: c.v / 1000, r1: c.r1 * 100, r2: c.r2 * 100, dx: 2 * (c.r2 - c.r1) * 1000 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, I = ISO[P.iso], c = calc(P), wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'wall');
      var sx = wide ? W * 0.12 : W * 0.2, sy = H * 0.12, fy0 = sy + 40, fy1 = wide ? H * 0.42 : H * 0.36, base = fy1 + 20;
      // ион көзі
      R.block(ctx, sx - 26, sy - 30, 52, 30, 'steel', { depth: 3 }); R.tag(ctx, 'ион көзі', sx + 58, sy - 16, { size: 10 });
      // жылдамдық сүзгісі
      R.block(ctx, sx - 30, fy0, 8, fy1 - fy0, 'copper', { depth: 2, shadow: false }); R.block(ctx, sx + 22, fy0, 8, fy1 - fy0, 'copper', { depth: 2, shadow: false });
      R.txt(ctx, '+', sx - 40, (fy0 + fy1) / 2, { size: 13, weight: '700', color: '#b4342a' }); R.txt(ctx, '−', sx + 40, (fy0 + fy1) / 2, { size: 13, weight: '700', color: '#1f5fd1' });
      for (var k = 0; k < 4; k++) R.txt(ctx, '⊙', sx - 10 + (k % 2) * 20, fy0 + 16 + Math.floor(k / 2) * 30, { size: 10, color: '#5b6670' });
      R.tag(ctx, 'жылдамдық сүзгісі: qE = qvB', sx + (wide ? 108 : 70), (fy0 + fy1) / 2, { size: W < 600 ? 9 : 10 });
      // магнит өрісі аймағы
      var rmax = Math.max(c.r2, 1e-6), sc = Math.min((W - sx - 30) / (2 * rmax), (H - base - 24) / rmax) * 0.95;
      ctx.fillStyle = 'rgba(31,95,209,.06)'; ctx.fillRect(sx - 20, base, W - sx, H - base - 6);
      for (var gx = sx; gx < W - 10; gx += 36) for (var gy = base + 18; gy < H - 10; gy += 36) R.txt(ctx, '⊙', gx, gy, { size: 10, color: 'rgba(31,95,209,.5)' });
      R.tag(ctx, 'B ⊙ (бізге қарай)', W - 70, base + 14, { size: 10, color: '#1f5fd1' });
      // фотопластинка
      ctx.fillStyle = '#2b2f33'; ctx.fillRect(sx + 6, base - 6, W - sx - 20, 6);
      // іздер
      [c.r1, c.r2].forEach(function (r, i) {
        var x = sx + 2 * r * sc, col = I[3 + i];
        ctx.strokeStyle = R.alpha(col, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + r * sc, base, r * sc, Math.PI, 0, true); ctx.stroke();
        var n = Math.min(14, S.hits[i]);
        ctx.fillStyle = col; ctx.fillRect(x - 3, base - 9, 6, 3 + n);
        R.tag(ctx, (i ? I[2] : I[1]) + ' u', x, base - 22 - i * 22, { size: 10, color: col });
      });
      // иондар
      S.ions.forEach(function (q) {
        var col = I[3 + q.k], r = q.k ? c.r2 : c.r1, x, y;
        if (q.s < 0.35) { var f = q.s / 0.35; x = sx + (q.bad ? q.bad * f * f * 60 : 0); y = sy + f * (base - sy); if (q.bad && Math.abs(x - sx) > 22) return; }
        else { if (q.bad) return; var a = (q.s - 0.35) / 0.65 * Math.PI; x = sx + r * sc - Math.cos(a) * r * sc; y = base + Math.sin(a) * r * sc; }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill();
      });
      R.tag(ctx, 'r = mv / (qB)', wide ? W * 0.7 : W / 2, H - 16, { size: 12, color: '#0b6b78' });
      void dark;
    },
  });
  function calc(P) { var I = ISO[P.iso], v = P.E * 1000 / P.B; return { v: v, r1: I[1] * u * v / (e * P.B), r2: I[2] * u * v / (e * P.B) }; }
})();

/* Бүкіләлемдік тартылыс заңы: F = G m₁m₂ / r². Денелер жұбын таңдап, қашықтық пен массаны өзгерту; биіктікке байланысты еркін түсу үдеуі g(h). */
(function () {
  var R = window.Real, G = 6.674e-11;
  // [атауы, m₁ (кг), m₂ (кг), r (м), 1-дене түрі, 2-дене түрі, атаулары, r-дің бірлігі]
  var PAIRS = {
    people: ['Екі оқушы (60 кг, 1 м)', 60, 60, 1, 'person', 'person', ['1-оқушы', '2-оқушы'], 'м', 1],
    cav: ['Кавендиш тәжірибесі: қорғасын шарлар', 158, 0.73, 0.23, 'lead', 'lead', ['Үлкен шар 158 кг', 'Кіші шар 0,73 кг'], 'м', 1],
    em: ['Жер мен Ай', 5.97e24, 7.35e22, 3.84e8, 'earth', 'moon', ['Жер', 'Ай'], 'мың км', 1e6],
    se: ['Күн мен Жер', 1.99e30, 5.97e24, 1.496e11, 'sun', 'earth', ['Күн', 'Жер'], 'млн км', 1e9],
  };
  Sim.create({
    aspect: 0.58, grid: false, static: true,
    hint: 'Қашықтықты 2 есе арттыр: тартылыс күші неше есе азаяды? Массаны 2 есе арттырсаң ше?',
    controls: [
      { type: 'select', key: 'mode', label: 'Режим', value: 'pair', options: [['pair', 'Екі дененің тартылысы'], ['height', 'Еркін түсу үдеуінің биіктікке тәуелділігі']] },
      { type: 'select', key: 'pair', label: 'Денелер', value: 'em', options: Object.keys(PAIRS).map(function (k) { return [k, PAIRS[k][0]]; }) },
      { type: 'range', key: 'kr', label: 'Қашықтық (бастапқыдан неше есе)', min: 0.5, max: 4, step: 0.25, value: 1, digits: 2, format: function (v) { return '× ' + String(v).replace('.', ','); } },
      { type: 'range', key: 'km', label: 'Бірінші дененің массасы (неше есе)', min: 0.5, max: 4, step: 0.5, value: 1, digits: 1, format: function (v) { return '× ' + String(v).replace('.', ','); } },
      { type: 'range', key: 'h', label: 'Жер бетінен биіктік h', min: 0, max: 36000, step: 400, value: 400, unit: 'км', digits: 0 },
    ],
    readouts: [
      { key: 'F', label: 'Тартылыс күші F', unit: 'Н', digits: 3 },
      { key: 'r', label: 'Центрлер арақашықтығы r', unit: 'м', digits: 3 },
      { key: 'ratio', label: 'F / F₀ (бастапқы жағдаймен салыстыру)', digits: 3 },
      { key: 'g', label: 'Еркін түсу үдеуі g(h) = GM / (R + h)²', unit: 'м/с²', digits: 3 },
    ],
    init: function () {},
    step: function () { return false; },
    read: function (api) {
      var P = api.P;
      if (P.mode === 'height') { var gh = G * 5.97e24 / Math.pow(6.371e6 + P.h * 1000, 2); return { F: null, r: (6371 + P.h) * 1000, ratio: gh / 9.82, g: gh }; }
      var A = PAIRS[P.pair], r = A[3] * P.kr, F = G * A[1] * P.km * A[2] / (r * r);
      return { F: F, r: r, ratio: P.km / (P.kr * P.kr), g: null };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P;
      if (P.mode === 'height') return height(api, ctx, W, H);
      var A = PAIRS[P.pair], space = A[4] !== 'person' && A[4] !== 'lead';
      if (space) R.scene(ctx, W, H, 'space', { seed: 4 }); else R.scene(ctx, W, H, 'lab', { table: H * 0.82 });
      var cy = H * 0.5, minR = W * 0.14, maxR = W * 0.78;
      var dpx = minR + (maxR - minR) * (P.kr - 0.5) / 3.5, x1 = W / 2 - dpx / 2, x2 = W / 2 + dpx / 2;
      var s1 = 1, s2 = 1;
      if (A[4] === 'earth') { s1 = 34 * Math.cbrt(P.km); s2 = 10; }
      else if (A[4] === 'sun') { s1 = 40 * Math.cbrt(P.km); s2 = 9; }
      else if (A[4] === 'lead') { s1 = 34 * Math.cbrt(P.km); s2 = 8; }
      else { s1 = 1; s2 = 1; }
      function body(kind, x, r, scale) {
        if (kind === 'person') return person(ctx, x, H * 0.82, scale);
        if (kind === 'lead') return R.sphere(ctx, x, cy, r, '#6f7480', { shadowY: H * 0.82 });
        R.planet(ctx, x, cy, r, kind, { light: kind === 'sun' ? undefined : Math.PI });
      }
      body(A[4], x1, s1, Math.cbrt(P.km)); body(A[5], x2, s2, 1);
      // күш векторлары (тең, қарама-қарсы) — логарифмдік емес, салыстырмалы ұзындық
      var F = G * A[1] * P.km * A[2] / Math.pow(A[3] * P.kr, 2), F0 = G * A[1] * A[2] / Math.pow(A[3], 2);
      var L = Math.max(10, Math.min(dpx * 0.42, 60 * F / F0));
      var yA = A[4] === 'person' ? H * 0.82 - 70 : cy;
      var e1 = A[4] === 'person' ? 14 : s1 + 2, e2 = A[5] === 'person' ? 14 : s2 + 2;
      R.force(ctx, x1 + e1, yA, x1 + e1 + L, yA, '#d2382b');
      R.force(ctx, x2 - e2, yA, x2 - e2 - L, yA, '#1f5fd1');
      R.tag(ctx, 'F₂₁', x1 + e1 + L / 2, yA - 18, { size: 11, color: '#d2382b' });
      R.tag(ctx, 'F₁₂', x2 - e2 - L / 2, yA + 20, { size: 11, color: '#1f5fd1' });
      // r белгісі
      var ry = A[4] === 'person' ? H * 0.82 + 16 : cy + Math.max(s1, 30) + 24;
      ctx.strokeStyle = space ? 'rgba(220,230,240,.8)' : '#38424b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, ry); ctx.lineTo(x2, ry); ctx.moveTo(x1, ry - 5); ctx.lineTo(x1, ry + 5); ctx.moveTo(x2, ry - 5); ctx.lineTo(x2, ry + 5); ctx.stroke();
      var rr = A[3] * P.kr / A[8];
      R.tag(ctx, 'r = ' + Sim.fmt(rr, rr >= 100 ? 0 : 2) + ' ' + A[7], W / 2, ry + 14, { size: 11 });
      R.tag(ctx, A[6][0], x1, A[4] === 'person' ? H * 0.82 - 150 * Math.cbrt(P.km) : cy - s1 - 20, { size: 10.5 });
      R.tag(ctx, A[6][1], x2, A[5] === 'person' ? H * 0.82 - 150 : cy - s2 - 20, { size: 10.5 });
      R.tag(ctx, 'F = G·m₁m₂ / r² = ' + Sim.fmt(F, 3) + ' Н', W / 2, 24, { size: W < 600 ? 11 : 13, color: '#0b6b78' });
      R.tag(ctx, 'G = 6,67·10⁻¹¹ Н·м²/кг²', W / 2, 52, { size: 10.5, color: '#5b6670' });
    },
  });
  function person(ctx, x, yFloor, s) {
    var h = 130 * Math.min(1.25, s);
    ctx.save();
    R.shadow(ctx, x, yFloor, 50);
    ctx.fillStyle = '#2f4f7a'; ctx.fillRect(x - 10, yFloor - h * 0.48, 8, h * 0.48); ctx.fillRect(x + 2, yFloor - h * 0.48, 8, h * 0.48);
    ctx.fillStyle = '#d8473b'; R.rr(ctx, x - 16, yFloor - h * 0.86, 32, h * 0.42, 8); ctx.fill();
    ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(x, yFloor - h * 0.94, h * 0.09, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(x, yFloor - h * 0.97, h * 0.09, Math.PI, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function height(api, ctx, W, H) {
    var P = api.P;
    R.scene(ctx, W, H, 'space', { seed: 8 });
    var cx = W * 0.22, cy = H * 0.55, Re = Math.min(H * 0.22, W * 0.14), k = Re / 6371;
    R.planet(ctx, cx, cy, Re, 'earth', { light: Math.PI * 1.25 });
    var rr = (6371 + P.h) * k, ang = -0.5, sx = cx + Math.cos(ang) * rr, sy = cy + Math.sin(ang) * rr;
    ctx.strokeStyle = 'rgba(160,190,230,.45)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#d5d9de'; ctx.fillRect(sx - 6, sy - 4, 12, 8); ctx.fillStyle = '#2f6fae'; ctx.fillRect(sx - 18, sy - 2, 10, 4); ctx.fillRect(sx + 8, sy - 2, 10, 4);
    var gh = 9.82 * Math.pow(6371 / (6371 + P.h), 2);
    R.force(ctx, sx, sy, sx - Math.cos(ang) * gh * 7, sy - Math.sin(ang) * gh * 7, '#d2382b', 'g');
    R.tag(ctx, 'h = ' + Sim.fmt(P.h, 0) + ' км', sx + 40, sy - 18, { size: 11 });
    // g(h) графигі
    var gx = W * 0.5, gy = 40, gw = W * 0.46, gH = H - 90;
    ctx.save(); R.rr(ctx, gx - 40, gy - 20, gw + 56, gH + 60, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
    var pts = []; for (var h = 0; h <= 36000; h += 400) pts.push([h / 1000, 9.82 * Math.pow(6371 / (6371 + h), 2)]);
    api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gH }, { xmin: 0, xmax: 36, ymin: 0, ymax: 10, xlabel: 'h, мың км', ylabel: 'g, м/с²', series: [{ pts: pts, color: '#1f5fd1' }], marker: [P.h / 1000, gh] });
    [[0.4, 'ХҒС'], [20.2, 'GPS'], [35.786, 'Геостац.']].forEach(function (q) { var X = gx + q[0] / 36 * gw; ctx.fillStyle = '#8a6100'; ctx.fillRect(X - 0.5, gy, 1, gH); R.txt(ctx, q[1], q[0] > 30 ? X - 3 : X + 3, gy + 12, { size: 9.5, color: '#8a6100', align: q[0] > 30 ? 'right' : 'left' }); });
    R.tag(ctx, 'g = GM / (R + h)² = ' + Sim.fmt(gh, 3) + ' м/с²', W * 0.27, 24, { size: 12, color: '#0b6b78' });
  }
})();

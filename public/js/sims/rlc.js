/* Тізбектей жалғанған RLC тізбегі: Ом заңы I = U/Z, кедергілер үшбұрышы және кернеулердің векторлық диаграммасы. */
(function () {
  var R = window.Real;
  function calc(P) {
    var w = 2 * Math.PI * P.f, XL = w * P.L, XC = 1 / (w * P.C * 1e-6), Z = Math.sqrt(P.R * P.R + Math.pow(XL - XC, 2)), I = P.U / Z;
    return { XL: XL, XC: XC, Z: Z, I: I, UR: I * P.R, UL: I * XL, UC: I * XC, phi: Math.atan2(XL - XC, P.R) };
  }
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.4, grid: false, static: true,
    hint: 'Жиілікті немесе сыйымдылықты өзгертіп, кедергілер үшбұрышы мен кернеулер диаграммасын бақыла. U_L + U_C + U_R ≠ U, өйткені кернеулер векторлық қосылады!',
    controls: [
      { type: 'range', key: 'U', label: 'Әсерлік кернеу U', min: 10, max: 220, step: 10, value: 100, unit: 'В', digits: 0 },
      { type: 'range', key: 'f', label: 'Жиілік ν', min: 10, max: 300, step: 5, value: 50, unit: 'Гц', digits: 0 },
      { type: 'range', key: 'R', label: 'R', min: 10, max: 200, step: 5, value: 40, unit: 'Ом', digits: 0 },
      { type: 'range', key: 'L', label: 'L', min: 0.05, max: 1, step: 0.05, value: 0.3, unit: 'Гн', digits: 2 },
      { type: 'range', key: 'C', label: 'C', min: 5, max: 200, step: 5, value: 50, unit: 'мкФ', digits: 0 },
    ],
    readouts: [
      { key: 'Z', label: 'Толық кедергі Z = √(R² + (X<sub>L</sub> − X<sub>C</sub>)²)', unit: 'Ом', digits: 1 },
      { key: 'I', label: 'Ток I = U/Z', unit: 'А', digits: 3 },
      { key: 'UR', label: 'U<sub>R</sub> / U<sub>L</sub> / U<sub>C</sub>', text: true },
      { key: 'phi', label: 'Фазалар ығысуы φ', unit: '°', digits: 1 },
      { key: 'cos', label: 'cos φ = R/Z', digits: 3 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var c = calc(api.P); return { Z: c.Z, I: c.I, UR: [c.UR, c.UL, c.UC].map(function (v) { return v.toFixed(1).replace('.', ','); }).join(' / ') + ' В', phi: c.phi * 180 / Math.PI, cos: Math.cos(c.phi) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, c = calc(P), wide = W > 640, dark = R.isDark();
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      // тізбек
      var x0 = wide ? 40 : 24, x1 = wide ? W * 0.46 : W - 24, yT = wide ? 50 : 36, yB = wide ? H * 0.42 : H * 0.24;
      R.wire(ctx, [[x0, (yT + yB) / 2 - 22], [x0, yT], [x1, yT], [x1, yB], [x0, yB], [x0, (yT + yB) / 2 + 22]], { color: '#c0392b' });
      ctx.save(); ctx.translate(x0, (yT + yB) / 2); R.sphere(ctx, 0, 0, 18, '#2b2f33'); ctx.restore(); R.txt(ctx, '~', x0, (yT + yB) / 2 + 1, { size: 18, color: '#fff', weight: '700' });
      R.tag(ctx, P.U + ' В, ' + P.f + ' Гц', x0 + 60, (yT + yB) / 2, { size: 10 });
      var s1 = x0 + (x1 - x0) * 0.25, s2 = x0 + (x1 - x0) * 0.52, s3 = x0 + (x1 - x0) * 0.8;
      R.resistor(ctx, s1, yT, 56, {}); R.tag(ctx, 'R', s1, yT - 20, { size: 10.5 });
      ctx.strokeStyle = '#b87333'; ctx.lineWidth = 3; for (var k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(s2 - 24 + k * 8, yT, 4.5, 11, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); } R.tag(ctx, 'L', s2, yT - 20, { size: 10.5 });
      ctx.fillStyle = '#a87a4c'; ctx.fillRect(s3 - 10, yT - 6, 20, 12); R.block(ctx, s3 - 7, yT - 15, 4, 30, 'copper', { depth: 1, shadow: false }); R.block(ctx, s3 + 3, yT - 15, 4, 30, 'copper', { depth: 1, shadow: false }); R.tag(ctx, 'C', s3, yT - 26, { size: 10.5 });
      R.meter(ctx, (x0 + x1) / 2, yB, 22, c.I, Math.max(0.5, Math.ceil(P.U / P.R * 2) / 2), { letter: 'A' });
      // кедергілер үшбұрышы
      var tx = wide ? 60 : 30, ty = wide ? H * 0.88 : H * 0.48, ks = (wide ? Math.min(W * 0.32, H * 0.34) : Math.min(W * 0.4, H * 0.17)) / Math.max(P.R, Math.abs(c.XL - c.XC), 1) ;
      var dx = P.R * ks, dy = (c.XL - c.XC) * ks;
      ctx.fillStyle = 'rgba(11,138,122,.12)'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + dx, ty); ctx.lineTo(tx + dx, ty - dy); ctx.closePath(); ctx.fill();
      api.D.arrow(ctx, tx, ty, tx + dx, ty, '#0b8a7a', 2.5, 'R'); api.D.arrow(ctx, tx + dx, ty, tx + dx, ty - dy, '#7a3fb0', 2.5, 'X_L−X_C'); api.D.arrow(ctx, tx, ty, tx + dx, ty - dy, '#d2382b', 2.5, 'Z');
      R.txt(ctx, 'Кедергілер үшбұрышы', tx + Math.max(60, dx / 2), ty + 16, { size: 10, color: '#5b6670' });
      // кернеулер диаграммасы
      var vx = wide ? W * 0.72 : W * 0.5, vy = wide ? H * 0.55 : H * 0.78, vs = (wide ? Math.min(W * 0.22, H * 0.32) : Math.min(W * 0.32, H * 0.15)) / Math.max(c.UR, c.UL, c.UC, P.U);
      ctx.save(); R.rr(ctx, vx - (wide ? W * 0.24 : W * 0.46), vy - (wide ? H * 0.42 : H * 0.18), wide ? W * 0.48 : W * 0.92, wide ? H * 0.84 : H * 0.36, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.93)'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(120,130,140,.4)'; ctx.beginPath(); ctx.moveTo(vx - 10, vy); ctx.lineTo(vx + c.UR * vs + 40, vy); ctx.stroke();
      api.D.arrow(ctx, vx, vy, vx + c.UR * vs, vy, '#0b8a7a', 2.5, 'U_R');
      api.D.arrow(ctx, vx, vy, vx, vy - c.UL * vs, '#7a3fb0', 2.5, 'U_L');
      api.D.arrow(ctx, vx, vy, vx, vy + c.UC * vs, '#e0761b', 2.5, 'U_C');
      api.D.arrow(ctx, vx, vy, vx + c.UR * vs, vy - (c.UL - c.UC) * vs, '#d2382b', 3, 'U');
      api.D.arrow(ctx, vx, vy, vx + c.I * vs * P.R * 0.6, vy, '#1f5fd1', 1.5);
      R.txt(ctx, 'Кернеулердің векторлық диаграммасы (I бағыты — көлденең)', vx, vy - (wide ? H * 0.42 : H * 0.18) + 14, { size: W < 600 ? 9 : 10.5, weight: '600' });
      var res = Math.abs(c.XL - c.XC) < 0.03 * c.Z;
      if (res) R.tag(ctx, 'РЕЗОНАНС: X_L = X_C, Z = R', vx, vy + (wide ? H * 0.34 : H * 0.14), { size: 11, color: '#b4342a' });
    },
  });
})();

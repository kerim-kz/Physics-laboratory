/* Юнг тәжірибесі: Δx = λL/d; дифракциялық тор: d·sinφ = kλ. Экрандағы интенсивтілік және түс толқын ұзындығы бойынша. */
(function () {
  function rgb(nm) {
    var r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else { r = 1; }
    var f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (780 - nm) / 80 : 1;
    return [Math.round(255 * r * f), Math.round(255 * g * f), Math.round(255 * b * f)];
  }
  function intensity(P, x) { // x — экрандағы координата, м
    var lam = P.lam * 1e-9;
    if (P.mode === 'young') {
      var d = P.d * 1e-3, a = 0.04e-3;
      var th = Math.atan(x / P.L);
      var beta = Math.PI * a * Math.sin(th) / lam, env = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
      return env * Math.pow(Math.cos(Math.PI * d * Math.sin(th) / lam), 2);
    }
    var dg = 1e-3 / P.n, N = 8, th2 = Math.atan(x / P.L), ph = Math.PI * dg * Math.sin(th2) / lam;
    var s = Math.sin(ph), num = Math.sin(N * ph);
    return Math.abs(s) < 1e-6 ? 1 : Math.pow(num / (N * s), 2);
  }
  Sim.create({
    aspect: 0.62, static: true, resetLabel: false,
    hint: 'Экрандағы сурет толқын ұзындығына сай түспен салынған.',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'young', options: [['young', 'Юнг: екі саңылау'], ['grating', 'Дифракциялық тор']] },
      { type: 'range', key: 'lam', label: 'Толқын ұзындығы λ', min: 380, max: 750, step: 10, value: 600, unit: 'нм', digits: 0 },
      { type: 'range', key: 'd', label: 'Саңылаулар арақашықтығы d (Юнг)', min: 0.1, max: 1, step: 0.05, value: 0.3, unit: 'мм', digits: 2 },
      { type: 'range', key: 'n', label: 'Тордағы штрих саны (1 мм-де)', min: 100, max: 600, step: 50, value: 300, digits: 0 },
      { type: 'range', key: 'L', label: 'Экранға дейінгі қашықтық L', min: 0.5, max: 3, step: 0.1, value: 2, unit: 'м', digits: 1 },
    ],
    readouts: [
      { key: 'dx', label: 'Жолақтар арасы Δx = λL/d (Юнг)', unit: 'мм', digits: 2 },
      { key: 'per', label: 'Тор периоды d', unit: 'мкм', digits: 2 },
      { key: 'phi1', label: '1-ретті максимум бұрышы φ₁', unit: '°', digits: 1 },
      { key: 'kmax', label: 'Ең үлкен рет kmax', digits: 0 },
    ],
    init: function () {},
    step: function () {},
    read: function (api) {
      var P = api.P, lam = P.lam * 1e-9, dg = 1e-3 / P.n, s1 = lam / dg;
      return { dx: P.mode === 'young' ? lam * P.L / (P.d * 1e-3) * 1000 : null, per: dg * 1e6, phi1: P.mode === 'grating' && s1 < 1 ? Math.asin(s1) * 180 / Math.PI : null, kmax: P.mode === 'grating' ? Math.floor(dg / lam) : null };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D, col = rgb(P.lam), cs = 'rgb(' + col.join(',') + ')';
      var young = P.mode === 'young';
      var span = young ? 8 * P.lam * 1e-9 * P.L / (P.d * 1e-3) : P.L * 1.5; // экранның көрінетін жарты ені, м
      // сызба
      var sx = 60, scrX = W * 0.62, cy = H * 0.36;
      ctx.fillStyle = cs; ctx.globalAlpha = 0.25; ctx.fillRect(10, cy - 50, sx - 10, 100); ctx.globalAlpha = 1;
      D.arrow(ctx, 12, cy, sx - 4, cy, cs, 3);
      ctx.fillStyle = C.ink; ctx.fillRect(sx, cy - 80, 6, 160);
      ctx.fillStyle = C.bg;
      if (young) { ctx.fillRect(sx, cy - 16, 6, 6); ctx.fillRect(sx, cy + 10, 6, 6); }
      else for (var i = -6; i <= 6; i++) ctx.fillRect(sx, cy + i * 6 - 1, 6, 3);
      // толқын фронттары (схемалық)
      ctx.strokeStyle = cs; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
      (young ? [cy - 13, cy + 13] : [cy]).forEach(function (yy) { for (var r = 12; r < scrX - sx; r += 16) { ctx.beginPath(); ctx.arc(sx + 6, yy, r, -0.6, 0.6); ctx.stroke(); } });
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.ink; ctx.fillRect(scrX, cy - 110, 4, 220);
      D.text(ctx, 'L = ' + api.fmt(P.L, 1) + ' м', (sx + scrX) / 2, cy + 120, { size: 11, align: 'center', color: C.muted });
      // экрандағы сурет (оң жақ)
      var px0 = scrX + 20, pw = W - px0 - 16;
      for (var y = 0; y < 220; y++) {
        var I = 0;
        for (var sub = 0; sub < 6; sub++) I = Math.max(I, intensity(P, (y + sub / 6 - 110) / 110 * span));
        ctx.fillStyle = 'rgba(' + col.join(',') + ',' + Math.min(1, I) + ')';
        ctx.fillRect(px0, cy - 110 + y, pw, 1);
      }
      ctx.strokeStyle = C.line; ctx.strokeRect(px0 + 0.5, cy - 110.5, pw - 1, 220);
      // интенсивтілік графигі (төменде)
      var pts = [];
      for (var k = 0; k <= 400; k++) { var xx = -span + 2 * span * k / 400; pts.push([xx * 1000, intensity(P, xx)]); }
      D.plot(ctx, { x: 40, y: H * 0.72, w: W - 70, h: H * 0.2 }, { xmin: -span * 1000, xmax: span * 1000, ymin: 0, ymax: 1.05, xlabel: 'x, мм', ylabel: 'I', series: [{ pts: pts, color: cs }] });
      D.text(ctx, young ? 'Екі саңылау: максимумдар Δx қашықтықта' : 'Тор: жіңішке, жарық бас максимумдар', 12, 20, { size: 12, weight: '600' });
    },
  });
})();

/* Дифракциялық тор: d sin φ = kλ. Экрандағы максимумдар, ақ жарықтың спектрлерге жіктелуі, тордың периоды және ең үлкен рет. Толқын ұзындығын тор арқылы өлшеу. */
(function () {
  var R = window.Real;
  function wl2rgb(l) { var r = 0, g = 0, b = 0; if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = -(l - 510) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else r = 1; return 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')'; }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.15, grid: false, static: true,
    hint: 'Тордың сызықтар санын (1 мм-ге) немесе толқын ұзындығын өзгерт. Экрандағы максимумдардың орнын өлшеп, λ = d·sin φ / k формуласымен толқын ұзындығын тап.',
    controls: [
      { type: 'select', key: 'light', label: 'Жарық көзі', value: 'laser', options: [['laser', 'Лазер (монохромат)'], ['white', 'Ақ жарық'], ['hg', 'Сынап шамы (сызықтық спектр)']] },
      { type: 'range', key: 'lam', label: 'Лазердің толқын ұзындығы λ', min: 400, max: 700, step: 10, value: 650, unit: 'нм', digits: 0 },
      { type: 'range', key: 'N', label: 'Тордың сызықтар саны (1 мм-ге)', min: 100, max: 1200, step: 50, value: 300, digits: 0 },
      { type: 'range', key: 'L', label: 'Тордан экранға дейін L', min: 0.2, max: 1.5, step: 0.1, value: 0.5, unit: 'м', digits: 1 },
    ],
    readouts: [
      { key: 'd', label: 'Тордың периоды d = 1/N', unit: 'мкм', digits: 3 },
      { key: 'kmax', label: 'Ең үлкен рет k<sub>max</sub> = d/λ', digits: 0 },
      { key: 'x1', label: 'Бірінші максимумның ығысуы x₁', unit: 'см', digits: 1 },
      { key: 'phi1', label: 'Бірінші максимумның бұрышы φ₁', unit: '°', digits: 1 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var P = api.P, d = 1e-3 / P.N, l = P.lam * 1e-9, s = l / d; return { d: d * 1e6, kmax: Math.floor(d / l), x1: s < 1 ? P.L * Math.tan(Math.asin(s)) * 100 : null, phi1: s < 1 ? Math.asin(s) * 180 / Math.PI : null }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, wide = W > 640, dark = R.isDark(), d = 1e-3 / P.N;
      R.scene(ctx, W, H, 'lab', { table: H * 0.95 });
      // жоғарыдан көрініс: көз → тор → экран
      var y0 = wide ? H * 0.34 : H * 0.28, xs = 30, xg = wide ? W * 0.2 : W * 0.18, xe = W - 40, Lpx = xe - xg, scale = Lpx / P.L; // px/м
      ctx.save(); R.rr(ctx, 10, 10, W - 20, y0 * 2 - 10, 10); ctx.fillStyle = '#121820'; ctx.fill(); ctx.restore();
      R.block(ctx, xs - 10, y0 - 10, 26, 20, 'steel', { depth: 2, shadow: false });
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xs + 16, y0); ctx.lineTo(xg, y0); ctx.stroke();
      ctx.fillStyle = '#8f99a3'; ctx.fillRect(xg - 3, y0 - y0 * 0.7, 6, y0 * 1.4); R.txt(ctx, 'тор', xg, y0 + y0 * 0.7 + 10, { size: 10, color: '#c9cfd4' });
      ctx.fillStyle = '#e6ebef'; ctx.fillRect(xe, 20, 8, y0 * 2 - 30); R.txt(ctx, 'экран', xe - 6, y0 * 2 - 6, { size: 10, color: '#c9cfd4' });
      var lines = P.light === 'laser' ? [[P.lam, 1]] : P.light === 'hg' ? [[405, 0.6], [436, 0.9], [546, 1], [577, 0.8], [579, 0.8]] : [];
      if (P.light === 'white') for (var l = 400; l <= 700; l += 6) lines.push([l, 0.35]);
      var maxs = [];
      lines.forEach(function (ln) {
        var lam = ln[0] * 1e-9, km = Math.floor(d / lam);
        for (var k = -Math.min(km, 4); k <= Math.min(km, 4); k++) {
          var s = k * lam / d; if (Math.abs(s) >= 1) continue;
          var phi = Math.asin(s), x = P.L * Math.tan(phi), yy = y0 - x * scale;
          if (yy < 18 || yy > y0 * 2 - 6) continue;
          ctx.strokeStyle = wl2rgb(ln[0]).replace('rgb', 'rgba').replace(')', ',' + (0.25 * ln[1]) + ')'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xg, y0); ctx.lineTo(xe, yy); ctx.stroke();
          ctx.fillStyle = wl2rgb(ln[0]); ctx.globalAlpha = ln[1]; ctx.fillRect(xe - 2, yy - 2, 12, 4); ctx.globalAlpha = 1;
          if (ln === lines[0] || P.light !== 'white') maxs.push([k, yy, x]);
        }
      });
      if (P.light !== 'white') maxs.filter(function (m) { return m[0] >= 0; }).forEach(function (m) { R.txt(ctx, 'k=' + m[0], xe - 22, m[1], { size: 9.5, color: '#e6ebef' }); });
      // экранның алдыңғы көрінісі
      var sy = y0 * 2 + 20, sh = H - sy - 30;
      ctx.save(); R.rr(ctx, 20, sy, W - 40, sh, 8); ctx.fillStyle = '#0d1116'; ctx.fill(); ctx.restore();
      var cxs = W / 2, xscale = (W - 60) / 2 / (P.L * 1.2);
      lines.forEach(function (ln) {
        var lam = ln[0] * 1e-9, km = Math.floor(d / lam);
        for (var k = -km; k <= km; k++) {
          var s = k * lam / d; if (Math.abs(s) >= 1) continue;
          var x = P.L * Math.tan(Math.asin(s)), px = cxs + x * xscale; if (px < 24 || px > W - 24) continue;
          var gg = ctx.createRadialGradient(px, sy + sh / 2, 1, px, sy + sh / 2, P.light === 'white' ? 6 : 12); gg.addColorStop(0, wl2rgb(ln[0])); gg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = Math.min(1, ln[1] * (k === 0 ? 1.4 : 1) * (P.light === 'white' ? 1.4 : 1)); ctx.fillStyle = gg; ctx.fillRect(px - 14, sy + 6, 28, sh - 12); ctx.globalAlpha = 1;
        }
      });
      for (var cm = -100; cm <= 100; cm += 10) { var tx = cxs + cm / 100 * xscale; if (tx < 24 || tx > W - 24) continue; ctx.fillStyle = '#c9cfd4'; ctx.fillRect(tx, sy + sh - 8, 1, 8); if (cm % 20 === 0) R.txt(ctx, String(cm), tx, sy + sh + 10, { size: 9, color: dark ? '#c9cfd4' : '#33404a' }); }
      R.txt(ctx, 'см', W - 30, sy + sh + 10, { size: 9, color: dark ? '#c9cfd4' : '#33404a' });
      R.tag(ctx, 'd·sin φ = k·λ', W / 2, 24, { size: 12, color: '#0b3f4a' });
    },
  });
})();

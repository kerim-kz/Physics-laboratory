/* Жұқа қабықшадағы интерференция: сабын қабықшасының (сына) түсті жолақтары және Ньютон сақиналары. Шағылған сәулелердің жол айырымы 2dn + λ/2. */
(function () {
  var R = window.Real;
  // толқын ұзындығы (нм) → RGB
  function wl2rgb(l) {
    var r = 0, g = 0, b = 0;
    if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = -(l - 510) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else r = 1;
    return [r, g, b];
  }
  function refl(d, n, l) { var delta = 2 * d * n + l / 2; return Math.pow(Math.cos(Math.PI * delta / l), 2); } // d, l — нм
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.3, grid: false, static: true,
    hint: 'Монохромат жарықта жолақтар бір түсті, ақ жарықта түрлі түсті болады. Толқын ұзындығын арттырғанда Ньютон сақиналары үлкейе ме, кішірейе ме?',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'newton', options: [['newton', 'Ньютон сақиналары'], ['soap', 'Сабын қабықшасы (сына)']] },
      { type: 'select', key: 'light', label: 'Жарық', value: 'mono', options: [['mono', 'Монохромат'], ['white', 'Ақ жарық']] },
      { type: 'range', key: 'lam', label: 'Толқын ұзындығы λ', min: 400, max: 700, step: 10, value: 590, unit: 'нм', digits: 0 },
      { type: 'range', key: 'Rl', label: 'Линзаның қисықтық радиусы R', min: 0.5, max: 5, step: 0.5, value: 2, unit: 'м', digits: 1 },
    ],
    readouts: [
      { key: 'r1', label: 'Бірінші күңгірт сақина радиусы √(Rλ)', unit: 'мм', digits: 3 },
      { key: 'r5', label: 'Бесінші күңгірт сақина радиусы', unit: 'мм', digits: 3 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var P = api.P, rk = function (k) { return Math.sqrt(k * P.Rl * P.lam * 1e-9) * 1000; }; return { r1: rk(1), r5: rk(5) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      var sz = Math.min(wide ? W * 0.5 : W - 30, H - (wide ? 50 : 200)), cx = wide ? 20 + sz / 2 : W / 2, cy = 26 + sz / 2;
      var img = ctx.createImageData(Math.ceil(sz / 2), Math.ceil(sz / 2)), dd = img.data, n = img.width;
      var lams = P.light === 'mono' ? [P.lam] : [420, 460, 500, 540, 580, 620, 660];
      for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
        var col = [0, 0, 0], d;
        if (P.mode === 'newton') { var rmm = Math.hypot(i - n / 2, j - n / 2) / (n / 2) * 2.2; d = (rmm * 1e-3) * (rmm * 1e-3) / (2 * P.Rl) * 1e9; } // ауа қабаты, нм
        else d = 60 + (j / n) * 1400 + Math.sin(i / n * 6) * 40; // сына: жоғарыда жұқа
        lams.forEach(function (l) { var I = P.mode === 'newton' ? Math.pow(Math.sin(Math.PI * 2 * d / l), 2) : refl(d, 1.33, l), c = wl2rgb(l); col[0] += c[0] * I; col[1] += c[1] * I; col[2] += c[2] * I; });
        var norm = P.light === 'mono' ? 1 : lams.length / 2.6, idx = (j * n + i) * 4;
        dd[idx] = Math.min(255, col[0] / norm * 255); dd[idx + 1] = Math.min(255, col[1] / norm * 255); dd[idx + 2] = Math.min(255, col[2] / norm * 255); dd[idx + 3] = 255;
      }
      var off = document.createElement('canvas'); off.width = n; off.height = n; off.getContext('2d').putImageData(img, 0, 0);
      ctx.save();
      if (P.mode === 'newton') { ctx.beginPath(); ctx.arc(cx, cy, sz / 2, 0, 7); ctx.clip(); } else { R.rr(ctx, cx - sz / 2, cy - sz / 2, sz, sz, 14); ctx.clip(); }
      ctx.drawImage(off, cx - sz / 2, cy - sz / 2, sz, sz); ctx.restore();
      if (P.mode === 'newton') { ctx.strokeStyle = '#59616a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, sz / 2, 0, 7); ctx.stroke(); R.tag(ctx, '2,2 мм', cx + sz / 2 - 30, cy + sz / 2 - 10, { size: 9.5 }); }
      else { ctx.strokeStyle = '#8f99a3'; ctx.lineWidth = 6; ctx.strokeRect(cx - sz / 2, cy - sz / 2, sz, sz); }
      // сызба: оптикалық жол айырымы
      var bx = wide ? W * 0.62 : 20, by = wide ? 40 : cy + sz / 2 + 24, bw = wide ? W * 0.34 : W - 40, bh = wide ? H * 0.6 : 230;
      ctx.save(); R.rr(ctx, bx, by, bw, bh, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore();
      var fy = by + bh * 0.42, fh = bh * 0.12;
      ctx.fillStyle = P.mode === 'newton' ? 'rgba(200,230,245,.6)' : 'rgba(190,220,250,.6)'; ctx.fillRect(bx + 16, fy, bw - 32, fh);
      R.txt(ctx, P.mode === 'newton' ? 'ауа қабаты d' : 'сабын қабықшасы d, n = 1,33', bx + bw / 2, fy + fh + 14, { size: 10, color: '#5b6670' });
      var x1 = bx + bw * 0.3, x2 = bx + bw * 0.45;
      api.D.arrow(ctx, x1 - 40, by + 20, x1, fy, '#e0a800', 2);
      api.D.arrow(ctx, x1, fy, x1 + 40, by + 20, '#d2382b', 2, '1');
      ctx.strokeStyle = '#e0a800'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, fy); ctx.lineTo(x1 + (x2 - x1) / 2, fy + fh); ctx.lineTo(x2, fy); ctx.stroke();
      api.D.arrow(ctx, x2, fy, x2 + 40, by + 20, '#1f5fd1', 2, '2');
      R.txt(ctx, 'Δ = 2dn + λ/2', bx + bw / 2, fy + fh + 40, { size: 13, weight: '700', color: '#0b6b78' });
      R.txt(ctx, 'Δ = kλ — жарық жолақ', bx + bw / 2, fy + fh + 62, { size: 10.5, color: '#5b6670' });
      R.txt(ctx, 'Δ = (k+½)λ — күңгірт жолақ', bx + bw / 2, fy + fh + 80, { size: 10.5, color: '#5b6670' });
    },
  });
})();

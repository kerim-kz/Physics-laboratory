/* Ішкі энергияны өзгерту тәсілдері: жұмыс атқару (сымды иіп-жазу, ауа сығу) және жылу беру (жалын).
   Мыс сым кесегінің температурасы өседі; бөлшектердің тербелісі жылдамдайды. */
(function () {
  var R = window.Real;
  var M = 0.02, C = 400; // 20 г мыс, c = 400 Дж/(кг·°C)
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Тәсілді таңдап, «Бастау» бас. Екі тәсілде де сымның ішкі энергиясы артады.',
    controls: [
      { type: 'select', key: 'way', label: 'Тәсіл', value: 'work', options: [['work', 'Жұмыс атқару: сымды иіп-жазу'], ['heat', 'Жылу беру: спирт шамы'], ['friction', 'Жұмыс атқару: үйкеліс (сүргімен үйкеу)']] },
      { type: 'range', key: 'P', label: 'Қуат (жұмыс немесе жылу ағыны)', min: 5, max: 40, step: 5, value: 20, unit: 'Вт', digits: 0 },
    ],
    readouts: [
      { key: 't', label: 'Сымның температурасы', unit: '°C', digits: 1 },
      { key: 'Q', label: 'Ішкі энергияның өзгерісі ΔU', unit: 'Дж', digits: 0 },
      { key: 'how', label: 'Қалай өзгерді', text: true },
    ],
    init: function (api) { var S = api.S; S.T = 20; S.time = 0; S.ph = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P;
      S.time += dt; S.ph += dt * (P.way === 'heat' ? 1 : 8);
      var loss = (S.T - 20) * 0.06; // қоршаған ортаға жылу беру
      S.T += (P.P - loss) * dt / (M * C);
      if (S.time > 40) return false;
    },
    read: function (api) { var S = api.S; return { t: S.T, Q: (S.T - 20) * M * C, how: api.P.way === 'heat' ? 'жылу беру арқылы' : 'жұмыс атқару арқылы' }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.82, T = S.T;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.36, cy = table - 120;
      // қызған металдың түсі
      var glow = Math.max(0, Math.min(1, (T - 20) / 200));
      var col = 'rgb(' + Math.round(196 + 50 * glow) + ',' + Math.round(108 - 40 * glow) + ',' + Math.round(62 - 30 * glow) + ')';
      if (P.way === 'work') {
        var bend = Math.sin(S.ph) * 0.6;
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(cx - 120, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx + Math.cos(bend) * 120, cy + Math.sin(bend) * 120); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        R.sphere(ctx, cx - 130, cy, 18, '#e3b48a'); R.sphere(ctx, cx + Math.cos(bend) * 132, cy + Math.sin(bend) * 132, 18, '#e3b48a');
        R.tag(ctx, 'Иілген жерде сым қызады', cx, cy - 40, { size: 11 });
      } else if (P.way === 'heat') {
        R.burner(ctx, cx, table - 60, S.time, true);
        R.block(ctx, cx - 70, cy - 10, 140, 12, { c: col, t: 'metal', gloss: 1 }, { depth: 6, shadow: false });
        ctx.fillStyle = '#5c646b'; ctx.fillRect(cx + 70, cy - 10, 70, 10);
      } else {
        R.block(ctx, cx - 90, cy, 180, 30, { c: col, t: 'metal', gloss: 1 }, { depth: 10 });
        var fx = cx + Math.sin(S.ph) * 60;
        R.block(ctx, fx - 40, cy - 34, 80, 26, 'oak', { depth: 8, shadow: false });
        for (var i = 0; i < 6; i++) if (S.time > 0) { ctx.fillStyle = 'rgba(255,190,80,' + (0.3 + Math.random() * 0.4) + ')'; ctx.beginPath(); ctx.arc(fx + (Math.random() - 0.5) * 70, cy - 2, 1.5, 0, 7); ctx.fill(); }
      }
      // ұлғайтылған: кристалл торындағы бөлшектер
      var gx = W * 0.72, gy = H * 0.12, gs = Math.min(W * 0.24, 220);
      ctx.save(); ctx.fillStyle = 'rgba(20,30,40,.85)'; R.rr(ctx, gx, gy, gs, gs, 10); ctx.fill(); ctx.restore();
      var amp = 1 + (T - 20) * 0.06;
      for (var a = 0; a < 6; a++) for (var b = 0; b < 6; b++) {
        var x = gx + 22 + a * (gs - 44) / 5 + Math.sin(S.ph * 3 + a * 7 + b * 3) * amp, y = gy + 22 + b * (gs - 44) / 5 + Math.cos(S.ph * 2.6 + a * 5 + b * 11) * amp;
        R.sphere(ctx, x, y, 7, col);
      }
      R.txt(ctx, 'Мыс атомдарының тербелісі', gx + gs / 2, gy + gs + 14, { size: 10.5, color: '#333' });
      R.thermometer(ctx, gx + gs / 2 - 8, gy + gs + 30, Math.min(H - gy - gs - 50, 160), T, 0, 120, { step: 20 });
    },
  });
})();

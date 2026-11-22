/* Нанотехнология: масштабтар баспалдағы (метрден нанометрге дейін) және нанобөлшектегі беттік атомдардың үлесі. Алтын нанобөлшектерінің түсі өлшемге тәуелді. */
(function () {
  var R = window.Real;
  var SCALE = [[0, 'Адам', '1,7 м'], [-2, 'Құмырсқа', '1 см'], [-4, 'Шаштың жуандығы', '80 мкм'], [-5, 'Эритроцит', '7 мкм'], [-6, 'Бактерия', '1 мкм'], [-7, 'Вирус', '100 нм'], [-8, 'Нанобөлшек', '10 нм'], [-9, 'ДНҚ спиралі', '2 нм'], [-10, 'Атом', '0,1 нм']];
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.3, grid: false, static: true,
    hint: 'Масштабты кішірейтіп, наноәлемге «кір». Бөлшектің диаметрін азайтқанда беттік атомдардың үлесі қалай өседі? Неліктен алтын нанобөлшектері қызыл түсті?',
    controls: [
      { type: 'range', key: 'z', label: 'Масштаб (10ⁿ м)', min: -10, max: 0, step: 1, value: -8, digits: 0 },
      { type: 'range', key: 'd', label: 'Бөлшектің диаметрі d', min: 1, max: 100, step: 1, value: 5, unit: 'нм', digits: 0 },
    ],
    readouts: [
      { key: 'N', label: 'Бөлшектегі атомдар саны ≈ (d/a)³', digits: 0 },
      { key: 'f', label: 'Беттік атомдар үлесі ≈ 6a/d', unit: '%', digits: 1 },
      { key: 'sv', label: 'S/V = 6/d', unit: '1/нм', digits: 2 },
      { key: 'col', label: 'Алтын коллоидының түсі', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var d = api.P.d, a = 0.29; return { N: Math.round(Math.PI / 6 * Math.pow(d / a, 3) * 0.74), f: Math.min(100, 6 * a / d * 100), sv: 6 / d, col: goldName(d) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      // масштабтар баспалдағы
      var x0 = 30, x1 = wide ? W * 0.5 : W - 30, y = 40, rowH = wide ? (H - 80) / SCALE.length : 26;
      SCALE.forEach(function (s, i) {
        var yy = y + i * rowH, on = s[0] === P.z || (P.z === -3 && s[0] === -4) || (P.z === -1 && s[0] === -2);
        ctx.save(); R.rr(ctx, x0, yy, x1 - x0, rowH - 4, 6); ctx.fillStyle = on ? 'rgba(11,138,122,.25)' : (dark ? 'rgba(20,26,32,.7)' : 'rgba(255,255,255,.8)'); ctx.fill(); ctx.restore();
        var w = (x1 - x0 - 200) * (s[0] + 10) / 10 + 4; ctx.fillStyle = s[0] <= -7 ? '#7a3fb0' : '#1f5fd1'; ctx.fillRect(x0 + 120, yy + rowH * 0.3, w, rowH * 0.3);
        R.txt(ctx, s[1], x0 + 8, yy + rowH / 2 - 2, { size: W < 600 ? 9.5 : 11, align: 'left', weight: on ? '700' : '600', color: dark ? '#e6ecf0' : '#33404a' });
        R.txt(ctx, s[2], x1 - 8, yy + rowH / 2 - 2, { size: 10, align: 'right', mono: true, color: '#5b6670' });
      });
      ctx.fillStyle = 'rgba(122,63,176,.12)'; var ny = y + 5 * rowH; ctx.fillRect(x0 - 6, ny - 2, x1 - x0 + 12, 4 * rowH); R.tag(ctx, 'нанообласть: 1–100 нм', x1 - 70, ny + 2, { size: 9.5, color: '#7a3fb0' });
      // нанобөлшектің қимасы
      var cx = wide ? W * 0.76 : W / 2, cy = wide ? H * 0.38 : y + SCALE.length * rowH + 90, cr = wide ? Math.min(W * 0.18, H * 0.3) : 80;
      var a = 0.29, n = Math.max(3, Math.min(30, Math.round(P.d / a))), step = 2 * cr / n;
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
        var px = cx - cr + (i + 0.5) * step, py = cy - cr + (j + 0.5) * step, rr = Math.hypot(px - cx, py - cy);
        if (rr > cr) continue; var surf = rr > cr - step * 1.1;
        ctx.fillStyle = surf ? '#e0a800' : '#b8860b'; ctx.beginPath(); ctx.arc(px, py, step * 0.45, 0, 7); ctx.fill();
        if (surf) { ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 1; ctx.stroke(); }
      }
      R.tag(ctx, 'd = ' + P.d + ' нм; қызыл жиекті — беттегі атомдар', cx, cy + cr + 18, { size: 10 });
      // алтын коллоидының пробиркасы
      var gx = wide ? W * 0.76 : W / 2, gy = wide ? H * 0.78 : cy + cr + 46;
      if (gy + 40 < H) { var gc = goldColor(P.d); ctx.save(); R.rr(ctx, gx - 60, gy, 120, 34, 10); ctx.fillStyle = gc; ctx.fill(); ctx.strokeStyle = 'rgba(80,120,140,.8)'; ctx.stroke(); ctx.restore(); R.txt(ctx, 'Au коллоиды: ' + goldName(P.d), gx, gy + 48, { size: 10, color: '#5b6670' }); }
    },
  });
  function goldColor(d) { if (d < 3) return '#b05a3a'; if (d < 30) return '#c0283c'; if (d < 60) return '#8a2a6a'; return '#5a4a8a'; }
  function goldName(d) { return d < 3 ? 'қоңыр' : d < 30 ? 'рубин-қызыл' : d < 60 ? 'күлгін' : 'көкшіл'; }
})();

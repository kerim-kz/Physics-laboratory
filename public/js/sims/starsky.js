/* Түнгі аспан: солтүстік жақ. Жұлдыздар Темірқазықты (Полярная) айнала тәулігіне бір рет айналады.
   Жеті қарақшы (Үлкен Аю), Кіші Аю, Кассиопея. Көкжиектен биіктігі бақылаушының ендігіне тең. */
(function () {
  var R = window.Real;
  // [еңкею (°), тура шығу (сағ), жұлдыздық шама, атауы]
  var STARS = [
    [89.26, 2.53, 2.0, 'Темірқазық'],
    // Жеті қарақшы (Үлкен Аю шөмiшi)
    [61.75, 11.06, 1.8, 'Дубхе'], [56.38, 11.03, 2.4, 'Мерак'], [53.69, 11.9, 2.4, 'Фекда'], [57.03, 12.26, 3.3, 'Мегрец'],
    [55.96, 12.9, 1.8, 'Алиот'], [54.93, 13.4, 2.2, 'Мицар'], [49.31, 13.79, 1.9, 'Бенетнаш'],
    // Кіші Аю
    [86.59, 17.54, 4.4, ''], [82.04, 16.77, 4.2, ''], [77.79, 15.73, 4.3, ''], [74.16, 14.85, 2.1, 'Кохаб'], [71.83, 15.35, 3.0, 'Феркад'], [75.76, 16.29, 5.0, ''],
    // Кассиопея (W)
    [59.15, 0.15, 2.3, ''], [56.54, 0.68, 2.2, 'Шедар'], [60.72, 0.95, 2.4, ''], [60.24, 1.43, 2.7, ''], [63.67, 1.91, 3.4, ''],
  ];
  var LINES = [[1, 2], [2, 3], [3, 4], [4, 1], [4, 5], [5, 6], [6, 7], [0, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 10], [14, 15], [15, 16], [16, 17], [17, 18]];
  var SEED = R.rng(42), BG = [];
  for (var i = 0; i < 260; i++) BG.push([30 + SEED() * 60, SEED() * 24, 4 + SEED() * 2]);
  Sim.create({
    aspect: 0.62, grid: false,
    hint: '«Бастау» бас: уақыт 1 сағатты 1 секундқа сығады. Жұлдыздар Темірқазықты сағат тіліне қарсы айналады.',
    controls: [
      { type: 'range', key: 'lat', label: 'Бақылаушының ендігі', min: 40, max: 56, step: 1, value: 43, unit: '° с. е.', digits: 0 },
      { type: 'range', key: 'hour', label: 'Бастапқы жергілікті жұлдыздық уақыт', min: 0, max: 23, step: 1, value: 21, unit: 'сағ', digits: 0 },
      { type: 'check', key: 'lines', label: 'Шоқжұлдыз сызықтары', value: true, live: true },
      { type: 'check', key: 'trails', label: 'Жұлдыз іздері (ұзақ экспозиция)', value: false, live: true },
    ],
    readouts: [
      { key: 'time', label: 'Өткен уақыт', unit: 'сағ', digits: 1 },
      { key: 'polaris', label: 'Темірқазықтың биіктігі', unit: '°', digits: 0 },
      { key: 'turn', label: 'Аспанның бұрылу бұрышы', unit: '°', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; api.S.trails = []; },
    step: function (api, dt) { api.S.t += dt; if (api.S.t >= 24) return false; },
    read: function (api) { return { time: api.S.t, polaris: api.P.lat, turn: api.S.t * 15 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, lst = (P.hour + S.t) % 24, lat = P.lat * Math.PI / 180;
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#040814'); g.addColorStop(0.75, '#0d1b33'); g.addColorStop(1, '#1d2f4a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // солтүстікке қарағандағы проекция (азимут — x, биіктік — y)
      var fov = 100, cx = W / 2, horizonY = H * 0.88, pxDeg = W / fov;
      var proj = function (dec, ra) {
        var Hh = (lst - ra) * 15 * Math.PI / 180, d = dec * Math.PI / 180;
        var alt = Math.asin(Math.sin(d) * Math.sin(lat) + Math.cos(d) * Math.cos(lat) * Math.cos(Hh));
        var az = Math.atan2(-Math.cos(d) * Math.sin(Hh), Math.sin(d) * Math.cos(lat) - Math.cos(d) * Math.sin(lat) * Math.cos(Hh));
        return [cx + az * 180 / Math.PI * pxDeg, horizonY - alt * 180 / Math.PI * pxDeg, alt];
      };
      BG.forEach(function (s) { var p = proj(s[0], s[1]); if (p[2] > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.9 - (s[2] - 4) * 0.35) + ')'; ctx.fillRect(p[0], p[1], 1.2, 1.2); } });
      if (P.lines) {
        ctx.strokeStyle = 'rgba(120,170,255,.45)'; ctx.lineWidth = 1.2;
        LINES.forEach(function (l) { var a = proj(STARS[l[0]][0], STARS[l[0]][1]), b = proj(STARS[l[1]][0], STARS[l[1]][1]); if (a[2] > 0 && b[2] > 0) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } });
      }
      if (P.trails) {
        ctx.save(); ctx.lineWidth = 1.2;
        STARS.forEach(function (s) {
          ctx.strokeStyle = 'rgba(255,240,200,.35)'; ctx.beginPath();
          for (var tt = 0; tt <= S.t; tt += 0.1) { var q = (function () { var L = (P.hour + tt) % 24, Hh = (L - s[1]) * 15 * Math.PI / 180, d = s[0] * Math.PI / 180; var alt = Math.asin(Math.sin(d) * Math.sin(lat) + Math.cos(d) * Math.cos(lat) * Math.cos(Hh)); var az = Math.atan2(-Math.cos(d) * Math.sin(Hh), Math.sin(d) * Math.cos(lat) - Math.cos(d) * Math.sin(lat) * Math.cos(Hh)); return [cx + az * 180 / Math.PI * pxDeg, horizonY - alt * 180 / Math.PI * pxDeg]; })(); if (tt === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
          ctx.stroke();
        });
        ctx.restore();
      }
      STARS.forEach(function (s) {
        var p = proj(s[0], s[1]); if (p[2] <= 0) return;
        var r = Math.max(1, 4.2 - s[2] * 0.8);
        var gl = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 3);
        gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(0.3, 'rgba(220,235,255,.8)'); gl.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p[0], p[1], r * 3, 0, 7); ctx.fill();
        if (s[3]) R.txt(ctx, s[3], p[0] + 8, p[1] - 8, { size: 10, align: 'left', color: s[3] === 'Темірқазық' ? '#ffd76a' : 'rgba(200,215,240,.85)' });
      });
      // көкжиек: таулар силуэті (Іле Алатауы сияқты)
      ctx.fillStyle = '#0a0f17'; ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= W; x += 10) ctx.lineTo(x, horizonY - 10 - 18 * Math.abs(Math.sin(x / 70)) - 10 * Math.sin(x / 23));
      ctx.lineTo(W, H); ctx.fill();
      R.txt(ctx, 'СОЛТҮСТІК', cx, H - 12, { size: 11, color: '#8aa0bf' });
      R.txt(ctx, 'батыс ←', 40, H - 12, { size: 10, color: '#8aa0bf' }); R.txt(ctx, '→ шығыс', W - 44, H - 12, { size: 10, color: '#8aa0bf' });
    },
  });
})();

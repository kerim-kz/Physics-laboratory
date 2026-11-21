/* Жергілікті, белдеулік және бүкіләлемдік уақыт. Жер солтүстік полюс жақтан көрінеді; Күн сәулесі оң жақтан түседі.
   Жергілікті уақыт: T = T₀ + λ/15°; белдеулік уақыт: T = T₀ + n. */
(function () {
  var R = window.Real, rad = Math.PI / 180;
  // [атауы, бойлық λ (°, шығыс +), белдеулік уақыт ығысуы n (сағ)]
  var CITIES = {
    london: ['Лондон (Гринвич)', 0, 0], aktau: ['Ақтау', 51.2, 5], astana: ['Астана', 71.4, 5], almaty: ['Алматы', 76.9, 5], oskemen: ['Өскемен', 82.6, 5],
    moscow: ['Мәскеу', 37.6, 3], istanbul: ['Стамбұл', 29.0, 3], delhi: ['Дели', 77.2, 5.5], beijing: ['Бейжің', 116.4, 8], tokyo: ['Токио', 139.7, 9], ny: ['Нью-Йорк', -74.0, -5],
  };
  function wrap(h) { return ((h % 24) + 24) % 24; }
  function hm(h) { h = wrap(h); var H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H = (H + 1) % 24; M = 0; } return (H < 10 ? '0' : '') + H + ':' + (M < 10 ? '0' : '') + M; }
  Sim.create({
    aspect: 0.6, grid: false, keepRunning: true,
    hint: 'Бүкіләлемдік уақытты өзгертіп, екі қаланың жергілікті уақыттарының айырымы олардың бойлықтарының айырымына (1 сағ = 15°) тең екенін тексер.',
    controls: [
      { type: 'range', key: 'ut', label: 'Бүкіләлемдік (Гринвич) уақыт T₀', min: 0, max: 23.75, step: 0.25, value: 7, unit: 'сағ', format: function (v) { return hm(v); }, live: true },
      { type: 'select', key: 'a', label: '1-қала', value: 'aktau', options: Object.keys(CITIES).map(function (k) { return [k, CITIES[k][0]]; }), live: true },
      { type: 'select', key: 'b', label: '2-қала', value: 'oskemen', options: Object.keys(CITIES).map(function (k) { return [k, CITIES[k][0]]; }), live: true },
    ],
    readouts: [
      { key: 'la', label: '1-қаланың жергілікті уақыты', text: true },
      { key: 'lb', label: '2-қаланың жергілікті уақыты', text: true },
      { key: 'dl', label: 'Бойлықтар айырымы Δλ', unit: '°', digits: 1 },
      { key: 'dt', label: 'Жергілікті уақыттар айырымы Δλ / 15°', unit: 'мин', digits: 0 },
      { key: 'za', label: '1-қаланың белдеулік (ресми) уақыты', text: true },
      { key: 'zb', label: '2-қаланың белдеулік (ресми) уақыты', text: true },
    ],
    init: function (api) { api.S.spin = 0; },
    step: function (api, dt) { var v = api.P.ut + dt * 0.5; if (v >= 24) v -= 24; api.set('ut', Math.round(v * 400) / 400); },
    read: function (api) {
      var P = api.P, A = CITIES[P.a], B = CITIES[P.b];
      return { la: hm(P.ut + A[1] / 15), lb: hm(P.ut + B[1] / 15), dl: A[1] - B[1], dt: (A[1] - B[1]) * 4, za: hm(P.ut + A[2]) + ' (UTC' + (A[2] >= 0 ? '+' : '−') + Math.abs(A[2]) + ')', zb: hm(P.ut + B[2]) + ' (UTC' + (B[2] >= 0 ? '+' : '−') + Math.abs(B[2]) + ')' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P;
      R.scene(ctx, W, H, 'space', { seed: 3, count: 140 });
      var wide = W > 640, cx = wide ? W * 0.33 : W / 2, cy = wide ? H / 2 : H * 0.36, Re = Math.min(wide ? W * 0.27 : W * 0.4, (wide ? H : H * 0.66) * 0.42);
      // Күн сәулелері (оң жақтан)
      ctx.save(); ctx.strokeStyle = 'rgba(255,214,102,.55)'; ctx.fillStyle = 'rgba(255,214,102,.55)'; ctx.lineWidth = 2;
      for (var k = -2; k <= 2; k++) { var y = cy + k * Re * 0.38, x1 = cx + Re + 46, x2 = cx + Re + 14; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 + 6, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 + 8, y - 4); ctx.lineTo(x2 + 8, y + 4); ctx.fill(); }
      ctx.restore();
      R.tag(ctx, '← Күн', cx + Re + 34, cy - Re * 0.38 * 2 - 20, { size: 10.5, color: '#8a6100' });
      // Жер: Гринвич меридианының бұрышы. Түс (12:00 жергілікті) — Күнге қараған жақта (оң жақ).
      // λ бойлықтағы нүктенің бұрышы: θ = (T₀ + λ/15 − 12)·15° (сағат тіліне қарсы айналады, солтүстік полюстен қарағанда).
      var theta0 = (P.ut - 12) * 15 * rad;
      var ang = function (lon) { return -(theta0 + lon * rad); };
      var g = ctx.createRadialGradient(cx - Re * 0.2, cy - Re * 0.2, Re * 0.1, cx, cy, Re);
      g.addColorStop(0, '#4f9be0'); g.addColorStop(1, '#173e75');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Re, 0, 7); ctx.fill();
      // уақыт белдеулері (15°)
      for (var z = 0; z < 24; z++) {
        var a1 = ang(z * 15 - 7.5), a2 = ang(z * 15 + 7.5);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, Re, a2, a1); ctx.closePath();
        ctx.fillStyle = z % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'; ctx.fill();
        var am = ang(z * 15), n = z > 12 ? z - 24 : z;
        R.txt(ctx, (n > 0 ? '+' : '') + n, cx + Math.cos(am) * (Re + 13), cy + Math.sin(am) * (Re + 13), { size: 9, color: '#c9d6e2', weight: '600' });
      }
      // меридиандар
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
      for (var m = 0; m < 360; m += 15) { var am2 = ang(m); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(am2) * Re, cy + Math.sin(am2) * Re); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,214,102,.9)'; ctx.lineWidth = 2; var ag = ang(0); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ag) * Re, cy + Math.sin(ag) * Re); ctx.stroke();
      // түн жағы
      ctx.fillStyle = 'rgba(0,0,12,.62)'; ctx.beginPath(); ctx.arc(cx, cy, Re, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,102,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy - Re); ctx.lineTo(cx, cy + Re); ctx.stroke();
      R.txt(ctx, 'ТҮН', cx - Re * 0.5, cy - Re * 0.62, { size: 11, color: 'rgba(220,230,255,.75)', weight: '700' }); R.txt(ctx, 'КҮНДІЗ', cx + Re * 0.5, cy - Re * 0.62, { size: 11, color: 'rgba(255,240,200,.9)', weight: '700' });
      ctx.fillStyle = '#e8eef3'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
      R.txt(ctx, 'С. полюс', cx, cy + 14, { size: 9, color: '#e8eef3' });
      // қалалар
      ['a', 'b'].forEach(function (key, i) {
        var C = CITIES[P[key]], a = ang(C[1]), r = Re * 0.72, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx.fillStyle = i ? '#ff8f6b' : '#7fe0a0'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        R.tag(ctx, C[0], x, y - 16, { size: 10.5, color: i ? '#b4342a' : '#1d7a33' });
      });
      var gx = cx + Math.cos(ang(0)) * (Re * 0.9), gy = cy + Math.sin(ang(0)) * (Re * 0.9);
      R.tag(ctx, 'Гринвич', gx, gy, { size: 9.5, color: '#6b5200' });
      // сағаттар
      var ax0 = cx + Re + 60, colW = (W - ax0 - 10) / 2;
      var cs = wide ? Math.min(H * 0.17, colW * 0.36) : Math.min(W * 0.13, H * 0.11);
      var list = [['Гринвич (T₀)', P.ut, '#6b5200'], [CITIES[P.a][0] + ' (жерг.)', P.ut + CITIES[P.a][1] / 15, '#1d7a33'], [CITIES[P.b][0] + ' (жерг.)', P.ut + CITIES[P.b][1] / 15, '#b4342a']];
      list.forEach(function (it, i) {
        var x, y;
        if (wide) { x = i === 0 ? ax0 + colW : ax0 + colW * (i === 1 ? 0.5 : 1.5); y = i === 0 ? H * 0.24 : H * 0.66; }
        else { x = W * (0.18 + i * 0.32); y = H * 0.82; }
        clock(ctx, x, y, cs, it[1]);
        R.tag(ctx, wide ? it[0] + ': ' + hm(it[1]) : it[0].replace(/ \(.*\)/, '') + ' ' + hm(it[1]), x, y + cs + 16, { size: wide ? 11 : 9, color: it[2] });
      });
    },
  });
  function clock(ctx, x, y, r, h) {
    h = wrap(h);
    ctx.save();
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dfe4e8');
    ctx.fillStyle = '#2c3238'; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 7); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#222';
    for (var i = 0; i < 60; i++) { var a = i / 60 * 2 * Math.PI, big = i % 5 === 0; ctx.lineWidth = big ? 2 : 0.7; ctx.beginPath(); ctx.moveTo(x + Math.sin(a) * r * (big ? 0.82 : 0.9), y - Math.cos(a) * r * (big ? 0.82 : 0.9)); ctx.lineTo(x + Math.sin(a) * r * 0.97, y - Math.cos(a) * r * 0.97); ctx.stroke(); }
    var hr = (h % 12) / 12 * 2 * Math.PI, mn = (h % 1) * 2 * Math.PI;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, r * 0.08); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(hr) * r * 0.5, y - Math.cos(hr) * r * 0.5); ctx.stroke();
    ctx.lineWidth = Math.max(1.6, r * 0.05); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(mn) * r * 0.75, y - Math.cos(mn) * r * 0.75); ctx.stroke();
    ctx.fillStyle = '#c62f22'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    R.txt(ctx, h >= 6 && h < 18 ? '☀' : '☾', x, y + r * 0.45, { size: r * 0.28, color: h >= 6 && h < 18 ? '#d89a00' : '#3a4a6a' });
    ctx.restore();
  }
})();

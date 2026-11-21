/* Электромагниттік толқындар шкаласы: радиотолқындардан гамма-сәулелерге дейін. λ = c/ν, фотон энергиясы E = hν. */
(function () {
  var R = window.Real, c = 3e8, h = 6.626e-34, eV = 1.602e-19;
  // [атауы, λ_min (м), λ_max (м), түс, көзі, қолданылуы]
  var BANDS = [
    ['Радиотолқындар', 1e-3, 1e4, '#7a8fa6', 'Радиостанция антенналары, найзағай, ғарыш объектілері', 'Радио, теледидар, ұялы байланыс, Wi‑Fi'],
    ['Инфрақызыл сәулелер', 7.6e-7, 1e-3, '#c0392b', 'Кез келген қызған дене (адам, пеш, Күн)', 'Жылу көргіштер, қашықтан басқару пульті, термометр'],
    ['Көрінетін жарық', 3.8e-7, 7.6e-7, null, 'Күн, шамдар, жалын', 'Көру, фотография, оптикалық талшық'],
    ['Ультракүлгін сәулелер', 1e-8, 3.8e-7, '#7b3fe0', 'Күн, кварц шамы, электр доғасы', 'Залалсыздандыру, D дәрумені, банкнот тексеру'],
    ['Рентген сәулелері', 1e-11, 1e-8, '#3a7bd5', 'Рентген түтігі, Күн тәжі', 'Медицина, әуежайдағы тексеру, кристалл құрылымы'],
    ['Гамма-сәулелер', 1e-15, 1e-11, '#0b8a7a', 'Радиоактивті ядролар, ғарыштық сәулелер', 'Обырды емдеу, стерильдеу, дефектоскопия'],
  ];
  function bandOf(l) { for (var i = 0; i < BANDS.length; i++) if (l >= BANDS[i][1] && l < BANDS[i][2]) return BANDS[i]; return BANDS[0]; }
  function vis(l) { // толқын ұзындығы (нм) → RGB
    var nm = l * 1e9, r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else r = 1;
    var f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (760 - nm) / 60 : 1;
    return 'rgb(' + Math.round(255 * r * f) + ',' + Math.round(255 * g * f) + ',' + Math.round(255 * b * f) + ')';
  }
  Sim.create({
    aspect: 0.6, grid: false, static: true,
    hint: 'Жүгіртпені жылжытып, толқын ұзындығын өзгерт. Толқын ұзындығы азайғанда жиілік пен фотон энергиясы қалай өзгереді?',
    controls: [
      { type: 'range', key: 'lg', label: 'Толқын ұзындығы λ (логарифмдік шкала)', min: -14, max: 3, step: 0.05, value: -6.27, format: function (v) { return fmtL(Math.pow(10, v)); } },
    ],
    readouts: [
      { key: 'band', label: 'Диапазон', text: true },
      { key: 'l', label: 'Толқын ұзындығы λ', text: true },
      { key: 'nu', label: 'Жиілік ν = c / λ', unit: 'Гц', digits: 3 },
      { key: 'E', label: 'Фотон энергиясы E = hν', unit: 'эВ', digits: 3 },
    ],
    init: function () {},
    step: function () { return false; },
    read: function (api) { var l = Math.pow(10, api.P.lg); return { band: bandOf(l)[0], l: fmtL(l), nu: c / l, E: h * c / l / eV }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, l = Math.pow(10, P.lg), B = bandOf(l), dark = R.isDark();
      ctx.fillStyle = dark ? '#11161b' : '#f4f6f8'; ctx.fillRect(0, 0, W, H);
      var x0 = 24, x1 = W - 24, lgMin = -14, lgMax = 3, X = function (lg) { return x0 + (lgMax - lg) / (lgMax - lgMin) * (x1 - x0); }; // солдан оңға: λ кемиді
      var by = H * 0.42, bh = 34;
      // диапазон жолағы
      BANDS.forEach(function (b) {
        var xa = X(Math.log10(b[2])), xb = X(Math.log10(b[1]));
        if (b[3]) { ctx.fillStyle = b[3]; ctx.globalAlpha = 0.8; ctx.fillRect(xa, by, xb - xa, bh); ctx.globalAlpha = 1; }
        else { var gr = ctx.createLinearGradient(xa, 0, xb, 0); for (var i = 0; i <= 10; i++) gr.addColorStop(i / 10, vis(7.6e-7 - i / 10 * 3.8e-7)); ctx.fillStyle = gr; ctx.fillRect(xa, by, xb - xa, bh); }
        var mid = (xa + xb) / 2, wdt = xb - xa;
        if (wdt > 50) R.txt(ctx, b[0].split(' ')[0], mid, by + bh / 2, { size: 10.5, color: '#fff', weight: '700' });
      });
      // көрінетін жарықтың үлкейтілген бөлігі
      var vx0 = X(Math.log10(7.6e-7)), vx1 = X(Math.log10(3.8e-7)), zy = by + bh + 50, zx0 = W * 0.3, zx1 = W * 0.7;
      ctx.strokeStyle = dark ? '#6b7680' : '#9aa3ab'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(vx0, by + bh); ctx.lineTo(zx0, zy); ctx.moveTo(vx1, by + bh); ctx.lineTo(zx1, zy); ctx.stroke();
      var zg = ctx.createLinearGradient(zx0, 0, zx1, 0); for (var j = 0; j <= 20; j++) zg.addColorStop(j / 20, vis(7.6e-7 - j / 20 * 3.8e-7));
      ctx.fillStyle = zg; ctx.fillRect(zx0, zy, zx1 - zx0, 22);
      [760, 620, 590, 570, 495, 450, 380].forEach(function (nm) { var x = zx0 + (760 - nm) / 380 * (zx1 - zx0); R.txt(ctx, nm + '', x, zy + 34, { size: 9, color: dark ? '#c9d2d9' : '#3a4148' }); });
      R.txt(ctx, 'нм', zx1 + 16, zy + 34, { size: 9, color: dark ? '#c9d2d9' : '#3a4148' });
      // шкала белгілері
      for (var e = 3; e >= -14; e--) {
        var x = X(e); ctx.fillStyle = dark ? '#c9d2d9' : '#3a4148'; ctx.fillRect(x - 0.5, by - 8, 1, 8);
        if ((e % 3 === 0) || W > 900) R.txt(ctx, e === 0 ? '1 м' : '10' + sup(e), x, by - 16, { size: 9.5, color: dark ? '#c9d2d9' : '#3a4148' });
      }
      R.txt(ctx, 'λ, м', x0 + 10, by - 34, { size: 10, color: dark ? '#c9d2d9' : '#3a4148', align: 'left' });
      R.txt(ctx, '← ұзын толқын, аз энергия', x0, by + bh + 16, { size: 10, color: dark ? '#9fb0bd' : '#5b6670', align: 'left' });
      R.txt(ctx, 'қысқа толқын, көп энергия →', x1, by + bh + 16, { size: 10, color: dark ? '#9fb0bd' : '#5b6670', align: 'right' });
      // жүгірткі
      var mx = X(P.lg);
      ctx.fillStyle = '#d2382b'; ctx.beginPath(); ctx.moveTo(mx, by - 2); ctx.lineTo(mx - 8, by - 16); ctx.lineTo(mx + 8, by - 16); ctx.fill();
      ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, by); ctx.lineTo(mx, by + bh); ctx.stroke();
      // толқын суреті (салыстырмалы ұзындығы)
      var wy = H * 0.16, wcol = B[3] || vis(l), per = Math.max(6, Math.min(W * 0.4, 18 + (P.lg + 14) / 17 * (W * 0.38)));
      ctx.save(); ctx.strokeStyle = wcol; ctx.lineWidth = 2.5; ctx.beginPath();
      for (var xx = 20; xx <= W - 20; xx += 1) { var yy = wy + Math.sin((xx - 20) / per * 2 * Math.PI) * 22; if (xx === 20) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      ctx.stroke(); ctx.restore();
      R.tag(ctx, B[0] + ': λ = ' + fmtL(l), W / 2, wy - 36, { size: 12.5, color: '#1b2329' });
      // көздері және қолданылуы
      var iy = H * 0.86;
      R.tag(ctx, 'Көзі: ' + B[4], W / 2, iy - 12, { size: W < 600 ? 9 : 11 });
      R.tag(ctx, 'Қолданылуы: ' + B[5], W / 2, iy + 16, { size: W < 600 ? 9 : 11, color: '#0b6b78' });
    },
  });
  function sup(e) { var S = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }; return String(e).split('').map(function (ch) { return S[ch]; }).join(''); }
  function fmtL(l) {
    if (l >= 1000) return Sim.fmt(l / 1000, 2).replace('.', ',') + ' км';
    if (l >= 1) return Sim.fmt(l, 2).replace('.', ',') + ' м';
    if (l >= 1e-2) return Sim.fmt(l * 100, 2).replace('.', ',') + ' см';
    if (l >= 1e-3) return Sim.fmt(l * 1000, 2).replace('.', ',') + ' мм';
    if (l >= 1e-6) return Sim.fmt(l * 1e6, 2).replace('.', ',') + ' мкм';
    if (l >= 1e-9) return Sim.fmt(l * 1e9, 1).replace('.', ',') + ' нм';
    return Sim.fmt(l * 1e12, 3).replace('.', ',') + ' пм';
  }
})();

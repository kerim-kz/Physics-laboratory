/* Спектрлер және спектрлік талдау: спектроскоп арқылы қызған дененің тұтас спектрі, газдардың сызықтық шығару спектрі және жұтылу спектрі. Белгісіз қоспаның құрамын анықтау. */
(function () {
  var R = window.Real;
  var EL = {
    H: ['Сутегі', [[410, .5], [434, .6], [486, .8], [656, 1]]],
    He: ['Гелий', [[447, .6], [471, .4], [492, .4], [501, .6], [588, 1], [668, .5], [707, .5]]],
    Na: ['Натрий', [[589, 1], [590, .9]]],
    Hg: ['Сынап', [[405, .7], [436, .9], [546, 1], [577, .7], [579, .7]]],
    Ne: ['Неон', [[585, .7], [588, .6], [603, .6], [614, .8], [640, 1], [650, .8], [660, .6], [693, .7], [703, .7]]],
  };
  function wl2rgb(l) { var r = 0, g = 0, b = 0; if (l < 440) { r = -(l - 440) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = -(l - 510) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else r = 1; var f = l < 420 ? 0.3 + 0.7 * (l - 380) / 40 : l > 700 ? 0.3 + 0.7 * (780 - l) / 80 : 1; return [r * f, g * f, b * f]; }
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.3, grid: false, static: true,
    hint: 'Әр химиялық элементтің сызықтық спектрі — оның «саусақ ізі». Белгісіз газдың спектрін эталон спектрлермен салыстырып, оның құрамын анықта.',
    controls: [
      { type: 'select', key: 'type', label: 'Спектр түрі', value: 'emit', options: [['cont', 'Тұтас (қызған қатты дене)'], ['emit', 'Сызықтық шығару (газ)'], ['abs', 'Жұтылу (газ арқылы ақ жарық)'], ['mystery', 'Белгісіз газ қоспасы']] },
      { type: 'select', key: 'el', label: 'Газ', value: 'H', options: Object.keys(EL).map(function (k) { return [k, EL[k][0]]; }) },
    ],
    readouts: [
      { key: 'n', label: 'Көрінетін сызықтар саны', digits: 0 },
      { key: 'lines', label: 'Ең жарық сызық', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var P = api.P; if (P.type === 'cont') return { n: null, lines: 'тұтас спектр' }; var L = P.type === 'mystery' ? mystery() : EL[P.el][1]; var b = L.reduce(function (a, q) { return q[1] > a[1] ? q : a; }); return { n: L.length, lines: b[0] + ' нм' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      // спектроскоп сызбасы
      var sy = wide ? 70 : 54, sx = 30;
      ctx.fillStyle = P.type === 'cont' ? '#ffcc66' : P.type === 'abs' ? '#fff6d0' : rgbStr(wl2rgb(EL[P.el][1].reduce(function (a, q) { return q[1] > a[1] ? q : a; })[0]));
      if (P.type === 'mystery') ctx.fillStyle = '#d0a8ff';
      ctx.beginPath(); ctx.ellipse(sx + 24, sy, 14, 30, 0, 0, 7); ctx.fill(); R.txt(ctx, P.type === 'cont' ? 'қыздыру шамы' : 'газ разрядты түтік', sx + 24, sy + 44, { size: 9.5, color: '#5b6670' });
      if (P.type === 'abs') { ctx.fillStyle = 'rgba(200,200,255,.35)'; ctx.fillRect(sx + 50, sy - 20, 40, 40); R.txt(ctx, 'суық газ', sx + 70, sy + 30, { size: 9.5, color: '#5b6670' }); }
      ctx.fillStyle = '#4a525b'; ctx.fillRect(sx + 100, sy - 12, 70, 24); ctx.fillStyle = 'rgba(190,220,240,.7)'; ctx.beginPath(); ctx.moveTo(sx + 190, sy + 26); ctx.lineTo(sx + 220, sy - 26); ctx.lineTo(sx + 250, sy + 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a525b'; ctx.fillRect(sx + 262, sy - 12, 80, 24); R.txt(ctx, 'коллиматор → призма → көру түтігі', sx + 220, sy + 44, { size: 9.5, color: '#5b6670' });
      // спектр жолақтары
      var x0 = 40, x1 = W - 30, y = wide ? H * 0.32 : H * 0.24, h = wide ? 60 : 44;
      var X = function (l) { return x0 + (l - 380) / (750 - 380) * (x1 - x0); };
      function band(yy, lines, type, label) {
        ctx.fillStyle = '#05070a'; ctx.fillRect(x0, yy, x1 - x0, h);
        if (type === 'cont' || type === 'abs') for (var l = 380; l <= 750; l += 1) { ctx.fillStyle = rgbStr(wl2rgb(l)); ctx.fillRect(X(l), yy, (x1 - x0) / 370 + 1, h); }
        if (type === 'abs') lines.forEach(function (q) { ctx.fillStyle = 'rgba(0,0,0,' + (0.5 + 0.5 * q[1]) + ')'; ctx.fillRect(X(q[0]) - 1.5, yy, 3, h); });
        if (type === 'emit') lines.forEach(function (q) { var c = wl2rgb(q[0]); ctx.fillStyle = 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + (0.4 + 0.6 * q[1]) + ')'; ctx.fillRect(X(q[0]) - 1.5, yy, 3, h); ctx.shadowColor = rgbStr(c); ctx.shadowBlur = 8; ctx.fillRect(X(q[0]) - 1, yy, 2, h); ctx.shadowBlur = 0; });
        if (label) R.txt(ctx, label, x0 - 4, yy + h / 2, { size: 10.5, weight: '700', align: 'right', color: dark ? '#e6ecf0' : '#33404a' });
      }
      var main = P.type === 'mystery' ? mystery() : EL[P.el][1];
      band(y, main, P.type === 'mystery' ? 'emit' : P.type, '');
      for (var l2 = 400; l2 <= 740; l2 += 20) { ctx.fillStyle = dark ? '#c9cfd4' : '#33404a'; ctx.fillRect(X(l2), y + h, 1, 6); if (l2 % 40 === 0) R.txt(ctx, String(l2), X(l2), y + h + 14, { size: 9, color: dark ? '#c9cfd4' : '#33404a' }); }
      R.txt(ctx, 'λ, нм', x1 - 10, y + h + 26, { size: 9.5, color: '#5b6670' });
      // эталондар (белгісіз газ үшін немесе салыстыру үшін)
      var ey = y + h + 44, eh = Math.min(30, (H - ey - 20) / 5 - 6);
      if (P.type === 'mystery' || P.type === 'emit') {
        R.txt(ctx, 'Эталон спектрлер:', x0, ey - 8, { size: 10.5, weight: '700', align: 'left', color: dark ? '#e6ecf0' : '#33404a' });
        var keys = Object.keys(EL); var save = h; h = eh;
        keys.forEach(function (k, i) { band(ey + 6 + i * (eh + 6), EL[k][1], 'emit', ''); R.txt(ctx, EL[k][0], x0 + 4, ey + 6 + i * (eh + 6) + eh / 2, { size: 9.5, align: 'left', color: '#e6ecf0', weight: '700' }); });
        h = save;
      } else R.tag(ctx, P.type === 'cont' ? 'Қызған қатты және сұйық денелер, тығыз газдар тұтас спектр береді' : 'Суық газ өзі шығаратын толқын ұзындықтарын жұтады (Кирхгоф)', W / 2, ey + 20, { size: W < 600 ? 9.5 : 11, color: '#0b6b78' });
    },
  });
  function mystery() { return EL.H[1].concat(EL.Na[1]); }
  function rgbStr(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }
})();

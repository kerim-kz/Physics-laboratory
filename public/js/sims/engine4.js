/* Төрт тактілі іштен жану қозғалтқышы: сору, сығу, жұмыс жүрісі, шығару. ПӘК η = A / Q₁. */
(function () {
  var R = window.Real;
  var STROKES = ['1. Сору: жанармай қоспасы цилиндрге кіреді', '2. Сығу: қоспа сығылып, қызады', '3. Жұмыс жүрісі: от алдырғыштан ұшқын, газ поршеньді итереді', '4. Шығару: пайдаланылған газ шығады'];
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Айналу жиілігін азайтып, әр тактіні бақыла. Тек 3-тактіде газ пайдалы жұмыс атқарады.',
    controls: [
      { type: 'range', key: 'rpm', label: 'Айналу жиілігі (баяулатылған)', min: 2, max: 60, step: 1, value: 10, unit: 'айн/мин', digits: 0 },
      { type: 'range', key: 'Q1', label: 'Бір циклдегі жанармай жылуы Q₁', min: 500, max: 2000, step: 100, value: 1200, unit: 'Дж', digits: 0 },
      { type: 'range', key: 'Q2', label: 'Суытқышқа берілетін жылу Q₂', min: 300, max: 1800, step: 100, value: 800, unit: 'Дж', digits: 0 },
    ],
    readouts: [
      { key: 'st', label: 'Такт', text: true },
      { key: 'A', label: 'Пайдалы жұмыс A = Q₁ − Q₂', unit: 'Дж', digits: 0 },
      { key: 'eta', label: 'ПӘК η = A / Q₁', unit: '%', digits: 0 },
    ],
    init: function (api) { api.S.ang = 0; },
    step: function (api, dt) { api.S.ang += dt * api.P.rpm / 60 * Math.PI * 2; },
    read: function (api) { var P = api.P, A = Math.max(0, P.Q1 - P.Q2); return { st: STROKES[Math.floor(((api.S.ang % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI) / Math.PI)], A: A, eta: A / P.Q1 * 100 }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, cx = W * 0.36, table = H * 0.97;
      R.scene(ctx, W, H, 'wall');
      var phase = ((S.ang % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI), stroke = Math.floor(phase / Math.PI);
      var crankR = H * 0.09, rodL = H * 0.26, crankY = H * 0.74;
      var a = S.ang, ex = cx + Math.sin(a) * crankR, ey = crankY - Math.cos(a) * crankR;
      var pistonY = ey - Math.sqrt(rodL * rodL - Math.pow(ex - cx, 2));
      var cw = H * 0.22, top = crankY - crankR - rodL - H * 0.06;
      // маховик (артта)
      ctx.strokeStyle = 'rgba(60,66,72,.55)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, crankY, crankR * 1.7, 0, 7); ctx.stroke();
      // цилиндр блогы (қозғалмайды): қабырғалары мен ішкі қуысы
      var blockBot = crankY - crankR * 0.9;
      ctx.save();
      R.paintFace(ctx, cx - cw / 2 - 26, top - 40, cw + 52, blockBot - top + 40, 'iron', 0);
      ctx.fillStyle = '#2c3136'; ctx.fillRect(cx - cw / 2, top, cw, blockBot - top);
      // жану камерасы
      var gasCol = stroke === 0 ? 'rgba(160,210,255,.6)' : stroke === 1 ? 'rgba(255,200,120,.65)' : stroke === 2 ? 'rgba(255,120,40,' + (0.9 - (phase - 2 * Math.PI) / Math.PI * 0.6) + ')' : 'rgba(120,120,120,.6)';
      ctx.fillStyle = gasCol; ctx.fillRect(cx - cw / 2, top, cw, pistonY - top);
      ctx.restore();
      // клапандар
      var inOpen = stroke === 0, exOpen = stroke === 3;
      [[cx - cw * 0.25, inOpen, '#2f6fd1'], [cx + cw * 0.25, exOpen, '#6c757d']].forEach(function (v) {
        var vy = top + (v[1] ? 12 : 0);
        ctx.fillStyle = '#9aa3ab'; ctx.fillRect(v[0] - 3, top - 40, 6, vy - top + 40); ctx.fillRect(v[0] - 16, vy - 4, 32, 6);
        ctx.fillStyle = v[2]; ctx.fillRect(v[0] - 14, top - 40, 28, 12);
      });
      R.txt(ctx, 'кіргізу', cx - cw * 0.25, top - 52, { size: 10, color: '#1b2329' }); R.txt(ctx, 'шығару', cx + cw * 0.25, top - 52, { size: 10, color: '#1b2329' });
      // от алдырғыш шам
      ctx.fillStyle = '#e8e2d2'; ctx.fillRect(cx - 5, top - 30, 10, 30);
      if (stroke === 2 && phase - 2 * Math.PI < 0.4) R.flame(ctx, cx, top + 10, 26, S.ang);
      // поршень, шатун, иінді білік
      R.block(ctx, cx - cw / 2 + 2, pistonY, cw - 4, H * 0.07, 'aluminum', { depth: 0, shadow: false });
      ctx.strokeStyle = '#4d555c'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, pistonY + H * 0.05); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.lineWidth = 16; ctx.strokeStyle = '#6c747b'; ctx.beginPath(); ctx.moveTo(cx, crankY); ctx.lineTo(ex, ey); ctx.stroke();
      R.sphere(ctx, cx, crankY, 12, '#9aa3ab');
      // такт атауы мен энергия диаграммасы
      R.tag(ctx, STROKES[stroke], W * 0.36, 22, { size: 11.5, color: stroke === 2 ? '#b4342a' : '#1b2329' });
      var P = api.P, A = Math.max(0, P.Q1 - P.Q2), gx = W * 0.66, gy = H * 0.2, gw = W * 0.28;
      var sc = (H * 0.5) / 2000;
      [['Q₁', P.Q1, '#d9733a'], ['A', A, '#1d7a45'], ['Q₂', P.Q2, '#6c757d']].forEach(function (b, i) {
        var x = gx + i * gw / 3, h = b[1] * sc;
        ctx.fillStyle = b[2]; ctx.fillRect(x + 8, gy + H * 0.5 - h, gw / 3 - 16, h);
        R.txt(ctx, b[0], x + gw / 6, gy + H * 0.5 + 14, { size: 12, color: '#1b2329' });
        R.txt(ctx, Math.round(b[1]) + ' Дж', x + gw / 6, gy + H * 0.5 - h - 10, { size: 10, color: '#1b2329' });
      });
      R.tag(ctx, 'η = ' + Math.round(A / P.Q1 * 100) + ' %', gx + gw / 2, gy - 10, { size: 13, color: '#1d7a45' });
      void table;
    },
  });
})();

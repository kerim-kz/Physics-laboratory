/* Жылуберілу түрлері: жылуөткізгіштік (балауыз бекітілген шыбықтар), конвекция (судағы ағын), сәуле шығару. */
(function () {
  var R = window.Real;
  var RODS = { cu: ['Мыс', 1, '#c06c3e'], al: ['Алюминий', 0.6, '#c3cad1'], fe: ['Болат', 0.14, '#7d858c'], glass: ['Шыны', 0.003, '#cfe8f2'] };
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Жылуберілу түрін таңдап, «Бастау» бас.',
    controls: [
      { type: 'select', key: 'mode', label: 'Жылуберілу түрі', value: 'cond', options: [['cond', 'Жылуөткізгіштік'], ['conv', 'Конвекция'], ['rad', 'Сәуле шығару']] },
      { type: 'select', key: 'surf', label: 'Сәуле: бетінің түсі', value: 'black', options: [['black', 'Қара күңгірт'], ['white', 'Ақ жылтыр']] },
    ],
    readouts: [
      { key: 't', label: 'Уақыт', unit: 'с', digits: 0 },
      { key: 'info', label: 'Нәтиже', text: true },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.temp = {}; Object.keys(RODS).forEach(function (k) { S.temp[k] = []; for (var i = 0; i < 20; i++) S.temp[k].push(20); }); S.parts = []; for (var i = 0; i < 160; i++) S.parts.push({ x: Math.random(), y: Math.random() }); S.Tb = 20; S.Tw = 20; },
    substeps: 4,
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt * 5;
      if (P.mode === 'cond') Object.keys(RODS).forEach(function (k) {
        var a = S.temp[k], D = RODS[k][1] * 3, n = [];
        for (var i = 0; i < a.length; i++) { var l = i ? a[i - 1] : 300, r = i < a.length - 1 ? a[i + 1] : a[i]; n.push(a[i] + D * (l - 2 * a[i] + r) * dt * 5 * 0.25 - (a[i] - 20) * 0.002); }
        S.temp[k] = n;
      });
      // конвекция: ψ = sin(πx)·sin(πy) ағын функциясы — сол жақта (қыздырылған) су көтеріледі, оң жақта түседі
      if (P.mode === 'conv') S.parts.forEach(function (p) {
        var u = Math.PI * Math.sin(Math.PI * p.x) * Math.cos(Math.PI * p.y), v = -Math.PI * Math.cos(Math.PI * p.x) * Math.sin(Math.PI * p.y);
        p.x += (u * 0.04 + (Math.random() - 0.5) * 0.01) * dt * 5; p.y += (v * 0.04 + (Math.random() - 0.5) * 0.01) * dt * 5;
        p.x = Math.max(0.03, Math.min(0.97, p.x)); p.y = Math.max(0.03, Math.min(0.97, p.y));
      });
      if (P.mode === 'rad') { S.Tb += (0.95 * 1.2 - (S.Tb - 20) * 0.02) * dt * 5 * 0.2; S.Tw += (0.15 * 1.2 - (S.Tw - 20) * 0.02) * dt * 5 * 0.2; }
      if (S.t > 300) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, info;
      if (P.mode === 'cond') { var fell = Object.keys(RODS).filter(function (k) { return S.temp[k][10] > 55; }).map(function (k) { return RODS[k][0]; }); info = fell.length ? 'Балауыз ерігендер: ' + fell.join(', ') : 'шыбықтар әлі қызған жоқ'; }
      else if (P.mode === 'conv') info = 'Жылы су жоғары көтеріліп, суығы төмен түседі';
      else info = 'Қара бет: ' + Sim.fmt(S.Tb, 1) + ' °C, ақ бет: ' + Sim.fmt(S.Tw, 1) + ' °C';
      return { t: S.t, info: info };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.88;
      R.scene(ctx, W, H, 'lab', { table: table });
      if (P.mode === 'cond') {
        var hx = W * 0.14, len = W * 0.66;
        R.burner(ctx, hx, table - 70, S.t, true);
        Object.keys(RODS).forEach(function (k, j) {
          var y = H * 0.18 + j * (H * 0.14), a = S.temp[k];
          for (var i = 0; i < a.length; i++) {
            var hot = Math.max(0, Math.min(1, (a[i] - 20) / 260));
            ctx.fillStyle = k === 'glass' ? 'rgba(200,230,240,.85)' : R.shade(RODS[k][2], hot * 0.3);
            ctx.fillRect(hx + i * len / a.length, y - 5, len / a.length + 1, 10);
            if (hot > 0.05) { ctx.fillStyle = 'rgba(255,90,30,' + hot * 0.7 + ')'; ctx.fillRect(hx + i * len / a.length, y - 5, len / a.length + 1, 10); }
            // балауыз шарлары (әр 4-бөлікте)
            if (i % 4 === 2) { var melted = a[i] > 55; if (!melted) R.sphere(ctx, hx + (i + 0.5) * len / a.length, y + 11, 5, '#efe3bd'); }
          }
          R.txt(ctx, RODS[k][0], hx + len + 40, y, { size: 11, color: '#1b2329' });
        });
        ctx.fillStyle = '#4b5258'; ctx.fillRect(hx - 8, H * 0.12, 10, H * 0.58);
      } else if (P.mode === 'conv') {
        var bw = W * 0.5, bh = table - 90, bx = W * 0.25, by = table - bh - 70;
        R.vessel(ctx, bx, by, bw, bh, bh * 0.92, {});
        R.burner(ctx, bx + bw * 0.25, table - 60, S.t, true);
        ctx.fillStyle = '#4b5258'; ctx.fillRect(bx - 10, by + bh, bw + 20, 6);
        S.parts.forEach(function (p) {
          var x = bx + p.x * bw, y = by + bh * 0.1 + p.y * bh * 0.88, hot = Math.max(0, Math.min(1, 1.2 - p.x * 1.4 + (1 - p.y) * 0.2));
          ctx.fillStyle = 'rgba(' + Math.round(80 + 170 * hot) + ',60,' + Math.round(220 - 170 * hot) + ',.75)';
          ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
        });
        R.force(ctx, bx + bw * 0.25, by + bh * 0.7, bx + bw * 0.25, by + bh * 0.3, '#d2382b', 'жылы');
        R.force(ctx, bx + bw * 0.75, by + bh * 0.3, bx + bw * 0.75, by + bh * 0.7, '#1f5fd1', 'суық');
      } else {
        var lx = W * 0.5, ly = H * 0.45;
        R.bulb(ctx, lx, ly - 30, 30, 1);
        // екі металл банка (қара және ақ)
        [[W * 0.18, '#1d1f22', S.Tb, 'Қара күңгірт'], [W * 0.72, '#e8ecef', S.Tw, 'Ақ жылтыр']].forEach(function (c) {
          R.cylinder(ctx, c[0], table - 130, 90, 120, { c: c[1], t: 'metal', gloss: c[1] !== '#1d1f22' ? 1 : 0.1 }, { label: '' });
          R.thermometer(ctx, c[0] + 45, table - 300, 170, c[2], 0, 60, { step: 10 });
          R.tag(ctx, c[3], c[0] + 45, table - 320, { size: 10.5 });
          for (var i = 0; i < 5; i++) { var a = Math.atan2(table - 70 - ly, c[0] + 45 - lx); ctx.strokeStyle = 'rgba(255,170,60,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -S.t * 4; ctx.beginPath(); ctx.moveTo(lx + Math.cos(a) * 50, ly + Math.sin(a) * 50 + (i - 2) * 6); ctx.lineTo(c[0] + 45 - Math.cos(a) * 60, table - 70 + (i - 2) * 6); ctx.stroke(); ctx.setLineDash([]); }
        });
        R.tag(ctx, 'Сәуле шығару вакуумда да жүреді: Күннің жылуы Жерге осылай жетеді', W / 2, 22, { size: 11 });
      }
    },
  });
})();

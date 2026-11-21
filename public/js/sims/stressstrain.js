/* Созылу диаграммасы σ(ε): сымды созу машинасында біртіндеп созу. Пропорционалдық шегі, серпімділік шегі, аққыштық, беріктік шегі, үзілу. Жүктемені алғанда қалдық деформация. */
(function () {
  var R = window.Real;
  // Сызбалық қисықтар: [ε %, σ МПа] нүктелері (серпімді аймақ көрнекілік үшін үлкейтілген)
  var MAT = {
    steel: { n: 'Болат (жұмсақ)', E: 210, c: [[0, 0], [1.0, 200], [1.25, 225], [1.4, 240], [1.6, 250], [4, 250], [8, 330], [14, 400], [17, 390], [20, 330]], lim: { pr: 200, el: 225, y: 250, u: 400 } },
    copper: { n: 'Мыс', E: 110, c: [[0, 0], [0.6, 60], [0.8, 75], [4, 130], [12, 190], [25, 220], [32, 215], [36, 190]], lim: { pr: 60, el: 75, y: null, u: 220 } },
    iron: { n: 'Шойын (морт)', E: 100, c: [[0, 0], [0.8, 80], [1.6, 130], [2.4, 150]], lim: { pr: 80, el: 90, y: null, u: 150 } },
  };
  function sig(m, e) { var c = m.c; for (var i = 1; i < c.length; i++) if (e <= c[i][0]) { var a = c[i - 1], b = c[i]; return a[1] + (b[1] - a[1]) * (e - a[0]) / (b[0] - a[0]); } return null; }
  function zone(m, e) { var c = m.c, ep = c[1][0], s = sig(m, e); if (s === null) return 'үзілді'; if (e <= ep) return 'пропорционалдық (Гук заңы)'; if (m.lim.y && s < m.lim.y - 0.1) return 'серпімді, бірақ Гук заңы бұзылады'; if (m.lim.y && Math.abs(s - m.lim.y) < 0.5) return 'аққыштық (жүк тұрақты, сым ұзарады)'; var u = c.reduce(function (a, q) { return q[1] > a[1] ? q : a; }); return e <= u[0] ? 'беріктену (пластикалық)' : 'мойын пайда болды'; }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false,
    hint: '«Бастау» басып, сымды берілген ұзаруға дейін созып, содан кейін жүктемені ал. Серпімділік шегінен асқанда сым бастапқы ұзындығына оралмайды.',
    controls: [
      { type: 'select', key: 'm', label: 'Материал', value: 'steel', options: Object.keys(MAT).map(function (k) { return [k, MAT[k].n]; }) },
      { type: 'range', key: 'emax', label: 'Созу шегі ε<sub>max</sub>', min: 0.5, max: 40, step: 0.5, value: 6, unit: '%', digits: 1 },
    ],
    readouts: [
      { key: 's', label: 'Механикалық кернеу σ = F/S', unit: 'МПа', digits: 0 },
      { key: 'e', label: 'Салыстырмалы ұзару ε = Δl/l₀', unit: '%', digits: 2 },
      { key: 'res', label: 'Қалдық деформация', unit: '%', digits: 2 },
      { key: 'z', label: 'Аймақ', text: true },
    ],
    init: function (api) { var S = api.S; S.e = 0; S.s = 0; S.ph = 'load'; S.em = 0; S.sm = 0; S.res = 0; S.hist = [[0, 0]]; S.broke = false; },
    step: function (api, dt) {
      var S = api.S, P = api.P, m = MAT[P.m], slope = m.c[1][1] / m.c[1][0], last = m.c[m.c.length - 1][0];
      if (S.ph === 'load') {
        S.e += dt * Math.max(0.6, P.emax / 5);
        if (S.e >= last) { S.e = last; S.s = 0; S.broke = true; S.ph = 'done'; S.hist.push([last, sig(m, last)]); return false; }
        if (S.e >= P.emax) { S.e = P.emax; S.ph = 'unload'; S.em = S.e; S.sm = sig(m, S.e); S.res = Math.max(0, S.em - S.sm / slope); }
        S.s = sig(m, S.e);
      } else if (S.ph === 'unload') {
        S.s = Math.max(0, S.s - dt * slope * Math.max(0.6, P.emax / 5));
        S.e = S.res + S.s / slope;
        if (S.s <= 0) { S.s = 0; S.ph = 'done'; S.hist.push([S.e, 0]); return false; }
      }
      S.hist.push([S.e, S.s]);
    },
    read: function (api) { var S = api.S, m = MAT[api.P.m]; return { s: S.s, e: S.e, res: S.ph === 'done' && !S.broke ? S.res : null, z: S.broke ? 'үзілді' : S.ph === 'unload' || (S.ph === 'done') ? 'жүктеме алынды' : zone(m, S.e) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, m = MAT[P.m], wide = W > 640, dark = R.isDark(), table = H * 0.93;
      R.scene(ctx, W, H, 'lab', { table: table });
      // созу машинасы (тік)
      var mx = wide ? W * 0.14 : W * 0.5, top = wide ? 30 : H * 0.6, bot = table - 8, l0 = wide ? (bot - top) * 0.45 : (bot - top) * 0.34, dl = l0 * S.e / 100 * (wide ? 1.6 : 1.4);
      ctx.fillStyle = '#4a525b'; ctx.fillRect(mx - 56, top, 10, bot - top); ctx.fillRect(mx + 46, top, 10, bot - top);
      R.block(ctx, mx - 60, top, 120, 18, 'steel', { depth: 3 });
      var c1 = top + 40, c2 = c1 + 26 + l0 + dl;
      R.block(ctx, mx - 22, c1 - 22, 44, 22, 'steel', { depth: 2, shadow: false });
      ctx.fillStyle = '#7d878f'; ctx.fillRect(mx - 3, top + 18, 6, c1 - top - 40);
      // үлгі (мойын соңында)
      var neck = Math.max(0, (S.e - (m.lim.u ? m.c.reduce(function (a, q) { return q[1] > a[1] ? q : a; })[0] : 99)) / 6);
      var half = 7, yA = c1, yB = c2 - 26;
      if (!S.broke) {
        ctx.fillStyle = '#b9c0c6'; ctx.beginPath(); ctx.moveTo(mx - half, yA);
        for (var k = 0; k <= 20; k++) { var y = yA + (yB - yA) * k / 20, w = half * (1 - Math.min(0.6, neck) * Math.exp(-Math.pow((k - 10) / 3, 2))); ctx.lineTo(mx - w, y); }
        for (var k2 = 20; k2 >= 0; k2--) { var y2 = yA + (yB - yA) * k2 / 20, w2 = half * (1 - Math.min(0.6, neck) * Math.exp(-Math.pow((k2 - 10) / 3, 2))); ctx.lineTo(mx + w2, y2); }
        ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#6c757d'; ctx.stroke();
      } else {
        var ym = (yA + yB) / 2;
        ctx.fillStyle = '#b9c0c6'; ctx.fillRect(mx - half, yA, 2 * half, ym - yA - 6); ctx.fillRect(mx - half, ym + 6, 2 * half, yB - ym - 6);
        R.tag(ctx, 'ҮЗІЛДІ', mx + 50, ym, { size: 11, color: '#b4342a' });
      }
      R.block(ctx, mx - 22, c2 - 26, 44, 22, 'steel', { depth: 2, shadow: false });
      ctx.fillStyle = '#7d878f'; ctx.fillRect(mx - 3, c2 - 4, 6, bot - c2 + 4);
      R.force(ctx, mx + 30, c2 - 14, mx + 30, c2 - 14 + Math.min(60, S.s / 7), '#1f5fd1', 'F');
      // график
      var gx = wide ? W * 0.32 : 52, gy = 30, gw = wide ? W * 0.63 : W - 70, gh = wide ? H * 0.74 : H * 0.42;
      ctx.save(); R.rr(ctx, gx - 46, gy - 18, gw + 58, gh + 52, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.94)' : 'rgba(255,255,255,.96)'; ctx.fill(); ctx.restore();
      var full = []; for (var e = 0; e <= m.c[m.c.length - 1][0]; e += 0.05) full.push([e, sig(m, e)]);
      var emaxP = m.c[m.c.length - 1][0] * 1.08, smax = 450;
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: emaxP, ymin: 0, ymax: smax, xlabel: 'ε, %', ylabel: 'σ, МПа', series: [{ pts: full, color: 'rgba(120,130,140,.45)', dash: [4, 4], width: 1.5 }, { pts: S.hist, color: '#d2382b', width: 2.8 }], marker: [S.e, S.s] });
      var L = m.lim, pts = [['σпр', L.pr, -34, 4], ['σсерп', L.el, 44, 12], ['σақ', L.y, 10, -16], ['σбер', L.u, 0, -16]];
      pts.forEach(function (q, i) {
        if (!q[1]) return;
        var e0 = null; for (var e1 = 0; e1 <= m.c[m.c.length - 1][0]; e1 += 0.01) if (sig(m, e1) >= q[1] - 0.01) { e0 = e1; break; }
        if (e0 === null) return;
        api.D.circle(ctx, o.X(e0), o.Y(q[1]), 3.5, '#0b8a7a', null, 0, true);
        R.tag(ctx, q[0], o.X(e0) + q[2], o.Y(q[1]) + q[3], { size: 9.5, color: '#0b6b78' });
      });
      R.txt(ctx, 'Сызбалық диаграмма: серпімді аймақ көрнекілік үшін созылған', gx + gw / 2, gy + gh + 44, { size: 9.5, color: '#5b6670' });
    },
  });
})();

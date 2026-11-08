/* Тығыздықты өлшеу: таразыда масса, мензуркада көлем (ығыстырылған су), ρ = m / V. */
(function () {
  var MAT = {
    al: ['Алюминий', 2.7, '#b9c2cc'], fe: ['Темір', 7.8, '#7b8590'], cu: ['Мыс', 8.9, '#c8774a'], pb: ['Қорғасын', 11.3, '#6a7080'],
    au: ['Алтын', 19.3, '#e0b53a'], ice: ['Мұз', 0.9, '#d6eef7'], wood: ['Қарағай', 0.52, '#d2a56b'], wax: ['Парафин', 0.9, '#efe6c8'],
    x: ['Белгісіз дене', 7.1, '#8fa3a8'],
  };
  var V0 = 100; // мензуркадағы бастапқы су, мл
  Sim.create({
    aspect: 0.62, static: true, resetLabel: false,
    hint: 'Мензурканың бөлік құны — 2 мл. 1 мл = 1 см³.',
    controls: [
      { type: 'select', key: 'mat', label: 'Дененің заты', value: 'al', options: Object.keys(MAT).map(function (k) { return [k, MAT[k][0]]; }) },
      { type: 'range', key: 'V', label: 'Дененің көлемі', min: 10, max: 80, step: 2, value: 40, unit: 'см³', digits: 0 },
    ],
    readouts: [
      { key: 'm', label: 'Таразы: масса m', unit: 'г', digits: 1 },
      { key: 'v1', label: 'Мензурка: бастапқы көлем', unit: 'мл', digits: 0 },
      { key: 'v2', label: 'Мензурка: денемен', unit: 'мл', digits: 0 },
      { key: 'V', label: 'Дене көлемі V = V₂ − V₁', unit: 'см³', digits: 0 },
      { key: 'rho', label: 'ρ = m / V', unit: 'г/см³', digits: 2 },
      { key: 'rhoSI', label: 'ХБЖ-да', unit: 'кг/м³', digits: 0 },
    ],
    init: function () {},
    step: function () {},
    read: function (api) {
      var P = api.P, M = MAT[P.mat], m = M[1] * P.V;
      return { m: m, v1: V0, v2: V0 + P.V, V: P.V, rho: m / P.V, rhoSI: m / P.V * 1000 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D, M = MAT[P.mat], m = M[1] * P.V;
      var side = Math.cbrt(P.V) * 9;
      // таразы
      var sx = W * 0.22, sy = H * 0.68;
      ctx.fillStyle = C.bg2; ctx.fillRect(sx - 110, sy, 220, 34);
      ctx.strokeStyle = C.line; ctx.strokeRect(sx - 110 + 0.5, sy + 0.5, 219, 33);
      ctx.fillStyle = C.sunken; ctx.fillRect(sx - 60, sy + 7, 120, 20);
      D.text(ctx, api.fmt(m, 1) + ' г', sx, sy + 22, { size: 15, mono: true, weight: '600', align: 'center', color: C.good });
      D.line(ctx, sx - 80, sy - 2, sx + 80, sy - 2, C.ink, 3);
      ctx.fillStyle = M[2]; ctx.fillRect(sx - side / 2, sy - 4 - side, side, side);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(sx - side / 2, sy - 4 - side, side, side);
      D.text(ctx, 'Таразы', sx, sy + 56, { size: 12, align: 'center', color: C.muted });
      // мензурка (0–200 мл)
      var bx = W * 0.62, bw = 70, btop = 40, bbot = H - 50, scale = (bbot - btop) / 200;
      var lvl = V0 + P.V;
      ctx.fillStyle = 'rgba(80,150,220,.28)';
      ctx.fillRect(bx, bbot - lvl * scale, bw, lvl * scale);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx, btop); ctx.lineTo(bx, bbot); ctx.lineTo(bx + bw, bbot); ctx.lineTo(bx + bw, btop); ctx.stroke();
      for (var v = 0; v <= 200; v += 2) {
        var y = bbot - v * scale, big = v % 20 === 0;
        D.line(ctx, bx + bw, y, bx + bw - (big ? 14 : v % 10 === 0 ? 9 : 5), y, C.ink, 1);
        if (big) D.text(ctx, String(v), bx + bw + 6, y + 4, { size: 10, mono: true, color: C.muted });
      }
      D.text(ctx, 'мл', bx + bw + 6, btop - 6, { size: 10, color: C.muted });
      // батырылған дене (жеңіл денелер жіңішке инемен батырылады)
      var bs = Math.min(bw - 16, side);
      ctx.fillStyle = M[2]; ctx.fillRect(bx + bw / 2 - bs / 2, bbot - 6 - bs, bs, bs);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(bx + bw / 2 - bs / 2, bbot - 6 - bs, bs, bs);
      D.line(ctx, bx + bw / 2, btop - 10, bx + bw / 2, bbot - 6 - bs, C.muted, 1);
      D.line(ctx, bx - 30, bbot - V0 * scale, bx, bbot - V0 * scale, C.muted, 1, [3, 3]);
      D.text(ctx, 'V₁ = ' + V0, bx - 34, bbot - V0 * scale + 4, { size: 10, align: 'right', color: C.muted, mono: true });
      D.text(ctx, 'V₂ = ' + lvl, bx - 34, bbot - lvl * scale + 4, { size: 10, align: 'right', color: C.accent, mono: true, weight: '600' });
      D.line(ctx, bx - 30, bbot - lvl * scale, bx, bbot - lvl * scale, C.accent, 1, [3, 3]);
      if (M[1] < 1) D.text(ctx, 'Дене судан жеңіл — оны жіңішке инемен батырдық', W * 0.04, 26, { size: 12, color: C.brass, weight: '600' });
      if (P.mat === 'x') D.text(ctx, 'Тығыздығын тауып, кестеден затын анықта', W * 0.04, 26, { size: 12, color: C.accent, weight: '600' });
    },
  });
})();

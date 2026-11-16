/* Тығыздықты өлшеу: таразыда масса, мензуркада көлем (ығыстырылған су), ρ = m / V. */
(function () {
  var R = window.Real;
  var MAT = {
    al: ['Алюминий', 2.7, '#b9c2cc'], fe: ['Темір', 7.8, '#7b8590'], cu: ['Мыс', 8.9, '#c8774a'], pb: ['Қорғасын', 11.3, '#6a7080'],
    au: ['Алтын', 19.3, '#e0b53a'], ice: ['Мұз', 0.9, '#d6eef7'], wood: ['Қарағай', 0.52, '#d2a56b'], wax: ['Парафин', 0.9, '#efe6c8'],
    x: ['Белгісіз дене', 7.1, '#8fa3a8'],
  };
  var V0 = 100; // мензуркадағы бастапқы су, мл
  Sim.create({
    grid: false,
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
      var P = api.P, M = MAT[P.mat], m = M[1] * P.V, table = H * 0.88;
      R.scene(ctx, W, H, 'lab', { table: table });
      var side = Math.cbrt(P.V) * 9;
      var mat = { al: 'aluminum', fe: 'iron', cu: 'copper', pb: 'lead', au: 'gold', ice: 'ice', wood: 'pine', wax: 'wax', x: 'zinc' }[P.mat];
      // электронды таразы
      var sx = W * 0.22, sw = 220;
      var py = R.digitalScale(ctx, sx - sw / 2, table - 44, sw, m);
      R.block(ctx, sx - side / 2, py - side, side, side, mat, { depth: side * 0.3, shadow: false });
      R.tag(ctx, 'Таразы', sx, table + (H - table) / 2, { size: 11 });
      // мензурка (0–200 мл)
      var bw = 76, btop = 30, bx = W * 0.62;
      var lvl = V0 + P.V;
      var Y = R.cylinderGlass(ctx, bx, btop, bw, table - 4 - btop, { max: 200, ml: lvl, step: 2, big: 20 });
      var bs = Math.min(bw - 20, side);
      ctx.strokeStyle = 'rgba(80,80,80,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + bw / 2, btop - 20); ctx.lineTo(bx + bw / 2, Y(0) - bs - 4); ctx.stroke();
      R.block(ctx, bx + bw / 2 - bs / 2, Y(0) - bs - 4, bs, bs, mat, { depth: 0, shadow: false });
      R.tag(ctx, 'V₁ = ' + V0 + ' мл', bx - 60, Y(V0), { size: 10.5 });
      R.tag(ctx, 'V₂ = ' + lvl + ' мл', bx - 60, Y(lvl) - 22, { size: 10.5, color: '#0b6b78' });
      if (M[1] < 1) R.tag(ctx, 'Дене судан жеңіл — оны жіңішке инемен батырдық', W * 0.3, 22, { size: 11, color: '#8d5a16' });
      if (P.mat === 'x') R.tag(ctx, 'Тығыздығын тауып, кестеден затын анықта', W * 0.3, 22, { size: 11, color: '#0b6b78' });
    },

  });
})();

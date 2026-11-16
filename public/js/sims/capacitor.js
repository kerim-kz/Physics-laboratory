/* Жазық конденсатор: электр сыйымдылығы C = q / U, C = ε₀εS / d. Ток көзіне қосылған (U тұрақты)
   немесе ажыратылған (q тұрақты) кезде пластиналарды жылжыту. */
(function () {
  var R = window.Real;
  var E0 = 8.85e-12;
  var DIEL = { air: ['Ауа', 1], paper: ['Парафинделген қағаз', 2.2], glass: ['Шыны', 7], mica: ['Слюда', 6] };
  function calc(P) {
    var S = P.S / 1e4, d = P.d / 1000, eps = DIEL[P.diel][1], C = E0 * eps * S / d;
    var U = P.conn === 'on' ? P.U : P.q0 * 1e-9 / C, q = C * U;
    return { C: C, U: U, q: q };
  }
  Sim.create({
    aspect: 0.6, grid: false, static: true, resetLabel: false,
    hint: 'Ток көзіне қосылған кезде кернеу тұрақты, ажыратылғанда заряд тұрақты. Пластиналарды жылжытып көр.',
    controls: [
      { type: 'select', key: 'conn', label: 'Ток көзі', value: 'on', options: [['on', 'Қосулы (U = const)'], ['off', 'Ажыратылған (q = const)']] },
      { type: 'range', key: 'U', label: 'Ток көзінің кернеуі U', min: 50, max: 500, step: 10, value: 200, unit: 'В', digits: 0 },
      { type: 'range', key: 'q0', label: 'Ажыратылғандағы заряд', min: 1, max: 20, step: 1, value: 5, unit: 'нКл', digits: 0 },
      { type: 'range', key: 'S', label: 'Пластина ауданы S', min: 100, max: 600, step: 20, value: 300, unit: 'см²', digits: 0 },
      { type: 'range', key: 'd', label: 'Пластиналар арақашықтығы d', min: 1, max: 10, step: 0.5, value: 4, unit: 'мм' },
      { type: 'select', key: 'diel', label: 'Пластиналар арасы', value: 'air', options: Object.keys(DIEL).map(function (k) { return [k, DIEL[k][0]]; }) },
    ],
    readouts: [
      { key: 'C', label: 'Сыйымдылық C = ε₀εS / d', unit: 'пФ', digits: 1 },
      { key: 'q', label: 'Заряд q = CU', unit: 'нКл', digits: 2 },
      { key: 'U', label: 'Кернеу U = q / C', unit: 'В', digits: 0 },
      { key: 'E', label: 'Өріс кернеулігі E = U / d', unit: 'кВ/м', digits: 1 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var c = calc(api.P); return { C: c.C * 1e12, q: c.q * 1e9, U: c.U, E: c.U / (api.P.d / 1000) / 1000 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, c = calc(P), table = H * 0.9;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.38, cy = H * 0.42, ph = Math.sqrt(P.S) * 13, gap = 12 + P.d * 14;
      // диэлектрик
      if (P.diel !== 'air') { ctx.fillStyle = P.diel === 'glass' ? 'rgba(190,230,245,.6)' : P.diel === 'mica' ? 'rgba(200,170,120,.55)' : 'rgba(245,235,200,.8)'; ctx.fillRect(cx - gap / 2 + 4, cy - ph / 2, gap - 8, ph); }
      // өріс сызықтары
      var n = Math.max(2, Math.min(18, Math.round(c.q * 1e9 * 1.2)));
      for (var i = 0; i < n; i++) { var y = cy - ph / 2 + (i + 0.5) * ph / n; R.force(ctx, cx + gap / 2 - 6, y, cx - gap / 2 + 6, y, 'rgba(210,56,43,.55)'); } // + пластинадан − пластинаға
      // пластиналар
      [[-1, '−'], [1, '+']].forEach(function (p) {
        var x = cx + p[0] * gap / 2 - (p[0] < 0 ? 8 : 0);
        R.block(ctx, x, cy - ph / 2, 8, ph, 'aluminum', { depth: 12, shadow: false });
        var k = Math.min(12, Math.round(c.q * 1e9 * 1.2));
        for (var j = 0; j < k; j++) R.txt(ctx, p[1], x + (p[0] < 0 ? -10 : 24), cy - ph / 2 + (j + 0.5) * ph / k, { size: 13, color: p[1] === '+' ? '#c62f22' : '#1f5fd1' });
      });
      // ток көзі мен сымдар: сол (−) пластина — минусқа, оң (+) пластина — плюсқа
      var by = table - 50, on = P.conn === 'on';
      var term = R.battery(ctx, cx - 70, by, 140, 30, { label: on ? P.U + ' В' : 'ток көзі' });
      var pb = cy + ph / 2 - 8;
      R.wire(ctx, [[cx - gap / 2 - 8, pb], [cx - 110, pb], [cx - 110, term.minus.y], [term.minus.x, term.minus.y]], { color: '#222' });
      if (on) R.wire(ctx, [[cx + gap / 2 + 8, pb], [cx + 110, pb], [cx + 110, term.plus.y], [term.plus.x, term.plus.y]], { color: '#c0392b' });
      else {
        R.wire(ctx, [[cx + gap / 2 + 8, pb], [cx + 110, pb], [cx + 110, pb + 40]], { color: '#c0392b' });
        R.wire(ctx, [[cx + 110, term.plus.y - 30], [cx + 110, term.plus.y], [term.plus.x, term.plus.y]], { color: '#c0392b' });
        R.knife(ctx, cx + 110 - 0, cx + 110 + 1, pb + 40, false);
        R.tag(ctx, 'ажыратылған', cx + 160, (pb + term.plus.y) / 2, { size: 10 });
      }
      // электрометр (вольтметр)
      R.meter(ctx, W * 0.8, H * 0.32, Math.min(W, H) * 0.13, c.U, 600, { letter: 'V', step: 100 });
      R.tag(ctx, 'U = ' + Math.round(c.U) + ' В', W * 0.8, H * 0.32 + Math.min(W, H) * 0.2, { size: 12 });
    },
  });
})();

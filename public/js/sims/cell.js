/* Электр ток көздері: гальваникалық элемент (лимон батареясы). Электродтар жұбы мен электролитке
   байланысты ЭҚК; элементтерді тізбектей жалғағанда кернеулер қосылады. */
(function () {
  var R = window.Real;
  var PAIRS = { zncu: ['Мырыш — мыс', 1.0, '#a9b2b9', '#c06c3e'], mgcu: ['Магний — мыс', 1.6, '#d5d9de', '#c06c3e'], fecu: ['Темір шеге — мыс', 0.6, '#6d747b', '#c06c3e'], znc: ['Мырыш — графит', 1.3, '#a9b2b9', '#3a3d42'], cucu: ['Мыс — мыс', 0, '#c06c3e', '#c06c3e'] };
  var ELEC = { lemon: ['Лимон', 0.95, '#f2d03b'], potato: ['Картоп', 0.85, '#d7b98a'], salt: ['Тұзды су', 0.9, 'rgba(120,180,230,.6)'], acid: ['Әлсіз қышқыл', 1, 'rgba(200,230,170,.6)'] };
  Sim.create({
    aspect: 0.6, grid: false, static: true, resetLabel: false,
    hint: 'Электродтар әртүрлі металдан болғанда ғана ток пайда болады. Жарықдиод 1,8 В-тан жанады.',
    controls: [
      { type: 'select', key: 'pair', label: 'Электродтар', value: 'zncu', options: Object.keys(PAIRS).map(function (k) { return [k, PAIRS[k][0]]; }) },
      { type: 'select', key: 'el', label: 'Электролит', value: 'lemon', options: Object.keys(ELEC).map(function (k) { return [k, ELEC[k][0]]; }) },
      { type: 'range', key: 'n', label: 'Тізбектей жалғанған элементтер саны', min: 1, max: 4, step: 1, value: 2, digits: 0 },
    ],
    readouts: [
      { key: 'e1', label: 'Бір элементтің кернеуі', unit: 'В', digits: 2 },
      { key: 'U', label: 'Батареяның кернеуі', unit: 'В', digits: 2 },
      { key: 'led', label: 'Жарықдиод', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var P = api.P, e = PAIRS[P.pair][1] * ELEC[P.el][1], U = e * P.n; return { e1: e, U: U, led: U >= 1.8 ? 'жанады' : 'жанбайды (кернеу аз)' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, pr = PAIRS[P.pair], el = ELEC[P.el], table = H * 0.86, e = pr[1] * el[1], U = e * P.n;
      R.scene(ctx, W, H, 'lab', { table: table });
      var gap = Math.min(150, (W * 0.7) / P.n), x0 = W * 0.42 - (P.n - 1) * gap / 2, prev = null, first = null;
      for (var i = 0; i < P.n; i++) {
        var cx = x0 + i * gap, cy = table - 46;
        if (P.el === 'lemon' || P.el === 'potato') {
          ctx.save();
          var g = ctx.createRadialGradient(cx - 14, cy - 20, 4, cx, cy, 52);
          g.addColorStop(0, R.shade(el[2], 0.4)); g.addColorStop(1, R.shade(el[2], -0.25));
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 50, 38, 0, 0, 7); ctx.fill();
          if (P.el === 'lemon') { ctx.fillStyle = R.shade(el[2], -0.3); ctx.beginPath(); ctx.ellipse(cx + 50, cy, 7, 5, 0, 0, 7); ctx.fill(); }
          ctx.restore();
        } else R.vessel(ctx, cx - 45, cy - 40, 90, 80, 62, { liquid: el[2] });
        // электродтар
        var ax = cx - 16, bx = cx + 16, top = cy - 72;
        ctx.fillStyle = pr[2]; ctx.fillRect(ax - 4, top, 8, 58);
        ctx.fillStyle = pr[3]; ctx.fillRect(bx - 4, top, 8, 58);
        R.txt(ctx, '−', ax, top - 10, { size: 12, color: '#1f5fd1' }); R.txt(ctx, '+', bx, top - 10, { size: 12, color: '#c62f22' });
        if (prev) R.wire(ctx, [[prev.x, prev.y], [prev.x, prev.y - 16], [ax, top - 16], [ax, top]], { color: '#2b7a3a', w: 3 });
        if (!first) first = { x: ax, y: top };
        prev = { x: bx, y: top };
      }
      // жарықдиод
      var lx = W * 0.42, ly = H * 0.16, on = U >= 1.8;
      ctx.save();
      if (on) { var hg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 60); hg.addColorStop(0, 'rgba(255,60,40,.55)'); hg.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(lx, ly, 60, 0, 7); ctx.fill(); }
      ctx.fillStyle = on ? '#ff4a32' : 'rgba(170,40,30,.75)'; ctx.beginPath(); ctx.arc(lx, ly, 12, Math.PI, 0); ctx.lineTo(lx + 12, ly + 16); ctx.lineTo(lx - 12, ly + 16); ctx.closePath(); ctx.fill();
      ctx.restore();
      R.wire(ctx, [[first.x, first.y], [first.x, ly + 30], [lx - 6, ly + 30], [lx - 6, ly + 16]], { color: '#222', w: 3 });
      R.wire(ctx, [[prev.x, prev.y], [prev.x, ly + 40], [lx + 6, ly + 40], [lx + 6, ly + 16]], { color: '#c0392b', w: 3 });
      R.meter(ctx, W * 0.85, H * 0.3, Math.min(W, H) * 0.12, U, 5, { letter: 'V', step: 1 });
      R.tag(ctx, P.pair === 'cucu' ? 'Электродтар бірдей — ЭҚК жоқ' : 'Химиялық энергия → электр энергиясы', W * 0.42, H - 18, { size: 11 });
    },
  });
})();

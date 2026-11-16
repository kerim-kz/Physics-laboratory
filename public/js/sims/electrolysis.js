/* Электролиз: мыс купоросы ерітіндісінде катодқа мыс бөлінеді. Фарадейдің бірінші заңы m = kIt. */
(function () {
  var R = window.Real;
  var EL = { cu: ['Мыс (CuSO₄)', 0.329, '#c06c3e', 'rgba(70,140,230,.55)'], ag: ['Күміс (AgNO₃)', 1.118, '#d5d9de', 'rgba(220,230,240,.5)'], zn: ['Мырыш (ZnSO₄)', 0.339, '#a9b2b9', 'rgba(220,230,240,.5)'] };
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Ток күшін және уақытты өзгерт: катодта бөлінген металдың массасы қалай өзгереді? 1 с экранда = 5 мин.',
    controls: [
      { type: 'select', key: 'el', label: 'Ерітінді', value: 'cu', options: Object.keys(EL).map(function (k) { return [k, EL[k][0]]; }) },
      { type: 'range', key: 'I', label: 'Ток күші I', min: 0.5, max: 5, step: 0.5, value: 2, unit: 'А' },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'мин', digits: 1 },
      { key: 'q', label: 'Өткен заряд q = It', unit: 'Кл', digits: 0 },
      { key: 'k', label: 'Электрохимиялық эквивалент k', unit: 'мг/Кл', digits: 3 },
      { key: 'm', label: 'Бөлінген масса m = kIt', unit: 'г', digits: 3 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.ions = []; for (var i = 0; i < 40; i++) S.ions.push({ x: Math.random(), y: Math.random(), s: i % 2 ? 1 : -1 }); },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt * 300;
      S.ions.forEach(function (n) { n.x += n.s * -0.06 * P.I * dt + (Math.random() - 0.5) * 0.01; n.y += (Math.random() - 0.5) * 0.01; if (n.x < 0.05 || n.x > 0.95) { n.x = n.s > 0 ? 0.95 : 0.05; n.y = Math.random(); } });
      if (S.t > 3600 * 2) return false;
    },
    read: function (api) { var S = api.S, P = api.P, q = P.I * S.t, k = EL[P.el][1]; return { t: S.t / 60, q: q, k: k, m: k * q / 1000 }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, el = EL[P.el], table = H * 0.88, m = el[1] * P.I * S.t / 1000;
      R.scene(ctx, W, H, 'lab', { table: table });
      var bx = W * 0.2, bw = W * 0.42, bh = H * 0.5, by = table - bh;
      R.vessel(ctx, bx, by, bw, bh, bh * 0.82, { liquid: el[3] });
      // электродтар: сол жақта катод (−), оң жақта анод (+)
      var cx = bx + bw * 0.18, ax = bx + bw * 0.82, et = by - 40, eh = bh * 0.8;
      var thick = Math.min(10, m * 2.5);
      ctx.fillStyle = '#5d656c'; ctx.fillRect(cx - 4, et, 8, eh);
      ctx.fillStyle = el[2]; ctx.fillRect(cx - 4 - thick / 2, by + bh * 0.2, 8 + thick, eh - bh * 0.2 + et - by + 2);
      ctx.fillStyle = el[2]; ctx.fillRect(ax - 6 + Math.min(3, m), et, 12 - Math.min(3, m) * 2, eh);
      R.txt(ctx, '−  катод', cx, et - 12, { size: 11, color: '#1f5fd1' }); R.txt(ctx, 'анод  +', ax, et - 12, { size: 11, color: '#c62f22' });
      // иондар
      S.ions.forEach(function (n) {
        var x = bx + n.x * bw, y = by + bh * 0.2 + n.y * bh * 0.75;
        R.sphere(ctx, x, y, n.s > 0 ? 5 : 6, n.s > 0 ? el[2] : '#d9b84a');
        R.txt(ctx, n.s > 0 ? '+' : '−', x, y - 9, { size: 9, color: n.s > 0 ? '#c62f22' : '#1f5fd1' });
      });
      var bat = R.battery(ctx, bx + bw * 0.2, H * 0.08, 150, 30, { label: 'Ток көзі' });
      R.wire(ctx, [[bat.minus.x, bat.minus.y], [cx, bat.minus.y], [cx, et]], { color: '#222' });
      R.wire(ctx, [[bat.plus.x, bat.plus.y], [ax, bat.plus.y], [ax, et]], { color: '#c0392b' });
      R.meter(ctx, W * 0.8, H * 0.35, 44, P.I, 5, { letter: 'A', step: 1 });
      R.digitalScale(ctx, W * 0.7, H * 0.66, W * 0.22, 0, { text: Sim.fmt(m, 3) + ' г' });
      R.tag(ctx, 'Катодқа бөлінген металл', W * 0.81, H * 0.62, { size: 10.5 });
    },
  });
})();

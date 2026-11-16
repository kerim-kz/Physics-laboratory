/* Өткізгіштің кедергісі R = ρl / S және реостат. Сырғытпаны жылжытқанда тізбектегі ток пен шамның жарықтылығы өзгереді. */
(function () {
  var R = window.Real;
  var MAT = { cu: ['Мыс', 0.017, '#c06c3e'], al: ['Алюминий', 0.028, '#c3cad1'], fe: ['Болат', 0.12, '#7d858c'], nichrome: ['Нихром', 1.1, '#9a9a8e'], const: ['Константан', 0.5, '#b8a888'] };
  Sim.create({
    aspect: 0.62, grid: false, autoplay: true, keepRunning: true,
    hint: 'Реостаттың сырғытпасын жылжыт: ток және шамның жарықтылығы қалай өзгереді? Сымның материалын, ұзындығын, қимасын да өзгерт.',
    controls: [
      { type: 'range', key: 'x', label: 'Реостат сырғытпасы (тізбекке қосылған орам үлесі)', min: 0, max: 100, step: 1, value: 50, unit: '%', digits: 0, live: true },
      { type: 'select', key: 'mat', label: 'Реостат сымының материалы', value: 'nichrome', options: Object.keys(MAT).map(function (k) { return [k, MAT[k][0]]; }) },
      { type: 'range', key: 'l', label: 'Сымның толық ұзындығы l', min: 1, max: 10, step: 0.5, value: 5, unit: 'м' },
      { type: 'range', key: 's', label: 'Сымның көлденең қимасы S', min: 0.1, max: 1, step: 0.05, value: 0.5, unit: 'мм²', digits: 2 },
    ],
    readouts: [
      { key: 'Rmax', label: 'Реостаттың толық кедергісі ρl/S', unit: 'Ом', digits: 2 },
      { key: 'Rr', label: 'Тізбекке қосылған бөлігі', unit: 'Ом', digits: 2 },
      { key: 'I', label: 'Ток күші I', unit: 'А', digits: 2 },
      { key: 'Ul', label: 'Шамдағы кернеу', unit: 'В', digits: 2 },
    ],
    init: function (api) { api.S.ph = 0; },
    step: function (api, dt) { api.S.ph += dt * 60; },
    read: function (api) { var P = api.P, Rmax = MAT[P.mat][1] * P.l / P.s, Rr = Rmax * P.x / 100, I = 6 / (6 + Rr); return { Rmax: Rmax, Rr: Rr, I: I, Ul: I * 6 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, rd = { Rmax: MAT[P.mat][1] * P.l / P.s };
      var Rr = rd.Rmax * P.x / 100, I = 6 / (6 + Rr);
      R.scene(ctx, W, H, 'lab', { table: H * 0.2 });
      R.tableTop(ctx, 0, H * 0.2, W, H * 0.8, '#a87a4c');
      // реостат
      var rx = W * 0.18, ry = H * 0.62, rw = W * 0.5, rh = 46;
      R.cylinder(ctx, rx, ry - rh / 2, rw, rh, 'stone', { shadow: false });
      ctx.save(); ctx.strokeStyle = MAT[P.mat][2]; ctx.lineWidth = 1.4;
      for (var x = rx + 6; x < rx + rw - 6; x += 3.5) { ctx.beginPath(); ctx.moveTo(x, ry - rh / 2 + 4); ctx.lineTo(x + 1.5, ry + rh / 2 - 4); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#4b5258'; ctx.fillRect(rx - 8, ry - rh / 2 - 26, rw + 16, 6);
      var sx = rx + 8 + (rw - 16) * P.x / 100;
      R.block(ctx, sx - 12, ry - rh / 2 - 40, 24, 22, 'plasticRed', { depth: 6, shadow: false });
      ctx.fillStyle = '#c9ced3'; ctx.fillRect(sx - 2, ry - rh / 2 - 20, 4, 16);
      // тізбек: батарея → амперметр → шам → реостат (ұшы мен сырғытпа)
      var bat = R.battery(ctx, W * 0.2, H * 0.3, 140, 30, { label: '6 В' });
      var ph = -S.ph * I;
      R.wire(ctx, [[bat.plus.x, bat.plus.y], [W * 0.64, bat.plus.y]], { color: '#c0392b', phase: ph, current: true });
      R.meter(ctx, W * 0.7, bat.plus.y + 10, 34, I, 1.2, { letter: 'A', step: 0.2 });
      R.wire(ctx, [[W * 0.76, bat.plus.y], [W * 0.86, bat.plus.y], [W * 0.86, H * 0.42]], { color: '#c0392b', phase: ph, current: true });
      R.bulb(ctx, W * 0.86, H * 0.47, 16, Math.pow(I, 2) * 0.9);
      R.wire(ctx, [[W * 0.86, H * 0.55], [W * 0.86, ry - rh / 2 - 30], [sx, ry - rh / 2 - 30]], { color: '#c0392b', phase: ph, current: true });
      R.wire(ctx, [[rx - 4, ry], [rx - 30, ry], [rx - 30, bat.minus.y], [bat.minus.x, bat.minus.y]], { color: '#222', phase: ph, current: true });
      // қосылған бөлік
      ctx.save(); ctx.strokeStyle = 'rgba(210,56,43,.75)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(rx + 6, ry + rh / 2 + 10); ctx.lineTo(sx, ry + rh / 2 + 10); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'тізбекке қосылған бөлік: ' + Sim.fmt(Rr, 2) + ' Ом', (rx + sx) / 2 + 40, ry + rh / 2 + 28, { size: 10.5, color: '#b4342a' });
    },
  });
})();

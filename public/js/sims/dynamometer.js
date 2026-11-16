/* Күш: динамометрмен арбашаны тарту. Күш — векторлық шама: модулі, бағыты, түсу нүктесі.
   Күш дененің жылдамдығын өзгертеді; масштабпен күш векторын сызу. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.5, grid: false,
    hint: 'Динамометрдің көрсетуі — арбашаға әсер ететін күш. Күш векторы 1 бөлік = 1 Н масштабымен сызылған.',
    controls: [
      { type: 'range', key: 'F', label: 'Тарту күші F', min: 0, max: 5, step: 0.5, value: 2, unit: 'Н', live: true },
      { type: 'range', key: 'm', label: 'Арбашаның массасы', min: 0.5, max: 3, step: 0.5, value: 1, unit: 'кг' },
      { type: 'select', key: 'dir', label: 'Күштің бағыты', value: 'fwd', options: [['fwd', 'Қозғалыс бағытымен'], ['back', 'Қозғалысқа қарсы']] },
    ],
    readouts: [
      { key: 'F', label: 'Динамометр көрсетуі', unit: 'Н', digits: 1 },
      { key: 'v', label: 'Арбашаның жылдамдығы', unit: 'м/с', digits: 2 },
      { key: 'st', label: 'Жылдамдық', text: true },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.x = 0; S.v = api.P.dir === 'back' ? 0.8 : 0; },
    step: function (api, dt) {
      var P = api.P, S = api.S, a = (P.dir === 'back' ? -1 : 1) * P.F / P.m;
      S.t += dt; S.v += a * dt; S.x += S.v * dt;
      if (P.dir === 'back' && S.v <= 0) { S.v = 0; return false; }
      var pxm = (api.W * 0.6) / 2.6;
      if (api.W * 0.12 + S.x * pxm + 290 > api.W || S.t > 8) return false; // динамометр мен қол экраннан шықпайды
    },
    read: function (api) {
      var P = api.P, S = api.S;
      return { F: P.F, v: S.v, st: P.F === 0 ? 'өзгермейді (күш жоқ)' : P.dir === 'back' ? 'кемиді' : 'артады' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.66, pxm = (W * 0.6) / 2.6;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.12 + S.x * pxm, cy = table;
      // арбаша
      R.block(ctx, cx - 50, cy - 46, 100, 30, 'plasticGreen', { depth: 10 });
      if (P.m > 1) for (var i = 0; i < (P.m - 1) / 0.5; i++) R.cylinder(ctx, cx - 40 + i * 20, cy - 66 - (i % 2) * 2, 16, 20, 'brass', { shadow: false });
      R.wheel(ctx, cx - 30, cy - 9, 9, S.x * pxm / 9); R.wheel(ctx, cx + 30, cy - 9, 9, S.x * pxm / 9);
      // көлденең динамометр (бұрылған)
      var fwd = P.dir === 'fwd';
      ctx.save();
      var hx = fwd ? cx + 60 : cx - 60;
      ctx.translate(hx, cy - 31); ctx.rotate(fwd ? -Math.PI / 2 : Math.PI / 2);
      R.dynamometer(ctx, 0, -6, 150, P.F, 5, { div: 0.1, big: 1, w: 30 });
      ctx.restore();
      // қол (тартушы)
      var handX = fwd ? hx + 206 : hx - 206;
      R.sphere(ctx, handX, cy - 31, 12, '#e3b48a');
      // күш векторы (масштаб 1 Н = 24 px)
      var sc = 24;
      if (P.F > 0) R.force(ctx, cx, cy - 31, cx + (fwd ? 1 : -1) * P.F * sc, cy - 31, '#d2382b', 'F = ' + Sim.fmt(P.F, 1) + ' Н');
      // масштаб
      var mx = W - 150, my = H - 28;
      ctx.save(); ctx.strokeStyle = '#1b2329'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + sc, my); ctx.moveTo(mx, my - 5); ctx.lineTo(mx, my + 5); ctx.moveTo(mx + sc, my - 5); ctx.lineTo(mx + sc, my + 5); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'Масштаб: 1 Н', mx + sc + 50, my, { size: 10.5 });
    },
  });
})();

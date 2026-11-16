/* №1 зертханалық жұмыс: қатар әдісі. Ұсақ денелерді сызғыштың бойына тізіп, d = L / N. */
(function () {
  var R = window.Real;
  var OBJ = {
    pea: { name: 'Бұршақ', d: 7.2, spread: 0.06, color: '#9cc04a', kind: 'ball' },
    bead: { name: 'Моншақ', d: 4.1, spread: 0.03, color: '#d0403a', kind: 'ball' },
    millet: { name: 'Тары', d: 1.9, spread: 0.08, color: '#e8c95a', kind: 'ball' },
    wire: { name: 'Сым (қарындашқа оралған)', d: 0.5, spread: 0.01, color: '#c26b3c', kind: 'wire' },
  };
  Sim.create({
    aspect: 0.55, static: true, resetLabel: false, grid: false,
    hint: 'Сызғыштың бөлік құны 1 мм. Неғұрлым көп дене тізсең, бір дененің өлшемі соғұрлым дәл шығады.',
    controls: [
      { type: 'select', key: 'obj', label: 'Дене', value: 'pea', options: Object.keys(OBJ).map(function (k) { return [k, OBJ[k].name]; }) },
      { type: 'range', key: 'N', label: 'Қатардағы денелер саны N', min: 5, max: 40, step: 1, value: 15, digits: 0 },
    ],
    readouts: [
      { key: 'L', label: 'Қатардың ұзындығы L', unit: 'мм', digits: 0 },
      { key: 'd', label: 'Бір дененің өлшемі d = L / N', unit: 'мм', digits: 2 },
      { key: 'dd', label: 'Қателік Δd = 0,5 мм / N', unit: 'мм', digits: 3 },
      { key: 'eps', label: 'Салыстырмалы қателік', unit: '%', digits: 1 },
    ],
    init: function (api) { sizes(api); },
    onLive: function (api) { sizes(api); },
    step: function () {},
    read: function (api) {
      var L = api.S.Lmm, N = api.P.N;
      return { L: L, d: L / N, dd: 0.5 / N, eps: 0.5 / L * 100 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, O = OBJ[P.obj];
      var table = H * 0.82;
      R.scene(ctx, W, H, 'lab', { table: table });
      // масштаб: сызғышқа L сыятындай
      var maxMm = Math.max(60, Math.ceil(S.Lmm / 10) * 10 + 20);
      var len = Math.min(W * 0.9, 900), pxmm = (len - 8) / maxMm, x0 = (W - len) / 2, ry = table - 36;
      R.ruler(ctx, x0, ry, len, pxmm * 10, { width: 30 });
      var x = x0 + 4;
      if (O.kind === 'ball') {
        S.sz.forEach(function (d) {
          var r = d * pxmm / 2;
          R.sphere(ctx, x + r, ry - r - 1, r, O.color);
          x += d * pxmm;
        });
      } else {
        // қарындашқа оралған сым
        var pl = Math.max(S.Lmm * pxmm + 80, 160);
        ctx.fillStyle = '#e9b52e'; ctx.fillRect(x - 40, ry - 14, pl, 12);
        ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x - 40, ry - 5, pl, 3);
        var t = O.d * pxmm;
        for (var i = 0; i < P.N; i++) {
          var cx = x + t * (i + 0.5);
          var g = ctx.createLinearGradient(0, ry - 18, 0, ry + 2);
          g.addColorStop(0, '#f3b48a'); g.addColorStop(0.5, '#c26b3c'); g.addColorStop(1, '#7a3a1a');
          ctx.fillStyle = g; ctx.fillRect(cx - t * 0.45, ry - 18, Math.max(1, t * 0.9), 20);
        }
        x += S.Lmm * pxmm;
      }
      // L өлшемі
      var lx1 = x0 + 4, lx2 = x;
      ctx.save(); ctx.strokeStyle = '#0b6b78'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx1, ry - 46); ctx.lineTo(lx2, ry - 46); ctx.moveTo(lx1, ry - 52); ctx.lineTo(lx1, ry - 40); ctx.moveTo(lx2, ry - 52); ctx.lineTo(lx2, ry - 40); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'L ≈ ' + Math.round(S.Lmm) + ' мм  (N = ' + P.N + ')', (lx1 + lx2) / 2, ry - 64, { size: 12, color: '#0b6b78' });
    },
  });
  // Әр дененің өлшемі сәл әртүрлі (табиғи шашырау), L — мм-ге дейін дөңгелектенеді (сызғыш дәлдігі).
  function sizes(api) {
    var O = OBJ[api.P.obj], r = R.rng(api.P.N * 31 + api.P.obj.length);
    api.S.sz = [];
    var sum = 0;
    for (var i = 0; i < api.P.N; i++) { var d = O.d * (1 + (r() - 0.5) * 2 * O.spread); api.S.sz.push(d); sum += d; }
    api.S.Lmm = Math.round(sum);
  }
})();

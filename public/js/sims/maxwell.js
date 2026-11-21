/* Молекулалардың жылдамдықтар бойынша таралуы (Максвелл): ыдыстағы газ молекулалары және жылдамдықтар гистограммасы. Температура артқанда таралу кеңейіп, оңға жылжиды. */
(function () {
  var R = window.Real, kB = 1.380649e-23, NA = 6.022e23;
  var GAS = { he: ['Гелий', 0.004], n2: ['Азот', 0.028], co2: ['Көмірқышқыл газы', 0.044] };
  function randn() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random()); }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.1, grid: false, keepRunning: true, autoplay: true,
    hint: 'Температураны өзгертіп, гистограмманың пішінін бақыла. Ең ықтимал, орташа және орташа квадраттық жылдамдықтарды салыстыр.',
    controls: [
      { type: 'range', key: 'T', label: 'Температура T', min: 100, max: 1000, step: 50, value: 300, unit: 'К', digits: 0 },
      { type: 'select', key: 'gas', label: 'Газ', value: 'n2', options: Object.keys(GAS).map(function (k) { return [k, GAS[k][0]]; }) },
    ],
    readouts: [
      { key: 'vp', label: 'Ең ықтимал жылдамдық √(2RT/M)', unit: 'м/с', digits: 0 },
      { key: 'vav', label: 'Орташа жылдамдық √(8RT/πM)', unit: 'м/с', digits: 0 },
      { key: 'vrms', label: 'Орташа квадраттық √(3RT/M)', unit: 'м/с', digits: 0 },
      { key: 'E', label: 'Орташа кинетикалық энергия 3kT/2', unit: 'Дж', digits: 3 },
    ],
    init: function (api) {
      var S = api.S, P = api.P, M = GAS[P.gas][1], sig = Math.sqrt(8.314 * P.T / M);
      S.mol = []; for (var i = 0; i < 400; i++) S.mol.push({ x: Math.random(), y: Math.random(), vx: randn() * sig, vy: randn() * sig, vz: randn() * sig });
      S.hist = new Array(30).fill(0); S.samples = 0;
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, M = GAS[P.gas][1], vmax = 4 * Math.sqrt(2 * 8.314 * 1000 / 0.004);
      var scale = 1 / 6000; // экрандағы жылдамдық
      S.mol.forEach(function (m) { m.x += m.vx * dt * scale; m.y += m.vy * dt * scale; if (m.x < 0 || m.x > 1) { m.vx = -m.vx; m.x = Math.max(0, Math.min(1, m.x)); } if (m.y < 0 || m.y > 1) { m.vy = -m.vy; m.y = Math.max(0, Math.min(1, m.y)); } });
      // соқтығысу модельдеу: кездейсоқ жұптардың жылдамдықтарын араластыру (Максвелл таралуына жеткізеді)
      for (var k = 0; k < 20; k++) { var a = S.mol[Math.floor(Math.random() * S.mol.length)], b = S.mol[Math.floor(Math.random() * S.mol.length)]; var t = a.vx; a.vx = b.vy; b.vy = t; t = a.vz; a.vz = b.vx; b.vx = t; }
      void vmax; void M;
    },
    read: function (api) {
      var P = api.P, M = GAS[P.gas][1], RT = 8.314 * P.T;
      return { vp: Math.sqrt(2 * RT / M), vav: Math.sqrt(8 * RT / (Math.PI * M)), vrms: Math.sqrt(3 * RT / M), E: 1.5 * kB * P.T };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, dark = R.isDark(), wide = W > 640, M = GAS[P.gas][1];
      R.scene(ctx, W, H, 'lab', { table: H * 0.95 });
      // ыдыс
      var bx = 20, by = 30, bw = wide ? W * 0.36 : W - 40, bh = wide ? H * 0.8 : H * 0.42;
      ctx.fillStyle = 'rgba(200,230,245,.25)'; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
      var vp = Math.sqrt(2 * 8.314 * P.T / M);
      S.mol.forEach(function (m) {
        var v = Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz), f = Math.min(1, v / (2.2 * vp));
        ctx.fillStyle = 'rgb(' + Math.round(40 + 215 * f) + ',' + Math.round(90 + 60 * (1 - Math.abs(f - 0.5) * 2)) + ',' + Math.round(230 - 200 * f) + ')';
        ctx.beginPath(); ctx.arc(bx + 4 + m.x * (bw - 8), by + 4 + m.y * (bh - 8), 3, 0, 7); ctx.fill();
      });
      R.tag(ctx, 'Көк — баяу, қызыл — жылдам молекулалар', bx + bw / 2, by + bh + 14, { size: 10 });
      // гистограмма + теориялық қисық
      var gx = wide ? W * 0.47 : 40, gy = wide ? 34 : by + bh + 40, gw = wide ? W * 0.48 : W - 60, gh = wide ? H * 0.72 : H - (by + bh + 40) - 40;
      ctx.save(); R.rr(ctx, gx - 34, gy - 16, gw + 44, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore();
      var vmaxPlot = 2500, nb = 25, bins = new Array(nb).fill(0);
      S.mol.forEach(function (m) { var v = Math.sqrt(m.vx * m.vx + m.vy * m.vy + m.vz * m.vz), k = Math.floor(v / vmaxPlot * nb); if (k < nb) bins[k]++; });
      var f = function (v) { var a = M / (2 * 8.314 * P.T); return 4 * Math.PI * Math.pow(a / Math.PI, 1.5) * v * v * Math.exp(-a * v * v); };
      var pts = []; for (var v = 0; v <= vmaxPlot; v += 25) pts.push([v, f(v) * S.mol.length * vmaxPlot / nb]);
      var ymax = Math.max(10, Math.max.apply(null, bins) * 1.2, f(vp) * S.mol.length * vmaxPlot / nb * 1.15);
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: vmaxPlot, ymin: 0, ymax: ymax, xlabel: 'v, м/с', ylabel: 'молекулалар саны', series: [{ pts: pts, color: '#d2382b' }] });
      bins.forEach(function (c, k) { var x = gx + k / nb * gw, h = c / ymax * gh; ctx.fillStyle = 'rgba(47,127,209,.55)'; ctx.fillRect(x + 1, gy + gh - h, gw / nb - 2, h); });
      [[vp, 'v ең ықт.', 12], [Math.sqrt(3 * 8.314 * P.T / M), 'v ор.кв.', 36]].forEach(function (q) { if (q[0] > vmaxPlot) return; var x = gx + q[0] / vmaxPlot * gw; ctx.strokeStyle = '#0b8a7a'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); ctx.setLineDash([]); R.tag(ctx, q[1], x + 30, gy + q[2], { size: 9.5, color: '#0b6b78' }); });
    },
  });
})();

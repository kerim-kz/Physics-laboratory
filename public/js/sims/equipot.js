/* Потенциал және эквипотенциал беттер: зарядтар жүйесінің потенциал картасы, эквипотенциал сызықтар және кернеулік сызықтары. Сынақ зарядын бір нүктеден екіншісіне әртүрлі жолмен апарғанда жұмыс бірдей: A = q(φ₁ − φ₂). */
(function () {
  var R = window.Real, K = 9e9, NC = 1e-9;
  var SETS = {
    point: { n: 'Нүктелік заряд', q: [[0.5, 0.5, 3]] },
    dipole: { n: 'Диполь', q: [[0.35, 0.5, 3], [0.65, 0.5, -3]] },
    same: { n: 'Екі оң заряд', q: [[0.35, 0.5, 3], [0.65, 0.5, 3]] },
    plates: { n: 'Жазық конденсатор', q: 'plates' },
  };
  function charges(P, W, H) {
    var s = SETS[P.set];
    if (s.q === 'plates') { var out = []; for (var i = 0; i < 13; i++) { var y = H * (0.2 + 0.6 * i / 12); out.push([W * 0.35, y, 0.8], [W * 0.65, y, -0.8]); } return out; }
    return s.q.map(function (c) { return [c[0] * W, c[1] * H, c[2]]; });
  }
  function phi(Q, x, y, m) { var V = 0; Q.forEach(function (c) { var r = Math.hypot(x - c[0], y - c[1]) / m; V += K * c[2] * NC / Math.max(r, 0.012); }); return V; }
  function field(Q, x, y, m) { var Ex = 0, Ey = 0; Q.forEach(function (c) { var dx = (x - c[0]) / m, dy = (y - c[1]) / m, r = Math.max(0.012, Math.hypot(dx, dy)), E = K * c[2] * NC / (r * r); Ex += E * dx / r; Ey += E * dy / r; }); return [Ex, Ey]; }
  var probe = null;
  Sim.create({
    aspect: 0.62, grid: false, static: true, resetLabel: false,
    hint: 'Курсорды (саусақты) жылжытып, потенциал мен кернеулікті өлше. Эквипотенциал сызықтар кернеулік сызықтарына әрқашан перпендикуляр.',
    controls: [
      { type: 'select', key: 'set', label: 'Зарядтар жүйесі', value: 'dipole', options: Object.keys(SETS).map(function (k) { return [k, SETS[k].n]; }), live: true },
      { type: 'range', key: 'step', label: 'Эквипотенциалдар арасындағы қадам Δφ', min: 50, max: 400, step: 50, value: 150, unit: 'В', digits: 0, live: true },
      { type: 'check', key: 'lines', label: 'Кернеулік сызықтары', value: true, live: true },
      { type: 'check', key: 'map', label: 'Потенциал түсі', value: true, live: true },
    ],
    readouts: [
      { key: 'phi', label: 'Нүктедегі потенциал φ', unit: 'В', digits: 0 },
      { key: 'E', label: 'Кернеулік E', unit: 'В/м', digits: 0 },
      { key: 'A', label: '+1 нКл зарядты A-дан B-ға апару жұмысы', unit: 'мкДж', digits: 3 },
    ],
    init: function () {}, step: function () {},
    pointer: { move: function (api, p) { probe = p; }, down: function (api, p) { probe = p; }, leave: function () {} },
    read: function (api) {
      var W = api.W, H = api.H, Q = charges(api.P, W, H), m = W, A = [W * 0.2, H * 0.25], B = [W * 0.8, H * 0.78];
      var out = { A: (phi(Q, A[0], A[1], m) - phi(Q, B[0], B[1], m)) * 1e-9 * 1e6 };
      if (probe) { var e = field(Q, probe.x, probe.y, m); out.phi = phi(Q, probe.x, probe.y, m); out.E = Math.hypot(e[0], e[1]); }
      return out;
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, Q = charges(P, W, H), m = W, dark = R.isDark();
      R.scene(ctx, W, H, 'wall');
      var cs = 5, nx = Math.ceil(W / cs) + 1, ny = Math.ceil(H / cs) + 1, V = new Float32Array(nx * ny);
      for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) V[j * nx + i] = phi(Q, i * cs, j * cs, m);
      if (P.map) {
        for (var j2 = 0; j2 < ny - 1; j2++) for (var i2 = 0; i2 < nx - 1; i2++) {
          var v = V[j2 * nx + i2], a = Math.min(0.55, Math.abs(v) / 2500);
          ctx.fillStyle = v > 0 ? 'rgba(210,56,43,' + a + ')' : 'rgba(31,95,209,' + a + ')'; ctx.fillRect(i2 * cs, j2 * cs, cs, cs);
        }
      }
      // эквипотенциалдар (marching squares)
      ctx.lineWidth = 1.3;
      for (var L = -12; L <= 12; L++) {
        if (!L && P.set !== 'dipole' && P.set !== 'plates') continue;
        var lv = L * P.step; ctx.strokeStyle = lv > 0 ? '#9b1d14' : lv < 0 ? '#163f96' : (dark ? '#ddd' : '#333'); ctx.beginPath();
        for (var y = 0; y < ny - 1; y++) for (var x = 0; x < nx - 1; x++) {
          var a0 = V[y * nx + x] - lv, a1 = V[y * nx + x + 1] - lv, a2 = V[(y + 1) * nx + x + 1] - lv, a3 = V[(y + 1) * nx + x] - lv, pts = [];
          if ((a0 > 0) !== (a1 > 0)) pts.push([x + a0 / (a0 - a1), y]);
          if ((a1 > 0) !== (a2 > 0)) pts.push([x + 1, y + a1 / (a1 - a2)]);
          if ((a3 > 0) !== (a2 > 0)) pts.push([x + a3 / (a3 - a2), y + 1]);
          if ((a0 > 0) !== (a3 > 0)) pts.push([x, y + a0 / (a0 - a3)]);
          if (pts.length >= 2) { ctx.moveTo(pts[0][0] * cs, pts[0][1] * cs); ctx.lineTo(pts[1][0] * cs, pts[1][1] * cs); }
          if (pts.length === 4) { ctx.moveTo(pts[2][0] * cs, pts[2][1] * cs); ctx.lineTo(pts[3][0] * cs, pts[3][1] * cs); }
        }
        ctx.stroke();
      }
      // кернеулік сызықтары
      if (P.lines) {
        ctx.strokeStyle = dark ? 'rgba(240,240,240,.55)' : 'rgba(40,40,40,.5)'; ctx.lineWidth = 1;
        Q.filter(function (c) { return c[2] > 0; }).forEach(function (c) {
          var n = P.set === 'plates' ? 1 : 14;
          for (var k = 0; k < n; k++) {
            var ang = P.set === 'plates' ? 0 : (k + 0.5) / n * 6.283, x = c[0] + Math.cos(ang) * 8, y = c[1] + Math.sin(ang) * 8;
            ctx.beginPath(); ctx.moveTo(x, y);
            for (var s = 0; s < 500; s++) {
              var e = field(Q, x, y, m), l = Math.hypot(e[0], e[1]); if (!l) break;
              x += e[0] / l * 3; y += e[1] / l * 3; ctx.lineTo(x, y);
              if (x < 0 || y < 0 || x > W || y > H) break;
              if (Q.some(function (o) { return o[2] < 0 && Math.hypot(x - o[0], y - o[1]) < 7; })) break;
            }
            ctx.stroke();
          }
        });
      }
      // зарядтар
      if (P.set === 'plates') {
        R.block(ctx, W * 0.35 - 5, H * 0.17, 10, H * 0.66, 'copper', { depth: 2, shadow: false }); R.block(ctx, W * 0.65 - 5, H * 0.17, 10, H * 0.66, 'copper', { depth: 2, shadow: false });
        R.tag(ctx, '+', W * 0.35, H * 0.12, { color: '#b4342a' }); R.tag(ctx, '−', W * 0.65, H * 0.12, { color: '#1f5fd1' });
      } else Q.forEach(function (c) { R.sphere(ctx, c[0], c[1], 12, c[2] > 0 ? '#d2382b' : '#2f6fd1'); R.txt(ctx, c[2] > 0 ? '+' : '−', c[0], c[1] + 1, { size: 14, color: '#fff', weight: '700' }); });
      // A және B нүктелері: екі түрлі жол
      var A = [W * 0.2, H * 0.25], B = [W * 0.8, H * 0.78];
      ctx.strokeStyle = '#e0761b'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.bezierCurveTo(A[0], H * 0.95, W * 0.5, H * 0.95, B[0], B[1]); ctx.stroke(); ctx.setLineDash([]);
      R.tag(ctx, 'A', A[0], A[1], { size: 12, color: '#b4342a' }); R.tag(ctx, 'B', B[0], B[1], { size: 12, color: '#1f5fd1' });
      R.tag(ctx, 'Екі жолмен де жұмыс бірдей: A = q(φA − φB)', W / 2, H - 14, { size: W < 600 ? 9.5 : 11, color: '#b4560f' });
      if (probe) {
        var e2 = field(Q, probe.x, probe.y, m), l2 = Math.hypot(e2[0], e2[1]);
        R.sphere(ctx, probe.x, probe.y, 5, '#f1c40f');
        if (l2) R.force(ctx, probe.x, probe.y, probe.x + e2[0] / l2 * 36, probe.y + e2[1] / l2 * 36, '#0b8a7a', 'E');
      }
    },
  });
})();

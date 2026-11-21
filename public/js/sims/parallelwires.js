/* Параллель токтардың өзара әрекеттесуі: бір бағыттағы токтар тартылады, қарама-қарсы токтар тебіледі. F/l = μ₀I₁I₂/(2πd). Жоғарыдан қарағандағы магнит өрісінің сызықтары. */
(function () {
  var R = window.Real, MU0 = 4 * Math.PI * 1e-7;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.2, grid: false, keepRunning: true, autoplay: true,
    hint: 'Токтардың бағытын өзгерт: фольга жолақтар бір-біріне тартыла ма, әлде тебіле ме? Күш ток күшіне және арақашықтыққа қалай тәуелді?',
    controls: [
      { type: 'range', key: 'I1', label: 'Ток I₁', min: 0, max: 50, step: 5, value: 30, unit: 'А', digits: 0, live: true },
      { type: 'range', key: 'I2', label: 'Ток I₂', min: 0, max: 50, step: 5, value: 30, unit: 'А', digits: 0, live: true },
      { type: 'select', key: 'dir', label: 'Токтардың бағыты', value: 'same', options: [['same', 'Бір бағытта'], ['opp', 'Қарама-қарсы']], live: true },
      { type: 'range', key: 'd', label: 'Арақашықтық d', min: 1, max: 10, step: 0.5, value: 3, unit: 'см', digits: 1, live: true },
    ],
    readouts: [
      { key: 'B', label: 'I₁ тогының I₂ орнындағы өрісі B = μ₀I₁/(2πd)', unit: 'мТл', digits: 3 },
      { key: 'F', label: '1 м-ге әсер ететін күш F/l', unit: 'мН/м', digits: 2 },
      { key: 'kind', label: 'Әрекеттесу', text: true },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var P = api.P, d = P.d / 100; return { B: MU0 * P.I1 / (2 * Math.PI * d) * 1000, F: MU0 * P.I1 * P.I2 / (2 * Math.PI * d) * 1000, kind: P.I1 * P.I2 === 0 ? 'жоқ' : P.dir === 'same' ? 'тартылады' : 'тебіледі' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark(), sgn = P.dir === 'same' ? 1 : -1, F = MU0 * P.I1 * P.I2 / (2 * Math.PI * P.d / 100);
      R.scene(ctx, W, H, 'lab', { table: H * 0.94 });
      // 1) тірек және фольга жолақтар (алдыңғы көрініс)
      var cx = wide ? W * 0.27 : W * 0.5, gap = 60 + P.d * 14, top = wide ? 50 : 40, bot = wide ? H * 0.8 : H * 0.42, bend = Math.min(16, F * 2500) * (sgn > 0 ? 1 : -1);
      ctx.fillStyle = '#4a525b'; ctx.fillRect(cx - gap / 2 - 50, top - 14, gap + 100, 12); ctx.fillRect(cx - gap / 2 - 50, bot + 4, gap + 100, 12);
      [[-1, P.I1, 'I₁'], [1, P.I2, 'I₂']].forEach(function (w) {
        var x0 = cx + w[0] * gap / 2, b = -w[0] * bend * (w[1] > 0 ? 1 : 0);
        ctx.strokeStyle = '#c9cfd4'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, top); ctx.quadraticCurveTo(x0 + b * 2, (top + bot) / 2, x0, bot); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 - 1.5, top); ctx.quadraticCurveTo(x0 - 1.5 + b * 2, (top + bot) / 2, x0 - 1.5, bot); ctx.stroke();
        var up = w[0] < 0 || sgn > 0; // I₁ әрқашан жоғары
        if (w[1] > 0) for (var k = 0; k < 5; k++) { var u = ((k / 5 + S.t * 0.25 * (up ? -1 : 1)) % 1 + 1) % 1, y = top + u * (bot - top), xx = x0 + b * 2 * 2 * (u * (1 - u)); ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(xx, y, 3, 0, 7); ctx.fill(); }
        R.force(ctx, x0 + 18 * (w[0] > 0 ? 1 : -1) * 0 + 22, (top + bot) / 2 + (up ? 30 : -30), x0 + 22, (top + bot) / 2 + (up ? -30 : 30), '#e0761b', w[2]);
        if (w[1] > 0 && P.I1 > 0 && P.I2 > 0) { var fd = -w[0] * sgn; var fl = Math.min(fd * sgn > 0 ? gap / 2 - 10 : 60, 14 + F * 4000); R.force(ctx, x0 + b * 2 * 0.5, (top + bot) / 2 + (w[0] < 0 ? 60 : 100), x0 + b + fd * fl, (top + bot) / 2 + (w[0] < 0 ? 60 : 100), '#d2382b', w[0] < 0 ? 'F₁₂' : 'F₂₁'); }
      });
      // 2) жоғарыдан қарағандағы көрініс: өріс сызықтары
      var gx = wide ? W * 0.53 : 16, gy = wide ? 30 : H * 0.5, gw = wide ? W * 0.44 : W - 32, gh = wide ? H * 0.82 : H * 0.46;
      ctx.save(); R.rr(ctx, gx, gy, gw, gh, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.94)' : 'rgba(255,255,255,.96)'; ctx.fill(); ctx.clip();
      var ox = gx + gw / 2, oy = gy + gh / 2, sep = Math.min(gw * 0.4, 20 + P.d * 12), ax = ox - sep / 2, bx = ox + sep / 2;
      // өріс сызықтары — ағын функциясының A = I₁ln r₁ + I₂ln r₂ деңгей сызықтары
      var Af = function (x, y) { return P.I1 * Math.log(Math.hypot(x - ax, y - oy) + 0.5) + P.I2 * sgn * Math.log(Math.hypot(x - bx, y - oy) + 0.5); };
      var cs = 4, nx = Math.ceil(gw / cs) + 1, ny = Math.ceil(gh / cs) + 1, V = new Float32Array(nx * ny), vmin = Infinity, vmax = -Infinity;
      for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) { var v = Af(gx + i * cs, gy + j * cs); V[j * nx + i] = v; }
      var a0v = Af(ax + 14, oy), a1v = Af(gx + 6, gy + 6), tot = Math.abs(P.I1) + Math.abs(P.I2);
      ctx.strokeStyle = 'rgba(31,95,209,.6)'; ctx.lineWidth = 1.3;
      if (tot > 0) for (var L = 0; L < 26; L++) {
        var lv = Math.min(a0v, a1v) + (L + 0.5) / 26 * (Math.max(a0v, a1v) - Math.min(a0v, a1v)) * 1.3 - (Math.max(a0v, a1v) - Math.min(a0v, a1v)) * 0.15;
        ctx.beginPath();
        for (var y = 0; y < ny - 1; y++) for (var x = 0; x < nx - 1; x++) {
          var q0 = V[y * nx + x] - lv, q1 = V[y * nx + x + 1] - lv, q2 = V[(y + 1) * nx + x + 1] - lv, q3 = V[(y + 1) * nx + x] - lv, pts = [];
          if ((q0 > 0) !== (q1 > 0)) pts.push([x + q0 / (q0 - q1), y]);
          if ((q1 > 0) !== (q2 > 0)) pts.push([x + 1, y + q1 / (q1 - q2)]);
          if ((q3 > 0) !== (q2 > 0)) pts.push([x + q3 / (q3 - q2), y + 1]);
          if ((q0 > 0) !== (q3 > 0)) pts.push([x, y + q0 / (q0 - q3)]);
          if (pts.length >= 2) { ctx.moveTo(gx + pts[0][0] * cs, gy + pts[0][1] * cs); ctx.lineTo(gx + pts[1][0] * cs, gy + pts[1][1] * cs); }
        }
        ctx.stroke();
      }
      void vmin; void vmax;
      ctx.restore();
      [[ax, P.I1, 1], [bx, P.I2, sgn]].forEach(function (c) { R.sphere(ctx, c[0], oy, 10, '#c9cfd4'); if (c[1] > 0) { if (c[2] > 0) { ctx.fillStyle = '#b4342a'; ctx.beginPath(); ctx.arc(c[0], oy, 3, 0, 7); ctx.fill(); } else { ctx.strokeStyle = '#b4342a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c[0] - 5, oy - 5); ctx.lineTo(c[0] + 5, oy + 5); ctx.moveTo(c[0] + 5, oy - 5); ctx.lineTo(c[0] - 5, oy + 5); ctx.stroke(); } } });
      R.tag(ctx, 'Жоғарыдан көрініс: ⊙ — бізге қарай, ⊗ — бізден ары', gx + gw / 2, gy + 14, { size: W < 600 ? 9 : 10.5 });
      R.tag(ctx, P.dir === 'same' ? 'Бір бағыттағы токтар ТАРТЫЛАДЫ' : 'Қарама-қарсы токтар ТЕБІЛЕДІ', gx + gw / 2, gy + gh - 16, { size: 11, color: '#b4342a' });
    },
  });
})();

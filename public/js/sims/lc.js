/* Тербелмелі контур: Lq'' + Rq' + q/C = 0. Уақыт 100 есе баяулатылған. */
(function () {
  var RL = window.Real;
  var U0 = 10, SLOW = 100;
  Sim.create({
    grid: false,
    aspect: 0.62, substeps: 20,
    hint: 'Уақыт 100 есе баяулатылған: нақты период мыңдаған есе қысқа.',
    controls: [
      { type: 'range', key: 'L', label: 'Индуктивтілік L', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'Гн', digits: 1 },
      { type: 'range', key: 'C', label: 'Сыйымдылық C', min: 10, max: 200, step: 10, value: 50, unit: 'мкФ', digits: 0 },
      { type: 'range', key: 'R', label: 'Кедергі R', min: 0, max: 60, step: 2, value: 0, unit: 'Ом', digits: 0 },
    ],
    readouts: [
      { key: 'T', label: 'Период T = 2π√(LC)', unit: 'мс', digits: 2 },
      { key: 'nu', label: 'Жиілік ν', unit: 'Гц', digits: 1 },
      { key: 'q', label: 'Заряд q', unit: 'мкКл', digits: 0 },
      { key: 'i', label: 'Ток i', unit: 'мА', digits: 1 },
      { key: 'we', label: 'Электр өрісі энергиясы', unit: 'мДж', digits: 2 },
      { key: 'wm', label: 'Магнит өрісі энергиясы', unit: 'мДж', digits: 2 },
    ],
    init: function (api) { var S = api.S, C = api.P.C * 1e-6; S.q = C * U0; S.i = 0; S.t = 0; S.h = []; S.hl = -1; },
    step: function (api, dt) {
      var S = api.S, P = api.P, C = P.C * 1e-6, h = dt / SLOW;
      // жартылай имплицитті Эйлер (энергияны жақсы сақтайды)
      S.i += (-(S.q / C) - P.R * S.i) / P.L * h;
      S.q += S.i * h;
      S.t += h;
      if (S.t - S.hl > 0.0004) { S.hl = S.t; S.h.push([S.t * 1000, S.q / (C * U0), -S.i * Math.sqrt(P.L / C) / U0]); if (S.h.length > 1400) S.h.shift(); }
    },
    read: function (api) {
      var S = api.S, P = api.P, C = P.C * 1e-6, T = 2 * Math.PI * Math.sqrt(P.L * C);
      return { T: T * 1000, nu: 1 / T, q: S.q * 1e6, i: S.i * 1000, we: S.q * S.q / (2 * C) * 1000, wm: P.L * S.i * S.i / 2 * 1000 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, Cc = api.C, D = api.D, C = P.C * 1e-6;
      RL.scene(ctx, W, H, 'lab', { table: H * 0.9 });
      var x0 = Math.max(60, W * 0.08), y0 = 52, w = W * 0.32, h = H * 0.42, cy = y0 + h / 2;
      var qn = S.q / (C * U0), inorm = S.i * Math.sqrt(P.L / C) / U0;
      // сымдар (тоқ бағытымен жылжитын электрондар)
      var ph = (S.ph = (S.ph || 0) + inorm * 3);
      RL.wire(ctx, [[x0, cy - 20], [x0, y0], [x0 + w, y0], [x0 + w, cy - 46]], { color: '#c0392b', phase: ph, current: Math.abs(inorm) > 0.05 });
      RL.wire(ctx, [[x0 + w, cy + 46], [x0 + w, y0 + h], [x0, y0 + h], [x0, cy + 20]], { color: '#c0392b', phase: -ph, current: Math.abs(inorm) > 0.05 });
      // конденсатор: екі металл пластина, зарядтары
      [-1, 1].forEach(function (sg) {
        var py = cy + sg * 14;
        RL.block(ctx, x0 - 34, py - 4, 68, 8, 'aluminum', { depth: 4, shadow: false });
        var top = sg < 0, pos = (qn > 0) === top, n = Math.round(Math.abs(qn) * 6);
        for (var i = 0; i < n; i++) RL.txt(ctx, pos ? '+' : '−', x0 - 28 + i * 10, py + (top ? -14 : 16), { size: 12, color: pos ? '#d2382b' : '#1f5fd1', weight: '700' });
      });
      ctx.globalAlpha = Math.min(1, Math.abs(qn)) * 0.8;
      for (var j = -2; j <= 2; j++) { ctx.strokeStyle = '#7a3fb0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0 + j * 12, cy - 9); ctx.lineTo(x0 + j * 12, cy + 9); ctx.stroke(); }
      ctx.globalAlpha = 1;
      RL.tag(ctx, 'C = ' + P.C + ' мкФ', x0 - 4, cy + 48, { size: 10.5 });
      // катушка: мыс сым, феррит өзек
      var kx = x0 + w;
      RL.cylinder(ctx, kx - 9, cy - 46, 18, 92, '#3a3d42', { shadow: false, ry: 3 });
      RL.spring(ctx, kx, cy - 46, kx, cy + 46, { coils: 11, r: 15, wire: 3.2, color: '#c06c3e', lead: 2 });
      ctx.globalAlpha = Math.min(1, Math.abs(inorm)) * 0.8; ctx.strokeStyle = '#0b8a7a'; ctx.lineWidth = 1.5;
      for (var m = 1; m <= 2; m++) { ctx.beginPath(); ctx.ellipse(kx, cy, 26 * m, 62, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
      RL.tag(ctx, 'L = ' + P.L + ' Гн', kx - 58, cy + 58, { size: 10.5 });
      if (Math.abs(inorm) > 0.05) RL.force(ctx, x0 + w / 2 - 24 * Math.sign(-S.i), y0 - 14, x0 + w / 2 + 24 * Math.sign(-S.i), y0 - 14, '#0b8a7a', 'i');
      // энергия бағаналары
      var we = S.q * S.q / (2 * C), wm = P.L * S.i * S.i / 2, W0 = C * U0 * U0 / 2;
      var bx = x0 - 30, base = H * 0.9 - 26, bh = H * 0.24;
      [['W эл.', we, Cc.purple], ['W маг.', wm, Cc.good], ['W', we + wm, Cc.accent]].forEach(function (b, i) {
        var x = bx + i * 48, hh = b[1] / W0 * bh;
        ctx.fillStyle = Cc.bg2; ctx.fillRect(x, base - bh, 30, bh);
        ctx.fillStyle = b[2]; ctx.fillRect(x, base - hh, 30, hh);
        D.text(ctx, b[0], x + 15, base + 14, { size: 10, align: 'center', color: Cc.muted });
      });
      // q(t), i(t)
      var T = 2 * Math.PI * Math.sqrt(P.L * C) * 1000, t1 = S.t * 1000, span = 3 * T, t0 = Math.max(0, t1 - span);
      ctx.save(); RL.rr(ctx, W * 0.48 - 44, 22, W * 0.48 + 54, H * 0.9 - 30, 10); ctx.fillStyle = RL.isDark() ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.9)'; ctx.fill(); ctx.restore();
      D.plot(ctx, { x: W * 0.48, y: 40, w: W * 0.48, h: H * 0.9 - 84 }, {
        xmin: t0, xmax: t0 + span, ymin: -1.15, ymax: 1.15, xlabel: 't, мс', ylabel: 'q/q₀ (күлгін), i/i₀ (жасыл)',
        series: [{ pts: S.h.map(function (p) { return [p[0], p[1]]; }), color: Cc.purple }, { pts: S.h.map(function (p) { return [p[0], p[2]]; }), color: Cc.good }],
      });
    },
  });
})();

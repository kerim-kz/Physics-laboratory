/* Иінтірек: M = F·l. Тепе-теңдік M₁ = M₂ болғанда. Бөліктер — 10 см. */
(function () {
  var g = 9.8;
  Sim.create({
    grid: false,
    aspect: 0.56, static: true, resetLabel: false,
    hint: 'Бір бөлік — 10 см.',
    controls: [
      { type: 'range', key: 'm1', label: 'Сол жақ жүк m₁', min: 0.1, max: 3, step: 0.1, value: 1, unit: 'кг', digits: 1 },
      { type: 'range', key: 'd1', label: 'Сол жақ иін l₁ (бөлік)', min: 1, max: 6, step: 1, value: 4, digits: 0 },
      { type: 'range', key: 'm2', label: 'Оң жақ жүк m₂', min: 0.1, max: 3, step: 0.1, value: 2, unit: 'кг', digits: 1 },
      { type: 'range', key: 'd2', label: 'Оң жақ иін l₂ (бөлік)', min: 1, max: 6, step: 1, value: 3, digits: 0 },
    ],
    readouts: [
      { key: 'M1', label: 'M₁ = m₁g·l₁', unit: 'Н·м' },
      { key: 'M2', label: 'M₂ = m₂g·l₂', unit: 'Н·м' },
      { key: 'st', label: 'Күйі' },
      { key: 'gain', label: 'Күштен ұтыс F₁/F₂' },
    ],
    init: function () {},
    step: function () {},
    read: function (api) {
      var P = api.P, M1 = P.m1 * g * P.d1 / 10, M2 = P.m2 * g * P.d2 / 10, d = M1 - M2;
      return { M1: M1, M2: M2, st: Math.abs(d) < 1e-9 ? 'тепе-теңдік ✓' : d > 0 ? 'сол жағы төмен түседі' : 'оң жағы төмен түседі', gain: P.m1 / P.m2 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D;
      var M1 = P.m1 * P.d1, M2 = P.m2 * P.d2, diff = M1 - M2;
      var ang = Math.abs(diff) < 1e-9 ? 0 : Math.max(-0.2, Math.min(0.2, -diff * 0.05));
      var cx = W / 2, cy = H * 0.42, L = Math.min(W * 0.42, 320), u = L / 6;
      var Rl = window.Real;
      var tb = H * 0.93;
      Rl.scene(ctx, W, H, 'lab', { table: tb });
      // тірек (штатив): табан үстелде, тік бағана, үстінде призма
      Rl.block(ctx, cx - 90, tb - 14, 180, 14, 'iron', { depth: 8 });
      var cg = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0); cg.addColorStop(0, '#5c646b'); cg.addColorStop(0.45, '#d5dade'); cg.addColorStop(1, '#4b5258');
      ctx.fillStyle = cg; ctx.fillRect(cx - 6, cy + 56, 12, tb - 14 - cy - 56);
      var sg = ctx.createLinearGradient(cx - 26, 0, cx + 26, 0); sg.addColorStop(0, '#5c646b'); sg.addColorStop(0.45, '#c9cfd4'); sg.addColorStop(1, '#4b5258');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 22, cy + 56); ctx.lineTo(cx + 22, cy + 56); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      // ағаш иінтірек (сызғыш тәрізді, бөліктері бар)
      ctx.save(); Rl.rr(ctx, -L - 8, -7, 2 * L + 16, 14, 3); ctx.clip(); Rl.paintFace(ctx, -L - 8, -7, 2 * L + 16, 14, 'pine', 0); ctx.restore();
      ctx.strokeStyle = 'rgba(80,50,20,.6)'; ctx.lineWidth = 1; Rl.rr(ctx, -L - 8, -7, 2 * L + 16, 14, 3); ctx.stroke();
      for (var i = -6; i <= 6; i++) {
        D.line(ctx, i * u, -7, i * u, 1, '#3a2814', 1.2);
        ctx.fillStyle = '#3a2814'; ctx.beginPath(); ctx.arc(i * u, 3, 1.8, 0, 7); ctx.fill();
        if (i) D.text(ctx, String(Math.abs(i)), i * u, -11, { size: 10, align: 'center', color: '#3a2814', mono: true });
      }
      Rl.sphere(ctx, 0, 0, 6, '#9aa3ab');
      function weight(pos, m) {
        var x = pos * u;
        ctx.save(); ctx.translate(x, 3); ctx.rotate(-ang);
        D.line(ctx, 0, 0, 0, 18, '#555', 1.2);
        var hh = Rl.weight(ctx, 0, 14, Math.round(m * 1000) * 0.2 + 60, { label: api.fmt(m, 1) + ' кг' });
        Rl.force(ctx, 26, 14 + hh * 0.6, 26, 14 + hh * 0.6 + m * 16, '#d2382b');
        ctx.restore();
      }
      weight(-P.d1, P.m1);
      weight(P.d2, P.m2);
      ctx.restore();
      var ok = Math.abs(diff) < 1e-9;
      window.Real.tag(ctx, ok ? 'M₁ = M₂ — иінтірек тепе-теңдікте' : (diff > 0 ? 'M₁ > M₂' : 'M₁ < M₂'), cx, 24, { size: 13, color: ok ? '#1d7a45' : '#b4342a' });
    },
  });
})();

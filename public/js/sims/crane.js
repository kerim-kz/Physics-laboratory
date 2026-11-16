/* Механикалық жұмыс және қуат: құрылыс краны жүкті тұрақты жылдамдықпен көтереді. A = mgh, N = A / t. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Қозғалтқыштың қуатын өзгерт: бірдей жұмысты қандай уақытта атқарады?',
    controls: [
      { type: 'range', key: 'm', label: 'Жүктің массасы m', min: 100, max: 2000, step: 100, value: 800, unit: 'кг', digits: 0 },
      { type: 'range', key: 'h', label: 'Көтеру биіктігі h', min: 4, max: 24, step: 1, value: 15, unit: 'м', digits: 0 },
      { type: 'range', key: 'N', label: 'Қозғалтқыштың қуаты N', min: 2, max: 30, step: 1, value: 10, unit: 'кВт', digits: 0 },
    ],
    readouts: [
      { key: 'F', label: 'Көтеру күші F = mg', unit: 'Н', digits: 0 },
      { key: 'y', label: 'Көтерілген биіктік', unit: 'м', digits: 1 },
      { key: 'A', label: 'Атқарылған жұмыс A = F·s', unit: 'кДж', digits: 1 },
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 1 },
      { key: 'T', label: 'Толық көтеру уақыты t = A / N', unit: 'с', digits: 1 },
      { key: 'v', label: 'Көтеру жылдамдығы v = N / F', unit: 'м/с', digits: 2 },
    ],
    init: function (api) { api.S.y = 0; api.S.t = 0; },
    step: function (api, dt) {
      var P = api.P, S = api.S, v = P.N * 1000 / (P.m * 9.8);
      S.t += dt; S.y = Math.min(P.h, S.y + v * dt);
      if (S.y >= P.h) return false;
    },
    read: function (api) {
      var P = api.P, S = api.S, F = P.m * 9.8;
      return { F: F, y: S.y, A: F * S.y / 1000, t: S.t, T: F * P.h / (P.N * 1000), v: P.N * 1000 / F };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, ground = H * 0.9;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true });
      var mpx = (ground - 60) / 27, cx = W * 0.3, top = ground - 26 * mpx;
      // кран мұнарасы (торлы)
      ctx.save();
      ctx.strokeStyle = '#e0a21c'; ctx.lineWidth = 3;
      ctx.strokeRect(cx - 12, top, 24, ground - top);
      ctx.lineWidth = 1.6;
      for (var y = top; y < ground; y += 18) { ctx.beginPath(); ctx.moveTo(cx - 12, y); ctx.lineTo(cx + 12, y + 18); ctx.moveTo(cx + 12, y); ctx.lineTo(cx - 12, y + 18); ctx.stroke(); }
      // жебе
      var jx = W * 0.82;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 60, top); ctx.lineTo(jx, top); ctx.moveTo(cx - 60, top + 14); ctx.lineTo(jx, top + 14); ctx.stroke();
      ctx.lineWidth = 1.4; for (var x = cx - 60; x < jx; x += 18) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 18, top + 14); ctx.stroke(); }
      ctx.restore();
      R.block(ctx, cx - 80, top - 4, 40, 24, 'concrete', { depth: 6 });
      R.block(ctx, cx - 18, top - 34, 36, 30, 'plasticYellow', { depth: 6 });
      ctx.fillStyle = 'rgba(170,215,240,.9)'; ctx.fillRect(cx - 12, top - 28, 20, 14);
      // жүк
      var lx = cx + (jx - cx) * 0.62, ly = ground - 2 - S.y * mpx;
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx, top + 14); ctx.lineTo(lx, ly - 40); ctx.stroke();
      ctx.fillStyle = '#c9ced3'; ctx.fillRect(lx - 6, top + 10, 12, 8);
      var s = Math.cbrt(P.m / 800);
      R.block(ctx, lx - 26 * s, ly - 32 * s, 52 * s, 32 * s, 'brick', { depth: 10 * s, shadow: false, label: P.m + ' кг' });
      ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(lx, ly - 40); ctx.lineTo(lx - 22 * s, ly - 32 * s); ctx.moveTo(lx, ly - 40); ctx.lineTo(lx + 22 * s, ly - 32 * s); ctx.stroke();
      // биіктік белгілері
      ctx.save(); ctx.strokeStyle = '#1f5fd1'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(lx + 60, ground - P.h * mpx); ctx.lineTo(lx + 120, ground - P.h * mpx); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'h = ' + P.h + ' м', lx + 120, ground - P.h * mpx - 14, { size: 11, color: '#1f5fd1' });
      R.force(ctx, lx + 46, ly - 20, lx + 46, ly - 70, '#d2382b', 'F');
    },
  });
})();

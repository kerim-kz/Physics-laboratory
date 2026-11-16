/* Тогы бар шарғының (соленоидтың) магнит өрісі. Оң қол ережесі: орамдардағы ток бағытымен иілген
   төрт саусақ, сонда бас бармақ солтүстік полюсті (N) көрсетеді. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Ток бағытын ауыстыр: шарғының полюстері мен компастың тілі қалай өзгереді?',
    controls: [
      { type: 'range', key: 'I', label: 'Ток күші', min: 0, max: 3, step: 0.5, value: 2, unit: 'А', live: true },
      { type: 'range', key: 'n', label: 'Орам саны', min: 4, max: 16, step: 1, value: 10, digits: 0, live: true },
      { type: 'select', key: 'dir', label: 'Ток бағыты', value: 'a', options: [['a', 'Бірінші бағыт'], ['b', 'Кері бағыт']], live: true },
      { type: 'check', key: 'core', label: 'Темір өзек салу', value: false, live: true },
    ],
    readouts: [
      { key: 'left', label: 'Сол жақ ұшы', text: true },
      { key: 'B', label: 'Өрістің салыстырмалы күші', digits: 1 },
    ],
    init: function (api) { api.S.ph = 0; },
    step: function (api, dt) { api.S.ph += dt * 40; },
    read: function (api) { var P = api.P, s = P.dir === 'a' ? 1 : -1; return { left: P.I === 0 ? '—' : s > 0 ? 'S (оңтүстік)' : 'N (солтүстік)', B: P.I * P.n * (P.core ? 8 : 1) / 10 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, s = P.dir === 'a' ? 1 : -1, B = P.I * P.n * (P.core ? 8 : 1);
      R.scene(ctx, W, H, 'lab', { table: H * 0.86 });
      var cx = W * 0.45, cy = H * 0.45, L = W * 0.4, rad = H * 0.13;
      // өріс сызықтары
      if (P.I > 0) {
        ctx.save(); ctx.strokeStyle = 'rgba(31,95,209,' + Math.min(0.7, 0.2 + B / 200) + ')'; ctx.lineWidth = 1.4;
        for (var k = 1; k <= 4; k++) { var hh = rad * (0.25 * k); ctx.beginPath(); ctx.ellipse(cx, cy, L / 2 + k * 40, hh + k * 34, 0, 0, 7); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx - L / 2 - 30, cy); ctx.lineTo(cx + L / 2 + 30, cy); ctx.stroke();
        ctx.restore();
        R.force(ctx, s > 0 ? cx - 40 : cx + 40, cy, s > 0 ? cx + 40 : cx - 40, cy, '#1f5fd1', 'B');
      }
      if (P.core) R.block(ctx, cx - L / 2 - 30, cy - rad * 0.35, L + 60, rad * 0.7, 'iron', { depth: 0, shadow: false });
      // орамдар (алдыңғы жартысы)
      var ph = s * S.ph * P.I;
      for (var i = 0; i < P.n; i++) {
        var x = cx - L / 2 + (i + 0.5) * L / P.n;
        ctx.strokeStyle = '#8a4a20'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, cy, 9, rad, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
        ctx.strokeStyle = '#d9853f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x + 4, cy, 9, rad, 0, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
        if (P.I > 0) { var a = ((ph / 30 + i * 0.7) % (Math.PI * 2)); ctx.fillStyle = 'rgba(255,230,90,.95)'; ctx.beginPath(); ctx.arc(x + 4 + Math.cos(a) * 9, cy + Math.sin(a) * rad, 2.2, 0, 7); ctx.fill(); }
      }
      if (P.I > 0) {
        R.tag(ctx, s > 0 ? 'S' : 'N', cx - L / 2 - 30, cy - rad - 20, { size: 15, color: s > 0 ? '#2f6fbf' : '#d23b2f' });
        R.tag(ctx, s > 0 ? 'N' : 'S', cx + L / 2 + 30, cy - rad - 20, { size: 15, color: s > 0 ? '#d23b2f' : '#2f6fbf' });
      }
      var bat = R.battery(ctx, cx - 70, H * 0.78, 140, 28, { label: P.I + ' А' });
      R.wire(ctx, [[cx - L / 2, cy + rad], [cx - L / 2, bat.minus.y], [bat.minus.x, bat.minus.y]], { color: s > 0 ? '#222' : '#c0392b' });
      R.wire(ctx, [[cx + L / 2, cy + rad], [cx + L / 2, bat.plus.y], [bat.plus.x, bat.plus.y]], { color: s > 0 ? '#c0392b' : '#222' });
      // компастар
      var ang = P.I === 0 ? -Math.PI / 2 : (s > 0 ? 0 : Math.PI);
      R.compass(ctx, cx + L / 2 + 90, cy, 20, P.I === 0 ? -Math.PI / 2 : (s > 0 ? 0 : Math.PI));
      R.compass(ctx, cx - L / 2 - 90, cy, 20, ang);
      R.compass(ctx, cx, cy - rad - 70, 18, P.I === 0 ? -Math.PI / 2 : (s > 0 ? Math.PI : 0));
    },
  });
})();

/* Магнит өрісінің тогы бар өткізгішке әсері және тұрақты ток электрқозғалтқышы.
   Рамканың бүйірлеріне Ампер күші әсер етеді, коллектор әр жарты айналымда ток бағытын ауыстырады. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Ток күшін немесе магнит өрісін өзгерт: рамканың айналу жылдамдығы қалай өзгереді?',
    controls: [
      { type: 'range', key: 'I', label: 'Ток күші', min: 0, max: 3, step: 0.25, value: 1.5, unit: 'А', live: true },
      { type: 'range', key: 'B', label: 'Магнит индукциясы', min: 0.1, max: 1, step: 0.05, value: 0.5, unit: 'Тл', digits: 2, live: true },
      { type: 'check', key: 'rev', label: 'Ток бағытын ауыстыру', value: false, live: true },
    ],
    readouts: [
      { key: 'F', label: 'Бүйірге әсер ететін Ампер күші F = BIl', unit: 'Н', digits: 3 },
      { key: 'w', label: 'Айналу жиілігі', unit: 'айн/с', digits: 2 },
    ],
    init: function (api) { var S = api.S; S.a = 0.3; S.w = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, l = 0.05, F = P.B * P.I * l, s = P.rev ? -1 : 1;
      var torque = s * F * Math.abs(Math.cos(S.a)) * 40; // коллектор моментті әрқашан бір бағытта ұстайды
      S.w += (torque * 60 - S.w * 0.6) * dt; S.a += S.w * dt;
    },
    read: function (api) { var P = api.P; return { F: P.B * P.I * 0.05, w: Math.abs(api.S.w) / (2 * Math.PI) }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, cx = W * 0.45, cy = H * 0.45;
      R.scene(ctx, W, H, 'lab', { table: H * 0.88 });
      // магнит полюстері
      var gap = W * 0.34, ph = H * 0.42;
      [[cx - gap / 2 - 60, '#d23b2f', 'N'], [cx + gap / 2, '#2f6fbf', 'S']].forEach(function (m) {
        R.block(ctx, m[0], cy - ph / 2, 60, ph, { c: m[1], t: 'plain', gloss: 0.5 }, { depth: 14, label: m[2], labelSize: 20 });
      });
      // өріс сызықтары
      ctx.strokeStyle = 'rgba(31,95,209,' + (0.2 + P.B * 0.5) + ')'; ctx.lineWidth = 1.2;
      for (var k = 0; k < 7; k++) { var y = cy - ph * 0.4 + k * ph * 0.8 / 6; ctx.beginPath(); ctx.moveTo(cx - gap / 2, y); ctx.lineTo(cx + gap / 2, y); ctx.stroke(); }
      // рамка (перспективада: ені cos(a) бойынша өзгереді)
      var fw = gap * 0.36, fh = ph * 0.62, c = Math.cos(S.a), sgn = Math.sin(S.a) > 0 ? 1 : -1;
      ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = '#c06c3e';
      ctx.beginPath(); ctx.moveTo(cx - fw * c, cy - fh / 2); ctx.lineTo(cx + fw * c, cy - fh / 2); ctx.lineTo(cx + fw * c, cy + fh / 2); ctx.lineTo(cx - fw * c, cy + fh / 2); ctx.closePath(); ctx.stroke();
      ctx.restore();
      // Ампер күштері (рамканың бүйірлеріне)
      if (P.I > 0) {
        var Fl = 30 + P.B * P.I * 25, s = (P.rev ? -1 : 1) * (c >= 0 ? 1 : -1);
        R.force(ctx, cx - fw * c, cy, cx - fw * c, cy - s * Fl, '#d2382b', 'F');
        R.force(ctx, cx + fw * c, cy, cx + fw * c, cy + s * Fl, '#d2382b', 'F');
      }
      void sgn;
      // білік, коллектор, щеткалар
      ctx.fillStyle = '#9aa3ab'; ctx.fillRect(cx - 3, cy + fh / 2, 6, ph * 0.5);
      var ky = cy + fh / 2 + ph * 0.32;
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(cx - 14, ky - 10, 12, 20); ctx.fillRect(cx + 2, ky - 10, 12, 20);
      ctx.fillStyle = '#2a2c30'; ctx.fillRect(cx - 34, ky - 6, 18, 12); ctx.fillRect(cx + 16, ky - 6, 18, 12);
      var bat = R.battery(ctx, cx - 70, H * 0.84, 140, 28, { label: P.I + ' А' });
      R.wire(ctx, [[cx - 34, ky], [cx - 90, ky], [cx - 90, bat.minus.y], [bat.minus.x, bat.minus.y]], { color: '#222' });
      R.wire(ctx, [[cx + 34, ky], [cx + 90, ky], [cx + 90, bat.plus.y], [bat.plus.x, bat.plus.y]], { color: '#c0392b' });
      R.tag(ctx, 'Коллектор әр жарты айналымда рамкадағы ток бағытын ауыстырады', W / 2, 20, { size: 11 });
    },
  });
})();

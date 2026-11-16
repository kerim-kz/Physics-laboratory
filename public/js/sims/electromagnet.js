/* №9 зертханалық жұмыс: электрмагнитті жинау. Көтеретін қыстырғыштар саны ток күшіне, орам санына және өзекке тәуелді. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Ток күшін, орам санын өзгерт, өзекті ал. Электрмагнит неше қыстырғышты көтереді?',
    controls: [
      { type: 'range', key: 'I', label: 'Ток күші (реостат)', min: 0, max: 2, step: 0.1, value: 1, unit: 'А', live: true },
      { type: 'select', key: 'n', label: 'Орам саны', value: '100', options: [['50', '50 орам'], ['100', '100 орам'], ['200', '200 орам']], live: true },
      { type: 'check', key: 'core', label: 'Темір өзек', value: true, live: true },
    ],
    readouts: [
      { key: 'In', label: 'Ампер-орам I·N', digits: 0 },
      { key: 'clips', label: 'Көтерілген қыстырғыштар', digits: 0 },
    ],
    init: function (api) { api.S.drop = []; },
    step: function () {},
    read: function (api) { var P = api.P, In = P.I * +P.n; return { In: In, clips: clips(P) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, table = H * 0.88, n = clips(P), cx = W * 0.4, top = H * 0.08;
      R.scene(ctx, W, H, 'lab', { table: table });
      // штатив
      ctx.fillStyle = '#5c646b'; ctx.fillRect(cx - 160, top, 8, table - top); ctx.fillRect(cx - 160, top, 170, 8);
      R.block(ctx, cx - 200, table - 14, 120, 14, 'iron', { depth: 8 });
      // шеге (өзек) + орамдар
      var cl = H * 0.36, cw = 18;
      if (P.core) { R.cylinder(ctx, cx - cw / 2, top + 8, cw, cl, 'iron', { shadow: false }); ctx.fillStyle = '#6d747b'; ctx.beginPath(); ctx.moveTo(cx - cw / 2, top + 8 + cl); ctx.lineTo(cx, top + 30 + cl); ctx.lineTo(cx + cw / 2, top + 8 + cl); ctx.fill(); }
      var turns = +P.n / 10;
      for (var i = 0; i < turns; i++) { var y = top + 20 + i * (cl - 30) / turns; ctx.strokeStyle = '#c06c3e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, y, cw * 0.95, 4, 0, 0, Math.PI); ctx.stroke(); }
      // қыстырғыштар тізбегі және үстелдегі үйме
      var tip = top + 30 + cl;
      for (var k = 0; k < Math.min(n, 12); k++) clip(ctx, cx + (k % 2 ? 4 : -4), tip + 6 + k * 22, k % 2 ? 0.2 : -0.2);
      for (var j = 0; j < 20 - Math.min(n, 12); j++) clip(ctx, cx - 60 + (j % 7) * 22, table - 6 - Math.floor(j / 7) * 8, (j * 1.7) % 3);
      if (n > 12) R.tag(ctx, '+' + (n - 12) + ' қыстырғыш', cx + 60, tip + 120, { size: 10.5 });
      // ток көзі мен реостат
      var bat = R.battery(ctx, W * 0.62, H * 0.2, 130, 28, { label: '4,5 В' });
      R.meter(ctx, W * 0.82, H * 0.52, 40, P.I, 2, { letter: 'A', step: 0.5 });
      R.wire(ctx, [[bat.plus.x, bat.plus.y], [W * 0.82, bat.plus.y], [W * 0.82, H * 0.52 - 36]], { color: '#c0392b' });
      R.wire(ctx, [[W * 0.82 - 22, H * 0.52 + 24], [W * 0.82 - 22, H * 0.7], [cx + 20, H * 0.7], [cx + 20, top + cl - 6]], { color: '#c0392b' });
      R.wire(ctx, [[bat.minus.x, bat.minus.y], [cx + 30, bat.minus.y], [cx + 30, top + 22]], { color: '#222' });
      R.tag(ctx, 'Қыстырғыштар: ' + n, cx, table - 50, { size: 12, color: '#0b6b78' });
    },
  });
  // Көтеру күші ~ (I·N)²; өзек өрісті шамамен 10 есе күшейтеді
  function clips(P) { var B = P.I * +P.n * (P.core ? 1 : 0.1); return Math.floor(Math.pow(B / 30, 1.5)); }
  function clip(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = '#a9b2b9'; ctx.lineWidth = 2; R.rr(ctx, -4, -10, 8, 20, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(-1, 6); ctx.stroke();
    ctx.restore();
  }
})();

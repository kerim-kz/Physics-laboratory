/* Механикалық жұмыс: шананы көкжиекке α бұрыш жасайтын арқанмен тарту. A = Fs cos α. Ауырлық күші мен реакция күшінің жұмысы нөлге тең; үйкеліс күшінің жұмысы теріс. Кинетикалық энергия туралы теорема. */
(function () {
  var R = window.Real, g = 9.81, S_M = 10, MASS = 20, MU = 0.08;
  function work(P) {
    var a = P.ang * Math.PI / 180, Fx = P.F * Math.cos(a), Fy = P.F * Math.sin(a);
    var N = Math.max(0, MASS * g - Fy), Ff = MU * N, acc = (Fx - Ff) / MASS;
    return { Fx: Fx, Fy: Fy, N: N, Ff: Ff, acc: acc, AF: Fx * S_M, Af: -Ff * S_M, moves: Fx > Ff, lift: Fy >= MASS * g };
  }
  Sim.create({
    aspect: 0.56, grid: false,
    hint: 'Бұрышты 0°-тан 60°-қа дейін өзгерт: тарту күшінің жұмысы қалай өзгереді? 90°-та жұмыс неге нөлге тең?',
    controls: [
      { type: 'range', key: 'F', label: 'Арқанның керілу күші F', min: 20, max: 120, step: 5, value: 60, unit: 'Н', digits: 0 },
      { type: 'range', key: 'ang', label: 'Арқанның көкжиекпен жасайтын бұрышы α', min: 0, max: 90, step: 5, value: 30, unit: '°', digits: 0 },
    ],
    readouts: [
      { key: 'AF', label: 'Тарту күшінің жұмысы A = Fs cos α', unit: 'Дж', digits: 0 },
      { key: 'Af', label: 'Үйкеліс күшінің жұмысы', unit: 'Дж', digits: 0 },
      { key: 'Ag', label: 'Ауырлық күші мен N-нің жұмысы', unit: 'Дж', digits: 0 },
      { key: 'A', label: 'Барлық күштердің жұмысы', unit: 'Дж', digits: 0 },
      { key: 'Ek', label: 'Кинетикалық энергия mv²/2', unit: 'Дж', digits: 0 },
      { key: 'x', label: 'Жүрілген жол s', unit: 'м', digits: 2 },
    ],
    init: function (api) { api.S.x = 0; api.S.v = 0; },
    step: function (api, dt) {
      var S = api.S, w = work(api.P);
      if (!w.moves || w.lift) return false;
      var h = dt * 0.8; S.v += w.acc * h; S.x += S.v * h;
      if (S.x >= S_M) { S.x = S_M; S.v = Math.sqrt(2 * w.acc * S_M); return false; }
    },
    read: function (api) {
      var S = api.S, w = work(api.P), k = S.x / S_M;
      return { AF: w.AF * k, Af: w.Af * k, Ag: 0, A: (w.AF + w.Af) * k, Ek: MASS * S.v * S.v / 2, x: S.x };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, w = work(P), ground = H * 0.72;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true, sun: false });
      // қар
      var sg = ctx.createLinearGradient(0, ground - 6, 0, H); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#d6e4ee');
      ctx.fillStyle = sg; ctx.fillRect(0, ground - 4, W, H - ground + 4);
      var x0 = W * 0.04, ppm = (W * 0.58) / S_M, sx = x0 + S.x * ppm;
      // жол белгілері
      for (var m = 0; m <= S_M; m += 2) { ctx.fillStyle = '#9fb0bd'; ctx.fillRect(x0 + m * ppm + 40, ground + 6, 2, 10); R.txt(ctx, m + ' м', x0 + m * ppm + 40, ground + 26, { size: 10, color: '#3a4a58' }); }
      ctx.save(); ctx.strokeStyle = 'rgba(120,140,160,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 40, ground + 2); ctx.lineTo(sx + 40, ground + 2); ctx.stroke(); ctx.restore();
      // шана
      var sw = 92, sh = 16, sy = ground - 10;
      ctx.save(); ctx.strokeStyle = '#7a4b25'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy + 8); ctx.lineTo(sx + sw, sy + 8); ctx.quadraticCurveTo(sx + sw + 14, sy + 8, sx + sw + 12, sy - 4); ctx.stroke(); ctx.restore();
      R.block(ctx, sx + 6, sy - sh, sw - 10, sh, 'oak', { depth: 6, shadow: false });
      R.block(ctx, sx + 18, sy - sh - 34, 50, 34, 'pine', { depth: 8, label: MASS + ' кг' });
      // арқан
      var a = P.ang * Math.PI / 180, hx = sx + sw + 10, hy = sy - 6, rl = Math.min(170, W * 0.2);
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(a) * rl, hy - Math.sin(a) * rl); ctx.stroke();
      ctx.fillStyle = '#e0a27a'; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * rl, hy - Math.sin(a) * rl, 7, 0, 7); ctx.fill();
      // күштер
      var k = Math.min(1.4, 110 / 120), cx = sx + 40, cy = sy - sh - 17;
      R.force(ctx, hx, hy, hx + Math.cos(a) * P.F * k, hy - Math.sin(a) * P.F * k, '#d2382b', 'F');
      ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(210,56,43,.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * P.F * k, hy - Math.sin(a) * P.F * k); ctx.lineTo(hx + w.Fx * k, hy); ctx.stroke(); ctx.restore();
      if (w.Fx > 1) R.force(ctx, hx, hy + 2, hx + w.Fx * k, hy + 2, '#e0761b', 'F cos α');
      R.force(ctx, cx, cy, cx, cy + MASS * g * k * 0.5, '#1f5fd1', 'mg');
      if (w.N > 1) R.force(ctx, cx - 20, sy + 8, cx - 20, sy + 8 - w.N * k * 0.5, '#0b8a7a', 'N');
      if (w.Ff > 0.5) R.force(ctx, sx, sy + 6, sx - w.Ff * k * 2, sy + 6, '#7a3fb0', 'F үйк');
      // бұрыш
      ctx.strokeStyle = '#8a6100'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 50, hy); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 34, -a, 0); ctx.stroke();
      R.tag(ctx, 'α = ' + P.ang + '°', hx + 58, hy - 16, { size: 10.5, color: '#6b5200' });
      // энергия бағаналары
      var bx = W - 150, by = 30, bh = H * 0.34, maxA = 120 * S_M;
      var vals = [['A тарт.', w.AF * S.x / S_M, '#d2382b'], ['A үйк.', w.Af * S.x / S_M, '#7a3fb0'], ['Eₖ', MASS * S.v * S.v / 2, '#0b8a7a']];
      ctx.save(); R.rr(ctx, bx - 16, by - 18, 156, bh + 56, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.85)' : 'rgba(255,255,255,.88)'; ctx.fill(); ctx.restore();
      var zero = by + bh * 0.75;
      ctx.strokeStyle = '#59616a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - 6, zero); ctx.lineTo(bx + 132, zero); ctx.stroke();
      vals.forEach(function (v, i) {
        var hgt = v[1] / maxA * bh * 0.75 * 1.6;
        ctx.fillStyle = v[2]; ctx.fillRect(bx + i * 44, Math.min(zero, zero - hgt), 30, Math.abs(hgt));
        R.txt(ctx, v[0], bx + 15 + i * 44, by + bh + 22, { size: 10, color: R.isDark() ? '#e6ecf0' : '#1b2329' });
        R.txt(ctx, Math.round(v[1]) + '', bx + 15 + i * 44, Math.min(zero, zero - hgt) - 8, { size: 9.5, color: R.isDark() ? '#e6ecf0' : '#1b2329' });
      });
      R.tag(ctx, w.lift ? 'Шана жерден көтеріледі: F sin α ≥ mg' : !w.moves ? 'Шана қозғалмайды: F cos α ≤ F үйк' : 'A тарт. + A үйк. = Eₖ  (кинетикалық энергия туралы теорема)', W * 0.38, 22, { size: W < 600 ? 9.5 : 11.5, color: '#0b6b78' });
    },
  });
})();

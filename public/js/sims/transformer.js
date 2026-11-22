/* Трансформатор: болат өзекше, бірінші және екінші реттік орамалар. U₁/U₂ = N₁/N₂ = k, жүктеме тогы, ПӘК. Өзекшедегі айнымалы магнит ағыны. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.05, grid: false, keepRunning: true, autoplay: true,
    hint: 'Орам сандарын өзгертіп, жоғарылатқыш және төмендеткіш трансформатор жаса. Жүктемені арттырғанда бірінші реттік орамадағы ток қалай өзгереді?',
    controls: [
      { type: 'range', key: 'U1', label: 'Желі кернеуі U₁', min: 50, max: 380, step: 10, value: 220, unit: 'В', digits: 0 },
      { type: 'range', key: 'N1', label: 'Бірінші реттік орам саны N₁', min: 100, max: 2000, step: 100, value: 1000, digits: 0 },
      { type: 'range', key: 'N2', label: 'Екінші реттік орам саны N₂', min: 50, max: 4000, step: 50, value: 200, digits: 0 },
      { type: 'range', key: 'Rl', label: 'Жүктеме кедергісі', min: 5, max: 500, step: 5, value: 40, unit: 'Ом', digits: 0 },
      { type: 'range', key: 'eta', label: 'ПӘК', min: 80, max: 100, step: 1, value: 96, unit: '%', digits: 0 },
    ],
    readouts: [
      { key: 'k', label: 'Трансформация коэффициенті k = N₁/N₂', digits: 2 },
      { key: 'U2', label: 'Екінші реттік кернеу U₂', unit: 'В', digits: 1 },
      { key: 'I2', label: 'Жүктеме тогы I₂', unit: 'А', digits: 2 },
      { key: 'I1', label: 'Бірінші реттік ток I₁', unit: 'А', digits: 3 },
      { key: 'type', label: 'Түрі', text: true },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var c = calc(api.P); return { k: c.k, U2: c.U2, I2: c.I2, I1: c.I1, type: c.k > 1.001 ? 'төмендеткіш' : c.k < 0.999 ? 'жоғарылатқыш' : 'k = 1' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, c = calc(P), wide = W > 640, ph = Math.sin(S.t * 2 * Math.PI * 0.6);
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      // өзекше
      var cx = W / 2, cy = wide ? H * 0.42 : H * 0.38, cw = Math.min(W * 0.46, 380), ch = Math.min(H * 0.55, 230), th = Math.max(24, cw * 0.11);
      ctx.save();
      var g = ctx.createLinearGradient(0, cy - ch / 2, 0, cy + ch / 2); g.addColorStop(0, '#7d878f'); g.addColorStop(0.5, '#4a525b'); g.addColorStop(1, '#6b737b');
      ctx.fillStyle = g; ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch); ctx.fillStyle = '#a87a4c'; ctx.fillRect(cx - cw / 2 + th, cy - ch / 2 + th, cw - 2 * th, ch - 2 * th);
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; for (var l = 0; l < 6; l++) { ctx.beginPath(); ctx.moveTo(cx - cw / 2, cy - ch / 2 + l * th / 6); ctx.lineTo(cx + cw / 2, cy - ch / 2 + l * th / 6); ctx.stroke(); }
      ctx.restore();
      // магнит ағыны (өзекше бойымен айналатын нүктелер)
      var pathLen = 2 * (cw - th) + 2 * (ch - th), nDots = 16;
      for (var d = 0; d < nDots; d++) {
        var u = ((d / nDots + S.t * 0.15 * Math.sign(ph)) % 1 + 1) % 1, s = u * pathLen, a = cw - th, b = ch - th, x, y, x0 = cx - cw / 2 + th / 2, y0 = cy - ch / 2 + th / 2;
        if (s < a) { x = x0 + s; y = y0; } else if (s < a + b) { x = x0 + a; y = y0 + s - a; } else if (s < 2 * a + b) { x = x0 + a - (s - a - b); y = y0 + b; } else { x = x0; y = y0 + b - (s - 2 * a - b); }
        ctx.fillStyle = 'rgba(120,190,255,' + (0.3 + 0.6 * Math.abs(ph)) + ')'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
      }
      // орамалар
      function coil(xc, n, col) { var turns = Math.max(3, Math.min(26, Math.round(n / 80))), hh = ch * 0.7, top = cy - hh / 2; ctx.strokeStyle = col; ctx.lineWidth = 3; for (var t = 0; t < turns; t++) { var yy = top + (t + 0.5) * hh / turns; ctx.beginPath(); ctx.ellipse(xc, yy, th * 0.85, 4, 0, 0, Math.PI * 2); ctx.stroke(); } return { top: top, bot: top + hh }; }
      var c1 = coil(cx - cw / 2 + th / 2, P.N1, '#b87333'), c2 = coil(cx + cw / 2 - th / 2, P.N2, '#c9a24a');
      R.tag(ctx, 'N₁ = ' + P.N1, cx - cw / 2 + th / 2, c1.top - 16, { size: 10.5 }); R.tag(ctx, 'N₂ = ' + P.N2, cx + cw / 2 - th / 2, c2.top - 16, { size: 10.5 });
      // желі және жүктеме
      var lx = cx - cw / 2 - (wide ? 70 : 26), rx = cx + cw / 2 + (wide ? 70 : 26);
      R.wire(ctx, [[cx - cw / 2 - th * 0.3, c1.top], [lx, c1.top], [lx, cy - 18]], { color: '#c0392b', phase: S.t * 40 * Math.sign(ph), current: true });
      R.wire(ctx, [[cx - cw / 2 - th * 0.3, c1.bot], [lx, c1.bot], [lx, cy + 18]], { color: '#2b2f33', phase: S.t * 40 * Math.sign(ph), current: true });
      R.sphere(ctx, lx, cy, 18, '#2b2f33'); R.txt(ctx, '~', lx, cy + 1, { size: 18, color: '#fff', weight: '700' });
      R.wire(ctx, [[cx + cw / 2 + th * 0.3, c2.top], [rx, c2.top], [rx, cy - 18]], { color: '#c0392b', phase: S.t * 40 * Math.sign(ph), current: true });
      R.wire(ctx, [[cx + cw / 2 + th * 0.3, c2.bot], [rx, c2.bot], [rx, cy + 22]], { color: '#2b2f33', phase: S.t * 40 * Math.sign(ph), current: true });
      R.bulb(ctx, rx, cy, 16, Math.min(1, c.P2 / 200));
      var by = Math.min(H - 30, cy + ch / 2 + 46);
      R.tag(ctx, 'U₁ = ' + P.U1 + ' В,  I₁ = ' + c.I1.toFixed(2).replace('.', ',') + ' А', wide ? lx + 40 : W * 0.3, by, { size: W < 600 ? 9.5 : 11, color: '#b4342a' });
      R.tag(ctx, 'U₂ = ' + c.U2.toFixed(1).replace('.', ',') + ' В,  I₂ = ' + c.I2.toFixed(2).replace('.', ',') + ' А', wide ? rx - 40 : W * 0.72, by + (wide ? 0 : 26), { size: W < 600 ? 9.5 : 11, color: '#0b6b78' });
      R.tag(ctx, 'U₁/U₂ = N₁/N₂ = ' + c.k.toFixed(2).replace('.', ',') + '   P₂ = ' + c.P2.toFixed(0) + ' Вт', W / 2, 20, { size: W < 600 ? 10 : 12, color: '#0b6b78' });
    },
  });
  function calc(P) { var k = P.N1 / P.N2, U2 = P.U1 / k, I2 = U2 / P.Rl, P2 = U2 * I2, I1 = P2 / (P.eta / 100) / P.U1; return { k: k, U2: U2, I2: I2, P2: P2, I1: I1 }; }
})();

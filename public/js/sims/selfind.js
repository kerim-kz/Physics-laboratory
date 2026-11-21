/* Өздік индукция: екі параллель тармақ — бірінде шам мен реостат, екіншісінде шам мен индуктивтілігі L катушка. Кілтті тұйықтағанда катушкалы тармақтағы шам кешігіп жанады; ажыратқанда катушка энергиясы LI²/2 шамда жарқ етіп бөлінеді. */
(function () {
  var R = window.Real, E = 6, Rb = 12; // ЭҚК, әр тармақтың кедергісі
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, keepRunning: true, autoplay: true,
    hint: '«Кілт» белгісін қойып, тізбекті тұйықта. Екінші шам неге кешігіп жанады? Кілтті ажыратқанда не болады?',
    controls: [
      { type: 'check', key: 'on', label: 'Кілт тұйықталған', value: false, live: true },
      { type: 'range', key: 'L', label: 'Катушканың индуктивтілігі L', min: 0.5, max: 20, step: 0.5, value: 8, unit: 'Гн', digits: 1, live: true },
      { type: 'check', key: 'core', label: 'Темір өзекше енгізілген (L × 3)', value: false, live: true },
    ],
    readouts: [
      { key: 'I1', label: 'Реостатты тармақтағы ток I₁', unit: 'А', digits: 3 },
      { key: 'I2', label: 'Катушкалы тармақтағы ток I₂', unit: 'А', digits: 3 },
      { key: 'tau', label: 'Уақыт тұрақтысы τ = L/R', unit: 'с', digits: 2 },
      { key: 'eps', label: 'Өздік индукция ЭҚК-і ℰ = −L·ΔI/Δt', unit: 'В', digits: 2 },
      { key: 'Wm', label: 'Магнит өрісінің энергиясы LI²/2', unit: 'Дж', digits: 3 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.I1 = 0; S.I2 = 0; S.hist = []; S.was = api.P.on; S.dI = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, L = P.L * (P.core ? 3 : 1);
      S.t += dt;
      if (P.on) { S.I1 = E / Rb; var nI = S.I2 + (E - S.I2 * Rb) / L * dt; S.dI = (nI - S.I2) / dt; S.I2 = nI; }
      else { // ажыратылғанда: катушка тогы екі шам арқылы тұйықталады (2Rb)
        S.I1 = -S.I2; var nI2 = S.I2 - S.I2 * 2 * Rb / L * dt; S.dI = (nI2 - S.I2) / dt; S.I2 = Math.abs(nI2) < 1e-4 ? 0 : nI2; if (!S.I2) S.I1 = 0;
      }
      S.hist.push([S.t, S.I1, S.I2]); if (S.hist.length > 900) S.hist.shift();
    },
    read: function (api) { var S = api.S, P = api.P, L = P.L * (P.core ? 3 : 1); return { I1: S.I1, I2: S.I2, tau: L / Rb, eps: -L * S.dI, Wm: L * S.I2 * S.I2 / 2 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, L = P.L * (P.core ? 3 : 1), wide = W > 640, dark = R.isDark(), Imax = E / Rb;
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      var x0 = wide ? 50 : 26, x1 = wide ? W * 0.5 : W - 26, yT = wide ? H * 0.14 : 30, yM = wide ? H * 0.42 : H * 0.2, yB = wide ? H * 0.72 : H * 0.38;
      var ph1 = S.t * S.I1 * 90, ph2 = S.t * S.I2 * 90;
      // батарея және кілт (сол жақ тармақ)
      R.wire(ctx, [[x0, yB], [x0, yT], [x1, yT], [x1, yB], [x0, yB]], { color: '#c0392b' });
      R.wire(ctx, [[x0 + (x1 - x0) * 0.22, yT], [x0 + (x1 - x0) * 0.22, yB]], { color: '#c0392b', phase: ph1, current: Math.abs(S.I1) > 0.003 });
      R.wire(ctx, [[x1, yT], [x1, yB]], { color: '#c0392b', phase: ph2, current: Math.abs(S.I2) > 0.003 });
      ctx.save(); ctx.translate(x0, (yT + yB) / 2 + 20); ctx.rotate(-Math.PI / 2); R.battery(ctx, -34, -12, 68, 24, { label: E + ' В' }); ctx.restore();
      R.knife(ctx, x0 + 30, x0 + 62, yT, P.on); R.tag(ctx, 'К', x0 + 46, yT - 22, { size: 10.5 });
      // 1-тармақ: шам + реостат
      var b1x = x0 + (x1 - x0) * 0.22;
      R.bulb(ctx, b1x, yM - 18, 14, Math.min(1, Math.abs(S.I1) / Imax)); R.tag(ctx, 'Ш₁', b1x - 30, yM - 18, { size: 10.5 });
      ctx.save(); ctx.translate(b1x, yB - 40); ctx.rotate(Math.PI / 2); R.resistor(ctx, 0, 0, 50, {}); ctx.restore(); R.tag(ctx, 'R', b1x - 26, yB - 40, { size: 10.5 });
      // 2-тармақ: шам + катушка
      R.bulb(ctx, x1, yM - 18, 14, Math.min(1, Math.abs(S.I2) / Imax)); R.tag(ctx, 'Ш₂', x1 + 30, yM - 18, { size: 10.5 });
      var cy = yB - 42, ch = 56;
      ctx.fillStyle = P.core ? '#59616a' : 'rgba(0,0,0,0)'; ctx.fillRect(x1 - 6, cy - ch / 2 - 6, 12, ch + 12);
      ctx.strokeStyle = '#b87333'; ctx.lineWidth = 3; for (var k = 0; k < 9; k++) { var y = cy - ch / 2 + k * ch / 8; ctx.beginPath(); ctx.ellipse(x1, y, 14, 4, 0, 0, Math.PI); ctx.stroke(); }
      R.tag(ctx, 'L', x1 + 30, cy, { size: 10.5 });
      if (!P.on && Math.abs(S.I2) > 0.01) R.tag(ctx, 'Катушка энергиясы шамдарда бөлінуде!', (x0 + x1) / 2, yB + 22, { size: 10.5, color: '#b4342a' });
      // I(t) графигі
      var gx = wide ? W * 0.6 : 46, gy = wide ? 30 : yB + 52, gw = wide ? W * 0.36 : W - 64, gh = wide ? H * 0.74 : H - yB - 100;
      ctx.save(); R.rr(ctx, gx - 46, gy - 18, gw + 58, gh + 50, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var t0 = S.t - 8, pp = S.hist.filter(function (h) { return h[0] > t0; });
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: Math.max(0, t0), xmax: Math.max(8, S.t), ymin: -Imax * 1.1, ymax: Imax * 1.2, xlabel: 't, с', ylabel: 'I, А', series: [{ pts: pp.map(function (h) { return [h[0], h[1]]; }), color: '#e0761b', width: 2 }, { pts: pp.map(function (h) { return [h[0], h[2]]; }), color: '#1f5fd1', width: 2.5 }] });
      R.txt(ctx, 'қызғылт — I₁ (реостат), көк — I₂ (катушка)', gx + gw / 2, gy + 10, { size: 10, color: '#5b6670' });
      R.tag(ctx, 'τ = L/R = ' + (L / Rb).toFixed(2).replace('.', ',') + ' с', gx + gw - 60, gy + gh - 16, { size: 10.5, color: '#0b6b78' });
    },
  });
})();

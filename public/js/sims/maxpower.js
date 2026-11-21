/* Ток көзінің қуаты мен ПӘК-і: ЭҚК-і ℰ, ішкі кедергісі r ток көзі және реостат R. Пайдалы қуат R = r болғанда ең үлкен, ПӘК η = R/(R + r). */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, static: true,
    hint: 'Реостаттың кедергісін өзгертіп, пайдалы қуаттың ең үлкен мәнін тап. Сол кезде ПӘК қандай?',
    controls: [
      { type: 'range', key: 'E', label: 'ЭҚК ℰ', min: 1.5, max: 12, step: 0.5, value: 6, unit: 'В', digits: 1 },
      { type: 'range', key: 'r', label: 'Ішкі кедергі r', min: 0.5, max: 5, step: 0.5, value: 2, unit: 'Ом', digits: 1 },
      { type: 'range', key: 'R', label: 'Сыртқы кедергі R', min: 0, max: 20, step: 0.25, value: 2, unit: 'Ом', digits: 2 },
    ],
    readouts: [
      { key: 'I', label: 'Ток I = ℰ/(R + r)', unit: 'А', digits: 2 },
      { key: 'U', label: 'Қысқыштардағы кернеу U = IR', unit: 'В', digits: 2 },
      { key: 'Pu', label: 'Пайдалы қуат P = I²R', unit: 'Вт', digits: 2 },
      { key: 'Pt', label: 'Толық қуат P<sub>т</sub> = ℰI', unit: 'Вт', digits: 2 },
      { key: 'eta', label: 'ПӘК η = R/(R + r)', unit: '%', digits: 1 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var P = api.P, I = P.E / (P.R + P.r); return { I: I, U: I * P.R, Pu: I * I * P.R, Pt: P.E * I, eta: P.R / (P.R + P.r) * 100 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, I = P.E / (P.R + P.r), Pu = I * I * P.R, Pmax = P.E * P.E / (4 * P.r), wide = W > 640, dark = R.isDark();
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      // тізбек
      var L = wide ? 40 : 30, Rr = wide ? W * 0.34 : W - 30, T = wide ? H * 0.2 : 40, B = wide ? H * 0.62 : H * 0.32;
      R.wire(ctx, [[L, (T + B) / 2 - 50], [L, T], [Rr, T], [Rr, B], [L, B], [L, (T + B) / 2 + 50]], { color: '#c0392b' });
      ctx.save(); ctx.translate(L, (T + B) / 2); ctx.rotate(-Math.PI / 2); R.battery(ctx, -50, -15, 100, 30, { label: 'ℰ = ' + P.E.toFixed(1).replace('.', ',') + ' В' }); ctx.restore();
      ctx.strokeStyle = 'rgba(80,80,80,.6)'; ctx.setLineDash([4, 3]); ctx.strokeRect(L - 30, (T + B) / 2 - 62, 60, 124); ctx.setLineDash([]);
      R.tag(ctx, 'r = ' + P.r.toFixed(1).replace('.', ',') + ' Ом', L + 58, (T + B) / 2 + 52, { size: 10 });
      // реостат (жылжымалы контакт)
      var rx = (L + Rr) / 2, rw = Math.min(160, (Rr - L) * 0.55), ry = T;
      R.block(ctx, rx - rw / 2, ry - 12, rw, 24, 'steel', { depth: 3, shadow: false });
      ctx.strokeStyle = '#b87333'; ctx.lineWidth = 1.2; for (var k = 0; k < rw; k += 4) { ctx.beginPath(); ctx.moveTo(rx - rw / 2 + k, ry - 11); ctx.lineTo(rx - rw / 2 + k + 2, ry + 11); ctx.stroke(); }
      var sx = rx - rw / 2 + P.R / 20 * rw; ctx.fillStyle = '#2b2f33'; ctx.fillRect(sx - 4, ry - 22, 8, 14);
      R.tag(ctx, 'R = ' + P.R.toFixed(2).replace('.', ',') + ' Ом', rx, ry - 34, { size: 11 });
      // шам — пайдалы қуатты көрсетеді
      R.bulb(ctx, Rr - 10 - 30, B - 22, 15, Math.min(1, Pu / Math.max(0.5, Pmax)));
      R.meter(ctx, Rr, (T + B) / 2, 24, I, Math.ceil(P.E / P.r), { letter: 'A' });
      // графиктер P(R) және η(R)
      var gx = wide ? W * 0.47 : 46, gy = wide ? 30 : B + 46, gw = wide ? W * 0.48 : W - 64, gh = wide ? H * 0.74 : H - B - 100;
      ctx.save(); R.rr(ctx, gx - 44, gy - 18, gw + 84, gh + 50, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var pP = [], pE = [], pT = []; for (var x = 0; x <= 20.001; x += 0.1) { var i = P.E / (x + P.r); pP.push([x, i * i * x]); pT.push([x, P.E * i]); pE.push([x, x / (x + P.r) * Pmax * 1.2]); }
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 20, ymin: 0, ymax: Pmax * 1.3, xlabel: 'R, Ом', ylabel: 'P, Вт', series: [{ pts: pT, color: 'rgba(120,130,140,.7)', dash: [5, 4], width: 1.5 }, { pts: pP, color: '#d2382b', width: 2.6 }, { pts: pE, color: '#0b8a7a', width: 2, dash: [2, 3] }], marker: [P.R, Pu] });
      ctx.strokeStyle = '#e0761b'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(o.X(P.r), gy); ctx.lineTo(o.X(P.r), gy + gh); ctx.stroke(); ctx.setLineDash([]);
      R.tag(ctx, 'R = r → P max', o.X(P.r) + 46, gy + 14, { size: 10, color: '#b4560f' });
      R.tag(ctx, 'P = I²R', o.X(14), o.Y(pP[140][1]) - 14, { size: 10, color: '#b4342a' });
      R.tag(ctx, 'η (оң ось)', o.X(16), o.Y(pE[160][1]) - 14, { size: 10, color: '#0b6b78' });
      for (var e = 0; e <= 100; e += 25) R.txt(ctx, e + '%', gx + gw + 18, o.Y(e / 100 * Pmax * 1.2), { size: 9, color: '#0b6b78' });
    },
  });
})();

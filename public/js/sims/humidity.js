/* Ауаның ылғалдылығы: психрометр (құрғақ және ылғалды термометрлер) және қаныққан бу қысымының температураға тәуелділігі. Шық нүктесі — бу қанығатын температура. */
(function () {
  var R = window.Real;
  function psat(T) { return 0.6112 * Math.exp(17.62 * T / (243.12 + T)); } // кПа (Магнус формуласы)
  function dew(p) { var a = Math.log(p / 0.6112); return 243.12 * a / (17.62 - a); }
  function wet(T, f) { // Стал формуласы (ылғалды термометр)
    return T * Math.atan(0.151977 * Math.sqrt(f + 8.313659)) + Math.atan(T + f) - Math.atan(f - 1.676331) + 0.00391838 * Math.pow(f, 1.5) * Math.atan(0.023101 * f) - 4.686035;
  }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.1, grid: false, static: true,
    hint: 'Ауаның температурасы мен салыстырмалы ылғалдылығын өзгерт. Ылғалды термометр неге төмен көрсетеді? Ауаны шық нүктесіне дейін суытсақ не болады?',
    controls: [
      { type: 'range', key: 'T', label: 'Ауаның температурасы t', min: 0, max: 35, step: 1, value: 22, unit: '°C', digits: 0 },
      { type: 'range', key: 'f', label: 'Салыстырмалы ылғалдылық φ', min: 15, max: 100, step: 5, value: 55, unit: '%', digits: 0 },
    ],
    readouts: [
      { key: 'ps', label: 'Қаныққан бу қысымы p<sub>қ</sub>', unit: 'кПа', digits: 2 },
      { key: 'p', label: 'Бу қысымы p = φ·p<sub>қ</sub>', unit: 'кПа', digits: 2 },
      { key: 'rho', label: 'Абсолют ылғалдылық ρ', unit: 'г/м³', digits: 1 },
      { key: 'td', label: 'Шық нүктесі t<sub>ш</sub>', unit: '°C', digits: 1 },
      { key: 'tw', label: 'Ылғалды термометр', unit: '°C', digits: 1 },
    ],
    init: function () {}, step: function () {},
    read: function (api) {
      var P = api.P, ps = psat(P.T), p = ps * P.f / 100;
      return { ps: ps, p: p, rho: p * 1000 * 0.018 / (8.314 * (P.T + 273.15)) * 1000, td: dew(p), tw: P.f >= 100 ? P.T : wet(P.T, P.f) };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, wide = W > 640, dark = R.isDark(), ps = psat(P.T), p = ps * P.f / 100, td = dew(p), tw = P.f >= 100 ? P.T : wet(P.T, P.f);
      var table = wide ? H * 0.9 : H * 0.48;
      R.scene(ctx, W, H, 'lab', { table: table });
      // психрометр: тақтадағы екі термометр
      var bx = wide ? 40 : 16, bw = wide ? W * 0.3 : W * 0.5, by = 24, bh = table - by - 14;
      ctx.save(); R.rr(ctx, bx, by, bw, bh, 8); var g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#c99a62'); g.addColorStop(1, '#a87a4c'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      var th = bh * 0.72, x1 = bx + bw * 0.3, x2 = bx + bw * 0.7, ty = by + 26;
      R.thermometer(ctx, x1, ty, th, P.T, -10, 40, { step: 10 });
      R.thermometer(ctx, x2, ty, th, tw, -10, 40, { step: 10 });
      // ылғалды шүберек және су ыдысы
      ctx.fillStyle = 'rgba(240,240,235,.95)'; ctx.fillRect(x2 - 7, ty + th - 6, 14, 24);
      if (wide) R.vessel(ctx, x2 - 16, ty + th + 14, 32, 22, 16, {});
      R.tag(ctx, 'құрғақ', x1, by + 12, { size: 9.5 }); R.tag(ctx, 'ылғалды', x2, by + 12, { size: 9.5 });
      R.tag(ctx, 'Δt = ' + (P.T - tw).toFixed(1).replace('.', ',') + ' °C', bx + bw / 2, by + bh - 6, { size: 11, color: '#0b6b78' });
      // қаныққан бу қысымының графигі
      var gx = wide ? W * 0.44 : 48, gy = wide ? 30 : table + 26, gw = wide ? W * 0.52 : W - 66, gh = wide ? H * 0.72 : H - table - 76;
      ctx.save(); R.rr(ctx, gx - 44, gy - 18, gw + 56, gh + 50, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var pts = []; for (var t = -5; t <= 40; t += 0.5) pts.push([t, psat(t)]);
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: -5, xmax: 40, ymin: 0, ymax: 7.5, xlabel: 't, °C', ylabel: 'p, кПа', series: [{ pts: pts, color: '#1f5fd1', width: 2.5 }] });
      // күйдің нүктесі → шық нүктесі (изобаралық суыту)
      ctx.strokeStyle = '#e0761b'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(o.X(P.T), o.Y(p)); ctx.lineTo(o.X(td), o.Y(p)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.X(P.T), o.Y(p)); ctx.lineTo(o.X(P.T), o.Y(ps)); ctx.stroke(); ctx.setLineDash([]);
      api.D.circle(ctx, o.X(P.T), o.Y(p), 5, '#d2382b', null, 0, true);
      api.D.circle(ctx, o.X(td), o.Y(p), 5, '#0b8a7a', null, 0, true);
      R.tag(ctx, 'ауаның күйі', o.X(P.T) + 46, o.Y(p) + 14, { size: 10, color: '#b4342a' });
      R.tag(ctx, 'шық нүктесі', o.X(td) - 40, o.Y(p) - 16, { size: 10, color: '#0b6b78' });
      R.tag(ctx, 'қаныққан бу қысымы', o.X(33), o.Y(psat(33)) - 18, { size: 10, color: '#1f5fd1' });
      R.tag(ctx, 'φ = p / pқ · 100 %', gx + gw * 0.25, gy + 14, { size: 11, color: '#0b6b78' });
    },
  });
})();

/* Металдардың кедергісінің температураға тәуелділігі R = R₀(1 + αt) және асқынөткізгіштік (сынап, 4,15 К). */
(function () {
  var R = window.Real;
  var MAT = { w: ['Вольфрам (шамның қылы)', 0.0045, 20], cu: ['Мыс', 0.0043, 1], fe: ['Темір', 0.006, 5], hg: ['Сынап (асқынөткізгіш)', 0.0009, 2] };
  function res(k, t) {
    var m = MAT[k];
    if (k === 'hg' && t + 273.15 < 4.15) return 0;
    return Math.max(0.02 * m[2], m[2] * (1 + m[1] * t));
  }
  Sim.create({
    aspect: 0.6, grid: false, static: true, resetLabel: false,
    hint: 'Температураны өзгерт. Сынапты −269 °C-тан (4,15 К) төмен суытсаң, кедергісі кенет нөлге айналады.',
    controls: [
      { type: 'select', key: 'm', label: 'Металл', value: 'w', options: Object.keys(MAT).map(function (k) { return [k, MAT[k][0]]; }) },
      { type: 'range', key: 't', label: 'Температура t', min: -273, max: 2500, step: 1, value: 20, unit: '°C', digits: 0 },
    ],
    readouts: [
      { key: 'T', label: 'Абсолют температура', unit: 'К', digits: 0 },
      { key: 'R', label: 'Кедергі R', unit: 'Ом', digits: 3 },
      { key: 'ratio', label: 'R / R₀ (0 °C-қа қатысты)', digits: 2 },
      { key: 'sc', label: 'Күйі', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var P = api.P, r = res(P.m, P.t), r0 = MAT[P.m][2]; return { T: P.t + 273.15, R: r, ratio: r / r0, sc: r === 0 ? 'асқынөткізгіштік: R = 0' : 'қалыпты' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, D = api.D, m = MAT[P.m];
      R.scene(ctx, W, H, 'lab', { table: H * 0.9 });
      // шам немесе сым үлгісі
      var glow = P.m === 'w' ? Math.max(0, Math.min(1, (P.t - 600) / 1900)) : 0;
      if (P.m === 'w') R.bulb(ctx, W * 0.2, H * 0.36, 52, glow);
      else {
        var cold = P.t < -150;
        R.vessel(ctx, W * 0.08, H * 0.3, W * 0.24, H * 0.5, H * 0.38, { liquid: cold ? 'rgba(200,230,255,1)' : 'water' });
        ctx.strokeStyle = m[0].indexOf('Мыс') === 0 ? '#c06c3e' : '#8f99a3'; ctx.lineWidth = 3;
        ctx.beginPath(); for (var i = 0; i <= 40; i++) ctx.lineTo(W * 0.12 + i * W * 0.004, H * 0.55 + Math.sin(i) * 10); ctx.stroke();
        if (cold) R.tag(ctx, P.t < -200 ? 'сұйық гелий / азот' : 'суытқыш', W * 0.2, H * 0.26, { size: 10.5 });
      }
      // R(t) графигі
      var pts = []; for (var t = -273; t <= 2500; t += 5) pts.push([t, res(P.m, t)]);
      var ymax = res(P.m, 2500) * 1.05;
      D.plot(ctx, { x: W * 0.46, y: H * 0.1, w: W * 0.48, h: H * 0.66 }, { xmin: -273, xmax: 2500, ymin: 0, ymax: ymax, xlabel: 't, °C', ylabel: 'R, Ом', series: [{ pts: pts, color: '#c06c3e' }], marker: [P.t, res(P.m, P.t)] });
      if (P.m === 'hg') R.tag(ctx, '1911 ж. Камерлинг-Оннес: сынап 4,15 К-де асқынөткізгішке айналады', W * 0.7, H * 0.86, { size: 10.5 });
      else R.tag(ctx, 'R = R₀(1 + αt),  α = ' + Sim.fmt(m[1] * 1000, 1) + '·10⁻³ К⁻¹', W * 0.7, H * 0.86, { size: 11 });
    },
  });
})();

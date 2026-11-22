/* Аналогты-сандық түрлендіргіш: үздіксіз сигналды дискреттеу (уақыт бойынша) және кванттау (деңгей бойынша). Котельников теоремасы, разряд саны, ақпарат ағыны. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.3, grid: false, static: true,
    hint: 'Дискреттеу жиілігін сигнал жиілігінің екі еселенгенінен азайтып көр: қалпына келтірілген сигнал бұрмаланады. Разряд санын арттырғанда кванттау қателігі қалай өзгереді?',
    controls: [
      { type: 'range', key: 'fs', label: 'Дискреттеу жиілігі f<sub>д</sub>', min: 2, max: 60, step: 1, value: 20, unit: 'кГц', digits: 0 },
      { type: 'range', key: 'n', label: 'Разряд саны n', min: 1, max: 8, step: 1, value: 3, unit: 'бит', digits: 0 },
      { type: 'range', key: 'fm', label: 'Сигналдың ең үлкен жиілігі', min: 1, max: 10, step: 0.5, value: 4, unit: 'кГц', digits: 1 },
    ],
    readouts: [
      { key: 'N', label: 'Кванттау деңгейлері N = 2ⁿ', digits: 0 },
      { key: 'ok', label: 'Котельников шарты f<sub>д</sub> ≥ 2f<sub>max</sub>', text: true },
      { key: 'rate', label: 'Ақпарат ағыны n·f<sub>д</sub>', unit: 'кбит/с', digits: 0 },
      { key: 'err', label: 'Орташа кванттау қателігі', unit: '%', digits: 1 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var P = api.P, N = Math.pow(2, P.n); return { N: N, ok: P.fs >= 2 * P.fm ? 'орындалады ✓' : 'орындалмайды ✗', rate: P.n * P.fs, err: 100 / N / 2 / 2 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, N = Math.pow(2, P.n), wide = W > 640, dark = R.isDark();
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      var sig = function (t) { return 0.55 * Math.sin(2 * Math.PI * P.fm * t) + 0.3 * Math.sin(2 * Math.PI * P.fm * 0.37 * t + 1); }; // t — мс
      var T = 2, gx = 50, gw = W - 70, gy = 26, gh = wide ? H * 0.52 : H * 0.42;
      ctx.save(); R.rr(ctx, gx - 44, gy - 16, gw + 58, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var an = []; for (var t = 0; t <= T; t += T / 600) an.push([t, sig(t)]);
      var smp = [], q = [], step = [], dt = 1 / P.fs;
      for (var ts = 0; ts <= T + 1e-9; ts += dt) { var v = sig(ts), lv = Math.round((v + 1) / 2 * (N - 1)), qv = lv / (N - 1) * 2 - 1; smp.push([ts, v]); q.push([ts, qv, lv]); step.push([ts, qv], [Math.min(T, ts + dt), qv]); }
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: T, ymin: -1.05, ymax: 1.05, xlabel: 't, мс', ylabel: 'U', series: [{ pts: an, color: 'rgba(31,95,209,.55)', width: 2 }, { pts: step, color: '#d2382b', width: 2 }] });
      // кванттау деңгейлері
      if (N <= 32) for (var l = 0; l < N; l++) { var yv = l / (N - 1) * 2 - 1; ctx.strokeStyle = 'rgba(120,130,140,.25)'; ctx.beginPath(); ctx.moveTo(gx, o.Y(yv)); ctx.lineTo(gx + gw, o.Y(yv)); ctx.stroke(); }
      q.forEach(function (p) { ctx.strokeStyle = 'rgba(11,138,122,.6)'; ctx.beginPath(); ctx.moveTo(o.X(p[0]), o.Y(0)); ctx.lineTo(o.X(p[0]), o.Y(p[1])); ctx.stroke(); api.D.circle(ctx, o.X(p[0]), o.Y(p[1]), 3, '#0b8a7a', null, 0, true); });
      R.txt(ctx, 'көк — аналогты сигнал, қызыл — сандық (дискреттелген және кванттелген)', gx + gw / 2, gy + 8, { size: W < 600 ? 9 : 10.5, color: '#5b6670' });
      // екілік код
      var cy = gy + gh + 60, codes = q.slice(0, wide ? 12 : 6).map(function (p) { var b = p[2].toString(2); while (b.length < P.n) b = '0' + b; return b; });
      ctx.save(); R.rr(ctx, 14, cy - 18, W - 28, H - cy + 4, 10); ctx.fillStyle = '#1b2329'; ctx.fill(); ctx.restore();
      R.txt(ctx, 'Цифрлық код (бірінші өлшемдер):', 26, cy, { size: 11, weight: '700', align: 'left', color: '#7fe0a0' });
      R.txt(ctx, codes.join('  '), W / 2, cy + 26, { size: W < 600 ? 11 : 14, mono: true, color: '#7fe0a0' });
      R.txt(ctx, P.fs >= 2 * P.fm ? 'f_д ≥ 2·f_max — сигнал толық қалпына келеді' : 'f_д < 2·f_max — сигнал бұрмаланады (алиасинг)!', W / 2, cy + 52, { size: 11, color: P.fs >= 2 * P.fm ? '#7fe0a0' : '#ff8a7a', weight: '700' });
    },
  });
})();

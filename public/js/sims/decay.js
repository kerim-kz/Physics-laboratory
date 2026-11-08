/* Радиоактивті ыдырау: әр ядро dt уақытта p = 1 − 2^(−dt/T) ықтималдықпен ыдырайды. */
(function () {
  Sim.create({
    aspect: 0.62,
    controls: [
      { type: 'select', key: 'N0', label: 'Бастапқы ядролар саны N₀', value: '400', options: [['100', '100'], ['400', '400'], ['1600', '1600'], ['2500', '2500']] },
      { type: 'range', key: 'T', label: 'Жартылай ыдырау периоды T', min: 1, max: 8, step: 0.5, value: 3, unit: 'с', digits: 1 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'tt', label: 't / T', digits: 2 },
      { key: 'N', label: 'Ыдырамаған ядролар N', digits: 0 },
      { key: 'Nt', label: 'Заң бойынша N₀·2^(−t/T)', digits: 0 },
      { key: 'pct', label: 'N / N₀', unit: '%', digits: 1 },
    ],
    init: function (api) {
      var S = api.S, n = +api.P.N0;
      S.t = 0; S.alive = new Uint8Array(n).fill(1); S.N = n; S.hist = [[0, n]];
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, p = 1 - Math.pow(2, -dt / P.T);
      for (var i = 0; i < S.alive.length; i++) if (S.alive[i] && Math.random() < p) { S.alive[i] = 0; S.N--; }
      S.t += dt;
      S.hist.push([S.t, S.N]);
      if (S.N === 0 || S.t >= 6 * P.T) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, n = +P.N0;
      return { t: S.t, tt: S.t / P.T, N: S.N, Nt: n * Math.pow(2, -S.t / P.T), pct: S.N / n * 100 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, n = +P.N0;
      var side = Math.round(Math.sqrt(n)), gw = Math.min(W * 0.42, H - 40), cell = gw / side;
      for (var i = 0; i < n; i++) {
        var x = 20 + (i % side) * cell, y = 20 + Math.floor(i / side) * cell;
        ctx.fillStyle = S.alive[i] ? C.accent : C.soft;
        ctx.fillRect(x + 0.5, y + 0.5, Math.max(1, cell - 1), Math.max(1, cell - 1));
      }
      var theory = [];
      for (var t = 0; t <= 6 * P.T; t += P.T / 20) theory.push([t, n * Math.pow(2, -t / P.T)]);
      var px = 40 + gw + 30;
      D.plot(ctx, { x: px, y: 30, w: W - px - 20, h: H - 70 }, { xmin: 0, xmax: 6 * P.T, ymin: 0, ymax: n * 1.05, xlabel: 't, с', ylabel: 'N(t)',
        series: [{ pts: theory, color: C.muted, dash: [5, 4], width: 1.5 }, { pts: S.hist, color: C.accent }], marker: [S.t, S.N] });
      D.text(ctx, 'үзік сызық — ыдырау заңы', W - 24, 46, { size: 11, align: 'right', color: C.muted });
    },
  });
})();

/* Меншікті жылусыйымдылық: бірдей қыздырғыштармен массалары бірдей әртүрлі заттарды қыздыру.
   Q = cmΔt: c кіші зат тезірек қызады. */
(function () {
  var R = window.Real;
  var SUB = { water: ['Су', 4200, 'water'], oil: ['Күнбағыс майы', 1700, 'oil'], ice: ['Мұз (−20 °C-тан)', 2100, 'ice'], al: ['Алюминий', 920, 'aluminum'], fe: ['Болат', 500, 'steel'], cu: ['Мыс', 400, 'copper'] };
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Екі ыдысқа бірдей қуатты қыздырғыш қойылған. Қай зат тезірек қызады?',
    controls: [
      { type: 'select', key: 'a', label: 'Сол жақ ыдыстағы зат', value: 'water', options: Object.keys(SUB).map(function (k) { return [k, SUB[k][0]]; }) },
      { type: 'select', key: 'b', label: 'Оң жақ ыдыстағы зат', value: 'oil', options: Object.keys(SUB).map(function (k) { return [k, SUB[k][0]]; }) },
      { type: 'range', key: 'm', label: 'Әр заттың массасы', min: 0.1, max: 1, step: 0.1, value: 0.2, unit: 'кг' },
      { type: 'range', key: 'P', label: 'Қыздырғыш қуаты', min: 100, max: 1000, step: 50, value: 400, unit: 'Вт', digits: 0 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт', unit: 'с', digits: 0 },
      { key: 'Q', label: 'Әрқайсысына берілген жылу Q = Pt', unit: 'кДж', digits: 1 },
      { key: 'ta', label: 'Сол жақтағы температура', unit: '°C', digits: 1 },
      { key: 'tb', label: 'Оң жақтағы температура', unit: '°C', digits: 1 },
      { key: 'ca', label: 'c (сол) = Q / (mΔt)', unit: 'Дж/(кг·°C)', digits: 0 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.Ta = api.P.a === 'ice' ? -20 : 20; S.Tb = api.P.b === 'ice' ? -20 : 20; S.T0a = S.Ta; },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt * 10;
      var dQ = P.P * dt * 10;
      S.Ta += dQ / (SUB[P.a][1] * P.m); S.Tb += dQ / (SUB[P.b][1] * P.m);
      if (P.a === 'ice') S.Ta = Math.min(S.Ta, 0); if (P.b === 'ice') S.Tb = Math.min(S.Tb, 0);
      if (S.Ta > 99 || S.Tb > 99 || S.t > 600) return false;
    },
    read: function (api) { var S = api.S, P = api.P, Q = P.P * S.t; return { t: S.t, Q: Q / 1000, ta: S.Ta, tb: S.Tb, ca: S.Ta !== S.T0a ? Q / (P.m * (S.Ta - S.T0a)) : null }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.88;
      R.scene(ctx, W, H, 'lab', { table: table });
      [[W * 0.24, P.a, S.Ta], [W * 0.64, P.b, S.Tb]].forEach(function (g) {
        var x = g[0], sub = SUB[g[1]], bw = 120, bh = 110, y = table - 90 - bh;
        // электр плитасы
        R.block(ctx, x - 80, table - 40, 160, 34, 'steel', { depth: 10 });
        ctx.fillStyle = '#2a2c30'; ctx.fillRect(x - 70, table - 50, 140, 10);
        var hot = Math.min(1, S.t / 40);
        ctx.strokeStyle = 'rgba(' + Math.round(80 + 175 * hot) + ',' + Math.round(60 + 30 * hot) + ',40,1)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, table - 45, 50, 4, 0, 0, 7); ctx.stroke();
        if (sub[2] === 'water' || sub[2] === 'oil') {
          R.cylinder(ctx, x - bw / 2, y, bw, bh, 'aluminum', { shadow: false });
          R.liquid(ctx, x - bw / 2 + 5, y + 18, bw - 10, 12, sub[2], S.t / 10);
          if (g[2] > 80) for (var i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 30 + i * 20, y - 6); ctx.quadraticCurveTo(x - 38 + i * 20, y - 24, x - 28 + i * 20, y - 40); ctx.stroke(); }
        } else {
          R.cylinder(ctx, x - bw / 2, y + 30, bw, bh - 30, 'aluminum', { shadow: false });
          R.block(ctx, x - 40, y + 4, 80, 40, sub[2], { depth: 10, shadow: false });
        }
        R.thermometer(ctx, x + bw / 2 + 24, y - 50, 190, g[2], -20, 100, { step: 20 });
        R.tag(ctx, sub[0] + ': c = ' + sub[1], x, y - 70, { size: 11 });
      });
    },
  });
})();

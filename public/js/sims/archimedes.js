/* Архимед күші: F_A = ρ_с·g·V_б. Дене қалқиды, жүзеді немесе батады. */
(function () {
  var R = window.Real;
  var g = 9.8;
  var LIQ = { water: [1000, 'Су'], salt: [1030, 'Теңіз суы'], oil: [930, 'Күнбағыс майы'], kero: [800, 'Керосин'], merc: [13600, 'Сынап'] };
  var MAT = { cork: 240, pine: 500, ice: 900, paraffin: 900, brick: 1800, al: 2700, iron: 7800, lead: 11300 };

  function eq(P) {
    var rl = LIQ[P.liq][0], a = Math.cbrt(P.V * 1e-6); // қыр ұзындығы, м
    var m = P.rho * P.V * 1e-6;
    if (P.rho < rl) return { a: a, m: m, frac: P.rho / rl, state: 'қалқып жүзеді', bottom: false };
    if (P.rho === rl) return { a: a, m: m, frac: 1, state: 'сұйық ішінде жүзеді', bottom: false };
    return { a: a, m: m, frac: 1, state: 'батады', bottom: true };
  }

  Sim.create({
    grid: false,
    tools: ['ruler'],
    scale: function (api) { return api._sc || null; },
    aspect: 0.62,
    autoplay: true,
    keepRunning: true,
    controls: [
      { type: 'select', key: 'mat', label: 'Дене материалы', value: 'pine', live: true, options: [['pine', 'Қарағай (500 кг/м³)'], ['cork', 'Тығын (240 кг/м³)'], ['ice', 'Мұз (900 кг/м³)'], ['brick', 'Кірпіш (1800 кг/м³)'], ['al', 'Алюминий (2700 кг/м³)'], ['iron', 'Темір (7800 кг/м³)'], ['lead', 'Қорғасын (11300 кг/м³)'], ['custom', 'Өз мәнім (төмендегі жүгіртпе)']] },
      { type: 'range', key: 'rho', label: 'Дене тығыздығы ρ', min: 100, max: 12000, step: 10, value: 500, unit: 'кг/м³', digits: 0 },
      { type: 'range', key: 'V', label: 'Дене көлемі V', min: 50, max: 1000, step: 10, value: 500, unit: 'см³', digits: 0 },
      { type: 'select', key: 'liq', label: 'Сұйық', value: 'water', options: [['water', 'Су (1000 кг/м³)'], ['salt', 'Теңіз суы (1030 кг/м³)'], ['oil', 'Күнбағыс майы (930 кг/м³)'], ['kero', 'Керосин (800 кг/м³)'], ['merc', 'Сынап (13 600 кг/м³)']] },
    ],
    onLive: function (api, key) {
      if (key === 'mat' && api.P.mat !== 'custom') { api.set('rho', MAT[api.P.mat]); api.reset(); }
    },
    readouts: [
      { key: 'state', label: 'Күйі' },
      { key: 'm', label: 'Дене массасы m', unit: 'кг', digits: 3 },
      { key: 'mg', label: 'Ауырлық күші mg', unit: 'Н' },
      { key: 'fa', label: 'Архимед күші F_A', unit: 'Н' },
      { key: 'frac', label: 'Батқан бөлігі', unit: '%', digits: 0 },
      { key: 'p', label: 'Сұйықтағы салмағы (динамометр)', unit: 'Н' },
    ],
    init: function (api) {
      var S = api.S;
      S.e = eq(api.P);
      S.depth = 0; // дененің астыңғы бетінің сұйық бетінен тереңдігі, м
      S.t = 0;
    },
    step: function (api, dt) {
      var S = api.S, e = S.e, P = api.P;
      S.t += dt;
      var H0 = 0.16; // ыдыстағы сұйық тереңдігі, м
      var target = e.bottom ? H0 : (P.rho === LIQ[P.liq][0] ? Math.min(H0, e.a + 0.04) : e.frac * e.a);
      S.depth += (target - S.depth) * (1 - Math.exp(-dt * (e.bottom ? 2.2 : 3)));
    },
    read: function (api) {
      var S = api.S, e = S.e, P = api.P, rl = LIQ[P.liq][0];
      var sub = Math.max(0, Math.min(1, S.depth / e.a));
      var fa = rl * g * P.V * 1e-6 * sub;
      return { state: e.state, m: e.m, mg: e.m * g, fa: fa, frac: sub * 100, p: e.bottom ? Math.max(0, e.m * g - rl * g * P.V * 1e-6) : 0 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, e = S.e, P = api.P;
      var H0 = 0.16, k = (H - 100) / 0.24;
      api._sc = { px: k, unit: 'м' };
      var bw = Math.min(W * 0.55, 0.3 * k), bx = (W - bw) / 2 - 60, surf = 70, bottom = surf + H0 * k;
      R.scene(ctx, W, H, 'lab', { table: bottom + 2 });
      var liq = P.liq === 'merc' ? 'mercury' : P.liq === 'kero' ? 'kerosene' : P.liq === 'oil' ? 'oil' : P.liq === 'salt' ? 'saltwater' : 'water';
      R.vessel(ctx, bx, surf - 40, bw, H0 * k + 40, H0 * k, { liquid: liq });
      R.tag(ctx, LIQ[P.liq][1], bx + 60, bottom - 16, { size: 11 });
      // дене (текше): тығыздығына қарай материал
      var side = e.a * k, cx = bx + bw / 2;
      var topY = surf + S.depth * k - side;
      var mat = P.rho > 7000 ? 'steel' : P.rho > 2500 ? 'aluminum' : P.rho > 1000 ? 'brick' : P.rho > 850 ? 'ice' : 'pine';
      R.block(ctx, cx - side / 2, topY, side, side, mat, { depth: Math.min(14, side * 0.25), shadow: false });
      // күштер
      var sub = Math.max(0, Math.min(1, S.depth / e.a));
      var rl = LIQ[P.liq][0];
      var mg = e.m * g, fa = rl * g * P.V * 1e-6 * sub, N = e.bottom && S.depth > H0 - 0.002 ? Math.max(0, mg - fa) : 0;
      var fs = 110 / Math.max(mg, rl * g * P.V * 1e-6);
      var cy = topY + side / 2;
      R.force(ctx, cx - 10, cy, cx - 10, cy + mg * fs, '#7a3fc0', 'mg');
      if (fa > 0.001) R.force(ctx, cx + 10, cy, cx + 10, cy - fa * fs, '#0b6b78', 'F_A');
      if (N > 0.001) R.force(ctx, cx + 26, topY + side, cx + 26, topY + side - N * fs, '#1d7a45', 'N');
      R.tag(ctx, e.state, W - 110, 26, { size: 12.5, color: e.bottom ? '#b4342a' : '#1d7a45' });
      R.tag(ctx, 'ρ дене = ' + P.rho + ' кг/м³', W - 110, 54, { size: 11, mono: true });
      R.tag(ctx, 'ρ сұйық = ' + rl + ' кг/м³', W - 110, 80, { size: 11, mono: true });
    },

  });
})();

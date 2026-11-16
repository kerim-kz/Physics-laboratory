/* Орташа жылдамдық: жолдың екі бөлігі әртүрлі жылдамдықпен жүріледі. v_орт = (s₁ + s₂) / (t₁ + t₂). */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.5, grid: false,
    hint: 'Орташа жылдамдық жылдамдықтардың арифметикалық ортасына тең бола ма? Тексеріп көр.',
    controls: [
      { type: 'range', key: 's1', label: 'Бірінші бөлік s₁', min: 10, max: 120, step: 5, value: 60, unit: 'км', digits: 0 },
      { type: 'range', key: 'v1', label: 'Бірінші бөліктегі жылдамдық v₁', min: 20, max: 120, step: 5, value: 90, unit: 'км/сағ', digits: 0 },
      { type: 'range', key: 's2', label: 'Екінші бөлік s₂', min: 10, max: 120, step: 5, value: 60, unit: 'км', digits: 0 },
      { type: 'range', key: 'v2', label: 'Екінші бөліктегі жылдамдық v₂', min: 20, max: 120, step: 5, value: 45, unit: 'км/сағ', digits: 0 },
    ],
    readouts: [
      { key: 't1', label: 't₁ = s₁ / v₁', unit: 'сағ', digits: 2 },
      { key: 't2', label: 't₂ = s₂ / v₂', unit: 'сағ', digits: 2 },
      { key: 'vavg', label: 'v_орт = (s₁ + s₂) / (t₁ + t₂)', unit: 'км/сағ', digits: 1 },
      { key: 'mean', label: '(v₁ + v₂) / 2 (қате тәсіл)', unit: 'км/сағ', digits: 1 },
      { key: 'clock', label: 'Жолдағы уақыт', text: true },
    ],
    init: function (api) { api.S.t = 0; api.S.x = 0; },
    step: function (api, dt) {
      var P = api.P, S = api.S, T = P.s1 / P.v1 + P.s2 / P.v2;
      S.t = Math.min(T, S.t + dt * 0.25); // 1 с экран = 0,25 сағ
      S.x = S.t <= P.s1 / P.v1 ? S.t * P.v1 : P.s1 + (S.t - P.s1 / P.v1) * P.v2;
      if (S.t >= T) return false;
    },
    read: function (api) {
      var P = api.P, t1 = P.s1 / P.v1, t2 = P.s2 / P.v2, h = Math.floor(api.S.t), m = Math.round((api.S.t - h) * 60);
      return { t1: t1, t2: t2, vavg: (P.s1 + P.s2) / (t1 + t2), mean: (P.v1 + P.v2) / 2, clock: h + ' сағ ' + m + ' мин' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, ground = H * 0.5, total = P.s1 + P.s2;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, road: true, roadShift: 0 });
      var x0 = W * 0.07, x1 = W * 0.93, X = function (km) { return x0 + km / total * (x1 - x0); };
      var yRoad = ground + 29;
      // қалалар мен бөліктер
      [[0, 'А қаласы'], [P.s1, 'Ауыл'], [total, 'Б қаласы']].forEach(function (c, i) {
        var px = X(c[0]);
        ctx.fillStyle = '#f2efe6'; ctx.fillRect(px - 2, ground - 40, 4, 40);
        ctx.fillStyle = i === 1 ? '#e8b923' : '#2e7d4f'; R.rr(ctx, px - 34, ground - 62, 68, 22, 4); ctx.fill();
        R.txt(ctx, c[1], px, ground - 51, { size: 10.5, color: i === 1 ? '#3b2b00' : '#fff' });
      });
      // бөліктердің белгілері
      var by = H * 0.86;
      [[0, P.s1, '#2f6fd1', 's₁ = ' + P.s1 + ' км, v₁ = ' + P.v1 + ' км/сағ'], [P.s1, total, '#d2742a', 's₂ = ' + P.s2 + ' км, v₂ = ' + P.v2 + ' км/сағ']].forEach(function (b) {
        ctx.fillStyle = b[2]; ctx.fillRect(X(b[0]) + 2, by - 5, X(b[1]) - X(b[0]) - 4, 10);
        R.tag(ctx, b[3], (X(b[0]) + X(b[1])) / 2, by - 20, { size: 10.5, color: b[2] });
      });
      R.car(ctx, X(S.x), yRoad, Math.min(110, W * 0.12), '#d23a2a', S.x * 30);
    },
  });
})();

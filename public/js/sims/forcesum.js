/* Бір түзу бойымен әрекет ететін күштерді қосу: екі динамометрмен тартылған брусок (үйкелісі аз арбаша). */
(function () {
  var R = window.Real;
  var SC = 22; // 1 Н = 22 px
  function hDyn(ctx, x, y, F, right) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(right ? -Math.PI / 2 : Math.PI / 2);
    R.dynamometer(ctx, 0, -4, 140, F, 5, { div: 0.1, big: 1, w: 28 });
    ctx.restore();
  }
  Sim.create({
    aspect: 0.5, grid: false,
    hint: 'Күштер бір бағытта болса — қосылады, қарама-қарсы болса — үлкенінен кішісі алынады.',
    controls: [
      { type: 'select', key: 'mode', label: 'Күштердің бағыты', value: 'opp', options: [['opp', 'Қарама-қарсы'], ['same', 'Бір бағытта (оңға)']] },
      { type: 'range', key: 'F1', label: 'F₁ (оңға)', min: 0, max: 5, step: 0.5, value: 3, unit: 'Н' },
      { type: 'range', key: 'F2', label: 'F₂', min: 0, max: 5, step: 0.5, value: 2, unit: 'Н' },
    ],
    readouts: [
      { key: 'R', label: 'Тең әсерлі күш R', unit: 'Н', digits: 1 },
      { key: 'dir', label: 'R-дің бағыты', text: true },
      { key: 'st', label: 'Брусок', text: true },
    ],
    init: function (api) { api.S.x = 0; api.S.v = 0; },
    step: function (api, dt) {
      var P = api.P, S = api.S, Rr = P.mode === 'same' ? P.F1 + P.F2 : P.F1 - P.F2;
      S.v += Rr / 1.5 * dt; S.x += S.v * dt;
      if (Math.abs(S.x) > 0.3) return false;
    },
    read: function (api) {
      var P = api.P, Rr = P.mode === 'same' ? P.F1 + P.F2 : P.F1 - P.F2;
      return { R: Math.abs(Rr), dir: Rr > 0 ? 'оңға' : Rr < 0 ? 'солға' : '—', st: Rr === 0 ? 'тыныштықта (күштер теңгерілген)' : 'тең әсерлі күш бағытымен жылдамдайды' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.6;
      // Брусок пен динамометрлер экраннан шықпауы үшін: тар экранда жүру жолы қысқарады, «бір бағытта» күйінде сахна солға ығысады
      var base = P.mode === 'same' ? W * 0.3 : W / 2, room = P.mode === 'same' ? W - base - 230 : W / 2 - 215;
      var cx = base + S.x * Math.max(0, Math.min(260, room / 0.3));
      R.scene(ctx, W, H, 'lab', { table: table });
      var by = table - 50;
      R.block(ctx, cx - 50, by, 100, 40, 'oak', { depth: 12 });
      R.wheel(ctx, cx - 32, table - 7, 7, S.x * 40); R.wheel(ctx, cx + 32, table - 7, 7, S.x * 40);
      var hy = by + 20;
      if (P.mode === 'opp') {
        hDyn(ctx, cx + 56, hy, P.F1, true); hDyn(ctx, cx - 56, hy, P.F2, false);
        if (P.F1) R.force(ctx, cx + 2, hy - 34, cx + 2 + P.F1 * SC, hy - 34, '#d2382b', 'F₁');
        if (P.F2) R.force(ctx, cx - 2, hy - 34, cx - 2 - P.F2 * SC, hy - 34, '#1f5fd1', 'F₂');
      } else {
        hDyn(ctx, cx + 56, hy - 10, P.F1, true); hDyn(ctx, cx + 56, hy + 10, P.F2, true);
        if (P.F1) R.force(ctx, cx, hy - 40, cx + P.F1 * SC, hy - 40, '#d2382b', 'F₁');
        if (P.F2) R.force(ctx, cx + P.F1 * SC, hy - 40, cx + (P.F1 + P.F2) * SC, hy - 40, '#1f5fd1', 'F₂');
      }
      // тең әсерлі күш (үстелдің алдында, масштабпен)
      var Rr = P.mode === 'same' ? P.F1 + P.F2 : P.F1 - P.F2, ry = table + (H - table) * 0.5;
      R.tag(ctx, 'Тең әсерлі күш:', W / 2 - 150, ry, { size: 11 });
      if (Rr) R.force(ctx, W / 2, ry, W / 2 + Rr * SC, ry, '#1d7a45', 'R = ' + Sim.fmt(Math.abs(Rr), 1) + ' Н');
      else R.tag(ctx, 'R = 0', W / 2, ry, { size: 12, color: '#1d7a45' });
    },
  });
})();

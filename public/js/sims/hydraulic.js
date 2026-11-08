/* Гидравликалық пресс: p = F₁/S₁ = F₂/S₂; көлем сақталады: S₁h₁ = S₂h₂, сондықтан A₁ = A₂. */
(function () {
  Sim.create({
    aspect: 0.6, static: true, resetLabel: false,
    hint: 'Күштен неше есе ұтсақ, жолдан сонша есе ұтыламыз.',
    controls: [
      { type: 'range', key: 'S1', label: 'Кіші поршень ауданы S₁', min: 2, max: 20, step: 1, value: 5, unit: 'см²', digits: 0 },
      { type: 'range', key: 'S2', label: 'Үлкен поршень ауданы S₂', min: 50, max: 400, step: 10, value: 200, unit: 'см²', digits: 0 },
      { type: 'range', key: 'F1', label: 'Кіші поршеньге түсетін күш F₁', min: 10, max: 200, step: 5, value: 50, unit: 'Н', digits: 0 },
      { type: 'range', key: 'h1', label: 'Кіші поршеньнің жылжуы h₁', min: 0, max: 20, step: 1, value: 10, unit: 'см', digits: 0 },
    ],
    readouts: [
      { key: 'p', label: 'Сұйық қысымы p = F₁/S₁', unit: 'кПа', digits: 1 },
      { key: 'F2', label: 'Үлкен поршеньдегі күш F₂', unit: 'Н', digits: 0 },
      { key: 'k', label: 'Күштен ұтыс F₂/F₁', digits: 1 },
      { key: 'h2', label: 'Үлкен поршеньнің көтерілуі h₂', unit: 'мм', digits: 1 },
      { key: 'A1', label: 'A₁ = F₁h₁', unit: 'Дж', digits: 2 },
      { key: 'A2', label: 'A₂ = F₂h₂', unit: 'Дж', digits: 2 },
    ],
    init: function () {},
    step: function () {},
    read: function (api) {
      var P = api.P, p = P.F1 / (P.S1 * 1e-4), F2 = p * P.S2 * 1e-4, h2 = P.h1 * P.S1 / P.S2;
      return { p: p / 1000, F2: F2, k: P.S2 / P.S1, h2: h2 * 10, A1: P.F1 * P.h1 / 100, A2: F2 * h2 / 100 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D;
      var w1 = 14 + Math.sqrt(P.S1) * 6, w2 = 30 + Math.sqrt(P.S2) * 7;
      var x1 = W * 0.22, x2 = W * 0.62, base = H - 50, lvl = H * 0.42, pxPerCm = 4;
      var d1 = P.h1 * pxPerCm, d2 = P.h1 * P.S1 / P.S2 * pxPerCm;
      var water = 'rgba(80,150,220,.35)';
      ctx.fillStyle = water;
      ctx.fillRect(x1 - w1 / 2, lvl + d1, w1, base - lvl - d1);
      ctx.fillRect(x2 - w2 / 2, lvl - d2, w2, base - lvl + d2);
      ctx.fillRect(x1 - w1 / 2, base - 24, x2 - x1 + w1 / 2 - w2 / 2 + w2, 24);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1 - w1 / 2, lvl - 90); ctx.lineTo(x1 - w1 / 2, base); ctx.lineTo(x2 + w2 / 2, base); ctx.lineTo(x2 + w2 / 2, lvl - 90);
      ctx.moveTo(x1 + w1 / 2, lvl - 90); ctx.lineTo(x1 + w1 / 2, base - 24); ctx.lineTo(x2 - w2 / 2, base - 24); ctx.lineTo(x2 - w2 / 2, lvl - 90);
      ctx.stroke();
      // поршеньдер
      ctx.fillStyle = C.muted;
      ctx.fillRect(x1 - w1 / 2 + 2, lvl + d1 - 12, w1 - 4, 12);
      ctx.fillRect(x2 - w2 / 2 + 2, lvl - d2 - 14, w2 - 4, 14);
      D.line(ctx, x1, lvl + d1 - 12, x1, lvl + d1 - 50, C.ink, 3);
      var p = P.F1 / P.S1, F2 = p * P.S2;
      D.arrow(ctx, x1, lvl + d1 - 110, x1, lvl + d1 - 54, C.red, 3, 'F₁');
      D.arrow(ctx, x2, lvl - d2 - 16, x2, lvl - d2 - 16 - Math.min(150, 30 + F2 / 30), C.good, 3, 'F₂');
      // бастапқы деңгей
      D.line(ctx, x1 - w1, lvl, x2 + w2, lvl, C.brass, 1, [5, 4]);
      D.text(ctx, 'бастапқы деңгей', x2 + w2 / 2 + 6, lvl + 4, { size: 10, color: C.brass });
      D.text(ctx, 'S₁', x1, base + 18, { size: 12, align: 'center', weight: '600' });
      D.text(ctx, 'S₂', x2, base + 18, { size: 12, align: 'center', weight: '600' });
      D.text(ctx, 'p = F₁/S₁ = F₂/S₂', W * 0.04, 26, { size: 13, mono: true, weight: '600' });
      D.text(ctx, 'F₂/F₁ = S₂/S₁ = ' + api.fmt(P.S2 / P.S1, 1), W * 0.04, 46, { size: 13, mono: true, color: C.accent, weight: '600' });
    },
  });
})();

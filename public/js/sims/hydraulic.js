/* Гидравликалық пресс: p = F₁/S₁ = F₂/S₂; көлем сақталады: S₁h₁ = S₂h₂, сондықтан A₁ = A₂. */
(function () {
  var R = window.Real;
  Sim.create({
    grid: false,
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
      var P = api.P;
      var w1 = 14 + Math.sqrt(P.S1) * 6, w2 = 30 + Math.sqrt(P.S2) * 7;
      var x1 = W * 0.22, x2 = W * 0.62, base = H - 50, lvl = H * 0.42, pxPerCm = 4;
      var d1 = P.h1 * pxPerCm, d2 = P.h1 * P.S1 / P.S2 * pxPerCm;
      R.scene(ctx, W, H, 'lab', { table: base + 6 });
      // корпус: металл цилиндрлер және жалғағыш түтік
      var steel = function (x, y, w, h) { var g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#5c646b'); g.addColorStop(0.35, '#d5dade'); g.addColorStop(1, '#4b5258'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); };
      steel(x1 - w1 / 2 - 6, lvl - 90, w1 + 12, base - lvl + 90);
      steel(x2 - w2 / 2 - 6, lvl - 90, w2 + 12, base - lvl + 90);
      steel(x1, base - 30, x2 - x1, 30);
      // ішіндегі май (кесінді көрініс)
      var oil = 'rgba(214,160,40,.85)';
      ctx.fillStyle = 'rgba(40,40,40,.55)'; ctx.fillRect(x1 - w1 / 2, lvl - 90, w1, base - lvl + 90); ctx.fillRect(x2 - w2 / 2, lvl - 90, w2, base - lvl + 90); ctx.fillRect(x1, base - 24, x2 - x1, 18);
      ctx.fillStyle = oil;
      ctx.fillRect(x1 - w1 / 2, lvl + d1, w1, base - lvl - d1);
      ctx.fillRect(x2 - w2 / 2, lvl - d2, w2, base - lvl + d2);
      ctx.fillRect(x1, base - 24, x2 - x1, 18);
      // поршеньдер
      R.block(ctx, x1 - w1 / 2 + 1, lvl + d1 - 12, w1 - 2, 12, 'steel', { depth: 0, shadow: false });
      R.block(ctx, x2 - w2 / 2 + 1, lvl - d2 - 16, w2 - 2, 16, 'steel', { depth: 0, shadow: false });
      ctx.fillStyle = '#9aa3ab'; ctx.fillRect(x1 - 3, lvl + d1 - 52, 6, 40);
      // үлкен поршеньдегі жүк (машина)
      var p = P.F1 / P.S1, F2 = p * P.S2;
      R.car(ctx, x2, lvl - d2 - 16, Math.min(w2 * 1.6, 140), '#2f6fd1', 0);
      R.force(ctx, x1, lvl + d1 - 116, x1, lvl + d1 - 56, '#d2382b', 'F₁');
      R.force(ctx, x2 + w2 / 2 + 20, lvl - d2 - 10, x2 + w2 / 2 + 20, lvl - d2 - 10 - Math.min(150, 30 + F2 / 30), '#1d7a45', 'F₂');
      ctx.save(); ctx.strokeStyle = '#8d5a16'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x1 - w1, lvl); ctx.lineTo(x2 + w2, lvl); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'бастапқы деңгей', x2 + w2 / 2 + 70, lvl, { size: 10 });
      R.tag(ctx, 'S₁', x1, base + 14, { size: 11 }); R.tag(ctx, 'S₂', x2, base + 14, { size: 11 });
      R.tag(ctx, 'p = F₁/S₁ = F₂/S₂', W * 0.16, 22, { size: 12, mono: true });
      R.tag(ctx, 'F₂/F₁ = S₂/S₁ = ' + api.fmt(P.S2 / P.S1, 1), W * 0.16, 48, { size: 12, mono: true, color: '#0b6b78' });
    },

  });
})();

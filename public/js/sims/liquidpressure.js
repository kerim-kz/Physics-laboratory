/* Сұйықтың қысымы: p = p₀ + ρgh. Манометрдің датчигін тінтуірмен кез келген тереңдікке жылжыт. */
(function () {
  var g = 9.8, P0 = 101.3; // кПа
  var LIQ = { water: ['Су', 1000, 'rgba(70,150,220,.45)'], salt: ['Теңіз суы', 1030, 'rgba(40,140,170,.5)'], oil: ['Керосин', 800, 'rgba(230,200,90,.45)'], hg: ['Сынап', 13600, 'rgba(170,175,185,.85)'] };
  Sim.create({
    aspect: 0.62, static: true, resetLabel: false,
    tools: ['ruler'],
    scale: function (api) { return api._sc || null; },
    hint: 'Манометрдің датчигін (қызыл шеңбер) тінтуірмен сүйрет.',
    controls: [
      { type: 'select', key: 'liq', label: 'Сұйық', value: 'water', options: Object.keys(LIQ).map(function (k) { return [k, LIQ[k][0] + ' (ρ = ' + LIQ[k][1] + ' кг/м³)']; }) },
      { type: 'check', key: 'atm', label: 'Атмосфералық қысымды қосу', value: false },
    ],
    readouts: [
      { key: 'h', label: 'Тереңдік h', unit: 'м' },
      { key: 'ph', label: 'Гидростатикалық қысым ρgh', unit: 'кПа' },
      { key: 'p', label: 'Датчиктегі толық қысым', unit: 'кПа' },
      { key: 'dh', label: 'Манометрдегі су деңгейлерінің айырымы', unit: 'см', digits: 1 },
    ],
    init: function (api) { api.S.px = 0.35; api.S.depth = 0.6; api.S.drag = false; },
    pointer: {
      down: function (api, p) { var S = api.S; S.drag = Math.hypot(p.x - S.sx, p.y - S.sy) < 26; },
      move: function (api, p, down) {
        var S = api.S;
        if (!down || !S.drag) return;
        S.px = Math.max(0.05, Math.min(0.95, (p.x - S.tx) / S.tw));
        S.depth = Math.max(0, Math.min(1, (p.y - S.ty) / S.th));
        api.draw();
      },
      up: function (api) { api.S.drag = false; },
    },
    step: function () {},
    read: function (api) {
      var S = api.S, P = api.P, rho = LIQ[P.liq][1], h = S.depth * 2; // ыдыс тереңдігі 2 м
      var ph = rho * g * h / 1000;
      return { h: h, ph: ph, p: ph + (P.atm ? P0 : 0), dh: rho * h / 1000 * 100 / 1 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, L = LIQ[P.liq];
      var tx = 40, ty = 70, tw = W * 0.52, th = H - 120;
      S.tx = tx; S.ty = ty; S.tw = tw; S.th = th;
      api._sc = { px: th / 2, unit: 'м' };
      // ыдыс
      ctx.fillStyle = L[2]; ctx.fillRect(tx, ty, tw, th);
      for (var k = 1; k < 8; k++) { ctx.fillStyle = 'rgba(0,40,90,' + (0.03 * k / (P.liq === 'hg' ? 2 : 1)) + ')'; ctx.fillRect(tx, ty + th * k / 8, tw, th / 8); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(tx, ty - 30); ctx.lineTo(tx, ty + th); ctx.lineTo(tx + tw, ty + th); ctx.lineTo(tx + tw, ty - 30); ctx.stroke();
      for (var m = 0; m <= 2; m += 0.25) {
        var yy = ty + m / 2 * th;
        D.line(ctx, tx - 8, yy, tx, yy, C.muted, 1);
        if (m % 0.5 === 0) D.text(ctx, api.fmt(m, 1) + ' м', tx - 10, yy + 4, { size: 10, align: 'right', mono: true, color: C.muted });
      }
      // датчик
      var sx = tx + S.px * tw, sy = ty + S.depth * th;
      S.sx = sx; S.sy = sy;
      D.line(ctx, sx, sy, sx, ty - 20, C.ink, 1.5);
      D.line(ctx, sx, ty - 20, W * 0.66, ty - 20, C.ink, 1.5);
      D.circle(ctx, sx, sy, 11, C.red, C.ink, 1.5);
      D.line(ctx, tx, sy, sx - 12, sy, C.red, 1, [4, 4]);
      // U-тәрізді манометр
      var ph = L[1] * g * S.depth * 2 / 1000; // кПа
      var r = { ph: ph }, dhPx = Math.min(th * 0.8, ph / 9.8 * (th / 2) * 0.5);
      var mx = W * 0.72, mw = 60, base = ty + th, colTop = ty - 10, mid = (colTop + base) / 2 + 40;
      ctx.fillStyle = 'rgba(70,150,220,.55)';
      ctx.fillRect(mx - 8, mid + dhPx / 2, 16, base - mid - dhPx / 2);
      ctx.fillRect(mx + mw - 8, mid - dhPx / 2, 16, base - mid + dhPx / 2);
      ctx.fillRect(mx - 8, base - 12, mw + 16, 12);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.strokeRect(mx - 8, colTop, 16, base - colTop); ctx.strokeRect(mx + mw - 8, colTop, 16, base - colTop);
      D.line(ctx, W * 0.66, ty - 20, mx, ty - 20, C.ink, 1.5); D.line(ctx, mx, ty - 20, mx, colTop, C.ink, 1.5);
      D.line(ctx, mx + 12, mid + dhPx / 2, mx + mw - 12, mid + dhPx / 2, C.accent, 1, [3, 3]);
      D.line(ctx, mx + mw + 12, mid - dhPx / 2, mx + mw + 12, mid + dhPx / 2, C.accent, 2);
      D.text(ctx, 'Δh', mx + mw + 18, mid + 4, { size: 12, weight: '600', color: C.accent });
      D.text(ctx, 'Манометр (сулы)', mx + mw / 2, base + 22, { size: 11, align: 'center', color: C.muted });
      D.text(ctx, L[0] + ': p = ρgh = ' + api.fmt(r.ph, 2) + ' кПа', tx, ty - 40, { size: 13, weight: '600' });
      D.text(ctx, 'Датчикті көлденең жылжытсаң, қысым өзгере ме?', tx, H - 14, { size: 11, color: C.muted });
    },
  });
})();

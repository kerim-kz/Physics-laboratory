/* Жартылай өткізгіш диод: p–n ауысуы. Тура қосылуда негізгі тасымалдаушылар (саңылаулар мен электрондар) ауысу арқылы өтеді, ток үлкен; кері қосылуда жабу қабаты кеңейіп, ток өте аз. Вольт-амперлік сипаттама. */
(function () {
  var R = window.Real, Is = 1e-9, nVt = 0.05;
  function cur(U) { return Is * (Math.exp(Math.min(U, 0.9) / nVt) - 1); } // А
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, keepRunning: true, autoplay: true,
    hint: 'Кернеуді теріс мәннен оңға қарай өзгерт. Жабу қабатының ені мен тізбектегі ток қалай өзгереді?',
    controls: [
      { type: 'range', key: 'U', label: 'Диодқа берілген кернеу U', min: -5, max: 0.85, step: 0.05, value: 0.7, unit: 'В', digits: 2, live: true },
    ],
    readouts: [
      { key: 'I', label: 'Ток I', unit: 'мА', digits: 3 },
      { key: 'mode', label: 'Қосылу', text: true },
      { key: 'w', label: 'Жабу қабатының ені (салыстырмалы)', digits: 2 },
    ],
    init: function (api) {
      var S = api.S, rnd = R.rng(3); S.t = 0; S.h = []; S.e = [];
      for (var i = 0; i < 46; i++) { S.h.push({ x: rnd() * 0.5, y: rnd() }); S.e.push({ x: 0.5 + rnd() * 0.5, y: rnd() }); }
    },
    step: function (api, dt) {
      var S = api.S, U = api.P.U, I = cur(U), w = width(U), v = Math.min(0.5, Math.log10(1 + I * 1e6) * 0.07);
      S.t += dt;
      // саңылаулар оңға, электрондар солға (тура қосылу); ауысу арқылы өткенде рекомбинацияланады
      S.h.forEach(function (p) { p.x += (v - (I > 1e-6 ? 0 : 0)) * dt + (Math.random() - 0.5) * 0.01; p.y += (Math.random() - 0.5) * 0.02; if (p.x > 0.5 + (v > 0.02 ? 0.05 : -w / 2)) { p.x = v > 0.02 ? 0.0 : 0.5 - w / 2 - 0.005; } if (p.x < 0) p.x = 0.001; p.y = Math.max(0.02, Math.min(0.98, p.y)); });
      S.e.forEach(function (p) { p.x -= v * dt - (Math.random() - 0.5) * 0.01; p.y += (Math.random() - 0.5) * 0.02; if (p.x < 0.5 - (v > 0.02 ? 0.05 : -w / 2)) { p.x = v > 0.02 ? 1.0 : 0.5 + w / 2 + 0.005; } if (p.x > 1) p.x = 0.999; p.y = Math.max(0.02, Math.min(0.98, p.y)); });
    },
    read: function (api) { var U = api.P.U; return { I: cur(U) * 1000, mode: U > 0.05 ? 'тура (өткізу бағыты)' : U < -0.05 ? 'кері (жабу бағыты)' : 'кернеусіз', w: width(U) / width(0) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, U = P.U, I = cur(U), w = width(U), wide = W > 640, dark = R.isDark();
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      // кристалл
      var cx = wide ? 40 : 20, cw = wide ? W * 0.5 : W - 40, cy = wide ? H * 0.14 : 30, ch = wide ? H * 0.46 : H * 0.28;
      ctx.fillStyle = 'rgba(232,170,160,.9)'; ctx.fillRect(cx, cy, cw / 2, ch);
      ctx.fillStyle = 'rgba(165,195,235,.9)'; ctx.fillRect(cx + cw / 2, cy, cw / 2, ch);
      ctx.fillStyle = 'rgba(245,240,225,.95)'; ctx.fillRect(cx + cw * (0.5 - w / 2), cy, cw * w, ch);
      ctx.strokeStyle = 'rgba(60,60,60,.7)'; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, cw, ch);
      R.txt(ctx, 'p-аймақ', cx + cw * 0.12, cy - 10, { size: 11, weight: '700', color: '#9b2a1f' }); R.txt(ctx, 'n-аймақ', cx + cw * 0.88, cy - 10, { size: 11, weight: '700', color: '#1f4f9b' });
      R.txt(ctx, 'жабу қабаты', cx + cw / 2, cy + ch + 12, { size: 10, color: dark ? '#ddd' : '#333' });
      // иондар (жабу қабатында): p жағында теріс, n жағында оң
      var ni = Math.max(1, Math.round(w * 30));
      for (var k = 0; k < ni * 3; k++) { var yy = cy + ((k % 6) + 0.5) / 6 * ch, side = k % 2, xx = cx + cw * (0.5 + (side ? 1 : -1) * (Math.floor(k / 6) + 0.5) / ni * w / 2 * 0.9); if (Math.abs(xx - cx - cw / 2) > cw * w / 2) continue; R.txt(ctx, side ? '⊕' : '⊖', xx, yy, { size: 11, color: side ? '#1f4f9b' : '#9b2a1f' }); }
      // тасымалдаушылар
      S.h.forEach(function (p) { var x = cx + p.x * cw, y = cy + 6 + p.y * (ch - 12); ctx.strokeStyle = '#b4342a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.stroke(); });
      S.e.forEach(function (p) { var x = cx + p.x * cw, y = cy + 6 + p.y * (ch - 12); ctx.fillStyle = '#1f5fd1'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); });
      // тізбек: батарея және шам
      var by = cy + ch + 50;
      R.wire(ctx, [[cx, cy + ch / 2], [cx - 12, cy + ch / 2], [cx - 12, by], [cx + cw * 0.3, by]], { color: U >= 0 ? '#c0392b' : '#2b2f33' });
      R.wire(ctx, [[cx + cw, cy + ch / 2], [cx + cw + 12, cy + ch / 2], [cx + cw + 12, by], [cx + cw * 0.7, by]], { color: U >= 0 ? '#2b2f33' : '#c0392b' });
      ctx.save(); if (U >= 0) { ctx.translate(cx + cw / 2, by); ctx.rotate(Math.PI); ctx.translate(-(cx + cw / 2), -by); }
      R.battery(ctx, cx + cw * 0.3, by - 13, cw * 0.4, 26, { label: ' ' }); ctx.restore();
      R.txt(ctx, Math.abs(U).toFixed(2).replace('.', ',') + ' В', cx + cw * (U >= 0 ? 0.556 : 0.444), by, { size: 12, color: '#f1f1f1' });
      R.tag(ctx, U > 0.05 ? 'ТУРА ҚОСЫЛУ: «+» p-аймаққа' : U < -0.05 ? 'КЕРІ ҚОСЫЛУ: «+» n-аймаққа' : 'Сыртқы кернеу жоқ', cx + cw / 2, by + 30, { size: 11, color: U > 0.05 ? '#0b8a7a' : '#b4342a' });
      // ВАС
      var gx = wide ? W * 0.62 : 52, gy = wide ? 30 : by + 62, gw = wide ? W * 0.34 : W - 70, gh = wide ? H * 0.74 : H - by - 110;
      ctx.save(); R.rr(ctx, gx - 46, gy - 18, gw + 58, gh + 50, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var pts = []; for (var u = -5; u <= 0.85; u += 0.01) pts.push([u, cur(u) * 1000]);
      var imax = cur(0.85) * 1000 * 1.05;
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: -5, xmax: 1, ymin: -imax * 0.08, ymax: imax, xlabel: 'U, В', ylabel: 'I, мА', series: [{ pts: pts, color: '#d2382b', width: 2.5 }], marker: [U, I * 1000] });
      R.tag(ctx, 'кері ток ≈ 0', o.X(-3), o.Y(0) - 14, { size: 9.5 });
      void o;
    },
  });
  function width(U) { return Math.max(0.03, 0.12 * Math.sqrt(Math.max(0.02, 0.75 - U) / 0.75)); }
})();

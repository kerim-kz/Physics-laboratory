/* №7 зертханалық жұмыс: электр тогының жұмысы мен қуаты. Тұрмыстық құралдар, электр санауыш, энергия құны. */
(function () {
  var R = window.Real;
  var DEV = { b40: ['Қыздыру шамы 40 Вт', 40], b100: ['Қыздыру шамы 100 Вт', 100], led: ['Жарықдиодты шам 10 Вт', 10], kettle: ['Электр шәйнек 2000 Вт', 2000], iron: ['Үтік 1000 Вт', 1000], tv: ['Теледидар 120 Вт', 120], fridge: ['Тоңазытқыш 150 Вт', 150] };
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Құралды таңда, «Бастау» бас: санауыш энергияны есептейді. 1 с экранда = 10 мин.',
    controls: [
      { type: 'select', key: 'dev', label: 'Тұрмыстық құрал', value: 'b100', options: Object.keys(DEV).map(function (k) { return [k, DEV[k][0]]; }) },
      { type: 'range', key: 'tariff', label: 'Тариф', min: 15, max: 40, step: 1, value: 25, unit: '₸/кВт·сағ', digits: 0 },
    ],
    readouts: [
      { key: 'U', label: 'Кернеу U', unit: 'В', digits: 0 },
      { key: 'I', label: 'Ток күші I = P / U', unit: 'А', digits: 2 },
      { key: 'P', label: 'Қуат P = UI', unit: 'Вт', digits: 0 },
      { key: 't', label: 'Жұмыс уақыты', unit: 'сағ', digits: 2 },
      { key: 'A', label: 'Жұмыс A = Pt', unit: 'кВт·сағ', digits: 3 },
      { key: 'cost', label: 'Құны', unit: '₸', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt / 6; if (api.S.t > 24) return false; }, // сағат
    read: function (api) { var P = DEV[api.P.dev][1], t = api.S.t, A = P * t / 1000; return { U: 220, I: P / 220, P: P, t: t, A: A, cost: A * api.P.tariff }; },
    draw: function (api, ctx, W, H) {
      var Pw = DEV[api.P.dev][1], k = api.P.dev, S = api.S, table = H * 0.86;
      R.scene(ctx, W, H, 'lab', { table: table, tiles: false });
      // розетка мен сым
      var sx = W * 0.08, sy = H * 0.45;
      ctx.fillStyle = '#f3f3ef'; R.rr(ctx, sx - 26, sy - 26, 52, 52, 8); ctx.fill(); ctx.strokeStyle = '#bbb'; ctx.stroke();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(sx - 9, sy, 4, 0, 7); ctx.arc(sx + 9, sy, 4, 0, 7); ctx.fill();
      R.wire(ctx, [[sx, sy + 26], [sx, table - 10], [W * 0.38, table - 10]], { color: '#f2f2f2', w: 5 });
      // құрал
      var dx = W * 0.42;
      if (k[0] === 'b' || k === 'led') R.bulb(ctx, dx, table - 110, 40, k === 'led' ? 0.9 : Pw / 100);
      else if (k === 'kettle') { R.cylinder(ctx, dx - 50, table - 140, 100, 130, 'steel', {}); ctx.fillStyle = '#222'; ctx.fillRect(dx + 46, table - 120, 20, 70); }
      else if (k === 'iron') { ctx.fillStyle = '#c8382c'; ctx.beginPath(); ctx.moveTo(dx - 70, table - 10); ctx.lineTo(dx + 70, table - 10); ctx.quadraticCurveTo(dx + 70, table - 70, dx - 20, table - 70); ctx.closePath(); ctx.fill(); }
      else if (k === 'tv') { ctx.fillStyle = '#16181b'; R.rr(ctx, dx - 110, table - 170, 220, 130, 6); ctx.fill(); ctx.fillStyle = '#2f6fd1'; ctx.fillRect(dx - 100, table - 160, 200, 110); ctx.fillStyle = '#333'; ctx.fillRect(dx - 10, table - 40, 20, 30); }
      else { R.block(ctx, dx - 60, table - 230, 120, 220, { c: '#eef1f3', t: 'plain', gloss: 0.6 }, { depth: 16 }); ctx.fillStyle = '#9aa3ab'; ctx.fillRect(dx + 40, table - 200, 6, 60); ctx.fillRect(dx + 40, table - 120, 6, 60); }
      // электр санауыш
      var mx = W * 0.78, my = H * 0.18;
      ctx.fillStyle = '#e8e6df'; R.rr(ctx, mx - 90, my, 180, 220, 10); ctx.fill(); ctx.strokeStyle = '#999'; ctx.stroke();
      R.txt(ctx, 'Электр санауыш', mx, my + 18, { size: 11, color: '#333' });
      var kwh = Pw * S.t / 1000;
      R.lcd(ctx, mx - 70, my + 34, 140, 34, (Math.round(kwh * 1000) / 1000).toFixed(3).replace('.', ',') + ' кВт·сағ', { size: 13 });
      // дискі
      ctx.save(); ctx.translate(mx, my + 120); ctx.scale(1, 0.3); ctx.rotate(S.t * Pw * 0.05);
      ctx.fillStyle = '#c9ced3'; ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); ctx.fill(); ctx.fillStyle = '#c62f22'; ctx.fillRect(40, -6, 10, 12); ctx.restore();
      R.txt(ctx, '220 В · 50 Гц', mx, my + 170, { size: 10, color: '#555' });
      R.meter(ctx, mx, my + 300, 40, Pw / 220, 10, { letter: 'A', step: 2 });
    },
  });
})();

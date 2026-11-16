/* Сұйықтың қысымы: p = p₀ + ρgh. Манометрдің датчигін тінтуірмен кез келген тереңдікке жылжыт. */
(function () {
  var R = window.Real;
  var g = 9.8, P0 = 101.3; // кПа
  var LIQ = { water: ['Су', 1000, 'rgba(70,150,220,.45)'], salt: ['Теңіз суы', 1030, 'rgba(40,140,170,.5)'], oil: ['Керосин', 800, 'rgba(230,200,90,.45)'], hg: ['Сынап', 13600, 'rgba(170,175,185,.85)'] };
  Sim.create({
    grid: false,
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
      var S = api.S, P = api.P, L = LIQ[P.liq];
      var tx = 40, ty = 70, tw = W * 0.52, th = H - 120;
      S.tx = tx; S.ty = ty; S.tw = tw; S.th = th;
      api._sc = { px: th / 2, unit: 'м' };
      R.scene(ctx, W, H, 'lab', { table: ty + th + 4 });
      // шыны ыдыс және сұйық (тереңдеген сайын қоюланады)
      var liq = P.liq === 'hg' ? 'mercury' : P.liq === 'oil' ? 'oil' : P.liq === 'kero' ? 'kerosene' : P.liq === 'salt' ? 'saltwater' : 'water';
      R.vessel(ctx, tx, ty - 30, tw, th + 30, th, { liquid: liq });
      for (var k = 1; k < 8; k++) { ctx.fillStyle = 'rgba(0,40,90,' + (0.025 * k / (P.liq === 'hg' ? 2 : 1)) + ')'; ctx.fillRect(tx + 2, ty + th * k / 8, tw - 4, th / 8); }
      for (var m = 0; m <= 2; m += 0.25) {
        var yy = ty + m / 2 * th;
        ctx.strokeStyle = '#33424c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx - 8, yy); ctx.lineTo(tx, yy); ctx.stroke();
        if (m % 0.5 === 0) R.txt(ctx, api.fmt(m, 1) + ' м', tx - 12, yy, { size: 9.5, align: 'right', mono: true, color: '#33424c' });
      }
      // датчик (резеңке жарғақты қорапша) және түтік
      var sx = tx + S.px * tw, sy = ty + S.depth * th;
      S.sx = sx; S.sy = sy;
      var mx = W * 0.72, mw = 60, base = ty + th, colTop = ty - 10, mid = (colTop + base) / 2 + 40;
      R.wire(ctx, [[sx, sy], [sx, ty - 20], [mx, ty - 20], [mx, colTop]], { color: '#3a3f45', w: 3 });
      R.sphere(ctx, sx, sy, 11, '#c62f22');
      ctx.save(); ctx.strokeStyle = '#c62f22'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(tx, sy); ctx.lineTo(sx - 12, sy); ctx.stroke(); ctx.restore();
      // U-тәрізді сулы манометр (шыны)
      var ph = L[1] * g * S.depth * 2 / 1000; // кПа
      var dhPx = Math.min(th * 0.8, ph / 9.8 * (th / 2) * 0.5);
      ctx.fillStyle = 'rgba(70,150,220,.65)';
      ctx.fillRect(mx - 8, mid + dhPx / 2, 16, base - mid - dhPx / 2);
      ctx.fillRect(mx + mw - 8, mid - dhPx / 2, 16, base - mid + dhPx / 2);
      ctx.fillRect(mx - 8, base - 12, mw + 16, 12);
      ctx.strokeStyle = 'rgba(80,120,140,.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(mx - 8, colTop, 16, base - colTop); ctx.strokeRect(mx + mw - 8, colTop, 16, base - colTop);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(mx - 5, colTop + 4, 2, base - colTop - 8); ctx.fillRect(mx + mw - 5, colTop + 4, 2, base - colTop - 8);
      ctx.save(); ctx.strokeStyle = '#0b6b78'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(mx + 12, mid + dhPx / 2); ctx.lineTo(mx + mw - 12, mid + dhPx / 2); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = '#0b6b78'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + mw + 12, mid - dhPx / 2); ctx.lineTo(mx + mw + 12, mid + dhPx / 2); ctx.stroke();
      R.tag(ctx, 'Δh', mx + mw + 30, mid, { size: 11, color: '#0b6b78' });
      R.tag(ctx, 'Манометр (сулы)', mx + mw / 2, base + 16, { size: 10.5 });
      R.tag(ctx, L[0] + ': p = ρgh = ' + api.fmt(ph, 2) + ' кПа', tx + tw / 2, ty - 50, { size: 12 });
    },

  });
})();

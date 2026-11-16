/* Көлемді өлшеу: дұрыс пішінді дене (V = abc), дұрыс емес пішінді дене (мензурка: V = V₂ − V₁) және құйылу ыдысы. */
(function () {
  var R = window.Real;
  var STONES = { s1: ['Шағын тас', 18], s2: ['Орташа тас', 34], s3: ['Үлкен тас', 52], s4: ['Темір бұранда', 9] };
  Sim.create({
    aspect: 0.6, grid: false,
    hint: '«Бастау» батырмасын бас: дене суға баяу батырылады. Мензурканың бөлік құны — 2 мл.',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәсіл', value: 'beaker', options: [['block', 'Дұрыс пішінді дене (сызғышпен)'], ['beaker', 'Мензурка (су ығыстыру)'], ['overflow', 'Құйылу ыдысы']] },
      { type: 'select', key: 'stone', label: 'Дене', value: 's2', options: Object.keys(STONES).map(function (k) { return [k, STONES[k][0]]; }) },
      { type: 'range', key: 'a', label: 'Бруссок: ұзындығы a', min: 2, max: 8, step: 0.5, value: 5, unit: 'см' },
      { type: 'range', key: 'b', label: 'ені b', min: 2, max: 6, step: 0.5, value: 3, unit: 'см' },
      { type: 'range', key: 'c', label: 'биіктігі c', min: 1, max: 5, step: 0.5, value: 2, unit: 'см' },
    ],
    readouts: [
      { key: 'v1', label: 'V₁ (дене батырылғанға дейін)', unit: 'мл', digits: 0 },
      { key: 'v2', label: 'V₂ (дене батырылғаннан кейін)', unit: 'мл', digits: 0 },
      { key: 'V', label: 'Дененің көлемі', unit: 'см³', digits: 1 },
      { key: 'Vsi', label: 'ХБЖ-да', unit: 'м³', digits: 7 },
    ],
    init: function (api) { api.S.k = 0; api.S.flow = 0; },
    step: function (api, dt) {
      var S = api.S;
      if (S.k < 1) S.k = Math.min(1, S.k + dt * 0.35);
      else if (api.P.mode === 'overflow' && S.flow < 1) S.flow = Math.min(1, S.flow + dt * 0.5);
      else return false;
    },
    read: function (api) {
      var P = api.P, S = api.S;
      if (P.mode === 'block') { var V = P.a * P.b * P.c; return { v1: null, v2: null, V: V, Vsi: V * 1e-6 }; }
      var vs = STONES[P.stone][1], sub = S.k >= 1 ? vs : Math.max(0, (S.k - 0.45) / 0.55) * vs;
      if (P.mode === 'overflow') return { v1: 0, v2: Math.round(vs * S.flow), V: S.flow >= 1 ? vs : null, Vsi: S.flow >= 1 ? vs * 1e-6 : null };
      return { v1: 60, v2: Math.round(60 + sub), V: S.k >= 1 ? vs : null, Vsi: S.k >= 1 ? vs * 1e-6 : null };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.86;
      R.scene(ctx, W, H, 'lab', { table: table });
      if (P.mode === 'block') {
        var px = Math.min(W, 900) / 18, bw = P.a * px, bh = P.c * px, d = P.b * px * 0.45;
        var bx = W * 0.35 - bw / 2, by = table - 30 - bh;
        R.block(ctx, bx, by, bw, bh, 'pine', { depth: d });
        R.ruler(ctx, bx - 4, table - 26, Math.max(bw + 60, 10 * px), px, { width: 22 });
        dim(ctx, bx, by + bh + 4, bx + bw, by + bh + 4, 'a = ' + Sim.fmt(P.a, 1) + ' см', 'below');
        dim(ctx, bx - 8, by, bx - 8, by + bh, 'c = ' + Sim.fmt(P.c, 1) + ' см', 'left');
        dim(ctx, bx + bw + 4, by, bx + bw + d + 4, by - d, 'b = ' + Sim.fmt(P.b, 1) + ' см', 'right');
        R.tag(ctx, 'V = a · b · c = ' + Sim.fmt(P.a * P.b * P.c, 1) + ' см³', W * 0.72, H * 0.3, { size: 14, color: '#0b6b78' });
        return;
      }
      var vs = STONES[P.stone][1];
      if (P.mode === 'beaker') {
        var gx = W * 0.4, gw = 84, gtop = 24, gh = table - 24 - 4;
        var sub = S.k >= 1 ? vs : Math.max(0, (S.k - 0.45) / 0.55) * vs;
        var Y = R.cylinderGlass(ctx, gx, gtop, gw, gh, { max: 150, ml: 60 + sub, step: 2, big: 10 });
        stoneAt(ctx, gx + gw / 2, gtop - 60 + S.k * (Y(0) - 26 - (gtop - 60)), vs, P.stone);
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx + gw / 2, 0); ctx.lineTo(gx + gw / 2, gtop - 60 + S.k * (Y(0) - 26 - (gtop - 60)) - stoneR(vs)); ctx.stroke();
        R.tag(ctx, 'V₁ = 60 мл', gx - 50, Y(60), { size: 11 });
        if (S.k >= 1) R.tag(ctx, 'V₂ = ' + Math.round(60 + vs) + ' мл', gx + gw + 70, Y(60 + vs), { size: 11, color: '#0b6b78' });
      } else {
        // құйылу ыдысы + кіші стақан (мензурка)
        var cx = W * 0.32, cw = 120, ch = 170, ctop = table - ch;
        var lvl = ch * 0.62;
        R.vessel(ctx, cx, ctop, cw, ch, lvl, {});
        // ағызғыш түтік
        ctx.fillStyle = 'rgba(160,200,220,.8)'; ctx.fillRect(cx + cw, ctop + ch - lvl - 6, 46, 7);
        stoneAt(ctx, cx + cw / 2, ctop - 50 + S.k * (ch - 26 + 50 - stoneR(vs)), vs, P.stone);
        // ағын
        if (S.k > 0.5 && S.flow < 1) {
          ctx.strokeStyle = 'rgba(90,160,220,.75)'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(cx + cw + 46, ctop + ch - lvl - 3); ctx.quadraticCurveTo(cx + cw + 62, ctop + ch - lvl + 10, cx + cw + 64, table - 120); ctx.stroke();
        }
        var Y2 = R.cylinderGlass(ctx, cx + cw + 44, table - 210, 52, 206, { max: 60, ml: vs * S.flow, step: 1, big: 10 });
        if (S.flow >= 1) R.tag(ctx, 'Ағып шыққан су = ' + vs + ' мл', cx + cw + 160, Y2(vs) - 10, { size: 11, color: '#0b6b78' });
      }
    },
  });
  function stoneR(v) { return Math.cbrt(v) * 6.5; }
  function stoneAt(ctx, x, y, v, kind) {
    var r = stoneR(v);
    if (kind === 's4') { R.cylinder(ctx, x - r * 0.5, y - r, r, r * 2, 'steel', { shadow: false }); return; }
    ctx.save();
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 2, x, y, r * 1.2);
    g.addColorStop(0, '#bdb6aa'); g.addColorStop(1, '#5d574e');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.2); ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.8, x - r * 0.1, y - r); ctx.quadraticCurveTo(x + r, y - r * 1.05, x + r * 1.05, y - r * 0.1); ctx.quadraticCurveTo(x + r * 0.9, y + r * 0.9, x - r, y + r * 0.2); ctx.fill();
    ctx.restore();
  }
  function dim(ctx, x1, y1, x2, y2, s, where) {
    ctx.save(); ctx.strokeStyle = '#0b6b78'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    R.tag(ctx, s, where === 'left' ? mx - 46 : where === 'right' ? mx + 50 : mx, where === 'below' ? my + 30 : my, { size: 10.5, color: '#0b6b78' });
  }
})();

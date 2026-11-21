/* Ньютонның үшінші заңы: арасында сығылған серіппесі бар екі арбаша. Жіпті күйдіргенде серіппе екеуін тең күштермен итереді: F₁₂ = −F₂₁. Жылдамдықтар массаларға кері пропорционал. */
(function () {
  var R = window.Real;
  var K = 400, X0 = 0.04; // серіппе қатаңдығы (Н/м) және бастапқы сығылуы (м)
  Sim.create({
    aspect: 0.56, grid: false,
    hint: '«Бастау» — жіп күйіп, серіппе тұзатылады. Күш датчиктерінің көрсетулерін салыстыр. Арбашалардың массалары әртүрлі болса, қайсысы жылдамырақ қозғалады?',
    controls: [
      { type: 'range', key: 'm1', label: 'Сол арбашаның массасы m₁', min: 0.5, max: 2, step: 0.25, value: 0.5, unit: 'кг', digits: 2 },
      { type: 'range', key: 'm2', label: 'Оң арбашаның массасы m₂', min: 0.5, max: 2, step: 0.25, value: 1, unit: 'кг', digits: 2 },
    ],
    readouts: [
      { key: 'F1', label: 'Сол датчик: F₂₁ (2-ден 1-ге)', unit: 'Н', digits: 2 },
      { key: 'F2', label: 'Оң датчик: F₁₂ (1-ден 2-ге)', unit: 'Н', digits: 2 },
      { key: 'v1', label: 'Сол арбашаның жылдамдығы v₁', unit: 'м/с', digits: 3 },
      { key: 'v2', label: 'Оң арбашаның жылдамдығы v₂', unit: 'м/с', digits: 3 },
      { key: 'rv', label: 'v₁ / v₂', digits: 2 },
      { key: 'rm', label: 'm₂ / m₁', digits: 2 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.x1 = 0; S.x2 = 0; S.v1 = 0; S.v2 = 0; S.F = K * X0; S.burn = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, n = 20;
      if (S.burn < 0.4) { S.burn += dt; S.t += dt; return; }
      for (var i = 0; i < n; i++) {
        var h = dt * 0.6 / n, comp = Math.max(0, X0 - (S.x2 - S.x1)); // серіппе ұзарғанда күш азаяды
        S.F = K * comp;
        S.v1 -= S.F / P.m1 * h; S.v2 += S.F / P.m2 * h;
        S.x1 += S.v1 * h; S.x2 += S.v2 * h;
      }
      S.t += dt;
      if (S.x2 > 0.55 || S.x1 < -0.55 || S.t > 8) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, F = S.burn < 0.4 ? K * X0 : S.F;
      return { F1: F, F2: F, v1: Math.abs(S.v1), v2: Math.abs(S.v2), rv: S.v2 ? Math.abs(S.v1 / S.v2) : null, rm: P.m2 / P.m1 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.64;
      R.scene(ctx, W, H, 'lab', { table: table });
      R.block(ctx, W * 0.03, table - 14, W * 0.94, 14, 'aluminum', { depth: 6 });
      var ppm = W * 0.5, cxm = W / 2, cw = Math.min(120, W * 0.16), ch = cw * 0.3, base = table - 14 - 12;
      var comp = S.burn < 0.4 ? X0 : Math.max(0, X0 - (S.x2 - S.x1));
      var Lc = 30, Ln = Lc + X0 * ppm; // серіппенің сығылған және еркін ұзындығы (px)
      var x1r = cxm - Lc / 2 - 12 + S.x1 * ppm, x2l = cxm + Lc / 2 + 12 + S.x2 * ppm;
      function cart(xl, m, color, label) {
        R.block(ctx, xl, base - ch, cw, ch, color, { depth: 7 });
        [xl + 18, xl + cw - 18].forEach(function (wx) { R.wheel(ctx, wx, base + 5, 7, (xl - cxm) / 7); });
        var nd = Math.round((m - 0.5) / 0.25);
        for (var i = 0; i < nd; i++) R.cylinder(ctx, xl + cw / 2 - 20, base - ch - 8 - i * 8, 40, 7, 'brass', { shadow: false, ry: 3 });
        R.txt(ctx, label + ' = ' + Sim.fmt(m, 2) + ' кг', xl + cw / 2, base - ch / 2, { size: 10, color: '#fff' });
      }
      var l1 = x1r - cw, l2 = x2l;
      cart(l1, P.m1, 'plasticBlue', 'm₁'); cart(l2, P.m2, 'plasticRed', 'm₂');
      // серіппе және датчиктер
      var sy = base - ch / 2, sx1 = x1r + 12, sx2 = x2l - 12;
      R.block(ctx, x1r - 2, sy - 9, 14, 18, '#e7b92f', { depth: 3, shadow: false });
      R.block(ctx, x2l - 12, sy - 9, 14, 18, '#e7b92f', { depth: 3, shadow: false });
      R.spring(ctx, sx1, sy, comp > 0 ? sx2 : sx1 + Ln, sy, { coils: 9, r: 8, lead: 3 });
      // жіп (күйгенге дейін)
      if (S.burn < 0.4) {
        ctx.strokeStyle = '#6b4b2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(l1 + cw * 0.6, base - ch + 3); ctx.lineTo(l2 + cw * 0.4, base - ch + 3); ctx.stroke();
        if (api.running()) R.flame(ctx, cxm, base - ch + 2, 18, S.burn * 20);
      }
      var F = S.burn < 0.4 ? K * X0 : S.F, k = Math.min(5, 60 / (K * X0));
      R.lcd(ctx, l1 + cw / 2 - 34, base - ch - 52, 68, 22, Sim.fmt(F, 1).replace('.', ',') + ' Н', { size: 11 });
      R.lcd(ctx, l2 + cw / 2 - 34, base - ch - 52, 68, 22, Sim.fmt(F, 1).replace('.', ',') + ' Н', { size: 11 });
      if (F > 0.1) {
        R.force(ctx, x1r - 6, sy + ch * 0.9, x1r - 6 - F * k, sy + ch * 0.9, '#1f5fd1', 'F₂₁');
        R.force(ctx, x2l + 6, sy + ch * 0.9, x2l + 6 + F * k, sy + ch * 0.9, '#d2382b', 'F₁₂');
      }
      // жылдамдықтар
      var vs = 60;
      if (Math.abs(S.v1) > 0.01) R.force(ctx, l1 + cw / 2, base - ch - 72, l1 + cw / 2 + S.v1 * vs, base - ch - 72, '#0b6b78', 'v₁');
      if (Math.abs(S.v2) > 0.01) R.force(ctx, l2 + cw / 2, base - ch - 72, l2 + cw / 2 + S.v2 * vs, base - ch - 72, '#0b6b78', 'v₂');
      R.tag(ctx, '|F₁₂| = |F₂₁|  —  күштер тең, қарама-қарсы, әртүрлі денелерге түсірілген', W / 2, 22, { size: W < 600 ? 9.5 : 12, color: '#0b6b78' });
      if (S.burn >= 0.4 && F < 0.01 && Math.abs(S.v2) > 0) R.tag(ctx, 'm₁v₁ = ' + Sim.fmt(P.m1 * Math.abs(S.v1), 3) + ',  m₂v₂ = ' + Sim.fmt(P.m2 * Math.abs(S.v2), 3) + ' кг·м/с', W / 2, H - 22, { size: W < 600 ? 9.5 : 11.5, color: '#8a6100' });
    },
  });
})();

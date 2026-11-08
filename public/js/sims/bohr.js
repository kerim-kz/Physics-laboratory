/* Бор моделі: Eₙ = −13,6 эВ / n², hν = E_k − E_n, λ = hc/ΔE (hc ≈ 1240 эВ·нм). */
(function () {
  function E(n) { return -13.6 / (n * n); }
  var SERIES = { 1: 'Лайман (ультракүлгін)', 2: 'Бальмер', 3: 'Пашен (инфрақызыл)', 4: 'Брэкет (инфрақызыл)', 5: 'Пфунд (инфрақызыл)' };
  function rgb(nm) {
    if (nm < 380 || nm > 750) return null;
    var r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else r = 1;
    return 'rgb(' + [r, g, b].map(function (x) { return Math.round(255 * x); }).join(',') + ')';
  }
  function trans(P) { var hi = Math.max(+P.a, +P.b), lo = Math.min(+P.a, +P.b); return { hi: hi, lo: lo, dE: E(hi) - E(lo), emit: +P.a > +P.b }; }
  Sim.create({
    aspect: 0.62, autoplay: true,
    hint: 'Бастапқы деңгей жоғары болса — фотон шығарылады, төмен болса — жұтылады.',
    controls: [
      { type: 'select', key: 'a', label: 'Бастапқы деңгей', value: '3', options: [1, 2, 3, 4, 5, 6].map(function (n) { return [String(n), 'n = ' + n]; }) },
      { type: 'select', key: 'b', label: 'Соңғы деңгей', value: '2', options: [1, 2, 3, 4, 5, 6].map(function (n) { return [String(n), 'n = ' + n]; }) },
    ],
    readouts: [
      { key: 'e1', label: 'Бастапқы энергия', unit: 'эВ' },
      { key: 'e2', label: 'Соңғы энергия', unit: 'эВ' },
      { key: 'de', label: 'Фотон энергиясы hν', unit: 'эВ' },
      { key: 'lam', label: 'Толқын ұзындығы λ', unit: 'нм', digits: 1 },
      { key: 'ser', label: 'Серия' },
      { key: 'vis', label: 'Аймақ' },
    ],
    init: function (api) { api.S.t = 0; api.S.phase = 0; },
    step: function (api, dt) { var S = api.S; S.t += dt; S.phase = (S.phase + dt / 2.5) % 1; },
    read: function (api) {
      var P = api.P, tr = trans(P);
      if (tr.hi === tr.lo) return { e1: E(+P.a), e2: E(+P.b), de: 0, lam: null, ser: '—', vis: 'деңгей өзгермейді' };
      var lam = 1240 / tr.dE;
      return { e1: E(+P.a), e2: E(+P.b), de: tr.dE, lam: lam, ser: SERIES[tr.lo] || '—', vis: lam < 380 ? 'ультракүлгін' : lam > 750 ? 'инфрақызыл' : 'көрінетін жарық' };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, tr = trans(P);
      // атом (сол жақ)
      var ax = W * 0.22, ay = H / 2, k = Math.min(W * 0.2, H * 0.42) / 36;
      D.circle(ctx, ax, ay, 6, C.red);
      for (var n = 1; n <= 6; n++) {
        ctx.strokeStyle = (n === +P.a || n === +P.b) ? C.accent : C.soft; ctx.lineWidth = (n === +P.a || n === +P.b) ? 1.8 : 1;
        ctx.beginPath(); ctx.arc(ax, ay, n * n * k, 0, Math.PI * 2); ctx.stroke();
        if (n <= 4) D.text(ctx, 'n=' + n, ax + n * n * k + 3, ay - 3, { size: 9, color: C.muted, mono: true });
      }
      var ph = S.phase, from = +P.a, to = +P.b;
      var nn = ph < 0.45 ? from : ph < 0.55 ? from + (to - from) * (ph - 0.45) / 0.1 : to;
      var r = nn * nn * k, ang = S.t * 2.2 / Math.max(1, nn);
      D.circle(ctx, ax + r * Math.cos(ang), ay + r * Math.sin(ang), 5, C.blue);
      var col = tr.hi !== tr.lo ? (rgb(1240 / tr.dE) || C.purple) : C.muted;
      if (tr.hi !== tr.lo && ph > 0.5) {
        var d = (ph - 0.5) * 2 * W * 0.25, sx = ax + r * Math.cos(ang), sy = ay + r * Math.sin(ang);
        var dirx = tr.emit ? 1 : -1;
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath();
        for (var i = 0; i <= 40; i++) { var px = sx + dirx * (d - 60 + i * 1.5), py = sy - (d * 0.3) + Math.sin(i * 0.8) * 6; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.stroke();
        D.text(ctx, tr.emit ? 'фотон шығарылды' : 'фотон жұтылды', sx + dirx * d, sy - d * 0.3 - 14, { size: 11, color: C.ink, weight: '600', align: 'center' });
      }
      // энергия деңгейлерінің диаграммасы (оң жақ)
      var x0 = W * 0.55, x1 = W * 0.95, yT = 40, yB = H - 40;
      var Y = function (e) { return yT + Math.sqrt(-e / 13.6) * (yB - yT - 20); }; // шкала сызықты емес
      for (var m = 1; m <= 6; m++) {
        D.line(ctx, x0, Y(E(m)), x1, Y(E(m)), m === +P.a || m === +P.b ? C.accent : C.line, m === +P.a || m === +P.b ? 2 : 1);
        D.text(ctx, 'n=' + m + '  ' + api.fmt(E(m), 2) + ' эВ', x0 - 4, Y(E(m)) + 4, { size: 10, align: 'right', mono: true, color: C.muted });
      }
      D.line(ctx, x0, Y(0), x1, Y(0), C.muted, 1, [4, 4]);
      D.text(ctx, 'n = ∞, E = 0 (шкала сызықты емес)', x1, Y(0) - 4, { size: 10, align: 'right', color: C.muted });
      if (tr.hi !== tr.lo) D.arrow(ctx, (x0 + x1) / 2, Y(E(from)), (x0 + x1) / 2, Y(E(to)), col, 3, 'hν');
      // спектр жолағы
      var sy0 = H - 22;
      for (var l = 380; l <= 750; l += 2) { ctx.fillStyle = rgb(l); ctx.globalAlpha = 0.25; ctx.fillRect(x0 + (l - 380) / 370 * (x1 - x0), sy0, (x1 - x0) / 185 + 1, 12); }
      ctx.globalAlpha = 1;
      if (tr.hi !== tr.lo) { var lm = 1240 / tr.dE; if (lm >= 380 && lm <= 750) D.line(ctx, x0 + (lm - 380) / 370 * (x1 - x0), sy0 - 2, x0 + (lm - 380) / 370 * (x1 - x0), sy0 + 14, col, 3); }
      D.text(ctx, '380 нм', x0, sy0 - 4, { size: 9, color: C.muted }); D.text(ctx, '750 нм', x1, sy0 - 4, { size: 9, color: C.muted, align: 'right' });
    },
  });
})();

/* Толық тізбек үшін Ом заңы: I = ε/(R + r), сыртқы тізбектегі қуат P = I²R. */
(function () {
  function calc(P) {
    var I = P.eps / (P.R + P.r);
    return { I: I, U: I * P.R, Pout: I * I * P.R, Ptot: P.eps * I, eta: P.R / (P.R + P.r), Isc: P.eps / P.r };
  }

  Sim.create({
    aspect: 0.7,
    autoplay: true,
    keepRunning: true,
    hint: 'Электрондардың жылдамдығы ток күшіне пропорционал (көрнекілік үшін).',
    controls: [
      { type: 'range', key: 'eps', label: 'Ток көзінің ЭҚК-і ε', min: 1, max: 24, step: 0.5, value: 12, unit: 'В', digits: 1, live: true },
      { type: 'range', key: 'r', label: 'Ішкі кедергі r', min: 0.1, max: 5, step: 0.1, value: 1, unit: 'Ом', digits: 1, live: true },
      { type: 'range', key: 'R', label: 'Реостат кедергісі R', min: 0, max: 50, step: 0.5, value: 5, unit: 'Ом', digits: 1, live: true },
    ],
    readouts: [
      { key: 'I', label: 'Ток күші I (амперметр)', unit: 'А' },
      { key: 'U', label: 'Сыртқы кернеу U = IR (вольтметр)', unit: 'В' },
      { key: 'Pout', label: 'Пайдалы қуат P = I²R', unit: 'Вт' },
      { key: 'Ptot', label: 'Толық қуат εI', unit: 'Вт' },
      { key: 'eta', label: 'ПӘК η = R/(R + r)', unit: '%', digits: 1 },
      { key: 'Isc', label: 'Қысқа тұйықталу тогы ε/r', unit: 'А' },
    ],
    init: function (api) { api.S.phase = 0; },
    onLive: function () {},
    step: function (api, dt) { var c = calc(api.P); api.S.phase = (api.S.phase + dt * c.I * 18) % 1000; },
    read: function (api) { var c = calc(api.P); c.eta *= 100; return c; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, C = api.C, D = api.D, c = calc(P);
      var x1 = 130, x2 = Math.min(W - 110, 560), y1 = 50, y2 = Math.min(H * 0.5, 230);
      // сымдар
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      // ток көзі (сол жақ)
      var by = (y1 + y2) / 2;
      ctx.fillStyle = C.bg; ctx.fillRect(x1 - 12, by - 22, 24, 44);
      D.line(ctx, x1 - 14, by - 8, x1 + 14, by - 8, C.ink, 3);
      D.line(ctx, x1 - 8, by + 8, x1 + 8, by + 8, C.ink, 5);
      D.text(ctx, 'ε = ' + api.fmt(P.eps, 1) + ' В', x1 - 24, by - 6, { size: 12, weight: '600', align: 'right' });
      D.text(ctx, 'r = ' + api.fmt(P.r, 1) + ' Ом', x1 - 24, by + 14, { size: 12, color: C.muted, align: 'right' });
      // реостат (оң жақ)
      var ry = (y1 + y2) / 2;
      ctx.fillStyle = C.bg; ctx.fillRect(x2 - 14, ry - 36, 28, 72);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x2 - 12, ry - 34, 24, 68);
      var slide = ry + 34 - Math.min(1, P.R / 50) * 68;
      D.arrow(ctx, x2 + 34, slide, x2 + 13, slide, C.orange, 2);
      D.text(ctx, 'R = ' + api.fmt(P.R, 1) + ' Ом', x2 - 110, ry + 4, { size: 12, weight: '600' });
      // амперметр (жоғарғы сым)
      var ax = (x1 + x2) / 2;
      D.circle(ctx, ax, y1, 17, C.bg, C.ink, 2);
      D.text(ctx, 'A', ax, y1 + 5, { size: 14, align: 'center', weight: '700' });
      D.text(ctx, api.fmt(c.I, 2) + ' А', ax, y1 - 24, { size: 13, align: 'center', weight: '600', color: C.accent, mono: true });
      // вольтметр (реостатқа параллель)
      var vx = x2 + 70;
      D.line(ctx, x2, y1 + 18, vx, y1 + 18, C.ink, 1.5); D.line(ctx, x2, y2 - 18, vx, y2 - 18, C.ink, 1.5);
      D.line(ctx, vx, y1 + 18, vx, y2 - 18, C.ink, 1.5);
      D.circle(ctx, vx, ry, 17, C.bg, C.ink, 2);
      D.text(ctx, 'V', vx, ry + 5, { size: 14, align: 'center', weight: '700' });
      D.text(ctx, api.fmt(c.U, 2) + ' В', vx + 24, ry + 5, { size: 13, weight: '600', color: C.accent, mono: true });
      // электрондар (сағат тіліне қарсы: электрондар токқа қарсы қозғалады)
      var per = 2 * (x2 - x1) + 2 * (y2 - y1), n = 26;
      for (var i = 0; i < n; i++) {
        var d = ((i / n) * per + S.phase * 6) % per, ex, ey;
        if (d < x2 - x1) { ex = x2 - d; ey = y1; }
        else if (d < x2 - x1 + y2 - y1) { ex = x1; ey = y1 + (d - (x2 - x1)); }
        else if (d < 2 * (x2 - x1) + y2 - y1) { ex = x1 + (d - (x2 - x1) - (y2 - y1)); ey = y2; }
        else { ex = x2; ey = y2 - (d - 2 * (x2 - x1) - (y2 - y1)); }
        D.circle(ctx, ex, ey, 3, C.blue);
      }
      // P(R) графигі
      var pts = [], maxP = P.eps * P.eps / (4 * P.r);
      for (var R = 0; R <= 50.001; R += 0.25) { var I = P.eps / (R + P.r); pts.push([R, I * I * R]); }
      D.plot(ctx, { x: 60, y: y2 + 50, w: W - 100, h: H - y2 - 90 }, { xmin: 0, xmax: 50, ymin: 0, ymax: maxP * 1.15, xlabel: 'R, Ом', ylabel: 'P(R), Вт',
        series: [{ pts: pts, color: C.orange }], marker: [P.R, c.Pout] });
      D.text(ctx, 'Ең үлкен қуат R = r = ' + api.fmt(P.r, 1) + ' Ом кезінде', W - 40, y2 + 44, { size: 11, align: 'right', color: C.muted });
    },
  });
})();

/* Еріксіз тербелістер және резонанс: x'' + 2βx' + ω₀²x = (ω₀² A₀) cos ωt (тірек тербеледі). */
(function () {
  function amp(P, f) {
    var w0 = Math.sqrt(P.k / P.m), w = 2 * Math.PI * f, b = P.b;
    return P.A0 * w0 * w0 / Math.sqrt(Math.pow(w0 * w0 - w * w, 2) + 4 * b * b * w * w);
  }
  Sim.create({
    aspect: 0.62, autoplay: true, keepRunning: true, substeps: 20,
    tools: ['stopwatch'],
    hint: 'Мәжбүрлеуші жиілікті жүктің меншікті жиілігіне жақындат.',
    controls: [
      { type: 'range', key: 'f', label: 'Мәжбүрлеуші күштің жиілігі ν', min: 0.1, max: 2, step: 0.02, value: 0.5, unit: 'Гц', digits: 2, live: true },
      { type: 'range', key: 'm', label: 'Жүктің массасы m', min: 0.2, max: 2, step: 0.1, value: 1, unit: 'кг', digits: 1 },
      { type: 'range', key: 'k', label: 'Серіппе қатаңдығы k', min: 5, max: 60, step: 1, value: 20, unit: 'Н/м', digits: 0 },
      { type: 'range', key: 'b', label: 'Өшу коэффициенті β', min: 0.05, max: 2, step: 0.05, value: 0.2, unit: '1/с', digits: 2, live: true },
    ],
    readouts: [
      { key: 'f0', label: 'Меншікті жиілік ν₀ = √(k/m)/2π', unit: 'Гц', digits: 3 },
      { key: 'f', label: 'Мәжбүрлеуші жиілік ν', unit: 'Гц', digits: 2 },
      { key: 'A', label: 'Орныққан амплитуда (теория)', unit: 'см', digits: 1 },
      { key: 'Am', label: 'Өлшенген амплитуда', unit: 'см', digits: 1 },
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.x = 0; S.v = 0; S.t = 0; S.ph = 0; S.max = 0; S.win = 0; S.Am = null; S.trail = []; S.P = { A0: 0.02 }; },
    onLive: function (api) { api.S.max = 0; api.S.win = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, A0 = 0.02, w0s = P.k / P.m;
      S.ph += 2 * Math.PI * P.f * dt; S.t += dt;
      var drive = A0 * Math.cos(S.ph);
      var a = -2 * P.b * S.v - w0s * (S.x - drive);
      S.v += a * dt; S.x += S.v * dt;
      S.max = Math.max(S.max, Math.abs(S.x)); S.win += dt;
      if (S.win > Math.max(2, 2 / P.f)) { S.Am = S.max; S.max = 0; S.win = 0; }
      if (!S.lt || S.t - S.lt > 0.03) { S.lt = S.t; S.trail.push([S.t, S.x * 100]); if (S.trail.length > 400) S.trail.shift(); }
    },
    read: function (api) {
      var P = api.P, p = { k: P.k, m: P.m, b: P.b, A0: 0.02 };
      return { f0: Math.sqrt(P.k / P.m) / (2 * Math.PI), f: P.f, A: amp(p, P.f) * 100, Am: api.S.Am == null ? null : api.S.Am * 100, t: api.S.t };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, p = { k: P.k, m: P.m, b: P.b, A0: 0.02 };
      var cx = W * 0.16, top = 40, drive = 0.02 * Math.cos(S.ph), scale = 900;
      var sy = top + drive * scale * 0.6, by = H * 0.45 + S.x * scale * 0.6;
      // тербелетін тірек (эксцентрик)
      ctx.fillStyle = C.line; ctx.fillRect(cx - 50, sy - 10, 100, 10);
      D.circle(ctx, cx + 70, top - 10, 14, C.bg2, C.ink, 1.5);
      D.line(ctx, cx + 70, top - 10, cx + 70 + 14 * Math.cos(S.ph), top - 10 + 14 * Math.sin(S.ph), C.red, 2);
      // серіппе
      ctx.save(); ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, sy);
      var n = 16; for (var i = 1; i < n; i++) ctx.lineTo(cx + (i % 2 ? 10 : -10), sy + (by - 22 - sy) * i / n);
      ctx.lineTo(cx, by - 22); ctx.stroke(); ctx.restore();
      var gb = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0); gb.addColorStop(0, '#d4a04f'); gb.addColorStop(1, '#8a5d18');
      ctx.fillStyle = gb; ctx.fillRect(cx - 22, by - 22, 44, 44);
      D.text(ctx, api.fmt(P.m, 1) + ' кг', cx, by + 4, { size: 11, align: 'center', color: '#fff', weight: '600' });
      // x(t)
      var span = 12, t0 = Math.max(0, S.t - span), A = amp(p, P.f) * 100, ym = Math.max(3, A * 1.3);
      D.plot(ctx, { x: W * 0.36, y: 30, w: W * 0.6, h: H * 0.36 }, { xmin: t0, xmax: t0 + span, ymin: -ym, ymax: ym, xlabel: 't, с', ylabel: 'x, см', series: [{ pts: S.trail, color: C.accent }] });
      // резонанс қисығы
      var pts = []; for (var f = 0.05; f <= 2.001; f += 0.01) pts.push([f, amp(p, f) * 100]);
      var amax = Math.max.apply(null, pts.map(function (q) { return q[1]; }));
      var g = D.plot(ctx, { x: W * 0.36, y: H * 0.56, w: W * 0.6, h: H * 0.32 }, { xmin: 0, xmax: 2, ymin: 0, ymax: amax * 1.15, xlabel: 'ν, Гц', ylabel: 'A, см', series: [{ pts: pts, color: C.orange }] });
      D.circle(ctx, g.X(P.f), g.Y(A), 5, C.bad, null, 0, true);
      var f0 = Math.sqrt(P.k / P.m) / (2 * Math.PI);
      D.line(ctx, g.X(f0), H * 0.56, g.X(f0), H * 0.88, C.muted, 1, [4, 4]);
      D.text(ctx, 'ν₀', g.X(f0) + 4, H * 0.56 + 12, { size: 11, color: C.muted });
    },
  });
})();

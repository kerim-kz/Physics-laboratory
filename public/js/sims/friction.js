/* Үйкеліс күші: динамометрмен тартылған білікше. Тыныштық үйкелісі F_тын ≤ μ_т·N, сырғанау үйкелісі F = μ·N. */
(function () {
  var g = 9.8;
  var SURF = {
    wood: ['Ағаш — ағаш', 0.3, 0.4, '#c89a62'],
    rubber: ['Резеңке — асфальт', 0.6, 0.8, '#5c6168'],
    metal: ['Болат — болат', 0.15, 0.2, '#9aa4ae'],
    ice: ['Болат — мұз', 0.02, 0.03, '#cfe9f5'],
  };
  Sim.create({
    aspect: 0.6, substeps: 6, autoplay: true, keepRunning: true,
    tools: ['stopwatch'],
    hint: 'Тарту күшін біртіндеп арттыр: білікше қай кезде қозғала бастайды?',
    controls: [
      { type: 'select', key: 'surf', label: 'Беттер', value: 'wood', options: Object.keys(SURF).map(function (k) { return [k, SURF[k][0] + ' (μ = ' + String(SURF[k][1]).replace('.', ',') + ')']; }) },
      { type: 'range', key: 'm', label: 'Білікшенің массасы m', min: 0.5, max: 5, step: 0.1, value: 2, unit: 'кг', digits: 1 },
      { type: 'range', key: 'F', label: 'Тарту күші F', min: 0, max: 40, step: 0.2, value: 2, unit: 'Н', digits: 1, live: true },
    ],
    readouts: [
      { key: 'N', label: 'Тірек реакциясы N = mg', unit: 'Н' },
      { key: 'fmax', label: 'Тыныштық үйкелісінің ең үлкен мәні', unit: 'Н' },
      { key: 'ftr', label: 'Үйкеліс күші', unit: 'Н' },
      { key: 'a', label: 'Үдеу a', unit: 'м/с²' },
      { key: 'v', label: 'Жылдамдық v', unit: 'м/с' },
      { key: 'st', label: 'Күйі' },
    ],
    init: function (api) { var S = api.S; S.x = 0; S.v = 0; S.t = 0; S.hist = []; },
    onLive: function (api) { var S = api.S; S.hist.push([api.P.F, friction(api)]); if (S.hist.length > 400) S.hist.shift(); },
    step: function (api, dt) {
      var S = api.S, P = api.P, sf = SURF[P.surf], N = P.m * g;
      S.t += dt;
      if (Math.abs(S.v) < 1e-6 && P.F <= sf[2] * N) { S.v = 0; return; }
      var a = (P.F - sf[1] * N) / P.m;
      S.v = Math.max(0, S.v + a * dt);
      S.x += S.v * dt;
      if (S.x > 1.6) { S.x = 0; } // үстелдің басына қайта ораламыз
    },
    read: function (api) {
      var S = api.S, P = api.P, sf = SURF[P.surf], N = P.m * g, ftr = friction(api);
      var moving = S.v > 1e-6 || P.F > sf[2] * N;
      return { N: N, fmax: sf[2] * N, ftr: ftr, a: moving ? Math.max(0, (P.F - sf[1] * N) / P.m) : 0, v: S.v, st: moving ? 'сырғанайды' : 'тыныштықта' };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, sf = SURF[P.surf], N = P.m * g, ftr = friction(api);
      var top = H * 0.42, x0 = 60, w = W * 0.62;
      // үстел беті
      var gr = ctx.createLinearGradient(0, top, 0, top + 26);
      gr.addColorStop(0, sf[3]); gr.addColorStop(1, shade(sf[3]));
      ctx.fillStyle = gr; ctx.fillRect(20, top, w + 40, 26);
      ctx.strokeStyle = C.line; ctx.strokeRect(20.5, top + 0.5, w + 39, 25);
      // білікше
      var bw = 60 + P.m * 8, bh = 36 + P.m * 4, bx = x0 + S.x / 1.6 * (w - bw - 120);
      var gb = ctx.createLinearGradient(bx, top - bh, bx, top);
      gb.addColorStop(0, '#d49a5a'); gb.addColorStop(1, '#9a6430');
      ctx.fillStyle = gb; ctx.fillRect(bx, top - bh, bw, bh);
      ctx.strokeStyle = '#6b4320'; ctx.lineWidth = 1.5; ctx.strokeRect(bx + 0.5, top - bh + 0.5, bw - 1, bh - 1);
      D.text(ctx, api.fmt(P.m, 1) + ' кг', bx + bw / 2, top - bh / 2 + 4, { size: 12, align: 'center', color: '#fff', weight: '700' });
      // динамометр
      var dx = bx + bw, dy = top - bh / 2, stretch = 20 + P.F * 3;
      D.line(ctx, dx, dy, dx + 14, dy, C.ink, 2);
      ctx.fillStyle = C.bg2; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.fillRect(dx + 14, dy - 11, 90 + stretch, 22); ctx.strokeRect(dx + 14.5, dy - 10.5, 89 + stretch, 21);
      ctx.save(); ctx.strokeStyle = C.blue; ctx.lineWidth = 1.6; ctx.beginPath();
      for (var i = 0; i <= 14; i++) ctx.lineTo(dx + 20 + i * stretch / 14, dy + (i % 2 ? -6 : 6));
      ctx.stroke(); ctx.restore();
      D.text(ctx, api.fmt(P.F, 1) + ' Н', dx + 60 + stretch, dy + 4, { size: 12, mono: true, weight: '600', align: 'center' });
      D.line(ctx, dx + 104 + stretch, dy, dx + 124 + stretch, dy, C.ink, 2);
      // күштер
      var fk = 3;
      D.arrow(ctx, bx + bw, top - bh - 6, bx + bw + P.F * fk, top - bh - 6, C.red, 2.5, 'F');
      D.arrow(ctx, bx, top - 6, bx - ftr * fk, top - 6, C.orange, 2.5, 'Fүйк');
      D.arrow(ctx, bx + bw / 2, top - bh / 2, bx + bw / 2, top - bh / 2 + Math.min(70, N * 1.5), C.purple, 2, 'mg');
      D.arrow(ctx, bx + bw / 2, top - bh, bx + bw / 2, top - bh - Math.min(70, N * 1.5), C.good, 2, 'N');
      // Fүйк(F) графигі
      var fmax = sf[2] * N, Fmax = 40;
      var curve = [[0, 0], [fmax, fmax], [fmax + 0.001, sf[1] * N], [Fmax, sf[1] * N]];
      var r = { x: 60, y: top + 70, w: W - 100, h: H - top - 110 };
      if (r.h > 60) {
        var gx = D.plot(ctx, r, { xmin: 0, xmax: Fmax, ymin: 0, ymax: Math.max(5, fmax * 1.3), xlabel: 'F тарту, Н', ylabel: 'F үйкеліс, Н',
          series: [{ pts: curve, color: C.muted, dash: [5, 4], width: 1.2 }, { pts: S.hist.slice().sort(function (a, b) { return a[0] - b[0]; }), color: C.orange }] });
        D.circle(ctx, gx.X(P.F), gx.Y(ftr), 5, C.bad, null, 0, true);
        D.text(ctx, 'тыныштық үйкелісі', gx.X(fmax * 0.45), gx.Y(fmax * 0.45) - 10, { size: 10, color: C.muted, align: 'center' });
        D.text(ctx, 'сырғанау үйкелісі', gx.X(Math.min(Fmax * 0.8, fmax + 10)), gx.Y(sf[1] * N) - 8, { size: 10, color: C.muted, align: 'center' });
      }
    },
  });
  function friction(api) {
    var S = api.S, P = api.P, sf = SURF[P.surf], N = P.m * g;
    if (S.v < 1e-6 && P.F <= sf[2] * N) return P.F;
    return sf[1] * N;
  }
  function shade(hex) { var n = parseInt(hex.slice(1), 16), r = (n >> 16) * 0.7, g2 = ((n >> 8) & 255) * 0.7, b = (n & 255) * 0.7; return 'rgb(' + [r, g2, b].map(Math.round).join(',') + ')'; }
})();

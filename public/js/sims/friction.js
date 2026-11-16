/* Үйкеліс күші: динамометрмен тартылған білікше. Тыныштық үйкелісі F_тын ≤ μ_т·N, сырғанау үйкелісі F = μ·N. */
(function () {
  var R = window.Real;
  var g = 9.8;
  var SURF = {
    wood: ['Ағаш — ағаш', 0.3, 0.4, '#c89a62'],
    rubber: ['Резеңке — асфальт', 0.6, 0.8, '#5c6168'],
    metal: ['Болат — болат', 0.15, 0.2, '#9aa4ae'],
    ice: ['Болат — мұз', 0.02, 0.03, '#cfe9f5'],
  };
  Sim.create({
    grid: false,
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
      R.scene(ctx, W, top + 26, 'wall');
      ctx.fillStyle = C.bg; ctx.fillRect(0, top + 26, W, H - top - 26);
      // беттің материалы
      ctx.save(); ctx.beginPath(); ctx.rect(20, top, w + 40, 26); ctx.clip();
      var surfMat = /мұз|ice/i.test(sf[0]) ? 'ice' : /резеңке|rubber/i.test(sf[0]) ? 'rubber' : /металл|болат|steel/i.test(sf[0]) ? 'steel' : /тас|бетон|асфальт/i.test(sf[0]) ? 'concrete' : null;
      if (surfMat) R.paintFace(ctx, 20, top, w + 40, 26, surfMat, 0); else { ctx.fillStyle = sf[3]; ctx.fillRect(20, top, w + 40, 26); R.paintFace(ctx, 20, top, w + 40, 26, { c: sf[3], t: 'noise' }, 0); }
      ctx.restore();
      var gr = ctx.createLinearGradient(0, top, 0, top + 26); gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      ctx.fillStyle = gr; ctx.fillRect(20, top, w + 40, 26);
      // ағаш білікше (брусок)
      var bw = 60 + P.m * 8, bh = 36 + P.m * 4, bx = x0 + S.x / 1.6 * (w - bw - 120);
      R.block(ctx, bx, top - bh, bw, bh, 'oak', { depth: 10, label: api.fmt(P.m, 1) + ' кг' });
      // динамометр (көлденең)
      ctx.save(); ctx.translate(bx + bw + 4, top - bh / 2); ctx.rotate(-Math.PI / 2);
      R.dynamometer(ctx, 0, -6, 140, P.F, 40, { div: 1, big: 10, w: 28 });
      ctx.restore();
      // күштер
      var fk = 3;
      R.force(ctx, bx + bw, top - bh - 14, bx + bw + P.F * fk, top - bh - 14, '#d2382b', 'F');
      R.force(ctx, bx, top - 6, bx - ftr * fk, top - 6, '#e0761f', 'Fүйк');
      R.force(ctx, bx + bw / 2, top - bh / 2, bx + bw / 2, top - bh / 2 + Math.min(70, N * 1.5), '#7a3fc0', 'mg');
      R.force(ctx, bx + bw / 2, top - bh, bx + bw / 2, top - bh - Math.min(70, N * 1.5), '#1d7a45', 'N');
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

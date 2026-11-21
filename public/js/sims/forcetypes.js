/* Механикадағы күштер: үстелдегі брусокқа әсер ететін ауырлық күші, тіректің реакция күші, үйкеліс күші, серпімділік күші (динамометр) және брусоктың салмағы (тірекке түсірілген). */
(function () {
  var R = window.Real, g = 9.81;
  var SURF = { wood: ['Ағаш үстел (μ = 0,3)', 0.3, 'oak'], ice: ['Мұз (μ = 0,05)', 0.05, 'ice'], rubber: ['Резеңке төсеніш (μ = 0,7)', 0.7, 'rubber'] };
  function forces(P) {
    var mu = SURF[P.surf][1], N = P.m * g, Fmax = mu * N, slide = P.F > Fmax;
    return { mg: P.m * g, N: N, Ff: slide ? Fmax : P.F, slide: slide, a: slide ? (P.F - Fmax) / P.m : 0, mu: mu };
  }
  Sim.create({
    aspect: 0.58, grid: false,
    hint: 'Тарту күшін біртіндеп арттыр: брусок қашан қозғала бастайды? Ауырлық күші мен салмақтың түсірілу нүктелерін салыстыр.',
    controls: [
      { type: 'range', key: 'm', label: 'Брусоктың массасы m', min: 0.2, max: 2, step: 0.1, value: 1, unit: 'кг' },
      { type: 'range', key: 'F', label: 'Динамометрмен тарту күші F', min: 0, max: 10, step: 0.2, value: 2, unit: 'Н' },
      { type: 'select', key: 'surf', label: 'Бет', value: 'wood', options: Object.keys(SURF).map(function (k) { return [k, SURF[k][0]]; }) },
      { type: 'check', key: 'showP', label: 'Салмақты (тірекке түсірілген) көрсету', value: true, live: true },
    ],
    readouts: [
      { key: 'mg', label: 'Ауырлық күші mg', unit: 'Н', digits: 2 },
      { key: 'N', label: 'Тіректің реакция күші N', unit: 'Н', digits: 2 },
      { key: 'Ff', label: 'Үйкеліс күші', unit: 'Н', digits: 2 },
      { key: 'Fmax', label: 'Тыныштық үйкелісінің ең үлкен мәні μN', unit: 'Н', digits: 2 },
      { key: 'R', label: 'Тең әсерлі күш', unit: 'Н', digits: 2 },
      { key: 'a', label: 'Үдеу a = R / m', unit: 'м/с²', digits: 2 },
    ],
    init: function (api) { api.S.x = 0; api.S.v = 0; api.S.t = 0; },
    step: function (api, dt) {
      var S = api.S, f = forces(api.P);
      if (f.slide) { S.v += f.a * dt; S.x += S.v * dt; }
      S.t += dt;
      if (S.x > 0.55 || S.t > 6) return false;
    },
    read: function (api) {
      var f = forces(api.P);
      return { mg: f.mg, N: f.N, Ff: f.Ff, Fmax: f.mu * f.N, R: api.P.F - f.Ff, a: f.a };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, f = forces(P), table = H * 0.66;
      R.scene(ctx, W, H, 'lab', { table: table });
      var m = SURF[P.surf][2];
      if (P.surf !== 'wood') { R.block(ctx, W * 0.06, table - 8, W * 0.86, 8, m, { depth: 4, shadow: false }); }
      var surfY = P.surf !== 'wood' ? table - 8 : table;
      var ppm = W * 0.6, bw = Math.max(70, Math.min(150, 90 * Math.cbrt(P.m))), bh = bw * 0.48;
      var bx = W * 0.16 + S.x * ppm, by = surfY - bh;
      R.block(ctx, bx, by, bw, bh, 'pine', { depth: 10, label: Sim.fmt(P.m, 1) + ' кг' });
      // горизонталь динамометр (ілгегі брусокқа қарай)
      var len = Math.min(220, W * 0.26), ringX = bx + bw + len + 70, hy = by + bh * 0.5;
      ctx.save(); ctx.translate(ringX, hy); ctx.rotate(Math.PI / 2);
      var hook = R.dynamometer(ctx, 0, 0, len, P.F, 10, { w: 26 });
      ctx.restore();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + bw, hy); ctx.lineTo(ringX - (hook ? hook.y : len), hy); ctx.stroke();
      // қол (тартатын жіп)
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ringX, hy); ctx.lineTo(Math.min(W - 6, ringX + 40), hy); ctx.stroke();
      // күштер (масштаб: 1 Н = k px)
      var k = Math.min(16, (H * 0.3) / Math.max(10, f.mg));
      var cx = bx + bw / 2, cyy = by + bh / 2;
      R.force(ctx, cx, cyy, cx, cyy + f.mg * k, '#1f5fd1', 'mg');
      R.force(ctx, cx - bw * 0.2, surfY, cx - bw * 0.2, surfY - f.N * k, '#0b8a7a', 'N');
      if (P.showP) R.force(ctx, cx + bw * 0.2, surfY, cx + bw * 0.2, surfY + f.mg * k, '#7a3fb0', 'P');
      if (P.F > 0) R.force(ctx, bx + bw, by + 8, bx + bw + P.F * k * 1.6, by + 8, '#e0761b', 'F серп');
      if (f.Ff > 0) R.force(ctx, bx, surfY - 3, bx - f.Ff * k * 1.6, surfY - 3, '#d2382b', 'F үйк');
      // түсіндірме
      var msg = f.slide ? 'Брусок сырғанайды: F > μN, a = ' + Sim.fmt(f.a, 2) + ' м/с²' : W < 600 ? 'Тыныштықта: F ≤ μN = ' + Sim.fmt(f.mu * f.N, 2) + ' Н' : 'Брусок тыныштықта: тыныштық үйкеліс күші F-ті теңгереді (F ≤ μN = ' + Sim.fmt(f.mu * f.N, 2) + ' Н)';
      R.tag(ctx, msg, W / 2, 22, { size: W < 600 ? 9.5 : 12, color: f.slide ? '#b4342a' : '#0b6b78' });
      if (P.showP) R.tag(ctx, 'P — тірекке, mg — денеге түсірілген', W / 2, 50, { size: W < 600 ? 9.5 : 11, color: '#5a2d86' });
    },
  });
})();

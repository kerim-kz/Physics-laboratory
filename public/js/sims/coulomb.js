/* Кулон заңы: жіпке ілінген екі зарядталған шарик. Тепе-теңдікте tg α = F / (mg). F = k|q₁||q₂| / r². */
(function () {
  var R = window.Real;
  var K = 9e9, M = 0.002, L = 0.3, G = 9.8; // 2 г шарик, 30 см жіп
  function solve(P) {
    var q1 = P.q1 * 1e-9, q2 = P.q2 * 1e-9, d = P.d / 100, x = 0; // x — әр шариктің ығысуы (тебілгенде +)
    for (var i = 0; i < 300; i++) {
      var r = Math.max(0.01, d + 2 * x), F = K * q1 * q2 / (r * r); // F > 0 — тебілу
      var target = L * F / Math.sqrt(Math.pow(M * G, 2) + F * F);
      target = Math.max(-d / 2 + 0.005, Math.min(L * 0.95, target));
      x += (target - x) * 0.2;
    }
    var r2 = Math.max(0.01, d + 2 * x);
    return { x: x, r: r2, F: K * q1 * q2 / (r2 * r2) };
  }
  Sim.create({
    aspect: 0.62, grid: false, static: true, resetLabel: false,
    hint: 'Зарядтардың шамасы мен таңбасын өзгерт: шариктер тебіле ме, тартыла ма?',
    controls: [
      { type: 'range', key: 'q1', label: 'Бірінші шариктің заряды q₁', min: -60, max: 60, step: 5, value: 40, unit: 'нКл', digits: 0 },
      { type: 'range', key: 'q2', label: 'Екінші шариктің заряды q₂', min: -60, max: 60, step: 5, value: 40, unit: 'нКл', digits: 0 },
      { type: 'range', key: 'd', label: 'Ілу нүктелерінің арақашықтығы', min: 4, max: 20, step: 1, value: 10, unit: 'см', digits: 0 },
    ],
    readouts: [
      { key: 'F', label: 'Кулон күші F', unit: 'мН', digits: 2 },
      { key: 'r', label: 'Шариктердің арақашықтығы r', unit: 'см', digits: 1 },
      { key: 'kind', label: 'Өзара әрекеттесу', text: true },
      { key: 'N', label: 'q₁-дегі артық/жетпейтін электрон саны', digits: 0 },
    ],
    init: function () {}, step: function () {},
    read: function (api) {
      var P = api.P, s = solve(P);
      return { F: Math.abs(s.F) * 1000, r: s.r * 100, kind: P.q1 * P.q2 > 0 ? 'тебіледі (аттас)' : P.q1 * P.q2 < 0 ? 'тартылады (әр аттас)' : 'әрекеттеспейді', N: Math.abs(P.q1) * 1e-9 / 1.6e-19 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, s = solve(P), table = H * 0.94;
      R.scene(ctx, W, H, 'lab', { table: table });
      var px = Math.min(W, H) * 1.6; // 1 м
      var cx = W * 0.42, top = 40, d = P.d / 100;
      ctx.fillStyle = '#4b5258'; ctx.fillRect(cx - 160, top - 12, 320, 12);
      [[-1, P.q1], [1, P.q2]].forEach(function (b) {
        var hx = cx + b[0] * d / 2 * px, bx = hx + b[0] * s.x * px, by = top + Math.sqrt(Math.max(0, L * L - s.x * s.x)) * px;
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, top); ctx.lineTo(bx, by); ctx.stroke();
        R.sphere(ctx, bx, by, 13, '#d9dee3');
        var sign = b[1] > 0 ? '+' : b[1] < 0 ? '−' : '';
        if (sign) R.txt(ctx, sign, bx, by + 1, { size: 15, color: b[1] > 0 ? '#c62f22' : '#1f5fd1' });
        var F = s.F, dir = (F > 0 ? 1 : -1) * b[0], len = Math.min(120, Math.abs(F) * 1000 * 60);
        if (len > 3) R.force(ctx, bx + dir * 16, by, bx + dir * (16 + len), by, '#d2382b', b[0] < 0 ? 'F' : '');
        R.force(ctx, bx, by + 16, bx, by + 16 + 40, '#1f5fd1', b[0] < 0 ? 'mg' : '');
        R.tag(ctx, (b[1] > 0 ? '+' : '') + b[1] + ' нКл', bx, by + 76, { size: 10.5 });
      });
      R.tag(ctx, 'F = k·|q₁|·|q₂| / r²,  k = 9·10⁹ Н·м²/Кл²', W * 0.42, H - 20, { size: 11 });
    },
  });
})();

/* Кавендиш тәжірибесі: бұралмалы таразы (жоғарыдан көрініс). Үлкен қорғасын шарлар кіші шарларды тартып, иінтіректі бұрайды; айнадан шағылған лазер сәулесі шкала бойымен жылжиды.
   Зертханалық нұсқаның параметрлері: m = 15 г, L = 5 см, κ = 2·10⁻⁸ Н·м/рад, шкалаға дейін D = 5 м. */
(function () {
  var R = window.Real, G = 6.674e-11, m = 0.015, Lr = 0.05, KAP = 2e-8, D = 5, I = 2 * m * Lr * Lr;
  function eq(P) { var r = P.r / 100, F = G * P.M * m / (r * r), tau = 2 * F * Lr; return { F: F, tau: tau, th: (P.pos === 'A' ? 1 : -1) * tau / KAP }; }
  Sim.create({
    aspect: 0.6, grid: false, keepRunning: true,
    hint: '«Бастау» бас: таразы баяу тербеліп, жаңа тепе-теңдікке келеді. Үлкен шарларды екінші жаққа (B) ауыстырып, жарық дағының жылжуын өлше.',
    controls: [
      { type: 'range', key: 'M', label: 'Үлкен шардың массасы M', min: 0.5, max: 3, step: 0.5, value: 1.5, unit: 'кг' },
      { type: 'range', key: 'r', label: 'Шарлар центрлерінің арақашықтығы r', min: 3, max: 8, step: 0.5, value: 4.5, unit: 'см' },
      { type: 'select', key: 'pos', label: 'Үлкен шарлардың орны', value: 'A', options: [['A', 'A жағдайы'], ['B', 'B жағдайы (қарама-қарсы)']], live: true },
    ],
    readouts: [
      { key: 'F', label: 'Тартылыс күші F = GMm/r²', unit: 'Н', digits: 3 },
      { key: 'th', label: 'Бұралу бұрышы θ', unit: 'мрад', digits: 2 },
      { key: 'x', label: 'Жарық дағының ығысуы x = 2θD', unit: 'см', digits: 2 },
      { key: 't', label: 'Уақыт', unit: 'мин', digits: 1 },
      { key: 'Gm', label: 'Тепе-теңдіктен есептелген G', unit: 'Н·м²/кг²', digits: 3 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.th = 0; S.w = 0; S.hist = [[0, 0]]; },
    step: function (api, dt) {
      var S = api.S, P = api.P, e = eq(P), n = 40;
      for (var i = 0; i < n; i++) { var h = dt * 40 / n; var acc = (-KAP * (S.th - e.th) - 1.2e-7 * S.w) / I; S.w += acc * h; S.th += S.w * h; S.t += h; }
      S.hist.push([S.t / 60, 2 * S.th * D * 100]); if (S.hist.length > 900) S.hist.shift();
    },
    read: function (api) {
      var S = api.S, P = api.P, e = eq(P), r = P.r / 100;
      return { F: e.F, th: S.th * 1000, x: 2 * S.th * D * 100, t: S.t / 60, Gm: Math.abs(e.th) > 0 ? KAP * Math.abs(e.th) * r * r / (2 * Lr * P.M * m) : null };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, dark = R.isDark(), wide = W > 640;
      R.scene(ctx, W, H, 'wall', {});
      var cx = wide ? W * 0.27 : W * 0.5, cy = wide ? H * 0.5 : H * 0.34, Rc = Math.min(wide ? W * 0.22 : W * 0.4, H * (wide ? 0.4 : 0.3));
      // шыны қорап (жоғарыдан)
      ctx.save(); ctx.fillStyle = 'rgba(200,230,245,.25)'; ctx.strokeStyle = 'rgba(80,120,140,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, Rc, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
      var vis = 40, ang = S.th * vis, L = Rc * 0.62; // бұрыш көрнекілік үшін үлкейтілген
      var ex = Math.cos(ang) * L, ey = Math.sin(ang) * L;
      ctx.strokeStyle = '#8d959c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - ex, cy - ey); ctx.lineTo(cx + ex, cy + ey); ctx.stroke();
            // үлкен шарлар: иінтіректің екі ұшының жанында, A — сағат тілі бойынша бұрайтын жақта
      var sgn = P.pos === 'A' ? 1 : -1, rb = 10 + Math.cbrt(P.M) * 9, dpx = (P.r / 4.5) * (rb + 16);
      [[1], [-1]].forEach(function (s) {
        var px = cx + s[0] * L, py = cy + s[0] * sgn * dpx;
        R.sphere(ctx, px, py, rb, '#6f7480');
      });
      R.sphere(ctx, cx + ex, cy + ey, 8, '#c9a24a'); R.sphere(ctx, cx - ex, cy - ey, 8, '#c9a24a');
      // айна және лазер
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = '#e6eef3'; ctx.fillRect(-3, -12, 6, 24); ctx.restore();
      var lx = wide ? W * 0.62 : W * 0.5, ly = wide ? cy : H * 0.75, scaleX = wide ? W * 0.62 : W * 0.15;
      var spot = 2 * S.th * D * 100; // см
      ctx.strokeStyle = 'rgba(255,40,40,.75)'; ctx.lineWidth = 1.5;
      if (wide) {
        ctx.beginPath(); ctx.moveTo(lx, cy + 60); ctx.lineTo(cx, cy); ctx.lineTo(lx, cy - spot * 4); ctx.stroke();
        ctx.fillStyle = '#3a4148'; ctx.fillRect(lx - 4, cy + 54, 30, 12); R.txt(ctx, 'лазер', lx + 34, cy + 60, { size: 9.5, align: 'left', color: dark ? '#c9d2d9' : '#3a4148' });
        R.ruler(ctx, lx + 6, cy - 110, 220, 10, { vertical: true, width: 22, from: -11 });
        ctx.fillStyle = 'rgba(255,40,40,.95)'; ctx.beginPath(); ctx.arc(lx, cy - spot * 4, 5, 0, 7); ctx.fill();
        R.tag(ctx, 'Шкала (D = 5 м, масштаб кішірейтілген)', lx + 10, cy - 128, { size: 9.5 });
      }
      R.tag(ctx, P.pos === 'A' ? 'A: үлкен шарлар иінтіректі сағат тілімен бұрайды' : 'B: үлкен шарлар иінтіректі сағат тіліне қарсы бұрайды', cx, 22, { size: 10 });
      R.txt(ctx, 'Бұралу бұрышы көрнекілік үшін 40 есе үлкейтілген', cx, H - 10, { size: 9.5, color: '#5b6670' });
      // x(t) графигі
      var gx = wide ? W * 0.74 : 40, gy = wide ? 30 : H * 0.55, gw = wide ? W * 0.23 : W - 60, gh = wide ? H - 80 : H * 0.36;
      if (!wide) gx = 40;
      ctx.save(); R.rr(ctx, gx - 36, gy - 14, gw + 46, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
      var tmax = Math.max(15, S.t / 60);
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: Math.max(0, tmax - 15), xmax: tmax, ymin: -12, ymax: 12, xlabel: 't, мин', ylabel: 'x, см', series: [{ pts: S.hist, color: '#d2382b' }] });
    },
  });
})();

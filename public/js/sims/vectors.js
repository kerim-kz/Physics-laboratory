/* Скаляр және векторлық шамалар: саябақтағы жол (скаляр) және орын ауыстыру (вектор). Жоғарыдан көрініс. */
(function () {
  var R = window.Real;
  // Маршруттар: нүктелер метрмен (саябақ 400 × 260 м)
  var ROUTES = {
    straight: { name: 'Түзу аллея', pts: [[40, 200], [360, 200]] },
    corner: { name: 'Бұрылыспен (Г әрпі)', pts: [[60, 230], [60, 60], [300, 60]] },
    lake: { name: 'Көлді айнала', pts: [[200, 230], [330, 200], [360, 130], [320, 50], [200, 30], [80, 50], [40, 130], [70, 200], [200, 230]] },
    zigzag: { name: 'Ирек жол', pts: [[40, 230], [120, 60], [200, 230], [280, 60], [360, 230]] },
  };
  function lenOf(pts) { var s = 0; for (var i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  function at(pts, d) {
    for (var i = 1; i < pts.length; i++) {
      var L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= L) { var t = d / L; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, i]; }
      d -= L;
    }
    var e = pts[pts.length - 1]; return [e[0], e[1], pts.length];
  }
  var DIRS = ['шығысқа', 'солтүстік-шығысқа', 'солтүстікке', 'солтүстік-батысқа', 'батысқа', 'оңтүстік-батысқа', 'оңтүстікке', 'оңтүстік-шығысқа'];
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Жол — жүрілген траекторияның ұзындығы (скаляр). Орын ауыстыру — бастапқы нүктеден соңғы нүктеге жүргізілген бағытталған кесінді (вектор).',
    controls: [
      { type: 'select', key: 'route', label: 'Маршрут', value: 'corner', options: Object.keys(ROUTES).map(function (k) { return [k, ROUTES[k].name]; }) },
      { type: 'range', key: 'v', label: 'Жаяу адамның жылдамдығы', min: 0.5, max: 3, step: 0.1, value: 1.5, unit: 'м/с', live: true },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 0 },
      { key: 's', label: 'Жүрілген жол s (скаляр)', unit: 'м', digits: 0 },
      { key: 'disp', label: 'Орын ауыстыру модулі |s⃗|', unit: 'м', digits: 0 },
      { key: 'dir', label: 'Орын ауыстыру бағыты', text: true },
    ],
    init: function (api) { api.S.d = 0; api.S.t = 0; },
    step: function (api, dt) {
      var L = lenOf(ROUTES[api.P.route].pts);
      api.S.t += dt * 20; api.S.d = Math.min(L, api.S.d + api.P.v * dt * 20);
      if (api.S.d >= L) return false;
    },
    read: function (api) {
      var pts = ROUTES[api.P.route].pts, p = at(pts, api.S.d), dx = p[0] - pts[0][0], dy = -(p[1] - pts[0][1]);
      var m = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      return { t: api.S.t, s: api.S.d, disp: m, dir: m < 1 ? '—' : DIRS[(Math.round(a / (Math.PI / 4)) + 8) % 8] };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, rt = ROUTES[P.route];
      var k = Math.min((W - 40) / 400, (H - 40) / 260), ox = (W - 400 * k) / 2, oy = (H - 260 * k) / 2;
      var X = function (p) { return [ox + p[0] * k, oy + p[1] * k]; };
      // шөп
      ctx.fillStyle = '#5f9d47'; ctx.fillRect(0, 0, W, H);
      var r = R.rng(9);
      for (var i = 0; i < 900; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,40,0,.08)'; ctx.fillRect(r() * W, r() * H, 3, 3); }
      // көл
      if (P.route === 'lake') {
        var c = X([200, 130]);
        var g = ctx.createRadialGradient(c[0], c[1], 5, c[0], c[1], 110 * k);
        g.addColorStop(0, '#5fb3e0'); g.addColorStop(1, '#2f7fb4');
        ctx.fillStyle = '#c8b48a'; ctx.beginPath(); ctx.ellipse(c[0], c[1], 112 * k, 66 * k, 0, 0, 7); ctx.fill();
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c[0], c[1], 104 * k, 60 * k, 0, 0, 7); ctx.fill();
      }
      // ағаштар (жоғарыдан)
      var tr = R.rng(4);
      for (var j = 0; j < 26; j++) {
        var tx = tr() * W, ty = tr() * H, rad = (8 + tr() * 10) * Math.max(0.7, k);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(tx + 4, ty + 4, rad, 0, 7); ctx.fill();
        var tg = ctx.createRadialGradient(tx - rad * 0.3, ty - rad * 0.3, 1, tx, ty, rad);
        tg.addColorStop(0, '#7fcf5f'); tg.addColorStop(1, '#2d6b2a');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, rad, 0, 7); ctx.fill();
      }
      // жолақ (аллея)
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 14 * Math.max(0.6, k);
      ctx.beginPath(); rt.pts.forEach(function (p, i) { var q = X(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,100,60,.35)'; ctx.lineWidth = 1; ctx.stroke();
      // жүрілген бөлік
      var cur = at(rt.pts, S.d);
      ctx.strokeStyle = '#e8892b'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
      ctx.beginPath(); var first = X(rt.pts[0]); ctx.moveTo(first[0], first[1]);
      for (var q = 1; q < cur[2]; q++) { var pp = X(rt.pts[q]); ctx.lineTo(pp[0], pp[1]); }
      var cp = X(cur); ctx.lineTo(cp[0], cp[1]); ctx.stroke(); ctx.restore();
      // орын ауыстыру векторы
      if (S.d > 1) R.force(ctx, first[0], first[1], cp[0], cp[1], '#1f5fd1', 'орын ауыстыру');
      R.tag(ctx, 'Старт', first[0], first[1] + 18, { size: 10.5 });
      // адам (жоғарыдан)
      R.sphere(ctx, cp[0], cp[1], 7, '#d24a3a');
      // солтүстік көрсеткіш
      R.compass(ctx, W - 34, 34, 20, -Math.PI / 2);
      R.txt(ctx, 'С', W - 34, 8, { size: 10, color: '#fff' });
      // масштаб
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(14, H - 22, 100 * k, 5);
      R.txt(ctx, '100 м', 14 + 50 * k, H - 30, { size: 10, color: '#fff' });
    },
  });
})();

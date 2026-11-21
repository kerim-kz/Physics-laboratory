/* Массалар центрінің қозғалысы: салют снаряды траекторияның жоғарғы нүктесінде екі бөлікке жарылады. Жарқыншақтар әртүрлі ұшады, бірақ массалар центрі бұрынғы парабола бойымен қозғалуын жалғастырады. */
(function () {
  var R = window.Real, g = 9.81;
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Жарылыс ішкі күштердің әсерінен болады. Жарқыншақтардың массалар центрі қандай сызықпен қозғалады?',
    controls: [
      { type: 'range', key: 'v0', label: 'Бастапқы жылдамдық v₀', min: 15, max: 35, step: 1, value: 25, unit: 'м/с', digits: 0 },
      { type: 'range', key: 'ang', label: 'Лақтыру бұрышы α', min: 30, max: 75, step: 5, value: 55, unit: '°', digits: 0 },
      { type: 'range', key: 'ratio', label: 'Бірінші жарқыншақтың массалық үлесі', min: 20, max: 80, step: 5, value: 30, unit: '%', digits: 0 },
      { type: 'range', key: 'dv', label: 'Жарылыстың «серпіні» (салыстырмалы жылдамдық)', min: 4, max: 20, step: 2, value: 10, unit: 'м/с', digits: 0 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт', unit: 'с', digits: 2 },
      { key: 'xc', label: 'Массалар центрінің координатасы x_c', unit: 'м', digits: 1 },
      { key: 'xp', label: 'Жарылмаған снарядтың x (салыстыру)', unit: 'м', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.tr1 = []; S.tr2 = []; S.trc = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P, a = P.ang * Math.PI / 180, vx = P.v0 * Math.cos(a), vy = P.v0 * Math.sin(a), tb = vy / g, T = 2 * vy / g;
      S.t = Math.min(T * 1.2, S.t + dt * 0.9);
      var st = state(P, S.t); S.trc.push([st.xc, st.yc]);
      if (st.boom) { S.tr1.push([st.x1, st.y1]); S.tr2.push([st.x2, st.y2]); }
      if (st.y1 < 0 && st.y2 < 0 && S.t > tb) return false;
      void T;
    },
    read: function (api) { var st = state(api.P, api.S.t), a = api.P.ang * Math.PI / 180; return { t: api.S.t, xc: st.xc, xp: api.P.v0 * Math.cos(a) * api.S.t }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, ground = H * 0.88, a = P.ang * Math.PI / 180, vx = P.v0 * Math.cos(a), vy = P.v0 * Math.sin(a);
      var L = P.v0 * P.v0 * Math.sin(2 * a) / g, hm = vy * vy / (2 * g), k = Math.min((W - 80) / (L * 1.35), (ground - 50) / (hm * 1.3));
      var dark = R.isDark();
      var sky = ctx.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, '#060b1a'); sky.addColorStop(1, '#1d2b48');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground); R.stars(ctx, W, ground * 0.8, 3, 90);
      ctx.fillStyle = dark ? '#1d4524' : '#2f5a33'; ctx.fillRect(0, ground, W, H - ground);
      var X = function (x) { return 40 + x * k; }, Y = function (y) { return ground - y * k; };
      // жарылмаған снарядтың траекториясы (үзік)
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([5, 5]); ctx.beginPath();
      for (var i = 0; i <= 80; i++) { var tt = 2 * vy / g * i / 80, xx = vx * tt, yy = vy * tt - g * tt * tt / 2; if (i) ctx.lineTo(X(xx), Y(yy)); else ctx.moveTo(X(xx), Y(yy)); }
      ctx.stroke(); ctx.restore();
      function trail(arr, col) { if (arr.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); arr.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.stroke(); }
      trail(S.trc.filter(function (p) { return p[1] >= 0; }), '#ffd666');
      trail(S.tr1.filter(function (p) { return p[1] >= -0.01; }), '#ff6b5a');
      trail(S.tr2.filter(function (p) { return p[1] >= -0.01; }), '#6bb8ff');
      var st = state(P, S.t);
      if (!st.boom) R.sphere(ctx, X(st.xc), Y(st.yc), 7, '#c9c4b8');
      else {
        if (st.y1 >= 0) R.sphere(ctx, X(st.x1), Y(st.y1), 4 + 6 * P.ratio / 100, '#ff6b5a');
        if (st.y2 >= 0) R.sphere(ctx, X(st.x2), Y(st.y2), 4 + 6 * (1 - P.ratio / 100), '#6bb8ff');
        if (st.yc >= 0) { ctx.strokeStyle = '#ffd666'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(st.xc), Y(st.yc), 7, 0, 7); ctx.moveTo(X(st.xc) - 10, Y(st.yc)); ctx.lineTo(X(st.xc) + 10, Y(st.yc)); ctx.moveTo(X(st.xc), Y(st.yc) - 10); ctx.lineTo(X(st.xc), Y(st.yc) + 10); ctx.stroke(); }
        var fb = S.t - vy / g;
        if (fb < 0.5) { var gg = ctx.createRadialGradient(X(vx * vy / g), Y(hm), 0, X(vx * vy / g), Y(hm), 50); gg.addColorStop(0, 'rgba(255,230,150,' + (1 - fb * 2) + ')'); gg.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(X(vx * vy / g), Y(hm), 50, 0, 7); ctx.fill(); }
      }
      R.tag(ctx, 'Сары — массалар центрі (жерге түскенше): парабола өзгермейді', W / 2, 22, { size: W < 600 ? 9.5 : 11.5, color: '#6b5200' });
    },
  });
  // Жарылыс — ең жоғарғы нүктеде; жарқыншақтар горизонталь бойымен қарама-қарсы серпін алады (импульс сақталады).
  function state(P, t) {
    var a = P.ang * Math.PI / 180, vx = P.v0 * Math.cos(a), vy = P.v0 * Math.sin(a), tb = vy / g, f = P.ratio / 100;
    var xc = vx * t, yc = vy * t - g * t * t / 2;
    if (t < tb) return { boom: false, xc: xc, yc: yc, x1: xc, y1: yc, x2: xc, y2: yc };
    var u1 = P.dv * (1 - f), u2 = -P.dv * f, w1 = P.dv * 0.4 * (1 - f), w2 = -P.dv * 0.4 * f; // m₁u₁ + m₂u₂ = 0
    var dt = t - tb, xb = vx * tb, yb = vy * vy / (2 * g);
    var x1 = xb + (vx + u1) * dt, y1 = yb + w1 * dt - g * dt * dt / 2, x2 = xb + (vx + u2) * dt, y2 = yb + w2 * dt - g * dt * dt / 2;
    return { boom: true, xc: f * x1 + (1 - f) * x2, yc: f * y1 + (1 - f) * y2, x1: x1, y1: y1, x2: x2, y2: y2 };
  }
})();

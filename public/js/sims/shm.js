/* Гармоникалық тербелістер: шеңбер бойымен бірқалыпты айналатын нүктенің проекциясы және серіппедегі жүк. x(t), v(t), a(t) графиктері және фаза. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.45, grid: false, keepRunning: true, autoplay: true,
    hint: 'Шеңбер бойымен айналатын нүктенің көлеңкесі гармоникалық тербеліс жасайды. Үш графиктің фазаларын салыстыр: жылдамдық ығысудан π/2-ге, үдеу π-ге озады.',
    controls: [
      { type: 'range', key: 'A', label: 'Амплитуда A', min: 0.02, max: 0.1, step: 0.01, value: 0.08, unit: 'м', digits: 2 },
      { type: 'range', key: 'T', label: 'Период T', min: 1, max: 4, step: 0.25, value: 2, unit: 'с', digits: 2 },
      { type: 'range', key: 'p0', label: 'Бастапқы фаза φ₀', min: 0, max: 360, step: 15, value: 0, unit: '°', digits: 0 },
      { type: 'range', key: 'm', label: 'Жүктің массасы m', min: 0.1, max: 1, step: 0.1, value: 0.5, unit: 'кг', digits: 1 },
    ],
    readouts: [
      { key: 'ph', label: 'Фаза φ = ωt + φ₀', unit: 'рад', digits: 2 },
      { key: 'x', label: 'Ығысу x = A cos φ', unit: 'см', digits: 2 },
      { key: 'v', label: 'Жылдамдық v = −Aω sin φ', unit: 'м/с', digits: 3 },
      { key: 'a', label: 'Үдеу a = −ω²x', unit: 'м/с²', digits: 3 },
      { key: 'Ek', label: 'E<sub>k</sub> / E<sub>p</sub>', text: true },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) {
      var st = state(api.P, api.S.t), E = api.P.m * Math.pow(api.P.A * st.w, 2) / 2;
      var ek = api.P.m * st.v * st.v / 2;
      return { ph: st.ph % (2 * Math.PI), x: st.x * 100, v: st.v, a: st.a, Ek: (ek * 1000).toFixed(1).replace('.', ',') + ' / ' + ((E - ek) * 1000).toFixed(1).replace('.', ',') + ' мДж' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, st = state(P, S.t), wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: wide ? H * 0.95 : H * 0.5 });
      // шеңбер және проекция
      var cx = wide ? W * 0.2 : W * 0.5, cy = wide ? H * 0.3 : H * 0.18, rc = Math.min(wide ? W * 0.12 : W * 0.25, H * (wide ? 0.2 : 0.13)), sc = rc / 0.1;
      ctx.strokeStyle = dark ? 'rgba(220,230,240,.6)' : 'rgba(60,70,80,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, P.A * sc, 0, 7); ctx.stroke();
      var px = cx + Math.cos(st.ph) * P.A * sc, py = cy - Math.sin(st.ph) * P.A * sc;
      ctx.strokeStyle = '#7a3fb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 18, 0, -st.ph % (2 * Math.PI), true); ctx.stroke();
      R.tag(ctx, 'φ', cx + 26, cy - 12, { size: 10.5, color: '#7a3fb0' });
      R.sphere(ctx, px, py, 7, '#7a3fb0');
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(122,63,176,.7)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, cy + rc + 34); ctx.stroke(); ctx.setLineDash([]);
      // серіппедегі жүк (көлденең)
      var yb = cy + rc + 52, wall = cx - rc - 40;
      ctx.fillStyle = '#6b7178'; ctx.fillRect(wall - 10, yb - 26, 10, 46);
      var bx = cx + st.x * sc;
      R.spring(ctx, wall, yb, bx - 18, yb, { coils: 12, r: 8 });
      R.block(ctx, bx - 18, yb - 18, 36, 36, 'brass', { depth: 4 });
      ctx.strokeStyle = 'rgba(90,100,110,.5)'; ctx.beginPath(); ctx.moveTo(cx, yb - 30); ctx.lineTo(cx, yb + 26); ctx.stroke();
      R.txt(ctx, '0', cx, yb + 34, { size: 10, color: '#5b6670' });
      if (Math.abs(st.v) > 0.005) R.force(ctx, bx, yb - 30, bx + st.v * sc * 0.4, yb - 30, '#1f5fd1', 'v');
      if (Math.abs(st.a) > 0.01) R.force(ctx, bx, yb + 28, bx + st.a * sc * 0.08, yb + 28, '#d2382b', 'a');
      // графиктер
      var gx = wide ? W * 0.47 : 46, gw = wide ? W * 0.49 : W - 64, gy0 = wide ? 24 : H * 0.5, gh = wide ? (H - 70) / 3 - 14 : (H * 0.5 - 50) / 3 - 12;
      ctx.save(); R.rr(ctx, gx - 42, gy0 - 14, gw + 54, (gh + 14) * 3 + 22, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var w = 2 * Math.PI / P.T, tw = 2 * P.T, t0 = Math.max(0, S.t - tw * 0.75);
      [['x, см', function (t) { return P.A * Math.cos(w * t + P.p0 * Math.PI / 180) * 100; }, P.A * 100, '#0b8a7a'],
       ['v, м/с', function (t) { return -P.A * w * Math.sin(w * t + P.p0 * Math.PI / 180); }, P.A * w, '#1f5fd1'],
       ['a, м/с²', function (t) { return -P.A * w * w * Math.cos(w * t + P.p0 * Math.PI / 180); }, P.A * w * w, '#d2382b']].forEach(function (g, i) {
        var pts = []; for (var t = t0; t <= t0 + tw; t += tw / 200) pts.push([t, g[1](t)]);
        var o = api.D.plot(ctx, { x: gx, y: gy0 + i * (gh + 14), w: gw, h: gh }, { xmin: t0, xmax: t0 + tw, ymin: -g[2] * 1.2, ymax: g[2] * 1.2, xlabel: i === 2 ? 't, с' : '', ylabel: g[0], series: [{ pts: pts, color: g[3], width: 2 }], marker: [S.t, g[1](S.t)] });
        void o;
      });
    },
  });
  function state(P, t) { var w = 2 * Math.PI / P.T, ph = w * t + P.p0 * Math.PI / 180; return { w: w, ph: ph, x: P.A * Math.cos(ph), v: -P.A * w * Math.sin(ph), a: -w * w * P.A * Math.cos(ph) }; }
})();

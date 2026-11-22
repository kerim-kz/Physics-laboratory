/* Біздің Галактика: спираль галактиканың айналуы және айналу қисығы v(r). Тек көрінетін заттың тартылысы болса, шеттегі жұлдыздардың жылдамдығы кемуі керек (Кеплер), ал байқалатын қисық тегіс — қараңғы материя. */
(function () {
  var R = window.Real, G = 4.3e-6; // кпк·(км/с)²/M☉
  function vel(r, P) {
    var Mdisk = 6e10 * (1 - Math.exp(-r / 3) * (1 + r / 3)), Mbulge = 1.5e10 * Math.pow(r, 2) / Math.pow(r + 0.7, 2);
    var Mdm = P.dm ? 1.2e12 * (Math.log(1 + r / 20) - (r / 20) / (1 + r / 20)) / (Math.log(11) - 10 / 11) : 0;
    return { vis: Math.sqrt(G * (Mdisk + Mbulge) / Math.max(r, 0.05)), tot: Math.sqrt(G * (Mdisk + Mbulge + Mdm) / Math.max(r, 0.05)) };
  }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.3, grid: false, keepRunning: true, autoplay: true,
    hint: 'Ішкі және сыртқы жұлдыздардың айналуын салыстыр. Қараңғы материяны өшірсең, шеткі жұлдыздар баяулайды — бірақ байқауда олай емес!',
    controls: [
      { type: 'check', key: 'dm', label: 'Қараңғы материя гало', value: true, live: true },
      { type: 'range', key: 'r', label: 'Таңдалған жұлдыздың қашықтығы', min: 1, max: 30, step: 0.5, value: 8, unit: 'кпк', digits: 1, live: true },
    ],
    readouts: [
      { key: 'v', label: 'Айналу жылдамдығы', unit: 'км/с', digits: 0 },
      { key: 'vk', label: 'Тек көрінетін зат бойынша', unit: 'км/с', digits: 0 },
      { key: 'T', label: 'Айналу периоды', unit: 'млн жыл', digits: 0 },
      { key: 'M', label: 'r ішіндегі масса', unit: '·10¹⁰ M☉', digits: 1 },
    ],
    init: function (api) { var S = api.S, rnd = R.rng(21); S.t = 0; S.st = []; for (var i = 0; i < 700; i++) { var arm = i % 2, rr = 0.5 + Math.pow(rnd(), 0.7) * 28, a = arm * Math.PI + Math.log(rr) * 1.9 + (rnd() - 0.5) * 0.7; S.st.push({ r: rr, a: a, b: 0.6 + rnd() * 0.4 }); } },
    step: function (api, dt) { var S = api.S, P = api.P; S.t += dt; S.st.forEach(function (s) { s.a += vel(s.r, P).tot / s.r * dt * 0.02; }); },
    read: function (api) { var P = api.P, v = vel(P.r, P); return { v: v.tot, vk: v.vis, T: 2 * Math.PI * P.r * 3.086e16 / v.tot / 3.156e13, M: v.tot * v.tot * P.r / G / 1e10 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'space', { count: 120 });
      var cx = wide ? W * 0.25 : W / 2, cy = wide ? H / 2 : H * 0.27, sc = (wide ? Math.min(W * 0.23, H * 0.46) : Math.min(W * 0.46, H * 0.25)) / 30;
      var core = ctx.createRadialGradient(cx, cy, 2, cx, cy, 4 * sc); core.addColorStop(0, 'rgba(255,240,200,1)'); core.addColorStop(1, 'rgba(255,220,160,0)'); ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, 4 * sc, 0, 7); ctx.fill();
      S.st.forEach(function (s) { var x = cx + Math.cos(s.a) * s.r * sc, y = cy + Math.sin(s.a) * s.r * sc * 0.9; ctx.fillStyle = s.r < 4 ? 'rgba(255,220,170,' + s.b + ')' : 'rgba(170,200,255,' + s.b * 0.9 + ')'; ctx.fillRect(x, y, 1.6, 1.6); });
      if (P.dm) { ctx.strokeStyle = 'rgba(160,120,255,.25)'; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(cx, cy, 30 * sc, 0, 7); ctx.stroke(); ctx.setLineDash([]); R.txt(ctx, 'қараңғы материя гало', cx, cy - 30 * sc - 8, { size: 9.5, color: '#b9a0ff' }); }
      var ta = S.t * vel(P.r, P).tot / P.r * 0.02, tx = cx + Math.cos(ta) * P.r * sc, ty = cy + Math.sin(ta) * P.r * sc * 0.9;
      ctx.strokeStyle = 'rgba(255,224,102,.5)'; ctx.beginPath(); ctx.ellipse(cx, cy, P.r * sc, P.r * sc * 0.9, 0, 0, 7); ctx.stroke();
      R.sphere(ctx, tx, ty, 4, '#ffe066'); R.tag(ctx, Math.abs(P.r - 8) < 0.6 ? 'Күн' : 'жұлдыз', tx + 26, ty, { size: 9.5 });
      // айналу қисығы
      var gx = wide ? W * 0.56 : 50, gy = wide ? 30 : H * 0.55, gw = wide ? W * 0.4 : W - 66, gh = wide ? H - 80 : H - gy - 46;
      ctx.save(); R.rr(ctx, gx - 44, gy - 16, gw + 56, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var vis = [], tot = [], obs = []; for (var r = 0.3; r <= 30; r += 0.3) { var v = vel(r, P), vd = vel(r, { dm: true }); vis.push([r, v.vis]); tot.push([r, v.tot]); if (Math.round(r * 10) % 24 === 0) obs.push([r, vd.tot]); }
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 30, ymin: 0, ymax: 320, xlabel: 'r, кпк', ylabel: 'v, км/с', series: [{ pts: vis, color: '#e0a800', dash: [5, 4], width: 2 }, { pts: tot, color: '#7a3fb0', width: 2.6 }], marker: [P.r, vel(P.r, P).tot] });
      obs.forEach(function (q) { api.D.circle(ctx, o.X(q[0]), o.Y(q[1]), 3, '#d2382b', null, 0, true); });
      R.txt(ctx, 'сары — тек көрінетін зат, күлгін — модель, қызыл нүкте — байқау', gx + gw / 2, gy + 8, { size: W < 600 ? 8.5 : 9.5, color: '#5b6670' });
    },
  });
})();

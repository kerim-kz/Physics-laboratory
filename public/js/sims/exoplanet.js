/* Экзопланеталарды іздеу: транзит әдісі (жұлдыз жарығының кемуі) және жұлдыздың радиал жылдамдығы (Доплер ығысуы). Планетаның радиусы мен орбитасы. */
(function () {
  var R = window.Real;
  var PL = { earth: ['Жер тәрізді', 1, 1], jupiter: ['Юпитер тәрізді', 11.2, 318], hotj: ['Ыстық Юпитер', 13, 300], nept: ['Нептун тәрізді', 3.9, 17] };
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.3, grid: false, keepRunning: true, autoplay: true,
    hint: 'Планета жұлдыздың алдынан өткенде жарықтылық аздап кемиді. Кемудің тереңдігінен планетаның радиусын, ал транзиттер арасындағы уақыттан орбиталық периодты анықта.',
    controls: [
      { type: 'select', key: 'pl', label: 'Планета', value: 'jupiter', options: Object.keys(PL).map(function (k) { return [k, PL[k][0]]; }) },
      { type: 'range', key: 'Rs', label: 'Жұлдыздың радиусы', min: 0.3, max: 2, step: 0.1, value: 1, unit: 'R☉', digits: 1 },
      { type: 'range', key: 'T', label: 'Орбиталық период', min: 2, max: 20, step: 1, value: 8, unit: 'тәулік (баяулатылған)', digits: 0 },
    ],
    readouts: [
      { key: 'depth', label: 'Транзит тереңдігі ΔF/F = (Rп/R*)²', unit: '%', digits: 3 },
      { key: 'rp', label: 'Планетаның радиусы', unit: 'R⊕', digits: 1 },
      { key: 'K', label: 'Жұлдыздың тербеліс жылдамдығы (≈)', unit: 'м/с', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; api.S.hist = []; },
    step: function (api, dt) { var S = api.S, P = api.P; S.t += dt; S.hist.push([S.t, flux(P, S.t)]); if (S.hist.length > 1500) S.hist.shift(); },
    read: function (api) { var P = api.P, d = Math.pow(PL[P.pl][1] / (P.Rs * 109), 2); return { depth: d * 100, rp: PL[P.pl][1], K: 28.4 * PL[P.pl][2] / 318 * Math.pow(P.T / 365, -1 / 3) * 0.2 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark(), ph = phase(P, S.t);
      R.scene(ctx, W, H, 'space', { count: 160 });
      // жұлдыз және планета (бүйірден көрініс: орбита эллипс түрінде)
      var cx = W / 2, cy = wide ? H * 0.28 : H * 0.2, rs = Math.min(W * 0.1, H * 0.14) * Math.sqrt(P.Rs), orb = Math.min(W * 0.4, 320);
      var px = cx + Math.sin(ph) * orb, py = cy + Math.cos(ph) * orb * 0.12, front = Math.cos(ph) > 0, rp = Math.max(2.5, rs * PL[P.pl][1] / (P.Rs * 109) * 3); // планета 3 есе үлкейтілген
      ctx.strokeStyle = 'rgba(200,210,230,.25)'; ctx.beginPath(); ctx.ellipse(cx, cy, orb, orb * 0.12, 0, 0, 7); ctx.stroke();
      function star() { var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rs * 1.8); g.addColorStop(0, '#fff6d8'); g.addColorStop(0.55, 'rgba(255,214,120,.95)'); g.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rs * 1.8, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(cx, cy, rs, 0, 7); ctx.fill(); }
      function planet() { ctx.fillStyle = P.pl === 'earth' ? '#4a8fd8' : P.pl === 'nept' ? '#5fa8c8' : '#c89a6a'; ctx.beginPath(); ctx.arc(px, py, rp, 0, 7); ctx.fill(); }
      if (front) { star(); planet(); } else { planet(); star(); }
      // жұлдыздың тербелісі (радиал жылдамдық)
      var wob = -Math.sin(ph) * 4 * Math.min(1, PL[P.pl][2] / 318); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(cx + wob, cy - rs - 12); ctx.lineTo(cx + wob, cy - rs - 4); ctx.stroke();
      R.txt(ctx, 'планета көрнекілік үшін 3 есе үлкейтілген', cx, cy + orb * 0.12 + 22, { size: 9.5, color: '#9aa4ad' });
      // жарықтылық қисығы
      var gx = 56, gy = wide ? H * 0.52 : H * 0.42, gw = W - 76, gh = (H - gy - 70) / (wide ? 1 : 1);
      ctx.save(); R.rr(ctx, gx - 48, gy - 16, gw + 60, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var depth = Math.pow(PL[P.pl][1] / (P.Rs * 109), 2), t0 = Math.max(0, S.t - 30), pts = S.hist.filter(function (h) { return h[0] >= t0; });
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: t0, xmax: t0 + 30, ymin: -Math.max(depth * 160, 0.04), ymax: Math.max(depth * 30, 0.01), xlabel: 't', ylabel: 'ΔF / F, %', series: [{ pts: pts.map(function (q) { return [q[0], (q[1] - 1) * 100]; }), color: '#e0a800', width: 2 }] });
      R.tag(ctx, 'ΔF/F = ' + (depth * 100).toFixed(depth < 0.001 ? 4 : 2).replace('.', ',') + ' %', gx + gw - 80, gy + 14, { size: 10.5, color: '#b4560f' });
    },
  });
  function phase(P, t) { return t / P.T * 2 * Math.PI; }
  function flux(P, t) { var ph = phase(P, t), d = Math.pow(PL[P.pl][1] / (P.Rs * 109), 2), x = Math.sin(ph) * 3.2 / Math.sqrt(P.Rs); if (Math.cos(ph) > 0 && Math.abs(x) < 1) return 1 - d * Math.min(1, (1 - Math.abs(x)) * 4) + (Math.random() - 0.5) * 0.00004; return 1 + (Math.random() - 0.5) * 0.00004; }
})();

/* Де Бройль толқындары: электрондар жұқа кристалл (графит) пленкасынан өткенде экранда дифракциялық сақиналар пайда болады. Үдетуші кернеу артқанда толқын ұзындығы кемиді, сақиналар кішірейеді. Бор орбитасындағы тұрғын толқын: 2πr = nλ. */
(function () {
  var R = window.Real, h = 6.626e-34, me = 9.109e-31, e = 1.602e-19;
  var D = [0.213e-9, 0.123e-9]; // графиттің жазықтықаралық қашықтықтары
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, keepRunning: true, autoplay: true,
    hint: 'Кернеуді арттырғанда сақиналардың радиусы кішірейеді: λ = h/√(2meU) кемиді. Екінші режимде Бор орбитасы бойымен тұрғын толқын тек 2πr = nλ болғанда ғана тұйықталатынын көр.',
    controls: [
      { type: 'select', key: 'mode', label: 'Көрсету', value: 'diff', options: [['diff', 'Электрондардың графиттегі дифракциясы'], ['orbit', 'Бор орбитасындағы де Бройль толқыны']], live: true },
      { type: 'range', key: 'U', label: 'Үдетуші кернеу U', min: 1, max: 10, step: 0.5, value: 4, unit: 'кВ', digits: 1 },
      { type: 'range', key: 'n', label: 'Орбита нөмірі n', min: 1, max: 6, step: 1, value: 3, digits: 0, live: true },
    ],
    readouts: [
      { key: 'lam', label: 'Толқын ұзындығы λ = h/√(2meU)', unit: 'пм', digits: 2 },
      { key: 'v', label: 'Электрон жылдамдығы', unit: 'Мм/с', digits: 1 },
      { key: 'r1', label: 'Ішкі сақина радиусы (L = 0,14 м)', unit: 'мм', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var U = api.P.U * 1e3, l = h / Math.sqrt(2 * me * e * U); return { lam: l * 1e12, v: Math.sqrt(2 * e * U / me) / 1e6, r1: 0.14 * Math.tan(2 * Math.asin(l / (2 * D[0]))) * 1000 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      if (P.mode === 'orbit') {
        var cx = W / 2, cy = H / 2, r0 = Math.min(W, H) * 0.34, n = P.n;
        ctx.save(); R.rr(ctx, 10, 10, W - 20, H - 20, 10); ctx.fillStyle = '#0d1116'; ctx.fill(); ctx.restore();
        R.sphere(ctx, cx, cy, 10, '#d2382b'); R.txt(ctx, '+', cx, cy + 1, { size: 12, color: '#fff', weight: '700' });
        ctx.strokeStyle = 'rgba(200,200,220,.3)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cx, cy, r0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        // тұрғын толқын: n толқын ұзындығы шеңберге сияды
        ctx.strokeStyle = 'rgba(111,182,255,.25)'; ctx.lineWidth = 1.2; [1, -1].forEach(function (sg) { ctx.beginPath(); for (var a2 = 0; a2 <= 2 * Math.PI + 0.01; a2 += 0.01) { var r2 = r0 + sg * 18 * Math.cos(n * a2); var x2 = cx + r2 * Math.cos(a2), y2 = cy + r2 * Math.sin(a2); if (a2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); } ctx.stroke(); });
        ctx.strokeStyle = '#6fb6ff'; ctx.lineWidth = 2.5; ctx.beginPath();
        for (var a = 0; a <= 2 * Math.PI + 0.01; a += 0.01) { var rr = r0 + 18 * Math.cos(n * a) * Math.cos(S.t * 3); var x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a); if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        R.tag(ctx, '2πrₙ = nλ  ⇒  mvrₙ = nħ (Бордың кванттау шарты)', W / 2, 28, { size: W < 600 ? 10 : 12, color: '#0b3f4a' });
        R.tag(ctx, 'n = ' + n + ': орбитаға ' + n + ' толқын ұзындығы сияды', W / 2, H - 26, { size: 11 });
        return;
      }
      var U = P.U * 1e3, lam = h / Math.sqrt(2 * me * e * U);
      // электрондық-сәулелік түтік (бүйірден)
      var tx = 20, ty = wide ? H * 0.5 : 70, tl = wide ? W * 0.46 : W - 40;
      ctx.save(); ctx.beginPath(); ctx.moveTo(tx, ty - 16); ctx.lineTo(tx + tl * 0.45, ty - 16); ctx.lineTo(tx + tl, ty - 60); ctx.lineTo(tx + tl, ty + 60); ctx.lineTo(tx + tl * 0.45, ty + 16); ctx.lineTo(tx, ty + 16); ctx.closePath(); ctx.fillStyle = 'rgba(200,230,245,.25)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,120,140,.8)'; ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(tx + 10, ty - 8, 5, 16); ctx.fillStyle = '#7d878f'; ctx.fillRect(tx + 40, ty - 14, 4, 10); ctx.fillRect(tx + 40, ty + 4, 4, 10);
      ctx.fillStyle = '#2b2f33'; ctx.fillRect(tx + tl * 0.45 - 2, ty - 10, 4, 20); R.txt(ctx, 'графит', tx + tl * 0.45, ty + 26, { size: 9.5, color: '#5b6670' });
      for (var k = 0; k < 14; k++) { var u = ((k / 14 + S.t * 0.8) % 1); ctx.fillStyle = '#6fb6ff'; ctx.beginPath(); ctx.arc(tx + 16 + u * (tl * 0.45 - 18), ty, 2.2, 0, 7); ctx.fill(); }
      var sc = 60 / 0.03; // экрандағы мм→px
      D.forEach(function (d, i) { var th = 2 * Math.asin(lam / (2 * d)), r = 0.14 * Math.tan(th) * sc; ctx.strokeStyle = 'rgba(120,255,160,.5)'; ctx.beginPath(); ctx.moveTo(tx + tl * 0.45, ty); ctx.lineTo(tx + tl, ty - Math.min(58, r)); ctx.moveTo(tx + tl * 0.45, ty); ctx.lineTo(tx + tl, ty + Math.min(58, r)); ctx.stroke(); void i; });
      R.txt(ctx, 'U = ' + P.U + ' кВ', tx + 40, ty - 30, { size: 10.5, color: '#b4342a', weight: '700' });
      // экрандағы сурет (алдыңғы көрініс)
      var sx = wide ? W * 0.75 : W / 2, sy = wide ? H / 2 : ty + 70 + (H - ty - 90) / 2, sr = wide ? Math.min(W * 0.2, H * 0.42) : Math.min(W * 0.42, (H - ty - 100) / 2);
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fillStyle = '#0b1a12'; ctx.fill(); ctx.clip();
      var g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10); g0.addColorStop(0, 'rgba(140,255,170,1)'); g0.addColorStop(1, 'rgba(140,255,170,0)'); ctx.fillStyle = g0; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, 7); ctx.fill();
      var scS = sr / 0.04; // 40 мм экран радиусы
      D.forEach(function (d, i) { var th = 2 * Math.asin(lam / (2 * d)), r = 0.14 * Math.tan(th) * scS; ctx.strokeStyle = 'rgba(140,255,170,' + (i ? 0.55 : 0.85) + ')'; ctx.lineWidth = 5 - i * 1.5; ctx.shadowColor = '#8cffaa'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.stroke(); ctx.shadowBlur = 0; });
      ctx.restore(); ctx.strokeStyle = '#59616a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.stroke();
      R.tag(ctx, 'Экран: электрондардың дифракциялық сақиналары', sx, sy - sr - 14, { size: 10 });
      R.tag(ctx, 'λ = h / p = h / √(2meU)', W / 2, H - 16, { size: 11.5, color: '#0b3f4a' });
    },
  });
})();

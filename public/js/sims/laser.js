/* Лазер: үш деңгейлі жүйе. Сорғылау (накачка) атомдарды жоғарғы деңгейге көтереді, олар метастабиль деңгейге өтеді. Инверсиялық толтырылу кезінде мәжбүрлі сәулелену лавина тәрізді күшейіп, айналар арасында когерентті шоқ пайда болады. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.2, grid: false, keepRunning: true, autoplay: true,
    hint: 'Сорғылау қуатын арттырып, метастабиль деңгейдегі атомдар саны негізгі деңгейдегіден асқанда (инверсиялық толтырылу) не болатынын бақыла.',
    controls: [
      { type: 'range', key: 'pump', label: 'Сорғылау қуаты', min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 },
      { type: 'select', key: 'type', label: 'Лазер', value: 'ruby', options: [['ruby', 'Рубин лазері (694 нм)'], ['hene', 'Гелий-неон (633 нм)'], ['green', 'Жасыл (532 нм)']] },
    ],
    readouts: [
      { key: 'n2', label: 'Метастабиль деңгейдегі атомдар үлесі', unit: '%', digits: 0 },
      { key: 'inv', label: 'Инверсиялық толтырылу', text: true },
      { key: 'out', label: 'Шығыс шоқтың қуаты (салыстырмалы)', digits: 2 },
    ],
    init: function (api) { var S = api.S, rnd = R.rng(9); S.t = 0; S.at = []; for (var i = 0; i < 60; i++) S.at.push({ x: rnd(), y: rnd(), lv: 1 }); S.ph = []; S.out = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt;
      S.at.forEach(function (a) {
        if (a.lv === 1 && Math.random() < P.pump * dt * 2.5) a.lv = 3;
        else if (a.lv === 3 && Math.random() < dt * 6) a.lv = 2;
        else if (a.lv === 2 && Math.random() < dt * 0.15) { a.lv = 1; if (Math.random() < 0.5) S.ph.push({ x: a.x, y: a.y, vx: Math.random() < 0.5 ? 1 : -1, vy: (Math.random() - 0.5) * 0.6, stim: false }); }
      });
      // мәжбүрлі сәулелену: фотон метастабиль атомға жақын өтсе, бірдей фотон туады
      var newp = [];
      S.ph.forEach(function (p) {
        p.x += p.vx * dt * 0.6; p.y += p.vy * dt * 0.6;
        if (p.x < 0 || p.x > 1) { if (Math.abs(p.vy) < 0.05) { p.vx = -p.vx; p.x = Math.max(0, Math.min(1, p.x)); if (p.x >= 1 && Math.random() < 0.1) { p.dead = true; S.out += 1; } } else p.dead = true; }
        if (p.y < 0 || p.y > 1) p.dead = true;
        S.at.forEach(function (a) { if (a.lv === 2 && Math.abs(a.x - p.x) < 0.02 && Math.abs(a.y - p.y) < 0.06 && newp.length < 40) { a.lv = 1; newp.push({ x: p.x + p.vx * 0.015, y: a.y, vx: p.vx, vy: 0, stim: true }); p.vy *= 0.2; } });
      });
      S.ph = S.ph.concat(newp).filter(function (p) { return !p.dead; }).slice(-400);
      S.out *= Math.pow(0.5, dt);
    },
    read: function (api) { var S = api.S, n = S.at.length, n2 = S.at.filter(function (a) { return a.lv === 2; }).length, n1 = S.at.filter(function (a) { return a.lv === 1; }).length; return { n2: n2 / n * 100, inv: n2 > n1 || S.out > 3 ? 'бар — генерация!' : 'жоқ', out: Math.min(1, S.out / 20) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640, dark = R.isDark(), col = P.type === 'ruby' ? [255, 60, 50] : P.type === 'hene' ? [255, 90, 60] : [60, 255, 90];
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      // кристалл және айналар
      var cx = 40, cy = 40, cw = wide ? W * 0.6 : W - 80, ch = wide ? H * 0.42 : H * 0.3;
      ctx.save(); R.rr(ctx, cx, cy, cw, ch, 12); ctx.fillStyle = P.type === 'ruby' ? 'rgba(220,80,110,.25)' : P.type === 'hene' ? 'rgba(255,150,120,.18)' : 'rgba(120,220,160,.2)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,120,140,.8)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#c3cad1'; ctx.fillRect(cx - 12, cy - 6, 8, ch + 12); ctx.fillStyle = 'rgba(195,202,209,.6)'; ctx.fillRect(cx + cw + 4, cy - 6, 8, ch + 12);
      R.txt(ctx, 'айна', cx - 8, cy + ch + 18, { size: 9.5, color: '#5b6670' }); R.txt(ctx, 'жартылай мөлдір айна', cx + cw + 8, cy + ch + 18, { size: 9.5, color: '#5b6670' });
      // сорғылау шамы
      if (P.pump > 0) { ctx.fillStyle = 'rgba(255,255,220,' + P.pump * 0.5 + ')'; ctx.fillRect(cx + 20, cy + ch + 28, cw - 40, 8); }
      S.at.forEach(function (a) { var x = cx + 10 + a.x * (cw - 20), y = cy + 8 + a.y * (ch - 16); ctx.fillStyle = a.lv === 1 ? '#59616a' : a.lv === 3 ? '#7a3fb0' : 'rgb(' + col.join(',') + ')'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); });
      S.ph.forEach(function (p) { var x = cx + 10 + p.x * (cw - 20), y = cy + 8 + p.y * (ch - 16); ctx.fillStyle = 'rgba(' + col.join(',') + ',' + (p.stim ? 0.95 : 0.6) + ')'; ctx.fillRect(x - 5, y - 1.2, 10, 2.4); });
      // шығыс шоқ
      var out = Math.min(1, S.out / 20);
      if (out > 0.02) { var gg = ctx.createLinearGradient(cx + cw + 12, 0, W, 0); gg.addColorStop(0, 'rgba(' + col.join(',') + ',' + out + ')'); gg.addColorStop(1, 'rgba(' + col.join(',') + ',' + out * 0.6 + ')'); ctx.fillStyle = gg; ctx.fillRect(cx + cw + 12, cy + ch / 2 - 3, W - cx - cw - 12, 6); }
      // деңгейлер сызбасы
      var lx = wide ? W * 0.74 : 40, ly = wide ? 40 : cy + ch + 60, lw = wide ? W * 0.22 : W - 80, lh = wide ? H * 0.5 : H - ly - 30;
      ctx.save(); R.rr(ctx, lx - 10, ly - 10, lw + 20, lh + 20, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore();
      var n = [1, 2, 3].map(function (l) { return S.at.filter(function (a) { return a.lv === l; }).length; });
      [[3, 0.1, 'E₃ (қозған)', '#7a3fb0'], [2, 0.38, 'E₂ (метастабиль)', 'rgb(' + col.join(',') + ')'], [1, 0.92, 'E₁ (негізгі)', '#59616a']].forEach(function (q) {
        var y = ly + q[1] * lh; ctx.strokeStyle = q[3]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw * 0.45, y); ctx.stroke();
        var cnt = n[q[0] - 1]; for (var k = 0; k < Math.min(cnt, 30); k++) { ctx.fillStyle = q[3]; ctx.beginPath(); ctx.arc(lx + 4 + (k % 15) * 5.5, y - 6 - Math.floor(k / 15) * 6, 2.2, 0, 7); ctx.fill(); }
        R.txt(ctx, q[2] + ': ' + cnt, lx + lw * 0.5, y, { size: 9.5, align: 'left', color: dark ? '#e6ecf0' : '#33404a' });
      });
      api.D.arrow(ctx, lx + lw * 0.1, ly + 0.92 * lh, lx + lw * 0.1, ly + 0.1 * lh, '#e0a800', 1.6, 'сорғылау');
      api.D.arrow(ctx, lx + lw * 0.32, ly + 0.38 * lh, lx + lw * 0.32, ly + 0.92 * lh, 'rgb(' + col.join(',') + ')', 2.4, 'hν');
      var las = out > 0.15 || n[1] > n[0]; R.tag(ctx, las ? 'Инверсия жетті: мәжбүрлі сәулелену басым — лазер генерациялайды' : 'Инверсия жоқ: сәулелену өздігінен, әлсіз', W / 2, H - 14, { size: W < 600 ? 9.5 : 11, color: las ? '#0b6b78' : '#b4342a' });
    },
  });
})();

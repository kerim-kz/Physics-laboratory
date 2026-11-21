/* Рентген түтігі: қыздырылған катодтан шыққан электрондар U кернеумен үдетіліп, вольфрам анодқа соғылады. Тежелу сәулесі (λ_min = hc/eU) және сипаттамалық сызықтар. Қолдың рентгенограммасы. */
(function () {
  var R = window.Real, h = 6.626e-34, c = 3e8, e = 1.602e-19, me = 9.11e-31;
  function lmin(U) { return h * c / (e * U * 1000) * 1e12; } // пм
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true, autoplay: true,
    hint: 'Кернеуді арттыр: спектрдің қысқа толқынды шекарасы λ_min қалай өзгереді? 70 кВ-тан жоғары кернеуде вольфрамның сипаттамалық сызықтары пайда болады.',
    controls: [
      { type: 'range', key: 'U', label: 'Анодтық кернеу U', min: 20, max: 120, step: 5, value: 60, unit: 'кВ', digits: 0, live: true },
      { type: 'range', key: 'I', label: 'Анод тогы (катодтың қызуы)', min: 1, max: 10, step: 1, value: 5, unit: 'мА', digits: 0, live: true },
    ],
    readouts: [
      { key: 'E', label: 'Электрон энергиясы E = eU', unit: 'кэВ', digits: 0 },
      { key: 'v', label: 'Электрон жылдамдығы (классикалық баға)', unit: 'м/с', digits: 3 },
      { key: 'lm', label: 'λ_min = hc / (eU)', unit: 'пм', digits: 2 },
      { key: 'eff', label: 'Рентгенге айналатын энергия үлесі (≈)', unit: '%', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; api.S.el = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt;
      for (var i = 0; i < P.I * 0.6; i++) if (Math.random() < 0.5) S.el.push({ x: 0, y: (Math.random() - 0.5) * 10 });
      S.el.forEach(function (p) { p.x += dt * (0.6 + P.U / 120) * 1.2; });
      S.el = S.el.filter(function (p) { return p.x < 1; });
    },
    read: function (api) {
      var U = api.P.U * 1000;
      return { E: api.P.U, v: Math.sqrt(2 * e * U / me), lm: lmin(api.P.U), eff: 1e-9 * 74 * U * 100 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, dark = R.isDark(), wide = W > 640;
      ctx.fillStyle = dark ? '#151b21' : '#e9edf0'; ctx.fillRect(0, 0, W, H);
      // түтік (шыны колба)
      var tx = wide ? W * 0.05 : W * 0.04, ty = H * 0.08, tw = wide ? W * 0.5 : W * 0.92, th = H * 0.36, cy = ty + th / 2;
      ctx.save(); R.rr(ctx, tx, ty, tw, th, th / 2);
      var gl = ctx.createLinearGradient(0, ty, 0, ty + th); gl.addColorStop(0, 'rgba(210,235,245,.55)'); gl.addColorStop(0.5, 'rgba(240,250,255,.25)'); gl.addColorStop(1, 'rgba(180,210,225,.55)');
      ctx.fillStyle = gl; ctx.fill(); ctx.strokeStyle = 'rgba(90,130,150,.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      // катод (қыздырылған спираль)
      var kx = tx + tw * 0.14, ax = tx + tw * 0.8;
      ctx.fillStyle = '#6d747b'; ctx.fillRect(tx - 10, cy - 6, kx - tx + 4, 12);
      ctx.strokeStyle = 'rgb(255,' + (120 + P.I * 10) + ',60)'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (var i = 0; i <= 30; i++) { var yy = cy - 14 + i * 28 / 30, xx = kx + Math.sin(i * 1.3) * 5; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke();
      var glow = ctx.createRadialGradient(kx, cy, 2, kx, cy, 26); glow.addColorStop(0, 'rgba(255,190,90,' + (0.25 + P.I * 0.05) + ')'); glow.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(kx, cy, 26, 0, 7); ctx.fill();
      R.tag(ctx, 'Катод (−)', kx, ty + th + 16, { size: 10.5 });
      // анод (мыс өзек + вольфрам нысана, көлбеу)
      ctx.save(); ctx.translate(ax, cy); ctx.fillStyle = '#c06c3e'; ctx.fillRect(0, -16, tx + tw - ax + 14, 32);
      ctx.fillStyle = '#7d878f'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-14, 16); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill(); ctx.restore();
      R.tag(ctx, 'Анод (+), вольфрам', ax + 20, ty + th + 16, { size: 10.5 });
      // электрондар
      ctx.fillStyle = '#5fb3ff';
      S.el.forEach(function (p) { var x = kx + 8 + p.x * (ax - kx - 16); ctx.beginPath(); ctx.arc(x, cy + p.y * (1 - p.x), 2.2, 0, 7); ctx.fill(); });
      // жоғары кернеу көзі
      R.tag(ctx, 'U = ' + P.U + ' кВ', (kx + ax) / 2, ty - 2, { size: 12, color: '#b4342a' });
      // рентген сәулесі (анодтан төмен) және қол
      var rx = ax - 6, ry = cy + 12, sy = wide ? H * 0.92 : H * 0.62;
      var I = P.I / 10 * Math.pow(P.U / 120, 2);
      ctx.save(); ctx.globalAlpha = 0.18 + 0.5 * I; var rg = ctx.createLinearGradient(0, ry, 0, sy); rg.addColorStop(0, 'rgba(150,120,255,.9)'); rg.addColorStop(1, 'rgba(150,120,255,.15)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - tw * 0.32, sy); ctx.lineTo(rx + tw * 0.06, sy); ctx.closePath(); ctx.fill(); ctx.restore();
      // рентгенограмма (экран)
      var scx = rx - tw * 0.13, sw = tw * 0.36, shh = H * 0.36, scy = sy - shh;
      if (wide) {
        ctx.fillStyle = '#0d1116'; ctx.fillRect(scx - sw / 2, scy, sw, shh);
        hand(ctx, scx, scy + shh * 0.55, shh * 0.5, P.U, I);
        R.tag(ctx, 'Рентгенограмма', scx, scy - 12, { size: 10.5 });
      }
      // спектр графигі
      var gx = wide ? W * 0.62 : W * 0.12, gy = wide ? H * 0.12 : H * 0.7, gw = wide ? W * 0.34 : W * 0.8, gh = wide ? H * 0.6 : H * 0.22;
      ctx.save(); R.rr(ctx, gx - 40, gy - 20, gw + 52, gh + 52, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore();
      var series = [], Ls = [10, 20, 40, 60, 80, 100, 120];
      [P.U].forEach(function (U) {
        var lm = lmin(U), pts = [];
        for (var l = 5; l <= 120; l += 0.5) {
          var y = l < lm ? 0 : P.I * (l / lm - 1) / Math.pow(l / lm, 3) * 5.4; // Крамерс заңына жуық
          if (U > 69.5) { y += P.I * 0.7 * Math.exp(-Math.pow((l - 21.0) / 0.6, 2)) + P.I * 0.4 * Math.exp(-Math.pow((l - 18.4) / 0.6, 2)); }
          pts.push([l, y]);
        }
        series.push({ pts: pts, color: '#7b3fe0' });
      });
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 120, ymin: 0, ymax: 12, xlabel: 'λ, пм', ylabel: 'I', series: series });
      var lmx = gx + lmin(P.U) / 120 * gw;
      ctx.strokeStyle = '#d2382b'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(lmx, gy); ctx.lineTo(lmx, gy + gh); ctx.stroke(); ctx.setLineDash([]);
      R.tag(ctx, 'λ_min = ' + Sim.fmt(lmin(P.U), 1) + ' пм', Math.min(gx + gw - 50, lmx + 52), gy + 14, { size: 10.5, color: '#b4342a' });
      if (P.U > 69.5) R.tag(ctx, 'K-сызықтары (W)', gx + 21 / 120 * gw + 40, gy + gh * 0.3, { size: 10, color: '#5a2d86' });
    },
  });
  function hand(ctx, x, y, s, U, I) {
    var soft = Math.max(0.05, 0.55 - U / 260), bone = Math.min(0.95, 0.35 + U / 200);
    ctx.save(); ctx.translate(x, y);
    // жұмсақ тін
    ctx.fillStyle = 'rgba(200,215,230,' + soft + ')';
    ctx.beginPath(); ctx.ellipse(0, s * 0.35, s * 0.42, s * 0.42, 0, 0, 7); ctx.fill();
    [[-0.36, -0.1, 0.5, -0.5], [-0.16, -0.32, 0.62, -0.12], [0.04, -0.36, 0.66, 0], [0.22, -0.3, 0.6, 0.1], [0.38, -0.12, 0.46, 0.25]].forEach(function (f) {
      ctx.save(); ctx.translate(f[0] * s, f[1] * s + s * 0.2); ctx.rotate(f[3]); R.rr(ctx, -s * 0.07, -f[2] * s, s * 0.14, f[2] * s, s * 0.07); ctx.fill();
      // сүйектер (фалангалар)
      ctx.fillStyle = 'rgba(245,248,252,' + bone + ')';
      for (var k = 0; k < 3; k++) { R.rr(ctx, -s * 0.035, -f[2] * s * (0.32 * k + 0.3), s * 0.07, f[2] * s * 0.26, s * 0.03); ctx.fill(); }
      ctx.fillStyle = 'rgba(200,215,230,' + soft + ')';
      ctx.restore();
    });
    ctx.fillStyle = 'rgba(245,248,252,' + bone + ')';
    for (var m = -2; m <= 2; m++) { ctx.save(); ctx.translate(m * s * 0.1, s * 0.3); ctx.rotate(m * 0.12); R.rr(ctx, -s * 0.03, -s * 0.2, s * 0.06, s * 0.4, s * 0.03); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
})();

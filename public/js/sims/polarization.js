/* Жарықтың поляризациясы: табиғи жарық поляризатордан өтіп, сызықты поляризацияланады; анализатордан өткен жарық қарқыны Малюс заңына бағынады: I = I₀cos²φ. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.55, aspectNarrow: 1.15, grid: false, keepRunning: true, autoplay: true,
    hint: 'Анализаторды бұрап, экрандағы жарықтың қалай өзгеретінін бақыла. Поляризатор мен анализатордың осьтері перпендикуляр болса, жарық толық сөнеді. Үшінші поляроидты ортаға қойып көр!',
    controls: [
      { type: 'range', key: 'phi', label: 'Анализатордың бұрышы φ', min: 0, max: 180, step: 5, value: 45, unit: '°', digits: 0, live: true },
      { type: 'check', key: 'mid', label: 'Ортаға үшінші поляроид (45°)', value: false, live: true },
      { type: 'check', key: 'auto', label: 'Анализаторды автоматты айналдыру', value: false, live: true },
    ],
    readouts: [
      { key: 'I1', label: 'Поляризатордан кейін I₀ (табиғи жарықтың үлесі)', unit: '%', digits: 0 },
      { key: 'I2', label: 'Анализатордан кейін I = I₀cos²φ', unit: '%', digits: 1 },
      { key: 'ang', label: 'Анализатор бұрышы', unit: '°', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; api.S.a = api.P.phi; },
    step: function (api, dt) { var S = api.S, P = api.P; S.t += dt; S.a = P.auto ? (S.a + dt * 30) % 360 : P.phi; },
    read: function (api) { var c = calc(api.P, api.S.a); return { I1: 50, I2: c.I * 100, ang: api.S.a % 360 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, c = calc(P, S.a), wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      ctx.save(); R.rr(ctx, 10, 10, W - 20, H * 0.62, 10); ctx.fillStyle = '#121820'; ctx.fill(); ctx.restore();
      var y = H * 0.33, xs = 40, xp = W * 0.28, xm = W * 0.47, xa = W * 0.66, xe = W - 50, t = S.t;
      // жарық көзі
      var gg = ctx.createRadialGradient(xs, y, 2, xs, y, 30); gg.addColorStop(0, '#fff6d0'); gg.addColorStop(1, 'rgba(255,246,208,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(xs, y, 30, 0, 7); ctx.fill();
      // тербеліс жазықтықтары: табиғи (барлық бағыт), поляризацияланған (бір бағыт)
      function waveSeg(x0, x1, angs, amp) {
        angs.forEach(function (a) {
          ctx.strokeStyle = 'rgba(255,220,120,.75)'; ctx.lineWidth = 1.6; ctx.beginPath();
          for (var x = x0; x <= x1; x += 3) { var v = Math.sin((x - t * 60) / 12) * amp, px = x - Math.sin(a) * v * 0.35, py = y - Math.cos(a) * v; if (x === x0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
          ctx.stroke();
        });
      }
      waveSeg(xs + 20, xp - 14, [0, 0.8, 1.57, 2.36], 22);
      var a1 = 0, amp1 = 22 * Math.sqrt(0.5);
      var am = 45 * Math.PI / 180, ampM = amp1 * Math.abs(Math.cos(am - a1));
      if (P.mid) { waveSeg(xp + 14, xm - 14, [a1], amp1); waveSeg(xm + 14, xa - 14, [am], ampM); }
      else waveSeg(xp + 14, xa - 14, [a1], amp1);
      var aa = S.a * Math.PI / 180;
      if (c.I > 0.005) waveSeg(xa + 14, xe - 10, [aa], 22 * Math.sqrt(c.I));
      // поляроидтар
      function polaroid(x, ang, lbl) {
        ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(90,100,120,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 60, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#c9cfd4'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-Math.sin(ang) * 10, -Math.cos(ang) * 50); ctx.lineTo(Math.sin(ang) * 10, Math.cos(ang) * 50); ctx.stroke();
        ctx.restore(); R.txt(ctx, lbl, x, y + 76, { size: 10, color: '#c9cfd4' });
      }
      polaroid(xp, 0, 'поляризатор'); if (P.mid) polaroid(xm, am, '45°'); polaroid(xa, aa, 'анализатор ' + Math.round(S.a % 360) + '°');
      // экран
      ctx.fillStyle = 'rgba(255,240,180,' + (0.08 + 0.9 * c.I) + ')'; ctx.beginPath(); ctx.ellipse(xe + 12, y, 10, 40, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#8f99a3'; ctx.stroke();
      // I(φ) графигі
      var gx = wide ? W * 0.1 : 46, gy = H * 0.7, gw = wide ? W * 0.8 : W - 62, gh = H - gy - 34;
      ctx.save(); R.rr(ctx, gx - 40, gy - 12, gw + 52, gh + 40, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var pts = []; for (var f = 0; f <= 360; f += 3) pts.push([f, calc(P, f).I * 100]);
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 360, ymin: 0, ymax: 55, xlabel: 'φ, °', ylabel: 'I, %', series: [{ pts: pts, color: '#e0a800', width: 2.5 }], marker: [S.a % 360, c.I * 100] });
      R.tag(ctx, P.mid ? 'Үш поляроид: I = (I₀/2)·cos²45°·cos²(φ − 45°)' : 'Малюс заңы: I = I₀ cos²φ', W / 2, 24, { size: W < 600 ? 10 : 12, color: '#0b3f4a' });
    },
  });
  function calc(P, a) { var f = a * Math.PI / 180, I; if (P.mid) I = 0.5 * Math.pow(Math.cos(Math.PI / 4), 2) * Math.pow(Math.cos(f - Math.PI / 4), 2); else I = 0.5 * Math.pow(Math.cos(f), 2); return { I: I }; }
})();

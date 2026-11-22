/* Жылулық сәулелену: абсолют қара дененің спектрі (Планк формуласы), Вин заңы λ_max = b/T және Стефан — Больцман заңы. Классикалық Рэлей — Джинс формуласы және «ультракүлгін апаты». */
(function () {
  var R = window.Real, h = 6.626e-34, c = 3e8, k = 1.381e-23, b = 2.898e-3, sig = 5.67e-8;
  function planck(l, T) { return 2 * h * c * c / Math.pow(l, 5) / (Math.exp(h * c / (l * k * T)) - 1); }
  function rj(l, T) { return 2 * c * k * T / Math.pow(l, 4); }
  function color(T) { // жуықтап: түсті температура
    var t = T / 100, r, g, bl;
    r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.133); g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755); bl = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305;
    return [r, g, bl].map(function (v) { return Math.max(0, Math.min(255, Math.round(v))); });
  }
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, static: true,
    hint: 'Температураны арттырғанда сәулелену максимумы қысқа толқындарға қарай ығысады (Вин заңы), ал толық сәулелену T⁴-ке пропорционал өседі. Классикалық теория неге «ультракүлгін апатына» әкеледі?',
    controls: [
      { type: 'range', key: 'T', label: 'Температура T', min: 1000, max: 10000, step: 100, value: 5800, unit: 'К', digits: 0 },
      { type: 'check', key: 'rj', label: 'Классикалық Рэлей — Джинс қисығы', value: true },
      { type: 'check', key: 'cmp', label: '3000 К қисығымен салыстыру', value: true },
    ],
    readouts: [
      { key: 'lm', label: 'Вин заңы λ<sub>max</sub> = b/T', unit: 'нм', digits: 0 },
      { key: 'Re', label: 'Энергетикалық жарқырау σT⁴', unit: 'МВт/м²', digits: 2 },
      { key: 'ex', label: 'Мысал', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var T = api.P.T; return { lm: b / T * 1e9, Re: sig * Math.pow(T, 4) / 1e6, ex: T < 1800 ? 'қызыл шоқ' : T < 3200 ? 'қыздыру шамының қылы' : T < 6500 ? 'Күн беті (≈ 5800 К)' : 'ыстық көгілдір жұлдыз' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, T = P.T, wide = W > 640, dark = R.isDark(), col = color(T);
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      // сәуле шығаратын дене
      var bx = wide ? W * 0.12 : W * 0.5, by = wide ? H * 0.4 : 70, br = wide ? Math.min(W * 0.07, 60) : 40;
      var gg = ctx.createRadialGradient(bx, by, 2, bx, by, br * 2.2); gg.addColorStop(0, 'rgba(' + col.join(',') + ',1)'); gg.addColorStop(0.45, 'rgba(' + col.join(',') + ',.8)'); gg.addColorStop(1, 'rgba(' + col.join(',') + ',0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(bx, by, br * 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgb(' + col.join(',') + ')'; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
      R.tag(ctx, T + ' К', bx, by + br + 22, { size: 11 });
      // спектр графигі
      var gx = wide ? W * 0.3 : 52, gy = wide ? 26 : by + br + 50, gw = wide ? W * 0.66 : W - 70, gh = wide ? H - 80 : H - gy - 50;
      ctx.save(); R.rr(ctx, gx - 46, gy - 16, gw + 58, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var lmax = 3000, ymax = planck(b / 10000, 10000) * 1.05 * Math.pow(T / 10000, 5) * 1.1, pts = [], pr = [], p3 = [];
      for (var l = 50; l <= lmax; l += 10) { var L = l * 1e-9; pts.push([l, planck(L, T)]); if (P.rj) pr.push([l, Math.min(rj(L, T), ymax * 3)]); if (P.cmp) p3.push([l, planck(L, 3000)]); }
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: lmax, ymin: 0, ymax: ymax, xlabel: 'λ, нм', ylabel: 'r(λ, T)', series: [{ pts: p3, color: 'rgba(224,118,27,.8)', dash: [5, 4], width: 1.6 }, { pts: pr, color: '#7a3fb0', dash: [6, 4], width: 2 }, { pts: pts, color: '#d2382b', width: 2.8 }] });
      // көрінетін диапазон
      for (var v = 380; v <= 750; v += 4) { var c2 = vis(v); ctx.fillStyle = 'rgba(' + c2.join(',') + ',.18)'; ctx.fillRect(o.X(v), gy, o.X(v + 4) - o.X(v) + 0.5, gh); }
      // Planck қисығының астын бояу
      ctx.fillStyle = 'rgba(210,56,43,.12)'; ctx.beginPath(); ctx.moveTo(o.X(50), o.Y(0)); pts.forEach(function (p) { ctx.lineTo(o.X(p[0]), o.Y(Math.min(p[1], ymax))); }); ctx.lineTo(o.X(lmax), o.Y(0)); ctx.closePath(); ctx.fill();
      var lm = b / T * 1e9; ctx.strokeStyle = '#0b8a7a'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(o.X(lm), gy); ctx.lineTo(o.X(lm), gy + gh); ctx.stroke(); ctx.setLineDash([]);
      R.tag(ctx, 'λmax = ' + Math.round(lm) + ' нм', o.X(lm) + 50, gy + 16, { size: 10, color: '#0b6b78' });
      if (P.rj) R.tag(ctx, 'Рэлей — Джинс: ∞ (ультракүлгін апаты)', o.X(380) + 120, gy + 40, { size: 10, color: '#7a3fb0' });
      R.txt(ctx, 'аудан ~ σT⁴', o.X(lm * 1.4) + 20, o.Y(ymax * 0.25), { size: 10.5, weight: '700', color: '#b4342a' });
    },
  });
  function vis(l) { var r = 0, g = 0, bb = 0; if (l < 440) { r = -(l - 440) / 60; bb = 1; } else if (l < 490) { g = (l - 440) / 50; bb = 1; } else if (l < 510) { g = 1; bb = -(l - 510) / 20; } else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = -(l - 645) / 65; } else r = 1; return [Math.round(r * 255), Math.round(g * 255), Math.round(bb * 255)]; }
})();

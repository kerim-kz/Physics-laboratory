/* Жұлдыздың түсі мен температурасы: абсолют қара дененің сәулеленуі (Планк заңы), λmax = b/T (Вин), L = 4πR²σT⁴. */
(function () {
  var B = 2.898e-3, TSUN = 5772;
  function planck(lnm, T) { var l = lnm * 1e-9, h = 6.626e-34, c = 3e8, k = 1.381e-23; return (2 * h * c * c) / Math.pow(l, 5) / (Math.exp(h * c / (l * k * T)) - 1); }
  function rgb(nm) {
    var r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else r = 1;
    return [r, g, b];
  }
  // Жұлдыздың түсі: көрінетін спектрді интегралдап, жарықтықты қалыпқа келтіреміз.
  function starColor(T) {
    var s = [0, 0, 0];
    for (var nm = 400; nm <= 700; nm += 10) { var w = planck(nm, T), c = rgb(nm); s[0] += w * c[0]; s[1] += w * c[1]; s[2] += w * c[2]; }
    var m = Math.max(s[0], s[1], s[2]);
    return 'rgb(' + s.map(function (v) { return Math.round(255 * Math.pow(v / m, 0.6)); }).join(',') + ')';
  }
  function cls(T) { return T >= 30000 ? 'O (көгілдір)' : T >= 10000 ? 'B (көкшіл-ақ)' : T >= 7500 ? 'A (ақ)' : T >= 6000 ? 'F (сарғыш-ақ)' : T >= 5200 ? 'G (сары, Күн сияқты)' : T >= 3700 ? 'K (қызғылт сары)' : 'M (қызыл)'; }
  Sim.create({
    aspect: 0.62, static: true, resetLabel: false, grid: false,
    hint: 'Температура артқанда сәулеленудің шыңы қалай жылжиды?',
    controls: [
      { type: 'range', key: 'T', label: 'Беттің температурасы T', min: 2500, max: 30000, step: 100, value: 5800, unit: 'К', digits: 0 },
      { type: 'range', key: 'R', label: 'Радиусы (Күн радиусымен)', min: 0.1, max: 20, step: 0.1, value: 1, digits: 1 },
      { type: 'select', key: 'preset', label: 'Белгілі жұлдыз', value: 'none', options: [['none', '—'], ['sun', 'Күн (5772 К)'], ['betel', 'Бетельгейзе (≈3600 К)'], ['sirius', 'Сириус A (≈9900 К)'], ['rigel', 'Ригель (≈12 000 К)']] },
    ],
    readouts: [
      { key: 'lm', label: 'λmax = b/T', unit: 'нм', digits: 0 },
      { key: 'cls', label: 'Спектрлік класы' },
      { key: 'L', label: 'Жарқырауы L/L☉', digits: 2 },
      { key: 'band', label: 'Шыңы қай аймақта' },
    ],
    init: function () {},
    onLive: function (api, key) {
      if (key !== 'preset') return;
      var p = { sun: [5772, 1], betel: [3600, 20], sirius: [9900, 1.7], rigel: [12000, 20] }[api.P.preset];
      if (p) { api.set('T', p[0]); api.set('R', p[1]); }
    },
    step: function () {},
    read: function (api) {
      var P = api.P, lm = B / P.T * 1e9;
      return { lm: lm, cls: cls(P.T), L: P.R * P.R * Math.pow(P.T / TSUN, 4), band: lm < 380 ? 'ультракүлгін' : lm > 750 ? 'инфрақызыл' : 'көрінетін жарық' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D;
      ctx.fillStyle = '#070d18'; ctx.fillRect(0, 0, W, H);
      // жұлдыз
      var sx = W * 0.17, sy = H * 0.42, r = Math.max(10, Math.min(W * 0.12, 22 * Math.sqrt(P.R) + 8)), col = starColor(P.T);
      var g = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 2.4);
      g.addColorStop(0, col); g.addColorStop(0.42, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r * 2.4, 0, Math.PI * 2); ctx.fill();
      D.text(ctx, api.fmt(P.T, 0) + ' К', sx, sy + r * 2.4 + 14, { size: 13, align: 'center', color: '#e9f1f8', weight: '600', mono: true });
      // Планк қисығы
      var lmax = B / P.T * 1e9, peak = planck(lmax, P.T), pts = [];
      for (var nm = 100; nm <= 2000; nm += 10) pts.push([nm, planck(nm, P.T) / peak]);
      var rr = { x: W * 0.4, y: 34, w: W * 0.56, h: H - 90 };
      var gp = D.plot(ctx, rr, { xmin: 100, xmax: 2000, ymin: 0, ymax: 1.1, xlabel: 'λ, нм', ylabel: 'сәулелену қарқыны (шыңы = 1)', series: [] });
      // көрінетін аймақ — кемпірқосақ жолағы, оның үстінен Планк қисығы
      for (var v = 380; v <= 750; v += 2) { var c = rgb(v); ctx.fillStyle = 'rgba(' + c.map(function (x) { return Math.round(255 * x); }).join(',') + ',.35)'; ctx.fillRect(gp.X(v), rr.y, Math.max(1, gp.X(v + 2) - gp.X(v)) + 0.5, rr.h); }
      ctx.save(); ctx.beginPath(); ctx.rect(rr.x, rr.y, rr.w, rr.h); ctx.clip();
      ctx.strokeStyle = '#ffd25e'; ctx.lineWidth = 2.5; ctx.beginPath();
      pts.forEach(function (p, i) { if (i) ctx.lineTo(gp.X(p[0]), gp.Y(p[1])); else ctx.moveTo(gp.X(p[0]), gp.Y(p[1])); });
      ctx.stroke(); ctx.restore();
      D.line(ctx, gp.X(Math.min(2000, lmax)), rr.y, gp.X(Math.min(2000, lmax)), rr.y + rr.h, '#ff8f6b', 1.5, [5, 4]);
      D.text(ctx, 'λmax = ' + api.fmt(lmax, 0) + ' нм', gp.X(Math.min(1900, lmax)) + 6, rr.y + 16, { size: 12, color: '#ff8f6b', weight: '600' });
      D.text(ctx, 'көрінетін аймақ', gp.X(565), rr.y + rr.h - 8, { size: 10, align: 'center', color: '#c4d3e0' });
    },
  });
})();

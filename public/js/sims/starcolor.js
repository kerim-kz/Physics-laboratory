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
      { type: 'range', key: 'R', label: 'Радиусы R/R☉ (логарифмдік шкала)', min: 0.1, max: 1000, step: 0.01, value: 1, log: true, format: function (v) { return v < 10 ? v.toFixed(2).replace('.', ',') : String(Math.round(v)); } },
      { type: 'select', key: 'preset', label: 'Белгілі жұлдыз', value: 'none', options: [['none', '—'], ['sun', 'Күн (5772 К)'], ['proxima', 'Проксима Центавра (≈3040 К)'], ['betel', 'Бетельгейзе (≈3600 К)'], ['sirius', 'Сириус A (≈9940 К)'], ['vega', 'Вега (≈9600 К)'], ['rigel', 'Ригель (≈12 100 К)']] },
    ],
    readouts: [
      { key: 'lm', label: 'λmax = b/T', unit: 'нм', digits: 0 },
      { key: 'cls', label: 'Спектрлік класы' },
      { key: 'L', label: 'Жарқырауы L/L☉ = (R/R☉)²(T/T☉)⁴' },
      { key: 'band', label: 'Шыңы қай аймақта' },
    ],
    init: function () {},
    onLive: function (api, key) {
      if (key !== 'preset') return;
      // беттің температурасы (К) және радиусы (R☉) — анықтамалық мәндер (жуықтап)
      var p = { sun: [5772, 1], proxima: [3040, 0.154], betel: [3600, 760], sirius: [9940, 1.71], vega: [9600, 2.36], rigel: [12100, 79] }[api.P.preset];
      if (p) { api.set('T', p[0]); api.set('R', p[1]); }
    },
    step: function () {},
    read: function (api) {
      var P = api.P, lm = B / P.T * 1e9;
      var L = P.R * P.R * Math.pow(P.T / TSUN, 4);
      return { lm: lm, cls: cls(P.T), L: L >= 1000 ? Math.round(L).toLocaleString('ru-RU') : L >= 0.01 ? api.fmt(L, L < 10 ? 2 : 0) : L.toExponential(1).replace('.', ','), band: lm < 380 ? 'ультракүлгін' : lm > 750 ? 'инфрақызыл' : 'көрінетін жарық' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D;
      var R = window.Real;
      R.scene(ctx, W, H, 'space', { seed: 9, count: 160 });
      // жұлдыз: өлшемі логарифмдік масштабпен, жиегі күңгірттенген (лимб), бетінде грануляция
      var sx = W * 0.19, sy = H * 0.44, lg = Math.log(P.R) / Math.LN10;
      var scale = function (rad) { return Math.max(5, Math.min(W * 0.15, 9 + 15 * (Math.log(rad) / Math.LN10 + 1))); };
      var r = scale(P.R), col = starColor(P.T), rgbv = col.match(/\d+/g).map(Number);
      var halo = ctx.createRadialGradient(sx, sy, r * 0.8, sx, sy, r * 2.6);
      halo.addColorStop(0, 'rgba(' + rgbv.join(',') + ',.55)'); halo.addColorStop(1, 'rgba(' + rgbv.join(',') + ',0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sx, sy, r * 2.6, 0, 7); ctx.fill();
      var body = ctx.createRadialGradient(sx - r * 0.15, sy - r * 0.15, r * 0.05, sx, sy, r);
      body.addColorStop(0, 'rgb(' + rgbv.map(function (v) { return Math.min(255, v + 60); }).join(',') + ')');
      body.addColorStop(0.7, col);
      body.addColorStop(1, 'rgb(' + rgbv.map(function (v) { return Math.round(v * 0.55); }).join(',') + ')');
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
      if (r > 14) {
        ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.clip();
        var rnd = R.rng(7);
        for (var i = 0; i < 160; i++) { var a = rnd() * 7, d = Math.sqrt(rnd()) * r * 0.95, gs = 1 + rnd() * r * 0.05; ctx.fillStyle = i % 5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d, gs, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      // салыстыру үшін Күннің өлшемі (сол масштабта)
      if (Math.abs(lg) > 0.05) {
        var rs = scale(1);
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,214,94,.8)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sx, sy, rs, 0, 7); ctx.stroke(); ctx.restore();
        D.text(ctx, 'Күн', sx + rs * 0.72 + 3, sy - rs * 0.72 - 3, { size: 10, color: '#ffd25e' });
      }
      R.tag(ctx, api.fmt(P.T, 0) + ' К · ' + cls(P.T).split(' ')[0] + ' класы', sx, Math.min(H - 40, sy + Math.max(r, scale(1)) + 26), { size: 12, mono: true });
      D.text(ctx, 'Өлшемдер логарифмдік масштабта', 10, H - 10, { size: 10, color: '#9fb3c8' });
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

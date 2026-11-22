/* Жарық жылдамдығын Физо әдісімен өлшеу (1849): тісті дөңгелек жарықты импульстерге бөледі, жарық L қашықтықтағы айнадан шағылып қайтады. Белгілі айналу жиілігінде қайтқан жарық тіске тіреліп, бақылаушы жарық көрмейді. */
(function () {
  var R = window.Real, c = 3e8;
  Sim.create({
    aspect: 0.55, aspectNarrow: 1.0, grid: false, keepRunning: true, autoplay: true,
    hint: 'Дөңгелектің айналу жиілігін біртіндеп арттыр. Бақылаушы жарықты бірінші рет көрмей қалатын жиілікті тап да, c = 4LNν формуласымен жарық жылдамдығын есепте.',
    controls: [
      { type: 'range', key: 'nu', label: 'Дөңгелектің айналу жиілігі ν', min: 0, max: 30, step: 0.5, value: 6, unit: 'айн/с', digits: 1, live: true },
      { type: 'range', key: 'N', label: 'Тістер саны N', min: 360, max: 1440, step: 360, value: 720, digits: 0 },
      { type: 'range', key: 'L', label: 'Айнаға дейінгі қашықтық L', min: 4, max: 12, step: 0.5, value: 8.6, unit: 'км', digits: 1 },
    ],
    readouts: [
      { key: 'tl', label: 'Жарықтың барып-қайту уақыты 2L/c', unit: 'мкс', digits: 2 },
      { key: 'tt', label: 'Тістің ығысу уақыты 1/(2Nν)', unit: 'мкс', digits: 2 },
      { key: 'Ib', label: 'Бақылаушыға келетін жарық', unit: '%', digits: 0 },
      { key: 'nu1', label: 'Бірінші қараңғылану жиілігі c/(4LN)', unit: 'айн/с', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var P = api.P, b = bright(P); return { tl: 2 * P.L * 1e3 / c * 1e6, tt: P.nu > 0 ? 1 / (2 * P.N * P.nu) * 1e6 : null, Ib: b * 100, nu1: c / (4 * P.L * 1e3 * P.N) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, b = bright(P), wide = W > 640;
      R.scene(ctx, W, H, 'outdoor', { ground: H * 0.78, clouds: true });
      var gy = H * 0.78, y = gy - 70, xs = wide ? W * 0.1 : W * 0.1, xw = wide ? W * 0.24 : W * 0.3, xm = W * 0.93;
      // жарық көзі және жартылай мөлдір пластина
      R.block(ctx, xs - 24, y - 70, 40, 40, 'steel', { depth: 3 }); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(xs - 4, y - 50, 8, 0, 7); ctx.fill(); R.tag(ctx, 'шам', xs - 4, y - 88, { size: 10 });
      ctx.strokeStyle = 'rgba(160,200,230,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xs - 14, y - 12); ctx.lineTo(xs + 14, y + 12); ctx.stroke();
      // бақылаушы көзі
      R.tag(ctx, 'бақылаушы', xs - 34, y, { size: 10 });
      ctx.strokeStyle = 'rgba(255,230,120,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xs - 4, y - 42); ctx.lineTo(xs, y); ctx.stroke();
      // тісті дөңгелек
      var rr = Math.min(48, H * 0.12), ang = S.t * P.nu * 2 * Math.PI * 0.02; // көзге көрінетін баяулатылған айналу
      ctx.save(); ctx.translate(xw, y + rr - 6);
      ctx.fillStyle = '#7d878f'; ctx.beginPath(); ctx.arc(0, 0, rr - 10, 0, 7); ctx.fill();
      var nt = 24; for (var k = 0; k < nt; k++) { var a = ang + k * 2 * Math.PI / nt; ctx.save(); ctx.rotate(a); ctx.fillStyle = '#5b636b'; ctx.fillRect(-4, -rr, 8, 12); ctx.restore(); }
      ctx.fillStyle = '#2b2f33'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
      ctx.restore();
      R.tag(ctx, 'тісті дөңгелек', xw, y + 2 * rr + 10, { size: 10 });
      // сәуле: шыққан (импульстер) және қайтқан
      var pulse = function (u) { return (Math.floor(u * 24 - S.t * 3) % 2 + 2) % 2 === 0; };
      ctx.lineWidth = 3;
      for (var px = xs; px < xm; px += 6) { if (px > xw && !pulse(px / W)) continue; ctx.strokeStyle = 'rgba(255,220,90,.85)'; ctx.beginPath(); ctx.moveTo(px, y - 3); ctx.lineTo(px + 4, y - 3); ctx.stroke(); }
      for (var px2 = xm; px2 > xw; px2 -= 6) { if (!pulse(px2 / W + 0.5)) continue; ctx.strokeStyle = 'rgba(255,200,70,' + (0.4 + 0.5 * b) + ')'; ctx.beginPath(); ctx.moveTo(px2, y + 3); ctx.lineTo(px2 - 4, y + 3); ctx.stroke(); }
      if (b > 0.05) { ctx.strokeStyle = 'rgba(255,200,70,' + b + ')'; ctx.beginPath(); ctx.moveTo(xw, y + 3); ctx.lineTo(xs + 2, y + 3); ctx.stroke(); }
      // алыстағы айна
      R.block(ctx, xm, y - 30, 10, 60, 'aluminum', { depth: 3 }); R.tag(ctx, 'айна', xm - 10, y - 46, { size: 10 });
      R.tag(ctx, 'L = ' + P.L.toFixed(1).replace('.', ',') + ' км', (xw + xm) / 2, y - 24, { size: 11 });
      // бақылаушы көретін жарықтылық
      ctx.save(); R.rr(ctx, 14, 14, wide ? 230 : W - 28, 54, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
      var gg = ctx.createRadialGradient(46, 41, 2, 46, 41, 20); gg.addColorStop(0, 'rgba(255,235,140,' + b + ')'); gg.addColorStop(1, 'rgba(255,235,140,0)'); ctx.fillStyle = '#1b2329'; ctx.beginPath(); ctx.arc(46, 41, 18, 0, 7); ctx.fill(); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(46, 41, 18, 0, 7); ctx.fill();
      R.txt(ctx, b < 0.08 ? 'Қараңғы! Жарық тіске тірелді' : 'Бақылаушы жарықты көреді', 76, 41, { size: 11, weight: '700', align: 'left', color: b < 0.08 ? '#b4342a' : '#0b6b78' });
      R.tag(ctx, 'c = 4LNν', W / 2, H - 16, { size: 12, color: '#0b3f4a' });
    },
  });
  // Бақылаушыға жететін жарық үлесі: тістер арасынан шыққан жарық қайтқанда дөңгелек ν·2L/c айналым жасайды
  function bright(P) { if (P.nu <= 0) return 1; var turns = P.nu * 2 * P.L * 1e3 / c * P.N, frac = turns - Math.floor(turns); return Math.pow(Math.cos(Math.PI * frac), 2); }
})();

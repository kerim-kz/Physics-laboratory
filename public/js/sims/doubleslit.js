/* Жарықтың корпускулалық-толқындық табиғаты: екі саңылаулы тәжірибе. Фотондар (электрондар) экранға жеке-жеке нүкте болып түседі, бірақ көп бөлшектен интерференциялық сурет жиналады. Қай саңылаудан өткенін бақылағанда интерференция жоғалады. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.15, grid: false, keepRunning: true, autoplay: true,
    hint: 'Бөлшектер бір-бірлеп ұшады, әрқайсысы экранда бір нүкте қалдырады. Бірақ мыңдаған нүктеден интерференциялық жолақтар пайда болады! Детекторды қоссаң не болады?',
    controls: [
      { type: 'range', key: 'rate', label: 'Бөлшектер ағыны', min: 5, max: 300, step: 5, value: 80, unit: '1/с', digits: 0 },
      { type: 'range', key: 'd', label: 'Саңылаулар арасы', min: 2, max: 8, step: 0.5, value: 4, digits: 1 },
      { type: 'check', key: 'det', label: 'Қай саңылаудан өткенін бақылау (детектор)', value: false },
      { type: 'select', key: 'part', label: 'Бөлшек', value: 'ph', options: [['ph', 'Фотон'], ['el', 'Электрон']] },
    ],
    readouts: [
      { key: 'n', label: 'Тіркелген бөлшектер саны', digits: 0 },
      { key: 'pic', label: 'Экрандағы сурет', text: true },
    ],
    init: function (api) { api.S.hits = []; api.S.fly = []; api.S.acc = 0; api.S.hist = new Array(120).fill(0); },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.acc += dt * P.rate;
      while (S.acc >= 1) { S.acc -= 1; var y = sample(P), slit = Math.random() < 0.5 ? -1 : 1; S.fly.push({ u: 0, y: y, s: slit }); }
      S.fly.forEach(function (f) { f.u += dt * 1.5; });
      S.fly = S.fly.filter(function (f) { if (f.u >= 1) { S.hits.push(f.y); var b = Math.floor((f.y + 1) / 2 * 120); if (b >= 0 && b < 120) S.hist[b]++; return false; } return true; });
      if (S.hits.length > 6000) S.hits.splice(0, S.hits.length - 6000);
    },
    read: function (api) { var n = api.S.hist.reduce(function (a, b) { return a + b; }, 0); return { n: n, pic: n < 60 ? 'кездейсоқ нүктелер' : api.P.det ? 'екі жолақ (интерференция жоқ)' : 'интерференциялық жолақтар' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640;
      R.scene(ctx, W, H, 'wall');
      ctx.save(); R.rr(ctx, 10, 10, W - 20, H - 20, 10); ctx.fillStyle = '#0d1116'; ctx.fill(); ctx.restore();
      var xs = 50, xw = W * 0.35, xe = wide ? W * 0.72 : W * 0.78, cy = H / 2, sh = H * 0.8, sep = P.d * 9, sw = 6;
      // көз
      R.block(ctx, xs - 20, cy - 14, 34, 28, 'steel', { depth: 2, shadow: false }); R.txt(ctx, P.part === 'ph' ? 'лазер' : 'электрон зеңбірегі', xs, cy + 28, { size: 9.5, color: '#c9cfd4' });
      // саңылаулы қалқа
      ctx.fillStyle = '#59616a'; ctx.fillRect(xw - 4, cy - sh / 2, 8, sh / 2 - sep / 2 - sw); ctx.fillRect(xw - 4, cy - sep / 2 + sw, 8, sep - 2 * sw); ctx.fillRect(xw - 4, cy + sep / 2 + sw, 8, sh / 2 - sep / 2 - sw);
      if (P.det) { [-1, 1].forEach(function (s) { ctx.fillStyle = '#e0761b'; ctx.beginPath(); ctx.arc(xw + 16, cy + s * sep / 2, 6, 0, 7); ctx.fill(); }); R.txt(ctx, 'детектор', xw + 40, cy - sep / 2 - 16, { size: 9.5, color: '#ffb070' }); }
      // ұшып бара жатқан бөлшектер
      var col = P.part === 'ph' ? '#ffe066' : '#6fb6ff';
      S.fly.forEach(function (f) {
        var x, y;
        if (f.u < 0.4) { x = xs + 14 + (xw - xs - 14) * f.u / 0.4; y = cy; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y + (f.s * sep / 2) * (f.u / 0.4), 2.5, 0, 7); ctx.fill(); }
        else { var v = (f.u - 0.4) / 0.6; x = xw + (xe - xw) * v; y = cy + f.s * sep / 2 * (1 - v) + f.y * sh / 2 * v; if (!P.det) { ctx.strokeStyle = 'rgba(255,224,102,.12)'; ctx.beginPath(); ctx.arc(xw, cy, (xe - xw) * v, -0.8, 0.8); ctx.stroke(); } ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); }
      });
      // экран және соққылар
      ctx.fillStyle = '#1b2329'; ctx.fillRect(xe, cy - sh / 2, 14, sh);
      var showN = Math.min(S.hits.length, 4000);
      for (var i = S.hits.length - showN; i < S.hits.length; i++) { var hy = cy + S.hits[i] * sh / 2, hx = xe + 2 + ((i * 7919) % 10); ctx.fillStyle = P.part === 'ph' ? 'rgba(255,230,120,.75)' : 'rgba(120,190,255,.75)'; ctx.fillRect(hx, hy, 1.6, 1.6); }
      // гистограмма
      var hx0 = xe + 22, hw = W - 30 - hx0, mx = Math.max(5, Math.max.apply(null, S.hist));
      S.hist.forEach(function (c, k) { var y = cy - sh / 2 + k / 120 * sh, w = c / mx * hw; ctx.fillStyle = 'rgba(120,200,255,.6)'; ctx.fillRect(hx0, y, w, sh / 120 + 0.5); });
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (var j = 0; j <= 120; j++) { var yv = -1 + 2 * j / 120, pv = prob(P, yv), y2 = cy - sh / 2 + j / 120 * sh; var xv = hx0 + pv / probMax(P) * hw * 0.95; if (j) ctx.lineTo(xv, y2); else ctx.moveTo(xv, y2); }
      ctx.stroke();
      R.txt(ctx, 'ықтималдық |ψ|²', hx0 + hw / 2, cy + sh / 2 + 10, { size: 9.5, color: '#c9cfd4' });
      R.tag(ctx, P.det ? 'Бақылау толқындық қасиетті «жояды»' : 'Әр бөлшек — нүкте, бірақ таралуы — толқын', W / 2, 26, { size: W < 600 ? 10 : 12, color: '#0b3f4a' });
    },
  });
  function prob(P, y) { var env = Math.pow(Math.cos(y * 1.3), 2) * Math.exp(-y * y * 1.2); if (P.det) { var a = Math.exp(-Math.pow((y - 0.12) * 4, 2)), b = Math.exp(-Math.pow((y + 0.12) * 4, 2)); return 0.6 * (a + b) * env + 0.02; } return env * Math.pow(Math.cos(y * P.d * 3.2), 2) + 0.005; }
  function probMax(P) { var m = 0; for (var y = -1; y <= 1; y += 0.01) m = Math.max(m, prob(P, y)); return m; }
  function sample(P) { var m = probMax(P); for (var k = 0; k < 500; k++) { var y = Math.random() * 2 - 1; if (Math.random() * m < prob(P, y)) return y; } return 0; }
})();

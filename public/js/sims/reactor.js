/* Ядролық реактор: басқарушы стерженьдер нейтрондардың көбею коэффициентін k өзгертеді. k = 1 — тұрақты қуат, k > 1 — қуат өседі, k < 1 — реакция өшеді. Апаттық қорғаныс (стерженьдер толық түседі). */
(function () {
  var R = window.Real;
  function kOf(P, S) { var rod = S.scram ? 100 : P.rod; return 1.06 - 0.12 * rod / 100 - 0.0004 * Math.max(0, S.T - 300); } // температура өссе, k азаяды (теріс кері байланыс)
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true,
    hint: 'Басқарушы стерженьдерді баяу көтеріп, k = 1 болатын күйді тап. Қуат 120 %-дан асса, апаттық қорғаныс іске қосылады.',
    controls: [
      { type: 'range', key: 'rod', label: 'Басқарушы стерженьдердің батырылуы', min: 0, max: 100, step: 1, value: 50, unit: '%', digits: 0, live: true },
      { type: 'check', key: 'cool', label: 'Жылу тасығыш (су) айналады', value: true, live: true },
    ],
    buttons: [{ label: 'Апаттық қорғаныс (АЗ)', onClick: function (api) { api.S.scram = true; } }, { label: 'Қорғанысты қайтару', onClick: function (api) { api.S.scram = false; } }],
    readouts: [
      { key: 'k', label: 'Көбею коэффициенті k', digits: 4 },
      { key: 'Pw', label: 'Қуат (номиналдан)', unit: '%', digits: 1 },
      { key: 'T', label: 'Белсенді аймақтың температурасы', unit: '°C', digits: 0 },
      { key: 'st', label: 'Күй', text: true },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.N = 50; S.T = 300; S.scram = false; S.hist = [[0, 50]]; S.n = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P, k = kOf(P, S);
      S.N = Math.max(0.01, S.N * Math.exp((k - 1) * dt * 6)); // ұрпақ уақыты баяулатылған (кешіккен нейтрондар)
      var heat = S.N * 0.08, cool = P.cool ? (S.T - 280) * 0.45 : (S.T - 280) * 0.03;
      S.T += (heat - cool) * dt * 1.2;
      if (S.N > 120 && !S.scram) S.scram = true;
      S.t += dt; S.hist.push([S.t, Math.min(200, S.N)]); if (S.hist.length > 600) S.hist.shift();
      // нейтрондар (көрнекілік)
      for (var i = 0; i < Math.min(8, S.N * 0.05); i++) S.n.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), life: 0 });
      S.n.forEach(function (q) { q.x += q.vx * dt * 0.6; q.y += q.vy * dt * 0.6; q.life += dt; });
      S.n = S.n.filter(function (q) { return q.life < 0.5 && q.x > 0 && q.x < 1 && q.y > 0 && q.y < 1; });
    },
    read: function (api) {
      var S = api.S, k = kOf(api.P, S);
      var st = S.scram ? 'АПАТТЫҚ ҚОРҒАНЫС: стерженьдер түсірілді' : Math.abs(k - 1) < 0.002 ? 'k ≈ 1: тұрақты (басқарылатын) реакция' : k > 1 ? 'k > 1: қуат өсуде' : 'k < 1: реакция өшуде';
      return { k: k, Pw: S.N, T: S.T, st: st };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, dark = R.isDark(), wide = W > 640;
      ctx.fillStyle = dark ? '#11161b' : '#dfe5e9'; ctx.fillRect(0, 0, W, H);
      // реактор корпусы (тік қима)
      var rx = wide ? W * 0.06 : W * 0.06, ry = H * 0.08, rw = wide ? W * 0.42 : W * 0.88, rh = wide ? H * 0.84 : H * 0.56;
      R.block(ctx, rx, ry, rw, rh, 'concrete', { depth: 10 });
      var ix = rx + 18, iy = ry + 18, iw = rw - 36, ih = rh - 36;
      var cher = Math.min(1, S.N / 120);
      var wg = ctx.createLinearGradient(0, iy, 0, iy + ih); wg.addColorStop(0, 'rgba(60,140,220,' + (0.55 + cher * 0.3) + ')'); wg.addColorStop(1, 'rgba(30,90,180,.9)');
      ctx.fillStyle = wg; ctx.fillRect(ix, iy, iw, ih);
      // Черенков сәулесі
      var cg = ctx.createRadialGradient(ix + iw / 2, iy + ih * 0.62, 10, ix + iw / 2, iy + ih * 0.62, iw * 0.6);
      cg.addColorStop(0, 'rgba(120,200,255,' + (cher * 0.75) + ')'); cg.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = cg; ctx.fillRect(ix, iy, iw, ih);
      // жылу бөлетін элементтер (отын) және стерженьдер
      var n = 7, gap = iw / (n + 1), fy = iy + ih * 0.32, fh = ih * 0.6, rod = S.scram ? 100 : P.rod;
      for (var i = 1; i <= n; i++) {
        var x = ix + i * gap;
        if (i % 2) { ctx.fillStyle = '#4d5a3a'; ctx.fillRect(x - 6, fy, 12, fh); ctx.fillStyle = 'rgba(160,255,120,' + (0.2 + cher * 0.5) + ')'; ctx.fillRect(x - 3, fy + 4, 6, fh - 8); }
        else { var depth = fh * rod / 100; ctx.fillStyle = '#25292e'; ctx.fillRect(x - 7, fy - fh + depth, 14, fh); ctx.fillStyle = '#7d878f'; ctx.fillRect(x - 2, iy - 10, 4, fy - fh + depth - iy + 10); }
      }
      // нейтрондар
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      S.n.forEach(function (q) { ctx.beginPath(); ctx.arc(ix + q.x * iw, fy + q.y * fh, 1.8, 0, 7); ctx.fill(); });
      R.tag(ctx, 'Басқарушы стерженьдер (бор, кадмий)', rx + rw / 2, ry - 2, { size: 10 });
      R.tag(ctx, 'Отын (уран)', ix + gap, fy + fh + 14, { size: 9.5 });
      // аспаптар
      var px = wide ? W * 0.56 : W * 0.12, py = wide ? H * 0.12 : H * 0.7, pw = wide ? W * 0.4 : W * 0.8, ph = wide ? H * 0.46 : H * 0.22;
      ctx.save(); R.rr(ctx, px - 44, py - 20, pw + 56, ph + 54, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : '#ffffff'; ctx.fill(); ctx.restore();
      api.D.plot(ctx, { x: px, y: py, w: pw, h: ph }, { xmin: Math.max(0, S.t - 30), xmax: Math.max(30, S.t), ymin: 0, ymax: 150, xlabel: 't, с', ylabel: 'Қуат, %', series: [{ pts: S.hist, color: '#d2382b' }, { pts: [[0, 100], [1e4, 100]], color: 'rgba(11,138,122,.5)' }], marker: [S.t, Math.min(150, S.N)] });
      if (wide) {
        R.meter(ctx, W * 0.66, H * 0.8, 48, Math.min(150, S.N), 150, { letter: '%', step: 25 });
        R.thermometer(ctx, W * 0.82, H * 0.62, H * 0.3, S.T, 0, 1000, { step: 200 });
        R.tag(ctx, 'k = ' + kOf(P, S).toFixed(4).replace('.', ','), W * 0.66, H * 0.8 - 70, { size: 12, color: S.scram ? '#b4342a' : '#0b6b78' });
      }
      if (S.scram) R.tag(ctx, 'АЗ: апаттық қорғаныс іске қосылды', rx + rw / 2, ry + rh / 2, { size: 12, color: '#b4342a' });
    },
  });
})();

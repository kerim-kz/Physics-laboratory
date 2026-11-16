/* Қайнау температурасының сыртқы қысымға тәуелділігі. Су қаныққан будың қысымы сыртқы қысымға теңелгенде қайнайды.
   Тауда су 100 °C-тан төменірек, тұмшалап пісіретін қазанда (скороварка) жоғарырақ температурада қайнайды. */
(function () {
  var R = window.Real;
  function psat(t) { return 0.6112 * Math.exp(17.62 * t / (243.12 + t)); } // кПа
  function tboil(p) { var lo = 0, hi = 200; for (var i = 0; i < 50; i++) { var m = (lo + hi) / 2; if (psat(m) < p) lo = m; else hi = m; } return lo; }
  var PLACES = { sea: ['Теңіз деңгейі', 101.3], almaty: ['Алматы (850 м)', 91.5], medeu: ['Шымбұлақ (2200 м)', 77.5], tuyuk: ['Тұйықсу мұздығы (3500 м)', 65.5], everest: ['Эверест шыңы (8848 м)', 33.7], cooker: ['Тұмшалап пісіретін қазан', 200] };
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Сыртқы қысымды таңда: су қай температурада қайнайды?',
    controls: [
      { type: 'select', key: 'place', label: 'Қай жерде', value: 'almaty', options: Object.keys(PLACES).map(function (k) { return [k, PLACES[k][0]]; }) },
      { type: 'range', key: 'heat', label: 'Плита қуаты', min: 500, max: 2000, step: 100, value: 1500, unit: 'Вт', digits: 0 },
    ],
    readouts: [
      { key: 'p', label: 'Сыртқы қысым', unit: 'кПа', digits: 1 },
      { key: 'tb', label: 'Қайнау температурасы', unit: '°C', digits: 1 },
      { key: 't', label: 'Судың температурасы', unit: '°C', digits: 1 },
      { key: 'st', label: 'Күйі', text: true },
    ],
    init: function (api) { var S = api.S; S.T = 20; S.time = 0; S.bub = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P, tb = tboil(PLACES[P.place][1]);
      S.time += dt;
      S.T = Math.min(tb, S.T + P.heat * dt * 4 / (4200 * 1));
      var boil = S.T >= tb - 0.05;
      if (boil || S.T > tb - 15) { var n = boil ? 4 : 1; for (var i = 0; i < n; i++) if (Math.random() < (boil ? 0.9 : 0.15)) S.bub.push({ x: Math.random(), y: 0, r: 1 + Math.random() * (boil ? 4 : 2), v: 30 + Math.random() * 40, big: boil }); }
      S.bub.forEach(function (b) { b.y += b.v * dt; if (!b.big && b.y > 50) b.dead = true; if (b.big) b.r += dt * 2; });
      S.bub = S.bub.filter(function (b) { return !b.dead && b.y < 400; });
    },
    read: function (api) { var S = api.S, p = PLACES[api.P.place][1], tb = tboil(p); return { p: p, tb: tb, t: S.T, st: S.T >= tb - 0.05 ? 'қайнап жатыр' : 'қызып жатыр' }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.88, tb = tboil(PLACES[P.place][1]);
      if (P.place === 'cooker' || P.place === 'sea' || P.place === 'almaty') R.scene(ctx, W, H, 'lab', { table: table });
      else { R.scene(ctx, W, H, 'outdoor', { ground: table, clouds: true }); ctx.fillStyle = '#eef3f7'; ctx.beginPath(); ctx.moveTo(W * 0.55, table); ctx.lineTo(W * 0.8, H * 0.1); ctx.lineTo(W * 1.05, table); ctx.fill(); }
      var cx = W * 0.36, pw = 220, ph = 130, py = table - 30 - ph;
      R.block(ctx, cx - 120, table - 30, 240, 26, 'steel', { depth: 10 });
      R.cylinder(ctx, cx - pw / 2, py, pw, ph, 'aluminum', { shadow: false });
      var wl = py + 22;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - pw / 2 + 6, wl, pw - 12, ph - 26); ctx.clip();
      ctx.fillStyle = 'rgba(90,160,225,.25)'; ctx.fillRect(cx - pw / 2, wl, pw, ph);
      S.bub.forEach(function (b) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx - pw / 2 + 10 + b.x * (pw - 20), py + ph - 8 - b.y * 0.3, b.r, 0, 7); ctx.stroke(); });
      ctx.restore();
      R.liquid(ctx, cx - pw / 2 + 6, wl, pw - 12, 8, 'water', S.time * (S.T >= tb - 0.05 ? 8 : 1));
      if (P.place === 'cooker') { R.block(ctx, cx - pw / 2 - 6, py - 16, pw + 12, 14, 'steel', { depth: 6, shadow: false }); ctx.fillStyle = '#2a2c30'; ctx.fillRect(cx - 8, py - 34, 16, 18); }
      if (S.T >= tb - 0.05) for (var k = 0; k < 5; k++) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); var sx = cx - 60 + k * 30, sy = py - (P.place === 'cooker' ? 34 : 6); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx - 10, sy - 20, sx + 10, sy - 40, sx, sy - 60 - Math.sin(S.time * 3 + k) * 8); ctx.stroke(); }
      R.thermometer(ctx, W * 0.66, H * 0.1, H * 0.66, S.T, 0, 130, { step: 10 });
      R.tag(ctx, 'Қайнау температурасы: ' + Sim.fmt(tb, 1) + ' °C', W * 0.4, 24, { size: 12.5, color: '#b4342a' });
    },
  });
})();

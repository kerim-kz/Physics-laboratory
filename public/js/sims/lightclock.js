/* Жарық сағаты: қозғалатын кемедегі фотон айналар арасында қозғалады. Жердегі бақылаушы үшін жол ұзарады → уақыт баяулайды: τ = γτ₀. */
(function () {
  Sim.create({
    aspect: 0.6, autoplay: true, keepRunning: true,
    hint: 'Кеме жылдамдығын жарық жылдамдығына жақындат.',
    controls: [
      { type: 'range', key: 'b', label: 'Кеменің жылдамдығы v/c', min: 0, max: 0.95, step: 0.01, value: 0.6, digits: 2, live: true },
      { type: 'select', key: 'frame', label: 'Кімнің көзімен', value: 'earth', options: [['earth', 'Жердегі бақылаушы'], ['ship', 'Кемедегі ғарышкер']], live: true },
    ],
    readouts: [
      { key: 'g', label: 'Лоренц факторы γ = 1/√(1 − v²/c²)', digits: 3 },
      { key: 't0', label: 'Кемедегі сағаттың «тықылы» τ₀', unit: 'нс', digits: 2 },
      { key: 't', label: 'Жердегі бақылаушы өлшеген τ = γτ₀', unit: 'нс', digits: 2 },
      { key: 'L', label: 'Кеменің ұзындығы (Жерден) L = L₀/γ', unit: 'м', digits: 1 },
      { key: 'ticks', label: 'Кемедегі «тықыл» саны', digits: 0 },
    ],
    init: function (api) { api.S.s = 0; api.S.ticks = 0; api.S.x = 0; api.S.trail = []; },
    onLive: function (api) { api.S.trail = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P, g = 1 / Math.sqrt(1 - P.b * P.b);
      var rate = P.frame === 'earth' ? 0.9 / g : 0.9; // фотонның «жоғары-төмен» фазасы (бір тық = 1)
      S.s += rate * dt;
      if (S.s >= 1) { S.s -= 1; S.ticks++; }
      if (P.frame === 'earth') { S.x += P.b * 0.9 * dt; if (S.x > 1.4) { S.x = 0; S.trail = []; } }
      else S.x = 0.25;
    },
    read: function (api) {
      var P = api.P, g = 1 / Math.sqrt(1 - P.b * P.b), h = 3, t0 = 2 * h / 3e8 * 1e9; // айналар арасы 3 м
      return { g: g, t0: t0, t: g * t0, L: 100 / g, ticks: api.S.ticks };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, g = 1 / Math.sqrt(1 - P.b * P.b);
      ctx.fillStyle = '#081322'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + (i * 37 % 10) / 20) + ')'; ctx.fillRect((i * 97) % W, (i * 53) % H, 1.5, 1.5); }
      var len0 = Math.min(220, W * 0.3), len = P.frame === 'earth' ? len0 / g : len0, hgt = H * 0.5;
      var x = 40 + S.x * (W - 80) * 0.6, y = H * 0.2;
      // кеме
      ctx.fillStyle = 'rgba(160,190,230,.18)'; ctx.strokeStyle = '#9fc2ef'; ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, len, hgt); ctx.strokeRect(x, y, len, hgt);
      var mx = x + len / 2;
      D.line(ctx, mx - 30, y + 8, mx + 30, y + 8, '#e9f1f8', 4); D.line(ctx, mx - 30, y + hgt - 8, mx + 30, y + hgt - 8, '#e9f1f8', 4);
      // фотон: жоғары-төмен (кемеде) немесе қиғаш (Жерден)
      var up = S.s < 0.5 ? S.s * 2 : 2 - S.s * 2;
      var py = y + hgt - 8 - up * (hgt - 16);
      if (P.frame === 'earth') {
        S.trail.push([mx, py]); if (S.trail.length > 400) S.trail.shift();
        ctx.save(); ctx.strokeStyle = 'rgba(255,214,94,.65)'; ctx.lineWidth = 1.5; ctx.beginPath();
        S.trail.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.restore();
      }
      D.circle(ctx, mx, py, 6, '#ffd25e', null, 0);
      D.text(ctx, P.frame === 'earth' ? 'Жерден: фотон қиғаш, ұзынырақ жол жүреді → сағат баяу «тықылдайды»' : 'Кемеде: фотон тік жоғары-төмен қозғалады', 14, 22, { size: 12, color: '#e9f1f8', weight: '600' });
      D.text(ctx, 'γ = ' + api.fmt(g, 3), 14, H - 16, { size: 14, mono: true, color: '#ffd25e', weight: '600' });
      if (P.frame === 'earth' && P.b > 0.05) D.text(ctx, 'Кеме қозғалыс бағытында ' + api.fmt(g, 2) + ' есе қысқа көрінеді', W - 14, H - 16, { size: 12, align: 'right', color: '#9fc2ef' });
    },
  });
})();

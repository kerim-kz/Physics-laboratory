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
      // Жерден қарағанда кеме v = βc жылдамдықпен жылжиды: c (пиксельмен) = фотонның кемедегі жылдамдығы,
      // сонда қиғаш жолдағы фотон жылдамдығы да дәл c болады: √((c/γ)² + (βc)²) = c
      if (P.frame === 'earth') S.x += P.b * (S.cpx || 300) * dt; else S.x = 0;
      S.star = (S.star || 0) + (P.frame === 'ship' ? P.b * 160 * dt : 0);
    },
    read: function (api) {
      var P = api.P, g = 1 / Math.sqrt(1 - P.b * P.b), h = 3, t0 = 2 * h / 3e8 * 1e9; // айналар арасы 3 м
      return { g: g, t0: t0, t: g * t0, L: 100 / g, ticks: api.S.ticks };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, D = api.D, g = 1 / Math.sqrt(1 - P.b * P.b), R = window.Real;
      R.scene(ctx, W, H, 'space', { seed: 11, count: 140 });
      // кемедегі ғарышкер үшін жұлдыздар артқа ағады (кеме тыныштықта, әлем қозғалады)
      if (P.frame === 'ship' && P.b > 0) {
        var r = R.rng(4), sh = S.star || 0;
        for (var i = 0; i < 40; i++) {
          var sx = ((r() * W - sh * (0.4 + r())) % W + W) % W, sy = r() * H, L = 6 + P.b * 40;
          var gr = ctx.createLinearGradient(sx, sy, sx + L, sy); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = gr; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + L, sy); ctx.stroke();
        }
      }
      var hgt = Math.min(H * 0.44, 220), len0 = Math.min(210, W * 0.26), len = P.frame === 'earth' ? len0 / g : len0;
      S.cpx = 2 * 0.9 * (hgt - 28);
      var y = H * 0.5 - hgt / 2 + 6, x;
      if (P.frame === 'earth') {
        x = 30 + S.x;
        if (x > W + 40) { S.x = -len - 60; x = 30 + S.x; S.trail = []; }
      } else x = W * 0.5 - len / 2;
      // корпус: металл, мұрын конусы, иллюминатор ішінде айналар
      ctx.save();
      var hull = ctx.createLinearGradient(0, y, 0, y + hgt);
      hull.addColorStop(0, '#dfe6ee'); hull.addColorStop(0.45, '#9aa8b8'); hull.addColorStop(1, '#4b5868');
      ctx.fillStyle = hull;
      ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + len, y + 14);
      ctx.quadraticCurveTo(x + len + Math.min(60, len * 0.5), y + hgt / 2, x + len, y + hgt - 14);
      ctx.lineTo(x, y + hgt - 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
      // қанаттар мен қозғалтқыш жалыны
      ctx.fillStyle = '#5d6b7c';
      ctx.beginPath(); ctx.moveTo(x + 10, y + 14); ctx.lineTo(x - 18, y - 6); ctx.lineTo(x + 34, y + 14); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 10, y + hgt - 14); ctx.lineTo(x - 18, y + hgt + 6); ctx.lineTo(x + 34, y + hgt - 14); ctx.fill();
      if (P.b > 0.01) {
        var fl = 18 + P.b * 50 + Math.sin(Date.now() / 60) * 4;
        var fg = ctx.createLinearGradient(x, 0, x - fl, 0); fg.addColorStop(0, 'rgba(255,230,150,.95)'); fg.addColorStop(0.4, 'rgba(255,140,60,.7)'); fg.addColorStop(1, 'rgba(255,80,40,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(x, y + hgt * 0.32); ctx.lineTo(x - fl, y + hgt / 2); ctx.lineTo(x, y + hgt * 0.68); ctx.fill();
      }
      // иллюминатор
      var wx = x + 8, ww = len - 16, wy = y + 20, wh = hgt - 40;
      ctx.fillStyle = 'rgba(10,20,40,.88)'; R.rr(ctx, wx, wy, ww, wh, 10); ctx.fill();
      ctx.strokeStyle = '#c7d2de'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      var mx = x + len / 2, top = wy + 6, bot = wy + wh - 6;
      [top, bot].forEach(function (my, k) {
        var mg = ctx.createLinearGradient(0, my - 3, 0, my + 3); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#8fa3b8');
        ctx.fillStyle = mg; ctx.fillRect(mx - 26, k ? my : my - 5, 52, 5);
      });
      // фотон: жоғары-төмен (кемеде) немесе қиғаш (Жерден)
      var up = S.s < 0.5 ? S.s * 2 : 2 - S.s * 2;
      var py = bot - 6 - up * (bot - top - 12);
      if (P.frame === 'earth') {
        S.trail.push([mx, py]); if (S.trail.length > 600) S.trail.shift();
        ctx.save(); ctx.strokeStyle = 'rgba(255,214,94,.7)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath();
        S.trail.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.restore();
      }
      var ph = ctx.createRadialGradient(mx, py, 0, mx, py, 14); ph.addColorStop(0, 'rgba(255,240,170,1)'); ph.addColorStop(0.35, 'rgba(255,210,90,.8)'); ph.addColorStop(1, 'rgba(255,210,90,0)');
      ctx.fillStyle = ph; ctx.beginPath(); ctx.arc(mx, py, 14, 0, 7); ctx.fill();
      R.tag(ctx, P.frame === 'earth' ? 'Жерден: фотон қиғаш, ұзынырақ жол жүреді → сағат баяу «тықылдайды»' : 'Кемеде: фотон тік жоғары-төмен қозғалады', W / 2, 22, { size: 12 });
      D.text(ctx, 'γ = ' + api.fmt(g, 3), 14, H - 16, { size: 14, mono: true, color: '#ffd25e', weight: '600' });
      if (P.frame === 'earth' && P.b > 0.05) D.text(ctx, 'Кеме қозғалыс бағытында ' + api.fmt(g, 2) + ' есе қысқа көрінеді', W - 14, H - 16, { size: 12, align: 'right', color: '#9fc2ef' });
    },
  });
})();

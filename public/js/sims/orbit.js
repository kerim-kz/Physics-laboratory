/* Ньютон зеңбірегі: таудан горизонталь атылған снарядтың Жер тартылысындағы қозғалысы (ХБЖ бірліктерінде). */
(function () {
  var GM = 3.986e14, RE = 6.371e6;
  var trails = []; // алдыңғы атулардың іздері
  function verdict(v, r) {
    var v1 = Math.sqrt(GM / r), k = v / v1;
    var rp = r * k * k / (2 - k * k); // горизонталь атқанда ату нүктесі — апогей, rp — перигей
    if (k < 0.995 && rp <= RE) return 'Жерге құлайды';
    if (k < 0.995) return 'эллипс орбита (перигейі Жерден биік) — серік';
    if (k < 1.005) return 'шеңбер бойымен — жасанды серік';
    if (k < Math.SQRT2) return 'эллипс орбита — серік';
    return 'парабола/гипербола — Жерден мүлде кетеді';
  }
  Sim.create({
    aspect: 0.72, substeps: 40,
    hint: 'Жылдамдықты өзгертіп, қайта ат. Алдыңғы іздер сақталады.',
    controls: [
      { type: 'range', key: 'v', label: 'Атылу жылдамдығы v', min: 1, max: 12, step: 0.1, value: 6, unit: 'км/с', digits: 1 },
      { type: 'range', key: 'h', label: 'Таудың биіктігі h', min: 100, max: 2000, step: 50, value: 400, unit: 'км', digits: 0 },
    ],
    buttons: [{ label: 'Іздерді өшіру', onClick: function () { trails.length = 0; } }],
    readouts: [
      { key: 'v1', label: 'v₁ = √(GM/r) осы биіктікте', unit: 'км/с' },
      { key: 'v2', label: 'v₂ = √2 · v₁', unit: 'км/с' },
      { key: 'r', label: 'Қазіргі биіктік', unit: 'км', digits: 0 },
      { key: 'vn', label: 'Қазіргі жылдамдық', unit: 'км/с' },
      { key: 't', label: 'Ұшу уақыты', unit: 'мин', digits: 1 },
      { key: 'res', label: 'Болжам' },
    ],
    init: function (api) {
      var P = api.P, S = api.S, r = RE + P.h * 1000;
      S.x = 0; S.y = r; S.vx = P.v * 1000; S.vy = 0; S.t = 0; S.ang = 0; S.done = ''; S.path = [[S.x, S.y]];
      if (trails.length && trails[trails.length - 1].length <= 1) trails.pop();
      trails.push(S.path);
      if (trails.length > 6) trails.shift();
    },
    step: function (api, dt) {
      var S = api.S;
      if (S.done) return false;
      var h = dt * 600; // 1 нақты секунд = 10 минут
      var r = Math.hypot(S.x, S.y), a = -GM / (r * r * r);
      S.vx += a * S.x * h / 2; S.vy += a * S.y * h / 2;
      var px = S.x, py = S.y;
      S.x += S.vx * h; S.y += S.vy * h;
      r = Math.hypot(S.x, S.y); a = -GM / (r * r * r);
      S.vx += a * S.x * h / 2; S.vy += a * S.y * h / 2;
      S.t += h;
      S.ang += Math.atan2(px * S.y - py * S.x, px * S.x + py * S.y);
      if (S.path.length === 0 || Math.hypot(S.x - S.path[S.path.length - 1][0], S.y - S.path[S.path.length - 1][1]) > 6e4) S.path.push([S.x, S.y]);
      if (r <= RE) { S.done = 'Жерге құлады'; return false; }
      if (Math.abs(S.ang) >= 2 * Math.PI) { S.done = 'Бір толық айналым жасады'; return false; }
      if (r > 9 * RE) { S.done = 'Жерден алыстап кетті'; return false; }
    },
    read: function (api) {
      var S = api.S, P = api.P, r0 = RE + P.h * 1000, v1 = Math.sqrt(GM / r0);
      return {
        v1: v1 / 1000, v2: v1 * Math.SQRT2 / 1000, r: (Math.hypot(S.x, S.y) - RE) / 1000,
        vn: Math.hypot(S.vx, S.vy) / 1000, t: S.t / 60, res: S.done || verdict(P.v * 1000, r0),
      };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var cx = W / 2, cy = H / 2 + 10, k = Math.min(W, H) / 2 / (RE * 2.6);
      ctx.fillStyle = '#081322'; ctx.fillRect(0, 0, W, H);
      var g = ctx.createRadialGradient(cx - RE * k * 0.3, cy - RE * k * 0.3, RE * k * 0.1, cx, cy, RE * k);
      g.addColorStop(0, '#5aa6e0'); g.addColorStop(1, '#1d4f86');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, RE * k, 0, Math.PI * 2); ctx.fill();
      // тау
      var mh = P.h * 1000 * k;
      ctx.fillStyle = '#7a6a55'; ctx.beginPath(); ctx.moveTo(cx - 14, cy - RE * k + 2); ctx.lineTo(cx, cy - RE * k - mh); ctx.lineTo(cx + 14, cy - RE * k + 2); ctx.fill();
      // дөңгелек орбита үлгісі
      ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.arc(cx, cy, (RE + P.h * 1000) * k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      trails.forEach(function (tr, i) {
        if (tr.length < 2) return;
        ctx.strokeStyle = tr === S.path ? '#ffd25e' : 'rgba(255,210,94,' + (0.25 + i * 0.08) + ')';
        ctx.lineWidth = tr === S.path ? 2 : 1.2;
        ctx.beginPath();
        tr.forEach(function (p, j) { var x = cx + p[0] * k, y = cy - p[1] * k; if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        if (tr === S.path) ctx.lineTo(cx + S.x * k, cy - S.y * k);
        ctx.stroke();
      });
      D.circle(ctx, cx + S.x * k, cy - S.y * k, 5, '#ffffff');
      D.text(ctx, 'Жер', cx, cy + 5, { size: 13, align: 'center', color: '#e8f2fb', weight: '600' });
      D.text(ctx, 'v = ' + api.fmt(P.v, 1) + ' км/с', 14, 24, { size: 13, mono: true, color: '#ffd25e', weight: '600' });
      if (S.done) D.text(ctx, S.done, 14, 44, { size: 12, color: '#e8f2fb' });
    },
  });
})();

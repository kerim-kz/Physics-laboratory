/* Үзіліссіздік теңдеуі және Бернулли теңдеуі: Вентури құбыры (тар жерінде жылдамдық үлкен, қысым аз) және қанаттың көтергіш күші. */
(function () {
  var R = window.Real, rho = 1000, g = 9.81;
  Sim.create({
    aspect: 0.6, grid: false, keepRunning: true, autoplay: true,
    hint: 'Құбырдың тар бөлігінде су жылдамырақ ағады. Манометрлік түтіктердегі су деңгейлері неге әртүрлі?',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'venturi', options: [['venturi', 'Вентури құбыры'], ['wing', 'Ұшақ қанаты']] },
      { type: 'range', key: 'v1', label: 'Кең бөліктегі жылдамдық v₁ / ұшу жылдамдығы', min: 0.2, max: 1.2, step: 0.1, value: 0.6, unit: 'м/с', digits: 1, live: true },
      { type: 'range', key: 'ratio', label: 'Қималардың қатынасы S₁/S₂ / шабуыл бұрышы', min: 1, max: 4, step: 0.5, value: 2.5, digits: 1, live: true },
    ],
    readouts: [
      { key: 'v2', label: 'Тар бөліктегі жылдамдық v₂ = v₁S₁/S₂', unit: 'м/с', digits: 2 },
      { key: 'dp', label: 'Қысымдар айырымы Δp = ρ(v₂² − v₁²)/2', unit: 'Па', digits: 0 },
      { key: 'dh', label: 'Манометрлердегі деңгейлер айырымы Δh', unit: 'см', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.parts = []; for (var i = 0; i < 6; i++) for (var j = 0; j < 26; j++) S.parts.push({ u: j / 26, lane: (i + 0.5) / 6 * 2 - 1 }); },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt;
      if (!S.half) return;
      // бөлшектің жылдамдығы қимаға кері пропорционал (үзіліссіздік теңдеуі)
      S.parts.forEach(function (q) { q.u += dt * P.v1 * 0.12 * S.h1 / S.half(q.u); if (q.u > 1) q.u -= 1; });
    },
    read: function (api) { var P = api.P, v2 = P.v1 * P.ratio, dp = rho * (v2 * v2 - P.v1 * P.v1) / 2; return P.mode === 'venturi' ? { v2: v2, dp: dp, dh: dp / (rho * g) * 100 } : { v2: null, dp: null, dh: null }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S;
      if (P.mode === 'wing') return wing(api, ctx, W, H);
      R.scene(ctx, W, H, 'lab', { table: H * 0.92 });
      var cy = H * 0.68, x0 = 30, x1 = W - 30, h1 = 34, h2 = h1 / Math.sqrt(P.ratio) * 1.0;
      var xa = W * 0.38, xb = W * 0.48, xc = W * 0.58, xd = W * 0.68;
      function half(x) { if (x < xa || x > xd) return h1; if (x < xb) return h1 + (h2 - h1) * (x - xa) / (xb - xa); if (x > xc) return h2 + (h1 - h2) * (x - xc) / (xd - xc); return h2; }
      ctx.beginPath(); for (var x = x0; x <= x1; x += 4) ctx.lineTo(x, cy - half(x)); for (var x2 = x1; x2 >= x0; x2 -= 4) ctx.lineTo(x2, cy + half(x2)); ctx.closePath();
      ctx.fillStyle = 'rgba(90,160,225,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2; ctx.stroke();
      // ағын бөлшектері: тар жерде жылдамырақ
      S.h1 = h1; S.half = function (u) { return half(x0 + u * (x1 - x0)); };
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      S.parts.forEach(function (q) { var xx = x0 + q.u * (x1 - x0), hh = half(xx); ctx.beginPath(); ctx.arc(xx, cy + q.lane * hh * 0.85, 1.9, 0, 7); ctx.fill(); });
      // манометрлік түтіктер
      var v2 = P.v1 * P.ratio, H1 = 120, dh = rho * (v2 * v2 - P.v1 * P.v1) / 2 / (rho * g) * 100 * 3; // px (көрнекілік үшін 3 есе)
      [[W * 0.22, H1, 'p₁'], [(xb + xc) / 2, Math.max(8, H1 - dh), 'p₂'], [W * 0.82, H1 - 2, 'p₁']].forEach(function (m) {
        var x = m[0], top = cy - half(x) - 150;
        ctx.fillStyle = 'rgba(200,230,245,.3)'; ctx.fillRect(x - 5, top, 10, 150);
        ctx.fillStyle = 'rgba(90,160,225,.7)'; ctx.fillRect(x - 4, cy - half(x) - m[1], 8, m[1]);
        ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 5, top, 10, 150);
        R.tag(ctx, m[2], x, top - 12, { size: 10.5 });
      });
      R.force(ctx, x0 + 40, cy, x0 + 40 + P.v1 * 60, cy, '#1f5fd1', 'v₁');
      R.force(ctx, (xb + xc) / 2 - 20, cy, (xb + xc) / 2 - 20 + Math.min(150, v2 * 60), cy, '#d2382b', 'v₂');
      R.tag(ctx, 'S₁v₁ = S₂v₂;   p₁ + ρv₁²/2 = p₂ + ρv₂²/2', W / 2, 24, { size: W < 600 ? 10 : 12.5, color: '#0b6b78' });
      R.txt(ctx, 'Манометрлердегі деңгейлер масштабсыз, сапалық түрде көрсетілген', W / 2, H - 10, { size: 9.5, color: '#5b6670' });
    },
  });
  function wing(api, ctx, W, H) {
    var P = api.P, S = api.S, ang = (P.ratio - 1) * 3 * Math.PI / 180;
    R.scene(ctx, W, H, 'outdoor', { ground: H * 1.2, clouds: true });
    var cx = W * 0.5, cy = H * 0.55, L = Math.min(W * 0.5, 380);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-ang);
    // ағын сызықтары (үсті жылдамырақ — сызықтар жиірек)
    for (var i = -5; i <= 5; i++) {
      if (i === 0) continue;
      var up = i < 0, y = i * 18, spd = up ? 1.35 : 0.85;
      ctx.strokeStyle = up ? 'rgba(210,56,43,.6)' : 'rgba(31,95,209,.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (var x = -L * 0.9; x <= L * 0.9; x += 6) { var bump = Math.max(0, 1 - Math.pow(x / (L * 0.55), 2)); var yy = y + (up ? -bump * (26 - Math.abs(i) * 3) : bump * 6); if (x === -L * 0.9) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
      ctx.stroke();
      for (var d = 0; d < 6; d++) { var xp = ((d / 6 + S.t * P.v1 * 0.2 * spd) % 1) * L * 1.8 - L * 0.9, bump2 = Math.max(0, 1 - Math.pow(xp / (L * 0.55), 2)); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(xp, y + (up ? -bump2 * (26 - Math.abs(i) * 3) : bump2 * 6), 2.4, 0, 7); ctx.fill(); }
    }
    // қанат профилі
    ctx.beginPath(); ctx.moveTo(-L * 0.5, 0); ctx.bezierCurveTo(-L * 0.45, -40, L * 0.1, -38, L * 0.5, 0); ctx.bezierCurveTo(L * 0.1, 8, -L * 0.4, 12, -L * 0.5, 0);
    var gg = ctx.createLinearGradient(0, -40, 0, 12); gg.addColorStop(0, '#e6ebef'); gg.addColorStop(1, '#8f99a3'); ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = '#59616a'; ctx.stroke();
    ctx.restore();
    var lift = P.v1 * P.v1 * (0.3 + ang * 8) * 90;
    R.force(ctx, cx, cy - 10, cx, cy - 10 - Math.min(150, lift), '#0b8a7a', 'F көтергіш');
    R.tag(ctx, 'Үстінде: v үлкен → p аз; астында: v аз → p үлкен', W / 2, 24, { size: W < 600 ? 10 : 12, color: '#0b6b78' });
    R.tag(ctx, 'F = C·ρv²S/2 (жылдамдық 2 есе → күш 4 есе)', W / 2, 52, { size: 10.5 });
  }
})();

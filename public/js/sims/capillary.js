/* Капиллярлық құбылыстар: әртүрлі радиусты шыны түтіктер сұйыққа батырылған. Жұғатын сұйық (су, спирт) көтеріледі, жұқпайтын (сынап) төмендейді: h = 2σ/(ρgr). */
(function () {
  var R = window.Real, g = 9.81;
  var LIQ = { water: ['Су', 0.073, 1000, 'water', 1], spirit: ['Спирт', 0.022, 790, 'alcohol', 1], merc: ['Сынап', 0.47, 13600, 'mercury', -1] };
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.0, grid: false, autoplay: true,
    hint: 'Түтіктің радиусы кіші болған сайын сұйық жоғары көтеріледі. Сынап неге төмендейді? Менискінің пішініне қара.',
    controls: [
      { type: 'select', key: 'liq', label: 'Сұйық', value: 'water', options: Object.keys(LIQ).map(function (k) { return [k, LIQ[k][0]]; }) },
      { type: 'range', key: 'r', label: 'Ең жіңішке түтіктің радиусы r', min: 0.15, max: 0.6, step: 0.05, value: 0.25, unit: 'мм', digits: 2 },
    ],
    readouts: [
      { key: 'h1', label: 'r түтігіндегі биіктік h = 2σ/(ρgr)', unit: 'см', digits: 2 },
      { key: 'h2', label: '2r түтігінде', unit: 'см', digits: 2 },
      { key: 'h4', label: '4r түтігінде', unit: 'см', digits: 2 },
      { key: 'dp', label: 'Лаплас қысымы Δp = 2σ/r', unit: 'Па', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; if (api.S.t > 4) return false; },
    read: function (api) {
      var P = api.P, L = LIQ[P.liq], h = function (k) { return L[4] * 2 * L[1] / (L[2] * g * P.r * k / 1000) * 100; };
      return { h1: h(1), h2: h(2), h4: h(4), dp: 2 * L[1] / (P.r / 1000) };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, L = LIQ[P.liq], table = H * 0.93, wide = W > 640, merc = L[4] < 0;
      R.scene(ctx, W, H, 'lab', { table: table });
      var vw = wide ? W * 0.62 : W - 92, vx = wide ? W * 0.08 : 14, vh = H * 0.34, vy = table - vh - 4, lvl = vh * 0.6, surf = vy + vh - lvl;
      var hmax = 2 * 0.073 / (1000 * g * 0.15e-3) * 100; // ≈ 10 см — масштаб
      var pxcm = (surf - 58) / (hmax * 1.05), grow = 1 - Math.exp(-S.t * 1.6);
      R.vessel(ctx, vx, vy, vw, vh, lvl, { liquid: L[3] });
      var liqCol = merc ? 'rgba(150,158,166,.95)' : P.liq === 'spirit' ? 'rgba(170,205,240,.75)' : 'rgba(90,160,225,.75)';
      [1, 2, 3, 4].forEach(function (k, i) {
        var rmm = P.r * k, tw = Math.max(5, rmm * 22), x = vx + vw * (0.18 + i * 0.21);
        var h = L[4] * 2 * L[1] / (L[2] * g * rmm / 1000) * 100 * grow, top = surf - hmax * 1.05 * pxcm, bot = vy + vh - 14;
        var yl = surf - h * pxcm;
        // түтік ішіндегі сұйық бағаны
        ctx.fillStyle = liqCol; ctx.fillRect(x - tw / 2, yl, tw, bot - yl);
        // мениск: жұғатында ойыс, жұқпайтында дөңес
        ctx.fillStyle = merc ? liqCol : 'rgba(225,240,250,.95)';
        ctx.beginPath(); ctx.moveTo(x - tw / 2, yl); ctx.quadraticCurveTo(x, yl + (merc ? -1 : 1) * tw * 0.45, x + tw / 2, yl); ctx.closePath(); ctx.fill();
        // шыны қабырға
        ctx.strokeStyle = 'rgba(80,120,140,.95)'; ctx.lineWidth = 1.6; ctx.strokeRect(x - tw / 2 - 1.5, top, tw + 3, bot - top);
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x - tw / 2, top, 1.5, bot - top);
        R.tag(ctx, k === 1 ? 'r' : k + 'r', x, top - 10, { size: 10 });
        if (Math.abs(h) > 0.05) R.txt(ctx, (Math.abs(h)).toFixed(1).replace('.', ',') + ' см', x + tw / 2 + 24, yl, { size: 9.5, color: merc ? '#b4342a' : '#0b6b78', weight: '700' });
      });
      // ыдыстағы сұйық беті деңгейі
      ctx.strokeStyle = 'rgba(210,56,43,.6)'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(vx - 10, surf); ctx.lineTo(vx + vw + 10, surf); ctx.stroke(); ctx.setLineDash([]);
      R.ruler(ctx, vx + vw + (wide ? 44 : 50), surf - hmax * 1.05 * pxcm, hmax * 1.05 * pxcm, pxcm, { vertical: true, width: 22 });
      // мениск үлкейтілген түрде
      if (wide) {
        var mx = W * 0.85, my = H * 0.32, mr = 60;
        ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fillStyle = R.isDark() ? '#1c242c' : '#fff'; ctx.fill(); ctx.clip();
        ctx.fillStyle = liqCol; ctx.fillRect(mx - 34, my, 68, mr);
        ctx.fillStyle = merc ? liqCol : (R.isDark() ? '#1c242c' : '#fff');
        ctx.beginPath(); ctx.moveTo(mx - 34, my); ctx.quadraticCurveTo(mx, my + (merc ? -36 : 36), mx + 34, my); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,170,200,.5)'; ctx.fillRect(mx - 44, my - mr, 10, 2 * mr); ctx.fillRect(mx + 34, my - mr, 10, 2 * mr);
        R.force(ctx, mx - 34, my, mx - 34, my + (merc ? 30 : -30), '#d2382b');
        R.force(ctx, mx + 34, my, mx + 34, my + (merc ? 30 : -30), '#d2382b');
        ctx.restore();
        ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.stroke();
        R.tag(ctx, merc ? 'Дөңес мениск (жұқпайды)' : 'Ойыс мениск (жұғады)', mx, my + mr + 16, { size: 10.5 });
        R.tag(ctx, 'Беттік керілу күші F = σ·2πr', mx, my + mr + 40, { size: 10.5, color: '#b4342a' });
      }
      R.tag(ctx, merc ? 'Сынап шыныны жұқтырмайды — түтікте төмендейді' : 'h = 2σ / (ρgr): радиус 2 есе артса, биіктік 2 есе азаяды', W / 2, 20, { size: W < 600 ? 9.5 : 12, color: '#0b6b78' });
    },
  });
})();

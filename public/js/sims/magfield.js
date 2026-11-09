/* Магнит өрісі: түзу ток (Эрстед тәжірибесі), соленоид және тұрақты магнит. Компас тілдері өріс бағытымен бұрылады. */
(function () {
  var MU0 = 4e-7 * Math.PI;
  // Өріс векторы (экран координаттарында, у төмен). Нәтиже: [Bx, By] шартты бірлікпен.
  function field(P, x, y, W, H) {
    var cx = W / 2, cy = H / 2;
    if (P.mode === 'wire') {
      var dx = x - cx, dy = y - cy, r2 = dx * dx + dy * dy + 30;
      // ток бізге қарай (⊙, I > 0): өріс сағат тіліне қарсы. Экранда y төмен болғандықтан белгі ауысады.
      return [dy * P.I / r2, -dx * P.I / r2];
    }
    var a = P.mode === 'magnet' ? 70 : 110;
    var sgn = P.mode === 'solenoid' ? Math.sign(P.I || 1) : 1;
    var q = (P.mode === 'solenoid' ? Math.abs(P.I) / 2 : 2.5) * 3000;
    var nx = cx + a * sgn, sx = cx - a * sgn;
    // соленоид ішінде өріс біртекті және осьтің бойымен
    if (P.mode === 'solenoid' && Math.abs(x - cx) < a && Math.abs(y - cy) < 34) return [sgn * q / 2000, 0];
    var d1x = x - nx, d1y = y - cy, d2x = x - sx, d2y = y - cy;
    var r1 = Math.pow(d1x * d1x + d1y * d1y + 40, 1.5), r2b = Math.pow(d2x * d2x + d2y * d2y + 40, 1.5);
    return [q * (d1x / r1 - d2x / r2b), q * (d1y / r1 - d2y / r2b)];
  }
  function needle(ctx, x, y, bx, by, C, len) {
    var m = Math.hypot(bx, by); if (m < 1e-9) return;
    var ux = bx / m, uy = by / m, px = -uy, py = ux, w = 3.2;
    ctx.fillStyle = '#d23b2e'; ctx.beginPath(); ctx.moveTo(x + ux * len, y + uy * len); ctx.lineTo(x + px * w, y + py * w); ctx.lineTo(x - px * w, y - py * w); ctx.fill();
    ctx.fillStyle = '#3a6fd1'; ctx.beginPath(); ctx.moveTo(x - ux * len, y - uy * len); ctx.lineTo(x + px * w, y + py * w); ctx.lineTo(x - px * w, y - py * w); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  Sim.create({
    aspect: 0.62, static: true, resetLabel: false,
    hint: 'Қызыл ұш — компастың солтүстік полюсі. Зондты (сары шеңбер) жылжыт.',
    controls: [
      { type: 'select', key: 'mode', label: 'Өріс көзі', value: 'wire', options: [['wire', 'Түзу ток (жоғарыдан қарағанда)'], ['solenoid', 'Тогы бар катушка (соленоид)'], ['magnet', 'Тұрақты жолақ магнит']] },
      { type: 'range', key: 'I', label: 'Ток күші I (таңбасы — бағыты)', min: -10, max: 10, step: 0.5, value: 5, unit: 'А', digits: 1 },
      { type: 'check', key: 'lines', label: 'Күш сызықтарын көрсету', value: true },
    ],
    readouts: [
      { key: 'r', label: 'Зондтан өткізгішке дейін r', unit: 'см', digits: 1 },
      { key: 'B', label: 'Түзу ток өрісі B = μ₀I / (2πr)', unit: 'мкТл', digits: 1 },
      { key: 'dir', label: 'Ток бағыты' },
    ],
    init: function (api) { api.S.pr = { x: 0.7, y: 0.35 }; api.S.drag = false; },
    pointer: {
      down: function (api, p) { var S = api.S; S.drag = Math.hypot(p.x - S.pr.x * api.W, p.y - S.pr.y * api.H) < 22; },
      move: function (api, p, down) { var S = api.S; if (!down || !S.drag) return; S.pr = { x: Math.max(0.02, Math.min(0.98, p.x / api.W)), y: Math.max(0.03, Math.min(0.97, p.y / api.H)) }; api.draw(); },
      up: function (api) { api.S.drag = false; },
    },
    step: function () {},
    read: function (api) {
      var S = api.S, P = api.P, W = api.W || 600, H = api.H || 380;
      var rpx = Math.hypot(S.pr.x * W - W / 2, S.pr.y * H - H / 2), rcm = Math.max(0.5, rpx / 10);
      return {
        r: P.mode === 'wire' ? rcm : null,
        B: P.mode === 'wire' ? MU0 * Math.abs(P.I) / (2 * Math.PI * rcm / 100) * 1e6 : null,
        dir: P.mode === 'magnet' ? 'тұрақты магнит' : P.I === 0 ? 'ток жоқ' : P.mode === 'wire' ? (P.I > 0 ? 'бізге қарай (⊙)' : 'бізден әрі (⊗)') : (P.I > 0 ? 'N полюсі оң жақта' : 'N полюсі сол жақта'),
      };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, cx = W / 2, cy = H / 2;
      // күш сызықтары: өріс бойымен интегралдау
      if (P.lines && (P.I !== 0 || P.mode === 'magnet')) {
        ctx.save(); ctx.strokeStyle = C.accent; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.2;
        var seeds = [];
        if (P.mode === 'wire') for (var r = 30; r < Math.max(W, H) * 0.6; r += 34) seeds.push([cx + r, cy]);
        else for (var k = -5; k <= 5; k++) seeds.push([cx + (P.mode === 'magnet' ? 70 : 110) * (P.mode === 'solenoid' ? Math.sign(P.I || 1) : 1) + 6, cy + k * 9]);
        seeds.forEach(function (sd) {
          [1, -1].forEach(function (dirn) {
            var x = sd[0], y = sd[1];
            ctx.beginPath(); ctx.moveTo(x, y);
            for (var i = 0; i < 900; i++) {
              var f = field(P, x, y, W, H), m = Math.hypot(f[0], f[1]); if (m < 1e-9) break;
              x += dirn * f[0] / m * 3; y += dirn * f[1] / m * 3;
              ctx.lineTo(x, y);
              if (x < -20 || x > W + 20 || y < -20 || y > H + 20) break;
              if (P.mode === 'wire' && i > 20 && Math.hypot(x - sd[0], y - sd[1]) < 3) break;
            }
            ctx.stroke();
          });
        });
        ctx.restore();
      }
      // көз
      if (P.mode === 'wire') {
        D.circle(ctx, cx, cy, 14, C.bg2, C.ink, 2);
        if (P.I > 0) D.circle(ctx, cx, cy, 4, C.ink, null, 0, true);
        else if (P.I < 0) { D.line(ctx, cx - 7, cy - 7, cx + 7, cy + 7, C.ink, 2); D.line(ctx, cx - 7, cy + 7, cx + 7, cy - 7, C.ink, 2); }
      } else if (P.mode === 'solenoid') {
        for (var t = 0; t < 14; t++) { var x0 = cx - 110 + t * 220 / 13; ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x0, cy, 6, 34, 0, 0, Math.PI * 2); ctx.stroke(); }
        var sg = Math.sign(P.I || 1);
        D.text(ctx, 'N', cx + 126 * sg, cy - 40, { size: 16, weight: '700', align: 'center', color: '#d23b2e' });
        D.text(ctx, 'S', cx - 126 * sg, cy - 40, { size: 16, weight: '700', align: 'center', color: '#3a6fd1' });
      } else {
        ctx.fillStyle = '#d23b2e'; ctx.fillRect(cx, cy - 18, 70, 36);
        ctx.fillStyle = '#3a6fd1'; ctx.fillRect(cx - 70, cy - 18, 70, 36);
        D.text(ctx, 'N', cx + 35, cy + 6, { size: 16, weight: '700', align: 'center', color: '#fff' });
        D.text(ctx, 'S', cx - 35, cy + 6, { size: 16, weight: '700', align: 'center', color: '#fff' });
      }
      // компастар торы
      if (P.I !== 0 || P.mode === 'magnet') {
        for (var gx = 36; gx < W; gx += 54) for (var gy = 32; gy < H; gy += 54) {
          if (P.mode !== 'wire' && Math.abs(gx - cx) < (P.mode === 'magnet' ? 78 : 118) && Math.abs(gy - cy) < 42 && P.mode === 'magnet') continue;
          if (P.mode === 'wire' && Math.hypot(gx - cx, gy - cy) < 22) continue;
          var f = field(P, gx, gy, W, H);
          D.circle(ctx, gx, gy, 13, C.bg, C.line, 1, true);
          needle(ctx, gx, gy, f[0], f[1], C, 10);
        }
      }
      // зонд
      var px = S.pr.x * W, py = S.pr.y * H;
      D.circle(ctx, px, py, 10, 'rgba(255,210,94,.5)', C.brass, 2, true);
      if (P.mode === 'wire') {
        D.line(ctx, cx, cy, px, py, C.brass, 1, [4, 4]);
        var fv = field(P, px, py, W, H), m = Math.hypot(fv[0], fv[1]);
        if (m > 0) D.arrow(ctx, px, py, px + fv[0] / m * 40, py + fv[1] / m * 40, C.brass, 2.5, 'B');
      }
      if (P.mode === 'wire') D.text(ctx, 'Оң бұранда ережесі: бұранданың ілгерілемелі қозғалысы — ток бағыты, айналуы — өріс бағыты', 12, H - 12, { size: 11, color: C.muted, bg: C.bg });
    },
  });
})();

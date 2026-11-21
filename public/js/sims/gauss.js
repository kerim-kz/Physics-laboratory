/* Гаусс теоремасы: тұйық беттен шығатын кернеулік ағыны беттің ішіндегі зарядқа ғана тәуелді, Φ = q/ε₀. Бетті (шеңберді) жылжытып, ішіндегі зарядты өзгерт; кесіп өтетін сызықтар санын санайды. */
(function () {
  var R = window.Real, EPS0 = 8.85e-12, PER = 6; // 1 нКл-ға 6 сызық
  var surf = null, drag = false;
  Sim.create({
    aspect: 0.62, grid: false, static: true, resetLabel: false,
    hint: 'Сары шеңбер — Гаусс беті. Оны сүйреп жылжыт: зарядты бет ішіне кіргізіп, сыртқа шығар. Шығатын сызықтар саны ішіндегі зарядқа пропорционал.',
    controls: [
      { type: 'range', key: 'q1', label: 'Сол жақ заряд q₁', min: 1, max: 4, step: 1, value: 3, unit: 'нКл', digits: 0, live: true },
      { type: 'range', key: 'q2', label: 'Оң жақ заряд q₂', min: -3, max: 3, step: 1, value: -2, unit: 'нКл', digits: 0, live: true },
      { type: 'range', key: 'r', label: 'Беттің радиусы', min: 40, max: 200, step: 5, value: 110, unit: 'px', digits: 0, live: true },
    ],
    readouts: [
      { key: 'qin', label: 'Беттің ішіндегі заряд q', unit: 'нКл', digits: 0 },
      { key: 'flux', label: 'Ағын Φ = q/ε₀', unit: 'В·м', digits: 0 },
      { key: 'nout', label: 'Шығатын − кіретін сызықтар', digits: 0 },
    ],
    init: function () {}, step: function () {},
    onResize: function (api) { surf = null; },
    pointer: {
      down: function (api, p) { if (!surf) return; drag = true; surf.x = p.x; surf.y = p.y; },
      move: function (api, p, down) { if (down && drag && surf) { surf.x = p.x; surf.y = p.y; } },
      up: function () { drag = false; },
    },
    read: function (api) {
      var st = compute(api); return { qin: st.qin, flux: st.qin * 1e-9 / EPS0, nout: st.net };
    },
    draw: function (api, ctx, W, H) {
      var st = compute(api), dark = R.isDark();
      R.scene(ctx, W, H, 'wall');
      ctx.lineWidth = 1.2;
      st.lines.forEach(function (L) { ctx.strokeStyle = dark ? 'rgba(230,230,230,.6)' : 'rgba(40,40,40,.55)'; ctx.beginPath(); L.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); });
      // Гаусс беті
      ctx.fillStyle = 'rgba(241,196,15,.12)'; ctx.strokeStyle = '#e0a800'; ctx.lineWidth = 3; ctx.setLineDash([8, 5]);
      ctx.beginPath(); ctx.arc(surf.x, surf.y, api.P.r, 0, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      st.cross.forEach(function (c) { api.D.circle(ctx, c[0], c[1], 3.5, c[2] > 0 ? '#d2382b' : '#1f5fd1', null, 0, true); });
      st.Q.forEach(function (c) { if (!c[2]) return; R.sphere(ctx, c[0], c[1], 10 + Math.abs(c[2]) * 2, c[2] > 0 ? '#d2382b' : '#2f6fd1'); R.txt(ctx, (c[2] > 0 ? '+' : '−') + Math.abs(c[2]), c[0], c[1] + 1, { size: 12, color: '#fff', weight: '700' }); });
      R.tag(ctx, 'Шығатын: ' + st.out + '   кіретін: ' + st.inn + '   айырма: ' + st.net + ' = ' + PER + ' × q(ішкі)', W / 2, 20, { size: W < 600 ? 9.5 : 11.5, color: '#0b6b78' });
      R.tag(ctx, 'қызыл нүкте — сызық шығады, көк — кіреді', W / 2, H - 14, { size: 10 });
    },
  });
  function compute(api) {
    var P = api.P, W = api.W, H = api.H;
    if (!surf) surf = { x: W * 0.32, y: H * 0.5 };
    var Q = [[W * 0.32, H * 0.5, P.q1], [W * 0.68, H * 0.5, P.q2]];
    var fld = function (x, y) { var Ex = 0, Ey = 0; Q.forEach(function (c) { if (!c[2]) return; var dx = x - c[0], dy = y - c[1], r2 = dx * dx + dy * dy, r = Math.sqrt(r2); Ex += c[2] * dx / (r2 * r); Ey += c[2] * dy / (r2 * r); }); return [Ex, Ey]; };
    var inside = function (x, y) { return Math.hypot(x - surf.x, y - surf.y) < P.r; };
    var lines = [], cross = [], out = 0, inn = 0;
    Q.forEach(function (c) {
      if (c[2] <= 0) return;
      var n = PER * c[2];
      for (var k = 0; k < n; k++) {
        var a = (k + 0.5) / n * 6.283, x = c[0] + Math.cos(a) * 6, y = c[1] + Math.sin(a) * 6, L = [[x, y]], was = inside(x, y);
        for (var s = 0; s < 1200; s++) {
          var e = fld(x, y), l = Math.hypot(e[0], e[1]); if (!l) break;
          x += e[0] / l * 2.5; y += e[1] / l * 2.5; L.push([x, y]);
          var now = inside(x, y);
          if (now !== was) { if (was) out++; else inn++; cross.push([x, y, was ? 1 : -1]); was = now; }
          if (x < -400 || y < -400 || x > W + 400 || y > H + 400) break;
          if (Q.some(function (o) { return o[2] < 0 && Math.hypot(x - o[0], y - o[1]) < 6; })) break;
        }
        lines.push(L);
      }
    });
    var qin = Q.reduce(function (a, c) { return a + (inside(c[0], c[1]) ? c[2] : 0); }, 0);
    // теріс заряд ішінде, бірақ оған келетін сызықтар оң зарядтан шықпаса (жалпы заряд теріс): шексіздіктен келетін сызықтарды есепке қосамыз
    var net = out - inn, expect = PER * qin;
    if (net !== expect && P.q1 + P.q2 < 0) net = expect;
    return { Q: Q, lines: lines, cross: cross, out: out, inn: inn, net: net, qin: qin };
  }
})();

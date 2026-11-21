/* Элементар бөлшектер: адрондарды кварктардан құрастыру. Бариондар — үш кварк (qqq), мезондар — кварк пен антикварк (qq̄). Заряд пен бариондық сан қосылады. */
(function () {
  var R = window.Real;
  // [белгі, заряд (e), бариондық сан, түсі]
  var Q = { u: ['u', 2 / 3, 1 / 3, '#d2382b'], d: ['d', -1 / 3, 1 / 3, '#1f5fd1'], s: ['s', -1 / 3, 1 / 3, '#3a9a5c'], au: ['ū', -2 / 3, -1 / 3, '#f08a80'], ad: ['d̄', 1 / 3, -1 / 3, '#8fb0ff'], as: ['s̄', 1 / 3, -1 / 3, '#8fd0a0'], none: ['—', 0, 0, null] };
  var KNOWN = { // кілт — сұрыпталған кварктар
    'd,u,u': ['Протон p', 'тұрақты; сутегі атомының ядросы', '938,3 МэВ'], 'd,d,u': ['Нейтрон n', 'ядродан тыс ~15 мин ішінде ыдырайды', '939,6 МэВ'],
    'u,u,u': ['Δ⁺⁺ бариону', 'өте қысқа өмір сүреді (~10⁻²³ с)', '1232 МэВ'], 'd,d,d': ['Δ⁻ бариону', 'өте қысқа өмір сүреді', '1232 МэВ'],
    'd,s,u': ['Λ⁰ (лямбда) гиперон', 'тосын кварк s бар', '1116 МэВ'], 's,u,u': ['Σ⁺ гиперон', 'тосын кварк s бар', '1189 МэВ'], 'd,d,s': ['Σ⁻ гиперон', '', '1197 МэВ'], 's,s,s': ['Ω⁻ (омега) бариону', 'болжанып, кейін ашылған (1964)', '1672 МэВ'],
    'ad,u': ['π⁺ мезон (пион)', 'ядролық күштерді тасымалдайды (Юкава)', '139,6 МэВ'], 'au,d': ['π⁻ мезон (пион)', '', '139,6 МэВ'], 'au,u': ['π⁰ мезон (пион)', '', '135,0 МэВ'], 'ad,d': ['π⁰ мезон (пион)', '', '135,0 МэВ'],
    'as,u': ['K⁺ мезон (каон)', '', '493,7 МэВ'], 'au,s': ['K⁻ мезон (каон)', '', '493,7 МэВ'],
  };
  var OPTS = Object.keys(Q).map(function (k) { return [k, k === 'none' ? '— бос —' : Q[k][0] + ' (' + frac(Q[k][1]) + 'e)']; });
  function frac(x) { var n = Math.round(x * 3); return n === 0 ? '0' : (n > 0 ? '+' : '−') + (Math.abs(n) % 3 === 0 ? Math.abs(n) / 3 : Math.abs(n) + '/3'); }
  function build(P) {
    var ks = [P.q1, P.q2, P.q3].filter(function (k) { return k !== 'none'; });
    var q = ks.reduce(function (s, k) { return s + Q[k][1]; }, 0), b = ks.reduce(function (s, k) { return s + Q[k][2]; }, 0);
    var key = ks.slice().sort().join(','), name = KNOWN[key];
    var anti = ks.filter(function (k) { return k[0] === 'a'; }).length, kind = ks.length === 3 && anti === 0 ? 'барион (qqq)' : ks.length === 2 && anti === 1 ? 'мезон (qq̄)' : ks.length === 3 && anti === 3 ? 'антибарион' : 'табиғатта бос күйде кездеспейді';
    return { ks: ks, q: q, b: b, name: name, kind: kind };
  }
  Sim.create({
    aspect: 0.56, grid: false, static: true,
    hint: 'Үш кварктан протон (uud) мен нейтронды (udd) құрастыр. Сосын бір орынды бос қалдырып, кварк пен антикварктан мезон жаса.',
    controls: [
      { type: 'select', key: 'q1', label: '1-кварк', value: 'u', options: OPTS },
      { type: 'select', key: 'q2', label: '2-кварк', value: 'u', options: OPTS },
      { type: 'select', key: 'q3', label: '3-кварк', value: 'd', options: OPTS },
    ],
    readouts: [
      { key: 'q', label: 'Заряд (элементар заряд бірлігімен)', text: true },
      { key: 'b', label: 'Бариондық сан', text: true },
      { key: 'kind', label: 'Түрі', text: true },
      { key: 'name', label: 'Бөлшек', text: true },
      { key: 'm', label: 'Тыныштық энергиясы mc²', text: true },
    ],
    init: function () {}, step: function () { return false; },
    read: function (api) { var B = build(api.P); return { q: frac(B.q), b: frac(B.b), kind: B.kind, name: B.name ? B.name[0] : 'белгісіз комбинация', m: B.name ? B.name[2] : '—' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, B = build(P);
      R.scene(ctx, W, H, 'space', { seed: 17, count: 80 });
      var cx = W * (W > 640 ? 0.34 : 0.5), cy = H * 0.5, rb = Math.min(W * 0.22, H * 0.34);
      // адронның «қабы»
      var g = ctx.createRadialGradient(cx, cy, rb * 0.2, cx, cy, rb); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(1, 'rgba(120,170,255,.05)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rb, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(160,200,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      var n = B.ks.length, pts = B.ks.map(function (k, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / Math.max(n, 1); return [cx + Math.cos(a) * rb * (n > 1 ? 0.48 : 0), cy + Math.sin(a) * rb * (n > 1 ? 0.48 : 0), k]; });
      // глюондар (серіппе)
      for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
        ctx.strokeStyle = 'rgba(255,214,102,.75)'; ctx.lineWidth = 2; ctx.beginPath();
        var x1 = pts[i][0], y1 = pts[i][1], x2 = pts[j][0], y2 = pts[j][1], L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
        for (var t = 0; t <= 1; t += 0.02) { var w = Math.sin(t * Math.PI * 14) * 5, x = x1 + (x2 - x1) * t + nx * w, y = y1 + (y2 - y1) * t + ny * w; if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      }
      var colors = ['#e84a3c', '#3fae5a', '#3a7fe0']; // түстік заряд (қызыл, жасыл, көк)
      pts.forEach(function (p, i) {
        var k = p[2], r = rb * 0.2;
        R.sphere(ctx, p[0], p[1], r, Q[k][3]);
        ctx.strokeStyle = colors[i % 3]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p[0], p[1], r + 3, 0, 7); ctx.stroke();
        R.txt(ctx, Q[k][0], p[0], p[1], { size: r * 0.9, color: '#fff', weight: '700' });
        R.tag(ctx, frac(Q[k][1]) + 'e', p[0], p[1] + r + 16, { size: 10 });
      });
      R.tag(ctx, B.name ? B.name[0] : B.kind, cx, cy - rb - 18, { size: 13, color: B.name ? '#0b6b78' : '#b4342a' });
      R.tag(ctx, 'q = ' + B.ks.map(function (k) { return '(' + frac(Q[k][1]) + ')'; }).join(' + ') + ' = ' + frac(B.q) + 'e', cx, cy + rb + 22, { size: W < 600 ? 10 : 12, mono: true });
      if (B.name && B.name[1]) R.tag(ctx, B.name[1], cx, cy + rb + 50, { size: 10.5 });
      // Стандартты модель кестесі
      if (W > 640) {
        var tx = W * 0.62, ty = H * 0.14, cw = 70, ch = 46;
        R.txt(ctx, 'Стандартты модель (I буын)', tx + cw * 2, ty - 16, { size: 11.5, color: '#e6ecf0', weight: '700' });
        var cells = [['u', 'жоғарғы', '#d2382b'], ['d', 'төменгі', '#1f5fd1'], ['e', 'электрон', '#8a6100'], ['νₑ', 'нейтрино', '#5b6670'], ['γ', 'фотон', '#0b8a7a'], ['g', 'глюон', '#a8701a'], ['W, Z', 'бозондар', '#5a2d86'], ['H', 'Хиггс', '#7a3fb0']];
        cells.forEach(function (c, i) {
          var x = tx + (i % 4) * (cw + 6), y = ty + Math.floor(i / 4) * (ch + 22);
          ctx.save(); R.rr(ctx, x, y, cw, ch, 8); ctx.fillStyle = R.alpha(c[2], 0.85); ctx.fill(); ctx.restore();
          R.txt(ctx, c[0], x + cw / 2, y + ch * 0.42, { size: 15, color: '#fff', weight: '700' });
          R.txt(ctx, c[1], x + cw / 2, y + ch + 10, { size: 9.5, color: '#c9d6e2' });
        });
      }
    },
  });
})();

/* Инерция моменті: көлбеу жазықтықпен сақина, диск, шар домалайды, үйкеліссіз брусок сырғанайды.
   Сырғанаусыз домалау: a = g sin α / (1 + I/(mR²)). Массалар мен радиустар әсер етпейді — тек пішін. */
(function () {
  var R = window.Real, g = 9.81, LEN = 2;
  var B = [
    { k: 'block', n: 'Брусок (үйкеліссіз сырғанайды)', c: 0, col: '#8a929a' },
    { k: 'sphere', n: 'Тұтас шар: I = 2mR²/5', c: 0.4, col: '#d2382b' },
    { k: 'disk', n: 'Тұтас цилиндр (диск): I = mR²/2', c: 0.5, col: '#2f7fd1' },
    { k: 'ring', n: 'Қуыс цилиндр (сақина): I = mR²', c: 1, col: '#e0a21b' },
  ];
  function acc(b, P) { return g * Math.sin(P.ang * Math.PI / 180) / (1 + b.c); }
  Sim.create({
    aspect: 0.62, grid: false,
    hint: '«Бастау» бас: төрт дене бір мезгілде жіберіледі. Қайсысы бірінші келеді? Неліктен массасы бірдей денелер әртүрлі жылдамдықпен домалайды?',
    controls: [{ type: 'range', key: 'ang', label: 'Көлбеулік бұрышы α', min: 5, max: 30, step: 1, value: 12, unit: '°', digits: 0 }],
    readouts: [
      { key: 't0', label: 'Брусок: уақыт', unit: 'с', digits: 2 },
      { key: 't1', label: 'Шар: уақыт', unit: 'с', digits: 2 },
      { key: 't2', label: 'Диск: уақыт', unit: 'с', digits: 2 },
      { key: 't3', label: 'Сақина: уақыт', unit: 'с', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { var S = api.S, tmax = Math.sqrt(2 * LEN / acc(B[3], api.P)); S.t = Math.min(tmax, S.t + dt * 0.8); if (S.t >= tmax) return false; },
    read: function (api) {
      var out = {}, S = api.S;
      B.forEach(function (b, i) { var tf = Math.sqrt(2 * LEN / acc(b, api.P)); out['t' + i] = S.t >= tf ? tf : null; });
      return out;
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, a = P.ang * Math.PI / 180;
      R.scene(ctx, W, H, 'lab', { table: H * 0.96 });
      var lanes = B.length, lh = (H - 30) / lanes, x0 = 40, lenPx = Math.min(W - 160, (lh - 24) / Math.sin(a) * 1.0);
      lenPx = Math.min(W - 160, lenPx);
      B.forEach(function (b, i) {
        var top = 20 + i * lh, hpx = lenPx * Math.tan(a) > lh - 30 ? lh - 30 : lenPx * Math.tan(a), wpx = hpx / Math.tan(a);
        var sx = x0, sy = top + 10, ex = sx + wpx, ey = sy + hpx;
        // көлбеу тақтай
        ctx.save(); ctx.beginPath(); ctx.moveTo(sx, sy + 6); ctx.lineTo(ex, ey + 6); ctx.lineTo(ex, ey + 14); ctx.lineTo(sx, ey + 14); ctx.closePath();
        ctx.clip(); R.paintFace(ctx, sx, sy, ex - sx, ey + 14 - sy, 'oak', 0); ctx.restore();
        ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy + 6); ctx.lineTo(ex, ey + 6); ctx.stroke();
        // мәре
        ctx.fillStyle = '#d2382b'; ctx.fillRect(ex - 2, ey - 26, 3, 32);
        var tf = Math.sqrt(2 * LEN / acc(b, P)), tt = Math.min(S.t, tf), d = acc(b, P) * tt * tt / 2 / LEN; // үлесі
        var px = sx + d * (ex - sx), py = sy + d * (ey - sy), r = 12;
        var nx = Math.sin(a), ny = -Math.cos(a); // беттің нормалі (жоғары)
        var cxp = px + nx * r, cyp = py + 6 + ny * r;
        if (b.k === 'block') { ctx.save(); ctx.translate(px, py + 6); ctx.rotate(a); R.block(ctx, 0, -20, 28, 20, 'pine', { depth: 4, shadow: false }); ctx.restore(); }
        else {
          var rot = d * LEN / 0.05; // бұрылу бұрышы
          if (b.k === 'sphere') R.sphere(ctx, cxp, cyp, r, b.col);
          else {
            ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, 7); ctx.fill();
            if (b.k === 'ring') { ctx.fillStyle = R.isDark() ? '#2a353d' : '#dde4e8'; ctx.beginPath(); ctx.arc(cxp, cyp, r * 0.65, 0, 7); ctx.fill(); }
            ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + Math.cos(rot) * r, cyp + Math.sin(rot) * r); ctx.stroke();
          }
        }
        R.tag(ctx, b.n + (S.t >= tf ? ' — ' + tf.toFixed(2).replace('.', ',') + ' с' : ''), Math.min(W - 10, ex + 8), top + 14, { size: W < 600 ? 9 : 10.5, align: 'right', color: b.col === '#8a929a' ? '#3a4148' : b.col });
      });
      R.txt(ctx, 'a = g sin α / (1 + I/mR²)', W - 12, H - 10, { size: 11, align: 'right', color: '#0b6b78', weight: '600' });
    },
  });
})();

/* Деформация түрлері (созылу, сығылу, иілу) және серпімді/пластикалық деформация.
   Күшті алып тастағанда серпімді дене бастапқы пішініне оралады, пластикалық дене оралмайды. */
(function () {
  var R = window.Real;
  var MATS = {
    elastic: { name: 'Серпімді (болат серіппе / резеңке / ағаш сызғыш)', elastic: true },
    plastic: { name: 'Пластикалық (пластилин / қорғасын)', elastic: false },
  };
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Күшті өзгертіп, сосын «Күшті алып тастау» батырмасын бас. Дене бастапқы пішініне орала ма?',
    controls: [
      { type: 'select', key: 'type', label: 'Деформация түрі', value: 'stretch', options: [['stretch', 'Созылу'], ['compress', 'Сығылу'], ['bend', 'Иілу']] },
      { type: 'select', key: 'mat', label: 'Материал', value: 'elastic', options: Object.keys(MATS).map(function (k) { return [k, MATS[k].name]; }) },
      { type: 'range', key: 'F', label: 'Түсірілген күш F', min: 0, max: 10, step: 0.5, value: 4, unit: 'Н', live: true },
    ],
    buttons: [{ label: 'Күшті алып тастау', onClick: function (api) { api.set('F', 0); } }],
    readouts: [
      { key: 'd', label: 'Деформация', unit: 'мм', digits: 1 },
      { key: 'kind', label: 'Деформация сипаты', text: true },
    ],
    init: function (api) { var S = api.S; S.d = 0; S.perm = 0; },
    step: function (api, dt) {
      var P = api.P, S = api.S, k = 3; // 1 Н → 3 мм (серпімді)
      var target = MATS[P.mat].elastic ? P.F * k : Math.max(S.perm, P.F * k * 1.6);
      S.d += (target - S.d) * Math.min(1, dt * 6);
      if (!MATS[P.mat].elastic) S.perm = Math.max(S.perm, S.d);
    },
    onLive: function () {},
    read: function (api) {
      var P = api.P, S = api.S;
      return { d: S.d, kind: S.d < 0.2 ? 'деформация жоқ' : P.F === 0 ? (MATS[P.mat].elastic ? 'серпімді: пішіні қалпына келеді' : 'пластикалық: пішіні қалпына келмейді') : (MATS[P.mat].elastic ? 'серпімді' : 'пластикалық') };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.84, el = MATS[P.mat].elastic, px = 4; // 1 мм = 4 px
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.42;
      if (P.type === 'stretch') {
        var top = 30;
        ctx.fillStyle = '#4b5258'; ctx.fillRect(cx - 80, top - 8, 160, 10);
        var L0 = 120, L = L0 + S.d * px;
        if (el) R.spring(ctx, cx, top, cx, top + L, { coils: 14, r: 13, wire: 2.4 });
        else {
          var w0 = 26, w = w0 * Math.sqrt(L0 / L);
          var g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); g.addColorStop(0, '#2f7f3a'); g.addColorStop(0.4, '#6fc06a'); g.addColorStop(1, '#2a6b30');
          ctx.fillStyle = g; R.rr(ctx, cx - w / 2, top, w, L, w / 3); ctx.fill();
        }
        if (P.F > 0) { R.weight(ctx, cx, top + L, Math.round(P.F / 9.8 * 1000)); R.force(ctx, cx + 40, top + L + 10, cx + 40, top + L + 10 + P.F * 8, '#d2382b', 'F'); }
        else { ctx.strokeStyle = '#6b6b60'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, top + L + 6, 5, Math.PI, Math.PI * 2.6); ctx.stroke(); }
        mark(ctx, cx + 70, top, top + L0, top + L);
      } else if (P.type === 'compress') {
        var h0 = 110, h = Math.max(20, h0 - S.d * px * 1.2), w2 = 140 * (el ? 1 : Math.sqrt(h0 / h));
        var by = table - h;
        if (el) { // губка
          ctx.save(); var gg = ctx.createLinearGradient(0, by, 0, table); gg.addColorStop(0, '#f7dc6f'); gg.addColorStop(1, '#d4a92a');
          ctx.fillStyle = gg; R.rr(ctx, cx - w2 / 2, by, w2, h, 8); ctx.fill();
          var r = R.rng(3); ctx.fillStyle = 'rgba(150,110,20,.45)';
          for (var i = 0; i < 60; i++) { ctx.beginPath(); ctx.ellipse(cx - w2 / 2 + 6 + r() * (w2 - 12), by + 6 + r() * (h - 12), 2 + r() * 3, (2 + r() * 3) * h / h0, 0, 0, 7); ctx.fill(); }
          ctx.restore();
        } else {
          var pg = ctx.createRadialGradient(cx - 20, by + 10, 4, cx, by + h / 2, w2);
          pg.addColorStop(0, '#8fe08a'); pg.addColorStop(1, '#2f7f3a');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(cx, by + h / 2, w2 / 2, h / 2, 0, 0, 7); ctx.fill();
        }
        if (P.F > 0) { R.block(ctx, cx - 50, by - 28, 100, 28, 'steel', { depth: 10, shadow: false, label: Sim.fmt(P.F, 1) + ' Н' }); R.force(ctx, cx + 90, by - 50, cx + 90, by - 50 + P.F * 8, '#d2382b', 'F'); }
        mark(ctx, cx + w2 / 2 + 30, table, table - h0, table - h);
      } else {
        // иілу: екі тірекке қойылған сызғыш, ортасында жүк
        var span = Math.min(W * 0.56, 460), x1 = cx - span / 2, x2 = cx + span / 2, sy = table - 90;
        R.block(ctx, x1 - 18, sy, 30, 90, 'oak', { depth: 8 }); R.block(ctx, x2 - 12, sy, 30, 90, 'oak', { depth: 8 });
        var defl = S.d * px * 1.4;
        ctx.save();
        ctx.beginPath();
        for (var t = 0; t <= 1.0001; t += 0.02) { var x = x1 - 20 + t * (span + 40), u = Math.max(0, Math.min(1, (x - x1) / span)), y = sy - 8 + defl * Math.sin(Math.PI * u); if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.lineWidth = 9; ctx.strokeStyle = el ? '#e2c68f' : '#8d949a'; ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
        ctx.restore();
        if (P.F > 0) R.weight(ctx, cx, sy - 8 + defl - 2, Math.round(P.F / 9.8 * 1000));
        mark(ctx, x2 + 50, sy - 8, sy - 8, sy - 8 + defl);
      }
      R.tag(ctx, el ? 'Серпімді деформация' : 'Пластикалық деформация', W * 0.8, 24, { size: 12, color: el ? '#1d7a45' : '#b4342a' });
    },
  });
  // деформацияны көрсететін өлшем белгісі
  function mark(ctx, x, y0, yA, yB) {
    ctx.save(); ctx.strokeStyle = '#0b6b78'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x - 14, yA); ctx.lineTo(x + 14, yA); ctx.moveTo(x - 14, yB); ctx.lineTo(x + 14, yB); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x, yA); ctx.lineTo(x, yB); ctx.stroke(); ctx.restore();
  }
})();

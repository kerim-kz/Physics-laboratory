/* Денелердің электрленуі және электроскоп. Таяқшаны үйкеп зарядта, электроскопқа жақындат (индукция)
   немесе тигіз (заряд беру). Жапырақшалардың ажырау бұрышы зарядқа тәуелді. */
(function () {
  var R = window.Real;
  var RODS = { ebonite: ['Эбонит таяқша + жүн', -1, '#2a2a2a'], glass: ['Шыны таяқша + жібек', 1, '#d8eef7'] };
  Sim.create({
    aspect: 0.62, grid: false, static: true, resetLabel: true,
    hint: 'Таяқшаны үйкеп, электроскоптың шарына жақындат, сосын тигіз. Қолмен ұстау — электроскопты жерге қосу.',
    controls: [
      { type: 'select', key: 'rod', label: 'Таяқша', value: 'ebonite', options: Object.keys(RODS).map(function (k) { return [k, RODS[k][0]]; }), live: true },
      { type: 'range', key: 'd', label: 'Таяқшадан шарға дейінгі қашықтық', min: 0, max: 30, step: 1, value: 25, unit: 'см', digits: 0, live: true },
    ],
    buttons: [
      { label: 'Таяқшаны үйкеу', onClick: function (api) { api.S.q = Math.min(10, api.S.q + 3); } },
      { label: 'Шарға тигізу', onClick: function (api) { var S = api.S, s = RODS[api.P.rod][1]; var t = S.q * 0.4; S.e += s * t; S.q -= t; api.set('d', 0); } },
      { label: 'Электроскопты қолмен ұстау (жерге қосу)', onClick: function (api) { api.S.e = 0; api.S.ground = 1; } },
    ],
    readouts: [
      { key: 'rq', label: 'Таяқшаның заряды', text: true },
      { key: 'eq', label: 'Электроскоптың заряды', text: true },
      { key: 'ang', label: 'Жапырақшалардың ажырау бұрышы', unit: '°', digits: 0 },
    ],
    init: function (api) { var S = api.S; S.q = 0; S.e = 0; },
    step: function () {},
    onLive: function (api, key) { if (key === 'rod') api.S.q = 0; },
    read: function (api) {
      var S = api.S, s = RODS[api.P.rod][1], ind = induced(api);
      var name = function (v) { return Math.abs(v) < 0.05 ? 'зарядталмаған' : (v > 0 ? 'оң (+) ' : 'теріс (−) ') + Sim.fmt(Math.abs(v), 1) + ' шартты бірлік'; };
      return { rq: name(s * S.q), eq: name(S.e), ang: angle(Math.abs(S.e) + ind) };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, rod = RODS[P.rod], table = H * 0.9;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.4, ballY = H * 0.22, ind = induced(api), a = angle(Math.abs(S.e) + ind) * Math.PI / 180;
      // корпус (шыны терезесі бар металл қорап)
      var bw = 170, bh = H * 0.48, bx = cx - bw / 2, by = ballY + 60;
      R.block(ctx, bx, by, bw, bh, 'brass', { depth: 14 });
      ctx.fillStyle = 'rgba(230,242,248,.92)'; ctx.beginPath(); ctx.arc(cx, by + bh / 2, bw * 0.38, 0, 7); ctx.fill();
      ctx.strokeStyle = '#7a6224'; ctx.lineWidth = 3; ctx.stroke();
      R.block(ctx, cx - 60, table - 16, 120, 14, 'oak', { depth: 8 });
      ctx.fillStyle = '#6a5520'; ctx.fillRect(cx - 6, by + bh, 12, table - 16 - by - bh);
      // өзек пен шар
      ctx.fillStyle = '#9aa3ab'; ctx.fillRect(cx - 3, ballY, 6, by + bh / 2 - ballY);
      ctx.fillStyle = '#ece4c8'; ctx.fillRect(cx - 12, by - 4, 24, 14);
      R.sphere(ctx, cx, ballY, 16, '#c3cad1');
      // жапырақшалар (алюминий фольга)
      var py = by + bh / 2 - 10, L = bw * 0.3;
      [-1, 1].forEach(function (sd) {
        ctx.save(); ctx.translate(cx, py); ctx.rotate(sd * a / 2);
        var g = ctx.createLinearGradient(-4, 0, 4, 0); g.addColorStop(0, '#9aa3ab'); g.addColorStop(0.5, '#f4f6f7'); g.addColorStop(1, '#8a9399');
        ctx.fillStyle = g; ctx.fillRect(-3, 0, 6, L); ctx.restore();
      });
      // зарядтар белгілері
      var eSign = S.e > 0.05 ? '+' : S.e < -0.05 ? '−' : '';
      var indTop = ind > 0.05 ? (RODS[P.rod][1] > 0 ? '−' : '+') : '', indBot = ind > 0.05 ? (RODS[P.rod][1] > 0 ? '+' : '−') : '';
      if (eSign || indTop) {
        R.txt(ctx, (indTop || eSign) + (indTop || eSign), cx, ballY - 24, { size: 14, color: (indTop || eSign) === '+' ? '#c62f22' : '#1f5fd1' });
        var leaf = indBot || eSign;
        [-1, 1].forEach(function (sd) { R.txt(ctx, leaf, cx + sd * (Math.sin(a / 2) * L * 0.7 + 10), py + Math.cos(a / 2) * L * 0.6, { size: 13, color: leaf === '+' ? '#c62f22' : '#1f5fd1' }); });
      }
      // таяқша
      var rx = cx + 20 + P.d * 6, ry = ballY - 2;
      ctx.save(); ctx.translate(rx, ry); ctx.rotate(-0.25);
      var rg = ctx.createLinearGradient(0, -8, 0, 8); rg.addColorStop(0, R.shade(rod[2], 0.4)); rg.addColorStop(0.5, rod[2]); rg.addColorStop(1, R.shade(rod[2], -0.4));
      ctx.fillStyle = rg; R.rr(ctx, 0, -8, 190, 16, 8); ctx.fill();
      if (S.q > 0.05) for (var i = 0; i < Math.round(S.q); i++) R.txt(ctx, rod[1] > 0 ? '+' : '−', 14 + i * 12, -16, { size: 13, color: rod[1] > 0 ? '#c62f22' : '#1f5fd1' });
      ctx.restore();
      R.sphere(ctx, rx + 185, ry - 47, 14, '#e3b48a');
      R.tag(ctx, ind > 0.05 && Math.abs(S.e) < 0.05 ? 'Индукция: заряд қайта бөлінді, бірақ жалпы заряд нөлге тең' : 'Ажырау бұрышы зарядтың шамасын көрсетеді', W / 2, H - 16, { size: 11 });
    },
  });
  function induced(api) { var d = api.P.d; return api.S.q * Math.max(0, 1 - d / 30) * 0.6; }
  function angle(q) { return Math.min(80, q * 14); }
})();

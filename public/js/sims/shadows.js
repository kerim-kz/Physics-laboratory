/* Жарықтың түзу сызықты таралуы: көлеңке мен жартылай көлеңке. Нүктелік және үлкен жарық көзі.
   Күн мен Айдың тұтылуы. Шамды, допты тінтуірмен жылжытуға болады. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, grid: false, static: true, resetLabel: false,
    hint: 'Жарық көзін немесе допты тінтуірмен жылжыт. Жарық көзі үлкен болса, жартылай көлеңке пайда болады.',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'lab', options: [['lab', 'Шам, доп және экран'], ['solar', 'Күннің тұтылуы'], ['lunar', 'Айдың тұтылуы']] },
      { type: 'range', key: 'src', label: 'Жарық көзінің өлшемі', min: 0, max: 60, step: 2, value: 0, unit: 'мм', digits: 0 },
    ],
    pointer: {
      down: function (api, p) { var S = api.S; S.drag = Math.hypot(p.x - S.lx, p.y - S.ly) < 40 ? 'l' : Math.hypot(p.x - S.bx, p.y - S.by) < 50 ? 'b' : null; },
      move: function (api, p, down) { var S = api.S; if (!down || !S.drag) return; if (S.drag === 'l') { S.lx = Math.min(p.x, S.bx - 40); S.ly = p.y; } else { S.bx = Math.max(S.lx + 40, Math.min(api.W * 0.8, p.x)); S.by = p.y; } },
      up: function (api) { api.S.drag = null; },
    },
    readouts: [
      { key: 'H', label: 'Көлеңкенің биіктігі (экранда)', unit: 'см', digits: 1 },
      { key: 'pen', label: 'Жартылай көлеңке', text: true },
    ],
    init: function (api) { var S = api.S; S.lx = api.W * 0.12; S.ly = api.H * 0.45; S.bx = api.W * 0.42; S.by = api.H * 0.45; },
    onResize: function (api) { if (!api.S.lx) { api.S.lx = api.W * 0.12; api.S.ly = api.H * 0.45; api.S.bx = api.W * 0.42; api.S.by = api.H * 0.45; } },
    step: function () {},
    read: function (api) { var S = api.S, sx = api.W * 0.88, r = 40; var H = 2 * r * (sx - S.lx) / (S.bx - S.lx); return { H: H / 10, pen: api.P.src > 0 ? 'бар (жарық көзі нүктелік емес)' : 'жоқ (нүктелік жарық көзі)' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S;
      if (P.mode !== 'lab') return eclipse(api, ctx, W, H);
      R.scene(ctx, W, H, 'wall');
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); // қараңғы бөлме
      var sx = W * 0.88, r = 40, src = P.src / 2;
      // экран
      ctx.fillStyle = '#f4f2ea'; ctx.fillRect(sx, H * 0.05, 14, H * 0.9);
      // жарық конусы мен көлеңкелер (экранға проекция)
      var proj = function (lx, ly, ox, oy) { var k = (sx - lx) / (ox - lx); return ly + (oy - ly) * k; };
      ctx.save();
      ctx.fillStyle = 'rgba(255,240,190,.18)'; ctx.beginPath(); ctx.moveTo(S.lx, S.ly); ctx.lineTo(sx, H * 0.05); ctx.lineTo(sx, H * 0.95); ctx.closePath(); ctx.fill();
      // экрандағы жарық
      ctx.fillStyle = 'rgba(255,245,210,.85)'; ctx.fillRect(sx, H * 0.05, 14, H * 0.9);
      // жартылай көлеңке (жарық көзінің шеткі нүктелерінен)
      var t1 = proj(S.lx, S.ly - src, S.bx, S.by - r), b1 = proj(S.lx, S.ly - src, S.bx, S.by + r);
      var t2 = proj(S.lx, S.ly + src, S.bx, S.by - r), b2 = proj(S.lx, S.ly + src, S.bx, S.by + r);
      var umT = Math.max(t1, t2), umB = Math.min(b1, b2), peT = Math.min(t1, t2), peB = Math.max(b1, b2);
      ctx.fillStyle = 'rgba(80,80,80,.55)'; ctx.fillRect(sx, peT, 14, peB - peT);
      if (umB > umT) { ctx.fillStyle = 'rgba(20,20,20,.95)'; ctx.fillRect(sx, umT, 14, umB - umT); }
      // шекаралық сәулелер
      ctx.strokeStyle = 'rgba(255,230,150,.6)'; ctx.lineWidth = 1;
      [[S.ly - src, S.by - r, t1], [S.ly - src, S.by + r, b1], [S.ly + src, S.by - r, t2], [S.ly + src, S.by + r, b2]].forEach(function (q) { ctx.beginPath(); ctx.moveTo(S.lx, q[0]); ctx.lineTo(sx, q[2]); ctx.stroke(); });
      ctx.restore();
      R.sphere(ctx, S.bx, S.by, r, '#3a8f5a');
      if (src > 0) { ctx.fillStyle = '#fff7d8'; ctx.beginPath(); ctx.ellipse(S.lx, S.ly, 6, src, 0, 0, 7); ctx.fill(); R.bulb(ctx, S.lx - 8, S.ly, 18, 1); }
      else { R.bulb(ctx, S.lx - 8, S.ly, 12, 1); }
      R.tag(ctx, 'экран', sx + 7, H * 0.03 + 8, { size: 10.5 });
      if (src > 0) R.tag(ctx, 'жартылай көлеңке', sx - 60, (peT + umT) / 2, { size: 10 });
      R.tag(ctx, 'көлеңке', sx - 40, (umT + umB) / 2, { size: 10 });
    },
  });
  function eclipse(api, ctx, W, H) {
    var P = api.P, solar = P.mode === 'solar';
    R.scene(ctx, W, H, 'space', { seed: 4, count: 140 });
    var sy = H / 2, sunX = W * 0.06, sunR = H * 0.3;
    R.planet(ctx, sunX, sy, sunR, 'sun');
    var ex = solar ? W * 0.82 : W * 0.6, er = 30, mx = solar ? W * 0.58 : W * 0.86, mr = 9;
    // көлеңке конустары
    var occ = solar ? [mx, mr] : [ex, er], tgt = solar ? ex : mx;
    ctx.save();
    var L = (occ[0] - sunX) * occ[1] / (sunR - occ[1]); // толық көлеңке ұзындығы
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.beginPath(); ctx.moveTo(occ[0], sy - occ[1]); ctx.lineTo(occ[0] + L, sy); ctx.lineTo(occ[0], sy + occ[1]); ctx.fill();
    ctx.fillStyle = 'rgba(30,30,40,.35)'; ctx.beginPath(); var spread = (occ[1] + sunR) / (occ[0] - sunX); ctx.moveTo(occ[0], sy - occ[1]); ctx.lineTo(W, sy - occ[1] - spread * (W - occ[0])); ctx.lineTo(W, sy + occ[1] + spread * (W - occ[0])); ctx.lineTo(occ[0], sy + occ[1]); ctx.fill();
    ctx.restore();
    R.planet(ctx, ex, sy, er, 'earth', { light: Math.PI });
    R.planet(ctx, mx, sy, mr, 'moon', { light: Math.PI });
    if (!solar) { ctx.fillStyle = 'rgba(160,50,20,.45)'; ctx.beginPath(); ctx.arc(mx, sy, mr, 0, 7); ctx.fill(); }
    R.tag(ctx, solar ? 'Ай Күн мен Жердің арасында: Ай көлеңкесі түскен жерде Күн толық тұтылады' : 'Жер Күн мен Айдың арасында: Ай Жердің көлеңкесіне кіреді («қызыл Ай»)', W / 2, H - 18, { size: 11, bg: 'rgba(20,30,50,.75)', color: '#dfe8f5' });
    void tgt;
  }
})();

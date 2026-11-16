/* Жарықтың сынуы және толық ішкі шағылуы: жартылай цилиндр тәрізді шыны блок ішінен шыққан лазер сәулесі.
   sin α₀ = 1 / n — шекті бұрыш. Оптикалық талшық. */
(function () {
  var R = window.Real;
  var MED = { glass: ['Шыны', 1.5], water: ['Су', 1.33], diamond: ['Алмаз', 2.42], acrylic: ['Акрил (талшық)', 1.49] };
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Түсу бұрышын арттыр: шекті бұрыштан бастап сынған сәуле жоғалып, бүкіл жарық шағылады.',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'block', options: [['block', 'Жартылай цилиндр шыны блок'], ['fiber', 'Оптикалық талшық']] },
      { type: 'select', key: 'm', label: 'Орта', value: 'glass', options: Object.keys(MED).map(function (k) { return [k, MED[k][0]]; }) },
      { type: 'range', key: 'a', label: 'Түсу бұрышы α', min: 0, max: 89, step: 1, value: 30, unit: '°', digits: 0, live: true },
    ],
    readouts: [
      { key: 'b', label: 'Сыну бұрышы β (ауада)', unit: '°', digits: 1 },
      { key: 'a0', label: 'Шекті бұрыш α₀ = arcsin(1/n)', unit: '°', digits: 1 },
      { key: 'st', label: 'Құбылыс', text: true },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) {
      var n = MED[api.P.m][1], s = n * Math.sin(api.P.a * Math.PI / 180), a0 = Math.asin(1 / n) * 180 / Math.PI;
      return { b: s < 1 ? Math.asin(s) * 180 / Math.PI : null, a0: a0, st: s < 1 ? 'сыну + әлсіз шағылу' : 'толық ішкі шағылу' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, n = MED[P.m][1];
      R.scene(ctx, W, H, 'wall');
      ctx.fillStyle = 'rgba(10,14,22,.82)'; ctx.fillRect(0, 0, W, H);
      if (P.mode === 'fiber') return fiber(ctx, W, H, n, S.t);
      var cx = W * 0.5, cy = H * 0.5, r = Math.min(W, H) * 0.36;
      // жартылай цилиндр (жазық беті жоғары — көлденең сызық, центр — cx, cy)
      ctx.save();
      var g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      g.addColorStop(0, 'rgba(180,225,245,.28)'); g.addColorStop(1, 'rgba(140,200,230,.42)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.arc(cx, cy, r, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(200,235,250,.8)'; ctx.lineWidth = 2; ctx.stroke();
      // бұрыш шкаласы
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.9); ctx.lineTo(cx, cy + r); ctx.stroke();
      for (var dgr = -80; dgr <= 80; dgr += 10) { var aa = Math.PI / 2 + dgr * Math.PI / 180; ctx.beginPath(); ctx.moveTo(cx + Math.cos(aa) * (r + 4), cy + Math.sin(aa) * (r + 4)); ctx.lineTo(cx + Math.cos(aa) * (r + 12), cy + Math.sin(aa) * (r + 12)); ctx.stroke(); }
      ctx.restore();
      // лазер: шыны ішінде центрге қарай (радиус бойымен — дөңес беттен сынбай өтеді)
      var a = P.a * Math.PI / 180, lx = cx - Math.sin(a) * r * 1.3, ly = cy + Math.cos(a) * r * 1.3;
      ctx.fillStyle = '#2a2c30'; ctx.save(); ctx.translate(lx, ly); ctx.rotate(-Math.PI / 2 + a); ctx.fillRect(-6, 0, 12, 40); ctx.restore();
      var beam = function (x1, y1, x2, y2, alpha, w) { ctx.save(); ctx.strokeStyle = 'rgba(255,40,40,' + alpha + ')'; ctx.lineWidth = w || 3; ctx.shadowColor = 'rgba(255,40,40,.9)'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); };
      beam(lx, ly, cx, cy, 1);
      var s = n * Math.sin(a), L = r * 1.3;
      var Rf = s < 1 ? (function () { var ci = Math.cos(a), ct = Math.sqrt(1 - s * s), rs = (n * ci - ct) / (n * ci + ct), rp = (ci - n * ct) / (ci + n * ct); return (rs * rs + rp * rp) / 2; })() : 1;
      beam(cx, cy, cx + Math.sin(a) * L, cy + Math.cos(a) * L, Math.max(0.15, Rf), 1 + Rf * 2.5);
      if (s < 1) { var b = Math.asin(s); beam(cx, cy, cx + Math.sin(b) * L * 1.4, cy - Math.cos(b) * L * 1.4, 1 - Rf * 0.8); }
      R.tag(ctx, 'α = ' + P.a + '°', cx - 50, cy + 50, { size: 11 });
      R.tag(ctx, s < 1 ? 'сынған сәуле' : 'толық ішкі шағылу!', cx + 120, cy - r * 0.8, { size: 11.5, color: s < 1 ? '#1b2329' : '#b4342a' });
    },
  });
  function fiber(ctx, W, H, n, t) {
    // иілген талшық: сәуле қабырғалардан шағылып жүреді
    var pts = []; for (var i = 0; i <= 100; i++) { var x = W * 0.08 + i / 100 * W * 0.84, y = H * 0.5 + Math.sin(i / 100 * Math.PI * 2) * H * 0.18; pts.push([x, y]); }
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(160,210,235,.35)'; ctx.lineWidth = 40; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,235,250,.5)'; ctx.lineWidth = 1; ctx.stroke();
    // сәуле: орталық сызыққа қатысты зигзаг
    ctx.strokeStyle = 'rgba(255,50,50,.95)'; ctx.shadowColor = 'rgba(255,40,40,.9)'; ctx.shadowBlur = 8; ctx.lineWidth = 2.5; ctx.beginPath();
    for (var j = 0; j < pts.length; j++) {
      var p = pts[j], q = pts[Math.min(pts.length - 1, j + 1)], ang = Math.atan2(q[1] - p[1], q[0] - p[0]), off = Math.asin(Math.sin(j * 0.55)) / (Math.PI / 2) * 16;
      var x = p[0] - Math.sin(ang) * off, y = p[1] + Math.cos(ang) * off;
      if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.restore();
    var end = pts[pts.length - 1];
    var g = ctx.createRadialGradient(end[0], end[1], 2, end[0], end[1], 40 + Math.sin(t * 6) * 4);
    g.addColorStop(0, 'rgba(255,80,60,.9)'); g.addColorStop(1, 'rgba(255,80,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(end[0], end[1], 44, 0, 7); ctx.fill();
    R.tag(ctx, 'Сәуле талшықтың қабырғасынан толық шағылып, иілген жолмен жүреді (n = ' + String(n).replace('.', ',') + ')', W / 2, H - 20, { size: 11, bg: 'rgba(20,30,50,.75)', color: '#dfe8f5' });
  }
})();

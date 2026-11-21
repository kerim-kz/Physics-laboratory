/* Жаңғырық (эхо): дыбыс кедергіден шағылып қайтады. s = v·t / 2. Тауда айғайлау (ауадағы дыбыс) және кеменің эхолоты (судағы дыбыс). */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, grid: false,
    hint: '«Бастау» — дыбыс импульсі жіберіледі. Жаңғырықтың қайтып келу уақыты бойынша қашықтықты есепте: s = vt/2.',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'cliff', options: [['cliff', 'Таудағы жаңғырық (ауа)'], ['sonar', 'Кеменің эхолоты (теңіз суы)']] },
      { type: 'range', key: 'd', label: 'Жартасқа дейінгі қашықтық', min: 50, max: 600, step: 10, value: 340, unit: 'м', digits: 0 },
      { type: 'range', key: 'h', label: 'Теңіздің тереңдігі (эхолот)', min: 100, max: 3000, step: 100, value: 1200, unit: 'м', digits: 0 },
      { type: 'range', key: 'T', label: 'Ауаның температурасы (жаңғырық)', min: -30, max: 40, step: 5, value: 20, unit: '°C', digits: 0 },
    ],
    readouts: [
      { key: 'v', label: 'Дыбыс жылдамдығы v', unit: 'м/с', digits: 0 },
      { key: 't', label: 'Уақыт (секундомер)', unit: 'с', digits: 3 },
      { key: 'te', label: 'Жаңғырықтың қайту уақыты', unit: 'с', digits: 3 },
      { key: 's', label: 'Есептелген қашықтық s = v·t / 2', unit: 'м', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; api.S.back = false; },
    step: function (api, dt) {
      var S = api.S, P = api.P, v = speed(P), te = 2 * dist(P) / v;
      S.t = Math.min(te, S.t + dt * te / 4); // экранда ~4 с
      if (S.t >= te) { S.back = true; return false; }
    },
    read: function (api) {
      var S = api.S, P = api.P, v = speed(P), te = 2 * dist(P) / v;
      return { v: v, t: S.t, te: S.back ? te : null, s: S.back ? v * te / 2 : null };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, v = speed(P), d = dist(P), te = 2 * d / v;
      if (P.mode === 'cliff') cliff(api, ctx, W, H, v, d, te); else sonar(api, ctx, W, H, v, d, te);
      // секундомер
      R.lcd(ctx, W - 150, 16, 130, 30, Sim.fmt(S.t, 3).replace('.', ',') + ' с', { size: 16 });
      if (S.back) R.tag(ctx, 's = ' + Math.round(v) + ' · ' + Sim.fmt(te, 3) + ' / 2 = ' + Sim.fmt(v * te / 2, 1) + ' м', W / 2, H - 22, { size: 12.5, color: '#0b6b78' });
    },
  });
  function speed(P) { return P.mode === 'cliff' ? 331 + 0.6 * P.T : 1500; }
  function dist(P) { return P.mode === 'cliff' ? P.d : P.h; }
  function pulses(ctx, x0, y0, r, dir, color, maxR, clip) {
    ctx.save(); if (clip) clip();
    for (var k = 0; k < 4; k++) {
      var rr = r - k * 10; if (rr <= 2 || rr > maxR) continue;
      ctx.strokeStyle = color.replace('A', String(0.9 - k * 0.2)); ctx.lineWidth = 3 - k * 0.5;
      ctx.beginPath(); ctx.arc(x0, y0, rr, dir - 0.5, dir + 0.5); ctx.stroke();
    }
    ctx.restore();
  }
  function cliff(api, ctx, W, H, v, d, te) {
    var S = api.S, ground = H * 0.78;
    R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true });
    var x0 = W * 0.12, x1 = W * 0.82, ppm = (x1 - x0) / d;
    // тау жартасы
    ctx.fillStyle = '#7d736a'; ctx.beginPath(); ctx.moveTo(x1, ground); ctx.lineTo(x1 + 10, ground - H * 0.55); ctx.lineTo(x1 + 70, ground - H * 0.68); ctx.lineTo(W, ground - H * 0.6); ctx.lineTo(W, ground); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.moveTo(x1, ground); ctx.lineTo(x1 + 10, ground - H * 0.55); ctx.lineTo(x1 + 24, ground - H * 0.55); ctx.lineTo(x1 + 16, ground); ctx.fill();
    ctx.fillStyle = '#f4f6f8'; ctx.beginPath(); ctx.moveTo(x1 + 50, ground - H * 0.66); ctx.lineTo(x1 + 70, ground - H * 0.68); ctx.lineTo(x1 + 95, ground - H * 0.65); ctx.lineTo(x1 + 72, ground - H * 0.62); ctx.fill();
    // адам
    var py = ground;
    ctx.fillStyle = '#2f4f7a'; ctx.fillRect(x0 - 7, py - 40, 6, 40); ctx.fillRect(x0 + 1, py - 40, 6, 40);
    ctx.fillStyle = '#d8473b'; R.rr(ctx, x0 - 11, py - 72, 22, 34, 6); ctx.fill();
    ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(x0, py - 82, 10, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d8473b'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + 8, py - 66); ctx.lineTo(x0 + 16, py - 80); ctx.stroke();
    var mouthY = py - 82, dist = v * S.t, going = dist <= d;
    var r = (going ? dist : 2 * d - dist) * ppm;
    if (going) pulses(ctx, x0 + 12, mouthY, r, 0, 'rgba(210,56,43,A)', (x1 - x0));
    else pulses(ctx, x1, mouthY, r, Math.PI, 'rgba(31,95,209,A)', (x1 - x0));
    if (S.t < te * 0.15) R.tag(ctx, '«Ау-у!»', x0 + 40, mouthY - 24, { size: 12 });
    if (S.back) R.tag(ctx, '«…у-у!» (жаңғырық)', x0 + 70, mouthY - 24, { size: 12, color: '#1f5fd1' });
    ctx.strokeStyle = '#38424b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, ground + 20); ctx.lineTo(x1, ground + 20); ctx.stroke();
    R.tag(ctx, 'd = ' + Math.round(d) + ' м', (x0 + x1) / 2, ground + 20, { size: 11 });
    R.tag(ctx, 'v = 331 + 0,6·t = ' + Math.round(v) + ' м/с', W * 0.36, 24, { size: 11.5, color: '#0b6b78' });
  }
  function sonar(api, ctx, W, H, v, d, te) {
    var S = api.S, sea = H * 0.22, bottom = H * 0.9, ppm = (bottom - sea - 30) / d;
    var sky = ctx.createLinearGradient(0, 0, 0, sea); sky.addColorStop(0, '#6fb2e8'); sky.addColorStop(1, '#d6ecf8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, sea);
    var wg = ctx.createLinearGradient(0, sea, 0, H); wg.addColorStop(0, '#2c7bb8'); wg.addColorStop(1, '#0b2440');
    ctx.fillStyle = wg; ctx.fillRect(0, sea, W, H - sea);
    // теңіз түбі
    ctx.fillStyle = '#8a7a5a'; ctx.beginPath(); ctx.moveTo(0, H); var rr = R.rng(4);
    for (var x = 0; x <= W; x += 20) ctx.lineTo(x, bottom + 6 * Math.sin(x / 50) + rr() * 6);
    ctx.lineTo(W, H); ctx.fill();
    // кеме
    var bx = W * 0.35;
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(bx - 80, sea - 2); ctx.lineTo(bx + 90, sea - 2); ctx.lineTo(bx + 70, sea + 18); ctx.lineTo(bx - 66, sea + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2f2ee'; ctx.fillRect(bx - 50, sea - 30, 80, 28); ctx.fillStyle = '#3a4148'; ctx.fillRect(bx - 40, sea - 22, 60, 8);
    ctx.fillStyle = '#e0a21b'; ctx.fillRect(bx + 10, sea - 48, 10, 18);
    var dist = v * S.t, going = dist <= d, r = (going ? dist : 2 * d - dist) * ppm;
    var ex = bx, ey = sea + 18;
    ctx.save(); ctx.beginPath(); ctx.rect(0, sea, W, bottom - sea + 10); ctx.clip();
    if (going) pulses(ctx, ex, ey, r, Math.PI / 2, 'rgba(255,214,102,A)', bottom - sea);
    else pulses(ctx, ex, ey + d * ppm, r, -Math.PI / 2, 'rgba(127,224,160,A)', bottom - sea);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bx + 110, ey); ctx.lineTo(bx + 110, ey + d * ppm); ctx.stroke(); ctx.setLineDash([]);
    R.tag(ctx, 'h = ' + Math.round(d) + ' м', bx + 150, (ey + ey + d * ppm) / 2, { size: 11 });
    R.tag(ctx, 'Судағы дыбыс жылдамдығы ≈ 1500 м/с', W * 0.36, 22, { size: 11.5, color: '#0b6b78' });
    // балықтар
    for (var f = 0; f < 5; f++) { var fx = (W * (0.15 + f * 0.17) + S.t * 30 * (f % 2 ? 1 : -1) + W) % W, fy = sea + 60 + f * (bottom - sea - 100) / 5; ctx.fillStyle = 'rgba(200,220,240,.6)'; ctx.beginPath(); ctx.ellipse(fx, fy, 10, 4, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx - 9, fy); ctx.lineTo(fx - 16, fy - 4); ctx.lineTo(fx - 16, fy + 4); ctx.fill(); }
  }
})();

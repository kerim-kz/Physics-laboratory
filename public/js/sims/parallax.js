/* Параллакс әдісі: жылдық параллакс (r = 1/p, пк) және горизонталь параллакс (D = R⊕ / sin p). Бұрыштар көрнекілік үшін үлкейтілген. */
(function () {
  var R = window.Real, rad = Math.PI / 180;
  var STARS = { proxima: ['Проксима Центавра', 0.768], sirius: ['Сириус', 0.379], altair: ['Альтаир', 0.195], vega: ['Вега', 0.130], custom: ['Өз жұлдызым', null] };
  var BODIES = { moon: ['Ай', 57 / 60 * 3600], venus: ['Шолпан (ең жақын кезде)', 31], mars: ['Марс (ұлы қарсы тұру)', 23], sun: ['Күн', 8.8] }; // p, бұрыштық секунд
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true, autoplay: true,
    hint: 'Жер Күнді айналғанда жақын жұлдыз алыстағы жұлдыздардың фонында жылжиды. Жарты жылдағы ығысудың жартысы — жылдық параллакс p.',
    controls: [
      { type: 'select', key: 'mode', label: 'Әдіс', value: 'annual', options: [['annual', 'Жылдық параллакс (жұлдыздар)'], ['horiz', 'Горизонталь параллакс (Күн жүйесі)']] },
      { type: 'select', key: 'star', label: 'Жұлдыз', value: 'proxima', options: Object.keys(STARS).map(function (k) { return [k, STARS[k][0]]; }) },
      { type: 'range', key: 'p', label: 'Өз жұлдызымның параллаксы p', min: 0.05, max: 1, step: 0.05, value: 0.5, unit: '″', digits: 2 },
      { type: 'select', key: 'body', label: 'Күн жүйесіндегі дене', value: 'moon', options: Object.keys(BODIES).map(function (k) { return [k, BODIES[k][0]]; }) },
    ],
    readouts: [
      { key: 'p', label: 'Параллакс p', unit: '″', digits: 3 },
      { key: 'pc', label: 'Қашықтық r = 1/p', unit: 'пк', digits: 2 },
      { key: 'ly', label: 'Жарық жылымен', unit: 'ж. ж.', digits: 2 },
      { key: 'km', label: 'Километрмен', unit: 'км', digits: 3 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt * 0.35; },
    read: function (api) {
      var P = api.P;
      if (P.mode === 'annual') {
        var p = P.star === 'custom' ? P.p : STARS[P.star][1], pc = 1 / p;
        return { p: p, pc: pc, ly: pc * 3.2616, km: pc * 3.0857e13 };
      }
      var ph = BODIES[P.body][1], D = 6371 / Math.sin(ph / 3600 * rad);
      return { p: ph, pc: null, ly: null, km: D };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S;
      R.scene(ctx, W, H, 'space', { seed: 21, count: 200 });
      if (P.mode === 'annual') annual(api, ctx, W, H); else horiz(api, ctx, W, H);
    },
  });
  function annual(api, ctx, W, H) {
    var P = api.P, S = api.S, p = P.star === 'custom' ? P.p : STARS[P.star][1];
    var wide = W > 680, sw = wide ? W * 0.58 : W, sh = wide ? H : H * 0.6;
    // жоғарыдан көрініс: Күн, Жер орбитасы, жұлдыз
    var cx = sw * 0.5, cy = sh * 0.8, a = Math.min(sw * 0.18, sh * 0.16), ang = S.t;
    var ex = cx + Math.cos(ang) * a, ey = cy + Math.sin(ang) * a * 0.42;
    var dist = (sh * 0.62) * (0.4 + 0.6 * (0.13 / p) / (0.13 / p + 0.6)); // үлкейтілген масштаб: алыс жұлдыз жоғары
    var sx = cx, sy = cy - dist;
    ctx.save(); ctx.strokeStyle = 'rgba(160,190,230,.5)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(cx, cy, a, a * 0.42, 0, 0, 7); ctx.stroke(); ctx.restore();
    R.planet(ctx, cx, cy, 13, 'sun');
    // қаңтар және шілде күйлері
    [[cx - a, cy, 'Қаңтар'], [cx + a, cy, 'Шілде']].forEach(function (q) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,214,102,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(sx, sy); ctx.stroke(); ctx.restore();
      ctx.globalAlpha = 0.45; R.planet(ctx, q[0], q[1], 6, 'earth'); ctx.globalAlpha = 1;
      R.txt(ctx, q[2], q[0], q[1] + 18, { size: 10, color: '#c9d6e2' });
    });
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy); ctx.stroke(); ctx.restore();
    // p бұрышы жұлдызда
    var aL = Math.atan2(cy - sy, cx - a - sx), aC = Math.atan2(cy - sy, 0);
    ctx.strokeStyle = '#ff8f6b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 34, Math.min(aL, aC), Math.max(aL, aC)); ctx.stroke();
    R.tag(ctx, 'p', sx - 22, sy + 44, { size: 11, color: '#b4342a' });
    R.tag(ctx, '1 а. б.', cx - a / 2, cy - 12, { size: 10 });
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(sx, sy); ctx.stroke(); ctx.restore();
    R.planet(ctx, ex, ey, 7, 'earth');
    var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14); glow.addColorStop(0, 'rgba(255,240,210,1)'); glow.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, 14, 0, 7); ctx.fill();
    R.tag(ctx, (P.star === 'custom' ? 'Жұлдыз' : STARS[P.star][0]) + ' · r = ' + Sim.fmt(1 / p, 2) + ' пк', sx, sy - 22, { size: 10.5 });
    R.txt(ctx, 'Масштаб сақталмаған: бұрыштар мыңдаған есе үлкейтілген', sw / 2, sh - 10, { size: 9.5, color: '#8d9db0' });
    // телескоптағы көрініс
    var vx = wide ? sw + 16 : 16, vy = wide ? 30 : sh + 8, vw = wide ? W - sw - 32 : W - 32, vh = wide ? H - 60 : H - sh - 16;
    var vr = Math.min(vw, vh) / 2 - 6, vcx = vx + vw / 2, vcy = vy + vh / 2;
    ctx.save(); ctx.beginPath(); ctx.arc(vcx, vcy, vr, 0, 7); ctx.fillStyle = '#04060c'; ctx.fill(); ctx.clip();
    var rr = R.rng(99);
    for (var i = 0; i < 70; i++) { var x = vcx + (rr() * 2 - 1) * vr, y = vcy + (rr() * 2 - 1) * vr, b = rr(); ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + b * 0.6) + ')'; ctx.beginPath(); ctx.arc(x, y, 0.6 + b * 1.4, 0, 7); ctx.fill(); }
    var shift = -Math.cos(ang) * vr * 0.55 * (p / 0.8); // Жер қозғалысына қарама-қарсы
    var shiftY = -Math.sin(ang) * vr * 0.55 * (p / 0.8) * 0.42;
    ctx.strokeStyle = 'rgba(255,143,107,.6)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.ellipse(vcx, vcy, vr * 0.55 * (p / 0.8), vr * 0.55 * (p / 0.8) * 0.42, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    var g2 = ctx.createRadialGradient(vcx + shift, vcy + shiftY, 0, vcx + shift, vcy + shiftY, 10); g2.addColorStop(0, 'rgba(255,240,210,1)'); g2.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(vcx + shift, vcy + shiftY, 10, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(vcx - vr, vcy); ctx.lineTo(vcx + vr, vcy); ctx.moveTo(vcx, vcy - vr); ctx.lineTo(vcx, vcy + vr); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#59636e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(vcx, vcy, vr, 0, 7); ctx.stroke(); ctx.restore();
    R.tag(ctx, 'Телескоптағы көрініс: жұлдыз жыл бойы эллипс сызады', vcx, vy + 4, { size: wide ? 10.5 : 9.5 });
  }
  function horiz(api, ctx, W, H) {
    var P = api.P, S = api.S, B = BODIES[P.body], cy = H * 0.55;
    var ex = W * 0.2, Re = Math.min(H * 0.24, W * 0.12), bx = W * 0.84;
    R.planet(ctx, ex, cy, Re, 'earth', { light: 0 });
    R.planet(ctx, bx, cy, P.body === 'sun' ? 22 : P.body === 'moon' ? 12 : 8, P.body === 'sun' ? 'sun' : P.body === 'moon' ? 'moon' : P.body === 'venus' ? 'venus' : 'mars');
    // бақылаушы экватор нүктесінде, дене көкжиекте
    var ox = ex, oy = cy - Re;
    ctx.save(); ctx.strokeStyle = 'rgba(255,214,102,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, cy); ctx.lineTo(bx, cy); ctx.stroke();
    ctx.strokeStyle = '#7fd08a'; ctx.beginPath(); ctx.moveTo(ex, cy); ctx.lineTo(ox, oy); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ox, oy, 3.5, 0, 7); ctx.fill();
    R.tag(ctx, 'R⊕ = 6371 км', ex + 50, cy - Re / 2, { size: 10.5, color: '#1d7a33' });
    R.tag(ctx, 'Бақылаушы (дене көкжиекте)', ox + 10, oy - 18, { size: 10, align: 'left' });
    var aa = Math.atan2(oy - cy, ox - bx);
    ctx.strokeStyle = '#ff8f6b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, cy, 60, aa, Math.PI); ctx.stroke();
    R.tag(ctx, 'p', bx - 70, cy - 8, { size: 11, color: '#b4342a' });
    R.tag(ctx, B[0] + ': p = ' + (B[1] >= 60 ? Sim.fmt(B[1] / 60, 1) + '′' : Sim.fmt(B[1], 1) + '″'), bx - 20, cy + 40, { size: 11 });
    var D = 6371 / Math.sin(B[1] / 3600 * rad);
    R.tag(ctx, 'D = R⊕ / sin p = ' + Sim.fmt(D, 3) + ' км', W / 2, 26, { size: 12.5, color: '#0b6b78' });
    R.txt(ctx, 'Масштаб сақталмаған: бұрыш үлкейтілген', W / 2, H - 10, { size: 9.5, color: '#8d9db0' });
  }
})();

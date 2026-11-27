/* «Айға қон»: тік қону. Зымыранға ауырлық күші mg және қозғалтқыштың тарту күші F әсер етеді:
   a = F/m − g (жоғары оң). Отын жанған сайын масса азаяды. Жанама қозғалтқыштар — көлденең түзету.
   Сәтті қону: |v_y| ≤ 2 м/с, |v_x| ≤ 1 м/с және алаңның үстінде. */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T;
  var LW = 900, LH = 540;
  var BODIES = {
    moon: { name: 'Ай', g: 1.62, sky: ['#05070f', '#1b2236'], ground: '#b9bec6', g2: '#8e949c' },
    mars: { name: 'Марс', g: 3.71, sky: ['#3a1a12', '#c2673f'], ground: '#b5532e', g2: '#8a3a1e' },
    earth: { name: 'Жер', g: 9.8, sky: ['#5aa7f0', '#cfe8ff'], ground: '#4f9a3f', g2: '#3a7a2e' },
    titan: { name: 'Титан', g: 1.35, sky: ['#5a4316', '#c99a3a'], ground: '#8a6a32', g2: '#6a4e22' },
  };
  // h — бастапқы биіктік (м), fuel — отын (кг), vx0 — бастапқы көлденең жылдамдық, pad — алаңның центрі (0…1), w — ені (м)
  var LEVELS = [
    { n: 'Айға алғашқы қону', b: 'moon', h: 120, fuel: 300, v0: 0, vx0: 0, pad: 0.5, w: 40 },
    { n: 'Тезірек құлау', b: 'moon', h: 180, fuel: 260, v0: -8, vx0: 0, pad: 0.5, w: 32 },
    { n: 'Бүйірге ауытқу', b: 'moon', h: 160, fuel: 300, v0: -4, vx0: 3, pad: 0.6, w: 30 },
    { n: 'Титан', b: 'titan', h: 200, fuel: 260, v0: -6, vx0: -2, pad: 0.35, w: 28 },
    { n: 'Марс', b: 'mars', h: 220, fuel: 420, v0: -10, vx0: 0, pad: 0.5, w: 32 },
    { n: 'Марс: тар алаң', b: 'mars', h: 240, fuel: 420, v0: -12, vx0: 4, pad: 0.7, w: 20 },
    { n: 'Отын аз', b: 'moon', h: 260, fuel: 160, v0: -14, vx0: -3, pad: 0.4, w: 22 },
    { n: 'Жерге қайту', b: 'earth', h: 200, fuel: 900, v0: -15, vx0: 0, pad: 0.5, w: 36 },
    { n: 'Жер: жел соғады', b: 'earth', h: 240, fuel: 950, v0: -18, vx0: 5, pad: 0.3, w: 26, wind: 0.6 },
    { n: 'Шебер ұшқыш', b: 'mars', h: 300, fuel: 380, v0: -20, vx0: -6, pad: 0.75, w: 16, wind: 0.3 },
  ];
  var M_DRY = 1000, F_MAX_K = 3.2, F_SIDE = 500, U = 2500; // құрғақ масса (кг), тарту = 3,2·m·g, жанама (Н), газдың шығу жылдамдығы (м/с)
  var lvI, L, B, st, keys = {}, stop, c, ctx, ended;
  function startLevel(n) {
    lvI = n - 1; L = LEVELS[lvI]; B = BODIES[L.b]; ended = false;
    st = { x: 0, y: L.h, vx: L.vx0, vy: L.v0, fuel: L.fuel, thr: false, left: false, right: false, t: 0, flame: 0 };
    var r = S.root; r.innerHTML = '';
    r.appendChild(S.hud([['Деңгей', 'nL', n + ' / ' + LEVELS.length], ['Биіктік', 'nH', ''], ['Жылдамдық', 'nV', ''], ['Отын', 'nF', ''], ['g', 'nG', String(B.g).replace('.', ',') + ' м/с²']]));
    c = S.canvas(LW, LH); ctx = c.ctx;
    var ctl = S.el('div', 'nctl');
    ctl.innerHTML = '<button type="button" class="btn lg gbig" data-k="left">◀</button><button type="button" class="btn lg gbig nthr" data-k="thr">🔥 ' + T('Тарту') + '</button><button type="button" class="btn lg gbig" data-k="right">▶</button>';
    r.appendChild(ctl);
    ctl.querySelectorAll('button').forEach(function (b) {
      var k = b.getAttribute('data-k');
      var on = function (e) { e.preventDefault(); st[k] = true; b.classList.add('on'); };
      var off = function () { st[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    r.appendChild(S.el('p', 'muted small', T('Пернетақта: бос орын / ↑ — тарту, ← → — бүйірлік қозғалтқыштар. Қону жылдамдығы 2 м/с-тан аспасын!')));
    if (stop) stop(); stop = S.loop(step);
  }
  function key(e, v) {
    if (!st || ended) return;
    var k = e.key === ' ' || e.key === 'ArrowUp' ? 'thr' : e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : null;
    if (k) { e.preventDefault(); st[k] = v; }
  }
  document.addEventListener('keydown', function (e) { key(e, true); });
  document.addEventListener('keyup', function (e) { key(e, false); });

  function step(dt) {
    if (!ended) {
      var m = M_DRY + st.fuel, Fmax = F_MAX_K * M_DRY * B.g;
      var thr = st.thr && st.fuel > 0, side = (st.left || st.right) && st.fuel > 0;
      var ay = -B.g + (thr ? Fmax / m : 0);
      var ax = (side ? (st.right ? 1 : -1) * F_SIDE / m : 0) + (L.wind ? Math.sin(st.t * 0.7) * L.wind : 0);
      if (thr) st.fuel = Math.max(0, st.fuel - Fmax / U * dt);
      if (side) st.fuel = Math.max(0, st.fuel - F_SIDE / U * dt);
      st.vy += ay * dt; st.vx += ax * dt; st.y += st.vy * dt; st.x += st.vx * dt; st.t += dt;
      st.flame = thr ? Math.min(1, st.flame + dt * 8) : Math.max(0, st.flame - dt * 8);
      st.ay = ay;
      if (st.y <= 0) land();
      S.set('nH', Math.max(0, st.y).toFixed(0) + ' ' + T('м'));
      S.set('nV', Math.abs(st.vy).toFixed(1).replace('.', ',') + ' ' + T('м/с'));
      S.set('nF', st.fuel.toFixed(0) + ' ' + T('кг'));
      var hv = document.getElementById('nV'); if (hv) hv.parentElement.classList.toggle('warn', st.vy < -2 && st.y < 60);
    }
    draw();
  }
  function padX() { return (L.pad - 0.5) * 240; }
  function land() {
    st.y = 0; ended = true;
    var onPad = Math.abs(st.x - padX()) <= L.w / 2, ok = st.vy >= -2 && Math.abs(st.vx) <= 1 && onPad;
    var stars = 0;
    if (ok) { var fr = st.fuel / L.fuel; stars = fr > 0.4 ? 3 : fr > 0.15 ? 2 : 1; S.setLevelStars(lvI + 1, stars); S.sfx('ok'); }
    else S.sfx('boom');
    st.crash = !ok;
    var why = !onPad ? T('Зымыран алаңнан тыс қонды.') : st.vy < -2 ? T('Тік жылдамдық тым үлкен') + ': ' + Math.abs(st.vy).toFixed(1).replace('.', ',') + ' ' + T('м/с') + '.' : T('Көлденең жылдамдық тым үлкен') + ': ' + Math.abs(st.vx).toFixed(1).replace('.', ',') + ' ' + T('м/с') + '.';
    setTimeout(function () {
      if (stop) { stop(); stop = null; }
      var last = lvI === LEVELS.length - 1;
      S.end({ title: ok ? 'Сәтті қону!' : 'Апат!', stars: stars, score: ok ? campaign() : null, unit: 'жорық ұпайы',
        lines: ok ? [T('Қону жылдамдығы') + ': ' + Math.abs(st.vy).toFixed(1).replace('.', ',') + ' ' + T('м/с') + '. ' + T('Қалған отын') + ': ' + st.fuel.toFixed(0) + ' ' + T('кг') + '.'] : [why, T('Кеңес: тартуды ерте қос — үдеу a = F/m − g, тежеуге уақыт керек.')],
        onNext: ok && !last ? function () { startLevel(lvI + 2); } : null, onAgain: function () { startLevel(lvI + 1); }, onMenu: menu });
    }, ok ? 900 : 1300);
  }
  function campaign() { var s0 = S.levelStars(), s = 0; for (var k in s0) s += s0[k] * 100; return s; }
  function draw() {
    var sky = ctx.createLinearGradient(0, 0, 0, LH); sky.addColorStop(0, B.sky[0]); sky.addColorStop(1, B.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, LW, LH);
    if (L.b === 'moon' || L.b === 'titan') { ctx.fillStyle = '#fff'; for (var s = 0; s < 70; s++) { ctx.globalAlpha = 0.25 + (s % 4) / 6; ctx.fillRect((s * 131) % LW, (s * 59) % 300, 2, 2); } ctx.globalAlpha = 1; }
    if (L.b === 'moon') { ctx.fillStyle = '#4f8fe0'; ctx.beginPath(); ctx.arc(780, 80, 30, 0, 7); ctx.fill(); ctx.fillStyle = '#5fbf5f'; ctx.beginPath(); ctx.arc(772, 74, 12, 0, 7); ctx.fill(); }
    var GY = LH - 60, k = (GY - 40) / Math.max(L.h * 1.05, 60), cx = LW / 2;
    var X = function (x) { return cx + x * k * 1.1; };
    // жер беті
    ctx.fillStyle = B.ground; ctx.beginPath(); ctx.moveTo(0, LH);
    for (var x = 0; x <= LW; x += 20) ctx.lineTo(x, GY + 6 + Math.sin(x * 0.03) * 6 + Math.sin(x * 0.11) * 3);
    ctx.lineTo(LW, LH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = B.g2; for (var cr = 0; cr < 8; cr++) { ctx.beginPath(); ctx.ellipse((cr * 197 + 60) % LW, GY + 30 + (cr % 3) * 8, 18 + cr % 3 * 6, 5, 0, 0, 7); ctx.fill(); }
    // қону алаңы
    var p0 = X(padX() - L.w / 2), p1 = X(padX() + L.w / 2);
    ctx.fillStyle = '#2b2f36'; ctx.fillRect(p0, GY - 2, p1 - p0, 10);
    ctx.fillStyle = '#ffd34d'; for (var px = p0; px < p1; px += 16) ctx.fillRect(px, GY - 2, 8, 4);
    ctx.fillStyle = '#ff4d6d'; ctx.fillRect(p0 - 2, GY - 18, 3, 18); ctx.fillRect(p1 - 1, GY - 18, 3, 18);
    // зымыран
    var rx = X(st.x), ry = GY - Math.max(0, st.y) * k;
    ctx.save(); ctx.translate(rx, ry);
    if (st.crash) {
      for (var i = 0; i < 16; i++) { var a = i * 0.39, d = Math.min(60, (st.t % 100) * 0) + 30 + (i % 3) * 10; ctx.fillStyle = i % 2 ? '#ff9800' : '#ffd34d'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, -10 + Math.sin(a) * d * 0.6, 8, 0, 7); ctx.fill(); }
    } else {
      if (st.flame > 0) { var fl = 18 + st.flame * 26 + Math.random() * 8; var fg = ctx.createLinearGradient(0, 0, 0, fl); fg.addColorStop(0, '#fff6c2'); fg.addColorStop(0.4, '#ffb02e'); fg.addColorStop(1, 'rgba(255,80,40,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.quadraticCurveTo(0, fl * 1.2, 9, -2); ctx.fill(); }
      if (st.left && st.fuel > 0) { ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(14, -30); ctx.lineTo(30, -27); ctx.lineTo(14, -24); ctx.fill(); }
      if (st.right && st.fuel > 0) { ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-30, -27); ctx.lineTo(-14, -24); ctx.fill(); }
      ctx.fillStyle = '#9aa1a8'; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-22, 0); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(22, 0); ctx.lineTo(18, 0); ctx.closePath(); ctx.fill();
      var bodyG = ctx.createLinearGradient(-14, 0, 14, 0); bodyG.addColorStop(0, '#cfd6dc'); bodyG.addColorStop(0.5, '#ffffff'); bodyG.addColorStop(1, '#aab3bb');
      ctx.fillStyle = bodyG; ctx.beginPath(); ctx.moveTo(0, -62); ctx.quadraticCurveTo(16, -46, 14, -6); ctx.lineTo(-14, -6); ctx.quadraticCurveTo(-16, -46, 0, -62); ctx.fill();
      ctx.fillStyle = '#2b7bd6'; ctx.beginPath(); ctx.arc(0, -38, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#e2553d'; ctx.fillRect(-14, -14, 28, 6);
    }
    ctx.restore();
    // күштер векторлары
    if (!ended) {
      var m = M_DRY + st.fuel, sc = 34 / (F_MAX_K * M_DRY * B.g);
      var mg = m * B.g * sc;
      arrow(rx + 30, ry - 30, rx + 30, ry - 30 + mg, '#2b7bd6', 'mg');
      if (st.thr && st.fuel > 0) arrow(rx + 46, ry - 30, rx + 46, ry - 30 - F_MAX_K * M_DRY * B.g * sc, '#e2553d', 'F');
    }
    // таблоның сол жағы: аспаптар
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(14, 14, 240, 96); ctx.fillStyle = '#e8eef2'; ctx.font = '600 14px "IBM Plex Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillText(T(B.name) + ': g = ' + String(B.g).replace('.', ',') + ' ' + T('м/с²'), 24, 36);
    ctx.fillStyle = st.vy < -2 ? '#ff8a80' : '#9cffb0'; ctx.fillText('vy = ' + st.vy.toFixed(1).replace('.', ',') + ' ' + T('м/с'), 24, 58);
    ctx.fillStyle = Math.abs(st.vx) > 1 ? '#ff8a80' : '#9cffb0'; ctx.fillText('vx = ' + st.vx.toFixed(1).replace('.', ',') + ' ' + T('м/с'), 24, 78);
    ctx.fillStyle = '#e8eef2'; ctx.fillText('a = ' + (st.ay || -B.g).toFixed(1).replace('.', ',') + ' ' + T('м/с²'), 24, 98);
    // отын шкаласы
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(LW - 44, 14, 28, 150); var fr = st.fuel / L.fuel;
    ctx.fillStyle = fr > 0.3 ? '#36c48a' : '#ff8a3d'; ctx.fillRect(LW - 40, 18 + 142 * (1 - fr), 20, 142 * fr);
    ctx.fillStyle = '#fff'; ctx.font = '600 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(T('Отын'), LW - 30, 178);
  }
  function arrow(x1, y1, x2, y2, col, lab) {
    if (Math.abs(y2 - y1) < 3) return;
    ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    var d = Math.sign(y2 - y1); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 6, y2 - d * 9); ctx.lineTo(x2 + 6, y2 - d * 9); ctx.fill();
    ctx.font = '700 13px serif'; ctx.textAlign = 'left'; ctx.fillText(lab, x2 + 6, (y1 + y2) / 2);
  }
  function menu() { S.intro({ title: 'Айға қон', lead: 'Қозғалтқышты басқарып, зымыранды ақырын қондыр. Қай аспан денесінде қону оңай?', levels: LEVELS.length, levelNames: LEVELS.map(function (l) { return l.n; }), onStart: function (o) { startLevel(o.level); } }); }
  menu();
})();

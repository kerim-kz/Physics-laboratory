/* «Нысанаға тигіз»: көкжиекке бұрыш жасай лақтыру. x = v₀cosα·t, y = v₀sinα·t − gt²/2.
   10 деңгей: тегіс жер, биіктік, қабырға, Ай, тұрақты жылдамдық, қозғалатын нысана. */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T;
  var LW = 900, LH = 520, GROUND = 470, X0 = 70;
  // d — нысанаға дейінгі қашықтық (м), h — нысананың биіктігі (м), r — радиусы (м), span — экрандағы ен (м)
  var LEVELS = [
    { name: 'Алғашқы ату', d: 30, h: 0, r: 2.2, span: 45, g: 9.8, vmax: 30 },
    { name: 'Алысырақ', d: 55, h: 0, r: 2.2, span: 70, g: 9.8, vmax: 35 },
    { name: 'Мұнарада', d: 40, h: 12, r: 2, span: 60, g: 9.8, vmax: 35 },
    { name: 'Қабырға', d: 45, h: 0, r: 2, span: 60, g: 9.8, vmax: 35, wall: { x: 24, h: 16 } },
    { name: 'Шұңқырда', d: 50, h: -8, r: 2.2, span: 65, g: 9.8, vmax: 35 },
    { name: 'Айда', d: 120, h: 0, r: 5, span: 160, g: 1.62, vmax: 20, moon: true },
    { name: 'Жылдамдық тұрақты', d: 36, h: 6, r: 1.8, span: 55, g: 9.8, vmax: 25, fixedV: 22 },
    { name: 'Биік қабырға', d: 38, h: 4, r: 1.8, span: 55, g: 9.8, vmax: 35, wall: { x: 26, h: 24 } },
    { name: 'Қозғалатын нысана', d: 50, h: 0, r: 2.2, span: 70, g: 9.8, vmax: 35, move: 8 },
    { name: 'Шебер', d: 70, h: 15, r: 1.6, span: 90, g: 9.8, vmax: 40, wall: { x: 40, h: 28 }, move: 4 },
  ];
  var lvI = 0, L, cv, ctx, ang = 45, v = 20, shots = 0, trails = [], ball = null, stop = null, done = false, tm = 0, hitFx = null;

  function sc() { return (LW - X0 - 50) / L.span; }
  function W2S(x, y) { var k = sc(); return { x: X0 + x * k, y: GROUND - y * k }; }
  function targetX() { return L.d + (L.move ? Math.sin(tm * 0.9) * L.move : 0); }

  function startLevel(n) {
    lvI = n - 1; L = LEVELS[lvI]; shots = 0; trails = []; ball = null; done = false; tm = 0; hitFx = null;
    ang = 45; v = L.fixedV || Math.round(L.vmax * 0.6);
    var r = S.root; r.innerHTML = '';
    r.appendChild(S.hud([['Деңгей', 'cL', n + ' / ' + LEVELS.length], ['Атулар', 'cS', '0'], ['Нысана', 'cD', L.d + ' м'], ['g', 'cG', String(L.g).replace('.', ',') + ' м/с²']]));
    var c = S.canvas(LW, LH); cv = c.cv; ctx = c.ctx;
    var ctl = S.el('div', 'cctl');
    ctl.innerHTML =
      '<label class="ctl"><span class="ctl-h"><span>' + T('Бұрыш α') + '</span><b class="mono" id="cA"></b></span><input type="range" id="cAng" min="5" max="85" step="1"></label>' +
      '<label class="ctl"><span class="ctl-h"><span>' + T('Жылдамдық v₀') + '</span><b class="mono" id="cV"></b></span><input type="range" id="cVel" min="5" step="0.5"' + (L.fixedV ? ' disabled' : '') + '></label>' +
      '<button type="button" class="btn lg gbig" id="cFire">💥 ' + T('Ат!') + '</button>';
    r.appendChild(ctl);
    var ia = ctl.querySelector('#cAng'), iv = ctl.querySelector('#cVel');
    ia.value = ang; iv.max = L.vmax; iv.value = v;
    function show() { document.getElementById('cA').textContent = ang + '°'; document.getElementById('cV').textContent = String(v).replace('.', ',') + ' ' + T('м/с'); }
    show();
    ia.addEventListener('input', function () { ang = +ia.value; show(); });
    iv.addEventListener('input', function () { v = +iv.value; show(); });
    ctl.querySelector('#cFire').addEventListener('click', fire);
    // оқпанды сүйреп бағыттау
    var aiming = false;
    function aim(e) { var p = c.pos(e), o = W2S(0, 0), a = Math.round(Math.atan2(o.y - p.y, p.x - o.x) * 180 / Math.PI); if (a >= 5 && a <= 85) { ang = a; ia.value = a; show(); } }
    cv.addEventListener('pointerdown', function (e) { aiming = true; cv.setPointerCapture(e.pointerId); aim(e); });
    cv.addEventListener('pointermove', function (e) { if (aiming) aim(e); });
    cv.addEventListener('pointerup', function () { aiming = false; });
    document.addEventListener('keydown', onKey);
    var tip = S.el('p', 'muted small', T(L.moon ? 'Айда ауа жоқ, ал g Жердегіден 6 есе аз — снаряд әлдеқайда алысқа ұшады.' : L.fixedV ? 'Жылдамдық тұрақты — тек бұрышты таңда. Бір қашықтыққа екі түрлі бұрыш сәйкес келуі мүмкін!' : L.wall ? 'Қабырғадан асу үшін бұрышты үлкейт, бірақ жылдамдықты да арттыр.' : 'Кеңес: тегіс жерде ұшу қашықтығы L = v₀² · sin2α / g. Ең алысқа — 45°.'));
    r.appendChild(tip);
    if (stop) stop();
    stop = S.loop(step);
  }
  function onKey(e) { if (e.key === 'Enter' || e.key === ' ') { if (document.activeElement && document.activeElement.tagName === 'INPUT') return; e.preventDefault(); fire(); } }
  function fire() {
    if (ball || done) return;
    shots++; S.set('cS', String(shots)); S.sfx('boom');
    var a = ang * Math.PI / 180;
    ball = { t: 0, vx: v * Math.cos(a), vy: v * Math.sin(a), pts: [] };
  }
  function step(dt) {
    tm += dt;
    if (ball) {
      var k = Math.max(1.2, L.span / 40); // ұзын ұшуды тездету
      for (var i = 0; i < 6; i++) {
        ball.t += dt * k / 6;
        var x = ball.vx * ball.t, y = ball.vy * ball.t - L.g * ball.t * ball.t / 2;
        ball.pts.push([x, y]);
        var tx = targetX(), ty = L.h;
        if (Math.hypot(x - tx, y - (ty + L.r)) < L.r * 1.15) { land(true, x, y); break; }
        if (L.wall && x >= L.wall.x - 0.6 && x <= L.wall.x + 0.6 && y <= L.wall.h) { land(false, x, y); break; }
        var groundY = L.h < 0 && x > tx - 6 && x < tx + 6 ? L.h : 0;
        if (y < groundY && ball.t > 0.05) { land(false, x, groundY); break; }
        if (x > L.span + 5) { land(false, x, y); break; }
      }
    }
    draw();
  }
  function land(hit, x, y) {
    trails.push(ball.pts); if (trails.length > 4) trails.shift();
    ball = null;
    if (!hit) {
      S.sfx('bad');
      var tx = targetX(), miss = x - tx;
      S.toast(Math.abs(miss) < 60 ? (miss < 0 ? 'Жетпеді: ' : 'Асып кетті: ') + Math.abs(Math.round(miss)) + ' м' : 'Қабырғаға тиді!', 'bad'); // «Жетпеді: {#} м» — сөздікте үлгі
      return;
    }
    done = true; hitFx = { x: x, y: y, t: tm }; S.sfx('ok');
    var stars = shots === 1 ? 3 : shots === 2 ? 2 : 1;
    S.setLevelStars(lvI + 1, stars);
    setTimeout(finish.bind(null, stars), 900);
  }
  function campaign() { var st = S.levelStars(), s = 0; for (var k in st) s += st[k] * 100; return s; }
  function finish(stars) {
    if (stop) { stop(); stop = null; }
    document.removeEventListener('keydown', onKey);
    var last = lvI === LEVELS.length - 1;
    S.end({ title: stars === 3 ? 'Бірінші атқанда тигіздің!' : 'Нысана құлады!', stars: stars, score: campaign(), unit: 'жорық ұпайы',
      lines: [T('Атулар саны') + ': ' + shots + '. α = ' + ang + '°, v₀ = ' + String(v).replace('.', ',') + ' ' + T('м/с') + '.'],
      onNext: last ? null : function () { startLevel(lvI + 2); }, onAgain: function () { startLevel(lvI + 1); }, onMenu: menu });
  }
  function draw() {
    var k = sc(), sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    if (L.moon) { sky.addColorStop(0, '#05070f'); sky.addColorStop(1, '#1b2236'); } else { sky.addColorStop(0, '#7cc4ff'); sky.addColorStop(1, '#dff1ff'); }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, LW, LH);
    if (L.moon) { ctx.fillStyle = '#fff'; for (var s = 0; s < 60; s++) { ctx.globalAlpha = 0.3 + (s % 5) / 7; ctx.fillRect((s * 137) % LW, (s * 71) % (GROUND - 40), 2, 2); } ctx.globalAlpha = 1; ctx.fillStyle = '#4f8fe0'; ctx.beginPath(); ctx.arc(780, 90, 34, 0, 7); ctx.fill(); ctx.fillStyle = '#5fbf5f'; ctx.beginPath(); ctx.arc(772, 84, 14, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(255,255,255,.9)'; [[160, 80], [520, 60], [760, 110]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], 24, 0, 7); ctx.arc(c[0] + 26, c[1] - 8, 20, 0, 7); ctx.arc(c[0] + 50, c[1], 22, 0, 7); ctx.fill(); }); }
    // жер
    ctx.fillStyle = L.moon ? '#9aa0a8' : '#5aa84a'; ctx.fillRect(0, GROUND, LW, LH - GROUND);
    ctx.fillStyle = L.moon ? '#7d838c' : '#3e8a3a'; ctx.fillRect(0, GROUND, LW, 6);
    // қашықтық шкаласы
    ctx.fillStyle = L.moon ? '#e8eef2' : '#1b4a1b'; ctx.font = '600 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
    var stepM = L.span > 100 ? 20 : 10;
    for (var m = 0; m <= L.span; m += stepM) { var q = W2S(m, 0); ctx.fillRect(q.x - 0.5, GROUND + 6, 1, 8); ctx.fillText(m + ' ' + T('м'), q.x, GROUND + 28); }
    var tx = targetX();
    // шұңқыр
    if (L.h < 0) { var a1 = W2S(tx - 6, 0), b1 = W2S(tx + 6, L.h); ctx.fillStyle = L.moon ? '#6d737c' : '#7a5a3a'; ctx.fillRect(a1.x, GROUND, b1.x - a1.x, b1.y - GROUND); }
    // мұнара
    if (L.h > 0) { var t1 = W2S(tx - 2.5, L.h), t2 = W2S(tx + 2.5, 0); ctx.fillStyle = '#b07a4a'; ctx.fillRect(t1.x, t1.y, t2.x - t1.x, t2.y - t1.y); ctx.strokeStyle = 'rgba(0,0,0,.2)'; for (var yy = t1.y; yy < t2.y; yy += 14) { ctx.beginPath(); ctx.moveTo(t1.x, yy); ctx.lineTo(t2.x, yy); ctx.stroke(); } }
    // қабырға
    if (L.wall) { var w1 = W2S(L.wall.x - 0.6, L.wall.h), w2 = W2S(L.wall.x + 0.6, 0); ctx.fillStyle = '#7d6a5a'; ctx.fillRect(w1.x, w1.y, Math.max(8, w2.x - w1.x), w2.y - w1.y); ctx.fillStyle = '#5c4d40'; for (var by = w1.y; by < w2.y; by += 12) ctx.fillRect(w1.x, by, Math.max(8, w2.x - w1.x), 2); }
    // нысана
    var c0 = W2S(tx, L.h + L.r), rr = L.r * k;
    if (!hitFx) { ['#e2553d', '#fff', '#e2553d', '#fff', '#e2553d'].forEach(function (col, i) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c0.x, c0.y, rr * (1 - i * 0.19), 0, 7); ctx.fill(); }); ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c0.x, c0.y + rr); ctx.lineTo(c0.x, W2S(0, L.h).y); ctx.stroke(); }
    else { var age = tm - hitFx.t; for (var p = 0; p < 14; p++) { var an = p * 0.45, dd = age * 160; ctx.fillStyle = p % 2 ? '#e2553d' : '#ffd34d'; ctx.beginPath(); ctx.arc(c0.x + Math.cos(an) * dd, c0.y + Math.sin(an) * dd + age * age * 200, 6, 0, 7); ctx.fill(); } }
    // ізі
    trails.forEach(function (pts, i) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.15 * i) + ')'; ctx.setLineDash([5, 6]); ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(function (pt, j) { var q = W2S(pt[0], pt[1]); if (j) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke(); ctx.setLineDash([]); });
    // зеңбірек
    var o = W2S(0, 0), a = ang * Math.PI / 180;
    ctx.save(); ctx.translate(o.x, o.y - 6); ctx.rotate(-a);
    var gr = ctx.createLinearGradient(0, -11, 0, 11); gr.addColorStop(0, '#5b6470'); gr.addColorStop(0.5, '#2b2f36'); gr.addColorStop(1, '#16191d');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, -11, 56, 22, 7) : ctx.rect(0, -11, 56, 22); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#6b4a2a'; ctx.beginPath(); ctx.arc(o.x, o.y - 4, 17, 0, 7); ctx.fill(); ctx.fillStyle = '#3a2614'; ctx.beginPath(); ctx.arc(o.x, o.y - 4, 6, 0, 7); ctx.fill();
    // бағыттау сызығы (алғашқы 0,35 с)
    if (!ball && !done) { ctx.strokeStyle = 'rgba(255,211,77,.8)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.beginPath(); for (var t = 0; t <= 0.35; t += 0.035) { var px = v * Math.cos(a) * t, py = v * Math.sin(a) * t - L.g * t * t / 2, qq = W2S(px, py); if (t) ctx.lineTo(qq.x, qq.y - 6); else ctx.moveTo(qq.x, qq.y - 6); } ctx.stroke(); ctx.setLineDash([]); }
    // снаряд
    if (ball && ball.pts.length) { var lp = ball.pts[ball.pts.length - 1], bq = W2S(lp[0], lp[1]); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ball.pts.forEach(function (pt, j) { var q = W2S(pt[0], pt[1]); if (j) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke(); var rg = ctx.createRadialGradient(bq.x - 2, bq.y - 2, 1, bq.x, bq.y, 8); rg.addColorStop(0, '#888'); rg.addColorStop(1, '#111'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(bq.x, bq.y, 8, 0, 7); ctx.fill(); }
    // мәндер
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(12, 12, 190, 52); ctx.fillStyle = '#1b2329'; ctx.font = '700 15px "IBM Plex Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillText('α = ' + ang + '°', 22, 34); ctx.fillText('v₀ = ' + String(v).replace('.', ',') + ' ' + T('м/с'), 22, 55);
  }
  function menu() { S.intro({ title: 'Нысанаға тигіз', lead: 'Бұрыш пен жылдамдықты таңдап, нысанаға тигіз. Деңгейді таңда.', levels: LEVELS.length, levelNames: LEVELS.map(function (l) { return l.name; }), onStart: function (o) { startLevel(o.level); } }); }
  menu();
})();

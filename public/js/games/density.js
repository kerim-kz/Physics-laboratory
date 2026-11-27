/* «Батады ма, қалқиды ма?»: дененің тығыздығы сұйықтікінен аз болса — қалқиды (батқан бөлігі ρ_дене/ρ_сұйық),
   көп болса — батады. 15 дене, сұйық әр 5 денеден кейін ауысады. Жауап уақыты — 7 с. */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T;
  var LIQ = [
    { n: 'Су', r: 1000, c: ['#5fc4e8', '#2f8fbf'] },
    { n: 'Күнбағыс майы', r: 920, c: ['#f2d36b', '#d9a92a'] },
    { n: 'Қаныққан тұзды су', r: 1200, c: ['#a8e0ef', '#5ab3cf'] },
    { n: 'Спирт', r: 790, c: ['#e8f4f8', '#b7d9e3'] },
    { n: 'Сынап', r: 13600, c: ['#d9dde2', '#8e959d'] },
  ];
  var OBJ = [
    ['Тығын', 240, '#c99a5b', 'r'], ['Мұз', 917, '#dff3ff', 'c'], ['Емен', 700, '#9b6b3a', 'r'], ['Қарағай', 500, '#d8b27a', 'r'],
    ['Парафин шам', 900, '#fff6d8', 'r'], ['Алюминий', 2700, '#c8ced4', 'r'], ['Темір шеге', 7800, '#6d747c', 'r'], ['Мыс', 8900, '#c8783a', 'r'],
    ['Қорғасын', 11300, '#5d6570', 'r'], ['Алтын', 19300, '#f0c040', 'r'], ['Шыны', 2500, '#bfe6e6', 'c'], ['Полиэтилен', 950, '#f3f3f3', 'c'],
    ['Жұмыртқа', 1080, '#f6ead2', 'e'], ['Алма', 800, '#d64a3a', 'c'], ['Кірпіш', 1800, '#b5532e', 'r'], ['Гранит', 2600, '#8a8a92', 'r'],
    ['Күміс', 10500, '#d9dde2', 'r'], ['Бамбук', 400, '#b9c96a', 'r'], ['Резеңке', 1200, '#333', 'c'], ['Пенопласт', 30, '#ffffff', 'r'],
  ];
  var LW = 900, LH = 500, c, ctx, stop, items, i, score, streak, right, tLeft, obj, liq, phase, anim, mist;

  function pick() {
    var out = [], liqs = [0, 1, 2, 3, 4];
    for (var k = 0; k < 15; k++) {
      var L = LIQ[liqs[Math.floor(k / 3) % 5]];
      // тығыздығы сұйыққа тым жақын денелер алынбайды (айырмашылық > 5 %)
      var pool = OBJ.filter(function (o) { return Math.abs(o[1] - L.r) / L.r > 0.05 && !out.some(function (x) { return x.o === o && x.l === L; }); });
      out.push({ o: pool[Math.floor(Math.random() * pool.length)], l: L });
    }
    return out;
  }
  function start() {
    items = pick(); i = 0; score = 0; streak = 0; right = 0; mist = [];
    var r = S.root; r.innerHTML = '';
    r.appendChild(S.hud([['Дене', 'dN', '1 / 15'], ['Ұпай', 'dS', '0'], ['Қатарынан', 'dK', '0'], ['Уақыт', 'dT', '7']]));
    c = S.canvas(LW, LH); ctx = c.ctx;
    var ctl = S.el('div', 'dctl');
    ctl.innerHTML = '<button type="button" class="btn lg gbig dup" data-a="float">⬆ ' + T('Қалқиды') + '</button><button type="button" class="btn lg gbig ddown" data-a="sink">⬇ ' + T('Батады') + '</button>';
    r.appendChild(ctl);
    ctl.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { answer(b.getAttribute('data-a')); }); });
    document.addEventListener('keydown', onKey);
    next();
    if (stop) stop(); stop = S.loop(step);
  }
  function onKey(e) { if (e.key === 'ArrowUp') answer('float'); if (e.key === 'ArrowDown') answer('sink'); }
  function next() {
    if (i >= items.length) return finish();
    obj = items[i].o; liq = items[i].l; phase = 'ask'; tLeft = 7; anim = { y: 0, t: 0 };
    S.set('dN', (i + 1) + ' / 15');
  }
  function answer(a) {
    if (phase !== 'ask') return;
    var floats = obj[1] < liq.r, ok = (a === 'float') === floats;
    if (ok) { streak++; right++; var pts = 60 + Math.round(tLeft * 8) + Math.min(5, streak) * 8; score += pts; S.sfx('ok'); S.toast('+' + pts, 'good'); }
    else { streak = 0; S.sfx('bad'); S.toast(floats ? 'Қалқиды!' : 'Батады!', 'bad'); mist.push(T(obj[0]) + ' (' + obj[1] + ' ' + T('кг/м³') + ') — ' + T(liq.n) + ' (' + liq.r + ' ' + T('кг/м³') + '): ' + T(floats ? 'қалқиды' : 'батады')); }
    S.set('dS', String(score)); S.set('dK', String(streak));
    phase = 'show'; anim.t = 0;
  }
  function step(dt) {
    if (phase === 'ask') { tLeft -= dt; anim.y = Math.min(1, anim.y + dt * 1.6); S.set('dT', String(Math.max(0, Math.ceil(tLeft)))); if (tLeft <= 0) { streak = 0; mist.push(T(obj[0]) + ' — ' + T('уақыт бітті')); S.toast('Уақыт бітті!', 'bad'); phase = 'show'; anim.t = 0; } }
    else if (phase === 'show') { anim.t += dt; if (anim.t > 1.7) { i++; next(); } }
    draw();
  }
  function finish() {
    if (stop) { stop(); stop = null; }
    document.removeEventListener('keydown', onKey);
    var rev = null;
    if (mist.length) { rev = S.el('div', 'g-review'); rev.innerHTML = '<h3>' + S.esc(T('Қайталап шық')) + '</h3>' + mist.map(function (m) { return '<div class="g-rev"><span>' + S.esc(m) + '</span></div>'; }).join(''); }
    S.end({ title: 'Ойын аяқталды!', score: Math.min(2000, score), stars: right >= 14 ? 3 : right >= 11 ? 2 : right >= 8 ? 1 : 0,
      lines: [T('Дұрыс жауап') + ': ' + right + ' / 15. ' + T('Ереже: дене сұйықтан тығыз болса — батады, аз болса — қалқиды.')], review: rev, onAgain: start });
  }
  function draw() {
    var bg = ctx.createLinearGradient(0, 0, 0, LH); bg.addColorStop(0, '#eaf6fb'); bg.addColorStop(1, '#cfe7f0'); ctx.fillStyle = bg; ctx.fillRect(0, 0, LW, LH);
    var tx = 250, tw = 400, ty = 150, th = 310, surf = ty + 50;
    // ыдыс
    var lg = ctx.createLinearGradient(0, surf, 0, ty + th); lg.addColorStop(0, liq.c[0]); lg.addColorStop(1, liq.c[1]);
    ctx.fillStyle = lg; ctx.fillRect(tx, surf, tw, ty + th - surf);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(tx, surf, tw, 4);
    ctx.strokeStyle = 'rgba(40,60,80,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + th); ctx.lineTo(tx + tw, ty + th); ctx.lineTo(tx + tw, ty); ctx.stroke();
    ctx.fillStyle = '#1b2329'; ctx.font = '700 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(T(liq.n) + ': ρ = ' + liq.r + ' ' + T('кг/м³'), tx + tw / 2, ty + th + 30);
    // дене
    var size = 54, ox = tx + tw / 2, oy;
    var floats = obj[1] < liq.r, sub = Math.min(1, obj[1] / liq.r);
    if (phase === 'ask') oy = 40 + anim.y * (surf - 60 - 40);
    else { var k = Math.min(1, anim.t / 1.1), e = 1 - Math.pow(1 - k, 3); var target = floats ? surf - size / 2 + size * sub : ty + th - size / 2 - 4; oy = surf - 60 + (target - (surf - 60)) * e; }
    ctx.save(); ctx.translate(ox, oy);
    ctx.fillStyle = obj[2]; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
    if (obj[3] === 'c') { ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (obj[3] === 'e') { ctx.beginPath(); ctx.ellipse(0, 0, size * 0.38, size / 2, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    else { ctx.fillRect(-size / 2, -size / 2, size, size); ctx.strokeRect(-size / 2, -size / 2, size, size); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-size / 2 + 4, -size / 2 + 4, size - 8, 8); }
    ctx.restore();
    // жазу
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(ox + 60, oy - 26, 210, 52); ctx.strokeRect(ox + 60, oy - 26, 210, 52);
    ctx.fillStyle = '#1b2329'; ctx.textAlign = 'left'; ctx.font = '700 17px sans-serif'; ctx.fillText(T(obj[0]), ox + 70, oy - 4);
    ctx.font = '600 15px "IBM Plex Mono", monospace'; ctx.fillText('ρ = ' + obj[1] + ' ' + T('кг/м³'), ox + 70, oy + 18);
    if (phase === 'show') { ctx.font = '800 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = floats ? '#1d7a45' : '#b4342a'; ctx.fillText(T(floats ? 'Қалқиды' : 'Батады') + (floats && sub < 1 ? ' (' + Math.round(sub * 100) + '% ' + T('батқан') + ')' : ''), tx + tw / 2, 40); }
    // уақыт жолағы
    if (phase === 'ask') { ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(40, 20, 160, 10); ctx.fillStyle = tLeft > 2.5 ? '#16a1a1' : '#e2553d'; ctx.fillRect(40, 20, 160 * Math.max(0, tLeft / 7), 10); }
  }
  S.intro({ title: 'Батады ма, қалқиды ма?', lead: 'Дене мен сұйықтың тығыздығын салыстыр. 15 дене, әр жауапқа 7 секунд.', onStart: start });
})();

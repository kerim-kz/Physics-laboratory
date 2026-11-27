/* Ойындарға ортақ қабық: бастау экраны, ұпай тақтасы (HUD), соңғы экран (жұлдыз, конфетти, XP, белгішелер),
   дыбыс, деңгейлердің жұлдыздарын сақтау, canvas көмекшісі. Әр ойын GameShell-ді пайдаланады. */
(function () {
  'use strict';
  var root = document.getElementById('game');
  if (!root) return;
  var D = root.dataset, KEY = D.game;
  var T = function (s) { return window.tr ? window.tr(s) : s; };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, h) { var e = document.createElement(tag); if (cls) e.className = cls; if (h != null) e.innerHTML = h; return e; }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  // ---------- дыбыс (WebAudio, кішкентай тондар) ----------
  var ac = null, muted = !!store('game.mute');
  function tone(f, t0, d, type, vol) {
    if (!ac) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, ac.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol || 0.12, ac.currentTime + t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + d);
    o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + d + 0.02);
  }
  function sfx(kind) {
    if (muted) return;
    try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    if (kind === 'ok') { tone(660, 0, 0.12, 'triangle'); tone(880, 0.09, 0.16, 'triangle'); }
    else if (kind === 'bad') { tone(220, 0, 0.22, 'sawtooth', 0.06); }
    else if (kind === 'win') { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.11, 0.22, 'triangle'); }); }
    else if (kind === 'tick') tone(1200, 0, 0.03, 'square', 0.03);
    else if (kind === 'boom') { tone(90, 0, 0.35, 'sawtooth', 0.12); tone(60, 0.05, 0.4, 'square', 0.06); }
    else if (kind === 'pop') tone(520, 0, 0.06, 'sine', 0.08);
  }

  // ---------- конфетти ----------
  function confetti(n) {
    var cv = el('canvas', 'gconf'); document.body.appendChild(cv);
    var W = cv.width = innerWidth, H = cv.height = innerHeight, ctx = cv.getContext('2d');
    var cols = ['#ffd34d', '#ff5d73', '#5aa0ff', '#36c48a', '#b06bff', '#ff9f43'], P = [];
    for (var i = 0; i < (n || 140); i++) P.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function fr(t) {
      ctx.clearRect(0, 0, W, H);
      P.forEach(function (p) { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(fr); else cv.remove();
    })(t0);
  }

  // ---------- ұпайды сақтау ----------
  function save(score) {
    if (!D.auth || !D.scored) return Promise.resolve(null);
    return fetch('/api/games/score', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': D.csrf },
      body: JSON.stringify({ game: KEY, score: Math.round(score), section: D.section || '', daily: D.daily === '1' }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      var b = document.getElementById('myBest'); if (d && d.best != null && b) b.textContent = fmt(d.best);
      var bar = document.getElementById('gXpBar'); if (d && d.level && bar) bar.style.width = d.level.pct + '%';
      return d;
    }).catch(function () { return null; });
  }

  // ---------- маскот ----------
  var MASCOT = '<svg class="mascot" width="80" height="80" viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="50" rx="46" ry="17" fill="none" stroke="#5aa0ff" stroke-width="4" transform="rotate(30 50 50)"/><ellipse cx="50" cy="50" rx="46" ry="17" fill="none" stroke="#ff7aa8" stroke-width="4" transform="rotate(-30 50 50)"/><circle cx="50" cy="50" r="24" fill="#ffd34d"/><circle cx="42" cy="46" r="4" fill="#1b2329"/><circle cx="58" cy="46" r="4" fill="#1b2329"/><path d="M41 57 q9 8 18 0" stroke="#1b2329" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="91" cy="73" r="4.5" fill="#5aa0ff"/><circle cx="9" cy="73" r="4.5" fill="#ff7aa8"/></svg>';

  // ---------- деңгейлердің жұлдыздары (браузерде) ----------
  function levelStars() { return store('game.stars.' + KEY) || {}; }
  function setLevelStars(lv, n) { var s = levelStars(); if (!s[lv] || s[lv] < n) { s[lv] = n; store('game.stars.' + KEY, s); } }

  // ---------- бастау экраны ----------
  // o: {title, lead, grades: true, levels: N (немесе null), levelNames: [], onStart: function ({grade, level})}
  function intro(o) {
    root.innerHTML = '';
    var box = el('div', 'gintro');
    box.appendChild(el('div', 'gintro-h', MASCOT + '<div><h2>' + esc(T(o.title)) + '</h2>' + (o.lead ? '<p>' + esc(T(o.lead)) + '</p>' : '') + '</div>'));
    var grades = (D.grades || '').split(',').filter(Boolean).map(Number), grade = Number(D.grade) || 0;
    if (grades.indexOf(grade) < 0) grade = grades[0];
    var chosen = { grade: grade, level: 1 };
    if (o.grades && grades.length > 1) {
      var gr = el('div', 'gpick', '<span class="gpick-l">' + esc(T('Сыныбың')) + '</span>');
      grades.forEach(function (g) {
        var b = el('button', 'gopt' + (g === grade ? ' on' : ''), esc(T(g + '-сынып')));
        b.type = 'button';
        b.addEventListener('click', function () { chosen.grade = g; gr.querySelectorAll('.gopt').forEach(function (x) { x.classList.toggle('on', x === b); }); sfx('pop'); });
        gr.appendChild(b);
      });
      box.appendChild(gr);
    }
    if (o.levels) {
      var st = levelStars(), lw = el('div', 'glevels');
      var open = 1; for (var i = 1; i <= o.levels; i++) if (st[i]) open = i + 1;
      for (var l = 1; l <= o.levels; l++) (function (l) {
        var locked = l > open, s = st[l] || 0;
        var b = el('button', 'glv' + (locked ? ' locked' : '') + (s ? ' done' : ''), '<b>' + l + '</b><span class="glv-st">' + [1, 2, 3].map(function (k) { return '<i class="' + (k <= s ? 'on' : '') + '">★</i>'; }).join('') + '</span>' + (o.levelNames && o.levelNames[l - 1] ? '<span class="glv-n">' + esc(T(o.levelNames[l - 1])) + '</span>' : ''));
        b.type = 'button'; b.disabled = locked;
        if (locked) b.title = T('Алдыңғы деңгейді өт');
        b.addEventListener('click', function () { chosen.level = l; sfx('pop'); o.onStart(chosen); });
        lw.appendChild(b);
      })(l);
      box.appendChild(el('p', 'muted small', esc(T('Деңгейді таңда. Келесі деңгей алдыңғысын өткенде ашылады.'))));
      box.appendChild(lw);
    } else {
      var go = el('button', 'btn lg gbig', '▶ ' + esc(T(o.button || 'Бастау')));
      go.type = 'button';
      go.addEventListener('click', function () { sfx('pop'); o.onStart(chosen); });
      box.appendChild(go);
      setTimeout(function () { go.focus(); }, 30);
    }
    var mt = el('button', 'gmute', muted ? '🔇' : '🔊'); mt.type = 'button'; mt.title = T('Дыбыс');
    mt.addEventListener('click', function () { muted = !muted; store('game.mute', muted); mt.textContent = muted ? '🔇' : '🔊'; });
    box.appendChild(mt);
    root.appendChild(box);
  }

  // ---------- ұпай тақтасы ----------
  function hud(items) {
    var h = el('div', 'ghud');
    items.forEach(function (it) { h.appendChild(el('span', 'ghud-i' + (it[3] ? ' ' + it[3] : ''), '<i>' + esc(T(it[0])) + '</i><b id="' + it[1] + '">' + esc(it[2]) + '</b>')); });
    return h;
  }
  function set(id, v) { var e = document.getElementById(id); if (e) { if (e.textContent !== String(v)) { e.textContent = v; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } } }
  function toast(s, kind) {
    var t = el('div', 'gtoast ' + (kind || ''), esc(T(s))); root.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 1400); setTimeout(function () { t.remove(); }, 1900);
  }

  // ---------- соңғы экран ----------
  // o: {title, score, stars (0–3), lines: [], review: Element, onAgain, onNext, nextLabel, onMenu}
  function end(o) {
    root.innerHTML = '';
    var box = el('div', 'gend');
    var stars = o.stars == null ? null : o.stars;
    box.appendChild(el('div', 'gend-m', MASCOT));
    box.appendChild(el('h2', '', esc(T(o.title))));
    if (stars != null) box.appendChild(el('div', 'gstars', [1, 2, 3].map(function (k) { return '<span class="' + (k <= stars ? 'on' : '') + '" style="animation-delay:' + (k * 0.18) + 's">★</span>'; }).join('')));
    if (o.score != null) box.appendChild(el('div', 'gscore', '<b>' + fmt(o.score) + '</b><span>' + esc(T(o.unit || 'ұпай')) + '</span>'));
    (o.lines || []).forEach(function (l) { box.appendChild(el('p', '', l)); });
    var info = el('div', 'gend-xp');
    if (o.score != null && D.scored) { info.innerHTML = D.auth ? '<span class="muted small">' + esc(T('Нәтиже сақталуда…')) + '</span>' : '<span class="muted small">' + esc(T('Ұпайды сақтап, XP жинау үшін платформаға кір.')) + '</span>'; box.appendChild(info); }
    if (o.review) box.appendChild(o.review);
    var acts = el('div', 'gend-acts');
    if (o.onNext) { var nx = el('button', 'btn lg', esc(T(o.nextLabel || 'Келесі деңгей')) + ' ▶'); nx.type = 'button'; nx.addEventListener('click', o.onNext); acts.appendChild(nx); }
    if (o.onAgain) { var ag = el('button', 'btn ' + (o.onNext ? 'ghost' : 'lg'), '↻ ' + esc(T('Қайта ойнау'))); ag.type = 'button'; ag.addEventListener('click', o.onAgain); acts.appendChild(ag); }
    if (o.onMenu) { var mn = el('button', 'btn ghost', esc(T('Деңгейлер'))); mn.type = 'button'; mn.addEventListener('click', o.onMenu); acts.appendChild(mn); }
    box.appendChild(acts);
    root.appendChild(box);
    (acts.firstChild || box).focus && setTimeout(function () { acts.firstChild && acts.firstChild.focus(); }, 30);
    if (stars == null ? o.score > 0 : stars >= 2) { confetti(); sfx('win'); } else if (stars === 0) sfx('bad');
    if (o.score != null && D.scored && D.auth && o.save !== false) save(o.score).then(function (d) {
      if (!d || !d.saved) { info.innerHTML = '<span class="muted small">' + esc(T('Нәтижені сақтау мүмкін болмады.')) + '</span>'; return; }
      var h = '<span class="gxp">+' + d.gained + ' XP</span> <span class="muted small">' + esc(T('Барлығы')) + ': ' + fmt(d.xp) + ' XP · ' + esc(T(d.level.n + '-деңгей')) + ' «' + esc(T(d.level.name)) + '»</span>';
      if (d.levelUp) h += '<p class="glevelup">🎉 ' + esc(T('Жаңа деңгей!')) + ' «' + esc(T(d.level.name)) + '»</p>';
      (d.badges || []).forEach(function (b) { h += '<p class="gnewbadge">🏅 ' + esc(T('Жаңа белгіше')) + ': <b>' + esc(T(b.name)) + '</b> — ' + esc(T(b.desc)) + '</p>'; });
      info.innerHTML = h;
      if (d.levelUp || (d.badges && d.badges.length)) confetti(90);
    });
  }

  // ---------- canvas: тұрақты логикалық өлшем (LW×LH), экранға сыйғызылады ----------
  function canvas(LW, LH, host) {
    var wrap = el('div', 'gcanvas'), cv = el('canvas');
    wrap.appendChild(cv); (host || root).appendChild(wrap);
    var ctx = cv.getContext('2d'), api = { cv: cv, ctx: ctx, W: LW, H: LH, k: 1 };
    function fit() {
      var w = wrap.clientWidth || LW, k = w / LW, dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(LW * k * dpr); cv.height = Math.round(LH * k * dpr);
      cv.style.width = w + 'px'; cv.style.height = Math.round(LH * k) + 'px';
      ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0); api.k = k;
      if (api.onResize) api.onResize();
    }
    api.pos = function (e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / api.k, y: (e.clientY - r.top) / api.k }; };
    api.fit = fit;
    window.addEventListener('resize', fit);
    fit();
    return api;
  }
  function loop(fn) {
    var run = true, last = performance.now();
    (function fr(t) { if (!run) return; var dt = Math.min(0.05, (t - last) / 1000); last = t; fn(dt, t); requestAnimationFrame(fr); })(last);
    return function stop() { run = false; };
  }
  // Ойын деректері
  var dataEl = document.getElementById('gameData');
  var DATA = dataEl ? JSON.parse(dataEl.textContent) : {};

  window.GameShell = { root: root, data: DATA, key: KEY, intro: intro, hud: hud, set: set, toast: toast, end: end, sfx: sfx, confetti: confetti, save: save,
    canvas: canvas, loop: loop, esc: esc, el: el, fmt: fmt, shuffle: shuffle, T: T, levelStars: levelStars, setLevelStars: setLevelStars, mascot: MASCOT,
    grades: (D.grades || '').split(',').filter(Boolean).map(Number) };
})();

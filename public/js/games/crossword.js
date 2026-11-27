/* «Физикалық сөзжұмбақ»: сыныптың терминдерінен әр жолы жаңа сөзжұмбақ құрастырылады (сөздер қиылысып орналасады).
   Оқушы ұяшықтарға әріп тереді; «Тексеру» қате әріптерді көрсетеді, «Әріп ашу» ұпайды азайтады. */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T, TERMS = S.data.terms || [];
  var N = 17;
  function build(words) {
    for (var attempt = 0; attempt < 30; attempt++) {
      var grid = {}, placed = [], list = S.shuffle(words).sort(function (a, b) { return b[1].length - a[1].length + (Math.random() - 0.5) * 3; });
      var get = function (x, y) { return grid[x + ',' + y]; };
      var can = function (w, x, y, dx, dy) {
        if (x < 0 || y < 0 || x + dx * (w.length - 1) >= N || y + dy * (w.length - 1) >= N) return -1;
        if (get(x - dx, y - dy) || get(x + dx * w.length, y + dy * w.length)) return -1;
        var cross = 0;
        for (var k = 0; k < w.length; k++) {
          var cx = x + dx * k, cy = y + dy * k, c = get(cx, cy);
          if (c) { if (c !== w[k]) return -1; cross++; }
          else if (get(cx + dy, cy + dx) || get(cx - dy, cy - dx)) return -1; // қатар тұрған әріптер болмасын
        }
        return cross;
      };
      var put = function (item, x, y, dx, dy) { var w = item[1]; for (var k = 0; k < w.length; k++) grid[(x + dx * k) + ',' + (y + dy * k)] = w[k]; placed.push({ w: w, clue: item[2], x: x, y: y, dx: dx, dy: dy }); };
      var first = list[0]; put(first, Math.floor((N - first[1].length) / 2), Math.floor(N / 2), 1, 0);
      for (var i = 1; i < list.length && placed.length < 9; i++) {
        var w = list[i][1], best = null;
        placed.forEach(function (p) {
          for (var a = 0; a < p.w.length; a++) for (var b = 0; b < w.length; b++) {
            if (p.w[a] !== w[b]) continue;
            var dx = p.dx ? 0 : 1, dy = p.dx ? 1 : 0, x = p.x + p.dx * a - dx * b, y = p.y + p.dy * a - dy * b, c = can(w, x, y, dx, dy);
            if (c > 0 && (!best || c > best.c || (c === best.c && Math.random() < 0.3))) best = { x: x, y: y, dx: dx, dy: dy, c: c };
          }
        });
        if (best) put(list[i], best.x, best.y, best.dx, best.dy);
      }
      if (placed.length >= 6) return placed;
    }
    return null;
  }
  var placed, cells, minX, minY, W, H, hints, checks, done, t0, grade;
  function start(opts) {
    grade = opts.grade;
    var words = TERMS.filter(function (t) { return t[0] === grade; });
    if (words.length < 10) words = words.concat(TERMS.filter(function (t) { return t[0] === grade - 1; }));
    placed = build(words);
    hints = 0; checks = 0; done = false; t0 = Date.now();
    minX = Math.min.apply(null, placed.map(function (p) { return p.x; })); minY = Math.min.apply(null, placed.map(function (p) { return p.y; }));
    var maxX = Math.max.apply(null, placed.map(function (p) { return p.x + p.dx * (p.w.length - 1); })), maxY = Math.max.apply(null, placed.map(function (p) { return p.y + p.dy * (p.w.length - 1); }));
    W = maxX - minX + 1; H = maxY - minY + 1;
    // нөмірлер: сөздің басталу ұяшығы бойынша (жоғарыдан төмен, солдан оңға)
    placed.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var num = {}, n = 0;
    placed.forEach(function (p) { var k = p.x + ',' + p.y; if (!num[k]) num[k] = ++n; p.n = num[k]; });
    cells = {};
    placed.forEach(function (p) { for (var k = 0; k < p.w.length; k++) { var key = (p.x + p.dx * k) + ',' + (p.y + p.dy * k); cells[key] = cells[key] || { ch: p.w[k], words: [] }; cells[key].words.push(p); } });
    render();
  }
  var active = null;
  function render() {
    var r = S.root; r.innerHTML = '';
    r.appendChild(S.hud([['Сөз', 'xW', '0 / ' + placed.length], ['Көмек', 'xH', '0']]));
    var wrap = S.el('div', 'xwrap');
    var gridEl = S.el('div', 'xgrid'); gridEl.style.gridTemplateColumns = 'repeat(' + W + ', minmax(0,1fr))'; gridEl.style.maxWidth = Math.min(46 * W, 640) + 'px';
    var numAt = {}; placed.forEach(function (p) { numAt[p.x + ',' + p.y] = p.n; });
    for (var y = minY; y < minY + H; y++) for (var x = minX; x < minX + W; x++) {
      var key = x + ',' + y, c = cells[key];
      if (!c) { gridEl.appendChild(S.el('span', 'xb')); continue; }
      var d = S.el('label', 'xc', (numAt[key] ? '<i>' + numAt[key] + '</i>' : '') + '<input maxlength="1" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="' + key + '">');
      d.dataset.k = key; c.el = d; c.inp = d.querySelector('input');
      gridEl.appendChild(d);
    }
    wrap.appendChild(gridEl);
    var clues = S.el('div', 'xclues');
    [['Көлденең', 1], ['Тігінен', 0]].forEach(function (g) {
      var list = placed.filter(function (p) { return !!p.dx === !!g[1]; });
      if (!list.length) return;
      clues.appendChild(S.el('h3', '', S.esc(T(g[0]))));
      var ol = S.el('ol', 'xcl');
      list.forEach(function (p) { var li = S.el('li', '', '<b>' + p.n + '.</b> ' + S.esc(T(p.clue)) + ' <span class="muted">(' + p.w.length + ')</span>'); li.addEventListener('click', function () { focusWord(p); }); p.li = li; ol.appendChild(li); });
      clues.appendChild(ol);
    });
    wrap.appendChild(clues);
    r.appendChild(wrap);
    var acts = S.el('div', 'gend-acts');
    var chk = S.el('button', 'btn', '✔ ' + S.esc(T('Тексеру'))), hint = S.el('button', 'btn ghost', '💡 ' + S.esc(T('Әріп ашу')) + ' (−60)');
    chk.type = hint.type = 'button';
    chk.addEventListener('click', check); hint.addEventListener('click', reveal);
    acts.appendChild(chk); acts.appendChild(hint); r.appendChild(acts);
    Object.keys(cells).forEach(function (key) {
      var c = cells[key];
      c.inp.addEventListener('focus', function () { if (!active || c.words.indexOf(active) < 0) active = c.words[0]; mark(); });
      c.inp.addEventListener('click', function () { if (c.words.length > 1 && document.activeElement === c.inp && active) { active = c.words[(c.words.indexOf(active) + 1) % c.words.length]; mark(); } });
      c.inp.addEventListener('input', function () {
        var v = (c.inp.value || '').toUpperCase().replace(/[^А-ЯӘҒҚҢӨҰҮҺІЁ]/g, '');
        c.inp.value = v.slice(-1); c.el.classList.remove('bad');
        if (v && active) move(c, 1);
        progress();
      });
      c.inp.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !c.inp.value && active) { e.preventDefault(); move(c, -1, true); } });
    });
    focusWord(placed[0]);
  }
  function wordCells(p) { var out = []; for (var k = 0; k < p.w.length; k++) out.push(cells[(p.x + p.dx * k) + ',' + (p.y + p.dy * k)]); return out; }
  function focusWord(p) { active = p; var cs = wordCells(p), f = cs.filter(function (c) { return !c.inp.value; })[0] || cs[0]; f.inp.focus(); mark(); }
  function mark() { Object.keys(cells).forEach(function (k) { cells[k].el.classList.remove('hl'); }); placed.forEach(function (p) { if (p.li) p.li.classList.toggle('on', p === active); }); if (active) wordCells(active).forEach(function (c) { c.el.classList.add('hl'); }); }
  function move(c, d, clear) { var cs = wordCells(active), i = cs.indexOf(c), n = cs[i + d]; if (n) { if (clear) n.inp.value = ''; n.inp.focus(); } }
  function solvedWord(p) { return wordCells(p).every(function (c) { return c.inp.value === c.ch; }); }
  function progress() {
    var n = placed.filter(solvedWord).length;
    S.set('xW', n + ' / ' + placed.length);
    placed.forEach(function (p) { if (p.li) p.li.classList.toggle('ok', solvedWord(p)); });
    if (n === placed.length && !done) { done = true; finish(); }
  }
  function check() { checks++; var bad = 0; Object.keys(cells).forEach(function (k) { var c = cells[k]; if (c.inp.value && c.inp.value !== c.ch) { c.el.classList.add('bad'); bad++; } }); S.sfx(bad ? 'bad' : 'ok'); S.toast(bad ? 'Қате әріп: ' + bad : 'Қате жоқ!', bad ? 'bad' : 'good'); }
  function reveal() {
    var cs = active ? wordCells(active).filter(function (c) { return c.inp.value !== c.ch; }) : [];
    if (!cs.length) cs = Object.keys(cells).map(function (k) { return cells[k]; }).filter(function (c) { return c.inp.value !== c.ch; });
    if (!cs.length) return;
    var c = cs[0]; c.inp.value = c.ch; c.el.classList.add('given'); hints++; S.set('xH', String(hints)); S.sfx('pop'); progress();
  }
  function finish() {
    var sec = Math.round((Date.now() - t0) / 1000), score = Math.max(150, 1000 - hints * 60 - Math.max(0, sec - 120));
    S.end({ title: 'Сөзжұмбақ шешілді!', score: score, stars: hints === 0 ? 3 : hints <= 3 ? 2 : 1,
      lines: [T('Уақыт') + ': ' + Math.floor(sec / 60) + ' ' + T('мин') + ' ' + (sec % 60) + ' ' + T('с') + '. ' + T('Ашылған әріп') + ': ' + hints + '.'], onAgain: menu });
  }
  function menu() { S.intro({ title: 'Физикалық сөзжұмбақ', lead: 'Анықтамасы бойынша терминді тап. Әр жолы жаңа сөзжұмбақ құрылады.', grades: true, onStart: start }); }
  menu();
})();

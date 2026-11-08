/* Формула ойындары. Деректер беттегі #gameData JSON-нан алынады, формулалар KaTeX арқылы салынады. */
(function () {
  'use strict';
  var root = document.getElementById('game');
  var dataEl = document.getElementById('gameData');
  if (!root || !dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var GAME = root.dataset.game;
  var SECTION = root.dataset.section || '';
  var AUTH = !!root.dataset.auth;
  var CSRF = root.dataset.csrf;

  // ---------- көмекші функциялар ----------
  function K(tex, display) {
    try { return window.katex.renderToString(tex, { throwOnError: false, strict: 'ignore', displayMode: !!display }); }
    catch (e) { return esc(tex); }
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
  function el(tag, cls, htmlStr) { var e = document.createElement(tag); if (cls) e.className = cls; if (htmlStr != null) e.innerHTML = htmlStr; return e; }
  function uniqBy(a, f) { var seen = {}; return a.filter(function (x) { var k = f(x); if (seen[k]) return false; seen[k] = 1; return true; }); }

  var ALL = DATA.formulas.map(function (raw) {
    var f = { id: raw.id, s: raw.s, g: raw.g, name: raw.n, tex: raw.t };
    f.vars = raw.v.map(function (v) { return { sym: v[0], meaning: v[1], unit: v[2], f: f }; });
    return f;
  });
  var POOL = SECTION ? ALL.filter(function (f) { return f.s === SECTION; }) : ALL;
  var poolNote = '';
  function ensurePool(min) {
    if (POOL.length < min) { POOL = ALL; poolNote = 'Бұл бөлімде формула аз болғандықтан, ойын барлық бөлімнің формулаларымен жүреді.'; }
  }

  function saveScore(score) {
    if (!AUTH) return Promise.resolve(null);
    return fetch('/api/games/score', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
      body: JSON.stringify({ game: GAME, score: score, section: SECTION }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      var b = document.getElementById('myBest');
      if (d && d.best != null && b) b.textContent = d.best;
      return d;
    }).catch(function () { return null; });
  }

  function header(parts) {
    var h = el('div', 'g-head');
    parts.forEach(function (p) { var s = el('span', 'g-stat', '<i>' + esc(p[0]) + '</i><b id="' + p[1] + '">' + esc(p[2]) + '</b>'); h.appendChild(s); });
    return h;
  }
  function setText(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }

  function endScreen(title, score, lines, extra) {
    root.innerHTML = '';
    var box = el('div', 'g-end');
    box.appendChild(el('h2', '', esc(title)));
    if (score != null) box.appendChild(el('div', 'g-score', '<b>' + score + '</b><span>ұпай</span>'));
    var save = el('p', 'muted small', AUTH ? 'Нәтиже сақталуда…' : 'Ұпайды сақтау үшін платформаға кір.');
    if (score != null) box.appendChild(save);
    (lines || []).forEach(function (l) { box.appendChild(el('p', '', l)); });
    if (extra) box.appendChild(extra);
    var again = el('button', 'btn lg', 'Қайта ойнау');
    again.type = 'button';
    again.addEventListener('click', start);
    box.appendChild(again);
    root.appendChild(box);
    if (score != null && AUTH) saveScore(score).then(function (d) { save.textContent = d && d.saved ? 'Нәтиже сақталды. Ең жақсы ұпайың: ' + d.best : 'Нәтижені сақтау мүмкін болмады.'; });
    again.focus();
  }

  function reviewList(items) {
    if (!items.length) return null;
    var wrap = el('div', 'g-review');
    wrap.appendChild(el('h3', '', 'Қайталап шық'));
    items.forEach(function (it) { wrap.appendChild(el('div', 'g-rev', '<span>' + esc(it.q) + '</span><span class="g-rev-a">' + it.a + '</span>')); });
    return wrap;
  }

  // Бір дұрыс жауабы бар көп таңдаулы сұрақтар сериясы (symbol, units, convert ойындарына ортақ).
  function choiceSeries(cfg) {
    var qs = cfg.questions;
    var i = 0, score = 0, right = 0, mistakes = [];
    root.innerHTML = '';
    if (poolNote) root.appendChild(el('p', 'notice small', esc(poolNote)));
    root.appendChild(header([['Сұрақ', 'gQ', '1 / ' + qs.length], ['Дұрыс', 'gR', '0'], ['Ұпай', 'gS', '0']]));
    var stage = el('div', 'g-stage');
    root.appendChild(stage);
    function show() {
      var qn = qs[i];
      setText('gQ', (i + 1) + ' / ' + qs.length);
      stage.innerHTML = '';
      stage.appendChild(el('div', 'g-prompt', qn.prompt));
      var opts = el('div', 'g-opts');
      var fb = el('p', 'g-fb');
      fb.setAttribute('aria-live', 'polite');
      qn.options.forEach(function (o, idx) {
        var b = el('button', 'opt', o.html);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (opts.dataset.done) return;
          opts.dataset.done = '1';
          var ok = idx === qn.correct;
          b.classList.add(ok ? 'ok' : 'bad');
          opts.children[qn.correct].classList.add('ok');
          if (ok) { score += 100; right++; fb.innerHTML = '<b class="good">Дұрыс!</b> ' + (qn.explain || ''); }
          else { fb.innerHTML = '<b class="badt">Қате.</b> ' + (qn.explain || ''); mistakes.push({ q: qn.reviewQ, a: qn.reviewA }); }
          setText('gR', right); setText('gS', score);
          var next = el('button', 'btn', i + 1 < qs.length ? 'Келесі сұрақ →' : 'Нәтижені көру');
          next.type = 'button';
          next.addEventListener('click', function () { i++; if (i < qs.length) show(); else finish(); });
          stage.appendChild(next);
          next.focus();
        });
        opts.appendChild(b);
      });
      stage.appendChild(opts);
      stage.appendChild(fb);
    }
    function finish() {
      endScreen(cfg.title, score, ['Дұрыс жауап: ' + right + ' / ' + qs.length], reviewList(mistakes));
    }
    show();
  }

  // ---------- 1. Карточкалар ----------
  function gameCards() {
    var deck = shuffle(POOL);
    var total = deck.length, known = 0;
    root.innerHTML = '';
    root.appendChild(header([['Білемін', 'gK', '0 / ' + total], ['Қалды', 'gL', String(deck.length)]]));
    var stage = el('div', 'g-stage');
    root.appendChild(stage);
    function show() {
      if (!deck.length) {
        return endScreen('Барлық карточканы меңгердің!', null, [total + ' формула қайталанды. Енді ұпайлы ойындарда өзіңді сынап көр.']);
      }
      var f = deck[0];
      stage.innerHTML = '';
      var card = el('button', 'flash-card');
      card.type = 'button';
      card.innerHTML = '<span class="fc-meta">' + esc(DATA.sections[f.s]) + ' · ' + f.g + '-сынып</span><span class="fc-name">' + esc(f.name) + '</span><span class="fc-hint">Формуланы есіңе түсір де, карточканы аудар</span>';
      var acts = el('div', 'g-acts');
      function flip() {
        if (card.classList.contains('flipped')) return;
        card.classList.add('flipped');
        card.innerHTML = '<span class="fc-meta">' + esc(f.name) + '</span><span class="fc-tex">' + K(f.tex, true) + '</span>' +
          '<span class="fc-vars">' + f.vars.map(function (v) { return '<span>' + K(v.sym) + ' — ' + esc(v.meaning) + (v.unit && v.unit !== '—' ? ', ' + esc(v.unit) : '') + '</span>'; }).join('') + '</span>';
        acts.innerHTML = '';
        var yes = el('button', 'btn okb', 'Білемін');
        var no = el('button', 'btn ghost', 'Қайталау');
        yes.type = no.type = 'button';
        yes.addEventListener('click', function () { deck.shift(); known++; update(); show(); });
        no.addEventListener('click', function () { deck.push(deck.shift()); show(); });
        acts.appendChild(no); acts.appendChild(yes);
        yes.focus();
      }
      card.addEventListener('click', flip);
      var flipBtn = el('button', 'btn', 'Аудару');
      flipBtn.type = 'button';
      flipBtn.addEventListener('click', flip);
      acts.appendChild(flipBtn);
      stage.appendChild(card);
      stage.appendChild(acts);
    }
    function update() { setText('gK', known + ' / ' + total); setText('gL', String(deck.length)); }
    show();
  }

  // ---------- 2. Жұбын тап ----------
  function gamePairs() {
    ensurePool(6);
    var set = shuffle(uniqBy(POOL, function (f) { return f.tex; })).slice(0, 6);
    var left = shuffle(set), right = shuffle(set);
    var selL = null, selR = null, matched = 0, mistakes = 0, t0 = Date.now(), timer;
    root.innerHTML = '';
    if (poolNote) root.appendChild(el('p', 'notice small', esc(poolNote)));
    root.appendChild(header([['Жұп', 'gM', '0 / 6'], ['Қате', 'gE', '0'], ['Уақыт', 'gT', '0 с']]));
    root.appendChild(el('p', 'muted small', 'Сол жақтан атауды, оң жақтан оған сәйкес формуланы таңда.'));
    var cols = el('div', 'pairs');
    var colL = el('div', 'pcol'), colR = el('div', 'pcol');
    cols.appendChild(colL); cols.appendChild(colR);
    root.appendChild(cols);
    function mk(f, side) {
      var b = el('button', 'tile' + (side === 'R' ? ' tex' : ''), side === 'L' ? esc(f.name) : K(f.tex));
      b.type = 'button';
      b.dataset.id = f.id;
      b.addEventListener('click', function () {
        if (b.classList.contains('done')) return;
        var col = side === 'L' ? colL : colR;
        Array.prototype.forEach.call(col.children, function (c) { c.classList.remove('sel'); });
        b.classList.add('sel');
        if (side === 'L') selL = b; else selR = b;
        if (selL && selR) check();
      });
      return b;
    }
    left.forEach(function (f) { colL.appendChild(mk(f, 'L')); });
    right.forEach(function (f) { colR.appendChild(mk(f, 'R')); });
    function check() {
      var a = selL, b = selR;
      selL = selR = null;
      if (a.dataset.id === b.dataset.id) {
        a.classList.remove('sel'); b.classList.remove('sel');
        a.classList.add('done'); b.classList.add('done');
        matched++; setText('gM', matched + ' / 6');
        if (matched === 6) finish();
      } else {
        mistakes++; setText('gE', String(mistakes));
        a.classList.add('bad'); b.classList.add('bad');
        setTimeout(function () { a.classList.remove('bad', 'sel'); b.classList.remove('bad', 'sel'); }, 650);
      }
    }
    timer = setInterval(function () { setText('gT', Math.round((Date.now() - t0) / 1000) + ' с'); }, 500);
    function finish() {
      clearInterval(timer);
      var sec = Math.round((Date.now() - t0) / 1000);
      var score = Math.max(100, Math.min(1000, 1000 - mistakes * 60 - Math.max(0, sec - 20) * 4));
      endScreen('Барлық жұп табылды!', score, ['Уақыт: ' + sec + ' с · Қате: ' + mistakes]);
    }
  }

  // ---------- 3. Формула викторинасы (60 с) ----------
  function gameQuiz() {
    ensurePool(4);
    var uniq = uniqBy(POOL, function (f) { return f.tex; });
    var score = 0, streak = 0, right = 0, asked = 0, mistakes = [], left = 60, timer, last = null;
    root.innerHTML = '';
    if (poolNote) root.appendChild(el('p', 'notice small', esc(poolNote)));
    root.appendChild(header([['Уақыт', 'gT', '60'], ['Ұпай', 'gS', '0'], ['Қатарынан', 'gK', '0']]));
    var stage = el('div', 'g-stage');
    root.appendChild(stage);
    function next() {
      var f;
      do { f = pickOne(uniq); } while (uniq.length > 1 && last && f.id === last.id);
      last = f;
      asked++;
      var same = uniq.filter(function (x) { return x.id !== f.id && x.s === f.s; });
      var other = uniq.filter(function (x) { return x.id !== f.id && x.s !== f.s; });
      var distract = shuffle(same).slice(0, 3);
      if (distract.length < 3) distract = distract.concat(shuffle(other).slice(0, 3 - distract.length));
      var opts = shuffle([f].concat(distract));
      stage.innerHTML = '';
      stage.appendChild(el('div', 'g-prompt', '<span class="muted small">' + esc(DATA.sections[f.s]) + '</span><br>' + esc(f.name)));
      var box = el('div', 'g-opts');
      opts.forEach(function (o) {
        var b = el('button', 'opt tex', K(o.tex));
        b.type = 'button';
        b.addEventListener('click', function () {
          if (box.dataset.done) return;
          box.dataset.done = '1';
          if (o.id === f.id) {
            streak++; right++;
            score += 100 + Math.min(100, (streak - 1) * 10);
            b.classList.add('ok');
            setTimeout(next, 350);
          } else {
            streak = 0;
            b.classList.add('bad');
            Array.prototype.forEach.call(box.children, function (c, i) { if (opts[i].id === f.id) c.classList.add('ok'); });
            mistakes.push({ q: f.name, a: K(f.tex) });
            setTimeout(next, 1100);
          }
          setText('gS', String(score)); setText('gK', String(streak));
        });
        box.appendChild(b);
      });
      stage.appendChild(box);
    }
    timer = setInterval(function () {
      left--;
      setText('gT', String(left));
      if (left <= 0) {
        clearInterval(timer);
        endScreen('Уақыт бітті!', score, ['Дұрыс жауап: ' + right + ' / ' + asked], reviewList(uniqBy(mistakes, function (m) { return m.q; })));
      }
    }, 1000);
    next();
  }

  // ---------- 4. Шаманы таны ----------
  function gameSymbol() {
    ensurePool(4);
    var vars = [];
    POOL.forEach(function (f) { if (f.vars.length >= 2) f.vars.forEach(function (v) { vars.push(v); }); });
    var allVars = [];
    ALL.forEach(function (f) { f.vars.forEach(function (v) { allVars.push(v); }); });
    var picks = shuffle(uniqBy(shuffle(vars), function (v) { return v.f.id; })).slice(0, 10);
    var questions = picks.map(function (v) {
      var cand = shuffle(v.f.s ? allVars.filter(function (x) { return x.f.s === v.f.s; }) : allVars).concat(shuffle(allVars));
      var used = {}; used[v.meaning] = 1;
      var d = [];
      for (var i = 0; i < cand.length && d.length < 3; i++) {
        var x = cand[i];
        // Сол әріппен белгіленетін басқа шаманы ұсынбаймыз — ол оқушыны шатастырады.
        if (used[x.meaning] || x.sym === v.sym) continue;
        used[x.meaning] = 1; d.push(x);
      }
      var opts = shuffle([v].concat(d));
      return {
        prompt: '<span class="muted small">' + esc(v.f.name) + '</span><div class="g-tex">' + K(v.f.tex, true) + '</div>Формуладағы <span class="g-sym">' + K(v.sym) + '</span> нені білдіреді?',
        options: opts.map(function (o) { return { html: esc(o.meaning) }; }),
        correct: opts.indexOf(v),
        explain: K(v.sym) + ' — ' + esc(v.meaning) + (v.unit !== '—' ? ' (' + esc(v.unit) + ')' : ''),
        reviewQ: v.f.name, reviewA: K(v.sym) + ' — ' + esc(v.meaning),
      };
    });
    choiceSeries({ title: 'Шаманы таны: нәтиже', questions: questions });
  }

  // ---------- 5. Өлшем бірлігі ----------
  function gameUnits() {
    ensurePool(6);
    var SKIP = { '—': 1, 'рад': 1, '°': 1, '″': 1, '%': 1 };
    var vars = [];
    POOL.forEach(function (f) { f.vars.forEach(function (v) { if (!SKIP[v.unit]) vars.push(v); }); });
    var allUnits = uniqBy(ALL.reduce(function (a, f) { return a.concat(f.vars); }, []).filter(function (v) { return !SKIP[v.unit]; }), function (v) { return v.unit; }).map(function (v) { return v.unit; });
    // Мағынасы бірдей бірліктер (1 Дж = 1 Н·м т.б.) бір-біріне жалған жауап болмауы керек.
    var EQUIV = { 'Дж': 'E', 'Н·м': 'E', 'Н/Кл': 'F', 'В/м': 'F', 'Гц': 'H', 'с⁻¹': 'H', 'Па': 'P', 'Н/м²': 'P' };
    var same = function (a, b) { return a === b || (EQUIV[a] && EQUIV[a] === EQUIV[b]); };
    var picks = shuffle(uniqBy(shuffle(vars), function (v) { return v.meaning; })).slice(0, 10);
    var questions = picks.map(function (v) {
      var d = shuffle(allUnits.filter(function (u) { return !same(u, v.unit); })).slice(0, 3);
      var opts = shuffle([v.unit].concat(d));
      return {
        prompt: '<span class="muted small">' + esc(DATA.sections[v.f.s]) + '</span><br>' + esc(v.meaning) + ' <span class="g-sym">' + K(v.sym) + '</span><br><span class="muted small">Өлшем бірлігі қандай?</span>',
        options: opts.map(function (u) { return { html: esc(u) }; }),
        correct: opts.indexOf(v.unit),
        explain: esc(v.meaning) + ' — ' + esc(v.unit) + '. Формула: ' + K(v.f.tex),
        reviewQ: v.meaning, reviewA: esc(v.unit),
      };
    });
    choiceSeries({ title: 'Өлшем бірлігі: нәтиже', questions: questions });
  }

  // ---------- 6. Бірлік түрлендіру ----------
  var SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function num(x) {
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e5 || a < 1e-3) {
      var e = Math.floor(Math.log10(a));
      var m = +(x / Math.pow(10, e)).toPrecision(3);
      if (Math.abs(m) >= 10) { m = +(m / 10).toPrecision(3); e++; }
      var ms = String(m).replace('.', ',');
      return (ms === '1' ? '' : ms + '·') + '10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
    }
    return String(+x.toPrecision(6)).replace('.', ',');
  }
  var CONV = [
    function () { var v = pickOne([18, 36, 54, 72, 90, 108, 144]); return { q: v + ' км/сағ = ? м/с', a: v / 3.6, w: [v * 3.6, v / 36, v / 0.36], why: '1 км/сағ = 1000 м / 3600 с, яғни 3,6-ға бөлеміз.' }; },
    function () { var v = pickOne([5, 10, 15, 20, 25, 30]); return { q: v + ' м/с = ? км/сағ', a: v * 3.6, w: [v / 3.6, v * 36, v * 0.36], why: '1 м/с = 3,6 км/сағ, яғни 3,6-ға көбейтеміз.' }; },
    function () { var v = pickOne([0.8, 1, 1.3, 2.7, 7.8, 11.3, 13.6]); return { q: num(v) + ' г/см³ = ? кг/м³', a: v * 1000, w: [v / 1000, v * 100, v * 1e6], why: '1 г/см³ = 1000 кг/м³.' }; },
    function () { var v = pickOne([2, 5, 12, 101, 250]); return { q: v + ' кПа = ? Па', a: v * 1000, w: [v / 1000, v * 100, v * 1e6], why: '«кило» — 10³.' }; },
    function () { var v = pickOne([120, 250, 400, 750]); return { q: v + ' мм = ? м', a: v / 1000, w: [v / 100, v / 10, v * 1000], why: '«милли» — 10⁻³.' }; },
    function () { var v = pickOne([20, 50, 150, 400]); return { q: v + ' см² = ? м²', a: v * 1e-4, w: [v * 1e-2, v * 1e-3, v * 1e-6], why: '1 см² = (10⁻² м)² = 10⁻⁴ м².' }; },
    function () { var v = pickOne([2, 5, 10, 250]); return { q: v + ' л = ? м³', a: v * 1e-3, w: [v * 1e-2, v * 1e-6, v * 1e3], why: '1 л = 1 дм³ = 10⁻³ м³.' }; },
    function () { var v = pickOne([2, 3, 5, 15]); return { q: v + ' мин = ? с', a: v * 60, w: [v * 100, v * 3600, v / 60], why: '1 мин = 60 с.' }; },
    function () { var v = pickOne([1, 2, 3, 0.5]); return { q: num(v) + ' сағ = ? с', a: v * 3600, w: [v * 60, v * 360, v * 6000], why: '1 сағ = 3600 с.' }; },
    function () { var v = pickOne([-20, 0, 27, 100, 327]); return { q: v + ' °C = ? К', a: v + 273, w: [v - 273, v * 273, 273 - v], why: 'T = t + 273.' }; },
    function () { var v = pickOne([1, 2, 5]); return { q: v + ' кВт·сағ = ? Дж', a: v * 3.6e6, w: [v * 3.6e3, v * 1e3, v * 6e4], why: '1 кВт·сағ = 1000 Вт · 3600 с = 3,6·10⁶ Дж.' }; },
    function () { var v = pickOne([2, 5, 40]); return { q: v + ' мкКл = ? Кл', a: v * 1e-6, w: [v * 1e-3, v * 1e-9, v * 1e6], why: '«микро» — 10⁻⁶.' }; },
    function () { var v = pickOne([400, 500, 600, 700]); return { q: v + ' нм = ? м', a: v * 1e-9, w: [v * 1e-6, v * 1e-12, v * 1e-3], why: '«нано» — 10⁻⁹.' }; },
    function () { var v = pickOne([200, 450, 50]); return { q: v + ' г = ? кг', a: v / 1000, w: [v / 100, v * 1000, v / 10], why: '1 г = 10⁻³ кг.' }; },
    function () { var v = pickOne([3, 25, 160]); return { q: v + ' МДж = ? Дж', a: v * 1e6, w: [v * 1e3, v * 1e9, v * 1e-6], why: '«мега» — 10⁶.' }; },
  ];
  function gameConvert() {
    var gens = shuffle(CONV).slice(0, 10);
    var questions = gens.map(function (g) {
      var c = g();
      var answer = num(c.a);
      var wrong = uniqBy(c.w.map(num).filter(function (w) { return w !== answer; }), function (x) { return x; }).slice(0, 3);
      var opts = shuffle([answer].concat(wrong));
      return {
        prompt: '<span class="g-big">' + esc(c.q) + '</span>',
        options: opts.map(function (o) { return { html: esc(o) }; }),
        correct: opts.indexOf(answer),
        explain: esc(c.q.replace('?', answer)) + '. ' + esc(c.why),
        reviewQ: c.q, reviewA: esc(answer),
      };
    });
    choiceSeries({ title: 'Бірлік түрлендіру: нәтиже', questions: questions });
  }

  var GAMES = { cards: gameCards, pairs: gamePairs, quiz: gameQuiz, symbol: gameSymbol, units: gameUnits, convert: gameConvert };

  function start() {
    POOL = SECTION ? ALL.filter(function (f) { return f.s === SECTION; }) : ALL;
    poolNote = '';
    root.innerHTML = '';
    if (GAME === 'quiz') {
      var intro = el('div', 'g-end');
      intro.appendChild(el('h2', '', 'Дайынсың ба?'));
      intro.appendChild(el('p', 'muted', '60 секунд ішінде мүмкіндігінше көп формуланы тап. Қатарынан дұрыс жауаптар бонус береді.'));
      var b = el('button', 'btn lg', 'Бастау');
      b.type = 'button';
      b.addEventListener('click', gameQuiz);
      intro.appendChild(b);
      root.appendChild(intro);
      b.focus();
      return;
    }
    (GAMES[GAME] || gameCards)();
  }

  if (window.katex) start();
  else window.addEventListener('load', start);
})();

/* «Формуланы жина»: формуланың атауы мен сол жағы берілген; оң жақты тақтайшалардан дұрыс ретпен жинау.
   Ауыстырымды көбейтінділер үшін балама реттер де қабылданады. 10 формула. */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T, F = S.data.formulas || [];
  function K(tex) { try { return window.katex.renderToString(tex, { throwOnError: false, strict: 'ignore' }); } catch (e) { return S.esc(tex); } }
  var list, i, score, right, built, tries, mist;
  function start(opts) {
    var g = opts.grade, pool = F.filter(function (f) { return f[0] <= g && f[0] >= g - 2; });
    list = S.shuffle(pool).slice(0, 10); i = 0; score = 0; right = 0; mist = [];
    show();
  }
  function show() {
    var f = list[i], r = S.root; r.innerHTML = ''; built = []; tries = 0;
    r.appendChild(S.hud([['Формула', 'bN', (i + 1) + ' / ' + list.length], ['Ұпай', 'bS', String(score)]]));
    r.appendChild(S.el('div', 'mq', S.esc(f[1])));
    var eq = S.el('div', 'beq'); r.appendChild(eq);
    var tiles = S.el('div', 'btiles'); r.appendChild(tiles);
    var pool = S.shuffle(f[3].concat(f[4]).map(function (t, k) { return { t: t, id: k }; }));
    function draw() {
      eq.innerHTML = '<span class="blhs">' + K(f[2] + ' =') + '</span>' + (built.length ? '' : '<span class="bph">' + S.esc(T('тақтайшаларды осында жина')) + '</span>');
      built.forEach(function (tk, k) { var b = S.el('button', 'btile in', K(tk.t)); b.type = 'button'; b.addEventListener('click', function () { built.splice(k, 1); S.sfx('pop'); draw(); }); eq.appendChild(b); });
      tiles.innerHTML = '';
      pool.forEach(function (tk) { var used = built.indexOf(tk) >= 0, b = S.el('button', 'btile' + (used ? ' used' : ''), K(tk.t)); b.type = 'button'; b.disabled = used; b.addEventListener('click', function () { built.push(tk); S.sfx('pop'); draw(); }); tiles.appendChild(b); });
    }
    draw();
    var acts = S.el('div', 'gend-acts'), chk = S.el('button', 'btn lg', '✔ ' + S.esc(T('Тексеру'))), clr = S.el('button', 'btn ghost', '↺ ' + S.esc(T('Тазалау')));
    chk.type = clr.type = 'button';
    clr.addEventListener('click', function () { built = []; draw(); });
    chk.addEventListener('click', function () {
      var seq = built.map(function (b) { return b.t; }), alts = [f[3]].concat(f[5] || []);
      var ok = alts.some(function (a) { return a.length === seq.length && a.every(function (t, k) { return t === seq[k]; }); });
      tries++;
      if (ok) {
        var pts = tries === 1 ? 100 : tries === 2 ? 60 : 30; score += pts; right++; S.sfx('ok'); S.toast('+' + pts, 'good');
        eq.classList.add('ok'); S.set('bS', String(score)); acts.innerHTML = '';
        var nx = S.el('button', 'btn lg gbig', (i === list.length - 1 ? T('Нәтиже') : T('Келесі')) + ' ▶'); nx.type = 'button';
        nx.addEventListener('click', function () { i++; if (i < list.length) show(); else finish(); }); acts.appendChild(nx); nx.focus();
      } else {
        S.sfx('bad'); eq.classList.remove('shake'); void eq.offsetWidth; eq.classList.add('shake');
        if (tries >= 3) {
          mist.push(f[1]);
          eq.innerHTML = '<span class="blhs">' + K(f[2] + ' = ' + f[3].join(' ')) + '</span>';
          acts.innerHTML = '<p class="gexpl">' + S.esc(T('Дұрыс формула көрсетілді.')) + '</p>';
          var nx2 = S.el('button', 'btn lg', (i === list.length - 1 ? T('Нәтиже') : T('Келесі')) + ' ▶'); nx2.type = 'button';
          nx2.addEventListener('click', function () { i++; if (i < list.length) show(); else finish(); }); acts.appendChild(nx2);
        } else S.toast('Қате, тағы байқап көр', 'bad');
      }
    });
    acts.appendChild(chk); acts.appendChild(clr); r.appendChild(acts);
  }
  function finish() {
    var rev = null;
    if (mist.length) { rev = S.el('div', 'g-review'); rev.innerHTML = '<h3>' + S.esc(T('Қайталап шық')) + '</h3>' + mist.map(function (m) { return '<div class="g-rev"><span>' + S.esc(m) + '</span></div>'; }).join(''); }
    S.end({ title: 'Ойын аяқталды!', score: Math.min(1000, score), stars: right >= 9 ? 3 : right >= 7 ? 2 : right >= 5 ? 1 : 0, lines: [T('Жиналған формула') + ': ' + right + ' / ' + list.length], review: rev, onAgain: menu });
  }
  function menu() { S.intro({ title: 'Формуланы жина', lead: 'Атауы бойынша формуланы тақтайшалардан жина. Абайла, кейбір тақтайшалар артық!', grades: true, onStart: start }); }
  if (window.katex) menu(); else window.addEventListener('load', menu);
})();

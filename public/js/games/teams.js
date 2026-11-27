/* «Командалық сайыс»: интерактивті тақтаға. 2–4 команда, 10 немесе 15 сұрақ.
   Мұғалім жауап берген команданы, сосын жауапты таңдайды: дұрыс +100 (жылдам болса +бонус), қате −50 және сұрақ келесі командаға өтеді. */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T, Q = S.data.questions || [];
  var COLORS = ['#e2553d', '#2b7bd6', '#36a852', '#e9a21b'], NAMES = ['Ньютон', 'Эйнштейн', 'Фарадей', 'Сәтбаев'];
  var teams, qs, i, timer, tLeft, tried, cur;
  function setup() {
    var r = S.root; r.innerHTML = '';
    var box = S.el('div', 'gintro');
    box.appendChild(S.el('div', 'gintro-h', S.mascot + '<div><h2>' + S.esc(T('Командалық сайыс')) + '</h2><p>' + S.esc(T('Сыныпты командаларға бөліп, интерактивті тақтада ойнаңыз. Командалардың атын өзгертуге болады.')) + '</p></div>'));
    var grades = S.grades, form = S.el('div', 'tsetup');
    form.innerHTML = '<label class="fl">' + T('Сынып') + '<select id="tG">' + grades.map(function (g) { return '<option value="' + g + '">' + T(g + '-сынып') + '</option>'; }).join('') + '</select></label>' +
      '<label class="fl">' + T('Команда саны') + '<select id="tN"><option>2</option><option selected>3</option><option>4</option></select></label>' +
      '<label class="fl">' + T('Сұрақ саны') + '<select id="tQ"><option>10</option><option selected>15</option><option>20</option></select></label>' +
      '<div class="tnames" id="tNames"></div>';
    box.appendChild(form);
    var go = S.el('button', 'btn lg gbig', '▶ ' + S.esc(T('Сайысты бастау'))); go.type = 'button'; box.appendChild(go);
    r.appendChild(box);
    var dg = Number(S.root.dataset.grade); if (grades.indexOf(dg) >= 0) form.querySelector('#tG').value = dg;
    function names() { var n = +form.querySelector('#tN').value, h = ''; for (var k = 0; k < n; k++) h += '<label class="fl" style="--tc:' + COLORS[k] + '"><span class="tdot"></span><input type="text" maxlength="24" value="' + S.esc(T(NAMES[k])) + '"></label>'; form.querySelector('#tNames').innerHTML = h; }
    names(); form.querySelector('#tN').addEventListener('change', names);
    go.addEventListener('click', function () {
      var g = +form.querySelector('#tG').value, nq = +form.querySelector('#tQ').value;
      teams = [].map.call(form.querySelectorAll('#tNames input'), function (inp, k) { return { n: inp.value.trim() || T(NAMES[k]), c: COLORS[k], s: 0, right: 0 }; });
      var pool = Q.filter(function (q) { return q[0] === g || q[0] === g - 1; });
      var byD = [1, 2, 3].map(function (d) { return S.shuffle(pool.filter(function (q) { return q[1] === d; })); });
      qs = [];
      for (var k = 0; k < nq; k++) { var d = k < nq / 3 ? 0 : k < 2 * nq / 3 ? 1 : 2; var q = byD[d].shift() || byD[0].shift() || byD[1].shift() || byD[2].shift(); if (q) qs.push(q); }
      qs = qs.map(function (q) { return { q: q[2], o: S.shuffle(q[3].map(function (t, j) { return { t: t, ok: j === 0 }; })), ex: q[5], d: q[1] }; });
      i = 0; show();
    });
  }
  function board() { return '<div class="tboard">' + teams.map(function (t, k) { return '<span class="tteam' + (cur === k ? ' act' : '') + (tried.indexOf(k) >= 0 ? ' out' : '') + '" style="--tc:' + t.c + '"><b>' + S.esc(t.n) + '</b><em>' + t.s + '</em></span>'; }).join('') + '</div>'; }
  function show() {
    clearInterval(timer); tried = []; cur = null;
    var q = qs[i], r = S.root; r.innerHTML = '';
    var top = S.el('div', 'ttop', '<span class="gchip">' + T('Сұрақ') + ' ' + (i + 1) + ' / ' + qs.length + ' · ' + '★'.repeat(q.d) + '</span><span class="ttime" id="tT">20</span>');
    r.appendChild(top);
    r.appendChild(S.el('div', 'tb', board()));
    r.appendChild(S.el('div', 'mq tq', S.esc(q.q)));
    var opts = S.el('div', 'gopts'); r.appendChild(opts);
    q.o.forEach(function (o, k) { var b = S.el('button', 'gans', '<span class="gl">' + 'ABCD'[k] + '</span><span>' + S.esc(o.t) + '</span>'); b.type = 'button'; b.disabled = true; b.addEventListener('click', function () { answer(k, b); }); opts.appendChild(b); });
    var who = S.el('div', 'twho', '<p class="muted">' + S.esc(T('Қай команда жауап береді? Команданы түртіңіз, сосын жауапты таңдаңыз.')) + '</p>');
    r.appendChild(who);
    var skip = S.el('button', 'btn ghost', T('Ешкім білмейді — жауапты көрсету')); skip.type = 'button'; skip.addEventListener('click', reveal); who.appendChild(skip);
    r.querySelector('.tb').addEventListener('click', function (e) { var el = e.target.closest('.tteam'); if (!el) return; var k = [].indexOf.call(el.parentElement.children, el); if (tried.indexOf(k) >= 0) return; cur = k; S.sfx('pop'); r.querySelector('.tb').innerHTML = board(); r.querySelectorAll('.gans').forEach(function (b) { if (!b.classList.contains('bad')) b.disabled = false; }); });
    tLeft = 20;
    timer = setInterval(function () { tLeft--; var el = document.getElementById('tT'); if (el) { el.textContent = Math.max(0, tLeft); el.classList.toggle('low', tLeft <= 5); } if (tLeft <= 5 && tLeft > 0) S.sfx('tick'); if (tLeft <= 0) { clearInterval(timer); reveal(); } }, 1000);
  }
  function answer(k, b) {
    if (cur === null) return;
    var q = qs[i], t = teams[cur];
    if (q.o[k].ok) { var bonus = Math.max(0, tLeft) * 5; t.s += 100 + bonus; t.right++; S.sfx('ok'); S.toast(t.n + ': +' + (100 + bonus), 'good'); b.classList.add('ok'); done(); }
    else { t.s -= 50; S.sfx('bad'); S.toast(t.n + ': −50', 'bad'); b.classList.add('bad'); b.disabled = true; tried.push(cur); cur = null; S.root.querySelector('.tb').innerHTML = board(); S.root.querySelectorAll('.gans').forEach(function (x) { x.disabled = true; }); if (tried.length >= teams.length) reveal(); }
  }
  function reveal() {
    clearInterval(timer);
    var q = qs[i], btns = S.root.querySelectorAll('.gans');
    q.o.forEach(function (o, k) { if (o.ok) btns[k].classList.add('ok'); btns[k].disabled = true; });
    done();
  }
  function done() {
    clearInterval(timer);
    var q = qs[i];
    S.root.querySelector('.tb').innerHTML = (cur = null, board());
    var who = S.root.querySelector('.twho'); who.innerHTML = '<p class="gexpl">✔ ' + S.esc(q.ex) + '</p>';
    var nx = S.el('button', 'btn lg gbig', (i === qs.length - 1 ? T('Нәтижелер') : T('Келесі сұрақ')) + ' ▶'); nx.type = 'button';
    nx.addEventListener('click', function () { i++; if (i < qs.length) show(); else podium(); });
    who.appendChild(nx); nx.focus();
  }
  function podium() {
    var sorted = teams.slice().sort(function (a, b) { return b.s - a.s; }), r = S.root; r.innerHTML = '';
    var box = S.el('div', 'gend');
    box.appendChild(S.el('h2', '', '🏆 ' + S.esc(T('Жеңімпаз')) + ': ' + S.esc(sorted[0].n)));
    var pod = S.el('div', 'tpodium');
    [1, 0, 2].forEach(function (k) { var t = sorted[k]; if (!t) return; pod.appendChild(S.el('div', 'tpod p' + (k + 1), '<b>' + S.esc(t.n) + '</b><em>' + t.s + '</em><span style="background:' + t.c + '">' + (k + 1) + '</span>')); });
    box.appendChild(pod);
    if (sorted[3]) box.appendChild(S.el('p', 'muted', '4. ' + S.esc(sorted[3].n) + ' — ' + sorted[3].s));
    var again = S.el('button', 'btn lg', '↻ ' + S.esc(T('Жаңа сайыс'))); again.type = 'button'; again.addEventListener('click', setup);
    box.appendChild(again);
    r.appendChild(box); S.confetti(200); S.sfx('win');
  }
  setup();
})();

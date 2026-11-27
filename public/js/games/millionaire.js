/* «Физик-миллионер»: 12 сұрақ (1–4 жеңіл, 5–8 орта, 9–12 қиын), «сенімді» деңгейлер — 5 және 10-сұрақ.
   Көмектер: 50:50, «Кеңес», «Сыныптан сұра» (дұрыс жауапқа қарай ауытқыған дауыс беру). */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T, Q = S.data.questions || [];
  var LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 64000, 250000, 1000000], SAFE = [4, 9];
  var qs, i, won, timer, tLeft, help, chosen, grade;
  function build(g) {
    var pool = function (d) { var a = Q.filter(function (q) { return q[0] === g && q[1] === d; }); if (a.length < 4) a = a.concat(Q.filter(function (q) { return q[0] === g - 1 && q[1] === d; })); return S.shuffle(a).slice(0, 4); };
    return pool(1).concat(pool(2), pool(3)).map(function (q) { var o = S.shuffle(q[3].map(function (t, k) { return { t: t, ok: k === 0 }; })); return { q: q[2], o: o, hint: q[4], ex: q[5] }; });
  }
  function start(opts) { grade = opts.grade; qs = build(grade); i = 0; won = 0; help = { fifty: true, hint: true, poll: true }; show(); }
  function ladder() {
    return '<ol class="mladder">' + LADDER.map(function (v, k) { return '<li class="' + (k === i ? 'cur ' : '') + (k < i ? 'done ' : '') + (SAFE.indexOf(k) >= 0 ? 'safe' : '') + '"><span>' + (k + 1) + '</span><b>' + S.fmt(v) + ' ' + T('Дж') + '</b></li>'; }).reverse().join('') + '</ol>';
  }
  function show() {
    clearInterval(timer); chosen = false;
    var q = qs[i], r = S.root; r.innerHTML = '';
    var wrap = S.el('div', 'mwrap');
    var main = S.el('div', 'mmain');
    main.appendChild(S.hud([['Сұрақ', 'mQ', (i + 1) + ' / 12'], ['Ұтыс', 'mW', S.fmt(i ? LADDER[i - 1] : 0) + ' ' + T('Дж')], ['Уақыт', 'mT', '30']]));
    var helps = S.el('div', 'mhelps');
    [['fifty', '50:50'], ['hint', '💡 ' + T('Кеңес')], ['poll', '📊 ' + T('Сыныптан сұра')]].forEach(function (h) {
      var b = S.el('button', 'mhelp', h[1]); b.type = 'button'; b.disabled = !help[h[0]];
      b.addEventListener('click', function () { useHelp(h[0]); b.disabled = true; });
      helps.appendChild(b);
    });
    main.appendChild(helps);
    main.appendChild(S.el('div', 'mq', S.esc(q.q)));
    var opts = S.el('div', 'gopts');
    q.o.forEach(function (o, k) {
      var b = S.el('button', 'gans', '<span class="gl">' + 'ABCD'[k] + '</span><span>' + S.esc(o.t) + '</span>'); b.type = 'button';
      b.addEventListener('click', function () { pickAns(k, b); });
      opts.appendChild(b);
    });
    main.appendChild(opts);
    main.appendChild(S.el('div', 'mextra'));
    wrap.appendChild(main);
    wrap.appendChild(S.el('aside', 'mside', ladder()));
    r.appendChild(wrap);
    tLeft = 30;
    timer = setInterval(function () { tLeft--; S.set('mT', String(Math.max(0, tLeft))); if (tLeft <= 5 && tLeft > 0) S.sfx('tick'); if (tLeft <= 0) { clearInterval(timer); lose(T('Уақыт бітті!')); } }, 1000);
  }
  function useHelp(h) {
    var q = qs[i], btns = S.root.querySelectorAll('.gans'), extra = S.root.querySelector('.mextra');
    help[h] = false; S.sfx('pop');
    if (h === 'fifty') { var wrong = []; q.o.forEach(function (o, k) { if (!o.ok) wrong.push(k); }); S.shuffle(wrong).slice(0, 2).forEach(function (k) { btns[k].classList.add('gone'); btns[k].disabled = true; }); }
    if (h === 'hint') extra.innerHTML = '<p class="gexpl">💡 ' + S.esc(q.hint) + '</p>';
    if (h === 'poll') {
      var vis = []; q.o.forEach(function (o, k) { if (!btns[k].classList.contains('gone')) vis.push(k); });
      var level = i < 4 ? 0.7 : i < 8 ? 0.55 : 0.4, votes = {}, rest = 1 - level;
      vis.forEach(function (k) { votes[k] = q.o[k].ok ? level : 0; });
      var others = vis.filter(function (k) { return !q.o[k].ok; });
      others.forEach(function (k, j) { var share = j === others.length - 1 ? rest : rest * Math.random(); votes[k] = share; rest -= share; });
      if (!others.length) votes[vis[0]] = 1;
      extra.innerHTML = '<div class="mpoll">' + vis.map(function (k) { var p = Math.round(votes[k] * 100); return '<span><b>' + 'ABCD'[k] + '</b><i style="height:' + Math.max(4, p) + '%"></i><em>' + p + '%</em></span>'; }).join('') + '</div>';
    }
  }
  function pickAns(k, b) {
    if (chosen) return; chosen = true; clearInterval(timer);
    var q = qs[i], btns = S.root.querySelectorAll('.gans');
    btns.forEach(function (x) { x.disabled = true; });
    b.classList.add('sel');
    setTimeout(function () {
      q.o.forEach(function (o, j) { if (o.ok) btns[j].classList.add('ok'); });
      if (q.o[k].ok) {
        S.sfx('ok'); won = LADDER[i];
        S.root.querySelector('.mextra').innerHTML = '<p class="gexpl">✔ ' + S.esc(q.ex) + '</p>';
        if (i === 11) { setTimeout(function () { finish(T('Сен — физик-миллионерсің!'), true); }, 1400); return; }
        var nx = S.el('button', 'btn lg gbig', T('Келесі сұрақ') + ' ▶'); nx.type = 'button';
        nx.addEventListener('click', function () { i++; show(); });
        var stopB = S.el('button', 'btn ghost', T('Ұтысты алып кету') + ' (' + S.fmt(won) + ' ' + T('Дж') + ')'); stopB.type = 'button';
        stopB.addEventListener('click', function () { finish(T('Ұтысты алып кеттің!'), false); });
        var act = S.el('div', 'gend-acts'); act.appendChild(nx); act.appendChild(stopB);
        S.root.querySelector('.mextra').appendChild(act); nx.focus();
      } else { btns[k].classList.add('bad'); lose(T('Қате жауап.') + ' ' + q.ex); }
    }, 900);
  }
  function lose(why) {
    var safe = 0; SAFE.forEach(function (s) { if (i > s) safe = LADDER[s]; });
    won = safe;
    setTimeout(function () { finish(why, false); }, 1600);
  }
  function finish(title, top) {
    clearInterval(timer);
    var stars = won >= 1000000 ? 3 : won >= 16000 ? 2 : won >= 1000 ? 1 : 0;
    S.end({ title: top ? title : (won ? T('Ойын аяқталды') : T('Келесі жолы сәттілік!')), score: won, unit: 'Дж ұтыс', stars: stars,
      lines: [top ? T('12 сұрақтың бәріне дұрыс жауап бердің!') : S.esc(title), T('Сұрақтар') + ': ' + T(grade + '-сынып') + '.'], onAgain: menu });
  }
  function menu() { S.intro({ title: 'Физик-миллионер', lead: '12 сұрақ, үш көмек, әр сұраққа 30 секунд. 5 және 10-сұрақтан кейінгі ұтыс сақталады.', grades: true, onStart: start }); }
  menu();
})();

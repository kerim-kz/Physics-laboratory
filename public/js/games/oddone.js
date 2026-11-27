/* «Артығын тап»: төрт нұсқаның біреуі қалғанымен бір топқа жатпайды. 10 раунд, тез жауапқа бонус, әр раундтан кейін түсіндірме. */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T, SETS = S.data.sets || [];
  var rounds, i, score, right, t0, mist;
  function start(opts) {
    var g = opts.grade, pool = SETS.filter(function (s) { return s[0] <= g && s[0] >= g - 2; });
    rounds = S.shuffle(pool).slice(0, 10); i = 0; score = 0; right = 0; mist = [];
    show();
  }
  function show() {
    var s = rounds[i], r = S.root; r.innerHTML = '';
    r.appendChild(S.hud([['Раунд', 'oR', (i + 1) + ' / ' + rounds.length], ['Ұпай', 'oS', String(score)]]));
    r.appendChild(S.el('div', 'mq', S.esc(T('Қайсысы артық?'))));
    var order = S.shuffle([0, 1, 2, 3]), opts = S.el('div', 'gopts oopts');
    order.forEach(function (k) { var b = S.el('button', 'gans', '<span>' + S.esc(s[1][k]) + '</span>'); b.type = 'button'; b.addEventListener('click', function () { pick(k, b, opts, order); }); opts.appendChild(b); });
    r.appendChild(opts);
    r.appendChild(S.el('div', 'oex'));
    t0 = Date.now();
  }
  function pick(k, b, opts, order) {
    var s = rounds[i], btns = opts.querySelectorAll('.gans');
    btns.forEach(function (x) { x.disabled = true; });
    var ok = k === s[2];
    if (ok) { var sec = (Date.now() - t0) / 1000, pts = Math.round(60 + Math.max(0, 40 - sec * 4)); score += pts; right++; S.sfx('ok'); S.toast('+' + pts, 'good'); b.classList.add('ok'); }
    else { S.sfx('bad'); b.classList.add('bad'); btns[order.indexOf(s[2])].classList.add('ok'); mist.push(s[1].join(', ') + ' → ' + s[1][s[2]]); }
    S.set('oS', String(score));
    var ex = S.root.querySelector('.oex');
    ex.innerHTML = '<p class="gexpl">' + (ok ? '✔ ' : '✖ ') + S.esc(s[3]) + '</p>';
    var nx = S.el('button', 'btn lg gbig', (i === rounds.length - 1 ? T('Нәтиже') : T('Келесі')) + ' ▶'); nx.type = 'button';
    nx.addEventListener('click', function () { i++; if (i < rounds.length) show(); else finish(); });
    var act = S.el('div', 'gend-acts'); act.appendChild(nx); ex.appendChild(act); nx.focus();
  }
  function finish() {
    var rev = null;
    if (mist.length) { rev = S.el('div', 'g-review'); rev.innerHTML = '<h3>' + S.esc(T('Қайталап шық')) + '</h3>' + mist.map(function (m) { return '<div class="g-rev"><span>' + S.esc(m) + '</span></div>'; }).join(''); }
    S.end({ title: 'Ойын аяқталды!', score: Math.min(1000, score), stars: right >= 9 ? 3 : right >= 7 ? 2 : right >= 5 ? 1 : 0, lines: [T('Дұрыс жауап') + ': ' + right + ' / ' + rounds.length], review: rev, onAgain: menu });
  }
  function menu() { S.intro({ title: 'Артығын тап', lead: 'Төрт нұсқаның қайсысы артық? Тез ойлан — жылдам жауап бонус береді.', grades: true, onStart: start }); }
  menu();
})();

/* «Онлайн зертхана» үлгісіндегі (v2) зертханалар үшін платформа көпірі.
   Зертхананың файлы өзгеріссіз қалады; бұл скрипт оның window.App нысанын жасалған сәтте ұстап алып:
   1) сайтқа кірген оқушының аты-жөні мен сыныбын тіркеу формасына өзі қояды (нұсқа солардан шығады);
   2) жұмыстың жергілікті сақталуын аккаунтқа байлайды — бір компьютерде бірнеше оқушы жұмыс істесе, жұмыстары араласпайды;
   3) оқушы «Тапсыру» басқанда 10 балдық нәтижені /api/labs/<key>/subs/<uid> арқылы мұғалім журналына жібереді;
   4) батырмалардағы ішкі onclick="App.go('…')" / onclick="print()" өңдегіштерін CSP бұғаттайтындықтан, оларды өзі орындайды. */
(function () {
  'use strict';
  var el = document.getElementById('labRuntimeConfig');
  var CFG = el ? JSON.parse(el.textContent) : {};
  var PARTS = ['quiz', 'asm', 'meas', 'calc', 'concl'];

  function send(app) {
    var S = app.S, R = S && S.res;
    if (!CFG.uid || !S || !S.submitted || !R || S._sentAt === S.finished) return;
    var data = {
      score: Math.max(0, Math.min(10, Number(R.total) || 0)),
      crit: PARTS.map(function (k) { return R[k] && R[k].s >= 0.5 ? 1 : 0; }),
      parts: PARTS.reduce(function (o, k) { o[k] = R[k] ? R[k].pts : 0; return o; }, {}),
      variant: S.code || '',
      at: new Date(S.finished || Date.now()).toLocaleString('kk-KZ'),
      attempt: S.attempt || 1,
      lab: app.L && app.L.num,
    };
    fetch('/api/labs/' + encodeURIComponent(CFG.key) + '/subs/' + encodeURIComponent(CFG.uid), {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': CFG.csrf },
      body: JSON.stringify(data),
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      S._sentAt = S.finished;
      try { localStorage.setItem(app.key(), JSON.stringify(S)); } catch (e) { /* сақтау міндетті емес */ }
      if (app.toast) app.toast('Нәтиже мұғалімнің журналына жіберілді', 'ok');
    }).catch(function () {
      if (app.toast) app.toast('Нәтиже журналға жіберілмеді — интернетті тексеріп, бетті қайта ашыңыз', 'warn');
    });
  }

  function patch(app) {
    if (!app || app.__bridged) return app;
    app.__bridged = true;
    var key = app.key, load = app.load, save = app.save;
    if (CFG.uid) app.key = function () { return key.call(this) + '_' + CFG.uid; };
    app.load = function () {
      var s = load.call(this);
      // Сайтқа кірген оқушы: тіркеу формасын аккаунттағы аты-жөнімен толтырып, бірден бастаймыз
      if (!s && CFG.name && CFG.cls) { s = this.fresh(); s.name = CFG.name; s.cls = CFG.cls; s.started = Date.now(); }
      return s;
    };
    app.save = function () { save.apply(this, arguments); send(this); };
    var reg = app.renderReg;
    if (reg) app.renderReg = function () {
      reg.apply(this, arguments);
      var n = document.getElementById('rn'), c = document.getElementById('rc');
      if (n && CFG.name) { n.value = CFG.name; n.readOnly = true; }
      if (c && CFG.cls) c.value = CFG.cls;
    };
    return app;
  }

  var current;
  try {
    Object.defineProperty(window, 'App', { configurable: true, get: function () { return current; }, set: function (v) { current = patch(v); } });
  } catch (e) { /* App қасиеті бұрыннан бар — көпірсіз жұмыс істейді */ }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[onclick]');
    if (!b) return;
    var code = (b.getAttribute('onclick') || '').trim(), m = /^App\.go\('([a-z]+)'\)$/.exec(code);
    if (m && current && current.go) { e.preventDefault(); current.go(m[1]); } else if (code === 'print()') { e.preventDefault(); window.print(); }
  });
})();

/* Симуляция бетіндегі оқу нұсқаулығы:
   1) «Болжа → тексер → түсіндір» (POE): оқушы алдымен болжам жасайды, симуляцияда тексереді, сосын түсіндірмені ашады.
   2) Зерттеу тапсырмалары — белгіленетін тізім, прогресс браузерде сақталады. */
(function () {
  'use strict';
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  var box = document.getElementById('simPredict');
  if (box) {
    var key = 'predict:' + box.dataset.sim;
    var opts = [].slice.call(box.querySelectorAll('.pr-opt'));
    var wait = box.querySelector('.pr-wait'), ans = box.querySelector('.pr-ans');
    var steps = box.querySelectorAll('.pr-step'), verdict = box.querySelector('.pr-verdict');
    var setStep = function (n) { [].forEach.call(steps, function (s, i) { s.classList.toggle('on', i <= n); }); };
    var render = function (st) {
      opts.forEach(function (b, i) {
        b.classList.toggle('picked', !!st && st.i === i);
        b.classList.toggle('right', !!st && st.shown && b.dataset.ok === '1');
        b.classList.toggle('wrong', !!st && st.shown && st.i === i && b.dataset.ok !== '1');
        b.disabled = !!st;
      });
      wait.hidden = !st || !!st.shown;
      ans.hidden = !st || !st.shown;
      box.classList.toggle('done', !!(st && st.shown));
      setStep(!st ? 0 : st.shown ? 2 : 1);
      if (st && st.shown) {
        var ok = opts[st.i] && opts[st.i].dataset.ok === '1';
        verdict.textContent = ok ? 'Болжамың дұрыс! Неліктен екенін түсіндіріп көр:' : 'Болжамың расталмады — бұл да ғылымның бір бөлігі. Түсіндірмесі:';
        verdict.className = 'pr-verdict ' + (ok ? 'ok' : 'no');
      }
    };
    var st = store(key);
    if (st && (typeof st.i !== 'number' || !opts[st.i])) st = null;
    render(st);
    opts.forEach(function (b, i) {
      b.addEventListener('click', function () {
        st = { i: i, shown: false }; store(key, st); render(st);
        var stage = document.querySelector('.simstage');
        if (stage && stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    document.getElementById('prReveal').addEventListener('click', function () { st.shown = true; store(key, st); render(st); });
    document.getElementById('prAgain').addEventListener('click', function () { st = null; store(key, null); render(st); });
  }

  var list = document.getElementById('simTasks');
  if (list) {
    var tkey = 'tasks:' + list.dataset.sim, prog = document.getElementById('simTasksProg');
    var done = store(tkey) || [];
    var items = [].slice.call(list.children);
    list.classList.add('checkable');
    var upd = function () {
      var n = items.filter(function (li, i) { return done[i]; }).length;
      prog.hidden = false;
      prog.textContent = n === items.length ? 'Барлық тапсырма орындалды! Жарайсың.' : 'Орындалды: ' + n + ' / ' + items.length;
      prog.classList.toggle('all', n === items.length);
    };
    items.forEach(function (li, i) {
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = !!done[i];
      cb.setAttribute('aria-label', 'Орындалды');
      li.classList.toggle('done', !!done[i]);
      li.insertBefore(cb, li.firstChild);
      cb.addEventListener('change', function () { done[i] = cb.checked; li.classList.toggle('done', cb.checked); store(tkey, done); upd(); });
    });
    upd();
  }
})();

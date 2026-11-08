// Барлық беттерге ортақ шағын әрекеттер.
(function () {
  var root = document.documentElement;

  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme');
      if (!cur) cur = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  }

  // data-confirm: қауіпті әрекет алдында сұрау.
  document.addEventListener('submit', function (e) {
    var f = e.target;
    var msg = f.getAttribute('data-confirm') || (e.submitter && e.submitter.getAttribute('data-confirm'));
    if (msg && !confirm(msg)) e.preventDefault();
  });

  // data-copy: мәтінді алмасу буферіне көшіру.
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    var text = b.getAttribute('data-copy');
    var done = function () { var o = b.textContent; b.textContent = 'Көшірілді'; setTimeout(function () { b.textContent = o; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
  });

  // Сүзгі формалары: таңдау өзгергенде бірден жіберу.
  document.querySelectorAll('form[data-autosubmit]').forEach(function (f) {
    f.addEventListener('change', function (e) {
      if (e.target.matches('select, input[type=checkbox], input[type=radio]')) f.submit();
    });
  });
})();

// Бүйір мәзір: ашу/жабу, Esc, фонды басқанда жабылу, фокусты мәзір ішінде ұстау.
(function () {
  var btn = document.getElementById('menuBtn');
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('drawerScrim');
  var close = document.getElementById('drawerClose');
  if (!btn || !drawer) return;
  function isOpen() { return drawer.getAttribute('data-open') === '1'; }
  function open() {
    drawer.setAttribute('data-open', '1');
    btn.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.hidden = false;
    document.body.classList.add('noscroll');
    var cur = drawer.querySelector('a.on') || drawer.querySelector('a');
    setTimeout(function () { if (cur) cur.focus(); }, 30);
  }
  function shut(focusBtn) {
    drawer.setAttribute('data-open', '0');
    btn.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.hidden = true;
    document.body.classList.remove('noscroll');
    if (focusBtn) btn.focus();
  }
  btn.addEventListener('click', function () { if (isOpen()) shut(true); else open(); });
  if (close) close.addEventListener('click', function () { shut(true); });
  if (scrim) scrim.addEventListener('click', function () { shut(false); });
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { shut(true); return; }
    if (e.key === 'Tab') {
      var f = drawer.querySelectorAll('a, button');
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  });
})();

// Мұғалімді тіркеу: «жаңа мектеп» өрістері тек қажет кезде көрінеді.
(function () {
  var sel = document.getElementById('schoolSel');
  var box = document.getElementById('newSchool');
  if (!sel || !box) return;
  var sync = function () { box.style.display = sel.value === 'new' ? 'grid' : 'none'; };
  sel.addEventListener('change', sync);
  sync();
})();

// Басып шығару батырмасы
document.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

// «Барлық шешімдерді ашу» батырмасы (олимпиада беті).
document.querySelectorAll('[data-expand-all]').forEach(function (b) {
  b.addEventListener('click', function () {
    var all = document.querySelectorAll('details.op-d');
    var openAll = Array.prototype.some.call(all, function (d) { return !d.open; });
    all.forEach(function (d) { d.open = openAll; });
    b.textContent = openAll ? 'Шешімдерді жабу' : 'Барлық шешімдерді ашу';
  });
});

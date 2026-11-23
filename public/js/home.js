// Басты бет: каталогтағы сынып қойындылары және «Тағы көрсету» батырмасы (JavaScript-сіз де сілтеме арқылы жұмыс істейді).
(function () {
  var tabs = document.querySelectorAll('.gtabs [data-g]');
  var panels = document.querySelectorAll('.gpanel');
  if (!tabs.length) return;
  function show(g) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-g') === g;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) { p.hidden = p.getAttribute('data-g') !== g; });
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      show(t.getAttribute('data-g'));
      try { history.replaceState(null, '', '/?g=' + t.getAttribute('data-g') + '#catalog'); } catch (err) { /* */ }
    });
  });
  document.querySelectorAll('[data-show-more]').forEach(function (b) {
    b.addEventListener('click', function () {
      var panel = b.closest('.gpanel');
      panel.querySelectorAll('[data-more]').forEach(function (c) { c.hidden = false; });
      b.parentNode.remove();
    });
  });
})();

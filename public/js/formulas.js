/* Формуланы толық экранды терезеде ашу: [data-formula] сілтемесін басқанда сипаттама серверден алынады.
   ← → — алдыңғы/келесі формула, Esc — жабу, «Толық экран» — проекторға арналған режим. */
(function () {
  'use strict';
  if (!window.HTMLDialogElement) return; // ескі браузерде сілтеме жеке бетті ашады
  var dlg = document.createElement('dialog');
  dlg.className = 'fmodal';
  dlg.innerHTML =
    '<div class="fm-bar">' +
      '<button type="button" class="btn ghost sm" data-fm="prev" aria-label="Алдыңғы формула">←</button>' +
      '<span class="fm-pos mono"></span>' +
      '<button type="button" class="btn ghost sm" data-fm="next" aria-label="Келесі формула">→</button>' +
      '<span class="grow"></span>' +
      '<a class="btn ghost sm fm-link" href="#">Жеке бетте ашу</a>' +
      '<button type="button" class="btn ghost sm" data-fm="fs">Толық экран</button>' +
      '<button type="button" class="btn sm" data-fm="close">Жабу ✕</button>' +
    '</div>' +
    '<div class="fm-body" tabindex="-1"></div>';
  document.body.appendChild(dlg);
  var body = dlg.querySelector('.fm-body');
  var pos = dlg.querySelector('.fm-pos');
  var link = dlg.querySelector('.fm-link');
  var cache = {};
  var ids = [], cur = -1, token = 0;

  function collect() {
    var seen = {};
    ids = [];
    document.querySelectorAll('a[data-formula]').forEach(function (a) {
      var id = a.getAttribute('data-formula');
      if (!seen[id]) { seen[id] = 1; ids.push(id); }
    });
  }

  function load(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return fetch('/formulas/' + encodeURIComponent(id) + '?part=1', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { cache[id] = t; return t; });
  }

  function show(i) {
    if (i < 0 || i >= ids.length) return;
    cur = i;
    var id = ids[i], my = ++token;
    pos.textContent = (i + 1) + ' / ' + ids.length;
    link.href = '/formulas/' + id;
    dlg.querySelector('[data-fm="prev"]').disabled = i === 0;
    dlg.querySelector('[data-fm="next"]').disabled = i === ids.length - 1;
    body.innerHTML = '<p class="muted">Жүктелуде…</p>';
    if (!dlg.open) dlg.showModal();
    load(id).then(function (t) {
      if (my !== token) return;
      body.innerHTML = t;
      var h = body.querySelector('.fd-name');
      dlg.setAttribute('aria-label', h ? h.textContent : 'Формула');
      body.scrollTop = 0;
      body.focus();
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      // көршілес формулаларды алдын ала жүктеу
      if (ids[i + 1]) load(ids[i + 1]).catch(function () {});
    }).catch(function () {
      if (my === token) body.innerHTML = '<p class="err">Формуланы жүктеу мүмкін болмады. <a href="/formulas/' + id + '">Жеке бетте ашыңыз</a>.</p>';
    });
  }

  function close() {
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', function () {
    if (history.replaceState && location.hash) history.replaceState(null, '', location.pathname + location.search);
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-formula]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    collect();
    show(ids.indexOf(a.getAttribute('data-formula')));
  });

  dlg.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fm]');
    if (e.target === dlg) { close(); return; } // фонды басқанда
    if (!b) return;
    var act = b.getAttribute('data-fm');
    if (act === 'prev') show(cur - 1);
    else if (act === 'next') show(cur + 1);
    else if (act === 'close') close();
    else if (act === 'fs') {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else if (dlg.requestFullscreen) dlg.requestFullscreen().catch(function () {});
    }
  });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
  });
  document.addEventListener('fullscreenchange', function () {
    var b = dlg.querySelector('[data-fm="fs"]');
    b.textContent = document.fullscreenElement ? 'Толық экраннан шығу' : 'Толық экран';
  });

  // Сілтемеде #kin-1 сияқты белгі болса, формуланы бірден ашамыз.
  var h = location.hash.slice(1);
  if (h && document.querySelector('a[data-formula="' + CSS.escape(h) + '"]')) { collect(); show(ids.indexOf(h)); }
})();

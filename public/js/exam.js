/* Тест тапсыру: жаттығу режимінде әр тапсырма бірден тексеріледі, сынақ режимінде уақытпен өтеді. */
(function () {
  'use strict';
  var form = document.getElementById('examForm');
  var dataEl = document.getElementById('examData');
  if (!form || !dataEl) return;
  var units = JSON.parse(dataEl.textContent);
  var MODE = form.dataset.mode, EXAM = form.dataset.exam, CSRF = form.dataset.csrf;
  var LETTERS = 'ABCDEF';
  var started = Date.now(), finished = false;
  var answered = {};
  var total = 0;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function post(url, body) {
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function picked(qEl) {
    return Array.prototype.filter.call(qEl.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return +i.value; });
  }
  function progress() {
    var n = Object.keys(answered).length;
    document.getElementById('exProgress').textContent = n + ' / ' + total;
  }

  function showResult(qEl, r) {
    qEl.classList.add(r.ok ? 'q-ok' : r.points > 0 ? 'q-part' : 'q-bad');
    qEl.querySelectorAll('label.qopt').forEach(function (lab) {
      var v = +lab.querySelector('input').value;
      if (r.correct.indexOf(v) >= 0) lab.classList.add('right');
      else if (lab.querySelector('input').checked) lab.classList.add('wrong');
    });
    qEl.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
    var fb = qEl.querySelector('.q-fb');
    fb.innerHTML = '<b>' + (r.ok ? 'Дұрыс' : r.points > 0 ? 'Жартылай дұрыс' : 'Қате') + ' · ' + r.points + ' / ' + r.max + ' балл.</b> ' + esc(r.explanation || '');
    fb.hidden = false;
    var btn = qEl.querySelector('.q-check');
    if (btn) btn.remove();
  }

  var qNo = 0;
  units.forEach(function (u) {
    var box = document.createElement('section');
    box.className = 'panel unit';
    if (u.title || u.context) {
      box.innerHTML = (u.title ? '<h2>' + esc(u.title) + '</h2>' : '') + (u.context ? '<p class="context">' + esc(u.context) + '</p>' : '');
    }
    u.questions.forEach(function (qq) {
      qNo++; total++;
      var qEl = document.createElement('div');
      qEl.className = 'question';
      qEl.dataset.id = qq.id;
      var multi = qq.kind === 'multi';
      var h = '<p class="q-stem"><span class="q-no">' + qNo + '</span>' + esc(qq.stem) + (multi ? ' <span class="pill pending">бірнеше дұрыс жауап</span>' : '') + '</p><div class="q-opts">';
      // Нұсқалар әр жолы араласып көрсетіледі; value — бастапқы индекс, сондықтан бағалау өзгермейді.
      var order = qq.options.map(function (o, i) { return i; });
      for (var k = order.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var t = order[k]; order[k] = order[j]; order[j] = t; }
      order.forEach(function (i, pos) {
        h += '<label class="qopt"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="q' + qq.id + '" value="' + i + '"><span class="q-l">' + LETTERS[pos] + '</span><span>' + esc(qq.options[i]) + '</span></label>';
      });
      h += '</div>';
      if (MODE === 'practice') h += '<button type="button" class="btn sm q-check" disabled>Тексеру</button>';
      h += '<p class="q-fb" hidden aria-live="polite"></p>';
      qEl.innerHTML = h;
      qEl.addEventListener('change', function () {
        var p = picked(qEl);
        if (p.length) answered[qq.id] = p; else delete answered[qq.id];
        var b = qEl.querySelector('.q-check');
        if (b) b.disabled = !p.length;
        progress();
      });
      var cb = qEl.querySelector('.q-check');
      if (cb) cb.addEventListener('click', function () {
        cb.disabled = true;
        post('/api/exams/check', { id: qq.id, answer: picked(qEl) }).then(function (r) { if (r && !r.error) showResult(qEl, r); else cb.disabled = false; });
      });
      box.appendChild(qEl);
    });
    form.appendChild(box);
  });

  var foot = document.createElement('div');
  foot.className = 'panel exam-foot';
  foot.innerHTML = '<p class="muted small">' + (MODE === 'exam' ? 'Барлық жауапты белгілеп болған соң «Аяқтау» батырмасын бас. Уақыт біткенде тест өздігінен аяқталады.' : 'Әр тапсырманы «Тексеру» арқылы тексеруге болады. Соңында жалпы нәтижені сақтау үшін «Аяқтау» бас.') + '</p><button type="submit" class="btn lg">Аяқтау</button><div id="exSummary"></div>';
  form.appendChild(foot);
  progress();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (finished) return;
    var missing = total - Object.keys(answered).length;
    if (missing > 0 && !e.detail && !confirm(missing + ' тапсырмаға жауап берілмеді. Аяқтай бересің бе?')) return;
    finish();
  });

  function finish() {
    finished = true;
    var all = {};
    form.querySelectorAll('.question').forEach(function (qEl) { all[qEl.dataset.id] = picked(qEl); });
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    post('/api/exams/submit', { exam: EXAM, mode: MODE, section: form.dataset.section, answers: all, duration: Math.round((Date.now() - started) / 1000) }).then(function (r) {
      if (!r || r.error) { btn.disabled = false; finished = false; alert((r && r.error) || 'Қате шықты'); return; }
      form.querySelectorAll('.question').forEach(function (qEl) {
        var res = r.results[qEl.dataset.id];
        if (res && !qEl.querySelector('.q-fb:not([hidden])')) showResult(qEl, res);
      });
      var pct = r.max ? Math.round(100 * r.score / r.max) : 0;
      var sum = document.getElementById('exSummary');
      sum.innerHTML = '<div class="g-end"><h2>Нәтиже: ' + r.score + ' / ' + r.max + ' балл (' + pct + '%)</h2><p>Дұрыс орындалған тапсырма: ' + r.right + ' / ' + r.total + '</p>' +
        '<p class="muted small">' + (r.saved ? 'Нәтиже кабинетіңе сақталды.' : 'Нәтижені сақтау үшін платформаға кір.') + '</p>' +
        '<p><a class="btn" href="' + location.pathname + location.search + '">Жаңа тест</a> <a class="btn ghost" href="/exams/' + EXAM + '">Емтихан бетіне</a></p></div>';
      btn.remove();
      var t = document.getElementById('exTimer'); if (t) t.textContent = 'аяқталды';
      sum.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Сынақ режимінің таймері
  var timerEl = document.getElementById('exTimer');
  if (timerEl && MODE === 'exam') {
    var limit = +form.dataset.limit;
    var tick = function () {
      if (finished) return;
      var left = Math.max(0, limit - Math.round((Date.now() - started) / 1000));
      timerEl.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      if (left <= 60) timerEl.classList.add('low');
      if (left <= 0) { finish(); return; }
      setTimeout(tick, 1000);
    };
    tick();
  }
})();

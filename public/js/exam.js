/* Тест тапсыру. Сұрақтарды сервер салады; бұл скрипт жауаптарды жинайды, жаттығу режимінде әр тапсырманы
   бірден тексереді, сынақ режимінде уақытты санайды және соңында нәтижені серверге жібереді.
   Сұрақ түрлері (data-kind): single, multi — таңдау; matrix — «Иә/Жоқ» кестесі; number — сан; open — ашық жауап. */
(function () {
  'use strict';
  var form = document.getElementById('examForm');
  if (!form) return;
  var MODE = form.dataset.mode, EXAM = form.dataset.exam, CSRF = form.dataset.csrf, ASSIGN = form.dataset.assignment || '';
  var started = Date.now(), finished = false;
  var questions = Array.prototype.slice.call(form.querySelectorAll('.question'));
  var total = questions.length;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function post(url, body) {
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  // Сұрақтың жауабын оқу.
  function answerOf(qEl) {
    var kind = qEl.dataset.kind;
    if (kind === 'open') { var t = qEl.querySelector('textarea'); return t ? t.value : ''; }
    if (kind === 'number') { var n = qEl.querySelector('input[type=text]'); return n ? n.value : ''; }
    if (kind === 'matrix') {
      return Array.prototype.map.call(qEl.querySelectorAll('tbody tr'), function (tr) {
        var c = tr.querySelector('input:checked');
        return c ? +c.value : null;
      });
    }
    return Array.prototype.filter.call(qEl.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return +i.value; });
  }
  function isAnswered(qEl) {
    var a = answerOf(qEl), kind = qEl.dataset.kind;
    if (kind === 'open' || kind === 'number') return String(a).trim() !== '';
    if (kind === 'matrix') return a.every(function (x) { return x !== null; });
    return a.length > 0;
  }
  function progress() {
    var n = questions.filter(isAnswered).length;
    document.getElementById('exProgress').textContent = n + ' / ' + total;
    return n;
  }
  function fmtNum(v) { return String(v).replace('.', ','); }

  function showResult(qEl, r) {
    var kind = qEl.dataset.kind, fb = qEl.querySelector('.q-fb');
    qEl.querySelectorAll('input, textarea').forEach(function (i) { i.disabled = true; });
    var btn = qEl.querySelector('.q-check');
    if (btn) btn.remove();
    if (kind === 'open') {
      qEl.classList.add('q-wait');
      fb.innerHTML = r.self
        ? '<b>Өзіңді тексер.</b> Бұл сұрақ ұпайға қосылмайды. Үлгі жауап пен критерий: ' + esc(r.rubric || '')
        : '<b>Жауабың мұғалімге жіберілді.</b> Мұғалім тексеріп, ' + r.max + ' балға дейін ұпай қояды.';
      fb.hidden = false;
      return;
    }
    qEl.classList.add(r.ok ? 'q-ok' : r.points > 0 ? 'q-part' : 'q-bad');
    if (!r.correct) {
      // Мұғалім тағайындаған тест: дұрыс жауап көрсетілмейді.
    } else if (kind === 'matrix') {
      qEl.querySelectorAll('tbody tr').forEach(function (tr, i) {
        tr.querySelectorAll('input').forEach(function (inp) {
          var td = inp.parentElement;
          if (+inp.value === r.correct[i]) td.classList.add('right');
          else if (inp.checked) td.classList.add('wrong');
        });
      });
    } else if (kind !== 'number') {
      qEl.querySelectorAll('label.qopt').forEach(function (lab) {
        var inp = lab.querySelector('input');
        if (r.correct.indexOf(+inp.value) >= 0) lab.classList.add('right');
        else if (inp.checked) lab.classList.add('wrong');
      });
    }
    var key = kind === 'number' && r.correct ? ' Дұрыс жауап: <b>' + esc(fmtNum(r.correct[0])) + (r.unit ? ' ' + esc(r.unit) : '') + '</b>.' : '';
    fb.innerHTML = '<b>' + (r.ok ? 'Дұрыс' : r.points > 0 ? 'Жартылай дұрыс' : 'Қате') + ' · ' + r.points + ' / ' + r.max + ' балл.</b>' + key + ' ' + esc(r.explanation || '');
    fb.hidden = false;
  }

  questions.forEach(function (qEl) {
    var onChange = function () {
      var b = qEl.querySelector('.q-check');
      if (b) b.disabled = !isAnswered(qEl);
      progress();
    };
    qEl.addEventListener('change', onChange);
    qEl.addEventListener('input', onChange);
    var cb = qEl.querySelector('.q-check');
    if (cb) cb.addEventListener('click', function () {
      cb.disabled = true;
      post('/api/exams/check', { id: +qEl.dataset.id, answer: answerOf(qEl) })
        .then(function (r) { if (r && !r.error) showResult(qEl, r); else cb.disabled = false; })
        .catch(function () { cb.disabled = false; });
    });
  });
  progress();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (finished) return;
    var missing = total - progress();
    if (missing > 0 && !confirm(missing + ' тапсырмаға жауап берілмеді. Аяқтай бересің бе?')) return;
    if (ASSIGN && !confirm('Тестті тапсырасың ба? Тапсырғаннан кейін жауапты өзгерту мүмкін емес.')) return;
    finish();
  });

  function finish() {
    finished = true;
    var all = {};
    questions.forEach(function (qEl) { all[qEl.dataset.id] = answerOf(qEl); });
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    post('/api/exams/submit', {
      exam: EXAM, mode: MODE, domain: form.dataset.domain, section: form.dataset.section, assignment: ASSIGN,
      answers: all, duration: Math.round((Date.now() - started) / 1000),
    }).then(function (r) {
      if (!r || r.error) {
        if (r && r.attemptId) { location.href = '/exams/attempts/' + r.attemptId; return; }
        btn.disabled = false; finished = false; alert((r && r.error) || 'Қате шықты'); return;
      }
      questions.forEach(function (qEl) {
        var res = r.results[qEl.dataset.id];
        if (res && !qEl.querySelector('.q-fb:not([hidden])')) showResult(qEl, res);
      });
      var pct = r.max ? Math.round(100 * r.score / r.max) : 0;
      var sum = document.getElementById('exSummary');
      sum.innerHTML = '<div class="g-end"><h2>Нәтиже: ' + r.score + ' / ' + r.max + ' балл (' + pct + '%)</h2>' +
        (r.pending ? '<p><span class="pill pending">' + r.pending + ' ашық жауап мұғалімнің тексеруін күтуде</span> — тексерілгеннен кейін балың толығады.</p>' : '') +
        '<p class="muted small">' + (r.saved ? 'Нәтиже кабинетіңе сақталды.' : 'Нәтижені сақтау үшін платформаға кір.') + '</p><p>' +
        (r.attemptId ? '<a class="btn" href="/exams/attempts/' + r.attemptId + '">Нәтижені толық қарау</a> ' : '') +
        (r.assigned ? '<a class="btn ghost" href="/cabinet">Кабинетке</a>' : '<a class="btn ghost" href="' + esc(location.pathname + location.search) + '">Жаңа тест</a> <a class="btn ghost" href="/exams/' + esc(EXAM) + '">Емтихан бетіне</a>') +
        '</p></div>';
      btn.remove();
      var t = document.getElementById('exTimer'); if (t) t.textContent = 'аяқталды';
      sum.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () { btn.disabled = false; finished = false; alert('Байланыс қатесі. Қайталап көр.'); });
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

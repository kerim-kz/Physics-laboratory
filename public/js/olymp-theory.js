/* Олимпиаданың теориялық туры: жазылған формуланы бірден математикалық түрде көрсету,
   шаманы батырмамен қосу, тексергеннен кейін өзін-өзі тексеру ұпайларын қосу. */
(function () {
  var form = document.getElementById('thForm');
  if (!form || !window.ExprCore) return;
  var E = window.ExprCore;
  function preview(input) {
    var box = input.closest('.th-ans').querySelector('.th-preview');
    var src = input.value.trim();
    if (!src || input.readOnly) { box.textContent = ''; box.className = 'th-preview'; return; }
    var vars = (input.getAttribute('data-vars') || '').split(',').filter(Boolean);
    try {
      var t = E.toTex(E.parse(src, vars));
      box.className = 'th-preview';
      if (window.katex) window.katex.render(t, box, { throwOnError: false }); else box.textContent = src;
    } catch (e) {
      if (!e.expr) throw e;
      box.className = 'th-preview th-perr';
      box.textContent = e.message;
    }
  }
  form.querySelectorAll('.th-ans input[type=text]').forEach(function (i) {
    i.addEventListener('input', function () { preview(i); });
    preview(i);
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-insert]');
    if (!b) return;
    var input = b.closest('.th-ans').querySelector('input[type=text]');
    var s = input.selectionStart == null ? input.value.length : input.selectionStart, en = input.selectionEnd == null ? s : input.selectionEnd;
    var v = b.getAttribute('data-insert');
    input.value = input.value.slice(0, s) + v + input.value.slice(en);
    input.focus();
    input.setSelectionRange(s + v.length, s + v.length);
    preview(input);
  });
  form.addEventListener('submit', function (e) {
    var empty = [].filter.call(form.querySelectorAll('.th-ans input[type=text]'), function (i) { return !i.value.trim(); }).length;
    if (empty && !confirm('Жауап жазылмаған өріс бар: ' + empty + '. Соған қарамастан тексеру керек пе?')) e.preventDefault();
  });
  // Тексергеннен кейін: өзін-өзі тексеру белгілері жалпы ұпайға қосылады (тек экранда).
  var score = document.querySelector('[data-th-score]'), total = document.querySelector('[data-th-total]');
  var selves = document.querySelectorAll('[data-self]');
  if (score && total && selves.length) {
    total.closest('.th-selftotal').hidden = false;
    var upd = function () {
      var add = 0;
      selves.forEach(function (c) { if (c.checked) add += +c.getAttribute('data-self'); });
      total.textContent = +score.getAttribute('data-th-score') + add;
    };
    selves.forEach(function (c) { c.addEventListener('change', upd); });
  }
})();

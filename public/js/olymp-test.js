/* Олимпиада онлайн тесті: жауап берілген тапсырмалар санын көрсету және бос тапсырмалар болса, ескерту. */
(function () {
  var form = document.getElementById('otForm');
  var done = document.getElementById('otDone');
  if (!form || !done) return;
  var total = +form.getAttribute('data-total');
  function count() {
    var names = {};
    form.querySelectorAll('input[type=radio]:checked').forEach(function (i) { names[i.name] = 1; });
    return Object.keys(names).length;
  }
  function update() {
    var n = count();
    done.textContent = n;
    form.querySelectorAll('fieldset.otq').forEach(function (f) { f.classList.toggle('otq-done', !!f.querySelector('input:checked')); });
    return n;
  }
  form.addEventListener('change', update);
  form.addEventListener('submit', function (e) {
    var n = update();
    if (n < total && !confirm('Жауап берілмеген тапсырма бар: ' + (total - n) + '. Соған қарамастан тексеру керек пе?')) e.preventDefault();
  });
  update();
})();

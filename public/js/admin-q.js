/* Әкімшінің тапсырма қосу формасы: таңдалған сұрақ түріне қатысты өрістерді ғана көрсетеді. */
(function () {
  'use strict';
  var form = document.getElementById('qForm');
  if (!form) return;
  var kind = document.getElementById('qKind'), unit = form.querySelector('select[name=unit_id]');
  function sync() {
    form.querySelectorAll('.qf').forEach(function (f) {
      var k = f.dataset.for;
      f.hidden = k === 'new' ? !!unit.value : k !== kind.value;
    });
  }
  kind.addEventListener('change', sync);
  unit.addEventListener('change', sync);
  sync();
})();

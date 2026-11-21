/* TALIS өзін-өзі бағалау сауалнамасы: әр шкаланың орташа балын (1–4) есептеп, профильді және кеңестерді көрсетеді. Деректер серверге жіберілмейді. */
(function () {
  var form = document.getElementById('talisForm'), out = document.getElementById('talisResult');
  if (!form || !out) return;
  var scales = JSON.parse(form.getAttribute('data-scales') || '[]');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var sum = {}, cnt = {};
    form.querySelectorAll('input[type=radio]:checked').forEach(function (r) { var k = r.getAttribute('data-scale'); sum[k] = (sum[k] || 0) + Number(r.value); cnt[k] = (cnt[k] || 0) + 1; });
    var rows = scales.map(function (s) {
      var avg = cnt[s.k] ? sum[s.k] / cnt[s.k] : 0, pct = Math.round((avg - 1) / 3 * 100);
      var level = avg >= 3.25 ? 'жоғары' : avg >= 2.5 ? 'орташа' : 'дамытуды қажет етеді';
      return '<div class="talis-row"><div class="talis-h"><b>' + esc(s.name) + '</b><span class="mono">' + avg.toFixed(2).replace('.', ',') + ' / 4 · ' + level + '</span></div>' +
        '<div class="talis-bar"><span style="width:' + Math.max(3, pct) + '%"></span></div>' +
        (avg < 3.25 ? '<p class="small">' + esc(s.tips) + '</p>' : '') + '</div>';
    });
    out.innerHTML = '<h2>Менің профилім</h2>' + rows.join('') + '<p class="muted small">Ең төмен шкаладан бастап, бір тоқсанға бір нақты өзгеріс жоспарлаңыз. Сауалнаманы тоқсан сайын қайта толтырып, өзгерісті салыстырыңыз.</p>';
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

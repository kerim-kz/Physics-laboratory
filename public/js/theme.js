// Тақырыпты бет көрсетілмей тұрып қолдану (жыпылықтамау үшін).
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* жеке режимде localStorage болмауы мүмкін */ }
})();
// Әлсіз құрылғыда «шыны» (blur) әсерін сөндіру — бет баяуламауы үшін.
(function () {
  try {
    var n = navigator, weak = (n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2);
    if (weak || localStorage.getItem('lite') === '1') document.documentElement.classList.add('lite');
  } catch (e) { /* */ }
})();

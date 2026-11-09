/* Дыбыс: жиілік (биіктік) және амплитуда (қаттылық). Web Audio арқылы нақты дыбыс шығады. */
(function () {
  var audio = null, osc = null, gain = null;
  function startAudio(P) {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      stopAudio();
      osc = audio.createOscillator(); gain = audio.createGain();
      osc.type = P.wave; osc.frequency.value = P.f; gain.gain.value = 0;
      osc.connect(gain); gain.connect(audio.destination); osc.start();
      gain.gain.setTargetAtTime(P.vol * 0.25, audio.currentTime, 0.03);
    } catch (e) { /* браузер дыбысты қолдамаса — тек сурет */ }
  }
  function stopAudio() {
    if (osc) { try { gain.gain.setTargetAtTime(0, audio.currentTime, 0.02); osc.stop(audio.currentTime + 0.1); } catch (e) {} osc = null; }
  }
  function updateAudio(P) {
    if (!osc) return;
    osc.type = P.wave; osc.frequency.setTargetAtTime(P.f, audio.currentTime, 0.02); gain.gain.setTargetAtTime(P.vol * 0.25, audio.currentTime, 0.02);
  }
  function wave(type, ph) {
    var s = Math.sin(ph);
    if (type === 'square') return s >= 0 ? 1 : -1;
    if (type === 'triangle') return 2 / Math.PI * Math.asin(s);
    if (type === 'sawtooth') { var x = (ph / (2 * Math.PI)) % 1; return 2 * (x < 0 ? x + 1 : x) - 1; }
    return s;
  }
  Sim.create({
    aspect: 0.6, autoplay: true, keepRunning: true,
    hint: 'Дыбысты қос та, жиілік пен амплитуданы өзгерт. Құлаққапты қолданған дұрыс.',
    controls: [
      { type: 'check', key: 'on', label: 'Дыбысты қосу', value: false, live: true },
      { type: 'range', key: 'f', label: 'Жиілік ν', min: 100, max: 2000, step: 10, value: 440, unit: 'Гц', digits: 0, live: true },
      { type: 'range', key: 'vol', label: 'Амплитуда (қаттылық)', min: 0.05, max: 1, step: 0.05, value: 0.5, digits: 2, live: true },
      { type: 'select', key: 'wave', label: 'Тербеліс пішіні (тембр)', value: 'sine', options: [['sine', 'Синусоида (таза үн)'], ['triangle', 'Үшбұрыш'], ['square', 'Тікбұрыш'], ['sawtooth', 'Ара тісті']], live: true },
    ],
    readouts: [
      { key: 'f', label: 'Жиілік ν', unit: 'Гц', digits: 0 },
      { key: 'T', label: 'Период T = 1/ν', unit: 'мс', digits: 2 },
      { key: 'lam', label: 'Ауадағы толқын ұзындығы λ = v/ν', unit: 'см', digits: 1 },
      { key: 'note', label: 'Жақын нота' },
    ],
    init: function (api) { api.S.ph = 0; },
    onLive: function (api, key) {
      var P = api.P;
      if (key === 'on') { if (P.on) startAudio(P); else stopAudio(); }
      else updateAudio(P);
    },
    step: function (api, dt) { api.S.ph += dt * 2 * Math.PI * 0.6; },
    read: function (api) {
      var P = api.P, notes = ['до', 'до♯', 'ре', 'ре♯', 'ми', 'фа', 'фа♯', 'соль', 'соль♯', 'ля', 'ля♯', 'си'];
      var m = Math.round(12 * Math.log2(P.f / 440)) + 57, name = notes[((m % 12) + 12) % 12] + ' (' + (Math.floor(m / 12)) + '-октава)';
      return { f: P.f, T: 1000 / P.f, lam: 340 / P.f * 100, note: name };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      // динамик
      var sx = 60, sy = H * 0.3, cone = 8 * P.vol * Math.sin(S.ph * 8);
      ctx.fillStyle = C.ink; ctx.fillRect(sx - 36, sy - 26, 22, 52);
      ctx.fillStyle = C.muted; ctx.beginPath(); ctx.moveTo(sx - 14, sy - 26); ctx.lineTo(sx + 14 + cone, sy - 56); ctx.lineTo(sx + 14 + cone, sy + 56); ctx.lineTo(sx - 14, sy + 26); ctx.closePath(); ctx.fill();
      // ауа бөлшектері: сығылу мен сиреу
      var lamPx = Math.max(18, Math.min(220, 340 / P.f * 400)), kk = 2 * Math.PI / lamPx;
      for (var col = 0; col < 70; col++) for (var row = 0; row < 9; row++) {
        var x0 = sx + 40 + col * ((W - sx - 60) / 70), y0 = sy - 56 + row * 14 + (col % 2) * 7;
        var dx = 7 * P.vol * Math.sin(kk * (x0 - sx) - S.ph * 6);
        D.circle(ctx, x0 + dx, y0, 2, C.accent, null, 0, true);
      }
      D.text(ctx, 'Сығылу мен сиреу аймақтары оң жаққа таралады (сурет баяулатылған)', sx + 40, sy + 78, { size: 11, color: C.muted });
      // тербеліс графигі p(t)
      var r = { x: 50, y: H * 0.58, w: W - 80, h: H * 0.32 }, periods = 3, pts = [];
      for (var i = 0; i <= 400; i++) { var t = i / 400 * periods / P.f * 1000; pts.push([t, P.vol * wave(P.wave, 2 * Math.PI * P.f * t / 1000)]); }
      D.plot(ctx, r, { xmin: 0, xmax: periods / P.f * 1000, ymin: -1.1, ymax: 1.1, xlabel: 't, мс', ylabel: 'қысым өзгерісі', series: [{ pts: pts, color: C.purple }] });
      if (!P.on) D.text(ctx, '«Дыбысты қосу» белгісін қойсаң, осы үнді естисің', W - 20, 22, { size: 12, align: 'right', color: C.brass, weight: '600' });
    },
  });
  window.addEventListener('pagehide', stopAudio);
})();

/* Радиобайланыс: дыбыс сигналы жоғары жиілікті тасымалдаушы тербелістерді модуляциялайды (АМ), антенна арқылы таратылады, қабылдағышта контур бапталады, диод детекторлайды, динамик дыбыс шығарады. */
(function () {
  var R = window.Real;
  var ST = [[600, 'Қазақ радиосы'], [900, 'Шалқар'], [1300, 'Жаңа станция']];
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.5, grid: false, keepRunning: true, autoplay: true,
    hint: 'Қабылдағыш контурының сыйымдылығын өзгертіп, радиостанцияға бапта: контурдың меншікті жиілігі станция жиілігіне тең болғанда (резонанс) дыбыс естіледі.',
    controls: [
      { type: 'range', key: 'tune', label: 'Қабылдағыштың бапталу жиілігі', min: 400, max: 1500, step: 10, value: 600, unit: 'кГц', digits: 0, live: true },
      { type: 'range', key: 'm', label: 'Модуляция тереңдігі', min: 0.1, max: 1, step: 0.1, value: 0.6, digits: 1 },
      { type: 'select', key: 'stage', label: 'Көрсету', value: 'all', options: [['all', 'Барлық кезең'], ['mod', 'Модуляция'], ['det', 'Детектрлеу']] },
    ],
    readouts: [
      { key: 'C', label: 'Контурдың сыйымдылығы (L = 200 мкГн)', unit: 'пФ', digits: 0 },
      { key: 'lam', label: 'Толқын ұзындығы λ = c/ν', unit: 'м', digits: 0 },
      { key: 'st', label: 'Қабылданған станция', text: true },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var f = api.P.tune * 1e3, C = 1 / (Math.pow(2 * Math.PI * f, 2) * 200e-6); var g = gain(api.P); return { C: C * 1e12, lam: 3e8 / f, st: g.best > 0.5 ? ST[g.idx][1] + ' (' + ST[g.idx][0] + ' кГц)' : 'шу' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, t = S.t, wide = W > 640, dark = R.isDark(), g = gain(P);
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      var rows = P.stage === 'all' ? ['sound', 'carrier', 'am', 'rect', 'out'] : P.stage === 'mod' ? ['sound', 'carrier', 'am'] : ['am', 'rect', 'out'];
      var names = { sound: '1. Дыбыс сигналы (микрофон)', carrier: '2. Тасымалдаушы ЖЖ тербелістер', am: '3. Амплитудалық модуляция (антенна)', rect: '4. Диод: детектрлеу', out: '5. Динамиктегі сигнал' };
      var gx = wide ? W * 0.3 : 14, gw = wide ? W * 0.66 : W - 28, top = wide ? 20 : H * 0.36, rh = ((wide ? H : H * 0.64) - 30) / rows.length;
      ctx.save(); R.rr(ctx, gx - 8, top - 8, gw + 16, rh * rows.length + 8, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var snd = function (x) { return Math.sin(2 * Math.PI * (x * 1.5 - t * 0.6)) * 0.6 + Math.sin(2 * Math.PI * (x * 3.1 - t * 0.9)) * 0.3; };
      var car = function (x) { return Math.sin(2 * Math.PI * x * 40); };
      rows.forEach(function (r, i) {
        var y0 = top + i * rh, mid = y0 + rh * 0.58, amp = rh * 0.3;
        R.txt(ctx, names[r], gx + 4, y0 + 10, { size: 10, weight: '700', align: 'left', color: dark ? '#e6ecf0' : '#33404a' });
        ctx.strokeStyle = 'rgba(120,130,140,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, mid); ctx.lineTo(gx + gw, mid); ctx.stroke();
        ctx.strokeStyle = r === 'sound' || r === 'out' ? '#0b8a7a' : r === 'carrier' ? '#7a3fb0' : '#d2382b'; ctx.lineWidth = r === 'carrier' || r === 'am' || r === 'rect' ? 1 : 2; ctx.beginPath();
        for (var px = 0; px <= gw; px += r === 'sound' || r === 'out' ? 3 : 0.7) {
          var x = px / gw, env = 1 + P.m * snd(x), v;
          if (r === 'sound') v = snd(x);
          else if (r === 'carrier') v = car(x) * 0.8;
          else if (r === 'am') v = env * car(x) * 0.5 * g.best;
          else if (r === 'rect') v = Math.max(0, env * car(x)) * 0.5 * g.best;
          else v = (env - 1) * g.best + (1 - g.best) * (Math.random() - 0.5) * 0.4;
          var yy = mid - v * amp; if (px === 0) ctx.moveTo(gx + px, yy); else ctx.lineTo(gx + px, yy);
        }
        ctx.stroke();
      });
      // бапталу шкаласы (қабылдағыш)
      var sx = wide ? 20 : 20, sw = wide ? W * 0.25 : W - 40, sy = wide ? H * 0.12 : 20;
      ctx.save(); R.rr(ctx, sx, sy, sw, 70, 10); ctx.fillStyle = '#2b2f33'; ctx.fill(); ctx.restore();
      ctx.fillStyle = '#e8d9a8'; ctx.fillRect(sx + 10, sy + 10, sw - 20, 34);
      for (var f = 400; f <= 1500; f += 100) { var xx = sx + 10 + (f - 400) / 1100 * (sw - 20); ctx.fillStyle = '#5b4a2a'; ctx.fillRect(xx, sy + 30, 1, 14); if (f % 200 === 0) R.txt(ctx, String(f), xx, sy + 20, { size: 8.5, color: '#5b4a2a' }); }
      ST.forEach(function (s) { var xs = sx + 10 + (s[0] - 400) / 1100 * (sw - 20); ctx.fillStyle = '#b4342a'; ctx.fillRect(xs - 1, sy + 40, 3, 4); });
      var nx = sx + 10 + (P.tune - 400) / 1100 * (sw - 20); ctx.fillStyle = '#d2382b'; ctx.fillRect(nx - 1, sy + 8, 3, 38);
      R.txt(ctx, 'кГц   ' + (g.best > 0.5 ? '♪ ' + ST[g.idx][1] : 'шу...'), sx + sw / 2, sy + 58, { size: 11, color: g.best > 0.5 ? '#7fe0a0' : '#c9cfd4', weight: '700' });
      if (wide) {
        // антенна және динамик суреті
        var ax = sx + sw / 2, ay = sy + 140;
        ctx.strokeStyle = '#8f99a3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay + 70); ctx.lineTo(ax, ay); ctx.stroke();
        for (var k = 1; k <= 3; k++) { ctx.strokeStyle = 'rgba(210,56,43,' + (0.6 - k * 0.15) + ')'; ctx.lineWidth = 2; var rr = ((t * 30 + k * 18) % 54) + 6; ctx.beginPath(); ctx.arc(ax, ay, rr, -2.4, -0.7); ctx.stroke(); }
        R.tag(ctx, 'антенна → контур → диод → динамик', ax, ay + 90, { size: 10 });
        var spx = ax, spy = ay + 160; ctx.fillStyle = '#2b2f33'; ctx.beginPath(); ctx.arc(spx, spy, 34, 0, 7); ctx.fill(); ctx.fillStyle = '#59616a'; ctx.beginPath(); ctx.arc(spx, spy, 22 + g.best * 3 * Math.sin(t * 30), 0, 7); ctx.fill();
        if (g.best > 0.5) for (var n = 0; n < 3; n++) { ctx.strokeStyle = 'rgba(11,138,122,.6)'; ctx.beginPath(); ctx.arc(spx, spy, 40 + ((t * 40 + n * 12) % 36), -0.6, 0.6); ctx.stroke(); }
      }
    },
  });
  function gain(P) { var best = 0, idx = 0; ST.forEach(function (s, i) { var gg = 1 / (1 + Math.pow((P.tune - s[0]) / 25, 2)); if (gg > best) { best = gg; idx = i; } }); return { best: best, idx: idx }; }
})();

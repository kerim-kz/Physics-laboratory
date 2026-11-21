/* Ньютонның екінші заңы: арбаша блок арқылы асылған жүкпен тартылады. Күш датчигі жіптің керілуін (арбашаға әсер ететін күшті) өлшейді, тикер-таймер таспаға әр 0,1 с сайын нүкте қояды. F = ma. */
(function () {
  var R = window.Real, g = 9.81;
  var TRACK = 1.0; // жолдың жұмыс бөлігі, м
  function dyn(P) { var M = P.M, m = P.mh / 1000, a = m * g / (M + m); return { a: a, T: M * a }; }
  Sim.create({
    aspect: 0.56, grid: false,
    hint: 'Асылған жүкті немесе арбашаның массасын өзгертіп, a мен F/M мәндерін салыстыр. Өлшеу кестесіне жазып, a(F) графигін тұрғыз.',
    controls: [
      { type: 'range', key: 'M', label: 'Арбаша + үстіндегі жүктер M', min: 0.4, max: 2, step: 0.2, value: 0.8, unit: 'кг' },
      { type: 'range', key: 'mh', label: 'Асылған жүктің массасы', min: 20, max: 200, step: 10, value: 80, unit: 'г', digits: 0 },
    ],
    readouts: [
      { key: 'F', label: 'Күш датчигі: арбашаға әсер ететін күш F', unit: 'Н', digits: 3 },
      { key: 'a', label: 'Таспа бойынша үдеу a = Δs / T²', unit: 'м/с²', digits: 3 },
      { key: 'Fm', label: 'F / M', unit: 'м/с²', digits: 3 },
      { key: 't', label: 'Уақыт', unit: 'с', digits: 2 },
      { key: 'v', label: 'Жылдамдық', unit: 'м/с', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; api.S.x = 0; },
    step: function (api, dt) {
      var S = api.S, d = dyn(api.P);
      S.t += dt * 0.8; S.x = d.a * S.t * S.t / 2;
      if (S.x >= TRACK) { S.x = TRACK; S.t = Math.sqrt(2 * TRACK / d.a); return false; }
    },
    read: function (api) {
      var d = dyn(api.P), S = api.S, n = Math.floor(S.t / 0.1 + 1e-9), a = null;
      if (n >= 3) { var s1 = d.a * Math.pow((n - 1) * 0.1, 2) / 2 - d.a * Math.pow((n - 2) * 0.1, 2) / 2, s2 = d.a * Math.pow(n * 0.1, 2) / 2 - d.a * Math.pow((n - 1) * 0.1, 2) / 2; a = (s2 - s1) / 0.01; }
      return { F: d.T, a: a, Fm: d.T / api.P.M, t: S.t, v: d.a * S.t };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, d = dyn(P), table = H * 0.6;
      R.scene(ctx, W, H, 'lab', { table: table });
      var x0 = W * 0.08, x1 = W * 0.84, ppm = (x1 - x0 - 120) / TRACK;
      // жол (алюминий профиль)
      R.block(ctx, x0 - 20, table - 14, x1 - x0 + 30, 14, 'aluminum', { depth: 6 });
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x0 - 20, table - 12, x1 - x0 + 30, 2);
      // блок үстелдің шетінде
      var px = x1 + 26, py = table - 30;
      ctx.fillStyle = '#6d747b'; ctx.fillRect(px - 4, table - 30, 8, 30);
      ctx.save(); ctx.fillStyle = '#b8c0c7'; ctx.beginPath(); ctx.arc(px, py, 14, 0, 7); ctx.fill(); ctx.strokeStyle = '#59616a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(px, py); ctx.rotate(S.x * ppm / 14); ctx.strokeStyle = '#59616a'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke(); ctx.restore(); ctx.restore();
      // тикер-таймер және таспа
      var tx = x0 - 10;
      R.block(ctx, tx - 50, table - 54, 46, 40, '#3a4148', { depth: 6, label: 'ТТ' });
      // арбаша
      var cw = 110, ch = 34, cx = x0 + 10 + S.x * ppm, cy = table - 14 - 12 - ch;
      // таспа (арбашаның артында)
      ctx.fillStyle = '#f6f1dc'; ctx.fillRect(tx - 4, table - 36, cx - tx + 4, 10);
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.strokeRect(tx - 4, table - 36, cx - tx + 4, 10);
      for (var n = 0; n * 0.1 <= S.t + 1e-9; n++) { var dx = d.a * Math.pow(n * 0.1, 2) / 2 * ppm; ctx.fillStyle = '#1b2329'; ctx.beginPath(); ctx.arc(cx - dx - 2, table - 31, 1.8, 0, 7); ctx.fill(); }
      R.block(ctx, cx, cy, cw, ch, 'plasticBlue', { depth: 8 });
      [cx + 20, cx + cw - 20].forEach(function (wx) { R.wheel(ctx, wx, table - 14 - 7, 8, S.x * ppm / 8); });
      // үстіндегі жүктер (әр 0,2 кг — бір диск)
      var nd = Math.round((P.M - 0.4) / 0.2);
      for (var i = 0; i < nd; i++) R.cylinder(ctx, cx + 30, cy - 9 - i * 9, 46, 8, 'brass', { shadow: false, ry: 4 });
      // күш датчигі
      R.block(ctx, cx + cw - 2, cy + 4, 26, 22, '#e7b92f', { depth: 4 });
      R.lcd(ctx, cx + cw - 30, cy - 34 - nd * 0, 56, 22, Sim.fmt(d.T, 2).replace('.', ',') + ' Н', { size: 11 });
      // жіп
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(cx + cw + 24, cy + 15); ctx.lineTo(px, py - 14); ctx.arc(px, py, 14, -Math.PI / 2, 0); ctx.lineTo(px + 14, table + 30 + S.x * ppm); ctx.stroke();
      // асылған жүк
      R.weight(ctx, px + 14, table + 30 + S.x * ppm, P.mh, { label: P.mh + ' г' });
      // формула
      R.tag(ctx, 'F = ' + Sim.fmt(d.T, 3) + ' Н,  M = ' + Sim.fmt(P.M, 1) + ' кг  →  F/M = ' + Sim.fmt(d.T / P.M, 3) + ' м/с²', W * 0.45, 24, { size: W < 600 ? 10 : 12, color: '#0b6b78' });
      R.tag(ctx, 'Таспадағы нүктелер — әр 0,1 с', Math.max(110, tx + 70), table + 22, { size: 10 });
      if (S.x >= TRACK - 1e-6) R.tag(ctx, 'a = ' + Sim.fmt(d.a, 3) + ' м/с²', cx + cw / 2, cy - 54, { size: 12, color: '#b4342a' });
    },
  });
})();

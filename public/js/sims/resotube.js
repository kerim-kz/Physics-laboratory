/* Акустикалық резонанс: камертон бір ұшы су бетімен жабылған шыны түтіктің үстінде дыбыстайды. Ауа бағанының ұзындығы L = λ/4, 3λ/4, … болғанда дыбыс күшейеді. Дыбыс жылдамдығы v = λν. */
(function () {
  var R = window.Real;
  var FORKS = { 256: '256 Гц (до)', 320: '320 Гц (ми)', 384: '384 Гц (соль)', 440: '440 Гц (ля)', 512: '512 Гц (до²)' };
  var TUBE = 1.0; // түтіктің ұзындығы, м
  function lam(P) { return (331 + 0.6 * P.T) / +P.f; }
  function loud(P) { // резонанс қисығы: L = (2k−1)λ/4 маңында максимум
    var l = lam(P), x = P.L / 100, best = 0;
    for (var k = 1; k <= 6; k++) { var Lk = (2 * k - 1) * l / 4 + 0.006; var d = (x - Lk) / 0.012; best = Math.max(best, 1 / (1 + d * d)); } // 0,6 см — ұшының түзетуі
    return best;
  }
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true, autoplay: true,
    hint: 'Су деңгейін (ауа бағанының ұзындығын) баяу өзгертіп, дыбыс өлшеуішінің көрсетуі ең үлкен болатын ұзындықтарды тап. Олардың айырымы λ/2-ге тең.',
    controls: [
      { type: 'select', key: 'f', label: 'Камертон', value: '440', options: Object.keys(FORKS).map(function (k) { return [k, FORKS[k]]; }), live: true },
      { type: 'range', key: 'L', label: 'Ауа бағанының ұзындығы L', min: 5, max: 95, step: 0.5, value: 12, unit: 'см', digits: 1, live: true },
      { type: 'range', key: 'T', label: 'Ауаның температурасы', min: 0, max: 30, step: 5, value: 20, unit: '°C', digits: 0, live: true },
      { type: 'check', key: 'wave', label: 'Тұрғын толқынның суретін көрсету', value: true, live: true },
    ],
    readouts: [
      { key: 'db', label: 'Дыбыс деңгейі (салыстырмалы)', unit: '%', digits: 0 },
      { key: 'lam', label: 'Толқын ұзындығы λ = v / ν', unit: 'см', digits: 1 },
      { key: 'L1', label: 'Бірінші резонанс L₁ = λ/4', unit: 'см', digits: 1 },
      { key: 'L2', label: 'Екінші резонанс L₂ = 3λ/4', unit: 'см', digits: 1 },
      { key: 'v', label: 'Дыбыс жылдамдығы v = 331 + 0,6t', unit: 'м/с', digits: 0 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var P = api.P, l = lam(P) * 100; return { db: loud(P) * 100, lam: l, L1: l / 4, L2: 3 * l / 4, v: 331 + 0.6 * P.T }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.94, A = loud(P), wide = W > 640;
      R.scene(ctx, W, H, 'lab', { table: table });
      var tx = wide ? W * 0.32 : W * 0.4, tw = 46, top = H * 0.16, len = table - 20 - top, ppm = len / TUBE;
      // су ыдысы (резервуар) және түтік
      var waterY = top + (P.L / 100) * ppm;
      R.block(ctx, tx - 70, table - 16, 140, 16, 'iron', { depth: 6 });
      // судың бағаны
      ctx.save(); ctx.beginPath(); ctx.rect(tx - tw / 2 + 3, waterY, tw - 6, top + len - waterY); ctx.clip();
      R.liquid(ctx, tx - tw / 2 + 3, waterY, tw - 6, top + len - waterY, 'water', S.t * 2); ctx.restore();
      // тұрғын толқын (ауа бөлшектерінің ығысу амплитудасы): жабық ұшында түйін, ашық ұшында шоғыр
      if (P.wave) {
        var l = lam(P), kk = 2 * Math.PI / l, amp = 4 + 14 * A, ph = Math.sin(S.t * 18);
        ctx.save(); ctx.strokeStyle = 'rgba(210,56,43,' + (0.25 + 0.6 * A) + ')'; ctx.lineWidth = 2;
        [1, -1].forEach(function (sg) {
          ctx.beginPath();
          for (var y = top; y <= waterY; y += 2) { var dfrom = (waterY - y) / ppm; var x = tx + sg * amp * Math.sin(kk * dfrom) * ph; if (y === top) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
          ctx.stroke();
        });
        ctx.restore();
      }
      // шыны түтік
      ctx.save(); ctx.fillStyle = 'rgba(200,230,245,.18)'; ctx.fillRect(tx - tw / 2, top, tw, len);
      ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tx - tw / 2, top); ctx.lineTo(tx - tw / 2, top + len); ctx.moveTo(tx + tw / 2, top); ctx.lineTo(tx + tw / 2, top + len); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(tx - tw / 2 + 5, top + 4, 3, len - 8); ctx.restore();
      // сызғыш
      R.ruler(ctx, tx + tw / 2 + 32, top, len, ppm / 100, { vertical: true, width: 24 });
      ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx - tw / 2 - 10, waterY); ctx.lineTo(tx + tw / 2 + 12, waterY); ctx.stroke();
      R.tag(ctx, 'L = ' + Sim.fmt(P.L, 1) + ' см', tx - tw / 2 - 52, (top + waterY) / 2, { size: 11, color: '#b4342a' });
      // камертон
      var fx = tx, fy = top - 18, vib = Math.sin(S.t * 60) * 1.6;
      ctx.save(); ctx.strokeStyle = '#9aa3ab'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx - 26 - vib, fy); ctx.lineTo(fx - 26 - vib, fy - 60); ctx.moveTo(fx + 26 + vib, fy); ctx.lineTo(fx + 26 + vib, fy - 60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx - 26, fy); ctx.quadraticCurveTo(fx, fy + 22, fx + 26, fy); ctx.stroke();
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(fx, fy + 11); ctx.lineTo(fx + 70, fy + 30); ctx.stroke(); ctx.restore();
      R.tag(ctx, P.f + ' Гц', fx + 66, fy - 50, { size: 11 });
      // дыбыс толқындары (күшейгенде көп)
      ctx.save(); ctx.strokeStyle = 'rgba(31,95,209,' + (0.15 + 0.6 * A) + ')'; ctx.lineWidth = 1.5;
      for (var i = 0; i < 4; i++) { var rr = ((S.t * 60 + i * 20) % 80) + 10; ctx.beginPath(); ctx.arc(fx, top, rr * (0.5 + A), Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.restore();
      // дыбыс деңгейін өлшеуіш
      var mx = wide ? W * 0.66 : W * 0.78, my = H * 0.42;
      R.meter(ctx, mx, my, wide ? 60 : 40, A * 100, 100, { letter: 'дБ', step: 20 });
      R.tag(ctx, A > 0.85 ? 'РЕЗОНАНС!' : 'Дыбыс өлшеуіш', mx, my - (wide ? 70 : 48), { size: 11.5, color: A > 0.85 ? '#b4342a' : '#1b2329' });
      if (wide) {
        var l2 = lam(P) * 100;
        R.tag(ctx, 'λ = v/ν = ' + Sim.fmt(l2, 1) + ' см', mx, my + 100, { size: 11.5, color: '#0b6b78' });
        R.tag(ctx, 'Резонанс: L = λ/4, 3λ/4, 5λ/4 …', mx, my + 128, { size: 11, color: '#0b6b78' });
      }
    },
  });
})();

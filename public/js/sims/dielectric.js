/* Электр өрісіндегі диэлектрик: жазық конденсатордың астарларының арасына диэлектрик пластинаны енгізу. Поляризация өрісті ε есе әлсіретеді, сыйымдылық ε есе артады. Ток көзіне қосулы (U = const) немесе ажыратылған (q = const). */
(function () {
  var R = window.Real, EPS0 = 8.85e-12;
  var MAT = { air: ['Ауа', 1], paper: ['Парафинделген қағаз', 2.2], glass: ['Шыны', 7], mica: ['Слюда', 6], water: ['Дистилденген су', 81] };
  var Sarea = 0.01, d = 0.002; // 100 см², 2 мм
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.0, grid: false, keepRunning: true, autoplay: true,
    hint: 'Диэлектрикті біртіндеп енгіз. Ток көзіне қосулы және ажыратылған конденсатордағы кернеу, заряд және энергия қалай өзгереді?',
    controls: [
      { type: 'select', key: 'mat', label: 'Диэлектрик', value: 'glass', options: Object.keys(MAT).map(function (k) { return [k, MAT[k][0] + ' (ε = ' + MAT[k][1] + ')']; }), live: true },
      { type: 'range', key: 'f', label: 'Енгізілген бөлігі', min: 0, max: 100, step: 5, value: 100, unit: '%', digits: 0, live: true },
      { type: 'select', key: 'mode', label: 'Конденсатор', value: 'q', options: [['q', 'Ток көзінен ажыратылған (q = const)'], ['U', 'Ток көзіне қосулы (U = const)']], live: true },
    ],
    readouts: [
      { key: 'C', label: 'Сыйымдылық C', unit: 'пФ', digits: 0 },
      { key: 'q', label: 'Заряд q', unit: 'нКл', digits: 2 },
      { key: 'U', label: 'Кернеу U', unit: 'В', digits: 1 },
      { key: 'E', label: 'Диэлектрик ішіндегі өріс E', unit: 'кВ/м', digits: 1 },
      { key: 'Wc', label: 'Энергия W = CU²/2', unit: 'мкДж', digits: 3 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var s = state(api.P); return { C: s.C * 1e12, q: s.q * 1e9, U: s.U, E: s.Ed / 1000, Wc: s.C * s.U * s.U / 2 * 1e6 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, s = state(P), eps = MAT[P.mat][1], wide = W > 640, table = H * 0.93;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = wide ? W * 0.4 : W * 0.5, pw = 14, gap = Math.min(220, W * 0.32), ph = H * 0.6, top = H * 0.1, xl = cx - gap / 2, xr = cx + gap / 2;
      // диэлектрик пластина (жоғарыдан енгізіледі)
      var fl = P.f / 100, dh = ph * fl;
      if (fl > 0 && eps > 1) {
        ctx.fillStyle = P.mat === 'water' ? 'rgba(90,160,225,.45)' : P.mat === 'glass' ? 'rgba(170,215,230,.55)' : P.mat === 'mica' ? 'rgba(200,170,110,.55)' : 'rgba(240,230,190,.75)';
        ctx.fillRect(xl + pw + 6, top + ph - dh, gap - 2 * pw - 12, dh + (1 - fl) * 0);
        ctx.strokeStyle = 'rgba(90,110,120,.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(xl + pw + 6, top + ph - dh, gap - 2 * pw - 12, dh);
        // поляризацияланған диполь молекулалар
        var cols = 4, rows = Math.max(1, Math.floor(dh / 34)), dx = (gap - 2 * pw - 12) / cols;
        for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
          var x = xl + pw + 6 + dx * (i + 0.5), y = top + ph - dh + (j + 0.5) * dh / rows, jit = 0.15 * Math.sin(S.t * 3 + i * 1.7 + j);
          ctx.save(); ctx.translate(x, y); ctx.rotate(jit);
          ctx.fillStyle = '#2f6fd1'; ctx.beginPath(); ctx.ellipse(-6, 0, 6, 4.5, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#d2382b'; ctx.beginPath(); ctx.ellipse(6, 0, 6, 4.5, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '700 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('−', -6, 0); ctx.fillText('+', 6, 0);
          ctx.restore();
        }
        // байланысқан беттік зарядтар
        for (var k = 0; k < Math.floor(dh / 18); k++) { var yy = top + ph - dh + 9 + k * 18; R.txt(ctx, '−', xl + pw + 12, yy, { size: 11, color: '#1f5fd1', weight: '700' }); R.txt(ctx, '+', xr - pw - 12, yy, { size: 11, color: '#b4342a', weight: '700' }); }
      }
      // өріс сызықтары: диэлектрик ішінде сирек
      var nLines = 9;
      for (var n = 0; n < nLines; n++) {
        var y2 = top + (n + 0.5) / nLines * ph, inD = y2 > top + ph - dh && eps > 1, dash = inD ? [3, 6] : [];
        var strong = s.E0 / 25000; // кернеулікке пропорционал қалыңдық
        ctx.strokeStyle = 'rgba(224,118,27,' + (inD ? 0.55 : 0.9) + ')'; ctx.lineWidth = Math.max(0.8, Math.min(4, (inD ? s.Ed : s.E0) / 20000)); ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(xl + pw, y2); ctx.lineTo(xr - pw, y2); ctx.stroke(); ctx.setLineDash([]);
        void strong;
      }
      // астарлар
      R.block(ctx, xl, top - 6, pw, ph + 12, 'copper', { depth: 3, shadow: false }); R.block(ctx, xr - pw, top - 6, pw, ph + 12, 'copper', { depth: 3, shadow: false });
      var nq = Math.round(Math.min(14, 3 + s.q * 1e9 / 2));
      for (var m = 0; m < nq; m++) { var yq = top + (m + 0.5) / nq * ph; R.txt(ctx, '+', xl - 8, yq, { size: 12, color: '#b4342a', weight: '700' }); R.txt(ctx, '−', xr + 8, yq, { size: 12, color: '#1f5fd1', weight: '700' }); }
      // сымдар мен ток көзі / вольтметр
      var wy = top + ph + 40;
      R.wire(ctx, [[xl + pw / 2, top + ph + 6], [xl + pw / 2, wy], [cx - 50, wy]], { color: '#c0392b' });
      R.wire(ctx, [[xr - pw / 2, top + ph + 6], [xr - pw / 2, wy], [cx + 50, wy]], { color: '#2b2f33' });
      if (P.mode === 'U') R.battery(ctx, cx - 50, wy - 14, 100, 28, { label: '100 В' });
      else { R.meter(ctx, cx, wy - 2, 26, s.U, 120, { letter: 'V', step: 20 }); }
      R.tag(ctx, 'E = E₀ / ε;   C = εε₀S / d', wide ? cx : W / 2, 16, { size: 12, color: '#0b6b78' });
      if (wide) {
        var px = W * 0.8;
        ctx.save(); R.rr(ctx, px - 105, 40, 210, 150, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
        R.txt(ctx, 'Ауамен салыстырғанда', px, 58, { size: 11, weight: '700' });
        var base = state({ mat: 'air', f: 0, mode: P.mode });
        [['C', s.C / base.C], ['U', s.U / base.U], ['q', s.q / base.q], ['W', (s.C * s.U * s.U) / (base.C * base.U * base.U)]].forEach(function (q, i) {
          R.txt(ctx, q[0] + ' : ' + (q[1] >= 1 ? '×' + q[1].toFixed(2) : '÷' + (1 / q[1]).toFixed(2)).replace('.', ','), px, 86 + i * 24, { size: 12, color: q[1] > 1.001 ? '#0b8a7a' : q[1] < 0.999 ? '#b4342a' : '#5b6670', weight: '600', mono: true });
        });
      }
    },
  });
  function state(P) {
    var eps = MAT[P.mat][1], f = P.f / 100, C0 = EPS0 * Sarea / d, C = C0 * (f * eps + (1 - f)), U0 = 100, q, U;
    if (P.mode === 'U') { U = U0; q = C * U; } else { q = C0 * U0; U = q / C; }
    var E0 = U / d; // ауадағы өріс (параллель бөліктерде U бірдей)
    return { C: C, q: q, U: U, E0: E0, Ed: E0 };
  }
})();

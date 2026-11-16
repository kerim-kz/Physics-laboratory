/* Отынның энергиясы: отын жанғанда бөлінетін жылу Q = qm және қыздырғыштың ПӘК-і. */
(function () {
  var R = window.Real;
  var FUEL = { alcohol: ['Спирт', 27e6], wood: ['Құрғақ отын (ағаш)', 10e6], coal: ['Тас көмір (Екібастұз)', 22e6], gas: ['Табиғи газ', 44e6], petrol: ['Бензин', 46e6] };
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Отынның түрін таңдап, «Бастау» бас. Шәйнектегі су қашан қайнайды?',
    controls: [
      { type: 'select', key: 'f', label: 'Отын', value: 'gas', options: Object.keys(FUEL).map(function (k) { return [k, FUEL[k][0]]; }) },
      { type: 'range', key: 'mw', label: 'Судың массасы', min: 0.5, max: 3, step: 0.5, value: 1.5, unit: 'кг' },
      { type: 'range', key: 'eta', label: 'Пештің ПӘК-і', min: 20, max: 80, step: 5, value: 40, unit: '%', digits: 0 },
    ],
    readouts: [
      { key: 'mf', label: 'Жанған отын', unit: 'г', digits: 1 },
      { key: 'Qf', label: 'Отынның берген жылуы Q = qm', unit: 'кДж', digits: 0 },
      { key: 'Qw', label: 'Суға берілген жылу cmΔt', unit: 'кДж', digits: 0 },
      { key: 't', label: 'Су температурасы', unit: '°C', digits: 1 },
      { key: 'need', label: 'Қайнатуға керек отын', unit: 'г', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.mf = 0; S.T = 20; S.t = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, rate = 0.03; // г/с (жылдамдатылған)
      S.t += dt; S.mf += rate * dt * 10;
      S.T = 20 + FUEL[P.f][1] * S.mf / 1000 * P.eta / 100 / (4200 * P.mw);
      if (S.T >= 100) { S.T = 100; return false; }
    },
    read: function (api) {
      var S = api.S, P = api.P, q = FUEL[P.f][1];
      return { mf: S.mf, Qf: q * S.mf / 1000 / 1000, Qw: 4200 * P.mw * (S.T - 20) / 1000, t: S.T, need: 4200 * P.mw * 80 / (q * P.eta / 100) * 1000 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.9;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.38;
      // газ плитасы / оттық
      R.block(ctx, cx - 120, table - 40, 240, 36, 'steel', { depth: 12 });
      var fl = 30 + P.eta * 0.1;
      for (var i = -2; i <= 2; i++) R.flame(ctx, cx + i * 16, table - 44, fl * (P.f === 'gas' ? 0.7 : 1), S.t + i);
      // шәйнек
      var ty = table - 44 - fl - 130;
      ctx.save();
      var g = ctx.createRadialGradient(cx - 30, ty + 40, 10, cx, ty + 70, 110);
      g.addColorStop(0, '#f6f7f8'); g.addColorStop(1, '#7d868e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 90, ty + 130); ctx.quadraticCurveTo(cx - 100, ty + 30, cx, ty + 20); ctx.quadraticCurveTo(cx + 100, ty + 30, cx + 90, ty + 130); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + 70, ty + 90); ctx.lineTo(cx + 150, ty + 30); ctx.lineTo(cx + 158, ty + 38); ctx.lineTo(cx + 84, ty + 110); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, ty + 20, 50, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.restore();
      if (S.T > 85) for (var k = 0; k < 4; k++) { ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 3; ctx.beginPath(); var sx = cx + 156, sy = ty + 26; ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx + 10, sy - 20 - k * 6, sx - 10, sy - 40, sx + 6, sy - 60 - Math.sin(S.t * 3 + k) * 6); ctx.stroke(); }
      R.thermometer(ctx, W * 0.72, H * 0.12, H * 0.6, S.T, 0, 100, { step: 10 });
      R.tag(ctx, FUEL[P.f][0] + ': q = ' + Sim.fmt(FUEL[P.f][1] / 1e6, 0) + '·10⁶ Дж/кг', W * 0.38, 22, { size: 11.5 });
      if (S.T >= 100) R.tag(ctx, 'Су қайнады!', cx, ty - 20, { size: 13, color: '#b4342a' });
    },
  });
})();

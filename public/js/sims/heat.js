/* Жылу балансы: c₁m₁(t − t₁) + c₂m₂(t − t₂) = 0. Температуралар экспоненциалды түрде теңеседі. */
(function () {
  var R = window.Real;
  var MAT = { water: ['Су', 4200, '#5aa0e0'], al: ['Алюминий', 920, '#b9c2cc'], fe: ['Темір', 460, '#7b8590'], cu: ['Мыс', 400, '#c8774a'], pb: ['Қорғасын', 140, '#6a7080'] };
  function teq(P) { var c2 = MAT[P.mat][1], a = 4200 * P.m1, b = c2 * P.m2; return (a * P.t1 + b * P.t2) / (a + b); }
  function color(t) { var k = Math.max(0, Math.min(1, t / 100)); return 'rgb(' + Math.round(60 + 190 * k) + ',' + Math.round(120 - 40 * k) + ',' + Math.round(220 - 170 * k) + ')'; }
  Sim.create({
    grid: false,
    aspect: 0.6, substeps: 4,
    hint: 'Калориметрдің жылу сыйымдылығы мен жылу шығыны ескерілмейді.',
    controls: [
      { type: 'range', key: 'm1', label: 'Калориметрдегі су m₁', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'кг', digits: 1 },
      { type: 'range', key: 't1', label: 'Судың температурасы t₁', min: 0, max: 100, step: 1, value: 20, unit: '°C', digits: 0 },
      { type: 'select', key: 'mat', label: 'Салынатын дене', value: 'water', options: Object.keys(MAT).map(function (k) { return [k, MAT[k][0] + ' (c = ' + MAT[k][1] + ')']; }) },
      { type: 'range', key: 'm2', label: 'Дененің массасы m₂', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'кг', digits: 1 },
      { type: 'range', key: 't2', label: 'Дененің температурасы t₂', min: 0, max: 100, step: 1, value: 80, unit: '°C', digits: 0 },
    ],
    readouts: [
      { key: 'a', label: 'Судың температурасы', unit: '°C', digits: 1 },
      { key: 'b', label: 'Дененің температурасы', unit: '°C', digits: 1 },
      { key: 'te', label: 'Соңғы температура (есеп)', unit: '°C', digits: 1 },
      { key: 'q1', label: 'Су алған (берген) жылу', unit: 'кДж', digits: 2 },
      { key: 'q2', label: 'Дене берген (алған) жылу', unit: 'кДж', digits: 2 },
    ],
    init: function (api) { var S = api.S, P = api.P; S.a = P.t1; S.b = P.t2; S.t = 0; S.ha = [[0, P.t1]]; S.hb = [[0, P.t2]]; },
    step: function (api, dt) {
      var S = api.S, P = api.P, c2 = MAT[P.mat][1], kA = 10; // жылу беру коэффициенті, Вт/К
      var q = kA * (S.b - S.a) * dt * 60; // 1 нақты секунд = 1 минут
      S.a += q / (4200 * P.m1); S.b -= q / (c2 * P.m2); S.t += dt;
      if (!S.hl || S.t - S.hl > 0.1) { S.hl = S.t; S.ha.push([S.t, S.a]); S.hb.push([S.t, S.b]); }
      if (S.t > 30 || Math.abs(S.a - S.b) < 0.02) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, c2 = MAT[P.mat][1];
      return { a: S.a, b: S.b, te: teq(P), q1: 4200 * P.m1 * (S.a - P.t1) / 1000, q2: c2 * P.m2 * (P.t2 - S.b) / 1000 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, M = MAT[P.mat];
      var cx = W * 0.2, top = 60, bw = 140, bh = H - 130;
      R.scene(ctx, W, H, 'lab', { table: top + bh + 14 });
      // калориметр: сыртқы алюминий стақан, ішкі шыны ыдыс
      R.cylinder(ctx, cx - bw / 2 - 16, top - 14, bw + 32, bh + 26, 'aluminum', {});
      ctx.fillStyle = 'rgba(235,242,246,.92)'; ctx.fillRect(cx - bw / 2 - 4, top - 4, bw + 8, bh + 8);
      var lvl = bh * (0.35 + 0.3 * P.m1 / 2);
      ctx.fillStyle = color(S.a); ctx.globalAlpha = 0.55; ctx.fillRect(cx - bw / 2, top + bh - lvl, bw, lvl); ctx.globalAlpha = 1;
      var s = 26 + P.m2 * 20;
      if (P.mat === 'water') { ctx.fillStyle = color(S.b); ctx.globalAlpha = 0.7; ctx.fillRect(cx - bw / 2, top + bh - lvl - s * 0.6, bw, s * 0.6); ctx.globalAlpha = 1; D.text(ctx, 'ыстық су', cx, top + bh - lvl - s * 0.25, { size: 11, align: 'center', color: '#fff', weight: '600' }); }
      else { ctx.fillStyle = M[2]; ctx.fillRect(cx - s / 2, top + bh - s - 6, s, s); ctx.strokeStyle = color(S.b); ctx.lineWidth = 3; ctx.strokeRect(cx - s / 2, top + bh - s - 6, s, s); }
      // термометр
      R.thermometer(ctx, cx + bw / 2 + 50, top - 6, bh + 10, S.a, 0, 100, { step: 20 });
      R.tag(ctx, 'Калориметр', cx, H - 16, { size: 11 });
      // график
      var te = teq(P);
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.9)'; R.rr(ctx, W * 0.5 - 44, 16, W * 0.46 + 54, H - 50, 10); ctx.fill(); ctx.restore();
      D.plot(ctx, { x: W * 0.5, y: 40, w: W * 0.46, h: H - 100 }, {
        xmin: 0, xmax: Math.max(10, S.t), ymin: 0, ymax: 100, xlabel: 't, мин', ylabel: 't, °C',
        series: [{ pts: S.ha, color: C.blue }, { pts: S.hb, color: C.red }, { pts: [[0, te], [Math.max(10, S.t), te]], color: C.good, dash: [5, 4], width: 1.2 }],
      });
      D.text(ctx, 'жылу балансы: ' + api.fmt(te, 1) + ' °C', W * 0.5 + 8, 58, { size: 11, color: C.good, weight: '600' });
    },
  });
})();

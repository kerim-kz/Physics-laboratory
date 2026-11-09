/* Мұзды қыздыру: −20 °C мұз → балқу (0 °C) → су → қайнау (100 °C) → бу. Қыздырғыш қуаты тұрақты. */
(function () {
  var CI = 2100, LAM = 3.4e5, CW = 4200, LV = 2.3e6, CS = 2000, T0 = -20, TEND = 120;
  function stages(m) {
    return [
      { q: CI * m * (0 - T0), name: 'мұзды қыздыру' },
      { q: LAM * m, name: 'балқу (0 °C)' },
      { q: CW * m * 100, name: 'суды қыздыру' },
      { q: LV * m, name: 'қайнау (100 °C)' },
      { q: CS * m * (TEND - 100), name: 'буды қыздыру' },
    ];
  }
  function state(Q, m) {
    var st = stages(m), acc = 0;
    for (var i = 0; i < st.length; i++) {
      if (Q <= acc + st[i].q) {
        var f = (Q - acc) / st[i].q;
        var T = i === 0 ? T0 + f * (0 - T0) : i === 1 ? 0 : i === 2 ? 100 * f : i === 3 ? 100 : 100 + f * (TEND - 100);
        return { T: T, i: i, f: f, name: st[i].name };
      }
      acc += st[i].q;
    }
    return { T: TEND, i: 4, f: 1, name: 'буды қыздыру', end: true };
  }
  Sim.create({
    tools: ['stopwatch'],
    aspect: 0.6, substeps: 2,
    hint: 'Уақыт 100 есе жылдамдатылған. Жылу шығыны ескерілмейді.',
    controls: [
      { type: 'range', key: 'm', label: 'Мұздың массасы m', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'кг', digits: 1 },
      { type: 'range', key: 'P', label: 'Қыздырғыш қуаты P', min: 500, max: 3000, step: 100, value: 2000, unit: 'Вт', digits: 0 },
    ],
    readouts: [
      { key: 'tm', label: 'Уақыт', unit: 'мин', digits: 1 },
      { key: 'T', label: 'Температура', unit: '°C', digits: 1 },
      { key: 'st', label: 'Процесс' },
      { key: 'Q', label: 'Берілген жылу Q = Pt', unit: 'кДж', digits: 0 },
      { key: 'tl', label: 'Балқу уақыты (есеп λm/P)', unit: 'мин', digits: 1 },
      { key: 'tb', label: 'Қайнау уақыты (есеп Lm/P)', unit: 'мин', digits: 1 },
    ],
    init: function (api) { api.S.Q = 0; api.S.t = 0; api.S.h = [[0, T0]]; api.S.hl = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P;
      S.t += dt * 100; S.Q = P.P * S.t;
      var s = state(S.Q, P.m);
      if (S.t - S.hl > 5) { S.hl = S.t; S.h.push([S.t / 60, s.T]); }
      if (s.end) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, s = state(S.Q, P.m);
      return { tm: S.t / 60, T: s.T, st: s.name, Q: S.Q / 1000, tl: LAM * P.m / P.P / 60, tb: LV * P.m / P.P / 60 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, s = state(S.Q, P.m);
      var total = stages(P.m).reduce(function (a, x) { return a + x.q; }, 0) / P.P / 60;
      // ыдыс
      var cx = W * 0.15, top = 70, bw = 110, bh = H - 160;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - bw / 2, top); ctx.lineTo(cx - bw / 2, top + bh); ctx.lineTo(cx + bw / 2, top + bh); ctx.lineTo(cx + bw / 2, top); ctx.stroke();
      var water = s.i === 0 ? 0 : s.i === 1 ? s.f : s.i === 4 ? 0 : s.i === 3 ? 1 - s.f : 1;
      var ice = s.i === 0 ? 1 : s.i === 1 ? 1 - s.f : 0;
      var lvl = bh * 0.55;
      if (water > 0) { ctx.fillStyle = 'rgba(80,150,220,.4)'; ctx.fillRect(cx - bw / 2 + 2, top + bh - lvl * water, bw - 4, lvl * water); }
      for (var i = 0; i < Math.round(ice * 6); i++) {
        ctx.fillStyle = '#e3f3fb'; ctx.strokeStyle = '#8fc6dc'; ctx.lineWidth = 1;
        var x = cx - bw / 2 + 10 + (i % 3) * 32, y = top + bh - 30 - Math.floor(i / 3) * 30 - (water > 0 ? lvl * water * 0.5 : 0);
        ctx.fillRect(x, y, 26, 26); ctx.strokeRect(x, y, 26, 26);
      }
      if (s.i === 3) for (var b = 0; b < 10; b++) D.circle(ctx, cx - bw / 2 + 10 + Math.random() * (bw - 20), top + bh - Math.random() * lvl * water, 3, null, C.muted, 1);
      if (s.i >= 3) { ctx.fillStyle = 'rgba(180,180,190,.25)'; ctx.fillRect(cx - bw / 2 + 2, top, bw - 4, bh - lvl * water); }
      // қыздырғыш
      ctx.fillStyle = C.red; ctx.fillRect(cx - bw / 2, top + bh + 6, bw, 10);
      D.text(ctx, P.P + ' Вт', cx, top + bh + 34, { size: 11, align: 'center', color: C.muted, mono: true });
      D.text(ctx, api.fmt(s.T, 1) + ' °C', cx, top - 16, { size: 16, align: 'center', mono: true, weight: '600', color: C.red });
      // T(t) графигі
      var r = { x: W * 0.36, y: 40, w: W * 0.6, h: H - 100 };
      D.plot(ctx, r, { xmin: 0, xmax: Math.max(1, total), ymin: -30, ymax: 130, xlabel: 't, мин', ylabel: 'T, °C', series: [{ pts: S.h.concat([[S.t / 60, s.T]]), color: C.accent, width: 2.5 }] });
      var X = function (v) { return r.x + v / Math.max(1, total) * r.w; };
      var acc = 0;
      stages(P.m).forEach(function (st, i) {
        var t1 = acc / P.P / 60; acc += st.q; var t2 = acc / P.P / 60;
        if (i === 1 || i === 3) D.text(ctx, i === 1 ? 'балқу' : 'қайнау', (X(t1) + X(t2)) / 2, r.y + r.h - (i === 1 ? 40 : r.h * 0.73), { size: 11, align: 'center', color: C.brass, weight: '600' });
      });
    },
  });
})();

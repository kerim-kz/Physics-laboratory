/* Еркін өшетін тербелістер: штативке ілінген серіппелі маятник ауада, суда немесе майда тербеледі. x(t) графигі және амплитуданың кемуі. */
(function () {
  var R = window.Real;
  var MED = { air: ['Ауа', 0.02, null], water: ['Су', 0.25, 'water'], oil: ['Күнбағыс майы', 0.9, 'oil'], honey: ['Бал', 9, 'honey'] };
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Жүкті әртүрлі ортаға батырып, тербелістің қалай өшетінін салыстыр. Ортаның кедергісі тербеліс периодына әсер ете ме?',
    controls: [
      { type: 'select', key: 'med', label: 'Орта', value: 'water', options: Object.keys(MED).map(function (k) { return [k, MED[k][0]]; }) },
      { type: 'range', key: 'm', label: 'Жүктің массасы m', min: 0.1, max: 0.5, step: 0.05, value: 0.2, unit: 'кг', digits: 2 },
      { type: 'range', key: 'k', label: 'Серіппенің қатаңдығы k', min: 10, max: 60, step: 5, value: 20, unit: 'Н/м', digits: 0 },
      { type: 'range', key: 'A', label: 'Бастапқы ауытқу', min: 2, max: 8, step: 1, value: 6, unit: 'см', digits: 0 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 2 },
      { key: 'x', label: 'Ығысу x', unit: 'см', digits: 2 },
      { key: 'T', label: 'Период T = 2π√(m/k) (кедергісіз)', unit: 'с', digits: 3 },
      { key: 'n', label: 'Толық тербелістер саны', digits: 0 },
      { key: 'amp', label: 'Соңғы амплитуда', unit: 'см', digits: 2 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.x = api.P.A / 100; S.v = 0; S.pts = [[0, api.P.A]]; S.n = 0; S.amp = api.P.A; S.prevV = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, b = MED[P.med][1], n = 20;
      for (var i = 0; i < n; i++) {
        var h = dt / n, a = (-P.k * S.x - b * S.v) / P.m;
        S.v += a * h; S.x += S.v * h; S.t += h;
        if (S.prevV > 0 && S.v <= 0) { S.n++; S.amp = S.x * 100; } // жоғарғы шеткі нүкте
        S.prevV = S.v;
      }
      S.pts.push([S.t, S.x * 100]);
      if (S.t > 10) return false;
    },
    read: function (api) { var S = api.S, P = api.P; return { t: S.t, x: S.x * 100, T: 2 * Math.PI * Math.sqrt(P.m / P.k), n: S.n, amp: S.amp }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.92, wide = W > 640;
      R.scene(ctx, W, H, 'lab', { table: table });
      var sx = wide ? W * 0.2 : W * 0.3, topY = 26, ppc = Math.min(6, H / 70); // px/см
      // штатив
      R.block(ctx, sx - 70, table - 12, 120, 12, 'iron', { depth: 6 });
      R.cylinder(ctx, sx - 64, topY, 8, table - 12 - topY, 'steel', { shadow: false });
      R.block(ctx, sx - 64, topY - 2, 70, 10, 'iron', { depth: 4, shadow: false });
      var md = MED[P.med], vw = 110, vh = H * 0.42, vx = sx - vw / 2, vy = table - vh;
      var eq = vy + vh * 0.36, y = eq - S.x * 100 * ppc;
      R.spring(ctx, sx, topY + 8, sx, y - 14, { coils: 14, r: 10 });
      R.weight(ctx, sx, y - 14, P.m * 1000, { label: Math.round(P.m * 1000) + ' г' });
      // ыдыс (сұйық жүктің үстінен салынады — жүк сұйықта көрінеді)
      if (md[2]) R.vessel(ctx, vx, vy, vw, vh, vh * 0.78, { liquid: md[2], wave: S.t * 3 });
      else { R.vessel(ctx, vx, vy, vw, vh, 0, {}); }
      // тепе-теңдік сызығы
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(210,56,43,.6)'; ctx.beginPath(); ctx.moveTo(sx - 80, eq); ctx.lineTo(sx + 80, eq); ctx.stroke(); ctx.restore();
      R.tag(ctx, MED[P.med][0], sx, vy - 14, { size: 11 });
      // x(t) графигі
      var gx = wide ? W * 0.42 : 30, gy = wide ? 30 : H * 0.06, gw = wide ? W * 0.54 : W - 50, gh = wide ? H * 0.6 : H * 0.22;
      if (!wide) { gx = W * 0.5; gw = W * 0.46; gy = 30; gh = H * 0.3; }
      ctx.save(); R.rr(ctx, gx - 40, gy - 18, gw + 52, gh + 50, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
      var b = md[1], env = [], env2 = [];
      for (var t = 0; t <= 10; t += 0.1) { var e = P.A * Math.exp(-b * t / (2 * P.m)); env.push([t, e]); env2.push([t, -e]); }
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 10, ymin: -P.A * 1.1, ymax: P.A * 1.1, xlabel: 't, с', ylabel: 'x, см', series: [{ pts: env, color: 'rgba(210,56,43,.45)' }, { pts: env2, color: 'rgba(210,56,43,.45)' }, { pts: S.pts, color: '#1f5fd1' }], marker: [S.t, S.x * 100] });
    },
  });
})();

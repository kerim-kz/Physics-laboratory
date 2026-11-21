/* Тежелу жолы: автокөлік тұрақты үдеумен тежеледі. s = v₀² / (2a), t = v₀ / a. Жүргізушінің реакция уақыты және жол беті. */
(function () {
  var R = window.Real;
  var ROAD = { dry: ['Құрғақ асфальт', 7.0], wet: ['Ылғал асфальт', 4.5], snow: ['Тапталған қар', 2.0], ice: ['Мұз', 1.0] };
  var TR = 1.0; // реакция уақыты, с
  function calc(P) {
    var v0 = P.v / 3.6, a = ROAD[P.road][1], tr = P.react ? TR : 0;
    return { v0: v0, a: a, tr: tr, tb: v0 / a, sr: v0 * tr, sb: v0 * v0 / (2 * a) };
  }
  Sim.create({
    aspect: 0.56, grid: false,
    hint: 'Бастапқы жылдамдықты 2 есе арттырып көр: тежелу жолы неше есе өседі? Мұзда ше?',
    controls: [
      { type: 'range', key: 'v', label: 'Бастапқы жылдамдық v₀', min: 20, max: 120, step: 10, value: 60, unit: 'км/сағ', digits: 0 },
      { type: 'select', key: 'road', label: 'Жол беті (тежелу үдеуі)', value: 'dry', options: Object.keys(ROAD).map(function (k) { return [k, ROAD[k][0] + ' (a ≈ ' + String(ROAD[k][1]).replace('.', ',') + ' м/с²)']; }) },
      { type: 'check', key: 'react', label: 'Жүргізушінің реакция уақыты (1 с)', value: true },
    ],
    readouts: [
      { key: 'v0', label: 'v₀ (м/с)', unit: 'м/с', digits: 1 },
      { key: 'v', label: 'Қазіргі жылдамдық', unit: 'км/сағ', digits: 0 },
      { key: 'sr', label: 'Реакция кезіндегі жол v₀·tᵣ', unit: 'м', digits: 1 },
      { key: 'sb', label: 'Тежелу жолы v₀²/(2a)', unit: 'м', digits: 1 },
      { key: 'st', label: 'Толық тоқтау жолы', unit: 'м', digits: 1 },
      { key: 'tb', label: 'Тежелу уақыты v₀/a', unit: 'с', digits: 2 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.x = 0; S.v = calc(api.P).v0; S.vt = [[0, S.v]]; },
    step: function (api, dt) {
      var S = api.S, c = calc(api.P), total = c.tr + c.tb, sp = Math.max(1, total / 7), n = 6;
      for (var i = 0; i < n; i++) {
        var h = dt * sp / n;
        if (S.t >= c.tr) S.v = Math.max(0, S.v - c.a * h);
        S.x += S.v * h; S.t += h;
      }
      S.vt.push([S.t, S.v * 3.6]);
      if (S.v <= 0) return false;
    },
    read: function (api) { var c = calc(api.P), S = api.S; return { v0: c.v0, v: S.v * 3.6, sr: c.sr, sb: c.sb, st: c.sr + c.sb, tb: c.tb }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, c = calc(P), D = api.D;
      var ground = H * 0.5, ppm = 18; // 1 м = 18 px
      var carX = Math.max(64, W * 0.3), cam = S.x * ppm - carX; // камера көлікпен бірге
      R.scene(ctx, W, H, 'outdoor', { ground: ground, road: true, roadShift: -cam, clouds: true, sun: false });
      var winter = P.road === 'snow' || P.road === 'ice';
      if (winter) { ctx.fillStyle = P.road === 'ice' ? 'rgba(200,230,250,.45)' : 'rgba(255,255,255,.55)'; ctx.fillRect(0, ground + 6, W, Math.min(46, H - ground - 16)); }
      if (P.road === 'wet') { ctx.fillStyle = 'rgba(60,90,130,.25)'; ctx.fillRect(0, ground + 6, W, Math.min(46, H - ground - 16)); }
      var roadY = ground + 6 + Math.min(46, H - ground - 16) * 0.72;
      // қашықтық бағаналары
      var step = 10;
      for (var m = Math.floor(cam / ppm / step) * step - step; m * ppm - cam < W + 40; m += step) {
        var px = m * ppm - cam;
        if (m < -10) continue;
        ctx.fillStyle = '#f2efe6'; ctx.fillRect(px - 2, ground - 22, 4, 22); ctx.fillStyle = '#c0392b'; ctx.fillRect(px - 2, ground - 22, 4, 5);
        R.txt(ctx, m + ' м', px, ground - 30, { size: 10, color: R.isDark() ? '#e6ecf0' : '#1d2a33', weight: '600' });
      }
      // тежеу басталған нүкте және тежелу іздері
      var xb = c.sr * ppm - cam;
      if (S.t >= c.tr) {
        ctx.save(); ctx.strokeStyle = winter ? 'rgba(90,100,110,.55)' : 'rgba(20,20,20,.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        [-8, 8].forEach(function (o) { ctx.beginPath(); ctx.moveTo(xb, roadY + o); ctx.lineTo(S.x * ppm - cam - 26, roadY + o); ctx.stroke(); });
        ctx.restore();
      }
      ctx.save(); ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(xb, ground + 2); ctx.lineTo(xb, H * 0.62 + 30); ctx.stroke(); ctx.restore();
      if (P.react) {
        var x0 = 0 - cam;
        ctx.save(); ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x0, ground + 2); ctx.lineTo(x0, H * 0.62 + 30); ctx.stroke(); ctx.restore();
        R.tag(ctx, 'Қауіп байқалды', x0, ground - 54, { size: 10.5, color: '#b4342a' });
      }
      R.tag(ctx, 'Тежеу басталды', xb, ground - 54 + (P.react ? 22 : 0), { size: 10.5, color: '#8a6100' });
      // көлік
      R.car(ctx, S.x * ppm - cam, roadY + 14, 92, '#2f7fd1', S.x * ppm);
      if (S.t >= c.tr && S.v > 0) { ctx.fillStyle = 'rgba(255,40,30,.85)'; ctx.beginPath(); ctx.arc(S.x * ppm - cam - 44, roadY - 10, 4, 0, 7); ctx.fill(); }
      if (S.v <= 0) R.tag(ctx, 'Тоқтады: ' + Sim.fmt(S.x, 1) + ' м', S.x * ppm - cam, roadY - 52, { size: 12, color: '#0b6b78' });
      // v(t) графигі
      var gx = 12, gy = H * 0.62 + 44, gw = Math.min(W - 24, 520), gh = H - gy - 12;
      ctx.save(); R.rr(ctx, gx - 6, gy - 10, gw + 12, gh + 18, 8); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.88)' : 'rgba(255,255,255,.9)'; ctx.fill(); ctx.restore();
      D.plot(ctx, { x: gx + 40, y: gy + 14, w: gw - 50, h: gh - 40 }, { xmin: 0, xmax: Math.max(4, Math.ceil(c.tr + c.tb)), ymin: 0, ymax: 120, xlabel: 't, с', ylabel: 'v, км/сағ', series: [{ pts: S.vt, color: api.C.accent }], marker: [S.t, S.v * 3.6] });
      var bw = Math.min(W - gw - 40, 260);
      if (bw > 150) {
        var bx = gx + gw + 18, by = gy;
        R.tag(ctx, 'Тоқтау жолы = реакция жолы + тежелу жолы', bx + bw / 2, by + 4, { size: 10 });
        var tot = c.sr + c.sb, f = (bw - 10) / Math.max(tot, 1);
        ctx.fillStyle = '#d2382b'; ctx.fillRect(bx, by + 26, c.sr * f, 16); ctx.fillStyle = '#e0a21b'; ctx.fillRect(bx + c.sr * f, by + 26, c.sb * f, 16);
        R.txt(ctx, Sim.fmt(c.sr, 1) + ' м', bx + c.sr * f / 2, by + 56, { size: 10, color: '#d2382b' });
        R.txt(ctx, Sim.fmt(c.sb, 1) + ' м', bx + c.sr * f + c.sb * f / 2, by + 70, { size: 10, color: '#b07a00' });
      }
    },
  });
})();

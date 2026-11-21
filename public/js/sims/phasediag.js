/* Фазалық диаграмма (p–T): қатты, сұйық, газ күйлері, үштік нүкте және кризистік нүкте. Қысым осі логарифмдік. Су мен көмірқышқыл газын салыстыру. */
(function () {
  var R = window.Real;
  // Tt, pt — үштік нүкте; Tc, pc — кризистік нүкте (К, Па); km — балқу сызығының көлбеулігі dT/dp (К/Па); ks — сублимация/булану жылуларының қатынасы
  var SUB = {
    h2o: { n: 'Су', Tt: 273.16, pt: 611.7, Tc: 647.1, pc: 22.06e6, km: -7.4e-8, ks: 1.13, Tmin: 173, Tmax: 723 },
    co2: { n: 'Көмірқышқыл газы', Tt: 216.6, pt: 518e3, Tc: 304.1, pc: 7.38e6, km: 2.0e-7, ks: 1.6, Tmin: 153, Tmax: 373 },
  };
  function curves(s) {
    var b = Math.log(s.pc / s.pt) / (1 / s.Tt - 1 / s.Tc);
    return {
      pv: function (T) { return s.pt * Math.exp(b * (1 / s.Tt - 1 / T)); },
      ps: function (T) { return s.pt * Math.exp(b * s.ks * (1 / s.Tt - 1 / T)); },
      Tm: function (p) { return s.Tt + s.km * (p - s.pt); },
    };
  }
  function phase(s, c, T, p) {
    var pg = T < s.Tt ? c.ps(T) : T < s.Tc ? c.pv(T) : s.pc;
    if (T >= s.Tc && p >= s.pc) return 'sc';
    if (p < pg || (T >= s.Tc && p < s.pc)) return 'gas';
    if (T < c.Tm(p)) return 'solid';
    return 'liq';
  }
  var NAMES = { solid: 'қатты (кристалл)', liq: 'сұйық', gas: 'газ (бу)', sc: 'асқынкризистік флюид' };
  var COL = { solid: '#5fc2a8', liq: '#3f8fd8', gas: '#f1c27d', sc: '#b58ad8' };
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, keepRunning: true, autoplay: true,
    hint: 'Температура мен қысымды өзгертіп, заттың күйін анықта. Үштік нүктеде үш фаза қатар өмір сүреді; кризистік нүктеден жоғары сұйық пен бу ажыратылмайды.',
    controls: [
      { type: 'select', key: 'sub', label: 'Зат', value: 'h2o', options: Object.keys(SUB).map(function (k) { return [k, SUB[k].n]; }), live: true },
      { type: 'range', key: 't', label: 'Температура t', min: -120, max: 450, step: 1, value: 20, unit: '°C', digits: 0, live: true },
      { type: 'range', key: 'lp', label: 'Қысым lg(p / Па)', min: 1, max: 8.5, step: 0.05, value: 5, digits: 2, live: true },
    ],
    readouts: [
      { key: 'ph', label: 'Заттың күйі', text: true },
      { key: 'p', label: 'Қысым p', unit: 'кПа', digits: 2 },
      { key: 'tt', label: 'Үштік нүкте', text: true },
      { key: 'tc', label: 'Кризистік нүкте', text: true },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) {
      var P = api.P, s = SUB[P.sub], c = curves(s), T = P.t + 273.15, p = Math.pow(10, P.lp);
      return { ph: NAMES[phase(s, c, T, p)], p: p / 1000, tt: (s.Tt - 273.15).toFixed(2).replace('.', ',') + ' °C; ' + (s.pt / 1000).toFixed(2).replace('.', ',') + ' кПа', tc: (s.Tc - 273.15).toFixed(0) + ' °C; ' + (s.pc / 1e6).toFixed(1).replace('.', ',') + ' МПа' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, s = SUB[P.sub], c = curves(s), T = P.t + 273.15, p = Math.pow(10, P.lp), ph = phase(s, c, T, p), wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      var gx = wide ? 64 : 52, gy = 26, gw = wide ? W * 0.58 : W - 70, gh = wide ? H - 80 : H * 0.55;
      ctx.save(); R.rr(ctx, gx - 50, gy - 18, gw + 62, gh + 52, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.94)' : 'rgba(255,255,255,.96)'; ctx.fill(); ctx.restore();
      var tmin = s.Tmin - 273.15, tmax = s.Tmax - 273.15, X = function (t) { return gx + (t - tmin) / (tmax - tmin) * gw; }, Y = function (lp) { return gy + gh - (lp - 1) / 7.5 * gh; };
      var cell = 6;
      var sv = [], ss = [], sm = [];
      for (var t = s.Tt; t <= s.Tc; t += 2) sv.push([t - 273.15, Math.log10(c.pv(t))]);
      sv.push([s.Tc - 273.15, Math.log10(s.pc)]);
      for (var t2 = s.Tmin; t2 <= s.Tt; t2 += 2) { var v = c.ps(t2); if (v > 10) ss.push([t2 - 273.15, Math.log10(v)]); }
      ss.push([s.Tt - 273.15, Math.log10(s.pt)]);
      for (var lp = Math.log10(s.pt); lp <= 8.5; lp += 0.05) sm.push([c.Tm(Math.pow(10, lp)) - 273.15, lp]);
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: tmin, xmax: tmax, ymin: 1, ymax: 8.5, xlabel: 't, °C', ylabel: 'lg(p/Па)', series: [{ pts: sv, color: '#1f5fd1', width: 2.5 }, { pts: ss, color: '#7a3fb0', width: 2.5 }, { pts: sm, color: '#0b8a7a', width: 2.5 }] });
      // аймақ атаулары (фон бояуы кейін салынған plot-тың үстінен)
      var lab = function (s0, t0, lp0) { if (t0 > tmin && t0 < tmax) R.txt(ctx, s0, X(t0), Y(lp0), { size: W < 600 ? 10 : 12.5, weight: '700', color: dark ? '#e6ecf0' : '#33404a' }); };
      ctx.save(); ctx.globalAlpha = 0.18;
      for (var i2 = 0; i2 < gw; i2 += cell) for (var j2 = 0; j2 < gh; j2 += cell) {
        var t3 = tmin + (i2 + cell / 2) / gw * (tmax - tmin) + 273.15, p3 = Math.pow(10, 1 + (gh - j2 - cell / 2) / gh * 7.5);
        ctx.fillStyle = COL[phase(s, c, t3, p3)]; ctx.fillRect(gx + i2, gy + j2, cell, cell);
      }
      ctx.restore();
      lab('ҚАТТЫ', tmin + (s.Tt - 273.15 - tmin) * 0.45, 7.3); lab('СҰЙЫҚ', (s.Tt + s.Tc) / 2 - 273.15, 7.6); lab('ГАЗ (БУ)', (s.Tt + s.Tc) / 2 - 273.15 + 20, 2.2);
      if (s.Tc - 273.15 < tmax - 20) lab('ФЛЮИД', (s.Tc - 273.15 + tmax) / 2, 8.1);
      api.D.circle(ctx, X(s.Tt - 273.15), Y(Math.log10(s.pt)), 5, '#111', null, 0, true);
      api.D.circle(ctx, X(s.Tc - 273.15), Y(Math.log10(s.pc)), 5, '#d2382b', null, 0, true);
      R.tag(ctx, 'үштік нүкте', X(s.Tt - 273.15) + 44, Y(Math.log10(s.pt)) + 14, { size: 9.5 });
      R.tag(ctx, 'кризистік нүкте', X(s.Tc - 273.15) - 10, Y(Math.log10(s.pc)) - 16, { size: 9.5, color: '#b4342a' });
      // 1 атм деңгейі
      ctx.strokeStyle = 'rgba(90,100,110,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(gx, Y(5.006)); ctx.lineTo(gx + gw, Y(5.006)); ctx.stroke(); ctx.setLineDash([]);
      R.txt(ctx, '1 атм', gx + gw - 22, Y(5.006) - 8, { size: 9.5, color: '#5b6670' });
      // ағымдағы күй
      var mx = X(P.t), my = Y(P.lp);
      ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, 8, 0, 7); ctx.stroke(); api.D.circle(ctx, mx, my, 3.5, '#d2382b', null, 0, true);
      // молекулалар моделі
      var bx = wide ? W * 0.72 : W * 0.5 - 90, by = wide ? 40 : gy + gh + 56, bw = wide ? W * 0.25 : 180, bh = wide ? H * 0.55 : H - by - 30;
      ctx.save(); R.rr(ctx, bx, by, bw, bh, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.94)' : 'rgba(255,255,255,.96)'; ctx.fill(); ctx.strokeStyle = COL[ph]; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      var n = 6, rr = Math.min(bw, bh) / 16, rnd = R.rng(7);
      ctx.save(); R.rr(ctx, bx, by, bw, bh, 10); ctx.clip();
      for (var a = 0; a < n; a++) for (var b2 = 0; b2 < n; b2++) {
        var u = (a + 0.5) / n, w2 = (b2 + 0.5) / n, ph1 = rnd() * 6.28, ph2 = rnd() * 6.28, sp = 1 + rnd(), x, y;
        if (ph === 'solid') { x = u + 0.012 * Math.sin(S.t * 9 * sp + ph1); y = w2 + 0.012 * Math.cos(S.t * 8 * sp + ph2); }
        else if (ph === 'liq') { x = (u + 0.07 * Math.sin(S.t * 0.8 * sp + ph1) + rnd() * 0.04); y = 0.32 + w2 * 0.66 + 0.04 * Math.cos(S.t * 0.9 * sp + ph2); }
        else if (ph === 'sc') { x = (u + 0.25 * Math.sin(S.t * 0.6 * sp + ph1)); y = (w2 + 0.25 * Math.cos(S.t * 0.5 * sp + ph2)); if ((a + b2) % 2) continue; }
        else { if ((a * n + b2) % 4) continue; x = 0.5 + 0.45 * Math.sin(S.t * 0.9 * sp + ph1 + a); y = 0.5 + 0.45 * Math.sin(S.t * 0.7 * sp + ph2 + b2 * 1.3); }
        x = ((x % 1) + 1) % 1; y = Math.max(0.04, Math.min(0.96, y));
        R.sphere(ctx, bx + 8 + x * (bw - 16), by + 8 + y * (bh - 16), rr, COL[ph]);
      }
      ctx.restore();
      R.tag(ctx, NAMES[ph], bx + bw / 2, by + bh + 16, { size: 11.5, color: '#0b6b78' });
      if (wide) [['көк — булану қисығы', '#1f5fd1'], ['күлгін — сублимация қисығы', '#7a3fb0'], ['жасыл — балқу қисығы', '#0b8a7a']].forEach(function (q, i) { R.txt(ctx, q[0], bx + bw / 2, by + bh + 44 + i * 16, { size: 10, color: q[1] }); });
    },
  });
})();

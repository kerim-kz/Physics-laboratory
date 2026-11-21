/* Стокс әдісі: тұтқыр сұйықта түскен шар. F = 6πηrv; тұрақты жылдамдық v = 2r²g(ρ − ρс)/(9η). Екі белгі арасындағы уақыт бойынша тұтқырлықты анықтау. */
(function () {
  var R = window.Real, g = 9.81;
  var LIQ = { glyc: ['Глицерин', 1260, 1.4, 'honey'], oil: ['Кастор майы', 960, 0.98, 'oil'], honey: ['Бал', 1420, 8, 'honey'] };
  var BALL = { steel: ['Болат шарик', 7800, '#aeb6bd'], lead: ['Қорғасын', 11300, '#6f7480'], glass: ['Шыны', 2500, '#cfe8f2'] };
  function vt(P) { var L = LIQ[P.liq], r = P.d / 2000; return 2 * r * r * g * (BALL[P.ball][1] - L[1]) / (9 * L[2]); }
  var Hc = 0.5, M1 = 0.1, M2 = 0.4; // цилиндрдің биіктігі және белгілер (м)
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Шар алдымен үдейді, сосын тұрақты жылдамдықпен түседі. Белгілер арасындағы уақытты өлшеп, сұйықтың тұтқырлығын есепте.',
    controls: [
      { type: 'select', key: 'liq', label: 'Сұйық', value: 'glyc', options: Object.keys(LIQ).map(function (k) { return [k, LIQ[k][0]]; }) },
      { type: 'select', key: 'ball', label: 'Шар', value: 'steel', options: Object.keys(BALL).map(function (k) { return [k, BALL[k][0]]; }) },
      { type: 'range', key: 'd', label: 'Шардың диаметрі', min: 2, max: 8, step: 1, value: 4, unit: 'мм', digits: 0 },
    ],
    readouts: [
      { key: 'v', label: 'Жылдамдық', unit: 'см/с', digits: 2 },
      { key: 'tm', label: 'Белгілер арасындағы уақыт (30 см)', unit: 'с', digits: 2 },
      { key: 'vt', label: 'Тұрақты жылдамдық (теория)', unit: 'см/с', digits: 2 },
      { key: 'eta', label: 'Есептелген тұтқырлық η', unit: 'Па·с', digits: 2 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.y = 0; S.v = 0; S.t1 = null; S.t2 = null; },
    step: function (api, dt) {
      var S = api.S, P = api.P, L = LIQ[P.liq], B = BALL[P.ball], r = P.d / 2000, m = B[1] * 4 / 3 * Math.PI * r * r * r, Vb = 4 / 3 * Math.PI * r * r * r;
      var sp = Math.max(1, 0.25 / Math.max(vt(P), 0.02)), n = 20; // баяу шарларды жеделдетеміз
      for (var i = 0; i < n; i++) {
        var h = dt * sp / n, a = (m * g - L[1] * Vb * g - 6 * Math.PI * L[2] * r * S.v) / m;
        if (a * h < -S.v) a = -S.v / h;
        S.v += a * h; S.y += S.v * h; S.t += h;
        if (S.t1 === null && S.y >= M1) S.t1 = S.t; if (S.t2 === null && S.y >= M2) S.t2 = S.t;
      }
      if (S.y >= Hc - 0.02) { S.y = Hc - 0.02; return false; }
    },
    read: function (api) {
      var S = api.S, P = api.P, L = LIQ[P.liq], B = BALL[P.ball], r = P.d / 2000, tm = S.t1 !== null && S.t2 !== null ? S.t2 - S.t1 : null;
      var v = tm ? (M2 - M1) / tm : null;
      return { v: S.v * 100, tm: tm, vt: vt(P) * 100, eta: v ? 2 * r * r * g * (B[1] - L[1]) / (9 * v) : null };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.94, L = LIQ[P.liq];
      R.scene(ctx, W, H, 'lab', { table: table });
      var cw = 90, ch = table - 40, cx = W < 600 ? 34 : W * 0.36 - cw / 2, top = 30, k = (ch - 20) / Hc;
      R.vessel(ctx, cx, top, cw, ch, ch - 14, { liquid: L[3] });
      [[M1, 'A'], [M2, 'B']].forEach(function (m) { var y = top + 14 + m[0] * k; ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 8, y); ctx.lineTo(cx + cw + 8, y); ctx.stroke(); R.tag(ctx, m[1], cx - 22, y, { size: 10.5, color: '#b4342a' }); });
      R.ruler(ctx, cx + cw + 36, top + 14, ch - 20, k / 100, { vertical: true, width: 22 });
      var rpx = Math.max(3, P.d * 1.2), by = top + 14 + S.y * k;
      R.sphere(ctx, cx + cw / 2, by, rpx, BALL[P.ball][2]);
      // күштер
      var B = BALL[P.ball], r = P.d / 2000, Vb = 4 / 3 * Math.PI * r * r * r, mg = B[1] * Vb * g, Fa = L[1] * Vb * g, Fs = 6 * Math.PI * L[2] * r * S.v, sc = 60 / mg;
      // күштер диаграммасы — бөлек панельде (шарик түбіне жеткенде де көрінеді)
      var mob = W < 600, fx = W * 0.75, fy = mob ? H * 0.62 : H * 0.66, ph = mob ? 130 : 180; by = fy + 8;
      var pw = W < 600 ? 150 : 220; if (W < 600) fx = W - pw / 2 - 8;
      ctx.save(); R.rr(ctx, fx - pw / 2, fy - ph / 2, pw, ph, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
      R.txt(ctx, W < 600 ? 'Күштер' : 'Шарикке әсер ететін күштер', fx, fy - ph / 2 + 14, { size: 11, weight: '700' });
      R.sphere(ctx, fx, by, 8, BALL[P.ball][2]); sc = (mob ? 34 : 50) / mg;
      R.force(ctx, fx, by, fx, by + mg * sc, '#1f5fd1', 'mg');
      R.force(ctx, fx - 14, by, fx - 14, by - Fa * sc, '#0b8a7a', 'Fₐ');
      if (Fs * sc > 3) R.force(ctx, fx + 14, by, fx + 14, by - Fs * sc, '#e0761b', 'F кедергі');
      R.lcd(ctx, mob ? W - 138 : W * 0.62, mob ? 14 : 34, 130, 28, (S.t1 !== null ? ((S.t2 !== null ? S.t2 : S.t) - S.t1) : 0).toFixed(2).replace('.', ',') + ' с', { size: 14 });
      if (!mob) R.tag(ctx, 'Секундомер: A белгісінен B белгісіне дейін', W * 0.62 + 65, 80, { size: 10 });
      if (!mob) R.tag(ctx, 'mg = Fₐ + 6πηrv  →  v = 2r²g(ρ − ρс)/(9η)', W * 0.7, H * 0.3, { size: 11.5, color: '#0b6b78' });
    },
  });
})();

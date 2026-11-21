/* Ферромагнетиктер және Кюри нүктесі: жіпке ілінген темір шеге магнитке тартылады. Шегені жанарғымен қыздырғанда Кюри температурасынан жоғары ол магниттік қасиетін жоғалтып, түсіп кетеді. Домендердің реттелуі. */
(function () {
  var R = window.Real;
  var MAT = { fe: ['Темір', 770], ni: ['Никель', 358], gd: ['Гадолиний', 20] };
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.15, grid: false, keepRunning: true, autoplay: true,
    hint: 'Жанарғыны қосып, үлгінің температурасын бақыла. Кюри нүктесінде не болады? Жанарғыны сөндіргенде үлгі қайтадан тартыла ма?',
    controls: [
      { type: 'select', key: 'm', label: 'Ферромагнетик', value: 'ni', options: Object.keys(MAT).map(function (k) { return [k, MAT[k][0] + ' (Tк = ' + MAT[k][1] + ' °C)']; }) },
      { type: 'check', key: 'fire', label: 'Жанарғы қосулы', value: true, live: true },
    ],
    readouts: [
      { key: 't', label: 'Үлгінің температурасы', unit: '°C', digits: 0 },
      { key: 'tc', label: 'Кюри температурасы', unit: '°C', digits: 0 },
      { key: 'st', label: 'Күйі', text: true },
      { key: 'M', label: 'Магниттелу (салыстырмалы)', digits: 2 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.T = MAT[api.P.m][1] < 50 ? 5 : 20; S.ang = 0.45; S.w = 0; S.dom = []; var rnd = R.rng(11); for (var i = 0; i < 36; i++) S.dom.push(rnd() * 6.283); },
    step: function (api, dt) {
      var S = api.S, P = api.P, Tc = MAT[P.m][1], amb = Tc < 50 ? 5 : 20, M = mag(S.T, Tc);
      S.t += dt;
      var target = P.fire ? (S.ang > 0.3 ? Tc * 1.25 + 60 : Tc * 0.6) : amb; // жалыннан алыстаса, баяу қызады
      S.T += (target - S.T) * dt * (P.fire ? 0.25 : 0.18);
      // маятник: магниттік тарту күші M-ге пропорционал
      var Fm = S.T < Tc ? 2.6 + 3 * M : 0, acc = -4 * Math.sin(S.ang) + Fm * (S.ang > 0.2 ? 1 : 0.4) - 0.6 * S.w;
      if (S.ang >= 0.45 && Fm > 4 * Math.sin(0.45)) { S.ang = 0.45; S.w = 0; } else { S.w += acc * dt; S.ang += S.w * dt; if (S.ang > 0.45) { S.ang = 0.45; S.w = 0; } }
    },
    read: function (api) { var S = api.S, Tc = MAT[api.P.m][1], M = mag(S.T, Tc); return { t: S.T, tc: Tc, st: S.T < Tc ? 'ферромагнетик' : 'парамагнетик (магниттік қасиеті әлсіз)', M: M }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, Tc = MAT[P.m][1], M = mag(S.T, Tc), table = H * 0.92, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: table });
      // штатив және жіп
      var px = wide ? W * 0.28 : W * 0.4, py = 40, L = Math.min(table - py - 90, 220);
      ctx.fillStyle = '#4a525b'; ctx.fillRect(px - 80, py - 8, 120, 8); ctx.fillRect(px - 80, py - 8, 8, table - py + 8);
      var bx = px + Math.sin(S.ang) * L, by = py + Math.cos(S.ang) * L;
      ctx.strokeStyle = dark ? '#ddd' : '#333'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      // үлгі (қызған кезде түсі өзгереді)
      var hot = Math.max(0, Math.min(1, (S.T - 400) / 500));
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-S.ang);
      var gcol = hot > 0 ? 'rgb(' + Math.round(140 + 115 * hot) + ',' + Math.round(140 - 40 * hot) + ',' + Math.round(150 - 130 * hot) + ')' : (P.m === 'gd' ? '#b9bec4' : '#8f99a3');
      R.rr(ctx, -6, 0, 12, 34, 3); ctx.fillStyle = gcol; ctx.fill(); ctx.strokeStyle = '#59616a'; ctx.stroke();
      ctx.restore();
      // магнит
      var mxp = px + Math.sin(0.45) * L + 4, myp = py + Math.cos(0.45) * L + 14;
      R.magnet(ctx, mxp + 50, myp, 100, 0, {});
      // жанарғы
      var fx = px + Math.sin(0.45) * L - 4;
      if (P.m !== 'gd') { R.burner(ctx, fx, table - 6, S.t, P.fire, { size: 0.75 }); }
      else if (P.fire) { R.tag(ctx, 'Жылы ауа (фен)', fx, table - 40, { size: 10, color: '#b4560f' }); for (var k = 0; k < 4; k++) { var yy = table - 60 - ((S.t * 40 + k * 15) % 60); ctx.strokeStyle = 'rgba(224,118,27,.5)'; ctx.beginPath(); ctx.moveTo(fx - 10 + k * 7, yy); ctx.quadraticCurveTo(fx - 6 + k * 7, yy - 8, fx - 10 + k * 7, yy - 16); ctx.stroke(); } }
      R.thermometer(ctx, wide ? W * 0.05 : 20, 60, H * 0.5, S.T, Tc < 50 ? -10 : 0, Tc < 50 ? 50 : 1000, { step: Tc < 50 ? 10 : 200 });
      // домендер
      var gx = wide ? W * 0.62 : W * 0.5 + 20, gy = wide ? 40 : H * 0.06, gs = wide ? Math.min(W * 0.32, H * 0.5) : Math.min(W * 0.42, 140);
      ctx.save(); R.rr(ctx, gx - 8, gy - 8, gs + 16, gs + 40, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.94)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var n = 6, cs = gs / n;
      for (var i = 0; i < n * n; i++) {
        var cx = gx + (i % n + 0.5) * cs, cy = gy + (Math.floor(i / n) + 0.5) * cs, a = (S.dom[i] - Math.PI) * (S.T < Tc ? Math.pow(1 - M, 2) * 0.6 : 1), jit = S.T >= Tc ? Math.sin(S.t * 7 + i) * 1.2 : 0;
        var ang = a + jit;
        ctx.fillStyle = S.T < Tc ? 'rgba(210,56,43,' + (0.12 + 0.2 * M) + ')' : 'rgba(120,130,140,.12)'; ctx.fillRect(cx - cs / 2 + 1, cy - cs / 2 + 1, cs - 2, cs - 2);
        api.D.arrow(ctx, cx - Math.cos(ang) * cs * 0.32, cy - Math.sin(ang) * cs * 0.32, cx + Math.cos(ang) * cs * 0.32, cy + Math.sin(ang) * cs * 0.32, S.T < Tc ? '#b4342a' : '#6c757d', 1.8);
      }
      R.txt(ctx, S.T < Tc ? 'Домендер реттелген' : 'Реттелу бұзылды (T > Tк)', gx + gs / 2, gy + gs + 16, { size: 11, weight: '700', color: S.T < Tc ? '#b4342a' : '#5b6670' });
      R.tag(ctx, S.T >= Tc ? 'T > Tк: үлгі магнитке тартылмайды!' : 'T < Tк: үлгі магнитке тартылады', W / 2, table + (H - table) / 2, { size: 11, color: S.T >= Tc ? '#b4342a' : '#0b6b78' });
    },
  });
  function mag(T, Tc) { return T >= Tc ? 0 : Math.pow(1 - (T + 273) / (Tc + 273), 0.35); }
})();

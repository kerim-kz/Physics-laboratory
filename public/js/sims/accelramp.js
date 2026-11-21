/* Науадағы шар: бірқалыпты үдемелі қозғалыстағы дененің үдеуін анықтау (Галилей тәжірибесі). a = 2s / t². */
(function () {
  var R = window.Real;
  var L = 1.2; // науаның ұзындығы, м
  function acc(P) { return 5 / 7 * 9.81 * (P.h / 100) / L; } // домалайтын тұтас шар: a = 5/7 · g sin α
  Sim.create({
    aspect: 0.56, grid: false,
    hint: '«Бастау» батырмасын бас: шар науамен домалап, цилиндрге соғылғанда электронды секундомер тоқтайды. a = 2s/t² формуласымен үдеуді есепте.',
    controls: [
      { type: 'range', key: 'h', label: 'Науа ұшының биіктігі h', min: 4, max: 30, step: 1, value: 12, unit: 'см', digits: 0 },
      { type: 'range', key: 's', label: 'Тоқтатқыш цилиндрге дейінгі жол s', min: 0.2, max: 1.1, step: 0.05, value: 0.9, unit: 'м', digits: 2 },
      { type: 'check', key: 'strobe', label: 'Стробоскоп: шардың орны әр 0,2 с сайын', value: true, live: true },
    ],
    readouts: [
      { key: 'sin', label: 'sin α = h / l', digits: 3 },
      { key: 't', label: 'Секундомер көрсетуі t', unit: 'с', digits: 2 },
      { key: 'a', label: 'Үдеу a = 2s / t²', unit: 'м/с²', digits: 3 },
      { key: 'v', label: 'Соңғы жылдамдық v = 2s / t', unit: 'м/с', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; api.S.done = false; },
    step: function (api, dt) {
      var S = api.S, P = api.P, a = acc(P), T = Math.sqrt(2 * P.s / a);
      S.t = Math.min(T, S.t + dt);
      if (S.t >= T) { S.done = true; return false; }
    },
    read: function (api) {
      var S = api.S, P = api.P;
      return { sin: P.h / 100 / L, t: S.t, a: S.done ? 2 * P.s / (S.t * S.t) : null, v: S.done ? 2 * P.s / S.t : null };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.8;
      R.scene(ctx, W, H, 'lab', { table: table });
      var Lpx = Math.min(W * 0.8, 900), k = Lpx / L; // px/м
      var hx = W * 0.08, hy = table - 6 - (P.h / 100) * k; // жоғарғы ұшы
      var x2 = hx + Math.sqrt(Lpx * Lpx - Math.pow((P.h / 100) * k, 2)), y2 = table - 6;
      var ang = Math.atan2(y2 - hy, x2 - hx);
      // штатив
      R.block(ctx, hx - 34, table - 12, 60, 12, 'iron', { depth: 6 });
      R.cylinder(ctx, hx - 8, Math.min(hy - 40, table - 150), 7, table - 12 - Math.min(hy - 40, table - 150), 'steel', { shadow: false });
      R.block(ctx, hx - 14, hy - 6, 22, 12, 'iron', { depth: 4, shadow: false });
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
      // сызғыш (науаның бүйірінде)
      R.ruler(ctx, 0, 4, Lpx, Lpx / 120, { width: 16 });
      // алюминий науа
      R.block(ctx, 0, -10, Lpx, 12, 'aluminum', { depth: 5, shadow: false });
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, -9, Lpx, 2);
      var r = 9, sPx = P.s * k;
      // тоқтатқыш цилиндр
      R.block(ctx, sPx + r * 2, -10 - 22, 14, 22, 'brass', { depth: 4, shadow: false });
      // стробоскоп іздері
      var a = acc(P);
      if (P.strobe) {
        for (var tt = 0.2; tt < S.t - 1e-6; tt += 0.2) {
          var d = a * tt * tt / 2 * k;
          ctx.globalAlpha = 0.32; R.sphere(ctx, d + r, -10 - r, r, '#9aa3ab'); ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(210,56,43,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(d + r, -10); ctx.lineTo(d + r, 4); ctx.stroke();
        }
      }
      var pos = a * S.t * S.t / 2 * k;
      R.sphere(ctx, pos + r, -10 - r, r, '#aeb6bd');
      ctx.restore();
      // секундомер
      var sx = W * 0.5 - 64, sy = Math.min(table + 22, H - 50);
      R.block(ctx, sx, sy, 128, 44, '#2f3439', { depth: 6 });
      R.lcd(ctx, sx + 8, sy + 8, 112, 28, Sim.fmt(S.t, 2).replace('.', ',') + ' с', { size: 17 });
      R.txt(ctx, 'СЕКУНДОМЕР', sx + 64, sy - 10, { size: 9, color: R.isDark() ? '#c9d2d9' : '#3a4148', weight: '600' });
      // биіктік пен жол белгілері
      R.tag(ctx, 'h = ' + P.h + ' см', hx + 46, (hy + table) / 2 + 4, { size: 11 });
      R.tag(ctx, 's = ' + Sim.fmt(P.s, 2) + ' м', hx + Math.cos(ang) * P.s * k / 2, hy + Math.sin(ang) * P.s * k / 2 - 52, { size: 11, color: '#0b6b78' });
      if (P.strobe && S.t > 0.4) {
        var parts = [], prev = 0;
        for (var n = 1; n * 0.2 <= S.t + 1e-6 && n <= 5; n++) { var dn = a * Math.pow(n * 0.2, 2) / 2; parts.push(Math.round((dn - prev) * 1000) / 10); prev = dn; }
        R.tag(ctx, (W < 600 ? 'Жолдар: ' : 'Әр 0,2 с ішіндегі жолдар: ') + parts.slice(0, W < 600 ? 3 : 5).map(function (x) { return String(x).replace('.', ','); }).join(' : ') + ' см ≈ 1 : 3 : 5 …', W / 2, 24, { size: W < 600 ? 10 : 11.5, color: '#a8701a' });
      }
      if (S.done) R.tag(ctx, 'a = 2s/t² = 2·' + Sim.fmt(P.s, 2) + ' / ' + Sim.fmt(S.t, 2) + '² = ' + Sim.fmt(2 * P.s / (S.t * S.t), 3) + ' м/с²', W / 2, 54, { size: W < 600 ? 10 : 12.5, color: '#b4342a' });
    },
  });
})();

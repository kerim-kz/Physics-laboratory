/* Температура шкалалары: бір термометрде Цельсий, Кельвин және Фаренгейт. Тірек нүктелері. */
(function () {
  var R = window.Real;
  var POINTS = [[-273.15, 'абсолют нөл'], [-89.2, 'Жердегі ең төмен (Восток)'], [-57, 'Қазақстандағы ең суық'], [0, 'мұздың еруі'], [36.6, 'адам денесі'], [100, 'судың қайнауы']];
  Sim.create({
    aspect: 0.62, grid: false, static: true, resetLabel: false,
    hint: 'Температураны жылжытып, үш шкаланың көрсетулерін салыстыр.',
    controls: [
      { type: 'range', key: 't', label: 'Температура (Цельсий)', min: -60, max: 120, step: 0.5, value: 20, unit: '°C', digits: 1 },
    ],
    readouts: [
      { key: 'c', label: 'Цельсий t', unit: '°C', digits: 1 },
      { key: 'k', label: 'Кельвин T = t + 273', unit: 'К', digits: 1 },
      { key: 'f', label: 'Фаренгейт 1,8t + 32', unit: '°F', digits: 1 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var t = api.P.t; return { c: t, k: t + 273.15, f: 1.8 * t + 32 }; },
    draw: function (api, ctx, W, H) {
      var t = api.P.t, table = H * 0.95;
      R.scene(ctx, W, H, 'wall');
      var top = 40, bot = H - 60, tmin = -60, tmax = 120;
      var Y = function (c) { return bot - (c - tmin) / (tmax - tmin) * (bot - top); };
      var cx = W * 0.5;
      // тақта
      ctx.save(); ctx.fillStyle = '#f7f4ea'; R.rr(ctx, cx - 190, top - 26, 380, bot - top + 70, 10); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.stroke(); ctx.restore();
      // түтік
      R.rr(ctx, cx - 5, top - 8, 10, bot - top + 16, 5); ctx.fillStyle = 'rgba(220,235,240,.95)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,150,160,.8)'; ctx.stroke();
      ctx.fillStyle = '#d8322a'; ctx.fillRect(cx - 2.4, Y(t), 4.8, bot - Y(t) + 8);
      R.sphere(ctx, cx, bot + 16, 12, '#d8322a');
      // үш шкала
      var cols = [[cx - 30, 'Цельсий, °C', function (c) { return c; }, 10, 'right'], [cx + 30, 'Кельвин, К', function (c) { return c + 273; }, 10, 'left'], [cx + 120, 'Фаренгейт, °F', function (c) { return 1.8 * c + 32; }, 20, 'left']];
      cols.forEach(function (sc) {
        R.txt(ctx, sc[1], sc[0] + (sc[4] === 'right' ? -40 : 40), top - 12, { size: 10.5, color: '#333' });
        var v0 = sc[2](tmin), v1 = sc[2](tmax), step = sc[3];
        for (var v = Math.ceil(v0 / step) * step; v <= v1; v += step / 2) {
          var c = sc[0] === cx + 120 ? (v - 32) / 1.8 : sc[0] === cx + 30 ? v - 273 : v, y = Y(c), big = Math.abs(v % step) < 1e-6;
          ctx.strokeStyle = '#333'; ctx.lineWidth = big ? 1.1 : 0.6;
          var dir = sc[4] === 'right' ? -1 : 1;
          ctx.beginPath(); ctx.moveTo(sc[0], y); ctx.lineTo(sc[0] + dir * (big ? 12 : 6), y); ctx.stroke();
          if (big) R.txt(ctx, String(Math.round(v)), sc[0] + dir * 30, y, { size: 9.5, mono: true, color: '#222', weight: '500' });
        }
      });
      // қазіргі деңгей
      ctx.save(); ctx.strokeStyle = '#d2382b'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx - 180, Y(t)); ctx.lineTo(cx + 185, Y(t)); ctx.stroke(); ctx.restore();
      // тірек нүктелері (сол жақта)
      POINTS.forEach(function (p) { if (p[0] < tmin || p[0] > tmax) return; R.tag(ctx, p[1] + ' (' + String(p[0]).replace('.', ',') + ' °C)', cx - 210, Y(p[0]), { size: 10, align: 'right' }); });
      R.tag(ctx, 'Абсолют нөл: −273 °C = 0 К (шкаладан тыс)', W / 2, H - 18, { size: 10.5 });
    },
  });
})();

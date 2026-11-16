/* Күн жүйесі: планеталар Күнді нақты периодтарымен айналады. Қашықтық шкаласы сызықтық немесе логарифмдік. */
(function () {
  var R = window.Real;
  // [атауы, түрі, а (а. б.), период (жыл), радиус (Жер = 1)]
  var PL = [
    ['Меркурий', 'mercury', 0.39, 0.241, 0.38], ['Шолпан', 'venus', 0.72, 0.615, 0.95], ['Жер', 'earth', 1, 1, 1], ['Марс', 'mars', 1.52, 1.881, 0.53],
    ['Юпитер', 'jupiter', 5.2, 11.86, 11.2], ['Сатурн', 'saturn', 9.58, 29.46, 9.45], ['Уран', 'uranus', 19.2, 84.01, 4.0], ['Нептун', 'neptune', 30.1, 164.8, 3.9],
  ];
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Жылдамдықты өзгертіп, ішкі және сыртқы планеталардың айналу периодтарын салыстыр.',
    controls: [
      { type: 'range', key: 'speed', label: 'Уақыт жылдамдығы', min: 0.05, max: 10, step: 0.05, value: 0.5, unit: 'жыл/с', live: true },
      { type: 'select', key: 'scale', label: 'Қашықтық шкаласы', value: 'log', options: [['log', 'Сығылған (барлық планета көрінеді)'], ['lin', 'Нақты (тек ішкі планеталар)']], live: true },
      { type: 'select', key: 'pick', label: 'Таңдалған планета', value: '2', options: PL.map(function (p, i) { return [String(i), p[0]]; }), live: true },
    ],
    readouts: [
      { key: 'years', label: 'Өткен уақыт', unit: 'жыл', digits: 2 },
      { key: 'a', label: 'Күннен орташа қашықтығы', unit: 'а. б.', digits: 2 },
      { key: 'km', label: 'Сол, км', unit: 'км', digits: 0 },
      { key: 'T', label: 'Айналу периоды', unit: 'жыл', digits: 2 },
      { key: 'light', label: 'Күн жарығы жету уақыты', unit: 'мин', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt * api.P.speed; },
    read: function (api) { var p = PL[+api.P.pick]; return { years: api.S.t, a: p[2], km: p[2] * 1.496e8, T: p[3], light: p[2] * 1.496e11 / 3e8 / 60 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S;
      R.scene(ctx, W, H, 'space', { seed: 11 });
      var cx = W / 2, cy = H / 2, maxR = Math.min(W, H) * 0.46;
      var rad = P.scale === 'log' ? function (a) { return maxR * (0.12 + 0.88 * Math.log(1 + a * 3) / Math.log(1 + 30.1 * 3)); } : function (a) { return maxR * a / 1.6; };
      R.planet(ctx, cx, cy, P.scale === 'log' ? 16 : 10, 'sun');
      PL.forEach(function (p, i) {
        var r = rad(p[2]); if (r > maxR * 1.05) return;
        ctx.strokeStyle = i === +P.pick ? 'rgba(255,215,106,.7)' : 'rgba(255,255,255,.14)'; ctx.lineWidth = i === +P.pick ? 1.5 : 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, 7); ctx.stroke();
        var ang = -S.t / p[3] * Math.PI * 2 + i * 0.8;
        var x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.92, pr = Math.max(3, Math.min(14, 3 + Math.sqrt(p[4]) * (P.scale === 'log' ? 3 : 4)));
        R.planet(ctx, x, y, pr, p[1], { light: Math.atan2(cy - y, cx - x) });
        R.txt(ctx, p[0], x, y - pr - 9, { size: 10, color: i === +P.pick ? '#ffd76a' : 'rgba(220,230,245,.85)' });
      });
      R.tag(ctx, P.scale === 'log' ? 'Арақашықтықтар сығылған: шын мәнінде Нептун Жерден 30 есе алыс' : 'Нақты масштаб: 1 а. б. = ' + Math.round(maxR / 1.6) + ' px', W / 2, H - 16, { size: 11, bg: 'rgba(20,30,50,.75)', color: '#dfe8f5', border: 'rgba(255,255,255,.15)' });
    },
  });
})();

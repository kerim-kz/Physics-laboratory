/* Қозғалыс графиктері: велосипедшінің жолы s(t) және жылдамдығы v(t) әртүрлі қозғалыс түрлерінде. */
(function () {
  var R = window.Real;
  // v(t) сценарийлері, t — секунд
  var SC = {
    rest: { name: 'Тыныштық', v: function () { return 0; } },
    uniform: { name: 'Бірқалыпты (5 м/с)', v: function () { return 5; } },
    fast: { name: 'Екі жылдамдықпен: 3 м/с, кейін 8 м/с', v: function (t) { return t < 10 ? 3 : 8; } },
    stop: { name: 'Аялдамамен: 6 м/с → тұрады → 4 м/с', v: function (t) { return t < 7 ? 6 : t < 12 ? 0 : 4; } },
    speedup: { name: 'Біртіндеп жылдамдайды', v: function (t) { return 0.5 * t; } },
  };
  var T = 20;
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'График неғұрлым тік болса, жылдамдық соғұрлым үлкен. Көлденең s(t) графигі — тыныштық.',
    controls: [
      { type: 'select', key: 'sc', label: 'Қозғалыс', value: 'fast', options: Object.keys(SC).map(function (k) { return [k, SC[k].name]; }) },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 1 },
      { key: 's', label: 'Жол s', unit: 'м', digits: 1 },
      { key: 'v', label: 'Жылдамдық v', unit: 'м/с', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.s = 0; S.pts = [[0, 0]]; S.vp = [[0, SC[api.P.sc].v(0)]]; },
    step: function (api, dt) {
      var S = api.S, f = SC[api.P.sc].v, n = 4;
      for (var i = 0; i < n; i++) { var v = f(S.t); S.s += v * dt / n; S.t += dt / n; }
      S.pts.push([S.t, S.s]); S.vp.push([S.t, f(S.t)]);
      if (S.t >= T) return false;
    },
    read: function (api) { return { t: api.S.t, s: api.S.s, v: SC[api.P.sc].v(api.S.t) }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, D = api.D, sky = H * 0.36;
      R.scene(ctx, W, sky + 40, 'outdoor', { ground: sky, road: true, clouds: false, sun: false });
      // велосипедші (көлік бейнесі): жол 0…smax м экранның еніне
      var smax = 165, X = function (s) { return 30 + s / smax * (W - 80); };
      for (var m = 0; m <= smax; m += 20) { var px = X(m); ctx.fillStyle = '#f2efe6'; ctx.fillRect(px - 1, sky - 14, 2, 12); R.txt(ctx, m + ' м', px, sky - 22, { size: 9, color: '#22313a' }); }
      R.car(ctx, X(S.s), sky + 29, 70, '#e8892b', S.s * 6);
      // графиктер
      ctx.fillStyle = api.C.bg; ctx.fillRect(0, sky + 40, W, H - sky - 40);
      var gy = sky + 64, gh = H - gy - 34, gw = (W - 100) / 2;
      D.plot(ctx, { x: 46, y: gy, w: gw, h: gh }, { xmin: 0, xmax: T, ymin: 0, ymax: smax, xlabel: 't, с', ylabel: 's, м', series: [{ pts: S.pts, color: api.C.accent }], marker: [S.t, S.s] });
      D.plot(ctx, { x: 46 + gw + 50, y: gy, w: gw, h: gh }, { xmin: 0, xmax: T, ymin: 0, ymax: 10, xlabel: 't, с', ylabel: 'v, м/с', series: [{ pts: S.vp, color: api.C.orange }], marker: [S.t, SC[api.P.sc].v(S.t)] });
    },
  });
})();

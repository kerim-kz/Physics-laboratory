/* Санақ жүйесі және траектория: дөңгелектің шетіндегі нүктенің (ниппельдің) траекториясы
   жолға қатысты — циклоида, көлікке қатысты — шеңбер. */
(function () {
  var R = window.Real;
  var CARW = 160, WR = CARW * 0.11; // дөңгелек радиусы, px
  var PXM = 40;                     // 1 м = 40 px (көрнекілік үшін қозғалыс 4 есе баяулатылған)
  function span(W) { return W * 0.78; }
  Sim.create({
    aspect: 0.56, grid: false,
    hint: 'Санақ денесін ауыстырып көр: бір нүктенің траекториясы әртүрлі болады. Қозғалыс 4 есе баяулатылған.',
    controls: [
      { type: 'select', key: 'frame', label: 'Санақ денесі', value: 'ground', options: [['ground', 'Жол (Жер)'], ['car', 'Көлік']] },
      { type: 'range', key: 'v', label: 'Көліктің жылдамдығы', min: 5, max: 30, step: 1, value: 12, unit: 'км/сағ', live: true },
      { type: 'check', key: 'trace', label: 'Траекторияны сызу', value: true, live: true },
    ],
    readouts: [
      { key: 'vc', label: 'Көліктің жолға қатысты жылдамдығы', unit: 'м/с', digits: 2 },
      { key: 'vp', label: 'Ниппельдің жылдамдығы (таңдалған жүйеде)', unit: 'м/с', digits: 2 },
      { key: 'tr', label: 'Ниппельдің траекториясы', text: true },
    ],
    init: function (api) { api.S.x = 0; api.S.t = 0; api.S.pts = []; },
    step: function (api, dt) {
      var S = api.S, v = api.P.v / 3.6;
      var before = S.x % span(api.W);
      S.t += dt; S.x += v * PXM * dt / 4;
      if (api.P.frame === 'ground' && S.x % span(api.W) < before) S.pts = []; // көлік экранның басына оралды
      var f = S.x / WR;
      S.pts.push([S.x + WR * Math.sin(f), -WR * Math.cos(f), WR * Math.sin(f)]);
      if (S.pts.length > 2000) S.pts.shift();
    },
    read: function (api) {
      var v = api.P.v / 3.6, f = api.S.x / WR;
      return {
        vc: v,
        vp: api.P.frame === 'ground' ? Math.abs(2 * v * Math.cos(f / 2)) : v,
        tr: api.P.frame === 'ground' ? 'циклоида (доғалар қатары)' : 'шеңбер',
      };
    },
    onLive: function (api, key) { if (key !== 'v') api.S.pts = []; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, ground = H * 0.74;
      var ground_frame = P.frame === 'ground';
      var carX = ground_frame ? W * 0.12 + (S.x % span(W)) : W * 0.45;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, road: true, roadShift: ground_frame ? 0 : -S.x });
      for (var i = 0; i < 7; i++) {
        var tx = i * 210 + 40 - (ground_frame ? 0 : S.x);
        tx = ((tx % 1470) + 1470) % 1470 - 120;
        R.tree(ctx, tx, ground - 2, 80 + (i % 3) * 14);
      }
      var yRoad = ground + 29, wheelX = carX - CARW * 0.3, wheelY = yRoad - WR;
      if (P.trace && S.pts.length > 1) {
        ctx.save(); ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2.6; ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 2;
        ctx.beginPath();
        var first = true;
        S.pts.forEach(function (p) {
          var sx = ground_frame ? p[0] - S.x + wheelX : wheelX + p[2], sy = wheelY + p[1];
          if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
        });
        ctx.stroke(); ctx.restore();
      }
      R.car(ctx, carX, yRoad, CARW, '#c8382c', S.x);
      var f = S.x / WR;
      R.sphere(ctx, wheelX + WR * 0.9 * Math.sin(f), wheelY - WR * 0.9 * Math.cos(f), 4.5, '#ffd43b');
      R.tag(ctx, ground_frame ? 'Бақылаушы жол шетінде тұр: ағаштар қозғалмайды' : 'Бақылаушы көлікте отыр: ағаштар артқа «жүгіреді»', W / 2, 22, { size: 12 });
    },
  });
})();

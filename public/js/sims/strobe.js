/* Стробоскоптық фотосурет: еркін түсу және тік жоғары лақтыру. Тең T аралықтарындағы орындар, Δs = gT². */
(function () {
  var R = window.Real;
  var PL = { earth: ['Жер', 9.81], moon: ['Ай', 1.62], mars: ['Марс', 3.71] };
  var HM = 1.6; // сызғыштың ұзындығы, м
  function motion(P) {
    var g = PL[P.pl][1];
    if (P.mode === 'fall') return { g: g, y0: HM - 0.05, v0: 0, tEnd: Math.sqrt(2 * (HM - 0.1) / g) };
    var v0 = Math.min(P.v0, Math.sqrt(2 * g * 1.35)), y0 = 0.1; // шар сызғыштан шығып кетпесін
    return { g: g, y0: y0, v0: v0, tEnd: (v0 + Math.sqrt(v0 * v0 + 2 * g * 0)) / g };
  }
  function yAt(m, t) { return m.y0 + m.v0 * t - m.g * t * t / 2; }
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Стробоскоп әр T секунд сайын жарқ етіп, шардың орнын түсіреді. Көрші аралықтардың айырымын тап: Δs = gT².',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'fall', options: [['fall', 'Еркін түсу (тыныштықтан)'], ['up', 'Тік жоғары лақтыру']] },
      { type: 'select', key: 'pl', label: 'Қай жерде', value: 'earth', options: Object.keys(PL).map(function (k) { return [k, PL[k][0] + ' (g = ' + String(PL[k][1]).replace('.', ',') + ' м/с²)']; }) },
      { type: 'select', key: 'T', label: 'Жарқыл аралығы T', value: '0.1', options: [['0.05', '0,05 с'], ['0.1', '0,1 с'], ['0.15', '0,15 с']] },
      { type: 'range', key: 'v0', label: 'Лақтыру жылдамдығы v₀ (жоғары)', min: 2, max: 5, step: 0.5, value: 4.5, unit: 'м/с' },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 2 },
      { key: 'h', label: 'Шардың биіктігі (сызғыш бойынша)', unit: 'м', digits: 3 },
      { key: 'v', label: 'Жылдамдық проекциясы v_y', unit: 'м/с', digits: 2 },
      { key: 'ds', label: 'Көрші аралықтардың айырымы Δs', unit: 'см', digits: 1 },
      { key: 'gm', label: 'Өлшенген g = Δs / T²', unit: 'м/с²', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) {
      var S = api.S, m = motion(api.P);
      S.t = Math.min(m.tEnd, S.t + dt * 0.5); // баяулатылған
      if (S.t >= m.tEnd) return false;
    },
    read: function (api) {
      var P = api.P, S = api.S, m = motion(P), T = parseFloat(P.T);
      var n = Math.floor(S.t / T + 1e-9), ds = null;
      if (n >= 2) { var y1 = yAt(m, (n - 2) * T), y2 = yAt(m, (n - 1) * T), y3 = yAt(m, n * T); ds = ((y2 - y3) - (y1 - y2)) * 100; }
      return { t: S.t, h: yAt(m, S.t), v: m.v0 - m.g * S.t, ds: ds, gm: ds === null ? null : ds / 100 / (T * T) };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, m = motion(P), T = parseFloat(P.T);
      // қараңғы фотосурет фоны
      var bg = ctx.createRadialGradient(W * 0.4, H * 0.45, 20, W * 0.4, H * 0.5, Math.max(W, H) * 0.75);
      bg.addColorStop(0, '#2a2f36'); bg.addColorStop(1, '#07090c');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      var top = 22, bot = H - 22, k = (bot - top) / HM; // px/м
      var Y = function (y) { return bot - y * k; };
      var rx = Math.max(54, W * 0.3);
      // метрлік сызғыш (тік, төменнен жоғары)
      ctx.save(); ctx.translate(rx - 30, bot); ctx.rotate(-Math.PI / 2);
      R.ruler(ctx, 0, 0, HM * k + 8, k / 100, { width: 26, tone: '#efe3c4' });
      ctx.restore();
      R.txt(ctx, 'см', rx - 17, top - 8, { size: 10, color: '#c9d2d9' });
      // шардың жарқыл кезіндегі орындары
      var up = P.mode === 'up', shift = up ? Math.min(14, (W - rx - 120) / (m.tEnd / T + 1)) : 0;
      var r = Math.max(6, Math.min(10, k * 0.03));
      var n = Math.floor(S.t / T + 1e-9), list = [];
      for (var i = 0; i <= n; i++) {
        var y = yAt(m, i * T), x = rx + 18 + i * shift;
        list.push(y);
        var glow = ctx.createRadialGradient(x, Y(y), 1, x, Y(y), r * 2.6);
        glow.addColorStop(0, 'rgba(255,255,240,.55)'); glow.addColorStop(1, 'rgba(255,255,240,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, Y(y), r * 2.6, 0, 7); ctx.fill();
        R.sphere(ctx, x, Y(y), r, '#e9e4d8');
        ctx.strokeStyle = 'rgba(255,215,90,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rx - 4, Y(y)); ctx.lineTo(x - r - 2, Y(y)); ctx.stroke();
      }
      // қазіргі орны (жарқылдар арасында көмескі)
      var yc = yAt(m, S.t);
      ctx.globalAlpha = 0.35; R.sphere(ctx, rx + 18 + (S.t / T) * shift, Y(yc), r, '#c9c4b8'); ctx.globalAlpha = 1;
      // аралықтар кестесі
      var tx = Math.min(W - 196, rx + 60 + (up ? (m.tEnd / T) * shift : 0)), ty = top + 4;
      if (tx > rx + 40) {
        ctx.save(); R.rr(ctx, tx, ty, 186, Math.min(H - 40, 34 + Math.min(list.length - 1, 12) * 19), 8); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke(); ctx.restore();
        R.txt(ctx, '№   s, см     Δs, см', tx + 12, ty + 16, { size: 11, color: '#ffd666', align: 'left', mono: true });
        var prev = null;
        for (var j = 1; j < list.length && j <= 12; j++) {
          var dy = (list[j] - list[j - 1]) * 100, sgn = dy > 0 ? '↑' : '↓', s = Math.abs(dy);
          var d = prev === null ? '' : (Math.round((prev - dy) * 10) / 10).toFixed(1).replace('.', ',');
          R.txt(ctx, (j < 10 ? ' ' : '') + j + '  ' + sgn + (s < 10 ? ' ' : '') + s.toFixed(1).replace('.', ',') + '    ' + d, tx + 12, ty + 35 + (j - 1) * 19, { size: 11, color: '#e8edf1', align: 'left', mono: true });
          prev = dy;
        }
      }
      if (P.mode === 'up' && m.v0 < P.v0 - 1e-6) R.tag(ctx, 'Сызғыштан аспауы үшін v₀ = ' + Sim.fmt(m.v0, 2) + ' м/с алынды', W / 2, H - 40, { size: 10.5 });
      R.txt(ctx, PL[P.pl][0] + ' · T = ' + String(T).replace('.', ',') + ' с', W - 12, H - 12, { size: 11, color: '#9fb0bd', align: 'right' });
    },
  });
})();

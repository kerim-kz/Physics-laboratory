/* №10 зертханалық жұмыс: көлбеу жазықтықтың ПӘК-і. Брусокты динамометрмен бірқалыпты тартамыз.
   η = Ph / (Fl) · 100 %. Үйкеліс болғандықтан ПӘК < 100 %. */
(function () {
  var R = window.Real;
  var SURF = { wood: ['Ағаш тақтай', 0.3], glass: ['Шыны', 0.12], cloth: ['Мата', 0.5] };
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Брусокты көлбеу жазықтық бойымен бірқалыпты тартамыз. Биіктікті және бетті өзгертіп, ПӘК-ті салыстыр.',
    controls: [
      { type: 'range', key: 'm', label: 'Брусок + жүк массасы', min: 0.2, max: 1, step: 0.1, value: 0.4, unit: 'кг' },
      { type: 'range', key: 'h', label: 'Көлбеу жазықтықтың биіктігі h', min: 0.05, max: 0.4, step: 0.01, value: 0.2, unit: 'м', digits: 2 },
      { type: 'select', key: 'surf', label: 'Жазықтықтың беті', value: 'wood', options: Object.keys(SURF).map(function (k) { return [k, SURF[k][0]]; }) },
    ],
    readouts: [
      { key: 'P', label: 'Брусоктың салмағы P', unit: 'Н', digits: 2 },
      { key: 'F', label: 'Тарту күші F (динамометр)', unit: 'Н', digits: 2 },
      { key: 'Ap', label: 'Пайдалы жұмыс Aп = Ph', unit: 'Дж', digits: 3 },
      { key: 'At', label: 'Толық жұмыс Aт = Fl', unit: 'Дж', digits: 3 },
      { key: 'eta', label: 'ПӘК η', unit: '%', digits: 0 },
    ],
    init: function (api) { api.S.s = 0; },
    step: function (api, dt) { api.S.s = Math.min(0.5, api.S.s + dt * 0.12); if (api.S.s >= 0.5) return false; },
    read: function (api) {
      var P = api.P, l = 0.5, a = Math.asin(P.h / l), mu = SURF[P.surf][1], Pw = P.m * 9.8;
      var F = Pw * (Math.sin(a) + mu * Math.cos(a));
      return { P: Pw, F: F, Ap: Pw * P.h, At: F * l, eta: Pw * P.h / (F * l) * 100 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.84, l = 0.5, a = Math.asin(P.h / l);
      R.scene(ctx, W, H, 'lab', { table: table });
      var k = Math.min(W * 0.62, 600) / l, x0 = W * 0.12, y0 = table;
      var x1 = x0 + l * Math.cos(a) * k, y1 = y0 - P.h * k;
      // штатив (тірек)
      R.block(ctx, x1 - 6, y1, 22, y0 - y1, 'iron', { depth: 6, shadow: false });
      // тақтай
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(-a);
      ctx.save(); ctx.beginPath(); ctx.rect(0, -10, l * k, 10); ctx.clip();
      if (P.surf === 'glass') { ctx.fillStyle = 'rgba(190,225,240,.85)'; ctx.fillRect(0, -10, l * k, 10); }
      else R.paintFace(ctx, 0, -10, l * k, 10, P.surf === 'cloth' ? '#3a6fb0' : 'oak', 0);
      ctx.restore();
      // брусок
      var bx = S.s * k * 0.82;
      R.block(ctx, bx, -10 - 26, 60, 26, 'pine', { depth: 0, shadow: false, label: Sim.fmt(P.m, 1) + ' кг' });
      ctx.restore();
      // динамометр жазықтыққа параллель
      var rd = read(api);
      var hx = x0 + Math.cos(a) * (bx + 60), hy = y0 - Math.sin(a) * (bx + 60) - 23 * Math.cos(a);
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(-a - Math.PI / 2);
      R.dynamometer(ctx, 0, -6, 130, rd.F, 5, { div: 0.1, big: 1, w: 26 });
      ctx.restore();
      // өлшемдер: h және l
      ctx.save(); ctx.strokeStyle = '#0b6b78'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x1 + 30, y0); ctx.lineTo(x1 + 30, y1); ctx.stroke(); ctx.restore();
      R.tag(ctx, 'h = ' + Sim.fmt(P.h * 100, 0) + ' см', x1 + 70, (y0 + y1) / 2, { size: 11, color: '#0b6b78' });
      R.tag(ctx, 'l = 50 см', (x0 + x1) / 2 - 20, (y0 + y1) / 2 + 30, { size: 11, color: '#0b6b78' });
      R.tag(ctx, 'η = ' + Math.round(rd.eta) + ' %', W * 0.82, 30, { size: 14, color: '#b4342a' });
    },
  });
  function read(api) {
    var P = api.P, a = Math.asin(P.h / 0.5), Pw = P.m * 9.8, F = Pw * (Math.sin(a) + SURF[P.surf][1] * Math.cos(a));
    return { F: F, eta: Pw * P.h / (F * 0.5) * 100 };
  }
})();

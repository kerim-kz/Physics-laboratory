/* Дененің салмағы және салмақсыздық: лифттегі еден таразысы. P = m(g + a) (үдеу жоғары), P = m(g − a) (үдеу төмен), a = g — салмақсыздық. */
(function () {
  var R = window.Real, g = 9.81;
  // кезеңдер: [ұзақтығы (с), үдеу (жоғары +)]
  var SC = {
    up: ['Жоғары көтерілу', [[1, 0], [1.6, 2], [2.4, 0], [1.6, -2], [1, 0]]],
    down: ['Төмен түсу', [[1, 0], [1.6, -2], [2.4, 0], [1.6, 2], [1, 0]]],
    fall: ['Еркін түсу (сынақ мұнарасы)', [[1, 0], [2.2, -g], [1.1, 2 * g], [1, 0]]],
  };
  function phase(sc, t) {
    var L = SC[sc][1], acc = 0, v = 0, y = 0;
    for (var i = 0; i < L.length; i++) {
      var d = Math.min(L[i][0], Math.max(0, t - acc));
      y += v * d + L[i][1] * d * d / 2; v += L[i][1] * d;
      if (t < acc + L[i][0]) return { a: L[i][1], v: v, y: y };
      acc += L[i][0];
    }
    return { a: 0, v: 0, y: y, done: true };
  }
  Sim.create({
    aspect: 0.62, grid: false,
    hint: '«Бастау» бас: лифт жылдамдағанда, бірқалыпты қозғалғанда және тежелгенде таразы нені көрсетеді? Салмақсыздық қашан болады?',
    controls: [
      { type: 'select', key: 'sc', label: 'Қозғалыс', value: 'up', options: Object.keys(SC).map(function (k) { return [k, SC[k][0]]; }) },
      { type: 'range', key: 'm', label: 'Адамның массасы m', min: 30, max: 90, step: 5, value: 50, unit: 'кг', digits: 0 },
    ],
    readouts: [
      { key: 'a', label: 'Лифттің үдеуі (жоғары +)', unit: 'м/с²', digits: 2 },
      { key: 'v', label: 'Лифттің жылдамдығы', unit: 'м/с', digits: 2 },
      { key: 'P', label: 'Салмақ P = m(g + a)', unit: 'Н', digits: 0 },
      { key: 'kg', label: 'Таразы көрсетуі P / g', unit: 'кг', digits: 1 },
      { key: 'state', label: 'Күй', text: true },
    ],
    init: function (api) { api.S.t = 0; api.S.hist = []; },
    step: function (api, dt) {
      var S = api.S, f = phase(api.P.sc, S.t);
      S.t += dt;
      S.hist.push([S.t, api.P.m * (g + f.a)]);
      if (f.done) return false;
    },
    read: function (api) {
      var f = phase(api.P.sc, api.S.t), P = api.P.m * (g + f.a);
      var st = Math.abs(f.a) < 1e-6 ? (Math.abs(f.v) < 1e-6 ? 'тыныштық: P = mg' : 'бірқалыпты қозғалыс: P = mg') : f.a > 0 ? 'асқын салмақ: P > mg' : f.a <= -g + 1e-6 ? 'САЛМАҚСЫЗДЫҚ: P = 0' : 'салмақ азайды: P < mg';
      return { a: f.a, v: f.v, P: P, kg: P / g, state: st };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, f = phase(P.sc, S.t), Pw = P.m * (g + f.a);
      // шахта
      var dark = R.isDark();
      ctx.fillStyle = dark ? '#1c2228' : '#cfd5da'; ctx.fillRect(0, 0, W, H);
      var sx = W * (W > 640 ? 0.08 : 0.04), sw = Math.min(W * 0.44, 340);
      ctx.fillStyle = dark ? '#11161b' : '#9aa3ab'; ctx.fillRect(sx, 0, sw, H);
      // қабат белгілері (шахта қабырғасы жылжиды)
      var ppm = 40, i0 = Math.floor(f.y / 3) - 2;
      for (var i = i0; i < i0 + H / (3 * ppm) + 4; i++) {
        var yy = H - 30 - (i * 3 - f.y) * ppm;
        ctx.fillStyle = dark ? '#2b333b' : '#7d878f'; ctx.fillRect(sx, yy, sw, 6);
        R.txt(ctx, (i + 10) + '-қабат', sx + sw + 34, yy - 6, { size: 10, color: dark ? '#9fb0bd' : '#3a4148' });
      }
      ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + sw / 2, 0); ctx.lineTo(sx + sw / 2, H * 0.12); ctx.stroke();
      // кабина
      var cx0 = sx + 14, cw = sw - 28, cy0 = H * 0.12, chh = H * 0.8;
      ctx.save(); R.rr(ctx, cx0, cy0, cw, chh, 6);
      var cab = ctx.createLinearGradient(cx0, 0, cx0 + cw, 0); cab.addColorStop(0, '#b8c0c7'); cab.addColorStop(0.5, '#eef1f3'); cab.addColorStop(1, '#a8b1b8');
      ctx.fillStyle = cab; ctx.fill(); ctx.strokeStyle = '#59616a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#d9dee2'; ctx.fillRect(cx0 + 8, cy0 + 8, cw - 16, chh - 16);
      var floorY = cy0 + chh - 14;
      ctx.fillStyle = '#6d747b'; ctx.fillRect(cx0 + 8, floorY, cw - 16, 6);
      // еден таразысы
      var scW = Math.min(110, cw * 0.5), scX = cx0 + cw / 2 - scW / 2;
      R.digitalScale(ctx, scX, floorY - 42, scW, 0, { text: Sim.fmt(Math.max(0, Pw / g), 1).replace('.', ',') + ' кг' });
      // адам
      var hy = floorY - 42, h = Math.min(chh * 0.62, 190) * Math.cbrt(P.m / 60);
      var squash = Math.max(-0.06, Math.min(0.06, f.a / 60));
      personAt(ctx, cx0 + cw / 2, hy, h * (1 - squash), f.a <= -g + 1e-6);
      // қолдағы алма (салмақсыздықта «қалқиды»)
      var free = f.a <= -g + 1e-6;
      var ax = cx0 + cw / 2 + h * 0.34, ay = hy - h * 0.55 - (free ? Math.min(40, (S.t - 1) * 18) : 0);
      R.sphere(ctx, ax, ay, 7, '#c9302c');
      // күштер
      var k = Math.min(0.16, (H * 0.28) / (P.m * 2.2 * g));
      R.force(ctx, cx0 + cw / 2 - 30, hy - h * 0.45, cx0 + cw / 2 - 30, hy - h * 0.45 + P.m * g * k, '#1f5fd1', 'mg');
      if (Pw > 1) R.force(ctx, cx0 + cw / 2 + 30, hy, cx0 + cw / 2 + 30, hy - Pw * k, '#0b8a7a', 'N');
      if (Math.abs(f.a) > 0.01) R.force(ctx, cx0 + cw - 24, cy0 + chh * 0.45, cx0 + cw - 24, cy0 + chh * 0.45 - Math.sign(f.a) * Math.min(70, 8 + Math.abs(f.a) * 7), '#e0761b', 'a');
      // P(t) графигі
      if (W > 640) {
        var gx = sx + sw + 110, gw = W - gx - 24, gy = 40, gh = H * 0.5;
        ctx.save(); R.rr(ctx, gx - 46, gy - 22, gw + 58, gh + 64, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
        api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 8, ymin: 0, ymax: Math.max(1200, P.m * g * 2.2), xlabel: 't, с', ylabel: 'P, Н', series: [{ pts: S.hist, color: '#0b8a7a' }, { pts: [[0, P.m * g], [8, P.m * g]], color: '#1f5fd1' }], marker: [S.t, Pw] });
        R.tag(ctx, 'mg = ' + Math.round(P.m * g) + ' Н', gx + gw - 46, gy + gh - (P.m * g) / Math.max(1200, P.m * g * 2.2) * gh - 12, { size: 10, color: '#1f5fd1' });
      }
      var st = Math.abs(f.a) < 1e-6 ? 'P = mg' : f.a > 0 ? 'Үдеу жоғары: P = m(g + a) > mg' : free ? 'Салмақсыздық: a = g, P = 0' : 'Үдеу төмен: P = m(g − a) < mg';
      R.tag(ctx, st, W > 640 ? W * 0.7 : W * 0.5, W > 640 ? H - 40 : 22, { size: 12, color: free ? '#b4342a' : '#0b6b78' });
    },
  });
  function personAt(ctx, x, yFloor, h, float) {
    var lift = float ? 6 : 0;
    ctx.save();
    ctx.translate(0, -lift);
    ctx.fillStyle = '#2f4f7a'; ctx.fillRect(x - 11, yFloor - h * 0.47, 9, h * 0.47); ctx.fillRect(x + 2, yFloor - h * 0.47, 9, h * 0.47);
    ctx.fillStyle = '#2b2f33'; ctx.fillRect(x - 14, yFloor - 6, 14, 6); ctx.fillRect(x + 1, yFloor - 6, 14, 6);
    ctx.fillStyle = '#3a9a5c'; R.rr(ctx, x - 18, yFloor - h * 0.86, 36, h * 0.42, 9); ctx.fill();
    ctx.strokeStyle = '#3a9a5c'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 16, yFloor - h * 0.8); ctx.lineTo(x - 24, yFloor - h * (float ? 0.95 : 0.55)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 16, yFloor - h * 0.8); ctx.lineTo(x + h * 0.3, yFloor - h * 0.6); ctx.stroke();
    ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(x, yFloor - h * 0.94, h * 0.085, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(x, yFloor - h * 0.97, h * 0.085, Math.PI, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
})();

/* Өлшеу құралдары: бөлік құнын анықтау, көрсетуін оқу, аспаптық қателік, нәтижені x ± Δx түрінде жазу. */
(function () {
  var R = window.Real;
  // Аспаптар: [атауы, шкала нұсқалары: {max, step, big, unit}]
  var INST = {
    ruler: { name: 'Сызғыш (қарындаш ұзындығы)', unit: 'см', v: [{ max: 20, step: 0.1, big: 1 }] },
    beaker: { name: 'Мензурка (судың көлемі)', unit: 'мл', v: [{ max: 50, step: 1, big: 10 }, { max: 100, step: 2, big: 20 }, { max: 250, step: 5, big: 50 }, { max: 200, step: 4, big: 40 }] },
    thermo: { name: 'Термометр (ауа температурасы)', unit: '°C', v: [{ min: -30, max: 50, step: 1, big: 10 }, { min: -20, max: 60, step: 2, big: 10 }] },
    dyn: { name: 'Динамометр (жүктің салмағы)', unit: 'Н', v: [{ max: 4, step: 0.1, big: 1 }, { max: 10, step: 0.2, big: 1 }] },
  };
  function rnd(a, b, step) { return Math.round((a + Math.random() * (b - a)) / step) * step; }
  function newValue(api) {
    var S = api.S, I = INST[api.P.inst];
    S.var = I.v[Math.floor(Math.random() * I.v.length)];
    var v = S.var;
    if (api.P.inst === 'ruler') S.x = rnd(6, 17.5, 0.1);
    else if (api.P.inst === 'beaker') S.x = rnd(v.max * 0.2, v.max * 0.9, v.step);
    else if (api.P.inst === 'thermo') S.x = rnd(v.min + 10, v.max - 8, v.step);
    else S.x = rnd(v.max * 0.15, v.max * 0.9, v.step);
  }
  var fmt = function (x, d) { return Sim.fmt(x, d); };
  function decimals(step) { return step < 0.1 ? 2 : step < 1 ? 1 : 0; }

  Sim.create({
    aspect: 0.6, static: true, resetLabel: false, grid: false,
    hint: 'Алдымен бөлік құнын анықта, сосын көрсетуін оқы. Тексеру үшін «Жауабын көрсету» белгіле.',
    controls: [
      { type: 'select', key: 'inst', label: 'Өлшеу құралы', value: 'beaker', options: Object.keys(INST).map(function (k) { return [k, INST[k].name]; }) },
      { type: 'check', key: 'show', label: 'Жауабын көрсету', value: false },
    ],
    buttons: [{ label: 'Жаңа өлшеу', onClick: function (api) { newValue(api); } }],
    readouts: [
      { key: 'c', label: 'Бөлік құны c', text: true },
      { key: 'x', label: 'Көрсетуі', text: true },
      { key: 'dx', label: 'Аспаптық қателік Δx = c/2', text: true },
      { key: 'res', label: 'Нәтиже', text: true },
      { key: 'eps', label: 'Салыстырмалы қателік', unit: '%', digits: 1 },
    ],
    init: function (api) { newValue(api); },
    onLive: function (api, key) { if (key === 'inst') newValue(api); },
    step: function () {},
    read: function (api) {
      var S = api.S, I = INST[api.P.inst], c = S.var.step, d = decimals(c);
      if (!api.P.show) return { c: '?', x: '?', dx: '?', res: 'x = … ± …', eps: '?' };
      var c2 = c / 2;
      return {
        c: fmt(c, d) + ' ' + I.unit, x: fmt(S.x, d) + ' ' + I.unit, dx: fmt(c2, d + 1) + ' ' + I.unit,
        res: '(' + fmt(S.x, d) + ' ± ' + fmt(c2, d + 1) + ') ' + I.unit, eps: Math.abs(c2 / S.x) * 100,
      };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, v = S.var;
      var table = H * 0.84;
      R.scene(ctx, W, H, 'lab', { table: table });
      if (P.inst === 'ruler') {
        var len = Math.min(W * 0.86, 820), pxcm = (len - 8) / 21, x0 = (W - len) / 2, ry = table - 40;
        R.ruler(ctx, x0, ry, len, pxcm, { width: 34 });
        // қарындаш
        var px = x0 + 4, pl = S.x * pxcm, py = ry - 14, ph = 13;
        ctx.save();
        var g = ctx.createLinearGradient(0, py - ph / 2, 0, py + ph / 2);
        g.addColorStop(0, '#ffd84a'); g.addColorStop(0.5, '#f2b51b'); g.addColorStop(1, '#b07c0a');
        ctx.fillStyle = g; ctx.fillRect(px + ph * 0.9, py - ph / 2, pl - ph * 0.9 - ph * 1.2, ph);
        ctx.fillStyle = '#e8d2aa'; ctx.beginPath(); ctx.moveTo(px + pl - ph * 1.2, py - ph / 2); ctx.lineTo(px + pl, py); ctx.lineTo(px + pl - ph * 1.2, py + ph / 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(px + pl - ph * 0.45, py - ph * 0.19); ctx.lineTo(px + pl, py); ctx.lineTo(px + pl - ph * 0.45, py + ph * 0.19); ctx.fill();
        ctx.fillStyle = '#c9ced3'; ctx.fillRect(px + ph * 0.45, py - ph / 2, ph * 0.45, ph);
        ctx.fillStyle = '#e88a9a'; ctx.fillRect(px, py - ph / 2, ph * 0.45, ph);
        ctx.restore();
        R.tag(ctx, '1 см-де 10 бөлік', x0 + 2 * pxcm, ry - 46, { size: 11 });
        // ұлғайтқыш: қарындаш ұшының маңы
        var zx = W * 0.5, zy = H * 0.3, zr = Math.min(H * 0.22, 110), zoom = 4.2, tip = px + pl;
        ctx.save();
        ctx.beginPath(); ctx.arc(zx, zy, zr, 0, 7); ctx.clip();
        ctx.fillStyle = '#e9edf0'; ctx.fillRect(zx - zr, zy - zr, zr * 2, zr * 2);
        ctx.translate(zx, zy); ctx.scale(zoom, zoom); ctx.translate(-tip, -(ry + 4));
        R.ruler(ctx, x0, ry, len, pxcm, { width: 34 });
        ctx.fillStyle = '#e8d2aa'; ctx.beginPath(); ctx.moveTo(tip - ph * 1.2, py - ph / 2); ctx.lineTo(tip, py); ctx.lineTo(tip - ph * 1.2, py + ph / 2); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(tip - ph * 0.45, py - ph * 0.19); ctx.lineTo(tip, py); ctx.lineTo(tip - ph * 0.45, py + ph * 0.19); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(zx, zy, zr, 0, 7); ctx.stroke();
        ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(zx + zr * 0.7, zy + zr * 0.7); ctx.lineTo(zx + zr * 1.05, zy + zr * 1.05); ctx.stroke(); ctx.restore();
        R.tag(ctx, 'Ұлғайтқыш', zx, zy - zr - 12, { size: 11 });
      } else if (P.inst === 'beaker') {
        var bh = table - 40, bw = Math.min(90, W * 0.12), bx = W * 0.32 - bw / 2;
        R.cylinderGlass(ctx, bx, 30, bw, bh - 30 + 10, { max: v.max, ml: S.x, step: v.step, big: v.big });
        // ұлғайтқыш: мениск
        var Yf = function (ml) { return 30 + bh - 30 + 10 - 6 - ml / v.max * (bh - 30 + 10 - 16); };
        var zx2 = W * 0.7, zy2 = H * 0.42, zr2 = Math.min(H * 0.3, 130), zoom2 = 3.2;
        ctx.save(); ctx.beginPath(); ctx.arc(zx2, zy2, zr2, 0, 7); ctx.clip();
        ctx.fillStyle = '#e9edf0'; ctx.fillRect(zx2 - zr2, zy2 - zr2, zr2 * 2, zr2 * 2);
        ctx.translate(zx2, zy2); ctx.scale(zoom2, zoom2); ctx.translate(-(bx + bw * 0.45), -Yf(S.x));
        R.cylinderGlass(ctx, bx, 30, bw, bh - 30 + 10, { max: v.max, ml: S.x, step: v.step, big: v.big });
        ctx.restore();
        ctx.save(); ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(zx2, zy2, zr2, 0, 7); ctx.stroke(); ctx.restore();
        R.tag(ctx, W < 640 ? 'Мениск ойысының төменгі жиегі бойынша оқы' : 'Мениск: көзді сұйық деңгейіне қойып, ойыстың төменгі жиегі бойынша оқы', W < 640 ? W / 2 : zx2, zy2 + zr2 + 18, { size: W < 640 ? 9.5 : 10.5 });
        D(ctx, bx + bw + 10, Yf(S.x), zx2 - zr2, zy2);
      } else if (P.inst === 'thermo') {
        var th = table - 40;
        R.thermometer(ctx, W * 0.3, 26, th - 20, S.x, v.min, v.max, { step: v.big });
        var tmin = v.min, tmax = v.max, top = 26 + 6, bot = 26 + th - 20 - 16;
        var Yt = function (t) { return bot - (t - tmin) / (tmax - tmin) * (bot - top - 8); };
        var zx3 = W * 0.68, zy3 = H * 0.42, zr3 = Math.min(H * 0.3, 130), zoom3 = 3.4;
        ctx.save(); ctx.beginPath(); ctx.arc(zx3, zy3, zr3, 0, 7); ctx.clip();
        ctx.fillStyle = '#e9edf0'; ctx.fillRect(zx3 - zr3, zy3 - zr3, zr3 * 2, zr3 * 2);
        ctx.translate(zx3, zy3); ctx.scale(zoom3, zoom3); ctx.translate(-(W * 0.3 + 8), -Yt(S.x));
        R.thermometer(ctx, W * 0.3, 26, th - 20, S.x, v.min, v.max, { step: v.big });
        ctx.restore();
        ctx.save(); ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(zx3, zy3, zr3, 0, 7); ctx.stroke(); ctx.restore();
        D(ctx, W * 0.3 + 32, Yt(S.x), zx3 - zr3, zy3);
      } else {
        // динамометр штативке ілінген, оған жүк ілінген
        var sx = W * 0.3, dl = Math.min(table - 150, 300);
        stand(ctx, sx, 20, table);
        var hook = R.dynamometer(ctx, sx, 30, dl, S.x, v.max, { div: v.step, big: v.big });
        var grams = S.x / 9.8 * 1000;
        R.weight(ctx, hook.x, hook.y, Math.round(grams), { label: '?' });
        var scaleTop = 30 + 12 + 14, scaleLen = dl - 34;
        var yD = scaleTop + S.x / v.max * scaleLen;
        var zx4 = W * 0.68, zy4 = H * 0.42, zr4 = Math.min(H * 0.3, 130), zoom4 = 3.2;
        ctx.save(); ctx.beginPath(); ctx.arc(zx4, zy4, zr4, 0, 7); ctx.clip();
        ctx.fillStyle = '#e9edf0'; ctx.fillRect(zx4 - zr4, zy4 - zr4, zr4 * 2, zr4 * 2);
        ctx.translate(zx4, zy4); ctx.scale(zoom4, zoom4); ctx.translate(-sx, -yD);
        R.dynamometer(ctx, sx, 30, dl, S.x, v.max, { div: v.step, big: v.big });
        ctx.restore();
        ctx.save(); ctx.strokeStyle = '#3b3f45'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(zx4, zy4, zr4, 0, 7); ctx.stroke(); ctx.restore();
        D(ctx, sx + 20, yD, zx4 - zr4, zy4);
      }
      if (P.show) R.tag(ctx, 'c = ' + fmt(v.step, decimals(v.step)) + ' ' + INST[P.inst].unit + ' · көрсетуі ' + fmt(S.x, decimals(v.step)) + ' ' + INST[P.inst].unit, W / 2, H - 16, { size: 13, color: '#0b6b78' });
    },
  });
  // Ұлғайтқышқа нұсқар сызық
  function D(ctx, x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = 'rgba(40,50,60,.45)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  // Зертханалық штатив
  function stand(ctx, x, top, table) {
    var bx = x - 70;
    R.block(ctx, bx - 30, table - 14, 120, 14, 'iron', { depth: 8 });
    var g = ctx.createLinearGradient(bx, 0, bx + 8, 0); g.addColorStop(0, '#6c737a'); g.addColorStop(0.4, '#d5dade'); g.addColorStop(1, '#5c6268');
    ctx.fillStyle = g; ctx.fillRect(bx, top, 8, table - 14 - top);
    ctx.fillStyle = '#3d4247'; ctx.fillRect(bx - 6, top + 6, 20, 16);
    ctx.fillStyle = g; ctx.fillRect(bx + 8, top + 11, x - bx - 4, 6);
  }
})();

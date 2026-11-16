/* Пәтердегі электр желісі: құралдарды қосқан сайын жалпы ток артады. Ток сақтандырғыштың номиналынан асса,
   балқымалы сақтандырғыш күйіп, тізбек үзіледі. Қысқа тұйықталу. */
(function () {
  var R = window.Real;
  var DEV = [['Шам 100 Вт', 100], ['Теледидар 150 Вт', 150], ['Үтік 1000 Вт', 1000], ['Шәйнек 2000 Вт', 2000], ['Шаңсорғыш 1400 Вт', 1400], ['Жылытқыш 1500 Вт', 1500]];
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Құралдарды бір-бірлеп қос. Жалпы ток сақтандырғыштың номиналынан асқанда не болады?',
    controls: [
      { type: 'select', key: 'fuse', label: 'Сақтандырғыш номиналы', value: '16', options: [['6', '6 А'], ['10', '10 А'], ['16', '16 А'], ['25', '25 А']] },
    ].concat(DEV.map(function (d, i) { return { type: 'check', key: 'd' + i, label: d[0], value: i === 0, live: true }; })),
    buttons: [
      { label: 'Қысқа тұйықталу!', onClick: function (api) { api.S.short = true; } },
      { label: 'Сақтандырғышты ауыстыру', onClick: function (api) { api.S.blown = false; api.S.short = false; api.S.heat = 0; } },
    ],
    readouts: [
      { key: 'P', label: 'Қосылған қуат', unit: 'Вт', digits: 0 },
      { key: 'I', label: 'Жалпы ток I = P / U', unit: 'А', digits: 1 },
      { key: 'st', label: 'Сақтандырғыш', text: true },
    ],
    init: function (api) { var S = api.S; S.blown = false; S.heat = 0; S.short = false; S.t = 0; },
    step: function (api, dt) {
      var S = api.S, I = current(api), In = +api.P.fuse; S.t += dt;
      if (S.blown) return;
      S.heat = Math.max(0, S.heat + (I > In ? (I / In) * (I / In) * dt * 0.8 : -dt * 0.5));
      if (S.heat > 1) S.blown = true;
    },
    read: function (api) { var S = api.S, I = S.blown ? 0 : current(api); return { P: power(api), I: I, st: S.blown ? 'КҮЙДІ — тізбек үзілді' : current(api) > +api.P.fuse ? 'қызып жатыр…' : 'қалыпты' }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, I = S.blown ? 0 : current(api);
      R.scene(ctx, W, H, 'wall');
      // электр қалқаны
      var bx = W * 0.06, by = H * 0.12, bw = W * 0.2, bh = H * 0.6;
      ctx.fillStyle = '#d8dade'; R.rr(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.strokeStyle = '#999'; ctx.stroke();
      R.txt(ctx, 'Электр қалқаны', bx + bw / 2, by + 16, { size: 10.5, color: '#333' });
      // балқымалы сақтандырғыш (шыны түтік, ішінде сым)
      var fx = bx + bw / 2, fy = by + bh * 0.45;
      ctx.fillStyle = 'rgba(220,240,250,.85)'; R.rr(ctx, fx - 14, fy - 50, 28, 100, 8); ctx.fill(); ctx.strokeStyle = '#8aa'; ctx.stroke();
      ctx.fillStyle = '#c9ced3'; ctx.fillRect(fx - 16, fy - 54, 32, 14); ctx.fillRect(fx - 16, fy + 40, 32, 14);
      var heat = Math.min(1, S.heat);
      if (!S.blown) { ctx.strokeStyle = 'rgb(' + Math.round(120 + 135 * heat) + ',' + Math.round(110 - 40 * heat) + ',80)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy - 40); ctx.lineTo(fx, fy + 40); ctx.stroke(); }
      else { ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy - 40); ctx.lineTo(fx, fy - 8); ctx.moveTo(fx, fy + 10); ctx.lineTo(fx, fy + 40); ctx.stroke(); ctx.fillStyle = 'rgba(40,40,40,.4)'; ctx.fillRect(fx - 12, fy - 20, 24, 40); }
      R.tag(ctx, P.fuse + ' А', fx, fy + 70, { size: 11 });
      // шина мен розеткалар
      var ry = H * 0.8, ph = -S.t * 60 * Math.min(2, I / 4);
      R.wire(ctx, [[fx, fy + 54], [fx, ry], [W * 0.96, ry]], { color: '#c0392b', phase: ph, current: I > 0 });
      DEV.forEach(function (d, i) {
        var on = P['d' + i], x = W * 0.34 + i * W * 0.105, y = ry - 70;
        R.wire(ctx, [[x, ry], [x, y + 30]], { color: '#c0392b', w: 3 });
        ctx.fillStyle = on ? '#f3f3ef' : '#e2e2dc'; R.rr(ctx, x - 26, y - 24, 52, 54, 6); ctx.fill(); ctx.strokeStyle = '#aaa'; ctx.stroke();
        var lit = on && I > 0;
        if (i === 0) R.bulb(ctx, x, y - 62, 14, lit ? 0.9 : 0);
        else R.block(ctx, x - 18, y - 70, 36, 40, lit ? 'plasticYellow' : { c: '#9aa3ab', t: 'plain' }, { depth: 6, shadow: false });
        R.txt(ctx, d[0].split(' ')[0], x, y + 44, { size: 9.5, color: '#1b2329' });
      });
      if (S.short && !S.blown) { R.flame(ctx, W * 0.6, ry - 6, 30, S.t * 3); }
      R.meter(ctx, W * 0.85, H * 0.28, 46, I, 40, { letter: 'A', step: 10 });
    },
  });
  function power(api) { return DEV.reduce(function (s, d, i) { return s + (api.P['d' + i] ? d[1] : 0); }, 0); }
  function current(api) { return api.S.short ? 400 : power(api) / 220; }
})();

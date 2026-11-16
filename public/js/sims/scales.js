/* Масса өлшеу: тең иінді зертханалық таразы және гирлер жиынтығы. Гирді басып, табаққа қой немесе ал. */
(function () {
  var R = window.Real;
  var OBJ = {
    apple: { name: 'Алма', m: 157.4, draw: 'apple' }, key: { name: 'Кілт', m: 23.6, draw: 'key' }, stone: { name: 'Тас', m: 86.2, draw: 'stone' },
    eraser: { name: 'Өшіргіш', m: 12.7, draw: 'eraser' }, unknown: { name: 'Белгісіз жүк', m: 0, draw: 'box' },
  };
  // Гирлер жиынтығы, г
  var SET = [100, 50, 20, 20, 10, 5, 2, 2, 1, 0.5, 0.2, 0.2, 0.1];
  function label(m) { return m >= 1 ? m + ' г' : Math.round(m * 1000) + ' мг'; }
  function onPan(api) { return SET.reduce(function (s, m, i) { return s + (api.S.on[i] ? m : 0); }, 0); }
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Төмендегі қораптағы гирлерді басып, оң табаққа қой. Таразы теңгерілгенде гирлердің массаларын қос.',
    controls: [
      { type: 'select', key: 'obj', label: 'Өлшенетін дене', value: 'apple', options: Object.keys(OBJ).map(function (k) { return [k, OBJ[k].name]; }) },
    ],
    buttons: [{ label: 'Гирлерді алу', onClick: function (api) { api.S.on = SET.map(function () { return false; }); } }],
    readouts: [
      { key: 'w', label: 'Оң табақтағы гирлер', unit: 'г', digits: 1 },
      { key: 'st', label: 'Таразы күйі', text: true },
    ],
    init: function (api) {
      var S = api.S;
      S.on = SET.map(function () { return false; }); S.ang = 0; S.om = 0;
      S.m = OBJ[api.P.obj].m || Math.round((15 + Math.random() * 170) * 10) / 10;
    },
    step: function (api, dt) {
      var S = api.S, diff = S.m - onPan(api);
      var target = -Math.max(-0.22, Math.min(0.22, diff * 0.02)); // дене ауыр болса, сол табақ төмендейді
      if (Math.abs(diff) < 0.05) target = 0;
      // демпферленген тербеліс
      S.om += ((target - S.ang) * 40 - S.om * 4.5) * dt;
      S.ang += S.om * dt;
    },
    read: function (api) {
      var d = api.S.m - onPan(api);
      return { w: onPan(api), st: Math.abs(d) < 0.05 ? 'Теңгерілді: дененің массасы ' + Sim.fmt(onPan(api), 1) + ' г' : d > 0 ? 'Дене ауыр — гир қос' : 'Гирлер ауыр — гир ал' };
    },
    pointer: {
      down: function (api, p) {
        (api.S.hit || []).forEach(function (h) { if (p.x > h.x && p.x < h.x + h.w && p.y > h.y && p.y < h.y + h.h) api.S.on[h.i] = !api.S.on[h.i]; });
      },
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, table = H * 0.72;
      R.scene(ctx, W, H, 'lab', { table: table });
      var cx = W * 0.42, post = table - 210, arm = Math.min(W * 0.26, 220);
      // тұғыр мен тірек
      R.block(ctx, cx - 120, table - 18, 240, 18, 'oak', { depth: 10 });
      var g = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0); g.addColorStop(0, '#8f7a3a'); g.addColorStop(0.4, '#f0d98a'); g.addColorStop(1, '#7d6a2c');
      ctx.fillStyle = g; ctx.fillRect(cx - 7, post, 14, table - 18 - post);
      // иінтірек
      var a = S.ang, ex = Math.cos(a) * arm, ey = Math.sin(a) * arm;
      ctx.save(); ctx.translate(cx, post); ctx.rotate(a);
      var bg = ctx.createLinearGradient(0, -5, 0, 5); bg.addColorStop(0, '#f2e1a0'); bg.addColorStop(0.5, '#c9a24a'); bg.addColorStop(1, '#7d6524');
      ctx.fillStyle = bg; R.rr(ctx, -arm - 6, -5, arm * 2 + 12, 10, 4); ctx.fill();
      ctx.fillStyle = '#5b4a1a'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-6, 6); ctx.lineTo(6, 6); ctx.closePath(); ctx.fill();
      // стрелка
      ctx.strokeStyle = '#3a3020'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 110); ctx.stroke();
      ctx.restore();
      // шкала (стрелка үшін)
      ctx.save(); ctx.fillStyle = '#f7f3e6'; R.rr(ctx, cx - 34, post + 96, 68, 18, 4); ctx.fill(); ctx.strokeStyle = '#8a7a50'; ctx.stroke();
      for (var t = -5; t <= 5; t++) { ctx.strokeStyle = t === 0 ? '#c0392b' : '#333'; ctx.lineWidth = t === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(cx + t * 6, post + 98); ctx.lineTo(cx + t * 6, post + (t === 0 ? 112 : 106)); ctx.stroke(); }
      ctx.restore();
      // табақтар
      [[-1, 'left'], [1, 'right']].forEach(function (sd) {
        var hx = cx + sd[0] * ex, hy = post + sd[0] * ey, py = hy + 120;
        ctx.strokeStyle = '#6b6b60'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 42, py); ctx.moveTo(hx, hy); ctx.lineTo(hx + 42, py); ctx.stroke();
        var pg = ctx.createLinearGradient(0, py - 4, 0, py + 10); pg.addColorStop(0, '#f6e6a8'); pg.addColorStop(1, '#a8862e');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(hx, py + 2, 50, 9, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#e8d38c'; ctx.beginPath(); ctx.ellipse(hx, py + 2, 50, 4, 0, 0, 7); ctx.fill();
        if (sd[1] === 'left') body(ctx, hx, py, OBJ[api.P.obj].draw);
        else {
          var x = hx - 38;
          SET.forEach(function (m, i) {
            if (!S.on[i]) return;
            var s = Math.cbrt(m / 100), w = Math.max(6, 22 * s), h = Math.max(4, 24 * s);
            if (m >= 1) R.cylinder(ctx, x, py - h, w, h, 'brass', { shadow: false });
            else { ctx.fillStyle = '#c9ced3'; ctx.fillRect(x, py - 3, 8, 3); }
            x += w + 2;
          });
        }
      });
      // гирлер қорабы
      var bx = W * 0.72, by = H * 0.08, bw = W * 0.25, bh = H * 0.56;
      ctx.save(); ctx.fillStyle = '#5a2a1c'; R.rr(ctx, bx, by, bw, bh, 8); ctx.fill();
      ctx.fillStyle = '#7d2f2a'; R.rr(ctx, bx + 6, by + 6, bw - 12, bh - 12, 6); ctx.fill(); ctx.restore();
      R.txt(ctx, 'Гирлер (басып ал)', bx + bw / 2, by + 18, { size: 11, color: '#f5e7c8' });
      S.hit = [];
      var cols = 3, cw = (bw - 20) / cols, ch = (bh - 40) / Math.ceil(SET.length / cols);
      SET.forEach(function (m, i) {
        var c = i % cols, r = Math.floor(i / cols), x = bx + 10 + c * cw, y = by + 30 + r * ch;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; R.rr(ctx, x + 3, y + 3, cw - 6, ch - 6, 5); ctx.fill();
        if (!S.on[i]) {
          if (m >= 1) { var s = Math.cbrt(m / 100), w = 22 * s + 4, h = 24 * s + 4; R.cylinder(ctx, x + cw / 2 - w / 2, y + ch / 2 - h / 2, w, h, 'brass', { shadow: false }); }
          else { ctx.fillStyle = '#c9ced3'; ctx.fillRect(x + cw / 2 - 8, y + ch / 2 - 3, 16, 5); }
        }
        R.txt(ctx, label(m), x + cw / 2, y + ch - 10, { size: 9.5, color: S.on[i] ? '#d9b07a' : '#fff3d6' });
        S.hit.push({ x: x, y: y, w: cw, h: ch, i: i });
      });
    },
  });
  // Табақтағы дене
  function body(ctx, x, y, kind) {
    if (kind === 'apple') { R.sphere(ctx, x, y - 22, 22, '#c8322a'); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y - 42); ctx.lineTo(x + 3, y - 52); ctx.stroke(); ctx.fillStyle = '#4f9a3a'; ctx.beginPath(); ctx.ellipse(x + 9, y - 50, 7, 3.5, -0.4, 0, 7); ctx.fill(); }
    else if (kind === 'key') { ctx.save(); ctx.fillStyle = '#d4b04a'; ctx.beginPath(); ctx.arc(x - 16, y - 7, 8, 0, 7); ctx.fill(); ctx.fillRect(x - 10, y - 9, 34, 5); ctx.fillRect(x + 14, y - 9, 4, 8); ctx.fillRect(x + 20, y - 9, 4, 6); ctx.fillStyle = '#8b6f1c'; ctx.beginPath(); ctx.arc(x - 16, y - 7, 3, 0, 7); ctx.fill(); ctx.restore(); }
    else if (kind === 'stone') { ctx.save(); var g = ctx.createRadialGradient(x - 8, y - 22, 3, x, y - 14, 28); g.addColorStop(0, '#c2bcb2'); g.addColorStop(1, '#6c665e'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.quadraticCurveTo(x - 30, y - 22, x - 6, y - 30); ctx.quadraticCurveTo(x + 22, y - 32, x + 26, y - 10); ctx.quadraticCurveTo(x + 26, y, x - 26, y); ctx.fill(); ctx.restore(); }
    else if (kind === 'eraser') R.block(ctx, x - 18, y - 12, 36, 12, 'plasticRed', { depth: 6, shadow: false });
    else R.block(ctx, x - 22, y - 30, 44, 30, 'pine', { depth: 8, shadow: false, label: '?' });
  }
})();

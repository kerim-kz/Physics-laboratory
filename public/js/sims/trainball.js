/* Инерциялық және инерциялық емес санақ жүйелері: вагон еденіндегі шар (үйкеліссіз), төбедегі маятник және стақандағы су.
   Вагон бірқалыпты қозғалғанда бәрі тыныштықта; үдемелі қозғалғанда шар вагонға қатысты «өздігінен» қозғалады — бірақ Жерге қатысты өз жылдамдығын сақтайды. */
(function () {
  var R = window.Real, g = 9.81;
  var MODES = { uniform: ['Бірқалыпты (v = 3 м/с)', 3, 0], accel: ['Орнынан қозғалып, жылдамдайды (a = 1,5 м/с²)', 0, 1.5], brake: ['Тежеледі (v₀ = 6 м/с, a = −2 м/с²)', 6, -2] };
  var CAR = 10, LP = 1.2; // вагон ұзындығы (м), маятник жібі (м)
  function trainV(m, t) { var M = MODES[m]; return Math.max(0, M[1] + M[2] * t); }
  function trainX(m, t) { var M = MODES[m]; if (M[2] < 0) { var ts = Math.min(t, M[1] / -M[2]); return M[1] * ts + M[2] * ts * ts / 2; } return M[1] * t + M[2] * t * t / 2; }
  function trainA(m, t) { var M = MODES[m]; return M[2] < 0 && t >= M[1] / -M[2] ? 0 : M[2]; }
  Sim.create({
    aspect: 0.56, grid: false,
    hint: 'Режимді «Жылдамдайды» етіп, санақ жүйесін ауыстырып көр. Вагонмен байланысты жүйеде шарға ешқандай күш әсер етпесе де, ол неге үдемелі қозғалады?',
    controls: [
      { type: 'select', key: 'mode', label: 'Вагонның қозғалысы', value: 'accel', options: Object.keys(MODES).map(function (k) { return [k, MODES[k][0]]; }) },
      { type: 'select', key: 'frame', label: 'Санақ жүйесі', value: 'ground', options: [['ground', 'Жермен байланысты (перронда тұрған бақылаушы)'], ['car', 'Вагонмен байланысты (вагондағы жолаушы)']], live: true },
    ],
    readouts: [
      { key: 'vt', label: 'Вагонның жылдамдығы (Жерге қатысты)', unit: 'м/с', digits: 2 },
      { key: 'a', label: 'Вагонның үдеуі', unit: 'м/с²', digits: 1 },
      { key: 'vb', label: 'Шардың жылдамдығы Жерге қатысты', unit: 'м/с', digits: 2 },
      { key: 'vr', label: 'Шардың жылдамдығы вагонға қатысты', unit: 'м/с', digits: 2 },
      { key: 'th', label: 'Маятниктің ауытқу бұрышы', unit: '°', digits: 1 },
    ],
    init: function (api) {
      var S = api.S; S.t = 0; S.rel = 0; S.hit = false; S.th = 0; S.w = 0; S.tilt = 0;
      S.vb = MODES[api.P.mode][1]; // шардың Жерге қатысты жылдамдығы (бастапқыда вагонмен бірдей)
    },
    step: function (api, dt) {
      var S = api.S, m = api.P.mode, n = 8;
      for (var i = 0; i < n; i++) {
        var h = dt * 0.7 / n, t = S.t;
        var a = trainA(m, t);
        // шар: үйкеліс жоқ, Жерге қатысты жылдамдығы тұрақты; вагон қабырғасына жеткенде онымен бірге қозғалады
        if (!S.hit) { S.rel = (MODES[m][1] * (t + h) - trainX(m, t + h)); if (Math.abs(S.rel) >= CAR / 2 - 0.4) { S.rel = Math.sign(S.rel) * (CAR / 2 - 0.4); S.hit = true; } }
        S.vb = S.hit ? trainV(m, t + h) : MODES[m][1];
        // маятник (вагон жүйесінде): θ'' = −(g/L)sinθ − (a/L)cosθ − γθ'
        S.w += (-(g / LP) * Math.sin(S.th) - (a / LP) * Math.cos(S.th) - 1.6 * S.w) * h; S.th += S.w * h;
        S.tilt += (Math.atan(a / g) - S.tilt) * Math.min(1, h * 4);
        S.t += h;
      }
      if (S.t > 3.2) return false;
    },
    read: function (api) {
      var S = api.S, m = api.P.mode, vt = trainV(m, S.t);
      return { vt: vt, a: trainA(m, S.t), vb: S.vb, vr: S.vb - vt, th: S.th * 180 / Math.PI };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, m = P.mode;
      var ground = H * 0.84, carW = P.frame === 'car' ? W * 0.62 : W * 0.48, ppm = carW / CAR;
      var x0 = P.frame === 'car' ? W / 2 - carW / 2 : W * 0.03;
      var xs = trainX(m, S.t) * ppm; // вагонның жылжуы (px)
      var carX = P.frame === 'car' ? x0 : x0 + xs, cam = P.frame === 'car' ? xs : 0;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true });
      // перрон бағаналары (Жермен байланысты)
      for (var k = -2; k < 40; k++) {
        var px = W * 0.06 + k * 2 * ppm - cam;
        if (px < -20 || px > W + 20) continue;
        ctx.fillStyle = '#5b636b'; ctx.fillRect(px - 2, ground - 70, 4, 70);
        ctx.fillStyle = '#e8b82e'; ctx.fillRect(px - 6, ground - 74, 12, 5);
        if (k % 2 === 0) R.txt(ctx, k * 2 + ' м', px, ground - 82, { size: 9.5, color: R.isDark() ? '#e6ecf0' : '#1d2a33', weight: '600' });
      }
      // рельстер мен шпалдар
      ctx.fillStyle = '#6a5a4a'; for (var q = -cam % 22 - 22; q < W + 22; q += 22) ctx.fillRect(q, ground + 6, 12, 6);
      ctx.fillStyle = '#8d959c'; ctx.fillRect(0, ground + 3, W, 4);
      // вагон (бүйір қабырғасы алынған — ішін көреміз)
      var top = ground - Math.min(H * 0.62, carW * 0.36), floor = ground - 18;
      ctx.save();
      R.rr(ctx, carX - 6, top - 8, carW + 12, floor - top + 16, 14);
      var body = ctx.createLinearGradient(0, top, 0, floor); body.addColorStop(0, '#2f6fae'); body.addColorStop(1, '#1d4c7d');
      ctx.fillStyle = body; ctx.fill();
      ctx.fillStyle = R.isDark() ? '#d9dfe4' : '#f1ede4'; ctx.fillRect(carX + 6, top + 6, carW - 12, floor - top - 10); // ішкі қабырға
      for (var wdw = 0; wdw < 4; wdw++) { var wx = carX + 20 + wdw * (carW - 40) / 4; ctx.fillStyle = 'rgba(150,200,235,.75)'; R.rr(ctx, wx, top + 18, (carW - 40) / 4 - 14, (floor - top) * 0.32, 6); ctx.fill(); }
      ctx.fillStyle = '#8b6a45'; ctx.fillRect(carX + 6, floor - 10, carW - 12, 10); // еден
      ctx.restore();
      [0.18, 0.82].forEach(function (f) { R.wheel(ctx, carX + carW * f - 22, ground - 4, 14, xs / 14); R.wheel(ctx, carX + carW * f + 22, ground - 4, 14, xs / 14); });
      // маятник (төбеде)
      var px0 = carX + carW * 0.3, py0 = top + 8, Lpx = Math.min((floor - top) * 0.55, 1.2 * ppm * 1.4);
      var bxp = px0 + Math.sin(S.th) * Lpx, byp = py0 + Math.cos(S.th) * Lpx;
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(bxp, byp); ctx.stroke();
      ctx.fillStyle = '#555'; ctx.fillRect(px0 - 10, py0 - 4, 20, 5);
      R.sphere(ctx, bxp, byp, 9, '#c9a24a');
      ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px0, py0 + Lpx + 12); ctx.stroke(); ctx.restore();
      // сөредегі стақан су
      var inner = floor - top, gw = Math.max(20, inner * 0.17), gh = inner * 0.24, sh = inner * 0.3, gx = carX + carW * 0.7, gy = floor - 10 - sh - gh;
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(gx - gw * 0.6, gy + gh, gw * 2.2, 6); ctx.fillRect(gx - gw * 0.5, gy + gh + 6, 5, sh); ctx.fillRect(gx + gw * 1.4, gy + gh + 6, 5, sh);
      ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
      var lev = gy + gh * 0.45, tt = Math.tan(S.tilt);
      ctx.fillStyle = 'rgba(80,150,215,.7)'; ctx.beginPath(); ctx.moveTo(gx, lev - tt * gw / 2); ctx.lineTo(gx + gw, lev + tt * gw / 2); ctx.lineTo(gx + gw, gy + gh); ctx.lineTo(gx, gy + gh); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2; ctx.strokeRect(gx, gy, gw, gh);
      // шар еденде
      var r = 10, bx = carX + carW / 2 + S.rel * ppm;
      R.sphere(ctx, bx, floor - 10 - r, r, '#d8473b', { shadowY: floor - 10 });
      R.tag(ctx, 'Шар (үйкеліссіз)', bx, floor - 10 - r * 2 - 14, { size: 10 });
      // жылдамдық векторлары
      var vs = Math.min(18, W / 40), vt = trainV(m, S.t), relV = S.vb - vt;
      var dispTrain = P.frame === 'car' ? 0 : vt, dispBall = P.frame === 'car' ? relV : S.vb;
      if (Math.abs(dispTrain) > 0.05) R.force(ctx, carX + carW / 2, top - 22, carX + carW / 2 + dispTrain * vs, top - 22, '#1f5fd1', 'v вагон');
      if (Math.abs(dispBall) > 0.05) R.force(ctx, bx, floor - 10 - r, bx + dispBall * vs, floor - 10 - r, '#d2382b', 'v шар');
      var frameTxt = P.frame === 'car' ? 'Вагонмен байланысты санақ жүйесі' + (Math.abs(trainA(m, S.t)) > 0 ? ' — ИНЕРЦИЯЛЫҚ ЕМЕС' : ' — инерциялық') : 'Жермен байланысты санақ жүйесі — инерциялық';
      R.tag(ctx, frameTxt, W / 2, 20, { size: W < 600 ? 10 : 12, color: P.frame === 'car' && Math.abs(trainA(m, S.t)) > 0 ? '#b4342a' : '#0b6b78' });
    },
  });
})();

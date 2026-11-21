/* Вакуумдегі электр тогы: электрондық-сәулелік түтік. Қыздырылған катодтан шыққан электрондар анод кернеуімен үдетіледі (eU = mv²/2), содан кейін ауытқытушы пластиналардың өрісінде параболамен қозғалып, экранда жарқыраған нүкте береді. */
(function () {
  var R = window.Real, e = 1.602e-19, me = 9.109e-31;
  var lp = 0.04, dp = 0.01, Ls = 0.16; // пластиналар ұзындығы, арақашықтығы; пластиналардан экранға дейін
  Sim.create({
    aspect: 0.55, aspectNarrow: 0.9, grid: false, keepRunning: true, autoplay: true,
    hint: 'Анод кернеуін және пластиналардағы кернеуді өзгерт. Экрандағы нүктенің ығысуы неге анод кернеуі артқанда азаяды?',
    controls: [
      { type: 'range', key: 'Ua', label: 'Үдетуші (анод) кернеу U<sub>a</sub>', min: 200, max: 2000, step: 50, value: 1000, unit: 'В', digits: 0, live: true },
      { type: 'range', key: 'Uy', label: 'Ауытқытушы кернеу U<sub>y</sub>', min: -100, max: 100, step: 5, value: 40, unit: 'В', digits: 0, live: true },
    ],
    readouts: [
      { key: 'v', label: 'Электрон жылдамдығы v = √(2eU/m)', unit: 'Мм/с', digits: 1 },
      { key: 'y1', label: 'Пластиналардан шыққандағы ығысу', unit: 'мм', digits: 2 },
      { key: 'Y', label: 'Экрандағы ығысу', unit: 'мм', digits: 1 },
      { key: 'E', label: 'Пластиналар арасындағы өріс E', unit: 'кВ/м', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; api.S.dots = []; },
    step: function (api, dt) { var S = api.S; S.t += dt; S.dots.push(0); S.dots = S.dots.map(function (u) { return u + dt * 0.9; }).filter(function (u) { return u < 1; }); },
    read: function (api) { var c = calc(api.P); return { v: c.v / 1e6, y1: c.y1 * 1000, Y: c.Y * 1000, E: api.P.Uy / dp / 1000 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, c = calc(P), wide = W > 640;
      R.scene(ctx, W, H, 'lab', { table: H * 0.95 });
      var cy = H * 0.45, x0 = wide ? W * 0.06 : 12, x1 = W - (wide ? 60 : 20), sc = (x1 - x0) / 0.3; // м → px
      // шыны колба
      ctx.save(); ctx.beginPath(); ctx.moveTo(x0, cy - 28); ctx.lineTo(x0 + 0.1 * sc, cy - 28); ctx.lineTo(x1 - 6, cy - H * 0.36); ctx.quadraticCurveTo(x1 + 8, cy, x1 - 6, cy + H * 0.36); ctx.lineTo(x0 + 0.1 * sc, cy + 28); ctx.lineTo(x0, cy + 28); ctx.closePath();
      ctx.fillStyle = 'rgba(200,225,240,.25)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,120,140,.85)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      // экран (люминофор)
      ctx.fillStyle = 'rgba(120,200,140,.25)'; ctx.beginPath(); ctx.moveTo(x1 - 6, cy - H * 0.36); ctx.quadraticCurveTo(x1 + 8, cy, x1 - 6, cy + H * 0.36); ctx.lineTo(x1 - 12, cy + H * 0.36); ctx.quadraticCurveTo(x1 + 2, cy, x1 - 12, cy - H * 0.36); ctx.fill();
      // катод (қыздыру спиралі) және анод
      var xc = x0 + 0.012 * sc, xa = x0 + 0.05 * sc, xp = x0 + 0.1 * sc, xs = xp + lp * sc + Ls * sc;
      ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 2; ctx.beginPath(); for (var k = 0; k <= 12; k++) ctx.lineTo(xc - 6 + (k % 2) * 6, cy - 12 + k * 2); ctx.stroke();
      R.tag(ctx, 'катод (−)', xc, cy + 44, { size: 9.5 });
      ctx.fillStyle = '#7d878f'; ctx.fillRect(xa - 3, cy - 26, 6, 21); ctx.fillRect(xa - 3, cy + 5, 6, 21); R.tag(ctx, 'анод (+)', xa, cy - 40, { size: 9.5 });
      // ауытқытушы пластиналар
      var pd = dp / 2 * sc * 3;
      R.block(ctx, xp, cy - pd - 6, lp * sc, 6, 'copper', { depth: 2, shadow: false }); R.block(ctx, xp, cy + pd, lp * sc, 6, 'copper', { depth: 2, shadow: false });
      R.txt(ctx, P.Uy >= 0 ? '+' : '−', xp + lp * sc / 2, cy - pd - 16, { size: 13, weight: '700', color: P.Uy >= 0 ? '#b4342a' : '#1f5fd1' }); R.txt(ctx, P.Uy >= 0 ? '−' : '+', xp + lp * sc / 2, cy + pd + 18, { size: 13, weight: '700', color: P.Uy >= 0 ? '#1f5fd1' : '#b4342a' });
      // сәуле траекториясы (ығысу көрнекілік үшін 1:1 масштабта, бірақ пластиналар арасы үлкейтілген)
      var ky = 3 * sc, traj = function (x) { // x — м, пластиналардың басынан
        if (x <= 0) return 0; if (x <= lp) return c.a / 2 * Math.pow(x / c.v, 2); return c.y1 + c.vy / c.v * (x - lp);
      };
      var hit = Math.abs(c.y1) >= dp / 2;
      ctx.strokeStyle = 'rgba(80,220,120,.65)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xc, cy);
      var xend = hit ? xp + c.xhit * sc : xs;
      for (var X = xc; X <= xend; X += 2) { var xm = (X - xp) / sc; ctx.lineTo(X, cy - traj(xm) * ky); } ctx.stroke();
      // қозғалатын электрондар
      S.dots.forEach(function (u) { var X = xc + u * (xend - xc), xm = (X - xp) / sc; ctx.fillStyle = '#1f5fd1'; ctx.beginPath(); ctx.arc(X, cy - traj(xm) * ky, 2.4, 0, 7); ctx.fill(); });
      if (!hit) { var ys = cy - c.Y * ky, g = ctx.createRadialGradient(xs - 8, ys, 1, xs - 8, ys, 16); g.addColorStop(0, 'rgba(190,255,190,1)'); g.addColorStop(1, 'rgba(80,220,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(xs - 8, ys, 16, 0, 7); ctx.fill(); }
      else R.tag(ctx, 'Сәуле пластинаға тиді!', xp + lp * sc / 2, cy + pd + 40, { size: 10.5, color: '#b4342a' });
      R.tag(ctx, 'eU = mv²/2;   y = eUy·l² / (2md·v²)', W / 2, H - 18, { size: W < 600 ? 9.5 : 11.5, color: '#0b6b78' });
      R.txt(ctx, 'Көлденең ығысулар көрнекілік үшін 3 есе үлкейтілген', W / 2, 16, { size: 9.5, color: '#5b6670' });
    },
  });
  function calc(P) {
    var v = Math.sqrt(2 * e * P.Ua / me), a = e * P.Uy / (me * dp), t = lp / v, y1 = a * t * t / 2, vy = a * t, Y = y1 + vy / v * Ls, xhit = lp;
    if (Math.abs(y1) >= dp / 2) { var th = Math.sqrt(dp / Math.abs(a)); xhit = v * th; }
    return { v: v, a: a, y1: y1, vy: vy, Y: Y, xhit: xhit };
  }
})();

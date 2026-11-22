/* Электр энергиясын тасымалдау: электр станциясы → жоғарылатқыш трансформатор → беріліс желісі → төмендеткіш трансформатор → қала. Желідегі шығын ΔP = P²R/U². Қазақстан энергетикасы. */
(function () {
  var R = window.Real;
  var SRC = {
    coal: ['Жылу электр станциясы (көмір)', '#59616a'], hydro: ['Су электр станциясы', '#2f7fd1'], wind: ['Жел электр станциясы', '#0b8a7a'], solar: ['Күн электр станциясы', '#e0a800'], nuclear: ['Атом электр станциясы', '#7a3fb0'],
  };
  Sim.create({
    aspect: 0.55, aspectNarrow: 1.2, grid: false, keepRunning: true, autoplay: true,
    hint: 'Беріліс кернеуін арттырып, желідегі шығынның қалай азаятынын бақыла. Неліктен Екібастұз — Көкшетау желісінің кернеуі 1150 кВ болып жобаланған?',
    controls: [
      { type: 'select', key: 'src', label: 'Электр станциясы', value: 'coal', options: Object.keys(SRC).map(function (k) { return [k, SRC[k][0]]; }) },
      { type: 'range', key: 'P', label: 'Берілетін қуат P', min: 10, max: 1000, step: 10, value: 300, unit: 'МВт', digits: 0 },
      { type: 'range', key: 'U', label: 'Беріліс кернеуі U', min: 10, max: 1150, step: 10, value: 220, unit: 'кВ', digits: 0, live: true },
      { type: 'range', key: 'L', label: 'Желінің ұзындығы', min: 50, max: 1000, step: 50, value: 400, unit: 'км', digits: 0 },
    ],
    readouts: [
      { key: 'I', label: 'Желідегі ток I = P/U', unit: 'А', digits: 0 },
      { key: 'R', label: 'Сымдардың кедергісі (0,03 Ом/км)', unit: 'Ом', digits: 1 },
      { key: 'dP', label: 'Шығын ΔP = I²R', unit: 'МВт', digits: 2 },
      { key: 'pct', label: 'Шығын үлесі', unit: '%', digits: 2 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var c = calc(api.P); return { I: c.I, R: c.R, dP: c.dP / 1e6, pct: c.pct }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, c = calc(P), wide = W > 640, ground = wide ? H * 0.72 : H * 0.5;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true });
      var xs = wide ? W * 0.08 : W * 0.1, xt1 = wide ? W * 0.22 : W * 0.28, xt2 = wide ? W * 0.74 : W * 0.72, xc = wide ? W * 0.9 : W * 0.9;
      // станция
      var col = SRC[P.src][1];
      ctx.fillStyle = col; ctx.fillRect(xs - 34, ground - 56, 68, 56); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(xs - 26, ground - 46, 14, 12); ctx.fillRect(xs - 4, ground - 46, 14, 12);
      if (P.src === 'coal' || P.src === 'nuclear') { ctx.fillStyle = '#8f99a3'; ctx.fillRect(xs + 14, ground - 96, 14, 42); for (var k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(200,200,200,' + (0.5 - k * 0.12) + ')'; ctx.beginPath(); ctx.arc(xs + 21 + k * 10 + Math.sin(S.t + k) * 3, ground - 104 - k * 14 - (S.t * 10 % 14), 8 + k * 3, 0, 7); ctx.fill(); } }
      if (P.src === 'wind') { ctx.strokeStyle = '#e6ebef'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xs, ground - 56); ctx.lineTo(xs, ground - 110); ctx.stroke(); for (var b = 0; b < 3; b++) { var a = S.t * 2 + b * 2.094; ctx.beginPath(); ctx.moveTo(xs, ground - 110); ctx.lineTo(xs + Math.cos(a) * 30, ground - 110 + Math.sin(a) * 30); ctx.stroke(); } }
      if (P.src === 'solar') { ctx.fillStyle = '#1f3f6d'; for (var p = 0; p < 3; p++) ctx.fillRect(xs - 40 + p * 28, ground - 72, 24, 14); }
      if (P.src === 'hydro') { ctx.fillStyle = 'rgba(90,160,225,.6)'; ctx.fillRect(xs - 60, ground - 30, 26, 30); }
      R.tag(ctx, SRC[P.src][0], xs + 10, ground + 16, { size: W < 600 ? 8.5 : 10 });
      // трансформаторлар
      function trafo(x, lbl) { R.block(ctx, x - 18, ground - 40, 36, 40, 'steel', { depth: 3 }); R.tag(ctx, lbl, x, ground - 54, { size: 9.5 }); }
      trafo(xt1, '↑ ' + P.U + ' кВ'); trafo(xt2, '↓ 0,4 кВ');
      // тіректер мен сымдар
      var nT = wide ? 5 : 3, ty = ground - (wide ? 120 : 90);
      var towers = []; for (var i = 0; i <= nT; i++) towers.push(xt1 + 30 + (xt2 - xt1 - 60) * i / nT);
      towers.forEach(function (x) { ctx.strokeStyle = '#6b7178'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 12, ground); ctx.lineTo(x, ty - 10); ctx.lineTo(x + 12, ground); ctx.moveTo(x - 16, ty); ctx.lineTo(x + 16, ty); ctx.stroke(); });
      var heat = Math.min(1, c.pct / 15);
      ctx.strokeStyle = 'rgb(' + Math.round(60 + 195 * heat) + ',' + Math.round(70 - 20 * heat) + ',' + Math.round(80 - 60 * heat) + ')'; ctx.lineWidth = 2 + heat * 2;
      [-12, 12].forEach(function (dy) { ctx.beginPath(); ctx.moveTo(xt1, ground - 40); for (var j = 0; j < towers.length; j++) { var x0 = j ? towers[j - 1] : xt1, x1 = towers[j]; ctx.quadraticCurveTo((x0 + x1) / 2, ty + dy + 16, x1, ty + dy * 0.2); } ctx.quadraticCurveTo((towers[towers.length - 1] + xt2) / 2, ty + 20, xt2, ground - 40); ctx.stroke(); });
      if (heat > 0.05) for (var h = 0; h < 8; h++) { var hx = xt1 + (xt2 - xt1) * ((h + 0.5) / 8), hy = ty + 14 - ((S.t * 20 + h * 9) % 30); ctx.strokeStyle = 'rgba(224,118,27,' + heat * 0.6 + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + 4, hy - 6, hx, hy - 12); ctx.stroke(); }
      // энергия ағыны (нүктелер)
      for (var e = 0; e < 10; e++) { var u = ((e / 10 + S.t * 0.12) % 1), xx = xt1 + (xt2 - xt1) * u; ctx.fillStyle = 'rgba(255,230,90,' + (1 - c.pct / 100 * u) + ')'; ctx.beginPath(); ctx.arc(xx, ty + 4 + Math.sin(u * Math.PI * nT) * 6, 3, 0, 7); ctx.fill(); }
      // қала
      for (var q = 0; q < 4; q++) { var hx2 = xc - 30 + q * 16, hh = 24 + (q % 2) * 18; ctx.fillStyle = '#c3cad1'; ctx.fillRect(hx2, ground - hh, 14, hh); ctx.fillStyle = 'rgba(255,220,120,' + (0.4 + 0.5 * (1 - c.pct / 100)) + ')'; for (var r = 0; r < hh / 8 - 1; r++) ctx.fillRect(hx2 + 3, ground - hh + 4 + r * 8, 8, 4); }
      R.tag(ctx, 'Тұтынушылар', xc - 4, ground + 16, { size: 10 });
      // нәтиже панелі
      var px = W / 2, py = wide ? ground + (H - ground) / 2 : ground + (H - ground) * 0.5;
      ctx.save(); R.rr(ctx, px - Math.min(W * 0.45, 330), py - 40, Math.min(W * 0.9, 660), 80, 10); ctx.fillStyle = R.isDark() ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.93)'; ctx.fill(); ctx.restore();
      R.txt(ctx, 'Желіде жоғалады: ' + (c.dP / 1e6).toFixed(1).replace('.', ',') + ' МВт (' + c.pct.toFixed(1).replace('.', ',') + ' %)', px, py - 16, { size: W < 600 ? 12 : 15, weight: '700', color: c.pct > 10 ? '#b4342a' : '#0b6b78' });
      R.txt(ctx, 'ΔP = P²R / U² — кернеуді 10 есе арттырсақ, шығын 100 есе азаяды', px, py + 14, { size: W < 600 ? 9.5 : 11.5, color: '#5b6670' });
    },
  });
  function calc(P) { var Pw = P.P * 1e6, U = P.U * 1e3, I = Pw / U, Rw = 0.03 * P.L, dP = Math.min(Pw, I * I * Rw); return { I: I, R: Rw, dP: dP, pct: dP / Pw * 100 }; }
})();

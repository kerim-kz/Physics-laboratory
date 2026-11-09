/* Айнымалы ток генераторы: магнит өрісінде айналатын рамка. Φ = BS·cos ωt, e = NBSω·sin ωt. */
(function () {
  Sim.create({
    aspect: 0.62, autoplay: true, keepRunning: true, substeps: 4,
    tools: ['stopwatch'],
    hint: 'Рамка айналғанда ағын өзгереді — шамның жарығы мен ЭҚК графигін бақыла.',
    controls: [
      { type: 'range', key: 'nu', label: 'Айналу жиілігі ν', min: 0.1, max: 2, step: 0.05, value: 0.5, unit: 'Гц', digits: 2, live: true },
      { type: 'range', key: 'N', label: 'Орам саны N', min: 10, max: 300, step: 10, value: 100, digits: 0, live: true },
      { type: 'range', key: 'B', label: 'Магнит индукциясы B', min: 0.05, max: 0.5, step: 0.05, value: 0.2, unit: 'Тл', digits: 2, live: true },
      { type: 'range', key: 'S', label: 'Рамка ауданы S', min: 50, max: 400, step: 10, value: 200, unit: 'см²', digits: 0, live: true },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с' },
      { key: 'phi', label: 'Бір орамның магнит ағыны Φ', unit: 'мВб', digits: 2 },
      { key: 'e', label: 'ЭҚК лездік мәні e', unit: 'В' },
      { key: 'em', label: 'ЭҚК амплитудасы Em = NBSω', unit: 'В' },
      { key: 'ed', label: 'Әсерлік мәні Em/√2', unit: 'В' },
      { key: 'T', label: 'Период T = 1/ν', unit: 'с' },
    ],
    init: function (api) { api.S.t = 0; api.S.th = 0; api.S.h = []; api.S.hl = -1; },
    onLive: function () {},
    step: function (api, dt) {
      var S = api.S, P = api.P;
      S.t += dt; S.th += 2 * Math.PI * P.nu * dt;
      if (S.t - S.hl > 0.02) { S.hl = S.t; S.h.push([S.t, emf(P, S.th)]); if (S.h.length > 600) S.h.shift(); }
    },
    read: function (api) {
      var S = api.S, P = api.P, Sa = P.S * 1e-4, w = 2 * Math.PI * P.nu, em = P.N * P.B * Sa * w;
      return { t: S.t, phi: P.B * Sa * Math.cos(S.th) * 1000, e: emf(P, S.th), em: em, ed: em / Math.SQRT2, T: 1 / P.nu };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var cx = W * 0.27, cy = H * 0.36, half = Math.min(W * 0.16, H * 0.24) * Math.sqrt(P.S / 200);
      // полюстер
      var gN = ctx.createLinearGradient(cx - 190, 0, cx - 130, 0); gN.addColorStop(0, '#a62a20'); gN.addColorStop(1, '#e05545');
      ctx.fillStyle = gN; ctx.fillRect(cx - 190, cy - 70, 58, 140);
      var gS = ctx.createLinearGradient(cx + 130, 0, cx + 190, 0); gS.addColorStop(0, '#4a7fe0'); gS.addColorStop(1, '#2a56b0');
      ctx.fillStyle = gS; ctx.fillRect(cx + 132, cy - 70, 58, 140);
      D.text(ctx, 'N', cx - 161, cy + 6, { size: 20, weight: '700', align: 'center', color: '#fff' });
      D.text(ctx, 'S', cx + 161, cy + 6, { size: 20, weight: '700', align: 'center', color: '#fff' });
      for (var k = -2; k <= 2; k++) D.arrow(ctx, cx - 128, cy + k * 26, cx + 126, cy + k * 26, 'rgba(120,130,150,.35)', 1);
      // айналатын рамка: бүйірден қарағанда ені cos θ-ға сай
      var c = Math.cos(S.th), sn = Math.sin(S.th), wv = half * c;
      ctx.save();
      ctx.strokeStyle = sn >= 0 ? C.orange : '#b06a1c'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx - wv, cy - half); ctx.lineTo(cx + wv, cy - half * 0.82); ctx.lineTo(cx + wv, cy + half * 0.82); ctx.lineTo(cx - wv, cy + half); ctx.closePath(); ctx.stroke();
      ctx.restore();
      D.line(ctx, cx, cy - half - 26, cx, cy + half + 50, C.muted, 2, [5, 4]);
      // сақиналар мен шам
      D.circle(ctx, cx, cy + half + 56, 9, '#c9a24a', C.ink, 1.2);
      D.circle(ctx, cx, cy + half + 76, 9, '#c9a24a', C.ink, 1.2);
      var lx = cx + 150, ly = cy + half + 66, e = emf(P, S.th), em = P.N * P.B * P.S * 1e-4 * 2 * Math.PI * P.nu;
      D.line(ctx, cx + 9, cy + half + 56, lx, cy + half + 56, C.ink, 1.5); D.line(ctx, cx + 9, cy + half + 76, lx, cy + half + 76, C.ink, 1.5);
      var glow = Math.min(1, Math.abs(e) / Math.max(0.5, em) * 0.9 + 0.05) * Math.min(1, em / 2);
      var gr = ctx.createRadialGradient(lx, ly - 18, 2, lx, ly - 18, 46); gr.addColorStop(0, 'rgba(255,214,100,' + glow + ')'); gr.addColorStop(1, 'rgba(255,214,100,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(lx, ly - 18, 46, 0, Math.PI * 2); ctx.fill();
      D.circle(ctx, lx, ly - 18, 14, 'rgba(255,250,230,.9)', C.ink, 1.5, true);
      // e(t) графигі
      var span = Math.max(3, 2.2 / P.nu), t0 = Math.max(0, S.t - span), emax = Math.max(0.2, em * 1.15);
      D.plot(ctx, { x: W * 0.56, y: 34, w: W * 0.4, h: H * 0.38 }, { xmin: t0, xmax: t0 + span, ymin: -emax, ymax: emax, xlabel: 't, с', ylabel: 'e, В', series: [{ pts: S.h, color: C.purple }] });
      var ph = []; for (var i = 0; i <= 120; i++) { var tt = t0 + span * i / 120; ph.push([tt, P.B * P.S * 1e-4 * Math.cos(S.th - 2 * Math.PI * P.nu * (S.t - tt)) * 1000]); }
      var fm = Math.max(0.5, P.B * P.S * 1e-4 * 1000 * 1.15);
      D.plot(ctx, { x: W * 0.56, y: H * 0.56, w: W * 0.4, h: H * 0.32 }, { xmin: t0, xmax: t0 + span, ymin: -fm, ymax: fm, xlabel: 't, с', ylabel: 'Φ, мВб', series: [{ pts: ph, color: C.teal }] });
    },
  });
  function emf(P, th) { return P.N * P.B * P.S * 1e-4 * 2 * Math.PI * P.nu * Math.sin(th); }
})();

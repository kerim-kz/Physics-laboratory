/* Ленц ережесі: жеңіл алюминий сақиналар (тұтас және кесігі бар) иінтіректің ұштарында. Магнитті тұтас сақинаға жақындатқанда ол тебіледі, алыстатқанда тартылады; кесігі бар сақинада ток жоқ, ол қозғалмайды. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.2, grid: false, keepRunning: true, autoplay: true,
    hint: 'Магнит сақинаға кіріп-шығады. Индукциялық ток өзін тудырған магнит ағынының өзгерісіне қарсы әрекет етеді — сақина магниттен «қашады» немесе «соңынан ереді».',
    controls: [
      { type: 'select', key: 'ring', label: 'Сақина', value: 'solid', options: [['solid', 'Тұтас сақина'], ['cut', 'Кесігі бар сақина']], live: true },
      { type: 'select', key: 'pole', label: 'Сақинаға қараған полюс', value: 'N', options: [['N', 'Солтүстік (N)'], ['S', 'Оңтүстік (S)']], live: true },
      { type: 'range', key: 'sp', label: 'Магниттің жылдамдығы', min: 0.2, max: 1.5, step: 0.1, value: 0.8, digits: 1, live: true },
    ],
    readouts: [
      { key: 'phi', label: 'Сақина арқылы өтетін ағын Φ (салыстырмалы)', digits: 2 },
      { key: 'emf', label: 'Индукция ЭҚК-і ℰ = −ΔΦ/Δt', digits: 2 },
      { key: 'act', label: 'Сақина', text: true },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.ang = 0; S.w = 0; S.hist = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt;
      var st = state(P, S.t), stp = state(P, S.t - 0.02), dphi = (st.phi - stp.phi) / 0.02;
      S.emf = -dphi; var I = P.ring === 'solid' ? S.emf : 0;
      // сақинаға әсер ететін күш: ағынның өзгерісіне қарсы (жақындағанда тебіледі)
      var F = P.ring === 'solid' ? -(Math.abs(st.phi) - Math.abs(stp.phi)) / 0.02 * 1.4 : 0; // + — магнитке қарай
      S.w += (F - S.ang * 4 - S.w * 1.6) * dt; S.ang += S.w * dt; S.ang = Math.max(-0.3, Math.min(0.3, S.ang));
      S.hist.push([S.t, st.phi, S.emf]); if (S.hist.length > 400) S.hist.shift();
    },
    read: function (api) { var S = api.S, st = state(api.P, S.t), e2 = S.emf || 0; return { phi: st.phi, emf: e2, act: api.P.ring === 'cut' ? 'қозғалмайды (ток жоқ)' : Math.abs(e2) < 0.05 ? 'тыныштықта' : st.v > 0 ? 'тебіледі (магниттен қашады)' : 'тартылады (магниттің соңынан ереді)' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, st = state(P, S.t), wide = W > 640, dark = R.isDark(), table = wide ? H * 0.9 : H * 0.55, I = P.ring === 'solid' ? (S.emf || 0) : 0;
      R.scene(ctx, W, H, 'lab', { table: table });
      // штатив: сақина екі жіпке ілінген (маятник), магнит осі бойымен тербеле алады
      var cx = wide ? W * 0.3 : W * 0.3, top = wide ? 40 : 24, Lp = (table - top) * 0.62, ry0 = top + Lp;
      ctx.fillStyle = '#4a525b'; ctx.fillRect(cx - 90, top - 8, 180, 8); ctx.fillRect(cx - 90, top - 8, 8, table - top + 8); R.block(ctx, cx - 110, table - 10, 60, 10, 'steel', { depth: 2 });
      var rx = cx + Math.sin(S.ang) * Lp, ry = top + Math.cos(S.ang) * Lp;
      ctx.strokeStyle = R.isDark() ? '#ddd' : '#333'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 10, top); ctx.lineTo(rx - 4, ry - 34); ctx.moveTo(cx + 10, top); ctx.lineTo(rx + 4, ry - 34); ctx.stroke();
      function ring(x, y, cut, cur) {
        ctx.save(); ctx.translate(x, y);
        ctx.strokeStyle = '#c3cad1'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, 13, 32, 0, cut ? -1.35 : 0, cut ? 4.5 : 7); ctx.stroke();
        ctx.strokeStyle = '#8f99a3'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 16, 35, 0, cut ? -1.35 : 0, cut ? 4.5 : 7); ctx.stroke();
        if (Math.abs(cur) > 0.04) { var dir = cur > 0 ? 1 : -1; for (var k = 0; k < 6; k++) { var t = (k / 6 + S.t * 0.6 * dir) * 6.283; ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(Math.cos(t) * 13, Math.sin(t) * 32, 2.6, 0, 7); ctx.fill(); } }
        ctx.restore();
      }
      ring(rx, ry, P.ring === 'cut', I);
      ctx.strokeStyle = 'rgba(90,100,110,.6)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, ry0 - 50); ctx.lineTo(cx, ry0 + 50); ctx.stroke(); ctx.setLineDash([]);
      // магнит (оң жақтан келеді)
      var gap = 44 + st.x * (wide ? W * 0.22 : W * 0.25), len = wide ? 130 : 90, mx = cx + gap + len / 2; ry = ry0;
      R.magnet(ctx, mx, ry, len, P.pole === 'N' ? Math.PI : 0, { h: 26 });
      R.force(ctx, mx - len / 2 - 6, ry - 40, mx - len / 2 - 6 - st.v * 26, ry - 40, '#5b6670', 'v');
      // индукциялық токтың магнит өрісі (сақинаның «полюсы»)
      if (Math.abs(I) > 0.05) {
        var pol = st.v > 0 ? P.pole : (P.pole === 'N' ? 'S' : 'N');
        R.tag(ctx, 'сақинаның оң жағы: ' + pol, rx + 8, ry - 52, { size: 10.5, color: pol === P.pole ? '#b4342a' : '#0b6b78' });
        R.tag(ctx, pol === P.pole ? 'аттас полюстер — тебілу' : 'әр аттас полюстер — тартылу', rx + 8, ry + 52, { size: 10.5, color: pol === P.pole ? '#b4342a' : '#0b6b78' });
      } else if (P.ring === 'cut') R.tag(ctx, 'Сақина тұйық емес — индукциялық ток жоқ', rx, ry + 52, { size: 10.5 });
      // графиктер Φ(t) және ℰ(t)
      var gx = wide ? W * 0.6 : 46, gy = wide ? 24 : table + 26, gw = wide ? W * 0.34 : W - 64, gh = wide ? H * 0.24 : H - table - 74;
      ctx.save(); R.rr(ctx, gx - 46, gy - 16, gw + 58, gh + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var t0 = S.t - 6, pp = S.hist.filter(function (h) { return h[0] > t0; });
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: t0, xmax: S.t, ymin: -2, ymax: 2, xlabel: 't', ylabel: '', series: [{ pts: pp.map(function (h) { return [h[0], h[1] * 1.5]; }), color: '#1f5fd1', width: 2 }, { pts: pp.map(function (h) { return [h[0], Math.max(-2, Math.min(2, h[2]))]; }), color: '#d2382b', width: 2 }] });
      R.txt(ctx, 'көк — Φ,  қызыл — ℰ', gx + gw / 2, gy + 10, { size: 10, color: '#5b6670' });
    },
  });
  // магниттің орны: x ∈ [0, 1] (0 — сақинаға ең жақын), v > 0 — жақындау
  function state(P, t) {
    var ph = (t * P.sp * 0.5) % 2, x = ph < 1 ? 1 - ph : ph - 1, v = ph < 1 ? 1 : -1;
    var d = 0.15 + x * 1.2, phi = 1 / (1 + Math.pow(d / 0.35, 3)) * 1.3 * (P.pole === 'N' ? 1 : -1);
    var grad = -3 * Math.pow(d / 0.35, 2) / 0.35 / Math.pow(1 + Math.pow(d / 0.35, 3), 2) * 1.3 * (P.pole === 'N' ? 1 : -1);
    return { x: x, v: v * P.sp, phi: phi, grad: grad };
  }
})();

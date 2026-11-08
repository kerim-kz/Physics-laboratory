/* Электромагниттік индукция: ε = −N·dΦ/dt. Магнит катушка осі бойымен қозғалады (автомат немесе тінтуірмен). */
(function () {
  var A = 0.12; // катушка радиусына сай масштаб, м
  function flux(z, B0) { return B0 / Math.pow(1 + (z / A) * (z / A), 1.5); } // осьтегі ағын (бір орам), шартты бірлік
  Sim.create({
    aspect: 0.62, substeps: 4,
    hint: 'Магнитті тінтуірмен (саусақпен) жылжытуға да болады.',
    controls: [
      { type: 'select', key: 'motion', label: 'Қозғалыс', value: 'auto', options: [['auto', 'Автомат: ішке-сыртқа'], ['hand', 'Қолмен (тінтуірмен)']] },
      { type: 'range', key: 'v', label: 'Магниттің жылдамдығы', min: 0.1, max: 2, step: 0.1, value: 0.6, unit: 'м/с', digits: 1, live: true },
      { type: 'range', key: 'N', label: 'Орам саны N', min: 50, max: 500, step: 50, value: 200, digits: 0, live: true },
      { type: 'check', key: 'flip', label: 'Магнитті аудару (S полюсі алда)', value: false, live: true },
    ],
    readouts: [
      { key: 'phi', label: 'Магнит ағыны Φ (бір орам)', unit: 'мВб', digits: 3 },
      { key: 'e', label: 'Индукция ЭҚК-і ε', unit: 'мВ', digits: 1 },
      { key: 'dir', label: 'Токтың бағыты' },
      { key: 'emax', label: 'Ең үлкен |ε|', unit: 'мВ', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.z = -0.5; S.dir = 1; S.t = 0; S.e = 0; S.h = []; S.emax = 0; S.prev = flux(-0.5, 0.1); },
    onLive: function () {},
    pointer: {
      down: function (api, p) { api.S.drag = true; },
      move: function (api, p, down) {
        if (!down || api.P.motion !== 'hand') return;
        var cx = api.W * 0.55, k = api.W * 0.5;
        api.S.z = Math.max(-0.7, Math.min(0.7, (p.x - cx) / k));
        if (!api.running()) api.play();
      },
      up: function (api) { api.S.drag = false; },
    },
    step: function (api, dt) {
      var S = api.S, P = api.P, B0 = 0.1 * (P.flip ? -1 : 1);
      if (P.motion === 'auto') {
        S.z += S.dir * P.v * dt;
        if (S.z > 0.45) { S.z = 0.45; S.dir = -1; }
        if (S.z < -0.55) { S.z = -0.55; S.dir = 1; }
      }
      var phi = flux(S.z, B0);
      var e = dt > 0 ? -P.N * (phi - S.prev) / dt : 0; // мВб/с = мВ
      S.prev = phi; S.t += dt;
      S.e = S.e * 0.6 + e * 0.4;
      S.emax = Math.max(S.emax, Math.abs(S.e));
      S.h.push([S.t, S.e]); if (S.h.length > 900) S.h.shift();
    },
    read: function (api) {
      var S = api.S, P = api.P, B0 = 0.1 * (P.flip ? -1 : 1);
      return { phi: flux(S.z, B0), e: S.e, dir: Math.abs(S.e) < 0.5 ? 'ток жоқ' : S.e > 0 ? 'сағат тілімен' : 'сағат тіліне қарсы', emax: S.emax };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var cx = W * 0.55, cy = H * 0.3, k = W * 0.5;
      // катушка
      var turns = Math.round(6 + P.N / 40);
      for (var i = 0; i < turns; i++) {
        var x = cx - 50 + i * (100 / turns);
        ctx.strokeStyle = C.orange; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(x, cy, 6, 42, 0, 0, Math.PI * 2); ctx.stroke();
      }
      D.text(ctx, 'N = ' + P.N, cx, cy + 62, { size: 11, align: 'center', color: C.muted, mono: true });
      // магнит
      var mx = cx + S.z * k, mw = 90;
      var left = P.flip ? C.blue : C.red, right = P.flip ? C.red : C.blue;
      ctx.fillStyle = right; ctx.fillRect(mx - mw / 2, cy - 14, mw / 2, 28);
      ctx.fillStyle = left; ctx.fillRect(mx, cy - 14, mw / 2, 28);
      D.text(ctx, P.flip ? 'N' : 'S', mx - mw / 4, cy + 5, { size: 13, align: 'center', color: '#fff', weight: '700' });
      D.text(ctx, P.flip ? 'S' : 'N', mx + mw / 4, cy + 5, { size: 13, align: 'center', color: '#fff', weight: '700' });
      // гальванометр
      var gx = W * 0.14, gy = cy + 30, r = 44;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 50, cy + 42); ctx.lineTo(cx - 50, gy + 60); ctx.lineTo(gx, gy + 60); ctx.lineTo(gx, gy + r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 50, cy + 42); ctx.lineTo(cx + 50, gy + 74); ctx.lineTo(gx - 0, gy + 74); ctx.stroke();
      ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(gx, gy, r, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (var t = -4; t <= 4; t++) { var a = -Math.PI / 2 + t * 0.3; D.line(ctx, gx + Math.cos(a) * (r - 8), gy + Math.sin(a) * (r - 8), gx + Math.cos(a) * r, gy + Math.sin(a) * r, C.muted, 1); }
      var rng = Math.max(50, S.emax * 1.1);
      var ang = -Math.PI / 2 + Math.max(-1.25, Math.min(1.25, S.e / rng * 1.2));
      D.line(ctx, gx, gy, gx + Math.cos(ang) * (r - 6), gy + Math.sin(ang) * (r - 6), C.red, 2.5);
      D.text(ctx, 'G', gx, gy - 8, { size: 12, align: 'center', weight: '600' });
      // ε(t) графигі
      var t1 = S.t, t0 = Math.max(0, t1 - 6);
      D.plot(ctx, { x: 50, y: H * 0.68, w: W - 80, h: H * 0.24 }, { xmin: t0, xmax: t0 + 6, ymin: -rng, ymax: rng, xlabel: 't, с', ylabel: 'ε, мВ', series: [{ pts: S.h, color: C.purple }] });
      if (P.motion === 'hand') D.text(ctx, 'Магнитті тінтуірмен тартып жылжыт', 12, 22, { size: 12, color: C.accent, weight: '600' });
    },
  });
})();

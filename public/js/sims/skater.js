/* Импульс моментінің сақталуы: Жуковский орындығындағы адам гантельдерді ұстап айналады. Қолды жиғанда инерция моменті азайып, бұрыштық жылдамдық артады: I₁ω₁ = I₂ω₂. */
(function () {
  var R = window.Real, I0 = 1.4; // адам + орындық, кг·м²
  function Iof(P, arms) { var r = arms ? 0.18 : 0.8; return I0 + 2 * P.m * r * r; }
  Sim.create({
    aspect: 0.6, grid: false, keepRunning: true, autoplay: true,
    hint: '«Қолды жию / жазу» батырмасын бас. Бұрыштық жылдамдық қалай өзгереді? Импульс моменті мен кинетикалық энергияны салыстыр.',
    controls: [
      { type: 'range', key: 'm', label: 'Әр гантельдің массасы', min: 1, max: 5, step: 0.5, value: 3, unit: 'кг' },
      { type: 'range', key: 'w0', label: 'Бастапқы бұрыштық жылдамдық (қол жазылған)', min: 1, max: 4, step: 0.5, value: 2, unit: 'рад/с' },
    ],
    buttons: [{ label: 'Қолды жию / жазу', onClick: function (api) { api.S.inTarget = !api.S.inTarget; } }],
    readouts: [
      { key: 'I', label: 'Инерция моменті I', unit: 'кг·м²', digits: 2 },
      { key: 'w', label: 'Бұрыштық жылдамдық ω', unit: 'рад/с', digits: 2 },
      { key: 'L', label: 'Импульс моменті L = Iω', unit: 'кг·м²/с', digits: 2 },
      { key: 'E', label: 'Кинетикалық энергия Iω²/2', unit: 'Дж', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.r = 0.8; S.inTarget = false; S.L = Iof(api.P, false) * api.P.w0; S.phi = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, target = S.inTarget ? 0.18 : 0.8;
      S.r += (target - S.r) * Math.min(1, dt * 4);
      var I = I0 + 2 * P.m * S.r * S.r, w = S.L / I;
      S.phi += w * dt;
    },
    read: function (api) { var S = api.S, P = api.P, I = I0 + 2 * P.m * S.r * S.r, w = S.L / I; return { I: I, w: w, L: S.L, E: I * w * w / 2 }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, dark = R.isDark(), wide = W > 640;
      R.scene(ctx, W, H, 'lab', { table: H * 0.98, tiles: true });
      // жоғарыдан көрініс
      var cx = wide ? W * 0.3 : W * 0.5, cy = H * 0.5, sc = Math.min(H * 0.42, W * (wide ? 0.25 : 0.42)) / 0.95;
      ctx.fillStyle = dark ? '#3a4148' : '#b8c0c7'; ctx.beginPath(); ctx.arc(cx, cy, sc * 0.35, 0, 7); ctx.fill();
      ctx.strokeStyle = '#59616a'; ctx.lineWidth = 2; ctx.stroke();
      for (var i = 0; i < 8; i++) { var a = S.phi + i * Math.PI / 4; ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * sc * 0.12, cy + Math.sin(a) * sc * 0.12); ctx.lineTo(cx + Math.cos(a) * sc * 0.35, cy + Math.sin(a) * sc * 0.35); ctx.stroke(); }
      // иық, қолдар, гантельдер
      var ax = Math.cos(S.phi), ay = Math.sin(S.phi);
      ctx.strokeStyle = '#3a9a5c'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      [1, -1].forEach(function (s) {
        var hx = cx + s * ax * S.r * sc, hy = cy + s * ay * S.r * sc;
        ctx.beginPath(); ctx.moveTo(cx + s * ax * 0.18 * sc, cy + s * ay * 0.18 * sc); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(S.phi + Math.PI / 2);
        ctx.fillStyle = '#2b2f33'; var gw = 8 + P.m * 1.5; ctx.fillRect(-gw, -4, gw * 2, 8); ctx.fillRect(-gw - 4, -9, 6, 18); ctx.fillRect(gw - 2, -9, 6, 18); ctx.restore();
      });
      ctx.fillStyle = '#3a9a5c'; ctx.beginPath(); ctx.ellipse(cx, cy, sc * 0.2, sc * 0.11, S.phi, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(cx, cy, sc * 0.09, 0, 7); ctx.fill();
      // айналу бағыты
      ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, sc * 0.95, -0.6, 0.6); ctx.stroke();
      R.force(ctx, cx + Math.cos(0.5) * sc * 0.95, cy + Math.sin(0.5) * sc * 0.95, cx + Math.cos(0.65) * sc * 0.95, cy + Math.sin(0.65) * sc * 0.95, '#d2382b');
      R.tag(ctx, S.inTarget ? 'Қол жиылды: I кіші → ω үлкен' : 'Қол жазылды: I үлкен → ω кіші', cx, 22, { size: 11.5, color: '#0b6b78' });
      // бағаналар
      if (wide) {
        var I = I0 + 2 * P.m * S.r * S.r, w = S.L / I, I1 = Iof(P, false), w1 = S.L / I1, bx = W * 0.62, base = H * 0.8, bh = H * 0.55;
        [['I', I / I1, '#7a3fb0'], ['ω', w / (S.L / Iof(P, true)), '#2f7fd1'], ['L = Iω', 1, '#0b8a7a'], ['Eₖ', (I * w * w) / (Iof(P, true) * Math.pow(S.L / Iof(P, true), 2)), '#e0761b']].forEach(function (b, i) {
          var x = bx + i * 62, h = Math.min(1, b[1]) * bh;
          ctx.fillStyle = dark ? '#2a333b' : '#e6eaed'; ctx.fillRect(x, base - bh, 40, bh);
          ctx.fillStyle = b[2]; ctx.fillRect(x, base - h, 40, h);
          R.txt(ctx, b[0], x + 20, base + 16, { size: 12, color: dark ? '#e6ecf0' : '#1b2329', weight: '600' });
        });
        R.tag(ctx, 'L сақталады; Eₖ артады — адам қолын жию үшін жұмыс істейді', W * 0.75, base + 44, { size: 10.5 });
        void w1;
      }
    },
  });
})();

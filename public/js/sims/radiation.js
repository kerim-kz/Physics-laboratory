/* Радиоактивті сәулеленудің табиғаты: қорғасын контейнердегі радий препаратынан шыққан α, β, γ сәулелері магнит өрісінде әртүрлі ауытқиды; қағаз, алюминий, қорғасын оларды әртүрлі жұтады. Гейгер санағышы. */
(function () {
  var R = window.Real;
  var ABS = { none: ['Жоқ', 0, 0, 0], paper: ['Қағаз парағы', 1, 0.05, 0.01], al: ['Алюминий, 3 мм', 1, 0.95, 0.06], pb: ['Қорғасын, 2 см', 1, 1, 0.75] }; // [атауы, α жұту, β жұту, γ жұту үлесі]
  var KIND = { a: ['α (гелий ядросы, +2e)', '#d2382b', 1], b: ['β (электрон, −e)', '#1f5fd1', -1], g: ['γ (фотон, заряды жоқ)', '#0b8a7a', 0] };
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true, autoplay: true,
    hint: 'Магнит өрісін қос: үш сәуле қалай ажырайды? Әр сәулені бөлек қалдырып, қандай кедергі оны тоқтататынын тексер.',
    controls: [
      { type: 'check', key: 'B', label: 'Магнит өрісі (суретке перпендикуляр, бізден ары)', value: true, live: true },
      { type: 'select', key: 'abs', label: 'Сәулелер жолындағы кедергі', value: 'none', options: Object.keys(ABS).map(function (k) { return [k, ABS[k][0]]; }), live: true },
      { type: 'check', key: 'a', label: 'α-сәулелері', value: true, live: true },
      { type: 'check', key: 'b', label: 'β-сәулелері', value: true, live: true },
      { type: 'check', key: 'g', label: 'γ-сәулелері', value: true, live: true },
    ],
    readouts: [
      { key: 'cnt', label: 'Гейгер санағышы (импульс/с)', digits: 0 },
      { key: 'na', label: 'α бөлшектері', digits: 0 },
      { key: 'nb', label: 'β бөлшектері', digits: 0 },
      { key: 'ng', label: 'γ кванттары', digits: 0 },
    ],
    init: function (api) { var S = api.S; S.p = []; S.t = 0; S.hits = []; S.rate = 0; S.n = { a: 0, b: 0, g: 0 }; },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.t += dt;
      ['a', 'b', 'g'].forEach(function (k) { if (P[k] && Math.random() < dt * 22) S.p.push({ k: k, s: 0, dy: (Math.random() - 0.5) * 0.06, dead: false }); });
      var A = ABS[P.abs], gate = 0.42;
      S.p.forEach(function (q) {
        var sp = q.k === 'a' ? 0.35 : q.k === 'b' ? 0.7 : 1.0;
        var prev = q.s; q.s += dt * sp;
        if (prev < gate && q.s >= gate) { var pr = q.k === 'a' ? A[1] : q.k === 'b' ? A[2] : A[3]; if (Math.random() < pr) q.dead = true; }
        if (q.s >= 1 && !q.counted) { q.counted = true; if (!(P.B && q.k === 'b')) S.hits.push({ t: S.t, k: q.k }); } // β магнит өрісінде санағыштан тыс ауытқиды
      });
      S.p = S.p.filter(function (q) { return !q.dead && q.s < 1.05; });
      S.hits = S.hits.filter(function (h) { return S.t - h.t < 1; });
      S.n = { a: 0, b: 0, g: 0 }; S.hits.forEach(function (h) { S.n[h.k]++; });
    },
    read: function (api) { var S = api.S; return { cnt: S.hits.length, na: S.n.a, nb: S.n.b, ng: S.n.g }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, dark = R.isDark();
      ctx.fillStyle = dark ? '#12171c' : '#e4e9ec'; ctx.fillRect(0, 0, W, H);
      var sx = W * 0.08, sy = H * 0.5, L = W * 0.8;
      // магнит өрісі белгілері (×)
      if (P.B) {
        ctx.fillStyle = dark ? 'rgba(160,190,230,.08)' : 'rgba(60,100,170,.07)'; ctx.fillRect(sx + 60, 30, L * 0.32, H - 60);
        ctx.strokeStyle = dark ? 'rgba(160,190,230,.5)' : 'rgba(60,100,170,.45)'; ctx.lineWidth = 1.3;
        for (var gx = sx + 76; gx < sx + 60 + L * 0.32; gx += 28) for (var gy = 46; gy < H - 40; gy += 28) { ctx.beginPath(); ctx.moveTo(gx - 4, gy - 4); ctx.lineTo(gx + 4, gy + 4); ctx.moveTo(gx + 4, gy - 4); ctx.lineTo(gx - 4, gy + 4); ctx.stroke(); }
        R.tag(ctx, 'B (×) — магнит өрісі', sx + 60 + L * 0.16, 22, { size: 10.5, color: '#2c4a86' });
      }
      // жол: x(s), y(s) — магнит өрісінде ауытқу
      function path(q) {
        var x = sx + 40 + q.s * L, y = sy + q.dy * L * q.s;
        if (P.B) {
          var f = Math.min(q.s, 0.4) / 0.4, defl = q.k === 'a' ? -0.12 : q.k === 'b' ? 0.55 : 0; // α аздап жоғары, β қатты төмен
          y += defl * H * f * f * 0.7;
          if (q.s > 0.4) y += defl * H * 0.7 * 2 * (q.s - 0.4) / 0.4 * 0.5;
        }
        return { x: x, y: y };
      }
      // кедергі пластина
      var A = ABS[P.abs], px = sx + 40 + 0.42 * L;
      if (P.abs !== 'none') {
        var mat = P.abs === 'paper' ? '#f4f1e6' : P.abs === 'al' ? 'aluminum' : 'lead';
        var pw = P.abs === 'paper' ? 3 : P.abs === 'al' ? 7 : 20;
        R.block(ctx, px - pw / 2, 40, pw, H - 80, mat, { depth: 5, shadow: false });
        R.tag(ctx, A[0], px, H - 22, { size: 10.5 });
      }
      // бөлшектер
      S.p.forEach(function (q) {
        var p = path(q), col = KIND[q.k][1];
        if (q.k === 'g') { ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); for (var i = -8; i <= 8; i++) { var xx = p.x + i, yy = p.y + Math.sin(i * 1.2) * 3; if (i === -8) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke(); }
        else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, q.k === 'a' ? 4.5 : 2.6, 0, 7); ctx.fill(); }
      });
      // траектория бағыттары (әлсіз)
      ['a', 'b', 'g'].forEach(function (k) {
        if (!P[k]) return;
        ctx.strokeStyle = R.alpha(KIND[k][1], 0.25); ctx.lineWidth = 6; ctx.beginPath();
        for (var s = 0; s <= 1; s += 0.02) { var p = path({ k: k, s: s, dy: 0 }); if (s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); if (P.abs !== 'none' && s >= 0.42) { var pr = k === 'a' ? A[1] : k === 'b' ? A[2] : A[3]; if (pr >= 0.95) break; } }
        ctx.stroke();
      });
      // қорғасын контейнер және препарат
      R.block(ctx, sx - 30, sy - 40, 70, 80, 'lead', { depth: 8 });
      ctx.fillStyle = '#20242a'; ctx.fillRect(sx + 10, sy - 6, 30, 12);
      var gl = ctx.createRadialGradient(sx + 14, sy, 1, sx + 14, sy, 10); gl.addColorStop(0, 'rgba(160,255,190,.95)'); gl.addColorStop(1, 'rgba(160,255,190,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx + 14, sy, 10, 0, 7); ctx.fill();
      R.tag(ctx, 'Ra-226', sx + 5, sy + 56, { size: 10.5 });
      // Гейгер санағышы
      var cx = sx + 40 + L + 4;
      R.cylinder(ctx, cx - 10, sy - H * 0.32, 22, H * 0.64, 'aluminum', { shadow: false });
      var flash = S.hits.some(function (h) { return S.t - h.t < 0.05; });
      R.lcd(ctx, Math.min(W - 100, cx - 40), H - 50, 90, 30, S.hits.length + ' имп/с', { size: 13, bg: flash ? '#e9f7c0' : '#b8d0a0' });
      R.tag(ctx, 'Гейгер санағышы', Math.min(W - 60, cx), sy - H * 0.32 - 14, { size: 10.5 });
      // аңыз
      var ly = 40, lx = W > 640 ? W * 0.52 : 16;
      if (W > 640) ['a', 'b', 'g'].forEach(function (k, i) { ctx.fillStyle = KIND[k][1]; ctx.beginPath(); ctx.arc(lx, ly + i * 20, 5, 0, 7); ctx.fill(); R.txt(ctx, KIND[k][0], lx + 12, ly + i * 20, { size: 11, color: dark ? '#e6ecf0' : '#1b2329', align: 'left' }); });
    },
  });
})();

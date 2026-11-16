/* Булану және конденсация. Ашық ыдыстан молекулалар ұшып шығады; жабық ыдыста бу қанығады
   (ұшып шыққан және қайта оралған молекулалар саны теңеледі). Желдің, температураның әсері. */
(function () {
  var R = window.Real;
  // Қаныққан будың қысымы (кПа), Магнус формуласы
  function psat(t) { return 0.6112 * Math.exp(17.62 * t / (243.12 + t)); }
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Ыдысты жауып, бу молекулаларының санын бақыла: біраз уақыттан кейін бу қаныққан болады.',
    controls: [
      { type: 'range', key: 'T', label: 'Судың температурасы', min: 5, max: 90, step: 1, value: 40, unit: '°C', digits: 0 },
      { type: 'check', key: 'lid', label: 'Ыдыстың қақпағы жабық', value: false },
      { type: 'check', key: 'wind', label: 'Жел (желдеткіш)', value: false, live: true },
    ],
    readouts: [
      { key: 'n', label: 'Су үстіндегі бу молекулалары', digits: 0 },
      { key: 'out', label: 'Ұшып шыққан / секундына', digits: 1 },
      { key: 'back', label: 'Қайта оралған / секундына', digits: 1 },
      { key: 'st', label: 'Будың күйі', text: true },
      { key: 'ps', label: 'Қаныққан будың қысымы', unit: 'кПа', digits: 2 },
    ],
    init: function (api) { var S = api.S; S.v = []; S.t = 0; S.o = 0; S.b = 0; S.ro = 0; S.rb = 0; S.lvl = 1; },
    step: function (api, dt) {
      var S = api.S, P = api.P, rate = psat(P.T) * 2.2; // бір секундта ұшып шығатын молекулалар
      S.t += dt;
      if (Math.random() < rate * dt) { S.v.push({ x: 0.08 + Math.random() * 0.84, y: 0, vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.4 }); S.o++; }
      var sp = 0.6 + P.T / 60;
      S.v.forEach(function (m) {
        m.x += (m.vx + (P.wind && !P.lid ? 0.6 : 0)) * dt * sp; m.y += m.vy * dt * sp;
        if (Math.random() < 0.05) { m.vx += (Math.random() - 0.5) * 0.6; m.vy += (Math.random() - 0.5) * 0.6; }
        if (m.x < 0.02) { m.x = 0.02; m.vx = Math.abs(m.vx); } if (m.x > 0.98) { if (P.lid || !P.wind) { m.x = 0.98; m.vx = -Math.abs(m.vx); } }
        if (P.lid && m.y > 0.98) { m.y = 0.98; m.vy = -Math.abs(m.vy); }
        if (m.y < 0) m.dead = 'back';
        if (!P.lid && (m.y > 1.2 || m.x > 1.05)) m.dead = 'gone';
      });
      S.v = S.v.filter(function (m) { if (m.dead === 'back') S.b++; return !m.dead; });
      if (!P.lid) S.lvl = Math.max(0.3, S.lvl - dt * rate * 0.00008); // ашық ыдыста су біртіндеп азаяды
      if (S.t > 1) { S.ro = S.ro * 0.9 + S.o * 0.1; S.rb = S.rb * 0.9 + S.b * 0.1; S.o = 0; S.b = 0; S.t = 0; }
    },
    read: function (api) {
      var S = api.S, P = api.P, sat = P.lid && S.rb > S.ro * 0.8;
      return { n: S.v.length, out: S.ro, back: S.rb, st: P.lid ? (sat ? 'қаныққан (динамикалық тепе-теңдік)' : 'қанықпаған') : 'қанықпаған (бу кетіп жатыр)', ps: psat(P.T) };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.88;
      R.scene(ctx, W, H, 'lab', { table: table });
      var bw = Math.min(W * 0.44, 380), bh = table - 60, bx = W * 0.36 - bw / 2, by = table - bh;
      var water = bh * 0.32 * S.lvl;
      R.vessel(ctx, bx, by, bw, bh, water, {});
      if (P.lid) { R.block(ctx, bx - 10, by - 14, bw + 20, 12, 'glass', { depth: 6, shadow: false }); }
      var top = by + 4, surf = table - water, hh = surf - top;
      ctx.save(); if (P.lid) { ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip(); }
      S.v.forEach(function (m) { R.sphere(ctx, bx + m.x * bw, surf - m.y * hh, 4.5, '#5fa9e0'); });
      ctx.restore();
      if (P.wind && !P.lid) { // желдеткіш
        var fx = bx - 60, fy = by + 60;
        ctx.fillStyle = '#3d4247'; ctx.fillRect(fx - 4, fy, 8, table - fy);
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(S.t * 20);
        for (var i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.fillStyle = 'rgba(80,130,190,.85)'; ctx.beginPath(); ctx.ellipse(0, -18, 7, 18, 0, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      R.thermometer(ctx, bx + bw + 40, by + 10, Math.min(bh - 30, 220), P.T, 0, 100, { step: 20 });
    },
  });
})();

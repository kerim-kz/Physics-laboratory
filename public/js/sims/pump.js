/* Поршенді сорғы: поршень көтерілгенде астында қысым азаяды, атмосфералық қысым суды түтік бойымен итереді.
   Сорғы суды шамамен 10 м-ден биік көтере алмайды (p₀ = ρgh → h ≈ 10,3 м). */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, grid: false, autoplay: true, keepRunning: true,
    hint: 'Құдықтың тереңдігін 10 м-ден асырып көр: сорғы суды неге көтере алмайды?',
    controls: [
      { type: 'range', key: 'depth', label: 'Құдықтағы су деңгейінің тереңдігі', min: 2, max: 14, step: 0.5, value: 6, unit: 'м', digits: 1 },
      { type: 'range', key: 'rate', label: 'Сорғыны айдау жиілігі', min: 0.3, max: 1.5, step: 0.1, value: 0.8, unit: 'Гц', live: true },
    ],
    readouts: [
      { key: 'hmax', label: 'Ең үлкен көтеру биіктігі p₀ / (ρg)', unit: 'м', digits: 1 },
      { key: 'col', label: 'Түтіктегі су бағаны', unit: 'м', digits: 1 },
      { key: 'st', label: 'Күйі', text: true },
    ],
    init: function (api) { var S = api.S; S.ph = 0; S.col = 0; S.out = 0; S.drops = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P, hmax = 101325 / (1000 * 9.8);
      var prev = Math.sin(S.ph);
      S.ph += dt * P.rate * Math.PI * 2;
      var up = Math.sin(S.ph) > prev; // поршень көтеріліп жатыр
      if (up) S.col = Math.min(Math.min(hmax, P.depth + 0.6), S.col + dt * 2.2);
      if (S.col >= P.depth + 0.6 && up) { S.out += dt; if (Math.random() < 0.7) S.drops.push({ x: 0, y: 0, vx: 60 + Math.random() * 20, vy: 0 }); }
      S.drops.forEach(function (d) { d.vy += 500 * dt; d.x += d.vx * dt; d.y += d.vy * dt; });
      S.drops = S.drops.filter(function (d) { return d.y < 140; });
    },
    read: function (api) {
      var hmax = 101325 / (1000 * 9.8), S = api.S, P = api.P;
      return { hmax: hmax, col: Math.min(S.col, P.depth), st: P.depth > hmax ? 'су ' + Sim.fmt(hmax, 1) + ' м-ден жоғары көтерілмейді' : S.col >= P.depth + 0.6 ? 'су ағып жатыр' : 'су көтеріліп жатыр' };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, ground = H * 0.36;
      R.scene(ctx, W, H, 'outdoor', { ground: ground, clouds: true });
      // жер қимасы
      var soil = ctx.createLinearGradient(0, ground, 0, H); soil.addColorStop(0, '#8a6844'); soil.addColorStop(1, '#4a3622');
      ctx.fillStyle = soil; ctx.fillRect(0, ground + 8, W, H - ground - 8);
      var mpx = (H - ground - 30) / 15; // 1 м
      var px = W * 0.38, pipeW = 16;
      var water = ground + P.depth * mpx;
      // құдық
      ctx.fillStyle = '#2d4d6b'; ctx.fillRect(px - 50, water, 100, H - water);
      R.liquid(ctx, px - 50, water, 100, H - water, 'water', S.ph);
      // түтік
      var gl = ctx.createLinearGradient(px - pipeW / 2, 0, px + pipeW / 2, 0); gl.addColorStop(0, '#6c757d'); gl.addColorStop(0.4, '#d6dbdf'); gl.addColorStop(1, '#5c646b');
      ctx.fillStyle = gl; ctx.fillRect(px - pipeW / 2, ground - 70, pipeW, water + 20 - (ground - 70));
      // түтіктегі су бағаны (мөлдір кесінді)
      var colTop = water - Math.min(S.col, P.depth + 0.6) * mpx;
      ctx.fillStyle = 'rgba(80,150,220,.85)'; ctx.fillRect(px - pipeW / 2 + 3, Math.max(ground - 70, colTop), pipeW - 6, water + 20 - Math.max(ground - 70, colTop));
      // сорғы корпусы мен тұтқасы
      R.block(ctx, px - 26, ground - 120, 52, 70, 'iron', { depth: 10 });
      var h = Math.sin(S.ph);
      ctx.save(); ctx.translate(px + 30, ground - 112); ctx.rotate(-0.35 * h);
      ctx.fillStyle = '#3d4247'; ctx.fillRect(-60, -4, 130, 8); ctx.restore();
      ctx.fillStyle = '#5c646b'; ctx.fillRect(px + 26, ground - 98, 40, 8);
      // ағып жатқан су
      S.drops.forEach(function (d) { ctx.fillStyle = 'rgba(80,150,220,.8)'; ctx.beginPath(); ctx.arc(px + 66 + d.x, ground - 94 + d.y, 3, 0, 7); ctx.fill(); });
      R.vessel(ctx, px + 100, ground - 50, 70, 50, Math.min(46, S.out * 6), {});
      // шкала (м)
      for (var m = 0; m <= 14; m += 2) {
        var y = ground + m * mpx;
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(px - 90, y); ctx.lineTo(px - 70, y); ctx.stroke();
        R.txt(ctx, m + ' м', px - 104, y, { size: 9.5, color: '#fff' });
      }
      var hmax = 101325 / (1000 * 9.8);
      ctx.save(); ctx.strokeStyle = '#ffd43b'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(px - 60, water - hmax * mpx); ctx.lineTo(px + 140, water - hmax * mpx); ctx.stroke(); ctx.restore();
      if (P.depth > hmax) R.tag(ctx, 'Атмосфералық қысым суды тек ' + Sim.fmt(hmax, 1) + ' м-ге көтереді', px + 170, water - hmax * mpx, { size: 11, color: '#b4342a' });
      R.force(ctx, px + 80, water - 40, px + 80, water - 2, '#1f5fd1', 'p₀');
    },
  });
})();

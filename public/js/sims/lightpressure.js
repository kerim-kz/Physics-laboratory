/* Жарық қысымы: Лебедев тәжірибесі (вакуумдағы жеңіл қанатшалар — бұралмалы таразы) және күн желкені. p = I(1 + ρ)/c. */
(function () {
  var R = window.Real, c = 3e8;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.2, grid: false, keepRunning: true, autoplay: true,
    hint: 'Жарық айна бетке қара бетке қарағанда екі есе күшті қысым түсіреді, өйткені фотондар шағылғанда импульсі екі есе өзгереді. Күн желкенінің үдеуін есепте.',
    controls: [
      { type: 'select', key: 'mode', label: 'Тәжірибе', value: 'lebedev', options: [['lebedev', 'Лебедев тәжірибесі'], ['sail', 'Күн желкені (ғарышта)']] },
      { type: 'range', key: 'I', label: 'Жарық қарқыны I', min: 100, max: 5000, step: 100, value: 1400, unit: 'Вт/м²', digits: 0 },
      { type: 'select', key: 'surf', label: 'Жарық түсетін бет', value: 'mirror', options: [['mirror', 'Айна (ρ = 1)'], ['black', 'Қара (ρ = 0)']] },
      { type: 'range', key: 'S', label: 'Желкеннің ауданы (желкен үшін)', min: 100, max: 10000, step: 100, value: 1000, unit: 'м²', digits: 0 },
    ],
    readouts: [
      { key: 'p', label: 'Жарық қысымы p = I(1 + ρ)/c', unit: 'мкПа', digits: 2 },
      { key: 'F', label: 'Күш F = pS (желкен)', unit: 'мН', digits: 2 },
      { key: 'a', label: 'Желкеннің үдеуі (m = 10 кг)', unit: 'мм/с²', digits: 3 },
    ],
    init: function (api) { api.S.t = 0; api.S.ang = 0; api.S.w = 0; api.S.x = 0; api.S.v = 0; },
    step: function (api, dt) {
      var S = api.S, P = api.P, p = calc(P).p; S.t += dt;
      S.w += (p * 6e4 * (P.surf === 'mirror' ? 1 : 0.55) - S.ang * 2 - S.w * 0.8) * dt; S.ang += S.w * dt;
      S.v += calc(P).a * 40 * dt; S.x = (S.x + S.v * dt) % 1;
    },
    read: function (api) { var c2 = calc(api.P); return { p: c2.p * 1e6, F: c2.F * 1e3, a: c2.a * 1e3 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, wide = W > 640;
      if (P.mode === 'sail') {
        R.scene(ctx, W, H, 'space', { count: 260 });
        var sun = ctx.createRadialGradient(40, H / 2, 4, 40, H / 2, 120); sun.addColorStop(0, '#fff6c8'); sun.addColorStop(0.3, 'rgba(255,200,80,.8)'); sun.addColorStop(1, 'rgba(255,160,40,0)'); ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(40, H / 2, 120, 0, 7); ctx.fill();
        var sx = W * 0.35 + S.x * W * 0.45, sy = H / 2, sw = 50 + Math.sqrt(P.S) * 1.2;
        for (var k = 0; k < 14; k++) { var yy = sy - sw / 2 + (k + 0.5) * sw / 14, xx = 90 + ((S.t * 220 + k * 37) % (sx - 90)); ctx.fillStyle = 'rgba(255,230,120,.8)'; ctx.beginPath(); ctx.arc(xx, yy, 2.2, 0, 7); ctx.fill(); }
        ctx.fillStyle = P.surf === 'mirror' ? '#e6ebef' : '#2b2f33'; ctx.fillRect(sx, sy - sw / 2, 6, sw); ctx.strokeStyle = '#8f99a3'; ctx.strokeRect(sx, sy - sw / 2, 6, sw);
        ctx.strokeStyle = '#8f99a3'; ctx.beginPath(); ctx.moveTo(sx + 6, sy - sw / 2); ctx.lineTo(sx + 40, sy); ctx.lineTo(sx + 6, sy + sw / 2); ctx.stroke(); R.sphere(ctx, sx + 42, sy, 6, '#c3cad1');
        R.force(ctx, sx + 50, sy + sw / 2 + 16, sx + 50 + 70, sy + sw / 2 + 16, '#0b8a7a', 'F');
        R.tag(ctx, 'Күн желкені: F = I(1 + ρ)S / c', W / 2, 20, { size: 12, color: '#0b3f4a' });
        return;
      }
      R.scene(ctx, W, H, 'lab', { table: H * 0.92 });
      // вакуумдағы колба және бұралмалы таразы
      var cx = wide ? W * 0.55 : W * 0.55, cy = H * 0.46, rr = Math.min(H * 0.32, W * 0.3);
      ctx.fillStyle = 'rgba(200,230,245,.18)'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(80,120,140,.8)'; ctx.lineWidth = 2; ctx.stroke();
      R.txt(ctx, 'вакуум', cx, cy + rr - 16, { size: 10, color: '#5b6670' });
      ctx.strokeStyle = '#59616a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy - rr); ctx.lineTo(cx, cy); ctx.stroke();
      var a = S.ang * 0.6, arm = rr * 0.6;
      // жоғарыдан қарағандағы иінтірек (перспективада эллипс бойымен)
      [[1, P.surf === 'mirror' ? '#e6ebef' : '#2b2f33'], [-1, P.surf === 'mirror' ? '#2b2f33' : '#e6ebef']].forEach(function (q) {
        var x = cx + q[0] * Math.cos(a) * arm, y = cy + q[0] * Math.sin(a) * arm * 0.3;
        ctx.strokeStyle = '#8f99a3'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = q[1]; ctx.fillRect(x - 10 * Math.abs(Math.sin(a + 1.57)), y - 14, 20 * Math.abs(Math.sin(a + 1.57)) + 2, 28); ctx.strokeStyle = '#8f99a3'; ctx.strokeRect(x - 10 * Math.abs(Math.sin(a + 1.57)), y - 14, 20 * Math.abs(Math.sin(a + 1.57)) + 2, 28);
      });
      // айна және жарық шоғы
      var lx = 30;
      ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(lx + 10, cy, 14, 0, 7); ctx.fill();
      var tx = cx + Math.cos(a) * arm, ty = cy + Math.sin(a) * arm * 0.3;
      ctx.fillStyle = 'rgba(255,230,120,' + (0.15 + P.I / 5000 * 0.45) + ')'; ctx.beginPath(); ctx.moveTo(lx + 20, cy - 8); ctx.lineTo(tx - 8, ty - 12); ctx.lineTo(tx - 8, ty + 12); ctx.lineTo(lx + 20, cy + 8); ctx.closePath(); ctx.fill();
      // айнашық және шкала (бұралу бұрышын өлшеу)
      ctx.fillStyle = '#c3cad1'; ctx.fillRect(cx - 6, cy - rr * 0.5, 12, 4);
      var spot = cx + 30 + S.ang * 900;
      ctx.fillStyle = '#e8d9a8'; ctx.fillRect(cx - rr, cy - rr - 30, 2 * rr, 14); for (var m = -10; m <= 10; m++) { ctx.fillStyle = '#5b4a2a'; ctx.fillRect(cx + m * rr / 10, cy - rr - 30, 1, m % 5 ? 5 : 10); }
      ctx.fillStyle = 'rgba(255,80,60,.9)'; ctx.beginPath(); ctx.arc(Math.max(cx - rr, Math.min(cx + rr, spot)), cy - rr - 23, 4, 0, 7); ctx.fill();
      R.tag(ctx, 'шкаладағы жарық «қояны» — бұралу бұрышы', cx, cy - rr - 46, { size: 10 });
      R.tag(ctx, 'П. Н. Лебедев (1899): жарық қысымын тікелей өлшеді', W / 2, H - 14, { size: W < 600 ? 9.5 : 11, color: '#0b3f4a' });
    },
  });
  function calc(P) { var rho = P.surf === 'mirror' ? 1 : 0, p = P.I * (1 + rho) / c, F = p * P.S; return { p: p, F: F, a: F / 10 }; }
})();

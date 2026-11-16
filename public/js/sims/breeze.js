/* Табиғаттағы жылуберілу: теңіз (көл) жағасындағы бриз. Күндіз құрлық тез қызады — жел теңізден құрлыққа,
   түнде құрлық тез суиды — жел құрлықтан теңізге. Балқаш, Алакөл, Каспий жағаларында байқалады. */
(function () {
  var R = window.Real;
  var N = 140;
  Sim.create({
    aspect: 0.56, grid: false, autoplay: true, keepRunning: true,
    hint: 'Тәулік уақытын өзгерт: желдің бағыты қалай өзгереді?',
    controls: [{ type: 'select', key: 'time', label: 'Тәулік уақыты', value: 'day', options: [['day', 'Күндіз (теңіз бризі)'], ['night', 'Түнде (жағалау бризі)']], live: true }],
    readouts: [
      { key: 'land', label: 'Құрлықтың температурасы', unit: '°C', digits: 0 },
      { key: 'sea', label: 'Судың температурасы', unit: '°C', digits: 0 },
      { key: 'wind', label: 'Жер бетіндегі жел', text: true },
    ],
    init: function (api) { api.S.p = []; for (var i = 0; i < N; i++) api.S.p.push({ x: Math.random(), y: Math.random() }); api.S.t = 0; },
    step: function (api, dt) {
      var S = api.S, dir = api.P.time === 'day' ? 1 : -1; S.t += dt;
      S.p.forEach(function (p) {
        // айналым ұяшығы: x ∈ [0, 1] (0 — теңіз, 1 — құрлық), y ∈ [0, 1] (0 — жер беті, 1 — жоғары)
        // ψ = dir·sin(πx)·sin(πy): күндіз жер бетінде теңізден құрлыққа, құрлық үстінде көтеріледі
        var u = dir * Math.sin(Math.PI * p.x) * Math.cos(Math.PI * p.y), v = -dir * Math.cos(Math.PI * p.x) * Math.sin(Math.PI * p.y);
        p.x += u * dt * 0.12; p.y += v * dt * 0.12;
        if (p.x < 0.02 || p.x > 0.98 || p.y < 0.02 || p.y > 0.98) { p.x = Math.random(); p.y = Math.random(); }
      });
    },
    read: function (api) { var d = api.P.time === 'day'; return { land: d ? 32 : 14, sea: d ? 22 : 20, wind: d ? 'теңізден құрлыққа' : 'құрлықтан теңізге' }; },
    draw: function (api, ctx, W, H) {
      var S = api.S, day = api.P.time === 'day', ground = H * 0.74, shore = W * 0.48;
      var sky = ctx.createLinearGradient(0, 0, 0, ground);
      if (day) { sky.addColorStop(0, '#6fb2e8'); sky.addColorStop(1, '#d6ecf8'); } else { sky.addColorStop(0, '#060c1d'); sky.addColorStop(1, '#22325a'); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground);
      if (day) R.sun(ctx, W * 0.85, H * 0.13, 26); else { R.stars(ctx, W, ground * 0.7, 3, 90); R.planet(ctx, W * 0.82, H * 0.14, 18, 'moon'); }
      // теңіз
      var sea = ctx.createLinearGradient(0, ground, 0, H); sea.addColorStop(0, day ? '#3a8fd0' : '#1b3a62'); sea.addColorStop(1, day ? '#1d5f99' : '#0d1f38');
      ctx.fillStyle = sea; ctx.fillRect(0, ground, shore, H - ground);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
      for (var w = 0; w < 5; w++) { ctx.beginPath(); for (var x = 0; x < shore; x += 10) ctx.lineTo(x, ground + 8 + w * 14 + Math.sin(x / 18 + S.t * 2 + w) * 2); ctx.stroke(); }
      // құрлық: құм жағажай мен шөп
      ctx.fillStyle = day ? '#e6cf96' : '#6d5f40'; ctx.beginPath(); ctx.moveTo(shore - 20, H); ctx.lineTo(shore, ground); ctx.lineTo(W, ground); ctx.lineTo(W, H); ctx.fill();
      ctx.fillStyle = day ? '#6aa851' : '#2c4a28'; ctx.fillRect(shore + 90, ground, W, 10);
      R.tree(ctx, shore + 160, ground + 2, 90); R.tree(ctx, W - 80, ground + 2, 110);
      // ауа ағыны (бөлшектер)
      var top = H * 0.08, cw = W, ch = ground - top;
      S.p.forEach(function (p) {
        var x = p.x * cw, y = ground - p.y * ch;
        ctx.fillStyle = day ? 'rgba(255,255,255,.75)' : 'rgba(190,210,255,.6)'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
      });
      var d = day ? 1 : -1;
      R.force(ctx, W * 0.5 - d * 140, ground - 24, W * 0.5 + d * 140, ground - 24, '#1f5fd1', 'жел');
      R.force(ctx, W * 0.5 + d * 140, top + 30, W * 0.5 - d * 140, top + 30, 'rgba(120,130,150,.9)', '');
      R.tag(ctx, day ? 'Құрлық тез қызады: үстіндегі жылы ауа көтеріледі' : 'Құрлық тез суиды: теңіз үстіндегі жылы ауа көтеріледі', W / 2, H - 16, { size: 11 });
    },
  });
})();

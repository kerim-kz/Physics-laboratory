/* Ай фазалары: Ай Жерді айналады, Күн жарығы оң жақтан түседі. Жерден Айдың жарықталған бөлігінің көрінуі өзгереді. */
(function () {
  var SYN = 29.53;
  var NAMES = ['Жаңа ай', 'Өспелі орақ ай', 'Бірінші ширек', 'Өспелі толысқан ай', 'Толған ай', 'Кемімелі толысқан ай', 'Соңғы ширек', 'Кемімелі орақ ай'];
  function phaseName(f) { return NAMES[Math.floor(((f + 1 / 16) % 1) * 8)]; }
  Sim.create({
    aspect: 0.62, autoplay: true, keepRunning: true, grid: false,
    hint: 'Төменгі оң жақтағы терезе — Айдың Жерден көрінісі.',
    controls: [
      { type: 'range', key: 'speed', label: 'Жылдамдық (тәулік / секунд)', min: 0.5, max: 8, step: 0.5, value: 3, digits: 1, live: true },
    ],
    buttons: [
      { label: 'Жаңа ай', onClick: function (api) { api.S.day = 0; } },
      { label: 'Бірінші ширек', onClick: function (api) { api.S.day = SYN / 4; } },
      { label: 'Толған ай', onClick: function (api) { api.S.day = SYN / 2; } },
      { label: 'Соңғы ширек', onClick: function (api) { api.S.day = SYN * 0.75; } },
    ],
    readouts: [
      { key: 'day', label: 'Синодтық айдың күні', unit: 'тәулік', digits: 1 },
      { key: 'name', label: 'Фаза' },
      { key: 'ill', label: 'Жарықталған бөлігі', unit: '%', digits: 0 },
    ],
    init: function (api) { api.S.day = 3; api.S.t = 0; },
    onLive: function () {},
    step: function (api, dt) { var S = api.S; S.t += dt; S.day = (S.day + api.P.speed * dt) % SYN; },
    read: function (api) {
      var f = api.S.day / SYN, ill = (1 - Math.cos(2 * Math.PI * f)) / 2;
      return { day: api.S.day, name: phaseName(f), ill: ill * 100 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, C = api.C, D = api.D, f = S.day / SYN, ang = 2 * Math.PI * f;
      ctx.fillStyle = '#070d18'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 80; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + (i * 13 % 10) / 25) + ')'; ctx.fillRect((i * 131) % W, (i * 71) % H, 1.4, 1.4); }
      // Күн сәулелері
      for (var k = 0; k < 7; k++) D.arrow(ctx, W - 20, 40 + k * (H - 80) / 6, W - 80, 40 + k * (H - 80) / 6, 'rgba(255,214,94,.5)', 1.5);
      D.text(ctx, 'Күн жарығы', W - 24, 24, { size: 11, color: '#ffd25e', align: 'right', weight: '600' });
      var ex = W * 0.36, ey = H / 2, R = Math.min(W * 0.26, H * 0.38);
      ctx.save(); ctx.strokeStyle = 'rgba(160,190,230,.35)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(ex, ey, R, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      // Жер (күндізгі жағы оңда)
      D.circle(ctx, ex, ey, 22, '#2f6fb5', null, 0);
      ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, 22, Math.PI / 2, 3 * Math.PI / 2); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill(); ctx.restore();
      D.text(ctx, 'Жер', ex, ey + 38, { size: 11, align: 'center', color: '#c4d3e0' });
      // Ай (Жаңа ай — Күн жақта, яғни оң жақта)
      var mx = ex + R * Math.cos(ang), my = ey - R * Math.sin(ang);
      D.circle(ctx, mx, my, 12, '#d8d4c8', null, 0, true);
      ctx.save(); ctx.beginPath(); ctx.arc(mx, my, 12, Math.PI / 2, 3 * Math.PI / 2); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fill(); ctx.restore();
      // Жерден көрінісі
      var vx = W - 110, vy = H - 110, vr = 70;
      ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(vx - vr - 14, vy - vr - 30, 2 * vr + 28, 2 * vr + 44);
      D.text(ctx, 'Жерден көрінісі', vx, vy - vr - 12, { size: 11, align: 'center', color: '#c4d3e0' });
      // қараңғы диск, үстінен жарықталған бөлік
      ctx.fillStyle = '#20252e'; ctx.beginPath(); ctx.arc(vx, vy, vr, 0, Math.PI * 2); ctx.fill();
      var c = Math.cos(ang), waxing = f < 0.5;
      ctx.fillStyle = '#ece6d6';
      ctx.beginPath();
      // жарық жақ: өспелі айда оң жақ, кемімелі айда сол жақ (Солтүстік жарты шарда)
      if (waxing) ctx.arc(vx, vy, vr, -Math.PI / 2, Math.PI / 2, false); else ctx.arc(vx, vy, vr, Math.PI / 2, 3 * Math.PI / 2, false);
      ctx.ellipse(vx, vy, Math.abs(c) * vr, vr, 0, waxing ? Math.PI / 2 : -Math.PI / 2, waxing ? -Math.PI / 2 : Math.PI / 2, c > 0);
      ctx.closePath(); ctx.fill();
      D.text(ctx, phaseName(f), vx, vy + vr + 18, { size: 12, align: 'center', color: '#ffd25e', weight: '600' });
      D.text(ctx, 'Ай Жерді ~27,3 тәулікте айналады, ал фазалар ~29,5 тәулікте қайталанады', 14, H - 14, { size: 11, color: '#9fb3c8' });
    },
  });
})();

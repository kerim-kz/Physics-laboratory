/* Электрмагниттік толқынның шығарылуы мен жұтылуы: ашық тербелмелі контур (Герц вибраторы) толқын шығарады. E және B векторлары өзара перпендикуляр, толқын көлденең. Қабылдағыш антеннада ток индукцияланады. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.1, grid: false, keepRunning: true, autoplay: true,
    hint: 'Антеннадағы зарядтар тербеледі де, кеңістікке электрмагниттік толқын таралады. Қабылдағыш антеннаны бұрып көр: ол E векторына перпендикуляр болса, сигнал жоқ.',
    controls: [
      { type: 'range', key: 'f', label: 'Тербеліс жиілігі (баяулатылған)', min: 0.3, max: 1.5, step: 0.1, value: 0.6, unit: 'Гц', digits: 1 },
      { type: 'range', key: 'ang', label: 'Қабылдағыш антеннаның бұрышы', min: 0, max: 90, step: 5, value: 0, unit: '°', digits: 0, live: true },
      { type: 'check', key: 'B', label: 'B векторын көрсету', value: true, live: true },
    ],
    readouts: [
      { key: 'sig', label: 'Қабылдағыштағы сигнал (салыстырмалы)', digits: 2 },
      { key: 'lam', label: 'Толқын ұзындығы λ = c/ν (нақты 100 МГц үшін)', unit: 'м', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { return { sig: Math.abs(Math.cos(api.P.ang * Math.PI / 180)), lam: 3 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, w = 2 * Math.PI * P.f, t = S.t, wide = W > 640;
      R.scene(ctx, W, H, 'outdoor', { ground: H * 1.2 });
      var ax = wide ? W * 0.1 : W * 0.1, ay = H * 0.5, L = H * 0.32, lamPx = wide ? W * 0.22 : W * 0.35, k = 2 * Math.PI / lamPx;
      // тарату антеннасы
      var q = Math.sin(w * t);
      ctx.strokeStyle = '#8f99a3'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ax, ay - L / 2); ctx.lineTo(ax, ay - 6); ctx.moveTo(ax, ay + 6); ctx.lineTo(ax, ay + L / 2); ctx.stroke();
      R.sphere(ctx, ax, ay - L / 2, 9, q > 0 ? 'rgba(210,56,43,' + (0.4 + 0.6 * Math.abs(q)) + ')' : 'rgba(47,111,209,' + (0.4 + 0.6 * Math.abs(q)) + ')');
      R.sphere(ctx, ax, ay + L / 2, 9, q > 0 ? 'rgba(47,111,209,' + (0.4 + 0.6 * Math.abs(q)) + ')' : 'rgba(210,56,43,' + (0.4 + 0.6 * Math.abs(q)) + ')');
      R.txt(ctx, q > 0 ? '+' : '−', ax, ay - L / 2 + 1, { size: 12, color: '#fff', weight: '700' }); R.txt(ctx, q > 0 ? '−' : '+', ax, ay + L / 2 + 1, { size: 12, color: '#fff', weight: '700' });
      R.sphere(ctx, ax, ay, 7, '#2b2f33'); R.tag(ctx, 'генератор', ax + 44, ay + L / 2 + 22, { size: 10 });
      // толқын: E (тік, қызыл), B (перспективадағы көлденең, көк)
      var x0 = ax + 20, x1 = wide ? W * 0.82 : W * 0.86;
      ctx.lineWidth = 2;
      for (var x = x0; x <= x1; x += 14) {
        var ph = k * (x - ax) - w * t, amp = Math.cos(ph) * L * 0.4 * Math.min(1, (x - ax) / 40);
        api.D.arrow(ctx, x, ay, x, ay - amp, 'rgba(210,56,43,.85)', 1.6);
        if (P.B) { var bx = amp * 0.55; api.D.arrow(ctx, x, ay, x - bx * 0.5, ay + bx * 0.5, 'rgba(31,95,209,.7)', 1.4); }
      }
      ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 2.2; ctx.beginPath();
      for (var x2 = x0; x2 <= x1; x2 += 3) { var a2 = Math.cos(k * (x2 - ax) - w * t) * L * 0.4 * Math.min(1, (x2 - ax) / 40); if (x2 === x0) ctx.moveTo(x2, ay - a2); else ctx.lineTo(x2, ay - a2); } ctx.stroke();
      ctx.strokeStyle = 'rgba(90,100,110,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1 + 20, ay); ctx.stroke();
      api.D.arrow(ctx, x1 - 30, ay + L * 0.55, x1 + 20, ay + L * 0.55, '#0b8a7a', 2.5, 'c');
      // λ белгісі
      var mx = x0 + lamPx * 0.5; ctx.strokeStyle = '#5b6670'; ctx.beginPath(); ctx.moveTo(mx, ay - L * 0.55); ctx.lineTo(mx + lamPx, ay - L * 0.55); ctx.stroke(); R.tag(ctx, 'λ', mx + lamPx / 2, ay - L * 0.55, { size: 11 });
      R.tag(ctx, 'E', x0 + 30, ay - L * 0.45, { size: 11, color: '#b4342a' }); if (P.B) R.tag(ctx, 'B', x0 + 18, ay + L * 0.3, { size: 11, color: '#1f5fd1' });
      // қабылдағыш антенна
      var rx = wide ? W * 0.92 : W * 0.93, rang = P.ang * Math.PI / 180, sig = Math.cos(k * (rx - ax) - w * t) * Math.cos(rang);
      ctx.save(); ctx.translate(rx, ay); ctx.rotate(rang); ctx.strokeStyle = '#8f99a3'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -L * 0.35); ctx.lineTo(0, L * 0.35); ctx.stroke(); ctx.restore();
      R.bulb(ctx, rx, ay + L * 0.55, 11, Math.abs(sig));
      R.tag(ctx, 'қабылдағыш', rx - 10, ay - L * 0.5, { size: 10 });
      R.tag(ctx, 'E ⊥ B ⊥ c — электрмагниттік толқын көлденең', W / 2, 18, { size: W < 600 ? 10 : 12, color: '#0b3f4a' });
    },
  });
})();

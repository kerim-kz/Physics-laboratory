/* Айнымалы ток тізбегіндегі қуат: лездік қуат p = ui, орташа (активті) қуат P = UI cos φ. Фазалар ығысуы артқанда қуаттың бір бөлігі көзге «қайтарылады». */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.3, grid: false, keepRunning: true, autoplay: true,
    hint: 'Фазалар ығысуын 0-ден 90°-қа дейін өзгерт. Лездік қуаттың теріс бөлігі (көк) — энергияның көзге қайтарылуы. Орташа қуат cos φ-ге пропорционал.',
    controls: [
      { type: 'range', key: 'U', label: 'Әсерлік кернеу U', min: 50, max: 220, step: 10, value: 220, unit: 'В', digits: 0 },
      { type: 'range', key: 'I', label: 'Әсерлік ток I', min: 0.5, max: 5, step: 0.5, value: 2, unit: 'А', digits: 1 },
      { type: 'range', key: 'phi', label: 'Фазалар ығысуы φ', min: -90, max: 90, step: 5, value: 30, unit: '°', digits: 0 },
    ],
    readouts: [
      { key: 'S', label: 'Толық қуат S = UI', unit: 'В·А', digits: 0 },
      { key: 'P', label: 'Активті қуат P = UI cos φ', unit: 'Вт', digits: 0 },
      { key: 'Q', label: 'Реактивті қуат Q = UI sin φ', unit: 'вар', digits: 0 },
      { key: 'cos', label: 'cos φ', digits: 3 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var P = api.P, f = P.phi * Math.PI / 180; return { S: P.U * P.I, P: P.U * P.I * Math.cos(f), Q: P.U * P.I * Math.sin(f), cos: Math.cos(f) }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, f = P.phi * Math.PI / 180, w = 2 * Math.PI * 0.4, wide = W > 640, dark = R.isDark();
      var Um = P.U * Math.SQRT2, Im = P.I * Math.SQRT2, Pa = P.U * P.I * Math.cos(f), Smax = 220 * 5 * 2.05;
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      var gx = wide ? 60 : 46, gw = wide ? W * 0.62 : W - 62, gy1 = 26, gh = wide ? H * 0.36 : H * 0.26;
      ctx.save(); R.rr(ctx, gx - 46, gy1 - 16, gw + 58, gh * 2 + 92, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var t0 = Math.max(0, S.t - 4), pu = [], pi = [], pp = [];
      for (var t = t0; t <= t0 + 5; t += 0.02) { var u = Um * Math.sin(w * t), i = Im * Math.sin(w * t - f); pu.push([t, u / Um]); pi.push([t, i / (Im || 1) * 0.7]); pp.push([t, u * i]); }
      api.D.plot(ctx, { x: gx, y: gy1, w: gw, h: gh }, { xmin: t0, xmax: t0 + 5, ymin: -1.2, ymax: 1.2, xlabel: '', ylabel: 'u, i', series: [{ pts: pu, color: '#d2382b', width: 2.2 }, { pts: pi, color: '#1f5fd1', width: 2.2 }] });
      R.txt(ctx, 'қызыл — u(t), көк — i(t) (токтың кешігуі φ)', gx + gw / 2, gy1 + 8, { size: 10, color: '#5b6670' });
      var gy2 = gy1 + gh + 46, o = api.D.plot(ctx, { x: gx, y: gy2, w: gw, h: gh }, { xmin: t0, xmax: t0 + 5, ymin: -Smax * 0.55, ymax: Smax, xlabel: 't (баяулатылған)', ylabel: 'p = ui, Вт', series: [] });
      // оң және теріс аудандарды бояу
      for (var k = 1; k < pp.length; k++) { var a = pp[k - 1], b = pp[k]; ctx.fillStyle = b[1] >= 0 ? 'rgba(224,118,27,.45)' : 'rgba(31,95,209,.45)'; ctx.beginPath(); ctx.moveTo(o.X(a[0]), o.Y(0)); ctx.lineTo(o.X(a[0]), o.Y(a[1])); ctx.lineTo(o.X(b[0]), o.Y(b[1])); ctx.lineTo(o.X(b[0]), o.Y(0)); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#b4560f'; ctx.lineWidth = 2; ctx.beginPath(); pp.forEach(function (q, j) { if (j) ctx.lineTo(o.X(q[0]), o.Y(q[1])); else ctx.moveTo(o.X(q[0]), o.Y(q[1])); }); ctx.stroke();
      ctx.strokeStyle = '#0b8a7a'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.X(t0), o.Y(Pa)); ctx.lineTo(o.X(t0 + 5), o.Y(Pa)); ctx.stroke(); ctx.setLineDash([]);
      R.tag(ctx, 'P орт = ' + Math.round(Pa) + ' Вт', gx + gw - 70, o.Y(Pa) - 12, { size: 10.5, color: '#0b6b78' });
      // қуаттар үшбұрышы
      var tx = wide ? W * 0.76 : W * 0.2, ty = wide ? H * 0.72 : H * 0.92, ks = (wide ? Math.min(W * 0.18, H * 0.45) : Math.min(W * 0.5, H * 0.14)) / (P.U * P.I);
      var dx = Pa * ks, dy = P.U * P.I * Math.sin(f) * ks;
      ctx.save(); R.rr(ctx, tx - 20, ty - (wide ? H * 0.55 : H * 0.18), wide ? W * 0.22 : W * 0.7, wide ? H * 0.68 : H * 0.22, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.88)' : 'rgba(255,255,255,.9)'; ctx.fill(); ctx.restore();
      api.D.arrow(ctx, tx, ty, tx + dx, ty, '#0b8a7a', 2.5, 'P');
      api.D.arrow(ctx, tx + dx, ty, tx + dx, ty - dy, '#1f5fd1', 2.5, 'Q');
      api.D.arrow(ctx, tx, ty, tx + dx, ty - dy, '#d2382b', 2.5, 'S');
      R.txt(ctx, 'Қуаттар үшбұрышы', tx + (wide ? W * 0.09 : W * 0.3), ty - (wide ? H * 0.55 : H * 0.18) + 14, { size: 10.5, weight: '700' });
    },
  });
})();

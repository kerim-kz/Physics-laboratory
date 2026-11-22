/* Айнымалы ток: кернеу мен токтың синусоидалы тербелістері, айналатын вектор (фазор) және әсерлік мәндер. Айнымалы ток шамы мен тұрақты ток шамының жарықтығын салыстыру. */
(function () {
  var R = window.Real;
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.45, grid: false, keepRunning: true, autoplay: true,
    hint: 'Тұрақты кернеуді өзгертіп, екі шамның жарықтығын теңестір. Сол кездегі тұрақты кернеу айнымалы кернеудің әсерлік мәніне тең: U = U_m/√2.',
    controls: [
      { type: 'range', key: 'Um', label: 'Кернеу амплитудасы U<sub>m</sub>', min: 50, max: 340, step: 10, value: 311, unit: 'В', digits: 0 },
      { type: 'range', key: 'f', label: 'Жиілік ν (баяулатылған)', min: 0.2, max: 2, step: 0.1, value: 0.5, unit: 'Гц', digits: 1 },
      { type: 'range', key: 'Udc', label: 'Салыстыру: тұрақты кернеу', min: 0, max: 340, step: 5, value: 150, unit: 'В', digits: 0, live: true },
      { type: 'range', key: 'R', label: 'Шамның кедергісі R', min: 100, max: 1000, step: 50, value: 500, unit: 'Ом', digits: 0 },
    ],
    readouts: [
      { key: 'u', label: 'Лездік кернеу u = U<sub>m</sub> sin ωt', unit: 'В', digits: 0 },
      { key: 'Ue', label: 'Әсерлік кернеу U = U<sub>m</sub>/√2', unit: 'В', digits: 1 },
      { key: 'Ie', label: 'Әсерлік ток I = U/R', unit: 'А', digits: 3 },
      { key: 'P', label: 'Орташа қуат P = UI', unit: 'Вт', digits: 1 },
      { key: 'Pdc', label: 'Тұрақты ток шамының қуаты', unit: 'Вт', digits: 1 },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) { var P = api.P, Ue = P.Um / Math.SQRT2; return { u: P.Um * Math.sin(2 * Math.PI * P.f * api.S.t), Ue: Ue, Ie: Ue / P.R, P: Ue * Ue / P.R, Pdc: P.Udc * P.Udc / P.R }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, w = 2 * Math.PI * P.f, ph = w * S.t, u = P.Um * Math.sin(ph), i = u / P.R, wide = W > 640, dark = R.isDark();
      R.tableTop(ctx, 0, 0, W, H, '#a87a4c');
      // фазор
      var cx = wide ? W * 0.13 : W * 0.25, cy = wide ? H * 0.3 : H * 0.17, rr = Math.min(wide ? W * 0.085 : W * 0.18, H * 0.16);
      ctx.save(); R.rr(ctx, cx - rr - 20, cy - rr - 26, 2 * rr + 40, 2 * rr + 50, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.9)' : 'rgba(255,255,255,.93)'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(120,130,140,.5)'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.moveTo(cx - rr - 8, cy); ctx.lineTo(cx + rr + 8, cy); ctx.stroke();
      api.D.arrow(ctx, cx, cy, cx + Math.cos(ph) * rr, cy - Math.sin(ph) * rr, '#d2382b', 2.5, 'U_m');
      ctx.setLineDash([3, 3]); ctx.strokeStyle = '#d2382b'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ph) * rr, cy - Math.sin(ph) * rr); ctx.lineTo(cx + rr + 20, cy - Math.sin(ph) * rr); ctx.stroke(); ctx.setLineDash([]);
      R.txt(ctx, 'Айналатын вектор: ωt', cx, cy + rr + 14, { size: 10, color: '#5b6670' });
      // u(t), i(t) графигі
      var gx = wide ? W * 0.32 : 50, gy = wide ? 24 : cy + rr + 40, gw = wide ? W * 0.64 : W - 66, gh = wide ? H * 0.46 : H * 0.3;
      ctx.save(); R.rr(ctx, gx - 44, gy - 14, gw + 56, gh + 44, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore();
      var tw = 2.5 / P.f, t0 = Math.max(0, S.t - tw * 0.8), pu = [], pi = [];
      for (var t = t0; t <= t0 + tw; t += tw / 240) { pu.push([t, P.Um * Math.sin(w * t)]); pi.push([t, P.Um * Math.sin(w * t) / P.R * 400]); }
      var Ue = P.Um / Math.SQRT2;
      var o = api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: t0, xmax: t0 + tw, ymin: -360, ymax: 360, xlabel: 't, с', ylabel: 'u, В', series: [{ pts: pi, color: '#1f5fd1', width: 1.5, dash: [5, 3] }, { pts: pu, color: '#d2382b', width: 2.4 }, { pts: [[t0, Ue], [t0 + tw, Ue]], color: '#0b8a7a', dash: [6, 4], width: 1.5 }, { pts: [[t0, P.Udc], [t0 + tw, P.Udc]], color: '#e0761b', width: 1.5 }], marker: [S.t, u] });
      R.tag(ctx, 'U = U_m/√2 = ' + Math.round(Ue) + ' В', o.X(t0 + tw * 0.15), o.Y(Ue) - 12, { size: 10, color: '#0b6b78' });
      R.tag(ctx, 'тұрақты ' + P.Udc + ' В', o.X(t0 + tw * 0.15), o.Y(P.Udc) + 12, { size: 10, color: '#b4560f' });
      R.txt(ctx, 'қызыл — u(t), көк үзік — i(t) (масштабталған)', gx + gw / 2, gy + gh + 28, { size: 9.5, color: '#5b6670' });
      // екі шам
      var by = wide ? H * 0.82 : H * 0.83, b1 = wide ? W * 0.35 : W * 0.3, b2 = wide ? W * 0.65 : W * 0.72;
      var Pac = Ue * Ue / P.R, Pdc = P.Udc * P.Udc / P.R, Pmax = 340 * 340 / 2 / P.R;
      // айнымалы ток шамы лездік қуатпен сәл жыпылықтайды (100 Гц жыпылықтау көзге байқалмайды)
      var flick = 0.7 + 0.3 * Math.pow(Math.sin(ph), 2);
      R.bulb(ctx, b1, by - 20, 20, Math.min(1, Math.sqrt(Pac / Pmax) * 1.3) * flick);
      R.bulb(ctx, b2, by - 20, 20, Math.min(1, Math.sqrt(Pdc / Pmax) * 1.3));
      R.tag(ctx, 'Айнымалы ток (~)', b1, by + 28, { size: 10.5 }); R.tag(ctx, 'Тұрақты ток (=)', b2, by + 28, { size: 10.5 });
      var same = Math.abs(Pac - Pdc) / Math.max(Pac, 1) < 0.04;
      R.tag(ctx, same ? 'Жарықтықтар тең: U_тұр ≈ U_әсер!' : (Pdc < Pac ? 'Тұрақты кернеуді арттыр' : 'Тұрақты кернеуді азайт'), (b1 + b2) / 2, by - 66, { size: 11, color: same ? '#0b8a7a' : '#5b6670' });
    },
  });
})();

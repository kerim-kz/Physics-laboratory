/* Карно циклі: екі изотерма және екі адиабата. pV диаграммасындағы цикл ауданы — бір циклдегі пайдалы жұмыс; η = 1 − T₂/T₁. Энтропия ΔS = Q/T. */
(function () {
  var R = window.Real, Rg = 8.314, NU = 1, GAM = 5 / 3, V1 = 0.01;
  function cyc(P) {
    var T1 = P.T1, T2 = P.T2, V2 = V1 * P.r, V3 = V2 * Math.pow(T1 / T2, 1 / (GAM - 1)), V4 = V1 * Math.pow(T1 / T2, 1 / (GAM - 1));
    var Q1 = NU * Rg * T1 * Math.log(V2 / V1), Q2 = NU * Rg * T2 * Math.log(V3 / V4);
    return { T1: T1, T2: T2, V2: V2, V3: V3, V4: V4, Q1: Q1, Q2: Q2, A: Q1 - Q2, eta: 1 - T2 / T1 };
  }
  function point(c, u) { // u ∈ [0, 4): 0–1 изотерма T1, 1–2 адиабата, 2–3 изотерма T2, 3–4 адиабата
    var V, T, ph = Math.floor(u) % 4, f = u - Math.floor(u);
    if (ph === 0) { V = V1 * Math.pow(c.V2 / V1, f); T = c.T1; }
    else if (ph === 1) { V = c.V2 * Math.pow(c.V3 / c.V2, f); T = c.T1 * Math.pow(c.V2 / V, GAM - 1); }
    else if (ph === 2) { V = c.V3 * Math.pow(c.V4 / c.V3, f); T = c.T2; }
    else { V = c.V4 * Math.pow(V1 / c.V4, f); T = c.T2 * Math.pow(c.V4 / V, GAM - 1); }
    return { V: V, T: T, p: NU * Rg * T / V, ph: ph };
  }
  var NAMES = ['1→2: изотермалық ұлғаю (қыздырғыштан Q₁ алады)', '2→3: адиабаталық ұлғаю (суиды)', '3→4: изотермалық сығылу (суытқышқа Q₂ береді)', '4→1: адиабаталық сығылу (қызады)'];
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.3, grid: false, keepRunning: true, autoplay: true,
    hint: 'Қыздырғыш пен суытқыштың температураларын өзгерт. ПӘК тек осы екі температураға тәуелді екенін тексер.',
    controls: [
      { type: 'range', key: 'T1', label: 'Қыздырғыштың температурасы T₁', min: 400, max: 900, step: 50, value: 600, unit: 'К', digits: 0 },
      { type: 'range', key: 'T2', label: 'Суытқыштың температурасы T₂', min: 250, max: 400, step: 25, value: 300, unit: 'К', digits: 0 },
      { type: 'range', key: 'r', label: 'Изотермалық ұлғаю V₂/V₁', min: 1.5, max: 3, step: 0.25, value: 2, digits: 2 },
    ],
    readouts: [
      { key: 'Q1', label: 'Қыздырғыштан алынған жылу Q₁', unit: 'кДж', digits: 2 },
      { key: 'Q2', label: 'Суытқышқа берілген жылу Q₂', unit: 'кДж', digits: 2 },
      { key: 'A', label: 'Пайдалы жұмыс A = Q₁ − Q₂', unit: 'кДж', digits: 2 },
      { key: 'eta', label: 'ПӘК η = 1 − T₂/T₁', unit: '%', digits: 1 },
      { key: 'dS', label: 'ΔS = Q₁/T₁ = Q₂/T₂', unit: 'Дж/К', digits: 2 },
    ],
    init: function (api) { api.S.u = 0; },
    step: function (api, dt) { api.S.u = (api.S.u + dt * 0.4) % 4; },
    read: function (api) { var c = cyc(api.P); return { Q1: c.Q1 / 1000, Q2: c.Q2 / 1000, A: c.A / 1000, eta: c.eta * 100, dS: c.Q1 / c.T1 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, c = cyc(P), pt = point(c, S.u), wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 0.95 });
      // жылу машинасының сұлбасы: қыздырғыш → газ → суытқыш
      var sx = wide ? W * 0.16 : W * 0.5, top = 30;
      ctx.save(); R.rr(ctx, sx - 70, top, 140, 40, 8); ctx.fillStyle = '#d2382b'; ctx.fill(); ctx.restore();
      R.txt(ctx, 'Қыздырғыш T₁ = ' + P.T1 + ' К', sx, top + 20, { size: 11, color: '#fff', weight: '700' });
      var cy2 = H * (wide ? 0.42 : 0.27);
      ctx.save(); R.rr(ctx, sx - 50, cy2 - 30, 100, 60, 10); ctx.fillStyle = 'rgba(200,230,245,.4)'; ctx.fill(); ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      R.txt(ctx, 'Жұмысшы дене', sx, cy2, { size: 11, color: dark ? '#e6ecf0' : '#1b2329', weight: '600' });
      var by = H * (wide ? 0.75 : 0.46);
      ctx.save(); R.rr(ctx, sx - 70, by, 140, 40, 8); ctx.fillStyle = '#2f7fd1'; ctx.fill(); ctx.restore();
      R.txt(ctx, 'Суытқыш T₂ = ' + P.T2 + ' К', sx, by + 20, { size: 11, color: '#fff', weight: '700' });
      var q1w = 4 + c.Q1 / 1000 * 1.2, q2w = 4 + c.Q2 / 1000 * 1.2, aw = 4 + c.A / 1000 * 1.2;
      ctx.fillStyle = 'rgba(210,56,43,.7)'; ctx.fillRect(sx - q1w / 2, top + 40, q1w, cy2 - 30 - top - 40);
      ctx.fillStyle = 'rgba(47,127,209,.7)'; ctx.fillRect(sx - q2w / 2, cy2 + 30, q2w, by - cy2 - 30);
      ctx.fillStyle = 'rgba(11,138,122,.75)'; ctx.fillRect(sx + 50, cy2 - aw / 2, 60, aw);
      R.tag(ctx, 'Q₁', sx + 26, (top + 40 + cy2 - 30) / 2, { size: 10.5, color: '#b4342a' }); R.tag(ctx, 'Q₂', sx + 26, (cy2 + 30 + by) / 2, { size: 10.5, color: '#1f5fd1' }); R.tag(ctx, 'A', sx + 118, cy2 - 16, { size: 10.5, color: '#0b6b78' });
      // pV диаграммасы
      var gx = wide ? W * 0.42 : 40, gy = wide ? 34 : H * 0.64, gw = wide ? W * 0.54 : W - 60, gh = wide ? H * 0.74 : H * 0.27;
      ctx.save(); R.rr(ctx, gx - 44, gy - 16, gw + 56, gh + 48, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore();
      var loop = [], seg = [[], [], [], []];
      for (var u = 0; u <= 4.0001; u += 0.02) { var q = point(c, Math.min(u, 3.9999)); loop.push([q.V * 1000, q.p / 1000]); seg[q.ph].push([q.V * 1000, q.p / 1000]); }
      var Vmax = c.V3 * 1000 * 1.08, pmax = NU * Rg * c.T1 / V1 / 1000 * 1.1;
      var X = function (v) { return gx + v / Vmax * gw; }, Y = function (p) { return gy + gh - p / pmax * gh; };
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: Vmax, ymin: 0, ymax: pmax, xlabel: 'V, л', ylabel: 'p, кПа', series: [{ pts: seg[0], color: '#d2382b', width: 2.5 }, { pts: seg[1], color: '#7a3fb0', width: 2 }, { pts: seg[2], color: '#1f5fd1', width: 2.5 }, { pts: seg[3], color: '#7a3fb0', width: 2 }], marker: [pt.V * 1000, pt.p / 1000] });
      ctx.fillStyle = 'rgba(11,138,122,.18)'; ctx.beginPath(); loop.forEach(function (q, i) { if (i) ctx.lineTo(X(q[0]), Y(q[1])); else ctx.moveTo(X(q[0]), Y(q[1])); }); ctx.closePath(); ctx.fill();
      R.tag(ctx, NAMES[pt.ph], wide ? gx + gw / 2 : W / 2, wide ? gy + 14 : gy - 26, { size: W < 600 ? 9 : 11, color: '#0b6b78' });
      R.tag(ctx, 'Боялған аудан — бір циклдегі жұмыс A', wide ? gx + gw / 2 : W / 2, wide ? gy + gh - 20 : gy + gh - 12, { size: 10, color: '#0b6b78' });
      R.tag(ctx, 'η = 1 − T₂/T₁ = ' + (c.eta * 100).toFixed(1).replace('.', ',') + ' %', wide ? gx + gw - 80 : gx + gw - 70, wide ? gy + 44 : gy + 14, { size: W < 600 ? 10.5 : 12, color: '#b4342a' });
    },
  });
})();

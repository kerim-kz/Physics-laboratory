/* Адиабаталық процесс: пневматикалық тұтандырғыш (ауаны поршеньмен тез сығу). Пуассон теңдеуі pVᵞ = const, TV^(γ−1) = const. Изотермамен салыстыру. */
(function () {
  var R = window.Real, GAM = 1.4, T0 = 293, p0 = 101.3; // ауа (екі атомды газ), кПа
  Sim.create({
    aspect: 0.6, aspectNarrow: 0.95, grid: false,
    hint: 'Поршеньді тез бас: жылу алмасуға уақыт болмайды. Ауа неше есе сығылғанда мақта тұтанады (≈ 230 °C)?',
    controls: [
      { type: 'range', key: 'k', label: 'Сығу дәрежесі V₁/V₂', min: 2, max: 20, step: 1, value: 12, digits: 0 },
      { type: 'select', key: 'speed', label: 'Сығу', value: 'fast', options: [['fast', 'Тез (адиабаталық)'], ['slow', 'Баяу (изотермалық)']] },
    ],
    readouts: [
      { key: 'p', label: 'Қысым p', unit: 'кПа', digits: 0 },
      { key: 'T', label: 'Ауаның температурасы', unit: '°C', digits: 0 },
      { key: 'ratio', label: 'V₁/V', digits: 1 },
      { key: 'fire', label: 'Мақта', text: true },
    ],
    init: function (api) { api.S.s = 0; api.S.hist = []; api.S.iso = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P; S.s = Math.min(1, S.s + dt * (P.speed === 'fast' ? 1.2 : 0.25));
      var st = state(P, S.s); S.hist.push([st.v, st.p]);
      if (S.s >= 1) return false;
    },
    read: function (api) { var st = state(api.P, api.S.s); return { p: st.p, T: st.T - 273, ratio: 1 / st.v, fire: st.T - 273 > 230 ? 'тұтанды!' : 'тұтанбады' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, st = state(P, S.s), table = H * 0.92, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: table });
      // шыны цилиндр (тік)
      var cx = wide ? W * 0.2 : W * 0.25, cw = 56, ch = H * 0.7, top = table - ch - 6, py = top + 10 + (1 - st.v) * (ch - 40);
      ctx.fillStyle = 'rgba(210,235,250,.3)'; ctx.fillRect(cx - cw / 2, top, cw, ch);
      var hot = Math.max(0, Math.min(1, (st.T - 293) / 500));
      ctx.fillStyle = 'rgba(255,' + Math.round(220 - 150 * hot) + ',' + Math.round(200 - 190 * hot) + ',' + (0.15 + 0.5 * hot) + ')'; ctx.fillRect(cx - cw / 2 + 3, py + 14, cw - 6, top + ch - py - 18);
      ctx.strokeStyle = 'rgba(80,120,140,.95)'; ctx.lineWidth = 3; ctx.strokeRect(cx - cw / 2, top, cw, ch);
      R.block(ctx, cx - cw / 2 + 3, py, cw - 6, 14, 'steel', { depth: 3, shadow: false });
      ctx.fillStyle = '#7d878f'; ctx.fillRect(cx - 4, top - 40, 8, py - top + 40); ctx.fillStyle = '#2b2f33'; ctx.fillRect(cx - 24, top - 50, 48, 12);
      // мақта
      var mx = cx, my = top + ch - 14, fire = st.T - 273 > 230;
      ctx.fillStyle = '#f4f1e6'; ctx.beginPath(); ctx.ellipse(mx, my, 12, 7, 0, 0, 7); ctx.fill();
      if (fire) R.flame(ctx, mx, my, 30, S.s * 20);
      // pV графигі: адиабата мен изотерма
      var gx = wide ? W * 0.47 : W * 0.5, gy = 34, gw = wide ? W * 0.48 : W * 0.46, gh = wide ? H * 0.72 : H * 0.5;
      ctx.save(); R.rr(ctx, gx - 40, gy - 16, gw + 52, gh + 48, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore();
      var ad = [], iso = [], pm = p0 * Math.pow(P.k, GAM) * 1.05;
      for (var v = 1; v >= 1 / P.k; v -= 0.005) { ad.push([v, p0 * Math.pow(1 / v, GAM)]); iso.push([v, p0 / v]); }
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 1.05, ymin: 0, ymax: pm, xlabel: 'V / V₁', ylabel: 'p, кПа', series: [{ pts: iso, color: '#1f5fd1', dash: [5, 4], width: 1.5 }, { pts: ad, color: 'rgba(210,56,43,.4)', dash: [5, 4], width: 1.5 }, { pts: S.hist, color: P.speed === 'fast' ? '#d2382b' : '#1f5fd1', width: 2.5 }], marker: [st.v, st.p] });
      R.tag(ctx, 'үзік қызыл — адиабата pVᵞ = const; көк — изотерма pV = const', wide ? gx + gw / 2 : W / 2, H - 14, { size: W < 600 ? 9 : 10.5 });
      R.tag(ctx, fire ? 'Ауа ' + Math.round(st.T - 273) + ' °C-қа дейін қызып, мақта тұтанды!' : 'T = ' + Math.round(st.T - 273) + ' °C', wide ? cx : W / 2, wide ? Math.max(16, top - 72) : H - 38, { size: 11, color: fire ? '#b4342a' : '#0b6b78' });
    },
  });
  function state(P, s) {
    var v = 1 - (1 - 1 / P.k) * s; // V / V₁
    if (P.speed === 'fast') return { v: v, p: p0 * Math.pow(1 / v, GAM), T: T0 * Math.pow(1 / v, GAM - 1) };
    return { v: v, p: p0 / v, T: T0 };
  }
})();

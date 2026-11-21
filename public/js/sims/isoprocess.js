/* Изопроцестер: поршеньді цилиндрдегі газ (ν = 0,1 моль). Изотермалық, изобаралық, изохоралық процестер және олардың p–V, V–T, p–T графиктері; газдың жұмысы pV диаграммасындағы аудан. */
(function () {
  var R = window.Real, Rg = 8.314, NU = 0.1;
  var PROC = { T: ['Изотермалық (T = const)', 'Бойль — Мариотт: pV = const'], p: ['Изобаралық (p = const)', 'Гей-Люссак: V/T = const'], V: ['Изохоралық (V = const)', 'Шарль: p/T = const'] };
  Sim.create({
    aspect: 0.62, aspectNarrow: 1.15, grid: false,
    hint: 'Процесті таңдап, «Бастау» бас. Газдың күйі графиктерде қалай өзгереді? Газдың жұмысы pV графигінің астындағы ауданға тең.',
    controls: [
      { type: 'select', key: 'proc', label: 'Процесс', value: 'T', options: Object.keys(PROC).map(function (k) { return [k, PROC[k][0]]; }) },
      { type: 'select', key: 'dir', label: 'Бағыты', value: 'up', options: [['up', 'Ұлғаю / қыздыру'], ['down', 'Сығылу / суыту']] },
      { type: 'select', key: 'graph', label: 'График', value: 'pV', options: [['pV', 'p–V'], ['VT', 'V–T'], ['pT', 'p–T']], live: true },
    ],
    readouts: [
      { key: 'p', label: 'Қысым p', unit: 'кПа', digits: 1 },
      { key: 'V', label: 'Көлем V', unit: 'л', digits: 2 },
      { key: 'T', label: 'Температура T', unit: 'К', digits: 0 },
      { key: 'A', label: 'Газдың жұмысы A', unit: 'Дж', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.s = 0; S.hist = []; push(api); },
    step: function (api, dt) { var S = api.S; S.s = Math.min(1, S.s + dt * 0.3); push(api); if (S.s >= 1) return false; },
    read: function (api) { var st = state(api.P, api.S.s); return { p: st.p / 1000, V: st.V * 1000, T: st.T, A: st.A }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, st = state(P, S.s), table = H * 0.92, wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: table });
      // цилиндр
      var cx = wide ? W * 0.2 : W * 0.25, cw = 90, ch = H * (wide ? 0.62 : 0.34), top = table - ch - 10, vfrac = (st.V * 1000 - 0.5) / 4.5;
      var py = top + 20 + (1 - vfrac) * (ch - 70);
      R.burner(ctx, cx, table - 6, S.s * 10, P.dir === 'up' && P.proc !== 'T', { size: 0.7 });
      ctx.fillStyle = 'rgba(200,230,245,.25)'; ctx.fillRect(cx - cw / 2, top, cw, ch);
      ctx.fillStyle = 'rgba(255,' + Math.round(200 - (st.T - 200) / 6) + ',' + Math.round(180 - (st.T - 200) / 5) + ',.35)'; ctx.fillRect(cx - cw / 2 + 3, py + 12, cw - 6, top + ch - py - 15);
      ctx.strokeStyle = 'rgba(80,120,140,.9)'; ctx.lineWidth = 2.5; ctx.strokeRect(cx - cw / 2, top, cw, ch);
      R.block(ctx, cx - cw / 2 + 3, py, cw - 6, 12, 'steel', { depth: 3, shadow: false });
      ctx.fillStyle = '#7d878f'; ctx.fillRect(cx - 3, top - 30, 6, py - top + 30);
      if (P.proc === 'p') R.weight(ctx, cx, top - (wide ? 70 : 60), 500, { label: 'p = const' });
      if (P.proc === 'V') { ctx.fillStyle = '#c0392b'; ctx.fillRect(cx - cw / 2 - 8, py - 4, 8, 20); ctx.fillRect(cx + cw / 2, py - 4, 8, 20); R.tag(ctx, 'бекітілген', cx, py - 18, { size: 9.5 }); }
      R.thermometer(ctx, cx + cw / 2 + 24, top + 10, ch * 0.7, st.T - 273, -50, 600, { step: 100 });
      R.meter(ctx, wide ? cx : W - 46, wide ? top - 26 - (P.proc === 'p' ? 70 : 0) : top + 40, 28, st.p / 1000, 400, { letter: 'кПа', step: 100 });
      // график
      var gx = wide ? W * 0.47 : 40, gy = wide ? 34 : H * 0.05, gw = wide ? W * 0.48 : W - 60, gh = wide ? H * 0.72 : H * 0.3;
      if (!wide) { gx = 48; gy = 20; gw = W - 64; gh = H * 0.26; }
      ctx.save(); R.rr(ctx, gx - 40, gy - 16, gw + 52, gh + 48, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : 'rgba(255,255,255,.94)'; ctx.fill(); ctx.restore();
      var G = P.graph, xs = G === 'pV' ? [0, 5.5, 'V, л'] : [0, 700, 'T, К'], ys = G === 'VT' ? [0, 5.5, 'V, л'] : [0, 450, 'p, кПа'];
      var map = function (h) { return [G === 'pV' ? h.V * 1000 : h.T, G === 'VT' ? h.V * 1000 : h.p / 1000]; };
      var pts = S.hist.map(map);
      var area = [];
      if (G === 'pV' && pts.length > 1) { area = [[pts[0][0], 0]].concat(pts).concat([[pts[pts.length - 1][0], 0]]); }
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: xs[0], xmax: xs[1], ymin: ys[0], ymax: ys[1], xlabel: xs[2], ylabel: ys[2], series: [{ pts: pts, color: '#d2382b', width: 2.5 }], marker: map(st) });
      if (area.length) { var X = function (v) { return gx + v / xs[1] * gw; }, Y = function (v) { return gy + gh - v / ys[1] * gh; }; ctx.fillStyle = 'rgba(224,118,27,.25)'; ctx.beginPath(); area.forEach(function (q, i) { if (i) ctx.lineTo(X(q[0]), Y(q[1])); else ctx.moveTo(X(q[0]), Y(q[1])); }); ctx.closePath(); ctx.fill(); }
      R.tag(ctx, PROC[P.proc][1] + (G === 'pV' ? '; боялған аудан — газдың жұмысы' : ''), wide ? gx + gw / 2 : W / 2, H - 14, { size: W < 600 ? 9.5 : 11, color: '#0b6b78' });
    },
  });
  function state(P, s) {
    var V0 = 2e-3, T0 = 300, p0 = NU * Rg * T0 / V0, k = P.dir === 'up' ? 1 : -1, V, T, p, A;
    if (P.proc === 'T') { T = T0; V = V0 * (1 + k * 0.6 * s); p = NU * Rg * T / V; A = NU * Rg * T * Math.log(V / V0); }
    else if (P.proc === 'p') { p = p0; T = T0 * (1 + k * 0.6 * s); V = NU * Rg * T / p; A = p * (V - V0); }
    else { V = V0; T = T0 * (1 + k * 0.6 * s); p = NU * Rg * T / V; A = 0; }
    return { p: p, V: V, T: T, A: A };
  }
  function push(api) { api.S.hist.push(state(api.P, api.S.s)); }
})();

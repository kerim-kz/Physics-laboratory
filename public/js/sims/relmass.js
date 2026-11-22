/* Релятивистік динамика: үдеткіштегі протон (электрон). Жылдамдық жарық жылдамдығына жақындағанда импульс пен энергия шексіз өседі, ал жылдамдық c-дан аспайды. Ньютон механикасымен салыстыру. */
(function () {
  var R = window.Real, c = 3e8, eV = 1.602e-19;
  var PART = { e: ['Электрон', 9.109e-31, 0.511], p: ['Протон', 1.673e-27, 938.3] };
  Sim.create({
    aspect: 0.6, aspectNarrow: 1.25, grid: false, static: true,
    hint: 'Үдетуші кернеуді арттыр. Ньютон бойынша жылдамдық c-дан асып кетеді, ал шын мәнінде ол c-ға тек жақындайды. Энергия тыныштық энергиясынан неше есе үлкен?',
    controls: [
      { type: 'select', key: 'p', label: 'Бөлшек', value: 'e', options: Object.keys(PART).map(function (k) { return [k, PART[k][0]]; }) },
      { type: 'range', key: 'lg', label: 'Кинетикалық энергия lg(E<sub>k</sub> / эВ)', min: 3, max: 10, step: 0.1, value: 5.7, digits: 1 },
    ],
    readouts: [
      { key: 'Ek', label: 'Кинетикалық энергия E<sub>k</sub>', unit: 'МэВ', digits: 3 },
      { key: 'g', label: 'γ = 1 + E<sub>k</sub>/(mc²)', digits: 3 },
      { key: 'b', label: 'Жылдамдық v/c', digits: 6 },
      { key: 'bn', label: 'Ньютон бойынша v/c = √(2E<sub>k</sub>/m)/c', digits: 3 },
      { key: 'p', label: 'Импульс pc', unit: 'МэВ', digits: 3 },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var s = calc(api.P); return { Ek: s.Ek, g: s.g, b: s.b, bn: s.bn, p: s.pc }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, s = calc(P), wide = W > 640, dark = R.isDark();
      R.scene(ctx, W, H, 'lab', { table: H * 1.2 });
      // үдеткіш құбыр
      var y = 50, x0 = 30, x1 = W - 30;
      ctx.save(); R.rr(ctx, x0, y - 18, x1 - x0, 36, 18); var g = ctx.createLinearGradient(0, y - 18, 0, y + 18); g.addColorStop(0, '#9aa4ad'); g.addColorStop(0.5, '#e6ebef'); g.addColorStop(1, '#7d878f'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      for (var k = 0; k < 8; k++) { var xx = x0 + 30 + k * (x1 - x0 - 60) / 7; ctx.fillStyle = '#b87333'; ctx.fillRect(xx - 4, y - 22, 8, 44); }
      R.sphere(ctx, x0 + 20 + (x1 - x0 - 40) * Math.min(1, s.b), y, 7, P.p === 'e' ? '#1f5fd1' : '#d2382b');
      R.tag(ctx, 'v = ' + s.b.toFixed(s.b > 0.99 ? 5 : 3).replace('.', ',') + 'c', x0 + 20 + (x1 - x0 - 40) * Math.min(1, s.b), y + 32, { size: 10.5 });
      // v(Ek) графигі: релятивистік және классикалық
      var gx = wide ? 60 : 50, gy = y + 60, gw = wide ? W * 0.42 : W - 70, gh = wide ? H - gy - 50 : (H - gy - 110) / 2;
      var panel = function (x, yy, w, h) { ctx.save(); R.rr(ctx, x - 46, yy - 16, w + 58, h + 46, 8); ctx.fillStyle = dark ? 'rgba(20,26,32,.93)' : 'rgba(255,255,255,.95)'; ctx.fill(); ctx.restore(); };
      panel(gx, gy, gw, gh);
      var rel = [], cl = [], m = PART[P.p];
      for (var lg = 3; lg <= 10; lg += 0.05) { var q = calc({ p: P.p, lg: lg }); rel.push([lg, q.b]); cl.push([lg, Math.min(3, q.bn)]); }
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 3, xmax: 10, ymin: 0, ymax: 2, xlabel: 'lg(E_k / эВ)', ylabel: 'v / c', series: [{ pts: [[3, 1], [10, 1]], color: '#e0a800', dash: [6, 4] }, { pts: cl, color: 'rgba(122,63,176,.8)', dash: [5, 4], width: 2 }, { pts: rel, color: '#d2382b', width: 2.6 }], marker: [P.lg, s.b] });
      R.txt(ctx, 'қызыл — шын (СТО), күлгін — Ньютон бойынша, сары — c', gx + gw / 2, gy + 8, { size: 9.5, color: '#5b6670' });
      // энергия бағандары
      var bx = wide ? W * 0.6 : gx, by = wide ? gy : gy + gh + 56, bw = wide ? W * 0.34 : gw, bh = gh;
      panel(bx, by, bw, bh);
      var E0 = m[2], Et = E0 + s.Ek, mx = Math.max(Et, s.pc) * 1.1, items = [['E₀ = mc²', E0, '#0b8a7a'], ['E_k', s.Ek, '#e0761b'], ['E = γmc²', Et, '#d2382b'], ['pc', s.pc, '#1f5fd1']];
      items.forEach(function (it, i) {
        var h2 = it[1] / mx * (bh - 30), x = bx + (i + 0.5) * bw / 4;
        ctx.fillStyle = it[2]; ctx.fillRect(x - 16, by + bh - h2, 32, h2);
        R.txt(ctx, it[0], x, by + bh + 12, { size: 10, weight: '700', color: it[2] });
        R.txt(ctx, fmt(it[1]) + ' МэВ', x, by + bh - h2 - 10, { size: 9.5, color: dark ? '#e6ecf0' : '#33404a' });
      });
      R.txt(ctx, 'E² = (pc)² + (mc²)²', bx + bw / 2, by + 6, { size: 11, weight: '700', color: '#0b6b78' });
    },
  });
  function calc(P) { var m = PART[P.p], Ek = Math.pow(10, P.lg) / 1e6, g = 1 + Ek / m[2], b = Math.sqrt(1 - 1 / (g * g)), bn = Math.sqrt(2 * Ek / m[2]), pc = Math.sqrt(Math.pow(Ek + m[2], 2) - m[2] * m[2]); return { Ek: Ek, g: g, b: b, bn: bn, pc: pc }; }
  function fmt(v) { return v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2).replace('.', ',') : v.toFixed(3).replace('.', ','); }
})();

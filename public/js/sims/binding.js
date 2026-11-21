/* Масса ақауы және байланыс энергиясы. Δm = Z·m(¹H) + N·mₙ − M(атом); E_б = Δm·c² (1 м.а.б. ↔ 931,5 МэВ). Меншікті байланыс энергиясының A-ға тәуелділігі. */
(function () {
  var R = window.Real;
  var MH = 1.007825, MN = 1.008665, U = 931.494;
  // [белгісі, атауы, Z, A, атомдық масса (м.а.б.)]
  var NUC = {
    h2: ['²H', 'Дейтерий', 1, 2, 2.014102], he3: ['³He', 'Гелий-3', 2, 3, 3.016029], he4: ['⁴He', 'Гелий-4 (α-бөлшек)', 2, 4, 4.002603], li7: ['⁷Li', 'Литий-7', 3, 7, 7.016003],
    c12: ['¹²C', 'Көміртек-12', 6, 12, 12.000000], o16: ['¹⁶O', 'Оттек-16', 8, 16, 15.994915], al27: ['²⁷Al', 'Алюминий-27', 13, 27, 26.981538], fe56: ['⁵⁶Fe', 'Темір-56', 26, 56, 55.934936],
    ni62: ['⁶²Ni', 'Никель-62', 28, 62, 61.928345], sn120: ['¹²⁰Sn', 'Қалайы-120', 50, 120, 119.902202], pb208: ['²⁰⁸Pb', 'Қорғасын-208', 82, 208, 207.976652], u235: ['²³⁵U', 'Уран-235', 92, 235, 235.043930], u238: ['²³⁸U', 'Уран-238', 92, 238, 238.050788],
  };
  function calc(k) { var n = NUC[k], Z = n[2], A = n[3], N = A - Z, dm = Z * MH + N * MN - n[4], E = dm * U; return { Z: Z, N: N, A: A, dm: dm, E: E, e: E / A }; }
  function semf(A) { // жартылай эмпирикалық формула: тұрақты Z үшін меншікті байланыс энергиясы
    var Z = Math.round(A / (1.98 + 0.0155 * Math.pow(A, 2 / 3)));
    var B = 15.75 * A - 17.8 * Math.pow(A, 2 / 3) - 0.711 * Z * (Z - 1) / Math.pow(A, 1 / 3) - 23.7 * Math.pow(A - 2 * Z, 2) / A;
    return Math.max(0, B / A);
  }
  Sim.create({
    aspect: 0.6, grid: false, static: true,
    hint: 'Ядроны таңдап, оның массасы құрамындағы бос нуклондардың массаларының қосындысынан неге кіші екенін көр. Қай ядро ең берік?',
    controls: [{ type: 'select', key: 'nuc', label: 'Ядро', value: 'he4', options: Object.keys(NUC).map(function (k) { return [k, NUC[k][0] + ' — ' + NUC[k][1]]; }) }],
    readouts: [
      { key: 'zn', label: 'Протондар / нейтрондар', text: true },
      { key: 'sum', label: 'Бос нуклондардың массасы Z·m(¹H) + N·mₙ', unit: 'м.а.б.', digits: 6 },
      { key: 'M', label: 'Атомның массасы M', unit: 'м.а.б.', digits: 6 },
      { key: 'dm', label: 'Масса ақауы Δm', unit: 'м.а.б.', digits: 6 },
      { key: 'E', label: 'Байланыс энергиясы E = Δm·c²', unit: 'МэВ', digits: 2 },
      { key: 'e', label: 'Меншікті байланыс энергиясы E/A', unit: 'МэВ/нуклон', digits: 3 },
    ],
    init: function () {}, step: function () { return false; },
    read: function (api) { var k = api.P.nuc, c = calc(k), n = NUC[k]; return { zn: c.Z + ' p / ' + c.N + ' n', sum: c.Z * MH + c.N * MN, M: n[4], dm: c.dm, E: c.E, e: c.e }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, n = NUC[P.nuc], c = calc(P.nuc), dark = R.isDark(), wide = W > 640;
      ctx.fillStyle = dark ? '#12171c' : '#eef1f3'; ctx.fillRect(0, 0, W, H);
      // таразы: сол табақта бос нуклондар, оң табақта ядро
      var bx = wide ? W * 0.27 : W * 0.5, by = H * 0.4, arm = Math.min(W * 0.17, 150), tilt = -0.06; // бос нуклондар ауыр → сол жақ төмен
      ctx.fillStyle = '#7d878f'; ctx.fillRect(bx - 4, by, 8, H * 0.42); ctx.fillRect(bx - 40, by + H * 0.42, 80, 10);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt); ctx.fillStyle = '#9aa3ab'; ctx.fillRect(-arm, -4, arm * 2, 8); ctx.restore();
      ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.moveTo(bx, by - 18); ctx.lineTo(bx - 8, by); ctx.lineTo(bx + 8, by); ctx.fill();
      var lx = bx - arm * Math.cos(tilt), ly = by - arm * Math.sin(tilt), rx = bx + arm * Math.cos(tilt), ry = by + arm * Math.sin(tilt);
      [[lx, ly], [rx, ry]].forEach(function (p) {
        ctx.strokeStyle = '#7d878f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - 46, p[1] + 70); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + 46, p[1] + 70); ctx.stroke();
        ctx.fillStyle = '#b8c0c7'; ctx.beginPath(); ctx.ellipse(p[0], p[1] + 72, 54, 9, 0, 0, 7); ctx.fill();
      });
      var nr = Math.max(3.2, Math.min(8, 40 / Math.sqrt(c.A)));
      // бос нуклондар (сол табақта үйінді)
      var cnt = 0, maxShow = 60;
      for (var i = 0; i < Math.min(c.A, maxShow); i++) {
        var row = Math.floor(i / 10), col = i % 10;
        var x = lx - 40 + col * 9 + (row % 2) * 4, y = ly + 62 - row * 8;
        R.sphere(ctx, x, y, Math.min(nr, 4.6), i < Math.min(c.Z, maxShow * c.Z / c.A) ? '#d2382b' : '#8f99a3');
        cnt++;
      }
      if (c.A > maxShow) R.tag(ctx, '× ' + c.A + ' нуклон', lx, ly + 100, { size: 10 });
      // ядро (оң табақта): нуклондар тығыз шоғыр
      var rr = R.rng(c.A), cx = rx, cy = ry + 72 - Math.cbrt(c.A) * nr * 1.1 - 6, Rn = Math.cbrt(c.A) * nr * 1.05;
      var pts = [];
      for (var j = 0; j < c.A; j++) { var a = rr() * 6.283, r = Math.cbrt(rr()) * Rn; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.95, j < c.Z]); }
      pts.sort(function (p, q) { return p[1] - q[1]; });
      pts.forEach(function (p) { R.sphere(ctx, p[0], p[1], nr, p[2] ? '#d2382b' : '#8f99a3'); });
      R.tag(ctx, 'Бос нуклондар: ' + c.Z + ' p + ' + c.N + ' n', lx, ly - 30, { size: 10.5 });
      R.tag(ctx, 'Ядро ' + n[0], rx, Math.min(ry - 30, cy - Rn - 14), { size: 10.5 });
      R.tag(ctx, 'Δm = ' + Sim.fmt(c.dm, 5) + ' м.а.б.  →  E = Δm·c² = ' + Sim.fmt(c.E, 1) + ' МэВ', bx, H * 0.08, { size: wide ? 12 : 10, color: '#b4342a' });
      R.tag(ctx, 'Бос нуклондар ауыр: ядро түзілгенде энергия бөлінеді', bx, H * 0.08 + 28, { size: wide ? 10.5 : 9, color: '#5b6670' });
      // E/A(A) графигі
      var gx = wide ? W * 0.56 : 40, gy = wide ? 34 : H * 0.62, gw = wide ? W * 0.4 : W - 60, gh = wide ? H * 0.72 : H * 0.28;
      if (!wide) return;
      ctx.save(); R.rr(ctx, gx - 44, gy - 20, gw + 56, gh + 56, 10); ctx.fillStyle = dark ? 'rgba(20,26,32,.92)' : '#ffffff'; ctx.fill(); ctx.restore();
      var curve = []; for (var A = 4; A <= 240; A += 2) curve.push([A, semf(A)]);
      var dots = Object.keys(NUC).map(function (k) { var q = calc(k); return [q.A, q.e]; });
      api.D.plot(ctx, { x: gx, y: gy, w: gw, h: gh }, { xmin: 0, xmax: 240, ymin: 0, ymax: 9.5, xlabel: 'A', ylabel: 'E/A, МэВ', series: [{ pts: curve, color: 'rgba(31,95,209,.55)' }], marker: [c.A, c.e] });
      dots.forEach(function (d) { ctx.fillStyle = '#0b8a7a'; ctx.beginPath(); ctx.arc(gx + d[0] / 240 * gw, gy + gh - d[1] / 9.5 * gh, 3.2, 0, 7); ctx.fill(); });
      R.tag(ctx, '⁵⁶Fe, ⁶²Ni — ең берік', gx + 62 / 240 * gw + 30, gy + gh - 8.8 / 9.5 * gh - 18, { size: 9.5, color: '#0b6b78' });
      R.tag(ctx, 'синтез →', gx + 22, gy + gh * 0.55, { size: 9.5, color: '#8a6100', align: 'left' });
      R.tag(ctx, '← бөліну', gx + gw - 8, gy + gh * 0.32, { size: 9.5, color: '#8a6100', align: 'right' });
    },
  });
})();

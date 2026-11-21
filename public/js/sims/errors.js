/* Өлшеу нәтижелерін өңдеу: маятниктің периодын қол секундомерімен бірнеше рет өлшеу. Орташа мән, орташа абсолют қателік, салыстырмалы қателік, гистограмма. */
(function () {
  var R = window.Real, L = 0.8, g = 9.81, T0 = 2 * Math.PI * Math.sqrt(L / g), SIG = 0.12; // реакция қателігі, с
  function randn() { return Math.sqrt(-2 * Math.log(Math.random() + 1e-12)) * Math.cos(2 * Math.PI * Math.random()); }
  function stats(list) {
    var n = list.length; if (!n) return null;
    var m = list.reduce(function (a, b) { return a + b; }, 0) / n;
    var d = list.reduce(function (a, b) { return a + Math.abs(b - m); }, 0) / n;
    return { n: n, mean: m, d: Math.max(d, 0.005), eps: Math.max(d, 0.005) / m * 100 };
  }
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true, autoplay: true,
    hint: '«Өлшеу» батырмасын бірнеше рет бас. N тербелістің уақытын өлшеп, бір тербелістің периодын тап. N өскенде қателік қалай өзгереді?',
    controls: [
      { type: 'select', key: 'N', label: 'Бір өлшеудегі тербелістер саны N', value: '10', options: [['1', '1 тербеліс'], ['5', '5 тербеліс'], ['10', '10 тербеліс'], ['20', '20 тербеліс']] },
    ],
    buttons: [
      { label: 'Өлшеу (секундомер)', onClick: function (api) { var N = +api.P.N, t = N * T0 + SIG * randn() - SIG * randn() * 0.6; t = Math.round(t * 100) / 100; api.S.list.push(t / N); api.S.raw.push(t); api.S.flash = 1; } },
      { label: 'Кестені тазалау', onClick: function (api) { api.S.list = []; api.S.raw = []; } },
    ],
    readouts: [
      { key: 'n', label: 'Өлшеулер саны', digits: 0 },
      { key: 'mean', label: 'Орташа период T̄', unit: 'с', digits: 3 },
      { key: 'd', label: 'Орташа абсолют қателік ΔT', unit: 'с', digits: 3 },
      { key: 'eps', label: 'Салыстырмалы қателік ε', unit: '%', digits: 1 },
      { key: 'res', label: 'Нәтиже', text: true },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.list = S.list || []; S.raw = S.raw || []; S.flash = 0; },
    step: function (api, dt) { api.S.t += dt; api.S.flash = Math.max(0, api.S.flash - dt * 2); },
    read: function (api) {
      var st = stats(api.S.list);
      if (!st) return { n: 0, mean: null, d: null, eps: null, res: '—' };
      return { n: st.n, mean: st.mean, d: st.d, eps: st.eps, res: 'T = (' + st.mean.toFixed(2).replace('.', ',') + ' ± ' + st.d.toFixed(2).replace('.', ',') + ') с' };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, table = H * 0.9, wide = W > 640;
      R.scene(ctx, W, H, 'lab', { table: table });
      // штатив пен маятник
      var px = wide ? W * 0.17 : W * 0.25, py = 30, Lp = Math.min(table - 80, H * 0.62);
      R.block(ctx, px - 60, table - 12, 110, 12, 'iron', { depth: 6 });
      R.cylinder(ctx, px - 56, py - 6, 8, table - 12 - py + 6, 'steel', { shadow: false });
      R.block(ctx, px - 56, py - 8, 70, 9, 'iron', { depth: 4, shadow: false });
      var th = 0.22 * Math.cos(2 * Math.PI * S.t / T0), bx = px + Math.sin(th) * Lp, by = py + Math.cos(th) * Lp;
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      R.sphere(ctx, bx, by, 11, '#c9a24a');
      R.lcd(ctx, px - 60, table + 4 < H - 30 ? table + 4 : H - 34, 120, 28, S.raw.length ? S.raw[S.raw.length - 1].toFixed(2).replace('.', ',') + ' с' : '0,00 с', { size: 14, bg: S.flash > 0 ? '#e9f7c0' : '#b8d0a0' });
      // кесте
      var tx = wide ? W * 0.33 : W * 0.5, ty = 18, rows = S.list.slice(-10), rh = 21;
      ctx.save(); R.rr(ctx, tx, ty, wide ? 250 : W * 0.47, 34 + rh * Math.max(1, rows.length), 8); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.stroke(); ctx.restore();
      R.txt(ctx, '№   t (N=' + P.N + '), с   T = t/N', tx + 10, ty + 16, { size: 11, mono: true, align: 'left', color: '#0b6b78' });
      var off = Math.max(0, S.list.length - 10);
      rows.forEach(function (T, i) { R.txt(ctx, (off + i + 1 < 10 ? ' ' : '') + (off + i + 1) + '   ' + S.raw[off + i].toFixed(2).replace('.', ',') + '      ' + T.toFixed(3).replace('.', ','), tx + 10, ty + 36 + i * rh, { size: 11, mono: true, align: 'left', color: '#1b2329' }); });
      if (!rows.length) R.txt(ctx, '«Өлшеу» батырмасын бас', tx + 10, ty + 36, { size: 11, align: 'left', color: '#5b6670' });
      // гистограмма
      if (wide) {
        var gx = W * 0.68, gy = 30, gw = W * 0.28, gh = H * 0.5;
        ctx.save(); R.rr(ctx, gx - 10, gy - 14, gw + 20, gh + 52, 8); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.restore();
        var lo = T0 - 0.15, hi = T0 + 0.15, nb = 12, bins = new Array(nb).fill(0);
        S.list.forEach(function (T) { var k = Math.floor((T - lo) / (hi - lo) * nb); if (k >= 0 && k < nb) bins[k]++; });
        var mx = Math.max(3, Math.max.apply(null, bins));
        bins.forEach(function (c, k) { var h = c / mx * gh; ctx.fillStyle = '#2f7fd1'; ctx.fillRect(gx + k * gw / nb + 1, gy + gh - h, gw / nb - 2, h); });
        ctx.strokeStyle = '#38424b'; ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
        var st = stats(S.list);
        if (st) {
          var X = function (v) { return gx + (v - lo) / (hi - lo) * gw; };
          ctx.fillStyle = 'rgba(210,56,43,.18)'; ctx.fillRect(X(st.mean - st.d), gy, X(st.mean + st.d) - X(st.mean - st.d), gh);
          ctx.strokeStyle = '#d2382b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(st.mean), gy); ctx.lineTo(X(st.mean), gy + gh); ctx.stroke();
        }
        R.txt(ctx, (lo).toFixed(2).replace('.', ','), gx, gy + gh + 14, { size: 9.5, color: '#3a4148' }); R.txt(ctx, hi.toFixed(2).replace('.', ','), gx + gw, gy + gh + 14, { size: 9.5, color: '#3a4148' });
        R.txt(ctx, 'T, с — өлшеулердің таралуы', gx + gw / 2, gy + gh + 32, { size: 10.5, color: '#3a4148' });
      }
      R.tag(ctx, 'Шын мәні: T = 2π√(l/g) = ' + T0.toFixed(3).replace('.', ',') + ' с (l = 0,8 м)', wide ? W * 0.5 : W / 2, H - 16, { size: 10.5, color: '#5b6670' });
    },
  });
})();

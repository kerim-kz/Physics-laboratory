/* №8 зертханалық жұмыс: тұрақты магниттің өрісі. Темір үгінділері өріс сызықтары бойымен тізіледі,
   компастар өріс бағытын көрсетеді. Компасты тінтуірмен жылжытуға болады. */
(function () {
  var R = window.Real;
  // Магниттік дипольдің өрісі (полюстер — нүктелік «магнит зарядтары» деп алынған)
  function field(cfg, x, y) {
    var bx = 0, by = 0;
    cfg.poles.forEach(function (p) { var dx = x - p[0], dy = y - p[1], r2 = dx * dx + dy * dy + 30, r3 = r2 * Math.sqrt(r2); bx += p[2] * dx / r3; by += p[2] * dy / r3; });
    return [bx, by];
  }
  function config(api) {
    var W = api.W, H = api.H, L = Math.min(W, H) * 0.34, cx = W / 2, cy = H / 2, P = api.P, poles = [], mags = [];
    if (P.cfg === 'bar') { mags.push([cx, cy, L, 0]); poles.push([cx + L / 2 - 8, cy, 1], [cx - L / 2 + 8, cy, -1]); }
    else if (P.cfg === 'attract') { var g = L * 0.35; mags.push([cx - L / 2 - g / 2, cy, L * 0.9, 0], [cx + L / 2 + g / 2, cy, L * 0.9, 0]); poles.push([cx - g / 2 - 8, cy, 1], [cx - L - g / 2 + 8, cy, -1], [cx + g / 2 + 8, cy, -1], [cx + L + g / 2 - 8, cy, 1]); }
    else if (P.cfg === 'repel') { var g2 = L * 0.35; mags.push([cx - L / 2 - g2 / 2, cy, L * 0.9, 0], [cx + L / 2 + g2 / 2, cy, L * 0.9, Math.PI]); poles.push([cx - g2 / 2 - 8, cy, 1], [cx - L - g2 / 2 + 8, cy, -1], [cx + g2 / 2 + 8, cy, 1], [cx + L + g2 / 2 - 8, cy, -1]); }
    else { // таға магнит
      var h = L * 0.8; poles.push([cx - L * 0.3, cy - h * 0.1, 1], [cx + L * 0.3, cy - h * 0.1, -1]);
    }
    return { poles: poles, mags: mags, L: L };
  }
  Sim.create({
    aspect: 0.62, grid: false, static: true, resetLabel: false,
    hint: 'Компасты тінтуірмен жылжыт: оның солтүстік ұшы (қызыл) өріс сызықтарының бағытын көрсетеді.',
    controls: [
      { type: 'select', key: 'cfg', label: 'Магниттер', value: 'bar', options: [['bar', 'Жолақ магнит'], ['attract', 'Екі магнит: әр аттас полюстер'], ['repel', 'Екі магнит: аттас полюстер'], ['horse', 'Таға тәрізді магнит']] },
      { type: 'check', key: 'filings', label: 'Темір үгінділері', value: true },
      { type: 'check', key: 'lines', label: 'Өріс сызықтары', value: false },
    ],
    pointer: { down: function (api, p) { api.S.cp = p; }, move: function (api, p, down) { if (down) api.S.cp = p; } },
    readouts: [{ key: 'info', label: 'Ереже', text: true }],
    init: function (api) { api.S.cp = null; },
    step: function () {},
    read: function (api) { return { info: api.P.cfg === 'repel' ? 'Аттас полюстер тебіледі' : api.P.cfg === 'attract' ? 'Әр аттас полюстер тартылады' : 'Өріс сызықтары N-нен шығып, S-ке кіреді' }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, cfg = config(api);
      // ақ қағаз парағы
      R.scene(ctx, W, H, 'lab', { table: 0 });
      R.tableTop(ctx, 0, 0, W, H);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.fillStyle = '#f7f6f1'; ctx.fillRect(W * 0.04, H * 0.05, W * 0.92, H * 0.9); ctx.restore();
      if (P.filings) {
        var r = R.rng(17);
        ctx.strokeStyle = 'rgba(60,60,64,.75)'; ctx.lineWidth = 1.1;
        for (var i = 0; i < 2600; i++) {
          var x = W * 0.05 + r() * W * 0.9, y = H * 0.06 + r() * H * 0.88, f = field(cfg, x, y), m = Math.hypot(f[0], f[1]);
          if (m * 1e5 < r() * 0.7) continue;
          var len = 3 + Math.min(4, m * 3e4), ux = f[0] / m, uy = f[1] / m;
          ctx.beginPath(); ctx.moveTo(x - ux * len, y - uy * len); ctx.lineTo(x + ux * len, y + uy * len); ctx.stroke();
        }
      }
      if (P.lines) {
        ctx.strokeStyle = 'rgba(31,95,209,.65)'; ctx.lineWidth = 1.4;
        cfg.poles.filter(function (p) { return p[2] > 0; }).forEach(function (p) {
          for (var k = 0; k < 14; k++) {
            var a = k / 14 * Math.PI * 2, x = p[0] + Math.cos(a) * 10, y = p[1] + Math.sin(a) * 10;
            ctx.beginPath(); ctx.moveTo(x, y);
            for (var s = 0; s < 500; s++) { var f = field(cfg, x, y), m = Math.hypot(f[0], f[1]); if (!m) break; x += f[0] / m * 3; y += f[1] / m * 3; ctx.lineTo(x, y); if (x < 0 || x > W || y < 0 || y > H) break; if (cfg.poles.some(function (q) { return q[2] < 0 && Math.hypot(x - q[0], y - q[1]) < 8; })) break; }
            ctx.stroke();
          }
        });
      }
      cfg.mags.forEach(function (m) { R.magnet(ctx, m[0], m[1], m[2], m[3]); });
      if (P.cfg === 'horse') {
        var cx = W / 2, cy = H / 2, L = cfg.L;
        ctx.save(); ctx.lineWidth = L * 0.18; ctx.lineCap = 'butt';
        ctx.strokeStyle = '#9aa3ab'; ctx.beginPath(); ctx.arc(cx, cy + L * 0.1, L * 0.3, 0, Math.PI); ctx.stroke();
        ctx.strokeStyle = '#d23b2f'; ctx.beginPath(); ctx.moveTo(cx - L * 0.3, cy + L * 0.1); ctx.lineTo(cx - L * 0.3, cy - L * 0.12); ctx.stroke();
        ctx.strokeStyle = '#2f6fbf'; ctx.beginPath(); ctx.moveTo(cx + L * 0.3, cy + L * 0.1); ctx.lineTo(cx + L * 0.3, cy - L * 0.12); ctx.stroke();
        ctx.restore();
        R.txt(ctx, 'N', cx - L * 0.3, cy - L * 0.05, { size: 13, color: '#fff' }); R.txt(ctx, 'S', cx + L * 0.3, cy - L * 0.05, { size: 13, color: '#fff' });
      }
      // компастар
      var pts = [[W * 0.2, H * 0.2], [W * 0.8, H * 0.2], [W * 0.2, H * 0.8], [W * 0.8, H * 0.8], [W * 0.5, H * 0.15], [W * 0.5, H * 0.85]];
      if (S.cp) pts.push([S.cp.x, S.cp.y]);
      pts.forEach(function (p, i) { var f = field(cfg, p[0], p[1]); R.compass(ctx, p[0], p[1], i === 6 ? 20 : 14, Math.atan2(f[1], f[0])); });
    },
  });
})();

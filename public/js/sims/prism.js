/* Призмадағы дисперсия: n(λ) = A + B/λ² (Коши формуласы). Ақ жарық спектрге жіктеледі. */
(function () {
  var MAT = { crown: ['Крон шыны', 1.5046, 0.0042], flint: ['Флинт шыны', 1.6200, 0.0105], water: ['Су', 1.3240, 0.0031], diamond: ['Алмас', 2.3800, 0.0128] };
  var COLORS = [[700, 'қызыл'], [620, 'сарғылт'], [580, 'сары'], [530, 'жасыл'], [480, 'көгілдір'], [450, 'көк'], [410, 'күлгін']];
  function rgb(nm) {
    var r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else r = 1;
    return 'rgb(' + [r, g, b].map(function (x) { return Math.round(255 * x); }).join(',') + ')';
  }
  function n(P, nm) { var m = MAT[P.mat], um = nm / 1000; return m[1] + m[2] / (um * um); }
  // Векторлық сыну: d — бағыт, nrm — бетке нормаль (сәулеге қарсы), n1→n2. Толық шағылу болса — null.
  function refract(d, nrm, n1, n2) {
    var cosi = -(d[0] * nrm[0] + d[1] * nrm[1]), eta = n1 / n2, k = 1 - eta * eta * (1 - cosi * cosi);
    if (k < 0) return null;
    var c = eta * cosi - Math.sqrt(k);
    return [eta * d[0] + c * nrm[0], eta * d[1] + c * nrm[1]];
  }
  function hit(p, d, a, b) { // p + t d  ∩  a + s(b-a)
    var ex = b[0] - a[0], ey = b[1] - a[1], den = d[0] * ey - d[1] * ex;
    if (Math.abs(den) < 1e-9) return null;
    var t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den, s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den;
    return t > 1e-6 && s >= 0 && s <= 1 ? [p[0] + d[0] * t, p[1] + d[1] * t] : null;
  }
  function trace(P, nm, geo) {
    var A = geo.A, B = geo.B, Cc = geo.C, ang = P.inc * Math.PI / 180;
    // сәуле сол жақ бетке (A–B) нормальға ang бұрышпен түседі
    var fx = B[0] - A[0], fy = B[1] - A[1], fl = Math.hypot(fx, fy), tx = fx / fl, ty = fy / fl;
    var nx = ty, ny = -tx; // сыртқы нормаль (солға-жоғары)
    var d = [-nx * Math.cos(ang) + tx * Math.sin(ang), -ny * Math.cos(ang) + ty * Math.sin(ang)];
    var mid = [(A[0] + B[0]) / 2 + tx * geo.off, (A[1] + B[1]) / 2 + ty * geo.off];
    var start = [mid[0] - d[0] * 400, mid[1] - d[1] * 400];
    var ni = n(P, nm);
    var d2 = refract(d, [nx, ny], 1, ni);
    var p2 = hit(mid, d2, A, Cc) ? hit(mid, d2, A, Cc) : hit(mid, d2, Cc, B);
    var face = hit(mid, d2, A, Cc) ? [A, Cc] : [Cc, B];
    if (!p2) return { pts: [start, mid], tir: false };
    var gx = face[1][0] - face[0][0], gy = face[1][1] - face[0][1], gl = Math.hypot(gx, gy);
    var on = [gy / gl, -gx / gl]; if (on[0] * d2[0] + on[1] * d2[1] < 0) on = [-on[0], -on[1]];
    var d3 = refract(d2, [-on[0], -on[1]], ni, 1);
    if (!d3) return { pts: [start, mid, p2], tir: true };
    return { pts: [start, mid, p2, [p2[0] + d3[0] * 2000, p2[1] + d3[1] * 2000]], dev: Math.acos(Math.max(-1, Math.min(1, d[0] * d3[0] + d[1] * d3[1]))) * 180 / Math.PI };
  }
  Sim.create({
    aspect: 0.62, static: true, resetLabel: false,
    tools: ['angle'],
    hint: 'Ақ жарық призмадан өткенде қай түс көбірек бұрылады?',
    controls: [
      { type: 'select', key: 'light', label: 'Жарық', value: 'white', options: [['white', 'Ақ жарық (спектр)'], ['mono', 'Бір түсті (λ таңдалады)']] },
      { type: 'range', key: 'lam', label: 'Толқын ұзындығы λ', min: 400, max: 700, step: 10, value: 600, unit: 'нм', digits: 0 },
      { type: 'select', key: 'mat', label: 'Призма заты', value: 'crown', options: Object.keys(MAT).map(function (k) { return [k, MAT[k][0]]; }) },
      { type: 'range', key: 'apex', label: 'Сындыру бұрышы', min: 30, max: 70, step: 1, value: 60, unit: '°', digits: 0 },
      { type: 'range', key: 'inc', label: 'Түсу бұрышы', min: 10, max: 80, step: 1, value: 50, unit: '°', digits: 0 },
    ],
    readouts: [
      { key: 'nr', label: 'n (қызыл, 700 нм)', digits: 4 },
      { key: 'nv', label: 'n (күлгін, 410 нм)', digits: 4 },
      { key: 'dr', label: 'Қызыл сәуленің ауытқуы', unit: '°', digits: 1 },
      { key: 'dv', label: 'Күлгін сәуленің ауытқуы', unit: '°', digits: 1 },
      { key: 'disp', label: 'Спектрдің бұрыштық ені', unit: '°', digits: 2 },
    ],
    init: function () {},
    step: function () {},
    read: function (api) {
      var P = api.P, geo = api.S.geo; if (!geo) return {};
      var r = trace(P, 700, geo), v = trace(P, 410, geo);
      return { nr: n(P, 700), nv: n(P, 410), dr: r.dev == null ? 'толық шағылу' : r.dev, dv: v.dev == null ? 'толық шағылу' : v.dev, disp: r.dev != null && v.dev != null ? v.dev - r.dev : null };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, C = api.C, D = api.D;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      var size = Math.min(W * 0.34, H * 0.7), cx = W * 0.42, base = H * 0.72, a = P.apex * Math.PI / 180;
      var h = size / 2 / Math.tan(a / 2);
      if (h > H * 0.62) { h = H * 0.62; }
      var halfw = h * Math.tan(a / 2);
      var geo = { A: [cx, base - h], B: [cx - halfw, base], C: [cx + halfw, base], off: -h * 0.1 };
      // A — төбесі; сол жақ бет A–B, оң жақ бет A–C. trace() сол бетті A–B деп алады.
      geo = { A: geo.B, B: geo.A, C: geo.C, off: h * 0.18 };
      api.S.geo = geo;
      ctx.fillStyle = 'rgba(180,220,255,.16)'; ctx.strokeStyle = 'rgba(200,230,255,.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(geo.A[0], geo.A[1]); ctx.lineTo(geo.B[0], geo.B[1]); ctx.lineTo(geo.C[0], geo.C[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
      var list = P.light === 'white' ? COLORS.map(function (c) { return c[0]; }) : [P.lam];
      var tir = false;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      list.forEach(function (nm, i) {
        var r = trace(P, nm, geo);
        ctx.strokeStyle = rgb(nm); ctx.lineWidth = P.light === 'white' ? 2 : 2.6;
        ctx.beginPath();
        r.pts.forEach(function (p, j) {
          if (j === 0) { ctx.moveTo(p[0], p[1]); return; }
          if (j === 1 && P.light === 'white') { ctx.strokeStyle = 'rgba(255,255,255,.9)'; }
          ctx.lineTo(p[0], p[1]);
          if (j === 1 && P.light === 'white') { ctx.stroke(); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.strokeStyle = rgb(nm); }
        });
        ctx.stroke();
        if (r.tir) tir = true;
      });
      ctx.restore();
      D.text(ctx, MAT[P.mat][0] + ', сындыру бұрышы ' + P.apex + '°', 14, 22, { size: 12, color: '#dbe7f5', weight: '600' });
      if (tir) D.text(ctx, 'Призманың екінші бетінде толық ішкі шағылу болды', 14, 42, { size: 12, color: '#ffb36b', weight: '600' });
      D.text(ctx, 'Қызыл аз, күлгін көп бұрылады: n күлгін > n қызыл', 14, H - 14, { size: 11, color: '#9fb3c8' });
    },
  });
})();

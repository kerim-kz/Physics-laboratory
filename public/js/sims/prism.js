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
      var P = api.P, D = api.D, R = window.Real;
      // қараңғыланған оптикалық кабинет: фон, оптикалық скамья
      var bg = ctx.createRadialGradient(W * 0.45, H * 0.45, 20, W * 0.45, H * 0.45, Math.max(W, H) * 0.8);
      bg.addColorStop(0, '#18233a'); bg.addColorStop(1, '#070b14');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      var rail = H * 0.9;
      var rg = ctx.createLinearGradient(0, rail, 0, H); rg.addColorStop(0, '#5b6675'); rg.addColorStop(0.3, '#2c333d'); rg.addColorStop(1, '#161a20');
      ctx.fillStyle = rg; ctx.fillRect(0, rail, W, H - rail);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, rail, W, 1.5);
      var size = Math.min(W * 0.34, H * 0.7), cx = W * 0.42, base = H * 0.72, a = P.apex * Math.PI / 180;
      var h = size / 2 / Math.tan(a / 2);
      if (h > H * 0.62) { h = H * 0.62; }
      var halfw = h * Math.tan(a / 2);
      // A — төбесі; сол жақ бет A–B, оң жақ бет A–C. trace() сол бетті A–B деп алады.
      var geo = { A: [cx - halfw, base], B: [cx, base - h], C: [cx + halfw, base], off: h * 0.18 };
      api.S.geo = geo;
      // призманың тұғыры
      ctx.fillStyle = '#3a4350'; R.rr(ctx, cx - 10, base, 20, rail - base, 3); ctx.fill();
      ctx.fillStyle = '#4c5664'; R.rr(ctx, cx - halfw * 0.6, base - 2, halfw * 1.2, 7, 3); ctx.fill();
      // экран
      var Xs = W - 26;
      var sg = ctx.createLinearGradient(Xs, 0, Xs + 14, 0); sg.addColorStop(0, '#d9dde2'); sg.addColorStop(1, '#9aa1aa');
      ctx.fillStyle = sg; ctx.fillRect(Xs, H * 0.08, 14, rail - H * 0.08);
      // жарық көзі: саңылауы бар фонарь (бірінші сәуле бойымен)
      var t0 = trace(P, 589, geo), st = t0.pts[0], md = t0.pts[1], dx = md[0] - st[0], dy = md[1] - st[1], dl = Math.hypot(dx, dy);
      var lampD = Math.min(dl, Math.max(70, (md[0] - 40) / Math.max(0.2, dx / dl)));
      var lx = md[0] - dx / dl * lampD, ly = md[1] - dy / dl * lampD, la = Math.atan2(dy, dx);
      var list = P.light === 'white' ? COLORS.map(function (c) { return c[0]; }) : [P.lam];
      var tir = false, spots = [];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      list.forEach(function (nm) {
        var r = trace(P, nm, geo), pts = r.pts.slice();
        pts[0] = [lx, ly];
        if (pts.length === 4) {
          var q = pts[2], d3 = [pts[3][0] - q[0], pts[3][1] - q[1]];
          if (d3[0] > 0) { var t = (Xs - q[0]) / d3[0]; pts[3] = [q[0] + d3[0] * t, q[1] + d3[1] * t]; if (pts[3][1] > H * 0.08 && pts[3][1] < rail) spots.push([pts[3][1], nm]); }
        }
        for (var j = 1; j < pts.length; j++) {
          var white = j === 1 && P.light === 'white', col = white ? 'rgba(255,255,255,.9)' : rgb(nm);
          ctx.strokeStyle = white ? 'rgba(255,255,255,.12)' : (P.light === 'white' ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)');
          ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(pts[j - 1][0], pts[j - 1][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
          ctx.strokeStyle = col; ctx.lineWidth = P.light === 'white' ? 2 : 2.6;
          ctx.beginPath(); ctx.moveTo(pts[j - 1][0], pts[j - 1][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
        }
        if (r.tir) tir = true;
      });
      // экрандағы түрлі түсті жолақ
      spots.forEach(function (sp) {
        var g = ctx.createRadialGradient(Xs, sp[0], 0, Xs, sp[0], 7);
        g.addColorStop(0, rgb(sp[1])); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(Xs - 7, sp[0] - 7, 14, 14);
      });
      ctx.restore();
      // шыны призма: мөлдір көлем, жиектегі жарқыл
      ctx.save();
      var pg = ctx.createLinearGradient(geo.A[0], geo.B[1], geo.C[0], base);
      pg.addColorStop(0, 'rgba(210,235,255,.26)'); pg.addColorStop(0.5, 'rgba(160,200,240,.10)'); pg.addColorStop(1, 'rgba(210,235,255,.22)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(geo.A[0], geo.A[1]); ctx.lineTo(geo.B[0], geo.B[1]); ctx.lineTo(geo.C[0], geo.C[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(225,240,255,.85)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(geo.B[0] - halfw * 0.12, geo.B[1] + h * 0.18); ctx.lineTo(geo.A[0] + halfw * 0.35, base - h * 0.12); ctx.stroke();
      ctx.restore();
      // фонарь
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(la);
      var bx = ctx.createLinearGradient(0, -16, 0, 16); bx.addColorStop(0, '#6f7a88'); bx.addColorStop(1, '#2d343d');
      ctx.fillStyle = bx; R.rr(ctx, -58, -16, 58, 32, 5); ctx.fill();
      ctx.fillStyle = '#1b1f25'; ctx.fillRect(-4, -12, 6, 24);
      ctx.fillStyle = '#fff6d8'; ctx.fillRect(-2, -3, 4, 6);
      ctx.restore();
      // экрандағы спектр (үлкейтілген): түстер экранға қай ретпен түсетінін көрсетеді
      if (spots.length > 1) {
        spots.sort(function (p1, p2) { return p1[0] - p2[0]; });
        var iw = 150, ih = 22, ix = Xs - iw - 14, iy = H * 0.12;
        var band = ctx.createLinearGradient(ix, 0, ix + iw, 0);
        spots.forEach(function (sp, i) { band.addColorStop(i / (spots.length - 1), rgb(sp[1])); });
        ctx.fillStyle = 'rgba(10,14,22,.85)'; R.rr(ctx, ix - 6, iy - 20, iw + 12, ih + 28, 6); ctx.fill();
        ctx.fillStyle = band; ctx.fillRect(ix, iy, iw, ih);
        D.text(ctx, 'Экрандағы спектр (үлкейтілген)', ix, iy - 7, { size: 10, color: '#c9d6e4' });
      }
      R.tag(ctx, MAT[P.mat][0] + ', сындыру бұрышы ' + P.apex + '°', 14, 20, { size: 12, align: 'left' });
      if (tir) R.tag(ctx, 'Призманың екінші бетінде толық ішкі шағылу болды', 14, 46, { size: 12, align: 'left', bg: '#ffe2c4' });
      D.text(ctx, 'Қызыл аз, күлгін көп бұрылады: n күлгін > n қызыл', 14, H - 10, { size: 11, color: '#c9d6e4' });
    },
  });
})();

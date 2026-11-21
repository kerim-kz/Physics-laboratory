/* Аспан сферасы: көкжиек және экваторлық координаталар жүйесі. Шырақтың тәуліктік параллелі, биіктігі h, азимуты A, ауытқуы δ, сағаттық бұрышы t.
   Векторлар бақылаушының жүйесінде: s — оңтүстікке, e — шығысқа, u — зенитке. Камера шығыс жақтан, сәл жоғарыдан қарайды (меридиан — экран жазықтығы). */
(function () {
  var R = window.Real, rad = Math.PI / 180;
  var STARS = { custom: ['Өз шырағым', null], vega: ['Вега (δ = +38,8°)', 38.8], sirius: ['Сириус (δ = −16,7°)', -16.7], polaris: ['Темірқазық (δ = +89,3°)', 89.3], dubhe: ['Дубхе, Жетіқарақшы (δ = +61,8°)', 61.8], sun_s: ['Күн, жазғы күн тоқырауы (δ = +23,4°)', 23.4], sun_e: ['Күн, күн мен түннің теңелуі (δ = 0°)', 0], sun_w: ['Күн, қысқы күн тоқырауы (δ = −23,4°)', -23.4] };
  var PLACES = [['90', 'Солтүстік полюс (90°)'], ['55', 'Петропавл (54,9°)'], ['51', 'Астана (51,2°)'], ['43', 'Алматы (43,2°)'], ['0', 'Экватор (0°)']];
  function add(a, b, k) { return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]; }
  function basis(phi) {
    var f = phi * rad;
    return { P: [-Math.cos(f), 0, Math.sin(f)], Q: [Math.sin(f), 0, Math.cos(f)], Wst: [0, -1, 0] };
  }
  function starVec(phi, dec, t) {
    var B = basis(phi), d = dec * rad, tt = t * rad;
    var v = add(add([0, 0, 0], B.Q, Math.cos(d) * Math.cos(tt)), B.Wst, Math.cos(d) * Math.sin(tt));
    return add(v, B.P, Math.sin(d));
  }
  function decOf(P) { return P.star === 'custom' ? P.dec : STARS[P.star][1]; }
  Sim.create({
    aspect: 0.72, grid: false, autoplay: false,
    hint: 'Ендікті өзгерт: әлем полюсінің биіктігі ендікке тең екенін тексер. «Бастау» — Жердің айналуынан шырақтың тәуліктік параллель бойымен қозғалысы.',
    controls: [
      { type: 'select', key: 'place', label: 'Бақылау орны (ендік φ)', value: '51', options: PLACES },
      { type: 'select', key: 'star', label: 'Шырақ', value: 'vega', options: Object.keys(STARS).map(function (k) { return [k, STARS[k][0]]; }) },
      { type: 'range', key: 'dec', label: 'Өз шырағымның ауытқуы δ', min: -80, max: 85, step: 5, value: 20, unit: '°', digits: 0 },
      { type: 'range', key: 't0', label: 'Сағаттық бұрышы t (меридианнан батысқа)', min: 0, max: 345, step: 15, value: 45, unit: '°', digits: 0 },
      { type: 'select', key: 'sys', label: 'Координаталар жүйесі', value: 'hor', options: [['hor', 'Көкжиектік: биіктік h, азимут A'], ['eq', 'Экваторлық: ауытқу δ, сағаттық бұрыш t'], ['both', 'Екеуі де']], live: true },
    ],
    readouts: [
      { key: 'h', label: 'Биіктік h', unit: '°', digits: 1 },
      { key: 'A', label: 'Азимут A (оңтүстіктен батысқа)', unit: '°', digits: 1 },
      { key: 'd', label: 'Ауытқу δ', unit: '°', digits: 1 },
      { key: 't', label: 'Сағаттық бұрыш t', unit: '°', digits: 0 },
      { key: 'hc', label: 'Жоғарғы кульминация 90° − φ + δ', unit: '°', digits: 1 },
      { key: 'kind', label: 'Шырақ', text: true },
    ],
    init: function (api) { api.S.t = api.P.t0; },
    step: function (api, dt) { api.S.t = (api.S.t + dt * 30) % 360; },
    onLive: function () {},
    read: function (api) {
      var P = api.P, phi = +P.place, dec = decOf(P), v = starVec(phi, dec, api.S.t);
      var h = Math.asin(Math.max(-1, Math.min(1, v[2]))) / rad, A = (Math.atan2(-v[1], v[0]) / rad + 360) % 360;
      var hc = 90 - phi + dec; if (hc > 90) hc = 180 - hc;
      var kind = dec >= 90 - phi - 1e-9 ? 'батпайтын' : dec <= -(90 - phi) + 1e-9 ? 'шықпайтын' : 'шығып-батады';
      return { h: h, A: A, d: dec, t: api.S.t, hc: hc, kind: kind };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, phi = +P.place, dec = decOf(P), B = basis(phi);
      R.scene(ctx, W, H, 'space', { seed: 9, count: 160 });
      var cx = W * (W > 700 ? 0.42 : 0.5), cy = H * 0.52, Rr = Math.min(W * (W > 700 ? 0.36 : 0.44), H * 0.42), el = 18 * rad;
      function pr(v) { return { x: cx + v[0] * Rr, y: cy - (v[2] * Math.cos(el) - v[1] * Math.sin(el)) * Rr, d: v[1] * Math.cos(el) + v[2] * Math.sin(el) }; }
      function circle(a, b, color, width, from, to, fillCol) {
        var pts = [], n = 120; from = from || 0; to = to === undefined ? 360 : to;
        for (var i = 0; i <= n; i++) { var th = (from + (to - from) * i / n) * rad; pts.push(pr(add([Math.cos(th) * a[0], Math.cos(th) * a[1], Math.cos(th) * a[2]], b, Math.sin(th)))); }
        if (fillCol) { ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.fillStyle = fillCol; ctx.fill(); }
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 1.6;
        for (var j = 1; j < pts.length; j++) {
          ctx.setLineDash(pts[j].d < 0 ? [4, 4] : []); ctx.globalAlpha = pts[j].d < 0 ? 0.55 : 1;
          ctx.beginPath(); ctx.moveTo(pts[j - 1].x, pts[j - 1].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
        ctx.restore();
      }
      function small(center, a, b, r, color, width) { // кіші шеңбер (тәуліктік параллель)
        var pts = [];
        for (var i = 0; i <= 120; i++) { var th = i / 120 * 2 * Math.PI; pts.push(pr(add(add(center, a, r * Math.cos(th)), b, r * Math.sin(th)))); }
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 1.6;
        for (var j = 1; j < pts.length; j++) { ctx.setLineDash(pts[j].d < 0 ? [3, 4] : []); ctx.globalAlpha = pts[j].d < 0 ? 0.5 : 1; ctx.beginPath(); ctx.moveTo(pts[j - 1].x, pts[j - 1].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
        ctx.restore();
      }
      // сфера (меридиан)
      var sg = ctx.createRadialGradient(cx - Rr * 0.3, cy - Rr * 0.3, Rr * 0.1, cx, cy, Rr);
      sg.addColorStop(0, 'rgba(90,120,190,.22)'); sg.addColorStop(1, 'rgba(40,60,120,.10)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, 7); ctx.fill();
      // көкжиек жазықтығы
      circle([1, 0, 0], [0, 1, 0], '#7fd08a', 2, 0, 360, 'rgba(90,170,100,.22)');
      ctx.strokeStyle = 'rgba(230,240,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, 7); ctx.stroke();
      // әлем осі
      var p1 = pr(B.P), p2 = pr([-B.P[0], -B.P[1], -B.P[2]]);
      ctx.save(); ctx.strokeStyle = '#ffd666'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); ctx.restore();
      // тік сызық (зенит—надир)
      var z1 = pr([0, 0, 1]), z2 = pr([0, 0, -1]);
      ctx.save(); ctx.strokeStyle = 'rgba(230,240,255,.6)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(z2.x, z2.y); ctx.lineTo(z1.x, z1.y); ctx.stroke(); ctx.restore();
      // аспан экваторы
      circle(B.Q, B.Wst, '#ff8f6b', 1.8);
      // шырақтың тәуліктік параллелі
      var d = dec * rad;
      small([B.P[0] * Math.sin(d), B.P[1] * Math.sin(d), B.P[2] * Math.sin(d)], B.Q, B.Wst, Math.cos(d), '#9fd2ff', 1.4);
      // шырақ
      var v = starVec(phi, dec, S.t), sp = pr(v), sys = P.sys;
      var hor = [v[0], v[1], 0], hl = Math.hypot(hor[0], hor[1]) || 1; hor = [hor[0] / hl, hor[1] / hl, 0];
      if (sys !== 'eq') {
        circle(hor, [0, 0, 1], 'rgba(127,208,138,.55)', 1.2, -90, 90); // вертикаль шеңбер
        var hh = Math.asin(Math.max(-1, Math.min(1, v[2]))) / rad;
        circle(hor, [0, 0, 1], '#7fd08a', 4, 0, hh); // биіктік доғасы
        var az = Math.atan2(-v[1], v[0]) / rad; // A: S-тен батысқа
        circle([1, 0, 0], [0, -1, 0], '#3fb25a', 4, 0, (az + 360) % 360);
        var mh = pr(add([0, 0, 0], hor, 1));
        R.tag(ctx, 'h', (mh.x + sp.x) / 2 + 12, (mh.y + sp.y) / 2, { size: 11, color: '#1d7a33' });
      }
      if (sys !== 'eq' && sys !== 'hor' || sys === 'eq') {
        var eqd = [v[0] - B.P[0] * Math.sin(d), v[1] - B.P[1] * Math.sin(d), v[2] - B.P[2] * Math.sin(d)], el2 = Math.hypot(eqd[0], eqd[1], eqd[2]) || 1;
        eqd = [eqd[0] / el2, eqd[1] / el2, eqd[2] / el2];
        circle(eqd, B.P, 'rgba(255,143,107,.5)', 1.2, -90, 90); // сағаттық шеңбер
        circle(eqd, B.P, '#ff8f6b', 4, 0, dec); // ауытқу доғасы
        circle(B.Q, B.Wst, '#e05a35', 4, 0, S.t % 360); // сағаттық бұрыш
        var me = pr(eqd);
        R.tag(ctx, 'δ', (me.x + sp.x) / 2 - 12, (me.y + sp.y) / 2, { size: 11, color: '#b4342a' });
      }
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sp.x, sp.y); ctx.stroke(); ctx.restore();
      var glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 14); glow.addColorStop(0, 'rgba(255,255,220,.95)'); glow.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.globalAlpha = v[2] < 0 ? 0.45 : 1; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sp.x, sp.y, 14, 0, 7); ctx.fill();
      ctx.fillStyle = dec === 23.4 || dec === 0 || dec === -23.4 ? '#ffd23f' : '#ffffff'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 4.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      R.tag(ctx, '★', sp.x + 14, sp.y - 12, { size: 10, color: '#6b5200' });
      // бақылаушы
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, 7); ctx.fill();
      // белгілер
      var lab = function (vec, s, col) { var p = pr(vec); R.tag(ctx, s, p.x + (vec[0] > 0.3 ? 14 : vec[0] < -0.3 ? -14 : 0), p.y + (vec[2] > 0.6 ? -14 : vec[2] < -0.6 ? 14 : 0), { size: 11, color: col || '#1b2329' }); };
      lab([0, 0, 1], 'Z (зенит)'); lab([0, 0, -1], 'Z′ (надир)');
      lab([1, 0, 0], 'О'); lab([-1, 0, 0], 'С'); lab([0, 1, 0], 'Ш'); lab([0, -1, 0], 'Б');
      lab(B.P, 'P', '#8a6100'); lab([-B.P[0], -B.P[1], -B.P[2]], 'P′', '#8a6100');
      var q = pr(B.Q); R.tag(ctx, 'Q', q.x + 12, q.y - 10, { size: 10.5, color: '#b4342a' });
      // әлем полюсінің биіктігі φ
      circle([-1, 0, 0], [0, 0, 1], '#ffd666', 3, 0, phi);
      var pm = pr([-Math.cos(phi * rad / 2), 0, Math.sin(phi * rad / 2)]);
      R.tag(ctx, 'h_P = φ = ' + phi + '°', pm.x + (W > 700 ? -48 : 46), pm.y, { size: 10.5, color: '#8a6100' });
      // аңыз (легенда)
      if (W > 700) {
        var lx = W - 210, ly = 24;
        [['#7fd08a', 'Математикалық көкжиек'], ['#ff8f6b', 'Аспан экваторы'], ['#ffd666', 'Әлем осі P P′'], ['#9fd2ff', 'Шырақтың тәуліктік параллелі'], ['rgba(230,240,255,.85)', 'Аспан меридианы']].forEach(function (it, i) {
          ctx.fillStyle = it[0]; ctx.fillRect(lx, ly + i * 22 - 3, 22, 4);
          R.txt(ctx, it[1], lx + 30, ly + i * 22, { size: 11, color: '#dfe8f2', align: 'left' });
        });
      }
    },
  });
})();

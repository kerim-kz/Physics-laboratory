/* Әртүрлі ендіктегі шырақтардың тәуліктік қозғалысы: ұзақ экспозициялы «жұлдыз іздері» фотосуреті.
   Бақылаушы жүйесі: s — оңтүстік, e — шығыс, u — зенит. Көру бағыты бойынша стереографиялық проекция (шеңберлер шеңбер болып қалады). */
(function () {
  var R = window.Real, rad = Math.PI / 180;
  var PLACES = [['90', 'Солтүстік полюс (φ = 90°)'], ['67', 'Поляр шеңбері (φ = 66,6°)'], ['51', 'Астана (φ = 51,2°)'], ['43', 'Алматы (φ = 43,2°)'], ['0', 'Экватор (φ = 0°)']];
  var DIRS = { n: ['Солтүстікке (Темірқазыққа)', 180], s: ['Оңтүстікке', 0], e: ['Шығысқа', 270], w: ['Батысқа', 90] }; // азимут оңтүстіктен батысқа
  // Жетіқарақшы (Үлкен Аю) және Кассиопея: [α (сағ), δ (°), жұлдыздық шама]
  var NAMED = [[11.06, 61.75, 1.8], [11.03, 56.38, 2.4], [11.90, 53.69, 2.4], [12.26, 57.03, 3.3], [12.90, 55.96, 1.8], [13.40, 54.93, 2.2], [13.79, 49.31, 1.9],
    [0.15, 59.15, 2.3], [0.68, 56.54, 2.2], [0.95, 60.72, 2.5], [1.43, 60.24, 2.7], [1.91, 63.67, 3.4], [2.53, 89.26, 2.0], [18.62, 38.78, 0.0], [5.92, 7.41, 0.5], [5.24, -8.2, 0.1], [5.6, -1.2, 1.7], [5.68, -1.94, 1.8], [5.53, -0.3, 2.2], [6.75, -16.7, -1.4]];
  var FIELD = (function () {
    var r = R.rng(42), out = NAMED.slice();
    for (var i = 0; i < 420; i++) { var z = r() * 2 - 1; out.push([r() * 24, Math.asin(z) / rad, 2.5 + r() * 3.2]); }
    return out;
  })();
  function vec(phi, dec, t) {
    var f = phi * rad, d = dec * rad, tt = t * rad;
    var Pv = [-Math.cos(f), 0, Math.sin(f)], Q = [Math.sin(f), 0, Math.cos(f)];
    return [Q[0] * Math.cos(d) * Math.cos(tt) + Pv[0] * Math.sin(d), -Math.cos(d) * Math.sin(tt), Q[2] * Math.cos(d) * Math.cos(tt) + Pv[2] * Math.sin(d)];
  }
  Sim.create({
    aspect: 0.62, grid: false, keepRunning: true,
    hint: '«Бастау» — фотоаппараттың затворы ашық тұр: жұлдыздар із қалдырады. Ендікті және қарау бағытын өзгертіп, іздердің пішінін салыстыр.',
    controls: [
      { type: 'select', key: 'place', label: 'Бақылау орны', value: '51', options: PLACES },
      { type: 'select', key: 'dir', label: 'Фотоаппарат қарайтын бағыт', value: 'n', options: Object.keys(DIRS).map(function (k) { return [k, DIRS[k][0]]; }) },
      { type: 'range', key: 'alt', label: 'Объективтің көтерілу бұрышы', min: 10, max: 80, step: 5, value: 35, unit: '°', digits: 0 },
    ],
    readouts: [
      { key: 'exp', label: 'Экспозиция ұзақтығы', unit: 'сағ', digits: 1 },
      { key: 'hp', label: 'Темірқазықтың биіктігі h_P = φ', unit: '°', digits: 1 },
      { key: 'np', label: 'Батпайтын жұлдыздар: δ >', unit: '°', digits: 1 },
      { key: 'sun0', label: 'Күннің түстегі биіктігі (21 наурыз)', unit: '°', digits: 1 },
      { key: 'sun1', label: 'Күннің түстегі биіктігі (22 маусым)', unit: '°', digits: 1 },
    ],
    init: function (api) { api.S.exp = 0; },
    step: function (api, dt) { api.S.exp = Math.min(12, api.S.exp + dt * 1.2); if (api.S.exp >= 12) return false; },
    read: function (api) {
      var phi = +api.P.place, s1 = 90 - phi + 23.44; if (s1 > 90) s1 = 180 - s1;
      return { exp: api.S.exp, hp: phi, np: 90 - phi, sun0: 90 - phi, sun1: s1 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, phi = +P.place;
      // түнгі аспан
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#050914'); sky.addColorStop(0.7, '#0e1a33'); sky.addColorStop(1, '#1d2b48');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // көру бағыты
      var A0 = DIRS[P.dir][1] * rad, a0 = P.alt * rad;
      var fwd = [Math.cos(a0) * Math.cos(A0), -Math.cos(a0) * Math.sin(A0), Math.sin(a0)];
      // right = fwd × zenith: оңтүстікке қарағанда оң қол — батыс, солтүстікке қарағанда — шығыс
      var right = [fwd[1], -fwd[0], 0], rl = Math.hypot(right[0], right[1]) || 1; right = [right[0] / rl, right[1] / rl, 0];
      var up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
      if (up[2] < 0) up = [-up[0], -up[1], -up[2]];
      var f = Math.min(W, H) * 0.62, cx = W / 2, cy = H / 2;
      function proj(v) {
        var z = v[0] * fwd[0] + v[1] * fwd[1] + v[2] * fwd[2];
        if (z < -0.2) return null;
        var x = v[0] * right[0] + v[1] * right[1] + v[2] * right[2], y = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];
        return { x: cx + x / (1 + z) * f * 1.6, y: cy - y / (1 + z) * f * 1.6 };
      }
      // жұлдыз іздері
      var T0 = 200, steps = Math.max(1, Math.round(S.exp * 15 / 2)); // әр 2° (8 мин)
      ctx.lineCap = 'round';
      FIELD.forEach(function (st) {
        var mag = st[2], bright = Math.max(0.15, Math.min(1, (6 - mag) / 5.5));
        var col = st === FIELD[12] ? '255,240,200' : mag < 1 ? '220,235,255' : '255,255,255';
        ctx.strokeStyle = 'rgba(' + col + ',' + (bright * 0.85) + ')'; ctx.lineWidth = Math.max(0.6, 2.6 - mag * 0.38);
        ctx.beginPath(); var on = false, last = null;
        for (var i = 0; i <= steps; i++) {
          var t = T0 + i * 2 - st[0] * 15, v = vec(phi, st[1], t);
          var p = v[2] > -0.02 ? proj(v) : null;
          if (p && last && Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > W) p = null;
          if (p) { if (on) ctx.lineTo(p.x, p.y); else { ctx.moveTo(p.x, p.y); on = true; } } else on = false;
          last = p;
        }
        ctx.stroke();
        var ve = vec(phi, st[1], T0 + steps * 2 - st[0] * 15), pe = ve[2] > 0 ? proj(ve) : null;
        if (pe) { ctx.fillStyle = 'rgba(' + col + ',' + bright + ')'; ctx.beginPath(); ctx.arc(pe.x, pe.y, Math.max(0.8, 2.4 - mag * 0.35), 0, 7); ctx.fill(); }
      });
      // әлем полюсі
      var pp = proj([-Math.cos(phi * rad), 0, Math.sin(phi * rad)]);
      if (pp && phi > 1) { ctx.strokeStyle = 'rgba(255,214,102,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(pp.x, pp.y, 7, 0, 7); ctx.stroke(); R.tag(ctx, 'Әлем полюсі', pp.x, pp.y - 18, { size: 10, color: '#6b5200' }); }
      // көкжиек және жер (силуэт)
      var hz = [];
      for (var a = -180; a <= 180; a += 2) { var hv = [Math.cos(a * rad), Math.sin(a * rad), 0], hp = proj(hv); if (hp) hz.push(hp); }
      hz.sort(function (p, q) { return p.x - q.x; });
      if (hz.length) {
        ctx.beginPath(); ctx.moveTo(0, H); var rr = R.rng(5);
        hz.forEach(function (p, i) { ctx.lineTo(p.x, p.y - 6 - 10 * Math.abs(Math.sin(i * 0.35)) - 4 * rr()); });
        ctx.lineTo(W, H); ctx.closePath();
        var gg = ctx.createLinearGradient(0, H * 0.6, 0, H); gg.addColorStop(0, '#0b1210'); gg.addColorStop(1, '#030504');
        ctx.fillStyle = gg; ctx.fill();
        // ағаштар силуэті
        ctx.fillStyle = '#050807';
        for (var k = 0; k < 9; k++) { var p0 = hz[Math.floor((k + 0.5) / 9 * hz.length)]; if (!p0) continue; var th = 18 + rr() * 24; ctx.beginPath(); ctx.moveTo(p0.x - 9, p0.y - 4); ctx.lineTo(p0.x, p0.y - 4 - th); ctx.lineTo(p0.x + 9, p0.y - 4); ctx.fill(); }
      }
      R.tag(ctx, PLACES.filter(function (x) { return x[0] === P.place; })[0][1] + ' · ' + DIRS[P.dir][0].toLowerCase().replace(' (темірқазыққа)', '') + ' қарау', W / 2, 20, { size: 11 });
      R.txt(ctx, 'Экспозиция: ' + Sim.fmt(S.exp, 1).replace('.', ',') + ' сағ  (жұлдыздар сағатына 15° айналады)', W - 12, H - 12, { size: 10.5, color: '#9fb0bd', align: 'right' });
    },
  });
})();

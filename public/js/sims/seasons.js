/* Жыл мезгілдері және күнтізбе: Жер осі орбита жазықтығына 66,6° көлбеу. Күннің түстегі биіктігі мен
   тәулік ұзақтығы ендікке және күнге тәуелді. */
(function () {
  var R = window.Real;
  var MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
  var CDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function dateOf(day) { var d = Math.floor(day), m = 0; while (m < 11 && d >= CDAYS[m]) { d -= CDAYS[m]; m++; } return (d + 1) + ' ' + MONTHS[m]; }
  // Күннің еңкеюі (жуықтау): δ = −23,44° · cos(360° · (N + 10) / 365)
  function decl(day) { return -23.44 * Math.cos(2 * Math.PI * (day + 10) / 365); }
  Sim.create({
    aspect: 0.6, grid: false,
    hint: 'Жылдың күнін немесе ендікті өзгерт. Жазда Күн жоғары көтеріледі, күн ұзақ болады.',
    controls: [
      { type: 'range', key: 'day', label: 'Жылдың күні', min: 0, max: 364, step: 1, value: 171, digits: 0, format: function (v) { return dateOf(v); } },
      { type: 'select', key: 'city', label: 'Қала', value: '43.2', options: [['43.2', 'Алматы (43° с. е.)'], ['51.2', 'Астана (51° с. е.)'], ['42.3', 'Шымкент (42° с. е.)'], ['47.1', 'Атырау (47° с. е.)'], ['0', 'Экватор (0°)'], ['66.6', 'Солтүстік поляр шеңбері']] },
    ],
    readouts: [
      { key: 'date', label: 'Күн', text: true },
      { key: 'dec', label: 'Күннің еңкеюі δ', unit: '°', digits: 1 },
      { key: 'noon', label: 'Күннің түстегі биіктігі 90° − φ + δ', unit: '°', digits: 1 },
      { key: 'len', label: 'Күннің (жарық уақыттың) ұзақтығы', text: true },
      { key: 'season', label: 'Мезгіл (солтүстік жарты шар)', text: true },
    ],
    init: function (api) { api.S.d = api.P.day; },
    step: function (api, dt) { var d = (api.P.day + dt * 20) % 365; api.set('day', Math.round(d * 10) / 10); },
    read: function (api) {
      var P = api.P, phi = +P.city, d = decl(P.day), noon = 90 - phi + d;
      var c = -Math.tan(phi * Math.PI / 180) * Math.tan(d * Math.PI / 180);
      var hrs = c <= -1 ? 24 : c >= 1 ? 0 : 2 * Math.acos(c) * 180 / Math.PI / 15;
      var h = Math.floor(hrs), m = Math.round((hrs - h) * 60);
      var day = P.day, season = day < 59 || day >= 334 ? 'қыс' : day < 151 ? 'көктем' : day < 243 ? 'жаз' : 'күз';
      return { date: dateOf(day), dec: d, noon: noon, len: h + ' сағ ' + m + ' мин', season: season };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P;
      R.scene(ctx, W, H, 'space', { seed: 3, count: 160 });
      // Сол жақ: орбита (қиғаш көрініс)
      var ox = W * 0.32, oy = H * 0.5, ra = W * 0.25, rb = H * 0.22;
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.ellipse(ox, oy, ra, rb, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      R.planet(ctx, ox, oy, 22, 'sun');
      // Жердің орбитадағы орны: 21 маусым — Күннен оң жақта (Жердің солтүстік осі Күнге қарай)
      var ang = (P.day - 171) / 365 * Math.PI * 2;
      var ex = ox + Math.cos(ang) * ra, ey = oy - Math.sin(ang) * rb;
      [[79, 'көктемгі күн мен түннің теңелуі'], [171, 'жазғы күн тоқырау'], [265, 'күзгі теңелу'], [355, 'қысқы күн тоқырау']].forEach(function (k) {
        var a = (k[0] - 171) / 365 * Math.PI * 2, x = ox + Math.cos(a) * ra, y = oy - Math.sin(a) * rb;
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
        R.txt(ctx, dateOf(k[0]), x, y + (y > oy ? 16 : -12), { size: 9, color: 'rgba(210,225,245,.75)' });
      });
      var er = 15;
      R.planet(ctx, ex, ey, er, 'earth', { light: Math.atan2(oy - ey, ox - ex) });
      // ось (әрдайым бір бағытта: Темірқазыққа қарай)
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
      var ax = -Math.sin(23.44 * Math.PI / 180), ay = -Math.cos(23.44 * Math.PI / 180); // солтүстік ұшы маусымда Күнге қарай көлбеген
      ctx.beginPath(); ctx.moveTo(ex - ax * er * 1.7, ey - ay * er * 1.7); ctx.lineTo(ex + ax * er * 1.7, ey + ay * er * 1.7); ctx.stroke();
      // Оң жақ: таңдалған қаладағы түстегі Күннің биіктігі
      var phi = +P.city, d = decl(P.day), noon = Math.max(0, 90 - phi + d);
      var gx = W * 0.64, gy = H * 0.82, gw = W * 0.32;
      var sky = ctx.createLinearGradient(0, H * 0.08, 0, gy); sky.addColorStop(0, '#5fa3dd'); sky.addColorStop(1, '#cfe6f6');
      ctx.fillStyle = sky; R.rr(ctx, gx, H * 0.08, gw, gy - H * 0.08, 10); ctx.fill();
      ctx.fillStyle = '#6aa851'; ctx.fillRect(gx, gy - 4, gw, 14);
      var hx = gx + gw * 0.2, rr = gw * 0.62;
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(hx, gy - 4, rr, -Math.PI / 2, 0); ctx.stroke(); ctx.setLineDash([]);
      var sa = noon * Math.PI / 180, sx = hx + Math.cos(sa) * rr, sy = gy - 4 - Math.sin(sa) * rr;
      R.sun(ctx, sx, sy, 12);
      ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, gy - 4); ctx.lineTo(sx, sy); ctx.stroke();
      // адам және көлеңкесі
      ctx.fillStyle = '#1d2a3a'; ctx.fillRect(hx - 3, gy - 34, 6, 30); R.sphere(ctx, hx, gy - 40, 6, '#e3b48a');
      var shadow = noon > 1 ? Math.min(gw * 0.7, 30 / Math.tan(sa)) : gw * 0.7;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(hx - shadow, gy - 6, shadow, 4);
      R.txt(ctx, Math.round(noon) + '°', hx + 34, gy - 18, { size: 12, color: '#1b2329' });
      R.tag(ctx, 'Түсте Күннің биіктігі', gx + gw / 2, H * 0.08 + 16, { size: 11 });
    },
  });
})();

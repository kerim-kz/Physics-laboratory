/* Қатты денелердің қысымы: кірпішті әр қырымен құмға қою, етікпен және шаңғымен қарда тұру. p = F / S. */
(function () {
  var R = window.Real;
  var OBJ = {
    brick: { name: 'Кірпіш (25 × 12 × 6,5 см), 3,5 кг', m: 3.5, faces: { big: [0.25, 0.12], side: [0.25, 0.065], end: [0.12, 0.065] }, ground: 'sand' },
    boots: { name: 'Адам етікпен (60 кг)', m: 60, area: 2 * 0.028, ground: 'snow' },
    skis: { name: 'Адам шаңғымен (60 кг)', m: 60, area: 2 * 1.7 * 0.08, ground: 'snow' },
    tank: { name: 'Шынжыр табанды трактор (6 т)', m: 6000, area: 2 * 2.2 * 0.4, ground: 'mud' },
    wheels: { name: 'Доңғалақты трактор (6 т)', m: 6000, area: 4 * 0.06, ground: 'mud' },
  };
  Sim.create({
    aspect: 0.56, static: true, resetLabel: false, grid: false,
    hint: 'Тірек ауданы азайса, сол күштің қысымы артады — дене тереңірек батады.',
    controls: [
      { type: 'select', key: 'obj', label: 'Дене', value: 'brick', options: Object.keys(OBJ).map(function (k) { return [k, OBJ[k].name]; }) },
      { type: 'select', key: 'face', when: function (P) { return P.obj === 'brick'; }, label: 'Кірпіштің қыры', value: 'big', options: [['big', 'Жалпақ қыры'], ['side', 'Бүйір қыры'], ['end', 'Ұшымен (тік)']] },
    ],
    readouts: [
      { key: 'F', label: 'Қысым күші F = mg', unit: 'Н', digits: 0 },
      { key: 'S', label: 'Тірек ауданы S', unit: 'м²', digits: 4 },
      { key: 'p', label: 'Қысым p = F / S', unit: 'Па', digits: 0 },
      { key: 'kpa', label: 'Сол, кПа', unit: 'кПа', digits: 1 },
    ],
    init: function () {}, step: function () {},
    read: function (api) {
      var O = OBJ[api.P.obj], S = area(api.P), F = O.m * 9.8;
      return { F: F, S: S, p: F / S, kpa: F / S / 1000 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, O = OBJ[P.obj], S = area(P), p = O.m * 9.8 / S;
      var ground = H * 0.62;
      var dark = R.isDark();
      var sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, dark ? '#13202e' : O.ground === 'snow' ? '#c7dcef' : '#a9d0ee'); sky.addColorStop(1, dark ? '#24364a' : '#eaf3fa');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground);
      var col = O.ground === 'snow' ? ['#ffffff', '#cfdbe6'] : O.ground === 'sand' ? ['#ecd29a', '#c9a96a'] : ['#7b5a3c', '#4f3824'];
      var gg = ctx.createLinearGradient(0, ground, 0, H); gg.addColorStop(0, col[0]); gg.addColorStop(1, col[1]);
      ctx.fillStyle = gg; ctx.fillRect(0, ground, W, H - ground);
      var rn = R.rng(2); for (var i = 0; i < 400; i++) { ctx.fillStyle = 'rgba(0,0,0,' + rn() * 0.08 + ')'; ctx.fillRect(rn() * W, ground + rn() * (H - ground), 2, 2); }
      // батып кету тереңдігі қысымға тәуелді (сапалық модель)
      var depth = Math.min(90, p / (O.ground === 'snow' ? 400 : O.ground === 'sand' ? 60 : 3000));
      var cx = W * 0.42;
      if (P.obj === 'brick') {
        var f = O.faces[P.face], k = 900, w = f[0] * k, h = (P.face === 'big' ? 0.065 : P.face === 'side' ? 0.12 : 0.25) * k;
        dent(ctx, cx, ground, w, depth, col);
        R.block(ctx, cx - w / 2, ground + depth - h, w, h, 'brick', { depth: Math.min(26, f[1] * k * 0.4), shadow: false });
      } else if (P.obj === 'boots' || P.obj === 'skis') {
        var sw = P.obj === 'skis' ? 340 : 60;
        dent(ctx, cx, ground, sw + 8, depth, col);
        person(ctx, cx, ground + depth - (P.obj === 'skis' ? 6 : 0));
        if (P.obj === 'skis') { ctx.fillStyle = '#c8382c'; R.rr(ctx, cx - sw / 2, ground + depth - 6, sw, 6, 3); ctx.fill(); }
      } else {
        var tw = 300;
        dent(ctx, cx, ground, tw, depth, col);
        tractor(ctx, cx, ground + depth, P.obj === 'tank');
      }
      R.tag(ctx, 'p = ' + Sim.fmt(p / 1000, 1) + ' кПа', W * 0.82, H * 0.2, { size: 14, color: '#b4342a' });
      R.tag(ctx, 'Қысым неғұрлым үлкен болса, соғұрлым тереңірек батады', W * 0.62, H * 0.2 + 30, { size: 10.5 });
    },
  });
  function area(P) {
    var O = OBJ[P.obj];
    if (P.obj === 'brick') { var f = O.faces[P.face]; return f[0] * f[1]; }
    return O.area;
  }
  function dent(ctx, cx, y, w, d, col) {
    ctx.save(); ctx.fillStyle = R.shade(col[1], -0.15);
    ctx.beginPath(); ctx.moveTo(cx - w / 2 - 6, y); ctx.lineTo(cx - w / 2, y + d); ctx.lineTo(cx + w / 2, y + d); ctx.lineTo(cx + w / 2 + 6, y); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function person(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#2b3a55'; ctx.fillRect(x - 14, y - 70, 12, 66); ctx.fillRect(x + 2, y - 70, 12, 66);
    ctx.fillStyle = '#1d1f22'; ctx.fillRect(x - 18, y - 8, 18, 8); ctx.fillRect(x + 1, y - 8, 18, 8);
    var g = ctx.createLinearGradient(x - 22, 0, x + 22, 0); g.addColorStop(0, '#a92f25'); g.addColorStop(0.5, '#d8473b'); g.addColorStop(1, '#a92f25');
    ctx.fillStyle = g; R.rr(ctx, x - 22, y - 140, 44, 74, 10); ctx.fill();
    R.sphere(ctx, x, y - 158, 17, '#e6b893');
    ctx.fillStyle = '#2b2f4a'; ctx.beginPath(); ctx.arc(x, y - 164, 17, Math.PI, 0); ctx.fill();
    ctx.restore();
  }
  function tractor(ctx, x, y, tracks) {
    ctx.save();
    var g = ctx.createLinearGradient(0, y - 120, 0, y - 40); g.addColorStop(0, '#f2c14a'); g.addColorStop(1, '#b8861c');
    ctx.fillStyle = g; ctx.fillRect(x - 120, y - 92, 200, 50); ctx.fillRect(x + 10, y - 150, 80, 60);
    ctx.fillStyle = 'rgba(170,215,240,.9)'; ctx.fillRect(x + 20, y - 140, 60, 34);
    if (tracks) {
      ctx.fillStyle = '#2a2c30'; R.rr(ctx, x - 150, y - 46, 300, 46, 22); ctx.fill();
      for (var i = 0; i < 6; i++) R.wheel(ctx, x - 125 + i * 50, y - 23, 17, 0);
    } else { R.wheel(ctx, x - 90, y - 34, 34, 0); R.wheel(ctx, x + 60, y - 50, 50, 0); }
    ctx.restore();
  }
})();

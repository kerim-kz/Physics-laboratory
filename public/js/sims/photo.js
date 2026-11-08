/* Фотоэффект: hν = A + E_k max. Фотон энергиясы E = 1240 эВ·нм / λ. */
(function () {
  var METALS = { cs: [1.9, 'Цезий'], k: [2.2, 'Калий'], na: [2.3, 'Натрий'], li: [2.4, 'Литий'], zn: [4.2, 'Мырыш'], ag: [4.3, 'Күміс'], pt: [5.3, 'Платина'] };
  var OPTS = Object.keys(METALS).map(function (k) { return [k, METALS[k][1] + ' (A ≈ ' + String(METALS[k][0]).replace('.', ',') + ' эВ)']; });

  function rgb(nm) {
    var r = 0, g = 0, b = 0;
    if (nm < 380) return 'rgb(150,90,220)';
    if (nm > 750) return 'rgb(140,20,20)';
    if (nm < 440) { r = (440 - nm) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = (510 - nm) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = (645 - nm) / 65; } else r = 1;
    return 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')';
  }
  function calc(P) {
    var E = 1240 / P.lam, A = METALS[P.metal][0], Ek = E - A;
    return { E: E, A: A, Ek: Ek > 0 ? Ek : 0, on: Ek > 0, red: 1240 / A };
  }

  Sim.create({
    aspect: 0.6,
    autoplay: true,
    keepRunning: true,
    controls: [
      { type: 'range', key: 'lam', label: 'Жарықтың толқын ұзындығы λ', min: 200, max: 800, step: 5, value: 400, unit: 'нм', digits: 0 },
      { type: 'range', key: 'I', label: 'Жарық қарқындылығы', min: 0, max: 100, step: 5, value: 60, unit: '%', digits: 0, live: true },
      { type: 'select', key: 'metal', label: 'Катод металы', value: 'na', options: OPTS },
      { type: 'range', key: 'U', label: 'Тежеуші кернеу U', min: 0, max: 5, step: 0.05, value: 0, unit: 'В', digits: 2, live: true },
    ],
    readouts: [
      { key: 'E', label: 'Фотон энергиясы hν', unit: 'эВ' },
      { key: 'A', label: 'Шығу жұмысы A', unit: 'эВ' },
      { key: 'Ek', label: 'Электронның ең үлкен энергиясы', unit: 'эВ' },
      { key: 'Ut', label: 'Тежеуші кернеу U_т = E_k/e', unit: 'В' },
      { key: 'red', label: 'Қызыл шекара λ_max = hc/A', unit: 'нм', digits: 0 },
      { key: 'cur', label: 'Фототок (шартты бірлік)', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.ph = []; S.el = []; S.acc = 0; S.hits = []; S.t = 0; S.c = calc(api.P); },
    onLive: function () {},
    step: function (api, dt) {
      var S = api.S, P = api.P, c = calc(P), W = api.W, H = api.H;
      S.t += dt; S.c = c;
      var cathX = W * 0.3, anodeX = W * 0.85, top = H * 0.3, bot = H * 0.78, lampX = Math.max(30, W * 0.08), lampY = H * 0.14;
      // фотондар
      S.acc += dt * P.I * 0.6;
      while (S.acc >= 1) {
        S.acc -= 1;
        var y = top + 20 + Math.random() * (bot - top - 40);
        S.ph.push({ x: lampX, y: lampY, sx: lampX, sy: lampY, ty: y });
      }
      S.ph = S.ph.filter(function (p) {
        p.x += 260 * dt; p.y = p.sy + (p.ty - p.sy) * Math.min(1, (p.x - p.sx) / (cathX - p.sx));
        if (p.x < cathX) return true;
        if (c.on) {
          var ek = Math.random() * c.Ek; // бастапқы энергия 0…E_k max
          S.el.push({ x: cathX + 4, y: p.ty, ek: ek, dir: 1 });
        }
        return false;
      });
      // электрондар: тежеуші өріс энергияны U арқылы кемітеді
      var gap = anodeX - cathX;
      S.el = S.el.filter(function (e) {
        // x нүктесіндегі кинетикалық энергия: E_k − eU·(x/ара қашықтық)
        var ke = e.ek - P.U * (e.x - cathX) / gap;
        if (e.dir > 0 && ke <= 0) e.dir = -1;
        e.x += e.dir * (60 + Math.sqrt(Math.max(0, ke)) * 140) * dt;
        if (e.x >= anodeX) { S.hits.push(S.t); return false; }
        return e.x > cathX;
      });
      while (S.hits.length && S.hits[0] < S.t - 2) S.hits.shift();
    },
    read: function (api) {
      var c = calc(api.P), S = api.S;
      return { E: c.E, A: c.A, Ek: c.on ? c.Ek : 'фотоэффект жоқ', Ut: c.on ? c.Ek : 0, red: c.red, cur: S.hits ? S.hits.length / 2 : 0 };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D, c = calc(P);
      var cathX = W * 0.3, anodeX = W * 0.85, top = H * 0.3, bot = H * 0.78, lampX = Math.max(30, W * 0.08), lampY = H * 0.14;
      // вакуумдық түтік
      ctx.save(); ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.fillStyle = C.bg2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cathX - 30, top - 20, anodeX - cathX + 60, bot - top + 40, 40); else ctx.rect(cathX - 30, top - 20, anodeX - cathX + 60, bot - top + 40);
      ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.fillStyle = C.muted; ctx.fillRect(cathX - 8, top, 8, bot - top);
      ctx.fillStyle = C.ink; ctx.fillRect(anodeX, top, 6, bot - top);
      D.text(ctx, 'Катод (' + METALS[P.metal][1] + ')', cathX - 4, bot + 40, { size: 12, align: 'center', weight: '600' });
      D.text(ctx, 'Анод', anodeX + 3, bot + 40, { size: 12, align: 'center', weight: '600' });
      // шам
      var col = rgb(P.lam);
      D.circle(ctx, lampX, lampY, 16, col, C.ink, 1.5);
      D.text(ctx, P.lam < 380 ? 'ультракүлгін сәуле' : P.lam > 750 ? 'инфрақызыл сәуле' : 'көрінетін жарық', lampX - 14, lampY - 24, { size: 11, color: C.muted });
      S.ph && S.ph.forEach(function (p) { D.circle(ctx, p.x, p.y, 3.5, col); });
      S.el && S.el.forEach(function (e) { D.circle(ctx, e.x, e.y, 3, C.blue); });
      // амперметр
      var cur = S.hits ? S.hits.length / 2 : 0;
      D.text(ctx, 'Фототок: ' + api.fmt(cur, 1), anodeX + 40, top - 40, { size: 13, weight: '600', mono: true, align: 'right' });
      ctx.fillStyle = C.bg2; ctx.fillRect(anodeX - 160, top - 34, 200, 8);
      ctx.fillStyle = C.accent; ctx.fillRect(anodeX - 160, top - 34, Math.min(200, cur * 2), 8);
      D.text(ctx, c.on ? 'hν > A — электрондар ұшып шығады' : 'hν < A — фотоэффект жоқ (λ > ' + Math.round(c.red) + ' нм)', 16, H - 12, { size: 13, weight: '600', color: c.on ? C.good : C.bad });
      if (P.U > 0) D.text(ctx, 'Тежеуші өріс: U = ' + api.fmt(P.U, 2) + ' В', (cathX + anodeX) / 2, top - 40, { size: 12, align: 'center', color: C.orange });
    },
  });
})();

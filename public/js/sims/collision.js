/* Екі арбашаның бір өлшемді соқтығысуы: импульс пен кинетикалық энергия. */
(function () {
  var TRACK = 10;
  var width = function (m) { return 0.45 + 0.12 * m; };

  Sim.create({
    aspect: 0.5,
    hint: 'Оңға қарай қозғалыс — оң, солға — теріс таңбамен.',
    controls: [
      { type: 'range', key: 'm1', label: 'Бірінші арбаша массасы m₁', min: 0.5, max: 5, step: 0.5, value: 1, unit: 'кг', digits: 1 },
      { type: 'range', key: 'v1', label: 'Бірінші арбаша жылдамдығы v₁', min: -3, max: 5, step: 0.5, value: 3, unit: 'м/с', digits: 1 },
      { type: 'range', key: 'm2', label: 'Екінші арбаша массасы m₂', min: 0.5, max: 5, step: 0.5, value: 1, unit: 'кг', digits: 1 },
      { type: 'range', key: 'v2', label: 'Екінші арбаша жылдамдығы v₂', min: -5, max: 3, step: 0.5, value: 0, unit: 'м/с', digits: 1 },
      { type: 'select', key: 'kind', label: 'Соқтығысу түрі', value: 'elastic', options: [['elastic', 'Абсолют серпімді'], ['inelastic', 'Абсолют серпімсіз (жабысып қалады)']] },
    ],
    readouts: [
      { key: 'p0', label: 'Импульс соқтығысуға дейін', unit: 'кг·м/с' },
      { key: 'p1', label: 'Импульс қазір', unit: 'кг·м/с' },
      { key: 'e0', label: 'Кинетикалық энергия дейін', unit: 'Дж' },
      { key: 'e1', label: 'Кинетикалық энергия қазір', unit: 'Дж' },
      { key: 'u1', label: 'v₁ қазір', unit: 'м/с' },
      { key: 'u2', label: 'v₂ қазір', unit: 'м/с' },
      { key: 'msg', label: 'Күйі' },
    ],
    init: function (api) {
      var S = api.S, P = api.P;
      S.x1 = 2.5; S.x2 = 7.5; S.u1 = P.v1; S.u2 = P.v2; S.hit = false; S.stuck = false; S.t = 0;
      S.msg = P.v1 > P.v2 ? 'жақындап келеді' : 'соқтығыспайды: v₁ ≤ v₂';
    },
    step: function (api, dt) {
      var S = api.S, P = api.P;
      S.t += dt;
      S.x1 += S.u1 * dt; S.x2 += S.u2 * dt;
      var w1 = width(P.m1), w2 = width(P.m2);
      if (!S.hit && S.x1 + w1 / 2 >= S.x2 - w2 / 2 && S.u1 > S.u2) {
        S.hit = true;
        if (P.kind === 'elastic') {
          var a = ((P.m1 - P.m2) * S.u1 + 2 * P.m2 * S.u2) / (P.m1 + P.m2);
          var b = ((P.m2 - P.m1) * S.u2 + 2 * P.m1 * S.u1) / (P.m1 + P.m2);
          S.u1 = a; S.u2 = b;
        } else {
          var v = (P.m1 * S.u1 + P.m2 * S.u2) / (P.m1 + P.m2);
          S.u1 = S.u2 = v; S.stuck = true;
        }
        S.x1 = S.x2 - w2 / 2 - w1 / 2;
        S.msg = 'соқтығысты';
      }
      if (S.x1 - w1 / 2 < 0 || S.x2 + w2 / 2 > TRACK || S.t > 12) { S.msg = (S.hit ? 'соқтығыстан кейін ' : '') + 'арбаша жолдың шетіне жетті'; return false; }
    },
    substeps: 4,
    read: function (api) {
      var S = api.S, P = api.P;
      return {
        p0: P.m1 * P.v1 + P.m2 * P.v2, p1: P.m1 * S.u1 + P.m2 * S.u2,
        e0: P.m1 * P.v1 * P.v1 / 2 + P.m2 * P.v2 * P.v2 / 2, e1: P.m1 * S.u1 * S.u1 / 2 + P.m2 * S.u2 * S.u2 / 2,
        u1: S.u1, u2: S.u2, msg: S.msg,
      };
    },
    draw: function (api, ctx, W, H) {
      var S = api.S, P = api.P, C = api.C, D = api.D;
      var left = 30, right = W - 30, k = (right - left) / TRACK, y = H * 0.55;
      var X = function (x) { return left + x * k; };
      D.line(ctx, left, y, right, y, C.muted, 3);
      for (var i = 0; i <= TRACK; i++) { D.line(ctx, X(i), y, X(i), y + 6, C.muted, 1); D.text(ctx, String(i), X(i), y + 18, { size: 10, align: 'center', color: C.muted, mono: true }); }
      D.text(ctx, 'x, м', right, y + 32, { size: 11, align: 'right', color: C.muted });
      function cart(x, m, u, color, label) {
        var w = width(m) * k, h = 26 + m * 4, cx = X(x);
        ctx.fillStyle = color; ctx.fillRect(cx - w / 2, y - h - 8, w, h);
        D.circle(ctx, cx - w / 3, y - 5, 5, C.ink); D.circle(ctx, cx + w / 3, y - 5, 5, C.ink);
        D.text(ctx, label + ': ' + api.fmt(m, 1) + ' кг', cx, y - h / 2 - 4, { size: 11, align: 'center', color: '#fff', weight: '600' });
        if (Math.abs(u) > 0.01) D.arrow(ctx, cx, y - h - 20, cx + u * 22, y - h - 20, color, 2.5, api.fmt(u, 2) + ' м/с');
      }
      cart(S.x1, P.m1, S.u1, C.blue, 'm₁');
      cart(S.x2, P.m2, S.u2, C.orange, 'm₂');
      // импульс бағандары
      var p1 = P.m1 * S.u1, p2 = P.m2 * S.u2, base = 26;
      var half = Math.max(40, Math.min(180, (W - left - 150) / 2));
      var x0 = left + 70 + half, scale = half / 25;
      D.text(ctx, 'Импульстер (кг·м/с):', left, base, { size: 12, weight: '600' });
      [['p₁', p1, C.blue], ['p₂', p2, C.orange], ['p₁ + p₂', p1 + p2, C.accent]].forEach(function (r, i) {
        var yy = base + 16 + i * 18;
        D.text(ctx, r[0], left, yy + 4, { size: 11, color: C.muted, mono: true });
        D.line(ctx, x0, yy - 6, x0, yy + 8, C.line, 1);
        ctx.fillStyle = r[2]; ctx.fillRect(Math.min(x0, x0 + r[1] * scale), yy - 4, Math.abs(r[1] * scale), 9);
        D.text(ctx, api.fmt(r[1], 2), x0 + half + 8, yy + 4, { size: 11, mono: true });
      });
    },
  });
})();

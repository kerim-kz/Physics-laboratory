/* Реактивті қозғалыс: зымыран газды артқа лақтырып, өзі алға қозғалады (импульстің сақталуы). Циолковский формуласы v = u ln(m₀/m). Ғарышта немесе Байқоңырдан ұшу. */
(function () {
  var R = window.Real, g0 = 9.81;
  var M0 = 100; // бастапқы масса (т)
  function state(P, t) {
    var mf = M0 * P.fuel / 100, burn = mf / P.tb, tt = Math.min(t, P.tb);
    var m = M0 - burn * tt, gg = P.mode === 'earth' ? g0 : 0;
    var v = P.u * Math.log(M0 / m) - gg * tt;
    var thrust = t < P.tb ? P.u * burn * 1000 : 0; // Н (burn т/с → кг/с)
    return { m: m, v: v, burnt: t >= P.tb, thrust: thrust, a: t < P.tb ? thrust / (m * 1000) - gg : -gg };
  }
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Газдың шығу жылдамдығын немесе отынның үлесін өзгертіп, зымыранның соңғы жылдамдығын Циолковский формуласымен салыстыр.',
    controls: [
      { type: 'select', key: 'mode', label: 'Қайда', value: 'earth', options: [['earth', 'Байқоңырдан тік ұшу (g ескеріледі)'], ['space', 'Ғарышта (тартылыссыз)']] },
      { type: 'range', key: 'u', label: 'Газдың шығу жылдамдығы u', min: 1000, max: 4500, step: 250, value: 3000, unit: 'м/с', digits: 0 },
      { type: 'range', key: 'fuel', label: 'Отынның бастапқы массадағы үлесі', min: 50, max: 90, step: 5, value: 80, unit: '%', digits: 0 },
      { type: 'range', key: 'tb', label: 'Отынның жану уақыты', min: 60, max: 200, step: 10, value: 120, unit: 'с', digits: 0 },
    ],
    readouts: [
      { key: 't', label: 'Уақыт t', unit: 'с', digits: 0 },
      { key: 'm', label: 'Зымыранның массасы m', unit: 'т', digits: 1 },
      { key: 'v', label: 'Жылдамдығы v', unit: 'м/с', digits: 0 },
      { key: 'vc', label: 'Циолковский: u·ln(m₀/m)', unit: 'м/с', digits: 0 },
      { key: 'F', label: 'Тарту күші F = u·μ', unit: 'МН', digits: 2 },
      { key: 'h', label: 'Биіктік (жол)', unit: 'км', digits: 1 },
    ],
    init: function (api) { var S = api.S; S.t = 0; S.h = 0; S.v = 0; S.vt = [[0, 0]]; S.parts = []; },
    step: function (api, dt) {
      var S = api.S, P = api.P, speed = 18, n = 10;
      for (var i = 0; i < n; i++) {
        var h = dt * speed / n, st = state(P, S.t);
        S.v += st.a * h; if (S.h <= 0 && S.v < 0) S.v = 0; // тарту күші салмақтан аз болса, зымыран алаңда тұрады
        S.h = Math.max(0, S.h + S.v * h); S.t += h;
      }
      S.vt.push([S.t, S.v]);
      // газ бөлшектері (экран координатасында)
      if (S.t < P.tb) for (var k = 0; k < 3; k++) S.parts.push({ x: (Math.random() - 0.5) * 10, y: 0, vx: (Math.random() - 0.5) * 40, vy: 160 + Math.random() * 120, life: 0 });
      S.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt; });
      S.parts = S.parts.filter(function (p) { return p.life < 1.2; });
      if (S.t > P.tb + 40) return false;
    },
    read: function (api) {
      var S = api.S, P = api.P, st = state(P, S.t);
      return { t: S.t, m: st.m, v: S.v, vc: P.u * Math.log(M0 / st.m), F: st.thrust / 1e6, h: S.h / 1000 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, st = state(P, S.t), earth = P.mode === 'earth';
      var alt = S.h, L = Math.min(150, H * 0.34); // м
      var ryS = earth ? Math.max(H * 0.42, H * 0.86 - 8 - 0.45 * L - alt * 0.6) : H * 0.42;
      if (earth) {
        var k = Math.min(1, alt / 60000);
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, mix('#6fb2e8', '#02040a', Math.min(1, k * 1.4))); sky.addColorStop(1, mix('#d6ecf8', '#0b1430', k));
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        if (k > 0.35) { ctx.globalAlpha = (k - 0.35) / 0.65; R.stars(ctx, W, H, 6, 120); ctx.globalAlpha = 1; }
        // бұлттар өтеді
        for (var c = 0; c < 4; c++) { var cy = H * 0.2 + c * 140 + alt * 0.15 - 600; if (cy > -40 && cy < H + 40 && alt < 15000) R.cloud(ctx, (c * 0.31 + 0.1) % 1 * W, cy, 0.9); }
        // жер және ұшыру алаңы
        var gy = ryS + 0.45 * L + 8 + alt * 0.6;
        if (gy < H + 10) {
          ctx.fillStyle = '#c9b48a'; ctx.fillRect(0, gy, W, H - gy + 2);
          ctx.fillStyle = '#7a7f86'; ctx.fillRect(W / 2 + 40, gy - 150, 14, 150); for (var b = 0; b < 7; b++) ctx.fillRect(W / 2 + 18, gy - 140 + b * 20, 36, 3);
          ctx.fillStyle = '#5b636b'; ctx.fillRect(W / 2 - 60, gy - 8, 120, 8);
          R.tag(ctx, 'Байқоңыр ғарыш айлағы', W / 2 - 120, gy + 18, { size: 10.5 });
        }
      } else {
        R.scene(ctx, W, H, 'space', { seed: 12, count: 160 });
        // жұлдыздар жылжиды (камера зымыранмен бірге)
        ctx.fillStyle = 'rgba(255,255,255,.7)'; var rr = R.rng(3);
        for (var i = 0; i < 60; i++) { var y = (rr() * H + alt * 0.02) % H; ctx.fillRect(rr() * W, y, 1.5, 1.5 + Math.min(10, S.v / 600)); }
        R.planet(ctx, W * 0.85, H * 0.85 + alt * 0.0005, 70, 'earth', { light: Math.PI * 1.2 });
      }
      // зымыран (экранда қозғалмайды, бастапқыда алаңнан көтеріледі)
      var rx = W / 2, ry = ryS;
      // газ ағыны
      S.parts.forEach(function (p) {
        var a = Math.max(0, 1 - p.life / 1.2);
        ctx.fillStyle = 'rgba(' + (p.life < 0.15 ? '255,200,90,' : '210,210,210,') + (a * (p.life < 0.15 ? 0.9 : 0.35)) + ')';
        ctx.beginPath(); ctx.arc(rx + p.x, ry + L * 0.42 + p.y, 4 + p.life * 16, 0, 7); ctx.fill();
      });
      if (!st.burnt) R.flame(ctx, rx, ry + L * 0.45 + 34, 46 + Math.random() * 8, S.t);
      rocket(ctx, rx, ry, L);
      // импульс векторлары
      if (!st.burnt) {
        R.force(ctx, rx + 46, ry, rx + 46, ry - 60, '#d2382b', 'p зымыран');
        R.force(ctx, rx + 46, ry + L * 0.55, rx + 46, ry + L * 0.55 + 60, '#e0761b', 'p газ');
      }
      // v(t) графигі
      var gx = 50, gw = Math.min(W * 0.32, 260), gy0 = 24, gh = Math.min(H * 0.32, 150);
      ctx.save(); R.rr(ctx, gx - 40, gy0 - 14, gw + 54, gh + 50, 8); ctx.fillStyle = R.isDark() || !earth || alt > 20000 ? 'rgba(20,26,32,.85)' : 'rgba(255,255,255,.88)'; ctx.fill(); ctx.restore();
      var vmax = P.u * Math.log(1 / (1 - P.fuel / 100)) * 1.05 + 10;
      api.D.plot(ctx, { x: gx, y: gy0, w: gw, h: gh }, { xmin: 0, xmax: P.tb + 40, ymin: 0, ymax: Math.max(1000, vmax), xlabel: 't, с', ylabel: 'v, м/с', series: [{ pts: S.vt, color: '#d2382b' }], marker: [S.t, Math.max(0, S.v)] });
      R.tag(ctx, st.burnt ? 'Отын таусылды: v = ' + Math.round(S.v) + ' м/с' : 'm₀/m = ' + Sim.fmt(M0 / st.m, 2), W - 110, 24, { size: 11, color: '#0b6b78' });
    },
  });
  function mix(a, b, t) { var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); var r = (A >> 16) + ((B >> 16) - (A >> 16)) * t, g = ((A >> 8) & 255) + (((B >> 8) & 255) - ((A >> 8) & 255)) * t, bl = (A & 255) + ((B & 255) - (A & 255)) * t; return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(bl) + ')'; }
  function rocket(ctx, x, y, L) {
    var w = L * 0.2;
    ctx.save();
    var g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, '#b9c0c6'); g.addColorStop(0.4, '#ffffff'); g.addColorStop(1, '#9aa3ab');
    // қанаттар
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(x - w / 2, y + L * 0.2); ctx.lineTo(x - w * 1.1, y + L * 0.5); ctx.lineTo(x - w / 2, y + L * 0.42); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + L * 0.2); ctx.lineTo(x + w * 1.1, y + L * 0.5); ctx.lineTo(x + w / 2, y + L * 0.42); ctx.fill();
    // корпус
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, y + L * 0.45); ctx.lineTo(x - w / 2, y - L * 0.3); ctx.quadraticCurveTo(x - w / 2, y - L * 0.5, x, y - L * 0.55); ctx.quadraticCurveTo(x + w / 2, y - L * 0.5, x + w / 2, y - L * 0.3); ctx.lineTo(x + w / 2, y + L * 0.45); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7d878f'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(x - w * 0.42, y - L * 0.36); ctx.quadraticCurveTo(x, y - L * 0.6, x + w * 0.42, y - L * 0.36); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f6fae'; ctx.beginPath(); ctx.arc(x, y - L * 0.18, w * 0.2, 0, 7); ctx.fill(); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#59616a'; ctx.fillRect(x - w * 0.35, y + L * 0.45, w * 0.7, L * 0.06);
    R.txt(ctx, 'KZ', x, y + L * 0.12, { size: Math.max(8, w * 0.3), color: '#2f6fae', weight: '700' });
    ctx.restore();
  }
})();

/* Ядролық реакциялар: зарядтық және массалық сандардың сақталуы, энергетикалық шығым Q = (Σm_баст − Σm_соң)·c². Белгісіз бөлшекті табу ойыны. */
(function () {
  var R = window.Real, U = 931.494;
  // бөлшектер: [белгі (жоғарғы A, төменгі Z), Z, A, атомдық масса, түсі]
  var PT = {
    n: ['n', 0, 1, 1.008665, '#8f99a3'], p: ['p', 1, 1, 1.007825, '#d2382b'], a: ['He', 2, 4, 4.002603, '#e0a21b'], e: ['e', -1, 0, 0, '#1f5fd1'],
    d: ['H', 1, 2, 2.014102, '#e8892b'], t: ['H', 1, 3, 3.016049, '#e8892b'], li7: ['Li', 3, 7, 7.016003, '#7a3fb0'], be9: ['Be', 4, 9, 9.012183, '#3a9a5c'],
    c12: ['C', 6, 12, 12.0, '#3a4148'], c14: ['C', 6, 14, 14.003242, '#3a4148'], n14: ['N', 7, 14, 14.003074, '#2f7fd1'], o17: ['O', 8, 17, 16.999132, '#0b8a7a'],
    u235: ['U', 92, 235, 235.04393, '#2c6e2c'], ba141: ['Ba', 56, 141, 140.914411, '#a8701a'], kr92: ['Kr', 36, 92, 91.926156, '#5b3fb0'],
    ra226: ['Ra', 88, 226, 226.02541, '#5fae5f'], rn222: ['Rn', 86, 222, 222.017578, '#6d84a8'],
  };
  var RX = {
    ruth: ['Резерфорд, 1919: азоттан протон алу', ['n14', 'a'], ['o17', 'p']],
    chad: ['Чедвик, 1932: нейтронның ашылуы', ['be9', 'a'], ['c12', 'n']],
    fis: ['Уран-235-тің бөлінуі', ['u235', 'n'], ['ba141', 'kr92', 'n', 'n', 'n']],
    dt: ['Термоядролық синтез: дейтерий + тритий', ['d', 't'], ['a', 'n']],
    li: ['Кокрофт — Уолтон, 1932: литийдің ыдырауы', ['li7', 'p'], ['a', 'a']],
    alpha: ['Радийдің α-ыдырауы', ['ra226'], ['rn222', 'a']],
    beta: ['Көміртек-14-тің β-ыдырауы', ['c14'], ['n14', 'e']],
  };
  Sim.create({
    aspect: 0.56, grid: false,
    hint: 'Реакцияны таңдап, «Бастау» бас. Реакцияға дейінгі және кейінгі зарядтық сандар мен массалық сандардың қосындыларын салыстыр.',
    controls: [
      { type: 'select', key: 'rx', label: 'Реакция', value: 'ruth', options: Object.keys(RX).map(function (k) { return [k, RX[k][0]]; }) },
      { type: 'check', key: 'quiz', label: 'Ойын: бір өнімді жасыру («?» бөлшекті тап)', value: false, live: true },
    ],
    readouts: [
      { key: 'Z', label: 'ΣZ: дейін → кейін', text: true },
      { key: 'A', label: 'ΣA: дейін → кейін', text: true },
      { key: 'dm', label: 'Масса өзгерісі Σm_баст − Σm_соң', unit: 'м.а.б.', digits: 6 },
      { key: 'Q', label: 'Энергетикалық шығым Q', unit: 'МэВ', digits: 2 },
      { key: 'kind', label: 'Реакция', text: true },
    ],
    init: function (api) { api.S.t = 0; },
    step: function (api, dt) { api.S.t = Math.min(2.4, api.S.t + dt * 0.8); if (api.S.t >= 2.4) return false; },
    read: function (api) {
      var r = RX[api.P.rx], sz = function (l, i) { return l.reduce(function (s, k) { return s + PT[k][i]; }, 0); };
      var dm = sz(r[1], 3) - sz(r[2], 3), Q = dm * U;
      if (api.P.quiz && api.S.t < 2.39) return { Z: sz(r[1], 1) + ' → ?', A: sz(r[1], 2) + ' → ?', dm: null, Q: null, kind: 'ойын: «?» бөлшекті тап' };
      return { Z: sz(r[1], 1) + ' → ' + sz(r[2], 1), A: sz(r[1], 2) + ' → ' + sz(r[2], 2), dm: dm, Q: Q, kind: Q > 0 ? 'энергия бөлінеді (экзотермиялық)' : 'энергия жұтылады (эндотермиялық)' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, r = RX[P.rx], dark = R.isDark(), t = S.t;
      R.scene(ctx, W, H, 'space', { seed: 31, count: 90 });
      var cy = H * 0.44, mid = W / 2;
      // теңдеу (жоғарыда)
      var eq = r[1].map(lab).join(' + ') + '  →  ' + r[2].map(function (k, i) { return P.quiz && i === 0 ? '?' : lab(k); }).join(' + ');
      R.tag(ctx, eq, mid, 30, { size: W < 600 ? 11 : 15, mono: true });
      // бастапқы бөлшектер жақындайды, соқтығысу, өнімдер ұшып кетеді
      var before = r[1], after = r[2];
      if (t < 1) {
        var k = t;
        before.forEach(function (key, i) {
          var dir = before.length === 1 ? 0 : (i === 0 ? -1 : 1), x = mid + dir * (1 - k) * W * 0.34;
          nucleus(ctx, x, cy, key, false);
        });
      } else {
        var k2 = t - 1, flash = Math.max(0, 1 - k2 * 3);
        if (flash > 0) { var g = ctx.createRadialGradient(mid, cy, 0, mid, cy, 80); g.addColorStop(0, 'rgba(255,240,180,' + flash + ')'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mid, cy, 80, 0, 7); ctx.fill(); }
        after.forEach(function (key, i) {
          var ang = after.length === 1 ? 0 : -Math.PI / 2 + Math.PI * 2 * i / after.length + 0.4;
          var dist = Math.min(1, k2 / 1.2) * Math.min(W * 0.32, H * 0.34) * (PT[key][2] > 20 ? 0.75 : 1.05);
          nucleus(ctx, mid + Math.cos(ang) * dist * 1.4, cy + Math.sin(ang) * dist, key, P.quiz && i === 0 && t < 2.39);
        });
      }
      // қосындылар кестесі
      var Zb = before.reduce(function (s, k) { return s + PT[k][1]; }, 0), Za = after.reduce(function (s, k) { return s + PT[k][1]; }, 0);
      var Ab = before.reduce(function (s, k) { return s + PT[k][2]; }, 0), Aa = after.reduce(function (s, k) { return s + PT[k][2]; }, 0);
      var by = H - 64;
      R.tag(ctx, 'Зарядтық сан: ' + Zb + ' = ' + (P.quiz && t < 2.39 ? '?' : Za), mid - (W < 600 ? 80 : 140), by, { size: 12, color: '#b4342a' });
      R.tag(ctx, 'Массалық сан: ' + Ab + ' = ' + (P.quiz && t < 2.39 ? '?' : Aa), mid + (W < 600 ? 80 : 140), by, { size: 12, color: '#1f5fd1' });
      if (t >= 2.39) {
        var dm = before.reduce(function (s, k) { return s + PT[k][3]; }, 0) - after.reduce(function (s, k) { return s + PT[k][3]; }, 0);
        R.tag(ctx, 'Q = Δm·c² = ' + Sim.fmt(dm * U, 2) + ' МэВ ' + (dm > 0 ? '(энергия бөлінеді)' : '(энергия жұтылады)'), mid, by + 32, { size: 12, color: '#0b6b78' });
      }
    },
  });
  function lab(k) { var p = PT[k]; if (k === 'n') return '¹₀n'; if (k === 'e') return '⁰₋₁e'; return sup(p[2]) + sub(p[1]) + p[0]; }
  function sup(n) { var S = '⁰¹²³⁴⁵⁶⁷⁸⁹'; return String(n).split('').map(function (d) { return S[+d]; }).join(''); }
  function sub(n) { var S = '₀₁₂₃₄₅₆₇₈₉'; return String(n).split('').map(function (d) { return S[+d]; }).join(''); }
  function nucleus(ctx, x, y, key, hidden) {
    var p = PT[key], A = Math.max(1, p[2]), r = key === 'e' ? 5 : 7 + Math.cbrt(A) * 5.5;
    if (hidden) { ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.strokeStyle = '#ffd666'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); R.txt(ctx, '?', x, y, { size: r, color: '#ffd666', weight: '700' }); return; }
    if (A > 3 && key !== 'e') {
      var rr = R.rng(A * 7 + p[1]), n = Math.min(A, 40);
      for (var i = 0; i < n; i++) { var a = rr() * 6.283, d = Math.sqrt(rr()) * r * 0.75; R.sphere(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(3, r * 0.28), i < n * p[1] / A ? '#d2382b' : '#8f99a3'); }
    } else R.sphere(ctx, x, y, r, p[4]);
    R.tag(ctx, lab(key), x, y + r + 14, { size: 11, mono: true });
  }
})();

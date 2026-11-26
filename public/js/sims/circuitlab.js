/* 8-сынып: электр тізбегінің конструкторы.
   Оқушы элементтерді төменгі панельден тақтаға сүйреп қояды, сыммен жалғайды; тізбек түйіндік потенциалдар
   әдісімен есептеледі (әр кадрда). Тапсырмалар жиналған тізбектің өлшеу нәтижелері бойынша тексеріледі:
   мысалы, «амперметр шам арқылы өтетін токты көрсетеді» — амперметр мен шамның токтары тең болса ғана орындалды. */
(function () {
  'use strict';
  var R = window.Real;
  var G = 40;          // тор қадамы (модель пикселі)
  var PAL_H = 74;      // төменгі палитраның биіктігі
  var OY = 14;         // тақтаның жоғарғы шеті (белгілер кесілмеуі үшін)
  var R_WIRE = 0.01, R_BAT = 0.3, R_AM = 0.05, R_VM = 1e6, R_FUSE = 0.05, LAMP_R = 12, LAMP_UNOM = 6, LAMP_BURN = 9.5, FUSE_I = 2, RHEO_MAX = 30;

  var TYPES = {
    battery: { name: 'Ток көзі', pre: 'ε', polar: true },
    lamp: { name: 'Шам', pre: 'Л' },
    switch: { name: 'Кілт', pre: 'К' },
    resistor: { name: 'Резистор', pre: 'R' },
    rheostat: { name: 'Реостат', pre: 'Rр' },
    ammeter: { name: 'Амперметр', pre: 'A', polar: true },
    voltmeter: { name: 'Вольтметр', pre: 'V', polar: true },
    fuse: { name: 'Сақтандырғыш', pre: 'С' },
  };
  var PAL = ['battery', 'lamp', 'switch', 'resistor', 'rheostat', 'ammeter', 'voltmeter', 'fuse'];
  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  // ---------- тақтаның күйі ----------
  var els = [];        // {id, t, c:[i,j], r:0..3, v, on, broken}
  var wires = [];      // {id, a:[i,j], b:[i,j]}
  var nextId = 1, sel = null, drag = null, alerts = [], sol = null, cols = 10, rows = 6, flash = null, selBtns = [];

  function defVal(t) { return t === 'battery' ? 4.5 : t === 'resistor' ? 10 : t === 'rheostat' ? 0.5 : 0; }
  function ends(e) { var d = DIRS[e.r]; return [[e.c[0] - d[0], e.c[1] - d[1]], [e.c[0] + d[0], e.c[1] + d[1]]]; }
  function px(n) { return { x: G * (n[0] + 0.5), y: OY + G * (n[1] + 0.5) }; }
  function key(n) { return n[0] + ',' + n[1]; }
  function nearNode(p) { return [Math.max(0, Math.min(cols - 1, Math.round(p.x / G - 0.5))), Math.max(0, Math.min(rows - 1, Math.round((p.y - OY) / G - 0.5)))]; }
  function inBounds(n) { return n[0] >= 0 && n[1] >= 0 && n[0] < cols && n[1] < rows; }
  function fits(e, ignore) {
    var en = ends(e);
    if (!inBounds(en[0]) || !inBounds(en[1])) return false;
    for (var i = 0; i < els.length; i++) {
      var o = els[i];
      if (o === e || o === ignore) continue;
      if (Math.max(Math.abs(o.c[0] - e.c[0]), Math.abs(o.c[1] - e.c[1])) < 2) return false;
    }
    return true;
  }
  // Тор түйіні басқа сымның ортасына түссе, сол сым осы түйінде екіге бөлінеді — сонда жалғану шын болады
  function splitAt(n) {
    for (var i = wires.length - 1; i >= 0; i--) {
      var w = wires[i], dx = w.b[0] - w.a[0], dy = w.b[1] - w.a[1];
      var cr = (n[0] - w.a[0]) * dy - (n[1] - w.a[1]) * dx;
      if (cr !== 0) continue;
      var t = dx !== 0 ? (n[0] - w.a[0]) / dx : (n[1] - w.a[1]) / dy;
      if (t <= 0 || t >= 1) continue;
      wires.splice(i, 1, { id: w.id, a: w.a, b: n.slice() }, { id: nextId++, a: n.slice(), b: w.b });
    }
  }
  function splitAll() {
    els.forEach(function (e) { ends(e).forEach(splitAt); });
    wires.slice().forEach(function (w) { splitAt(w.a); splitAt(w.b); });
  }
  function freeSpot(e) {
    var best = null, cx = (cols - 1) / 2, cy = (rows - 1) / 2;
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      e.c = [i, j];
      if (!fits(e)) continue;
      var d = Math.hypot(i - cx, (j - cy) * 1.4);
      if (!best || d < best.d) best = { c: [i, j], d: d };
    }
    if (best) e.c = best.c;
    return best;
  }
  function names() {
    var cnt = {}, out = {};
    els.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (e) { cnt[e.t] = (cnt[e.t] || 0) + 1; out[e.id] = TYPES[e.t].pre + (e.t === 'battery' && cnt[e.t] === 1 ? '' : cnt[e.t]); });
    return out;
  }

  // ---------- сақтау (браузерде) ----------
  var LS = 'circuitlab.v1';
  function save() {
    try { localStorage.setItem(LS, JSON.stringify({ els: els, wires: wires, done: done, cur: cur })); } catch (e) { /* жеке режим */ }
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(LS) || 'null');
      if (!d) return;
      els = (d.els || []).filter(function (e) { return TYPES[e.t]; });
      wires = d.wires || [];
      done = d.done || {};
      cur = typeof d.cur === 'number' ? d.cur : 0;
      els.concat(wires).forEach(function (x) { nextId = Math.max(nextId, x.id + 1); });
    } catch (e) { /* бұзылған дерек */ }
  }

  // ---------- есептеу: түйіндік потенциалдар әдісі ----------
  function gauss(A, z, n) {
    for (var c = 0; c < n; c++) {
      var piv = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      if (piv !== c) { var t = A[c]; A[c] = A[piv]; A[piv] = t; var tz = z[c]; z[c] = z[piv]; z[piv] = tz; }
      if (Math.abs(A[c][c]) < 1e-15) continue;
      for (var r2 = c + 1; r2 < n; r2++) {
        var f = A[r2][c] / A[c][c];
        if (!f) continue;
        for (var k = c; k < n; k++) A[r2][k] -= f * A[c][k];
        z[r2] -= f * z[c];
      }
    }
    var x = new Float64Array(n);
    for (var c2 = n - 1; c2 >= 0; c2--) {
      var s = z[c2];
      for (var k2 = c2 + 1; k2 < n; k2++) s -= A[c2][k2] * x[k2];
      x[c2] = Math.abs(A[c2][c2]) < 1e-15 ? 0 : s / A[c2][c2];
    }
    return x;
  }
  function cond(e) {
    switch (e.t) {
      case 'lamp': return e.broken ? 0 : 1 / LAMP_R;
      case 'resistor': return 1 / e.v;
      case 'rheostat': return 1 / Math.max(0.5, e.v * RHEO_MAX);
      case 'switch': return e.on ? 1 / R_WIRE : 0;
      case 'ammeter': return 1 / R_AM;
      case 'voltmeter': return 1 / R_VM;
      case 'fuse': return e.broken ? 0 : 1 / R_FUSE;
      case 'battery': return 1 / R_BAT;
    }
    return 0;
  }
  function solveOnce() {
    var idx = {}, n = 0;
    function node(p) { var k = key(p); if (!(k in idx)) idx[k] = n++; return idx[k]; }
    var items = [];
    els.forEach(function (e) { var en = ends(e); items.push({ e: e, na: node(en[0]), nb: node(en[1]), g: cond(e) }); });
    wires.forEach(function (w) { items.push({ w: w, na: node(w.a), nb: node(w.b), g: 1 / R_WIRE }); });
    var A = [], z = new Float64Array(n);
    for (var i = 0; i < n; i++) { A.push(new Float64Array(n)); A[i][i] = 1e-9; }
    items.forEach(function (it) {
      if (!it.g) return;
      A[it.na][it.na] += it.g; A[it.nb][it.nb] += it.g; A[it.na][it.nb] -= it.g; A[it.nb][it.na] -= it.g;
      // ток көзі: ЭҚК + ішкі кедергі (Нортон баламасы); «+» қысқыш — b ұшында
      if (it.e && it.e.t === 'battery') { z[it.nb] += it.e.v / R_BAT; z[it.na] -= it.e.v / R_BAT; }
    });
    var V = n ? gauss(A, z, n) : [];
    // Сымдар мен тұйық кілттер біріктірген «электрлік түйіндер» (тізбектей/параллель екенін анықтау үшін)
    var par = []; for (var j = 0; j < n; j++) par.push(j);
    function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
    items.forEach(function (it) { if (it.w || (it.e && it.e.t === 'switch' && it.e.on)) par[find(it.na)] = find(it.nb); });
    var res = { byId: {}, items: items };
    items.forEach(function (it) {
      var Va = V[it.na] || 0, Vb = V[it.nb] || 0, I;
      if (it.e && it.e.t === 'battery') I = (it.e.v - (Vb - Va)) / R_BAT; // көздің ішінде a → b (− → +) ағатын ток
      else I = (Va - Vb) * it.g;                                           // a → b ағатын ток
      var r = { I: I, U: Math.abs(Va - Vb), Uab: Va - Vb, na: it.na, nb: it.nb, ea: find(it.na), eb: find(it.nb) };
      r.P = it.e && it.e.t === 'battery' ? Math.abs(I) * it.e.v : Math.abs(I) * r.U;
      res.byId[(it.e || it.w).id] = r;
    });
    return res;
  }
  function solve() {
    var s = solveOnce(), again = false;
    els.forEach(function (e) {
      var r = s.byId[e.id];
      if (e.t === 'lamp' && !e.broken && r.U > LAMP_BURN) { e.broken = true; again = true; note('Шам күйіп кетті: кернеуі номиналдан (6 В) әлдеқайда жоғары. Шамды түртсең, жаңасы қойылады.'); }
      if (e.t === 'fuse' && !e.broken && Math.abs(r.I) > FUSE_I) { e.broken = true; e.blew = true; again = true; note('Сақтандырғыш балқып үзілді: ток 2 А-ден асты. Ол тізбекті үзіп, сымдарды қызудан сақтады. Түртсең, жаңасы қойылады.'); }
    });
    if (again) { s = solveOnce(); save(); }
    sol = s;
    // ескертулер
    alerts = [];
    els.forEach(function (e) {
      var r = s.byId[e.id];
      if (e.t === 'battery' && Math.abs(r.I) > 4) alerts.push('Қысқа тұйықталу! Ток көзі арқылы өте үлкен ток жүріп жатыр — сымдар қызады.');
      if (e.t === 'ammeter' && Math.abs(r.I) > 3) alerts.push('Амперметр арқылы өте үлкен ток! Амперметр тізбекке тек тізбектей қосылады.');
      if (e.t === 'ammeter' && r.I < -0.005) alerts.push('Амперметр кері жалғанған: оның «+» қысқышы ток көзінің «+» жағына қарап тұруы керек. Элементті түртіп, «Бұру» бас.');
      if (e.t === 'voltmeter' && r.Uab < -0.05) alerts.push('Вольтметр кері жалғанған: «+» қысқышын ток көзінің «+» жағына жалға.');
      if (e.t === 'voltmeter' && Math.abs(r.I) > 1e-9) {
        var ser = els.some(function (o) { return (o.t === 'lamp' || o.t === 'resistor') && Math.abs(s.byId[o.id].I) > 1e-9 && Math.abs(Math.abs(s.byId[o.id].I) - Math.abs(r.I)) < 0.05 * Math.abs(r.I); });
        if (ser) alerts.push('Вольтметр тізбектей қосылған: оның кедергісі өте үлкен, сондықтан ток жүрмейді. Вольтметр элементке параллель қосылады.');
      }
    });
    alerts = alerts.filter(function (a, i) { return alerts.indexOf(a) === i; });
  }
  function note(s) { flash = { s: s, t: performance.now() }; }

  // ---------- тапсырмалар ----------
  function R0(e) { return sol.byId[e.id]; }
  function lit(e) { return e.t === 'lamp' && !e.broken && R0(e).P >= 0.15; }
  function of(t) { return els.filter(function (e) { return e.t === t; }); }
  function same(a, b) { return Math.abs(Math.abs(a) - Math.abs(b)) <= 0.02 * Math.max(Math.abs(a), Math.abs(b)) + 1e-6; }
  function across(m, e) { var a = R0(m), b = R0(e); return (a.ea === b.ea && a.eb === b.eb) || (a.ea === b.eb && a.eb === b.ea); }
  function inSeries(m, e) { var a = R0(m), b = R0(e); return Math.abs(b.I) > 0.005 && same(a.I, b.I) && !across(m, e); }
  var TASKS = [
    {
      t: 'Шамды кілт арқылы жақ',
      goal: 'Ток көзі, кілт, шам және сымдардан тұйық тізбек жина. Кілтті тұйықтап (түрт), шамды жақ, сосын кілтті ажыратып, сөндір.',
      sch: [['battery', 0, 2, 0, 0], ['w', 0, 0, 1, 0], ['switch', 1, 0, 3, 0], ['w', 3, 0, 4, 0], ['lamp', 4, 0, 4, 2], ['w', 4, 2, 0, 2]],
      check: function (m) {
        if (!m.sw) {
          var L = of('lamp').filter(lit)[0];
          if (!L) return false;
          var K = of('switch').filter(function (k) { return k.on && inSeries(k, L); })[0];
          if (K) { m.sw = K.id; m.lamp = L.id; note('Шам жанды! Енді кілтті ажыратып көр.'); }
          return false;
        }
        var k2 = els.filter(function (e) { return e.id === m.sw; })[0], l2 = els.filter(function (e) { return e.id === m.lamp; })[0];
        if (!k2 || !l2) { m.sw = null; return false; }
        return !k2.on && !lit(l2);
      },
    },
    {
      t: 'Амперметрмен шамдағы ток күшін өлше',
      goal: 'Амперметрді шаммен тізбектей жалға. Амперметрдің «+» қысқышы ток көзінің «+» жағына қарап тұрсын.',
      sch: [['battery', 0, 2, 0, 0], ['w', 0, 0, 0.5, 0], ['switch', 0.5, 0, 2, 0], ['ammeter', 2, 0, 4, 0], ['lamp', 4, 0, 4, 2], ['w', 4, 2, 0, 2]],
      check: function () { return of('lamp').filter(lit).some(function (L) { return of('ammeter').some(function (A) { return R0(A).I > 0.02 && inSeries(A, L); }); }); },
    },
    {
      t: 'Вольтметрмен шамдағы кернеуді өлше',
      goal: 'Вольтметрді шамға параллель жалға: вольтметрдің екі қысқышы шамның екі ұшына қосылады.',
      sch: [['battery', 0, 2, 0, 0], ['w', 0, 0, 1, 0], ['switch', 1, 0, 3, 0], ['w', 3, 0, 5, 0], ['lamp', 3.5, 0, 3.5, 2], ['voltmeter', 5, 0, 5, 2], ['w', 5, 2, 0, 2]],
      check: function () { return of('lamp').filter(lit).some(function (L) { return of('voltmeter').some(function (V) { return R0(V).Uab > 0.1 && across(V, L); }); }); },
    },
    {
      t: 'Екі шамды тізбектей жалға',
      goal: 'Екі шамды бірінен кейін бірін (тізбектей) жалға. Екеуі де жансын. Олардың жарықтығы бір шамнан неге әлсіз?',
      sch: [['battery', 0, 2, 0, 0], ['w', 0, 0, 1, 0], ['switch', 1, 0, 3, 0], ['w', 3, 0, 4, 0], ['lamp', 4, 0, 4, 2], ['w', 4, 2, 3, 2], ['lamp', 3, 2, 1, 2], ['w', 1, 2, 0, 2]],
      check: function () {
        var Ls = of('lamp').filter(lit);
        for (var i = 0; i < Ls.length; i++) for (var j = i + 1; j < Ls.length; j++) if (same(R0(Ls[i]).I, R0(Ls[j]).I) && !across(Ls[i], Ls[j])) return true;
        return false;
      },
    },
    {
      t: 'Екі шамды параллель жалға',
      goal: 'Екі шамның ұштарын бір-біріне қосып (параллель), ток көзіне жалға. Біреуін алып тастасаң, екіншісі жана ма?',
      sch: [['battery', 0, 2, 0, 0], ['w', 0, 0, 1, 0], ['switch', 1, 0, 2.5, 0], ['w', 2.5, 0, 5, 0], ['lamp', 3, 0, 3, 2], ['lamp', 5, 0, 5, 2], ['w', 5, 2, 0, 2]],
      check: function () {
        var Ls = of('lamp').filter(lit);
        for (var i = 0; i < Ls.length; i++) for (var j = i + 1; j < Ls.length; j++) if (across(Ls[i], Ls[j])) return true;
        return false;
      },
    },
    {
      t: 'Реостатпен шамның жарықтығын өзгерт',
      goal: 'Реостатты шаммен тізбектей жалға. Реостаттың жүгіргісін сүйреп, шамның жарықтығын кемінде 2 есе өзгерт.',
      sch: [['battery', 0, 2, 0, 0], ['w', 0, 0, 1, 0], ['rheostat', 1, 0, 3, 0], ['w', 3, 0, 4, 0], ['lamp', 4, 0, 4, 2], ['w', 4, 2, 0, 2]],
      check: function (m) {
        var ok = false;
        of('lamp').filter(function (L) { return !L.broken; }).forEach(function (L) {
          of('rheostat').forEach(function (Rh) {
            if (!inSeries(Rh, L)) return;
            var P = R0(L).P;
            m.min = m.min === undefined ? P : Math.min(m.min, P);
            m.max = m.max === undefined ? P : Math.max(m.max, P);
            if (m.max >= 0.15 && m.max >= 2 * Math.max(m.min, 0.02)) ok = true;
          });
        });
        return ok;
      },
    },
    {
      t: 'Ом заңын тексер: U / I = const',
      goal: 'Резисторға амперметрді тізбектей, вольтметрді параллель жалға. Ток көзінің кернеуін (немесе реостатты) өзгертіп, 3 түрлі кернеуде өлше. U / I қатынасы өзгере ме?',
      sch: [['battery', 0, 2, 0, 0], ['w', 0, 0, 1, 0], ['switch', 1, 0, 3, 0], ['w', 3, 0, 5, 0], ['resistor', 3.5, 0, 3.5, 2], ['voltmeter', 5, 0, 5, 2], ['w', 5, 2, 3.5, 2], ['ammeter', 3.5, 2, 1, 2], ['w', 1, 2, 0, 2]],
      check: function (m) {
        m.u = m.u || [];
        of('resistor').forEach(function (Rs) {
          var A = of('ammeter').filter(function (a) { return R0(a).I > 0.005 && inSeries(a, Rs); })[0];
          var V = of('voltmeter').filter(function (v) { return R0(v).Uab > 0.1 && across(v, Rs); })[0];
          if (!A || !V) return;
          var U = R0(V).Uab;
          if (m.u.every(function (x) { return Math.abs(x - U) > 0.4; })) { m.u.push(U); note('Өлшеу жазылды: U = ' + Sim.fmt(U, 2) + ' В, I = ' + Sim.fmt(R0(A).I, 3) + ' А, U / I = ' + Sim.fmt(U / R0(A).I, 1) + ' Ом (' + m.u.length + ' / 3)'); }
        });
        return m.u.length >= 3;
      },
    },
    {
      t: 'Қысқа тұйықталу және сақтандырғыш',
      goal: 'Ток көзі, сақтандырғыш және шамнан тізбек жина. Сосын шамның екі ұшын сыммен тұйықта (қысқа тұйықталу). Сақтандырғыш не істейді?',
      sch: [['battery', 0, 2, 0, 0], ['w', 0, 0, 1, 0], ['fuse', 1, 0, 3, 0], ['w', 3, 0, 4, 0], ['lamp', 4, 0, 4, 2], ['w', 4, 2, 0, 2], ['wd', 4, 0.5, 4, 1.5]],
      check: function () { return els.some(function (e) { return e.t === 'fuse' && e.blew; }); },
    },
  ];
  var done = {}, cur = 0, mem = TASKS.map(function () { return {}; });

  // ---------- сурет салу ----------
  function frameAt(ctx, e) { var en = ends(e), a = px(en[0]), b = px(en[1]); ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x)); }
  function lead(ctx, x1, y1, x2, y2) { R.wire(ctx, [[x1, y1], [x2, y2]], { color: '#9aa1a8', w: 3 }); }
  function meterMax(v) { var s = [0.5, 1, 2, 5, 10, 20]; v = Math.abs(v); return s.filter(function (m) { return m >= v * 1.1; })[0] || 20; }
  function rheoKnob(e) { var en = ends(e), a = px(en[0]), b = px(en[1]), f = -0.7 + 1.4 * e.v, ang = Math.atan2(b.y - a.y, b.x - a.x); var cx = (a.x + b.x) / 2 + Math.cos(ang) * f * G * 0.5, cy = (a.y + b.y) / 2 + Math.sin(ang) * f * G * 0.5; return { x: cx + Math.sin(ang) * 15, y: cy - Math.cos(ang) * 15 }; }

  function drawReal(ctx, e, nm, ghost) {
    var r = sol && sol.byId[e.id] ? sol.byId[e.id] : { I: 0, U: 0, P: 0, Uab: 0 };
    var en = ends(e), a = px(en[0]), b = px(en[1]), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, vert = e.r % 2 === 1;
    ctx.save();
    if (ghost) ctx.globalAlpha = 0.6;
    if (e.t === 'lamp') {
      lead(ctx, a.x, a.y, cx - (vert ? 0 : 6), cy - (vert ? 6 : 0)); lead(ctx, b.x, b.y, cx + (vert ? 0 : 6), cy + (vert ? 6 : 0));
      var glow = e.broken ? 0 : Math.min(1, Math.sqrt(r.P / (LAMP_UNOM * LAMP_UNOM / LAMP_R)));
      R.bulb(ctx, cx, cy - 15, 11, glow);
      if (e.broken) { R.txt(ctx, '✕', cx, cy - 15, { size: 14, color: '#b4342a', weight: '800' }); }
    } else if (e.t === 'ammeter' || e.t === 'voltmeter') {
      var val = e.t === 'ammeter' ? r.I : r.Uab, mx = meterMax(val);
      var t = R.meter(ctx, cx, cy - 4, 19, val, mx, { letter: e.t === 'ammeter' ? 'A' : 'V', step: mx / 5 });
      // «+» қысқыш a ұшына, «−» b ұшына жалғанған
      lead(ctx, a.x, a.y, t.plus.x, t.plus.y); lead(ctx, b.x, b.y, t.minus.x, t.minus.y);
      R.meter(ctx, cx, cy - 4, 19, val, mx, { letter: e.t === 'ammeter' ? 'A' : 'V', step: mx / 5 });
      R.tag(ctx, Sim.fmt(val, e.t === 'ammeter' ? 2 : 2) + (e.t === 'ammeter' ? ' А' : ' В'), cx, cy + 28, { size: 10.5, mono: true, color: '#0b6b78' });
    } else {
      ctx.save(); frameAt(ctx, e);
      if (e.t === 'battery') {
        lead(ctx, -G, 0, -27, 0); lead(ctx, 27, 0, G, 0);
        R.battery(ctx, -27, -11, 54, 22, { label: e.r === 0 ? Sim.fmt(e.v, 1) + ' В' : ' ' });
      } else if (e.t === 'resistor') {
        R.resistor(ctx, 0, 0, 2 * G - 4, {});
      } else if (e.t === 'rheostat') {
        lead(ctx, -G, 0, -30, 0); lead(ctx, 30, 0, G, 0);
        ctx.fillStyle = '#5a4632'; R.rr(ctx, -30, -7, 60, 14, 4); ctx.fill();
        ctx.strokeStyle = '#d7b46a'; ctx.lineWidth = 1;
        for (var k = -26; k <= 26; k += 3.2) { ctx.beginPath(); ctx.moveTo(k, -6); ctx.lineTo(k + 1.2, 6); ctx.stroke(); }
        var f = -0.7 + 1.4 * e.v;
        ctx.fillStyle = '#2d3238'; ctx.fillRect(-30, -17, 60, 3);
        ctx.fillStyle = '#1f5fd1'; ctx.beginPath(); ctx.moveTo(f * G * 0.5, -7); ctx.lineTo(f * G * 0.5 - 6, -19); ctx.lineTo(f * G * 0.5 + 6, -19); ctx.closePath(); ctx.fill();
      } else if (e.t === 'switch') {
        lead(ctx, -G, 0, -20, 0); lead(ctx, 20, 0, G, 0);
        R.knife(ctx, -20, 20, 0, e.on);
      } else if (e.t === 'fuse') {
        lead(ctx, -G, 0, -22, 0); lead(ctx, 22, 0, G, 0);
        ctx.fillStyle = 'rgba(210,230,240,.75)'; R.rr(ctx, -20, -7, 40, 14, 5); ctx.fill(); ctx.strokeStyle = '#8aa'; ctx.stroke();
        ctx.fillStyle = '#b7bec4'; ctx.fillRect(-24, -8, 7, 16); ctx.fillRect(17, -8, 7, 16);
        ctx.strokeStyle = e.broken ? '#555' : '#c9a24a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); if (e.broken) { ctx.moveTo(-17, 0); ctx.lineTo(-4, 2); ctx.moveTo(4, -2); ctx.lineTo(17, 0); } else { ctx.moveTo(-17, 0); ctx.lineTo(17, 0); } ctx.stroke();
        if (e.broken) { ctx.fillStyle = 'rgba(40,40,40,.35)'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); }
      }
      ctx.restore();
      if (e.t === 'battery' && e.r !== 0) R.tag(ctx, Sim.fmt(e.v, 1) + ' В', cx + (vert ? 26 : 0), cy + (vert ? 0 : -20), { size: 10.5, mono: true, color: '#1b2329' });
    }
    // қысқыштар
    [a, b].forEach(function (q, i) {
      R.sphere(ctx, q.x, q.y, 5, i === 1 && TYPES[e.t].polar && e.t === 'battery' ? '#c62f22' : i === 0 && (e.t === 'ammeter' || e.t === 'voltmeter') ? '#c62f22' : '#c9a24a');
    });
    if (TYPES[e.t].polar) {
      var pp = e.t === 'battery' ? b : a, mm = e.t === 'battery' ? a : b, off = vert ? [12, 0] : [0, -12];
      R.txt(ctx, '+', pp.x + off[0], pp.y + off[1], { size: 12, color: '#c62f22', weight: '800' });
      R.txt(ctx, '−', mm.x + off[0], mm.y + off[1], { size: 12, color: '#333', weight: '800' });
    }
    var meterT = e.t === 'ammeter' || e.t === 'voltmeter';
    if (nm) R.tag(ctx, nm, cx + (meterT ? (vert ? -36 : -34) : vert ? -22 : 0), cy + (meterT ? -22 : vert ? 0 : (e.t === 'lamp' ? 16 : 20)), { size: 10, color: '#1b2329' });
    ctx.restore();
  }

  // Шартты белгілер (схема): тақтада да, тапсырманың схемасында да қолданылады
  function symbol(ctx, t, x1, y1, x2, y2, o) {
    o = o || {};
    var ang = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), s = o.s || 1, col = o.color || '#1b2329', h = 9 * s;
    ctx.save(); ctx.translate((x1 + x2) / 2, (y1 + y2) / 2); ctx.rotate(ang);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6 * Math.max(0.8, s * 0.9); ctx.lineCap = 'round';
    var line = function (a, b2, c, d) { ctx.beginPath(); ctx.moveTo(a, b2); ctx.lineTo(c, d); ctx.stroke(); };
    var bw = 12 * s;
    if (t === 'w' || t === 'wd') { if (t === 'wd') ctx.setLineDash([4, 3]); line(-L / 2, 0, L / 2, 0); ctx.restore(); return; }
    var half = t === 'battery' ? 4 * s : t === 'resistor' || t === 'rheostat' || t === 'fuse' ? 13 * s : t === 'switch' ? 11 * s : 9 * s;
    line(-L / 2, 0, -half, 0); line(half, 0, L / 2, 0);
    if (t === 'battery') { line(-half, -h * 1.3, -half, h * 1.3); ctx.lineWidth *= 2.2; line(half, -h * 0.7, half, h * 0.7); ctx.lineWidth /= 2.2; }
    else if (t === 'resistor' || t === 'rheostat' || t === 'fuse') {
      ctx.strokeRect(-half, -h * 0.55, 2 * half, h * 1.1);
      if (t === 'fuse') line(-half, 0, half, 0);
      if (t === 'rheostat') { line(-half - 3, h * 1.1, half + 3, -h * 1.3); line(half + 3, -h * 1.3, half - 3, -h * 1.3 + 1); line(half + 3, -h * 1.3, half + 1, -h * 1.3 + 6); }
    } else if (t === 'lamp' || t === 'ammeter' || t === 'voltmeter') {
      ctx.beginPath(); ctx.arc(0, 0, half, 0, 7); ctx.stroke();
      if (t === 'lamp') { var q = half * 0.7; line(-q, -q, q, q); line(-q, q, q, -q); }
      else { ctx.rotate(-ang); ctx.font = '700 ' + Math.round(11 * s) + 'px "IBM Plex Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t === 'ammeter' ? 'A' : 'V', 0, 0.5); ctx.rotate(ang); }
    } else if (t === 'switch') {
      ctx.beginPath(); ctx.arc(-half, 0, 2 * s, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(half, 0, 2 * s, 0, 7); ctx.fill();
      if (o.on) line(-half, 0, half, 0); else line(-half, 0, half * 0.9, -h);
    }
    ctx.restore();
    // «+» белгісі (ток көзі: x2 жағы; өлшеуіш құралдар: x1 жағы)
    if (o.plus && (t === 'battery' || t === 'ammeter' || t === 'voltmeter')) {
      var px1 = t === 'battery' ? (x1 + x2) / 2 + Math.cos(ang) * 4 * s : (x1 + x2) / 2 - Math.cos(ang) * 14 * s, py1 = t === 'battery' ? (y1 + y2) / 2 + Math.sin(ang) * 4 * s : (y1 + y2) / 2 - Math.sin(ang) * 14 * s;
      ctx.save(); ctx.fillStyle = '#c62f22'; ctx.font = '700 ' + Math.round(11 * s) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', px1 + Math.sin(ang) * 11 * s, py1 - Math.cos(ang) * 11 * s); ctx.restore();
    }
  }

  function drawPalette(ctx, W, H, api) {
    var y0 = H - PAL_H, w = W / PAL.length, del = drag && drag.kind === 'move' && drag.moved && drag.p && drag.p.y > y0;
    ctx.save();
    ctx.fillStyle = del ? '#6b2620' : '#1f2a33'; ctx.fillRect(0, y0, W, PAL_H);
    if (del) { R.txt(ctx, 'Өшіру үшін осында жібер', W / 2, y0 + PAL_H / 2, { size: 14, color: '#fff', weight: '700' }); ctx.restore(); return; }
    PAL.forEach(function (t, i) {
      var cx = w * (i + 0.5), cy = y0 + 28;
      ctx.fillStyle = 'rgba(255,255,255,.06)'; R.rr(ctx, cx - w / 2 + 3, y0 + 4, w - 6, PAL_H - 8, 8); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.scale(0.62, 0.62); ctx.translate(-cx, -cy);
      var fake = { id: -1, t: t, c: [cx / G - 0.5, (cy - OY) / G - 0.5], r: 0, v: defVal(t), on: true };
      if (api.P.sym) { symbol(ctx, t, cx - G, cy, cx + G, cy, { s: 1.4, color: '#e8eef2', on: true }); }
      else drawReal(ctx, fake, null, false);
      ctx.restore();
      // жазу ұяшыққа сыймаса, қаріп кішірейеді
      var lbl = window.tr ? window.tr(TYPES[t].name) : TYPES[t].name, fsz = 10.5;
      ctx.font = '600 ' + fsz + 'px "IBM Plex Sans", system-ui, sans-serif';
      while (fsz > 7 && ctx.measureText(lbl).width > w - 8) { fsz -= 0.5; ctx.font = '600 ' + fsz + 'px "IBM Plex Sans", system-ui, sans-serif'; }
      R.txt(ctx, lbl, cx, y0 + PAL_H - 12, { size: fsz, color: '#dfe7ec', weight: '600' });
    });
    ctx.restore();
  }

  // ---------- басқару тақтасы (DOM) ----------
  var selBox, taskBox, hintEl, api0;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderSel() {
    if (!selBox) return;
    var e = sel && sel.e && els.indexOf(sel.e) >= 0 ? sel.e : null, w = sel && sel.w && wires.indexOf(sel.w) >= 0 ? sel.w : null;
    if (!e && !w) {
      selBox.innerHTML = '<p class="muted small">Элементті тақтаға төменгі панельден сүйреп әкел. Сым салу үшін бір қысқыштан екіншісіне саусақпен (тінтуірмен) сыз. Элементті түртсең, оның баптаулары осында шығады.</p>';
      return;
    }
    if (w) {
      selBox.innerHTML = '<div class="cl-selh"><b>Сым</b></div><div class="cl-btns"><button type="button" class="btn ghost sm" data-act="del">Өшіру</button></div>';
    } else {
      var nm = names()[e.id], h = '<div class="cl-selh"><b>' + esc(nm) + ' — ' + esc(TYPES[e.t].name) + '</b></div>';
      var info = { lamp: 'Номинал: 6 В, 0,5 А (R = 12 Ом). 9,5 В-тан жоғары кернеуде күйіп кетеді.', ammeter: 'Ішкі кедергісі өте аз (0,05 Ом). Тізбектей қосылады.', voltmeter: 'Ішкі кедергісі өте үлкен (1 МОм). Параллель қосылады.', fuse: 'Ток 2 А-ден асса, балқып үзіледі.', switch: 'Түртсең, тұйықталады немесе ажырайды.', rheostat: 'Жүгіргіні тақтада сүйре немесе төмендегі сырғытпаны жылжыт. Кедергісі 0–30 Ом.', battery: 'Ішкі кедергісі 0,3 Ом. «+» қысқышы қызыл.' }[e.t];
      if (info) h += '<p class="muted small">' + esc(info) + '</p>';
      if (e.t === 'battery') h += rng('ЭҚК', 1.5, 12, 0.5, e.v, 'В');
      if (e.t === 'resistor') h += rng('Кедергі R', 1, 100, 1, e.v, 'Ом');
      if (e.t === 'rheostat') h += rng('Реостаттың кедергісі', 0, 1, 0.02, e.v, '%');
      h += '<div class="cl-btns">' + (e.t === 'switch' ? '<button type="button" class="btn sm" data-act="toggle">' + (e.on ? 'Ажырату' : 'Тұйықтау') + '</button>' : '') +
        '<button type="button" class="btn ghost sm" data-act="rot">Бұру</button><button type="button" class="btn ghost sm" data-act="del">Өшіру</button></div>';
      selBox.innerHTML = h;
      var inp = selBox.querySelector('input[type=range]');
      if (inp) {
        var out = selBox.querySelector('.ctl-h b');
        var show = function () { out.textContent = e.t === 'rheostat' ? Sim.fmt(Math.max(0.5, e.v * RHEO_MAX), 1) + ' Ом' : Sim.fmt(e.v, e.t === 'battery' ? 1 : 0) + ' ' + (e.t === 'battery' ? 'В' : 'Ом'); };
        show();
        inp.addEventListener('input', function () { e.v = parseFloat(inp.value); show(); changed(); });
      }
    }
    selBox.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        if (act === 'del') { if (e) els.splice(els.indexOf(e), 1); if (w) wires.splice(wires.indexOf(w), 1); sel = null; }
        if (act === 'rot' && e) { rotate(e); splitAll(); }
        if (act === 'toggle' && e) e.on = !e.on;
        changed(); renderSel();
      });
    });
  }
  function rng(label, mn, mx, st, v, unit) {
    return '<label class="ctl ctl-range"><span class="ctl-h"><span>' + esc(label) + '</span><b class="mono"></b></span><input type="range" min="' + mn + '" max="' + mx + '" step="' + st + '" value="' + v + '"></label>';
  }
  function rotate(e) {
    var r0 = e.r, step = TYPES[e.t].polar ? 1 : 1;
    for (var k = 1; k <= 4; k++) { e.r = (r0 + k * step) % 4; if (!TYPES[e.t].polar && e.r >= 2) e.r -= 2; if (fits(e)) return; }
    e.r = r0;
  }
  function renderTasks() {
    if (!taskBox) return;
    var n = TASKS.filter(function (t, i) { return done[i]; }).length;
    taskBox.innerHTML = '<div class="block-h"><h2>Тапсырмалар</h2><span class="cnt">' + n + ' / ' + TASKS.length + '</span></div>' +
      '<ol class="cl-tasks">' + TASKS.map(function (t, i) {
        return '<li class="' + (done[i] ? 'done ' : '') + (i === cur ? 'cur' : '') + '"><button type="button" data-t="' + i + '"><span class="cl-chk">' + (done[i] ? '✓' : i + 1) + '</span><span>' + esc(t.t) + '</span></button>' +
          (i === cur ? '<div class="cl-goal"><p>' + esc(t.goal) + '</p><canvas class="cl-sch" data-sch="' + i + '"></canvas><p class="muted small">Сайт тізбекті өзі тексереді: тапсырма орындалса, белгі қойылады.</p></div>' : '') + '</li>';
      }).join('') + '</ol>';
    taskBox.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { cur = +b.getAttribute('data-t'); mem[cur] = {}; save(); renderTasks(); }); });
    var c = taskBox.querySelector('canvas.cl-sch');
    if (c) drawSchematic(c, TASKS[cur].sch);
    if (hintEl) hintEl.textContent = (cur + 1) + '-тапсырма. ' + TASKS[cur].goal;
  }
  function drawSchematic(c, sch) {
    var maxX = 0, maxY = 0; sch.forEach(function (s) { maxX = Math.max(maxX, s[1], s[3]); maxY = Math.max(maxY, s[2], s[4]); });
    var w = Math.min(320, c.parentElement.clientWidth || 260), u = Math.min(46, (w - 40) / maxX), h = Math.round(u * maxY + 40), dpr = window.devicePixelRatio || 1;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    var ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var dark = R.isDark && R.isDark();
    ctx.fillStyle = dark ? '#1b2329' : '#fbfaf6'; ctx.fillRect(0, 0, w, h);
    var ox = (w - u * maxX) / 2, oy = 20;
    sch.forEach(function (s) { symbol(ctx, s[0], ox + s[1] * u, oy + s[2] * u, ox + s[3] * u, oy + s[4] * u, { s: Math.min(1.2, u / 40), color: dark ? '#e8eef2' : '#1b2329', plus: true, on: false }); });
    // түйіндер
    var pts = {};
    sch.forEach(function (s) { if (s[0] === 'w') { pts[s[1] + ',' + s[2]] = (pts[s[1] + ',' + s[2]] || 0) + 1; pts[s[3] + ',' + s[4]] = (pts[s[3] + ',' + s[4]] || 0) + 1; } });
    sch.forEach(function (s) { if (s[0] !== 'w' && s[0] !== 'wd') [[s[1], s[2]], [s[3], s[4]]].forEach(function (p) { pts[p[0] + ',' + p[1]] = (pts[p[0] + ',' + p[1]] || 0) + 1; }); });
    ctx.fillStyle = dark ? '#e8eef2' : '#1b2329';
    Object.keys(pts).forEach(function (k) { if (pts[k] >= 3) { var p = k.split(','); ctx.beginPath(); ctx.arc(ox + p[0] * u, oy + p[1] * u, 3, 0, 7); ctx.fill(); } });
  }

  function changed() { solve(); checkTasks(); save(); if (api0) api0.draw(); }
  function checkTasks() {
    if (!sol) return;
    TASKS.forEach(function (t, i) {
      if (done[i]) return;
      if (t.check(mem[i])) {
        done[i] = true;
        note('Жарайсың! «' + t.t + '» тапсырмасы орындалды.');
        if (i === cur) { var nx = TASKS.findIndex(function (x, j) { return !done[j]; }); if (nx >= 0) { cur = nx; mem[cur] = mem[cur] || {}; } }
        save(); renderTasks();
      }
    });
  }

  // ---------- нұсқағыш ----------
  function hitElement(p, rad) {
    for (var i = els.length - 1; i >= 0; i--) {
      var e = els[i], en = ends(e), a = px(en[0]), b = px(en[1]), c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (Math.hypot(p.x - a.x, p.y - a.y) < rad || Math.hypot(p.x - b.x, p.y - b.y) < rad) continue; // қысқыш — сым үшін
      if (Math.abs(p.x - c.x) < (e.r % 2 ? G * 0.55 : G * 0.75) && Math.abs(p.y - c.y) < (e.r % 2 ? G * 0.75 : G * 0.6)) return e;
    }
    return null;
  }
  function hitWire(p) {
    for (var i = wires.length - 1; i >= 0; i--) {
      var w = wires[i], a = px(w.a), b = px(w.b), dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
      var t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
      var L = Math.sqrt(L2); if (Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) < 8 && t * L > 9 && (1 - t) * L > 9) return w;
    }
    return null;
  }

  var url = new URLSearchParams(location.search);
  load();
  if (url.has('task')) { var tq = parseInt(url.get('task'), 10) - 1; if (TASKS[tq]) cur = tq; }

  api0 = Sim.create({
    aspect: 0.66, aspectNarrow: 0.95, grid: false, autoplay: true, keepRunning: true, minW: 470,
    hint: TASKS[cur].goal,
    controls: [
      { type: 'check', key: 'sym', label: 'Шартты белгілермен (схема түрінде) көрсету', value: false, live: true },
    ],
    buttons: [
      { label: 'Тақтаны тазалау', onClick: function () { if (!els.length && !wires.length) return; if (!confirm('Тақтадағы барлық элементті өшіру керек пе?')) return; els = []; wires = []; sel = null; mem = TASKS.map(function () { return {}; }); changed(); renderSel(); } },
      { label: 'Тапсырмаларды басынан бастау', onClick: function () { if (!confirm('Тапсырмалардың барлық белгісін өшіру керек пе?')) return; done = {}; cur = 0; mem = TASKS.map(function () { return {}; }); save(); renderTasks(); } },
    ],
    readouts: [
      { key: 'sel', label: 'Таңдалған элемент', text: true },
      { key: 'U', label: 'Оның кернеуі U', unit: 'В', digits: 2 },
      { key: 'I', label: 'Ондағы ток күші I', unit: 'А', digits: 3 },
      { key: 'P', label: 'Қуаты P', unit: 'Вт', digits: 2 },
      { key: 'A1', label: 'A1 амперметрдің көрсетуі', unit: 'А', digits: 3 },
      { key: 'V1', label: 'V1 вольтметрдің көрсетуі', unit: 'В', digits: 2 },
    ],
    onResize: function (api) {
      cols = Math.max(6, Math.floor(api.W / G)); rows = Math.max(4, Math.floor((api.H - PAL_H - OY) / G));
      // тар экранға ауысқанда тақтадан шығып кеткен элементтерді ішке қарай жылжытамыз
      els.forEach(function (e) { var d = DIRS[e.r]; e.c[0] = Math.max(Math.abs(d[0]), Math.min(cols - 1 - Math.abs(d[0]), e.c[0])); e.c[1] = Math.max(Math.abs(d[1]), Math.min(rows - 1 - Math.abs(d[1]), e.c[1])); });
      wires.forEach(function (w) { [w.a, w.b].forEach(function (n) { n[0] = Math.min(cols - 1, n[0]); n[1] = Math.min(rows - 1, n[1]); }); });
      solve();
    },
    init: function (api) { api.S.t = 0; els.forEach(function (e) { e.ph = 0; }); },
    onLive: function () {},
    step: function (api, dt) {
      api.S.t += dt;
      if (!sol) solve();
      els.concat(wires).forEach(function (x) {
        var r = sol.byId[x.id]; if (!r) return;
        var I = r.I, sp = Math.abs(I) < 0.002 ? 0 : (25 + Math.min(1, Math.abs(I) / 2) * 110) * Math.sign(I);
        x.ph = (x.ph || 0) + sp * dt;
      });
    },
    draw: function (api, ctx, W, H) {
      if (!sol) solve();
      var sym = api.P.sym, bh = H - PAL_H, nm = names();
      if (sym) { ctx.fillStyle = R.isDark && R.isDark() ? '#17202a' : '#fbfaf6'; ctx.fillRect(0, 0, W, bh); }
      else R.tableTop(ctx, 0, 0, W, bh, '#a87a4c');
      // тор түйіндері
      ctx.fillStyle = sym ? 'rgba(120,130,140,.35)' : 'rgba(255,240,210,.28)';
      for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) { ctx.beginPath(); ctx.arc(G * (i + 0.5), OY + G * (j + 0.5), 1.6, 0, 7); ctx.fill(); }
      // сымдар
      wires.forEach(function (w) {
        var a = px(w.a), b = px(w.b), r = sol.byId[w.id] || { I: 0 }, hot = Math.abs(r.I) > 4, isSel = sel && sel.w === w;
        if (sym) { symbol(ctx, 'w', a.x, a.y, b.x, b.y, { color: hot ? '#d2382b' : isSel ? '#1f5fd1' : '#1b2329' }); }
        else {
          if (isSel) R.wire(ctx, [[a.x, a.y], [b.x, b.y]], { color: '#5aa0ff', w: 9 });
          R.wire(ctx, [[a.x, a.y], [b.x, b.y]], { color: hot ? '#ff7a1a' : '#c0392b', w: 4, phase: x(w), current: Math.abs(r.I) > 0.002 });
        }
      });
      function x(w) { return w.ph || 0; }
      // элементтер
      els.forEach(function (e) {
        var isSel = sel && sel.e === e;
        if (isSel) { var en = ends(e), a = px(en[0]), b = px(en[1]); ctx.save(); ctx.fillStyle = 'rgba(90,160,255,.22)'; ctx.strokeStyle = 'rgba(90,160,255,.9)'; ctx.lineWidth = 2; R.rr(ctx, Math.min(a.x, b.x) - 16, Math.min(a.y, b.y) - 30, Math.abs(b.x - a.x) + 32, Math.abs(b.y - a.y) + 52, 10); ctx.fill(); ctx.stroke(); ctx.restore(); }
        if (sym) {
          var en2 = ends(e), a2 = px(en2[0]), b2 = px(en2[1]), r2 = sol.byId[e.id];
          symbol(ctx, e.t, a2.x, a2.y, b2.x, b2.y, { s: 1.25, plus: true, on: e.on, color: (e.t === 'lamp' && lit(e)) ? '#c98a00' : e.broken ? '#b4342a' : '#1b2329' });
          var cx = (a2.x + b2.x) / 2, cy = (a2.y + b2.y) / 2, vert = e.r % 2 === 1;
          var lbl = nm[e.id] + (e.t === 'ammeter' ? ' = ' + Sim.fmt(r2.I, 2) + ' А' : e.t === 'voltmeter' ? ' = ' + Sim.fmt(r2.Uab, 2) + ' В' : e.t === 'battery' ? ' = ' + Sim.fmt(e.v, 1) + ' В' : '');
          R.tag(ctx, lbl, cx + (vert ? -30 : 0), cy + (vert ? 0 : -24), { size: 10.5, color: '#1b2329' });
        } else drawReal(ctx, e, nm[e.id], false);
      });
      // таңдалған элементтің жанындағы батырмалар: бұру және өшіру
      selBtns = [];
      var se = sel && sel.e && els.indexOf(sel.e) >= 0 ? sel.e : null, sw = sel && sel.w && wires.indexOf(sel.w) >= 0 ? sel.w : null;
      if ((se || sw) && !drag) {
        var bx, by;
        if (se) { var e3 = ends(se), q1 = px(e3[0]), q2 = px(e3[1]); bx = Math.max(q1.x, q2.x) + 30; by = Math.min(q1.y, q2.y) - 22; }
        else { var w1 = px(sw.a), w2 = px(sw.b); bx = (w1.x + w2.x) / 2 + 22; by = (w1.y + w2.y) / 2 - 22; }
        var acts = se ? ['rot', 'del'] : ['del'];
        if (bx + 30 * acts.length > W - 6) bx = W - 6 - 30 * acts.length;
        by = Math.max(18, Math.min(bh - 18, by));
        acts.forEach(function (a, k) {
          var x0 = bx + k * 32;
          ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 4;
          ctx.fillStyle = a === 'del' ? '#c0392b' : '#1f5fd1'; ctx.beginPath(); ctx.arc(x0, by, 13, 0, 7); ctx.fill(); ctx.restore();
          ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath();
          if (a === 'del') { ctx.moveTo(x0 - 5, by - 5); ctx.lineTo(x0 + 5, by + 5); ctx.moveTo(x0 + 5, by - 5); ctx.lineTo(x0 - 5, by + 5); ctx.stroke(); }
          else { ctx.arc(x0, by, 6, -2.6, 1.9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 - 5, by - 8); ctx.lineTo(x0 - 5.5, by - 3); ctx.lineTo(x0 - 0.5, by - 3.6); ctx.stroke(); }
          ctx.restore();
          selBtns.push({ x: x0, y: by, act: a });
        });
      }
      // сүйреу кезіндегі «елес»
      if (drag && (drag.kind === 'new' || drag.kind === 'move') && drag.e && drag.p && drag.p.y < bh) {
        var ok = fits(drag.e, drag.kind === 'move' ? drag.e : null);
        ctx.save(); if (!ok) { ctx.globalAlpha = 0.45; }
        if (drag.kind === 'new') { if (sym) { var g1 = ends(drag.e), ga = px(g1[0]), gb = px(g1[1]); symbol(ctx, drag.e.t, ga.x, ga.y, gb.x, gb.y, { s: 1.25, plus: true, on: true }); } else drawReal(ctx, drag.e, null, true); }
        if (!ok) { var gc = px(drag.e.c); R.tag(ctx, 'Мұнда сыймайды', gc.x, gc.y - 34, { size: 10.5, color: '#b4342a' }); }
        ctx.restore();
      }
      if (drag && drag.kind === 'wire' && drag.n2) {
        var p1 = px(drag.n1), p2 = px(drag.n2);
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.restore();
        R.sphere(ctx, p2.x, p2.y, 6, '#ffd34d');
      }
      renderAlerts();
      if (!els.length && !wires.length) {
        R.tag(ctx, 'Төмендегі панельден элементті тақтаға сүйреп әкел', W / 2, bh / 2 - 14, { size: 13, color: '#1b2329' });
        R.tag(ctx, 'Сым: бір қысқыштан екіншісіне сыз', W / 2, bh / 2 + 16, { size: 12, color: '#1b2329' });
      }
      drawPalette(ctx, W, H, api);
    },
    pointer: {
      down: function (api, p, e) {
        var rad = api.touch ? 22 : 14, bh = api.H - PAL_H;
        var btn = selBtns.filter(function (b) { return Math.hypot(p.x - b.x, p.y - b.y) < (api.touch ? 20 : 15); })[0];
        if (btn) {
          var se = sel && sel.e, sw = sel && sel.w;
          if (btn.act === 'rot' && se) { rotate(se); splitAll(); }
          if (btn.act === 'del') { if (se) els.splice(els.indexOf(se), 1); if (sw) wires.splice(wires.indexOf(sw), 1); sel = null; }
          drag = null; changed(); renderSel(); return;
        }
        drag = { start: p, p: p, moved: false };
        if (p.y >= bh) { // палитра
          var t = PAL[Math.max(0, Math.min(PAL.length - 1, Math.floor(p.x / (api.W / PAL.length))))];
          drag.kind = 'new'; drag.e = { id: nextId++, t: t, c: nearNode({ x: p.x, y: Math.min(p.y, bh - G) }), r: 0, v: defVal(t), on: false };
          drag.p = { x: p.x, y: bh - G };
          return;
        }
        // реостаттың жүгіргісі
        var rh = els.filter(function (x) { return x.t === 'rheostat' && Math.hypot(p.x - rheoKnob(x).x, p.y - rheoKnob(x).y) < rad; })[0];
        if (rh) { drag.kind = 'rheo'; drag.e = rh; sel = { e: rh }; renderSel(); return; }
        var el = hitElement(p, rad);
        if (el) { drag.kind = 'move'; drag.e = el; drag.c0 = el.c.slice(); drag.off = { x: px(el.c).x - p.x, y: px(el.c).y - p.y }; return; }
        var w = hitWire(p), nn = nearNode(p);
        if (w) { drag.kind = 'wiresel'; drag.w = w; drag.n1 = Math.hypot(px(nn).x - p.x, px(nn).y - p.y) < rad ? nn : null; return; }
        drag.kind = 'wire'; drag.n1 = nearNode(p); drag.n2 = null;
      },
      move: function (api, p, down) {
        if (!drag || !down) return;
        drag.p = p;
        if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 6) drag.moved = true;
        if (drag.kind === 'new') { drag.e.c = nearNode({ x: p.x, y: Math.min(p.y, api.H - PAL_H - G) }); }
        if (drag.kind === 'move' && drag.moved) { drag.e.c = nearNode({ x: p.x + drag.off.x, y: Math.min(p.y + drag.off.y, api.H - PAL_H - G / 2) }); solve(); }
        if (drag.kind === 'wiresel' && drag.moved && drag.n1) { drag.kind = 'wire'; drag.n2 = null; }
        if (drag.kind === 'wire') { var n2 = nearNode(p); drag.n2 = Math.hypot(px(n2).x - p.x, px(n2).y - p.y) < G * 0.55 ? n2 : null; }
        if (drag.kind === 'rheo') {
          var e = drag.e, en = ends(e), a = px(en[0]), b = px(en[1]), L = Math.hypot(b.x - a.x, b.y - a.y);
          var t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (L * L); // 0…1 бойымен
          e.v = Math.max(0, Math.min(1, (t - 0.15) / 0.7)); changed(); renderSel();
        }
      },
      up: function (api, p) {
        if (!drag) return;
        var d = drag, bh = api.H - PAL_H; drag = null;
        if (d.kind === 'new') {
          if (p.y < bh && fits(d.e)) { els.push(d.e); sel = { e: d.e }; splitAll(); }
          else if (p.y < bh) note('Элемент басқа элементтің үстіне түсті — бос жерге қой.');
          else if (!d.moved) {
            // Түрту: элемент тақтаның ортасына жақын бос орынға өзі қойылады
            var spot = freeSpot(d.e);
            if (spot) { els.push(d.e); sel = { e: d.e }; note('Элемент тақтаға қойылды. Оны сүйреп, керек жерге апар.'); }
            else note('Тақтада бос орын жоқ.');
          }
        } else if (d.kind === 'move') {
          if (!d.moved) {
            if (d.e.t === 'switch') d.e.on = !d.e.on;
            else if (d.e.broken) { d.e.broken = false; d.e.blew = false; note(d.e.t === 'lamp' ? 'Жаңа шам қойылды.' : 'Жаңа сақтандырғыш қойылды.'); }
            sel = { e: d.e };
          } else if (p.y >= bh) { els.splice(els.indexOf(d.e), 1); sel = null; }
          else if (!fits(d.e, d.e)) { d.e.c = d.c0; note('Ол жерде басқа элемент тұр.'); }
          else splitAll();
        } else if (d.kind === 'wiresel') { sel = { w: d.w }; }
        else if (d.kind === 'wire') {
          if (d.n2 && key(d.n1) !== key(d.n2)) {
            var dup = wires.some(function (w) { return (key(w.a) === key(d.n1) && key(w.b) === key(d.n2)) || (key(w.a) === key(d.n2) && key(w.b) === key(d.n1)); });
            if (!dup) { wires.push({ id: nextId++, a: d.n1, b: d.n2 }); }
            splitAll();
          } else sel = null;
        }
        changed(); renderSel();
      },
      leave: function () {},
    },
    read: function () {
      var out = { sel: '—', U: null, I: null, P: null, A1: null, V1: null }, nm = names();
      if (!sol) return out;
      var e = sel && sel.e && els.indexOf(sel.e) >= 0 ? sel.e : null;
      if (e) { var r = sol.byId[e.id]; out.sel = nm[e.id] + ' — ' + TYPES[e.t].name; out.U = r.U; out.I = Math.abs(r.I); out.P = r.P; }
      else if (sel && sel.w && sol.byId[sel.w.id]) { out.sel = 'Сым'; out.U = sol.byId[sel.w.id].U; out.I = Math.abs(sol.byId[sel.w.id].I); out.P = sol.byId[sel.w.id].P; }
      var A = els.filter(function (x) { return x.t === 'ammeter'; }).sort(function (a, b) { return a.id - b.id; })[0];
      var V = els.filter(function (x) { return x.t === 'voltmeter'; }).sort(function (a, b) { return a.id - b.id; })[0];
      if (A) out.A1 = sol.byId[A.id].I;
      if (V) out.V1 = sol.byId[V.id].Uab;
      return out;
    },
  });

  // Ескертулер тақтаның үстінде (DOM-да) көрсетіледі — элементтерді жаппайды
  var alertBox = null, lastAlerts = '';
  function renderAlerts() {
    if (!alertBox) return;
    var list = alerts.map(function (a) { return ['bad', a]; });
    if (flash && performance.now() - flash.t < 5000) list.push(['good', flash.s]);
    var sig = JSON.stringify(list);
    if (sig === lastAlerts) return;
    lastAlerts = sig;
    alertBox.innerHTML = list.map(function (x) { return '<p class="cl-alert ' + x[0] + '">' + esc(x[1]) + '</p>'; }).join('');
  }

  // Бүйір панельге: таңдалған элемент және тапсырмалар
  var controls = document.getElementById('simControls'), side = document.querySelector('.simside');
  selBox = document.createElement('div'); selBox.className = 'cl-sel';
  controls.insertBefore(selBox, controls.firstChild);
  taskBox = document.createElement('section'); taskBox.className = 'cl-taskbox';
  side.insertBefore(taskBox, side.firstChild);
  side.insertBefore(selBox, side.firstChild);
  hintEl = document.querySelector('#simHint span');
  alertBox = document.createElement('div'); alertBox.className = 'cl-alerts'; alertBox.setAttribute('aria-live', 'polite');
  var cv = document.querySelector('.simcanvas'); cv.parentElement.insertBefore(alertBox, cv.nextSibling); // канвастың астында — сүйреп жатқанда тақта жылжымайды
  renderSel(); renderTasks(); changed();
  // Тапсырманың схемасы тақырыпқа сай қайта салынады
  document.addEventListener('themechange', renderTasks);
  // Ағымдағы хабар біртіндеп жоғалуы үшін — симуляция тоқтап тұрса да анда-санда қайта салу
  setInterval(renderAlerts, 500);
})();

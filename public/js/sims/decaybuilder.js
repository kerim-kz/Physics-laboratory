/* 9-сынып: ыдырау теңдеуін өзің құр. Оқушы аналық ядроның ыдырау түріне қарап, туынды ядроның массалық (A)
   және зарядтық (Z) санын, элемент таңбасын, ал «қиын» деңгейде шығатын бөлшектің A мен Z-ін өзі жазады.
   Сайт массалық және зарядтық санның сақталуын, элементтің дұрыстығын тексеріп, қатені нақты түсіндіреді.
   «U-238 тізбегі» режимінде әр дұрыс жауаптан кейін туынды ядро келесі есептің аналық ядросы болады (14 қадам, Pb-206-ға дейін). */
(function () {
  'use strict';
  var R = window.Real, Nuc = window.Nuc;
  var Y = 365.25 * 86400, D = 86400, H = 3600, M = 60;
  // [Z, A, ыдырау түрі, T½ (с), изомер белгісі]
  var CHAIN = [[92, 238, 'a', 4.468e9 * Y], [90, 234, 'b-', 24.1 * D], [91, 234, 'b-', 1.17 * M], [92, 234, 'a', 2.455e5 * Y], [90, 230, 'a', 7.54e4 * Y], [88, 226, 'a', 1600 * Y], [86, 222, 'a', 3.82 * D],
    [84, 218, 'a', 3.10 * M], [82, 214, 'b-', 26.8 * M], [83, 214, 'b-', 19.9 * M], [84, 214, 'a', 164e-6], [82, 210, 'b-', 22.2 * Y], [83, 210, 'b-', 5.01 * D], [84, 210, 'a', 138.4 * D]];
  var SINGLE = [[6, 14, 'b-', 5730 * Y], [88, 226, 'a', 1600 * Y], [19, 40, 'b-', 1.25e9 * Y], [92, 238, 'a', 4.468e9 * Y], [27, 60, 'b-', 5.27 * Y], [86, 222, 'a', 3.82 * D], [53, 131, 'b-', 8.02 * D],
    [84, 210, 'a', 138.4 * D], [55, 137, 'b-', 30.1 * Y], [95, 241, 'a', 432.2 * Y], [38, 90, 'b-', 28.8 * Y], [1, 3, 'b-', 12.32 * Y], [94, 239, 'a', 24110 * Y], [11, 22, 'b+', 2.6 * Y],
    [9, 18, 'b+', 109.8 * M], [43, 99, 'g', 6.01 * H, 'm'], [90, 234, 'b-', 24.1 * D], [56, 137, 'g', 2.55 * M, 'm'], [6, 11, 'b+', 20.36 * M], [83, 210, 'b-', 5.01 * D]];
  var PART = { a: { A: 4, Z: 2, s: 'He', n: 'α-бөлшек (гелий ядросы)' }, 'b-': { A: 0, Z: -1, s: 'e', n: 'электрон (β⁻-бөлшек)' }, 'b+': { A: 0, Z: 1, s: 'e', n: 'позитрон (β⁺-бөлшек)' }, g: { A: 0, Z: 0, s: 'γ', n: 'γ-квант' } };
  var TYPE = { a: 'α-ыдырауға', 'b-': 'β⁻-ыдырауға', 'b+': 'β⁺-ыдырауға (позитрон шығарады)', g: 'γ-сәуле шығаруға (қозған күйден негізгі күйге өтеді)' };

  var mode = 'single', hard = false, prob = null, idx = 0, chainStep = 0, solved = false, anim = null, tries = 0;
  var stats = { ok: 0, bad: 0, a: 0, b: 0, g: 0, chain: false };
  try { var sv = JSON.parse(localStorage.getItem('decaybuild.v1') || 'null'); if (sv) stats = Object.assign(stats, sv); } catch (e) { /* жоқ */ }
  function save() { try { localStorage.setItem('decaybuild.v1', JSON.stringify(stats)); } catch (e) { /* жеке режим */ } }
  var order = SINGLE.map(function (x, i) { return i; });

  function nucName(Z, A, m) { return Nuc.name(Z) + '-' + A + (m ? 'm' : ''); }
  function supsub(A, Z, s, m) { return '<span class="nuc"><span class="nuc-az"><sup>' + A + (m ? 'm' : '') + '</sup><sub>' + (s === 'e' && Z > 0 ? '+' + Z : Z < 0 ? '−' + (-Z) : Z) + '</sub></span><b>' + s + '</b></span>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function daughter(p) { var d = PART[p[2]]; return { Z: p[0] - d.Z, A: p[1] - d.A }; }

  // ---------- DOM: теңдеу панелі ----------
  var box = document.createElement('section'); box.className = 'db';
  var cv = document.querySelector('.simcanvas'); cv.parentElement.insertBefore(box, cv.nextSibling);
  function newProblem() {
    solved = false; anim = null; tries = 0;
    if (mode === 'chain') prob = CHAIN[chainStep];
    else prob = SINGLE[order[idx % order.length]];
    render();
  }
  function render() {
    var p = prob, d = PART[p[2]], s = Nuc.sym(p[0]);
    var q = mode === 'chain'
      ? '<b>U-238 тізбегі, ' + (chainStep + 1) + ' / ' + CHAIN.length + ' қадам.</b> ' + esc(nucName(p[0], p[1])) + ' ядросы ' + esc(TYPE[p[2]]) + ' ұшырайды. <span class="muted">(T½ = ' + esc(Nuc.fmtT(p[3])) + ')</span> <b>Туынды ядроны тап.</b>'
      : esc(nucName(p[0], p[1], p[4])) + ' ядросы ' + esc(TYPE[p[2]]) + ' ұшырайды. <span class="muted">(T½ = ' + esc(Nuc.fmtT(p[3])) + ')</span> <b>Туынды ядроны тап.</b>';
    var partHtml = hard
      ? '<span class="nuc in part"><span class="nuc-az"><input class="pA" inputmode="numeric" aria-label="бөлшектің массалық саны" placeholder="A"><input class="pZ" inputmode="numeric" aria-label="бөлшектің зарядтық саны" placeholder="Z"></span><b>' + esc(d.s) + '</b></span>'
      : supsub(d.A, d.Z, d.s);
    box.innerHTML =
      '<p class="db-q">' + q + '</p>' +
      '<div class="db-eq">' + supsub(p[1], p[0], s, p[4]) + '<span class="db-op">→</span>' +
      '<span class="nuc in"><span class="nuc-az"><input class="dA" inputmode="numeric" aria-label="туынды ядроның массалық саны" placeholder="A"><input class="dZ" inputmode="numeric" aria-label="туынды ядроның зарядтық саны" placeholder="Z"></span><input class="dS" aria-label="элемент таңбасы" placeholder="X" maxlength="3" autocapitalize="off" autocomplete="off" spellcheck="false"></span>' +
      '<span class="db-op">+</span>' + partHtml + '</div>' +
      '<div class="db-acts"><button type="button" class="btn" data-a="check">Тексеру</button><button type="button" class="btn ghost" data-a="hint">Кеңес</button>' +
      '<button type="button" class="btn ghost" data-a="next" hidden>' + (mode === 'chain' ? 'Келесі ыдырау' : 'Келесі есеп') + '</button></div>' +
      '<div class="db-fb" aria-live="polite"></div>';
    box.querySelector('[data-a=check]').addEventListener('click', check);
    box.querySelector('[data-a=hint]').addEventListener('click', hint);
    box.querySelector('[data-a=next]').addEventListener('click', next);
    box.querySelectorAll('input').forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); }); });
    renderTasks();
  }
  function fb(html, kind) { var f = box.querySelector('.db-fb'); f.className = 'db-fb ' + (kind || ''); f.innerHTML = html; }
  function num(sel) { var el = box.querySelector(sel); if (!el) return null; var v = String(el.value).trim().replace('−', '-').replace('–', '-'); return v === '' || !/^-?\d+$/.test(v) ? NaN : parseInt(v, 10); }
  function neighbours(Z) {
    var out = [];
    for (var z = Math.max(1, Z - 2); z <= Math.min(Nuc.EL.length - 1, Z + 2); z++) out.push('<span class="db-el' + (z === Z ? '' : '') + '"><small>' + z + '</small><b>' + Nuc.sym(z) + '</b><span>' + esc(Nuc.name(z)) + '</span></span>');
    return '<div class="db-els">' + out.join('') + '</div>';
  }
  function hint() {
    var p = prob, d = PART[p[2]];
    var t = p[2] === 'a' ? 'α-ыдырауда ядродан гелий ядросы (A = 4, Z = 2) ұшып шығады: массалық сан 4-ке, зарядтық сан 2-ге кемиді. Элемент Менделеев кестесінде 2 ұяшық солға жылжиды.'
      : p[2] === 'b-' ? 'β⁻-ыдырауда ядродағы нейтрон протонға айналып, электрон (A = 0, Z = −1) ұшып шығады: массалық сан өзгермейді, зарядтық сан 1-ге артады. Элемент 1 ұяшық оңға жылжиды.'
      : p[2] === 'b+' ? 'β⁺-ыдырауда протон нейтронға айналып, позитрон (A = 0, Z = +1) ұшып шығады: массалық сан өзгермейді, зарядтық сан 1-ге кемиді.'
      : 'γ-сәуле шығарғанда ядро тек энергиясын жоғалтады: A мен Z өзгермейді, элемент сол күйінде қалады.';
    fb('<p>' + esc(t) + '</p><p class="muted small">Тексеру: теңдеудің сол жағы мен оң жағындағы массалық сандардың қосындысы тең, зарядтық сандардың қосындысы да тең болуы керек.</p>' + neighbours(p[0] + (p[2] === 'a' ? -2 : p[2] === 'b-' ? 1 : p[2] === 'b+' ? -1 : 0)), 'info');
  }
  function check() {
    if (solved) return;
    var p = prob, d = PART[p[2]], want = daughter(p);
    // Таңбаны кириллицамен жазса да («Ра», «Рb») қабылдаймыз: ұқсас әріптер латынға ауыстырылады
    var LAT = { 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x', 'у': 'y', 'і': 'i', 'І': 'I', 'Ь': 'b', 'ь': 'b' };
    var A = num('.dA'), Z = num('.dZ'), S = String(box.querySelector('.dS').value || '').trim().replace(/./g, function (ch) { return LAT[ch] || ch; });
    var pA = hard ? num('.pA') : d.A, pZ = hard ? num('.pZ') : d.Z;
    var errs = [];
    if (isNaN(A) || isNaN(Z) || A === null || Z === null) errs.push('Туынды ядроның A және Z санын бүтін сан түрінде жаз.');
    if (hard && (isNaN(pA) || isNaN(pZ))) errs.push('Шығатын бөлшектің A және Z санын жаз.');
    if (!errs.length) {
      if (hard && (pA !== d.A || pZ !== d.Z)) errs.push(esc(d.n) + ': A = ' + d.A + ', Z = ' + d.Z + '. Сен A = ' + pA + ', Z = ' + pZ + ' деп жаздың.');
      if (A + d.A !== p[1]) errs.push('Массалық сан сақталмады: ' + p[1] + ' ≠ ' + A + ' + ' + d.A + ' = ' + (A + d.A) + '.');
      if (Z + d.Z !== p[0]) errs.push('Зарядтық сан сақталмады: ' + p[0] + ' ≠ ' + Z + ' + (' + d.Z + ') = ' + (Z + d.Z) + '.');
      if (!errs.length && S.toLowerCase() !== Nuc.sym(Z).toLowerCase()) errs.push('Z = ' + Z + ' — ' + esc(Nuc.name(Z)) + ' (' + Nuc.sym(Z) + '). Сен «' + esc(S || '…') + '» деп жаздың.');
    }
    if (errs.length) {
      tries++; stats.bad++; save();
      fb('<p><b>Әлі дұрыс емес.</b></p><ul>' + errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>' + (tries >= 2 ? '<p class="muted small">«Кеңес» батырмасын басып көр.</p>' : ''), 'bad');
      return;
    }
    solved = true; stats.ok++;
    if (p[2] === 'a') stats.a++; else if (p[2] === 'g') stats.g++; else stats.b++;
    var msg = '<p><b>Дұрыс!</b> ' + supsub(p[1], p[0], Nuc.sym(p[0]), p[4]) + ' → ' + supsub(want.A, want.Z, Nuc.sym(want.Z)) + ' + ' + supsub(d.A, d.Z, d.s) + '</p>' +
      '<p class="muted small">' + esc(nucName(want.Z, want.A)) + ' пайда болды. ' + (p[2] === 'g' ? 'γ-сәуле шығарғанда элемент өзгермейді.' : 'Массалық сан: ' + p[1] + ' = ' + want.A + ' + ' + d.A + '; зарядтық сан: ' + p[0] + ' = ' + want.Z + ' + (' + d.Z + ').') + '</p>';
    if (mode === 'chain' && chainStep === CHAIN.length - 1) { stats.chain = true; msg += '<p><b>Тізбек аяқталды!</b> Қорғасын-206 — тұрақты ядро. Барлығы 8 α-ыдырау және 6 β⁻-ыдырау болды: A 238-ден 206-ға (8 · 4 = 32-ге) кеміді.</p>'; }
    save();
    fb(msg, 'good');
    anim = { t: 0, from: { Z: p[0], A: p[1] }, to: want, m: p[2] };
    if (mode === 'chain') chainPath.push([p[0], p[1], want.Z, want.A, p[2]]);
    var nb = box.querySelector('[data-a=next]'); nb.hidden = mode === 'chain' && chainStep === CHAIN.length - 1; nb.focus();
    box.querySelector('[data-a=check]').hidden = true;
    renderTasks();
  }
  function next() {
    if (mode === 'chain') { chainStep = Math.min(CHAIN.length - 1, chainStep + 1); }
    else idx++;
    newProblem();
  }
  var chainPath = [];

  // ---------- прогресс ----------
  var taskBox;
  var TASKS = [
    { t: '3 α-ыдырау теңдеуін құр', c: function () { return stats.a >= 3; }, p: function () { return Math.min(3, stats.a) + ' / 3'; } },
    { t: '3 β-ыдырау теңдеуін құр', c: function () { return stats.b >= 3; }, p: function () { return Math.min(3, stats.b) + ' / 3'; } },
    { t: 'γ-сәуле шығару теңдеуін құр', c: function () { return stats.g >= 1; }, p: function () { return Math.min(1, stats.g) + ' / 1'; } },
    { t: 'U-238 → Pb-206 тізбегін толық өт', c: function () { return stats.chain; }, p: function () { return mode === 'chain' ? (chainStep + (solved ? 1 : 0)) + ' / ' + CHAIN.length : ''; } },
    { t: '«Қиын» деңгейде 5 теңдеу құр', c: function () { return (stats.hard || 0) >= 5; }, p: function () { return Math.min(5, stats.hard || 0) + ' / 5'; } },
  ];
  function renderTasks() {
    if (!taskBox) return;
    if (solved && hard && !prob.counted) { prob.counted = true; stats.hard = (stats.hard || 0) + 1; save(); }
    var n = TASKS.filter(function (t) { return t.c(); }).length;
    taskBox.innerHTML = '<div class="block-h"><h2>Тапсырмалар</h2><span class="cnt">' + n + ' / ' + TASKS.length + '</span></div><ol class="cl-tasks">' +
      TASKS.map(function (t, i) { var dn = t.c(); return '<li class="' + (dn ? 'done' : '') + '"><button type="button" tabindex="-1"><span class="cl-chk">' + (dn ? '✓' : i + 1) + '</span><span>' + esc(t.t) + ' <span class="muted small">' + esc(t.p()) + '</span></span></button></li>'; }).join('') + '</ol>';
  }

  // ---------- canvas ----------
  function blob(ctx, Z, A, cx, cy, s) {
    // ауыр ядро — нуклондардың «шоғыры»: көрінетін шарлар саны ≤ 60, протон/нейтрон үлесі сақталады
    var n = Math.min(A, 60), r = s * Math.max(0.85, Math.min(1.6, 7 / Math.sqrt(n))) * 6;
    for (var k = n - 1; k >= 0; k--) {
      var rr = r * 1.02 * Math.sqrt(k + 0.5), th = k * 2.39996;
      var isP = Math.floor((k + 1) * Z / A) > Math.floor(k * Z / A);
      R.sphere(ctx, cx + rr * Math.cos(th), cy + rr * Math.sin(th), r, isP ? '#d2382b' : '#8f99a3');
    }
    return r * Math.sqrt(n) * 1.05 + r;
  }
  function notation(ctx, x, y, A, Z, sym, size, color, align) {
    ctx.save();
    var small = Math.round(size * 0.46);
    ctx.font = '700 ' + size + 'px "IBM Plex Sans", system-ui, sans-serif';
    var sw = Math.max(String(A).length, String(Z).length) * small * 0.62, tw = sw + 3 + ctx.measureText(sym).width;
    if (align === 'center') x -= tw / 2;
    ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 ' + small + 'px "IBM Plex Mono", monospace'; ctx.textAlign = 'right';
    ctx.fillText(String(A), x + sw, y - size * 0.52); ctx.fillText(String(Z), x + sw, y + small * 0.15);
    ctx.font = '700 ' + size + 'px "IBM Plex Sans", system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(sym, x + sw + 3, y);
    ctx.restore();
  }

  Sim.create({
    aspect: 0.56, aspectNarrow: 0.72, grid: false, autoplay: true, keepRunning: true, minW: 470,
    hint: 'Ядроның ыдырау түріне қарап, туынды ядроның A, Z санын және таңбасын жаз. Массалық сан мен зарядтық сан сақталуы керек.',
    controls: [
      { type: 'select', key: 'mode', label: 'Режим', value: 'single', live: true, options: [['single', 'Жеке есептер (20 ядро)'], ['chain', 'Уран-238 тізбегі (14 қадам)']] },
      { type: 'check', key: 'hard', label: 'Қиын деңгей: шығатын бөлшектің A мен Z-ін де өзім жазамын', value: false, live: true },
    ],
    buttons: [
      { label: 'Басқа есеп', onClick: function () { if (mode === 'single') { idx++; newProblem(); } } },
      { label: 'Тізбекті басынан бастау', onClick: function () { if (mode === 'chain') { chainStep = 0; chainPath = []; newProblem(); } } },
    ],
    readouts: [
      { key: 'ok', label: 'Дұрыс құрылған теңдеу', digits: 0 },
      { key: 'bad', label: 'Қате әрекет', digits: 0 },
    ],
    onLive: function (api, key) {
      if (key === 'mode') { mode = api.P.mode; chainStep = 0; chainPath = []; newProblem(); }
      if (key === 'hard') { hard = !!api.P.hard; if (!solved) render(); }
    },
    init: function () {},
    step: function (api, dt) { if (anim) anim.t += dt; },
    draw: function (api, ctx, W, H) {
      var dark = R.isDark && R.isDark(), ink = dark ? '#e8eef2' : '#1b2329';
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, dark ? '#0d141b' : '#eef3f7'); g.addColorStop(1, dark ? '#16212b' : '#dde6ee');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (!prob) return;
      var p = prob, cy = H * 0.4, sc = W >= 640 ? 1 : 0.85, px0 = W * 0.18;
      var k = anim ? Math.min(1, anim.t / 1.4) : 0;
      // аналық ядро (ыдырағаннан кейін — туынды)
      var showZ = anim && k > 0.25 ? anim.to.Z : p[0], showA = anim && k > 0.25 ? anim.to.A : p[1];
      var shake = anim && anim.t < 0.3 ? Math.sin(anim.t * 90) * 3 : 0;
      var rad = blob(ctx, showZ, showA, px0 + shake, cy, sc);
      notation(ctx, px0, cy + rad + 34 * sc, showA, showZ, Nuc.sym(showZ), 26 * sc, ink, 'center');
      R.txt(ctx, nucName(showZ, showA, anim && k > 0.25 ? '' : p[4]), px0, cy + rad + 52 * sc, { size: 11.5, color: ink });
      // ұшатын бөлшек
      if (anim && anim.t > 0.25) {
        var t = Math.min(1, (anim.t - 0.25) / 1.0), x = px0 + rad + t * (W * 0.2), y = cy - t * 40 * sc;
        if (anim.m === 'a') { blob(ctx, 2, 4, x, y, 0.8 * sc); R.tag(ctx, 'α  ⁴₂He', x, y - 22, { size: 12, color: '#8a6100' }); }
        else if (anim.m === 'b-') { R.sphere(ctx, x, y, 5, '#1f6fd1'); R.tag(ctx, 'β⁻  ⁰₋₁e', x, y - 16, { size: 12, color: '#1f6fd1' }); }
        else if (anim.m === 'b+') { R.sphere(ctx, x, y, 5, '#d2382b'); R.tag(ctx, 'β⁺  ⁰₊₁e', x, y - 16, { size: 12, color: '#d2382b' }); }
        else {
          ctx.save(); ctx.strokeStyle = '#7a3fd1'; ctx.lineWidth = 2.2; ctx.beginPath();
          for (var q = 0; q <= 60; q++) { var xx = px0 + rad + (x - px0 - rad) * q / 60; ctx.lineTo(xx, y + Math.sin(q * 0.9) * 6); }
          ctx.stroke(); ctx.restore(); R.tag(ctx, 'γ', x, y - 16, { size: 12, color: '#7a3fd1' });
        }
      }
      if (!anim) R.tag(ctx, '?', px0 + rad + 30, cy, { size: 16, color: '#b4342a' });
      // оң жақ: ығысу ережесі немесе тізбек картасы
      var rx = W * 0.5, ry = 14, rw = W * 0.48, rh = H - 30;
      if (mode === 'chain') drawChain(ctx, rx, ry, rw, rh, ink, dark);
      else drawShift(ctx, rx, ry, rw, rh, ink, dark, p);
    },
    read: function () { return { ok: stats.ok, bad: stats.bad }; },
  });

  // Ығысу ережесі (Содди): аналық ядроның айналасындағы N–Z торында үш бағыт
  function drawShift(ctx, x, y, w, h, ink, dark, p) {
    var c = Math.min(w / 8, (h - 50) / 6), x0 = x + (w - 7 * c) / 2 + c, y0 = y + 6;
    var Z0 = p[0], N0 = p[1] - p[0];
    ctx.save();
    ctx.fillStyle = dark ? '#1b2530' : '#fff'; R.rr(ctx, x0 - c - 6, y0 - 4, 7 * c + 12, 6 * c + 22, 10); ctx.fill();
    for (var i = 0; i < 7; i++) for (var j = 0; j < 5; j++) {
      ctx.strokeStyle = dark ? '#2c3a46' : '#e3e8ec'; ctx.strokeRect(x0 - c + i * c, y0 + j * c, c, c);
    }
    // орталық ұяшық: N0 → бағана 3, Z0 → жол 2
    var cell = function (dn, dz) { return { x: x0 - c + (3 + dn + 0.5) * c, y: y0 + (2 - dz + 0.5) * c }; };
    var o = cell(0, 0);
    ctx.fillStyle = '#ffb000'; ctx.fillRect(o.x - c / 2 + 1, o.y - c / 2 + 1, c - 2, c - 2);
    R.txt(ctx, Nuc.sym(Z0), o.x, o.y, { size: Math.min(13, c * 0.4), color: '#1b2329', weight: '700' });
    var solvedNow = solved;
    [['a', -2, -2, '#e0b020', 'α'], ['b-', -1, 1, '#1f6fd1', 'β⁻'], ['b+', 1, -1, '#d2382b', 'β⁺']].forEach(function (r) {
      var t = cell(r[1], r[2]), on = solvedNow && p[2] === r[0];
      ctx.globalAlpha = solvedNow ? (on ? 1 : 0.25) : 0.75;
      R.force(ctx, o.x, o.y, t.x, t.y, r[3], null);
      R.txt(ctx, r[4], t.x + (r[1] < 0 ? -10 : 10), t.y + (r[2] < 0 ? 10 : -10), { size: 12, color: r[3], weight: '700' });
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    R.txt(ctx, 'N (нейтрон саны) →', x0 + 2.5 * c, y0 + 5 * c + 12, { size: 10, color: ink });
    R.txt(ctx, 'Z ↑', x0 - c - 1, y0 - 8, { size: 10, color: ink, align: 'left' });
    R.txt(ctx, 'α: Z − 2, A − 4', x + w / 2, y0 + 6 * c + 28, { size: 10.5, color: ink });
    R.txt(ctx, 'β⁻: Z + 1, A өзгермейді', x + w / 2, y0 + 6 * c + 42, { size: 10.5, color: ink });
  }
  // U-238 тізбегінің N–Z картасы: Z 81…92, N 124…146
  function drawChain(ctx, x, y, w, h, ink, dark) {
    var zmin = 81, zmax = 92, nmin = 123, nmax = 146, c = Math.min((w - 30) / (nmax - nmin + 1), (h - 26) / (zmax - zmin + 1));
    var x0 = x + 26, y0 = y + 4, gw = c * (nmax - nmin + 1), gh = c * (zmax - zmin + 1);
    ctx.save();
    ctx.fillStyle = dark ? '#1b2530' : '#fff'; ctx.fillRect(x0, y0, gw, gh);
    ctx.strokeStyle = dark ? '#2c3a46' : '#eef1f4'; ctx.lineWidth = 0.5;
    for (var n = nmin; n <= nmax; n++) { ctx.beginPath(); ctx.moveTo(x0 + (n - nmin) * c, y0); ctx.lineTo(x0 + (n - nmin) * c, y0 + gh); ctx.stroke(); }
    for (var z = zmin; z <= zmax; z++) { ctx.beginPath(); ctx.moveTo(x0, y0 + (z - zmin) * c); ctx.lineTo(x0 + gw, y0 + (z - zmin) * c); ctx.stroke(); }
    var P = function (Z, A) { return { x: x0 + (A - Z - nmin + 0.5) * c, y: y0 + gh - (Z - zmin + 0.5) * c }; };
    ctx.font = '600 ' + Math.max(8, Math.min(11, c * 0.8)) + 'px "IBM Plex Sans", sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = ink;
    for (var zz = zmin; zz <= zmax; zz++) ctx.fillText(Nuc.sym(zz), x0 - 3, P(zz, zz + nmin).y + 3);
    chainPath.forEach(function (s) { var a = P(s[0], s[1]), b = P(s[2], s[3]); R.force(ctx, a.x, a.y, b.x, b.y, s[4] === 'a' ? '#e0b020' : '#1f6fd1', null); });
    var cur = solved && anim ? daughter(prob) : { Z: prob[0], A: prob[1] }, q = P(cur.Z, cur.A);
    ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2.5; ctx.strokeRect(q.x - c / 2, q.y - c / 2, c, c);
    var pb = P(82, 206); ctx.fillStyle = '#1b2329'; ctx.globalAlpha = 0.85; ctx.fillRect(pb.x - c / 2 + 1, pb.y - c / 2 + 1, c - 2, c - 2); ctx.globalAlpha = 1;
    ctx.restore();
    R.txt(ctx, 'Pb-206 (тұрақты)', pb.x + 4, pb.y + c + 6, { size: 10, color: ink, align: 'left' });
    R.txt(ctx, 'N →', x0 + gw - 12, y0 + gh + 12, { size: 10, color: ink });
    R.txt(ctx, 'сары — α, көк — β⁻', x0 + gw / 2, y0 + gh + 12, { size: 10, color: ink });
  }

  var side = document.querySelector('.simside');
  taskBox = document.createElement('section'); taskBox.className = 'cl-taskbox';
  side.insertBefore(taskBox, side.firstChild);
  // аралас ретпен
  for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
  newProblem();
})();

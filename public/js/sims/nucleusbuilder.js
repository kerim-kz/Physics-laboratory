/* 9-сынып: ядроны өзің жина. Оқушы протон мен нейтронды ядроға сүйреп (немесе батырмамен) қосады;
   сайт элементті, изотопты, тұрақтылықты, ыдырау түрін және жартылай ыдырау периодын көрсетеді.
   Тұрақсыз ядроны «Ыдыра» батырмасымен ыдыратып, тұрақты ядроға дейінгі жолды N–Z картасынан бақылайды. */
(function () {
  'use strict';
  var R = window.Real, Nuc = window.Nuc;
  var ZMAX = 20, NMAX = 28;
  var Z = 0, Nn = 0, drag = null, anim = null, btns = [], cells = null, path = [], chain = 0, visited = {}, decays = {}, flash = null;
  var COL = { s: '#1b2329', 'b-': '#1f6fd1', 'b+': '#d2382b', ec: '#e07a2f', a: '#e0b020', n: '#8b5cc7', p: '#8b5cc7' };
  var PC = '#d2382b', NC = '#8f99a3';

  function cur() { return Nuc.info(Z, Nn); }
  function note(s) { flash = { s: s, t: performance.now() }; }
  function setNuc(z, n, keepPath) {
    Z = Math.max(0, Math.min(ZMAX, z)); Nn = Math.max(0, Math.min(NMAX, n));
    if (!keepPath) { path = []; chain = 0; }
    visited[Z + '-' + (Z + Nn)] = true;
    checkTasks();
  }

  // ---------- тапсырмалар ----------
  var TASKS = [
    { t: 'Гелий-4 ядросын жина', goal: '2 протон мен 2 нейтроннан тұратын ядро — α-бөлшек. Оны жина.', check: function () { return Z === 2 && Nn === 2; } },
    { t: 'Көміртектің екі изотобын жина', goal: 'Алдымен тұрақты көміртек-12-ні, сосын радиоактивті көміртек-14-ті жина. Изотоптар немен ерекшеленеді?', check: function () { return visited['6-12'] && visited['6-14']; } },
    { t: 'β⁻-ыдырауды бақыла', goal: 'Нейтроны артық ядро жасап (мысалы, көміртек-14), «Ыдыра» бас. Ядроның Z және N саны қалай өзгерді?', check: function () { return decays['b-']; } },
    { t: 'β⁺-ыдырауды бақыла', goal: 'Протоны артық ядро жасап (мысалы, көміртек-11), ыдырат. Бұл жолы қай бөлшек түрленді?', check: function () { return decays['b+'] || decays.ec; } },
    { t: 'Тұрақты ядроға жеткенше ыдырат', goal: 'Гелий-8 немесе литий-9 сияқты ядроны жасап, тұрақты ядро шыққанша қайта-қайта ыдырат. N–Z картасындағы жолды қара.', check: function () { return chain >= 2 && cur().mode === 's'; } },
    { t: 'Кальций-40 ядросын жина', goal: 'Z = N болатын ең ауыр тұрақты ядро — кальций-40 (20 протон, 20 нейтрон). Оны жина. Ауыр ядроларда неге нейтрон көп?', check: function () { return Z === 20 && Nn === 20; } },
  ];
  var done = {}, curT = 0, taskBox, hintEl;
  try { var sv = JSON.parse(localStorage.getItem('nucbuild.v1') || 'null'); if (sv) { done = sv.done || {}; curT = sv.cur || 0; } } catch (e) { /* жоқ */ }
  function save() { try { localStorage.setItem('nucbuild.v1', JSON.stringify({ done: done, cur: curT })); } catch (e) { /* жеке режим */ } }
  function checkTasks() {
    TASKS.forEach(function (t, i) {
      if (done[i] || !t.check()) return;
      done[i] = true; note('Жарайсың! «' + t.t + '» орындалды.');
      if (i === curT) { var nx = TASKS.findIndex(function (x, j) { return !done[j]; }); if (nx >= 0) curT = nx; }
      save(); renderTasks();
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderTasks() {
    if (!taskBox) return;
    var n = TASKS.filter(function (t, i) { return done[i]; }).length;
    taskBox.innerHTML = '<div class="block-h"><h2>Тапсырмалар</h2><span class="cnt">' + n + ' / ' + TASKS.length + '</span></div><ol class="cl-tasks">' +
      TASKS.map(function (t, i) { return '<li class="' + (done[i] ? 'done ' : '') + (i === curT ? 'cur' : '') + '"><button type="button" data-t="' + i + '"><span class="cl-chk">' + (done[i] ? '✓' : i + 1) + '</span><span>' + esc(t.t) + '</span></button>' + (i === curT ? '<div class="cl-goal"><p>' + esc(t.goal) + '</p></div>' : '') + '</li>'; }).join('') + '</ol>';
    taskBox.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { curT = +b.getAttribute('data-t'); save(); renderTasks(); }); });
    if (hintEl) hintEl.textContent = (curT + 1) + '-тапсырма. ' + TASKS[curT].goal;
  }

  // ---------- орналасу ----------
  function layout(W, H) {
    if (W / H > 1.45) return { // кең экран: сол жақта ядро, оң жақта карта мен N–Z картасы
      nuc: { x: W * 0.22, y: H * 0.36 }, rN: 7.5,
      card: { x: W * 0.47, y: 12, w: W * 0.5, h: H * 0.42 },
      chart: { x: W * 0.47, y: H * 0.5, w: W * 0.5, h: H * 0.47 },
      pileP: { x: W * 0.08, y: H * 0.8 }, pileN: { x: W * 0.3, y: H * 0.8 },
    };
    return { // тік экран: жоғарыда ядро мен карта, ортасында қойма, төменде N–Z картасы
      nuc: { x: W * 0.25, y: H * 0.25 }, rN: 7.5,
      card: { x: W * 0.5, y: 12, w: W * 0.48, h: H * 0.47 },
      chart: { x: 30, y: H * 0.61, w: W - 50, h: H * 0.37 },
      pileP: { x: W * 0.09, y: H * 0.5 }, pileN: { x: W * 0.33, y: H * 0.5 },
    };
  }
  // Нуклондардың орны: күнбағыс (филлотаксис) өрнегі — ядро шар тәрізді көрінеді
  function nucleons(z, n, cx, cy, r) {
    var A = z + n, pts = [], s = r * 1.02;
    for (var k = 0; k < A; k++) {
      var rr = s * Math.sqrt(k + 0.5) * 1.05, th = k * 2.39996;
      var isP = Math.floor((k + 1) * z / A) > Math.floor(k * z / A);
      pts.push({ x: cx + rr * Math.cos(th), y: cy + rr * Math.sin(th), p: isP, k: k });
    }
    return pts;
  }
  function drawNucleus(ctx, z, n, cx, cy, r, alpha) {
    var pts = nucleons(z, n, cx, cy, r);
    ctx.save(); if (alpha !== undefined) ctx.globalAlpha = alpha;
    for (var i = pts.length - 1; i >= 0; i--) {
      var q = pts[i];
      R.sphere(ctx, q.x, q.y, r, q.p ? PC : NC);
      if (r >= 7) R.txt(ctx, q.p ? '+' : '', q.x, q.y + 0.5, { size: r * 1.1, color: 'rgba(255,255,255,.85)', weight: '700' });
    }
    ctx.restore();
    return pts;
  }
  function notation(ctx, x, y, A, z, sym, size, color) {
    // ^A_Z X белгісі: A жоғарыда, Z төменде, таңбаның сол жағында
    color = color || '#1b2329';
    ctx.save();
    ctx.font = '700 ' + size + 'px "IBM Plex Sans", system-ui, sans-serif';
    ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    var small = Math.round(size * 0.45), sw = Math.max(String(A).length, String(z).length) * small * 0.62;
    ctx.font = '600 ' + small + 'px "IBM Plex Mono", monospace'; ctx.textAlign = 'right';
    ctx.fillText(String(A), x + sw, y - size * 0.52);
    ctx.fillText(String(z), x + sw, y + small * 0.15);
    ctx.font = '700 ' + size + 'px "IBM Plex Sans", system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(sym, x + sw + 3, y);
    var w = sw + 3 + ctx.measureText(sym).width;
    ctx.restore();
    return w;
  }
  function roundBtn(ctx, x, y, r, label, color, act, sub) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
    R.txt(ctx, label, x, y + 0.5, { size: r * 0.9, color: '#fff', weight: '800' });
    if (sub) R.txt(ctx, sub, x, y + r + 11, { size: 10.5, color: '#1b2329', weight: '600' });
    btns.push({ x: x, y: y, r: r, act: act });
  }
  function pillBtn(ctx, x, y, w, h, label, color, act) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.fillStyle = color; R.rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.restore();
    R.txt(ctx, label, x + w / 2, y + h / 2 + 0.5, { size: 13, color: '#fff', weight: '700' });
    btns.push({ x: x + w / 2, y: y + h / 2, w: w, h: h, act: act });
  }

  function doDecay() {
    var c = cur();
    if (c.mode === 's' || c.mode === 'none') return;
    var to = Nuc.after(c.mode, Z, Nn);
    anim = { mode: c.mode, t: 0, from: [Z, Nn], to: to };
  }

  var url = new URLSearchParams(location.search);
  Sim.create({
    aspect: 0.8, aspectNarrow: 1.05, grid: false, autoplay: true, keepRunning: true, minW: 470,
    hint: TASKS[curT].goal,
    controls: [],
    buttons: [
      { label: 'Протон қосу', onClick: function () { if (Z < ZMAX) setNuc(Z + 1, Nn); } },
      { label: 'Протон алу', onClick: function () { if (Z > 0) setNuc(Z - 1, Nn); } },
      { label: 'Нейтрон қосу', onClick: function () { if (Nn < NMAX) setNuc(Z, Nn + 1); } },
      { label: 'Нейтрон алу', onClick: function () { if (Nn > 0) setNuc(Z, Nn - 1); } },
      { label: 'Ыдырату', onClick: function () { doDecay(); } },
    ],
    readouts: [
      { key: 'nm', label: 'Ядро', text: true },
      { key: 'Z', label: 'Протон саны Z (зарядтық сан)', digits: 0 },
      { key: 'N', label: 'Нейтрон саны N', digits: 0 },
      { key: 'A', label: 'Массалық сан A = Z + N', digits: 0 },
      { key: 'st', label: 'Күйі', text: true },
      { key: 'T', label: 'Жартылай ыдырау периоды', text: true },
    ],
    init: function () { anim = null; },
    step: function (api, dt) {
      if (anim) {
        anim.t += dt;
        if (anim.t >= 1.7) {
          var m = anim.mode, to = anim.to;
          decays[m] = true; chain++;
          path.push([Z, Nn, to[0], to[1], m]);
          anim = null;
          setNuc(to[0], to[1], true);
          var c = cur();
          note(Nuc.MODE[m] + ': ' + Nuc.name(to[0]) + '-' + (to[0] + to[1]) + ' пайда болды. ' + (c.mode === 's' ? 'Бұл ядро тұрақты.' : 'Бұл ядро де тұрақсыз — тағы ыдыратуға болады.'));
        }
      }
    },
    draw: function (api, ctx, W, H) {
      var L = layout(W, H), c = cur(), dark = R.isDark && R.isDark();
      btns = [];
      ctx.fillStyle = dark ? '#111a22' : '#f3f6f8'; ctx.fillRect(0, 0, W, H);
      // ақпарат картасы
      var cd = L.card;
      ctx.save(); ctx.fillStyle = dark ? '#1b2530' : '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 10; R.rr(ctx, cd.x, cd.y, cd.w, cd.h, 12); ctx.fill(); ctx.restore();
      var ink = dark ? '#e8eef2' : '#1b2329';
      if (c.A > 0) {
        var big = Math.min(44, cd.h * 0.24);
        notation(ctx, cd.x + 16, cd.y + 18 + big, c.A, Z, Nuc.sym(Z), big, ink);
        var nmS = (Z === 0 ? 'Нейтрон' : Nuc.name(Z) + '-' + c.A);
        R.txt(ctx, nmS, cd.x + 16, cd.y + 34 + big, { size: 14, color: ink, align: 'left', weight: '700' });
        var st = c.mode === 's' ? 'Тұрақты' : Nuc.MODE[c.mode] || '';
        var col = COL[c.mode] || '#555';
        ctx.fillStyle = col; R.rr(ctx, cd.x + 16, cd.y + 48 + big, Math.min(cd.w - 32, 14 + st.length * 6.4), 22, 11); ctx.fill();
        R.txt(ctx, st, cd.x + 24, cd.y + 59 + big, { size: 11.5, color: '#fff', align: 'left', weight: '700' });
        var ly = cd.y + 88 + big;
        R.txt(ctx, 'Протон Z = ' + Z + ', нейтрон N = ' + Nn, cd.x + 16, ly, { size: 12, color: ink, align: 'left', mono: true }); ly += 20;
        if (c.mode !== 's') { R.txt(ctx, 'T½ = ' + Nuc.fmtT(c.T), cd.x + 16, ly, { size: 12, color: ink, align: 'left', mono: true }); ly += 20; }
        if (!c.known && c.mode !== 's') { R.txt(ctx, 'Мұндай ядро байланыспайды:', cd.x + 16, ly, { size: 11, color: '#8b5cc7', align: 'left' }); R.txt(ctx, 'нуклон бірден ұшып шығады', cd.x + 16, ly + 14, { size: 11, color: '#8b5cc7', align: 'left' }); ly += 30; }
        if (c.mode !== 's' && !anim && ly + 30 < cd.y + cd.h) pillBtn(ctx, cd.x + 16, Math.min(cd.y + cd.h - 40, ly + 4), Math.min(150, cd.w - 32), 30, 'Ыдыра', col, 'decay');
      } else R.txt(ctx, 'Бос ядро', cd.x + 16, cd.y + 30, { size: 14, color: ink, align: 'left' });
      // N–Z картасы
      drawChart(ctx, L.chart, dark);
      // ядро
      var rN = Math.max(5.5, Math.min(14, 60 / Math.sqrt(Math.max(1, c.A))));
      var nx = L.nuc.x, ny = L.nuc.y;
      var glow = ctx.createRadialGradient(nx, ny, 4, nx, ny, 90);
      glow.addColorStop(0, c.mode === 's' ? 'rgba(80,200,140,.25)' : 'rgba(255,170,60,.25)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(nx, ny, 90, 0, 7); ctx.fill();
      if (anim) {
        var k = Math.min(1, anim.t / 1.7), m = anim.mode, out = Math.min(1, anim.t / 1.1);
        var shake = anim.t < 0.35 ? Math.sin(anim.t * 80) * 2.5 : 0;
        var zf = k < 0.4 ? anim.from[0] : anim.to[0], nf = k < 0.4 ? anim.from[1] : anim.to[1];
        if (zf + nf > 0) drawNucleus(ctx, zf, nf, nx + shake, ny, rN);
        var dx = nx + out * (W * 0.32), dy = ny - out * 70;
        if (anim.t > 0.35) {
          if (m === 'a') { drawNucleus(ctx, 2, 2, dx, dy, 6); R.tag(ctx, 'α', dx, dy - 20, { size: 12, color: '#8a6100' }); }
          if (m === 'b-') { R.sphere(ctx, dx, dy, 4.5, '#1f6fd1'); R.tag(ctx, 'e⁻ (β⁻)', dx, dy - 16, { size: 11, color: '#1f6fd1' }); dash(ctx, nx, ny, nx + out * W * 0.28, ny + out * 60, '#888'); R.tag(ctx, 'ν̃', nx + out * W * 0.28, ny + out * 60 + 14, { size: 11 }); }
          if (m === 'b+') { R.sphere(ctx, dx, dy, 4.5, '#d2382b'); R.tag(ctx, 'e⁺ (β⁺)', dx, dy - 16, { size: 11, color: '#d2382b' }); dash(ctx, nx, ny, nx + out * W * 0.28, ny + out * 60, '#888'); R.tag(ctx, 'ν', nx + out * W * 0.28, ny + out * 60 + 14, { size: 11 }); }
          if (m === 'ec') { var ex = nx - (1 - out) * 80, ey = ny - (1 - out) * 40; if (out < 1) R.sphere(ctx, ex, ey, 4.5, '#1f6fd1'); dash(ctx, nx, ny, nx + out * W * 0.28, ny + out * 60, '#888'); R.tag(ctx, 'ν', nx + out * W * 0.28, ny + out * 60 + 14, { size: 11 }); }
          if (m === 'n') { R.sphere(ctx, dx, dy, rN, NC); R.tag(ctx, 'n', dx, dy - 18, { size: 11 }); }
          if (m === 'p') { R.sphere(ctx, dx, dy, rN, PC); R.tag(ctx, 'p', dx, dy - 18, { size: 11 }); }
        }
      } else if (c.A > 0) drawNucleus(ctx, Z, Nn, nx, ny, rN);
      else R.tag(ctx, 'Протон немесе нейтрон қос', nx, ny, { size: 12 });
      // протон мен нейтрон «қоймасы»
      [[L.pileP, 'p'], [L.pileN, 'n']].forEach(function (q) {
        var o = q[0], isP = q[1] === 'p';
        for (var i = 0; i < 6; i++) R.sphere(ctx, o.x - 14 + (i % 3) * 14, o.y - 6 + Math.floor(i / 3) * 12, 8, isP ? PC : NC);
        R.txt(ctx, isP ? 'Протондар' : 'Нейтрондар', o.x, o.y + 24, { size: 11, color: dark ? '#dfe7ec' : '#1b2329' });
        roundBtn(ctx, o.x + 44, o.y - 8, 13, '+', isP ? PC : '#6b7580', isP ? '+p' : '+n');
        roundBtn(ctx, o.x + 44, o.y + 22, 13, '−', '#4a535c', isP ? '-p' : '-n');
      });
      if (drag && (drag.kind === 'p' || drag.kind === 'n') && drag.p) R.sphere(ctx, drag.p.x, drag.p.y, 9, drag.kind === 'p' ? PC : NC);
      if (drag && drag.kind === 'out' && drag.p) R.sphere(ctx, drag.p.x, drag.p.y, rN, drag.isP ? PC : NC);
      if (flash && performance.now() - flash.t < 5000) {
        R.tag(ctx, flash.s.length > 70 ? flash.s.slice(0, 68) + '…' : flash.s, W / 2, H - 14, { size: 11.5, color: '#1d7a45' });
      }
    },
    pointer: {
      down: function (api, p) {
        var rad = api.touch ? 8 : 2;
        var b = btns.filter(function (x) { return x.w ? Math.abs(p.x - x.x) < x.w / 2 + rad && Math.abs(p.y - x.y) < x.h / 2 + rad : Math.hypot(p.x - x.x, p.y - x.y) < x.r + rad; })[0];
        if (b) { drag = null; act(b.act); return; }
        if (cells) {
          var cz = Math.floor((cells.y + cells.h - p.y) / cells.c), cn = Math.floor((p.x - cells.x) / cells.c);
          if (p.x >= cells.x && p.y <= cells.y + cells.h && cz >= 0 && cz <= ZMAX && cn >= 0 && cn <= NMAX) { if (!anim) setNuc(cz, cn); drag = null; return; }
        }
        var L = layout(api.W, api.H);
        if (Math.hypot(p.x - L.pileP.x, p.y - L.pileP.y) < 30) { drag = { kind: 'p', p: p, s: p }; return; }
        if (Math.hypot(p.x - L.pileN.x, p.y - L.pileN.y) < 30) { drag = { kind: 'n', p: p, s: p }; return; }
        var A = Z + Nn, rN = Math.max(5.5, Math.min(14, 60 / Math.sqrt(Math.max(1, A))));
        var pts = nucleons(Z, Nn, L.nuc.x, L.nuc.y, rN), hit = pts.filter(function (q) { return Math.hypot(p.x - q.x, p.y - q.y) < rN + 3; })[0];
        if (hit && !anim) { drag = { kind: 'out', isP: hit.p, p: p, s: p }; return; }
        drag = null;
      },
      move: function (api, p, down) { if (drag && down) drag.p = p; },
      up: function (api, p) {
        if (!drag || anim) { drag = null; return; }
        var L = layout(api.W, api.H), moved = Math.hypot(p.x - drag.s.x, p.y - drag.s.y) > 8, dN = Math.hypot(p.x - L.nuc.x, p.y - L.nuc.y);
        if (drag.kind === 'p' || drag.kind === 'n') {
          if (!moved || dN < 80) act(drag.kind === 'p' ? '+p' : '+n');
          else note('Бөлшекті ядроның үстіне апарып жібер.');
        } else if (drag.kind === 'out' && moved && dN > 70) act(drag.isP ? '-p' : '-n');
        drag = null;
      },
    },
    read: function () {
      var c = cur();
      return { nm: c.A ? (Z === 0 ? 'Нейтрон' : Nuc.name(Z) + '-' + c.A + ' (' + Nuc.sym(Z) + ')') : '—', Z: Z, N: Nn, A: c.A, st: c.mode === 's' ? 'Тұрақты' : (Nuc.MODE[c.mode] || '—'), T: c.mode === 's' ? '∞' : '≈ ' + Nuc.fmtT(c.T) };
    },
  });

  function act(a) {
    if (anim) return;
    if (a === '+p') { if (Z >= ZMAX) note('Бұл модельде Z ≤ 20.'); else setNuc(Z + 1, Nn); }
    if (a === '-p' && Z > 0) setNuc(Z - 1, Nn);
    if (a === '+n') { if (Nn >= NMAX) note('Бұл модельде N ≤ 28.'); else setNuc(Z, Nn + 1); }
    if (a === '-n' && Nn > 0) setNuc(Z, Nn - 1);
    if (a === 'decay') doDecay();
  }
  function dash(ctx, x1, y1, x2, y2, c) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }

  function drawChart(ctx, r, dark) {
    var c = Math.floor(Math.min((r.w - 8) / (NMAX + 1), (r.h - 20) / (ZMAX + 1)));
    var w = c * (NMAX + 1), h = c * (ZMAX + 1), x0 = r.x + 10, y0 = r.y;
    cells = { x: x0, y: y0, w: w, h: h, c: c };
    var ink = dark ? '#dfe7ec' : '#1b2329';
    ctx.save();
    ctx.fillStyle = dark ? '#1b2530' : '#fff'; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = dark ? '#2c3a46' : '#e3e8ec'; ctx.lineWidth = 0.5;
    for (var z = 0; z <= ZMAX; z++) for (var n = 0; n <= NMAX; n++) {
      var inf = Nuc.info(z, n);
      var X = x0 + n * c, Yy = y0 + h - (z + 1) * c;
      if (inf.known) { ctx.fillStyle = COL[inf.mode]; ctx.globalAlpha = inf.mode === 's' ? 1 : 0.55; ctx.fillRect(X + 0.5, Yy + 0.5, c - 1, c - 1); ctx.globalAlpha = 1; }
    }
    // Z = N сызығы
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(120,120,120,.8)'; ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + Math.min(w, h), y0 + h - Math.min(w, h)); ctx.stroke(); ctx.setLineDash([]);
    // ыдырау жолы
    path.forEach(function (s) {
      var a = { x: x0 + (s[1] + 0.5) * c, y: y0 + h - (s[0] + 0.5) * c }, b = { x: x0 + (s[3] + 0.5) * c, y: y0 + h - (s[2] + 0.5) * c };
      ctx.strokeStyle = COL[s[4]] || ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    // қазіргі ядро
    ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2.5; ctx.strokeRect(x0 + Nn * c - 1, y0 + h - (Z + 1) * c - 1, c + 2, c + 2);
    ctx.restore();
    ctx.save(); ctx.font = '500 9px "IBM Plex Mono", monospace'; ctx.fillStyle = ink; ctx.textAlign = 'center';
    for (var nn = 0; nn <= NMAX; nn += 4) ctx.fillText(String(nn), x0 + (nn + 0.5) * c, y0 + h + 10);
    ctx.textAlign = 'right';
    for (var zz = 0; zz <= ZMAX; zz += 4) ctx.fillText(String(zz), x0 - 2, y0 + h - (zz + 0.5) * c + 3);
    ctx.restore();
    R.txt(ctx, 'N →', x0 + w - 10, y0 + h + 10, { size: 9.5, color: ink });
    R.txt(ctx, 'Z', x0 - 4, y0 - 6, { size: 9.5, color: ink });
    // шартты белгілер
    var lg = [['s', 'тұрақты ядро'], ['b-', 'β⁻'], ['b+', 'β⁺'], ['ec', 'e-қармау'], ['a', 'α']], lx = x0 + w + 14, ly = y0 + 8;
    if (lx + 60 > r.x + r.w) { lx = x0 + 6; }
    lg.forEach(function (q, i) { ctx.fillStyle = COL[q[0]]; ctx.fillRect(lx, ly + i * 13 - 4, 8, 8); R.txt(ctx, q[1], lx + 12, ly + i * 13, { size: 9.5, color: ink, align: 'left', weight: '500' }); });
  }

  // бүйір панель: тапсырмалар
  var side = document.querySelector('.simside');
  taskBox = document.createElement('section'); taskBox.className = 'cl-taskbox';
  side.insertBefore(taskBox, side.firstChild);
  hintEl = document.querySelector('#simHint span');
  if (url.has('z') && url.has('n')) setNuc(parseInt(url.get('z'), 10) || 0, parseInt(url.get('n'), 10) || 0);
  renderTasks();
  checkTasks();
})();

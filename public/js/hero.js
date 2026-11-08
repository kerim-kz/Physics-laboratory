/* Басты беттегі гравитация құмсалғышы: Күн (немесе қос жұлдыз) және планеталар.
   Тінтуірмен/саусақпен тартып жаңа планета ұшырасың; тарту векторы — бастапқы жылдамдық.
   Есептеу: Ньютонның бүкіләлемдік тартылыс заңы, жылдамдықты Верле әдісі, тұрақты қадам. */
(function () {
  'use strict';
  var canvas = document.getElementById('heroSim');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var readEl = document.getElementById('heroRead');
  var playBtn = document.getElementById('heroPlay');
  var clearBtn = document.getElementById('heroClear');
  var modeBtns = document.querySelectorAll('[data-hero-mode]');

  var GM = 2.0e6;              // «Күннің» G·M мәні (әлем бірлігінде)
  var EPS2 = 25;               // жұмсарту: r² + ε²
  var DT = 1 / 240;            // есептеу қадамы, с
  var VIEW = 620;              // экран биіктігіне сыятын әлем өлшемі
  var COLORS = ['#7cc4ff', '#ffb36b', '#9be38b', '#ff8fa3', '#c9a6ff', '#7ee0d6', '#ffd86b'];

  var W = 0, H = 0, scale = 1, cx = 0, cy = 0;
  var bodies = [], stars = [], mode = 'sun', running = false, last = 0, acc = 0, frameNo = 0, colorNo = 0;
  var drag = null, preview = [], visible = true;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function body(x, y, vx, vy, m, r, color, isStar) {
    return { x: x, y: y, vx: vx, vy: vy, ax: 0, ay: 0, m: m, r: r, color: color, star: !!isStar, trail: [] };
  }
  function nextColor() { return COLORS[(colorNo++) % COLORS.length]; }
  function circ(r, M) { return Math.sqrt((M || GM) / r); }

  function setup(m) {
    mode = m; bodies = []; colorNo = 0;
    if (m === 'binary') {
      var d = 70, M = GM / 2, v = Math.sqrt(M / (4 * d)); // екі жұлдыз ортақ масса центрін айналады
      bodies.push(body(-d, 0, 0, -v, M, 15, '#ffd25e', true));
      bodies.push(body(d, 0, 0, v, M, 13, '#ff9b5e', true));
      [230, 290].forEach(function (r, i) { bodies.push(body(0, i ? r : -r, (i ? -1 : 1) * circ(r), 0, 0, 5, nextColor())); });
    } else {
      bodies.push(body(0, 0, 0, 0, GM, 20, '#ffd25e', true));
      if (m === 'sun') {
        [[70, 3.5], [120, 5], [180, 6], [255, 4.5]].forEach(function (p, i) {
          var a = i * 1.7;
          var v = circ(p[0]);
          bodies.push(body(p[0] * Math.cos(a), p[0] * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 0, p[1], nextColor()));
        });
      }
    }
    accel(bodies);
    preview = [];
    draw();
  }

  // Тек жұлдыздар тартады (планеталар бір-біріне әсер етпейді) — жүйе тұрақты әрі түсінікті.
  function accel(list) {
    for (var i = 0; i < list.length; i++) {
      var b = list[i]; b.ax = 0; b.ay = 0;
      for (var j = 0; j < list.length; j++) {
        if (i === j) continue;
        var s = list[j];
        if (!s.star) continue;
        var dx = s.x - b.x, dy = s.y - b.y;
        var r2 = dx * dx + dy * dy + EPS2, inv = 1 / Math.sqrt(r2);
        var f = s.m * inv * inv * inv;
        b.ax += f * dx; b.ay += f * dy;
      }
    }
  }
  function step(list, h) {
    var i, b;
    for (i = 0; i < list.length; i++) { b = list[i]; b.vx += b.ax * h / 2; b.vy += b.ay * h / 2; b.x += b.vx * h; b.y += b.vy * h; }
    accel(list);
    for (i = 0; i < list.length; i++) { b = list[i]; b.vx += b.ax * h / 2; b.vy += b.ay * h / 2; }
  }
  // Жұлдызға құлаған немесе алысқа кеткен планеталарды алып тастау.
  function cull() {
    var starsList = bodies.filter(function (b) { return b.star; });
    bodies = bodies.filter(function (b) {
      if (b.star) return true;
      for (var i = 0; i < starsList.length; i++) {
        var s = starsList[i];
        if (Math.hypot(b.x - s.x, b.y - s.y) < s.r + b.r * 0.5) { flash(s.x, s.y); return false; }
      }
      return Math.hypot(b.x, b.y) < 4000;
    });
  }
  var flashes = [];
  function flash(x, y) { flashes.push({ x: x, y: y, t: 0 }); }

  // ---------- сурет ----------
  function toScreen(x, y) { return [cx + x * scale, cy + y * scale]; }
  function toWorld(px, py) { return [(px - cx) / scale, (py - cy) / scale]; }

  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width; H = rect.height;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(H, W * 0.95) / VIEW;
    cx = W > 760 ? W * 0.64 : W / 2; cy = H / 2;
    stars = [];
    var n = Math.round(W * H / 2600);
    for (var i = 0; i < n; i++) stars.push([Math.random() * W, Math.random() * H, Math.random() * 1.2 + 0.2, Math.random() * 0.6 + 0.25]);
    draw();
  }

  function draw() {
    ctx.fillStyle = '#060c17';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = s[3]; ctx.fillStyle = '#ffffff';
      ctx.fillRect(s[0], s[1], s[2], s[2]);
    }
    ctx.globalAlpha = 1;
    // орбита ізі
    bodies.forEach(function (b) {
      if (b.trail.length < 2) return;
      ctx.strokeStyle = b.color; ctx.lineWidth = b.star ? 1 : 1.4;
      for (var k = 1; k < b.trail.length; k++) {
        ctx.globalAlpha = (k / b.trail.length) * (b.star ? 0.35 : 0.7);
        var p0 = toScreen(b.trail[k - 1][0], b.trail[k - 1][1]), p1 = toScreen(b.trail[k][0], b.trail[k][1]);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    // болжамды траектория
    if (preview.length > 1) {
      ctx.save(); ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.3;
      ctx.beginPath();
      preview.forEach(function (p, k) { var q = toScreen(p[0], p[1]); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.stroke(); ctx.restore();
    }
    // денелер
    bodies.forEach(function (b) {
      var p = toScreen(b.x, b.y), r = Math.max(2.5, b.r * scale);
      if (b.star) {
        var g = ctx.createRadialGradient(p[0], p[1], r * 0.2, p[0], p[1], r * 3.2);
        g.addColorStop(0, 'rgba(255,230,150,.95)'); g.addColorStop(0.35, 'rgba(255,190,80,.35)'); g.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r * 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
    });
    flashes.forEach(function (f) {
      var p = toScreen(f.x, f.y);
      ctx.strokeStyle = 'rgba(255,220,140,' + (1 - f.t) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p[0], p[1], 20 + f.t * 40, 0, Math.PI * 2); ctx.stroke();
    });
    // тарту көрсеткісі
    if (drag) {
      var a = toScreen(drag.x, drag.y), b2 = toScreen(drag.x + drag.vx / 1.6, drag.y + drag.vy / 1.6);
      ctx.strokeStyle = ctx.fillStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      var ang = Math.atan2(b2[1] - a[1], b2[0] - a[0]);
      ctx.beginPath(); ctx.moveTo(b2[0], b2[1]);
      ctx.lineTo(b2[0] - 10 * Math.cos(ang - 0.4), b2[1] - 10 * Math.sin(ang - 0.4));
      ctx.lineTo(b2[0] - 10 * Math.cos(ang + 0.4), b2[1] - 10 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = drag.color; ctx.beginPath(); ctx.arc(a[0], a[1], 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- оқу мәтіні ----------
  function centralStar() { return bodies.filter(function (b) { return b.star; }); }
  function describe() {
    if (!readEl) return;
    var planets = bodies.filter(function (b) { return !b.star; }).length;
    if (!drag) { readEl.textContent = 'Планета саны: ' + planets + '. Экранды тартып, жаңа планета ұшыр.'; return; }
    var st = centralStar();
    var M = st.reduce(function (s, b) { return s + b.m; }, 0);
    var mx = 0, my = 0;
    st.forEach(function (b) { mx += b.x * b.m / M; my += b.y * b.m / M; });
    var r = Math.hypot(drag.x - mx, drag.y - my), v = Math.hypot(drag.vx, drag.vy);
    var k = v / circ(r, M);
    var verdict = k < 0.08 ? 'жұлдызға құлайды' : k < 0.95 ? 'эллипс бойымен қозғалады' : k < 1.05 ? 'шеңберге жуық орбита (v ≈ v₁)' : k < 1.414 ? 'созылған эллипс' : 'жүйеден мүлде кетеді (v ≥ √2·v₁)';
    readEl.textContent = 'v / v₁ = ' + k.toFixed(2).replace('.', ',') + ' → ' + verdict;
  }

  function predict() {
    var copy = bodies.map(function (b) { var c = body(b.x, b.y, b.vx, b.vy, b.m, b.r, b.color, b.star); return c; });
    var probe = body(drag.x, drag.y, drag.vx, drag.vy, 0, 4, '#fff');
    copy.push(probe);
    accel(copy);
    preview = [[probe.x, probe.y]];
    for (var i = 0; i < 1400; i++) {
      step(copy, DT * 2);
      if (i % 6 === 0) preview.push([probe.x, probe.y]);
      var hit = copy.some(function (s) { return s.star && Math.hypot(probe.x - s.x, probe.y - s.y) < s.r; });
      if (hit || Math.hypot(probe.x, probe.y) > 3000) break;
    }
  }

  // ---------- басқару ----------
  function pos(e) { var r = canvas.getBoundingClientRect(); return toWorld(e.clientX - r.left, e.clientY - r.top); }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e);
    drag = { x: p[0], y: p[1], sx: p[0], sy: p[1], vx: 0, vy: 0, color: COLORS[colorNo % COLORS.length] };
    canvas.setPointerCapture(e.pointerId);
    predict(); describe(); if (!running) draw();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = pos(e);
    drag.vx = (p[0] - drag.sx) * 1.6; drag.vy = (p[1] - drag.sy) * 1.6;
    predict(); describe(); if (!running) draw();
  });
  function release() {
    if (!drag) return;
    var b = body(drag.x, drag.y, drag.vx, drag.vy, 0, 5, nextColor());
    bodies.push(b);
    if (bodies.length > 40) bodies.splice(bodies.findIndex(function (x) { return !x.star; }), 1);
    accel(bodies);
    drag = null; preview = [];
    describe(); draw();
    if (!running) play();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', function () { drag = null; preview = []; describe(); draw(); });
  canvas.style.touchAction = 'none';

  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - last) / 1000);
    last = t; acc += dt;
    while (acc >= DT) { step(bodies, DT); acc -= DT; }
    frameNo++;
    if (frameNo % 2 === 0) bodies.forEach(function (b) { b.trail.push([b.x, b.y]); if (b.trail.length > (b.star ? 120 : 260)) b.trail.shift(); });
    cull();
    flashes.forEach(function (f) { f.t += dt * 1.5; });
    flashes = flashes.filter(function (f) { return f.t < 1; });
    if (drag) predict();
    draw();
    if (frameNo % 15 === 0 && !drag) describe();
    requestAnimationFrame(frame);
  }
  function play() {
    if (running || !visible) return;
    running = true; last = performance.now();
    if (playBtn) { playBtn.textContent = 'Тоқтату'; playBtn.setAttribute('aria-pressed', 'false'); }
    requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    if (playBtn) { playBtn.textContent = 'Жалғастыру'; playBtn.setAttribute('aria-pressed', 'true'); }
  }

  if (playBtn) playBtn.addEventListener('click', function () { if (running) pause(); else { visible = true; play(); } });
  if (clearBtn) clearBtn.addEventListener('click', function () { setup(mode); describe(); });
  Array.prototype.forEach.call(modeBtns, function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(modeBtns, function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      setup(b.getAttribute('data-hero-mode')); describe();
    });
  });

  // Экраннан тыс немесе бет жасырын кезде есептеуді тоқтатамыз.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (!visible && running) { running = false; canvas.dataset.autopaused = '1'; }
      else if (visible && canvas.dataset.autopaused) { delete canvas.dataset.autopaused; play(); }
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && running) { running = false; canvas.dataset.autopaused = '1'; }
    else if (!document.hidden && canvas.dataset.autopaused) { delete canvas.dataset.autopaused; play(); }
  });

  window.addEventListener('resize', resize);
  resize();
  setup('sun');
  describe();
  if (reduce) pause(); else play();
})();

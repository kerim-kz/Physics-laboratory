/* Шынайы көрініс: симуляциялардағы денелер мен құралдарды нақты заттарға ұқсатып салатын көмекшілер.
   Ағаш, металл, шыны, су, серіппе, динамометр, гир, термометр, амперметр, шам, батарея, магнит, көлік, планеталар.
   Барлық функция бірінші аргумент ретінде canvas контекстін алады. window.Real арқылы қолжетімді. */
(function () {
  'use strict';

  // ---------- көмекшілер ----------
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function rgb(c) {
    var m;
    c = String(c).trim();
    if ((m = c.match(/^#([0-9a-f]{6})$/i))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    if ((m = c.match(/^#([0-9a-f]{3})$/i))) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    if ((m = c.match(/^rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i))) return [+m[1], +m[2], +m[3]];
    return [128, 128, 128];
  }
  // k > 0 — ағарту, k < 0 — қарайту
  function shade(c, k) {
    var a = rgb(c);
    var f = function (v) { return Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)); };
    return 'rgb(' + f(a[0]) + ',' + f(a[1]) + ',' + f(a[2]) + ')';
  }
  function alpha(c, a) { var x = rgb(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }
  function isDark() {
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
    var a = rgb(bg || '#fff');
    return (a[0] * 0.3 + a[1] * 0.59 + a[2] * 0.11) < 100;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  var FONT = '"IBM Plex Sans", system-ui, sans-serif', MONO = '"IBM Plex Mono", monospace';
  function txt(ctx, s, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || '600') + ' ' + (o.size || 11) + 'px ' + (o.mono ? MONO : FONT);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.baseline || 'middle';
    ctx.fillStyle = o.color || '#1b2329';
    ctx.fillText(s, x, y);
    ctx.restore();
  }

  // ---------- текстуралар (бір рет жасалып, кэште сақталады) ----------
  var cache = {};
  function texture(key, w, h, paint) {
    if (cache[key]) return cache[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    cache[key] = c;
    return c;
  }
  function woodTex(tone) {
    return texture('wood' + tone, 256, 128, function (g, w, h) {
      var base = tone || '#b07a46';
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      var r = rng(7);
      for (var i = 0; i < 60; i++) {
        var y = r() * h, amp = 2 + r() * 6, k = r() < 0.5 ? -0.18 : 0.12;
        g.strokeStyle = alpha(shade(base, k), 0.25 + r() * 0.35);
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath();
        for (var x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x / (30 + r() * 10) + i) * amp);
        g.stroke();
      }
      for (var j = 0; j < 3; j++) { // бұтақ іздері
        var kx = r() * w, ky = r() * h;
        var gr = g.createRadialGradient(kx, ky, 1, kx, ky, 9);
        gr.addColorStop(0, alpha(shade(base, -0.45), 0.7)); gr.addColorStop(1, alpha(base, 0));
        g.fillStyle = gr; g.beginPath(); g.ellipse(kx, ky, 12, 6, 0, 0, 7); g.fill();
      }
    });
  }
  function brushedTex(base) {
    return texture('brush' + base, 128, 64, function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      var r = rng(11);
      for (var i = 0; i < 220; i++) {
        var y = r() * h;
        g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,' + (0.05 + r() * 0.12) + ')' : 'rgba(0,0,0,' + (0.04 + r() * 0.1) + ')';
        g.lineWidth = 0.5 + r();
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 2); g.stroke();
      }
    });
  }
  function noiseTex(base, key, dots) {
    return texture('noise' + key + base, 128, 128, function (g, w, h) {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      var r = rng(23);
      for (var i = 0; i < (dots || 900); i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,' + r() * 0.18 + ')' : 'rgba(0,0,0,' + r() * 0.16 + ')';
        g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
      }
    });
  }
  function fillTex(ctx, tex, x, y, w, h) {
    ctx.save();
    var p = ctx.createPattern(tex, 'repeat');
    if (p && p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().translate(x, y));
    ctx.fillStyle = p; ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // ---------- материалдар ----------
  // c — негізгі түс, t — текстура (wood | metal | noise | ice | glass | plain), gloss — жылтыр
  var MAT = {
    wood: { c: '#c48a52', t: 'wood', name: 'Ағаш' }, pine: { c: '#d9a86c', t: 'wood' }, oak: { c: '#9a6638', t: 'wood' },
    steel: { c: '#8f99a3', t: 'metal', gloss: 1 }, iron: { c: '#6d747b', t: 'metal', gloss: 0.7 }, aluminum: { c: '#c3cad1', t: 'metal', gloss: 1 },
    copper: { c: '#c06c3e', t: 'metal', gloss: 1 }, brass: { c: '#c9a24a', t: 'metal', gloss: 1 }, gold: { c: '#e2b43c', t: 'metal', gloss: 1 },
    silver: { c: '#d5d9de', t: 'metal', gloss: 1 }, lead: { c: '#6f7480', t: 'noise', gloss: 0.4 }, zinc: { c: '#a9b2b9', t: 'metal', gloss: 0.7 },
    ice: { c: '#d9f0fa', t: 'ice' }, glass: { c: '#cfe8f2', t: 'glass' }, wax: { c: '#efe3bd', t: 'plain' }, cork: { c: '#c79c66', t: 'noise' },
    stone: { c: '#9b958c', t: 'noise' }, granite: { c: '#8a8580', t: 'noise' }, brick: { c: '#b4553a', t: 'noise' }, rubber: { c: '#3a3d42', t: 'plain' },
    plasticRed: { c: '#d8473b', t: 'plain', gloss: 0.6 }, plasticBlue: { c: '#2f7fd1', t: 'plain', gloss: 0.6 }, plasticGreen: { c: '#3a9a5c', t: 'plain', gloss: 0.6 },
    plasticYellow: { c: '#e7b92f', t: 'plain', gloss: 0.6 }, foam: { c: '#f2efe6', t: 'noise' }, concrete: { c: '#a7a59f', t: 'noise' },
  };
  function mat(m) { return typeof m === 'string' ? (MAT[m] || { c: m, t: 'plain' }) : m; }

  // Беттің бояуы: материал текстурасы + жарық
  function paintFace(ctx, x, y, w, h, m, light) {
    m = mat(m);
    var base = shade(m.c, light || 0);
    if (m.t === 'wood') fillTex(ctx, woodTex(base), x, y, w, h);
    else if (m.t === 'metal') fillTex(ctx, brushedTex(base), x, y, w, h);
    else if (m.t === 'noise') fillTex(ctx, noiseTex(base, 'n'), x, y, w, h);
    else { ctx.fillStyle = m.t === 'ice' || m.t === 'glass' ? alpha(base, 0.72) : base; ctx.fillRect(x, y, w, h); }
  }

  // ---------- сахна (фон) ----------
  // kind: 'lab' — зертхана қабырғасы мен ағаш үстел; 'outdoor' — аспан мен жер; 'space' — ғарыш; 'wall' — тек қабырға.
  function scene(ctx, W, H, kind, o) {
    o = o || {};
    var dark = isDark();
    ctx.save();
    if (kind === 'space') {
      var sg = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      sg.addColorStop(0, '#111a2e'); sg.addColorStop(1, '#03050b');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      stars(ctx, W, H, o.seed || 5, o.count || 220);
    } else if (kind === 'outdoor') {
      var ground = o.ground === undefined ? H * 0.78 : o.ground;
      var sky = ctx.createLinearGradient(0, 0, 0, ground);
      if (dark) { sky.addColorStop(0, '#0d1b2e'); sky.addColorStop(1, '#2b4364'); } else { sky.addColorStop(0, '#6fb2e8'); sky.addColorStop(1, '#d6ecf8'); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground);
      // алыстағы төбелер
      ctx.fillStyle = dark ? '#1f3a33' : '#8fbf8a';
      ctx.beginPath(); ctx.moveTo(0, ground);
      for (var x = 0; x <= W; x += 20) ctx.lineTo(x, ground - 18 - 14 * Math.sin(x / 90) - 8 * Math.sin(x / 37));
      ctx.lineTo(W, ground); ctx.fill();
      if (o.road) {
        ctx.fillStyle = dark ? '#3a7a3f' : '#6aa851'; ctx.fillRect(0, ground, W, H - ground);
        var ry = ground + 6, rh = Math.min(46, (H - ground) - 10);
        ctx.fillStyle = '#4a4e54'; ctx.fillRect(0, ry, W, rh);
        ctx.fillStyle = '#e9e6dc';
        for (var dx = ((o.roadShift || 0) % 50 + 50) % 50 - 50; dx < W; dx += 50) ctx.fillRect(dx, ry + rh / 2 - 1.5, 26, 3);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, ry + 2, W, 2); ctx.fillRect(0, ry + rh - 4, W, 2);
      } else {
        var gg = ctx.createLinearGradient(0, ground, 0, H);
        gg.addColorStop(0, dark ? '#2f6a37' : '#78b45c'); gg.addColorStop(1, dark ? '#1d4524' : '#4f8b3b');
        ctx.fillStyle = gg; ctx.fillRect(0, ground, W, H - ground);
        var r = rng(3);
        ctx.strokeStyle = dark ? 'rgba(120,200,120,.25)' : 'rgba(40,90,30,.35)'; ctx.lineWidth = 1;
        for (var i = 0; i < W / 4; i++) { var gx = r() * W, gy = ground + 4 + r() * (H - ground - 4); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (r() - 0.5) * 4, gy - 3 - r() * 4); ctx.stroke(); }
      }
      if (o.sun !== false && !dark) sun(ctx, W * 0.86, H * 0.12, Math.min(W, H) * 0.05);
      if (o.clouds !== false) { cloud(ctx, W * 0.2, H * 0.14, 1); cloud(ctx, W * 0.58, H * 0.09, 0.7); }
    } else {
      // зертхана: қабырға (жоғарыдан түскен жарық) + ағаш үстел
      var table = o.table === undefined ? H * 0.8 : o.table;
      var wall = ctx.createLinearGradient(0, 0, 0, table);
      if (dark) { wall.addColorStop(0, '#1d262d'); wall.addColorStop(1, '#2a353d'); } else { wall.addColorStop(0, '#eef2f4'); wall.addColorStop(1, '#dde4e8'); }
      ctx.fillStyle = wall; ctx.fillRect(0, 0, W, kind === 'wall' ? H : table);
      if (o.tiles) { // кафель
        ctx.strokeStyle = dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; ctx.lineWidth = 1;
        for (var ty = table; ty > 0; ty -= 40) { ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke(); }
        for (var tx = 0; tx < W; tx += 40) { ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, table); ctx.stroke(); }
      }
      var vg = ctx.createRadialGradient(W * 0.5, table * 0.3, 10, W * 0.5, table * 0.4, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.08)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, table);
      if (kind !== 'wall') tableTop(ctx, 0, table, W, H - table);
    }
    ctx.restore();
  }
  function tableTop(ctx, x, y, w, h, tone) {
    var dark = isDark();
    var base = tone || (dark ? '#6e4c2c' : '#b98352');
    fillTex(ctx, woodTex(base), x, y, w, h);
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(0.08, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y, w, 1.5);
  }
  function stars(ctx, W, H, seed, n) {
    var r = rng(seed || 5);
    for (var i = 0; i < (n || 200); i++) {
      var x = r() * W, y = r() * H, s = r();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + s * 0.75) + ')';
      ctx.beginPath(); ctx.arc(x, y, s < 0.92 ? 0.6 + s * 0.7 : 1.6, 0, 7); ctx.fill();
    }
  }
  function sun(ctx, x, y, r) {
    var g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3);
    g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(0.3, 'rgba(255,220,120,.45)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
    var c = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    c.addColorStop(0, '#fffbe6'); c.addColorStop(1, '#ffc93a');
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  function cloud(ctx, x, y, s) {
    ctx.save();
    ctx.fillStyle = isDark() ? 'rgba(180,195,215,.18)' : 'rgba(255,255,255,.9)';
    [[0, 0, 22], [20, -8, 18], [40, 0, 20], [18, 6, 20], [-16, 4, 14]].forEach(function (b) {
      ctx.beginPath(); ctx.arc(x + b[0] * s, y + b[1] * s, b[2] * s, 0, 7); ctx.fill();
    });
    ctx.restore();
  }
  function tree(ctx, x, yGround, h) {
    ctx.save();
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - h * 0.05, yGround - h * 0.45, h * 0.1, h * 0.45);
    var r = rng(Math.round(x));
    [[0, -0.62, 0.28], [-0.16, -0.5, 0.22], [0.16, -0.5, 0.22], [0, -0.82, 0.22]].forEach(function (b) {
      var cx = x + b[0] * h, cy = yGround + b[1] * h, rad = b[2] * h;
      var g = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
      g.addColorStop(0, '#6fbf5a'); g.addColorStop(1, '#2f7a34');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad * (0.9 + r() * 0.2), 0, 7); ctx.fill();
    });
    ctx.restore();
  }

  // ---------- денелер ----------
  function shadow(ctx, x, y, w, k) {
    ctx.save();
    var g = ctx.createRadialGradient(x, y, 1, x, y, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,' + (0.35 * (k === undefined ? 1 : k)) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w / 2, Math.max(3, Math.min(w * 0.1, 9)), 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  // Кірпіш тәрізді дене (жоғарғы және бүйір беттері бар). (x, y) — алдыңғы беттің сол жақ жоғарғы бұрышы.
  function block(ctx, x, y, w, h, m, o) {
    o = o || {};
    m = mat(m);
    var d = o.depth === undefined ? Math.min(14, w * 0.18, h * 0.5) : o.depth;
    if (o.shadow !== false) shadow(ctx, x + w / 2 + d / 2, y + h + 1, w * 1.15);
    ctx.save();
    // жоғарғы бет
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w, y); ctx.closePath();
    ctx.save(); ctx.clip(); paintFace(ctx, x, y - d, w + d, d, m, 0.25); ctx.restore();
    // бүйір бет
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w + d, y + h - d); ctx.lineTo(x + w, y + h); ctx.closePath();
    ctx.save(); ctx.clip(); paintFace(ctx, x + w, y - d, d, h + d, m, -0.25); ctx.restore();
    // алдыңғы бет
    paintFace(ctx, x, y, w, h, m, 0);
    var g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(255,255,255,' + (m.gloss ? 0.25 : 0.1) + ')'); g.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (m.t === 'ice' || m.t === 'glass') { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + w * 0.12, y + 3, w * 0.08, h - 6); }
    ctx.strokeStyle = alpha(shade(m.c, -0.55), 0.7); ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w + d, y + h - d); ctx.lineTo(x + w, y + h); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y - d); ctx.stroke();
    if (o.label) txt(ctx, o.label, x + w / 2, y + h / 2, { color: m.t === 'metal' || m.t === 'plain' ? 'rgba(255,255,255,.92)' : '#2a1f14', size: o.labelSize || 11 });
    ctx.restore();
  }
  // Көлемді шар (металл, пластик, резеңке)
  function sphere(ctx, x, y, r, color, o) {
    o = o || {};
    if (o.shadowY) shadow(ctx, x, o.shadowY, r * 2.2, 0.8);
    ctx.save();
    var g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r);
    g.addColorStop(0, shade(color, 0.75)); g.addColorStop(0.35, shade(color, 0.12)); g.addColorStop(0.85, shade(color, -0.35)); g.addColorStop(1, shade(color, -0.55));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    // шағылыс
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.22, r * 0.12, -0.6, 0, 7); ctx.fill();
    ctx.restore();
    if (o.label) txt(ctx, o.label, x, y, { color: '#fff', size: o.labelSize || Math.max(9, r * 0.6) });
  }
  // Цилиндр (тік): гир, стақан, батарея
  function cylinder(ctx, x, y, w, h, m, o) {
    o = o || {};
    m = mat(m);
    var ry = o.ry === undefined ? Math.max(2, w * 0.16) : o.ry;
    if (o.shadow !== false) shadow(ctx, x + w / 2, y + h + ry * 0.6, w * 1.3);
    ctx.save();
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, shade(m.c, -0.45)); g.addColorStop(0.3, shade(m.c, m.gloss ? 0.55 : 0.2)); g.addColorStop(0.55, shade(m.c, 0.05)); g.addColorStop(1, shade(m.c, -0.5));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.ellipse(x + w / 2, y + h, w / 2, ry, 0, Math.PI, 0, true); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(m.c, 0.3); ctx.beginPath(); ctx.ellipse(x + w / 2, y, w / 2, ry, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = alpha(shade(m.c, -0.6), 0.5); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    if (o.label) txt(ctx, o.label, x + w / 2, y + h * 0.55, { color: m.t === 'metal' ? '#2b2416' : '#fff', size: o.labelSize || 10 });
  }
  // Жүк (гир) — жоғарыда ілгегі бар жезден жасалған цилиндр. (x, yHook) — ілгектің ұшы. Биіктігін қайтарады.
  function weight(ctx, x, yHook, grams, o) {
    o = o || {};
    var s = Math.cbrt(Math.max(10, grams) / 100);
    var w = 26 * s, h = 30 * s;
    ctx.save();
    ctx.strokeStyle = '#7a6a3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, yHook + 5, 5, Math.PI * 1.1, Math.PI * 2.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, yHook + 9); ctx.lineTo(x, yHook + 14); ctx.stroke();
    ctx.restore();
    cylinder(ctx, x - w / 2, yHook + 14, w, h, o.mat || 'brass', { shadow: false, label: o.label === undefined ? (grams >= 1000 ? (grams / 1000) + ' кг' : grams + ' г') : o.label, labelSize: Math.max(8, 9 * s) });
    return 14 + h + w * 0.16;
  }

  // ---------- серіппе ----------
  // Металл серіппе (x1,y1) → (x2,y2). Артқы орамдар күңгірт, алдыңғылары жарық — көлемді көрінеді.
  function spring(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    var n = o.coils || 12, R = o.r || 9, lead = o.lead === undefined ? 8 : o.lead;
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    var a = lead, b = L - lead, steps = n * 24;
    var color = o.color || '#9aa4ad';
    var P = function (t) { var s = a + (b - a) * t, ph = t * n * Math.PI * 2; return { x: x1 + ux * s + nx * R * Math.sin(ph), y: y1 + uy * s + ny * R * Math.sin(ph), front: Math.cos(ph) > 0 }; };
    ctx.save();
    ctx.lineCap = 'round';
    [false, true].forEach(function (front) {
      ctx.strokeStyle = front ? shade(color, 0.2) : shade(color, -0.45);
      ctx.lineWidth = (o.wire || 2.2) + (front ? 0.4 : 0);
      ctx.beginPath();
      var prev = null;
      for (var i = 0; i <= steps; i++) {
        var p = P(i / steps);
        if (p.front === front) { if (prev && prev.front === front) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
        prev = p;
      }
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (var j = 0; j <= steps; j++) { var q = P(j / steps); if (q.front) { if (j && P((j - 1) / steps).front) ctx.lineTo(q.x - nx * 0.6, q.y - ny * 0.6); else ctx.moveTo(q.x - nx * 0.6, q.y - ny * 0.6); } }
    ctx.stroke();
    ctx.strokeStyle = shade(color, -0.2); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ux * a, y1 + uy * a); ctx.moveTo(x1 + ux * b, y1 + uy * b); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  // ---------- өлшеу құралдары ----------
  // Мектептік динамометр (тік). (x, y) — жоғарғы сақинасы, len — корпус ұзындығы. Ілгектің координатасын қайтарады.
  function dynamometer(ctx, x, y, len, F, Fmax, o) {
    o = o || {};
    var w = o.w || 34, top = y + 12, scaleTop = top + 14, scaleLen = len - 34;
    var frac = Math.max(0, Math.min(1, F / Fmax));
    ctx.save();
    ctx.strokeStyle = '#8a9096'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y + 5, 6, 0, 7); ctx.stroke();
    // корпус (мөлдір пластик + ақ шкала)
    rr(ctx, x - w / 2, top, w, len, 7);
    var g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#cfd6db'); g.addColorStop(0.25, '#f6f8f9'); g.addColorStop(0.8, '#e2e7ea'); g.addColorStop(1, '#b6bfc6');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7f8a92'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#fbfbf6'; ctx.fillRect(x - w / 2 + 6, scaleTop - 6, w - 12, scaleLen + 12);
    var div = o.div || (Fmax <= 5 ? 0.1 : Fmax <= 10 ? 0.2 : Fmax <= 50 ? 1 : 2), big = o.big || (Fmax <= 5 ? 1 : Fmax <= 10 ? 1 : Fmax <= 50 ? 10 : 20);
    ctx.strokeStyle = '#222'; ctx.fillStyle = '#222';
    for (var v = 0; v <= Fmax + 1e-9; v += div) {
      var yy = scaleTop + v / Fmax * scaleLen, isBig = Math.abs(v / big - Math.round(v / big)) < 1e-6;
      ctx.lineWidth = isBig ? 1.2 : 0.7;
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, yy); ctx.lineTo(x - w / 2 + 6 + (isBig ? 9 : 5), yy); ctx.stroke();
      if (isBig) txt(ctx, String(Math.round(v * 10) / 10).replace('.', ','), x + 5, yy, { size: 8.5, mono: true, color: '#222', weight: '500' });
    }
    txt(ctx, 'Н', x + 5, scaleTop + scaleLen + 10, { size: 8, color: '#555' });
    // көрсеткіш
    var py = scaleTop + frac * scaleLen;
    ctx.fillStyle = '#d23a2a'; ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, py); ctx.lineTo(x - w / 2 + 16, py - 3.5); ctx.lineTo(x - w / 2 + 16, py + 3.5); ctx.closePath(); ctx.fill();
    // шток пен ілгек
    var rodTop = top + len, hookY = rodTop + 10 + frac * 22;
    ctx.strokeStyle = '#8a9096'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x, rodTop - 4); ctx.lineTo(x, hookY); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 4, hookY + 4, 4.5, Math.PI, Math.PI * 2.6); ctx.stroke();
    ctx.restore();
    return { x: x + 4, y: hookY + 9 };
  }
  // Мензурка/өлшеуіш цилиндр. (x, y) — жоғарғы сол бұрыш, w × h — шыны түтік. Мл → y түрлендіргішін қайтарады.
  function cylinderGlass(ctx, x, y, w, h, o) {
    o = o || {};
    var max = o.max || 200, ml = o.ml || 0, step = o.step || 2, big = o.big || 20, base = y + h;
    var Y = function (v) { return base - 6 - (v / max) * (h - 16); };
    ctx.save();
    // табаны
    ctx.fillStyle = 'rgba(160,200,220,.5)'; rr(ctx, x - 10, base - 2, w + 20, 8, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(80,120,140,.6)'; ctx.lineWidth = 1; ctx.stroke();
    // шыны
    var gl = ctx.createLinearGradient(x, 0, x + w, 0);
    gl.addColorStop(0, 'rgba(200,230,245,.35)'); gl.addColorStop(0.15, 'rgba(255,255,255,.55)'); gl.addColorStop(0.5, 'rgba(220,240,250,.12)'); gl.addColorStop(1, 'rgba(160,200,220,.4)');
    ctx.fillStyle = gl; ctx.fillRect(x, y, w, h);
    // сұйық
    if (ml > 0) liquid(ctx, x + 2, Y(ml), w - 4, base - 6 - Y(ml) + 4, o.liquid || 'water', o.wave);
    // шкала
    ctx.strokeStyle = o.scaleColor || '#1d2a33'; ctx.fillStyle = o.scaleColor || '#1d2a33';
    for (var v = 0; v <= max + 1e-9; v += step) {
      var yy = Y(v), isBig = Math.abs(v % big) < 1e-9, mid = Math.abs(v % (big / 2)) < 1e-9;
      ctx.lineWidth = isBig ? 1.1 : 0.7;
      ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x + 4 + (isBig ? w * 0.38 : mid ? w * 0.26 : w * 0.16), yy); ctx.stroke();
      if (isBig && v > 0) txt(ctx, String(v), x + 6 + w * 0.42, yy, { size: 9, mono: true, align: 'left', color: o.scaleColor || '#1d2a33', weight: '600' });
    }
    if (o.unit !== false) txt(ctx, o.unit || 'мл', x + w + 14, y + 2, { size: 9.5, color: '#33424c' });
    // шыны жиектері мен шағылыс
    ctx.strokeStyle = 'rgba(90,130,150,.75)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x, y); ctx.lineTo(x, base); ctx.lineTo(x + w, base); ctx.lineTo(x + w, y); ctx.lineTo(x + w + 4, y - 4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x + w * 0.78, y + 8, 3, h - 20);
    ctx.restore();
    return Y;
  }
  // Сұйық беті: мениск пен түс градиенті. kind: water | oil | mercury | alcohol | milk | honey | ink, немесе түс
  var LIQ = {
    water: ['rgba(120,180,235,.55)', 'rgba(70,140,210,.7)'], oil: ['rgba(235,200,90,.75)', 'rgba(200,150,40,.85)'],
    mercury: ['#d9dee3', '#8e979f'], alcohol: ['rgba(200,225,240,.5)', 'rgba(150,190,220,.6)'], milk: ['#f6f4ee', '#e2ddd0'],
    honey: ['rgba(230,160,40,.85)', 'rgba(180,100,20,.9)'], ink: ['rgba(60,70,170,.75)', 'rgba(30,30,110,.85)'], saltwater: ['rgba(110,175,215,.6)', 'rgba(60,125,190,.75)'],
    kerosene: ['rgba(240,225,170,.55)', 'rgba(210,190,120,.65)'],
  };
  function liquid(ctx, x, y, w, h, kind, wave) {
    var c = LIQ[kind] || [alpha(kind, 0.55), alpha(shade(kind, -0.3), 0.75)];
    ctx.save();
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    var mercury = kind === 'mercury';
    ctx.moveTo(x, y + (mercury ? 3 : -2));
    if (wave) for (var i = 0; i <= 12; i++) ctx.lineTo(x + w * i / 12, y + Math.sin(i * 1.3 + wave) * 1.5);
    else ctx.quadraticCurveTo(x + w / 2, y + (mercury ? -3 : 3), x + w, y + (mercury ? 3 : -2));
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = mercury ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y + (mercury ? 3 : -2)); ctx.quadraticCurveTo(x + w / 2, y + (mercury ? -3 : 3), x + w, y + (mercury ? 3 : -2)); ctx.stroke();
    ctx.restore();
  }
  // Ашық ыдыс (стақан, аквариум): шыны қабырғалар, ішінде сұйық. (x, y) — жоғарғы сол бұрыш.
  function vessel(ctx, x, y, w, h, level, o) {
    o = o || {};
    ctx.save();
    shadow(ctx, x + w / 2, y + h + 2, w * 1.1, 0.6);
    var gl = ctx.createLinearGradient(x, 0, x + w, 0);
    gl.addColorStop(0, 'rgba(200,230,245,.32)'); gl.addColorStop(0.1, 'rgba(255,255,255,.4)'); gl.addColorStop(0.5, 'rgba(220,240,250,.1)'); gl.addColorStop(1, 'rgba(160,200,220,.35)');
    ctx.fillStyle = gl; ctx.fillRect(x, y, w, h);
    if (level > 0) liquid(ctx, x + 2, y + h - level, w - 4, level - 2, o.liquid || 'water', o.wave);
    ctx.strokeStyle = 'rgba(90,130,150,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 4, y + 6, 3, h - 12);
    ctx.restore();
  }
  // Сызғыш (ағаш). (x, y) — сол жақ шеті, len — пиксель ұзындығы, pxPerCm — 1 см пикселі. vertical — тік.
  function ruler(ctx, x, y, len, pxPerCm, o) {
    o = o || {};
    var th = o.width || 26;
    ctx.save();
    ctx.translate(x, y);
    if (o.vertical) ctx.rotate(Math.PI / 2);
    shadow(ctx, len / 2, th + 2, len * 1.02, 0.35);
    rr(ctx, 0, 0, len, th, 3);
    ctx.save(); ctx.clip(); fillTex(ctx, woodTex(o.tone || '#e2c68f'), 0, 0, len, th); ctx.restore();
    ctx.strokeStyle = 'rgba(90,60,20,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#2a2016'; ctx.fillStyle = '#2a2016';
    var mm = pxPerCm / 10, n = Math.floor((len - 8) / mm);
    for (var i = 0; i <= n; i++) {
      var px = 4 + i * mm, isCm = i % 10 === 0, half = i % 5 === 0;
      if (pxPerCm < 18 && !isCm && !half) continue;
      ctx.lineWidth = isCm ? 1 : 0.6;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, isCm ? th * 0.45 : half ? th * 0.32 : th * 0.2); ctx.stroke();
      var every = pxPerCm < 9 ? 10 : pxPerCm < 16 ? 5 : 1; // ұсақ масштабта әр 5 (10) см сайын жазамыз
      if (isCm && (i / 10) % every === 0) {
        if (o.vertical) { ctx.save(); ctx.translate(px, th * 0.72); ctx.rotate(-Math.PI / 2); txt(ctx, String((o.from || 0) + i / 10), 0, 0, { size: 8.5, mono: true, color: '#2a2016', weight: '500' }); ctx.restore(); }
        else txt(ctx, String((o.from || 0) + i / 10), px, th * 0.72, { size: 8.5, mono: true, color: '#2a2016', weight: '500' });
      }
    }
    ctx.restore();
  }
  // Сұйықтық термометрі (тік). (x, y) — жоғарғы ұшы, h — ұзындығы. t — температура.
  function thermometer(ctx, x, y, h, t, tmin, tmax, o) {
    o = o || {};
    var bulbR = 8, top = y + 6, bot = y + h - bulbR * 2;
    var Y = function (v) { return bot - (v - tmin) / (tmax - tmin) * (bot - top - 8); };
    var col = o.mercury ? '#9aa3ab' : '#d8322a';
    ctx.save();
    // тақта
    rr(ctx, x - 16, y - 6, 46, h + 10, 6);
    ctx.fillStyle = o.board || '#f7f5ee'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke();
    // түтік
    rr(ctx, x - 3.5, top, 7, bot - top + 4, 3.5);
    ctx.fillStyle = 'rgba(220,235,240,.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,150,160,.8)'; ctx.stroke();
    var ty = Math.max(top + 2, Math.min(bot, Y(t)));
    ctx.fillStyle = col; ctx.fillRect(x - 1.6, ty, 3.2, bot - ty + 4);
    sphere(ctx, x, bot + bulbR - 1, bulbR, col);
    // шкала
    var step = o.step || niceStep(tmax - tmin, 10), minor = step / 5;
    ctx.strokeStyle = '#222';
    for (var v = Math.ceil(tmin / minor) * minor; v <= tmax + 1e-9; v += minor) {
      var yy = Y(v), isBig = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      ctx.lineWidth = isBig ? 1 : 0.6;
      ctx.beginPath(); ctx.moveTo(x + 6, yy); ctx.lineTo(x + (isBig ? 13 : 9), yy); ctx.stroke();
      if (isBig) txt(ctx, String(Math.round(v)), x + 22, yy, { size: 8.5, mono: true, color: '#222', weight: '500' });
    }
    txt(ctx, o.unit || '°C', x - 9, top + 4, { size: 8.5, color: '#444' });
    ctx.restore();
    return Y;
  }
  function niceStep(range, count) {
    var raw = range / Math.max(1, count), p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }
  // Стрелкалы электр өлшеуіш құрал (амперметр «A», вольтметр «V»). (x, y) — центр, r — өлшемі.
  function meter(ctx, x, y, r, value, max, o) {
    o = o || {};
    var letter = o.letter || 'A';
    ctx.save();
    shadow(ctx, x, y + r * 0.95, r * 2.2, 0.5);
    rr(ctx, x - r, y - r * 0.85, r * 2, r * 1.75, r * 0.18);
    var g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, '#3a4148'); g.addColorStop(1, '#1f2428');
    ctx.fillStyle = g; ctx.fill();
    rr(ctx, x - r * 0.86, y - r * 0.72, r * 1.72, r * 1.08, r * 0.1);
    ctx.fillStyle = '#f8f6ee'; ctx.fill();
    var cx = x, cy = y + r * 0.22, R = r * 0.78, a0 = Math.PI * 1.18, a1 = Math.PI * 1.82;
    var step = o.step || niceStep(max, 5), minor = step / 5;
    // Сандар бір-біріне жабыспауы үшін: қаріп өлшемі мен әр нешінші белгіге сан жазылатыны доғаның ұзындығына қарай таңдалады.
    var fs = Math.max(7, Math.min(12, r * 0.16)), rl = R * 0.7, nBig = Math.max(1, Math.round(max / step));
    var chars = Math.max(fmtShort(max).length, fmtShort(step).length), every = 1;
    while (rl * (a1 - a0) / nBig * every < fs * 0.62 * chars + 3 && every < nBig) every++;
    var tick = Math.max(3, Math.min(8, R * 0.22));
    ctx.strokeStyle = '#222';
    for (var v = 0; v <= max + 1e-9; v += minor) {
      var a = a0 + (a1 - a0) * v / max, isBig = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      ctx.lineWidth = isBig ? 1.2 : 0.6;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * (R - (isBig ? tick : tick / 2)), cy + Math.sin(a) * (R - (isBig ? tick : tick / 2))); ctx.stroke();
      var bi = Math.round(v / step);
      if (isBig && (bi % every === 0 || bi === nBig)) txt(ctx, fmtShort(v), cx + Math.cos(a) * rl, cy + Math.sin(a) * rl, { size: fs, mono: true, color: '#222', weight: '500' });
    }
    txt(ctx, letter, cx, cy - R * 0.24, { size: Math.max(8, r * 0.24), color: '#222', weight: '700' });
    var frac = Math.max(-0.03, Math.min(1.05, value / max)), an = a0 + (a1 - a0) * frac;
    ctx.strokeStyle = '#c62f22'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * (R - 2), cy + Math.sin(an) * (R - 2)); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();
    // клеммалар
    [[-0.55, '#c62f22', '+'], [0.55, '#1d1f22', '−']].forEach(function (k) {
      sphere(ctx, x + k[0] * r, y + r * 0.62, r * 0.12, k[1]);
      txt(ctx, k[2], x + k[0] * r + (k[0] < 0 ? -r * 0.22 : r * 0.22), y + r * 0.62, { size: r * 0.18, color: '#ddd' });
    });
    ctx.restore();
    return { plus: { x: x - 0.55 * r, y: y + r * 0.62 }, minus: { x: x + 0.55 * r, y: y + r * 0.62 } };
  }
  function fmtShort(v) { return (Math.round(v * 100) / 100).toString().replace('.', ','); }
  // Сандық табло (электронды таразы, секундомер)
  function lcd(ctx, x, y, w, h, s, o) {
    o = o || {};
    ctx.save();
    rr(ctx, x, y, w, h, 4); ctx.fillStyle = '#26302a'; ctx.fill();
    rr(ctx, x + 3, y + 3, w - 6, h - 6, 3); ctx.fillStyle = o.bg || '#b8d0a0'; ctx.fill();
    txt(ctx, s, x + w - 8, y + h / 2 + 1, { size: o.size || Math.min(h * 0.62, 18), mono: true, align: 'right', color: '#1d2a18', weight: '600' });
    ctx.restore();
  }
  // Электронды таразы. (x, y) — табақтың үсті, w — ені. Табақтың бетінің y-ін қайтарады.
  function digitalScale(ctx, x, y, w, grams, o) {
    o = o || {};
    ctx.save();
    shadow(ctx, x + w / 2, y + 44, w * 1.1, 0.6);
    rr(ctx, x, y + 6, w, 36, 6);
    var g = ctx.createLinearGradient(0, y + 6, 0, y + 42); g.addColorStop(0, '#e8ebee'); g.addColorStop(1, '#aeb6bd');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7d878f'; ctx.lineWidth = 1; ctx.stroke();
    // табақ
    rr(ctx, x + w * 0.12, y, w * 0.76, 7, 3);
    var p = ctx.createLinearGradient(0, y, 0, y + 7); p.addColorStop(0, '#f4f6f7'); p.addColorStop(1, '#9aa3ab');
    ctx.fillStyle = p; ctx.fill();
    lcd(ctx, x + w * 0.2, y + 14, w * 0.6, 22, (o.text !== undefined ? o.text : fmtShort(Math.round(grams * 10) / 10) + ' г'));
    ctx.restore();
    return y;
  }

  // ---------- электр ----------
  // Оқшауланған сым: pts = [[x, y], ...]. phase берілсе — ток бағытымен жылжитын электрондар (сары нүктелер).
  function wire(ctx, pts, o) {
    o = o || {};
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var path = function () { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
    path(); ctx.strokeStyle = shade(o.color || '#c0392b', -0.45); ctx.lineWidth = (o.w || 4) + 1.6; ctx.stroke();
    path(); ctx.strokeStyle = o.color || '#c0392b'; ctx.lineWidth = o.w || 4; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
    if (o.phase !== undefined && o.current) {
      var total = 0, seg = [];
      for (var i = 1; i < pts.length; i++) { var L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(L); total += L; }
      var gap = 22, off = ((o.phase % gap) + gap) % gap;
      ctx.fillStyle = 'rgba(255,230,90,.95)';
      for (var d = off; d < total; d += gap) {
        var acc = 0;
        for (var k = 0; k < seg.length; k++) {
          if (d <= acc + seg[k]) { var t = (d - acc) / seg[k]; ctx.beginPath(); ctx.arc(pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t, 2.2, 0, 7); ctx.fill(); break; }
          acc += seg[k];
        }
      }
    }
    ctx.restore();
  }
  // Батарея (гальваникалық элемент). (x, y) — сол жақ шеті (минус), горизонталь. Клеммалар координатасын қайтарады.
  function battery(ctx, x, y, w, h, o) {
    o = o || {};
    ctx.save();
    shadow(ctx, x + w / 2, y + h + 2, w * 1.05, 0.5);
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#3b3f45'); g.addColorStop(0.3, '#6b7178'); g.addColorStop(1, '#202327');
    rr(ctx, x, y, w * 0.72, h, h * 0.2); ctx.fillStyle = g; ctx.fill();
    var g2 = ctx.createLinearGradient(0, y, 0, y + h);
    g2.addColorStop(0, '#b0751a'); g2.addColorStop(0.3, '#f0b843'); g2.addColorStop(1, '#8a5a10');
    rr(ctx, x + w * 0.68, y, w * 0.3, h, h * 0.2); ctx.fillStyle = g2; ctx.fill();
    ctx.fillStyle = '#c9ced3'; ctx.fillRect(x + w * 0.98, y + h * 0.3, w * 0.03, h * 0.4);
    txt(ctx, o.label || '1,5 V', x + w * 0.36, y + h / 2, { size: Math.min(12, h * 0.4), color: '#f1f1f1' });
    txt(ctx, '+', x + w * 0.83, y + h / 2, { size: h * 0.45, color: '#3a2a08', weight: '700' });
    ctx.restore();
    return { minus: { x: x, y: y + h / 2 }, plus: { x: x + w * 1.01, y: y + h / 2 } };
  }
  // Қыздыру шамы. (x, y) — шыны колбаның центрі, r — радиусы, glow — 0…1 жарықтылық. Цоколь төменде.
  function bulb(ctx, x, y, r, glow, o) {
    o = o || {};
    glow = Math.max(0, Math.min(1, glow || 0));
    ctx.save();
    if (glow > 0.02) {
      var h = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * (2.2 + glow * 2.5));
      h.addColorStop(0, 'rgba(255,230,150,' + (0.55 * glow) + ')'); h.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = h; ctx.beginPath(); ctx.arc(x, y, r * (2.2 + glow * 2.5), 0, 7); ctx.fill();
    }
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, glow > 0.02 ? 'rgba(255,250,215,' + (0.5 + glow * 0.5) + ')' : 'rgba(255,255,255,.7)');
    g.addColorStop(1, glow > 0.02 ? 'rgba(255,205,90,' + (0.35 + glow * 0.5) + ')' : 'rgba(200,220,230,.35)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.72, Math.PI * 2.28); ctx.lineTo(x + r * 0.42, y + r * 1.2); ctx.lineTo(x - r * 0.42, y + r * 1.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,150,.7)'; ctx.lineWidth = 1; ctx.stroke();
    // қыл
    ctx.strokeStyle = glow > 0.05 ? 'rgb(255,' + Math.round(200 + 55 * glow) + ',' + Math.round(120 + 100 * glow) + ')' : '#6b5b4b';
    ctx.lineWidth = glow > 0.05 ? 1.6 : 1;
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + r * 1.1); ctx.lineTo(x - r * 0.3, y);
    for (var i = 0; i <= 6; i++) ctx.lineTo(x - r * 0.3 + i * r * 0.1, y + (i % 2 ? -r * 0.12 : 0));
    ctx.lineTo(x + r * 0.3, y + r * 1.1); ctx.stroke();
    // цоколь
    var b = ctx.createLinearGradient(x - r * 0.45, 0, x + r * 0.45, 0);
    b.addColorStop(0, '#8a8f94'); b.addColorStop(0.4, '#e3e6e8'); b.addColorStop(1, '#7c8185');
    ctx.fillStyle = b; ctx.fillRect(x - r * 0.45, y + r * 1.15, r * 0.9, r * 0.7);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 1.25 + k * r * 0.15); ctx.lineTo(x + r * 0.45, y + r * 1.3 + k * r * 0.15); ctx.stroke(); }
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x, y + r * 1.92, r * 0.16, 0, 7); ctx.fill();
    ctx.restore();
    return { a: { x: x - r * 0.45, y: y + r * 1.5 }, b: { x: x, y: y + r * 2.05 } };
  }
  // Резистор (түсті белдеулері бар керамикалық корпус). (x, y) — центр, горизонталь.
  function resistor(ctx, x, y, len, o) {
    o = o || {};
    var w = len * 0.62, h = Math.max(10, len * 0.2);
    ctx.save();
    ctx.strokeStyle = '#a6adb3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - len / 2, y); ctx.lineTo(x + len / 2, y); ctx.stroke();
    var g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, '#f0dcb4'); g.addColorStop(0.4, '#e2c690'); g.addColorStop(1, '#b8996a');
    rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = g; ctx.fill();
    (o.bands || ['#8a4b2a', '#111', '#c0392b', '#c9a24a']).forEach(function (c, i) {
      ctx.fillStyle = c; ctx.fillRect(x - w * 0.3 + i * w * (i === 3 ? 0.17 : 0.13), y - h / 2 + 1, w * 0.06, h - 2);
    });
    ctx.restore();
    if (o.label) txt(ctx, o.label, x, y - h / 2 - 9, { size: 10.5, color: o.labelColor || '#333' });
  }
  // Кілт (ажыратқыш): (x1, y) — (x2, y), on — тұйық.
  function knife(ctx, x1, x2, y, on) {
    ctx.save();
    shadow(ctx, (x1 + x2) / 2, y + 7, (x2 - x1) * 1.4, 0.4);
    ctx.fillStyle = '#2d3238'; rr(ctx, x1 - 8, y - 2, x2 - x1 + 16, 9, 3); ctx.fill();
    sphere(ctx, x1, y, 4.5, '#b7bec4'); sphere(ctx, x2, y, 4.5, '#b7bec4');
    var a = on ? 0 : -0.55;
    ctx.strokeStyle = '#c9cfd4'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + Math.cos(a) * (x2 - x1), y + Math.sin(a) * (x2 - x1)); ctx.stroke();
    sphere(ctx, x1 + Math.cos(a) * (x2 - x1) * 0.8, y + Math.sin(a) * (x2 - x1) * 0.8 - 5, 4, '#1f2328');
    ctx.restore();
  }

  // ---------- магнит ----------
  // Жолақ магнит: центрі (x, y), ұзындығы len, бұрышы ang (N — оң жақта).
  function magnet(ctx, x, y, len, ang, o) {
    o = o || {};
    var h = o.h || len * 0.24;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang || 0);
    shadow(ctx, 0, h * 0.75, len * 1.05, 0.4);
    [[-len / 2, '#2f6fbf', 'S'], [0, '#d23b2f', 'N']].forEach(function (p) {
      var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, shade(p[1], 0.35)); g.addColorStop(0.45, p[1]); g.addColorStop(1, shade(p[1], -0.4));
      ctx.fillStyle = g; ctx.fillRect(p[0], -h / 2, len / 2, h);
      txt(ctx, p[2], p[0] + len / 4, 1, { size: h * 0.55, color: '#fff', weight: '700' });
    });
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(-len / 2, -h / 2, len, h);
    ctx.restore();
  }
  // Компас: центрі (x, y), радиусы r, тілшенің бұрышы ang (солтүстік ұшы — қызыл).
  function compass(ctx, x, y, r, ang) {
    ctx.save();
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#fbfbf8'); g.addColorStop(1, '#d8d6cc');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8b6b2c'; ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.stroke();
    ctx.translate(x, y); ctx.rotate(ang || 0);
    ctx.fillStyle = '#d2382b'; ctx.beginPath(); ctx.moveTo(r * 0.82, 0); ctx.lineTo(0, -r * 0.18); ctx.lineTo(0, r * 0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2e3b4a'; ctx.beginPath(); ctx.moveTo(-r * 0.82, 0); ctx.lineTo(0, -r * 0.18); ctx.lineTo(0, r * 0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c8a24a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ---------- жылу ----------
  // Спирт шамы: (x, y) — білтенің ұшы. t — уақыт (жалынның дірілі үшін), on — жанып тұр ма.
  function burner(ctx, x, y, t, on, o) {
    o = o || {};
    var s = o.size || 1;
    ctx.save();
    shadow(ctx, x, y + 46 * s, 70 * s, 0.5);
    // шыны ыдыс
    var g = ctx.createRadialGradient(x - 10 * s, y + 22 * s, 4, x, y + 28 * s, 30 * s);
    g.addColorStop(0, 'rgba(235,245,250,.9)'); g.addColorStop(1, 'rgba(150,190,205,.75)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + 28 * s, 30 * s, 18 * s, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(80,110,125,.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(160,200,230,.55)'; ctx.beginPath(); ctx.ellipse(x, y + 34 * s, 26 * s, 10 * s, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#9aa1a7'; ctx.fillRect(x - 6 * s, y + 4 * s, 12 * s, 8 * s);
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 7 * s);
    if (on) flame(ctx, x, y - 2 * s, 34 * s * (o.power || 1), t);
    ctx.restore();
  }
  function flame(ctx, x, y, h, t) {
    t = t || 0;
    var fl = 1 + Math.sin(t * 17) * 0.05 + Math.sin(t * 29) * 0.04, w = h * 0.36;
    ctx.save();
    var halo = ctx.createRadialGradient(x, y - h * 0.4, 2, x, y - h * 0.4, h * 1.4);
    halo.addColorStop(0, 'rgba(255,190,90,.35)'); halo.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y - h * 0.4, h * 1.4, 0, 7); ctx.fill();
    [[1, 'rgba(255,150,40,.85)'], [0.7, 'rgba(255,215,90,.95)'], [0.38, 'rgba(120,170,255,.9)']].forEach(function (L) {
      var hh = h * L[0] * fl, ww = w * L[0];
      ctx.fillStyle = L[1];
      ctx.beginPath(); ctx.moveTo(x, y - hh);
      ctx.bezierCurveTo(x + ww * 0.9, y - hh * 0.5, x + ww, y, x, y + 2);
      ctx.bezierCurveTo(x - ww, y, x - ww * 0.9, y - hh * 0.5, x, y - hh); ctx.fill();
    });
    ctx.restore();
  }

  // ---------- көлік ----------
  // Жеңіл көлік (бүйірінен). (x, yGround) — көліктің ортасы мен жол деңгейі, w — ұзындығы, dist — жүрген жолы (дөңгелек айналады).
  function car(ctx, x, yGround, w, color, dist, o) {
    o = o || {};
    var h = w * 0.3, r = w * 0.11, dir = o.flip ? -1 : 1;
    ctx.save();
    ctx.translate(x, yGround); ctx.scale(dir, 1);
    shadow(ctx, 0, 0, w * 1.05, 0.5);
    var body = ctx.createLinearGradient(0, -h - r, 0, -r * 0.3);
    body.addColorStop(0, shade(color, 0.35)); body.addColorStop(0.5, color); body.addColorStop(1, shade(color, -0.35));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -r * 0.6); ctx.lineTo(-w / 2, -h * 0.75); ctx.quadraticCurveTo(-w / 2, -h, -w * 0.4, -h);
    ctx.lineTo(-w * 0.28, -h); ctx.lineTo(-w * 0.16, -h * 1.55); ctx.lineTo(w * 0.17, -h * 1.55); ctx.lineTo(w * 0.32, -h);
    ctx.lineTo(w * 0.44, -h * 0.92); ctx.quadraticCurveTo(w / 2, -h * 0.85, w / 2, -h * 0.55); ctx.lineTo(w / 2, -r * 0.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(color, -0.55); ctx.lineWidth = 1; ctx.stroke();
    // терезелер
    ctx.fillStyle = 'rgba(170,215,240,.9)';
    ctx.beginPath(); ctx.moveTo(-w * 0.24, -h * 1.02); ctx.lineTo(-w * 0.14, -h * 1.45); ctx.lineTo(-w * 0.01, -h * 1.45); ctx.lineTo(-w * 0.01, -h * 1.02); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.02, -h * 1.02); ctx.lineTo(w * 0.02, -h * 1.45); ctx.lineTo(w * 0.15, -h * 1.45); ctx.lineTo(w * 0.27, -h * 1.02); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(w * 0.46, -h * 0.8, w * 0.04, h * 0.14);
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-w / 2, -h * 0.8, w * 0.03, h * 0.14);
    [-w * 0.3, w * 0.3].forEach(function (wx) { wheel(ctx, wx, -r, r, (dist || 0) / r); });
    ctx.restore();
  }
  function wheel(ctx, x, y, r, ang) {
    ctx.save();
    ctx.fillStyle = '#1d1f22'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    var g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 1, x, y, r * 0.6);
    g.addColorStop(0, '#eef1f3'); g.addColorStop(1, '#8a9399');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.58, 0, 7); ctx.fill();
    ctx.strokeStyle = '#59616a'; ctx.lineWidth = 1.5;
    for (var i = 0; i < 5; i++) { var a = ang + i * Math.PI * 2 / 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- аспан денелері ----------
  var PLANET = {
    sun: ['#fff3b0', '#ffb22e'], mercury: ['#c9c2b8', '#7d766c'], venus: ['#f3e1b5', '#c49a5a'], earth: ['#8fd0ff', '#1f5fa8'],
    moon: ['#e6e6e2', '#8b8b86'], mars: ['#f0a070', '#a8452a'], jupiter: ['#f1d8b0', '#b98a5a'], saturn: ['#f3e2b8', '#c4a26a'],
    uranus: ['#c9f1f3', '#5fb3c4'], neptune: ['#8fb0ff', '#2c4ab8'],
  };
  function planet(ctx, x, y, r, kind, o) {
    o = o || {};
    var c = PLANET[kind] || [shade(kind, 0.5), kind];
    ctx.save();
    if (kind === 'sun') {
      var halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
      halo.addColorStop(0, 'rgba(255,200,80,.6)'); halo.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, 7); ctx.fill();
    }
    if (kind === 'saturn') { ctx.strokeStyle = 'rgba(220,200,150,.85)'; ctx.lineWidth = Math.max(1.5, r * 0.25); ctx.beginPath(); ctx.ellipse(x, y, r * 2, r * 0.55, -0.35, Math.PI, Math.PI * 2); ctx.stroke(); }
    var lx = o.light === undefined ? -1 : Math.cos(o.light), ly = o.light === undefined ? -1 : Math.sin(o.light);
    var g = ctx.createRadialGradient(x + lx * r * 0.4, y + ly * r * 0.4, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, c[0]); g.addColorStop(kind === 'sun' ? 1 : 0.7, c[1]); if (kind !== 'sun') g.addColorStop(1, shade(c[1], -0.6));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (kind === 'earth' && r > 6) { // құрлықтар
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
      ctx.fillStyle = 'rgba(80,160,80,.75)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.15, r * 0.35, r * 0.22, 0.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + r * 0.35, y + r * 0.3, r * 0.22, r * 0.3, -0.3, 0, 7); ctx.fill();
      ctx.restore();
    }
    if (kind === 'jupiter' && r > 5) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.fillStyle = 'rgba(160,100,60,.35)'; for (var b = -2; b <= 2; b++) ctx.fillRect(x - r, y + b * r * 0.32 - r * 0.07, r * 2, r * 0.13); ctx.restore(); }
    if (kind === 'saturn') { ctx.strokeStyle = 'rgba(220,200,150,.9)'; ctx.lineWidth = Math.max(1.5, r * 0.25); ctx.beginPath(); ctx.ellipse(x, y, r * 2, r * 0.55, -0.35, 0, Math.PI); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- жазулар ----------
  // Сахнадағы жазу: жартылай мөлдір «тақтайша» (кез келген фонда оқылады).
  function tag(ctx, s, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || '600') + ' ' + (o.size || 12) + 'px ' + (o.mono ? MONO : FONT);
    var w = ctx.measureText(s).width + 12, h = (o.size || 12) + 9;
    var bx = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    rr(ctx, bx, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || 'rgba(255,255,255,.88)'; ctx.fill();
    ctx.strokeStyle = o.border || 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    txt(ctx, s, bx + w / 2, y + 0.5, { size: o.size || 12, mono: o.mono, color: o.color || '#1b2329', weight: o.weight || '600' });
  }
  // Күш векторы: қалың, көлеңкесі бар нұсқар.
  function force(ctx, x1, y1, x2, y2, color, label) {
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 3) return;
    var a = Math.atan2(y2 - y1, x2 - x1), hw = 11;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hw * 0.8, y2 - Math.sin(a) * hw * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hw * Math.cos(a - 0.4), y2 - hw * Math.sin(a - 0.4)); ctx.lineTo(x2 - hw * Math.cos(a + 0.4), y2 - hw * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (label) tag(ctx, label, x2 + Math.cos(a) * 16, y2 + Math.sin(a) * 16, { color: color, size: 11.5 });
  }

  window.Real = {
    MAT: MAT, LIQ: LIQ, shade: shade, alpha: alpha, rr: rr, txt: txt, isDark: isDark, rng: rng,
    scene: scene, tableTop: tableTop, stars: stars, sun: sun, cloud: cloud, tree: tree,
    shadow: shadow, block: block, sphere: sphere, cylinder: cylinder, weight: weight, spring: spring, paintFace: paintFace,
    dynamometer: dynamometer, cylinderGlass: cylinderGlass, liquid: liquid, vessel: vessel, ruler: ruler, thermometer: thermometer,
    meter: meter, lcd: lcd, digitalScale: digitalScale,
    wire: wire, battery: battery, bulb: bulb, resistor: resistor, knife: knife,
    magnet: magnet, compass: compass, burner: burner, flame: flame, car: car, wheel: wheel, planet: planet,
    tag: tag, force: force,
  };
})();

/* Симуляцияларға ортақ қозғалтқыш: canvas, басқару элементтері, өлшеулер, анимация, графиктер. */
(function () {
  'use strict';

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  var C = {};
  function refreshColors() {
    C.bg = css('--surface'); C.bg2 = css('--surface-2'); C.sunken = css('--sunken');
    C.ink = css('--ink'); C.muted = css('--muted'); C.line = css('--line'); C.soft = css('--line-soft');
    C.accent = css('--accent'); C.accentSoft = css('--accent-soft'); C.brass = css('--brass');
    C.good = css('--good'); C.bad = css('--bad');
    C.blue = css('--f-mech'); C.orange = css('--f-therm'); C.purple = css('--f-em'); C.teal = css('--f-wave'); C.red = css('--f-modern');
  }
  refreshColors();

  var SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  // Санды қазақша пішімдеу: үтір, үлкен/кіші сандар үшін 10-ның дәрежесі.
  function fmt(x, d) {
    if (d === undefined) d = 2;
    if (x === null || x === undefined || !isFinite(x)) return '—';
    var a = Math.abs(x);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) {
      var e = Math.floor(Math.log10(a));
      var m = x / Math.pow(10, e);
      var ms = m.toFixed(2).replace('.', ',');
      if (ms === '10,00' || ms === '-10,00') { e++; ms = (m / 10).toFixed(2).replace('.', ','); }
      return ms + '·10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
    }
    var s = x.toFixed(d);
    if (/^-0[.,]?0*$/.test(s)) s = s.slice(1);
    return s.replace('.', ',');
  }

  // Түсті ақпен араластыру (#rgb, #rrggbb, rgb()) — көлемді шарлар үшін.
  function lighten(color, k) {
    var c = String(color).trim(), r, g, b, m;
    if ((m = c.match(/^#([0-9a-f]{3})$/i))) { r = parseInt(m[1][0] + m[1][0], 16); g = parseInt(m[1][1] + m[1][1], 16); b = parseInt(m[1][2] + m[1][2], 16); }
    else if ((m = c.match(/^#([0-9a-f]{6})$/i))) { r = parseInt(m[1].slice(0, 2), 16); g = parseInt(m[1].slice(2, 4), 16); b = parseInt(m[1].slice(4, 6), 16); }
    else if ((m = c.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i))) { r = +m[1]; g = +m[2]; b = +m[3]; }
    else return null;
    return 'rgb(' + Math.round(r + (255 - r) * k) + ',' + Math.round(g + (255 - g) * k) + ',' + Math.round(b + (255 - b) * k) + ')';
  }

  function niceStep(range, count) {
    var raw = range / Math.max(1, count);
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }

  // ---------- сурет салу көмекшілері ----------
  var D = {
    text: function (ctx, s, x, y, o) {
      o = o || {};
      ctx.save();
      ctx.fillStyle = o.color || C.ink;
      ctx.font = (o.weight || '500') + ' ' + (o.size || 12) + 'px ' + (o.mono ? '"IBM Plex Mono", monospace' : '"IBM Plex Sans", system-ui, sans-serif');
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'alphabetic';
      if (o.bg) {
        var w = ctx.measureText(s).width;
        var bx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
        ctx.fillStyle = o.bg;
        ctx.fillRect(bx - 3, y - (o.size || 12) + 1, w + 6, (o.size || 12) + 5);
        ctx.fillStyle = o.color || C.ink;
      }
      ctx.fillText(s, x, y);
      ctx.restore();
    },
    line: function (ctx, x1, y1, x2, y2, color, width, dash) {
      ctx.save();
      ctx.strokeStyle = color || C.ink;
      ctx.lineWidth = width || 1.5;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    },
    arrow: function (ctx, x1, y1, x2, y2, color, width, label) {
      var len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 2) return;
      var ang = Math.atan2(y2 - y1, x2 - x1);
      var hw = Math.min(10, 4 + (width || 2) * 2);
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle = color || C.ink;
      ctx.lineWidth = width || 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(ang) * hw * 0.8, y2 - Math.sin(ang) * hw * 0.8); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hw * Math.cos(ang - 0.42), y2 - hw * Math.sin(ang - 0.42));
      ctx.lineTo(x2 - hw * Math.cos(ang + 0.42), y2 - hw * Math.sin(ang + 0.42));
      ctx.closePath(); ctx.fill();
      ctx.restore();
      if (label) D.text(ctx, label, x2 + 6 * Math.cos(ang) + 4, y2 + 6 * Math.sin(ang) + 4, { color: color, size: 12, weight: '600' });
    },
    // Денелер көлемді көрінуі үшін радиусы 7 px-тен үлкен шеңберлерге жарықтың шағылысы қосылады (flat = true болса — жазық).
    circle: function (ctx, x, y, r, fill, stroke, lw, flat) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      if (fill) {
        var lc = !flat && r >= 7 ? lighten(fill, 0.5) : null;
        if (lc) {
          var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
          g.addColorStop(0, lc); g.addColorStop(1, fill);
          ctx.fillStyle = g;
        } else ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
      ctx.restore();
    },
    // График: r = {x, y, w, h}; o = {xmin, xmax, ymin, ymax, xlabel, ylabel, series: [{pts, color, dash, width}], marker: [x, y]}
    plot: function (ctx, r, o) {
      ctx.save();
      ctx.fillStyle = C.bg2;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      var X = function (v) { return r.x + (v - o.xmin) / (o.xmax - o.xmin) * r.w; };
      var Y = function (v) { return r.y + r.h - (v - o.ymin) / (o.ymax - o.ymin) * r.h; };
      var sx = niceStep(o.xmax - o.xmin, Math.max(2, Math.floor(r.w / 70)));
      var sy = niceStep(o.ymax - o.ymin, Math.max(2, Math.floor(r.h / 40)));
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillStyle = C.muted;
      for (var gx = Math.ceil(o.xmin / sx) * sx; gx <= o.xmax + 1e-9; gx += sx) {
        var px = X(gx);
        ctx.strokeStyle = C.soft; ctx.beginPath(); ctx.moveTo(px, r.y); ctx.lineTo(px, r.y + r.h); ctx.stroke();
        ctx.textAlign = 'center'; ctx.fillText(fmt(Math.abs(gx) < sx * 1e-6 ? 0 : gx, sx < 1 ? 1 : 0), px, r.y + r.h + 12);
      }
      for (var gy = Math.ceil(o.ymin / sy) * sy; gy <= o.ymax + 1e-9; gy += sy) {
        var py = Y(gy);
        ctx.strokeStyle = C.soft; ctx.beginPath(); ctx.moveTo(r.x, py); ctx.lineTo(r.x + r.w, py); ctx.stroke();
        ctx.textAlign = 'right'; ctx.fillText(fmt(Math.abs(gy) < sy * 1e-6 ? 0 : gy, sy < 1 ? 1 : 0), r.x - 4, py + 3);
      }
      if (o.ymin < 0 && o.ymax > 0) { ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(r.x, Y(0)); ctx.lineTo(r.x + r.w, Y(0)); ctx.stroke(); }
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      (o.series || []).forEach(function (s) {
        if (!s.pts || s.pts.length < 2) return;
        ctx.strokeStyle = s.color || C.accent; ctx.lineWidth = s.width || 2;
        ctx.setLineDash(s.dash || []);
        ctx.beginPath();
        s.pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); });
        ctx.stroke();
        ctx.setLineDash([]);
      });
      if (o.marker) D.circle(ctx, X(o.marker[0]), Y(o.marker[1]), 4, o.markerColor || C.bad);
      ctx.restore();
      if (o.xlabel) D.text(ctx, o.xlabel, r.x + r.w, r.y + r.h + 24, { color: C.muted, size: 11, align: 'right' });
      if (o.ylabel) D.text(ctx, o.ylabel, r.x + 4, r.y - 6, { color: C.muted, size: 11 });
      return { X: X, Y: Y };
    },
  };

  // ---------- негізгі конструктор ----------
  function create(o) {
    var canvas = document.getElementById('simCanvas');
    var ctx = canvas.getContext('2d');
    var playBtn = document.getElementById('simPlay');
    var resetBtn = document.getElementById('simReset');
    var hint = document.getElementById('simHint');
    var controlsBox = document.getElementById('simControls');
    var readBox = document.getElementById('simReadouts');
    var P = {};          // параметрлер
    var S = {};          // күй
    var W = 0, H = 0, running = false, last = 0, readT = 0;
    var api = { P: P, S: S, C: C, D: D, fmt: fmt, ctx: ctx, canvas: canvas };

    // параметрлер
    var inputs = {};
    (o.controls || []).forEach(function (c) {
      P[c.key] = c.value;
      var wrap = document.createElement('label');
      wrap.className = 'ctl ctl-' + c.type;
      if (c.type === 'range') {
        wrap.innerHTML = '<span class="ctl-h"><span>' + c.label + '</span><b class="mono"></b></span><input type="range">';
        var inp = wrap.querySelector('input');
        inp.min = c.min; inp.max = c.max; inp.step = c.step; inp.value = c.value;
        var out = wrap.querySelector('b');
        var show = function () { out.textContent = (c.format ? c.format(P[c.key]) : fmt(P[c.key], c.digits === undefined ? 1 : c.digits)) + (c.unit ? ' ' + c.unit : ''); };
        show();
        inp.addEventListener('input', function () { P[c.key] = parseFloat(inp.value); show(); changed(c); });
        inputs[c.key] = { el: inp, show: show };
      } else if (c.type === 'select') {
        wrap.innerHTML = '<span class="ctl-h"><span>' + c.label + '</span></span><select></select>';
        var s = wrap.querySelector('select');
        c.options.forEach(function (opt) { var e = document.createElement('option'); e.value = opt[0]; e.textContent = opt[1]; s.appendChild(e); });
        s.value = c.value;
        s.addEventListener('change', function () { P[c.key] = s.value; changed(c); });
        inputs[c.key] = { el: s };
      } else if (c.type === 'check') {
        wrap.innerHTML = '<input type="checkbox"> <span>' + c.label + '</span>';
        var cb = wrap.querySelector('input');
        cb.checked = !!c.value;
        cb.addEventListener('change', function () { P[c.key] = cb.checked; changed(c); });
        inputs[c.key] = { el: cb };
      }
      controlsBox.appendChild(wrap);
    });
    (o.buttons || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn ghost sm'; btn.textContent = b.label;
      btn.addEventListener('click', function () { b.onClick(api); draw(); });
      controlsBox.appendChild(btn);
    });

    api.set = function (key, v) { P[key] = v; var i = inputs[key]; if (i) { if (i.el.type === 'checkbox') i.el.checked = !!v; else i.el.value = v; if (i.show) i.show(); } };

    // өлшеулер
    var rows = {};
    (o.readouts || []).forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'ro';
      row.innerHTML = '<span>' + r.label + '</span><b class="mono"></b>';
      readBox.appendChild(row);
      rows[r.key] = row.querySelector('b');
    });
    function updateReadouts() {
      if (!o.read) return;
      var vals = o.read(api) || {};
      (o.readouts || []).forEach(function (r) {
        var v = vals[r.key];
        rows[r.key].textContent = (typeof v === 'number' ? fmt(v, r.digits === undefined ? 2 : r.digits) : (v == null ? '—' : v)) + (r.unit && typeof v === 'number' ? ' ' + r.unit : '');
      });
    }

    function changed(c) {
      if (c.live || o.static) { if (o.onLive) o.onLive(api, c.key); }
      else reset();
      draw();
    }

    function resize() {
      var box = canvas.parentElement;
      var w = box.clientWidth;
      var maxH = document.fullscreenElement ? window.innerHeight - 90 : 560;
      var h = Math.round(Math.min(maxH, Math.max(260, w * (o.aspect || 0.62))));
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = w; H = h; api.W = W; api.H = H;
      if (o.onResize) o.onResize(api);
      draw();
    }

    // Фон: ақшыл тор (миллиметрлік қағаз сияқты). Өз фонын салатын симуляциялар оны жауып тастайды.
    function paintBg() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      if (o.grid === false) return;
      ctx.save();
      ctx.strokeStyle = C.soft; ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (var gx = 0.5; gx < W; gx += 24) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
      for (var gy = 0.5; gy < H; gy += 24) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
      ctx.stroke();
      ctx.restore();
    }
    function draw() {
      paintBg();
      o.draw(api, ctx, W, H);
      drawTools();
      updateReadouts();
    }
    api.draw = draw;

    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      var n = o.substeps || 1;
      for (var i = 0; i < n; i++) if (o.step(api, dt / n) === false) { pause(); break; }
      paintBg();
      o.draw(api, ctx, W, H);
      drawTools();
      if (t - readT > 100) { updateReadouts(); readT = t; tickStopwatch(); }
      requestAnimationFrame(frame);
    }
    function play() {
      if (running || o.static) return;
      running = true; last = performance.now();
      playBtn.querySelector('span').textContent = 'Тоқтату';
      playBtn.classList.add('ghost');
      requestAnimationFrame(frame);
    }
    function pause() {
      running = false;
      playBtn.querySelector('span').textContent = 'Бастау';
      playBtn.classList.remove('ghost');
      updateReadouts();
    }
    function reset() {
      var was = running;
      pause();
      for (var k in S) delete S[k];
      o.init(api);
      draw();
      if (was && o.keepRunning) play();
    }
    api.play = play; api.pause = pause; api.reset = reset;
    api.running = function () { return running; };

    playBtn.addEventListener('click', function () { if (running) pause(); else play(); });
    resetBtn.addEventListener('click', reset);
    if (o.static) { playBtn.hidden = true; if (o.resetLabel === false) resetBtn.hidden = true; }
    if (hint && o.hint) hint.textContent = o.hint;

    // Тінтуір/саусақ: алдымен өлшеу құралдарының тұтқалары, содан кейін симуляцияның өз өңдегіштері.
    var pos = function (e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    var down = false, toolDrag = null;
    if (o.pointer || (o.tools && o.tools.length)) {
      canvas.addEventListener('pointerdown', function (e) {
        var p = pos(e);
        canvas.setPointerCapture(e.pointerId);
        toolDrag = hitTool(p);
        if (toolDrag) { draw(); return; }
        down = true;
        if (o.pointer && o.pointer.down) o.pointer.down(api, p, e);
        draw();
      });
      canvas.addEventListener('pointermove', function (e) {
        var p = pos(e);
        if (toolDrag) { toolDrag.set(p); if (!running) draw(); return; }
        canvas.style.cursor = hitTool(p) ? 'grab' : '';
        if (o.pointer && o.pointer.move) { o.pointer.move(api, p, down, e); if (!running) draw(); }
      });
      canvas.addEventListener('pointerup', function (e) {
        if (toolDrag) { toolDrag = null; draw(); return; }
        down = false;
        if (o.pointer && o.pointer.up) o.pointer.up(api, pos(e), e);
        draw();
      });
      canvas.addEventListener('pointerleave', function () { if (o.pointer && o.pointer.leave) { o.pointer.leave(api); if (!running) draw(); } });
      updateTouch();
    }
    // Телефонда бетті айналдыру бұзылмауы үшін саусақ қимылын тек қажет кезде ғана ұстаймыз.
    function updateTouch() { canvas.style.touchAction = (o.pointer || (T && (T.ruler || T.angle))) ? 'none' : ''; }

    // ---------- өлшеу құралдары: сызғыш, бұрыш өлшегіш, секундомер ----------
    var T = { ruler: null, angle: null, sw: null };
    var toolsBox = document.getElementById('simTools');
    var tools = o.tools || [];
    function sc() { return o.scale ? o.scale(api) : null; }
    function hitTool(p) {
      var hs = [];
      if (T.ruler) hs.push(['ruler', 'a'], ['ruler', 'b']);
      if (T.angle) hs.push(['angle', 'v'], ['angle', 'a'], ['angle', 'b']);
      for (var i = 0; i < hs.length; i++) {
        var h = T[hs[i][0]][hs[i][1]];
        if (Math.hypot(p.x - h.x, p.y - h.y) < 14) {
          var tool = T[hs[i][0]], key = hs[i][1];
          if (hs[i][0] === 'angle' && key === 'v') {
            // төбесін сүйрегенде бүкіл бұрыш өлшегіш бірге жылжиды
            return { set: function (q) { var dx = q.x - tool.v.x, dy = q.y - tool.v.y; ['v', 'a', 'b'].forEach(function (k) { tool[k].x += dx; tool[k].y += dy; }); } };
          }
          return { set: function (q) { tool[key].x = q.x; tool[key].y = q.y; } };
        }
      }
      return null;
    }
    function handle(x, y, color) {
      D.circle(ctx, x, y, 7, '#ffffff', color, 2, true);
      D.circle(ctx, x, y, 2.5, color, null, 0, true);
    }
    function drawTools() {
      if (T.ruler) {
        var r = T.ruler, s1 = sc(), len = Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y), ang = Math.atan2(r.b.y - r.a.y, r.b.x - r.a.x);
        ctx.save();
        ctx.translate(r.a.x, r.a.y); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(250,224,120,.82)'; ctx.strokeStyle = '#8d6a12'; ctx.lineWidth = 1;
        ctx.fillRect(0, -16, len, 16); ctx.strokeRect(0, -16, len, 16);
        if (s1 && s1.px > 0) {
          var step = s1.px, minor = step / 10;
          while (minor < 4) minor *= 5;
          for (var d = 0; d <= len + 0.5; d += minor) {
            var major = Math.abs(d / step - Math.round(d / step)) < 1e-6;
            ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d, major ? -10 : -5); ctx.stroke();
          }
        }
        ctx.restore();
        var label = s1 && s1.px > 0 ? fmt(len / s1.px, 2) + ' ' + s1.unit : Math.round(len) + ' px';
        D.text(ctx, label, (r.a.x + r.b.x) / 2, (r.a.y + r.b.y) / 2 + 22, { size: 12, mono: true, weight: '600', align: 'center', bg: C.bg, color: '#8d6a12' });
        handle(r.a.x, r.a.y, '#8d6a12'); handle(r.b.x, r.b.y, '#8d6a12');
      }
      if (T.angle) {
        var t = T.angle, a1 = Math.atan2(t.a.y - t.v.y, t.a.x - t.v.x), a2 = Math.atan2(t.b.y - t.v.y, t.b.x - t.v.x);
        var deg = Math.abs((a2 - a1) * 180 / Math.PI); if (deg > 180) deg = 360 - deg;
        D.line(ctx, t.v.x, t.v.y, t.a.x, t.a.y, C.purple, 2);
        D.line(ctx, t.v.x, t.v.y, t.b.x, t.b.y, C.purple, 2);
        var d1 = a2 - a1; while (d1 > Math.PI) d1 -= 2 * Math.PI; while (d1 < -Math.PI) d1 += 2 * Math.PI;
        ctx.save(); ctx.strokeStyle = C.purple; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(t.v.x, t.v.y, 26, a1, a1 + d1, d1 < 0); ctx.stroke(); ctx.restore();
        D.text(ctx, fmt(deg, 1) + '°', t.v.x + 30 * Math.cos(a1 + d1 / 2) , t.v.y + 30 * Math.sin(a1 + d1 / 2) + 4, { size: 12, mono: true, weight: '600', bg: C.bg, color: C.purple });
        handle(t.v.x, t.v.y, C.purple); handle(t.a.x, t.a.y, C.purple); handle(t.b.x, t.b.y, C.purple);
      }
    }
    function simTime() { return typeof S.t === 'number' ? S.t : null; }
    var swOut = null;
    function tickStopwatch() {
      if (!T.sw || !swOut) return;
      var v = T.sw.acc;
      if (T.sw.on) {
        var st = simTime();
        v += st !== null && T.sw.base !== null ? Math.max(0, st - T.sw.base) : (performance.now() - T.sw.real) / 1000;
      }
      swOut.textContent = fmt(v, 2) + ' с';
    }
    if (toolsBox && tools.length) {
      toolsBox.hidden = false;
      var row = document.createElement('div'); row.className = 'toolrow';
      toolsBox.appendChild(row);
      function toggle(name, label, make) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost sm'; b.textContent = label;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          T[name] = T[name] ? null : make();
          b.classList.toggle('on', !!T[name]); b.setAttribute('aria-pressed', T[name] ? 'true' : 'false');
          updateTouch();
          draw();
        });
        row.appendChild(b);
      }
      if (tools.indexOf('ruler') >= 0) toggle('ruler', 'Сызғыш', function () { return { a: { x: W * 0.2, y: H * 0.82 }, b: { x: W * 0.55, y: H * 0.82 } }; });
      if (tools.indexOf('angle') >= 0) toggle('angle', 'Бұрыш өлшегіш', function () { return { v: { x: W * 0.5, y: H * 0.5 }, a: { x: W * 0.5 + 90, y: H * 0.5 }, b: { x: W * 0.5 + 64, y: H * 0.5 - 64 } }; });
      if (tools.indexOf('stopwatch') >= 0) {
        var sw = document.createElement('div'); sw.className = 'stopwatch';
        sw.innerHTML = '<span class="sw-l">Секундомер</span><b class="mono">0,00 с</b><button type="button" class="btn sm">Іске қосу</button><button type="button" class="btn ghost sm">Нөлдеу</button>';
        toolsBox.appendChild(sw);
        swOut = sw.querySelector('b');
        T.sw = { on: false, acc: 0, base: null, real: 0 };
        var bs = sw.querySelectorAll('button');
        bs[0].addEventListener('click', function () {
          if (T.sw.on) { tickStopwatch(); T.sw.acc = parseFloat(swOut.textContent.replace(',', '.')) || 0; T.sw.on = false; bs[0].textContent = 'Іске қосу'; }
          else { T.sw.on = true; T.sw.base = simTime(); T.sw.real = performance.now(); bs[0].textContent = 'Тоқтату'; }
        });
        bs[1].addEventListener('click', function () { T.sw.on = false; T.sw.acc = 0; bs[0].textContent = 'Іске қосу'; swOut.textContent = '0,00 с'; });
        setInterval(function () { if (T.sw.on && !running) tickStopwatch(); }, 200);
      }
      var tip = document.createElement('p'); tip.className = 'muted small';
      tip.textContent = 'Құралдың дөңгелек тұтқаларын тінтуірмен немесе саусақпен сүйреп жылжыт.';
      toolsBox.appendChild(tip);
    }

    // ---------- өлшеу кестесі, график, CSV ----------
    var dataBox = document.getElementById('simData');
    var numeric = (o.readouts || []).filter(function (r) { return !r.text; });
    var records = [];
    if (dataBox && numeric.length) {
      dataBox.hidden = false;
      dataBox.innerHTML =
        '<div class="block-h"><h2>Өлшеу кестесі</h2><span class="cnt" id="dCount">0 өлшеу</span></div>' +
        '<p class="muted small">Параметрлерді өзгертіп, әр тәжірибеден кейін «Өлшеуді жазу» бас. Кестеден график тұрғызып, нәтижені CSV (Excel) файлына сақтауға болады.</p>' +
        '<div class="dacts"><button type="button" class="btn sm" id="dRec">Өлшеуді жазу</button><button type="button" class="btn ghost sm" id="dUndo">Соңғысын өшіру</button><button type="button" class="btn ghost sm" id="dClear">Тазалау</button><button type="button" class="btn ghost sm" id="dCsv">CSV жүктеу</button></div>' +
        '<div class="tblwrap"><table class="dtable"><thead></thead><tbody></tbody></table></div>' +
        '<div class="dplot"><div class="dplot-c"><label class="fl">X осі<select id="dX"></select></label><label class="fl">Y осі<select id="dY"></select></label><label class="ctl-check small"><input type="checkbox" id="dFit" checked> Түзу сызық (ең кіші квадраттар)</label><p class="small mono" id="dFitOut"></p></div><canvas id="dCanvas" height="260"></canvas></div>';
      var thead = dataBox.querySelector('thead'), tbody = dataBox.querySelector('tbody');
      var params = (o.controls || []).filter(function (c) { return c.type === 'range'; });
      var cols = [{ k: '#', label: '№', digits: 0 }].concat(params.map(function (c) { return { k: 'p:' + c.key, label: c.label + (c.unit ? ', ' + c.unit : ''), digits: c.digits === undefined ? 1 : c.digits }; }))
        .concat(numeric.map(function (r) { return { k: 'r:' + r.key, label: r.label + (r.unit ? ', ' + r.unit : ''), digits: r.digits }; }));
      thead.innerHTML = '<tr>' + cols.map(function (c) { return '<th>' + c.label + '</th>'; }).join('') + '</tr>';
      var selX = dataBox.querySelector('#dX'), selY = dataBox.querySelector('#dY');
      cols.forEach(function (c, i) {
        [selX, selY].forEach(function (sel) { var op = document.createElement('option'); op.value = i; op.textContent = c.label; sel.appendChild(op); });
      });
      selX.value = cols.length > 2 ? 1 : 0; selY.value = cols.length - 1;
      var dCanvas = dataBox.querySelector('#dCanvas'), dctx = dCanvas.getContext('2d');
      function cell(v, c) { return typeof v === 'number' ? fmt(v, c && c.digits !== undefined ? c.digits : 3) : (v == null ? '—' : String(v)); }
      function render() {
        dataBox.querySelector('#dCount').textContent = records.length + ' өлшеу';
        tbody.innerHTML = records.map(function (r) { return '<tr>' + cols.map(function (c, i) { return '<td class="num">' + cell(r[i], c) + '</td>'; }).join('') + '</tr>'; }).join('');
        plotData();
      }
      function plotData() {
        var w = dCanvas.parentElement.clientWidth - (window.innerWidth > 700 ? 230 : 0);
        w = Math.max(260, w);
        var dpr = window.devicePixelRatio || 1;
        dCanvas.width = Math.round(w * dpr); dCanvas.height = Math.round(260 * dpr); dCanvas.style.width = w + 'px'; dCanvas.style.height = '260px';
        dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        dctx.fillStyle = C.bg; dctx.fillRect(0, 0, w, 260);
        var xi = +selX.value, yi = +selY.value;
        var pts = records.map(function (r) { return [r[xi], r[yi]]; }).filter(function (p) { return typeof p[0] === 'number' && typeof p[1] === 'number' && isFinite(p[0]) && isFinite(p[1]); });
        var out = dataBox.querySelector('#dFitOut');
        if (pts.length < 1) { D.text(dctx, 'График үшін кемінде бір өлшеу жаз', 20, 130, { size: 12, color: C.muted }); out.textContent = ''; return; }
        var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
        var xmin = Math.min(0, Math.min.apply(null, xs)), xmax = Math.max.apply(null, xs), ymin = Math.min(0, Math.min.apply(null, ys)), ymax = Math.max.apply(null, ys);
        if (xmax === xmin) xmax = xmin + 1; if (ymax === ymin) ymax = ymin + 1;
        xmax += (xmax - xmin) * 0.08; ymax += (ymax - ymin) * 0.12;
        var series = [];
        var fitOn = dataBox.querySelector('#dFit').checked && pts.length >= 2;
        if (fitOn) {
          var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
          pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
          var den = n * sxx - sx * sx;
          if (Math.abs(den) > 1e-12) {
            var k = (n * sxy - sx * sy) / den, b0 = (sy - k * sx) / n;
            series.push({ pts: [[xmin, k * xmin + b0], [xmax, k * xmax + b0]], color: C.accent, dash: [6, 4], width: 1.5 });
            out.textContent = 'y = ' + fmt(k, 4) + '·x ' + (b0 < 0 ? '− ' : '+ ') + fmt(Math.abs(b0), 4) + '  (көлбеулігі k = ' + fmt(k, 4) + ')';
          } else out.textContent = '';
        } else out.textContent = '';
        var g = D.plot(dctx, { x: 50, y: 18, w: w - 70, h: 200 }, { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax, xlabel: cols[xi].label, ylabel: cols[yi].label, series: series });
        pts.forEach(function (p) { D.circle(dctx, g.X(p[0]), g.Y(p[1]), 4.5, C.bad, '#ffffff', 1.2, true); });
      }
      function record() {
        var vals = o.read ? o.read(api) || {} : {};
        records.push(cols.map(function (c) {
          if (c.k === '#') return records.length + 1;
          if (c.k.indexOf('p:') === 0) return P[c.k.slice(2)];
          var v = vals[c.k.slice(2)];
          return typeof v === 'number' ? v : (v == null ? null : String(v));
        }));
        render();
      }
      dataBox.querySelector('#dRec').addEventListener('click', record);
      dataBox.querySelector('#dUndo').addEventListener('click', function () { records.pop(); render(); });
      dataBox.querySelector('#dClear').addEventListener('click', function () { if (!records.length || confirm('Кестені тазалау керек пе?')) { records = []; render(); } });
      dataBox.querySelector('#dCsv').addEventListener('click', function () {
        var esc = function (v) { v = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
        var lines = [cols.map(function (c) { return esc(c.label); }).join(';')].concat(records.map(function (r) { return r.map(esc).join(';'); }));
        var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (document.title.split(' · ')[0] || 'olsheuler') + '.csv';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      });
      [selX, selY, dataBox.querySelector('#dFit')].forEach(function (el) { el.addEventListener('change', plotData); });
      window.addEventListener('resize', plotData);
      document.addEventListener('themechange', plotData);
      render();
    }

    // ---------- толық экран және сурет ----------
    var fullBtn = document.getElementById('simFull'), shotBtn = document.getElementById('simShot');
    var stage = canvas.closest('.simstage');
    if (fullBtn && stage && stage.requestFullscreen) {
      fullBtn.addEventListener('click', function () { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(function () {}); });
      document.addEventListener('fullscreenchange', function () { fullBtn.querySelector('span').textContent = document.fullscreenElement ? 'Шығу' : 'Толық экран'; setTimeout(resize, 50); });
    } else if (fullBtn) fullBtn.hidden = true;
    if (shotBtn) shotBtn.addEventListener('click', function () {
      canvas.toBlob(function (b) {
        if (!b) return;
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (document.title.split(' · ')[0] || 'simulyatsiya') + '.png';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      });
    });

    document.addEventListener('themechange', function () { refreshColors(); draw(); });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { refreshColors(); draw(); });
    window.addEventListener('resize', resize);
    o.init(api);
    resize();
    if (o.autoplay) play();
    return api;
  }

  window.Sim = { create: create, fmt: fmt, D: D, C: C };
})();

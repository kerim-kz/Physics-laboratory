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
    circle: function (ctx, x, y, r, fill, stroke, lw) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
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
      var h = Math.round(Math.min(560, Math.max(260, w * (o.aspect || 0.62))));
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = w; H = h; api.W = W; api.H = H;
      if (o.onResize) o.onResize(api);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      o.draw(api, ctx, W, H);
      updateReadouts();
    }
    api.draw = draw;

    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      var n = o.substeps || 1;
      for (var i = 0; i < n; i++) if (o.step(api, dt / n) === false) { pause(); break; }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      o.draw(api, ctx, W, H);
      if (t - readT > 100) { updateReadouts(); readT = t; }
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

    if (o.pointer) {
      var pos = function (e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      var down = false;
      canvas.addEventListener('pointerdown', function (e) { down = true; canvas.setPointerCapture(e.pointerId); if (o.pointer.down) o.pointer.down(api, pos(e), e); draw(); });
      canvas.addEventListener('pointermove', function (e) { if (o.pointer.move) { o.pointer.move(api, pos(e), down, e); if (!running) draw(); } });
      canvas.addEventListener('pointerup', function (e) { down = false; if (o.pointer.up) o.pointer.up(api, pos(e), e); draw(); });
      canvas.addEventListener('pointerleave', function () { if (o.pointer.leave) { o.pointer.leave(api); if (!running) draw(); } });
      canvas.style.touchAction = 'none';
    }

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

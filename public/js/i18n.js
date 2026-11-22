/* Браузердегі аударма: беттен кейін JavaScript қосқан мәтін, canvas-қа салынатын жазулар (симуляциялар)
   және confirm/alert хабарлары window.I18N сөздігі бойынша аударылады. Сервер бастапқы HTML-ді өзі аударады.
   Сөздікте жоқ мәтін өзгеріссіз қалады. */
(function () {
  'use strict';
  var D = window.I18N;
  if (!D || !D.m) return;
  var HAS = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/, NUM = /\d+(?:[.,]\d+)*/g;
  var exact = D.m, pats = [];
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  (D.g || []).forEach(function (k) {
    var parts = k.split(/\{\d+\}/), order = [], m, re = /\{(\d+)\}/g;
    while ((m = re.exec(k))) order.push(+m[1]);
    var anchor = parts.reduce(function (a, b) { return b.trim().length > a.length ? b.trim() : a; }, '');
    pats.push({ re: new RegExp('^' + parts.map(esc).join('([^·]+?)') + '$'), v: exact[k], order: order, anchor: anchor });
  });
  function fill(t, vals) { return t.replace(/\{(\d+)\}/g, function (m, i) { return vals[i] !== undefined ? vals[i] : m; }); }
  var cache = new Map();
  function look(text) {
    var s = String(text).replace(/\s+/g, ' ').trim();
    if (!s || !HAS.test(s)) return null;
    if (Object.prototype.hasOwnProperty.call(exact, s)) return exact[s];
    var nums = [], key = s.replace(NUM, function (x) { return '{' + (nums.push(x) - 1) + '}'; });
    if (nums.length && Object.prototype.hasOwnProperty.call(exact, key)) return fill(exact[key], nums);
    if (s.indexOf(' · ') >= 0) {
      var any = false, parts2 = s.split(' · ').map(function (x) { var r = look(x); if (r !== null) { any = true; return r; } return x; });
      if (any) return parts2.join(' · ');
    }
    for (var i = 0; i < pats.length; i++) {
      var p = pats[i];
      if (p.anchor && s.indexOf(p.anchor) < 0) continue;
      var mm = s.match(p.re);
      if (mm) { var vals = []; p.order.forEach(function (idx, j) { var v = mm[j + 1], r = HAS.test(v) ? look(v) : null; vals[idx] = r === null ? v : r; }); return fill(p.v, vals); }
    }
    return unitWords(s);
  }
  // Шама жазуы («t = 5 с», «m₁: 2 кг»): 1–3 қазақша сөздің әрқайсысы сөздікте жеке тұрса, сөзбе-сөз ауыстырылады (серверде де солай).
  var EDGE = /^([(«"]*)([\s\S]*?)([)»",.;:]*)$/;
  function get(w) { return Object.prototype.hasOwnProperty.call(exact, w) ? exact[w] : undefined; }
  function unitWords(s) {
    if (!/[\d=]/.test(s)) return null;
    var toks = s.split(/(\s+)/), n = 0, out = [];
    toks.forEach(function (t) { if (HAS.test(t)) n++; });
    if (!n || n > 3) return null;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (!HAS.test(t)) { out.push(t); continue; }
      var r = get(t);
      if (r === undefined) { var ns = [], k = t.replace(NUM, function (x) { return '{' + (ns.push(x) - 1) + '}'; }), h = ns.length ? get(k) : undefined; if (h !== undefined) r = fill(h, ns); }
      if (r === undefined) { var m = t.match(EDGE), v = m[2] ? get(m[2]) : undefined; if (v === undefined) return null; r = m[1] + v + m[3]; }
      out.push(r);
    }
    return out.join('');
  }
  // Мәтінді аудару; бастағы/соңғы бос орындар сақталады.
  function tr(text) {
    if (typeof text !== 'string' || !HAS.test(text)) return text;
    if (cache.has(text)) return cache.get(text);
    var r = look(text), out = text;
    if (r !== null) { var lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0]; out = lead + r + tail; }
    else if (window.__i18nMiss) window.__i18nMiss.add(text.replace(/\s+/g, ' ').trim());
    if (cache.size > 5000) cache.clear();
    cache.set(text, out);
    return out;
  }
  window.tr = tr;

  // ---- DOM ----
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|PRE|CODE|math)$/;
  function skipped(el) {
    for (var e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (SKIP.test(e.nodeName) || e.isContentEditable || e.getAttribute('translate') === 'no') return true;
      if (e.classList && e.classList.contains('katex')) return true;
    }
    return false;
  }
  var ATTR = ['placeholder', 'title', 'aria-label', 'alt', 'data-confirm'];
  function doText(n) {
    var v = n.nodeValue;
    if (!v || !HAS.test(v) || skipped(n.parentNode)) return;
    var t = tr(v);
    if (t !== v) n.nodeValue = t;
  }
  function doEl(el) {
    if (skipped(el)) return;
    ATTR.forEach(function (a) { var v = el.getAttribute(a); if (v && HAS.test(v)) { var t = tr(v); if (t !== v) el.setAttribute(a, t); } });
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) { return n.nodeType === 1 && skipped(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
    });
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else ATTR.forEach(function (a) { var v = n.getAttribute(a); if (v && HAS.test(v)) { var t = tr(v); if (t !== v) n.setAttribute(a, t); } });
    }
  }
  var busy = false;
  var mo = new MutationObserver(function (list) {
    if (busy) return;
    busy = true;
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.type === 'characterData') doText(r.target);
      else if (r.type === 'attributes') { if (r.target.nodeType === 1 && !skipped(r.target)) { var v = r.target.getAttribute(r.attributeName); if (v && HAS.test(v)) { var t = tr(v); if (t !== v) r.target.setAttribute(r.attributeName, t); } } }
      else for (var j = 0; j < r.addedNodes.length; j++) { var a = r.addedNodes[j]; if (a.nodeType === 3) doText(a); else if (a.nodeType === 1) doEl(a); }
    }
    mo.takeRecords();
    busy = false;
  });
  function start() {
    doEl(document.body);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
    if (HAS.test(document.title)) document.title = tr(document.title);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  // ---- Canvas (симуляциялардағы жазулар) ----
  var C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C) {
    ['fillText', 'strokeText', 'measureText'].forEach(function (fn) {
      var orig = C[fn];
      C[fn] = function (text) { var args = Array.prototype.slice.call(arguments); args[0] = tr(String(text)); return orig.apply(this, args); };
    });
  }
  // ---- Диалогтар ----
  ['alert', 'confirm', 'prompt'].forEach(function (fn) {
    var orig = window[fn];
    if (typeof orig === 'function') window[fn] = function (msg) { var args = Array.prototype.slice.call(arguments); args[0] = tr(String(msg == null ? '' : msg)); return orig.apply(window, args); };
  });
})();

// Оқушы жазған формуланы (мысалы, «d*R*(2R+d)/((d-R)(R+2d))») талдау, есептеу және LaTeX-ке айналдыру.
// Бір файл браузерде де (алдын ала көрсету) және серверде де (тексеру) қолданылады: globalThis.ExprCore.
// eval қолданылмайды — тек өз талдағышымыз.
(function (root) {
  'use strict';
  var FUN = { sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs };
  var CONST = { pi: Math.PI };
  var TEXNAME = { eps: '\\varepsilon', e0: '\\varepsilon_0', pi: '\\pi', lambda: '\\lambda', mu: '\\mu', alpha: '\\alpha' };

  function ExprError(msg) { var e = new Error(msg); e.expr = true; return e; }

  // Unicode жазуын қалыпқа келтіру: ε₀ → e0, √ → sqrt, × → *, ² → ^2 т.б.
  function normalize(src) {
    var s = String(src || '');
    var sub = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3' };
    s = s.replace(/[₀₁₂₃₄⁰¹²³]/g, function (c) { return sub[c]; });
    s = s.replace(/ε0|ɛ0/g, ' e0 ').replace(/[εɛ]/g, ' eps ').replace(/π/g, ' pi ').replace(/√/g, ' sqrt ');
    s = s.replace(/[·×⋅∙*]/g, '*').replace(/[÷:]/g, '/').replace(/[−–—]/g, '-').replace(/\*\*/g, '^');
    s = s.replace(/(\d),(\d)/g, '$1.$2');
    return s;
  }

  function tokenize(s) {
    var out = [], i = 0, m;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i)))) { out.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)))) { out.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
      if ('+-*/^()'.indexOf(c) >= 0) { out.push({ t: c }); i++; continue; }
      throw ExprError('Түсініксіз таңба: «' + c + '»');
    }
    return out;
  }

  // Белгісіз ұзын атауды белгілі атауларға бөлу: «gl2» → g·l2, «Rd» → R·d (ең ұзын сәйкестік бойынша).
  function splitId(name, known) {
    if (known[name]) return [name];
    var res = [], i = 0;
    while (i < name.length) {
      var best = '';
      for (var k in known) if (k.length > best.length && name.substr(i, k.length) === k) best = k;
      if (!best) return null;
      res.push(best); i += best.length;
    }
    return res;
  }

  function parse(src, vars) {
    var known = {};
    (vars || []).forEach(function (v) { known[v] = 'var'; });
    Object.keys(FUN).forEach(function (f) { known[f] = 'fun'; });
    Object.keys(CONST).forEach(function (c) { known[c] = 'const'; });
    var raw = tokenize(normalize(src)), toks = [];
    raw.forEach(function (tk) {
      if (tk.t !== 'id') { toks.push(tk); return; }
      var parts = splitId(tk.v, known);
      if (!parts) throw ExprError('Белгісіз шама: «' + tk.v + '». Тек мына шамаларды қолдан: ' + (vars || []).join(', '));
      parts.forEach(function (p) { toks.push({ t: 'id', v: p }); });
    });
    if (!toks.length) throw ExprError('Жауап бос.');
    var pos = 0;
    var peek = function () { return toks[pos]; };
    var take = function (t) { var k = toks[pos]; if (!k || (t && k.t !== t)) throw ExprError(t === ')' ? 'Жақша жабылмаған.' : 'Өрнек толық емес.'); pos++; return k; };
    var startsPrimary = function (k) { return k && (k.t === 'num' || k.t === 'id' || k.t === '('); };

    function expr() {
      var node = term();
      while (peek() && (peek().t === '+' || peek().t === '-')) { var op = take().t; node = { op: op, a: node, b: term() }; }
      return node;
    }
    function term() {
      var node = unary();
      for (;;) {
        var k = peek();
        if (k && (k.t === '*' || k.t === '/')) { take(); node = { op: k.t, a: node, b: unary() }; } else if (startsPrimary(k)) { node = { op: '*', a: node, b: power(), implicit: true }; } else break;
      }
      return node;
    }
    function unary() {
      if (peek() && peek().t === '-') { take(); return { op: 'neg', a: unary() }; }
      if (peek() && peek().t === '+') { take(); return unary(); }
      return power();
    }
    function power() {
      var base = primary();
      if (peek() && peek().t === '^') { take(); return { op: '^', a: base, b: unary() }; }
      return base;
    }
    function primary() {
      var k = peek();
      if (!k) throw ExprError('Өрнек толық емес.');
      if (k.t === 'num') { take(); return { num: k.v }; }
      if (k.t === '(') { take(); var e = expr(); take(')'); return { op: '()', a: e }; }
      if (k.t === 'id') {
        take();
        var kind = known[k.v];
        if (kind === 'fun') {
          if (peek() && peek().t === '(') { take(); var arg = expr(); take(')'); return { fn: k.v, a: arg }; }
          return { fn: k.v, a: power() }; // √x, sqrt x
        }
        if (kind === 'const') return { c: k.v };
        return { v: k.v };
      }
      throw ExprError('Күтпеген белгі: «' + k.t + '»');
    }
    var ast = expr();
    if (pos < toks.length) throw ExprError(toks[pos].t === ')' ? 'Артық жабылған жақша.' : 'Өрнекті түсіну мүмкін болмады.');
    return ast;
  }

  function evaluate(n, scope) {
    if ('num' in n) return n.num;
    if (n.v) { if (!(n.v in scope)) throw ExprError('Шама берілмеген: ' + n.v); return scope[n.v]; }
    if (n.c) return CONST[n.c];
    if (n.fn) return FUN[n.fn](evaluate(n.a, scope));
    var a = evaluate(n.a, scope);
    switch (n.op) {
      case '()': return a;
      case 'neg': return -a;
      case '+': return a + evaluate(n.b, scope);
      case '-': return a - evaluate(n.b, scope);
      case '*': return a * evaluate(n.b, scope);
      case '/': return a / evaluate(n.b, scope);
      case '^': return Math.pow(a, evaluate(n.b, scope));
    }
    throw ExprError('Есептеу қатесі.');
  }

  var unwrap = function (n) { return n && n.op === '()' ? n.a : n; };
  function varTex(v) {
    if (TEXNAME[v]) return TEXNAME[v];
    var m = /^([A-Za-z]+)(\d+)$/.exec(v);
    return m ? (TEXNAME[m[1]] || m[1]) + '_{' + m[2] + '}' : v;
  }
  function toTex(n) {
    if ('num' in n) return String(n.num).replace('.', '{,}');
    if (n.v) return varTex(n.v);
    if (n.c) return TEXNAME[n.c] || n.c;
    if (n.fn === 'sqrt') return '\\sqrt{' + toTex(unwrap(n.a)) + '}';
    if (n.fn === 'abs') return '\\left|' + toTex(unwrap(n.a)) + '\\right|';
    if (n.fn) return '\\' + (n.fn === 'ln' || n.fn === 'log' || n.fn === 'exp' ? n.fn : n.fn) + '\\left(' + toTex(unwrap(n.a)) + '\\right)';
    switch (n.op) {
      case '()': return '\\left(' + toTex(n.a) + '\\right)';
      case 'neg': return '-' + toTex(n.a);
      case '+': return toTex(n.a) + '+' + toTex(n.b);
      case '-': return toTex(n.a) + '-' + toTex(n.b);
      case '*': return toTex(n.a) + (n.implicit && !('num' in n.b) ? '\\,' : '\\cdot ') + toTex(n.b);
      case '/': return '\\dfrac{' + toTex(unwrap(n.a)) + '}{' + toTex(unwrap(n.b)) + '}';
      case '^': return '{' + toTex(n.a) + '}^{' + toTex(unwrap(n.b)) + '}';
    }
    return '';
  }

  root.ExprCore = { parse: parse, evaluate: evaluate, toTex: toTex, normalize: normalize };
})(typeof window !== 'undefined' ? window : globalThis);

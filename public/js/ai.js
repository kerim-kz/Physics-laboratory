/* ЖИ құралының браузер бөлігі: ағынмен келген жауапты көрсету (Markdown + KaTeX), оқушыға көмекші чат,
   нәтижелерді талдау, ашық жауапқа ұпай ұсынысы және ҚМЖ / тапсырма генераторы. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  // ---------- Қауіпсіз Markdown: алдымен бәрі экрандалады, содан кейін ғана белгілер түрлендіріледі ----------
  function tex(src, display) {
    if (window.katex) {
      try { return window.katex.renderToString(src, { displayMode: display, throwOnError: false, output: 'html', trust: false }); } catch (e) { /* төменде мәтін ретінде */ }
    }
    return '<code>' + esc(src) + '</code>';
  }
  function inline(s) {
    var math = [];
    s = s.replace(/\$\$([^$]+)\$\$|\$([^$\n]+?)\$/g, function (_, a, b) { math.push(tex(a || b, !!a)); return '\u0000' + (math.length - 1) + '\u0000'; });
    s = esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return math[+i]; });
  }
  function cells(line) { return line.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); }
  function md(text) {
    var lines = String(text).replace(/\r/g, '').split('\n'), out = [], i = 0, para = [];
    function flush() { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } }
    while (i < lines.length) {
      var L = lines[i], m;
      if (/^```/.test(L)) { flush(); var code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue; }
      if (/^\s*\$\$\s*$/.test(L)) { flush(); var mm = []; i++; while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) mm.push(lines[i++]); i++; out.push('<div class="ai-math">' + tex(mm.join('\n'), true) + '</div>'); continue; }
      if ((m = L.match(/^(#{1,4})\s+(.*)$/))) { flush(); var h = Math.min(4, m[1].length + 1); out.push('<h' + h + '>' + inline(m[2]) + '</h' + h + '>'); i++; continue; }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(L)) { flush(); out.push('<hr>'); i++; continue; }
      if (/^\s*\|/.test(L)) {
        flush(); var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        var head = cells(rows[0]), body = rows.slice(1).filter(function (r) { return !/^\s*\|?\s*:?-{2,}/.test(r); });
        out.push('<div class="tblwrap"><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>'
          + body.map(function (r) { return '<tr>' + cells(r).map(function (c) { return '<td>' + inline(c.replace(/<br\s*\/?>/gi, ' ')) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
        continue;
      }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(L)) {
        flush(); var ordered = /^\s*\d+[.)]/.test(L), items = [];
        while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && /^\s*\d+[.)]/.test(lines[i]) === ordered) {
          var it = lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, '');
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) it += ' ' + lines[i++].trim();
          items.push('<li>' + inline(it) + '</li>');
        }
        out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      if ((m = L.match(/^>\s?(.*)$/))) { flush(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>'); i++; continue; }
      if (!L.trim()) { flush(); i++; continue; }
      para.push(L.trim()); i++;
    }
    flush();
    return out.join('');
  }
  window.aiMarkdown = md;

  // ---------- Сұраныс: ағынмен (NDJSON) оқу ----------
  function post(url, csrf, body) {
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-csrf-token': csrf, accept: 'application/x-ndjson, application/json' }, body: JSON.stringify(body) });
  }
  async function failText(res) {
    var ct = res.headers.get('content-type') || '';
    if (ct.indexOf('json') >= 0) { try { return (await res.json()).error || 'Қате шықты.'; } catch (e) { /* */ } }
    if (res.redirected || ct.indexOf('html') >= 0) return 'Сессия аяқталған болуы мүмкін: бетті жаңартып, қайта кіріңіз.';
    return 'Қате шықты (' + res.status + ').';
  }
  // onText(fullText) әр жаңа бөлікте шақырылады; соңында {text, done, error, left} қайтарады.
  async function stream(url, csrf, body, onText) {
    var res;
    try { res = await post(url, csrf, body); } catch (e) { return { error: 'Желіге қосылу мүмкін болмады. Интернетті тексеріңіз.' }; }
    var ct = res.headers.get('content-type') || '';
    if (!res.ok || ct.indexOf('ndjson') < 0) return { error: await failText(res) };
    var reader = res.body.getReader(), dec = new TextDecoder(), buf = '', text = '', fin = { error: 'Байланыс үзілді. Қайталап көріңіз.' };
    for (;;) {
      var r = await reader.read();
      if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      var parts = buf.split('\n'); buf = parts.pop();
      parts.forEach(function (line) {
        if (!line.trim()) return;
        var o; try { o = JSON.parse(line); } catch (e) { return; }
        if (o.reset) { text = ''; onText(text); } else if (typeof o.t === 'string') { text += o.t; onText(text); } else fin = o;
      });
    }
    fin.text = text;
    return fin;
  }
  function setLeft(left) {
    if (left === null || left === undefined) return;
    document.querySelectorAll('[data-ai-left]').forEach(function (el) { el.textContent = String(left); });
  }
  // Жиі қайта салмау үшін: келесі кадрда бір рет.
  function painter(el) {
    var pending = null;
    return function (text) {
      if (pending === null) requestAnimationFrame(function () { el.innerHTML = md(pending); pending = null; });
      pending = text;
    };
  }
  function note(el, cls, text) { var p = document.createElement('p'); p.className = 'ai-err ' + cls; p.textContent = text; el.appendChild(p); }

  // ---------- 1. Оқушыға көмекші чат ----------
  var chat = $('aiChat');
  if (chat) {
    var log = $('aiLog'), form = $('aiForm'), input = $('aiInput'), history = [], busy = false;
    var first = log.innerHTML;
    var add = function (who, text) {
      var w = document.createElement('div'); w.className = 'ai-msg ' + who;
      w.setAttribute('translate', 'no'); // оқушы мен ЖИ мәтінін сайт сөздігімен аудармаймыз
      var b = document.createElement('div'); b.className = 'ai-b';
      if (who === 'me') b.textContent = text; else b.innerHTML = md(text);
      w.appendChild(b); log.appendChild(w); w.scrollIntoView({ block: 'end', behavior: 'smooth' });
      return b;
    };
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || busy || chat.dataset.ready !== '1') return;
      busy = true; form.classList.add('busy');
      input.value = '';
      add('me', text);
      history.push({ role: 'user', content: text });
      var b = add('bot', ''); b.classList.add('typing');
      b.setAttribute('data-wait', window.tr ? window.tr('ЖИ ойланып жатыр…') : 'ЖИ ойланып жатыр…');
      var paint = painter(b);
      var r = await stream('/api/ai/tutor', chat.dataset.csrf, { messages: history, ctx: chat.dataset.ctx }, paint);
      b.classList.remove('typing');
      if (r.error) {
        history.pop();
        b.parentNode.classList.add('err'); b.textContent = window.tr ? window.tr(r.error) : r.error;
        if (!r.text) input.value = text;
      } else {
        history.push({ role: 'assistant', content: r.text });
        requestAnimationFrame(function () { b.innerHTML = md(r.text); });
      }
      setLeft(r.left);
      busy = false; form.classList.remove('busy'); input.focus();
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
    $('aiClear').addEventListener('click', function () { if (busy) return; history = []; log.innerHTML = first; input.focus(); });
  }

  // ---------- 2. Нәтижелерді талдау ----------
  var an = $('aiAnalyze');
  if (an) {
    var abtn = $('aiAnalyzeBtn'), aout = $('aiAnalyzeOut');
    abtn.addEventListener('click', async function () {
      abtn.disabled = true; abtn.lastChild.textContent = ' Талдап жатыр…';
      aout.hidden = false; aout.innerHTML = '<p class="muted">ЖИ деректерді талдап жатыр, бұл 20–60 секунд алуы мүмкін…</p>';
      var r = await stream('/api/ai/analyze', an.dataset.csrf, { class: an.dataset.class, exam: an.dataset.exam, src: an.dataset.src }, painter(aout));
      if (r.error) { if (!r.text) aout.innerHTML = ''; note(aout, '', r.error); } else requestAnimationFrame(function () { aout.innerHTML = md(r.text); });
      setLeft(r.left);
      abtn.disabled = false; abtn.lastChild.textContent = ' Қайта талдау';
    });
  }

  // ---------- 3. Ашық жауаптарға ұпай ұсынысы ----------
  var gr = $('aiGrade');
  if (gr) {
    var gbtn = $('aiGradeBtn');
    gbtn.addEventListener('click', async function () {
      gbtn.disabled = true; gbtn.lastChild.textContent = ' ЖИ бағалап жатыр…';
      var old = gr.querySelector('.ai-err'); if (old) old.remove();
      var res, data;
      try { res = await post('/api/ai/grade/' + gr.dataset.attempt, gr.dataset.csrf, {}); data = res.ok ? await res.json() : { error: await failText(res) }; }
      catch (e) { data = { error: 'Желіге қосылу мүмкін болмады.' }; }
      if (data.error) note(gr, '', data.error);
      (data.items || []).forEach(function (it) {
        var radio = document.querySelector('input[name="g' + it.id + '"][value="' + it.points + '"]');
        if (radio) { radio.checked = true; radio.closest('.chips').classList.add('ai-picked'); }
        var why = document.querySelector('[data-ai-why="' + it.id + '"]');
        if (why) { why.hidden = false; why.innerHTML = '<b>ЖИ ұсынысы: ' + it.points + ' / ' + it.max + ' балл.</b> ' + esc(it.reason); }
      });
      if (data.items && data.items.length) note(gr, 'ok', 'Ұсынылған ұпайлар белгіленді. Тексеріп, «Бағаны сақтау» батырмасын басыңыз.');
      setLeft(data.left);
      gbtn.disabled = false; gbtn.lastChild.textContent = ' ЖИ ұсынысын қайта алу';
    });
  }

  // ---------- 4. Генератор ----------
  var gf = $('aiGenForm');
  if (gf) {
    var topics = {}; try { topics = JSON.parse($('aiTopicData').textContent); } catch (e) { /* */ }
    var dl = $('aiTopics'), gsel = $('aiGenGrade');
    var fill = function () { dl.innerHTML = (topics[gsel.value] || []).map(function (t) { return '<option value="' + esc(t) + '">'; }).join(''); };
    gsel.addEventListener('change', fill); fill();
    var out = $('aiOut'), body = $('aiOutBody'), title = $('aiOutTitle'), last = '';
    gf.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (gf.dataset.ready !== '1') return;
      var fd = new FormData(gf), q = {}; fd.forEach(function (v, k) { q[k] = v; });
      var btn = gf.querySelector('button[type=submit]');
      btn.disabled = true; btn.lastChild.textContent = ' Жасап жатыр…';
      out.hidden = false; title.textContent = gf.type.options[gf.type.selectedIndex].text + ' · ' + q.grade + '-сынып · ' + q.topic;
      body.innerHTML = '<p class="muted">ЖИ материалды жасап жатыр, бұл 1–2 минут алуы мүмкін…</p>';
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var r = await stream('/api/ai/generate', gf.dataset.csrf, q, painter(body));
      if (r.error) { if (!r.text) body.innerHTML = ''; note(body, '', r.error); }
      else { last = r.text; requestAnimationFrame(function () { body.innerHTML = md(r.text); if (r.truncated) note(body, '', 'Жауап тым ұзақ болып, соңы қиылды. Тақырыпты тарылтып, қайталап көріңіз.'); }); }
      setLeft(r.left);
      btn.disabled = false; btn.lastChild.textContent = ' Қайта жасау';
    });
    $('aiCopy').addEventListener('click', function () {
      if (!last) return;
      navigator.clipboard.writeText(last).then(function () { $('aiCopy').lastChild.textContent = ' Көшірілді'; setTimeout(function () { $('aiCopy').lastChild.textContent = ' Көшіру'; }, 1500); });
    });
    $('aiWord').addEventListener('click', function () {
      if (!last) return;
      var saved = window.katex; window.katex = null; // Word-та формулалар LaTeX мәтіні түрінде қалады
      var htmlDoc = '<html><head><meta charset="utf-8"><title>' + esc(title.textContent) + '</title><style>body{font-family:"Times New Roman",serif;font-size:12pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:4px;vertical-align:top}</style></head><body><h1>' + esc(title.textContent) + '</h1>' + md(last) + '</body></html>';
      window.katex = saved;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + htmlDoc], { type: 'application/msword' }));
      a.download = 'zhi-material.doc'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
    $('aiPrint').addEventListener('click', function () { if (last) window.print(); });
  }
})();

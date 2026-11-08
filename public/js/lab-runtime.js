/* Артефакт-зертханаларға арналған үйлесімді қабат: window.claude.use('user' | 'db' | 'downloads').
   Зертхананың коды өзгеріссіз қалады; subs/{uid} құжаттары платформаның API-іне жазылады.
   Кірмеген қонақ үшін uid = null — зертхана офлайн режимге өтіп, соңында нәтиже кодын көрсетеді. */
(function () {
  'use strict';
  var el = document.getElementById('labRuntimeConfig');
  if (!el) return;
  var CFG = JSON.parse(el.textContent);
  var base = '/api/labs/' + encodeURIComponent(CFG.key) + '/subs';

  function fail(status) {
    var e = new Error('Сұраным сәтсіз аяқталды (' + status + ')');
    e.code = status === 401 || status === 403 ? 'permission-denied' : status === 404 ? 'not-found' : 'unavailable';
    return e;
  }
  function call(method, url, body) {
    var headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['X-CSRF-Token'] = CFG.csrf;
    return fetch(url, { method: method, credentials: 'same-origin', headers: headers, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (r) {
        if (!r.ok) throw fail(r.status);
        return r.status === 204 ? null : r.json();
      }, function () { throw fail(0); });
  }
  var clone = function (x) { return x == null ? x : JSON.parse(JSON.stringify(x)); };
  function snapshot(id, data) {
    return { id: id, exists: data != null, data: function () { return data == null ? undefined : clone(data); } };
  }

  var docListeners = {};
  var colListeners = [];
  function readDoc(id) {
    return call('GET', base + '/' + encodeURIComponent(id)).then(function (r) { return snapshot(id, r && r.exists ? r.data : null); });
  }
  function readCol() {
    return call('GET', base).then(function (r) {
      var docs = (r && r.docs || []).map(function (d) { return snapshot(d.id, d.data); });
      return { docs: docs, size: docs.length, empty: !docs.length };
    });
  }
  function notifyDoc(id) {
    (docListeners[id] || []).forEach(function (l) { readDoc(id).then(l.cb, function (e) { if (l.err) l.err(e); }); });
  }
  function notifyCol() {
    colListeners.forEach(function (l) { readCol().then(l.cb, function (e) { if (l.err) l.err(e); }); });
  }

  var db = {
    doc: function (path) {
      var m = /^subs\/([A-Za-z0-9_-]+)$/.exec(String(path));
      if (!m) throw new Error('Бұл жол қолдау таппайды: ' + path);
      var id = m[1];
      return {
        id: id,
        get: function () { return readDoc(id); },
        set: function (data) { return call('POST', base + '/' + encodeURIComponent(id), data).then(function () { notifyDoc(id); notifyCol(); }); },
        delete: function () { return call('DELETE', base + '/' + encodeURIComponent(id)).then(function () { notifyDoc(id); notifyCol(); }); },
        onSnapshot: function (cb, err) {
          var l = { cb: cb, err: err };
          (docListeners[id] = docListeners[id] || []).push(l);
          readDoc(id).then(cb, function (e) { if (err) err(e); });
          return function () { docListeners[id] = (docListeners[id] || []).filter(function (x) { return x !== l; }); };
        },
      };
    },
    collection: function (path) {
      if (path !== 'subs') throw new Error('Бұл жинақ қолдау таппайды: ' + path);
      return {
        get: readCol,
        onSnapshot: function (cb, err) {
          var l = { cb: cb, err: err };
          colListeners.push(l);
          readCol().then(cb, function (e) { if (err) err(e); });
          // Мұғалім панелі: жаңа нәтижелерді 20 секунд сайын тексереміз.
          var timer = setInterval(function () { if (!document.hidden) readCol().then(cb, function () {}); }, 20000);
          return function () { clearInterval(timer); colListeners = colListeners.filter(function (x) { return x !== l; }); };
        },
      };
    },
  };

  var TYPES = { html: 'text/html;charset=utf-8', csv: 'text/csv;charset=utf-8', txt: 'text/plain;charset=utf-8', json: 'application/json',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pdf: 'application/pdf' };
  var downloads = {
    save: function (o) {
      try {
        var name = String((o && (o.filename || o.name)) || 'zerthana.txt');
        var ext = (name.split('.').pop() || '').toLowerCase();
        var data = o && (o.data !== undefined ? o.data : o.content);
        var blob = data instanceof Blob ? data : new Blob([data], { type: (o && o.type) || TYPES[ext] || 'application/octet-stream' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        return Promise.resolve({ ok: true });
      } catch (e) {
        return Promise.reject(e);
      }
    },
  };

  var user = {
    id: function () { return Promise.resolve(CFG.uid); },
    isOwner: function () { return Promise.resolve(!!CFG.owner); },
  };

  window.claude = {
    use: function (name) {
      if (name === 'user') return Promise.resolve(user);
      if (name === 'db') return Promise.resolve(CFG.uid ? db : null);
      if (name === 'downloads') return Promise.resolve(downloads);
      return Promise.reject(new Error('Белгісіз мүмкіндік: ' + name));
    },
  };

  // Кірген оқушының аты-жөні мен сыныбын тіркелу формасына алдын ала жазамыз.
  function prefill() {
    if (!CFG.name) return;
    var n = document.getElementById('stName');
    if (n && !n.value) { n.value = CFG.name; n.dispatchEvent(new Event('input', { bubbles: true })); }
    var sel = document.getElementById('stCls');
    if (sel && CFG.cls && !sel.value) {
      var hit = Array.prototype.find.call(sel.options, function (o) { return o.textContent.trim() === CFG.cls; });
      if (hit) sel.value = hit.value;
      else {
        sel.value = '__other';
        var other = document.getElementById('stClsOther');
        if (other) other.value = CFG.cls;
      }
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  window.addEventListener('load', function () { setTimeout(prefill, 60); });
})();

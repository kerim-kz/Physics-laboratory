/* «Шамды жақ»: сым тақтайшаларын бұрап, ток көзінен шамдар арқылы тұйық тізбек құрастыру.
   Тақтайшаның қосылыстары — бит маскасы: 1 жоғары, 2 оң, 4 төмен, 8 сол. Деңгей шешімнен бастап жасалады
   (тұйық жол + шамдар + параллель тармақ), сосын сым тақтайшалары бұралып араластырылады.
   Шамның жанатыны тізбекті есептеу арқылы анықталады (түйіндік потенциалдар): параллель жалғау, қысқа тұйықталу — физикаға сай. */
(function () {
  'use strict';
  var DIRS = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]]; // dx, dy, өз биті, көршінің биті
  function rotCW(m) { return ((m << 1) | (m >> 3)) & 15; }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- тізбекті бағалау ----------
  // tiles[y][x] = {k: 'w'|'L'|'B'|'0', m: маска}. Қайтарады: {short, lit: {x,y: true}, closed}
  function evaluate(tiles, W, H) {
    var id = 0, parent = [];
    function mk() { parent.push(parent.length); return id++; }
    function find(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }
    function uni(a, b) { parent[find(a)] = find(b); }
    // әр тақтайшаның әр жағына түйін: сым — бәрі бір түйін; шам — екі жағы бөлек; батарея — «+» оң, «−» сол
    var side = [];
    for (var y = 0; y < H; y++) { side.push([]); for (var x = 0; x < W; x++) {
      var t = tiles[y][x], s = [null, null, null, null];
      if (t.k === 'w') { var n = mk(); for (var d = 0; d < 4; d++) if (t.m & DIRS[d][2]) s[d] = n; }
      else if (t.k === 'L' || t.k === 'B') { for (var d2 = 0; d2 < 4; d2++) if (t.m & DIRS[d2][2]) s[d2] = mk(); }
      side[y].push(s);
    } }
    for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) for (var d3 = 1; d3 <= 2; d3++) {
      var nx = x2 + DIRS[d3][0], ny = y2 + DIRS[d3][1];
      if (nx >= W || ny >= H) continue;
      var a = side[y2][x2][d3], b = side[ny][nx][(d3 + 2) % 4];
      if (a !== null && b !== null) uni(a, b);
    }
    var lamps = [], P = null, N = null;
    for (var y3 = 0; y3 < H; y3++) for (var x3 = 0; x3 < W; x3++) {
      var t3 = tiles[y3][x3], ss = side[y3][x3].filter(function (v) { return v !== null; });
      if (t3.k === 'L') lamps.push({ x: x3, y: y3, a: find(ss[0]), b: find(ss[1]) });
      if (t3.k === 'B') { P = find(side[y3][x3][1]); N = find(side[y3][x3][3]); }
    }
    var res = { short: false, lit: {}, closed: false };
    if (P === null) return res;
    if (P === N) { res.short = true; return res; }
    // түйіндер: P = 1 В, N = 0 В; шамдар — бірдей кедергілер (G = 1)
    var nodes = {}, list = [];
    function nid(v) { if (!(v in nodes)) { nodes[v] = list.length; list.push(v); } return nodes[v]; }
    nid(P); nid(N); lamps.forEach(function (l) { nid(l.a); nid(l.b); });
    var n = list.length, A = [], z = [];
    for (var i = 0; i < n; i++) { A.push(new Array(n).fill(0)); z.push(0); A[i][i] = 1e-9; }
    lamps.forEach(function (l) { var i1 = nodes[l.a], j1 = nodes[l.b]; if (i1 === j1) return; A[i1][i1] += 1; A[j1][j1] += 1; A[i1][j1] -= 1; A[j1][i1] -= 1; });
    // P және N кернеуін бекіту
    [[nodes[P], 1], [nodes[N], 0]].forEach(function (q) { var r = q[0]; for (var k = 0; k < n; k++) A[r][k] = 0; A[r][r] = 1; z[r] = q[1]; });
    // Гаусс әдісі
    for (var c = 0; c < n; c++) {
      var pv = c; for (var r2 = c + 1; r2 < n; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[pv][c])) pv = r2;
      var tmp = A[c]; A[c] = A[pv]; A[pv] = tmp; var tz = z[c]; z[c] = z[pv]; z[pv] = tz;
      if (Math.abs(A[c][c]) < 1e-12) continue;
      for (var r3 = c + 1; r3 < n; r3++) { var f = A[r3][c] / A[c][c]; if (!f) continue; for (var k2 = c; k2 < n; k2++) A[r3][k2] -= f * A[c][k2]; z[r3] -= f * z[c]; }
    }
    var V = new Array(n).fill(0);
    for (var c2 = n - 1; c2 >= 0; c2--) { var sum = z[c2]; for (var k3 = c2 + 1; k3 < n; k3++) sum -= A[c2][k3] * V[k3]; V[c2] = Math.abs(A[c2][c2]) < 1e-12 ? 0 : sum / A[c2][c2]; }
    lamps.forEach(function (l) { if (Math.abs(V[nodes[l.a]] - V[nodes[l.b]]) > 0.02) { res.lit[l.x + ',' + l.y] = true; res.closed = true; } });
    return res;
  }

  // ---------- деңгейді шешімнен бастап жасау ----------
  function maskBetween(a, b) { for (var d = 0; d < 4; d++) if (a[0] + DIRS[d][0] === b[0] && a[1] + DIRS[d][1] === b[1]) return DIRS[d][2]; return 0; }
  function findPath(W, H, from, to, used, minLen, maxLen, R) {
    var best = null, steps = 0;
    function dfs(p, path) {
      if (best || ++steps > 20000) return;
      if (p[0] === to[0] && p[1] === to[1]) { if (path.length >= minLen) best = path.slice(); return; }
      if (path.length >= maxLen) return;
      if (path.length + Math.abs(p[0] - to[0]) + Math.abs(p[1] - to[1]) > maxLen) return;
      var ds = [0, 1, 2, 3].sort(function () { return R() - 0.5; });
      for (var i = 0; i < 4; i++) {
        var q = [p[0] + DIRS[ds[i]][0], p[1] + DIRS[ds[i]][1]], k = q[0] + ',' + q[1];
        if (q[0] < 0 || q[1] < 0 || q[0] >= W || q[1] >= H || used[k]) continue;
        used[k] = 1; path.push(q); dfs(q, path); path.pop(); delete used[k];
        if (best) return;
      }
    }
    var u = {}; for (var k0 in used) u[k0] = 1; used = u;
    used[from[0] + ',' + from[1]] = 1;
    dfs(from, [from]);
    return best;
  }
  function gen(spec, seed) {
    var R = rng(seed);
    for (var attempt = 0; attempt < 300; attempt++) {
      var W = spec.w, H = spec.h, by = Math.floor(R() * H), bx = 1 + Math.floor(R() * Math.max(1, W - 3));
      var used = {}; used[bx + ',' + by] = 1;
      var path = findPath(W, H, [bx + 1, by], [bx - 1, by], used, spec.len, spec.len + 8, R);
      if (!path) continue;
      var tiles = []; for (var y = 0; y < H; y++) { tiles.push([]); for (var x = 0; x < W; x++) tiles[y].push({ k: '0', m: 0 }); }
      tiles[by][bx] = { k: 'B', m: 10, fixed: true };
      var onPath = {};
      path.forEach(function (p, i) {
        var m = 0;
        if (i === 0) m |= 8; else m |= maskBetween(p, path[i - 1]);
        if (i === path.length - 1) m |= 2; else m |= maskBetween(p, path[i + 1]);
        tiles[p[1]][p[0]] = { k: 'w', m: m }; onPath[p[0] + ',' + p[1]] = i;
      });
      // параллель тармақ
      var branchOk = true, lampCells = [];
      if (spec.branch) {
        branchOk = false;
        for (var bt = 0; bt < 40 && !branchOk; bt++) {
          var i1 = 1 + Math.floor(R() * (path.length - 4)), i2 = i1 + 2 + Math.floor(R() * (path.length - i1 - 3));
          if (i2 >= path.length - 1) continue;
          var u = {}; for (var k in onPath) u[k] = 1; u[bx + ',' + by] = 1; delete u[path[i2][0] + ',' + path[i2][1]];
          var bp = findPath(W, H, path[i1], path[i2], u, 3, 9, R);
          if (!bp) continue;
          bp.forEach(function (p, j) {
            if (j === 0 || j === bp.length - 1) return;
            var m = maskBetween(p, bp[j - 1]) | maskBetween(p, bp[j + 1]);
            tiles[p[1]][p[0]] = { k: 'w', m: m, inBranch: true };
          });
          tiles[path[i1][1]][path[i1][0]].m |= maskBetween(path[i1], bp[1]);
          tiles[path[i2][1]][path[i2][0]].m |= maskBetween(path[i2], bp[bp.length - 2]);
          // шамдар: бір шам тармақта, бір шам — негізгі жолдың сол аралығында (әйтпесе тармақтағы шам тұйықталып қалады)
          var bc = bp.slice(1, -1).filter(function (p) { var m = tiles[p[1]][p[0]].m; return m === 5 || m === 10 || [3, 6, 12, 9].indexOf(m) >= 0; });
          var mc = path.slice(i1 + 1, i2).filter(function (p) { return [5, 10, 3, 6, 12, 9].indexOf(tiles[p[1]][p[0]].m) >= 0; });
          if (!bc.length || !mc.length) continue;
          lampCells.push(bc[Math.floor(R() * bc.length)], mc[Math.floor(R() * mc.length)]);
          branchOk = true;
        }
      }
      if (!branchOk) continue;
      // қосымша тізбектей шамдар
      var free = path.filter(function (p) { var m = tiles[p[1]][p[0]].m; return [5, 10, 3, 6, 12, 9].indexOf(m) >= 0 && !lampCells.some(function (q) { return q[0] === p[0] && q[1] === p[1]; }); });
      while (lampCells.length < spec.lamps && free.length) lampCells.push(free.splice(Math.floor(R() * free.length), 1)[0]);
      if (lampCells.length < spec.lamps) continue;
      lampCells.forEach(function (p) { tiles[p[1]][p[0]] = { k: 'L', m: tiles[p[1]][p[0]].m, fixed: true }; });
      // толтырғыш сымдар
      for (var y4 = 0; y4 < H; y4++) for (var x4 = 0; x4 < W; x4++) if (tiles[y4][x4].k === '0' && R() < spec.fill) tiles[y4][x4] = { k: 'w', m: [5, 3, 7, 3, 5][Math.floor(R() * 5)] };
      var sol = evaluate(tiles, W, H);
      if (sol.short || Object.keys(sol.lit).length !== spec.lamps) continue;
      // шешім маскаларын сақтап, сымдарды араластыру
      var moves = 0;
      for (var y5 = 0; y5 < H; y5++) for (var x5 = 0; x5 < W; x5++) {
        var t = tiles[y5][x5];
        if (t.k !== 'w' || t.m === 15) continue;
        t.sol = t.m;
        var r = 1 + Math.floor(R() * 3);
        for (var q = 0; q < r; q++) t.m = rotCW(t.m);
        if (onPath[x5 + ',' + y5] !== undefined || t.inBranch) { var d = 0, m2 = t.m; while (m2 !== t.sol && d < 4) { m2 = rotCW(m2); d++; } moves += d; }
      }
      var start = evaluate(tiles, W, H);
      if (Object.keys(start.lit).length === spec.lamps && !start.short) continue;
      return { tiles: tiles, W: W, H: H, lamps: spec.lamps, best: moves };
    }
    return null;
  }
  var SPECS = [
    { n: 'Бір шам', w: 4, h: 3, len: 5, lamps: 1, fill: 0 },
    { n: 'Ұзын сым', w: 5, h: 3, len: 7, lamps: 1, fill: 0.3 },
    { n: 'Тізбектей екі шам', w: 5, h: 4, len: 8, lamps: 2, fill: 0.3 },
    { n: 'Бұралаң жол', w: 5, h: 4, len: 11, lamps: 2, fill: 0.5 },
    { n: 'Үш шам', w: 6, h: 4, len: 12, lamps: 3, fill: 0.5 },
    { n: 'Параллель', w: 5, h: 4, len: 7, lamps: 2, fill: 0.3, branch: true },
    { n: 'Параллель және тізбектей', w: 6, h: 5, len: 10, lamps: 3, fill: 0.5, branch: true },
    { n: 'Тығыз тақта', w: 6, h: 5, len: 14, lamps: 3, fill: 0.9 },
    { n: 'Үлкен тізбек', w: 7, h: 5, len: 14, lamps: 3, fill: 0.7, branch: true },
    { n: 'Шебер электрик', w: 7, h: 6, len: 18, lamps: 4, fill: 0.9, branch: true },
  ];
  window.LampLogic = { evaluate: evaluate, gen: gen, SPECS: SPECS, rotCW: rotCW };
  if (!window.GameShell) return;

  // ---------- ойын ----------
  var S = window.GameShell, T = S.T;
  var lvI, lv, moves, c, ctx, stop, won, tm = 0, spin = {};
  function startLevel(n) {
    lvI = n - 1; lv = gen(SPECS[lvI], 1000 + lvI * 7919); moves = 0; won = false; spin = {};
    var r = S.root; r.innerHTML = '';
    r.appendChild(S.hud([['Деңгей', 'lL', n + ' / ' + SPECS.length], ['Жанған шам', 'lN', '0 / ' + lv.lamps], ['Жүріс', 'lM', '0']]));
    c = S.canvas(900, Math.round(900 * Math.min(0.75, (lv.H + 0.4) / (lv.W + 0.4)))); ctx = c.ctx;
    r.appendChild(S.el('p', 'muted small', T(SPECS[lvI].branch ? 'Бұл деңгейде шамдардың бірі параллель тармақта. Екі тармақта да шам болмаса, біреуі тұйықталып қалады!' : 'Тақтайшаны түрт — 90°-қа бұрылады. Ток «+» қысқыштан шығып, шамдар арқылы «−» қысқышқа оралуы керек.')));
    c.cv.addEventListener('pointerdown', tap);
    if (stop) stop(); stop = S.loop(function (dt) { tm += dt; for (var k in spin) { spin[k] = Math.max(0, spin[k] - dt * 9); } draw(); });
    update();
  }
  function geo() { var cell = Math.min(c.W / (lv.W + 0.4), c.H / (lv.H + 0.4)); return { cell: cell, ox: (c.W - lv.W * cell) / 2, oy: (c.H - lv.H * cell) / 2 }; }
  function tap(e) {
    if (won) return;
    var p = c.pos(e), g = geo(), x = Math.floor((p.x - g.ox) / g.cell), y = Math.floor((p.y - g.oy) / g.cell);
    if (x < 0 || y < 0 || x >= lv.W || y >= lv.H) return;
    var t = lv.tiles[y][x];
    if (t.k !== 'w' || t.m === 15) { S.sfx('tick'); return; }
    t.m = rotCW(t.m); spin[x + ',' + y] = Math.PI / 2; moves++; S.sfx('pop'); S.set('lM', String(moves));
    update();
  }
  var last = null;
  function update() {
    last = evaluate(lv.tiles, lv.W, lv.H);
    var n = Object.keys(last.lit).length;
    S.set('lN', n + ' / ' + lv.lamps);
    if (last.short) S.toast('Қысқа тұйықталу!', 'bad');
    if (n === lv.lamps && !last.short && !won) {
      won = true; S.sfx('ok');
      var extra = moves - lv.best, stars = extra <= 2 ? 3 : extra <= 8 ? 2 : 1;
      S.setLevelStars(lvI + 1, stars);
      setTimeout(function () { finish(stars); }, 1200);
    }
  }
  function campaign() { var st = S.levelStars(), s = 0; for (var k in st) s += st[k] * 100; return s; }
  function finish(stars) {
    if (stop) { stop(); stop = null; }
    var lastLv = lvI === SPECS.length - 1;
    S.end({ title: 'Барлық шам жанды!', stars: stars, score: campaign(), unit: 'жорық ұпайы', lines: [T('Жүріс саны') + ': ' + moves + '. ' + T(SPECS[lvI].branch ? 'Параллель тармақтардағы шамдар бір-біріне тәуелсіз жанады.' : 'Тізбектей жалғанған шамдар арқылы бірдей ток өтеді.')],
      onNext: lastLv ? null : function () { startLevel(lvI + 2); }, onAgain: function () { startLevel(lvI + 1); }, onMenu: menu });
  }
  function draw() {
    var g = geo(), cell = g.cell, lit = last ? last.lit : {};
    var bg = ctx.createLinearGradient(0, 0, 0, c.H); bg.addColorStop(0, '#3b2a14'); bg.addColorStop(1, '#5a4024');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, c.W, c.H);
    var anyLit = Object.keys(lit).length > 0;
    for (var y = 0; y < lv.H; y++) for (var x = 0; x < lv.W; x++) {
      var t = lv.tiles[y][x], X = g.ox + x * cell, Y = g.oy + y * cell, cx = X + cell / 2, cy = Y + cell / 2;
      ctx.fillStyle = t.k === 'w' ? '#e9dcc0' : t.k === '0' ? 'rgba(255,255,255,.06)' : '#d9ccae';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(X + 3, Y + 3, cell - 6, cell - 6, 10) : ctx.rect(X + 3, Y + 3, cell - 6, cell - 6); ctx.fill();
      if (t.k === '0') continue;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-(spin[x + ',' + y] || 0));
      var on = anyLit && !last.short && (t.k !== 'w' || true);
      for (var d = 0; d < 4; d++) if (t.m & DIRS[d][2]) {
        ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = cell * 0.16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(DIRS[d][0] * cell / 2, DIRS[d][1] * cell / 2); ctx.stroke();
        ctx.strokeStyle = t.k === 'w' ? '#c0392b' : '#8a6a3a'; ctx.lineWidth = cell * 0.08; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(DIRS[d][0] * cell / 2, DIRS[d][1] * cell / 2); ctx.stroke();
      }
      if (t.k === 'w') { ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.arc(0, 0, cell * 0.08, 0, 7); ctx.fill(); }
      ctx.restore();
      if (t.k === 'L') {
        var isOn = lit[x + ',' + y], rr = cell * 0.24;
        if (isOn) { var hg = ctx.createRadialGradient(cx, cy, 2, cx, cy, cell * 0.8); hg.addColorStop(0, 'rgba(255,230,120,.85)'); hg.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, cell * 0.8, 0, 7); ctx.fill(); }
        ctx.fillStyle = isOn ? '#fff2a8' : '#dfe6ea'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill();
        ctx.strokeStyle = isOn ? '#e0a000' : '#7a8a94'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = isOn ? '#ff9800' : '#5b4b3b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - rr * 0.5, cy + rr * 0.3); for (var i = 0; i <= 4; i++) ctx.lineTo(cx - rr * 0.5 + i * rr * 0.25, cy - rr * 0.1 + (i % 2 ? -rr * 0.25 : 0)); ctx.stroke();
      }
      if (t.k === 'B') {
        ctx.fillStyle = '#2b2f36'; ctx.fillRect(cx - cell * 0.32, cy - cell * 0.2, cell * 0.5, cell * 0.4);
        ctx.fillStyle = '#e0a83a'; ctx.fillRect(cx + cell * 0.18, cy - cell * 0.2, cell * 0.14, cell * 0.4);
        ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(cell * 0.2) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', cx + cell * 0.38, cy - cell * 0.3); ctx.fillText('−', cx - cell * 0.38, cy - cell * 0.3);
      }
    }
    if (last && last.short) { ctx.fillStyle = 'rgba(192,57,43,' + (0.15 + 0.1 * Math.sin(tm * 10)) + ')'; ctx.fillRect(0, 0, c.W, c.H); }
  }
  function menu() { S.intro({ title: 'Шамды жақ', lead: 'Сым тақтайшаларын бұрап, тұйық тізбек құрастыр және барлық шамды жақ.', levels: SPECS.length, levelNames: SPECS.map(function (s) { return s.n; }), onStart: function (o) { startLevel(o.level); } }); }
  menu();
})();

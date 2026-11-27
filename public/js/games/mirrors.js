/* «Сәулені бағытта»: лазер сәулесін 45°-тық айналармен шағылдырып, барлық кристалды жандыр.
   Шағылу заңы: «/» айнасы (dx, dy) → (−dy, −dx), «\» айнасы (dx, dy) → (dy, dx) (y төмен қарай өседі).
   Карта белгілері: L> L< L^ Lv — лазер; * — кристал; # — қабырға; / \ — бұрылатын айна; F/ F\ — бекітілген айна; . — бос */
(function () {
  'use strict';
  var S = window.GameShell, T = S.T;
  // Деңгейлер шешімінен бастап құрастырылған және толық іздеумен тексерілген (best — ең аз жүріс саны)
  var LEVELS = [
    {n: 'Бір айна', m: ['..*.....', '........', 'L>.\\.....'], inv: 0, best: 1},
    {n: 'Екі бұрылыс', m: ['.........', 'L>../.....', '.........', '*..\\.....'], inv: 0, best: 2},
    {n: 'Қабырғаны айналып', m: ['.........', '..\\.*.#..', '........#', 'L>.\\#...#.'], inv: 0, best: 2},
    {n: 'Екі кристал', m: ['L>*../.....', '..........', '..../.*...', '#.#.......', '.....\\...#'], inv: 0, best: 2},
    {n: 'Өзің қой', m: ['.....*...', '...#.....', 'L>.......#', '#........'], inv: 1, best: 1},
    {n: 'Лабиринт', m: ['.#/.\\..../', '#.#.......', '.....#....', 'L>...\\#.\\..', '#.....#.#*'], inv: 0, best: 3},
    {n: 'Екі айна қой', m: ['L>*......#.', '#.........', '......#...', '..........', '#......*..'], inv: 2, best: 2},
    {n: 'Үш кристал', m: ['...../..#.', '.........#', '.##...\\#/.', '...*./...*', 'L>*.\\......', '..........'], inv: 1, best: 4},
    {n: 'Шиыршық', m: ['*..../#/..', '....#.....', '.##.#.#..#', 'L>.........', '..#.......', '....*\\....'], inv: 2, best: 6},
    {n: 'Қақпалар', m: ['...........', '.#...../...', 'L>*...\\.....', '#...#.\\..*\\', '.#.###..#.#', '#.../.*....'], inv: 2, best: 6},
    {n: 'Шағылу шебері', m: ['.....*/#..#', '...........', '.#........#', '#....\\..*.#', 'L>.........#', '..#.#..*\\..', '........\\.#'], inv: 3, best: 6},
    {n: 'Финал', m: ['...#..#../..', '...\\#.......', 'L>....#.*....', '#........#\\*', '.##....#\\../', '....*......#', '#....*..\\.#.'], inv: 3, best: 8},
  ];
  var lvI, grid, W, H, laser, crystals, inv, used, moves, cell, cv, ctx, c, stop, won, tm = 0;

  // Жолды белгілерге бөлу: «L>», «F/» — екі таңбалы белгі, қалғаны — бір таңба
  function tokens(row) { var out = [], i = 0; while (i < row.length) { var ch = row[i]; if (ch === 'L' || ch === 'F') { out.push(row.substr(i, 2)); i += 2; } else { out.push(ch); i++; } } return out; }
  function parse(L) {
    var rows = L.m.map(tokens);
    H = rows.length; W = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    grid = []; crystals = []; laser = null;
    for (var y = 0; y < H; y++) {
      grid.push([]);
      for (var x = 0; x < W; x++) {
        var tk = rows[y][x] || '.', g = { t: '.', fixed: false };
        if (tk[0] === 'L') { var d = tk[1]; laser = { x: x, y: y, dx: d === '>' ? 1 : d === '<' ? -1 : 0, dy: d === 'v' ? 1 : d === '^' ? -1 : 0 }; g.t = 'L'; }
        else if (tk === '*') { g.t = '*'; crystals.push([x, y]); }
        else if (tk === '#') g.t = '#';
        else if (tk === '/' || tk === '\\') { g.t = tk; g.rot = true; }
        else if (tk[0] === 'F') { g.t = tk[1]; g.fixed = true; }
        grid[y].push(g);
      }
    }
  }
  function trace() {
    var x = laser.x, y = laser.y, dx = laser.dx, dy = laser.dy, path = [[x, y]], lit = {}, seen = {};
    for (var k = 0; k < 400; k++) {
      x += dx; y += dy;
      if (x < 0 || y < 0 || x >= W || y >= H) { path.push([x, y]); break; }
      var g = grid[y][x], key = x + ',' + y + ',' + dx + ',' + dy;
      if (seen[key]) break; seen[key] = 1;
      if (g.t === '#' || g.t === 'L') { path.push([x - dx * 0.5, y - dy * 0.5]); break; }
      if (g.t === '*') lit[x + ',' + y] = true;
      if (g.t === '/') { path.push([x, y]); var t = dx; dx = -dy; dy = -t; }
      else if (g.t === '\\') { path.push([x, y]); var t2 = dx; dx = dy; dy = t2; }
    }
    if (path[path.length - 1][0] !== x || path[path.length - 1][1] !== y) path.push([x, y]);
    return { path: path, lit: lit };
  }

  function startLevel(n) {
    lvI = n - 1; var L = LEVELS[lvI];
    parse(L); inv = L.inv; used = 0; moves = 0; won = false;
    var r = S.root; r.innerHTML = '';
    r.appendChild(S.hud([['Деңгей', 'mL', n + ' / ' + LEVELS.length], ['Кристал', 'mC', '0 / ' + crystals.length], ['Қоймадағы айна', 'mI', String(inv)], ['Жүріс', 'mM', '0']]));
    c = S.canvas(900, Math.round(900 * Math.min(0.72, (H + 0.6) / (W + 0.6)))); cv = c.cv; ctx = c.ctx;
    cell = Math.min(c.W / (W + 0.6), c.H / (H + 0.6));
    r.appendChild(S.el('p', 'muted small', T(inv ? 'Айнаны түрт — 45°-қа бұрылады. Бос ұяшықты түртсең, қоймадан айна қойылады; оны қайта түртіп бұра аласың, үшінші рет түртсең — алынады.' : 'Айнаны түрт — 45°-қа бұрылады. Барлық кристалды сәулемен жандыр.')));
    cv.addEventListener('pointerdown', tap);
    if (stop) stop(); stop = S.loop(function (dt) { tm += dt; draw(); });
  }
  function cellAt(p) { var ox = (c.W - W * cell) / 2, oy = (c.H - H * cell) / 2; return { x: Math.floor((p.x - ox) / cell), y: Math.floor((p.y - oy) / cell) }; }
  function tap(e) {
    if (won) return;
    var q = cellAt(c.pos(e));
    if (q.x < 0 || q.y < 0 || q.x >= W || q.y >= H) return;
    var g = grid[q.y][q.x];
    if (g.fixed || g.t === '#' || g.t === '*' || g.t === 'L') { S.sfx('bad'); return; }
    if (g.rot) { g.t = g.t === '/' ? '\\' : '/'; }
    else if (g.placed) { if (g.t === '/') g.t = '\\'; else { g.t = '.'; g.placed = false; inv++; used--; } }
    else if (g.t === '.') { if (!inv) { S.toast('Қоймада айна жоқ', 'bad'); return; } g.t = '/'; g.placed = true; inv--; used++; }
    moves++; S.sfx('pop'); S.set('mM', String(moves)); S.set('mI', String(inv));
    var tr = trace(), n = Object.keys(tr.lit).length;
    S.set('mC', n + ' / ' + crystals.length);
    if (n === crystals.length) {
      won = true; S.sfx('ok');
      var L = LEVELS[lvI], extra = Math.max(0, moves - L.best * 2);
      var stars = extra <= 2 ? 3 : extra <= 6 ? 2 : 1;
      S.setLevelStars(lvI + 1, stars);
      setTimeout(function () { finish(stars); }, 1100);
    }
  }
  function campaign() { var st = S.levelStars(), s = 0; for (var k in st) s += st[k] * 100; return s; }
  function finish(stars) {
    if (stop) { stop(); stop = null; }
    var last = lvI === LEVELS.length - 1;
    S.end({ title: 'Барлық кристал жанды!', stars: stars, score: campaign(), unit: 'жорық ұпайы', lines: [T('Жүріс саны') + ': ' + moves + '. ' + T('Әр шағылуда түсу бұрышы шағылу бұрышына тең болды.')],
      onNext: last ? null : function () { startLevel(lvI + 2); }, onAgain: function () { startLevel(lvI + 1); }, onMenu: menu });
  }
  function draw() {
    var ox = (c.W - W * cell) / 2, oy = (c.H - H * cell) / 2;
    var bg = ctx.createLinearGradient(0, 0, 0, c.H); bg.addColorStop(0, '#17123a'); bg.addColorStop(1, '#2a1f5c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, c.W, c.H);
    var P = function (x, y) { return { x: ox + (x + 0.5) * cell, y: oy + (y + 0.5) * cell }; };
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var g = grid[y][x], X = ox + x * cell, Y = oy + y * cell;
      ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.07)'; ctx.fillRect(X, Y, cell, cell);
      if (g.t === '#') { ctx.fillStyle = '#4a4470'; ctx.fillRect(X + 2, Y + 2, cell - 4, cell - 4); ctx.fillStyle = '#5d5690'; ctx.fillRect(X + 2, Y + 2, cell - 4, 6); }
    }
    var tr = trace();
    // сәуле
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[14, 'rgba(255,60,90,.18)'], [6, 'rgba(255,70,100,.85)'], [2, '#fff']].forEach(function (s) {
      ctx.strokeStyle = s[1]; ctx.lineWidth = s[0]; ctx.beginPath();
      tr.path.forEach(function (pt, i) { var q = P(pt[0], pt[1]); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
      ctx.stroke();
    });
    ctx.restore();
    for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
      var gg = grid[yy][xx], q = P(xx, yy);
      if (gg.t === '/' || gg.t === '\\') {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(gg.t === '/' ? -Math.PI / 4 : Math.PI / 4);
        ctx.fillStyle = gg.fixed ? '#8c95a3' : '#cfe7ff'; ctx.fillRect(-cell * 0.42, -4, cell * 0.84, 8);
        ctx.fillStyle = gg.fixed ? '#5c6470' : '#5aa0ff'; ctx.fillRect(-cell * 0.42, 2, cell * 0.84, 3);
        ctx.restore();
        if (gg.placed) { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(q.x + cell * 0.32, q.y - cell * 0.32, 4, 0, 7); ctx.fill(); }
      }
      if (gg.t === '*') {
        var on = tr.lit[xx + ',' + yy], s = cell * 0.3 * (on ? 1 + Math.sin(tm * 6) * 0.08 : 1);
        if (on) { var rg = ctx.createRadialGradient(q.x, q.y, 2, q.x, q.y, cell * 0.7); rg.addColorStop(0, 'rgba(124,242,255,.7)'); rg.addColorStop(1, 'rgba(124,242,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(q.x, q.y, cell * 0.7, 0, 7); ctx.fill(); }
        ctx.fillStyle = on ? '#7cf2ff' : '#3a6070'; ctx.beginPath(); ctx.moveTo(q.x, q.y - s); ctx.lineTo(q.x + s * 0.8, q.y); ctx.lineTo(q.x, q.y + s); ctx.lineTo(q.x - s * 0.8, q.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = on ? '#fff' : '#7aa'; ctx.lineWidth = 2; ctx.stroke();
      }
      if (gg.t === 'L') {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.atan2(laser.dy, laser.dx));
        ctx.fillStyle = '#2b2f36'; ctx.fillRect(-cell * 0.38, -cell * 0.22, cell * 0.7, cell * 0.44);
        ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(cell * 0.32, 0, 6, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
  }
  function menu() { S.intro({ title: 'Сәулені бағытта', lead: 'Айналарды бұрып, лазер сәулесін барлық кристалға жеткіз.', levels: LEVELS.length, levelNames: LEVELS.map(function (l) { return l.n; }), onStart: function (o) { startLevel(o.level); } }); }
  menu();
})();

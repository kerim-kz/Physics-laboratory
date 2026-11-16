/* Оптикалық аспаптар: лупа, фотоаппарат, проектор. Бәрі — жинағыш линза; кескін түрі нәрсенің фокусқа қатысты орнына тәуелді. */
(function () {
  var R = window.Real;
  var DEV = {
    loupe: { name: 'Лупа', F: 10, d: [3, 9], dv: 6, hint: 'Нәрсе фокустың ішінде (d < F): кескін жалған, тура, үлкейтілген.' },
    camera: { name: 'Фотоаппарат', F: 5, d: [12, 60], dv: 40, hint: 'Нәрсе екі фокустан алыс (d > 2F): кескін шын, төңкерілген, кішірейтілген — сенсорда.' },
    projector: { name: 'Проектор', F: 8, d: [8.5, 15], dv: 10, hint: 'Нәрсе F мен 2F аралығында: кескін шын, төңкерілген, үлкейтілген — экранда.' },
  };
  Sim.create({
    aspect: 0.56, grid: false, static: true, resetLabel: false,
    hint: 'Аспапты таңдап, нәрсенің линзадан қашықтығын өзгерт.',
    controls: [
      { type: 'select', key: 'dev', label: 'Аспап', value: 'camera', options: Object.keys(DEV).map(function (k) { return [k, DEV[k].name]; }) },
      { type: 'range', key: 'k', label: 'Нәрсенің қашықтығы (аспап шегінде)', min: 0, max: 100, step: 1, value: 50, unit: '%', digits: 0 },
    ],
    readouts: [
      { key: 'F', label: 'Фокус аралығы F', unit: 'см', digits: 1 },
      { key: 'd', label: 'Нәрсеге дейін d', unit: 'см', digits: 1 },
      { key: 'f', label: 'Кескінге дейін f', unit: 'см', digits: 1 },
      { key: 'G', label: 'Ұлғайту Γ', digits: 2 },
      { key: 'kind', label: 'Кескін', text: true },
    ],
    init: function () {}, step: function () {},
    read: function (api) { var o = solve(api.P); return { F: o.F, d: o.d, f: o.f, G: Math.abs(o.f / o.d), kind: (o.f > 0 ? 'шын, төңкерілген, ' : 'жалған, тура, ') + (Math.abs(o.f / o.d) > 1 ? 'үлкейтілген' : 'кішірейтілген') }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, o = solve(P), D = DEV[P.dev], cy = H * 0.5;
      R.scene(ctx, W, H, P.dev === 'loupe' ? 'lab' : 'wall', { table: H * 0.92 });
      var lx = P.dev === 'camera' ? W * 0.62 : P.dev === 'loupe' ? W * 0.62 : W * 0.45;
      var span = P.dev === 'camera' ? 70 : P.dev === 'projector' ? 60 : 30, k = (W * 0.86) / span;
      if (P.dev === 'projector') k = (W * 0.86) / 75;
      var X = function (cm) { return lx + cm * k; };
      ctx.strokeStyle = 'rgba(60,70,80,.45)'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke(); ctx.setLineDash([]);
      [-1, 1].forEach(function (s) { [[o.F, 'F'], [2 * o.F, '2F']].forEach(function (p) { var x = X(s * p[0]); if (x < 0 || x > W) return; ctx.fillStyle = '#1b2329'; ctx.beginPath(); ctx.arc(x, cy, 3, 0, 7); ctx.fill(); R.txt(ctx, p[1], x, cy + 14, { size: 10.5, color: '#1b2329' }); }); });
      // аспап корпусы
      if (P.dev === 'camera') { R.block(ctx, X(-1.5), cy - H * 0.2, X(o.f + 1.5) - X(-1.5), H * 0.4, { c: '#26292d', t: 'plain', gloss: 0.4 }, { depth: 14, shadow: false }); ctx.fillStyle = '#3a6fb0'; ctx.fillRect(X(o.f) - 2, cy - H * 0.15, 4, H * 0.3); R.txt(ctx, 'сенсор', X(o.f), cy - H * 0.17, { size: 9.5, color: '#fff' }); }
      if (P.dev === 'projector') { ctx.fillStyle = '#f4f2ea'; ctx.fillRect(Math.min(W - 18, X(o.f)) - 4, H * 0.05, 8, H * 0.9); R.bulb(ctx, X(-o.d - 4), cy, 16, 1); }
      // линза
      var lh = H * 0.32;
      ctx.save(); ctx.fillStyle = 'rgba(180,220,245,.7)'; ctx.strokeStyle = 'rgba(70,110,140,.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(lx, cy, 12, lh, 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
      if (P.dev === 'loupe') { ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(lx, cy, 14, lh + 4, 0, 0, 7); ctx.stroke(); ctx.fillStyle = '#4a2f1c'; ctx.fillRect(lx - 6, cy + lh + 4, 12, H * 0.12); }
      // нәрсе (жебе / слайд / жәндік) және кескін
      var oh = P.dev === 'camera' ? H * 0.2 : H * 0.08, ox = X(-o.d);
      arrow(ctx, ox, cy, oh, '#d2382b', P.dev === 'loupe' ? 'нәрсе' : 'нәрсе');
      var ih = oh * (-o.f / o.d), ix = X(o.f);
      if (Math.abs(ih) < H * 0.6 && ix > -50 && ix < W + 50) { ctx.save(); ctx.globalAlpha = o.f > 0 ? 0.9 : 0.45; arrow(ctx, ix, cy, ih, '#1f5fd1', o.f > 0 ? 'шын кескін' : 'жалған кескін'); ctx.restore(); }
      // сәулелер: 1) оське параллель → линзадан кейін F' арқылы; 2) оптикалық центр арқылы — сынбай
      var top = cy - oh, itop = cy - ih;
      var toEdge = function (x1, y1, x2, y2) { var t = (W - x1) / (x2 - x1); return [W, y1 + (y2 - y1) * t]; };
      ctx.save(); ctx.strokeStyle = 'rgba(224,160,32,.95)'; ctx.lineWidth = 1.6;
      var e1 = toEdge(lx, top, X(o.F), cy), e2 = toEdge(ox, top, lx, cy);
      ctx.beginPath(); ctx.moveTo(ox, top); ctx.lineTo(lx, top); ctx.lineTo(e1[0], e1[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, top); ctx.lineTo(e2[0], e2[1]); ctx.stroke();
      if (o.f < 0) { ctx.setLineDash([5, 4]); ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(ix, itop); ctx.moveTo(lx, cy); ctx.lineTo(ix, itop); ctx.stroke(); }
      ctx.restore();
      R.tag(ctx, D.hint, W / 2, H - 16, { size: 11 });
    },
  });
  function solve(P) { var D = DEV[P.dev], d = D.d[0] + (D.d[1] - D.d[0]) * P.k / 100, F = D.F; return { F: F, d: d, f: 1 / (1 / F - 1 / d) }; }
  function arrow(ctx, x, y, h, col, label) {
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
    var s = h > 0 ? 1 : -1; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - 6, y - h + s * 10); ctx.lineTo(x + 6, y - h + s * 10); ctx.closePath(); ctx.fill();
    ctx.restore();
    R.txt(ctx, label, x, y - h - (h > 0 ? 12 : -14), { size: 10, color: col });
  }
})();

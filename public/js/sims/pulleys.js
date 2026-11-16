/* Жай механизмдер: қозғалмайтын блок, жылжымалы блок, полиспаст. Күштен ұтыс және «алтын ереже». */
(function () {
  var R = window.Real;
  var TYPES = { fixed: ['Қозғалмайтын блок', 1], movable: ['Жылжымалы блок', 2], tackle: ['Полиспаст (2 жылжымалы блок)', 4] };
  function pulley(ctx, x, y, r) {
    ctx.save();
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#eef1f3'); g.addColorStop(0.7, '#9aa3ab'); g.addColorStop(1, '#5d656c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#4a5157'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r - 3, 0, 7); ctx.stroke();
    R.sphere(ctx, x, y, r * 0.22, '#c9a24a');
    ctx.restore();
  }
  function rope(ctx, pts) { R.wire(ctx, pts, { color: '#c8a46a', w: 3 }); }
  Sim.create({
    aspect: 0.62, grid: false,
    hint: 'Жүкті 1 м-ге көтеру үшін арқанның ұшын қанша тарту керек? Күш пен жолды салыстыр.',
    controls: [
      { type: 'select', key: 'type', label: 'Механизм', value: 'movable', options: Object.keys(TYPES).map(function (k) { return [k, TYPES[k][0]]; }) },
      { type: 'range', key: 'm', label: 'Жүктің массасы', min: 2, max: 20, step: 1, value: 10, unit: 'кг', digits: 0 },
      { type: 'check', key: 'blockm', label: 'Блоктың массасын ескеру (0,5 кг)', value: false },
    ],
    readouts: [
      { key: 'P', label: 'Жүктің салмағы P', unit: 'Н', digits: 1 },
      { key: 'F', label: 'Тарту күші F', unit: 'Н', digits: 1 },
      { key: 'gain', label: 'Күштен ұтыс P / F', digits: 2 },
      { key: 'hl', label: 'Жүктің көтерілуі h', unit: 'м', digits: 2 },
      { key: 'sl', label: 'Арқан ұшының жолы s', unit: 'м', digits: 2 },
      { key: 'gold', label: 'F·s және P·h', text: true },
    ],
    init: function (api) { api.S.h = 0; },
    step: function (api, dt) { api.S.h = Math.min(1, api.S.h + dt * 0.25); if (api.S.h >= 1) return false; },
    read: function (api) {
      var P = api.P, n = TYPES[P.type][1], Pw = P.m * 9.8, extra = P.blockm ? (P.type === 'fixed' ? 0 : (P.type === 'movable' ? 0.5 : 1) * 9.8) : 0;
      var F = (Pw + extra) / n, h = api.S.h, s = h * n;
      return { P: Pw, F: F, gain: Pw / F, hl: h, sl: s, gold: Sim.fmt(F * s, 1) + ' Дж ≈ ' + Sim.fmt(Pw * h, 1) + ' Дж' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, n = TYPES[P.type][1], floor = H * 0.94;
      R.scene(ctx, W, H, 'lab', { table: floor });
      var beamY = 28, cx = W * 0.4, mpx = (floor - 120) / 2.6;
      ctx.fillStyle = '#4b5258'; ctx.fillRect(W * 0.1, beamY - 12, W * 0.8, 12);
      var r = 26;
      var loadTop = floor - 40 - S.h * mpx - 60, s = Math.cbrt(P.m / 10);
      if (P.type === 'fixed') {
        var py = beamY + 40; ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, beamY); ctx.lineTo(cx, py); ctx.stroke();
        rope(ctx, [[cx - r, loadTop], [cx - r, py]]); rope(ctx, [[cx + r, py], [cx + r, floor - 140 + S.h * mpx]]);
        pulley(ctx, cx, py, r);
        hand(ctx, cx + r, floor - 140 + S.h * mpx);
        R.weight(ctx, cx - r, loadTop, 150 + P.m * 25, { label: P.m + ' кг' });
        R.force(ctx, cx + r + 30, floor - 170 + S.h * mpx, cx + r + 30, floor - 170 + S.h * mpx + 50, '#d2382b', 'F');
      } else {
        var my = loadTop - 10, fx = cx + r * 3;
        var anchor = cx - r;
        var fixY = beamY + 40;
        if (P.type === 'movable') {
          rope(ctx, [[anchor, beamY], [anchor, my]]); rope(ctx, [[cx + r, my], [cx + r, fixY]]);
          rope(ctx, [[cx + r + 2 * r, fixY], [cx + 3 * r, floor - 140 + S.h * mpx * 2 - 60]]);
          ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 2 * r, beamY); ctx.lineTo(cx + 2 * r, fixY); ctx.stroke();
          pulley(ctx, cx + 2 * r, fixY, r); pulley(ctx, cx, my, r);
          hand(ctx, cx + 3 * r, floor - 140 + S.h * mpx * 2 - 60);
        } else {
          var r2 = 20;
          rope(ctx, [[cx - r, beamY], [cx - r, my]]);
          rope(ctx, [[cx + r, my], [cx + r, fixY]]);
          rope(ctx, [[cx + 3 * r, fixY], [cx + 3 * r, my]]);
          rope(ctx, [[cx + 5 * r, my], [cx + 5 * r, fixY]]);
          rope(ctx, [[cx + 7 * r, fixY], [cx + 7 * r, Math.min(floor - 40, floor - 200 + S.h * mpx * 4 * 0.5)]]);
          [[cx + 2 * r, fixY], [cx + 6 * r, fixY]].forEach(function (p) { ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p[0], beamY); ctx.lineTo(p[0], p[1]); ctx.stroke(); pulley(ctx, p[0], p[1], r); });
          ctx.fillStyle = '#4a5157'; ctx.fillRect(cx, my - 4, 4 * r, 8);
          pulley(ctx, cx, my, r); pulley(ctx, cx + 4 * r, my, r);
          hand(ctx, cx + 7 * r, Math.min(floor - 40, floor - 200 + S.h * mpx * 2));
          ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 2 * r, my); ctx.lineTo(cx + 2 * r, my + 20); ctx.stroke();
        }
        var hookX = P.type === 'movable' ? cx : cx + 2 * r;
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hookX, my); ctx.lineTo(hookX, my + 24); ctx.stroke();
        R.weight(ctx, hookX, my + 20, 150 + P.m * 25, { label: P.m + ' кг' });
      }
      R.tag(ctx, TYPES[P.type][0] + ': күштен ' + n + ' есе ұтыс, жолдан ' + n + ' есе ұтылыс', W / 2, H - 22, { size: 12 });
    },
  });
  function hand(ctx, x, y) { R.sphere(ctx, x, y + 10, 11, '#e3b48a'); }
})();

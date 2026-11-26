/* Қатынас ыдыстар: біртекті сұйықтың деңгейлері бірдей; әртекті сұйықтарда ρ₁h₁ = ρ₂h₂. */
(function () {
  var R = window.Real;
  var LQ = { water: ['Су', 1000, 'water'], oil: ['Күнбағыс майы', 920, 'oil'], kerosene: ['Керосин', 800, 'kerosene'], saltwater: ['Тұзды су', 1030, 'saltwater'] };
  Sim.create({
    aspect: 0.6, grid: false, autoplay: true, keepRunning: true,
    hint: 'Оң жақ түтікке басқа сұйық құйып көр. Шекара деңгейінен бастап өлшенген бағандардың биіктіктері қандай?',
    controls: [
      { type: 'select', key: 'shape', label: 'Ыдыстар', value: 'u', options: [['u', 'U тәрізді түтік'], ['forms', 'Әртүрлі пішінді ыдыстар'], ['teapot', 'Шәйнек']] },
      { type: 'select', key: 'top', when: function (P) { return P.shape === 'u'; }, label: 'Оң жаққа құйылған сұйық', value: 'oil', options: [['none', 'Ештеңе (тек су)']].concat(Object.keys(LQ).filter(function (k) { return k !== 'water'; }).map(function (k) { return [k, LQ[k][0]]; })) },
      { type: 'range', key: 'h2', label: 'Құйылған бағанның биіктігі h₂', min: 2, max: 18, step: 1, value: 12, unit: 'см', digits: 0 },
    ],
    readouts: [
      { key: 'h1', label: 'Су бағаны h₁ (шекарадан)', unit: 'см', digits: 1 },
      { key: 'h2', label: 'Құйылған сұйық бағаны h₂', unit: 'см', digits: 1 },
      { key: 'rat', label: 'h₂ / h₁ = ρ₁ / ρ₂', digits: 2 },
    ],
    init: function (api) { api.S.lvl = 0; api.S.t = 0; },
    step: function (api, dt) { api.S.t += dt; },
    read: function (api) {
      var P = api.P;
      if (P.shape !== 'u' || P.top === 'none') return { h1: 0, h2: 0, rat: 1 };
      var h1 = P.h2 * LQ[P.top][1] / 1000;
      return { h1: h1, h2: P.h2, rat: P.h2 / h1 };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.9;
      R.scene(ctx, W, H, 'lab', { table: table });
      var wave = S.t * 2;
      if (P.shape === 'u') {
        var cx = W * 0.42, tw = 46, gap = 150, bottom = table - 30, top = 40, cm = (bottom - top - 40) / 30; // 1 см
        var lx = cx - gap / 2 - tw / 2, rx = cx + gap / 2 - tw / 2;
        var base = bottom - 24; // су деңгейінің негізі (тек су болғанда)
        var water0 = 14; // см (бастапқы деңгей)
        var oil = P.top !== 'none', h2 = oil ? P.h2 : 0, h1 = oil ? h2 * LQ[P.top][1] / 1000 : 0;
        // шекара оң жақта: су оң жақта (h1 - ... ) төмендейді
        var interfaceY = base - (water0 - h1 / 2) * cm + 0; // оң түтіктегі шекара
        var leftTop = interfaceY - h1 * cm, rightTop = interfaceY - h2 * cm;
        if (!oil) { leftTop = rightTop = base - water0 * cm; interfaceY = leftTop; }
        // шыны түтік
        ctx.save();
        var gl = ctx.createLinearGradient(lx, 0, rx + tw, 0); gl.addColorStop(0, 'rgba(200,230,245,.35)'); gl.addColorStop(1, 'rgba(160,200,220,.35)');
        // су (иілген бөлік)
        ctx.fillStyle = 'rgba(90,160,225,.6)';
        ctx.fillRect(lx + 3, leftTop, tw - 6, bottom - leftTop);
        ctx.fillRect(rx + 3, interfaceY, tw - 6, bottom - interfaceY);
        ctx.fillRect(lx + 3, bottom - 6, rx - lx + tw - 6, 30);
        if (oil) { R.liquid(ctx, rx + 3, rightTop, tw - 6, interfaceY - rightTop, LQ[P.top][2]); }
        R.liquid(ctx, lx + 3, leftTop, tw - 6, 4, 'water', wave);
        ctx.strokeStyle = 'rgba(80,120,140,.85)'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(lx, top); ctx.lineTo(lx, bottom + 24); ctx.lineTo(rx + tw, bottom + 24); ctx.lineTo(rx + tw, top);
        ctx.moveTo(lx + tw, top); ctx.lineTo(lx + tw, bottom - 6); ctx.lineTo(rx, bottom - 6); ctx.lineTo(rx, top); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(lx + 6, top + 6, 3, bottom - top); ctx.fillRect(rx + 6, top + 6, 3, bottom - top);
        ctx.restore();
        if (oil) {
          // өлшемдер шекарадан
          ctx.save(); ctx.strokeStyle = '#0b6b78'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(lx - 30, interfaceY); ctx.lineTo(rx + tw + 30, interfaceY); ctx.stroke(); ctx.restore();
          R.tag(ctx, 'h₁ = ' + Sim.fmt(h1, 1) + ' см (су)', lx - 80, (interfaceY + leftTop) / 2, { size: 11, color: '#1f5fd1' });
          R.tag(ctx, 'h₂ = ' + h2 + ' см (' + LQ[P.top][0].toLowerCase() + ')', rx + tw + 90, (interfaceY + rightTop) / 2, { size: 11, color: '#a8701a' });
        } else R.tag(ctx, 'Біртекті сұйықтың деңгейлері бірдей', cx, top - 18, { size: 12 });
        R.ruler(ctx, rx + tw + 16, top, bottom - top, cm, { vertical: true, width: 22 });
      } else if (P.shape === 'forms') {
        var lvl = table - 170;
        var xs = [W * 0.16, W * 0.34, W * 0.52, W * 0.7], tops = table - 260;
        ctx.save();
        ctx.fillStyle = 'rgba(90,160,225,.6)'; ctx.fillRect(xs[0], table - 26, xs[3] + 60 - xs[0], 18);
        ctx.restore();
        xs.forEach(function (x, i) {
          ctx.save();
          var path = function () {
            ctx.beginPath();
            if (i === 0) { ctx.rect(x, tops, 40, table - 26 - tops); }
            else if (i === 1) { ctx.moveTo(x - 30, tops); ctx.lineTo(x + 70, tops); ctx.lineTo(x + 40, table - 26); ctx.lineTo(x, table - 26); ctx.closePath(); }
            else if (i === 2) { ctx.moveTo(x + 10, tops); ctx.lineTo(x + 30, tops); ctx.lineTo(x + 30, tops + 80); ctx.quadraticCurveTo(x + 80, tops + 140, x + 40, table - 26); ctx.lineTo(x, table - 26); ctx.quadraticCurveTo(x - 40, tops + 140, x + 10, tops + 80); ctx.closePath(); }
            else { ctx.moveTo(x, tops); ctx.lineTo(x + 20, tops); ctx.lineTo(x + 50, tops + 100); ctx.lineTo(x + 50, table - 26); ctx.lineTo(x, table - 26); ctx.closePath(); }
          };
          path(); ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(90,160,225,.6)'; ctx.fillRect(x - 60, lvl, 200, table); R.liquid(ctx, x - 60, lvl, 200, 4, 'water', wave + i); ctx.restore();
          path(); ctx.strokeStyle = 'rgba(80,120,140,.85)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        });
        ctx.save(); ctx.strokeStyle = '#d2382b'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xs[0] - 50, lvl); ctx.lineTo(xs[3] + 110, lvl); ctx.stroke(); ctx.restore();
        R.tag(ctx, 'Пішініне қарамай, деңгей бірдей', W / 2, 26, { size: 12 });
      } else {
        // шәйнек: тұмсығы мен корпусындағы су деңгейі бірдей
        var bx = W * 0.32, by = table - 200, bw = 220, bh = 190, l2 = table - 140;
        ctx.save();
        var tg = ctx.createRadialGradient(bx + bw * 0.35, by + bh * 0.3, 10, bx + bw / 2, by + bh / 2, bw * 0.75);
        tg.addColorStop(0, '#f6f7f8'); tg.addColorStop(1, '#9aa3ab');
        ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh * 0.55, bw / 2, bh * 0.48, 0, 0, 7);
        ctx.fillStyle = tg; ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(90,160,225,.0)'; ctx.restore();
        // тұмсық
        ctx.beginPath(); ctx.moveTo(bx + bw - 20, by + bh * 0.75); ctx.lineTo(bx + bw + 80, by + 10); ctx.lineTo(bx + bw + 96, by + 14); ctx.lineTo(bx + bw + 6, by + bh * 0.88); ctx.closePath(); ctx.fill();
        // кесінді көрініс (ішін көрсету үшін)
        ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(bx + 40, by + 26, bw - 80, bh - 50);
        ctx.fillStyle = 'rgba(90,160,225,.65)'; ctx.fillRect(bx + 40, l2, bw - 80, by + bh - 24 - l2);
        ctx.restore();
        R.tag(ctx, 'Шәйнектің корпусы мен тұмсығы — қатынас ыдыстар', W / 2, 26, { size: 12 });
        ctx.save(); ctx.strokeStyle = '#d2382b'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(bx, l2); ctx.lineTo(bx + bw + 120, l2); ctx.stroke(); ctx.restore();
        R.tag(ctx, 'Су деңгейі тұмсықтың ұшынан аспайды', bx + bw + 110, l2 - 18, { size: 10.5 });
      }
    },
  });
})();

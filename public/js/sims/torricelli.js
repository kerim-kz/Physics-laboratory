/* Атмосфералық қысым: Торричелли тәжірибесі және анероид-барометр. Биіктікке көтерілгенде қысым кемиді. */
(function () {
  var R = window.Real;
  // Барометрлік формула (изотермалық жуықтау): p = p₀ · exp(−h / 8000 м)
  function pmm(h) { return 760 * Math.exp(-h / 8000); }
  Sim.create({
    aspect: 0.62, grid: false, static: true, resetLabel: false,
    hint: 'Биіктікті өзгерт: сынап бағаны мен барометр тілі қалай өзгереді? Жер бетіне жақын жерде әр 12 м сайын шамамен 1 мм сын. бағ.',
    controls: [
      { type: 'range', key: 'h', label: 'Теңіз деңгейінен биіктік', min: 0, max: 5000, step: 50, value: 0, unit: 'м', digits: 0 },
      { type: 'select', key: 'place', label: 'Мысал', value: 'none', options: [['none', '—'], ['0', 'Каспий жағасы (−28 м ≈ 0)'], ['850', 'Алматы (850 м)'], ['350', 'Астана (350 м)'], ['1700', 'Медеу (1700 м)'], ['4000', 'Тұйықсу мұздығы (4000 м)']] },
    ],
    readouts: [
      { key: 'mm', label: 'Атмосфералық қысым', unit: 'мм сын. бағ.', digits: 0 },
      { key: 'pa', label: 'Сол, Па', unit: 'Па', digits: 0 },
      { key: 'kpa', label: 'Сол, кПа', unit: 'кПа', digits: 1 },
    ],
    init: function () {}, step: function () {},
    onLive: function (api, key) { if (key === 'place' && api.P.place !== 'none') api.set('h', +api.P.place); },
    read: function (api) { var mm = pmm(api.P.h); return { mm: mm, pa: mm * 133.3, kpa: mm * 0.1333 }; },
    draw: function (api, ctx, W, H) {
      var P = api.P, mm = pmm(P.h), ground = H * 0.86;
      // таулы фон: биіктік артқан сайын аспан қоюланады
      var k = P.h / 5000;
      var sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, 'rgb(' + Math.round(80 - 50 * k) + ',' + Math.round(150 - 80 * k) + ',' + Math.round(220 - 60 * k) + ')'); sky.addColorStop(1, '#dcebf6');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground);
      ctx.fillStyle = '#7d8a99'; ctx.beginPath(); ctx.moveTo(W * 0.45, ground); ctx.lineTo(W * 0.72, H * 0.15); ctx.lineTo(W * 0.85, H * 0.4); ctx.lineTo(W * 0.95, H * 0.22); ctx.lineTo(W * 1.1, ground); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W * 0.68, H * 0.24); ctx.lineTo(W * 0.72, H * 0.15); ctx.lineTo(W * 0.77, H * 0.25); ctx.lineTo(W * 0.74, H * 0.23); ctx.lineTo(W * 0.71, H * 0.27); ctx.fill();
      // биіктік көрсеткіші тауда
      var my = ground - (ground - H * 0.15) * k;
      R.sphere(ctx, W * 0.45 + (W * 0.72 - W * 0.45) * k, my, 7, '#d2382b');
      R.tag(ctx, P.h + ' м', W * 0.45 + (W * 0.72 - W * 0.45) * k + 44, my, { size: 11 });
      R.tableTop(ctx, 0, ground, W, H - ground);
      // Торричелли түтігі: ыдыстағы сынап, 1 м түтік
      var tx = W * 0.14, tw = 22, ttop = 20, cupY = ground - 40, scale = (cupY - ttop - 20) / 900; // 1 мм = scale px
      var colTop = cupY - mm * scale;
      ctx.save();
      var gl = ctx.createLinearGradient(tx, 0, tx + tw, 0); gl.addColorStop(0, 'rgba(200,230,245,.45)'); gl.addColorStop(0.3, 'rgba(255,255,255,.7)'); gl.addColorStop(1, 'rgba(160,200,220,.45)');
      ctx.fillStyle = gl; R.rr(ctx, tx, ttop, tw, cupY + 10 - ttop, tw / 2); ctx.fill();
      ctx.restore();
      R.liquid(ctx, tx + 3, colTop, tw - 6, cupY + 10 - colTop, 'mercury');
      R.txt(ctx, 'вакуум', tx - 8, ttop + 18, { size: 9.5, align: 'right', color: '#33424c' });
      R.vessel(ctx, tx - 40, cupY - 10, tw + 80, 46, 22, { liquid: 'mercury' });
      // миллиметрлік шкала: нөлі ыдыстағы сынаптың бетінде, мәндері жоғары қарай артады
      var sx = tx + tw + 30, base = cupY;
      ctx.save();
      ctx.fillStyle = '#f7f3e6'; R.rr(ctx, sx, ttop + 4, 46, base - ttop, 4); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
      ctx.strokeStyle = '#222';
      for (var v = 0; v <= 900; v += 10) {
        var yy = base - v * scale, big = v % 100 === 0, mid = v % 50 === 0;
        ctx.lineWidth = big ? 1.1 : 0.6;
        ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(sx + (big ? 14 : mid ? 10 : 6), yy); ctx.stroke();
        if (big) R.txt(ctx, String(v), sx + 30, yy, { size: 9, mono: true, color: '#222', weight: '500' });
      }
      R.txt(ctx, 'мм', sx + 30, ttop + 12, { size: 9, color: '#555' });
      ctx.restore();
      ctx.save(); ctx.strokeStyle = '#d2382b'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(tx - 10, colTop); ctx.lineTo(sx + 50, colTop); ctx.stroke(); ctx.restore();
      R.tag(ctx, Math.round(mm) + ' мм', sx + 90, colTop, { size: 12, color: '#b4342a' });
      // анероид-барометр
      var bx = W * 0.47, byy = H * 0.5, br = Math.min(W, H) * 0.14;
      ctx.save();
      var cg = ctx.createRadialGradient(bx - br * 0.3, byy - br * 0.3, br * 0.1, bx, byy, br * 1.1);
      cg.addColorStop(0, '#f2e1a0'); cg.addColorStop(1, '#8a6a20');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(bx, byy, br * 1.12, 0, 7); ctx.fill();
      ctx.fillStyle = '#fbf8ee'; ctx.beginPath(); ctx.arc(bx, byy, br, 0, 7); ctx.fill();
      var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, v0 = 400, v1 = 800;
      for (var v = v0; v <= v1; v += 10) {
        var a = a0 + (a1 - a0) * (v - v0) / (v1 - v0), big = v % 50 === 0;
        ctx.strokeStyle = '#222'; ctx.lineWidth = big ? 1.4 : 0.6;
        ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * br * 0.9, byy + Math.sin(a) * br * 0.9); ctx.lineTo(bx + Math.cos(a) * br * (big ? 0.76 : 0.83), byy + Math.sin(a) * br * (big ? 0.76 : 0.83)); ctx.stroke();
        if (v % 100 === 0) R.txt(ctx, String(v), bx + Math.cos(a) * br * 0.62, byy + Math.sin(a) * br * 0.62, { size: 9, mono: true, color: '#222' });
      }
      var an = a0 + (a1 - a0) * (mm - v0) / (v1 - v0);
      ctx.strokeStyle = '#1d1f22'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(bx, byy); ctx.lineTo(bx + Math.cos(an) * br * 0.86, byy + Math.sin(an) * br * 0.86); ctx.stroke();
      ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(bx, byy, 5, 0, 7); ctx.fill();
      R.txt(ctx, 'мм сын. бағ.', bx, byy - br * 0.3, { size: 9, color: '#555' });
      ctx.restore();
      R.tag(ctx, 'Анероид-барометр', bx, byy + br * 1.12 + 16, { size: 11 });
    },
  });
})();

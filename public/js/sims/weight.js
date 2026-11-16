/* Ауырлық күші және салмақ: әртүрлі планеталарда динамометрге ілінген жүк.
   Ауырлық күші денеге түсіріледі, салмақ — ілгішке (тірекке). Еркін түскенде салмақ нөлге тең. */
(function () {
  var R = window.Real;
  var PL = {
    earth: { name: 'Жер', g: 9.8, sky: ['#eef2f4', '#dde4e8'], ground: '#b98352', lab: true },
    moon: { name: 'Ай', g: 1.62, sky: ['#05070d', '#141a26'], ground: '#9a9a96' },
    mars: { name: 'Марс', g: 3.71, sky: ['#d9a37a', '#e9c3a0'], ground: '#b5603a' },
    venus: { name: 'Шолпан (Венера)', g: 8.87, sky: ['#e8c98a', '#f1dcae'], ground: '#a88a5a' },
    jupiter: { name: 'Юпитер (бұлт қабатының деңгейінде)', g: 24.8, sky: ['#c99a6a', '#ecd2a8'], ground: '#8f6a48' },
  };
  Sim.create({
    aspect: 0.62, grid: false,
    hint: '«Бастау» батырмасы штативті босатады: динамометр жүкпен бірге еркін түседі.',
    controls: [
      { type: 'select', key: 'pl', label: 'Қай жерде', value: 'earth', options: Object.keys(PL).map(function (k) { return [k, PL[k].name]; }) },
      { type: 'range', key: 'm', label: 'Жүктің массасы m', min: 0.1, max: 1, step: 0.05, value: 0.4, unit: 'кг', digits: 2 },
    ],
    readouts: [
      { key: 'g', label: 'Еркін түсу үдеуі g', unit: 'Н/кг', digits: 2 },
      { key: 'Fg', label: 'Ауырлық күші F = mg', unit: 'Н', digits: 2 },
      { key: 'P', label: 'Салмақ P (динамометр көрсетуі)', unit: 'Н', digits: 2 },
    ],
    init: function (api) { api.S.y = 0; api.S.v = 0; api.S.fall = false; },
    step: function (api, dt) {
      var S = api.S; S.fall = true;
      S.v += PL[api.P.pl].g * dt; S.y += S.v * dt * 60;
      if (S.maxY !== undefined && S.y >= S.maxY) { S.y = S.maxY; return false; }
    },
    read: function (api) {
      var P = api.P, g = PL[P.pl].g, Fg = P.m * g;
      return { g: g, Fg: Fg, P: api.S.fall ? 0 : Fg };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, pl = PL[P.pl], ground = H * 0.86, g = pl.g, Fg = P.m * g;
      if (pl.lab) R.scene(ctx, W, H, 'lab', { table: ground });
      else {
        var sky = ctx.createLinearGradient(0, 0, 0, ground);
        sky.addColorStop(0, pl.sky[0]); sky.addColorStop(1, pl.sky[1]);
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, ground);
        if (P.pl === 'moon') { R.stars(ctx, W, ground, 7, 140); R.planet(ctx, W * 0.82, H * 0.2, 26, 'earth'); }
        var gr = ctx.createLinearGradient(0, ground, 0, H); gr.addColorStop(0, pl.ground); gr.addColorStop(1, R.shade(pl.ground, -0.4));
        ctx.fillStyle = gr; ctx.fillRect(0, ground, W, H - ground);
        var r = R.rng(5);
        for (var i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(r() * W, ground + 6 + r() * (H - ground - 8), 4 + r() * 14, 2 + r() * 3, 0, 0, 7); ctx.fill(); }
      }
      // штатив
      var sx = W * 0.38, top = 26;
      R.block(ctx, sx - 110, ground - 14, 130, 14, 'iron', { depth: 8 });
      var mg = ctx.createLinearGradient(sx - 90, 0, sx - 82, 0); mg.addColorStop(0, '#6c737a'); mg.addColorStop(0.4, '#d5dade'); mg.addColorStop(1, '#5c6268');
      ctx.fillStyle = mg; ctx.fillRect(sx - 90, top, 8, ground - 14 - top);
      ctx.fillStyle = '#3d4247'; ctx.fillRect(sx - 96, top + 6, 20, 16);
      ctx.fillStyle = mg; ctx.fillRect(sx - 82, top + 11, 82, 6);
      // динамометр + жүк (еркін түсуде бірге төмендейді)
      var dy = S.y;
      var hook = R.dynamometer(ctx, sx, top + 10 + dy, 210, S.fall ? 0 : Fg, 10, { div: 0.2, big: 1 });
      var hh = R.weight(ctx, hook.x, hook.y, Math.round(P.m * 1000));
      S.maxY = Math.max(0, dy + (ground - 4) - (hook.y + hh)); // жүк үстелге тигенде тоқтайды
      var cx = hook.x, cyBody = hook.y + 14 + (hh - 14) / 2;
      // күштер: ауырлық — дененің центрінен, салмақ — ілгектен
      var sc = 9;
      R.force(ctx, cx + 30, cyBody, cx + 30, cyBody + Fg * sc + 6, '#d2382b', 'F = mg');
      ctx.fillStyle = '#d2382b'; ctx.beginPath(); ctx.arc(cx + 30, cyBody, 3, 0, 7); ctx.fill();
      if (!S.fall) R.force(ctx, cx - 30, hook.y - 4, cx - 30, hook.y - 4 + Fg * sc + 6, '#1f5fd1', 'P');
      else R.tag(ctx, 'Еркін түсу: салмақсыздық, P = 0', W * 0.7, H * 0.4, { size: 12, color: '#1f5fd1' });
      R.tag(ctx, pl.name + ': g = ' + Sim.fmt(g, 2) + ' Н/кг', W * 0.72, 26, { size: 12.5 });
    },
  });
})();

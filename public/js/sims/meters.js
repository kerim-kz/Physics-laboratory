/* №3 зертханалық жұмыс: электр тізбегін жинау, ток күші мен кернеуді өлшеу. Амперметр тізбектей,
   вольтметр параллель жалғанады. Тізбектей жалғанған шам мен резистордағы кернеулер қосылады. */
(function () {
  var R = window.Real;
  var RL = 8, RR = 4; // шам мен резистордың кедергісі, Ом
  Sim.create({
    aspect: 0.62, grid: false, autoplay: true, keepRunning: true,
    hint: 'Кілтті тұйықтап, вольтметрді әртүрлі жерге жалға. Амперметрдің көрсетуі тізбектің кез келген жерінде бірдей.',
    controls: [
      { type: 'range', key: 'U', label: 'Ток көзінің кернеуі', min: 1.5, max: 6, step: 1.5, value: 4.5, unit: 'В' },
      { type: 'check', key: 'on', label: 'Кілт тұйықталған', value: true, live: true },
      { type: 'select', key: 'vm', label: 'Вольтметр қосылған', value: 'lamp', options: [['lamp', 'Шамға параллель'], ['res', 'Резисторға параллель'], ['src', 'Ток көзіне параллель']], live: true },
      { type: 'select', key: 'am', label: 'Амперметрдің орны', value: 'a', options: [['a', 'Ток көзінен кейін'], ['b', 'Шам мен резистордың арасында']], live: true },
    ],
    readouts: [
      { key: 'I', label: 'Амперметр I', unit: 'А', digits: 2 },
      { key: 'V', label: 'Вольтметр U', unit: 'В', digits: 2 },
      { key: 'chk', label: 'Шам + резистор кернеулері', text: true },
    ],
    init: function (api) { api.S.ph = 0; },
    step: function (api, dt) { api.S.ph += dt * 60; },
    read: function (api) {
      var P = api.P, I = P.on ? P.U / (RL + RR) : 0, V = P.vm === 'lamp' ? I * RL : P.vm === 'res' ? I * RR : (P.on ? P.U : P.U);
      return { I: I, V: V, chk: Sim.fmt(I * RL, 2) + ' В + ' + Sim.fmt(I * RR, 2) + ' В = ' + Sim.fmt(I * (RL + RR), 2) + ' В' };
    },
    draw: function (api, ctx, W, H) {
      var P = api.P, S = api.S, table = H * 0.96;
      R.scene(ctx, W, H, 'lab', { table: H * 0.18 });
      // монтаж тақтасы (жоғарыдан көрініс)
      R.tableTop(ctx, 0, H * 0.18, W, H * 0.82, '#a87a4c');
      var I = P.on ? P.U / (RL + RR) : 0;
      var L = W * 0.12, Rr = W * 0.66, T = H * 0.34, B = H * 0.86;
      var bat = R.battery(ctx, L + 40, B - 16, 150, 32, { label: P.U + ' В' });
      var lamp = { x: Rr, y: T + 30 }, res = { x: (L + Rr) / 2, y: T }, sw = { x1: Rr - 40, x2: Rr + 10, y: B };
      var amX = P.am === 'a' ? L : (L + Rr) / 2 + 120, amY = P.am === 'a' ? (T + B) / 2 : T;
      // сымдар (ток бағытымен электрондар)
      var ph = P.on ? -S.ph * I : undefined, cur = P.on;
      R.wire(ctx, [[bat.minus.x, bat.minus.y], [L, bat.minus.y], [L, P.am === 'a' ? amY + 40 : T]], { color: '#222', phase: ph, current: cur });
      if (P.am === 'a') R.wire(ctx, [[L, amY - 30], [L, T], [res.x - 45, T]], { color: '#222', phase: ph, current: cur });
      else R.wire(ctx, [[L, T], [res.x - 45, T]], { color: '#222', phase: ph, current: cur });
      R.wire(ctx, [[res.x + 45, T], [P.am === 'b' ? amX - 40 : Rr - 10, T]].concat(P.am === 'b' ? [] : [[Rr - 10, T + 52]]), { color: '#c0392b', phase: ph, current: cur });
      if (P.am === 'b') R.wire(ctx, [[amX + 30, T], [Rr - 10, T], [Rr - 10, T + 52]], { color: '#c0392b', phase: ph, current: cur });
      R.wire(ctx, [[Rr + 10, T + 70], [Rr + 10, B], [sw.x2, B]], { color: '#c0392b', phase: ph, current: cur });
      R.wire(ctx, [[sw.x1, B], [bat.plus.x + 10, B], [bat.plus.x + 10, bat.plus.y], [bat.plus.x, bat.plus.y]], { color: '#c0392b', phase: ph, current: cur });
      R.resistor(ctx, res.x, T, 90, { label: RR + ' Ом' });
      R.bulb(ctx, lamp.x, lamp.y, 18, Math.min(1, I * I * RL / 1.5));
      R.knife(ctx, sw.x1, sw.x2, B, P.on);
      if (P.am === 'a') R.meter(ctx, L, amY, 40, I, 1, { letter: 'A', step: 0.2 }); else R.meter(ctx, amX, amY, 40, I, 1, { letter: 'A', step: 0.2 });
      // вольтметр (жоғарғы оң бұрышта) және оның сымдары
      var vx = W * 0.87, vy = H * 0.42, Vread = P.vm === 'lamp' ? I * RL : P.vm === 'res' ? I * RR : P.U;
      var vt = R.meter(ctx, vx, vy, 48, Vread, 6, { letter: 'V', step: 1 });
      var a1 = P.vm === 'lamp' ? [Rr - 10, T + 52] : P.vm === 'res' ? [res.x - 45, T] : [bat.minus.x + 4, bat.minus.y - 14];
      var a2 = P.vm === 'lamp' ? [Rr + 10, T + 70] : P.vm === 'res' ? [res.x + 45, T] : [bat.plus.x - 4, bat.plus.y - 14];
      R.wire(ctx, [[vt.plus.x, vt.plus.y], [vt.plus.x, vt.plus.y + 40], [a2[0], vt.plus.y + 40], [a2[0], a2[1]]], { color: '#e0643a', w: 2.5 });
      R.wire(ctx, [[vt.minus.x, vt.minus.y], [vt.minus.x, vt.minus.y + 56], [a1[0], vt.minus.y + 56], [a1[0], a1[1]]], { color: '#2f6fd1', w: 2.5 });
      void table;
    },
  });
})();

// Симуляциялардың алдын ала қарау суреттерін (превью) жасау: public/img/sims/<k>.jpg
// Қолданылуы: сайт іске қосулы тұрғанда  node scripts/sim-thumbs.cjs [http://localhost:3000] [k1 k2 ...]
// Әр симуляция 1,5 секунд жұмыс істегеннен кейін оның canvas-ы суретке түсіріледі (жарық тақырып, қазақша).
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = (process.argv[2] && process.argv[2].startsWith('http')) ? process.argv[2] : 'http://localhost:3000';
const only = process.argv.slice(2).filter((a) => !a.startsWith('http'));
const out = path.join(__dirname, '..', 'public', 'img', 'sims');

(async () => {
  const { SIMS } = await import(path.join(__dirname, '..', 'src', 'data', 'sims.js'));
  const keys = only.length ? only : SIMS.map((s) => s.k);
  fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 520, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
  let ok = 0;
  for (const k of keys) {
    const p = await ctx.newPage();
    try {
      await p.goto(`${base}/sims/${k}`, { waitUntil: 'load' });
      await p.waitForTimeout(400);
      const play = await p.$('#simPlay');
      if (play && await play.isVisible()) await play.click({ timeout: 2000 }).catch(() => {});
      await p.waitForTimeout(1500);
      const c = await p.$('#simCanvas');
      await c.screenshot({ path: path.join(out, `${k}.jpg`), type: 'jpeg', quality: 72 });
      ok++;
    } catch (e) {
      console.error(k, e.message);
    }
    await p.close();
  }
  await br.close();
  console.log(`превью: ${ok} / ${keys.length}`);
})();

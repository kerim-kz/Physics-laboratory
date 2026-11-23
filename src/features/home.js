// Басты бет — симуляциялар орталығы:
// 1) гравитация симуляциясы (hero); 2) «Күннің симуляциясы» — бетте тікелей жұмыс істейді;
// 3) сынып бойынша симуляциялар каталогы (превью суреттерімен).
// Бөлімдерге сілтемелер, ғалымдар мен ойындар бүйір мәзірде бар, сондықтан мұнда қайталанбайды.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { FAMILIES, GRADES, SECTION } from '../data/catalog.js';
import { SIMS } from '../data/sims.js';
import { almatyNow } from '../lib/dash.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { page } from '../lib/layout.js';
import { asyncH } from '../lib/util.js';

export const router = express.Router();

// Превью суреттері: public/img/sims/<k>.jpg (scripts/sim-thumbs.cjs жасайды). Жоқ болса — белгіше.
const THUMB_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'img', 'sims');
const HAS_THUMB = new Set(SIMS.map((s) => s.k).filter((k) => fs.existsSync(path.join(THUMB_DIR, `${k}.jpg`))));
const SHOW = 12; // каталогта әр сыныптан алғашқы көрінетін саны

const fam = (s) => FAMILIES[SECTION[s.s].fam].css;
const byGrade = Object.fromEntries(GRADES.map((g) => [g, SIMS.filter((s) => s.g === g)]));

// Күннің симуляциясы: Алматы күні бойынша ауысады; оқушыға өз сыныбынан.
export function simOfDay(grade = 0, now = almatyNow()) {
  const day = Math.floor(Date.UTC(now.y, now.m, now.d) / 864e5);
  const pool = byGrade[grade] && byGrade[grade].length ? byGrade[grade] : SIMS;
  return pool[(day * 7 + 3) % pool.length];
}

export function simTile(s, hidden = false) {
  const sec = SECTION[s.s];
  return html`
    <article class="tcard ${fam(s)}"${hidden ? html` data-more hidden` : ''}>
      <div class="tcard-img">
        ${HAS_THUMB.has(s.k)
          ? html`<img src="/img/sims/${s.k}.jpg" alt="" loading="lazy" decoding="async">`
          : html`<span class="tcard-ph" aria-hidden="true">${icon('sim', 34)}</span>`}
        <span class="tchip">${s.g}-сынып</span>
      </div>
      <div class="tcard-b">
        <span class="tsec">${sec.name}</span>
        <h3><a href="/sims/${s.k}">${s.t}</a></h3>
        <p>${s.d}</p>
      </div>
      <div class="tcard-f"><span class="open">Ашу ${icon('play', 13)}</span></div>
    </article>`;
}

router.get('/', asyncH(async (req, res) => {
  const u = req.user;
  const myGrade = u && u.role === 'student' && GRADES.includes(Number(u.class_grade)) ? Number(u.class_grade) : 0;
  const q = Number(req.query.g);
  const grade = GRADES.includes(q) ? q : (myGrade || GRADES[0]);
  const day = simOfDay(myGrade);
  const sec = SECTION[day.s];
  const cta = u
    ? html`<a class="btn" href="${u.role === 'admin' ? '/admin' : '/cabinet'}">Кабинетке өту</a><a class="btn ghost" href="#catalog">Симуляциялар</a>`
    : html`<a class="btn" href="/register">Тіркелу</a><a class="btn ghost" href="#catalog">Симуляциялар</a>`;

  await page(req, res, {
    active: 'home',
    scripts: ['/js/hero.js', '/js/sims/kit.js', '/js/sims/real.js', `/js/sims/${day.k}.js`, '/js/home.js'],
    body: html`
      <div class="view">
        <section class="hero2" aria-label="Гравитация симуляциясы">
          <div class="hero2-stage"><canvas id="heroSim" role="img" aria-label="Күн жүйесінің моделі: планеталар Күнді айналады. Экранды тартып, жаңа планета ұшыруға болады."></canvas></div>
          <div class="hero2-text">
            <p class="eyebrow">Физика · 7–11 сыныптар</p>
            <h1>Әлемді физика заңдарымен зертте</h1>
            <p class="lede">Экранды тінтуірмен немесе саусақпен тартып, жаңа планета ұшыр. Жылдамдығы аз болса — Күнге құлайды, бірінші ғарыштық жылдамдыққа жақын болса — шеңбер сызады, тым үлкен болса — жүйеден кетеді.</p>
            <div class="hero-cta">${cta}</div>
          </div>
          <div class="hero2-bar">
            <button class="hb on" type="button" data-hero-mode="sun" aria-pressed="true">Күн жүйесі</button>
            <button class="hb" type="button" data-hero-mode="binary" aria-pressed="false">Қос жұлдыз</button>
            <button class="hb" type="button" data-hero-mode="empty" aria-pressed="false">Өз жүйеңді жаса</button>
            <button class="hb" type="button" id="heroPlay">Тоқтату</button>
            <button class="hb" type="button" id="heroClear">Қайта бастау</button>
            <span class="hero2-read" id="heroRead" aria-live="polite"></span>
          </div>
        </section>

        <section class="block dsim" aria-labelledby="dsimH">
          <div class="dash-h">
            <div>
              <p class="eyebrow">Күннің симуляциясы · ${sec.name} · ${day.g}-сынып</p>
              <h2 id="dsimH">${day.t}</h2>
              <p>${day.d}</p>
            </div>
            <div class="vhead-act"><a class="btn ghost" href="/sims/${day.k}">${icon('expand', 15)} Толық ашу</a></div>
          </div>
          <div class="simwrap">
            <section class="panel simstage">
              <div class="simcanvas"><canvas id="simCanvas" aria-label="${day.t}: модель" role="img"></canvas></div>
              <div class="simbar">
                <button class="btn" type="button" id="simPlay">${icon('play', 15)} <span>Бастау</span></button>
                <button class="btn ghost" type="button" id="simReset">${icon('reset', 15)} Қайта бастау</button>
                <button class="btn ghost" type="button" id="simFull">${icon('expand', 15)} <span>Толық экран</span></button>
                <span class="grow"></span>
                <span class="muted small" id="simHint"></span>
              </div>
            </section>
            <aside class="panel simside">
              <h2>Параметрлер</h2>
              <div id="simControls" class="simcontrols"></div>
              <h2>Өлшеулер</h2>
              <div id="simReadouts" class="readouts" aria-live="polite"></div>
              <div id="simTools" class="simtools" hidden><h2>Өлшеу құралдары</h2></div>
              ${day.tasks && day.tasks.length ? html`<h2>Зерттеп көр</h2><ol class="tasks">${day.tasks.slice(0, 2).map((t) => html`<li>${t}</li>`)}</ol>` : ''}
            </aside>
          </div>
        </section>

        <section class="block" id="catalog" aria-labelledby="catH">
          <div class="block-h">
            <h2 id="catH">Симуляциялар</h2><span class="cnt">${SIMS.length}</span>
            <a class="more" href="/sims">Бөлімдер мен оқулық бойынша →</a>
          </div>
          <div class="seg gtabs" role="tablist" aria-label="Сынып">
            ${GRADES.map((g) => html`<a role="tab" href="/?g=${g}#catalog" data-g="${g}" class="${g === grade ? 'on' : ''}" aria-selected="${g === grade ? 'true' : 'false'}">${g}-сынып <i>${byGrade[g].length}</i></a>`)}
          </div>
          ${GRADES.map((g) => html`
            <div class="gpanel" role="tabpanel" data-g="${g}"${g === grade ? '' : html` hidden`}>
              <div class="tgrid">${byGrade[g].map((s, i) => simTile(s, i >= SHOW))}</div>
              ${byGrade[g].length > SHOW ? html`<div class="gmore"><button class="btn ghost" type="button" data-show-more>Тағы ${byGrade[g].length - SHOW} симуляция</button></div>` : ''}
            </div>`)}
        </section>
      </div>`,
  });
}));

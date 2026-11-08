import express from 'express';
import { FAMILIES, SECTION } from '../data/catalog.js';
import { FORMULAS } from '../data/formulas.js';
import { GAMES } from '../data/games.js';
import { OLYMPIAD } from '../data/olympiad.js';
import { SCIENTISTS, scientistOfDay, scientistsForGames } from '../data/scientists.js';
import { SIMS } from '../data/sims.js';
import { one } from '../lib/db.js';
import { html, jsonScript } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { page } from '../lib/layout.js';
import { tex } from '../lib/tex.js';
import { asyncH } from '../lib/util.js';
import { scientistCard, sava } from './scientists.js';

export const router = express.Router();

router.get('/', asyncH(async (req, res) => {
  const counts = await one(`SELECT (SELECT count(*) FROM exam_questions) AS questions`);
  const u = req.user;
  const today = scientistOfDay();
  const more = SCIENTISTS.filter((s) => s.k !== today.k).sort(() => Math.random() - 0.5).slice(0, 2);
  const fam = (s) => FAMILIES[SECTION[s.s].fam].css;
  const cta = u
    ? html`<a class="btn" href="${u.role === 'admin' ? '/admin' : '/cabinet'}">Кабинетке өту</a><a class="btn ghost" href="/sims">Симуляциялар</a>`
    : html`<a class="btn" href="/register">Тіркелу</a><a class="btn ghost" href="/sims">Симуляциялар</a>`;

  await page(req, res, {
    active: 'home',
    scripts: ['/js/hero.js', '/js/games.js'],
    katex: true,
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

        <nav class="quick" aria-label="Негізгі бөлімдер">
          <a class="qlink" href="/sims"><span class="glyph">${icon('sim')}</span><span>Симуляциялар<small>${SIMS.length} интерактивті модель</small></span></a>
          <a class="qlink" href="/formulas"><span class="glyph">${icon('formula')}</span><span>Формулалар<small>${FORMULAS.length} формула, 7–11-сынып</small></span></a>
          <a class="qlink" href="/olympiad"><span class="glyph brass">${icon('trophy')}</span><span>Олимпиада<small>${OLYMPIAD.length} есеп шешімімен</small></span></a>
          <a class="qlink" href="/exams"><span class="glyph">${icon('exam')}</span><span>PISA · ББЖМ · ҰБТ<small>${counts.questions} тапсырма</small></span></a>
        </nav>

        <div class="home2">
          <section class="stack">
            <div class="block-h"><h2>Күннің ғалымы</h2><a class="more" href="/scientists">Барлық ғалымдар (${SCIENTISTS.length}) →</a></div>
            <article class="panel scard ${fam(today)}">
              <div class="sday">${sava(today)}<div><h3>${today.n}</h3><span class="mono muted small">${today.y} · ${today.c}</span></div></div>
              <p>${today.d}</p>
              ${today.tex ? html`<div class="stex">${tex(today.tex, true)}</div>` : ''}
              <div class="sacts">${today.sim ? html`<a class="btn sm" href="/sims/${today.sim}">${icon('sim', 14)} Симуляцияда көру</a>` : ''}<a class="btn ghost sm" href="/scientists#${today.k}">Толығырақ</a></div>
            </article>
            <div class="sgrid">${more.map((s) => scientistCard(s, { short: true }))}</div>
          </section>
          <section class="stack">
            <div class="block-h"><h2>Ойын: «Ғалымды тап»</h2><a class="more" href="/games">Барлық ойындар →</a></div>
            <section class="panel game" id="game" data-game="scientist" data-section="" data-auth="${u ? '1' : ''}" data-csrf="${req.csrfToken}">
              <noscript>Ойын жұмыс істеуі үшін браузерде JavaScript қосулы болуы керек.</noscript>
            </section>
            <div class="chips">${GAMES.filter((g) => g.k !== 'scientist').map((g) => html`<a class="chip plain" href="/games/${g.k}">${icon(g.icon, 15)} ${g.name}</a>`)}</div>
          </section>
        </div>
        ${jsonScript('gameData', { formulas: [], scientists: scientistsForGames() })}
      </div>`,
  });
}));

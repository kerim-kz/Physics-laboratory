import express from 'express';
import { FAMILIES, SECTION } from '../data/catalog.js';
import { SCIENTISTS } from '../data/scientists.js';
import { SIM } from '../data/sims.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { page, vhead } from '../lib/layout.js';
import { tex } from '../lib/tex.js';
import { asyncH } from '../lib/util.js';

export const router = express.Router();

// Аватардағы әріп: тегінің бас әрпі («әл-Фараби» → Ф, «Кельвин» → К).
function letter(name) {
  const last = name.replace(/[()]/g, '').trim().split(/\s+/).pop();
  return last.replace(/^әл-/i, '').charAt(0).toUpperCase();
}
export const sava = (s) => html`<span class="sava" aria-hidden="true">${letter(s.n)}</span>`;

export function scientistCard(s, { short = false } = {}) {
  const sec = SECTION[s.s];
  const sim = s.sim && SIM[s.sim];
  return html`
    <article class="scard ${FAMILIES[sec.fam].css}" id="${s.k}">
      <div class="scard-h">${sava(s)}<div><b>${s.n}</b><span>${s.y} · ${s.c}</span></div></div>
      <p>${short ? s.d.split('. ')[0].replace(/\.$/, '') + '.' : s.d}</p>
      ${!short && s.tex ? html`<div class="stex">${tex(s.tex, true)}</div>` : ''}
      <div class="sacts">
        ${sim ? html`<a class="linkbtn" href="/sims/${sim.k}">${icon('sim', 14)} ${sim.t}</a>` : ''}
        ${!short ? html`<a class="linkbtn" href="/formulas?section=${sec.k}">${icon('formula', 14)} ${sec.name}</a>` : ''}
      </div>
    </article>`;
}

router.get('/scientists', asyncH(async (req, res) => {
  await page(req, res, {
    title: 'Ғалымдар', active: 'scientists', katex: true,
    body: html`
      <div class="view">
        ${vhead('Физика тарихындағы ғалымдар', `Архимедтен Эйнштейнге дейін ${SCIENTISTS.length} ғалым: өмір сүрген жылдары, ашқан заңдары мен жаңалықтары. Әр ғалымның жанында оның еңбегін көрсететін симуляция мен формулалар бөлімі бар.`,
          html`<a class="btn" href="/games/scientist">${icon('game', 16)} «Ғалымды тап» ойыны</a>`)}
        <div class="sgrid">${SCIENTISTS.map((s) => scientistCard(s))}</div>
        <p class="notice small">Мәліметтер мектеп оқулықтары мен ғылыми энциклопедиялардағы жалпыға белгілі деректерге сүйенеді. Сабақта қолданарда ғалымның өмірбаянын оқушыларға шағын зерттеу тапсырмасы ретінде беруге болады: «Бұл заң қандай тәжірибеден туды?»</p>
      </div>`,
  });
}));

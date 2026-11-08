import express from 'express';
import { FAMILIES, GRADES, SECTION, SECTIONS } from '../data/catalog.js';
import { FORMULAS } from '../data/formulas.js';
import { html, sel } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { emptyBox, page, vhead } from '../lib/layout.js';
import { tex } from '../lib/tex.js';
import { asyncH, cleanText, toInt } from '../lib/util.js';

export const router = express.Router();

export function formulaCard(f, { compact = false } = {}) {
  const sec = SECTION[f.s];
  return html`
    <article class="fcard2 ${FAMILIES[sec.fam].css}" id="${f.id}">
      <div class="fc-head"><h3>${f.name}</h3><span class="mc-grade">${f.g}-сынып</span></div>
      <div class="fc-tex" role="img" aria-label="${f.tex}">${tex(f.tex, true)}</div>
      ${!compact && f.vars.length ? html`<table class="vars"><tbody>${f.vars.map((v) => html`
        <tr><td class="sym">${tex(v.sym)}</td><td>${v.meaning}</td><td class="unit">${v.unit === '—' ? 'өлшемсіз' : v.unit}</td></tr>`)}</tbody></table>` : ''}
      ${!compact && f.note ? html`<p class="fc-note">${f.note}</p>` : ''}
    </article>`;
}

router.get('/formulas', asyncH(async (req, res) => {
  const section = SECTION[req.query.section] ? req.query.section : '';
  const grade = GRADES.includes(toInt(req.query.grade)) ? toInt(req.query.grade) : 0;
  const term = cleanText(req.query.q, 60).toLowerCase();
  const list = FORMULAS.filter((f) => (!section || f.s === section)
    && (!grade || f.g <= grade)
    && (!term || f.name.toLowerCase().includes(term) || f.vars.some((v) => v.meaning.toLowerCase().includes(term))));
  const groups = SECTIONS.map((s) => ({ s, items: list.filter((f) => f.s === s.k) })).filter((g) => g.items.length);
  const qs = (o) => new URLSearchParams(Object.fromEntries(Object.entries({ section, grade: grade || '', q: term, ...o }).filter(([, v]) => v))).toString();

  await page(req, res, {
    title: 'Формулалар', active: 'formulas', katex: true,
    body: html`
      <div class="view">
        ${vhead('Формулалар', `7–11-сынып физикасының ${FORMULAS.length} формуласы. Әр формулада шамалардың мағынасы мен ХБЖ-дағы өлшем бірлігі берілген. «Сыныпқа дейін» сүзгісі сол сыныпқа дейін өтілген формулаларды ғана көрсетеді.`,
          html`<a class="btn" href="/games${section ? `?section=${section}` : ''}">${icon('game', 16)} Ойнап жаттау</a><button class="btn ghost no-print" type="button" data-print>Басып шығару</button>`)}
        <div class="chips no-print">
          <a class="chip plain${!section ? ' on' : ''}" href="/formulas?${qs({ section: '' })}">Барлық бөлім</a>
          ${SECTIONS.map((s) => html`<a class="chip ${FAMILIES[s.fam].css}${section === s.k ? ' on' : ''}" href="/formulas?${qs({ section: s.k })}"><i>${s.sym}</i>${s.name}</a>`)}
        </div>
        <form class="filters no-print" method="get" action="/formulas" data-autosubmit>
          <input type="hidden" name="section" value="${section}">
          <label class="fl">Сыныпқа дейін<select name="grade"><option value="">Барлық сынып</option>${GRADES.map((g) => html`<option value="${g}"${sel(grade === g)}>${g}-сынып</option>`)}</select></label>
          <label class="search">${icon('search', 16)}<input type="search" name="q" value="${term}" placeholder="Формула атауы немесе шама (мысалы: қысым)" aria-label="Формула іздеу"></label>
          <button class="btn ghost" type="submit">Іздеу</button>
        </form>
        <div class="resline">${list.length} формула</div>
        ${groups.length ? groups.map(({ s, items }) => html`
          <section class="shelf">
            <div class="shelf-h"><h2>${s.no}. ${s.name}</h2><span class="cnt">${items.length} формула · ${s.grades} сынып</span>
              <a class="more push no-print" href="/games?section=${s.k}">Ойнау →</a></div>
            <div class="rule"></div>
            <div class="fgrid">${items.map((f) => formulaCard(f))}</div>
          </section>`) : emptyBox('Формула табылмады', 'Іздеу сөзін өзгертіп көріңіз.')}
      </div>`,
  });
}));

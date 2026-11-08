import express from 'express';
import { FAMILIES, GRADES, SECTION, SECTIONS } from '../data/catalog.js';
import { FORMULA, FORMULAS } from '../data/formulas.js';
import { SIMS } from '../data/sims.js';
import { html, sel } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { emptyBox, page, vhead } from '../lib/layout.js';
import { tex } from '../lib/tex.js';
import { asyncH, cleanText, HttpError, toInt } from '../lib/util.js';

export const router = express.Router();

const unitText = (u) => (u === '—' ? 'өлшемсіз' : u);
const fam = (f) => FAMILIES[SECTION[f.s].fam].css;

// Формула атауы бойынша оны «Теория» блогында көрсететін симуляциялар.
const simsByFormula = new Map();
for (const s of SIMS) for (const n of s.f) simsByFormula.set(n, [...(simsByFormula.get(n) || []), s]);

// Симуляция беттеріндегі «Теория» карточкасы (шамалар кестесімен).
export function formulaCard(f, { compact = false } = {}) {
  const sec = SECTION[f.s];
  return html`
    <article class="fcard2 ${FAMILIES[sec.fam].css}" id="${f.id}">
      <div class="fc-head"><h3><a href="/formulas/${f.id}" data-formula="${f.id}">${f.name}</a></h3><span class="mc-grade">${f.g}-сынып</span></div>
      <div class="fc-tex" role="img" aria-label="${f.tex}">${tex(f.tex, true)}</div>
      ${!compact && f.vars.length ? html`<table class="vars"><tbody>${f.vars.map((v) => html`
        <tr><td class="sym">${tex(v.sym)}</td><td>${v.meaning}</td><td class="uc">${unitText(v.unit)}</td></tr>`)}</tbody></table>` : ''}
      ${!compact && f.note ? html`<p class="fc-note">${f.note}</p>` : ''}
    </article>`;
}

// Формулалар бетіндегі ықшам тақтайша: басқанда толық экранды терезе ашылады.
function formulaTile(f) {
  const sec = SECTION[f.s];
  return html`
    <a class="ftile ${fam(f)}" href="/formulas/${f.id}" data-formula="${f.id}" id="${f.id}">
      <span class="ft-top"><span class="mini ${fam(f)}" title="${sec.name}">${sec.sym}</span><span class="ft-name">${f.name}</span><span class="mc-grade">${f.g}</span></span>
      <span class="ft-tex" role="img" aria-label="${f.tex}">${tex(f.tex, true)}</span>
      <span class="ft-foot">${f.vars.length} шама · ${icon('expand', 13)} толық ашу</span>
    </a>`;
}

// Формуланың толық сипаттамасы: терезеде де, жеке бетте де қолданылады.
function formulaDetail(f) {
  const sec = SECTION[f.s];
  const sims = simsByFormula.get(f.name) || SIMS.filter((s) => s.s === f.s).slice(0, 2);
  return html`
    <article class="fdet ${fam(f)}" data-id="${f.id}">
      <div class="fd-top"><span class="mini ${fam(f)}">${sec.sym}</span><span>${sec.name}</span><span class="pill">${f.g}-сынып</span></div>
      <h2 class="fd-name">${f.name}</h2>
      <div class="fd-tex" role="img" aria-label="${f.tex}">${tex(f.tex, true)}</div>
      <div class="fd-grid">
        <section class="fd-sec">
          <h3>Анықтамасы</h3>
          <p>${f.def}</p>
          ${f.note ? html`<p class="fc-note"><b>Ескерту.</b> ${f.note}</p>` : ''}
        </section>
        <section class="fd-sec">
          <h3>Шамалар және өлшем бірліктері</h3>
          ${f.vars.length ? html`<table class="fd-vars"><thead><tr><th>Белгі</th><th>Шама</th><th>ХБЖ бірлігі</th></tr></thead><tbody>${f.vars.map((v) => html`
            <tr><td class="sym">${tex(v.sym)}</td><td>${v.meaning}</td><td class="uc">${unitText(v.unit)}</td></tr>`)}</tbody></table>`
            : html`<p class="muted">Бұл формулада шамалар жеке көрсетілмеген.</p>`}
        </section>
      </div>
      <div class="fd-acts">
        ${sims.map((s) => html`<a class="btn ghost sm" href="/sims/${s.k}">${icon('sim', 14)} ${s.t}</a>`)}
        <a class="btn ghost sm" href="/games?section=${f.s}">${icon('game', 14)} Ойнап жатта</a>
      </div>
    </article>`;
}

router.get('/formulas', asyncH(async (req, res) => {
  const view = req.query.view === 'section' ? 'section' : 'grade';
  const section = SECTION[req.query.section] ? req.query.section : '';
  const grade = GRADES.includes(toInt(req.query.grade)) ? toInt(req.query.grade) : 0;
  const upto = req.query.upto === '1' && grade ? '1' : '';
  const term = cleanText(req.query.q, 60).toLowerCase();
  const list = FORMULAS.filter((f) => (!section || f.s === section)
    && (!grade || (upto ? f.g <= grade : f.g === grade))
    && (!term || f.name.toLowerCase().includes(term) || f.vars.some((v) => v.meaning.toLowerCase().includes(term))));
  const qs = (o) => {
    const p = new URLSearchParams(Object.entries({ view: view === 'grade' ? '' : view, section, grade: grade || '', upto, q: term, ...o }).filter(([, v]) => v));
    return p.toString() ? `/formulas?${p}` : '/formulas';
  };
  const perGrade = Object.fromEntries(GRADES.map((g) => [g, FORMULAS.filter((f) => f.g === g && (!section || f.s === section)).length]));

  let groups;
  if (view === 'grade') {
    const order = Object.fromEntries(SECTIONS.map((s, i) => [s.k, i]));
    groups = GRADES.map((g) => ({
      key: `g${g}`, title: `${g}-сынып`,
      sub: [...new Set(list.filter((f) => f.g === g).map((f) => SECTION[f.s].name))].join(' · '),
      items: list.filter((f) => f.g === g).sort((a, b) => order[a.s] - order[b.s]),
    })).filter((x) => x.items.length);
  } else {
    groups = SECTIONS.map((s) => ({ key: s.k, title: `${s.no}. ${s.name}`, sub: `${s.grades} сынып`, items: list.filter((f) => f.s === s.k) })).filter((x) => x.items.length);
  }

  await page(req, res, {
    title: 'Формулалар', active: 'formulas', katex: true,
    scripts: ['/js/formulas.js'],
    body: html`
      <div class="view">
        ${vhead('Формулалар', `7–11-сынып физикасының ${FORMULAS.length} формуласы. Формуланы басыңыз — ол толық экранда ашылады: анықтамасы, әр шаманың мағынасы мен ХБЖ-дағы өлшем бірлігі, байланысты симуляциялар. Терезеде ← → пернелерімен келесі формулаға өтуге болады.`,
          html`<a class="btn" href="/games${section ? `?section=${section}` : ''}">${icon('game', 16)} Ойнап жаттау</a><button class="btn ghost no-print" type="button" data-print>Басып шығару</button>`)}
        <div class="filters no-print">
          <div class="seg" role="group" aria-label="Топтау">
            <a class="${view === 'grade' ? 'on' : ''}" href="${qs({ view: '' })}">Сынып бойынша</a>
            <a class="${view === 'section' ? 'on' : ''}" href="${qs({ view: 'section' })}">Бөлім бойынша</a>
          </div>
          <div class="chips">
            <a class="chip plain${!grade ? ' on' : ''}" href="${qs({ grade: '', upto: '' })}">Барлық сынып</a>
            ${GRADES.map((g) => html`<a class="chip plain${grade === g ? ' on' : ''}" href="${qs({ grade: g })}">${g}-сынып <span class="mono muted">${perGrade[g]}</span></a>`)}
          </div>
        </div>
        <form class="filters no-print" method="get" action="/formulas" data-autosubmit>
          ${view === 'section' ? html`<input type="hidden" name="view" value="section">` : ''}
          ${grade ? html`<input type="hidden" name="grade" value="${grade}">` : ''}
          <label class="fl">Бөлім<select name="section"><option value="">Барлық бөлім</option>${SECTIONS.map((s) => html`<option value="${s.k}"${sel(section === s.k)}>${s.name}</option>`)}</select></label>
          ${grade ? html`<label class="ctl-check small"><input type="checkbox" name="upto" value="1"${upto ? html` checked` : ''}> ${grade}-сыныпқа дейінгі барлық формула</label>` : ''}
          <label class="search">${icon('search', 16)}<input type="search" name="q" value="${term}" placeholder="Формула атауы немесе шама (мысалы: қысым)" aria-label="Формула іздеу"></label>
          <button class="btn ghost" type="submit">Іздеу</button>
        </form>
        <div class="resline">${list.length} формула</div>
        ${groups.length ? groups.map((g) => html`
          <section class="shelf">
            <div class="shelf-h"><h2>${g.title}</h2><span class="cnt">${g.items.length} формула${g.sub ? ` · ${g.sub}` : ''}</span></div>
            <div class="rule"></div>
            <div class="ftgrid">${g.items.map(formulaTile)}</div>
          </section>`) : emptyBox('Формула табылмады', 'Іздеу сөзін немесе сүзгіні өзгертіп көріңіз.')}
      </div>`,
  });
}));

router.get('/formulas/:id', asyncH(async (req, res) => {
  const f = FORMULA[req.params.id];
  if (!f) throw new HttpError(404, 'Формула табылмады.');
  if (req.query.part === '1') {
    res.set('Cache-Control', 'public, max-age=3600');
    return res.type('html').send(formulaDetail(f).toString());
  }
  const i = FORMULAS.indexOf(f);
  const prev = FORMULAS[i - 1], next = FORMULAS[i + 1];
  await page(req, res, {
    title: f.name, active: 'formulas', katex: true, description: f.def,
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/formulas">Формулалар</a><span>/</span><a href="/formulas?view=section&section=${f.s}">${SECTION[f.s].name}</a><span>/</span><span>${f.name}</span></div>
        <div class="panel">${formulaDetail(f)}</div>
        <nav class="pager" aria-label="Формулалар">
          ${prev ? html`<a class="btn ghost sm" href="/formulas/${prev.id}">← ${prev.name}</a>` : ''}
          ${next ? html`<a class="btn ghost sm" href="/formulas/${next.id}">${next.name} →</a>` : ''}
        </nav>
      </div>`,
  });
}));

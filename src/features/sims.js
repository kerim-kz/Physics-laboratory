import express from 'express';
import { FAMILIES, SECTION, SECTIONS } from '../data/catalog.js';
import { FORMULAS } from '../data/formulas.js';
import { LABS } from '../data/labs.js';
import { SIM, SIMS } from '../data/sims.js';
import { TEXTBOOK, TEXTBOOK_GRADES, chapterTitle } from '../data/textbook.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { page, vhead } from '../lib/layout.js';
import { asyncH, HttpError, toInt } from '../lib/util.js';
import { formulaCard } from './formulas.js';

export const router = express.Router();

const byName = new Map(FORMULAS.map((f) => [f.name, f]));

function simCard(s) {
  const sec = SECTION[s.s];
  return html`
    <article class="card ${FAMILIES[sec.fam].css}">
      <div class="card-top"><span class="glyph">${icon('sim')}</span><span class="mini ${FAMILIES[sec.fam].css}">${sec.sym}</span><span class="cls">${s.g}-сынып</span></div>
      <h3><a href="/sims/${s.k}">${s.t}</a></h3>
      <p>${s.d}</p>
      <div class="card-foot"><span class="meta">${sec.name}</span><span class="open">Ашу ${icon('play', 13)}</span></div>
    </article>`;
}

router.get('/sims', asyncH(async (req, res) => {
  const grade = TEXTBOOK[toInt(req.query.book)] ? toInt(req.query.book) : 0;
  const tabs = html`<div class="seg" role="group" aria-label="Топтау">
    <a class="${grade ? '' : 'on'}" href="/sims">Бөлім бойынша</a>
    ${TEXTBOOK_GRADES.map((g) => html`<a class="${grade === g ? 'on' : ''}" href="/sims?book=${g}">${g}-сынып оқулығы</a>`)}
  </div>`;
  let body;
  if (grade) {
    // Оқулықтың тараулары мен параграфтары бойынша
    const simRow = (keys) => {
      const list = [...new Set(keys)].map((k) => SIM[k]).filter(Boolean);
      return list.length ? html`<span class="bk-sims">${list.map((x) => html`<a class="chip plain" href="/sims/${x.k}">${icon('sim', 14)} ${x.t}</a>`)}</span>` : html`<span class="muted small">теориялық тақырып</span>`;
    };
    body = TEXTBOOK[grade].map((ch) => html`
      <section class="shelf">
        <div class="shelf-h"><h2>${chapterTitle(ch)}</h2><span class="cnt">${new Set(ch.p.flatMap((x) => x[2]).concat((ch.labs || []).flatMap((x) => x[2])).filter((k) => SIM[k])).size} симуляция</span></div>
        <div class="rule"></div>
        <div class="bk-list">
          ${ch.p.map(([n, t, keys]) => html`<div class="bk-row"><span class="bk-no">§${n}</span><span class="bk-t">${t}</span>${simRow(keys)}</div>`)}
          ${(ch.labs || []).map(([n, t, keys]) => html`<div class="bk-row bk-lab"><span class="bk-no">№${n}</span><span class="bk-t">Зертханалық жұмыс. ${t}</span>${simRow(keys)}</div>`)}
        </div>
      </section>`);
  } else {
    const groups = SECTIONS.map((s) => ({ s, items: SIMS.filter((x) => x.s === s.k) })).filter((g) => g.items.length);
    body = groups.map(({ s, items }) => html`
      <section class="shelf">
        <div class="shelf-h"><h2>${s.name}</h2><span class="cnt">${items.length}</span></div>
        <div class="rule"></div>
        <div class="grid">${items.map(simCard)}</div>
      </section>`);
  }
  await page(req, res, {
    title: 'Симуляциялар', active: 'sims',
    body: html`
      <div class="view">
        ${vhead('Интерактивті симуляциялар', `Физиканың бөлімдері бойынша ${SIMS.length} модель. Әрқайсысында параметрлерді өзгертіп, құбылысты бақылап, өлшеулер жүргізуге болады. 7, 8 және 9-сынып симуляцияларын оқулықтың параграфтары бойынша да ашуға болады.`)}
        <div class="filters no-print">${tabs}</div>
        ${body}
      </div>`,
  });
}));

router.get('/sims/:k', asyncH(async (req, res) => {
  const s = SIM[req.params.k];
  if (!s) throw new HttpError(404, 'Симуляция табылмады.');
  const sec = SECTION[s.s];
  const formulas = s.f.map((n) => byName.get(n)).filter(Boolean);
  const labs = LABS.filter((L) => L.s === s.s);
  const others = SIMS.filter((x) => x.s === s.s && x.k !== s.k);
  const book = [];
  for (const g of TEXTBOOK_GRADES) {
    for (const ch of TEXTBOOK[g]) {
      for (const [n, t, keys] of ch.p) if (keys.includes(s.k)) book.push([`/sims?book=${g}`, `${g}-сынып · §${n}`, t]);
      for (const [n, t, keys] of ch.labs || []) if (keys.includes(s.k)) book.push([`/sims?book=${g}`, `${g}-сынып · №${n} зерт. жұмыс`, t]);
    }
  }
  await page(req, res, {
    title: s.t, active: 'sims', katex: true,
    scripts: ['/js/sims/kit.js', '/js/sims/real.js', `/js/sims/${s.k}.js`, '/js/formulas.js'],
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/sims">Симуляциялар</a><span>/</span><span>${sec.name}</span></div>
        <div class="vhead"><div><p class="eyebrow">${sec.name} · ${s.g}-сынып</p><h1>${s.t}</h1><p>${s.d}</p></div></div>
        <div class="simwrap">
          <section class="panel simstage">
            <div class="simcanvas"><canvas id="simCanvas" aria-label="${s.t}: модель" role="img"></canvas></div>
            <div class="simbar">
              <button class="btn" type="button" id="simPlay">${icon('play', 15)} <span>Бастау</span></button>
              <button class="btn ghost" type="button" id="simReset">${icon('reset', 15)} Қайта бастау</button>
              <button class="btn ghost" type="button" id="simFull">${icon('expand', 15)} <span>Толық экран</span></button>
              <button class="btn ghost" type="button" id="simShot">${icon('download', 15)} Сурет</button>
              <a class="btn ghost" href="/ai?ctx=sim:${s.k}">${icon('spark', 15)} ЖИ-көмекші</a>
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
          </aside>
        </div>
        <section class="panel simdata" id="simData" hidden></section>
        <div class="detail">
          <section class="stack">
            <div class="block-h"><h2>Теория</h2></div>
            <div class="fgrid">${formulas.map((f) => formulaCard(f))}</div>
          </section>
          <aside class="stack">
            <div class="panel">
              <h2>Зерттеу тапсырмалары</h2>
              <ol class="tasks">${s.tasks.map((t) => html`<li>${t}</li>`)}</ol>
            </div>
            <div class="panel">
              <h2>Мұғалімге</h2>
              <p class="muted">${s.tip}</p>
            </div>
            ${book.length ? html`<div class="panel"><h2>Оқулықта</h2><div class="list">${book.map(([href, no, t]) => html`<a class="row" href="${href}"><span class="grow"><b>${no}</b><span>${t}</span></span>${icon('arrow', 14)}</a>`)}</div></div>` : ''}
            ${labs.length ? html`<div class="panel"><h2>Осы бөлімнің зертханалары</h2><div class="list">${labs.map((L) => html`<a class="row" href="/labs/${L.k}"><span class="no">${L.g}·№${L.no}</span><span class="grow"><b>${L.t}</b></span>${icon('arrow', 14)}</a>`)}</div></div>` : ''}
            ${others.length ? html`<div class="panel"><h2>Ұқсас симуляциялар</h2><div class="list">${others.map((o) => html`<a class="row" href="/sims/${o.k}"><span class="grow"><b>${o.t}</b></span>${icon('arrow', 14)}</a>`)}</div></div>` : ''}
          </aside>
        </div>
      </div>`,
  });
}));

import express from 'express';
import { FAMILIES, GRADES, SECTION } from '../data/catalog.js';
import { OLYMPIAD } from '../data/olympiad.js';
import { OLYMPIAD_FILES } from '../data/olympiad-files.js';
import { SIM } from '../data/sims.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { emptyBox, page, vhead } from '../lib/layout.js';
import { texText } from '../lib/tex.js';
import { asyncH, toInt } from '../lib/util.js';

export const router = express.Router();

const LEVEL = { easy: 'Қарапайым', hard: 'Күрделі' };

// Ресми мұрағаттар: есептерді көшірмей, түпнұсқаға сілтеме береміз.
const SOURCES = [
  ['https://daryn.kz', '«Дарын» республикалық ғылыми-практикалық орталығы — олимпиадалардың ресми ұйымдастырушысы'],
  ['https://cdn.bc-pf.org/olympiads/physics/national/final/2024/9/phys9-1-sol-kaz.pdf', 'Республикалық олимпиада 2024, қорытынды кезең: 9-сынып шешімдері (PDF)'],
  ['https://cdn.bc-pf.org/olympiads/physics/national/final/2024/10/phys10-1-sol-kaz.pdf', 'Республикалық олимпиада 2024, қорытынды кезең: 10-сынып шешімдері (PDF)'],
];

// Ресми тапсырмалар (PDF) карточкасы.
function officialCard(f) {
  const name = (kind) => `Олимпиада ${f.year.replace('–', '-')} ${f.stage.toLowerCase()} ${f.g}-сынып ${kind}.pdf`;
  return html`
    <article class="ofile">
      <div class="ofile-h"><span class="fmt olymp">PDF</span><span class="pill">${f.stage}</span><span class="mc-grade">${f.year} оқу жылы</span></div>
      <h3>${f.g}-сынып</h3>
      <p>${f.title}. ${f.about}.</p>
      <div class="ofile-acts">
        <a class="btn sm" href="${f.tasks}" target="_blank" rel="noopener">${icon('book', 14)} Тапсырмалар${f.pages ? ` (${f.pages} бет)` : ''}</a>
        <a class="btn ghost sm" href="${f.answers}" target="_blank" rel="noopener">${icon('check', 14)} Жауаптар</a>
        <a class="linkbtn" href="${f.tasks}" download="${name('тапсырмалар')}">${icon('download', 14)} Жүктеу</a>
      </div>
    </article>`;
}

function problem(o, n) {
  const sec = SECTION[o.s];
  const sim = o.sim && SIM[o.sim];
  return html`
    <article class="oprob ${FAMILIES[sec.fam].css}" id="${o.k}">
      <div class="op-h">
        <span class="op-no mono">${n}</span>
        <span class="pill ${o.lvl === 'hard' ? 'pending' : 'ok'}">${LEVEL[o.lvl]}</span>
        <span class="mini ${FAMILIES[sec.fam].css}" title="${sec.name}">${sec.sym}</span>
        <h3>${o.t}</h3>
        <span class="mc-grade">${o.g}-сынып</span>
      </div>
      <div class="op-cond">${texText(o.cond)}</div>
      <details class="op-d"><summary>${icon('target', 15)} Физикалық мағынасы (кеңес)</summary><div>${texText(o.idea)}</div></details>
      <details class="op-d"><summary>${icon('formula', 15)} Шешімі</summary><ol class="op-steps">${o.steps.map((s) => html`<li>${texText(s)}</li>`)}</ol></details>
      <details class="op-d op-ans"><summary>${icon('check', 15)} Жауабы</summary><div>${texText(o.ans)}</div></details>
      <details class="op-d op-tip"><summary>${icon('book', 15)} Мұғалімге: әдістемелік нұсқау</summary><div>${texText(o.tip)}</div></details>
      ${sim ? html`<div class="op-f"><a class="btn ghost sm" href="/sims/${sim.k}">${icon('sim', 14)} Симуляцияда тексер: ${sim.t}</a></div>` : ''}
    </article>`;
}

router.get('/olympiad', asyncH(async (req, res) => {
  const grade = GRADES.includes(toInt(req.query.grade)) ? toInt(req.query.grade) : 0;
  const level = LEVEL[req.query.level] ? req.query.level : '';
  const list = OLYMPIAD.filter((o) => (!grade || o.g === grade) && (!level || o.lvl === level));
  const qs = (o) => {
    const p = new URLSearchParams(Object.entries({ grade: grade || '', level, ...o }).filter(([, v]) => v));
    return p.toString() ? `/olympiad?${p}` : '/olympiad';
  };
  const groups = GRADES.map((g) => ({ g, items: list.filter((o) => o.g === g) })).filter((x) => x.items.length);
  const files = OLYMPIAD_FILES.filter((f) => !grade || f.g === grade);

  await page(req, res, {
    title: 'Олимпиадалық есептер', active: 'olympiad', katex: true,
    body: html`
      <div class="view">
        ${vhead('Олимпиадалық есептер', `7–11-сыныптарға арналған ${OLYMPIAD.length} есеп: қарапайым (мектеп және аудан кезеңі) және күрделі (облыс және республика кезеңі). Әр есептің физикалық мағынасы, қадамдық шешімі, жауабы, мұғалімге әдістемелік нұсқауы және тексеруге арналған симуляциясы бар.`,
          html`<button class="btn ghost no-print" type="button" data-expand-all>Барлық шешімдерді ашу</button><button class="btn ghost no-print" type="button" data-print>Басып шығару</button>`)}
        <div class="filters no-print">
          <div class="chips">
            <a class="chip plain${!grade ? ' on' : ''}" href="${qs({ grade: '' })}">Барлық сынып</a>
            ${GRADES.map((g) => html`<a class="chip plain${grade === g ? ' on' : ''}" href="${qs({ grade: g })}">${g}-сынып</a>`)}
          </div>
          <div class="seg" role="group" aria-label="Деңгей">
            <a class="${!level ? 'on' : ''}" href="${qs({ level: '' })}">Барлығы</a>
            <a class="${level === 'easy' ? 'on' : ''}" href="${qs({ level: 'easy' })}">Қарапайым</a>
            <a class="${level === 'hard' ? 'on' : ''}" href="${qs({ level: 'hard' })}">Күрделі</a>
          </div>
        </div>
        ${files.length ? html`<section class="shelf">
          <div class="shelf-h"><h2>Ресми олимпиада тапсырмалары</h2><span class="cnt">${files.length} файл · PDF</span></div>
          <div class="rule"></div>
          <div class="ofgrid">${files.map(officialCard)}</div>
          <p class="muted small">Алдымен тапсырмаларды өз бетіңше шығар, содан кейін ғана жауаптарымен салыстыр.</p>
        </section>` : ''}
        <div class="notice small"><div><b>Төмендегі есептерді қалай қолдану керек?</b> Алдымен есепті өзің шығарып көр. Қиналсаң — «Физикалық мағынасы» деген кеңесті аш, содан кейін ғана шешімді қара. Бұл бөлімдегі есептер олимпиадалардың типтік тақырыптары бойынша құрастырылған авторлық есептер; ресми тапсырмалар жоғарыда және беттің соңындағы мұрағаттарда.</div></div>
        ${groups.length ? groups.map(({ g, items }) => html`
          <section class="shelf">
            <div class="shelf-h"><h2>${g}-сынып</h2><span class="cnt">${items.length} есеп</span></div>
            <div class="rule"></div>
            <div class="olist">${items.map((o) => problem(o, OLYMPIAD.filter((x) => x.g === o.g).indexOf(o) + 1))}</div>
          </section>`) : emptyBox('Есеп табылмады', 'Басқа сынып немесе деңгей таңдаңыз.')}
        <section class="panel">
          <h2>Ресми олимпиада тапсырмалары</h2>
          <ul class="facts">${SOURCES.map(([href, label]) => html`<li><a href="${href}" target="_blank" rel="noopener">${label}</a></li>`)}</ul>
        </section>
      </div>`,
  });
}));

import express from 'express';
import { FAMILIES, GRADES, SECTION } from '../data/catalog.js';
import { OLYMPIAD } from '../data/olympiad.js';
import { OLYMPIAD_TEST, OLYMPIAD_TESTS, testMax } from '../data/olympiad-tests.js';
import { SIM } from '../data/sims.js';
import { asset } from '../lib/assets.js';
import { many, q } from '../lib/db.js';
import { html, raw } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { csrfField, emptyBox, page, vhead } from '../lib/layout.js';
import { texText } from '../lib/tex.js';
import { asyncH, fmtDateTime, HttpError, toInt } from '../lib/util.js';

export const router = express.Router();

const LEVEL = { easy: 'Қарапайым', hard: 'Күрделі' };

// Ресми мұрағаттар: есептерді көшірмей, түпнұсқаға сілтеме береміз.
const SOURCES = [
  ['https://daryn.kz', '«Дарын» республикалық ғылыми-практикалық орталығы — олимпиадалардың ресми ұйымдастырушысы'],
  ['https://cdn.bc-pf.org/olympiads/physics/national/final/2024/9/phys9-1-sol-kaz.pdf', 'Республикалық олимпиада 2024, қорытынды кезең: 9-сынып шешімдері (PDF)'],
  ['https://cdn.bc-pf.org/olympiads/physics/national/final/2024/10/phys10-1-sol-kaz.pdf', 'Республикалық олимпиада 2024, қорытынды кезең: 10-сынып шешімдері (PDF)'],
];

// Ресми олимпиада тапсырмаларының онлайн тест карточкасы.
function testCard(t) {
  const n = t.questions.length;
  return html`
    <article class="ofile">
      <div class="ofile-h"><span class="pill">${t.stage}</span><span class="mc-grade">${t.year} оқу жылы</span></div>
      <h3>${t.g}-сынып</h3>
      <p>${t.title}. ${n} тапсырма, ең көбі ${testMax(t)} ұпай. Тапсырмаларды сайтта шешіп, «Тексеру» батырмасымен бірден нәтижеңді және дұрыс жауаптарды көр.</p>
      <div class="ofile-acts"><a class="btn sm" href="/olympiad/test/${t.k}">${icon('play', 14)} Тестті бастау</a></div>
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
  const tests = OLYMPIAD_TESTS.filter((t) => !grade || t.g === grade);

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
        ${tests.length ? html`<section class="shelf">
          <div class="shelf-h"><h2>Ресми олимпиада тапсырмалары: онлайн тест</h2><span class="cnt">${tests.length} тест</span></div>
          <div class="rule"></div>
          <div class="ofgrid">${tests.map(testCard)}</div>
        </section>` : ''}
        <div class="notice small"><div><b>Төмендегі есептерді қалай қолдану керек?</b> Алдымен есепті өзің шығарып көр. Қиналсаң — «Физикалық мағынасы» деген кеңесті аш, содан кейін ғана шешімді қара. Бұл бөлімдегі есептер олимпиадалардың типтік тақырыптары бойынша құрастырылған авторлық есептер; ресми тапсырмалар жоғарыдағы онлайн тесттерде және беттің соңындағы мұрағаттарда.</div></div>
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

// ======================= Ресми олимпиада тапсырмалары: онлайн тест =======================
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const ptsWord = (n) => `${n} ұпай`;

function gradeTest(t, body) {
  let score = 0, right = 0;
  const rows = t.questions.map((qq, i) => {
    const picked = LETTERS.includes(body[`q${qq.n}`]) ? body[`q${qq.n}`] : '';
    const correct = t.key[i];
    const ok = picked === correct;
    if (ok) { score += qq.pts; right++; }
    return { ...qq, picked, correct, ok };
  });
  return { score, right, max: testMax(t), rows };
}

async function bestResults(t) {
  return many(
    `SELECT u.full_name, s.name AS school_name, c.grade, c.letter, max(a.score) AS best
       FROM olympiad_attempts a JOIN users u ON u.id = a.user_id
  LEFT JOIN schools s ON s.id = u.school_id LEFT JOIN classes c ON c.id = u.class_id
      WHERE a.test_key = $1 AND u.status <> 'blocked'
   GROUP BY u.id, s.name, c.grade, c.letter ORDER BY best DESC LIMIT 10`, [t.k]);
}

function questionBlock(t, qq, result) {
  const r = result ? result.rows.find((x) => x.n === qq.n) : null;
  const cls = r ? (r.ok ? ' otq-ok' : ' otq-bad') : '';
  return html`
    <fieldset class="otq${cls}" id="q${qq.n}">
      <legend><span class="q-no">${qq.n}</span><span class="pill">${ptsWord(qq.pts)}</span>
        ${r ? html`<b class="${r.ok ? 'good' : 'badt'}">${r.ok ? 'Дұрыс' : r.picked ? `Қате: сенің жауабың ${r.picked}, дұрысы ${r.correct}` : `Жауап берілмеді, дұрысы ${r.correct}`}</b>` : ''}</legend>
      <a class="otq-zoom" href="${asset(`${t.dir}/${qq.img}`)}" target="_blank" rel="noopener" title="Үлкейтіп ашу"><img class="otq-img" src="${asset(`${t.dir}/${qq.img}`)}" width="${qq.w}" height="${qq.h}" alt="${qq.alt}" loading="${qq.n <= 3 ? 'eager' : 'lazy'}" decoding="async"></a>
      <span class="otq-hint">Суретті үлкейту үшін оны басыңыз.</span>
      <div class="otq-opts" role="radiogroup" aria-label="${qq.n}-тапсырманың жауабы">
        ${LETTERS.map((L) => {
          const mark = r ? (L === r.correct ? ' right' : L === r.picked ? ' wrong' : '') : '';
          return html`<label class="otq-opt${mark}"><input type="radio" name="q${qq.n}" value="${L}"${r && r.picked === L ? raw(' checked') : ''}${r ? raw(' disabled') : ''}><span>${L}</span></label>`;
        })}
      </div>
    </fieldset>`;
}

async function testPage(req, res, t, result) {
  const board = await bestResults(t);
  const mine = req.user ? await many('SELECT score, max_score, correct_count, total, created_at FROM olympiad_attempts WHERE user_id = $1 AND test_key = $2 ORDER BY created_at DESC LIMIT 5', [req.user.id, t.k]) : [];
  const n = t.questions.length;
  await page(req, res, {
    title: `Олимпиада ${t.year}: ${t.g}-сынып`, active: 'olympiad',
    scripts: ['/js/olymp-test.js'],
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/olympiad">Олимпиадалық есептер</a><span>/</span><span>${t.stage}, ${t.g}-сынып</span></div>
        <div class="vhead"><div><p class="eyebrow">${t.stage} · ${t.year} оқу жылы</p><h1>${t.g}-сынып: онлайн тест</h1>
          <p>${t.title}. ${n} тапсырма: 1–15 — 1 ұпайдан, 16–25 — 2 ұпайдан, 26–30 — 3 ұпайдан, барлығы ${testMax(t)} ұпай. Әр тапсырмада бір дұрыс жауап бар.</p></div></div>
        ${result ? html`
          <section class="panel ot-result" id="result">
            <div class="ot-score"><b>${result.score}</b><span>/ ${result.max} ұпай</span></div>
            <div class="grow"><h2>${result.score >= result.max * 0.8 ? 'Керемет нәтиже!' : result.score >= result.max * 0.5 ? 'Жақсы нәтиже' : 'Тағы жаттығу керек'}</h2>
              <p>Дұрыс жауап: ${result.right} / ${n}. Төменде әр тапсырманың дұрыс жауабы жасылмен, сенің қате жауабың қызылмен белгіленген.</p>
              ${req.user ? html`<p class="muted small">Нәтиже сақталды.</p>` : html`<p class="muted small">Нәтижеңді сақтау және үздіктер тізіміне ену үшін <a href="/login?next=/olympiad/test/${t.k}">кір</a> немесе <a href="/register">тіркел</a>.</p>`}</div>
            <a class="btn" href="/olympiad/test/${t.k}">${icon('reset', 15)} Қайта шешу</a>
          </section>` : ''}
        <div class="ot-wrap">
          <form class="stack" method="post" action="/olympiad/test/${t.k}#result" id="otForm" data-total="${n}">
            ${csrfField(req)}
            ${!result ? html`<div class="panel ot-bar" id="otBar"><b>Жауап берілді: <span class="mono" id="otDone">0</span> / ${n}</b><span class="grow"></span><button class="btn" type="submit">${icon('check', 15)} Тексеру</button></div>` : ''}
            ${t.questions.map((qq) => questionBlock(t, qq, result))}
            ${!result ? html`<div class="panel exam-foot"><p class="muted small">Барлық тапсырманы шешіп болған соң «Тексеру» батырмасын бас. Жауап берілмеген тапсырма 0 ұпай болып есептеледі.</p><button class="btn lg" type="submit">${icon('check', 16)} Тексеру</button></div>` : ''}
          </form>
          <aside class="stack ot-side">
            ${mine.length ? html`<div class="panel"><h2>Менің нәтижелерім</h2><ol class="board">${mine.map((m) => html`<li><span class="grow">${fmtDateTime(m.created_at)}</span><span class="mono">${m.score} / ${m.max_score}</span></li>`)}</ol></div>` : ''}
            <div class="panel"><h2>${icon('trophy')} Үздік нәтижелер</h2>
              ${board.length ? html`<ol class="board">${board.map((r) => html`<li><span class="grow"><b>${r.full_name}</b><span>${[r.grade ? `${r.grade}${r.letter || ''}` : '', r.school_name].filter(Boolean).join(' · ')}</span></span><span class="mono">${r.best}</span></li>`)}</ol>`
                : html`<p class="muted small">Әлі ешкім тапсырған жоқ — бірінші бол!</p>`}
            </div>
            <div class="panel"><h2>Кеңес</h2><p class="muted small">Тапсырманы шығарарда дәптерге сызба сызып, шамаларды ХБЖ-ға аудар. Қате жауаптарыңды тексергеннен кейін ұқсас есептерді «Олимпиадалық есептер» бөліміндегі шешімдермен салыстыр.</p></div>
          </aside>
        </div>
      </div>`,
  });
}

router.get('/olympiad/test/:k', asyncH(async (req, res) => {
  const t = OLYMPIAD_TEST[req.params.k];
  if (!t) throw new HttpError(404, 'Тест табылмады.');
  await testPage(req, res, t, null);
}));

router.post('/olympiad/test/:k', asyncH(async (req, res) => {
  const t = OLYMPIAD_TEST[req.params.k];
  if (!t) throw new HttpError(404, 'Тест табылмады.');
  const result = gradeTest(t, req.body || {});
  if (req.user) {
    await q('INSERT INTO olympiad_attempts(user_id, test_key, score, max_score, correct_count, total) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.id, t.k, result.score, result.max, result.right, t.questions.length]);
  }
  await testPage(req, res, t, result);
}));

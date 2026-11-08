import express from 'express';
import { EXAM, EXAMS, SECTION, SECTIONS } from '../data/catalog.js';
import { many, one, q } from '../lib/db.js';
import { html, jsonScript, sel } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { emptyBox, page, vhead } from '../lib/layout.js';
import { asyncH, fmtDateTime, HttpError, toInt } from '../lib/util.js';
import { materialCard } from './materials.js';

export const router = express.Router();

// Бір дұрыс жауапты — 1 балл. Бірнеше дұрыс жауапты — бәрі дұрыс болса 2 балл, бір қате болса 1 балл.
export function gradeAnswer(question, picked) {
  const correct = new Set(question.correct);
  const chosen = new Set((Array.isArray(picked) ? picked : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < question.options.length));
  if (question.kind === 'single') {
    const ok = chosen.size === 1 && correct.has([...chosen][0]);
    return { points: ok ? 1 : 0, max: 1, ok };
  }
  let errors = 0;
  for (const c of correct) if (!chosen.has(c)) errors++;
  for (const c of chosen) if (!correct.has(c)) errors++;
  const points = errors === 0 ? 2 : errors === 1 ? 1 : 0;
  return { points, max: 2, ok: errors === 0 };
}

async function bankCounts() {
  const rows = await many(`SELECT u.exam, count(q.id) AS n FROM exam_units u JOIN exam_questions q ON q.unit_id = u.id GROUP BY u.exam`);
  return Object.fromEntries(rows.map((r) => [r.exam, r.n]));
}

router.get('/exams', asyncH(async (req, res) => {
  const counts = await bankCounts();
  const attempts = req.user ? await many('SELECT * FROM exam_attempts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 6', [req.user.id]) : [];
  await page(req, res, {
    title: 'PISA · ББЖМ · ҰБТ', active: 'exams',
    body: html`
      <div class="view">
        ${vhead('Емтиханға дайындық', 'Халықаралық PISA зерттеуіне, ұлттық ББЖМ мониторингіне және ҰБТ-ға арналған физика тапсырмалары. Жаттығу режимінде әр жауаптан кейін түсіндірме шығады, сынақ режимі уақытпен өтеді.')}
        <div class="exgrid">${EXAMS.map((e) => html`
          <a class="excard" href="/exams/${e.k}">
            <span class="exn"><b>${e.name}</b><span>${e.who}</span></span>
            <p>${e.desc}</p>
            <span class="exc">${counts[e.k] || 0} тапсырма · бастау →</span>
          </a>`)}</div>
        <div class="notice"><div>Барлық тапсырма PISA, ББЖМ және ҰБТ форматында құрастырылған авторлық тапсырмалар — ресми нұсқалар емес. Ресми форматтың соңғы өзгерістерін Ұлттық тестілеу орталығының сайтынан тексеріңіз.</div></div>
        ${attempts.length ? html`<section class="block"><div class="block-h"><h2>Соңғы нәтижелерім</h2></div>
          <div class="tblwrap"><table><thead><tr><th>Емтихан</th><th>Режим</th><th>Бөлім</th><th class="num">Балл</th><th class="num">%</th><th>Күні</th></tr></thead>
          <tbody>${attempts.map((a) => html`<tr><td>${EXAM[a.exam].name}</td><td>${a.mode === 'exam' ? 'Сынақ' : 'Жаттығу'}</td><td>${SECTION[a.section] ? SECTION[a.section].name : 'Аралас'}</td>
            <td class="num">${a.score} / ${a.max_score}</td><td class="num">${a.max_score ? Math.round(100 * a.score / a.max_score) : 0}</td><td>${fmtDateTime(a.created_at)}</td></tr>`)}</tbody></table></div></section>` : ''}
      </div>`,
  });
}));

router.get('/exams/:exam', asyncH(async (req, res) => {
  const e = EXAM[req.params.exam];
  if (!e) throw new HttpError(404, 'Емтихан табылмады.');
  const secs = await many(
    `SELECT u.section, count(q.id) AS n FROM exam_units u JOIN exam_questions q ON q.unit_id = u.id WHERE u.exam = $1 GROUP BY u.section`, [e.k]);
  const total = secs.reduce((a, s) => a + s.n, 0);
  const mats = await many(`SELECT * FROM materials WHERE status = 'published' AND $1 = ANY(exams) ORDER BY created_at DESC LIMIT 6`, [e.k]);
  await page(req, res, {
    title: e.name, active: 'exams',
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/exams">Емтиханға дайындық</a><span>/</span><span>${e.name}</span></div>
        <section class="exinfo panel">
          <div><h1 style="font-family:var(--fd)">${e.name}</h1><p class="mono muted small">${e.full} · ${e.who}</p><p>${e.desc}</p></div>
          <ul class="facts">${e.facts.map((f) => html`<li>${f}</li>`)}</ul>
        </section>
        <section class="panel">
          <h2>Тестті бастау</h2>
          ${total ? html`
          <form class="filters" method="get" action="/exams/${e.k}/test">
            <label class="fl">Режим<select name="mode"><option value="practice">Жаттығу (бірден түсіндірме)</option><option value="exam">Сынақ (уақытпен)</option></select></label>
            <label class="fl">Бөлім<select name="section"><option value="">Аралас</option>${SECTIONS.filter((s) => secs.some((x) => x.section === s.k)).map((s) => html`<option value="${s.k}">${s.name} (${secs.find((x) => x.section === s.k).n})</option>`)}</select></label>
            <label class="fl">Тапсырма саны<select name="n">${[10, 20, 30].map((n) => html`<option value="${n}"${sel(n === 10)}>${n}</option>`)}</select></label>
            <button class="btn lg" type="submit">${icon('play', 16)} Бастау</button>
          </form>
          ${!req.user ? html`<p class="muted small">Нәтижеңді сақтау үшін <a href="/login?next=/exams/${e.k}">кір</a> немесе <a href="/register">тіркел</a>.</p>` : ''}`
          : emptyBox('Банк әзірге бос', 'Әкімші тапсырмалар қосқанда тест қолжетімді болады.')}
        </section>
        ${mats.length ? html`<section class="block"><div class="block-h"><h2>${e.name} бойынша материалдар</h2><a class="more" href="/library?exam=${e.k}">Барлығы</a></div><div class="mgrid">${mats.map((m) => materialCard(m))}</div></section>` : ''}
      </div>`,
  });
}));

// Тапсырмаларды кездейсоқ таңдау (контекстік блоктар бөлінбейді).
async function pickQuestions(exam, section, n) {
  const params = [exam];
  let where = 'u.exam = $1';
  if (section) { params.push(section); where += ' AND u.section = $2'; }
  const units = await many(`SELECT u.id, u.title, u.context, u.section, (SELECT count(*) FROM exam_questions q WHERE q.unit_id = u.id) AS n
                              FROM exam_units u WHERE ${where} ORDER BY random()`, params);
  const chosen = [];
  let count = 0;
  for (const u of units) {
    if (count >= n) break;
    if (!u.n) continue;
    if (count + u.n > n + 1 && chosen.length) continue;
    chosen.push(u);
    count += u.n;
  }
  if (!chosen.length) return [];
  const qs = await many(`SELECT id, unit_id, kind, stem, options, points FROM exam_questions WHERE unit_id = ANY($1) ORDER BY unit_id, ord`, [chosen.map((u) => u.id)]);
  return chosen.map((u) => ({ id: u.id, title: u.title, context: u.context, questions: qs.filter((x) => x.unit_id === u.id).map((x) => ({ id: x.id, kind: x.kind, stem: x.stem, options: x.options })) }));
}

router.get('/exams/:exam/test', asyncH(async (req, res) => {
  const e = EXAM[req.params.exam];
  if (!e) throw new HttpError(404, 'Емтихан табылмады.');
  const mode = req.query.mode === 'exam' ? 'exam' : 'practice';
  const section = SECTION[req.query.section] ? req.query.section : '';
  const n = [10, 20, 30].includes(toInt(req.query.n)) ? toInt(req.query.n) : 10;
  const units = await pickQuestions(e.k, section, n);
  const total = units.reduce((a, u) => a + u.questions.length, 0);
  await page(req, res, {
    title: `${e.name}: тест`, active: 'exams',
    scripts: ['/js/exam.js'],
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/exams">Емтиханға дайындық</a><span>/</span><a href="/exams/${e.k}">${e.name}</a><span>/</span><span>${mode === 'exam' ? 'Сынақ' : 'Жаттығу'}</span></div>
        <div class="exam-bar panel" id="examBar">
          <b>${e.name} · ${mode === 'exam' ? 'Сынақ режимі' : 'Жаттығу режимі'}${section ? ` · ${SECTION[section].name}` : ''}</b>
          <span class="grow"></span>
          <span class="mono" id="exProgress">0 / ${total}</span>
          ${mode === 'exam' ? html`<span class="mono timer" id="exTimer"></span>` : ''}
        </div>
        ${total ? html`<form id="examForm" class="stack" data-exam="${e.k}" data-mode="${mode}" data-section="${section}" data-csrf="${req.csrfToken}" data-limit="${total * 90}"></form>`
          : emptyBox('Тапсырма табылмады', 'Басқа бөлімді таңдап көріңіз.')}
        ${jsonScript('examData', units)}
      </div>`,
  });
}));

async function loadQuestions(ids) {
  const clean = [...new Set(ids.map(Number).filter(Number.isInteger))].slice(0, 80);
  if (!clean.length) return [];
  return many('SELECT id, kind, options, correct, explanation, points FROM exam_questions WHERE id = ANY($1)', [clean]);
}

router.post('/api/exams/check', asyncH(async (req, res) => {
  const [question] = await loadQuestions([req.body.id]);
  if (!question) return res.status(404).json({ error: 'Тапсырма табылмады.' });
  const r = gradeAnswer(question, req.body.answer);
  res.json({ ...r, correct: question.correct, explanation: question.explanation });
}));

router.post('/api/exams/submit', asyncH(async (req, res) => {
  const exam = EXAM[req.body.exam] ? req.body.exam : null;
  if (!exam) return res.status(400).json({ error: 'Емтихан белгісіз.' });
  const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const qs = await loadQuestions(Object.keys(answers));
  let score = 0, max = 0, right = 0;
  const results = {};
  for (const question of qs) {
    const r = gradeAnswer(question, answers[question.id]);
    score += r.points; max += r.max; if (r.ok) right++;
    results[question.id] = { ...r, correct: question.correct, explanation: question.explanation };
  }
  if (!qs.length) return res.status(400).json({ error: 'Жауаптар жоқ.' });
  let saved = false;
  if (req.user) {
    const mode = req.body.mode === 'exam' ? 'exam' : 'practice';
    const section = SECTION[req.body.section] ? req.body.section : '';
    const duration = Math.max(0, Math.min(36000, toInt(req.body.duration)));
    await q(`INSERT INTO exam_attempts(user_id, exam, mode, section, score, max_score, total, correct_count, duration_s)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [req.user.id, exam, mode, section, score, max, qs.length, right, duration]);
    saved = true;
  }
  res.json({ score, max, right, total: qs.length, results, saved });
}));

export async function examStats() {
  return one(`SELECT count(*) AS attempts FROM exam_attempts`);
}

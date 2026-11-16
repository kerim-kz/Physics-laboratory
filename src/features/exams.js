import express from 'express';
import { DOMAIN, DOMAINS, EXAM, EXAMS, examLabel, hasDomains, SECTION, SECTIONS } from '../data/catalog.js';
import { requireUser } from '../lib/auth.js';
import { many, one, q } from '../lib/db.js';
import { gradeAnswer, isAnswered, loadUnits, pickUnitIds, questionHtml, unitHtml } from '../lib/examcore.js';
import { html, sel } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { emptyBox, page, vhead } from '../lib/layout.js';
import { notify } from '../lib/notify.js';
import { sendStored } from '../lib/storage.js';
import { asyncH, fmtDate, fmtDateTime, HttpError, toInt } from '../lib/util.js';
import { materialCard } from './materials.js';

export { gradeAnswer };
export const router = express.Router();

const pct = (a) => (a.max_score ? Math.round(100 * a.score / a.max_score) : 0);

async function bankCounts() {
  const rows = await many(`SELECT u.exam, u.domain, count(q.id) AS n FROM exam_units u JOIN exam_questions q ON q.unit_id = u.id GROUP BY u.exam, u.domain`);
  const byExam = {}, byDomain = {};
  for (const r of rows) {
    byExam[r.exam] = (byExam[r.exam] || 0) + r.n;
    byDomain[`${r.exam}:${r.domain}`] = r.n;
  }
  return { byExam, byDomain };
}

// Оқушыға мұғалім тағайындаған тесттер (тапсырылған-тапсырылмағаны қоса).
export async function assignedFor(userId) {
  return many(
    `SELECT a.id, a.title, a.exam, a.domain, a.due_at, a.created_at, t.full_name AS teacher,
            at.id AS attempt_id, at.score, at.max_score, at.pending
       FROM exam_assignment_students s
       JOIN exam_assignments a ON a.id = s.assignment_id
       JOIN users t ON t.id = a.teacher_id
  LEFT JOIN exam_attempts at ON at.assignment_id = a.id AND at.user_id = s.student_id
      WHERE s.student_id = $1 ORDER BY a.created_at DESC LIMIT 30`, [userId]);
}

export function assignedBlock(list) {
  if (!list.length) return '';
  return html`
    <section class="block">
      <div class="block-h"><h2>Мұғалім тағайындаған тесттер</h2><span class="cnt">${list.filter((a) => !a.attempt_id).length} тапсырылмаған</span></div>
      <div class="list">${list.map((a) => html`
        <div class="row">
          <div class="grow"><b>${a.title}</b><span>${examLabel(a.exam, a.domain)} · мұғалім: ${a.teacher}${a.due_at ? ` · мерзімі: ${fmtDate(a.due_at)}` : ''}</span></div>
          ${a.attempt_id
            ? html`<span class="pill ok">тапсырылды · ${a.score} / ${a.max_score}${a.pending ? ' (тексерілуде)' : ''}</span><a class="open" href="/exams/attempts/${a.attempt_id}">Нәтижені қарау ${icon('arrow', 14)}</a>`
            : html`<span class="pill pending">тапсырылмаған</span><a class="btn sm" href="/exams/assigned/${a.id}">${icon('play', 14)} Тестті бастау</a>`}
        </div>`)}</div>
    </section>`;
}

export function attemptsTable(attempts, { withStudent = false } = {}) {
  return html`<div class="tblwrap"><table><thead><tr>${withStudent ? html`<th>Оқушы</th>` : ''}<th>Тест</th><th>Режим</th><th class="num">Балл</th><th class="num">%</th><th>Күні</th><th></th></tr></thead>
    <tbody>${attempts.map((a) => html`<tr>${withStudent ? html`<td>${a.full_name}</td>` : ''}
      <td>${examLabel(a.exam, a.domain)}${SECTION[a.section] ? ` · ${SECTION[a.section].name}` : ''}</td>
      <td>${a.assignment_id ? 'Мұғалім тапсырмасы' : a.mode === 'exam' ? 'Сынақ' : 'Жаттығу'}</td>
      <td class="num">${a.score} / ${a.max_score}${a.pending ? html` <span class="pill pending" title="Ашық жауаптар тексерілмеген">+${a.pending} тексерілуде</span>` : ''}</td>
      <td class="num">${pct(a)}</td><td>${fmtDateTime(a.created_at)}</td>
      <td>${a.has_answers ? html`<a class="linkbtn" href="/exams/attempts/${a.id}">Қарау</a>` : ''}</td></tr>`)}</tbody></table></div>`;
}

router.get('/exams', asyncH(async (req, res) => {
  const { byExam } = await bankCounts();
  const u = req.user;
  const attempts = u ? await many(
    `SELECT id, exam, domain, mode, section, score, max_score, pending, assignment_id, created_at, answers IS NOT NULL AS has_answers
       FROM exam_attempts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [u.id]) : [];
  const assigned = u && u.role === 'student' ? await assignedFor(u.id) : [];
  await page(req, res, {
    title: 'PISA · ББЖМ · ҰБТ', active: 'exams',
    body: html`
      <div class="view">
        ${vhead('Емтиханға дайындық', 'Халықаралық PISA зерттеуіне, ұлттық ББЖМ мониторингіне және ҰБТ-ға дайындық. PISA мен ББЖМ үш бағытқа бөлінген: оқу сауаттылығы, математикалық сауаттылық және жаратылыстану сауаттылығы.',
          u && u.role === 'teacher' ? html`<a class="btn" href="/teacher/assignments">${icon('exam', 16)} Оқушыларға тест тағайындау</a>` : '')}
        ${assignedBlock(assigned)}
        <div class="exgrid">${EXAMS.map((e) => html`
          <a class="excard" href="/exams/${e.k}">
            <span class="exn"><b>${e.name}</b><span>${e.who}</span></span>
            <p>${e.desc}</p>
            <span class="exc">${byExam[e.k] || 0} тапсырма · бастау →</span>
          </a>`)}</div>
        <div class="notice"><div>Тапсырмалардың көбі PISA, ББЖМ және ҰБТ-2026 форматында құрастырылған авторлық тапсырмалар, бір бөлігі — мұғалімдер ұсынған сауаттылық тапсырмаларының жинағынан алынған. Ресми спецификация мен демонұсқаларды <a href="https://testcenter.kz" target="_blank" rel="noopener">Ұлттық тестілеу орталығының</a> сайтынан, PISA туралы мәліметті <a href="https://www.oecd.org/pisa/" target="_blank" rel="noopener">OECD PISA</a> сайтынан қараңыз.</div></div>
        ${attempts.length ? html`<section class="block"><div class="block-h"><h2>Соңғы нәтижелерім</h2><a class="more" href="/cabinet">Барлық нәтижем</a></div>${attemptsTable(attempts)}</section>` : ''}
      </div>`,
  });
}));

router.get('/exams/:exam', asyncH(async (req, res) => {
  const e = EXAM[req.params.exam];
  if (!e) throw new HttpError(404, 'Емтихан табылмады.');
  const { byDomain } = await bankCounts();
  const secs = await many(
    `SELECT u.section, count(q.id) AS n FROM exam_units u JOIN exam_questions q ON q.unit_id = u.id WHERE u.exam = $1 GROUP BY u.section`, [e.k]);
  const total = secs.reduce((a, s) => a + s.n, 0);
  const mats = await many(`SELECT * FROM materials WHERE status = 'published' AND $1 = ANY(exams) ORDER BY created_at DESC LIMIT 6`, [e.k]);
  const domains = hasDomains(e.k);
  await page(req, res, {
    title: e.name, active: 'exams',
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/exams">Емтиханға дайындық</a><span>/</span><span>${e.name}</span></div>
        <section class="exinfo panel">
          <div><h1 style="font-family:var(--fd)">${e.name}</h1><p class="mono muted small">${e.full} · ${e.who}</p><p>${e.desc}</p></div>
          <ul class="facts">${e.facts.map((f) => html`<li>${f}</li>`)}</ul>
        </section>
        ${domains ? html`
        <section class="block">
          <div class="block-h"><h2>Бағытты таңда</h2><span class="cnt">${total} тапсырма</span></div>
          <div class="domgrid">${DOMAINS.map((d) => { const n = byDomain[`${e.k}:${d.k}`] || 0; return html`
            <article class="domcard dom-${d.k}">
              <div class="card-top"><span class="glyph">${icon(d.icon)}</span><span class="cls">${n} тапсырма</span></div>
              <h3>${d.name}</h3>
              <p>${d.desc}</p>
              ${n ? html`<div class="dom-acts">
                <a class="btn sm" href="/exams/${e.k}/test?domain=${d.k}&mode=practice&n=10">${icon('play', 14)} Жаттығу</a>
                <a class="btn ghost sm" href="/exams/${e.k}/test?domain=${d.k}&mode=exam&n=20">${icon('clock', 14)} Сынақ (уақытпен)</a>
              </div>` : html`<p class="muted small">Әзірге тапсырма жоқ. Әкімші «Тест банкі» бөлімінен осы бағытқа тапсырма қоса алады.</p>`}
            </article>`; })}</div>
          <p class="muted small">Жаттығу режимінде әр жауап бірден тексеріледі. Сынақ режимі уақытпен өтеді, нәтиже соңында шығады. Ашық жауапты сұрақтарды мұғалім тағайындаған тестте мұғалім бағалайды.</p>
        </section>` : html`
        <section class="panel">
          <h2>Тестті бастау</h2>
          ${total ? html`
          <form class="filters" method="get" action="/exams/${e.k}/test">
            <label class="fl">Режим<select name="mode"><option value="practice">Жаттығу (бірден түсіндірме)</option><option value="exam">Сынақ (уақытпен)</option></select></label>
            <label class="fl">Бөлім<select name="section"><option value="">Аралас</option>${SECTIONS.filter((s) => secs.some((x) => x.section === s.k)).map((s) => html`<option value="${s.k}">${s.name} (${secs.find((x) => x.section === s.k).n})</option>`)}</select></label>
            <label class="fl">Тапсырма саны<select name="n">${[10, 20, 30, 40].map((n) => html`<option value="${n}"${sel(n === 10)}>${n === 40 ? '40 (толық нұсқа)' : n}</option>`)}</select></label>
            <button class="btn lg" type="submit">${icon('play', 16)} Бастау</button>
          </form>` : emptyBox('Банк әзірге бос', 'Әкімші тапсырмалар қосқанда тест қолжетімді болады.')}
        </section>`}
        ${!req.user ? html`<p class="muted small">Нәтижеңді сақтау үшін <a href="/login?next=/exams/${e.k}">кір</a> немесе <a href="/register">тіркел</a>.</p>` : ''}
        ${mats.length ? html`<section class="block"><div class="block-h"><h2>${e.name} бойынша материалдар</h2><a class="more" href="/library?exam=${e.k}">Барлығы</a></div><div class="mgrid">${mats.map((m) => materialCard(m))}</div></section>` : ''}
      </div>`,
  });
}));

// Тест беті (жаттығу, сынақ және мұғалім тапсырмасы үшін ортақ).
async function testPage(req, res, { e, units, mode, domain = '', section = '', assignment = null }) {
  const total = units.reduce((a, u) => a + u.questions.length, 0);
  const modeName = assignment ? 'Мұғалім тапсырмасы' : mode === 'exam' ? 'Сынақ режимі' : 'Жаттығу режимі';
  let no = 0;
  const perQuestion = hasDomains(e.k) ? 150 : 90;
  await page(req, res, {
    title: `${e.name}: тест`, active: 'exams',
    scripts: ['/js/exam.js'],
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/exams">Емтиханға дайындық</a><span>/</span><a href="/exams/${e.k}">${e.name}</a><span>/</span><span>${assignment ? assignment.title : mode === 'exam' ? 'Сынақ' : 'Жаттығу'}</span></div>
        ${assignment ? html`<div class="notice"><div><b>${assignment.title}.</b> Бұл тестті саған мұғалімің ${assignment.teacher} тағайындады${assignment.due_at ? ` (мерзімі: ${fmtDate(assignment.due_at)})` : ''}. Тестті бір рет қана тапсыруға болады. Ашық жауаптарыңды мұғалім тексеріп, ұпай қояды.</div></div>` : ''}
        <div class="exam-bar panel" id="examBar">
          <b>${examLabel(e.k, domain)} · ${modeName}${section ? ` · ${SECTION[section].name}` : ''}</b>
          <span class="grow"></span>
          <span class="mono" id="exProgress">0 / ${total}</span>
          ${mode === 'exam' ? html`<span class="mono timer" id="exTimer"></span>` : ''}
        </div>
        ${total ? html`<form id="examForm" class="stack" data-exam="${e.k}" data-mode="${mode}" data-domain="${domain}" data-section="${section}" data-assignment="${assignment ? assignment.id : ''}" data-csrf="${req.csrfToken}" data-limit="${total * perQuestion}">
          ${units.map((u) => { const start = no; no += u.questions.length; return unitHtml(u, start, (qq, n) => questionHtml(qq, n, { practice: mode === 'practice' })); })}
          <div class="panel exam-foot">
            <p class="muted small">${assignment ? 'Барлық сұраққа жауап беріп болған соң «Тапсыру» батырмасын бас. Тапсырғаннан кейін жауапты өзгерту мүмкін емес.'
              : mode === 'exam' ? 'Барлық жауапты белгілеп болған соң «Аяқтау» батырмасын бас. Уақыт біткенде тест өздігінен аяқталады.'
              : 'Әр тапсырманы «Тексеру» арқылы тексеруге болады. Соңында жалпы нәтижені сақтау үшін «Аяқтау» бас.'}</p>
            <button type="submit" class="btn lg">${assignment ? 'Тапсыру' : 'Аяқтау'}</button>
            <div id="exSummary"></div>
          </div>
        </form>` : emptyBox('Тапсырма табылмады', 'Басқа бағытты немесе бөлімді таңдап көріңіз.')}
      </div>`,
  });
}

router.get('/exams/:exam/test', asyncH(async (req, res) => {
  const e = EXAM[req.params.exam];
  if (!e) throw new HttpError(404, 'Емтихан табылмады.');
  const mode = req.query.mode === 'exam' ? 'exam' : 'practice';
  const section = SECTION[req.query.section] ? req.query.section : '';
  if (req.query.domain && !(hasDomains(e.k) && DOMAIN[req.query.domain])) throw new HttpError(404, 'Бұл бағыт табылмады.');
  const domain = req.query.domain || '';
  const n = [domain ? 0 : 10, 10, 20, 30, 40].includes(toInt(req.query.n, 10)) ? toInt(req.query.n, 10) : 10;
  const units = await loadUnits(await pickUnitIds(e.k, { domain, section, n }));
  await testPage(req, res, { e, units, mode, domain, section });
}));

// Мұғалім тағайындаған тест.
async function assignmentFor(req) {
  const a = await one(
    `SELECT a.*, t.full_name AS teacher FROM exam_assignments a JOIN users t ON t.id = a.teacher_id
       JOIN exam_assignment_students s ON s.assignment_id = a.id AND s.student_id = $2 WHERE a.id = $1`, [toInt(req.params.id), req.user.id]);
  if (!a) throw new HttpError(404, 'Бұл тест сізге тағайындалмаған.');
  return a;
}

router.get('/exams/assigned/:id', requireUser, asyncH(async (req, res) => {
  const a = await assignmentFor(req);
  const done = await one('SELECT id FROM exam_attempts WHERE assignment_id = $1 AND user_id = $2', [a.id, req.user.id]);
  if (done) return res.redirect(`/exams/attempts/${done.id}`);
  const units = await loadUnits(a.unit_ids);
  await testPage(req, res, { e: EXAM[a.exam], units, mode: 'assigned', domain: a.domain, assignment: a });
}));

// Әкімші жүктеген тапсырма суреті.
router.get('/exams/img/:key', asyncH(async (req, res) => {
  const key = String(req.params.key);
  if (!/^[a-f0-9]{32}\.(png|jpe?g|webp|gif)$/.test(key)) throw new HttpError(404, 'Сурет табылмады.');
  const used = await one('SELECT 1 AS x FROM exam_units WHERE image = $1 UNION SELECT 1 FROM exam_questions WHERE image = $1 LIMIT 1', [key]);
  if (!used) throw new HttpError(404, 'Сурет табылмады.');
  const ext = key.split('.').pop();
  res.type(ext === 'jpg' ? 'jpeg' : ext).set('Cache-Control', 'public, max-age=604800');
  if (!(await sendStored(res, key))) throw new HttpError(404, 'Сурет табылмады.');
}));

async function loadQuestions(ids) {
  const clean = [...new Set(ids.map(Number).filter(Number.isInteger))].slice(0, 120);
  if (!clean.length) return [];
  return many('SELECT id, unit_id, kind, options, correct, explanation, points, rubric FROM exam_questions WHERE id = ANY($1)', [clean]);
}

// Клиентке қайтарылатын нәтиже (дұрыс жауабымен).
// hideKey: мұғалім тағайындаған тестте оқушыға дұрыс жауап көрсетілмейді (сыныптастарына таратпау үшін).
function resultFor(question, r, { selfCheck = false, hideKey = false } = {}) {
  const out = { kind: question.kind, points: r.points, max: r.max, ok: r.ok };
  if (!hideKey) { out.correct = question.correct; out.explanation = question.explanation; }
  if (question.kind === 'number') out.unit = (question.options && question.options.unit) || '';
  if (question.kind === 'open') { out.open = true; out.self = selfCheck; if (selfCheck) out.rubric = question.rubric; }
  return out;
}

router.post('/api/exams/check', asyncH(async (req, res) => {
  const [question] = await loadQuestions([req.body.id]);
  if (!question) return res.status(404).json({ error: 'Тапсырма табылмады.' });
  const r = gradeAnswer(question, req.body.answer);
  res.json(resultFor(question, r, { selfCheck: true }));
}));

router.post('/api/exams/submit', asyncH(async (req, res) => {
  const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  let assignment = null;
  let qs;
  if (req.body.assignment) {
    if (!req.user) return res.status(401).json({ error: 'Алдымен платформаға кіріңіз.' });
    assignment = await one(
      `SELECT a.* FROM exam_assignments a JOIN exam_assignment_students s ON s.assignment_id = a.id AND s.student_id = $2 WHERE a.id = $1`,
      [toInt(req.body.assignment), req.user.id]);
    if (!assignment) return res.status(404).json({ error: 'Бұл тест сізге тағайындалмаған.' });
    const done = await one('SELECT id FROM exam_attempts WHERE assignment_id = $1 AND user_id = $2', [assignment.id, req.user.id]);
    if (done) return res.status(409).json({ error: 'Бұл тест бұрын тапсырылған.', attemptId: done.id });
    // Тағайындалған тестте барлық сұрақ есепке алынады (жауап берілмегені — 0 балл).
    qs = await many('SELECT id, unit_id, kind, options, correct, explanation, points, rubric FROM exam_questions WHERE unit_id = ANY($1)', [assignment.unit_ids]);
  } else {
    qs = await loadQuestions(Object.keys(answers));
  }
  const exam = assignment ? assignment.exam : EXAM[req.body.exam] ? req.body.exam : null;
  if (!exam) return res.status(400).json({ error: 'Емтихан белгісіз.' });
  if (!qs.length) return res.status(400).json({ error: 'Жауаптар жоқ.' });

  let score = 0, max = 0, right = 0, pending = 0;
  const results = {}, stored = {};
  for (const question of qs) {
    const a = answers[question.id];
    const r = gradeAnswer(question, a);
    if (question.kind === 'open') {
      if (assignment) {
        max += r.max;
        const has = r.text !== '';
        if (has) pending++;
        stored[question.id] = { a: r.text, p: has ? null : 0, m: r.max };
        results[question.id] = resultFor(question, r, { hideKey: true });
      } else {
        // Жаттығу мен сынақта ашық сұрақ ұпайға қосылмайды: оқушы үлгі жауаппен өзі салыстырады.
        stored[question.id] = { a: r.text, p: 0, m: 0, self: true };
        results[question.id] = resultFor(question, r, { selfCheck: true });
      }
      continue;
    }
    score += r.points; max += r.max; if (r.ok) right++;
    stored[question.id] = { a: isAnswered(question, a) ? a : null, p: r.points, m: r.max };
    results[question.id] = resultFor(question, r, { hideKey: !!assignment });
  }
  let saved = false, attemptId = null;
  if (req.user) {
    const mode = assignment ? 'assigned' : req.body.mode === 'exam' ? 'exam' : 'practice';
    const section = SECTION[req.body.section] ? req.body.section : '';
    const domain = assignment ? assignment.domain : hasDomains(exam) && DOMAIN[req.body.domain] ? req.body.domain : '';
    const duration = Math.max(0, Math.min(36000, toInt(req.body.duration)));
    const row = await one(
      `INSERT INTO exam_attempts(user_id, exam, mode, section, score, max_score, total, correct_count, duration_s, domain, assignment_id, answers, pending)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [req.user.id, exam, mode, section, score, max, qs.length, right, duration, domain, assignment ? assignment.id : null, JSON.stringify(stored), pending]);
    saved = true; attemptId = row.id;
    if (assignment) {
      await notify([assignment.teacher_id], {
        kind: 'result', title: `${req.user.full_name} тестті тапсырды`,
        body: `«${assignment.title}»: ${score} / ${max} балл${pending ? `. Тексеруді күтетін ашық жауап: ${pending}` : ''}.`,
        link: `/exams/attempts/${attemptId}`,
      });
    }
  }
  res.json({ score, max, right, total: qs.length, pending, results, saved, attemptId, assigned: !!assignment });
}));

// ---------------- Нәтижені қарау (оқушы, оның мұғалімі, әкімші) ----------------
async function attemptFor(req) {
  const a = await one(
    `SELECT at.*, u.full_name, u.class_id, c.teacher_id AS class_teacher, c.grade AS class_grade, c.letter AS class_letter,
            asg.teacher_id AS asg_teacher, asg.title AS asg_title
       FROM exam_attempts at JOIN users u ON u.id = at.user_id
  LEFT JOIN classes c ON c.id = u.class_id
  LEFT JOIN exam_assignments asg ON asg.id = at.assignment_id
      WHERE at.id = $1`, [toInt(req.params.id)]);
  if (!a) throw new HttpError(404, 'Нәтиже табылмады.');
  const me = req.user;
  const isTeacher = me.role === 'teacher' && (a.class_teacher === me.id || a.asg_teacher === me.id);
  if (a.user_id !== me.id && !isTeacher && me.role !== 'admin') throw new HttpError(404, 'Нәтиже табылмады.');
  a.canGrade = isTeacher || me.role === 'admin';
  return a;
}

router.get('/exams/attempts/:id', requireUser, asyncH(async (req, res) => {
  const a = await attemptFor(req);
  const ans = a.answers || {};
  const qids = Object.keys(ans).map(Number);
  const rows = qids.length ? await many('SELECT unit_id FROM exam_questions WHERE id = ANY($1)', [qids]) : [];
  const unitIds = [...new Set(rows.map((r) => r.unit_id))].sort((x, y) => x - y);
  const units = (await loadUnits(unitIds, { full: true })).map((u) => ({ ...u, questions: u.questions.filter((x) => ans[x.id]) }));
  const own = a.user_id === req.user.id;
  const openQs = units.flatMap((u) => u.questions).filter((x) => x.kind === 'open' && !ans[x.id].self);
  let no = 0;
  await page(req, res, {
    title: 'Тест нәтижесі', active: 'exams',
    body: html`
      <div class="view">
        <div class="crumbs">${own ? html`<a href="/cabinet">Кабинет</a>` : a.assignment_id ? html`<a href="/teacher/assignments/${a.assignment_id}">Тест нәтижелері</a>` : html`<a href="/teacher/classes/${a.class_id}">${a.class_grade}${a.class_letter} сынып</a>`}<span>/</span><span>Тест нәтижесі</span></div>
        <section class="panel ot-result">
          <div class="ot-score"><b>${a.score}</b><span>/ ${a.max_score} балл · ${pct(a)}%</span></div>
          <div class="grow"><h2>${own ? 'Менің нәтижем' : a.full_name}</h2>
            <p>${examLabel(a.exam, a.domain)}${a.asg_title ? ` · «${a.asg_title}»` : ''} · ${fmtDateTime(a.created_at)}</p>
            ${a.pending ? html`<p><span class="pill pending">${a.pending} ашық жауап мұғалімнің тексеруін күтуде</span> — тексерілгеннен кейін балл толығады.</p>` : ''}
            ${!qids.length ? html`<p class="muted small">Бұл ескі нәтиже: жауаптары сақталмаған, тек жалпы балы бар.</p>` : ''}</div>
        </section>
        ${a.canGrade && openQs.length ? html`
          <form class="panel form" method="post" action="/teacher/attempts/${a.id}/grade" id="grade">
            <input type="hidden" name="_csrf" value="${req.csrfToken}">
            <h2>Ашық жауаптарды бағалау</h2>
            <p class="muted small">Оқушының жауабын критериймен салыстырып, ұпай қойыңыз. Сақтағаннан кейін оқушыға хабарлама барады.</p>
            ${openQs.map((x) => html`
              <fieldset class="gradeq">
                <legend>${x.stem.split('\n').pop()}</legend>
                <div class="q-open">${ans[x.id].a ? ans[x.id].a : html`<i class="muted">Жауап жазылмаған</i>`}</div>
                <p class="q-fb"><b>Критерий.</b> ${x.rubric}</p>
                <div class="chips">${Array.from({ length: ans[x.id].m + 1 }, (_, p) => html`<label class="chip plain"><input type="radio" name="g${x.id}" value="${p}"${ans[x.id].p === p ? html` checked` : ''} required> ${p} балл</label>`)}</div>
              </fieldset>`)}
            <div class="formfoot"><button class="btn" type="submit">Бағаны сақтау</button></div>
          </form>` : ''}
        ${units.map((u) => { const start = no; no += u.questions.length; return unitHtml(u, start, (qq, n) => questionHtml(qq, n, {
          review: true, answer: ans[qq.id].a, res: ans[qq.id],
          showKey: a.canGrade || (!a.assignment_id && (qq.kind !== 'open' || ans[qq.id].self || ans[qq.id].p !== null)),
        })); })}
      </div>`,
  });
}));

router.post('/teacher/attempts/:id/grade', requireUser, asyncH(async (req, res) => {
  const a = await attemptFor(req);
  if (!a.canGrade) throw new HttpError(403, 'Бұл нәтижені бағалауға рұқсат жоқ.');
  const ans = a.answers || {};
  for (const [qid, v] of Object.entries(ans)) {
    const g = req.body[`g${qid}`];
    if (g === undefined || v.self || v.m === 0) continue;
    const isOpen = await one(`SELECT 1 AS x FROM exam_questions WHERE id = $1 AND kind = 'open'`, [toInt(qid)]);
    if (!isOpen) continue;
    v.p = Math.max(0, Math.min(v.m, toInt(g)));
  }
  const vals = Object.values(ans);
  const score = vals.reduce((s, v) => s + (v.p || 0), 0);
  const pending = vals.filter((v) => v.p === null).length;
  const right = vals.filter((v) => v.m > 0 && v.p !== null && v.p >= v.m).length;
  await q('UPDATE exam_attempts SET answers = $1, score = $2, pending = $3, correct_count = $4 WHERE id = $5', [JSON.stringify(ans), score, pending, right, a.id]);
  if (a.user_id !== req.user.id) {
    await notify([a.user_id], {
      kind: 'grade', title: 'Мұғалім жауаптарыңды тексерді',
      body: `${examLabel(a.exam, a.domain)}${a.asg_title ? ` · «${a.asg_title}»` : ''}: қорытынды балың ${score} / ${a.max_score}.`,
      link: `/exams/attempts/${a.id}`,
    });
  }
  res.redirect(a.assignment_id ? `/teacher/assignments/${a.assignment_id}` : `/exams/attempts/${a.id}`);
}));

export async function examStats() {
  return one(`SELECT count(*) AS attempts FROM exam_attempts`);
}

// «Нәтижелер» бөлімі: мұғалім өз сыныптарының (әкімші — барлық сыныптың), оқушы өзінің тест нәтижелерін
// емтихан түрі (PISA, TIMSS, ..., ББЖМ, ҰБТ) және дереккөзі (тағайындалған / өзіндік) бойынша қарайды.
import express from 'express';
import { domainsOf, EXAM, examLabel, hasDomains, TEST_EXAMS } from '../data/catalog.js';
import { isActiveTeacher, isAdmin, requireUser } from '../lib/auth.js';
import { many, one } from '../lib/db.js';
import { html, raw } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { emptyBox, page } from '../lib/layout.js';
import { asyncH, fmtDate, fmtDateTime, HttpError, toCsv, toInt } from '../lib/util.js';
import { attemptsTable } from './exams.js';
import { aiState } from '../lib/ai.js';
import { grade5, labByKey, LABS } from '../data/labs.js';
import { ROUND, roundHref, roundTitle } from '../data/olympiad-rounds.js';

export const router = express.Router();

export const pct = (a) => (a.max_score ? Math.round(100 * a.score / a.max_score) : 0);
const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
const level = (p) => (p === null || p === undefined ? '' : p >= 70 ? 'hi' : p >= 40 ? 'mid' : 'lo');
const EXTRA = { labs: 'Зертханалар', olymp: 'Олимпиада' };
const SOURCES = [['all', 'Барлығы'], ['assigned', 'Мұғалім тағайындаған'], ['self', 'Өзіндік жаттығу']];

// Сүзгілер: емтихан түрі мен дереккөзі (URL параметрлерінен).
export function filters(req) {
  const exam = EXTRA[req.query.exam] || (EXAM[req.query.exam] && !EXAM[req.query.exam].survey) ? req.query.exam : 'all';
  const src = SOURCES.some(([k]) => k === req.query.src) ? req.query.src : 'all';
  return { exam, src };
}
function filterSql(f, params, alias = 'a') {
  let w = '';
  if (f.exam !== 'all') { params.push(f.exam); w += ` AND ${alias}.exam = $${params.length}`; }
  if (f.src === 'assigned') w += ` AND ${alias}.assignment_id IS NOT NULL`;
  if (f.src === 'self') w += ` AND ${alias}.assignment_id IS NULL`;
  return w;
}
const qs = (o) => '?' + Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

// Емтихан және дереккөз сүзгілерінің батырмалары.
function filterBar(base, f, extra = {}) {
  return html`<div class="rs-filters">
    <div class="seg" role="group" aria-label="Тест түрі">
      <a class="${f.exam === 'all' ? 'on' : ''}" href="${base}${qs({ ...extra, src: f.src })}">Барлық тест</a>
      ${TEST_EXAMS.map((e) => html`<a class="${f.exam === e.k ? 'on' : ''}" href="${base}${qs({ ...extra, exam: e.k, src: f.src })}">${e.name}</a>`)}
      ${Object.entries(EXTRA).map(([k, n]) => html`<a class="${f.exam === k ? 'on' : ''}" href="${base}${qs({ ...extra, exam: k })}">${n}</a>`)}
    </div>
    ${EXTRA[f.exam] ? '' : html`<div class="seg" role="group" aria-label="Дереккөзі">
      ${SOURCES.map(([k, n]) => html`<a class="${f.src === k ? 'on' : ''}" href="${base}${qs({ ...extra, exam: f.exam, src: k })}">${n}</a>`)}
    </div>`}
  </div>`;
}

// Бағыттар (немесе емтихан түрлері) бойынша орташа нәтиже — көлденең бағандар.
function domainBars(attempts, f) {
  let groups;
  if (f.exam !== 'all' && hasDomains(f.exam)) groups = domainsOf(f.exam).map((d) => ({ name: d.name, xs: attempts.filter((a) => a.domain === d.k).map(pct) }));
  else if (f.exam !== 'all') groups = [{ name: `${EXAM[f.exam].name} · Физика`, xs: attempts.map(pct) }];
  else groups = TEST_EXAMS.map((e) => ({ name: e.name, xs: attempts.filter((a) => a.exam === e.k).map(pct) }));
  groups = groups.filter((g) => g.xs.length);
  if (!groups.length) return '';
  return html`<section class="block">
    <div class="block-h"><h2>${f.exam !== 'all' && hasDomains(f.exam) ? 'Бағыттар бойынша орташа нәтиже' : 'Тест түрлері бойынша орташа нәтиже'}</h2></div>
    <div class="rs-bars">${groups.map((g) => { const p = avg(g.xs); return html`<div class="rs-bar">
      <span class="rs-bn">${g.name}</span>
      <span class="rs-track"><span class="rs-fill ${level(p)}" style="width:${p}%"></span></span>
      <b class="rs-bv">${p}%</b><span class="rs-bc">${g.xs.length} тест</span></div>`; })}</div>
  </section>`;
}

// Уақыт бойынша өсу: апта сайынғы орташа пайыз (SVG сызықтық графигі).
function progressChart(attempts, title) {
  if (attempts.length < 2) return '';
  const week = (d) => { const t = new Date(d); const day = (t.getDay() + 6) % 7; t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - day); return t.getTime(); };
  const by = new Map();
  for (const a of attempts) { const k = week(a.created_at); if (!by.has(k)) by.set(k, []); by.get(k).push(pct(a)); }
  const pts = [...by.entries()].sort((x, y) => x[0] - y[0]).map(([t, xs]) => ({ t, p: avg(xs), n: xs.length }));
  if (pts.length < 2) return '';
  const W = 900, H = 260, L = 72, R = 16, T = 16, B = 34;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
  const X = (t) => L + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (W - L - R);
  const Y = (p) => T + (1 - p / 100) * (H - T - B);
  const line = pts.map((q) => `${X(q.t).toFixed(1)},${Y(q.p).toFixed(1)}`).join(' ');
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="rs-gl"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="rs-gt">${v}%</text>`).join('');
  const dots = pts.map((q) => `<circle cx="${X(q.t).toFixed(1)}" cy="${Y(q.p).toFixed(1)}" r="4.5" class="rs-dot"><title>${fmtDate(new Date(q.t))} аптасы: ${q.p}% (${q.n} тест)</title></circle>`).join('');
  const step = Math.max(1, Math.ceil(pts.length / 6));
  const labels = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((q) => `<text x="${X(q.t).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="rs-gt">${String(new Date(q.t).getDate()).padStart(2, '0')}.${String(new Date(q.t).getMonth() + 1).padStart(2, '0')}</text>`).join('');
  return html`<section class="block">
    <div class="block-h"><h2>${title}</h2><span class="cnt">апта бойынша орташа</span></div>
    <div class="rs-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">${raw(grid)}<polyline points="${line}" class="rs-line"/>${raw(dots)}${raw(labels)}</svg></div>
  </section>`;
}

function statCards(items) {
  return html`<div class="stats rs-stats">${items.map(([v, l]) => html`<div class="stat"><b>${v ?? '—'}</b><span>${l}</span></div>`)}</div>`;
}

// ---------------- Мұғалім / әкімші ----------------
export async function viewerClasses(u) {
  if (isAdmin(u)) {
    return many(`SELECT c.id, c.grade, c.letter, c.teacher_id, t.full_name AS teacher,
                        (SELECT count(*)::int FROM users s WHERE s.class_id = c.id AND s.role = 'student') AS n
                   FROM classes c JOIN users t ON t.id = c.teacher_id ORDER BY c.grade, c.letter, t.full_name`);
  }
  return many(`SELECT c.id, c.grade, c.letter, c.teacher_id, (SELECT count(*)::int FROM users s WHERE s.class_id = c.id AND s.role = 'student') AS n
                 FROM classes c WHERE c.teacher_id = $1 ORDER BY c.grade, c.letter`, [u.id]);
}

// Сынып бойынша деректер: оқушылар, сүзгіден өткен талпыныстар және тағайындалған тесттер.
export async function classData(cls, f) {
  const students = await many(`SELECT id, full_name FROM users WHERE class_id = $1 AND role = 'student' ORDER BY full_name`, [cls.id]);
  const params = [cls.id];
  const where = filterSql(f, params);
  const attempts = await many(
    `SELECT a.id, a.user_id, a.exam, a.domain, a.mode, a.section, a.score, a.max_score, a.pending, a.assignment_id, a.created_at,
            a.answers IS NOT NULL AS has_answers, u.full_name
       FROM exam_attempts a JOIN users u ON u.id = a.user_id
      WHERE u.class_id = $1 AND u.role = 'student'${where} ORDER BY a.created_at`, params);
  const ap = [cls.id];
  let aw = '';
  if (f.exam !== 'all') { ap.push(f.exam); aw = ` AND exam = $${ap.length}`; }
  const assignments = f.src === 'self' ? [] : await many(`SELECT id, title, exam, domain, created_at FROM exam_assignments WHERE class_id = $1${aw} ORDER BY created_at`, ap);
  return { students, attempts, assignments };
}

// Бағандар: әр тағайындалған тест + өзіндік жаттығулар (емтихан·бағыт бойынша топталған).
function matrixColumns(d, f) {
  const cols = d.assignments.map((a) => ({ key: `a${a.id}`, title: a.title, sub: `${examLabel(a.exam, a.domain)} · ${fmtDate(a.created_at)}`, href: `/teacher/assignments/${a.id}`, match: (t) => t.assignment_id === a.id }));
  if (f.src !== 'assigned') {
    const seen = new Map();
    for (const t of d.attempts) if (!t.assignment_id) { const k = `${t.exam}:${t.domain}`; if (!seen.has(k)) seen.set(k, t); }
    for (const [k, t] of seen) cols.push({ key: `s${k}`, title: examLabel(t.exam, t.domain), sub: 'өзіндік жаттығу (ең жақсы)', self: true, match: (x) => !x.assignment_id && `${x.exam}:${x.domain}` === k });
  }
  return cols;
}
function cellOf(col, list) {
  const xs = list.filter(col.match);
  if (!xs.length) return null;
  const best = xs.reduce((b, x) => (pct(x) > pct(b) ? x : b));
  return { p: pct(best), n: xs.length, id: best.id, pending: best.pending, has: best.has_answers };
}

async function teacherView(req, res) {
  const u = req.user;
  const f = filters(req);
  const classes = await viewerClasses(u);
  if (!classes.length) {
    return page(req, res, {
      title: 'Нәтижелер', active: 'results', styles: ['/css/results.css'],
      body: html`<div class="view">${header('Сыныптардың нәтижелері', 'Сыныптарыңыздың тапсырған тесттерінің нәтижелері осында жиналады.')}
        ${emptyBox('Әзірге сынып жоқ', 'Алдымен жеке кабинетте сынып ашып, оқушыларды тіркеңіз.')}</div>`,
    });
  }
  const cls = classes.find((c) => c.id === toInt(req.query.class)) || classes[0];
  if (EXTRA[f.exam]) return extraTeacherView(req, res, classes, cls, f);
  const d = await classData(cls, f);
  const st = await aiState(u);
  const cols = matrixColumns(d, f);
  const byStudent = new Map(d.students.map((s) => [s.id, d.attempts.filter((t) => t.user_id === s.id)]));
  const pcts = d.attempts.map(pct);
  const participated = new Set(d.attempts.map((t) => t.user_id)).size;
  const pending = d.attempts.reduce((s, t) => s + (t.pending || 0), 0);
  const base = '/results';
  const keep = { class: cls.id };
  await page(req, res, {
    title: 'Нәтижелер', active: 'results', styles: ['/css/results.css', '/css/ai.css'], katex: true, scripts: ['/vendor/katex/katex.min.js', '/js/ai.js'],
    body: html`<div class="view">
      ${header('Сыныптардың нәтижелері', 'Сыныпты және тест түрін таңдаңыз. Кестеде әр оқушының әр тесттегі нәтижесі (пайызбен) көрсетіледі; өзіндік жаттығулар үшін — ең жақсы нәтиже.',
        html`<a class="btn ghost" href="/results/export.csv${qs({ class: cls.id, exam: f.exam, src: f.src })}">${icon('download', 15)} Excel (CSV)</a>`)}
      <div class="rs-classes chips">${classes.map((c) => html`<a class="chip plain ${c.id === cls.id ? 'on' : ''}" href="${base}${qs({ class: c.id, exam: f.exam, src: f.src })}">${c.grade}${c.letter} сынып${c.teacher ? ` · ${c.teacher}` : ''} <span class="mono muted">${c.n}</span></a>`)}</div>
      ${filterBar(base, f, keep)}
      ${statCards([[d.students.length, 'оқушы'], [`${participated}`, 'тест тапсырған оқушы'], [d.attempts.length, 'тапсырылған тест'], [pcts.length ? `${avg(pcts)}%` : null, 'орташа нәтиже'], [pending, 'тексеруді күтетін жауап']])}
      ${d.attempts.length ? html`
        ${aiAnalyzePanel(req, st, cls, f)}
        ${domainBars(d.attempts, f)}
        ${progressChart(d.attempts, 'Сыныптың уақыт бойынша өсуі')}
        <section class="block">
          <div class="block-h"><h2>Оқушылар × тесттер</h2><span class="cnt">${cols.length} баған</span></div>
          <p class="muted small rs-legend"><span class="rs-sw hi"></span> 70% және одан жоғары <span class="rs-sw mid"></span> 40–69% <span class="rs-sw lo"></span> 40%-дан төмен · «—» — тапсырмаған</p>
          <div class="tblwrap rs-matrix"><table>
            <thead><tr><th>№</th><th>Оқушы</th>${cols.map((c) => html`<th class="rs-col">${c.href ? html`<a href="${c.href}">${c.title}</a>` : c.title}<small>${c.sub}</small></th>`)}<th class="num">Орташа</th></tr></thead>
            <tbody>${d.students.map((s, i) => {
              const list = byStudent.get(s.id) || [];
              const cells = cols.map((c) => cellOf(c, list));
              const rowAvg = avg(cells.filter(Boolean).map((c) => c.p));
              return html`<tr><td class="num">${i + 1}</td><td>${s.full_name}</td>
                ${cells.map((c) => (c ? html`<td class="num rs-cell ${level(c.p)}">${c.has ? html`<a href="/exams/attempts/${c.id}">${c.p}%</a>` : `${c.p}%`}${c.n > 1 ? html`<small>×${c.n}</small>` : ''}${c.pending ? html`<small class="rs-pend" title="Ашық жауаптар тексерілмеген">+${c.pending}</small>` : ''}</td>` : html`<td class="num muted">—</td>`))}
                <td class="num"><b>${rowAvg === null ? '—' : `${rowAvg}%`}</b></td></tr>`;
            })}</tbody>
            <tfoot><tr><td></td><td><b>Сынып бойынша</b></td>${cols.map((c) => { const xs = d.students.map((s) => cellOf(c, byStudent.get(s.id) || [])).filter(Boolean).map((x) => x.p); const p = avg(xs); return html`<td class="num"><b>${p === null ? '—' : `${p}%`}</b>${xs.length ? html`<small>${xs.length}/${d.students.length}</small>` : ''}</td>`; })}<td class="num"><b>${pcts.length ? `${avg(pcts)}%` : '—'}</b></td></tr></tfoot>
          </table></div>
        </section>
        <section class="block">
          <div class="block-h"><h2>Соңғы тапсырылған тесттер</h2></div>
          ${attemptsTable(d.attempts.slice(-20).reverse(), { withStudent: true })}
        </section>`
      : emptyBox('Бұл сүзгі бойынша нәтиже жоқ', 'Басқа тест түрін немесе дереккөзін таңдаңыз, не болмаса сыныпқа тест тағайындаңыз.')}
      <p class="muted small"><a href="/teacher/assignments/new?class=${cls.id}">${icon('exam', 14)} ${cls.grade}${cls.letter} сыныбына тест тағайындау</a></p>
    </div>`,
  });
}

// ЖИ талдауы: батырма және нәтиже орны (ЖИ бапталмаған болса — көрсетілмейді).
function aiAnalyzePanel(req, st, cls, f) {
  if (!st.ready) return '';
  return html`<section class="panel ai-analyze" id="aiAnalyze" data-csrf="${req.csrfToken}" data-class="${cls.id}" data-exam="${f.exam}" data-src="${f.src}">
    <div class="ai-outbar">${icon('spark', 17)}<div class="grow"><b>ЖИ талдауы</b><span class="muted small">Сынып нәтижелерін талдап, қиын тақырыптар мен келесі сабақтарға ұсыныстар береді. Оқушылардың аты-жөні ЖИ-ге жіберілмейді — олар кестедегі нөмірімен (№) аталады.</span></div>
      <button class="btn sm" type="button" id="aiAnalyzeBtn">${icon('spark', 14)} Талдау жасау</button></div>
    <div class="ai-md" id="aiAnalyzeOut" hidden></div>
    ${st.quota && st.quota.limit !== null ? html`<p class="muted small">Бүгін қалған ЖИ сұраныстары: <b data-ai-left>${st.quota.left}</b> / ${st.quota.limit}</p>` : ''}
  </section>`;
}

function header(title, lede, actions = '') {
  return html`<div class="vhead"><div><p class="eyebrow">Нәтижелер</p><h1>${title}</h1><p>${lede}</p></div>${actions ? html`<div class="vhead-act">${actions}</div>` : ''}</div>`;
}

// ---------------- Оқушы ----------------
async function studentView(req, res) {
  const u = req.user;
  const f = filters(req);
  if (EXTRA[f.exam]) return extraStudentView(req, res, f);
  const params = [u.id];
  const where = filterSql(f, params);
  const attempts = await many(
    `SELECT a.id, a.exam, a.domain, a.mode, a.section, a.score, a.max_score, a.pending, a.assignment_id, a.created_at, a.answers IS NOT NULL AS has_answers
       FROM exam_attempts a WHERE a.user_id = $1${where} ORDER BY a.created_at`, params);
  const pcts = attempts.map(pct);
  await page(req, res, {
    title: 'Нәтижелерім', active: 'results', styles: ['/css/results.css'],
    body: html`<div class="view">
      ${header('Менің нәтижелерім', 'Тапсырған барлық тестің: мұғалім тағайындағандары және өзің жаттыққандарың. Тест түрін таңдап, қай бағытта өсіп келе жатқаныңды көр.')}
      ${filterBar('/results', f)}
      ${statCards([[attempts.length, 'тапсырылған тест'], [pcts.length ? `${avg(pcts)}%` : null, 'орташа нәтиже'], [pcts.length ? `${Math.max(...pcts)}%` : null, 'ең жақсы нәтиже'], [attempts.filter((a) => a.assignment_id).length, 'мұғалім тапсырмасы'], [attempts.reduce((s, a) => s + (a.pending || 0), 0), 'тексеруді күтетін жауап']])}
      ${attempts.length ? html`
        ${domainBars(attempts, f)}
        ${progressChart(attempts, 'Менің уақыт бойынша өсуім')}
        <section class="block"><div class="block-h"><h2>Барлық талпыныстар</h2><span class="cnt">${attempts.length}</span></div>
          ${attemptsTable(attempts.slice().reverse())}</section>`
      : emptyBox('Бұл сүзгі бойынша нәтиже жоқ', 'Тест тапсыру үшін «Халықаралық зерттеулер», «ББЖМ» немесе «ҰБТ» бөліміне өт.')}
    </div>`,
  });
}

router.get('/results', requireUser, asyncH(async (req, res) => {
  const u = req.user;
  if (isAdmin(u) || isActiveTeacher(u)) return teacherView(req, res);
  if (u.role === 'teacher') throw new HttpError(403, 'Нәтижелерді көру үшін мұғалім аккаунты расталуы керек.');
  return studentView(req, res);
}));

router.get('/results/export.csv', requireUser, asyncH(async (req, res) => {
  const u = req.user;
  if (!isAdmin(u) && !isActiveTeacher(u)) throw new HttpError(403, 'Тек мұғалімге арналған.');
  const f = filters(req);
  const cls = isAdmin(u) ? await one('SELECT * FROM classes WHERE id = $1', [toInt(req.query.class)])
    : await one('SELECT * FROM classes WHERE id = $1 AND teacher_id = $2', [toInt(req.query.class), u.id]);
  if (!cls) throw new HttpError(404, 'Сынып табылмады.');
  if (EXTRA[f.exam]) {
    const x = await extraData(cls, f);
    const rows = [['№', 'Оқушы', ...x.cols.map((c) => c.title), 'Орташа %']];
    x.rows.forEach((r, i) => { const cells = x.cols.map((c) => r.cells[c.key]); rows.push([i + 1, r.name, ...cells.map((c) => (c ? c.label : '')), avg(cells.filter(Boolean).map((c) => c.p)) ?? '']); });
    return res.type('text/csv; charset=utf-8').attachment(`natizhe-${cls.grade}${cls.letter}-${f.exam}.csv`).send(toCsv(rows));
  }
  const d = await classData(cls, f);
  const cols = matrixColumns(d, f);
  const rows = [['№', 'Оқушы', ...cols.map((c) => `${c.title} (${c.sub})`), 'Орташа %']];
  d.students.forEach((s, i) => {
    const list = d.attempts.filter((t) => t.user_id === s.id);
    const cells = cols.map((c) => cellOf(c, list));
    rows.push([i + 1, s.full_name, ...cells.map((c) => (c ? c.p : '')), avg(cells.filter(Boolean).map((c) => c.p)) ?? '']);
  });
  rows.push([]);
  rows.push(['Барлық талпыныстар']);
  rows.push(['Оқушы', 'Тест', 'Дереккөзі', 'Балл', 'Макс', '%', 'Күні']);
  d.attempts.forEach((t) => rows.push([t.full_name, examLabel(t.exam, t.domain), t.assignment_id ? 'мұғалім тапсырмасы' : 'өзіндік', t.score, t.max_score, pct(t), fmtDateTime(t.created_at)]));
  const tag = f.exam === 'all' ? 'barlyq' : f.exam;
  res.type('text/csv; charset=utf-8').attachment(`natizhe-${cls.grade}${cls.letter}-${tag}.csv`).send(toCsv(rows));
}));

// ---------------- Зертханалар және олимпиада ----------------
const norm = (x) => String(x || '').toUpperCase().replace(/[^0-9A-ZА-ЯӘҒҚҢӨҰҮҺІЁ]/g, '');

// Сынып бойынша зертхана (немесе олимпиада) нәтижелері: жолдар — оқушылар, бағандар — жұмыстар.
async function extraData(cls, f) {
  const students = await many(`SELECT id, full_name FROM users WHERE class_id = $1 AND role = 'student' ORDER BY full_name`, [cls.id]);
  const byName = new Map(students.map((st) => [norm(st.full_name), st]));
  const rowMap = new Map(students.map((st) => [`u${st.id}`, { name: st.full_name, cells: {}, items: [] }]));
  const items = []; // { rowKey, name, key, title, p, label, at }
  if (f.exam === 'labs') {
    const label = norm(`${cls.grade}${cls.letter}`);
    const ids = students.map((st) => st.id);
    const lr = await many(`SELECT * FROM lab_results WHERE teacher_id = $1 OR student_id = ANY($2) ORDER BY created_at`, [cls.teacher_id, ids]);
    const seen = new Set();
    for (const r of lr) {
      const st = r.student_id && ids.includes(r.student_id) ? students.find((x) => x.id === r.student_id) : byName.get(norm(r.student_name));
      const inClass = st || norm(r.class_label) === label;
      if (!inClass || (r.teacher_id !== cls.teacher_id && !st)) continue;
      const rowKey = st ? `u${st.id}` : `n${norm(r.student_name)}`;
      seen.add(`${rowKey}|${r.lab_key}`);
      items.push({ rowKey, name: st ? st.full_name : r.student_name, key: r.lab_key, p: Math.round(Number(r.score) * 10), label: `${String(r.score).replace('.', ',')} / 10 (${grade5(r.score)})`, at: r.created_at, src: r.source === 'online' ? 'платформада' : 'код арқылы' });
    }
    // Оқушы сыныпқа кейін қосылса, журналда жоқ онлайн жұмыстары lab_subs-та қалады.
    const subs = ids.length ? await many(`SELECT lab_key, user_id, score, updated_at FROM lab_subs WHERE user_id = ANY($1)`, [ids]) : [];
    for (const r of subs) {
      const rowKey = `u${r.user_id}`;
      if (seen.has(`${rowKey}|${r.lab_key}`)) continue;
      const st = students.find((x) => x.id === r.user_id);
      items.push({ rowKey, name: st.full_name, key: r.lab_key, p: Math.round(Number(r.score) * 10), label: `${String(r.score).replace('.', ',')} / 10 (${grade5(r.score)})`, at: r.updated_at, src: 'платформада' });
    }
  } else {
    const ids = students.map((st) => st.id);
    const oa = ids.length ? await many(`SELECT * FROM olympiad_attempts WHERE user_id = ANY($1) ORDER BY created_at`, [ids]) : [];
    for (const r of oa) {
      const st = students.find((x) => x.id === r.user_id);
      items.push({ rowKey: `u${r.user_id}`, name: st.full_name, key: r.test_key, p: r.max_score ? Math.round(100 * r.score / r.max_score) : 0, label: `${r.score} / ${r.max_score}`, at: r.created_at, src: 'онлайн тест' });
    }
  }
  const title = (k) => {
    if (f.exam === 'labs') { const L = labByKey(k); return L ? `${L.g}-сынып №${L.no}. ${L.t}` : k; }
    const t = ROUND[k]; return t ? roundTitle(t) : k;
  };
  const order = f.exam === 'labs' ? LABS.map((L) => L.k) : [];
  const keys = [...new Set(items.map((x) => x.key))].sort((a, b) => (order.indexOf(a) - order.indexOf(b)) || a.localeCompare(b));
  const cols = keys.map((k) => ({ key: k, title: title(k) }));
  for (const it of items) {
    if (!rowMap.has(it.rowKey)) rowMap.set(it.rowKey, { name: it.name, cells: {}, items: [], extra: true });
    const row = rowMap.get(it.rowKey);
    row.items.push(it);
    const cur = row.cells[it.key];
    if (!cur || it.p > cur.p) row.cells[it.key] = { ...it, n: (cur ? cur.n : 0) + 1 };
    else cur.n += 1;
  }
  return { students, rows: [...rowMap.values()], cols, items };
}

async function extraTeacherView(req, res, classes, cls, f) {
  const x = await extraData(cls, f);
  const isLab = f.exam === 'labs';
  const ps = x.items.map((i) => i.p);
  const done = x.rows.filter((r) => r.items.length).length;
  const asAttempts = x.items.map((i) => ({ score: i.p, max_score: 100, created_at: i.at }));
  await page(req, res, {
    title: 'Нәтижелер', active: 'results', styles: ['/css/results.css'],
    body: html`<div class="view">
      ${header('Сыныптардың нәтижелері', isLab ? 'Зертханалық жұмыстардың нәтижелері: платформада орындалғандары және мұғалім код арқылы журналға енгізгендері. Әр ұяшықта оқушының ең жақсы нәтижесі (10 балдық және 5 балдық баға).' : 'Ресми олимпиада тапсырмаларының онлайн тест нәтижелері.',
        html`<a class="btn ghost" href="/results/export.csv${qs({ class: cls.id, exam: f.exam })}">${icon('download', 15)} Excel (CSV)</a>`)}
      <div class="rs-classes chips">${classes.map((c) => html`<a class="chip plain ${c.id === cls.id ? 'on' : ''}" href="/results${qs({ class: c.id, exam: f.exam })}">${c.grade}${c.letter} сынып${c.teacher ? ` · ${c.teacher}` : ''} <span class="mono muted">${c.n}</span></a>`)}</div>
      ${filterBar('/results', f, { class: cls.id })}
      ${statCards([[x.students.length, 'оқушы'], [done, isLab ? 'жұмыс тапсырған оқушы' : 'олимпиадаға қатысқан'], [x.items.length, isLab ? 'тапсырылған жұмыс' : 'талпыныс'], [ps.length ? `${avg(ps)}%` : null, 'орташа нәтиже'], [x.cols.length, isLab ? 'зертханалық жұмыс' : 'олимпиада тесті']])}
      ${x.items.length ? html`
        <section class="block"><div class="block-h"><h2>${isLab ? 'Жұмыстар бойынша орташа нәтиже' : 'Тесттер бойынша орташа нәтиже'}</h2></div>
          <div class="rs-bars">${x.cols.map((c) => { const xs = x.items.filter((i) => i.key === c.key).map((i) => i.p); const p = avg(xs); return html`<div class="rs-bar"><span class="rs-bn">${c.title}</span><span class="rs-track"><span class="rs-fill ${level(p)}" style="width:${p}%"></span></span><b class="rs-bv">${p}%</b><span class="rs-bc">${xs.length} нәтиже</span></div>`; })}</div></section>
        ${progressChart(asAttempts, 'Сыныптың уақыт бойынша өсуі')}
        <section class="block"><div class="block-h"><h2>Оқушылар × ${isLab ? 'жұмыстар' : 'тесттер'}</h2><span class="cnt">${x.cols.length} баған</span></div>
          <p class="muted small rs-legend"><span class="rs-sw hi"></span> 70% және одан жоғары <span class="rs-sw mid"></span> 40–69% <span class="rs-sw lo"></span> 40%-дан төмен · «—» — тапсырмаған${x.rows.some((r) => r.extra) ? ' · * — сыныпқа тіркелмеген, журналға код арқылы енгізілген' : ''}</p>
          <div class="tblwrap rs-matrix"><table>
            <thead><tr><th>№</th><th>Оқушы</th>${x.cols.map((c) => html`<th class="rs-col">${c.title}</th>`)}<th class="num">Орташа</th></tr></thead>
            <tbody>${x.rows.map((r, i) => { const cells = x.cols.map((c) => r.cells[c.key]); const ra = avg(cells.filter(Boolean).map((c) => c.p)); return html`<tr><td class="num">${i + 1}</td><td>${r.name}${r.extra ? ' *' : ''}</td>
              ${cells.map((c) => (c ? html`<td class="num rs-cell ${level(c.p)}" title="${c.src} · ${fmtDateTime(c.at)}">${c.label}${c.n > 1 ? html`<small>×${c.n}</small>` : ''}</td>` : html`<td class="num muted">—</td>`))}
              <td class="num"><b>${ra === null ? '—' : `${ra}%`}</b></td></tr>`; })}</tbody>
          </table></div></section>`
      : emptyBox(isLab ? 'Бұл сыныпта зертхана нәтижесі әзірге жоқ' : 'Бұл сыныпта олимпиада нәтижесі әзірге жоқ', isLab ? 'Оқушылар зертханалық жұмысты платформада орындағанда нәтиже осында өзі түседі. Код арқылы келген нәтижелерді «Зертхана журналы» бетінде енгізіңіз.' : 'Оқушылар «Олимпиада» бөліміндегі онлайн тестті тапсырғанда нәтижесі осында көрінеді.')}
      ${isLab ? html`<p class="muted small"><a href="/teacher/labs">${icon('lab', 14)} Толық зертхана журналы (барлық сынып, код енгізу)</a></p>` : ''}
    </div>`,
  });
}

async function extraStudentView(req, res, f) {
  const u = req.user;
  const isLab = f.exam === 'labs';
  let items;
  if (isLab) {
    const subs = await many('SELECT lab_key, score, updated_at AS at FROM lab_subs WHERE user_id = $1', [u.id]);
    const lr = await many('SELECT lab_key, score, created_at AS at FROM lab_results WHERE student_id = $1', [u.id]);
    const m = new Map();
    for (const r of [...lr, ...subs]) if (!m.has(r.lab_key) || Number(r.score) > Number(m.get(r.lab_key).score)) m.set(r.lab_key, r);
    items = [...m.values()].map((r) => { const L = labByKey(r.lab_key); return { title: L ? `${L.g}-сынып №${L.no}. ${L.t}` : r.lab_key, href: L ? `/labs/${L.k}` : '', p: Math.round(Number(r.score) * 10), label: `${String(r.score).replace('.', ',')} / 10 · баға ${grade5(r.score)}`, at: r.at }; });
  } else {
    const oa = await many('SELECT * FROM olympiad_attempts WHERE user_id = $1 ORDER BY created_at', [u.id]);
    items = oa.map((r) => { const t = ROUND[r.test_key]; return { title: t ? roundTitle(t) : r.test_key, href: t ? roundHref(t) : '/olympiad', p: r.max_score ? Math.round(100 * r.score / r.max_score) : 0, label: `${r.score} / ${r.max_score}`, at: r.created_at }; });
  }
  items.sort((a, b) => new Date(a.at) - new Date(b.at));
  const ps = items.map((i) => i.p);
  await page(req, res, {
    title: 'Нәтижелерім', active: 'results', styles: ['/css/results.css'],
    body: html`<div class="view">
      ${header('Менің нәтижелерім', isLab ? 'Платформада орындаған зертханалық жұмыстарыңның нәтижелері.' : 'Олимпиада тапсырмаларының онлайн тест нәтижелері.')}
      ${filterBar('/results', f)}
      ${statCards([[items.length, isLab ? 'орындалған жұмыс' : 'талпыныс'], [ps.length ? `${avg(ps)}%` : null, 'орташа нәтиже'], [ps.length ? `${Math.max(...ps)}%` : null, 'ең жақсы нәтиже']])}
      ${items.length ? html`${progressChart(items.map((i) => ({ score: i.p, max_score: 100, created_at: i.at })), 'Менің уақыт бойынша өсуім')}
        <section class="block"><div class="block-h"><h2>${isLab ? 'Зертханалық жұмыстар' : 'Олимпиада тесттері'}</h2><span class="cnt">${items.length}</span></div>
        <div class="tblwrap"><table><thead><tr><th>Жұмыс</th><th class="num">Нәтиже</th><th class="num">%</th><th>Күні</th></tr></thead>
        <tbody>${items.slice().reverse().map((i) => html`<tr><td>${i.href ? html`<a href="${i.href}">${i.title}</a>` : i.title}</td><td class="num">${i.label}</td><td class="num rs-cell ${level(i.p)}">${i.p}</td><td>${fmtDateTime(i.at)}</td></tr>`)}</tbody></table></div></section>`
      : emptyBox('Әзірге нәтиже жоқ', isLab ? '«Зертханалар» бөліміндегі жұмысты платформаға кіріп орындасаң, нәтижең осында сақталады.' : '«Олимпиада» бөліміндегі онлайн тестті тапсырып көр.')}
    </div>`,
  });
}

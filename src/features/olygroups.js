// Олимпиадаға дайындық топтары.
// Мұғалім: топ ашады, оқушыларды өз сыныптарынан қосады немесе топ кодын береді, олимпиадалық есептер мен
// ресми онлайн тесттерді тапсырма етіп береді, жүктелген шешімдерді (сурет/PDF) қарап, ұпай мен пікір қояды.
// Оқушы: кодпен қосылады, тапсырмадағы есептің шешімін суретке түсіріп жүктейді, бағасын көреді.
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { FAMILIES, GRADES, SECTION } from '../data/catalog.js';
import { OLYMPIAD, OLYMPIAD_BY_KEY } from '../data/olympiad.js';
import { OLYMPIAD_TEST, OLYMPIAD_TESTS, testMax } from '../data/olympiad-tests.js';
import { csrfAfterUpload, isActiveTeacher, isAdmin, requireActiveTeacher, requireUser } from '../lib/auth.js';
import { many, one, q } from '../lib/db.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { csrfField, emptyBox, page } from '../lib/layout.js';
import { notify } from '../lib/notify.js';
import { deleteStored, discardUpload, multerStorage, persistUpload, sendStored } from '../lib/storage.js';
import { texText } from '../lib/tex.js';
import { asArray, asyncH, cleanMultiline, cleanText, fmtDate, fmtDateTime, HttpError, newJoinCode, setFlash, toInt } from '../lib/util.js';

export const router = express.Router();

export const PROBLEM_MAX = 10; // әр олимпиадалық есеп — 10 ұпай (олимпиададағыдай)
const FILE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
const LEVEL = { easy: 'Қарапайым', hard: 'Күрделі' };
const extOf = (name) => path.extname(String(name || '')).slice(1).toLowerCase();

const canTeach = (u) => isActiveTeacher(u) || isAdmin(u);

async function ownGroup(req, id = req.params.id) {
  const g = await one('SELECT * FROM olympiad_groups WHERE id = $1', [toInt(id)]);
  if (!g || (g.teacher_id !== req.user.id && !isAdmin(req.user))) throw new HttpError(404, 'Топ табылмады.');
  return g;
}
async function taskWithGroup(id) {
  return one(`SELECT t.*, g.title AS group_title, g.teacher_id FROM olympiad_tasks t JOIN olympiad_groups g ON g.id = t.group_id WHERE t.id = $1`, [toInt(id)]);
}
const isMember = async (groupId, userId) => !!(await one('SELECT 1 FROM olympiad_group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]));
const members = (groupId) => many(
  `SELECT u.id, u.full_name, c.grade, c.letter, m.joined_at FROM olympiad_group_members m JOIN users u ON u.id = m.user_id
     LEFT JOIN classes c ON c.id = u.class_id WHERE m.group_id = $1 ORDER BY u.full_name`, [groupId]);
const klass = (r) => (r.grade ? `${r.grade}${r.letter || ''}` : '—');

// Оқушының тест нәтижесі: тапсырма берілгеннен кейінгі ең жақсы талпынысы.
const bestAttempts = (userIds, tests, since) => (userIds.length && tests.length ? many(
  `SELECT DISTINCT ON (user_id, test_key) user_id, test_key, score, max_score FROM olympiad_attempts
    WHERE user_id = ANY($1) AND test_key = ANY($2) AND created_at >= $3 ORDER BY user_id, test_key, score DESC, created_at`,
  [userIds, tests, since]) : Promise.resolve([]));

function problemTitle(k) {
  const o = OLYMPIAD_BY_KEY[k];
  return o ? `${o.g}-сынып · ${o.t}` : k;
}
const testTitle = (k) => { const t = OLYMPIAD_TEST[k]; return t ? `${t.g}-сынып · ${t.stage} ${t.year}` : k; };

const crumbs = (...items) => html`<div class="crumbs">${items.map(([href, label], i) => html`${i ? html`<span>/</span>` : ''}${href ? html`<a href="${href}">${label}</a>` : html`<span>${label}</span>`}`)}</div>`;

// ======================= Мұғалім: топтар =======================
router.get('/olympiad/groups', requireActiveTeacher, asyncH(async (req, res) => {
  const groups = await many(
    `SELECT g.*, (SELECT count(*) FROM olympiad_group_members m WHERE m.group_id = g.id)::int AS n,
            (SELECT count(*) FROM olympiad_tasks t WHERE t.group_id = g.id)::int AS tasks,
            (SELECT count(*) FROM olympiad_solutions s JOIN olympiad_tasks t ON t.id = s.task_id WHERE t.group_id = g.id AND s.score IS NULL)::int AS pending
       FROM olympiad_groups g WHERE g.teacher_id = $1 ORDER BY g.created_at DESC`, [req.user.id]);
  await page(req, res, {
    title: 'Олимпиадаға дайындық топтары', active: 'olympiad',
    body: html`<div class="view">
      ${crumbs(['/olympiad', 'Олимпиада'], ['', 'Дайындық топтары'])}
      <div class="vhead"><div><h1>Олимпиадаға дайындық топтары</h1>
        <p>Топ ашып, оқушыларды өз сыныптарыңыздан қосыңыз немесе топ кодын беріңіз (басқа сыныптағы оқушылар да кодпен қосыла алады). Топқа олимпиадалық есептер мен ресми онлайн тесттерді тапсырма етіп беріңіз: оқушылар шешімін суретке түсіріп жүктейді, сіз ұпай мен пікір қоясыз.</p></div></div>
      ${groups.length ? html`<div class="og-grid">${groups.map((g) => html`
        <a class="panel og-card" href="/olympiad/groups/${g.id}">
          <h3>${g.title}</h3>
          <p class="muted small">Код: <span class="mono">${g.join_code}</span></p>
          <div class="og-stats"><span>${icon('user', 14)} ${g.n} оқушы</span><span>${icon('target', 14)} ${g.tasks} тапсырма</span>
            ${g.pending ? html`<span class="pill pending">тексеруді күтеді: ${g.pending}</span>` : ''}</div>
        </a>`)}</div>` : emptyBox('Әзірге топ жоқ', 'Төменде алғашқы топты ашыңыз.')}
      <form class="panel form og-new" method="post" action="/olympiad/groups">
        ${csrfField(req)}
        <h2>Жаңа топ ашу</h2>
        <label class="fl">Топтың атауы<input type="text" name="title" maxlength="80" required placeholder="Мысалы: 9-сынып, облыстық кезеңге дайындық"></label>
        <div class="formfoot"><button class="btn" type="submit">${icon('plus', 15)} Топ ашу</button></div>
      </form>
    </div>`,
  });
}));

router.post('/olympiad/groups', requireActiveTeacher, asyncH(async (req, res) => {
  const title = cleanText(req.body.title, 80);
  if (title.length < 3) { setFlash(res, 'error', 'Топтың атауын жазыңыз.'); return res.redirect('/olympiad/groups'); }
  for (let i = 0; i < 5; i++) {
    try {
      const g = await one('INSERT INTO olympiad_groups(teacher_id, title, join_code) VALUES ($1,$2,$3) RETURNING id', [req.user.id, title, newJoinCode()]);
      setFlash(res, 'ok', 'Топ ашылды. Оқушыларды қосыңыз немесе топ кодын беріңіз.');
      return res.redirect(`/olympiad/groups/${g.id}`);
    } catch (err) { if (err.code !== '23505') throw err; }
  }
  throw new HttpError(500, 'Код жасау мүмкін болмады, қайталаңыз.');
}));

router.get('/olympiad/groups/:id', requireActiveTeacher, asyncH(async (req, res) => {
  const g = await ownGroup(req);
  const list = await members(g.id);
  const tasks = await many(
    `SELECT t.*, (SELECT count(*) FROM olympiad_solutions s WHERE s.task_id = t.id)::int AS sent,
            (SELECT count(*) FROM olympiad_solutions s WHERE s.task_id = t.id AND s.score IS NULL)::int AS pending
       FROM olympiad_tasks t WHERE t.group_id = $1 ORDER BY t.created_at DESC`, [g.id]);
  const candidates = await many(
    `SELECT u.id, u.full_name, c.grade, c.letter FROM users u JOIN classes c ON c.id = u.class_id
      WHERE c.teacher_id = $1 AND u.role = 'student'
        AND NOT EXISTS (SELECT 1 FROM olympiad_group_members m WHERE m.group_id = $2 AND m.user_id = u.id)
      ORDER BY c.grade, c.letter, u.full_name`, [g.teacher_id, g.id]);
  const byClass = [];
  for (const s of candidates) {
    const k = klass(s);
    let b = byClass.find((x) => x.k === k);
    if (!b) byClass.push(b = { k, items: [] });
    b.items.push(s);
  }
  await page(req, res, {
    title: g.title, active: 'olympiad',
    body: html`<div class="view">
      ${crumbs(['/olympiad', 'Олимпиада'], ['/olympiad/groups', 'Дайындық топтары'], ['', g.title])}
      <div class="vhead"><div><p class="eyebrow">Олимпиадаға дайындық тобы</p><h1>${g.title}</h1>
        <p>Топ коды: <span class="code-big">${g.join_code}</span> <button class="btn ghost sm" type="button" data-copy="${g.join_code}">Көшіру</button><br>
        <span class="muted small">Оқушы «Олимпиада» бетіндегі «Топқа қосылу» өрісіне осы кодты енгізеді.</span></p></div>
        <div class="vhead-act"><a class="btn" href="/olympiad/groups/${g.id}/tasks/new">${icon('plus', 15)} Тапсырма беру</a></div></div>

      <section class="block">
        <div class="block-h"><h2>Тапсырмалар</h2><span class="cnt">${tasks.length}</span></div>
        ${tasks.length ? html`<div class="tblwrap"><table>
          <thead><tr><th>Тапсырма</th><th>Құрамы</th><th>Мерзімі</th><th class="num">Жүктелген шешім</th><th></th></tr></thead>
          <tbody>${tasks.map((t) => html`<tr>
            <td><b>${t.title}</b><br><span class="muted small">${fmtDate(t.created_at)}</span></td>
            <td>${t.problems.length} есеп${t.tests.length ? html` · ${t.tests.length} тест` : ''}</td>
            <td>${t.due_at ? fmtDate(t.due_at) : '—'}</td>
            <td class="num">${t.sent}${t.pending ? html` <span class="pill pending">тексеру: ${t.pending}</span>` : ''}</td>
            <td><a class="linkbtn" href="/olympiad/tasks/${t.id}/results">Нәтижелер</a></td></tr>`)}</tbody></table></div>`
          : emptyBox('Әзірге тапсырма берілмеген', '«Тапсырма беру» батырмасымен есептер мен тесттерді таңдаңыз.')}
      </section>

      <section class="block">
        <div class="block-h"><h2>Топ мүшелері</h2><span class="cnt">${list.length}</span></div>
        ${list.length ? html`<div class="tblwrap"><table>
          <thead><tr><th>№</th><th>Оқушы</th><th>Сынып</th><th>Қосылған күні</th><th></th></tr></thead>
          <tbody>${list.map((m, i) => html`<tr><td class="num">${i + 1}</td><td>${m.full_name}</td><td>${klass(m)}</td><td>${fmtDate(m.joined_at)}</td>
            <td><form method="post" action="/olympiad/groups/${g.id}/members/${m.id}/remove" data-confirm="${m.full_name} топтан шығарылсын ба?">${csrfField(req)}<button class="linkbtn" type="submit">Шығару</button></form></td></tr>`)}</tbody></table></div>`
          : emptyBox('Топта әзірге оқушы жоқ', 'Төменде өз сыныптарыңыздан қосыңыз немесе топ кодын беріңіз.')}
      </section>

      ${byClass.length ? html`<form class="panel form" method="post" action="/olympiad/groups/${g.id}/members">
        ${csrfField(req)}
        <h2>Өз сыныптарымнан қосу</h2>
        ${byClass.map((b) => html`<fieldset class="checks"><legend>${b.k} сынып</legend>
          ${b.items.map((s) => html`<label><input type="checkbox" name="students" value="${s.id}"> ${s.full_name}</label>`)}</fieldset>`)}
        <div class="formfoot"><button class="btn" type="submit">Топқа қосу</button></div>
      </form>` : ''}

      <form class="no-print og-del" method="post" action="/olympiad/groups/${g.id}/delete" data-confirm="Топ, оның тапсырмалары мен оқушылардың жүктеген шешімдері өшірілсін бе?">
        ${csrfField(req)}<button class="btn ghost sm" type="submit">${icon('x', 14)} Топты өшіру</button></form>
    </div>`,
  });
}));

router.post('/olympiad/groups/:id/members', requireActiveTeacher, asyncH(async (req, res) => {
  const g = await ownGroup(req);
  const ids = asArray(req.body.students).map(toInt).filter((x) => x > 0);
  // Тек осы мұғалімнің сыныптарындағы оқушылар
  const ok = ids.length ? await many(
    `SELECT u.id FROM users u JOIN classes c ON c.id = u.class_id WHERE u.id = ANY($1) AND u.role = 'student' AND c.teacher_id = $2`, [ids, g.teacher_id]) : [];
  for (const r of ok) await q('INSERT INTO olympiad_group_members(group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [g.id, r.id]);
  if (ok.length) await notify(ok.map((r) => r.id), { kind: 'info', title: `Сізді «${g.title}» олимпиадаға дайындық тобына қосты`, link: '/olympiad/my' });
  setFlash(res, ok.length ? 'ok' : 'error', ok.length ? `${ok.length} оқушы топқа қосылды.` : 'Оқушыларды таңдаңыз.');
  res.redirect(`/olympiad/groups/${g.id}`);
}));

router.post('/olympiad/groups/:id/members/:uid/remove', requireActiveTeacher, asyncH(async (req, res) => {
  const g = await ownGroup(req);
  await q('DELETE FROM olympiad_group_members WHERE group_id = $1 AND user_id = $2', [g.id, toInt(req.params.uid)]);
  setFlash(res, 'ok', 'Оқушы топтан шығарылды.');
  res.redirect(`/olympiad/groups/${g.id}`);
}));

router.post('/olympiad/groups/:id/delete', requireActiveTeacher, asyncH(async (req, res) => {
  const g = await ownGroup(req);
  const files = await many(`SELECT s.file_key FROM olympiad_solutions s JOIN olympiad_tasks t ON t.id = s.task_id WHERE t.group_id = $1 AND s.file_key IS NOT NULL`, [g.id]);
  await q('DELETE FROM olympiad_groups WHERE id = $1', [g.id]);
  for (const f of files) await deleteStored(f.file_key);
  setFlash(res, 'ok', 'Топ өшірілді.');
  res.redirect('/olympiad/groups');
}));

// ======================= Мұғалім: тапсырма беру =======================
router.get('/olympiad/groups/:id/tasks/new', requireActiveTeacher, asyncH(async (req, res) => {
  const g = await ownGroup(req);
  await page(req, res, {
    title: 'Тапсырма беру', active: 'olympiad',
    body: html`<div class="view">
      ${crumbs(['/olympiad/groups', 'Дайындық топтары'], [`/olympiad/groups/${g.id}`, g.title], ['', 'Тапсырма беру'])}
      <div class="vhead"><div><h1>Тапсырма беру</h1><p>Есептер мен тесттерді таңдаңыз. Топ мүшелеріне хабарлама барады. Әр есеп — ${PROBLEM_MAX} ұпай: оқушы шешімін суретке түсіріп жүктейді, сіз бағалайсыз. Тесттер автоматты түрде тексеріледі.</p></div></div>
      <form class="panel form" method="post" action="/olympiad/groups/${g.id}/tasks">
        ${csrfField(req)}
        <div class="ai-row">
          <label class="fl">Тапсырманың атауы<input type="text" name="title" maxlength="120" required placeholder="Мысалы: 1-апта. Кинематика"></label>
          <label class="fl">Мерзімі (міндетті емес)<input type="date" name="due"></label>
        </div>
        <h2>Олимпиадалық есептер</h2>
        ${GRADES.map((gr) => { const items = OLYMPIAD.filter((o) => o.g === gr); return items.length ? html`
          <fieldset class="checks og-probs"><legend>${gr}-сынып</legend>
            ${items.map((o) => html`<label><input type="checkbox" name="problems" value="${o.k}"> <span class="pill ${o.lvl === 'hard' ? 'pending' : 'ok'}">${LEVEL[o.lvl]}</span> ${o.t} <span class="muted small">· ${SECTION[o.s].name}</span></label>`)}
          </fieldset>` : ''; })}
        <h2>Ресми онлайн тесттер</h2>
        <fieldset class="checks"><legend>Автоматты тексеріледі</legend>
          ${OLYMPIAD_TESTS.map((t) => html`<label><input type="checkbox" name="tests" value="${t.k}"> ${t.g}-сынып · ${t.stage} ${t.year} <span class="muted small">· ${t.questions.length} тапсырма, ${testMax(t)} ұпай</span></label>`)}
        </fieldset>
        <div class="formfoot"><a class="linkbtn" href="/olympiad/groups/${g.id}">Бас тарту</a><button class="btn" type="submit">Тапсырманы беру</button></div>
      </form>
    </div>`,
  });
}));

router.post('/olympiad/groups/:id/tasks', requireActiveTeacher, asyncH(async (req, res) => {
  const g = await ownGroup(req);
  const title = cleanText(req.body.title, 120);
  const problems = [...new Set(asArray(req.body.problems))].filter((k) => OLYMPIAD_BY_KEY[k]);
  const tests = [...new Set(asArray(req.body.tests))].filter((k) => OLYMPIAD_TEST[k]);
  const due = /^\d{4}-\d{2}-\d{2}$/.test(req.body.due || '') ? `${req.body.due}T23:59:00+05:00` : null;
  if (title.length < 2 || (!problems.length && !tests.length)) {
    setFlash(res, 'error', 'Атауын жазып, кемінде бір есеп немесе тест таңдаңыз.');
    return res.redirect(`/olympiad/groups/${g.id}/tasks/new`);
  }
  const t = await one('INSERT INTO olympiad_tasks(group_id, title, problems, tests, due_at) VALUES ($1,$2,$3,$4,$5) RETURNING id', [g.id, title, problems, tests, due]);
  const list = await members(g.id);
  await notify(list.map((m) => m.id), {
    kind: 'assign', title: `Олимпиадалық тапсырма: ${title}`,
    body: `${problems.length} есеп${tests.length ? `, ${tests.length} тест` : ''}${due ? ` · мерзімі: ${fmtDate(due)}` : ''}`, link: `/olympiad/tasks/${t.id}`,
  });
  setFlash(res, 'ok', `Тапсырма берілді, ${list.length} оқушыға хабарлама жіберілді.`);
  res.redirect(`/olympiad/tasks/${t.id}/results`);
}));

// ======================= Мұғалім: нәтижелер =======================
router.get('/olympiad/tasks/:tid/results', requireActiveTeacher, asyncH(async (req, res) => {
  const t = await taskWithGroup(req.params.tid);
  if (!t || (t.teacher_id !== req.user.id && !isAdmin(req.user))) throw new HttpError(404, 'Тапсырма табылмады.');
  const list = await members(t.group_id);
  const sols = await many('SELECT id, user_id, problem_key, score FROM olympiad_solutions WHERE task_id = $1', [t.id]);
  const best = await bestAttempts(list.map((m) => m.id), t.tests, t.created_at);
  const solOf = (uid, k) => sols.find((s) => s.user_id === uid && s.problem_key === k);
  const testOf = (uid, k) => best.find((b) => b.user_id === uid && b.test_key === k);
  const total = (uid) => t.problems.reduce((s, k) => s + (solOf(uid, k)?.score || 0), 0) + t.tests.reduce((s, k) => s + (testOf(uid, k)?.score || 0), 0);
  const maxTotal = t.problems.length * PROBLEM_MAX + t.tests.reduce((s, k) => s + (OLYMPIAD_TEST[k] ? testMax(OLYMPIAD_TEST[k]) : 0), 0);
  await page(req, res, {
    title: t.title, active: 'olympiad',
    body: html`<div class="view">
      ${crumbs(['/olympiad/groups', 'Дайындық топтары'], [`/olympiad/groups/${t.group_id}`, t.group_title], ['', t.title])}
      <div class="vhead"><div><p class="eyebrow">Олимпиадалық тапсырма</p><h1>${t.title}</h1>
        <p>Берілді: ${fmtDate(t.created_at)}${t.due_at ? ` · мерзімі: ${fmtDate(t.due_at)}` : ''}. Ұяшықты басып, оқушының шешімін қарап, бағалаңыз.</p></div>
        <div class="vhead-act"><form method="post" action="/olympiad/tasks/${t.id}/delete" data-confirm="Тапсырма мен оқушылардың жүктеген шешімдері өшірілсін бе?">${csrfField(req)}<button class="btn ghost" type="submit">${icon('x', 15)} Өшіру</button></form></div></div>
      <div class="og-legend muted small">${t.problems.map((k, i) => html`<span><b>Е${i + 1}</b> — ${problemTitle(k)}</span>`)}${t.tests.map((k, i) => html`<span><b>Т${i + 1}</b> — ${testTitle(k)}</span>`)}</div>
      ${list.length ? html`<div class="tblwrap"><table class="og-matrix">
        <thead><tr><th>Оқушы</th>${t.problems.map((k, i) => html`<th class="num" title="${problemTitle(k)}">Е${i + 1}</th>`)}${t.tests.map((k, i) => html`<th class="num" title="${testTitle(k)}">Т${i + 1}</th>`)}<th class="num">Барлығы</th></tr></thead>
        <tbody>${list.map((m) => html`<tr><td>${m.full_name} <span class="muted small">${klass(m)}</span></td>
          ${t.problems.map((k) => { const s = solOf(m.id, k); return html`<td class="num">${s ? html`<a href="/olympiad/solutions/${s.id}">${s.score === null ? html`<span class="pill pending">тексеру</span>` : `${s.score}/${PROBLEM_MAX}`}</a>` : html`<span class="muted">—</span>`}</td>`; })}
          ${t.tests.map((k) => { const b = testOf(m.id, k); return html`<td class="num">${b ? `${b.score}/${b.max_score}` : html`<span class="muted">—</span>`}</td>`; })}
          <td class="num"><b>${total(m.id)}</b> / ${maxTotal}</td></tr>`)}</tbody></table></div>`
        : emptyBox('Топта оқушы жоқ', 'Алдымен топқа оқушыларды қосыңыз.')}
    </div>`,
  });
}));

router.post('/olympiad/tasks/:tid/delete', requireActiveTeacher, asyncH(async (req, res) => {
  const t = await taskWithGroup(req.params.tid);
  if (!t || (t.teacher_id !== req.user.id && !isAdmin(req.user))) throw new HttpError(404, 'Тапсырма табылмады.');
  const files = await many('SELECT file_key FROM olympiad_solutions WHERE task_id = $1 AND file_key IS NOT NULL', [t.id]);
  await q('DELETE FROM olympiad_tasks WHERE id = $1', [t.id]);
  for (const f of files) await deleteStored(f.file_key);
  setFlash(res, 'ok', 'Тапсырма өшірілді.');
  res.redirect(`/olympiad/groups/${t.group_id}`);
}));

// ======================= Оқушы: топқа қосылу, тапсырмалар =======================
router.post('/olympiad/join', requireUser, asyncH(async (req, res) => {
  if (req.user.role !== 'student') { setFlash(res, 'error', 'Топқа тек оқушы аккаунтымен қосылуға болады.'); return res.redirect('/olympiad'); }
  const code = cleanText(req.body.code, 12).toUpperCase().replace(/\s+/g, '');
  const g = code ? await one('SELECT id, title, teacher_id FROM olympiad_groups WHERE join_code = $1', [code]) : null;
  if (!g) { setFlash(res, 'error', 'Мұндай кодпен топ табылмады. Кодты мұғаліміңізден тексеріңіз.'); return res.redirect('/olympiad'); }
  const r = await q('INSERT INTO olympiad_group_members(group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [g.id, req.user.id]);
  if (r.rowCount) await notify([g.teacher_id], { kind: 'info', title: `${req.user.full_name} «${g.title}» тобына қосылды`, link: `/olympiad/groups/${g.id}` });
  setFlash(res, 'ok', `«${g.title}» тобына қосылдыңыз.`);
  res.redirect('/olympiad/my');
}));

router.get('/olympiad/my', requireUser, asyncH(async (req, res) => {
  if (canTeach(req.user)) return res.redirect('/olympiad/groups');
  const groups = await many(
    `SELECT g.id, g.title, t.full_name AS teacher FROM olympiad_group_members m JOIN olympiad_groups g ON g.id = m.group_id
       JOIN users t ON t.id = g.teacher_id WHERE m.user_id = $1 ORDER BY m.joined_at DESC`, [req.user.id]);
  const tasks = groups.length ? await many(
    `SELECT t.*, (SELECT count(*) FROM olympiad_solutions s WHERE s.task_id = t.id AND s.user_id = $2)::int AS sent,
            (SELECT count(*) FROM olympiad_solutions s WHERE s.task_id = t.id AND s.user_id = $2 AND s.score IS NOT NULL)::int AS graded
       FROM olympiad_tasks t WHERE t.group_id = ANY($1) ORDER BY t.created_at DESC`, [groups.map((g) => g.id), req.user.id]) : [];
  await page(req, res, {
    title: 'Менің олимпиада тапсырмаларым', active: 'olympiad',
    body: html`<div class="view">
      ${crumbs(['/olympiad', 'Олимпиада'], ['', 'Менің тапсырмаларым'])}
      <div class="vhead"><div><h1>Олимпиадаға дайындық</h1><p>Мұғалімің берген есептер мен тесттер. Есептің шешімін дәптерге жазып, суретке түсіріп жүкте — мұғалім ұпай мен пікір қояды.</p></div></div>
      ${groups.length ? groups.map((g) => { const ts = tasks.filter((t) => t.group_id === g.id); return html`
        <section class="block">
          <div class="block-h"><h2>${g.title}</h2><span class="cnt">${g.teacher}</span></div>
          ${ts.length ? html`<div class="og-grid">${ts.map((t) => html`
            <a class="panel og-card" href="/olympiad/tasks/${t.id}">
              <h3>${t.title}</h3>
              <p class="muted small">${t.problems.length} есеп${t.tests.length ? html` · ${t.tests.length} тест` : ''}${t.due_at ? html` · мерзімі: ${fmtDate(t.due_at)}` : ''}</p>
              <div class="og-stats">${t.problems.length ? html`<span>Жүктелді: ${t.sent} / ${t.problems.length}</span>${t.graded ? html`<span class="pill ok">бағаланды: ${t.graded}</span>` : ''}` : ''}</div>
            </a>`)}</div>` : emptyBox('Әзірге тапсырма жоқ', 'Мұғалім тапсырма бергенде хабарлама келеді.')}
        </section>`; }) : emptyBox('Сен әлі ешбір топта емессің', 'Мұғалімнен топ кодын алып, «Олимпиада» бетіндегі «Топқа қосылу» өрісіне енгіз.')}
      ${joinForm(req)}
    </div>`,
  });
}));

export function joinForm(req) {
  return html`<form class="panel form og-join no-print" method="post" action="/olympiad/join">
    ${csrfField(req)}
    <h2>${icon('user', 17)} Олимпиадаға дайындық тобына қосылу</h2>
    <div class="og-join-row"><label class="fl">Топ коды (мұғалімнен аласың)<input type="text" name="code" maxlength="12" required autocomplete="off" placeholder="Мысалы: K7M2QX"></label>
    <button class="btn" type="submit">Қосылу</button></div>
  </form>`;
}

async function studentTask(req) {
  const t = await taskWithGroup(req.params.tid);
  if (!t) throw new HttpError(404, 'Тапсырма табылмады.');
  if (canTeach(req.user) && (t.teacher_id === req.user.id || isAdmin(req.user))) return { t, teacherView: true };
  if (!(await isMember(t.group_id, req.user.id))) throw new HttpError(404, 'Тапсырма табылмады.');
  return { t, teacherView: false };
}

router.get('/olympiad/tasks/:tid', requireUser, asyncH(async (req, res) => {
  const { t, teacherView } = await studentTask(req);
  if (teacherView) return res.redirect(`/olympiad/tasks/${t.id}/results`);
  const sols = await many('SELECT * FROM olympiad_solutions WHERE task_id = $1 AND user_id = $2', [t.id, req.user.id]);
  const best = await bestAttempts([req.user.id], t.tests, t.created_at);
  await page(req, res, {
    title: t.title, active: 'olympiad', katex: true,
    body: html`<div class="view">
      ${crumbs(['/olympiad', 'Олимпиада'], ['/olympiad/my', 'Менің тапсырмаларым'], ['', t.title])}
      <div class="vhead"><div><p class="eyebrow">${t.group_title}</p><h1>${t.title}</h1>
        <p>${t.due_at ? `Мерзімі: ${fmtDate(t.due_at)}. ` : ''}Әр есеп — ${PROBLEM_MAX} ұпай. Шешімді дәптерге толық жаз (сызба, формулалар, есептеу), суретке түсіріп жүкте. Мұғалім бағалағанша шешімді қайта жүктей аласың.</p></div></div>
      ${t.problems.map((k, i) => { const o = OLYMPIAD_BY_KEY[k]; if (!o) return ''; const s = sols.find((x) => x.problem_key === k); return html`
        <article class="oprob ${FAMILIES[SECTION[o.s].fam].css}" id="${o.k}">
          <div class="op-h"><span class="op-no mono">${i + 1}</span><span class="pill ${o.lvl === 'hard' ? 'pending' : 'ok'}">${LEVEL[o.lvl]}</span><h3>${o.t}</h3><span class="mc-grade">${o.g}-сынып</span></div>
          <div class="op-cond">${texText(o.cond)}</div>
          <details class="op-d"><summary>${icon('target', 15)} Физикалық мағынасы (кеңес)</summary><div>${texText(o.idea)}</div></details>
          ${s && s.score !== null ? html`<div class="og-graded"><b>Бағаң: ${s.score} / ${PROBLEM_MAX}</b>${s.comment ? html`<div>${s.comment}</div>` : ''}
              <a class="linkbtn" href="/olympiad/solutions/${s.id}">Жүктеген шешімім және эталон шешім</a></div>`
            : html`${s ? html`<p class="og-sent">${icon('check', 14)} Шешімің жүктелді (${fmtDateTime(s.submitted_at)}) — мұғалімнің тексеруін күтуде. <a href="/olympiad/solutions/${s.id}">Қарау</a></p>` : ''}
            <form class="form og-upload" method="post" action="/olympiad/tasks/${t.id}/solve/${o.k}" enctype="multipart/form-data">
              ${csrfField(req)}
              <label class="fl">Шешімнің суреті немесе PDF (${FILE_EXT.join(', ')}; ең көбі ${config.maxUploadMb} МБ)<input type="file" name="photo" accept="image/*,.pdf"></label>
              <label class="fl">Жауабың (міндетті емес)<input type="text" name="answer" maxlength="300" value="${s ? s.answer : ''}" placeholder="Мысалы: v = 4,8 км/сағ"></label>
              <div class="formfoot"><button class="btn sm" type="submit">${icon('upload', 14)} ${s ? 'Қайта жүктеу' : 'Шешімді жүктеу'}</button></div>
            </form>`}
        </article>`; })}
      ${t.tests.length ? html`<section class="block"><div class="block-h"><h2>Ресми онлайн тесттер</h2></div>
        <div class="og-grid">${t.tests.map((k) => { const tt = OLYMPIAD_TEST[k]; if (!tt) return ''; const b = best.find((x) => x.test_key === k); return html`
          <div class="panel og-card"><h3>${tt.g}-сынып · ${tt.stage}</h3><p class="muted small">${tt.year} · ${tt.questions.length} тапсырма, ${testMax(tt)} ұпай</p>
            <div class="og-stats">${b ? html`<span class="pill ok">ең жақсы нәтиже: ${b.score} / ${b.max_score}</span>` : html`<span class="muted">әлі тапсырылмады</span>`}</div>
            <a class="btn sm" href="/olympiad/test/${k}">${icon('play', 14)} ${b ? 'Қайта тапсыру' : 'Тестті бастау'}</a></div>`; })}</div></section>` : ''}
    </div>`,
  });
}));

const upload = multer({
  storage: multerStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (req, file, cb) => {
    if (FILE_EXT.includes(extOf(file.originalname))) return cb(null, true);
    const err = new Error(`Тек сурет немесе PDF жүктеуге болады (${FILE_EXT.join(', ')}).`);
    err.code = 'BAD_EXT';
    cb(err);
  },
});

router.post('/olympiad/tasks/:tid/solve/:pk', requireUser, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err && (err.code === 'BAD_EXT' || err.code === 'LIMIT_FILE_SIZE')) {
      req.uploadError = err.code === 'BAD_EXT' ? err.message : `Файл тым үлкен (ең көбі ${config.maxUploadMb} МБ).`;
      return next();
    }
    next(err);
  });
}, csrfAfterUpload, asyncH(async (req, res) => {
  const back = `/olympiad/tasks/${toInt(req.params.tid)}#${encodeURIComponent(req.params.pk)}`;
  const fail = (text) => { discardUpload(req.file); setFlash(res, 'error', text); res.redirect(back); };
  const { t, teacherView } = await studentTask(req);
  if (teacherView || !t.problems.includes(req.params.pk)) return fail('Бұл есепке шешім жүктеуге болмайды.');
  if (req.uploadError) return fail(req.uploadError);
  const answer = cleanText(req.body.answer, 300);
  const prev = await one('SELECT * FROM olympiad_solutions WHERE task_id = $1 AND user_id = $2 AND problem_key = $3', [t.id, req.user.id, req.params.pk]);
  if (prev && prev.score !== null) return fail('Шешім бағаланып қойған, енді өзгертуге болмайды.');
  if (!req.file && !prev?.file_key) return fail('Шешімнің суретін немесе PDF файлын таңдаңыз.');
  const key = req.file ? await persistUpload(req.file) : prev.file_key;
  const ext = req.file ? extOf(req.file.originalname) : prev.file_ext;
  await q(`INSERT INTO olympiad_solutions(task_id, user_id, problem_key, answer, file_key, file_ext) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (task_id, user_id, problem_key) DO UPDATE SET answer = EXCLUDED.answer, file_key = EXCLUDED.file_key, file_ext = EXCLUDED.file_ext, submitted_at = now()`,
  [t.id, req.user.id, req.params.pk, answer, key, ext]);
  if (req.file && prev?.file_key && prev.file_key !== key) await deleteStored(prev.file_key);
  if (!prev) await notify([t.teacher_id], { kind: 'info', title: `${req.user.full_name} «${t.title}» тапсырмасына шешім жүктеді`, body: problemTitle(req.params.pk), link: `/olympiad/tasks/${t.id}/results` });
  setFlash(res, 'ok', 'Шешімің жүктелді. Мұғалім тексергенде хабарлама келеді.');
  res.redirect(back);
}));

// ======================= Шешімді қарау және бағалау =======================
async function solutionFor(req) {
  const s = await one(
    `SELECT s.*, t.title AS task_title, t.group_id, g.teacher_id, u.full_name FROM olympiad_solutions s JOIN olympiad_tasks t ON t.id = s.task_id
       JOIN olympiad_groups g ON g.id = t.group_id JOIN users u ON u.id = s.user_id WHERE s.id = $1`, [toInt(req.params.sid)]);
  if (!s) throw new HttpError(404, 'Шешім табылмады.');
  const teacher = s.teacher_id === req.user.id || isAdmin(req.user);
  if (!teacher && s.user_id !== req.user.id) throw new HttpError(404, 'Шешім табылмады.');
  return { s, teacher };
}

router.get('/olympiad/solutions/:sid/file', requireUser, asyncH(async (req, res) => {
  const { s } = await solutionFor(req);
  if (!s.file_key) throw new HttpError(404, 'Файл жоқ.');
  res.set({ 'Content-Type': MIME[s.file_ext] || 'application/octet-stream', 'Content-Disposition': 'inline', 'Cache-Control': 'private, max-age=3600' });
  if (!(await sendStored(res, s.file_key))) { res.removeHeader('Content-Type'); res.removeHeader('Content-Disposition'); throw new HttpError(404, 'Файл серверде табылмады.'); }
}));

router.get('/olympiad/solutions/:sid', requireUser, asyncH(async (req, res) => {
  const { s, teacher } = await solutionFor(req);
  const o = OLYMPIAD_BY_KEY[s.problem_key];
  const showRef = teacher || s.score !== null; // эталон шешімді оқушы бағаланғаннан кейін көреді
  const others = teacher ? await many(`SELECT id FROM olympiad_solutions WHERE task_id = $1 AND score IS NULL AND id <> $2 ORDER BY submitted_at LIMIT 1`, [s.task_id, s.id]) : [];
  await page(req, res, {
    title: o ? o.t : 'Шешім', active: 'olympiad', katex: true,
    body: html`<div class="view">
      ${teacher ? crumbs(['/olympiad/groups', 'Дайындық топтары'], [`/olympiad/tasks/${s.task_id}/results`, s.task_title], ['', s.full_name])
        : crumbs(['/olympiad/my', 'Менің тапсырмаларым'], [`/olympiad/tasks/${s.task_id}`, s.task_title], ['', 'Шешімім'])}
      <div class="vhead"><div><p class="eyebrow">${s.full_name} · ${fmtDateTime(s.submitted_at)}</p><h1>${o ? o.t : s.problem_key}</h1></div></div>
      <div class="og-review">
        <section class="panel">
          <h2>Оқушының шешімі</h2>
          ${s.answer ? html`<p><b>Жауабы:</b> ${s.answer}</p>` : ''}
          ${s.file_key ? (s.file_ext === 'pdf'
            ? html`<p><a class="btn ghost" href="/olympiad/solutions/${s.id}/file" target="_blank" rel="noopener">${icon('download', 15)} PDF-ті ашу</a></p>`
            : html`<a href="/olympiad/solutions/${s.id}/file" target="_blank" rel="noopener"><img class="og-photo" src="/olympiad/solutions/${s.id}/file" alt="Шешімнің суреті"></a>`) : html`<p class="muted">Файл жоқ.</p>`}
        </section>
        <section class="panel">
          ${o ? html`<h2>Есептің шарты</h2><div class="op-cond">${texText(o.cond)}</div>` : ''}
          ${o && showRef ? html`
            <details class="op-d" open><summary>${icon('formula', 15)} Эталон шешім</summary><ol class="op-steps">${o.steps.map((x) => html`<li>${texText(x)}</li>`)}</ol></details>
            <details class="op-d op-ans" open><summary>${icon('check', 15)} Жауабы</summary><div>${texText(o.ans)}</div></details>
            ${teacher ? html`<details class="op-d op-tip"><summary>${icon('book', 15)} Мұғалімге: әдістемелік нұсқау</summary><div>${texText(o.tip)}</div></details>` : ''}` : ''}
          ${teacher ? html`<form class="form og-grade" method="post" action="/olympiad/solutions/${s.id}/grade">
              ${csrfField(req)}
              <h2>Бағалау</h2>
              <label class="fl">Ұпай (0–${PROBLEM_MAX})<input type="number" name="score" min="0" max="${PROBLEM_MAX}" step="1" required value="${s.score ?? ''}"></label>
              <label class="fl">Пікір оқушыға (міндетті емес)<textarea name="comment" rows="3" maxlength="1500" placeholder="Мысалы: Энергияның сақталу заңы дұрыс жазылған, бірақ үйкеліс ескерілмеген.">${s.comment}</textarea></label>
              <div class="formfoot">${others.length ? html`<input type="hidden" name="next" value="${others[0].id}">` : ''}<button class="btn" type="submit">${others.length ? 'Сақтап, келесісіне өту' : 'Сақтау'}</button></div>
            </form>`
            : s.score !== null ? html`<div class="og-graded"><b>Бағаң: ${s.score} / ${PROBLEM_MAX}</b>${s.comment ? html`<div>${s.comment}</div>` : ''}</div>`
              : html`<p class="muted">Мұғалім әлі тексерген жоқ. Эталон шешім бағаланғаннан кейін ашылады.</p>`}
        </section>
      </div>
    </div>`,
  });
}));

router.post('/olympiad/solutions/:sid/grade', requireActiveTeacher, asyncH(async (req, res) => {
  const { s, teacher } = await solutionFor(req);
  if (!teacher) throw new HttpError(403, 'Бағалауға рұқсат жоқ.');
  const score = Math.max(0, Math.min(PROBLEM_MAX, toInt(req.body.score, -1)));
  if (String(req.body.score ?? '').trim() === '' || toInt(req.body.score, -1) < 0) { setFlash(res, 'error', `Ұпайды 0–${PROBLEM_MAX} аралығында жазыңыз.`); return res.redirect(`/olympiad/solutions/${s.id}`); }
  const comment = cleanMultiline(req.body.comment, 1500);
  const first = s.score === null;
  await q('UPDATE olympiad_solutions SET score = $2, comment = $3, graded_at = now() WHERE id = $1', [s.id, score, comment]);
  await notify([s.user_id], { kind: 'grade', title: `Олимпиадалық есеп ${first ? 'бағаланды' : 'бағасы өзгерді'}: ${score} / ${PROBLEM_MAX}`, body: problemTitle(s.problem_key), link: `/olympiad/solutions/${s.id}` });
  setFlash(res, 'ok', 'Баға сақталды, оқушыға хабарлама жіберілді.');
  const next = toInt(req.body.next);
  res.redirect(next ? `/olympiad/solutions/${next}` : `/olympiad/tasks/${s.task_id}/results`);
}));

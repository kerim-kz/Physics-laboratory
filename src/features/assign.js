// Мұғалімнің оқушыларға тест тағайындауы, нәтижелерді қарау және сайт ішіндегі хабарламалар.
import express from 'express';
import { domainsOf, EXAM, examLabel, hasDomains, TEST_EXAMS, validDomain } from '../data/catalog.js';
import { requireActiveTeacher, requireUser } from '../lib/auth.js';
import { many, one, q, tx } from '../lib/db.js';
import { pickUnitIds } from '../lib/examcore.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { csrfField, emptyBox, page, vhead } from '../lib/layout.js';
import { notify, recentNotifications } from '../lib/notify.js';
import { asyncH, cleanText, fmtDate, fmtDateTime, HttpError, setFlash, toCsv, toInt } from '../lib/util.js';

export const router = express.Router();

// Тағайындауға болатын тест түрлері: «PISA · Оқу сауаттылығы», …, «ҰБТ».
async function targets() {
  const rows = await many(`SELECT u.exam, u.domain, count(q.id)::int AS n FROM exam_units u JOIN exam_questions q ON q.unit_id = u.id GROUP BY u.exam, u.domain`);
  const n = (exam, domain) => (rows.find((r) => r.exam === exam && r.domain === domain) || { n: 0 }).n;
  const out = [];
  for (const e of TEST_EXAMS) {
    if (hasDomains(e.k)) for (const d of domainsOf(e.k)) out.push({ v: `${e.k}:${d.k}`, exam: e.k, domain: d.k, label: examLabel(e.k, d.k), n: n(e.k, d.k) });
    else out.push({ v: `${e.k}:`, exam: e.k, domain: '', label: `${e.name} · Физика`, n: n(e.k, '') });
  }
  return out;
}

async function ownAssignment(req) {
  const a = await one('SELECT * FROM exam_assignments WHERE id = $1', [toInt(req.params.id)]);
  if (!a || (a.teacher_id !== req.user.id && req.user.role !== 'admin')) throw new HttpError(404, 'Тапсырма табылмады.');
  return a;
}

const teacherClasses = (teacherId) => many(
  `SELECT c.id, c.grade, c.letter, (SELECT count(*) FROM users s WHERE s.class_id = c.id AND s.role = 'student') AS n
     FROM classes c WHERE c.teacher_id = $1 ORDER BY c.grade, c.letter`, [teacherId]);

router.get('/teacher/assignments', requireActiveTeacher, asyncH(async (req, res) => {
  const classes = await teacherClasses(req.user.id);
  const list = await many(
    `SELECT a.*, c.grade, c.letter,
            (SELECT count(*)::int FROM exam_assignment_students s WHERE s.assignment_id = a.id) AS students,
            (SELECT count(*)::int FROM exam_attempts t WHERE t.assignment_id = a.id) AS done,
            (SELECT coalesce(sum(t.pending), 0)::int FROM exam_attempts t WHERE t.assignment_id = a.id) AS pending
       FROM exam_assignments a LEFT JOIN classes c ON c.id = a.class_id
      WHERE a.teacher_id = $1 ORDER BY a.created_at DESC`, [req.user.id]);
  await page(req, res, {
    title: 'Тест тағайындау', active: 'cabinet',
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/cabinet">Кабинет</a><span>/</span><span>Тест тағайындау</span></div>
        ${vhead('Оқушыларға тест тағайындау', 'Сыныпты таңдап, оқушыларды PISA, ББЖМ немесе ҰБТ тестіне қосыңыз. Қосылған әр оқушыға сайтта хабарлама барады, ал нәтижесі осы бетте көрінеді.')}
        <section class="block">
          <div class="block-h"><h2>Жаңа тест</h2></div>
          ${classes.length ? html`<div class="chips">${classes.map((c) => html`<a class="chip plain" href="/teacher/assignments/new?class=${c.id}">${icon('exam', 15)} ${c.grade}${c.letter} сыныбына тест беру <span class="mono muted">${c.n} оқушы</span></a>`)}</div>`
            : emptyBox('Әзірге сынып жоқ', 'Алдымен кабинетте сынып ашып, оқушыларды тіркеңіз.')}
        </section>
        <section class="block">
          <div class="block-h"><h2>Тағайындалған тесттер</h2><span class="cnt">${list.length}</span></div>
          ${list.length ? html`<div class="list">${list.map((a) => html`
            <div class="row">
              <div class="grow"><b><a href="/teacher/assignments/${a.id}">${a.title}</a></b>
                <span>${examLabel(a.exam, a.domain)}${a.grade ? ` · ${a.grade}${a.letter} сынып` : ''} · ${fmtDate(a.created_at)}${a.due_at ? ` · мерзімі: ${fmtDate(a.due_at)}` : ''}</span></div>
              <span class="pill ${a.done >= a.students ? 'ok' : ''}">тапсырды: ${a.done} / ${a.students}</span>
              ${a.pending ? html`<span class="pill pending">тексеруді күтеді: ${a.pending}</span>` : ''}
              <a class="open" href="/teacher/assignments/${a.id}">Нәтижелер ${icon('arrow', 14)}</a>
            </div>`)}</div>` : emptyBox('Әзірге тест тағайындалмаған', 'Жоғарыдан сыныпты таңдап, алғашқы тестті беріңіз.')}
        </section>
      </div>`,
  });
}));

router.get('/teacher/assignments/new', requireActiveTeacher, asyncH(async (req, res) => {
  const c = await one('SELECT * FROM classes WHERE id = $1 AND teacher_id = $2', [toInt(req.query.class), req.user.id]);
  if (!c) throw new HttpError(404, 'Сынып табылмады.');
  const students = await many(`SELECT id, full_name FROM users WHERE class_id = $1 AND role = 'student' ORDER BY full_name`, [c.id]);
  const ts = await targets();
  await page(req, res, {
    title: 'Жаңа тест', active: 'cabinet',
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/cabinet">Кабинет</a><span>/</span><a href="/teacher/assignments">Тест тағайындау</a><span>/</span><span>${c.grade}${c.letter} сынып</span></div>
        ${vhead(`${c.grade}${c.letter} сыныбына тест беру`, 'Тест түрін таңдап, оны тапсыратын оқушыларды белгілеңіз. Барлық оқушыға бірдей тапсырмалар беріледі, сондықтан нәтижелерін салыстыруға болады.')}
        ${students.length ? html`
        <form class="panel form" method="post" action="/teacher/assignments">
          ${csrfField(req)}
          <input type="hidden" name="class_id" value="${c.id}">
          <div class="row2">
            <label class="fl">Тест түрі<select name="target" required>${ts.map((t) => html`<option value="${t.v}"${t.n ? '' : html` disabled`}>${t.label} (${t.n} тапсырма)</option>`)}</select></label>
            <label class="fl">Тапсырма саны<select name="n"><option value="10">шамамен 10</option><option value="20">шамамен 20</option><option value="0">осы бағыттағы барлық тапсырма</option></select></label>
          </div>
          <div class="row2">
            <label class="fl">Тесттің атауы (міндетті емес)<input type="text" name="title" maxlength="120" placeholder="Мысалы: PISA-ға дайындық, 1-апта"></label>
            <label class="fl">Тапсыру мерзімі (міндетті емес)<input type="date" name="due"></label>
          </div>
          <fieldset class="checks">
            <legend>Тестті тапсыратын оқушылар (${students.length})</legend>
            ${students.map((s) => html`<label><input type="checkbox" name="students" value="${s.id}" checked> ${s.full_name}</label>`)}
          </fieldset>
          <div class="formfoot"><span class="msg muted small">Қосылған әр оқушыға «Сізді тестке қосты» деген хабарлама барады.</span><button class="btn" type="submit">${icon('check', 15)} Тестті тағайындау</button></div>
        </form>` : emptyBox('Сыныпта оқушы жоқ', `Оқушылар ${c.join_code} кодымен тіркелгеннен кейін тест бере аласыз.`)}
      </div>`,
  });
}));

router.post('/teacher/assignments', requireActiveTeacher, asyncH(async (req, res) => {
  const c = await one('SELECT * FROM classes WHERE id = $1 AND teacher_id = $2', [toInt(req.body.class_id), req.user.id]);
  if (!c) throw new HttpError(404, 'Сынып табылмады.');
  const back = `/teacher/assignments/new?class=${c.id}`;
  const [exam, domain = ''] = String(req.body.target || '').split(':');
  if (!EXAM[exam] || EXAM[exam].survey || (hasDomains(exam) ? !validDomain(exam, domain) : domain !== '')) { setFlash(res, 'error', 'Тест түрін таңдаңыз.'); return res.redirect(back); }
  const picked = [].concat(req.body.students || []).map(toInt);
  const students = (await many(`SELECT id FROM users WHERE class_id = $1 AND role = 'student' AND id = ANY($2)`, [c.id, picked])).map((s) => s.id);
  if (!students.length) { setFlash(res, 'error', 'Кемінде бір оқушыны белгілеңіз.'); return res.redirect(back); }
  const n = [0, 10, 20].includes(toInt(req.body.n)) ? toInt(req.body.n) : 10;
  const unitIds = await pickUnitIds(exam, { domain, n });
  if (!unitIds.length) { setFlash(res, 'error', 'Бұл бағытта әзірге тапсырма жоқ.'); return res.redirect(back); }
  const title = cleanText(req.body.title, 120) || `${examLabel(exam, domain)} · ${c.grade}${c.letter} сынып`;
  const due = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.due || '')) ? `${req.body.due}T23:59:00+05:00` : null;
  const id = await tx(async (cl) => {
    const a = await cl.query(
      `INSERT INTO exam_assignments(teacher_id, class_id, exam, domain, title, unit_ids, due_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.user.id, c.id, exam, domain, title, unitIds, due]);
    const aid = a.rows[0].id;
    await cl.query('INSERT INTO exam_assignment_students(assignment_id, student_id) SELECT $1, x FROM unnest($2::int[]) AS x', [aid, students]);
    await notify(students, {
      kind: 'assign', title: 'Сізді тестке қосты',
      body: `Мұғаліміңіз ${req.user.full_name} сізді «${title}» тестіне қосты (${examLabel(exam, domain)})${due ? `. Тапсыру мерзімі: ${fmtDate(due)}` : ''}. Тестті бастау үшін «Ашу» батырмасын басыңыз.`,
      link: `/exams/assigned/${aid}`,
    }, cl);
    return aid;
  });
  setFlash(res, 'ok', `Тест тағайындалды: ${students.length} оқушыға хабарлама жіберілді.`);
  res.redirect(`/teacher/assignments/${id}`);
}));

async function assignmentRows(a) {
  return many(
    `SELECT u.id, u.full_name, t.id AS attempt_id, t.score, t.max_score, t.pending, t.correct_count, t.total, t.duration_s, t.created_at
       FROM exam_assignment_students s JOIN users u ON u.id = s.student_id
  LEFT JOIN exam_attempts t ON t.assignment_id = s.assignment_id AND t.user_id = u.id
      WHERE s.assignment_id = $1 ORDER BY u.full_name`, [a.id]);
}

router.get('/teacher/assignments/:id', requireActiveTeacher, asyncH(async (req, res) => {
  const a = await ownAssignment(req);
  const rows = await assignmentRows(a);
  const done = rows.filter((r) => r.attempt_id);
  const avg = done.length ? Math.round(done.reduce((s, r) => s + (r.max_score ? 100 * r.score / r.max_score : 0), 0) / done.length) : null;
  const rest = a.class_id ? await many(
    `SELECT id, full_name FROM users WHERE class_id = $1 AND role = 'student' AND id <> ALL($2) ORDER BY full_name`, [a.class_id, rows.map((r) => r.id)]) : [];
  const qn = await one('SELECT count(*) AS n FROM exam_questions WHERE unit_id = ANY($1)', [a.unit_ids]);
  await page(req, res, {
    title: a.title, active: 'cabinet',
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/cabinet">Кабинет</a><span>/</span><a href="/teacher/assignments">Тест тағайындау</a><span>/</span><span>${a.title}</span></div>
        <div class="vhead"><div><p class="eyebrow">${examLabel(a.exam, a.domain)} · ${qn.n} сұрақ</p><h1>${a.title}</h1>
          <p>Тағайындалды: ${fmtDate(a.created_at)}${a.due_at ? ` · мерзімі: ${fmtDate(a.due_at)}` : ''}. Тапсырды: ${done.length} / ${rows.length}${avg !== null ? ` · орташа нәтиже: ${avg}%` : ''}.</p></div>
          <div class="vhead-act">
            <a class="btn ghost" href="/teacher/assignments/${a.id}/export.csv">${icon('download', 15)} Excel (CSV)</a>
            <form method="post" action="/teacher/assignments/${a.id}/delete" data-confirm="Тест пен оның тағайындаулары өшірілсін бе? Оқушылардың тапсырған нәтижелері сақталады.">${csrfField(req)}<button class="btn warn" type="submit">Өшіру</button></form>
          </div></div>
        <div class="tblwrap"><table>
          <thead><tr><th>№</th><th>Оқушы</th><th>Күйі</th><th class="num">Балл</th><th class="num">%</th><th class="num">Дұрыс</th><th>Тапсырған уақыты</th><th></th></tr></thead>
          <tbody>${rows.map((r, i) => html`<tr>
            <td class="num">${i + 1}</td><td>${r.full_name}</td>
            <td>${r.attempt_id ? (r.pending ? html`<span class="pill pending">тексеруді күтеді: ${r.pending}</span>` : html`<span class="pill ok">тапсырды</span>`) : html`<span class="pill no">тапсырмады</span>`}</td>
            <td class="num">${r.attempt_id ? `${r.score} / ${r.max_score}` : '—'}</td>
            <td class="num">${r.attempt_id && r.max_score ? Math.round(100 * r.score / r.max_score) : '—'}</td>
            <td class="num">${r.attempt_id ? `${r.correct_count} / ${r.total}` : '—'}</td>
            <td>${r.attempt_id ? fmtDateTime(r.created_at) : '—'}</td>
            <td>${r.attempt_id ? html`<a class="linkbtn" href="/exams/attempts/${r.attempt_id}${r.pending ? '#grade' : ''}">${r.pending ? 'Тексеру' : 'Жауаптарын қарау'}</a>` : ''}</td></tr>`)}</tbody></table></div>
        ${rest.length ? html`
          <form class="panel form" method="post" action="/teacher/assignments/${a.id}/add">
            ${csrfField(req)}
            <h2>Тағы оқушы қосу</h2>
            <fieldset class="checks"><legend>Осы сыныптың тестке қосылмаған оқушылары</legend>
              ${rest.map((s) => html`<label><input type="checkbox" name="students" value="${s.id}"> ${s.full_name}</label>`)}</fieldset>
            <div class="formfoot"><button class="btn" type="submit">Қосу және хабарлама жіберу</button></div>
          </form>` : ''}
      </div>`,
  });
}));

router.post('/teacher/assignments/:id/add', requireActiveTeacher, asyncH(async (req, res) => {
  const a = await ownAssignment(req);
  const picked = [].concat(req.body.students || []).map(toInt);
  const students = a.class_id ? (await many(
    `SELECT u.id FROM users u WHERE u.class_id = $1 AND u.role = 'student' AND u.id = ANY($2)
        AND NOT EXISTS (SELECT 1 FROM exam_assignment_students s WHERE s.assignment_id = $3 AND s.student_id = u.id)`, [a.class_id, picked, a.id])).map((s) => s.id) : [];
  if (students.length) {
    await tx(async (cl) => {
      await cl.query('INSERT INTO exam_assignment_students(assignment_id, student_id) SELECT $1, x FROM unnest($2::int[]) AS x', [a.id, students]);
      await notify(students, {
        kind: 'assign', title: 'Сізді тестке қосты',
        body: `Мұғаліміңіз ${req.user.full_name} сізді «${a.title}» тестіне қосты (${examLabel(a.exam, a.domain)})${a.due_at ? `. Тапсыру мерзімі: ${fmtDate(a.due_at)}` : ''}. Тестті бастау үшін «Ашу» батырмасын басыңыз.`,
        link: `/exams/assigned/${a.id}`,
      }, cl);
    });
    setFlash(res, 'ok', `${students.length} оқушы қосылып, хабарлама жіберілді.`);
  } else setFlash(res, 'error', 'Қосылатын оқушы белгіленбеді.');
  res.redirect(`/teacher/assignments/${a.id}`);
}));

router.post('/teacher/assignments/:id/delete', requireActiveTeacher, asyncH(async (req, res) => {
  const a = await ownAssignment(req);
  await q('DELETE FROM exam_assignments WHERE id = $1', [a.id]);
  setFlash(res, 'ok', 'Тест өшірілді.');
  res.redirect('/teacher/assignments');
}));

router.get('/teacher/assignments/:id/export.csv', requireActiveTeacher, asyncH(async (req, res) => {
  const a = await ownAssignment(req);
  const rows = await assignmentRows(a);
  const out = [['№', 'Оқушы', 'Күйі', 'Балл', 'Ең көп балл', '%', 'Дұрыс жауап', 'Сұрақ саны', 'Тексерілмеген ашық жауап', 'Тапсырған уақыты']];
  rows.forEach((r, i) => out.push([i + 1, r.full_name, r.attempt_id ? 'тапсырды' : 'тапсырмады', r.attempt_id ? r.score : '', r.attempt_id ? r.max_score : '',
    r.attempt_id && r.max_score ? Math.round(100 * r.score / r.max_score) : '', r.attempt_id ? r.correct_count : '', r.attempt_id ? r.total : '', r.attempt_id ? r.pending : '',
    r.attempt_id ? fmtDateTime(r.created_at) : '']));
  res.type('text/csv; charset=utf-8').attachment(`test-${a.id}.csv`).send(toCsv(out));
}));

// ---------------- Хабарламалар ----------------
const KIND_ICON = { assign: 'exam', grade: 'check', result: 'trophy', info: 'bolt' };

router.get('/notifications', requireUser, asyncH(async (req, res) => {
  const list = await recentNotifications(req.user.id);
  await q('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [req.user.id]);
  req.unreadSeen = true;
  await page(req, res, {
    title: 'Хабарламалар', active: 'cabinet',
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/cabinet">Кабинет</a><span>/</span><span>Хабарламалар</span></div>
        ${vhead('Хабарламалар', 'Мұғалім сізді тестке қосқанда немесе жауабыңызды тексергенде хабарлама осында келеді.')}
        ${list.length ? html`<div class="list">${list.map((n) => html`
          <div class="row ntf${n.read_at ? '' : ' ntf-new'}">
            <span class="glyph">${icon(KIND_ICON[n.kind] || 'bolt')}</span>
            <div class="grow"><b>${n.title}${n.read_at ? '' : html` <span class="pill pending">жаңа</span>`}</b><span>${n.body}</span><span class="mono">${fmtDateTime(n.created_at)}</span></div>
            ${n.link ? html`<a class="btn sm" href="${n.link}">Ашу ${icon('arrow', 14)}</a>` : ''}
          </div>`)}</div>` : emptyBox('Әзірге хабарлама жоқ', 'Жаңа хабарлама келгенде, жоғарғы жақтағы қоңырау белгішесінде сан пайда болады.')}
      </div>`,
  });
}));

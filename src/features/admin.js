import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config } from '../config.js';
import { EXAM, EXAMS, GRADES, MATERIAL_TYPE, MATERIAL_TYPES, REGIONS, ROLE_NAME, SECTION, SECTIONS } from '../data/catalog.js';
import { dropUserSessions, hashPassword, requireAdmin, requireOwner } from '../lib/auth.js';
import { many, one, q, tx } from '../lib/db.js';
import { chk, html, sel } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { csrfField, emptyBox, page, pager, vhead } from '../lib/layout.js';
import { getSettings, saveSettings } from '../lib/settings.js';
import {
  asArray, asyncH, cleanMultiline, cleanText, fmtDate, fmtDateTime, fmtPrice, HttpError, LOGIN_RE, newTempPassword, setFlash, toCsv, toInt, validFullName,
} from '../lib/util.js';
import { statusPill } from './cabinet.js';

export const router = express.Router();
router.use(requireAdmin);

const TABS = [
  ['', 'Шолу'], ['teachers', 'Мұғалімдер'], ['users', 'Пайдаланушылар'], ['schools', 'Мектептер'], ['materials', 'Материалдар'],
  ['orders', 'Төлемдер'], ['questions', 'Тест банкі'], ['admins', 'Әкімшілер'], ['settings', 'Баптаулар'],
];

async function pendingCounts() {
  return one(`SELECT
    (SELECT count(*) FROM users WHERE role = 'teacher' AND status = 'pending') AS teachers,
    (SELECT count(*) FROM schools WHERE status = 'pending') AS schools,
    (SELECT count(*) FROM materials WHERE status = 'pending') AS materials,
    (SELECT count(*) FROM orders WHERE status = 'pending') AS orders`);
}

async function adminPage(req, res, tab, title, body) {
  const n = await pendingCounts();
  await page(req, res, {
    title: `Әкімші: ${title}`, active: 'admin',
    body: html`
      <div class="view">
        ${vhead('Әкімші панелі', 'Мұғалімдерді растау, мектептер, материалдар, төлемдер, тест банкі және платформа баптаулары.',
          html`<a class="btn" href="/materials/new">${icon('upload', 16)} Материал жариялау</a>`)}
        <nav class="tabs" aria-label="Әкімші бөлімдері">${TABS.map(([k, label]) => html`<a href="/admin/${k}" class="${tab === k ? 'on' : ''}">${label}${n[k] ? html`<span class="n">${n[k]}</span>` : ''}</a>`)}</nav>
        ${body}
      </div>`,
  });
}

const back = (req, fallback) => {
  const ref = req.get('referer') || '';
  try { const u = new URL(ref); if (u.pathname.startsWith('/admin')) return u.pathname + u.search; } catch { /* сілтеме жоқ */ }
  return fallback;
};

// ---------------- Шолу ----------------
router.get('/', asyncH(async (req, res) => {
  const n = await pendingCounts();
  const t = await one(`SELECT
    (SELECT count(*) FROM users WHERE role = 'student') AS students,
    (SELECT count(*) FROM users WHERE role = 'teacher' AND status = 'active') AS teachers,
    (SELECT count(*) FROM schools WHERE status = 'active') AS schools,
    (SELECT count(*) FROM classes) AS classes,
    (SELECT count(*) FROM materials WHERE status = 'published') AS materials,
    (SELECT coalesce(sum(amount), 0) FROM orders WHERE status = 'approved') AS revenue,
    (SELECT count(*) FROM exam_attempts) AS attempts,
    (SELECT count(*) FROM game_scores) AS games`);
  const cards = [
    ['teachers', n.teachers, 'мұғалім растауды күтуде', true], ['schools', n.schools, 'мектеп өтінімі', true],
    ['materials', n.materials, 'материал тексеруді күтуде', true], ['orders', n.orders, 'төлем өтінімі', true],
    ['users', t.students, 'оқушы', false], ['teachers', t.teachers, 'расталған мұғалім', false], ['schools', t.schools, 'мектеп', false],
    ['users', t.classes, 'сынып', false], ['materials', t.materials, 'жарияланған материал', false], ['orders', fmtPrice(t.revenue), 'расталған төлемдер', false],
    ['questions', t.attempts, 'тест тапсырылды', false], ['', t.games, 'ойын ойналды', false],
  ];
  await adminPage(req, res, '', 'Шолу', html`
    <div class="ovgrid">${cards.map(([k, v, label, warn]) => html`<a class="ov${warn && Number(v) > 0 ? ' warn' : ''}" href="/admin/${k}"><b>${v}</b><span>${label}</span></a>`)}</div>
    <p class="hint">Әкімшілер — платформа иесі және ол қосқан тағы ең көбі ${config.maxAdmins - 1} адам. Әкімші аккаунттары тіркелу арқылы ашылмайды, оларды тек платформа иесі «Әкімшілер» бөлімінде жасайды.</p>`);
}));

// ---------------- Мұғалімдер ----------------
router.get('/teachers', asyncH(async (req, res) => {
  const rows = await many(`SELECT u.id, u.full_name, u.login, u.status, u.created_at, u.last_login_at, s.id AS school_id, s.name AS school_name, s.region, s.status AS school_status,
      (SELECT count(*) FROM classes c WHERE c.teacher_id = u.id) AS classes,
      (SELECT count(*) FROM users st JOIN classes c ON c.id = st.class_id WHERE c.teacher_id = u.id) AS students
    FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.role = 'teacher'
    ORDER BY (u.status = 'pending') DESC, u.created_at DESC LIMIT 500`);
  const pending = rows.filter((r) => r.status === 'pending');
  const rest = rows.filter((r) => r.status !== 'pending');
  const row = (r) => html`<div class="row">
    <div class="grow"><b>${r.full_name}</b><span>${r.login} · ${r.school_name || 'мектеп жоқ'}${r.region ? ` (${r.region})` : ''}${r.school_status === 'pending' ? ' · жаңа мектеп өтінімі' : ''} · тіркелді ${fmtDate(r.created_at)}</span>
      ${r.status !== 'pending' ? html`<span>${r.classes} сынып · ${r.students} оқушы · соңғы кіру ${r.last_login_at ? fmtDateTime(r.last_login_at) : '—'}</span>` : ''}</div>
    ${statusPill(r.status)}
    <div class="acts">
      ${r.status === 'pending' ? html`<form method="post" action="/admin/users/${r.id}/approve">${csrfField(req)}<button class="btn okb sm" type="submit">Растау</button></form>` : ''}
      ${r.status === 'blocked' ? html`<form method="post" action="/admin/users/${r.id}/unblock">${csrfField(req)}<button class="btn ghost sm" type="submit">Бұғаттан шығару</button></form>`
        : html`<form method="post" action="/admin/users/${r.id}/block" data-confirm="${r.full_name} бұғатталсын ба?">${csrfField(req)}<button class="btn warn sm" type="submit">${r.status === 'pending' ? 'Қабылдамау' : 'Бұғаттау'}</button></form>`}
      <form method="post" action="/admin/users/${r.id}/reset" data-confirm="Жаңа уақытша құпиясөз жасалсын ба?">${csrfField(req)}<button class="btn ghost sm" type="submit">Құпиясөз</button></form>
    </div></div>`;
  await adminPage(req, res, 'teachers', 'Мұғалімдер', html`
    <section class="block"><div class="block-h"><h2>Растауды күтетін мұғалімдер</h2><span class="cnt">${pending.length}</span></div>
      ${pending.length ? html`<div class="list">${pending.map(row)}</div>` : emptyBox('Жаңа өтінім жоқ', 'Мұғалім тіркелгенде осында шығады.')}
      <p class="hint">Мұғалімді растағанда, ол ұсынған жаңа мектеп те бірге бекітіледі. Мектеп атауын «Мектептер» бөлімінде түзетуге болады.</p></section>
    <section class="block"><div class="block-h"><h2>Барлық мұғалімдер</h2><span class="cnt">${rest.length}</span></div>
      ${rest.length ? html`<div class="list">${rest.map(row)}</div>` : emptyBox('Әзірге мұғалім жоқ', '')}</section>`);
}));

// ---------------- Пайдаланушылар ----------------
async function findUsers(f, limit, offset) {
  const params = [];
  const where = [`u.role <> 'admin'`];
  if (f.role === 'student' || f.role === 'teacher') { params.push(f.role); where.push(`u.role = $${params.length}`); }
  if (f.school) { params.push(f.school); where.push(`u.school_id = $${params.length}`); }
  if (f.q) { params.push(`%${f.q}%`); where.push(`(u.full_name ILIKE $${params.length} OR u.login ILIKE $${params.length})`); }
  params.push(limit, offset);
  return many(`SELECT u.id, u.role, u.full_name, u.login, u.status, u.created_at, u.last_login_at, s.name AS school_name, c.grade, c.letter
      FROM users u LEFT JOIN schools s ON s.id = u.school_id LEFT JOIN classes c ON c.id = u.class_id
     WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
}
const userFilters = (query) => ({ role: ['student', 'teacher'].includes(query.role) ? query.role : '', school: toInt(query.school) || 0, q: cleanText(query.q, 60), page: Math.max(1, toInt(query.page, 1)) });

router.get('/users', asyncH(async (req, res) => {
  const f = userFilters(req.query);
  const rows = await findUsers(f, 51, (f.page - 1) * 50);
  const schools = await many(`SELECT id, name FROM schools ORDER BY name`);
  await adminPage(req, res, 'users', 'Пайдаланушылар', html`
    <form class="filters" method="get" action="/admin/users" data-autosubmit>
      <label class="fl">Рөлі<select name="role"><option value="">Барлығы</option><option value="student"${sel(f.role === 'student')}>Оқушылар</option><option value="teacher"${sel(f.role === 'teacher')}>Мұғалімдер</option></select></label>
      <label class="fl">Мектеп<select name="school"><option value="">Барлығы</option>${schools.map((s) => html`<option value="${s.id}"${sel(f.school === s.id)}>${s.name}</option>`)}</select></label>
      <label class="search">${icon('search', 16)}<input type="search" name="q" value="${f.q}" placeholder="Аты-жөні немесе логин" aria-label="Пайдаланушы іздеу"></label>
      <button class="btn ghost" type="submit">Іздеу</button>
      <a class="btn ghost" href="/admin/users.csv?${new URLSearchParams({ role: f.role, school: f.school || '', q: f.q })}">${icon('download', 15)} CSV</a>
    </form>
    ${rows.length ? html`<div class="tblwrap"><table><thead><tr><th>Аты-жөні</th><th>Логин</th><th>Рөлі</th><th>Мектеп</th><th>Сынып</th><th>Күйі</th><th>Тіркелді</th><th></th></tr></thead>
      <tbody>${rows.slice(0, 50).map((u) => html`<tr><td>${u.full_name}</td><td class="mono">${u.login}</td><td>${ROLE_NAME[u.role]}</td><td class="wrap">${u.school_name || '—'}</td>
        <td>${u.grade ? `${u.grade}${u.letter}` : '—'}</td><td>${statusPill(u.status)}</td><td>${fmtDate(u.created_at)}</td>
        <td><div style="display:flex;gap:6px">
          <form method="post" action="/admin/users/${u.id}/reset" data-confirm="Жаңа уақытша құпиясөз жасалсын ба?">${csrfField(req)}<button class="btn ghost sm" type="submit">Құпиясөз</button></form>
          ${u.status === 'blocked' ? html`<form method="post" action="/admin/users/${u.id}/unblock">${csrfField(req)}<button class="btn ghost sm" type="submit">Ашу</button></form>`
            : html`<form method="post" action="/admin/users/${u.id}/block" data-confirm="Бұғатталсын ба?">${csrfField(req)}<button class="btn warn sm" type="submit">Бұғаттау</button></form>`}
          <form method="post" action="/admin/users/${u.id}/delete" data-confirm="${u.full_name} толық өшірілсін бе? Бұл әрекетті қайтару мүмкін емес.">${csrfField(req)}<button class="btn warn sm" type="submit">Өшіру</button></form>
        </div></td></tr>`)}</tbody></table></div>${pager(req.originalUrl, f.page, rows.length > 50)}` : emptyBox('Пайдаланушы табылмады', '')}`);
}));

router.get('/users.csv', asyncH(async (req, res) => {
  const f = userFilters(req.query);
  const rows = await findUsers(f, 20000, 0);
  const out = [['Аты-жөні', 'Логин', 'Рөлі', 'Мектеп', 'Сынып', 'Күйі', 'Тіркелді', 'Соңғы кіру']];
  rows.forEach((u) => out.push([u.full_name, u.login, ROLE_NAME[u.role], u.school_name || '', u.grade ? `${u.grade}${u.letter}` : '', u.status, fmtDate(u.created_at), u.last_login_at ? fmtDateTime(u.last_login_at) : '']));
  res.type('text/csv; charset=utf-8').attachment('paidalanushylar.csv').send(toCsv(out));
}));

async function targetUser(req) {
  const u = await one('SELECT id, role, full_name, login, school_id, is_owner FROM users WHERE id = $1', [toInt(req.params.id)]);
  if (!u) throw new HttpError(404, 'Пайдаланушы табылмады.');
  if (u.id === req.user.id) throw new HttpError(400, 'Бұл әрекетті өз аккаунтыңызға жасай алмайсыз.');
  if (u.role === 'admin' && !req.user.is_owner) throw new HttpError(403, 'Әкімшілерді тек платформа иесі басқарады.');
  if (u.is_owner) throw new HttpError(403, 'Платформа иесінің аккаунтын өзгертуге болмайды.');
  return u;
}

router.post('/users/:id/approve', asyncH(async (req, res) => {
  const u = await targetUser(req);
  await tx(async (c) => {
    await c.query(`UPDATE users SET status = 'active' WHERE id = $1 AND role = 'teacher'`, [u.id]);
    if (u.school_id) await c.query(`UPDATE schools SET status = 'active' WHERE id = $1`, [u.school_id]);
  });
  setFlash(res, 'ok', `${u.full_name} мұғалім ретінде расталды.`);
  res.redirect(back(req, '/admin/teachers'));
}));
router.post('/users/:id/block', asyncH(async (req, res) => {
  const u = await targetUser(req);
  await q(`UPDATE users SET status = 'blocked' WHERE id = $1`, [u.id]);
  await dropUserSessions(u.id);
  setFlash(res, 'ok', `${u.full_name} бұғатталды.`);
  res.redirect(back(req, '/admin/users'));
}));
router.post('/users/:id/unblock', asyncH(async (req, res) => {
  const u = await targetUser(req);
  await q(`UPDATE users SET status = 'active' WHERE id = $1`, [u.id]);
  setFlash(res, 'ok', `${u.full_name} бұғаттан шығарылды.`);
  res.redirect(back(req, '/admin/users'));
}));
router.post('/users/:id/reset', asyncH(async (req, res) => {
  const u = await targetUser(req);
  const temp = newTempPassword();
  await q('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [await hashPassword(temp), u.id]);
  await dropUserSessions(u.id);
  setFlash(res, 'ok', `${u.full_name}: логин «${u.login}», уақытша құпиясөз «${temp}». Кіргенде жаңа құпиясөз ойлап табады.`);
  res.redirect(back(req, '/admin/users'));
}));
router.post('/users/:id/delete', asyncH(async (req, res) => {
  const u = await targetUser(req);
  if (u.role === 'admin') throw new HttpError(400, 'Әкімшіні «Әкімшілер» бөлімінен алып тастаңыз.');
  await q('DELETE FROM users WHERE id = $1', [u.id]);
  setFlash(res, 'ok', `${u.full_name} өшірілді.`);
  res.redirect(back(req, '/admin/users'));
}));

// ---------------- Мектептер ----------------
router.get('/schools', asyncH(async (req, res) => {
  const rows = await many(`SELECT s.*, (SELECT count(*) FROM users u WHERE u.school_id = s.id) AS users
      FROM schools s ORDER BY (s.status = 'pending') DESC, s.region, s.name`);
  const editId = toInt(req.query.edit);
  const regionSel = (v) => html`<select name="region" required><option value="">— өңір —</option>${REGIONS.map((r) => html`<option${sel(r === v)}>${r}</option>`)}</select>`;
  await adminPage(req, res, 'schools', 'Мектептер', html`
    <form class="panel form" method="post" action="/admin/schools">
      ${csrfField(req)}
      <h2>Мектеп қосу</h2>
      <div class="row3">
        <label class="fl">Атауы<input type="text" name="name" maxlength="200" required></label>
        <label class="fl">Өңір${regionSel('')}</label>
        <label class="fl">Елді мекен<input type="text" name="locality" maxlength="120"></label>
      </div>
      <div class="formfoot"><button class="btn" type="submit">Қосу</button></div>
    </form>
    ${rows.length ? html`<div class="list">${rows.map((s) => editId === s.id ? html`
      <form class="row" method="post" action="/admin/schools/${s.id}/update">${csrfField(req)}
        <input type="text" name="name" value="${s.name}" maxlength="200" required style="flex:2;min-width:200px">
        <span style="flex:1;min-width:160px">${regionSel(s.region)}</span>
        <input type="text" name="locality" value="${s.locality}" maxlength="120" style="flex:1;min-width:140px">
        <button class="btn sm" type="submit">Сақтау</button><a class="btn ghost sm" href="/admin/schools">Бас тарту</a>
      </form>` : html`
      <div class="row">
        <span class="glyph">${icon('school')}</span>
        <div class="grow"><b>${s.name}</b><span>${s.region}${s.locality ? ` · ${s.locality}` : ''} · ${s.users} пайдаланушы</span></div>
        ${s.status === 'pending' ? html`<span class="pill pending">өтінім</span>` : ''}
        <div class="acts">
          ${s.status === 'pending' ? html`<form method="post" action="/admin/schools/${s.id}/approve">${csrfField(req)}<button class="btn okb sm" type="submit">Бекіту</button></form>` : ''}
          <a class="btn ghost sm" href="/admin/schools?edit=${s.id}">Өзгерту</a>
          ${!s.users ? html`<form method="post" action="/admin/schools/${s.id}/delete" data-confirm="Мектеп өшірілсін бе?">${csrfField(req)}<button class="btn warn sm" type="submit">Өшіру</button></form>` : ''}
        </div>
      </div>`)}</div>` : emptyBox('Мектеп жоқ', 'Жоғарыдағы форма арқылы алғашқы мектепті қосыңыз.')}`);
}));

function schoolFields(b) {
  const name = cleanText(b.name, 200), region = REGIONS.includes(b.region) ? b.region : '';
  if (name.length < 3 || !region) throw new HttpError(400, 'Мектеп атауы мен өңірін толтырыңыз.');
  return [name, region, cleanText(b.locality, 120)];
}
router.post('/schools', asyncH(async (req, res) => {
  await q(`INSERT INTO schools(name, region, locality, status) VALUES ($1,$2,$3,'active')`, schoolFields(req.body));
  setFlash(res, 'ok', 'Мектеп қосылды.');
  res.redirect('/admin/schools');
}));
router.post('/schools/:id/update', asyncH(async (req, res) => {
  await q('UPDATE schools SET name = $1, region = $2, locality = $3 WHERE id = $4', [...schoolFields(req.body), toInt(req.params.id)]);
  setFlash(res, 'ok', 'Мектеп өзгертілді.');
  res.redirect('/admin/schools');
}));
router.post('/schools/:id/approve', asyncH(async (req, res) => {
  await q(`UPDATE schools SET status = 'active' WHERE id = $1`, [toInt(req.params.id)]);
  res.redirect('/admin/schools');
}));
router.post('/schools/:id/delete', asyncH(async (req, res) => {
  const id = toInt(req.params.id);
  const used = await one('SELECT count(*) AS n FROM users WHERE school_id = $1', [id]);
  if (used.n) throw new HttpError(400, 'Мектепке тіркелген пайдаланушылар бар — өшіруге болмайды.');
  await q('DELETE FROM schools WHERE id = $1', [id]);
  setFlash(res, 'ok', 'Мектеп өшірілді.');
  res.redirect('/admin/schools');
}));

// ---------------- Материалдар ----------------
router.get('/materials', asyncH(async (req, res) => {
  const status = ['pending', 'published', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const rows = await many(`SELECT m.*, a.full_name AS author_name, s.name AS school_name FROM materials m
      LEFT JOIN users a ON a.id = m.author_id LEFT JOIN schools s ON s.id = a.school_id
     WHERE m.status = $1 ORDER BY m.created_at DESC LIMIT 200`, [status]);
  const editId = toInt(req.query.edit);
  const editForm = (m) => html`
    <form class="panel form" method="post" action="/admin/materials/${m.id}/update">${csrfField(req)}
      <label class="fl">Атауы<input type="text" name="title" value="${m.title}" maxlength="160" required></label>
      <label class="fl">Сипаттама<textarea name="description" rows="3" maxlength="3000">${m.description}</textarea></label>
      <div class="row3">
        <label class="fl">Түрі<select name="type">${MATERIAL_TYPES.map((t) => html`<option value="${t.k}"${sel(t.k === m.type)}>${t.name}</option>`)}</select></label>
        <label class="fl">Сынып<select name="grade"><option value="0">7–11</option>${GRADES.map((g) => html`<option value="${g}"${sel(g === m.grade)}>${g}</option>`)}</select></label>
        <label class="fl">Бөлім<select name="section"><option value="">Жалпы</option>${SECTIONS.map((s) => html`<option value="${s.k}"${sel(s.k === m.section)}>${s.name}</option>`)}</select></label>
      </div>
      <fieldset class="checks"><legend>Емтихан</legend>${EXAMS.map((e) => html`<label><input type="checkbox" name="exams" value="${e.k}"${chk(m.exams.includes(e.k))}> ${e.name}</label>`)}</fieldset>
      <label class="fl">Бағасы, ₸<input type="number" name="price" min="0" max="1000000" step="50" value="${m.price}"></label>
      <div class="formfoot"><a class="linkbtn" href="/admin/materials?status=${status}">Бас тарту</a><button class="btn" type="submit">Сақтау</button></div>
    </form>`;
  await adminPage(req, res, 'materials', 'Материалдар', html`
    <div class="seg">${[['pending', 'Тексеруді күтуде'], ['published', 'Жарияланған'], ['rejected', 'Қабылданбаған']].map(([k, l]) => html`<a href="/admin/materials?status=${k}" class="${status === k ? 'on' : ''}">${l}</a>`)}</div>
    ${rows.length ? html`<div class="list">${rows.map((m) => editId === m.id ? editForm(m) : html`
      <div class="subcard panel">
        <div class="row" style="border:0;padding:0">
          <div class="grow"><b><a href="/materials/${m.id}">${m.title}</a></b>
            <span>${MATERIAL_TYPE[m.type] ? MATERIAL_TYPE[m.type].name : m.type} · ${m.grade ? `${m.grade}-сынып` : '7–11'} · ${SECTION[m.section] ? SECTION[m.section].name : 'Жалпы'}${m.exams.length ? ` · ${m.exams.map((e) => EXAM[e].name).join(', ')}` : ''}</span>
            <span>Авторы: ${m.author_name || '—'}${m.school_name ? `, ${m.school_name}` : ''} · ${fmtDate(m.created_at)} · ${m.file_name ? m.file_name : m.external_url ? 'сілтеме' : ''} · ${m.downloads} жүктеу</span></div>
          ${m.price ? html`<span class="price">${fmtPrice(m.price)}</span>` : html`<span class="free">тегін</span>`}
        </div>
        ${m.description ? html`<p class="muted small prose">${m.description.slice(0, 400)}</p>` : ''}
        <div class="acts" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <a class="btn ghost sm" href="/materials/${m.id}/download">${icon('download', 14)} Тексеру</a>
          ${m.status !== 'published' ? html`<form method="post" action="/admin/materials/${m.id}/publish" style="display:flex;gap:6px;align-items:center">${csrfField(req)}
            <input type="number" name="price" min="0" step="50" value="${m.price}" aria-label="Бағасы" style="width:110px"> ₸
            <button class="btn okb sm" type="submit">Жариялау</button></form>` : ''}
          ${m.status !== 'rejected' ? html`<form method="post" action="/admin/materials/${m.id}/reject" style="display:flex;gap:6px">${csrfField(req)}
            <input type="text" name="reason" maxlength="200" placeholder="Себебі (міндетті емес)" style="width:220px">
            <button class="btn warn sm" type="submit">${m.status === 'published' ? 'Жариялаудан алу' : 'Қабылдамау'}</button></form>` : ''}
          <a class="btn ghost sm" href="/admin/materials?status=${status}&edit=${m.id}">Өзгерту</a>
          <form method="post" action="/admin/materials/${m.id}/delete" data-confirm="Материал мен оның файлы толық өшірілсін бе?">${csrfField(req)}<button class="btn warn sm" type="submit">Өшіру</button></form>
        </div>
      </div>`)}</div>` : emptyBox('Бұл тізім бос', status === 'pending' ? 'Тексеруді күтетін материал жоқ.' : '')}`);
}));

router.post('/materials/:id/publish', asyncH(async (req, res) => {
  const price = Math.max(0, Math.min(1_000_000, toInt(req.body.price)));
  await q(`UPDATE materials SET status = 'published', price = $1, reject_reason = '' WHERE id = $2`, [price, toInt(req.params.id)]);
  setFlash(res, 'ok', 'Материал жарияланды.');
  res.redirect(back(req, '/admin/materials'));
}));
router.post('/materials/:id/reject', asyncH(async (req, res) => {
  await q(`UPDATE materials SET status = 'rejected', reject_reason = $1 WHERE id = $2`, [cleanText(req.body.reason, 200), toInt(req.params.id)]);
  setFlash(res, 'ok', 'Материал қабылданбады.');
  res.redirect(back(req, '/admin/materials'));
}));
router.post('/materials/:id/update', asyncH(async (req, res) => {
  const b = req.body;
  const title = cleanText(b.title, 160);
  if (title.length < 3 || !MATERIAL_TYPE[b.type]) throw new HttpError(400, 'Атауы мен түрін толтырыңыз.');
  const m = await one(
    `UPDATE materials SET title = $1, description = $2, type = $3, grade = $4, section = $5, exams = $6, price = $7 WHERE id = $8 RETURNING status`,
    [title, cleanMultiline(b.description, 3000), b.type, GRADES.includes(toInt(b.grade)) ? toInt(b.grade) : 0, SECTION[b.section] ? b.section : '',
      asArray(b.exams).filter((e) => EXAM[e]), Math.max(0, Math.min(1_000_000, toInt(b.price))), toInt(req.params.id)]);
  setFlash(res, 'ok', 'Материал сақталды.');
  res.redirect(`/admin/materials?status=${m ? m.status : 'pending'}`);
}));
router.post('/materials/:id/delete', asyncH(async (req, res) => {
  const m = await one('DELETE FROM materials WHERE id = $1 RETURNING file_key', [toInt(req.params.id)]);
  if (m && m.file_key) fs.unlink(path.join(config.uploadDir, path.basename(m.file_key)), () => {});
  setFlash(res, 'ok', 'Материал өшірілді.');
  res.redirect(back(req, '/admin/materials'));
}));

// ---------------- Төлемдер ----------------
router.get('/orders', asyncH(async (req, res) => {
  const rows = await many(`SELECT o.*, m.title, u.full_name, u.login, u.role, s.name AS school_name, d.full_name AS decided_name
      FROM orders o JOIN materials m ON m.id = o.material_id JOIN users u ON u.id = o.user_id
      LEFT JOIN schools s ON s.id = u.school_id LEFT JOIN users d ON d.id = o.decided_by
     ORDER BY (o.status = 'pending') DESC, o.created_at DESC LIMIT 300`);
  await adminPage(req, res, 'orders', 'Төлемдер', html`
    <p class="hint">Төлемді банк қосымшасынан тексеріп, «Растау» басыңыз — материал сатып алушыға бірден ашылады. Төлем деректемелері «Баптаулар» бөлімінде.</p>
    ${rows.length ? html`<div class="list">${rows.map((o) => html`
      <div class="row">
        <div class="grow"><b><a href="/materials/${o.material_id}">${o.title}</a> — ${fmtPrice(o.amount)}</b>
          <span>${o.full_name} (${ROLE_NAME[o.role]}, ${o.login})${o.school_name ? ` · ${o.school_name}` : ''} · ${fmtDateTime(o.created_at)}</span>
          <span>Белгі: ${o.note || '—'}${o.decided_name ? ` · шешім: ${o.decided_name}, ${fmtDateTime(o.decided_at)}` : ''}</span></div>
        ${statusPill(o.status)}
        ${o.status === 'pending' ? html`<div class="acts">
          <form method="post" action="/admin/orders/${o.id}/approve">${csrfField(req)}<button class="btn okb sm" type="submit">Растау</button></form>
          <form method="post" action="/admin/orders/${o.id}/reject" data-confirm="Өтінім қабылданбасын ба?">${csrfField(req)}<button class="btn warn sm" type="submit">Қабылдамау</button></form>
        </div>` : ''}
      </div>`)}</div>` : emptyBox('Өтінім жоқ', 'Сатып алу өтінімдері осында шығады.')}`);
}));
for (const [action, status] of [['approve', 'approved'], ['reject', 'rejected']]) {
  router.post(`/orders/:id/${action}`, asyncH(async (req, res) => {
    await q(`UPDATE orders SET status = $1, decided_by = $2, decided_at = now() WHERE id = $3 AND status = 'pending'`, [status, req.user.id, toInt(req.params.id)]);
    setFlash(res, 'ok', status === 'approved' ? 'Төлем расталды — материал ашылды.' : 'Өтінім қабылданбады.');
    res.redirect('/admin/orders');
  }));
}

// ---------------- Тест банкі ----------------
router.get('/questions', asyncH(async (req, res) => {
  const exam = EXAM[req.query.exam] ? req.query.exam : 'ubt';
  const units = await many(`SELECT u.*, (SELECT json_agg(json_build_object('stem', q.stem, 'kind', q.kind) ORDER BY q.ord) FROM exam_questions q WHERE q.unit_id = u.id) AS qs
      FROM exam_units u WHERE u.exam = $1 ORDER BY u.section, u.id`, [exam]);
  await adminPage(req, res, 'questions', 'Тест банкі', html`
    <div class="seg">${EXAMS.map((e) => html`<a href="/admin/questions?exam=${e.k}" class="${e.k === exam ? 'on' : ''}">${e.name}</a>`)}</div>
    <form class="panel form" method="post" action="/admin/questions">
      ${csrfField(req)}
      <h2>Тапсырма қосу</h2>
      <div class="row3">
        <label class="fl">Емтихан<select name="exam">${EXAMS.map((e) => html`<option value="${e.k}"${sel(e.k === exam)}>${e.name}</option>`)}</select></label>
        <label class="fl">Бөлім<select name="section">${SECTIONS.map((s) => html`<option value="${s.k}">${s.name}</option>`)}</select></label>
        <label class="fl">Сынып<select name="grade">${GRADES.map((g) => html`<option value="${g}">${g}</option>`)}</select></label>
      </div>
      <label class="fl">Контекст (міндетті емес: мәтін, кесте сипаттамасы)<textarea name="context" rows="2" maxlength="2000"></textarea></label>
      <label class="fl">Сұрақ<textarea name="stem" rows="2" maxlength="1000" required></textarea></label>
      <label class="fl">Жауап нұсқалары (әрқайсысы жаңа жолдан, 2–6 нұсқа)<textarea name="options" rows="5" maxlength="2000" required></textarea></label>
      <div class="row2">
        <label class="fl">Дұрыс жауаптың нөмірі (бірнеше болса — үтірмен: 2, 4)<input type="text" name="correct" maxlength="20" required placeholder="1"></label>
        <label class="fl">Түсіндірме<input type="text" name="explanation" maxlength="1000"></label>
      </div>
      <div class="formfoot"><button class="btn" type="submit">Қосу</button></div>
    </form>
    <div class="resline">${units.length} блок · ${units.reduce((a, u) => a + (u.qs ? u.qs.length : 0), 0)} тапсырма</div>
    <div class="list">${units.map((u) => html`
      <div class="row">
        <div class="grow"><b>${u.title || (u.qs && u.qs[0] ? u.qs[0].stem.slice(0, 120) : '—')}</b>
          <span>${SECTION[u.section] ? SECTION[u.section].name : ''} · ${u.grade || '—'}-сынып · ${u.qs ? u.qs.length : 0} сұрақ${u.qs && u.qs.some((x) => x.kind === 'multi') ? ' · бірнеше дұрыс жауапты' : ''}${u.seed_key ? ' · бастапқы банк' : ''}</span></div>
        <form method="post" action="/admin/questions/${u.id}/delete" data-confirm="Блок өшірілсін бе?">${csrfField(req)}<button class="btn warn sm" type="submit">Өшіру</button></form>
      </div>`)}</div>`);
}));

router.post('/questions', asyncH(async (req, res) => {
  const b = req.body;
  const exam = EXAM[b.exam] ? b.exam : null;
  const options = String(b.options || '').split('\n').map((s) => cleanText(s, 300)).filter(Boolean);
  const correct = [...new Set(String(b.correct || '').split(/[,\s;]+/).map((s) => toInt(s) - 1).filter((n) => n >= 0 && n < options.length))];
  const stem = cleanMultiline(b.stem, 1000);
  if (!exam || stem.length < 5 || options.length < 2 || options.length > 6 || !correct.length) {
    setFlash(res, 'error', 'Сұрақты, 2–6 жауап нұсқасын және дұрыс жауаптың нөмірін толтырыңыз.');
    return res.redirect(`/admin/questions?exam=${exam || 'ubt'}`);
  }
  const kind = correct.length > 1 ? 'multi' : 'single';
  await tx(async (c) => {
    const u = await c.query(`INSERT INTO exam_units(exam, grade, section, context, author_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [exam, GRADES.includes(toInt(b.grade)) ? toInt(b.grade) : 0, SECTION[b.section] ? b.section : '', cleanMultiline(b.context, 2000), req.user.id]);
    await c.query(`INSERT INTO exam_questions(unit_id, ord, kind, stem, options, correct, explanation, points) VALUES ($1,0,$2,$3,$4,$5,$6,$7)`,
      [u.rows[0].id, kind, stem, JSON.stringify(options), JSON.stringify(correct.sort()), cleanText(b.explanation, 1000), kind === 'multi' ? 2 : 1]);
  });
  setFlash(res, 'ok', 'Тапсырма қосылды.');
  res.redirect(`/admin/questions?exam=${exam}`);
}));
router.post('/questions/:id/delete', asyncH(async (req, res) => {
  const u = await one('DELETE FROM exam_units WHERE id = $1 RETURNING exam', [toInt(req.params.id)]);
  setFlash(res, 'ok', 'Блок өшірілді.');
  res.redirect(`/admin/questions?exam=${u ? u.exam : 'ubt'}`);
}));

// ---------------- Әкімшілер ----------------
router.get('/admins', asyncH(async (req, res) => {
  const admins = await many(`SELECT id, full_name, login, is_owner, created_at, last_login_at FROM users WHERE role = 'admin' ORDER BY is_owner DESC, created_at`);
  const owner = req.user.is_owner;
  await adminPage(req, res, 'admins', 'Әкімшілер', html`
    <p class="hint">Платформаның әкімшілері: иесі және тағы ең көбі ${config.maxAdmins - 1} көмекші (барлығы ${config.maxAdmins}). Көмекші әкімшілерді тек платформа иесі қосады, олардың құпиясөзін жаңартады немесе алып тастайды.</p>
    <div class="list">${admins.map((a) => html`
      <div class="row">
        <span class="ava">${a.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
        <div class="grow"><b>${a.full_name}</b><span>${a.login} · ${a.is_owner ? 'платформа иесі' : 'көмекші әкімші'} · соңғы кіру ${a.last_login_at ? fmtDateTime(a.last_login_at) : '—'}</span></div>
        <span class="pill adm">${a.is_owner ? 'иесі' : 'әкімші'}</span>
        ${owner && !a.is_owner ? html`<div class="acts">
          <form method="post" action="/admin/users/${a.id}/reset" data-confirm="Жаңа уақытша құпиясөз жасалсын ба?">${csrfField(req)}<button class="btn ghost sm" type="submit">Құпиясөз</button></form>
          <form method="post" action="/admin/admins/${a.id}/remove" data-confirm="${a.full_name} әкімшілер қатарынан алып тасталсын ба? Аккаунт өшіріледі.">${csrfField(req)}<button class="btn warn sm" type="submit">Алып тастау</button></form>
        </div>` : ''}
      </div>`)}</div>
    ${owner && admins.length < config.maxAdmins ? html`
      <form class="panel form" method="post" action="/admin/admins">
        ${csrfField(req)}
        <h2>Көмекші әкімші қосу (${admins.length} / ${config.maxAdmins})</h2>
        <div class="row3">
          <label class="fl">Аты-жөні<input type="text" name="full_name" maxlength="120" required></label>
          <label class="fl">Логин<input type="text" name="login" maxlength="32" autocapitalize="none" required></label>
          <label class="fl">Уақытша құпиясөз (кемінде 10 таңба)<input type="text" name="password" minlength="10" maxlength="100" required></label>
        </div>
        <p class="muted small">Жаңа әкімші алғаш кіргенде өз құпиясөзін ойлап табады.</p>
        <div class="formfoot"><button class="btn" type="submit">Қосу</button></div>
      </form>` : owner ? html`<div class="notice"><div>Әкімшілер саны шегіне жетті (${config.maxAdmins}).</div></div>` : ''}`);
}));

router.post('/admins', requireOwner, asyncH(async (req, res) => {
  const count = await one(`SELECT count(*) AS n FROM users WHERE role = 'admin'`);
  if (count.n >= config.maxAdmins) throw new HttpError(400, `Әкімшілер саны ${config.maxAdmins}-тен аспауы керек.`);
  const name = validFullName(req.body.full_name);
  const login = cleanText(req.body.login, 40);
  const password = String(req.body.password || '');
  let err = '';
  if (!name) err = 'Аты-жөнін толық жазыңыз.';
  else if (!LOGIN_RE.test(login)) err = 'Логин латынша 3–32 таңба болсын.';
  else if (password.length < 10) err = 'Құпиясөз кемінде 10 таңба болсын.';
  else if (await one('SELECT 1 FROM users WHERE lower(login) = lower($1)', [login])) err = 'Бұл логин бос емес.';
  if (err) { setFlash(res, 'error', err); return res.redirect('/admin/admins'); }
  await q(`INSERT INTO users(role, login, password_hash, full_name, status, must_change_password) VALUES ('admin', $1, $2, $3, 'active', true)`,
    [login, await hashPassword(password), name]);
  setFlash(res, 'ok', `${name} әкімші ретінде қосылды. Логин: ${login}.`);
  res.redirect('/admin/admins');
}));
router.post('/admins/:id/remove', requireOwner, asyncH(async (req, res) => {
  const a = await one(`SELECT id, full_name, is_owner FROM users WHERE id = $1 AND role = 'admin'`, [toInt(req.params.id)]);
  if (!a || a.is_owner) throw new HttpError(400, 'Бұл әкімшіні алып тастауға болмайды.');
  await q('DELETE FROM users WHERE id = $1', [a.id]);
  setFlash(res, 'ok', `${a.full_name} әкімшілер қатарынан алып тасталды.`);
  res.redirect('/admin/admins');
}));

// ---------------- Баптаулар ----------------
router.get('/settings', asyncH(async (req, res) => {
  const s = await getSettings();
  await adminPage(req, res, 'settings', 'Баптаулар', html`
    <form class="panel form" method="post" action="/admin/settings">
      ${csrfField(req)}
      <label class="fl">Платформа атауы<input type="text" name="site_name" value="${s.site_name || ''}" maxlength="60" placeholder="${config.siteName}"></label>
      <label class="fl">Төлем деректемелері (сатып алушыға көрсетіледі)<textarea name="payment_info" rows="4" maxlength="1200" placeholder="Мысалы: Kaspi Gold картасына аудару. Алушы: …&#10;Телефон: …&#10;Аударғанда түсініктемеге аты-жөніңізді жазыңыз.">${s.payment_info || ''}</textarea></label>
      <label class="fl">Хабарландыру (барлық беттің жоғарғы жағында; бос қалса, көрсетілмейді)<input type="text" name="announcement" value="${s.announcement || ''}" maxlength="300"></label>
      <label class="fl">Байланыс (беттің төменгі жағында)<input type="text" name="contact" value="${s.contact || ''}" maxlength="200" placeholder="+7 7xx xxx xx xx, WhatsApp"></label>
      <div class="formfoot"><button class="btn" type="submit">Сақтау</button></div>
    </form>`);
}));
router.post('/settings', asyncH(async (req, res) => {
  await saveSettings({
    site_name: cleanText(req.body.site_name, 60),
    payment_info: cleanMultiline(req.body.payment_info, 1200),
    announcement: cleanText(req.body.announcement, 300),
    contact: cleanText(req.body.contact, 200),
  });
  setFlash(res, 'ok', 'Баптаулар сақталды.');
  res.redirect('/admin/settings');
}));

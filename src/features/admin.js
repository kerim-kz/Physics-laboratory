import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { DOMAIN, domainName, domainsOf, EXAM, EXAMS, GRADES, hasDomains, TEST_EXAMS, validDomain, MATERIAL_TYPE, MATERIAL_TYPES, REGIONS, ROLE_NAME, SECTION, SECTIONS } from '../data/catalog.js';
import { csrfAfterUpload, dropUserSessions, hashPassword, requireAdmin, requireOwner } from '../lib/auth.js';
import { many, one, q, tx } from '../lib/db.js';
import { chk, html, sel } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { csrfField, emptyBox, page, pager, vhead } from '../lib/layout.js';
import { getSettings, saveSettings } from '../lib/settings.js';
import { deleteStored, discardUpload, multerStorage, persistUpload } from '../lib/storage.js';
import { parseNumber } from '../lib/examcore.js';
import {
  asArray, asyncH, cleanMultiline, cleanText, fmtDate, fmtDateTime, fmtPrice, HttpError, LOGIN_RE, newTempPassword, setFlash, toCsv, toInt, validFullName,
} from '../lib/util.js';
import { statusPill } from './cabinet.js';
import { AI_MODELS, aiProvider, aiSettings, compatConfig, FEATURE_NAME, usageReport } from '../lib/ai.js';

export const router = express.Router();
router.use(requireAdmin);

const TABS = [
  ['', 'Шолу'], ['teachers', 'Мұғалімдер'], ['users', 'Пайдаланушылар'], ['schools', 'Мектептер'], ['materials', 'Материалдар'],
  ['orders', 'Төлемдер'], ['questions', 'Тест банкі'], ['admins', 'Әкімшілер'], ['ai', 'ЖИ'], ['settings', 'Баптаулар'],
];

async function pendingCounts() {
  return one(`SELECT
    (SELECT count(*) FROM users WHERE role = 'teacher' AND status = 'pending') AS teachers,
    (SELECT count(*) FROM schools WHERE status = 'pending') AS schools,
    (SELECT count(*) FROM materials WHERE status = 'pending') AS materials,
    (SELECT count(*) FROM orders WHERE status = 'pending') AS orders`);
}

async function adminPage(req, res, tab, title, body, { scripts = [] } = {}) {
  const n = await pendingCounts();
  await page(req, res, {
    title: `Әкімші: ${title}`, active: 'admin', scripts,
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
  if (m && m.file_key) await deleteStored(m.file_key);
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
const IMG_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const imgUpload = multer({
  storage: multerStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 40 },
  fileFilter: (req, file, cb) => {
    if (IMG_EXT.includes(String(file.originalname).split('.').pop().toLowerCase())) return cb(null, true);
    const err = new Error('Сурет тек PNG, JPG, WEBP немесе GIF болуы керек.');
    err.code = 'BAD_EXT';
    cb(err);
  },
});
const KINDS = [
  ['choice', 'Жауап таңдау (бір немесе бірнеше дұрыс)'],
  ['matrix', 'Кесте: әр тұжырымға «Иә / Жоқ» сияқты жауап'],
  ['number', 'Сан жазу (жауабы сан)'],
  ['open', 'Ашық жауап (мұғалім бағалайды)'],
];
const KIND_NAME = { single: 'таңдау', multi: 'бірнеше дұрыс', matrix: 'кесте', number: 'сан', open: 'ашық жауап' };

router.get('/questions', asyncH(async (req, res) => {
  const exam = EXAM[req.query.exam] && !EXAM[req.query.exam].survey ? req.query.exam : 'ubt';
  const domains = hasDomains(exam), doms = domainsOf(exam);
  const domain = validDomain(exam, req.query.domain) ? req.query.domain : '';
  const params = [exam];
  if (domain) params.push(domain);
  const units = await many(`SELECT u.*, (SELECT json_agg(json_build_object('stem', q.stem, 'kind', q.kind) ORDER BY q.ord) FROM exam_questions q WHERE q.unit_id = u.id) AS qs
      FROM exam_units u WHERE u.exam = $1${domain ? ' AND u.domain = $2' : ''} ORDER BY u.domain, u.section, u.id`, params);
  const unitName = (u) => u.title || (u.qs && u.qs[0] ? u.qs[0].stem.split('\n').pop().slice(0, 90) : `№${u.id}`);
  await adminPage(req, res, 'questions', 'Тест банкі', html`
    <div class="seg">${TEST_EXAMS.map((e) => html`<a href="/admin/questions?exam=${e.k}" class="${e.k === exam ? 'on' : ''}">${e.name}</a>`)}</div>
    ${domains ? html`<div class="seg"><a href="/admin/questions?exam=${exam}" class="${domain ? '' : 'on'}">Барлық бағыт</a>${doms.map((d) => html`<a href="/admin/questions?exam=${exam}&domain=${d.k}" class="${d.k === domain ? 'on' : ''}">${d.name}</a>`)}</div>` : ''}
    <form class="panel form" method="post" action="/admin/questions" enctype="multipart/form-data" id="qForm">
      ${csrfField(req)}
      <input type="hidden" name="exam" value="${exam}">
      <h2>${EXAM[exam].name}: тапсырма қосу</h2>
      <p class="muted small">Мәтінде кесте жасау үшін жолды «|» белгісімен бастаңыз: <span class="mono">| Аялдама | Уақыт |</span> (бірінші жол — тақырып). Тізім үшін жолды «• » белгісімен бастаңыз.</p>
      <div class="row3">
        ${domains ? html`<label class="fl"><span class="req">Бағыт</span><select name="domain">${doms.map((d) => html`<option value="${d.k}"${sel(d.k === (domain || doms[0].k))}>${d.name}</option>`)}</select></label>` : ''}
        <label class="fl">Физика бөлімі<select name="section"><option value="">—</option>${SECTIONS.map((s) => html`<option value="${s.k}">${s.name}</option>`)}</select></label>
        <label class="fl">Сынып<select name="grade"><option value="0">—</option>${GRADES.map((g) => html`<option value="${g}">${g}</option>`)}</select></label>
      </div>
      <label class="fl">Қай блокқа қосу<select name="unit_id"><option value="">Жаңа блок (жаңа мәтін немесе жағдаят)</option>${units.map((u) => html`<option value="${u.id}">Бар блокқа: ${unitName(u)}${domains && DOMAIN[u.domain] ? ` · ${domainName(exam, u.domain)}` : ''}</option>`)}</select></label>
      <fieldset class="qf" data-for="new">
        <legend>Жаңа блок (бар блокқа қоссаңыз, бұл бөлім ескерілмейді)</legend>
        <label class="fl">Блоктың атауы<input type="text" name="title" maxlength="160" placeholder="Мысалы: Мұхит ағыстары"></label>
        <label class="fl">Мәтін, жағдаят (контекст)<textarea name="context" rows="5" maxlength="6000"></textarea></label>
      </fieldset>
      <label class="fl">Сурет (міндетті емес; PNG, JPG, ең көбі 4 МБ). Жаңа блокта — блоктың суреті, бар блокта — сұрақтың суреті.<input type="file" name="image" accept=".png,.jpg,.jpeg,.webp,.gif"></label>
      <label class="fl"><span class="req">Сұрақтың түрі</span><select name="kind" id="qKind">${KINDS.map(([k, n]) => html`<option value="${k}">${n}</option>`)}</select></label>
      <label class="fl"><span class="req">Сұрақ</span><textarea name="stem" rows="3" maxlength="2000" required></textarea></label>
      <fieldset class="qf" data-for="choice"><legend>Жауап таңдау</legend>
        <label class="fl">Жауап нұсқалары (әрқайсысы жаңа жолдан, 2–6 нұсқа)<textarea name="options" rows="5" maxlength="2000"></textarea></label>
        <label class="fl">Дұрыс жауаптың нөмірі (бірнеше болса — үтірмен: 2, 4)<input type="text" name="correct" maxlength="20" placeholder="1"></label>
      </fieldset>
      <fieldset class="qf" data-for="matrix" hidden><legend>Кесте</legend>
        <label class="fl">Тұжырымдар (әрқайсысы жаңа жолдан)<textarea name="rows" rows="5" maxlength="3000"></textarea></label>
        <label class="fl">Бағандар (үтірмен)<input type="text" name="cols" maxlength="200" value="Иә, Жоқ"></label>
        <label class="fl">Әр тұжырымның дұрыс бағаны, ретімен (мысалы: 1, 2, 1 — бірінші жол «Иә», екіншісі «Жоқ», ...)<input type="text" name="matrix_correct" maxlength="100" placeholder="1, 2, 1"></label>
      </fieldset>
      <fieldset class="qf" data-for="number" hidden><legend>Сан жауап</legend>
        <div class="row3">
          <label class="fl">Дұрыс жауап (бірнеше болса — «;» арқылы)<input type="text" name="value" maxlength="60" placeholder="22,95"></label>
          <label class="fl">Рұқсат етілген ауытқу<input type="text" name="tol" maxlength="20" placeholder="0"></label>
          <label class="fl">Өлшем бірлігі<input type="text" name="unit" maxlength="20" placeholder="км"></label>
        </div>
      </fieldset>
      <fieldset class="qf" data-for="open" hidden><legend>Ашық жауап</legend>
        <label class="fl">Бағалау критерийі және үлгі жауап (мұғалімге көрінеді)<textarea name="rubric" rows="3" maxlength="2000"></textarea></label>
        <label class="fl">Ең көп балл<select name="points"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
      </fieldset>
      <label class="fl">Түсіндірме (жауап тексерілгеннен кейін көрінеді)<textarea name="explanation" rows="2" maxlength="1500"></textarea></label>
      <div class="formfoot"><button class="btn" type="submit">Қосу</button></div>
    </form>
    <div class="resline">${units.length} блок · ${units.reduce((a, u) => a + (u.qs ? u.qs.length : 0), 0)} тапсырма</div>
    <div class="list">${units.map((u) => html`
      <div class="row">
        <div class="grow"><b>${unitName(u)}</b>
          <span>${domains && DOMAIN[u.domain] ? `${domainName(exam, u.domain)} · ` : ''}${SECTION[u.section] ? `${SECTION[u.section].name} · ` : ''}${u.grade ? `${u.grade}-сынып · ` : ''}${u.qs ? u.qs.length : 0} сұрақ (${[...new Set((u.qs || []).map((x) => KIND_NAME[x.kind] || x.kind))].join(', ')})${u.image ? ' · суреті бар' : ''}${u.seed_key ? ' · бастапқы банк' : ''}</span></div>
        <form method="post" action="/admin/questions/${u.id}/delete" data-confirm="Блок өшірілсін бе?">${csrfField(req)}<button class="btn warn sm" type="submit">Өшіру</button></form>
      </div>`)}</div>`, { scripts: ['/js/admin-q.js'] });
}));

const numList = (s) => String(s || '').split(/[;\s]+/).map((x) => parseNumber(x)).filter(Number.isFinite);

router.post('/questions', (req, res, next) => {
  imgUpload.single('image')(req, res, (err) => {
    if (err && (err.code === 'BAD_EXT' || err.code === 'LIMIT_FILE_SIZE')) {
      req.uploadError = err.code === 'BAD_EXT' ? err.message : 'Сурет тым үлкен (ең көбі 4 МБ).';
      return next();
    }
    next(err);
  });
}, csrfAfterUpload, asyncH(async (req, res) => {
  const b = req.body;
  const exam = EXAM[b.exam] && !EXAM[b.exam].survey ? b.exam : null;
  const domain = exam && hasDomains(exam) ? (validDomain(exam, b.domain) ? b.domain : EXAM[exam].domains[0]) : '';
  const back = `/admin/questions?exam=${exam || 'ubt'}${domain ? `&domain=${domain}` : ''}`;
  const fail = (text) => { discardUpload(req.file); setFlash(res, 'error', text); res.redirect(back); };
  if (req.uploadError) return fail(req.uploadError);
  if (!exam) return fail('Емтихан белгісіз.');
  const stem = cleanMultiline(b.stem, 2000);
  if (stem.length < 3) return fail('Сұрақтың мәтінін жазыңыз.');

  let kind, options, correct, points = 1, rubric = '';
  if (b.kind === 'matrix') {
    const rows = String(b.rows || '').split('\n').map((s) => cleanText(s, 400)).filter(Boolean);
    const cols = String(b.cols || '').split(',').map((s) => cleanText(s, 40)).filter(Boolean);
    correct = String(b.matrix_correct || '').split(/[,\s;]+/).filter(Boolean).map((s) => toInt(s) - 1);
    if (rows.length < 1 || rows.length > 10 || cols.length < 2 || cols.length > 4 || correct.length !== rows.length || correct.some((c) => c < 0 || c >= cols.length)) {
      return fail('Кестеде 1–10 тұжырым, 2–4 баған болуы керек, және әр тұжырымға дұрыс бағанның нөмірін жазыңыз.');
    }
    kind = 'matrix'; options = { rows, cols };
  } else if (b.kind === 'number') {
    correct = numList(b.value);
    if (!correct.length) return fail('Дұрыс жауапты сан түрінде жазыңыз.');
    const tol = Math.abs(parseNumber(b.tol)) || 0;
    kind = 'number'; options = { unit: cleanText(b.unit, 20), tol };
  } else if (b.kind === 'open') {
    rubric = cleanMultiline(b.rubric, 2000);
    if (rubric.length < 3) return fail('Ашық жауапқа бағалау критерийін жазыңыз.');
    kind = 'open'; options = {}; correct = []; points = Math.min(3, Math.max(1, toInt(b.points, 1)));
  } else {
    options = String(b.options || '').split('\n').map((s) => cleanText(s, 300)).filter(Boolean);
    correct = [...new Set(String(b.correct || '').split(/[,\s;]+/).map((s) => toInt(s) - 1).filter((n) => n >= 0 && n < options.length))].sort();
    if (options.length < 2 || options.length > 6 || !correct.length) return fail('2–6 жауап нұсқасын және дұрыс жауаптың нөмірін толтырыңыз.');
    kind = correct.length > 1 ? 'multi' : 'single'; points = kind === 'multi' ? 2 : 1;
  }

  let unitId = toInt(b.unit_id);
  if (unitId && !(await one('SELECT 1 AS x FROM exam_units WHERE id = $1 AND exam = $2', [unitId, exam]))) return fail('Блок табылмады.');
  const image = req.file ? await persistUpload(req.file) : '';
  await tx(async (c) => {
    if (!unitId) {
      const u = await c.query(`INSERT INTO exam_units(exam, domain, grade, section, title, context, image, author_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [exam, domain, GRADES.includes(toInt(b.grade)) ? toInt(b.grade) : 0, SECTION[b.section] ? b.section : '', cleanText(b.title, 160), cleanMultiline(b.context, 6000), image, req.user.id]);
      unitId = u.rows[0].id;
    }
    const ord = (await c.query('SELECT coalesce(max(ord), -1) + 1 AS o FROM exam_questions WHERE unit_id = $1', [unitId])).rows[0].o;
    await c.query(`INSERT INTO exam_questions(unit_id, ord, kind, stem, options, correct, explanation, points, image, rubric) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [unitId, ord, kind, stem, JSON.stringify(options), JSON.stringify(correct), cleanMultiline(b.explanation, 1500), points, toInt(b.unit_id) ? image : '', rubric]);
  });
  setFlash(res, 'ok', 'Тапсырма қосылды.');
  res.redirect(back);
}));
router.post('/questions/:id/delete', asyncH(async (req, res) => {
  const u = await one('DELETE FROM exam_units WHERE id = $1 RETURNING exam, domain, image', [toInt(req.params.id)]);
  if (u && u.image && !u.image.startsWith('/')) await deleteStored(u.image);
  setFlash(res, 'ok', 'Блок өшірілді.');
  res.redirect(`/admin/questions?exam=${u ? u.exam : 'ubt'}${u && u.domain ? `&domain=${u.domain}` : ''}`);
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

// ---------------- ЖИ құралы ----------------
const ROLE_SHORT = { admin: 'әкімші', teacher: 'мұғалім', student: 'оқушы' };
const usd = (x) => `$${x < 0.01 && x > 0 ? x.toFixed(4) : x.toFixed(2)}`;

router.get('/ai', asyncH(async (req, res) => {
  const st = await aiSettings();
  const r = await usageReport();
  const prov = aiProvider();
  const cc = compatConfig();
  await adminPage(req, res, 'ai', 'ЖИ', html`
    <section class="panel">
      <h2>${icon('spark')} ЖИ құралының күйі</h2>
      ${prov === 'compat' ? html`<p><span class="pill ok">тегін провайдер қосылған</span> ${st.enabled ? html`<span class="pill ok">қосулы</span>` : html`<span class="pill pending">өшірулі</span>`}</p>
          <p class="muted small">Мекенжай: <code>${cc.host}</code> · модель: <code>${cc.models.join(', ')}</code>${cc.models.length > 1 ? ' (біріншісі жүктелсе, келесісі қолданылады)' : ''}. Шығын — 0 ₸, бірақ сапа мен лимит провайдерге байланысты.</p>`
        : prov === 'anthropic' ? html`<p><span class="pill ok">Anthropic API кілті қосылған</span> ${st.enabled ? html`<span class="pill ok">қосулы</span>` : html`<span class="pill pending">өшірулі</span>`}</p>`
        : html`<p><span class="pill pending">ЖИ провайдері қосылмаған</span> — ЖИ функциялары «бапталмаған» күйінде көрсетіледі.</p>`}
      <details class="op-d"${prov ? '' : html` open`}><summary>${icon('key', 15)} 1-жол (тегін, ең оңай): Google AI Studio кілті</summary>
        <ol class="op-steps">
          <li><b>aistudio.google.com</b> сайтына Google аккаунтымен кіріп, <b>Get API key → Create API key</b> басыңыз. Кілтті (<code>AIza…</code>) көшіріп алыңыз. Төлем картасы керек емес.</li>
          <li>Серверге қосылып (<code>ssh root@сервердің-IP</code>), мына команданы орындаңыз: <code>bash /opt/gylym/deploy/set-ai.sh</code>. <b>1</b>-ді таңдап, кілтті қойыңыз (экранда көрінбейді). Скрипт кілтті тексереді, тегін Flash моделін өзі таңдайды және сайтты қайта іске қосады.</li>
          <li>Сайт қайта іске қосылған соң осы бетте «тегін провайдер қосылған» деп шығады.</li>
        </ol>
        <p class="hint">Ескерту: тегін тарифте Google жіберілген мәтінді өз қызметтерін жақсартуға пайдалануы мүмкін. Сондықтан оқушыларға ЖИ-ге жеке деректерін (аты-жөні, телефоны т.б.) жазбауды ескертіңіз. Сайт өзі оқушылардың аты-жөнін ЖИ-ге жібермейді.</p>
      </details>
      <details class="op-d"><summary>${icon('key', 15)} 2-жол (тегін): өз FreeLLMAPI серверіңіз</summary>
        <ol class="op-steps">
          <li>FreeLLMAPI-ді үнемі қосулы тұратын компьютерге немесе тұрақты дискісі бар серверге Docker арқылы орнатыңыз (нұсқаулық: репозиторийдегі <code>docs/en/install/01-install.md</code>). Сайттың өз серверіне (1 ГБ) орнатпаған жөн — жады жетпей қалуы мүмкін.</li>
          <li>FreeLLMAPI панелінде <b>Keys</b> бетіне тегін провайдерлердің кілттерін қосыңыз (Google, Groq т.б.) және сол беттің жоғарғы жағындағы ортақ кілтті (<code>freellmapi-…</code>) көшіріңіз.</li>
          <li>Серверде <code>nano /opt/gylym/deploy/.env</code> файлына жазыңыз: <code>AI_BASE_URL</code> = FreeLLMAPI-дің HTTPS мекенжайы + <code>/v1</code>; <code>AI_API_KEY</code> = ортақ кілт; <code>AI_MODEL</code> = <code>auto</code>. Сосын: <code>cd /opt/gylym/deploy &amp;&amp; docker compose up -d app</code>.</li>
        </ol>
      </details>
      <details class="op-d"><summary>${icon('key', 15)} 3-жол (ақылы, ең сапалы): Anthropic Claude</summary>
        <ol class="op-steps">
          <li><b>console.anthropic.com</b> → <b>Settings → Billing</b>: картаны қосып, балансты толтырыңыз; <b>Limits</b> бөлімінде айлық лимит қойыңыз.</li>
          <li><b>Settings → API keys → Create key</b>: кілтті (<code>sk-ant-…</code>) көшіріңіз.</li>
          <li>Серверде: <code>bash /opt/gylym/deploy/set-ai.sh</code> → <b>2</b>-ні таңдап, кілтті қойыңыз. Скрипт кілтті тексеріп, тегін провайдердің баптауларын өзі алып тастайды.</li>
        </ol>
      </details>
      <p class="hint">Кілттерді ешкімге жібермеңіз және чатқа қоймаңыз — оларды тек серверде скрипт сұрағанда енгізіңіз. ЖИ-ді өшіру: сол скриптте <b>3</b>.</p>
    </section>
    <form class="panel form" method="post" action="/admin/ai">
      ${csrfField(req)}
      <h2>Баптаулар</h2>
      <label class="chip plain"><input type="checkbox" name="ai_enabled" value="1"${chk(st.enabled)}> ЖИ құралы қосулы</label>
      ${prov === 'compat' ? html`<input type="hidden" name="ai_model" value="${st.model}">`
        : html`<label class="fl">Claude моделі<select name="ai_model">${AI_MODELS.map(([id, name, pin, pout]) => html`<option value="${id}"${sel(st.model === id)}>${name} · ${usd(pin)} / ${usd(pout)} (1 млн токен: кіріс / шығыс)</option>`)}</select></label>`}
      <div class="ai-row">
        <label class="fl">Оқушыға күнделікті лимит (сұраныс)<input type="number" name="ai_student_limit" min="0" max="500" value="${st.student}"></label>
        <label class="fl">Мұғалімге күнделікті лимит (сұраныс)<input type="number" name="ai_teacher_limit" min="0" max="2000" value="${st.teacher}"></label>
      </div>
      <p class="hint">Лимит Алматы уақытымен түн ортасында жаңарады; 0 — ЖИ-ді осы рөл үшін өшіреді. Әкімшіге лимит жоқ. Тегін провайдерде шығын жоқ, бірақ лимитті қалдырған жөн — провайдердің тегін тәуліктік квотасы ортақ. Claude-та шамамен: оқушының бір сұрағы ≈ 0,01–0,03 $ (арзан модельде ≈ 0,001 $).</p>
      <div class="formfoot"><button class="btn" type="submit">Сақтау</button></div>
    </form>
    <section class="block">
      <div class="block-h"><h2>Соңғы 30 күндегі пайдалану</h2><span class="cnt">болжамды шығын: ${usd(r.cost)}</span></div>
      <div class="ovgrid">
        <div class="ov"><b>${r.today.n}</b><span>бүгінгі сұраныс</span></div>
        <div class="ov"><b>${r.today.users}</b><span>бүгін қолданған адам</span></div>
        <div class="ov"><b>${r.byModel.reduce((s, m) => s + m.n, 0)}</b><span>сұраныс (30 күн)</span></div>
        <div class="ov${r.failed ? ' warn' : ''}"><b>${r.failed}</b><span>сәтсіз сұраныс</span></div>
      </div>
      ${r.byFeature.length ? html`<div class="tblwrap"><table><thead><tr><th>Функция</th><th>Кім</th><th class="num">Сұраныс</th></tr></thead>
        <tbody>${r.byFeature.map((x) => html`<tr><td>${FEATURE_NAME[x.feature] || x.feature}</td><td>${ROLE_SHORT[x.role] || x.role}</td><td class="num">${x.n}</td></tr>`)}</tbody></table></div>
        <div class="tblwrap"><table><thead><tr><th>Модель</th><th class="num">Сұраныс</th><th class="num">Кіріс токен</th><th class="num">Шығыс токен</th><th class="num">Шығын</th></tr></thead>
        <tbody>${r.byModel.map((m) => html`<tr><td class="mono">${m.model}</td><td class="num">${m.n}</td><td class="num">${m.inp}</td><td class="num">${m.outp}</td><td class="num">${m.free ? 'тегін' : usd(m.cost)}</td></tr>`)}</tbody></table></div>
        <div class="tblwrap"><table><thead><tr><th>Ең белсенді пайдаланушылар</th><th>Рөлі</th><th class="num">Сұраныс</th></tr></thead>
        <tbody>${r.top.map((x) => html`<tr><td>${x.full_name}</td><td>${ROLE_SHORT[x.role] || x.role}</td><td class="num">${x.n}</td></tr>`)}</tbody></table></div>`
        : emptyBox('Әзірге пайдаланылмаған', 'ЖИ құралына сұраныстар осында есептеледі. Сұраныстардың мәтіні сақталмайды.')}
      <p class="hint">Шығын — токендер саны бойынша болжам; нақты сома Anthropic Console → Billing бетінде көрсетіледі.</p>
    </section>`);
}));
router.post('/ai', asyncH(async (req, res) => {
  const lim = (v, max) => String(Math.max(0, Math.min(max, toInt(v, 0))));
  await saveSettings({
    ai_enabled: req.body.ai_enabled === '1' ? '1' : '0',
    ai_model: AI_MODELS.some(([id]) => id === req.body.ai_model) ? req.body.ai_model : AI_MODELS[0][0],
    ai_student_limit: lim(req.body.ai_student_limit, 500),
    ai_teacher_limit: lim(req.body.ai_teacher_limit, 2000),
  });
  setFlash(res, 'ok', 'ЖИ баптаулары сақталды.');
  res.redirect('/admin/ai');
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

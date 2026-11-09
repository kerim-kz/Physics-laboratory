// Зертханаларды платформаның ішінде іске қосу.
// Әр зертхана — «Ғылым Ордасы» артефактісінен өзгеріссіз алынған HTML (labs/<key>.html).
// Артефакт window.claude.use('user' | 'db' | 'downloads') арқылы жұмыс істейді; платформа оның орнына
// public/js/lab-runtime.js үйлесімді қабатын береді, ал subs/{uid} құжаттары lab_subs кестесіне жазылады.
// Оқушы тапсырған нәтиже оның сынып мұғалімінің журналына (lab_results) автоматты түрде түседі.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { grade5, labByKey } from '../data/labs.js';
import { SECTION } from '../data/catalog.js';
import { isActiveTeacher, isAdmin } from '../lib/auth.js';
import { many, one, q, tx } from '../lib/db.js';
import { asset } from '../lib/assets.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { page } from '../lib/layout.js';
import { asyncH, HttpError } from '../lib/util.js';

export const router = express.Router();

const labsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'labs');
const cache = new Map();

// Зертхана файлын оқып, ішкі скриптінің SHA-256 хэшін есептейміз (CSP үшін) және
// үйлесімділік қабатын сол скрипттің алдына қоятын орынды табамыз.
function loadLab(key) {
  if (cache.has(key)) return cache.get(key);
  const file = path.join(labsDir, `${key}.html`);
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, 'utf8');
  const re = /<script\b(?![^>]*\bsrc\s*=)[^>]*>/gi;
  const hashes = [];
  let insertAt = -1;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    const end = src.indexOf('</script>', start);
    if (end < 0) break;
    if (!/type\s*=\s*["']?application\/(ld\+)?json/i.test(m[0])) {
      if (insertAt < 0) insertAt = m.index;
      hashes.push(`'sha256-${crypto.createHash('sha256').update(src.slice(start, end), 'utf8').digest('base64')}'`);
    }
    re.lastIndex = end;
  }
  const lab = { src, hashes, insertAt: insertAt < 0 ? src.length : insertAt };
  cache.set(key, lab);
  return lab;
}

export const uidOf = (userId) => `u${userId}`;
const parseUid = (s) => { const m = /^u(\d{1,9})$/.exec(String(s || '')); return m ? Number(m[1]) : null; };
export const classLabel = (grade, letter) => (grade ? (letter ? `${grade} «${letter}»` : String(grade)) : '');

function requireLab(req) {
  const lab = labByKey(req.params.key);
  if (!lab) throw new HttpError(404, 'Зертхана табылмады.');
  return lab;
}

// ---------------- Бет: платформа ішіндегі зертхана ----------------
router.get('/labs/:key', asyncH(async (req, res) => {
  const L = requireLab(req);
  const u = req.user;
  const teacherView = u && (isActiveTeacher(u) || isAdmin(u));
  const panel = teacherView && req.query.panel === '1';
  let teacherName = null;
  if (u && u.role === 'student' && u.class_id) {
    const t = await one('SELECT t.full_name FROM classes c JOIN users t ON t.id = c.teacher_id WHERE c.id = $1', [u.class_id]);
    teacherName = t ? t.full_name : null;
  }
  const notice = !u
    ? html`<div class="notice"><div><b>Платформаға кірмегенсің.</b> Жұмысты орындай бересің, бірақ соңында <b>нәтиже кодын</b> мұғаліміңе өзің жіберуің керек. <a href="/login?next=/labs/${L.k}">Кірсең</a>, нәтижең мұғаліміңнің журналына өзі түседі.</div></div>`
    : u.role === 'student' && teacherName
      ? html`<div class="notice"><div>Нәтижең мұғаліміңнің — <b>${teacherName}</b> — журналына автоматты түрде түседі. Код жіберудің қажеті жоқ.</div></div>`
      : u.role === 'student'
        ? html`<div class="notice warn"><div>Сен әлі ешбір сыныпқа қосылмағансың, сондықтан нәтиже мұғалімге жетпейді. <a href="/cabinet">Кабинетте</a> мұғалімің берген сынып кодын енгіз.</div></div>`
        : html`<div class="notice"><div>Сіз мұғалім ретінде кірдіңіз. Зертхананың ішіндегі <b>«Мұғалім панелі»</b> өз сыныптарыңыздағы оқушылардың осы жұмыс бойынша нәтижелерін көрсетеді; барлық жұмыстың жиынтығы — <a href="/teacher/labs">журналда</a>.</div></div>`;
  const sec = SECTION[L.s];
  await page(req, res, {
    title: L.t, active: 'labs',
    body: html`
      <div class="view labview">
        <div class="crumbs"><a href="/labs">Зертханалар</a><span>/</span><span>${L.g}-сынып №${L.no}</span></div>
        <div class="vhead">
          <div><p class="eyebrow">${sec ? sec.name : ''} · ${L.g}-сынып · №${L.no} зертханалық жұмыс</p><h1>${L.t}</h1></div>
          <div class="vhead-act">
            ${teacherView ? html`<a class="btn${panel ? '' : ' ghost'}" href="/labs/${L.k}?panel=1">${icon('user', 15)} Мұғалім панелі</a>${panel ? html`<a class="btn ghost" href="/labs/${L.k}">Зертхана</a>` : ''}` : ''}
            <a class="btn ghost" href="/labs/${L.k}/app" target="_blank" rel="noopener">${icon('ext', 15)} Толық экран</a>
          </div>
        </div>
        ${notice}
        <iframe class="labframe" name="labframe" title="${L.t}" src="/labs/${L.k}/app${panel ? '?t=1#teacher' : ''}"></iframe>
      </div>`,
  });
}));

router.get('/labs/:key/app', asyncH(async (req, res) => {
  const L = requireLab(req);
  const lab = loadLab(L.k);
  if (!lab) throw new HttpError(404, 'Зертхана файлы табылмады.');
  const u = req.user;
  const cfg = {
    key: L.k,
    uid: u ? uidOf(u.id) : null,
    owner: !!u && (isActiveTeacher(u) || isAdmin(u)),
    name: u && u.role === 'student' ? u.full_name : '',
    cls: u && u.role === 'student' ? classLabel(u.class_grade, u.class_letter) : '',
    csrf: req.csrfToken,
  };
  const inject = `<script type="application/json" id="labRuntimeConfig">${JSON.stringify(cfg).replace(/</g, '\\u003c')}</script><script src="${asset('/js/lab-runtime.js')}"></script>`;
  const body = lab.src.slice(0, lab.insertAt) + inject + lab.src.slice(lab.insertAt);
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    `script-src 'self' ${lab.hashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; '));
  res.setHeader('Cache-Control', 'private, no-store');
  res.type('html').send(body);
}));

// ---------------- API: subs/{uid} құжаттары ----------------
function requireSignedIn(req) {
  if (!req.user) throw new HttpError(401, 'Платформаға кіріңіз.');
}

// Мұғалім осы оқушыны көре ала ма (өз сыныбының оқушысы ма)?
async function canManage(viewer, studentId) {
  if (isAdmin(viewer)) return true;
  if (!isActiveTeacher(viewer)) return false;
  return !!(await one('SELECT 1 FROM users u JOIN classes c ON c.id = u.class_id WHERE u.id = $1 AND c.teacher_id = $2', [studentId, viewer.id]));
}

// Құжат ішіндегі аты мен сыныпты платформадағы аккаунт деректерімен ауыстырамыз.
function withIdentity(data, row) {
  const d = data && typeof data === 'object' ? { ...data } : {};
  if (row.role === 'student') {
    d.name = row.full_name;
    const cls = classLabel(row.grade, row.letter);
    if (cls) d.cls = cls;
  }
  if (d.grade == null && typeof d.score === 'number') d.grade = grade5(d.score);
  return d;
}

router.get('/api/labs/:key/subs/:uid', asyncH(async (req, res) => {
  const L = requireLab(req);
  requireSignedIn(req);
  const sid = parseUid(req.params.uid);
  if (!sid) throw new HttpError(400, 'Құжат белгісіз.');
  if (sid !== req.user.id && !(await canManage(req.user, sid))) throw new HttpError(403, 'Рұқсат жоқ.');
  const row = await one(`SELECT s.data, u.role, u.full_name, c.grade, c.letter FROM lab_subs s JOIN users u ON u.id = s.user_id
                           LEFT JOIN classes c ON c.id = u.class_id WHERE s.lab_key = $1 AND s.user_id = $2`, [L.k, sid]);
  res.json(row ? { exists: true, data: withIdentity(row.data, row) } : { exists: false });
}));

router.post('/api/labs/:key/subs/:uid', asyncH(async (req, res) => {
  const L = requireLab(req);
  requireSignedIn(req);
  const sid = parseUid(req.params.uid);
  if (sid !== req.user.id) throw new HttpError(403, 'Тек өз жұмысыңызды тапсыра аласыз.');
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Деректер дұрыс емес.');
  const score = Math.max(0, Math.min(10, Number(data.score) || 0));
  const crit = Array.isArray(data.crit) ? data.crit.slice(0, 20).map((x) => (x === true || x === 1 || x === '1' ? '1' : '0')).join('') : '';
  await tx(async (c) => {
    await c.query(`INSERT INTO lab_subs(lab_key, user_id, data, score) VALUES ($1,$2,$3,$4)
                   ON CONFLICT (lab_key, user_id) DO UPDATE SET data = EXCLUDED.data, score = EXCLUDED.score, updated_at = now()`,
    [L.k, sid, JSON.stringify(data), score]);
    // Оқушы сыныпқа тіркелген болса — мұғалімнің журналына жазамыз.
    const st = (await c.query(`SELECT u.role, u.full_name, cl.teacher_id, cl.grade, cl.letter FROM users u
                                  LEFT JOIN classes cl ON cl.id = u.class_id WHERE u.id = $1`, [sid])).rows[0];
    if (st && st.role === 'student' && st.teacher_id) {
      await c.query('DELETE FROM lab_results WHERE student_id = $1 AND lab_key = $2 AND source = $3', [sid, L.k, 'online']);
      await c.query(`INSERT INTO lab_results(teacher_id, lab_key, student_name, class_label, variant, score, crit, done_at, code, student_id, source)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'',$9,'online')
                     ON CONFLICT (teacher_id, lab_key, student_name, class_label)
                     DO UPDATE SET variant = EXCLUDED.variant, score = EXCLUDED.score, crit = EXCLUDED.crit, done_at = EXCLUDED.done_at,
                                   code = '', student_id = EXCLUDED.student_id, source = 'online', created_at = now()`,
      [st.teacher_id, L.k, st.full_name, classLabel(st.grade, st.letter), String(data.variant ?? '').slice(0, 20), score, crit,
        String(data.at ?? '').slice(0, 40), sid]);
    }
  });
  res.json({ ok: true, grade: grade5(score) });
}));

router.delete('/api/labs/:key/subs/:uid', asyncH(async (req, res) => {
  const L = requireLab(req);
  requireSignedIn(req);
  const sid = parseUid(req.params.uid);
  if (!sid || !(await canManage(req.user, sid))) throw new HttpError(403, 'Жұмысты тек оқушының мұғалімі өшіре алады.');
  await q('DELETE FROM lab_subs WHERE lab_key = $1 AND user_id = $2', [L.k, sid]);
  await q(`DELETE FROM lab_results WHERE lab_key = $1 AND student_id = $2 AND source = 'online'`, [L.k, sid]);
  res.status(204).end();
}));

router.get('/api/labs/:key/subs', asyncH(async (req, res) => {
  const L = requireLab(req);
  requireSignedIn(req);
  if (!isAdmin(req.user) && !isActiveTeacher(req.user)) throw new HttpError(403, 'Рұқсат жоқ.');
  const params = [L.k];
  let where = 's.lab_key = $1';
  if (!isAdmin(req.user)) { params.push(req.user.id); where += ' AND c.teacher_id = $2'; }
  const rows = await many(`SELECT s.user_id, s.data, u.role, u.full_name, c.grade, c.letter FROM lab_subs s JOIN users u ON u.id = s.user_id
                             LEFT JOIN classes c ON c.id = u.class_id WHERE ${where} ORDER BY c.grade, c.letter, u.full_name`, params);
  res.json({ docs: rows.map((r) => ({ id: uidOf(r.user_id), data: withIdentity(r.data, r) })) });
}));

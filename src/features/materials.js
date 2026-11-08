import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import {
  ALLOWED_EXT, EXAM, EXAMS, FAMILIES, GRADES, MATERIAL_TYPE, MATERIAL_TYPES, SECTION, SECTIONS,
} from '../data/catalog.js';
import { csrfAfterUpload, isAdmin, requireActiveTeacher, requireUser } from '../lib/auth.js';
import { many, one, q } from '../lib/db.js';
import { chk, html, sel } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { csrfField, emptyBox, page, pager, vhead } from '../lib/layout.js';
import { getSettings } from '../lib/settings.js';
import {
  asArray, asyncH, cleanMultiline, cleanText, contentDisposition, fmtDate, fmtPrice, fmtSize, HttpError, setFlash, toInt,
} from '../lib/util.js';

export const router = express.Router();

const MIME = {
  pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint', pps: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  odt: 'application/vnd.oasis.opendocument.text', odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet', zip: 'application/zip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
};
const extOf = (name) => path.extname(String(name || '')).slice(1).toLowerCase();
const FMT_BY_EXT = { ppt: 'ppt', pptx: 'ppt', pps: 'ppt', ppsx: 'ppt', odp: 'ppt', doc: 'doc', docx: 'doc', odt: 'doc', pdf: 'pdf', xls: 'xls', xlsx: 'xls', ods: 'xls' };

// ---------------- Ортақ компоненттер ----------------
export function fmtBadge(m) {
  const ext = extOf(m.file_name);
  if (ext) return html`<span class="fmt ${FMT_BY_EXT[ext] || ''}">${ext.toUpperCase()}</span>`;
  if (m.external_url) return html`<span class="fmt">LINK</span>`;
  const t = MATERIAL_TYPE[m.type];
  return html`<span class="fmt ${t ? t.fmt : ''}">${t ? t.label : 'FILE'}</span>`;
}

export function materialCard(m) {
  const sec = SECTION[m.section];
  const fam = sec ? FAMILIES[sec.fam].css : '';
  const t = MATERIAL_TYPE[m.type];
  const desc = m.description.length > 150 ? `${m.description.slice(0, 147)}…` : m.description;
  return html`
    <article class="mcard ${fam}">
      <div class="mc-top">
        <span class="mini ${fam}" title="${sec ? sec.name : 'Жалпы'}">${sec ? sec.sym : 'Фз'}</span>
        <span class="mc-kind">${t ? t.name : m.type}${sec ? ` · ${sec.name}` : ''}</span>
        <span class="mc-grade">${m.grade ? `${m.grade}-сынып` : '7–11'}</span>
      </div>
      <h3><a href="/materials/${m.id}">${m.title}</a></h3>
      ${desc ? html`<p>${desc}</p>` : ''}
      ${m.exams && m.exams.length ? html`<div class="tags">${m.exams.map((e) => html`<span class="tag">${EXAM[e] ? EXAM[e].name : e}</span>`)}</div>` : ''}
      <div class="mc-foot">
        ${fmtBadge(m)}
        ${m.price > 0 ? html`<span class="price">${fmtPrice(m.price)}</span>` : html`<span class="free">тегін</span>`}
        <a class="open${m.price > 0 ? ' buy' : ''}" href="/materials/${m.id}">Ашу ${icon('arrow', 14)}</a>
      </div>
    </article>`;
}

async function hasAccess(user, m) {
  if (!user) return false;
  if (isAdmin(user) || m.author_id === user.id) return true;
  if (m.status !== 'published') return false;
  if (m.price === 0) return true;
  return !!(await one(`SELECT 1 FROM orders WHERE material_id = $1 AND user_id = $2 AND status = 'approved'`, [m.id, user.id]));
}

async function loadMaterial(req) {
  const m = await one(
    `SELECT m.*, a.full_name AS author_name, s.name AS author_school
       FROM materials m LEFT JOIN users a ON a.id = m.author_id LEFT JOIN schools s ON s.id = a.school_id
      WHERE m.id = $1`, [toInt(req.params.id)]);
  const visible = m && (m.status === 'published' || (req.user && (isAdmin(req.user) || m.author_id === req.user.id)));
  if (!visible) throw new HttpError(404, 'Материал табылмады.');
  return m;
}

// ---------------- Кітапхана ----------------
function libraryFilters(query) {
  return {
    section: SECTION[query.section] ? query.section : '',
    grade: GRADES.includes(toInt(query.grade)) ? toInt(query.grade) : 0,
    type: MATERIAL_TYPE[query.type] ? query.type : '',
    exam: EXAM[query.exam] ? query.exam : '',
    price: ['free', 'paid'].includes(query.price) ? query.price : '',
    q: cleanText(query.q, 80),
    page: Math.max(1, toInt(query.page, 1)),
  };
}

async function findMaterials(f, limit) {
  const params = [];
  const where = [`m.status = 'published'`];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (f.section) add('m.section = ?', f.section);
  if (f.grade) add('(m.grade = ? OR m.grade = 0)', f.grade);
  if (f.type) add('m.type = ?', f.type);
  if (f.exam) add('? = ANY(m.exams)', f.exam);
  if (f.price === 'free') where.push('m.price = 0');
  if (f.price === 'paid') where.push('m.price > 0');
  if (f.q) {
    params.push(`%${f.q}%`);
    where.push(`(m.title ILIKE $${params.length} OR m.description ILIKE $${params.length})`);
  }
  params.push(limit + 1, (f.page - 1) * limit);
  const rows = await many(
    `SELECT m.* FROM materials m WHERE ${where.join(' AND ')}
      ORDER BY m.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return { rows: rows.slice(0, limit), more: rows.length > limit };
}

router.get('/library', asyncH(async (req, res) => {
  const f = libraryFilters(req.query);
  const { rows, more } = await findMaterials(f, 24);
  const canUpload = req.user && (isAdmin(req.user) || (req.user.role === 'teacher' && req.user.status === 'active'));
  await page(req, res, {
    title: 'Кітапхана', active: 'library',
    body: html`
      <div class="view">
        ${vhead('Кітапхана', 'Физика бойынша барлық тегін және ақылы материал. Бөлімді, сыныпты, түрін немесе емтиханды таңдап сүзіңіз.',
          canUpload ? html`<a class="btn" href="/materials/new">${icon('upload', 16)} Материал жүктеу</a>` : '')}
        <form class="stack" method="get" action="/library" data-autosubmit>
          <div class="chips">
            <a class="chip plain${!f.section ? ' on' : ''}" href="?${new URLSearchParams({ ...pick(f), section: '' })}">Барлық бөлім</a>
            ${SECTIONS.map((s) => html`<a class="chip ${FAMILIES[s.fam].css}${f.section === s.k ? ' on' : ''}" href="?${new URLSearchParams({ ...pick(f), section: s.k })}"><i>${s.sym}</i>${s.name}</a>`)}
          </div>
          <input type="hidden" name="section" value="${f.section}">
          <div class="filters">
            <label class="fl">Сынып<select name="grade"><option value="">Барлығы</option>${GRADES.map((g) => html`<option value="${g}"${sel(f.grade === g)}>${g}-сынып</option>`)}</select></label>
            <label class="fl">Түрі<select name="type"><option value="">Барлығы</option>${MATERIAL_TYPES.map((t) => html`<option value="${t.k}"${sel(f.type === t.k)}>${t.name}</option>`)}</select></label>
            <label class="fl">Емтихан<select name="exam"><option value="">Барлығы</option>${EXAMS.map((e) => html`<option value="${e.k}"${sel(f.exam === e.k)}>${e.name}</option>`)}</select></label>
            <label class="fl">Бағасы<select name="price"><option value="">Барлығы</option><option value="free"${sel(f.price === 'free')}>Тегін</option><option value="paid"${sel(f.price === 'paid')}>Ақылы</option></select></label>
            <label class="search">${icon('search', 16)}<input type="search" name="q" value="${f.q}" placeholder="Атауы немесе сипаттамасы" aria-label="Кітапханадан іздеу"></label>
            <button class="btn ghost" type="submit">Іздеу</button>
          </div>
        </form>
        ${rows.length ? html`<div class="mgrid">${rows.map((m) => materialCard(m))}</div>${pager(req.originalUrl, f.page, more)}`
          : emptyBox('Материал табылмады', 'Сүзгіні өзгертіп көріңіз немесе кейінірек кіріңіз — кітапхана үнемі толықтырылады.')}
      </div>`,
  });
}));

function pick(f) {
  const o = {};
  for (const k of ['section', 'grade', 'type', 'exam', 'price', 'q']) if (f[k]) o[k] = String(f[k]);
  return o;
}

// ---------------- Материал беті ----------------
router.get('/materials/new', requireActiveTeacher, asyncH(async (req, res) => uploadForm(req, res)));

router.get('/materials/:id', asyncH(async (req, res) => {
  const m = await loadMaterial(req);
  const access = await hasAccess(req.user, m);
  const order = req.user && m.price > 0 && !access
    ? await one(`SELECT status FROM orders WHERE material_id = $1 AND user_id = $2 AND status <> 'rejected'`, [m.id, req.user.id])
    : null;
  const settings = await getSettings();
  const sec = SECTION[m.section];
  const t = MATERIAL_TYPE[m.type];

  let action;
  if (!req.user) {
    action = html`<p class="muted">Материалды жүктеу үшін платформаға кіріңіз.</p><a class="btn" href="/login?next=/materials/${m.id}">Кіру</a> <a class="btn ghost" href="/register">Тіркелу</a>`;
  } else if (access) {
    action = html`<a class="btn lg" href="/materials/${m.id}/download">${icon(m.external_url ? 'ext' : 'download', 16)} ${m.external_url ? 'Сілтемені ашу' : 'Жүктеп алу'}</a>`;
  } else if (order) {
    action = html`<div class="notice warn"><div><b>Өтініміңіз әкімшінің растауын күтуде.</b> Төлем расталғанда материал осы бетте ашылады.</div></div>`;
  } else {
    action = html`
      ${settings.payment_info ? html`<div class="payinfo"><b>Төлем деректемелері</b><div>${settings.payment_info}</div></div>` : html`<p class="muted small">Төлем деректемелерін әкімші әлі енгізбеген.</p>`}
      <form class="form" method="post" action="/materials/${m.id}/order">
        ${csrfField(req)}
        <label class="fl">Төлем туралы белгі (кім атынан, қашан, түбіртек нөмірі)<textarea name="note" rows="2" maxlength="300" required></textarea></label>
        <button class="btn brass" type="submit">${icon('shop', 16)} Сатып алу өтінімін жіберу — ${fmtPrice(m.price)}</button>
      </form>`;
  }

  await page(req, res, {
    title: m.title, active: m.price > 0 ? 'shop' : 'library',
    body: html`
      <div class="view">
        <div class="crumbs"><a href="${m.price > 0 ? '/shop' : '/library'}">${m.price > 0 ? 'Ақылы материалдар' : 'Кітапхана'}</a><span>/</span><span>${t ? t.name : ''}</span></div>
        ${m.status !== 'published' ? html`<div class="notice warn"><div>Бұл материал ${m.status === 'pending' ? 'әкімшінің тексеруін күтуде' : 'жарияланбаған'} — оны тек сіз және әкімшілер көреді.${m.reject_reason ? ` Себебі: ${m.reject_reason}` : ''}</div></div>` : ''}
        <div class="detail">
          <section class="panel">
            <div class="mc-top">${fmtBadge(m)}<span class="mc-kind">${t ? t.name : ''}${sec ? ` · ${sec.name}` : ''}</span></div>
            <h1 style="font-family:var(--fd);font-size:clamp(22px,3vw,30px)">${m.title}</h1>
            ${m.exams.length ? html`<div class="tags">${m.exams.map((e) => html`<span class="tag">${EXAM[e] ? EXAM[e].name : e}</span>`)}</div>` : ''}
            ${m.description ? html`<p class="prose">${m.description}</p>` : html`<p class="muted">Сипаттама жоқ.</p>`}
          </section>
          <aside class="panel">
            <dl class="dl">
              <dt>Сынып</dt><dd>${m.grade ? `${m.grade}-сынып` : '7–11 сыныптар'}</dd>
              <dt>Бөлім</dt><dd>${sec ? sec.name : 'Жалпы'}</dd>
              <dt>Авторы</dt><dd>${m.author_name || '—'}${m.author_school ? html`<br><span class="muted small">${m.author_school}</span>` : ''}</dd>
              <dt>Жарияланды</dt><dd>${fmtDate(m.created_at)}</dd>
              ${m.file_size ? html`<dt>Көлемі</dt><dd>${fmtSize(m.file_size)}</dd>` : ''}
              <dt>Жүктелді</dt><dd>${m.downloads} рет</dd>
              <dt>Бағасы</dt><dd>${m.price > 0 ? html`<span class="price">${fmtPrice(m.price)}</span>` : html`<span class="free">тегін</span>`}</dd>
            </dl>
            <div class="stack">${action}</div>
          </aside>
        </div>
      </div>`,
  });
}));

router.get('/materials/:id/download', requireUser, asyncH(async (req, res) => {
  const m = await loadMaterial(req);
  if (!(await hasAccess(req.user, m))) {
    setFlash(res, 'info', m.price > 0 ? 'Бұл ақылы материал. Алдымен сатып алу өтінімін жіберіңіз.' : 'Материалға рұқсат жоқ.');
    return res.redirect(`/materials/${m.id}`);
  }
  if (m.author_id !== req.user.id) await q('UPDATE materials SET downloads = downloads + 1 WHERE id = $1', [m.id]);
  if (m.external_url) return res.redirect(m.external_url);
  const file = path.join(config.uploadDir, path.basename(m.file_key || ''));
  if (!m.file_key || !fs.existsSync(file)) throw new HttpError(404, 'Файл серверде табылмады. Әкімшіге хабарласыңыз.');
  res.setHeader('Content-Type', MIME[extOf(m.file_name)] || 'application/octet-stream');
  res.setHeader('Content-Disposition', contentDisposition(m.file_name));
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
}));

// ---------------- Жүктеу (мұғалім немесе әкімші) ----------------
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(config.uploadDir, { recursive: true }); cb(null, config.uploadDir); },
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}.${extOf(file.originalname)}`),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1, fields: 30 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXT.includes(extOf(file.originalname))) return cb(null, true);
    const err = new Error('Бұл файл түріне рұқсат жоқ.');
    err.code = 'BAD_EXT';
    cb(err);
  },
});

// Кейбір браузерлер мен multer нұсқалары файл атауын latin1 деп оқиды — кириллицаны қалпына келтіреміз.
// Атауда 0xFF-тен үлкен таңба болса, ол дұрыс оқылған деп есептейміз.
export const fixName = (name) => {
  const raw = String(name || '');
  if ([...raw].some((ch) => ch.codePointAt(0) > 0xff)) return raw;
  const s = Buffer.from(raw, 'latin1').toString('utf8');
  return s.includes('�') ? raw : s;
};

function uploadForm(req, res, { errors = [], v = {} } = {}) {
  const admin = isAdmin(req.user);
  const exams = asArray(v.exams);
  return page(req, res, {
    title: 'Материал жүктеу', active: 'library',
    body: html`
      <div class="panel" style="max-width:760px;margin-inline:auto;width:100%">
        <h2>Материал жүктеу</h2>
        <p class="muted">${admin ? 'Әкімші жүктеген материал бірден жарияланады.' : 'Материалды әкімші тексеріп, жариялайды. Бағасын ұсына аласыз, түпкілікті бағаны әкімші бекітеді.'} Рұқсат етілген файлдар: ${ALLOWED_EXT.join(', ')}; ең көбі ${config.maxUploadMb} МБ.</p>
        ${errors.length ? html`<div class="flash error" role="alert"><div>${errors.map((e) => html`<div>${e}</div>`)}</div></div>` : ''}
        <form class="form" method="post" action="/materials/new" enctype="multipart/form-data">
          ${csrfField(req)}
          <label class="fl"><span class="req">Атауы</span><input type="text" name="title" value="${v.title || ''}" maxlength="160" required></label>
          <label class="fl">Сипаттама (мазмұны, оқу мақсаттары, қалай қолдану керек)<textarea name="description" rows="4" maxlength="3000">${v.description || ''}</textarea></label>
          <div class="row3">
            <label class="fl"><span class="req">Түрі</span><select name="type">${MATERIAL_TYPES.map((t) => html`<option value="${t.k}"${sel(v.type === t.k)}>${t.name}</option>`)}</select></label>
            <label class="fl">Сынып<select name="grade"><option value="0">7–11 (жалпы)</option>${GRADES.map((g) => html`<option value="${g}"${sel(toInt(v.grade) === g)}>${g}-сынып</option>`)}</select></label>
            <label class="fl">Бөлім<select name="section"><option value="">Жалпы</option>${SECTIONS.map((s) => html`<option value="${s.k}"${sel(v.section === s.k)}>${s.name}</option>`)}</select></label>
          </div>
          <fieldset class="checks"><legend>Емтиханға дайындық</legend>
            ${EXAMS.map((e) => html`<label><input type="checkbox" name="exams" value="${e.k}"${chk(exams.includes(e.k))}> ${e.name}</label>`)}
          </fieldset>
          <div class="row2">
            <label class="fl">Файл<input type="file" name="file" accept="${ALLOWED_EXT.map((x) => `.${x}`).join(',')}"></label>
            <label class="fl">немесе сілтеме (Google Drive, YouTube т.б.)<input type="url" name="external_url" value="${v.external_url || ''}" placeholder="https://"></label>
          </div>
          <label class="fl">Бағасы, ₸ (0 — тегін)<input type="number" name="price" min="0" max="1000000" step="50" value="${v.price || 0}"></label>
          <div class="formfoot"><a class="linkbtn" href="${admin ? '/admin/materials' : '/cabinet'}">Бас тарту</a><button class="btn" type="submit">${icon('upload', 16)} Жүктеу</button></div>
        </form>
      </div>`,
  });
}

router.post('/materials/new', requireActiveTeacher, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err && (err.code === 'BAD_EXT' || err.code === 'LIMIT_FILE_SIZE')) {
      req.uploadError = err.code === 'BAD_EXT' ? err.message : `Файл тым үлкен (ең көбі ${config.maxUploadMb} МБ).`;
      return next();
    }
    next(err);
  });
}, csrfAfterUpload, asyncH(async (req, res) => {
  const b = req.body;
  const errors = req.uploadError ? [req.uploadError] : [];
  const title = cleanText(b.title, 160);
  const type = MATERIAL_TYPE[b.type] ? b.type : '';
  const grade = GRADES.includes(toInt(b.grade)) ? toInt(b.grade) : 0;
  const section = SECTION[b.section] ? b.section : '';
  const exams = asArray(b.exams).filter((e) => EXAM[e]);
  const price = Math.max(0, Math.min(1_000_000, toInt(b.price)));
  let url = cleanText(b.external_url, 500);
  if (url) {
    try {
      const u = new URL(url);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
      url = u.toString();
    } catch { errors.push('Сілтеме http:// немесе https:// арқылы басталуы керек.'); }
  }
  if (title.length < 3) errors.push('Атауын жазыңыз.');
  if (!type) errors.push('Материал түрін таңдаңыз.');
  if (!req.file && !url && !req.uploadError) errors.push('Файл жүктеңіз немесе сілтеме беріңіз.');
  if (errors.length) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(400);
    return uploadForm(req, res, { errors, v: b });
  }
  const admin = isAdmin(req.user);
  const m = await one(
    `INSERT INTO materials(title, description, type, grade, section, exams, price, file_key, file_name, file_size, file_mime, external_url, author_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [title, cleanMultiline(b.description, 3000), type, grade, section, exams, price,
      req.file ? req.file.filename : null, req.file ? fixName(req.file.originalname).slice(0, 200) : null,
      req.file ? req.file.size : null, req.file ? req.file.mimetype : null, req.file ? null : url,
      req.user.id, admin ? 'published' : 'pending']);
  setFlash(res, 'ok', admin ? 'Материал жарияланды.' : 'Материал жүктелді. Әкімші тексергеннен кейін кітапханада шығады.');
  res.redirect(`/materials/${m.id}`);
}));

// ---------------- Ақылы материалдар ----------------
router.get('/shop', asyncH(async (req, res) => {
  const section = SECTION[req.query.section] ? req.query.section : '';
  const params = [];
  let where = `status = 'published' AND price > 0`;
  if (section) { params.push(section); where += ` AND section = $1`; }
  const items = await many(`SELECT * FROM materials WHERE ${where} ORDER BY created_at DESC LIMIT 120`, params);
  const settings = await getSettings();
  const mine = req.user ? await many(
    `SELECT o.status, o.amount, o.created_at, m.id AS material_id, m.title FROM orders o JOIN materials m ON m.id = o.material_id
      WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 20`, [req.user.id]) : [];
  const pill = { pending: html`<span class="pill pending">күтуде</span>`, approved: html`<span class="pill ok">расталды</span>`, rejected: html`<span class="pill no">қабылданбады</span>` };
  await page(req, res, {
    title: 'Ақылы материалдар', active: 'shop',
    body: html`
      <div class="view">
        ${vhead('Ақылы материалдар', 'Авторлық курстар, толық ҚМЖ жинақтары, тест банктері. Төлемді әкімші растағаннан кейін материал сіз үшін ашылады.')}
        <ol class="steps">
          <li><b>Таңдаңыз</b><span>Материалды ашып, «Сатып алу өтінімін жіберу» батырмасын басыңыз.</span></li>
          <li><b>Төлеңіз</b><span>Деректемелер бойынша төлеп, өтінімге төлем туралы белгі қалдырыңыз.</span></li>
          <li><b>Алыңыз</b><span>Әкімші төлемді растағанда материал жүктеуге ашылады.</span></li>
        </ol>
        ${settings.payment_info ? html`<div class="payinfo"><b>Төлем деректемелері</b><div>${settings.payment_info}</div></div>` : ''}
        <div class="chips">
          <a class="chip plain${!section ? ' on' : ''}" href="/shop">Барлығы</a>
          ${SECTIONS.map((s) => html`<a class="chip ${FAMILIES[s.fam].css}${section === s.k ? ' on' : ''}" href="/shop?section=${s.k}"><i>${s.sym}</i>${s.name}</a>`)}
        </div>
        ${items.length ? html`<div class="mgrid">${items.map((m) => materialCard(m))}</div>`
          : emptyBox('Әзірге ақылы материал жоқ', 'Әкімші ақылы материалдарды жариялағанда осында шығады.')}
        ${mine.length ? html`<section class="block"><div class="block-h"><h2>Менің өтінімдерім</h2></div>
          <div class="list">${mine.map((o) => html`<div class="row"><div class="grow"><b><a href="/materials/${o.material_id}">${o.title}</a></b><span>${fmtPrice(o.amount)} · ${fmtDate(o.created_at)}</span></div>${pill[o.status]}</div>`)}</div></section>` : ''}
      </div>`,
  });
}));

router.post('/materials/:id/order', requireUser, asyncH(async (req, res) => {
  const m = await loadMaterial(req);
  if (m.status !== 'published' || m.price <= 0) throw new HttpError(400, 'Бұл материал сатылмайды.');
  if (await hasAccess(req.user, m)) return res.redirect(`/materials/${m.id}`);
  const note = cleanText(req.body.note, 300);
  if (note.length < 3) {
    setFlash(res, 'error', 'Төлем туралы белгі қалдырыңыз: кім атынан және қашан төленді.');
    return res.redirect(`/materials/${m.id}`);
  }
  try {
    await q('INSERT INTO orders(material_id, user_id, amount, note) VALUES ($1,$2,$3,$4)', [m.id, req.user.id, m.price, note]);
    setFlash(res, 'ok', 'Өтінім жіберілді. Әкімші төлемді растағанда материал ашылады.');
  } catch (err) {
    if (err.code !== '23505') throw err;
    setFlash(res, 'info', 'Бұл материалға өтінім бұрын жіберілген.');
  }
  res.redirect(`/materials/${m.id}`);
}));

import express from 'express';
import { FAMILIES, SECTION } from '../data/catalog.js';
import { grade5, LABS, labByKey, readCode, TOOLS } from '../data/labs.js';
import { SIMS } from '../data/sims.js';
import { requireActiveTeacher } from '../lib/auth.js';
import { many, q } from '../lib/db.js';
import { html, sel } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { csrfField, emptyBox, page, vhead } from '../lib/layout.js';
import { asArray, asyncH, cleanText, fmtDateTime, setFlash, toCsv, toInt } from '../lib/util.js';
import { materialCard } from './materials.js';

export const router = express.Router();

function labCard(L) {
  const sec = SECTION[L.s];
  return html`
    <article class="card ${FAMILIES[sec.fam].css}">
      <div class="card-top"><span class="glyph">${icon('lab')}</span><span class="no">№${L.no}</span><span class="cls">${L.g}-сынып</span></div>
      <h3><a href="/labs/${L.k}">${L.t}</a></h3>
      <p>${L.d}</p>
      <div class="tags">${L.o.map((o) => html`<span class="tag obj">${o}</span>`)}</div>
      <div class="card-foot"><span class="meta">${sec.name}</span><span class="open">Жұмысты бастау ${icon('arrow', 13)}</span></div>
    </article>`;
}

router.get('/labs', asyncH(async (req, res) => {
  const g = [7, 8, 9].includes(toInt(req.query.grade)) ? toInt(req.query.grade) : 0;
  const labs = LABS.filter((L) => !g || L.g === g);
  const uploaded = await many(`SELECT * FROM materials WHERE status = 'published' AND type = 'lab' ${g ? 'AND (grade = $1 OR grade = 0)' : ''} ORDER BY created_at DESC LIMIT 12`, g ? [g] : []);
  const sims = SIMS.filter((s) => !g || s.g <= g + 1);
  const teacher = req.user && (req.user.role === 'teacher' || req.user.role === 'admin');
  await page(req, res, {
    title: 'Зертханалар', active: 'labs',
    body: html`
      <div class="view">
        ${vhead('Зертханалық жұмыстар', 'Әр жұмыс — толық виртуалды зертхана: қауіпсіздік тесті, құралдармен өлшеу, кесте мен есептеу, қорытынды сұрақтары және 10 критерий бойынша автоматты баға. Жұмыс соңында оқушы нәтиже кодын алады да, мұғаліміне береді.',
          teacher ? html`<a class="btn" href="/teacher/labs">${icon('check', 16)} Нәтиже кодын тексеру</a>` : '')}
        <div class="seg" role="tablist" aria-label="Сынып">
          ${[0, 7, 8, 9].map((x) => html`<a href="/labs${x ? `?grade=${x}` : ''}" class="${g === x ? 'on' : ''}">${x ? `${x}-сынып` : 'Барлығы'}</a>`)}
        </div>
        <div class="notice"><div><b>Платформаға кіріп орындасаң</b>, нәтижең мұғаліміңнің журналына өзі түседі. Кірмей орындасаң, жұмыстың соңында шыққан <b>нәтиже кодын</b> толық көшіріп, мұғаліміңе жібер — мұғалім оны «Нәтиже кодын тексеру» бетінде журналға жазады. Кодты қолмен өзгертуге болмайды: бір таңба ауысса, код қабылданбайды.</div></div>
        ${[7, 8, 9].filter((x) => !g || x === g).map((x) => {
          const list = labs.filter((L) => L.g === x);
          return html`<section class="shelf"><div class="shelf-h"><h2>${x}-сынып</h2><span class="cnt">${list.length} жұмыс</span></div><div class="rule"></div><div class="grid">${list.map(labCard)}</div></section>`;
        })}
        <section class="shelf">
          <div class="shelf-h"><h2>Виртуалды зертхана ретінде симуляциялар</h2><span class="cnt">${sims.length}</span><a class="more push" href="/sims">Барлығы →</a></div>
          <div class="rule"></div>
          <div class="grid">${sims.slice(0, 6).map((s) => html`<article class="card ${FAMILIES[SECTION[s.s].fam].css}"><div class="card-top"><span class="glyph">${icon('sim')}</span><span class="cls">${s.g}-сынып</span></div><h3><a href="/sims/${s.k}">${s.t}</a></h3><p>${s.d}</p></article>`)}</div>
        </section>
        ${uploaded.length ? html`<section class="shelf"><div class="shelf-h"><h2>Мұғалімдер жүктеген зертханалық жұмыстар</h2><span class="cnt">${uploaded.length}</span></div><div class="rule"></div><div class="mgrid">${uploaded.map((m) => materialCard(m))}</div></section>` : ''}
        <section class="shelf">
          <div class="shelf-h"><h2>Құралдар</h2><span class="cnt">сабақта пайдалануға</span></div>
          <div class="rule"></div>
          <div class="grid">${TOOLS.map((t) => html`<article class="card"><div class="card-top"><span class="glyph brass">${icon('ruler')}</span></div><h3><a href="${t.u}" target="_blank" rel="noopener">${t.t}</a></h3><p>${t.d}</p><div class="card-foot"><span class="open">Ашу ${icon('ext', 13)}</span></div></article>`)}</div>
        </section>
      </div>`,
  });
}));

// ---------------- Мұғалім: кодтарды тексеру және журнал ----------------
function critHtml(crit) {
  return html`<span class="kcrit">${String(crit || '').split('').map((c, i) => html`<span class="kc ${c === '1' ? 'y' : 'n'}">К${i + 1}${c === '1' ? ' ✓' : ' ✗'}</span>`)}</span>`;
}
const g5 = (score) => { const g = grade5(score); return html`<span class="g5 g5-${g}">${g}</span>`; };

async function journal(teacherId, cls, lab) {
  const params = [teacherId];
  let where = 'teacher_id = $1';
  if (cls) { params.push(cls); where += ` AND class_label = $${params.length}`; }
  if (lab) { params.push(lab); where += ` AND lab_key = $${params.length}`; }
  return many(`SELECT * FROM lab_results WHERE ${where} ORDER BY class_label, student_name, lab_key`, params);
}

async function teacherLabsPage(req, res, { checked = null, text = '' } = {}) {
  const cls = cleanText(req.query.cls, 20);
  const lab = labByKey(req.query.lab) ? req.query.lab : '';
  const view = req.query.view === 'matrix' ? 'matrix' : 'list';
  const rows = await journal(req.user.id, cls, view === 'matrix' ? '' : lab);
  const classes = (await many('SELECT DISTINCT class_label FROM lab_results WHERE teacher_id = $1 ORDER BY class_label', [req.user.id])).map((r) => r.class_label);
  const valid = checked ? checked.filter((r) => !r.bad) : [];

  let table;
  if (!rows.length) {
    table = emptyBox('Журнал бос', 'Оқушылардың нәтиже кодтарын жоғарыдағы өріске қойып, тексеріп, журналға жазыңыз.');
  } else if (view === 'matrix') {
    const labsUsed = LABS.filter((L) => rows.some((r) => r.lab_key === L.k));
    const students = [...new Map(rows.map((r) => [`${r.class_label}|${r.student_name}`, r])).values()];
    const cell = (s, L) => rows.find((r) => r.lab_key === L.k && r.student_name === s.student_name && r.class_label === s.class_label);
    table = html`<div class="tblwrap"><table><thead><tr><th>Аты-жөні</th><th>Сынып</th>${labsUsed.map((L) => html`<th class="num" title="${L.t}">${L.g}·№${L.no}</th>`)}<th class="num">Орташа</th></tr></thead>
      <tbody>${students.map((s) => {
        const cells = labsUsed.map((L) => cell(s, L));
        const got = cells.filter(Boolean);
        const avg = got.length ? (got.reduce((a, r) => a + grade5(r.score), 0) / got.length).toFixed(1).replace('.', ',') : '—';
        return html`<tr><td>${s.student_name}</td><td>${s.class_label}</td>${cells.map((r) => html`<td class="num">${r ? g5(r.score) : '—'}</td>`)}<td class="num">${avg}</td></tr>`;
      })}</tbody></table></div>`;
  } else {
    table = html`<div class="tblwrap"><table><thead><tr><th>Аты-жөні</th><th>Сынып</th><th>Жұмыс</th><th>Нұсқа</th><th class="num">Балл</th><th class="num">Баға</th><th>Критерийлер</th><th>Орындалды</th><th>Дереккөз</th><th></th></tr></thead>
      <tbody>${rows.map((r) => { const L = labByKey(r.lab_key); return html`<tr>
        <td>${r.student_name}</td><td>${r.class_label}</td><td class="wrap">${L ? html`<a href="/labs/${L.k}?panel=1" title="Зертхана ішіндегі мұғалім панелі">${L.g}-сынып №${L.no}. ${L.t}</a>` : r.lab_key}</td><td>${r.variant}</td>
        <td class="num">${String(r.score).replace('.', ',')} / 10</td><td class="num">${g5(r.score)}</td><td>${critHtml(r.crit)}</td><td>${r.done_at}</td>
        <td>${r.source === 'online' ? html`<span class="pill ok">платформа</span>` : html`<span class="pill">код</span>`}</td>
        <td><form method="post" action="/teacher/labs/${r.id}/delete" data-confirm="Жазба өшірілсін бе?">${csrfField(req)}<button class="btn warn sm" type="submit">Өшіру</button></form></td></tr>`; })}</tbody></table></div>`;
  }

  await page(req, res, {
    title: 'Зертхана нәтижелері', active: 'cabinet',
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/cabinet">Кабинет</a><span>/</span><span>Зертхана нәтижелері</span></div>
        ${vhead('Зертхана нәтижелері', 'Платформада орындалған жұмыстар журналға өздігінен түседі («платформа»). Платформадан тыс орындалған жұмыстың нәтиже кодын төменде тексеріп, журналға жазыңыз («код»). Журнал тек сізге көрінеді; оқушы жұмысты қайта тапсырса, жазба соңғы нәтижемен жаңартылады.')}
        <section class="panel">
          <form class="form" method="post" action="/teacher/labs/check">
            ${csrfField(req)}
            <label class="fl">Нәтиже кодтары (әр кодты жаңа жолдан)<textarea name="codes" rows="4" placeholder="J77.eyJuIjoi… .1a2b3c" required>${text}</textarea></label>
            <div class="formfoot"><button class="btn" type="submit">Тексеру</button></div>
          </form>
          ${checked ? html`<div class="list">${checked.map((r) => r.bad
            ? html`<div class="row"><span class="pill no">қате</span><div class="grow"><b class="mono">${r.code.slice(0, 40)}${r.code.length > 40 ? '…' : ''}</b><span>${r.bad}</span></div></div>`
            : html`<div class="row"><span class="pill ok">дұрыс</span><div class="grow"><b>${r.name}${r.cls ? ` · ${r.cls}` : ''}</b><span>${r.lab.g}-сынып №${r.lab.no}. ${r.lab.t}${r.variant ? ` · нұсқа ${r.variant}` : ''} · ${r.at}</span></div>${g5(r.score)}<span class="mono">${String(r.score).replace('.', ',')} / 10</span>${critHtml(r.crit)}</div>`)}</div>
            ${valid.length ? html`<form method="post" action="/teacher/labs/save">${csrfField(req)}${valid.map((r) => html`<input type="hidden" name="codes" value="${r.code}">`)}
              <button class="btn okb" type="submit">${icon('check', 16)} ${valid.length} нәтижені журналға жазу</button></form>` : ''}` : ''}
          <p class="hint">Код оқушының зертханадағы «Тапсыру» бетінде шығады. Әр кодтың ішінде жұмыстың атауы, оқушының аты-жөні, нұсқасы, балы мен критерийлері жазылған және қолдан өзгертуден қорғалған.</p>
        </section>
        <section class="block">
          <div class="block-h"><h2>Журнал</h2><span class="cnt">${rows.length} жазба</span>
            <a class="btn ghost sm push" href="/teacher/labs/export.csv?${new URLSearchParams({ cls, lab })}">${icon('download', 14)} Excel (CSV)</a></div>
          <form class="filters" method="get" action="/teacher/labs" data-autosubmit>
            <label class="fl">Көрініс<select name="view"><option value="list">Тізім</option><option value="matrix"${sel(view === 'matrix')}>Жиынтық кесте</option></select></label>
            <label class="fl">Сынып<select name="cls"><option value="">Барлығы</option>${classes.map((c) => html`<option${sel(c === cls)}>${c}</option>`)}</select></label>
            ${view === 'list' ? html`<label class="fl">Жұмыс<select name="lab"><option value="">Барлығы</option>${LABS.map((L) => html`<option value="${L.k}"${sel(L.k === lab)}>${L.g}-сынып №${L.no}. ${L.t}</option>`)}</select></label>` : ''}
          </form>
          ${table}
        </section>
      </div>`,
  });
}

router.get('/teacher/labs', requireActiveTeacher, asyncH(async (req, res) => teacherLabsPage(req, res)));

router.post('/teacher/labs/check', requireActiveTeacher, asyncH(async (req, res) => {
  const text = String(req.body.codes || '').slice(0, 20000);
  const codes = text.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 60);
  const checked = codes.map((c) => ({ code: c, ...readCode(c) }));
  await teacherLabsPage(req, res, { checked, text });
}));

router.post('/teacher/labs/save', requireActiveTeacher, asyncH(async (req, res) => {
  const codes = asArray(req.body.codes).slice(0, 60);
  let saved = 0;
  for (const c of codes) {
    const r = readCode(c);
    if (r.bad) continue;
    await q(`INSERT INTO lab_results(teacher_id, lab_key, student_name, class_label, variant, score, crit, done_at, code)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (teacher_id, lab_key, student_name, class_label)
             DO UPDATE SET variant = EXCLUDED.variant, score = EXCLUDED.score, crit = EXCLUDED.crit,
                           done_at = EXCLUDED.done_at, code = EXCLUDED.code, created_at = now()`,
    [req.user.id, r.lab.k, r.name, r.cls, r.variant, r.score, r.crit, r.at, r.code]);
    saved++;
  }
  setFlash(res, 'ok', `Журналға ${saved} нәтиже жазылды.`);
  res.redirect('/teacher/labs');
}));

router.post('/teacher/labs/:id/delete', requireActiveTeacher, asyncH(async (req, res) => {
  await q('DELETE FROM lab_results WHERE id = $1 AND teacher_id = $2', [toInt(req.params.id), req.user.id]);
  res.redirect('/teacher/labs');
}));

router.get('/teacher/labs/export.csv', requireActiveTeacher, asyncH(async (req, res) => {
  const cls = cleanText(req.query.cls, 20);
  const lab = labByKey(req.query.lab) ? req.query.lab : '';
  const rows = await journal(req.user.id, cls, lab);
  const out = [['Аты-жөні', 'Сынып', 'Сынып (жұмыс)', 'Жұмыс №', 'Жұмыс атауы', 'Оқу мақсаттары', 'Нұсқа', 'Балл (10)', 'Баға (5)', 'Критерийлер', 'Орындалды', 'Журналға жазылды']];
  for (const r of rows) {
    const L = labByKey(r.lab_key);
    out.push([r.student_name, r.class_label, L ? L.g : '', L ? L.no : '', L ? L.t : r.lab_key, L ? L.o.join(', ') : '', r.variant,
      String(r.score).replace('.', ','), grade5(r.score), r.crit, r.done_at, fmtDateTime(r.created_at)]);
  }
  res.type('text/csv; charset=utf-8').attachment('zerthana-zhurnaly.csv').send(toCsv(out));
}));

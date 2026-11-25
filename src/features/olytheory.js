// Ресми олимпиаданың теориялық туры онлайн: оқушы әр есептің соңғы жауабын (сан немесе формула) жазады,
// «Тексеру» басқанда сайт бірден тексереді, содан кейін әр есептің талдауы, ресми шешімі және жиі кездесетін қатесі ашылады.
import '../../public/js/expr-core.js';
import express from 'express';
import { autoMax, fullMax, THEORY_ROUND } from '../data/olympiad-theory.js';
import { many, q } from '../lib/db.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { csrfField, page } from '../lib/layout.js';
import { tex, texText } from '../lib/tex.js';
import { asyncH, fmtDateTime, HttpError } from '../lib/util.js';

export const router = express.Router();
const E = globalThis.ExprCore;
const SAMPLES = 8;
const REL = 1e-6;

const close = (x, y, tol) => Number.isFinite(x) && Math.abs(x - y) <= tol * Math.max(Math.abs(y), 1e-12);

// Бір жауапты тексеру: { status: ok|wrong|error|empty, msg, tex }
export function checkAnswer(a, input) {
  const src = String(input ?? '').trim().slice(0, 300);
  if (!src) return { status: 'empty' };
  let ast;
  try { ast = E.parse(src, a.type === 'expr' ? a.vars : []); } catch (e) {
    if (!e.expr) throw e;
    return { status: 'error', msg: e.message };
  }
  const studentTex = E.toTex(ast);
  if (a.type === 'num') {
    const x = E.evaluate(ast, {});
    if (close(x, a.value, a.tol)) return { status: 'ok', tex: studentTex };
    if (a.trap && close(x, a.trap.value, 0.005)) return { status: 'wrong', tex: studentTex, msg: a.trap.msg };
    for (const k of [1000, 0.001]) if (close(x, a.value * k, a.tol)) return { status: 'wrong', tex: studentTex, msg: `Сан дұрыс сияқты, бірақ өлшем бірлігін тексер: жауапты ${a.unit} бойынша жаз.` };
    return { status: 'wrong', tex: studentTex };
  }
  for (let i = 0; i < SAMPLES; i++) {
    const scope = a.sample();
    let got;
    try { got = E.evaluate(ast, scope); } catch { return { status: 'error', tex: studentTex, msg: 'Формуланы есептеу мүмкін болмады.' }; }
    if (!close(got, a.f(scope), REL)) return { status: 'wrong', tex: studentTex };
  }
  return { status: 'ok', tex: studentTex };
}

const field = (p, a) => `a_${p.n}_${a.id}`;

export function gradeRound(r, body) {
  let score = 0, right = 0, total = 0;
  const items = {};
  for (const p of r.problems) {
    for (const a of p.answers) {
      total++;
      const input = String(body[field(p, a)] ?? '').slice(0, 300);
      const res = checkAnswer(a, input);
      if (res.status === 'ok') { score += a.pts; right++; }
      items[field(p, a)] = { ...res, input };
    }
  }
  return { score, max: autoMax(r), right, total, items };
}

async function bestResults(k) {
  return many(
    `SELECT u.full_name, s.name AS school_name, c.grade, c.letter, max(a.score) AS best
       FROM olympiad_attempts a JOIN users u ON u.id = a.user_id
  LEFT JOIN schools s ON s.id = u.school_id LEFT JOIN classes c ON c.id = u.class_id
      WHERE a.test_key = $1 AND u.status <> 'blocked'
   GROUP BY u.id, s.name, c.grade, c.letter ORDER BY best DESC LIMIT 10`, [k]);
}

const STATUS = {
  ok: ['ok', 'Дұрыс'], wrong: ['no', 'Қате'], error: ['pending', 'Жазуында қате'], empty: ['no', 'Жауап жоқ'],
};

function answerField(p, a, result) {
  const name = field(p, a);
  const r = result ? result.items[name] : null;
  const st = r ? STATUS[r.status] : null;
  return html`
    <div class="th-ans${r ? ` th-${r.status}` : ''}">
      <label class="th-row">
        <span class="th-label">${tex(`${a.label} =`)}</span>
        <input type="text" name="${name}" value="${r ? r.input : ''}" autocomplete="off" spellcheck="false" inputmode="${a.type === 'num' ? 'decimal' : 'text'}"
          data-vars="${a.type === 'expr' ? a.vars.join(',') : ''}" placeholder="${a.type === 'num' ? 'сан, мысалы 2,5 немесе 3·10^4' : 'формула'}"${result ? ' readonly' : ''}>
        ${a.unit ? html`<span class="th-unit">${a.unit}</span>` : ''}
      </label>
      ${a.type === 'expr' && !result ? html`<div class="th-vars">Шамалар: ${a.vars.map((v) => html`<button type="button" class="th-var" data-insert="${v}">${v}</button>`)}
        <span class="muted small">· амалдар: + − * / ^ ( ), sqrt( ), pi</span></div>` : ''}
      <div class="th-preview" aria-live="polite"></div>
      ${r ? html`<div class="th-res">
        <span class="pill ${st[0]}">${st[1]}${r.status === 'ok' ? ` · +${a.pts} ұпай` : ''}</span>
        ${r.tex && r.status !== 'ok' ? html`<span class="th-yours">Сенің жауабың: ${tex(r.tex)}</span>` : ''}
        ${r.msg ? html`<span class="th-msg" translate="no">${texText(r.msg)}</span>` : ''}
        ${r.status !== 'ok' ? html`<span class="th-right">Дұрыс жауап: ${tex(a.tex)}</span>` : ''}
      </div>` : ''}
    </div>`;
}

function problemBlock(r, p, result, lang) {
  const c = lang === 'kk' ? p.cond.kk : p.cond.ru;
  const got = result ? p.answers.reduce((s, a) => s + (result.items[field(p, a)].status === 'ok' ? a.pts : 0), 0) : 0;
  const autoPts = p.answers.reduce((s, a) => s + a.pts, 0);
  return html`
    <article class="panel th-prob" id="p${p.n}">
      <div class="th-h"><span class="op-no mono">${p.n}</span><h2>${p.t}</h2><span class="pill">${p.pts} ұпай</span>
        ${result ? html`<span class="th-got mono">${got} / ${autoPts}</span>` : ''}</div>
      <img class="th-cond" src="${p.dir}/${c[0]}" width="${c[1]}" height="${c[2]}" alt="${p.n}-есептің шарты" loading="${p.n > 1 ? 'lazy' : 'eager'}">
      ${!result ? html`<details class="op-d"><summary>${icon('target', 15)} Кеңес (шешімді ашпайды)</summary><div translate="no">${texText(p.hint)}</div></details>` : ''}
      <div class="th-answers">${p.answers.map((a) => answerField(p, a, result))}</div>
      ${result && p.self.length ? html`<div class="th-self"><b>Өзіңді тексер (автоматты тексерілмейді):</b>
        ${p.self.map((s) => html`<label class="th-selfitem"><input type="checkbox" data-self="${s.pts}"> <span translate="no">${texText(s.text)}</span><span class="muted small th-selfpts">(${s.pts} ұпай)</span></label>`)}</div>` : ''}
      ${result ? html`
        <details class="op-d th-analysis" open><summary>${icon('formula', 15)} Талдау: қадамдап шешу</summary>
          <ol class="op-steps" translate="no">${p.analysis.map((x) => html`<li>${texText(x)}</li>`)}</ol>
          ${p.mistake ? html`<p class="th-mistake"><b>Жиі кездесетін қате:</b> <span translate="no">${texText(p.mistake)}</span></p>` : ''}
          ${p.note ? html`<div class="th-note">${icon('info', 15)}<div><b>Ресми шешім туралы ескерту.</b> <span translate="no">${texText(p.note)}</span></div></div>` : ''}
        </details>
        <details class="op-d"><summary>${icon('book', 15)} Ресми шешім және бағалау кестесі («Дарын»)</summary>
          <div class="th-sol">${p.sol.map(([fn, w, h]) => html`<img src="${p.dir}/${fn}" width="${w}" height="${h}" alt="Ресми шешім" loading="lazy">`)}</div>
        </details>` : ''}
    </article>`;
}

async function roundPage(req, res, r, result) {
  const board = await bestResults(r.k);
  const mine = req.user ? await many('SELECT score, max_score, created_at FROM olympiad_attempts WHERE user_id = $1 AND test_key = $2 ORDER BY created_at DESC LIMIT 5', [req.user.id, r.k]) : [];
  const lang = req.lang || 'kk';
  const max = autoMax(r), full = fullMax(r);
  await page(req, res, {
    title: `Олимпиада ${r.year}: ${r.g}-сынып, теориялық тур`, active: 'olympiad', katex: true,
    scripts: ['/vendor/katex/katex.min.js', '/js/expr-core.js', '/js/olymp-theory.js'],
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/olympiad">Олимпиадалық есептер</a><span>/</span><span>${r.stage}, ${r.g}-сынып, теориялық тур</span></div>
        <div class="vhead"><div><p class="eyebrow">${r.stage} · ${r.year} оқу жылы · ${r.minutes / 60} сағат</p><h1>${r.g}-сынып: теориялық тур</h1>
          <p>${r.title}. ${r.problems.length} есеп, барлығы ${full} ұпай. Әр есептің соңғы жауабын сан немесе формула түрінде жаз — «Тексеру» басқанда сайт бірден тексереді, содан кейін әр есептің талдауы мен ресми шешімі ашылады. Сызба мен шарттарды (${full - max} ұпай) ресми шешіммен өзің салыстырасың.</p></div></div>
        ${result ? html`
          <section class="panel ot-result" id="result">
            <div class="ot-score"><b data-th-score="${result.score}">${result.score}</b><span>/ ${max} ұпай</span></div>
            <div class="grow"><h2>${result.score >= max * 0.8 ? 'Керемет нәтиже!' : result.score >= max * 0.5 ? 'Жақсы нәтиже' : 'Тағы жаттығу керек'}</h2>
              <p>Дұрыс жауап: ${result.right} / ${result.total}. Автоматты тексерілген ұпай: ${result.score} / ${max}. Төменде әр есептің талдауын оқып, өз жауабыңмен салыстыр.</p>
              <p class="th-selftotal" hidden>Өзің бағалаған сызба мен шарттармен: <b data-th-total>${result.score}</b> / ${full} ұпай</p>
              ${req.user ? html`<p class="muted small">Нәтиже сақталды.</p>` : html`<p class="muted small">Нәтижеңді сақтау үшін <a href="/login?next=/olympiad/round/${r.k}">кір</a> немесе <a href="/register">тіркел</a>.</p>`}</div>
            <a class="btn" href="/olympiad/round/${r.k}">${icon('reset', 15)} Қайта шешу</a>
          </section>` : ''}
        <div class="ot-wrap">
          <form class="stack" method="post" action="/olympiad/round/${r.k}#result" id="thForm">
            ${csrfField(req)}
            ${!result ? html`<div class="panel th-help"><b>${icon('info', 15)} Жауапты қалай жазу керек?</b>
              <ul><li><b>Сан:</b> <code>14.1</code>, <code>2,16·10^3</code> — өлшем бірлігі өрістің жанында жазылған.</li>
                <li><b>Формула:</b> берілген шамалармен: <code>d*R/(d-R)</code>, <code>2(m1+m2)/(m1-m2)</code>, <code>sqrt(V1*V3)</code>, <code>pi*sqrt(L*C)</code>. Көбейту белгісін жазбауға болады: <code>dR</code> = <code>d*R</code>. ε — <code>eps</code>, ε₀ — <code>e0</code>.</li>
                <li>Формула өрістің астында математикалық түрде көрсетіледі — дұрыс түсінілгенін тексер.</li></ul></div>` : ''}
            ${r.problems.map((p) => problemBlock(r, p, result, lang))}
            ${!result ? html`<div class="panel exam-foot"><p class="muted small">Барлық есептің жауабын жазып болған соң «Тексеру» батырмасын бас. Жауап берілмеген сұрақ 0 ұпай. Жауапсыз тексерсең де, әр есептің талдауы ашылады.</p><button class="btn lg" type="submit">${icon('check', 16)} Тексеру</button></div>` : ''}
          </form>
          <aside class="stack ot-side">
            ${mine.length ? html`<div class="panel"><h2>Менің нәтижелерім</h2><ol class="board">${mine.map((m) => html`<li><span class="grow">${fmtDateTime(m.created_at)}</span><span class="mono">${m.score} / ${m.max_score}</span></li>`)}</ol></div>` : ''}
            <div class="panel"><h2>${icon('trophy')} Үздік нәтижелер</h2>
              ${board.length ? html`<ol class="board">${board.map((b) => html`<li><span class="grow"><b>${b.full_name}</b><span>${[b.grade ? `${b.grade}${b.letter || ''}` : '', b.school_name].filter(Boolean).join(' · ')}</span></span><span class="mono">${b.best}</span></li>`)}</ol>`
                : html`<p class="muted small">Әлі ешкім тапсырған жоқ — бірінші бол!</p>`}
            </div>
            <div class="panel"><h2>Кеңес</h2><p class="muted small">Олимпиадада ұпай шешімнің әр қадамына беріледі. Тексергеннен кейін ресми шешімдегі бағалау кестесін қарап, өз шешіміңнің қай қадамына қанша ұпай алатыныңды есепте.</p></div>
          </aside>
        </div>
      </div>`,
  });
}

router.get('/olympiad/round/:k', asyncH(async (req, res) => {
  const r = THEORY_ROUND[req.params.k];
  if (!r) throw new HttpError(404, 'Тур табылмады.');
  await roundPage(req, res, r, null);
}));

router.post('/olympiad/round/:k', asyncH(async (req, res) => {
  const r = THEORY_ROUND[req.params.k];
  if (!r) throw new HttpError(404, 'Тур табылмады.');
  const result = gradeRound(r, req.body || {});
  if (req.user) {
    await q('INSERT INTO olympiad_attempts(user_id, test_key, score, max_score, correct_count, total) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.id, r.k, result.score, result.max, result.right, result.total]);
  }
  await roundPage(req, res, r, result);
}));

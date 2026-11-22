// Емтихан тапсырмаларына ортақ логика: бағалау, тапсырмаларды таңдау, сұрақты HTML-ге салу.
import { asset } from './assets.js';
import { many } from './db.js';
import { html, raw } from './html.js';
import { richText } from './richtext.js';

const LETTERS = 'ABCDEF';

// Оқушы жазған санды оқу: «0,25», «22.95 км», «1/4» сияқты жазбаларды қабылдайды.
export function parseNumber(v) {
  const s = String(v ?? '').replace(/\s+/g, '').replace(/,/g, '.').replace(/−/g, '-');
  const fr = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
  if (fr && +fr[2] !== 0) return +fr[1] / +fr[2];
  const m = s.match(/^-?\d+(?:\.\d+)?/);
  return m ? +m[0] : NaN;
}

// Бағалау ережелері:
//   single — 1 балл; multi — бәрі дұрыс 2 балл, бір қате 1 балл;
//   matrix — барлық жол дұрыс болса ғана 1 балл; number — рұқсат етілген ауытқу шегінде 1 балл;
//   open — автоматты бағаланбайды (open: true), ұпайын мұғалім қояды.
export function gradeAnswer(question, answer) {
  const kind = question.kind;
  if (kind === 'open') {
    return { points: 0, max: question.points || 1, ok: false, open: true, text: String(answer ?? '').trim().slice(0, 4000) };
  }
  if (kind === 'number') {
    const v = parseNumber(Array.isArray(answer) ? answer[0] : answer);
    const tol = (question.options && +question.options.tol) || 0;
    const ok = Number.isFinite(v) && question.correct.some((c) => Math.abs(v - c) <= tol + 1e-9);
    return { points: ok ? 1 : 0, max: 1, ok };
  }
  if (kind === 'matrix') {
    const rows = question.options.rows.length;
    const a = Array.isArray(answer) ? answer : [];
    let ok = true;
    for (let i = 0; i < rows; i++) if (a[i] === null || a[i] === undefined || a[i] === '' || Number(a[i]) !== question.correct[i]) ok = false;
    return { points: ok ? 1 : 0, max: 1, ok };
  }
  const correct = new Set(question.correct);
  const chosen = new Set((Array.isArray(answer) ? answer : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < question.options.length));
  if (kind === 'single') {
    const ok = chosen.size === 1 && correct.has([...chosen][0]);
    return { points: ok ? 1 : 0, max: 1, ok };
  }
  let errors = 0;
  for (const c of correct) if (!chosen.has(c)) errors++;
  for (const c of chosen) if (!correct.has(c)) errors++;
  const points = errors === 0 ? 2 : errors === 1 ? 1 : 0;
  return { points, max: 2, ok: errors === 0 };
}

// Жауап берілді ме (бос жауапты ажырату үшін).
export function isAnswered(question, answer) {
  if (question.kind === 'open' || question.kind === 'number') return String(Array.isArray(answer) ? answer[0] ?? '' : answer ?? '').trim() !== '';
  if (question.kind === 'matrix') return Array.isArray(answer) && answer.some((x) => x !== null && x !== undefined && x !== '');
  return Array.isArray(answer) && answer.length > 0;
}

// Тапсырмаларды кездейсоқ таңдау (контекстік блоктар бөлінбейді). n = 0 болса — барлығы.
export async function pickUnitIds(exam, { domain = '', section = '', n = 10 } = {}) {
  const params = [exam];
  let where = 'u.exam = $1';
  if (domain) { params.push(domain); where += ` AND u.domain = $${params.length}`; }
  if (section) { params.push(section); where += ` AND u.section = $${params.length}`; }
  const units = await many(
    `SELECT u.id, (SELECT count(*) FROM exam_questions q WHERE q.unit_id = u.id) AS n FROM exam_units u WHERE ${where} ORDER BY random()`, params);
  const chosen = [];
  let count = 0;
  for (const u of units) {
    if (n && count >= n) break;
    if (!u.n) continue;
    if (n && count + u.n > n + 1 && chosen.length) continue;
    chosen.push(u.id);
    count += u.n;
  }
  return chosen;
}

// Блоктарды сұрақтарымен бірге жүктеу. full = true болса — дұрыс жауап пен түсіндірме де қосылады.
export async function loadUnits(unitIds, { full = false } = {}) {
  if (!unitIds.length) return [];
  const units = await many('SELECT id, exam, domain, title, context, image, section FROM exam_units WHERE id = ANY($1)', [unitIds]);
  const qs = await many(
    `SELECT id, unit_id, kind, stem, options, image, points${full ? ', correct, explanation, rubric' : ''}
       FROM exam_questions WHERE unit_id = ANY($1) ORDER BY unit_id, ord, id`, [unitIds]);
  const byId = new Map(units.map((u) => [u.id, u]));
  return unitIds.map((id) => byId.get(id)).filter(Boolean)
    .map((u) => ({ ...u, questions: qs.filter((x) => x.unit_id === u.id) }));
}

// Сурет сілтемесі: «/…» — сайттың өз файлы, әйтпесе — әкімші жүктеген файлдың кілті.
export const imageUrl = (image) => (image.startsWith('/') ? asset(image) : `/exams/img/${encodeURIComponent(image)}`);
const figure = (image, alt) => (image ? html`<a class="q-fig" href="${imageUrl(image)}" target="_blank" rel="noopener" title="Үлкейтіп ашу"><img src="${imageUrl(image)}" alt="${alt}" loading="lazy"></a>` : '');

function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
}

const KIND_PILL = {
  multi: 'бірнеше дұрыс жауап', matrix: 'әр жолға бір жауап', number: 'жауабын жаз', open: 'ашық жауап · мұғалім бағалайды',
};

// Сұрақты салу.
//   o.review — нәтиже режимі: o.answer (оқушы жауабы), o.res ({p, m} — p null болса, тексеру күтілуде),
//   o.showKey — дұрыс жауап пен түсіндірмені көрсету; o.practice — «Тексеру» батырмасы (жаттығу режимі).
export function questionHtml(qq, no, o = {}) {
  const { review = false, answer, res = null, showKey = false, practice = false, selfCheck = false } = o;
  const dis = review ? raw(' disabled') : '';
  const name = `q${qq.id}`;
  let cls = '';
  if (review && res) cls = res.p === null ? ' q-wait' : res.p >= res.m ? ' q-ok' : res.p > 0 ? ' q-part' : ' q-bad';
  let body;
  if (qq.kind === 'matrix') {
    const a = Array.isArray(answer) ? answer : [];
    body = html`<div class="tblwrap"><table class="qmatrix"><thead><tr><th>Тұжырым</th>${qq.options.cols.map((c) => html`<th class="num">${c}</th>`)}</tr></thead>
      <tbody>${qq.options.rows.map((r, i) => html`<tr><td class="wrap">${r}</td>${qq.options.cols.map((c, j) => {
        const picked = a[i] !== null && a[i] !== undefined && a[i] !== '' && Number(a[i]) === j;
        const mark = review && showKey ? (qq.correct[i] === j ? ' right' : picked ? ' wrong' : '') : '';
        return html`<td class="num${mark}"><input type="radio" name="${name}r${i}" value="${j}" aria-label="${r}: ${c}"${picked ? raw(' checked') : ''}${dis}></td>`;
      })}</tr>`)}</tbody></table></div>`;
  } else if (qq.kind === 'number') {
    const val = review ? String(Array.isArray(answer) ? answer[0] ?? '' : answer ?? '') : '';
    body = html`<label class="q-num"><span>Жауап:</span><input type="text" inputmode="decimal" name="${name}" value="${val}" autocomplete="off" maxlength="30"${dis}>${qq.options.unit ? html`<span>${qq.options.unit}</span>` : ''}</label>`;
  } else if (qq.kind === 'open') {
    body = review
      ? html`<div class="q-open">${String(answer ?? '').trim() ? String(answer) : html`<i class="muted">Жауап жазылмаған</i>`}</div>`
      : html`<textarea name="${name}" rows="4" maxlength="4000" placeholder="Жауабыңды осында жаз"></textarea>`;
  } else {
    const multi = qq.kind === 'multi';
    const order = review ? qq.options.map((_, i) => i) : shuffled(qq.options.length);
    const chosen = new Set((Array.isArray(answer) ? answer : []).map(Number));
    body = html`<div class="q-opts">${order.map((i, pos) => {
      const mark = review && showKey ? (qq.correct.includes(i) ? ' right' : chosen.has(i) ? ' wrong' : '') : '';
      return html`<label class="qopt${mark}"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${i}"${chosen.has(i) ? raw(' checked') : ''}${dis}><span class="q-l" translate="no">${LETTERS[pos]}</span><span>${qq.options[i]}</span></label>`;
    })}</div>`;
  }
  let fb = '';
  if (review && res) {
    if (qq.kind === 'open') {
      fb = res.p === null
        ? html`<p class="q-fb"><b>Мұғалімнің тексеруін күтуде.</b> Ең көбі ${res.m} балл.</p>`
        : res.self
          ? html`<p class="q-fb"><b>Өзіңді тексер.</b> Бұл сұрақ ұпайға қосылмайды. ${showKey && qq.rubric ? html`Үлгі жауап пен критерий: ${qq.rubric}` : ''}</p>`
          : html`<p class="q-fb"><b>Мұғалім бағасы: ${res.p} / ${res.m} балл.</b> ${showKey && qq.rubric ? html`Критерий: ${qq.rubric}` : ''}</p>`;
    } else {
      const label = res.p >= res.m ? 'Дұрыс' : res.p > 0 ? 'Жартылай дұрыс' : 'Қате';
      const key = showKey && qq.kind === 'number' ? html` Дұрыс жауап: <b>${String(qq.correct[0]).replace('.', ',')}${qq.options.unit ? ` ${qq.options.unit}` : ''}</b>.` : '';
      fb = html`<p class="q-fb"><b>${label} · ${res.p} / ${res.m} балл.</b>${key} ${showKey ? qq.explanation || '' : ''}</p>`;
    }
  }
  return html`
    <div class="question${cls}" data-id="${qq.id}" data-kind="${qq.kind}"${selfCheck ? raw(' data-self="1"') : ''}>
      <div class="q-stem"><span class="q-no">${no}</span><div class="q-text">${richText(qq.stem)}</div>${KIND_PILL[qq.kind] ? html`<span class="pill pending">${KIND_PILL[qq.kind]}</span>` : ''}</div>
      ${figure(qq.image || '', 'Сұраққа берілген сурет')}
      ${body}
      ${practice && !review ? html`<button type="button" class="btn sm q-check" disabled>Тексеру</button>` : ''}
      ${review ? fb : html`<p class="q-fb" hidden aria-live="polite"></p>`}
    </div>`;
}

// Блокты (контекст + сурет + сұрақтар) салу. render(qq, no) — сұрақты салатын функция.
export function unitHtml(u, startNo, render) {
  let no = startNo;
  return html`
    <section class="panel unit">
      ${u.title ? html`<h2>${u.title}</h2>` : ''}
      ${u.context ? html`<div class="context">${richText(u.context)}</div>` : ''}
      ${figure(u.image || '', u.title || 'Тапсырмаға берілген сурет')}
      ${u.questions.map((qq) => render(qq, ++no))}
    </section>`;
}

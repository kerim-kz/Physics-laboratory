// Кабинеттің «бақылау тақтасы»: сәлемдесу, көрсеткіш карточкалары, бағанды және дөңгелек диаграммалар.
// Барлығы серверде HTML/CSS-пен салынады (JavaScript қажет емес).
import { EXAMS } from '../data/catalog.js';
import { many } from './db.js';
import { html, raw } from './html.js';
import { icon } from './icons.js';

const TZ = 'Asia/Almaty';
const WEEKDAYS = ['Жексенбі', 'Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі'];
const MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
const MON_SHORT = ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'];

// Алматы уақыты бойынша жыл, ай (0–11), күн, апта күні, сағат.
export function almatyNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { y: +p.year, m: +p.month - 1, d: +p.day, h: +p.hour, wd };
}

export function greeting(h) {
  if (h < 5) return 'Қайырлы түн';
  if (h < 12) return 'Қайырлы таң';
  if (h < 18) return 'Қайырлы күн';
  return 'Қайырлы кеш';
}

// «Қайырлы күн, Аты-жөні» + күн жолы + әрекет батырмалары
export function dashHead(user, sub, actions = '') {
  const n = almatyNow();
  return html`
    <div class="dash-h">
      <div>
        <h1><span>${greeting(n.h)}</span>, <span translate="no">${user.full_name}</span></h1>
        <p><span>${WEEKDAYS[n.wd]}</span>, <span>${n.d} ${MONTHS[n.m]} ${n.y}</span>${sub ? html` · ${sub}` : ''}</p>
      </div>
      ${actions ? html`<div class="vhead-act">${actions}</div>` : ''}
    </div>`;
}

// Көрсеткіш карточкасы. tone: '' | 'k2' | 'k3' | 'k4'
export function kpi({ value, label, note = '', ic = 'chart', tone = '', href = '', delta = null }) {
  const inner = html`
    <div class="kpi-top"><span class="glyph ${tone}">${icon(ic, 20)}</span>${delta === null ? '' : html`<span class="delta ${delta < 0 ? 'down' : ''}">${delta < 0 ? '↓' : '↑'} ${Math.abs(delta)}%</span>`}</div>
    <b>${value}</b>
    <span>${label}${note ? html`<i>${note}</i>` : ''}</span>`;
  return href ? html`<a class="kpi" href="${href}">${inner}</a>` : html`<div class="kpi">${inner}</div>`;
}

// Соңғы 6 айдың орташа пайызы. where — SQL шарты ($1 параметрімен).
export async function monthlyAverages(joinWhere, param) {
  const rows = await many(
    `SELECT to_char(date_trunc('month', t.created_at AT TIME ZONE '${TZ}'), 'YYYY-MM') AS ym,
            round(avg(t.score * 100.0 / t.max_score))::int AS p, count(*)::int AS n
       FROM exam_attempts t ${joinWhere} AND t.max_score > 0 AND t.created_at > now() - interval '7 months'
      GROUP BY 1 ORDER BY 1`, [param]);
  const by = Object.fromEntries(rows.map((r) => [r.ym, r]));
  const now = almatyNow();
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const m = (now.m - i + 12) % 12;
    const y = now.y - (now.m - i < 0 ? 1 : 0);
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    out.push({ label: MON_SHORT[m], p: by[key] ? by[key].p : null, n: by[key] ? by[key].n : 0 });
  }
  return out;
}

// Ағымдағы айдың өткен аймен айырмасы (екеуінде де дерек болса).
export function monthDelta(months) {
  const a = months[months.length - 1].p;
  const b = months[months.length - 2].p;
  return a === null || b === null ? null : a - b;
}

export function barChart(months, emptyText) {
  if (!months.some((m) => m.p !== null)) return html`<div class="bars-empty">${emptyText}</div>`;
  return html`
    <div class="bars" role="img" aria-label="${months.map((m) => `${m.label}: ${m.p === null ? '—' : m.p + '%'}`).join(', ')}">
      <div class="bars-y" aria-hidden="true"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span></div>
      <div class="bars-c" aria-hidden="true">${months.map((m) => html`
        <div class="bar1"><i style="height:${m.p === null ? 0 : Math.max(2, m.p)}%">${m.p === null ? '' : html`<em>${m.p}%</em>`}</i><span>${m.label}</span></div>`)}</div>
    </div>`;
}

const DONUT_COLORS = ['#0a76a6', '#e08a2c', '#2fa36b', '#7a5bd0', '#9aa9b4'];
const examName = (k) => (EXAMS.find((e) => e.k === k) || { name: k }).name;

// Емтихан түрлері бойынша үлес (ең көп 4 түр + қалғаны).
export async function examShares(joinWhere, param) {
  const rows = await many(`SELECT t.exam, count(*)::int AS n FROM exam_attempts t ${joinWhere} GROUP BY 1 ORDER BY 2 DESC`, [param]);
  const top = rows.slice(0, 4).map((r) => ({ name: examName(r.exam), n: r.n }));
  const rest = rows.slice(4).reduce((s, r) => s + r.n, 0);
  if (rest) top.push({ name: 'Басқа', n: rest });
  return top;
}

export function donut(parts, unit = 'тест') {
  const total = parts.reduce((s, p) => s + p.n, 0);
  if (!total) return html`<div class="bars-empty">Әзірге тест тапсырылмаған</div>`;
  let acc = 0;
  const stops = parts.map((p, i) => { const a = acc; acc += (p.n / total) * 100; return `${DONUT_COLORS[i]} ${a.toFixed(2)}% ${acc.toFixed(2)}%`; });
  const pct = (n) => Math.round((n / total) * 100);
  return html`
    <div class="donut" role="img" aria-label="${parts.map((p) => `${p.name} ${pct(p.n)}%`).join(', ')}" style="${raw(`background:conic-gradient(${stops.join(',')})`)}">
      <div><b>${total}</b><span>${unit}</span></div>
    </div>
    <div class="dlegend">${parts.map((p, i) => html`<div><i style="${raw(`background:${DONUT_COLORS[i]}`)}"></i>${p.name}<b>${pct(p.n)}%</b></div>`)}</div>`;
}

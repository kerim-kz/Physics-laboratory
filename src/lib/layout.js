import { config } from '../config.js';
import { ROLE_NAME } from '../data/catalog.js';
import { html, raw } from './html.js';
import { icon } from './icons.js';
import { getSettings } from './settings.js';
import { takeFlash } from './util.js';

// Бүйір мәзірдің бөлімдері: [мекенжай, атауы, белсенді кілт, белгіше]
const NAV = [
  ['', [['/', 'Басты бет', 'home', 'home']]],
  ['Оқу', [
    ['/formulas', 'Формулалар', 'formulas', 'formula'],
    ['/library', 'Кітапхана', 'library', 'book'],
    ['/olympiad', 'Олимпиадалық есептер', 'olympiad', 'trophy'],
    ['/scientists', 'Ғалымдар', 'scientists', 'user'],
  ]],
  ['Интерактив', [
    ['/sims', 'Симуляциялар', 'sims', 'sim'],
    ['/labs', 'Зертханалар', 'labs', 'lab'],
    ['/games', 'Ойындар', 'games', 'game'],
  ]],
  ['Емтихан', [['/exams', 'PISA · ББЖМ · ҰБТ', 'exams', 'exam']]],
  ['Платформа', [
    ['/shop', 'Ақылы материалдар', 'shop', 'shop'],
    ['/schools', 'Мектептер', 'schools', 'school'],
  ]],
];

function navLink([href, label, key, ic], active) {
  const on = key === active;
  return html`<a href="${href}" class="${on ? 'on' : ''}"${on ? raw(' aria-current="page"') : ''}>${icon(ic, 17)}<span>${label}</span></a>`;
}

export const initials = (name) =>
  String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function userSlot(user, csrf) {
  if (!user) {
    return html`<a class="btn ghost sm" href="/login">Кіру</a><a class="btn sm" href="/register">Тіркелу</a>`;
  }
  const sub = user.role === 'student' && user.class_grade
    ? `${user.class_grade}${user.class_letter || ''} сынып`
    : ROLE_NAME[user.role];
  return html`
    <a class="who" href="${user.role === 'admin' ? '/admin' : '/cabinet'}" title="Жеке кабинет">
      <span class="ava">${initials(user.full_name)}</span>
      <span><b>${user.full_name}</b><i>${sub}</i></span>
    </a>
    <form method="post" action="/logout" class="inline">
      <input type="hidden" name="_csrf" value="${csrf}">
      <button class="iconbtn" type="submit" title="Шығу" aria-label="Шығу">${icon('logout')}</button>
    </form>`;
}

export async function page(req, res, opts) {
  const { title, active = '', body, scripts = [], styles = [], katex = false, description = '' } = opts;
  const settings = await getSettings();
  const flash = takeFlash(req, res);
  const user = req.user;
  const siteName = settings.site_name || config.siteName;
  const nav = [...NAV];
  if (user) {
    nav.splice(1, 0, ['', [user.role === 'admin'
      ? ['/admin', 'Әкімші панелі', 'admin', 'shield']
      : ['/cabinet', 'Жеке кабинет', 'cabinet', 'user']]]);
  }
  const drawer = html`
<nav class="drawer" id="drawer" aria-label="Бөлімдер" data-open="0">
  <div class="drawer-h">
    <span class="eyebrow">Бөлімдер</span>
    <button class="iconbtn" type="button" id="drawerClose" aria-label="Мәзірді жабу">${icon('x')}</button>
  </div>
  ${nav.map(([group, links]) => html`<div class="dgroup">${group ? html`<span class="dgroup-t">${group}</span>` : ''}${links.map((l) => navLink(l, active))}</div>`)}
  ${user ? '' : html`<div class="dgroup dgroup-auth"><a class="btn" href="/register">Тіркелу</a><a class="btn ghost" href="/login">Кіру</a></div>`}
</nav>
<div class="scrim" id="drawerScrim" hidden></div>`;

  const doc = html`<!doctype html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title ? `${title} · ${siteName}` : siteName}</title>
<meta name="description" content="${description || 'Физика пәнінің оқу платформасы: материалдар, формулалар, ойындар, симуляциялар, зертханалар, PISA, ББЖМ, ҰБТ.'}">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/vendor/fonts/sans/400.css">
<link rel="stylesheet" href="/vendor/fonts/sans/500.css">
<link rel="stylesheet" href="/vendor/fonts/sans/600.css">
<link rel="stylesheet" href="/vendor/fonts/serif/600.css">
<link rel="stylesheet" href="/vendor/fonts/mono/400.css">
<link rel="stylesheet" href="/vendor/fonts/mono/600.css">
${katex ? raw('<link rel="stylesheet" href="/vendor/katex/katex.min.css">') : ''}
<link rel="stylesheet" href="/css/app.css">
${styles.map((s) => raw(`<link rel="stylesheet" href="${s}">`))}
<script src="/js/theme.js"></script>
</head>
<body>
<a class="skip" href="#main">Негізгі мазмұнға өту</a>
<header class="bar">
  <div class="bar-in gutter">
    <button class="iconbtn menubtn" type="button" id="menuBtn" aria-controls="drawer" aria-expanded="false" aria-label="Мәзір">${icon('menu', 20)}<span>Мәзір</span></button>
    <a class="brand" href="/">
      <span class="mark" aria-hidden="true">Фз</span>
      <span class="brand-t"><b>${siteName}</b><span>физика пәнінің платформасы</span></span>
    </a>
    <div class="bar-act">
      <button class="iconbtn" id="themeBtn" type="button" title="Жарық / қараңғы тақырып" aria-label="Тақырыпты ауыстыру">${icon('sun')}</button>
      ${userSlot(user, req.csrfToken)}
    </div>
  </div>
</header>
${drawer}
<noscript><nav class="nav-ns gutter" aria-label="Бөлімдер">${nav.flatMap(([, links]) => links).map(([href, label]) => html`<a href="${href}">${label}</a>`)}</nav></noscript>
${settings.announcement ? html`<div class="gutter"><div class="announce"><b>Хабарландыру</b><span>${settings.announcement}</span></div></div>` : ''}
${flash ? html`<div class="gutter"><div class="flash ${flash.type}" role="status">${flash.text}</div></div>` : ''}
<main id="main" class="wrap gutter">
${body}
</main>
<footer class="foot gutter">
  <b>${siteName}</b>
  <span>Физика · 7–11 сыныптар</span>
  ${settings.contact ? html`<span>Байланыс: ${settings.contact}</span>` : ''}
  <span class="grow"></span>
  <a href="/sims">Симуляциялар</a>
  <a href="/formulas">Формулалар</a>
  <a href="/olympiad">Олимпиада</a>
  <a href="/schools">Мектептер</a>
</footer>
<script src="/js/app.js" defer></script>
${scripts.map((s) => raw(`<script src="${s}" defer></script>`))}
</body>
</html>`;
  res.type('html').send(doc.toString());
}

// Ортақ шағын компоненттер
export const csrfField = (req) => html`<input type="hidden" name="_csrf" value="${req.csrfToken}">`;

export function vhead(title, lede, actions = '') {
  return html`<div class="vhead"><div><h1>${title}</h1>${lede ? html`<p>${lede}</p>` : ''}</div>${actions ? html`<div class="vhead-act">${actions}</div>` : ''}</div>`;
}

export function emptyBox(title, text) {
  return html`<div class="empty"><b>${title}</b>${text}</div>`;
}

export function pager(url, page, hasMore) {
  if (page <= 1 && !hasMore) return '';
  const u = (p) => { const x = new URL(url, 'http://x'); x.searchParams.set('page', p); return x.pathname + x.search; };
  return html`<nav class="pager" aria-label="Беттер">
    ${page > 1 ? html`<a class="btn ghost sm" href="${u(page - 1)}">← Алдыңғы</a>` : ''}
    <span class="mono">${page}-бет</span>
    ${hasMore ? html`<a class="btn ghost sm" href="${u(page + 1)}">Келесі →</a>` : ''}
  </nav>`;
}

import express from 'express';
import { EXAMS, FAMILIES, SECTIONS } from '../data/catalog.js';
import { FORMULAS } from '../data/formulas.js';
import { LABS } from '../data/labs.js';
import { SIMS } from '../data/sims.js';
import { many, one } from '../lib/db.js';
import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { page } from '../lib/layout.js';
import { asyncH } from '../lib/util.js';
import { materialCard } from './materials.js';

export const router = express.Router();

const FEATURES = [
  ['/library', 'book', 'Кітапхана', 'Оқу құралдары, PowerPoint презентациялар, Word-тағы ҚМЖ, тесттер мен олимпиадалық есептер.'],
  ['/formulas', 'formula', 'Формулалар', `7–11-сыныптың ${FORMULAS.length} формуласы: әр шаманың мағынасы мен өлшем бірлігімен.`],
  ['/games', 'game', 'Ойындар', 'Формулаларды жаттауға арналған алты ойын: карточкалар, жұптар, викторина, бірліктер.'],
  ['/sims', 'sim', 'Симуляциялар', `Физиканың бөлімдері бойынша ${SIMS.length} интерактивті модель және зерттеу тапсырмалары.`],
  ['/labs', 'lab', 'Зертханалар', `${LABS.length} виртуалды зертханалық жұмыс. Нәтиже кодын мұғалім журналға жазады.`],
  ['/exams', 'exam', 'PISA · ББЖМ · ҰБТ', 'Жаттығу және уақытпен сынақ режимдері, әр тапсырмаға түсіндірме.'],
];

router.get('/', asyncH(async (req, res) => {
  const recent = await many(`SELECT * FROM materials WHERE status = 'published' ORDER BY created_at DESC LIMIT 6`);
  const counts = await one(`SELECT
      (SELECT count(*) FROM materials WHERE status = 'published') AS materials,
      (SELECT count(*) FROM schools WHERE status = 'active') AS schools,
      (SELECT count(*) FROM users WHERE role = 'student') AS students,
      (SELECT count(*) FROM exam_questions) AS questions`);
  const u = req.user;
  const cta = u
    ? html`<a class="btn lg" href="${u.role === 'admin' ? '/admin' : '/cabinet'}">Кабинетке өту</a><a class="btn ghost lg" href="/sims">Симуляциялар</a>`
    : html`<a class="btn lg" href="/register">Тіркелу</a><a class="btn ghost lg" href="/login">Кіру</a>`;

  await page(req, res, {
    active: 'home',
    body: html`
      <div class="view">
        <section class="hero">
          <div>
            <p class="eyebrow">Физика · 7–11 сыныптар</p>
            <h1>Физика — бір кабинетте</h1>
            <p class="lede">Оқу құралдары, презентациялар, ҚМЖ, зертханалық жұмыстар, интерактивті симуляциялар, формулалар мен оларды жаттауға арналған ойындар, PISA, ББЖМ және ҰБТ-ға дайындық бір жерде. Оқушылар мұғалімнің сынып кодымен тіркеледі, мұғалімдер мектебімен тіркеліп, материал жүктейді.</p>
            <div class="hero-cta">${cta}</div>
          </div>
          <div>
            <div class="ptable">
              ${SECTIONS.map((s) => html`<a class="el ${FAMILIES[s.fam].css}" href="/formulas?section=${s.k}" title="${s.name}: формулалар">
                <span class="z">${s.no}</span><span class="sym">${s.sym}</span><span class="nm">${s.name}</span></a>`)}
            </div>
            <div class="legend">${Object.values(FAMILIES).map((f) => html`<span class="${f.css}"><i></i>${f.name}</span>`)}</div>
          </div>
        </section>
        <div class="stats">
          <div class="stat"><b>${FORMULAS.length}</b><span>формула</span></div>
          <div class="stat"><b>${SIMS.length}</b><span>симуляция</span></div>
          <div class="stat"><b>${LABS.length}</b><span>зертхана</span></div>
          <div class="stat"><b>${counts.questions}</b><span>тест тапсырмасы</span></div>
          <div class="stat"><b>${counts.materials}</b><span>материал</span></div>
        </div>
        <section class="feat">
          ${FEATURES.map(([href, ic, title, text]) => html`<a class="fcard" href="${href}"><span class="glyph">${icon(ic)}</span><b>${title}</b><p>${text}</p></a>`)}
        </section>
        <section class="block">
          <div class="block-h"><h2>Емтиханға дайындық</h2><a class="more" href="/exams">Бөлімге өту</a></div>
          <div class="exgrid">${EXAMS.map((e) => html`<a class="excard" href="/exams/${e.k}">
            <span class="exn"><b>${e.name}</b><span>${e.who}</span></span><p>${e.desc}</p><span class="exc">Тест тапсыру →</span></a>`)}</div>
        </section>
        <section class="block">
          <div class="block-h"><h2>Жаңа материалдар</h2><span class="cnt">${counts.schools} мектеп · ${counts.students} оқушы</span><a class="more" href="/library">Кітапхана</a></div>
          ${recent.length ? html`<div class="mgrid">${recent.map((m) => materialCard(m))}</div>`
            : html`<div class="empty"><b>Кітапхана толуда</b>Мұғалімдер жүктеген материалдар әкімші тексергеннен кейін осында шығады.</div>`}
        </section>
      </div>`,
  });
}));

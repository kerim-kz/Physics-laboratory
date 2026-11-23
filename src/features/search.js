// Жалпы іздеу (жоғарғы жолақтағы өріс): симуляциялар, формулалар, зертханалар, ғалымдар, ойындар.
// Мәтін қазақша және сайттың ағымдағы тіліндегі аудармасы бойынша ізделеді.
import express from 'express';
import { FORMULAS } from '../data/formulas.js';
import { GAMES } from '../data/games.js';
import { LABS } from '../data/labs.js';
import { SCIENTISTS } from '../data/scientists.js';
import { SIMS } from '../data/sims.js';
import { html } from '../lib/html.js';
import { t } from '../lib/i18n.js';
import { icon } from '../lib/icons.js';
import { emptyBox, page, vhead } from '../lib/layout.js';
import { asyncH } from '../lib/util.js';

export const router = express.Router();

const LIMIT = 24;
const norm = (s) => String(s || '').toLocaleLowerCase('kk').replace(/ё/g, 'е');

// Іздеу: сұраудың барлық сөзі мәтінде болса — сәйкес. Атауда кездессе, жоғары тұрады.
export function searchAll(query, lang = 'kk') {
  const words = norm(query).split(/\s+/).filter((w) => w.length > 0).slice(0, 6);
  if (!words.length) return null;
  const tr = (x) => (lang === 'kk' ? '' : t(lang, x));
  const hit = (title, rest) => {
    const tt = norm(`${title} ${tr(title)}`);
    const all = `${tt} ${norm(rest)}`;
    if (!words.every((w) => all.includes(w))) return 0;
    return words.every((w) => tt.includes(w)) ? 2 : 1;
  };
  const pick = (list, map) => list
    .map((x) => { const r = map(x); return { ...r, rank: hit(r.title, r.text) }; })
    .filter((r) => r.rank)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, LIMIT);
  return {
    sims: pick(SIMS, (s) => ({ title: s.t, text: `${s.d} ${tr(s.d)}`, href: `/sims/${s.k}`, sub: `${s.g}-сынып` })),
    formulas: pick(FORMULAS, (f) => ({ title: f.name, text: (f.vars || []).map((v) => v.meaning).join(' '), href: `/formulas/${f.id}`, sub: `${f.g}-сынып` })),
    labs: pick(LABS, (l) => ({ title: l.t, text: `${l.d} ${tr(l.d)}`, href: `/labs/${l.k}`, sub: `${l.g}-сынып · №${l.no}` })),
    scientists: pick(SCIENTISTS, (s) => ({ title: s.n, text: `${s.d} ${s.c}`, href: `/scientists#${s.k}`, sub: s.y })),
    games: pick(GAMES, (g) => ({ title: g.name, text: g.desc, href: `/games/${g.k}`, sub: 'Ойын' })),
  };
}

const GROUPS = [
  ['sims', 'Симуляциялар', 'sim'],
  ['formulas', 'Формулалар', 'formula'],
  ['labs', 'Зертханалар', 'lab'],
  ['scientists', 'Ғалымдар', 'user'],
  ['games', 'Ойындар', 'game'],
];

router.get('/search', asyncH(async (req, res) => {
  const q = String(req.query.q || '').slice(0, 80).trim();
  const r = q ? searchAll(q, req.lang) : null;
  const total = r ? GROUPS.reduce((n, [k]) => n + r[k].length, 0) : 0;
  await page(req, res, {
    title: q ? `Іздеу: ${q}` : 'Іздеу', active: 'search',
    body: html`
      <div class="view">
        ${vhead('Іздеу', q ? `«${q}» бойынша табылғаны: ${total}` : 'Симуляцияны, формуланы, зертхананы, ғалымды немесе ойынды атауы бойынша табыңыз.')}
        <form class="search big" method="get" action="/search" role="search">
          ${icon('search', 18)}<label class="sr" for="sq">Іздеу</label>
          <input id="sq" type="search" name="q" value="${q}" placeholder="Мысалы: маятник, Ньютон, линза" autofocus>
          <button class="btn" type="submit">Іздеу</button>
        </form>
        ${r && !total ? emptyBox('Ештеңе табылмады', 'Сөзді қысқартып немесе басқаша жазып көріңіз.') : ''}
        ${r ? GROUPS.filter(([k]) => r[k].length).map(([k, name, ic]) => html`
          <section class="block">
            <div class="block-h"><h2>${name}</h2><span class="cnt">${r[k].length}</span></div>
            <div class="slist">${r[k].map((x) => html`
              <a class="sres" href="${x.href}"><span class="glyph">${icon(ic, 18)}</span><span><b>${x.title}</b><i>${x.sub}</i></span>${icon('arrow', 15)}</a>`)}</div>
          </section>`) : ''}
      </div>`,
  });
}));

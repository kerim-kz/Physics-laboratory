import express from 'express';
import { FAMILIES, SECTION, SECTIONS } from '../data/catalog.js';
import { formulasForGames } from '../data/formulas.js';
import { GAME, GAMES } from '../data/games.js';
import { scientistsForGames } from '../data/scientists.js';
import { many } from '../lib/db.js';
import { html, jsonScript } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { page, vhead } from '../lib/layout.js';
import { asyncH, HttpError, toInt } from '../lib/util.js';

export const router = express.Router();

const MAX_SCORE = { pairs: 1000, quiz: 5000, symbol: 1000, units: 1000, convert: 1000, scientist: 1000 };

async function leaderboard(game, schoolId = null) {
  const params = [game];
  let extra = '';
  if (schoolId) { params.push(schoolId); extra = ' AND u.school_id = $2'; }
  return many(
    `SELECT u.full_name, s.name AS school_name, c.grade, c.letter, max(g.score) AS best
       FROM game_scores g JOIN users u ON u.id = g.user_id
  LEFT JOIN schools s ON s.id = u.school_id LEFT JOIN classes c ON c.id = u.class_id
      WHERE g.game = $1 AND g.created_at > now() - interval '7 days' AND u.status <> 'blocked'${extra}
   GROUP BY u.id, s.name, c.grade, c.letter ORDER BY best DESC LIMIT 10`, params);
}

function boardTable(rows) {
  if (!rows.length) return html`<p class="muted small">Бұл аптада әлі ешкім ойнаған жоқ — бірінші бол!</p>`;
  return html`<ol class="board">${rows.map((r) => html`<li><span class="grow"><b>${r.full_name}</b><span>${[r.grade ? `${r.grade}${r.letter}` : '', r.school_name].filter(Boolean).join(' · ')}</span></span><span class="mono">${r.best}</span></li>`)}</ol>`;
}

router.get('/games', asyncH(async (req, res) => {
  const section = SECTION[req.query.section] ? req.query.section : '';
  const boards = await Promise.all(['quiz', 'pairs'].map((g) => leaderboard(g)));
  await page(req, res, {
    title: 'Ойындар', active: 'games',
    body: html`
      <div class="view">
        ${vhead('Формула ойындары', 'Формулаларды, шамалардың мағынасын және өлшем бірліктерін ойын арқылы жатта. Бөлімді таңда — ойындар сол бөлімнің формулаларымен жүреді. Тіркелген оқушының ұпайы сақталып, апталық рейтингке түседі.')}
        <div class="chips">
          <a class="chip plain${!section ? ' on' : ''}" href="/games">Барлық бөлім</a>
          ${SECTIONS.map((s) => html`<a class="chip ${FAMILIES[s.fam].css}${section === s.k ? ' on' : ''}" href="/games?section=${s.k}"><i>${s.sym}</i>${s.name}</a>`)}
        </div>
        <div class="grid">${GAMES.map((g) => html`
          <article class="card">
            <div class="card-top"><span class="glyph">${icon(g.icon)}</span>${g.scored ? html`<span class="cls">ұпаймен</span>` : html`<span class="cls">өзін-өзі тексеру</span>`}</div>
            <h3><a href="/games/${g.k}${section ? `?section=${section}` : ''}">${g.name}</a></h3>
            <p>${g.desc}</p>
            <div class="card-foot"><span class="meta">${section ? SECTION[section].name : 'Барлық бөлім'}</span><span class="open">Ойнау ${icon('play', 13)}</span></div>
          </article>`)}</div>
        <section class="feat" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="panel"><h2>${icon('trophy')} Викторина: апта көшбасшылары</h2>${boardTable(boards[0])}</div>
          <div class="panel"><h2>${icon('trophy')} «Жұбын тап»: апта көшбасшылары</h2>${boardTable(boards[1])}</div>
        </section>
      </div>`,
  });
}));

router.get('/games/:k', asyncH(async (req, res) => {
  const game = GAME[req.params.k];
  if (!game) throw new HttpError(404, 'Ойын табылмады.');
  const section = SECTION[req.query.section] ? req.query.section : '';
  const mine = req.user && game.scored
    ? (await many('SELECT max(score) AS best, count(*) AS plays FROM game_scores WHERE user_id = $1 AND game = $2', [req.user.id, game.k]))[0]
    : null;
  const board = game.scored ? await leaderboard(game.k, req.user && req.user.school_id) : [];
  await page(req, res, {
    title: game.name, active: 'games', katex: true,
    scripts: ['/vendor/katex/katex.min.js', '/js/games.js'],
    body: html`
      <div class="view">
        <div class="crumbs"><a href="/games">Ойындар</a><span>/</span><span>${game.name}</span></div>
        <div class="vhead"><div><h1>${game.name}</h1><p>${game.desc}</p></div>
          <div class="vhead-act">
            <form method="get" action="/games/${game.k}" data-autosubmit>
              <label class="fl">Бөлім<select name="section"><option value="">Барлық бөлім</option>${SECTIONS.map((s) => html`<option value="${s.k}"${section === s.k ? html` selected` : ''}>${s.name}</option>`)}</select></label>
            </form>
          </div></div>
        <div class="gamewrap">
          <section class="panel game" id="game" data-game="${game.k}" data-section="${section}" data-auth="${req.user ? '1' : ''}" data-csrf="${req.csrfToken}">
            <noscript>Ойын жұмыс істеуі үшін браузерде JavaScript қосулы болуы керек.</noscript>
          </section>
          <aside class="stack">
            ${game.scored ? html`<div class="panel"><h2>Менің нәтижем</h2>
              ${req.user ? html`<p>Ең жақсы ұпай: <b class="mono" id="myBest">${mine && mine.best ? mine.best : 0}</b><br><span class="muted small">Ойналды: ${mine ? mine.plays : 0} рет</span></p>`
                : html`<p class="muted">Ұпайыңды сақтау үшін <a href="/login?next=/games/${game.k}">кір</a> немесе <a href="/register">тіркел</a>.</p>`}</div>
              <div class="panel"><h2>${req.user && req.user.school_id ? 'Мектебімнің көшбасшылары' : 'Апта көшбасшылары'}</h2>${boardTable(board)}</div>` : html`
              <div class="panel"><h2>Қалай жаттаған тиімді?</h2><p class="muted small">Формуланы алдымен өзің есіңе түсіріп көр, содан кейін ғана карточканы аудар. «Қайталау» деп белгіленген карточкалар топтаманың соңына қайта қосылады — осылай әлсіз тұстарың бекиді.</p></div>`}
          </aside>
        </div>
        ${jsonScript('gameData', game.k === 'scientist' ? { formulas: [], scientists: scientistsForGames() } : { formulas: formulasForGames(), sections: Object.fromEntries(SECTIONS.map((s) => [s.k, s.name])) })}
      </div>`,
  });
}));

router.post('/api/games/score', asyncH(async (req, res) => {
  if (!req.user) return res.json({ saved: false });
  const game = GAME[req.body.game];
  if (!game || !game.scored) return res.status(400).json({ error: 'Ойын белгісіз.' });
  const score = Math.max(0, Math.min(MAX_SCORE[game.k] || 1000, toInt(req.body.score)));
  const section = SECTION[req.body.section] ? req.body.section : '';
  await many('INSERT INTO game_scores(user_id, game, section, score) VALUES ($1,$2,$3,$4) RETURNING id', [req.user.id, game.k, section, score]);
  const best = (await many('SELECT max(score) AS best FROM game_scores WHERE user_id = $1 AND game = $2', [req.user.id, game.k]))[0];
  res.json({ saved: true, best: best.best });
}));

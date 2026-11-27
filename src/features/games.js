import express from 'express';
import { SECTION, SECTIONS } from '../data/catalog.js';
import { formulasForGames } from '../data/formulas.js';
import { BUILD, ODD, QUESTIONS, TERMS } from '../data/game-bank.js';
import { CAT, CATS, GAME, GAMES } from '../data/games.js';
import { scientistsForGames } from '../data/scientists.js';
import { many } from '../lib/db.js';
import { cover, mascot } from '../lib/gamecovers.js';
import { dailyGame, playerStats, weeklyBoard } from '../lib/gamestats.js';
import { html, jsonScript } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { page } from '../lib/layout.js';
import { asyncH, HttpError, toInt } from '../lib/util.js';

export const router = express.Router();

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

const fmtNum = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function boardTable(rows, unit = '') {
  if (!rows.length) return html`<p class="muted small">Бұл аптада әлі ешкім ойнаған жоқ — бірінші бол!</p>`;
  return html`<ol class="board">${rows.map((r, i) => html`<li class="${i < 3 ? `top${i + 1}` : ''}"><span class="grow"><b>${r.full_name}</b><span>${[r.grade ? `${r.grade}${r.letter || ''}` : '', r.school_name].filter(Boolean).join(' · ')}</span></span><span class="mono">${fmtNum(r.best)}${unit}</span></li>`)}</ol>`;
}
const gradesLabel = (g) => (g.grades.length === 1 ? `${g.grades[0]}-сынып` : g.grades.length === 5 ? '7–11-сынып' : `${g.grades[0]}–${g.grades[g.grades.length - 1]}-сынып`);

function gameCard(g, daily) {
  return html`
    <a class="gcard" href="/games/${g.k}" style="--gc:${g.color}">
      <span class="gcard-art">${cover(g)}${daily ? html`<span class="gcard-daily">${icon('star', 13)} Күннің тапсырмасы</span>` : ''}</span>
      <span class="gcard-body">
        <b>${g.name}</b>
        <div class="gcard-meta"><div class="gchip">${gradesLabel(g)}</div>${g.scored ? html`<div class="gchip">ұпаймен</div>` : html`<div class="gchip">${g.k === 'teams' ? 'командамен' : 'жаттығу'}</div>`}</div>
        <span class="gcard-desc">${g.desc}</span>
        <span class="gcard-play">${icon('play', 14)} Ойнау</span>
      </span>
    </a>`;
}

function playerCard(st) {
  const lv = st.level;
  return html`
    <section class="gplayer">
      <div class="gplayer-lv"><span class="gplayer-n">${lv.n}</span><span class="small">деңгей</span></div>
      <div class="gplayer-main">
        <div class="gplayer-h"><b>${lv.name}</b><span class="mono">${fmtNum(st.xp)} XP</span></div>
        <div class="gbar"><i style="width:${lv.pct}%"></i></div>
        <p class="muted small">${lv.to ? html`Келесі деңгей — «${lv.nextName}»: тағы ${fmtNum(lv.to - st.xp)} XP` : 'Ең жоғары деңгей!'} · Ойналды: ${st.plays} рет</p>
        <div class="gbadges">${st.badges.map((b) => html`<span class="gbadge${b.got ? ' got' : ''}" title="${b.name}: ${b.desc}">${icon(b.icon, 16)}<span>${b.name}</span></span>`)}</div>
      </div>
    </section>`;
}

router.get('/games', asyncH(async (req, res) => {
  const daily = dailyGame();
  const st = req.user ? await playerStats(req.user.id) : null;
  const board = await weeklyBoard();
  await page(req, res, {
    title: 'Ойындар', active: 'games',
    body: html`
      <div class="view ghub">
        <section class="ghub-hero">
          ${mascot(104)}
          <div><p class="eyebrow">Ойна да, үйрен</p><h1>Физика ойындары</h1>
            <p>${GAMES.length} ойын: зеңбіректен атып, сәулені бағыттап, тізбек жинап, зымыран қондырып, миллион джоульге таласып — физика заңдарын ойнай отырып меңгер. Әр ойын үшін XP жинап, деңгейіңді көтер, белгішелер ал!</p></div>
        </section>
        ${st ? playerCard(st) : html`<section class="gplayer guest">${icon('trophy', 22)}<p><a href="/login?next=/games">Кір</a> немесе <a href="/register">тіркел</a> — ұпайың сақталып, деңгейің мен белгішелерің жиналады, сыныптастарыңмен рейтингте жарысасың.</p></section>`}
        <a class="gdaily" href="/games/${daily.game.k}?daily=1" style="--gc:${daily.game.color}">
          <span class="gdaily-ic">${icon('star', 26)}</span>
          <div class="grow"><div class="gd-t">Күннің тапсырмасы: «${daily.game.name}»</div><div class="gd-s">${st && st.daily.done ? 'Бүгінгі тапсырма орындалды! Ертең жаңасы шығады.' : 'Бүгін осы ойынды ойнап, «Күнделікті» белгішесін ал.'}</div></div>
          ${st && st.daily.done ? html`<span class="gchip ok">${icon('check', 14)} Орындалды</span>` : html`<span class="btn">${icon('play', 15)} Ойнау</span>`}
        </a>
        <nav class="chips gcats">${CATS.map((c) => html`<a class="chip plain" href="#cat-${c.k}">${c.name}</a>`)}</nav>
        ${CATS.map((c) => html`
          <section class="shelf" id="cat-${c.k}">
            <div class="shelf-h"><h2>${c.name}</h2><span class="cnt">${GAMES.filter((g) => g.cat === c.k).length}</span></div>
            <p class="muted">${c.desc}</p>
            <div class="ggrid">${GAMES.filter((g) => g.cat === c.k).map((g) => gameCard(g, g.k === daily.game.k))}</div>
          </section>`)}
        <section class="panel"><h2>${icon('trophy')} Апта көшбасшылары (барлық ойын, XP)</h2>${boardTable(board, ' XP')}</section>
      </div>`,
  });
}));

// Ойынға қажет деректер (тек сол ойынға керегі ғана бетке жіберіледі)
function gameData(g) {
  if (g.k === 'scientist') return { formulas: [], scientists: scientistsForGames() };
  if (g.engine === 'classic') return { formulas: formulasForGames(), sections: Object.fromEntries(SECTIONS.map((s) => [s.k, s.name])) };
  if (g.k === 'millionaire' || g.k === 'teams') return { questions: QUESTIONS };
  if (g.k === 'crossword') return { terms: TERMS };
  if (g.k === 'oddone') return { sets: ODD };
  if (g.k === 'buildf') return { formulas: BUILD };
  return {};
}

router.get('/games/:k', asyncH(async (req, res) => {
  const g = GAME[req.params.k];
  if (!g) throw new HttpError(404, 'Ойын табылмады.');
  const section = SECTION[req.query.section] ? req.query.section : '';
  const daily = dailyGame();
  const isDaily = req.query.daily === '1' && daily.game.k === g.k;
  const mine = req.user && g.scored
    ? (await many('SELECT max(score) AS best, count(*) AS plays FROM game_scores WHERE user_id = $1 AND game = $2', [req.user.id, g.k]))[0]
    : null;
  const st = req.user ? await playerStats(req.user.id) : null;
  const board = g.scored ? await leaderboard(g.k, req.user && req.user.school_id) : [];
  // оқушының сыныбы — ойындағы әдепкі сынып
  const myGrade = req.user && req.user.class_id ? ((await many('SELECT grade FROM classes WHERE id = $1', [req.user.class_id]))[0] || {}).grade || '' : '';
  const scripts = g.engine === 'classic' ? ['/vendor/katex/katex.min.js', '/js/games/shell.js', '/js/games.js'] : ['/vendor/katex/katex.min.js', '/js/games/shell.js', `/js/games/${g.k}.js`];
  await page(req, res, {
    title: g.name, active: 'games', katex: true, scripts,
    body: html`
      <div class="view gview" style="--gc:${g.color}">
        <div class="crumbs"><a href="/games">Ойындар</a><span>/</span><span>${CAT[g.cat].name}</span></div>
        <section class="gtitle">
          <span class="gtitle-art">${cover(g)}</span>
          <div class="gtitle-txt"><h1>${g.name}</h1><p>${g.desc}</p>
            <div class="gcard-meta"><div class="gchip">${gradesLabel(g)}</div><div class="gchip">${g.topic}</div>${isDaily ? html`<div class="gchip ok">${icon('star', 13)} Күннің тапсырмасы</div>` : ''}</div>
            ${g.engine === 'classic' && g.k !== 'scientist' ? html`<form method="get" action="/games/${g.k}" data-autosubmit class="gsec"><label class="fl">Бөлім<select name="section"><option value="">Барлық бөлім</option>${SECTIONS.map((s) => html`<option value="${s.k}"${section === s.k ? html` selected` : ''}>${s.name}</option>`)}</select></label>${isDaily ? html`<input type="hidden" name="daily" value="1">` : ''}</form>` : ''}
          </div>
        </section>
        <div class="gamewrap">
          <section class="panel game gstage" id="game" data-game="${g.k}" data-section="${section}" data-auth="${req.user ? '1' : ''}" data-csrf="${req.csrfToken}" data-daily="${isDaily ? '1' : ''}" data-max="${g.max || 0}" data-scored="${g.scored ? '1' : ''}" data-grades="${g.grades.join(',')}" data-grade="${myGrade}">
            <noscript>Ойын жұмыс істеуі үшін браузерде JavaScript қосулы болуы керек.</noscript>
          </section>
          <aside class="stack">
            <div class="panel"><h2>Қалай ойнау керек?</h2><ol class="ghow">${g.how.map((h) => html`<li>${h}</li>`)}</ol></div>
            ${st ? html`<div class="panel gmini"><div class="gmini-h"><span class="gplayer-n sm">${st.level.n}</span><span><b>${st.level.name}</b><span class="muted small">${fmtNum(st.xp)} XP</span></span></div><div class="gbar"><i id="gXpBar" style="width:${st.level.pct}%"></i></div>
              ${g.scored ? html`<p class="small">Осы ойындағы ең жақсы ұпайың: <b class="mono" id="myBest">${mine && mine.best ? fmtNum(mine.best) : 0}</b> · ойналды: ${mine ? mine.plays : 0} рет</p>` : ''}</div>`
              : g.scored ? html`<div class="panel"><p class="muted">Ұпайыңды сақтап, деңгей жинау үшін <a href="/login?next=/games/${g.k}">кір</a> немесе <a href="/register">тіркел</a>.</p></div>` : ''}
            ${g.scored ? html`<div class="panel"><h2>${req.user && req.user.school_id ? 'Мектебімнің көшбасшылары' : 'Апта көшбасшылары'}</h2>${boardTable(board)}</div>` : ''}
          </aside>
        </div>
        ${jsonScript('gameData', gameData(g))}
      </div>`,
  });
}));

router.post('/api/games/score', asyncH(async (req, res) => {
  if (!req.user) return res.json({ saved: false });
  const g = GAME[req.body.game];
  if (!g || !g.scored) return res.status(400).json({ error: 'Ойын белгісіз.' });
  const score = Math.max(0, Math.min(g.max || 1000, toInt(req.body.score)));
  const daily = dailyGame();
  const section = req.body.daily && daily.game.k === g.k ? 'daily' : SECTION[req.body.section] ? req.body.section : '';
  const before = await playerStats(req.user.id);
  await many('INSERT INTO game_scores(user_id, game, section, score) VALUES ($1,$2,$3,$4) RETURNING id', [req.user.id, g.k, section, score]);
  const after = await playerStats(req.user.id);
  const had = new Set(before.badges.filter((b) => b.got).map((b) => b.k));
  res.json({
    saved: true, best: after.per[g.k].best, xp: after.xp, gained: Math.max(0, after.xp - before.xp),
    level: after.level, levelUp: after.level.n > before.level.n,
    badges: after.badges.filter((b) => b.got && !had.has(b.k)).map((b) => ({ k: b.k, name: b.name, desc: b.desc })),
  });
}));

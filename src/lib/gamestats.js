// Ойыншының жетістіктері: XP, деңгей, белгішелер, күннің тапсырмасы.
// Барлығы game_scores кестесінен есептеледі (бөлек кесте керек емес).
import { BADGES, GAME, GAMES, LEVELS } from '../data/games.js';
import { many } from './db.js';

const SCORED = GAMES.filter((g) => g.scored);
export const CAMPAIGN = new Set(['cannon', 'mirrors', 'lamp', 'lander']);

// Бір ойынның XP-ы: әр ойналым үшін (ұпай / ең жоғары ұпай) · 100, «Миллионерде» логарифмдік шкала
export function playXp(game, score) {
  const g = GAME[game];
  if (!g || !g.max) return 0;
  if (game === 'millionaire') return score > 0 ? Math.round(100 * Math.log10(1 + score) / Math.log10(1 + g.max)) : 0;
  return Math.round(100 * Math.max(0, Math.min(1, score / g.max)));
}

export function levelOf(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const [from, name] = LEVELS[i], next = LEVELS[i + 1];
  return { n: i + 1, name, from, to: next ? next[0] : null, nextName: next ? next[1] : null, pct: next ? Math.round(100 * (xp - from) / (next[0] - from)) : 100 };
}

// Күннің тапсырмасы: күнге қарай таңдалатын ұпайлы ойын (бәріне бірдей)
export function dailyGame(date = new Date()) {
  const d = new Date(date.getTime() + 5 * 3600e3).toISOString().slice(0, 10); // Қазақстан уақыты
  let h = 0;
  for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { day: d, game: SCORED[h % SCORED.length] };
}

export async function playerStats(userId) {
  const rows = await many(
    `SELECT game, score, section, (created_at AT TIME ZONE 'Asia/Almaty')::date AS day FROM game_scores WHERE user_id = $1 ORDER BY created_at, id`, [userId]);
  const per = {};
  let xp = 0;
  const campBest = {};
  const days7 = new Set();
  const since = new Date(Date.now() - 7 * 86400e3);
  for (const r of rows) {
    const g = GAME[r.game];
    if (!g) continue;
    // Деңгейлі (жорық) ойындарда ұпай — жалпы прогресс: XP тек нәтиже жақсарғанда (+ әр ойынға 2 XP) беріледі
    if (CAMPAIGN.has(r.game)) { const prev = campBest[r.game] || 0; xp += 2 + Math.max(0, playXp(r.game, r.score) - playXp(r.game, prev)); campBest[r.game] = Math.max(prev, r.score); }
    else xp += playXp(r.game, r.score);
    const p = per[r.game] || (per[r.game] = { plays: 0, best: 0 });
    p.plays++; p.best = Math.max(p.best, r.score);
    if (new Date(r.day) >= since) days7.add(String(r.day));
  }
  const daily = dailyGame();
  const dailyDone = rows.some((r) => r.section === 'daily' && toDay(r.day) === daily.day);
  const plays = rows.length;
  const games = Object.keys(per);
  const has = {
    first: plays >= 1,
    ten: plays >= 10,
    fifty: plays >= 50,
    explorer: games.length >= 5,
    all: SCORED.every((g) => per[g.k]),
    perfect: games.some((k) => GAME[k].max && per[k].best >= GAME[k].max),
    arcade: GAMES.filter((g) => g.cat === 'arcade' && g.scored).every((g) => per[g.k] && per[g.k].best >= 0.7 * g.max),
    millionaire: !!(per.millionaire && per.millionaire.best >= 1000000),
    daily: rows.some((r) => r.section === 'daily'),
    week: days7.size >= 5,
  };
  const badges = BADGES.map((b) => ({ ...b, got: !!has[b.k] }));
  return { xp, level: levelOf(xp), plays, per, badges, daily: { ...daily, done: dailyDone } };
}
function toDay(d) { return d instanceof Date ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : String(d).slice(0, 10); }

// Апталық XP рейтингі (барлық ойын бойынша)
export async function weeklyBoard(schoolId = null, limit = 10) {
  const params = [];
  let extra = '';
  if (schoolId) { params.push(schoolId); extra = ` AND u.school_id = $${params.length}`; }
  const rows = await many(
    `SELECT u.id, u.full_name, s.name AS school_name, c.grade, c.letter, g.game, g.score
       FROM game_scores g JOIN users u ON u.id = g.user_id
  LEFT JOIN schools s ON s.id = u.school_id LEFT JOIN classes c ON c.id = u.class_id
      WHERE g.created_at > now() - interval '7 days' AND u.status <> 'blocked'${extra}`, params);
  const by = new Map();
  for (const r of rows) {
    const e = by.get(r.id) || { full_name: r.full_name, school_name: r.school_name, grade: r.grade, letter: r.letter, best: 0, camp: {} };
    if (CAMPAIGN.has(r.game)) e.camp[r.game] = Math.max(e.camp[r.game] || 0, playXp(r.game, r.score));
    else e.best += playXp(r.game, r.score);
    by.set(r.id, e);
  }
  for (const e of by.values()) e.best += Object.values(e.camp).reduce((a, b) => a + b, 0);
  return [...by.values()].filter((e) => e.best > 0).sort((a, b) => b.best - a.best).slice(0, limit);
}

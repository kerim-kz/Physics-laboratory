// Сайт ішіндегі хабарламалар (оқушыға «сізді тестке қосты» сияқты хаттар).
import { many, one, q } from './db.js';

export async function notify(userIds, { kind = 'info', title, body = '', link = '' }, client = null) {
  const ids = [...new Set(userIds.map(Number).filter(Number.isInteger))];
  if (!ids.length) return;
  const sql = `INSERT INTO notifications(user_id, kind, title, body, link) SELECT x, $2, $3, $4, $5 FROM unnest($1::int[]) AS x`;
  const params = [ids, kind, String(title).slice(0, 200), String(body).slice(0, 1000), String(link).slice(0, 300)];
  if (client) await client.query(sql, params); else await q(sql, params);
}

export async function unreadCount(userId) {
  const r = await one('SELECT count(*) AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [userId]);
  return r ? Number(r.n) : 0;
}

export const recentNotifications = (userId, limit = 50) =>
  many('SELECT id, kind, title, body, link, read_at, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);

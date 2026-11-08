import { config } from './config.js';
import { hashPassword } from './lib/auth.js';
import { many, one, q, tx } from './lib/db.js';
import { SEED_UNITS } from './data/questions.js';

// Платформа иесін (бас әкімшіні) ортаның айнымалыларынан жасау.
// Иесі бар болса, ештеңе өзгертілмейді — құпиясөзді сайттағы «Құпиясөз» бетінен ауыстырыңыз.
// Жасалмай қалса, себебі ownerSetupProblem-де сақталып, кіру бетінде көрсетіледі.
const OWNER_LOGIN_RE = /^[\p{L}\p{N}._-]{3,32}$/u;
export let ownerSetupProblem = null;

export async function ensureOwner() {
  ownerSetupProblem = null;
  const owner = await one('SELECT id FROM users WHERE is_owner');
  if (owner) return;
  const login = String(config.owner.login || '').trim();
  const password = String(config.owner.password || '').trim();
  const name = String(config.owner.name || '').trim() || 'Платформа иесі';
  if (!login || !password) ownerSetupProblem = 'ADMIN_LOGIN немесе ADMIN_PASSWORD мәні бос.';
  else if (!OWNER_LOGIN_RE.test(login)) ownerSetupProblem = 'ADMIN_LOGIN 3–32 таңбадан тұрсын: әріптер, сандар, нүкте, сызықша; бос орынсыз.';
  else if (password.length < 8) ownerSetupProblem = 'ADMIN_PASSWORD кемінде 8 таңба болсын.';
  if (ownerSetupProblem) {
    console.warn(`ЕСКЕРТУ: платформа иесі жасалмады — ${ownerSetupProblem}`);
    return;
  }
  const hash = await hashPassword(password);
  const taken = await one('SELECT id FROM users WHERE lower(login) = lower($1)', [login]);
  if (taken) {
    // Осы логинмен бұрын тіркелген аккаунт иесінің аккаунтына айналады; құпиясөз — ADMIN_PASSWORD.
    await q(`UPDATE users SET role = 'admin', is_owner = true, status = 'active', password_hash = $2,
                              class_id = NULL, must_change_password = false WHERE id = $1`, [taken.id, hash]);
  } else {
    await q(`INSERT INTO users(role, login, password_hash, full_name, status, is_owner)
             VALUES ('admin', $1, $2, $3, 'active', true)`, [login, hash, name]);
  }
  console.log(`Платформа иесі жасалды: ${login}`);
}

// Емтихан сұрақтарының бастапқы банкі (seed_key бойынша бір рет қана қосылады).
export async function seedQuestions() {
  const existing = new Set((await many('SELECT seed_key FROM exam_units WHERE seed_key IS NOT NULL')).map((r) => r.seed_key));
  let added = 0;
  for (const u of SEED_UNITS) {
    if (existing.has(u.key)) continue;
    await tx(async (c) => {
      const unit = await c.query(
        `INSERT INTO exam_units(exam, title, grade, section, context, seed_key) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [u.exam, u.title || '', u.grade || 0, u.section || '', u.context || '', u.key]);
      let ord = 0;
      for (const qn of u.questions) {
        const kind = qn.correct.length > 1 ? 'multi' : 'single';
        await c.query(
          `INSERT INTO exam_questions(unit_id, ord, kind, stem, options, correct, explanation, points)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [unit.rows[0].id, ord++, kind, qn.stem, JSON.stringify(qn.options), JSON.stringify(qn.correct), qn.explain || '', kind === 'multi' ? 2 : 1]);
      }
    });
    added++;
  }
  if (added) console.log(`Емтихан банкіне ${added} блок қосылды.`);
}

export async function bootstrap() {
  await ensureOwner();
  await seedQuestions();
  await q(`DELETE FROM sessions WHERE expires_at < now()`);
}

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

// Емтихан сұрақтарының бастапқы банкі: жаңа блок seed_key бойынша бір рет қосылады;
// деректер файлындағы rev дерекқордағы seed_rev-тен үлкен болса, блоктың мәтіні мен сұрақтары жаңартылады
// (сұрақтар ord бойынша орнында жаңартылады, сондықтан бұрынғы тапсыру нәтижелері сақталады).
const qRow = (qn) => {
  const kind = qn.kind || (qn.correct.length > 1 ? 'multi' : 'single');
  return [kind, qn.stem, JSON.stringify(qn.options), JSON.stringify(qn.correct), qn.explain || '',
    qn.points || (kind === 'multi' ? 2 : 1), qn.image || '', qn.rubric || ''];
};

export async function seedQuestions() {
  const existing = new Map((await many('SELECT id, seed_key, seed_rev FROM exam_units WHERE seed_key IS NOT NULL')).map((r) => [r.seed_key, r]));
  let added = 0;
  let updated = 0;
  for (const u of SEED_UNITS) {
    const rev = u.rev || 1;
    // Бағыт: PISA мен ББЖМ-де көрсетілмесе — жаратылыстану (бұрынғы физика тапсырмалары).
    const domain = u.domain || (u.exam === 'ubt' ? '' : 'science');
    const ex = existing.get(u.key);
    if (ex) {
      if (ex.seed_rev >= rev) continue;
      await tx(async (c) => {
        await c.query(
          `UPDATE exam_units SET title = $2, grade = $3, section = $4, context = $5, domain = $6, image = $7, source = $8, seed_rev = $9
            WHERE id = $1`,
          [ex.id, u.title || '', u.grade || 0, u.section || '', u.context || '', domain, u.image || '', u.source || '', rev]);
        let ord = 0;
        for (const qn of u.questions) {
          const row = qRow(qn);
          const r = await c.query(
            `UPDATE exam_questions SET kind = $3, stem = $4, options = $5, correct = $6, explanation = $7, points = $8, image = $9, rubric = $10
              WHERE unit_id = $1 AND ord = $2`, [ex.id, ord, ...row]);
          if (!r.rowCount) {
            await c.query(
              `INSERT INTO exam_questions(unit_id, ord, kind, stem, options, correct, explanation, points, image, rubric)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [ex.id, ord, ...row]);
          }
          ord++;
        }
        await c.query('DELETE FROM exam_questions WHERE unit_id = $1 AND ord >= $2', [ex.id, ord]);
      });
      updated++;
      continue;
    }
    await tx(async (c) => {
      const unit = await c.query(
        `INSERT INTO exam_units(exam, title, grade, section, context, seed_key, domain, image, source, seed_rev)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [u.exam, u.title || '', u.grade || 0, u.section || '', u.context || '', u.key, domain, u.image || '', u.source || '', rev]);
      let ord = 0;
      for (const qn of u.questions) {
        await c.query(
          `INSERT INTO exam_questions(unit_id, ord, kind, stem, options, correct, explanation, points, image, rubric)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [unit.rows[0].id, ord++, ...qRow(qn)]);
      }
    });
    added++;
  }
  if (added) console.log(`Емтихан банкіне ${added} блок қосылды.`);
  if (updated) console.log(`Емтихан банкінде ${updated} блок жаңартылды.`);
}

export async function bootstrap() {
  await ensureOwner();
  await seedQuestions();
  await q(`DELETE FROM sessions WHERE expires_at < now()`);
}

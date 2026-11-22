// ЖИ құралының негізі: Anthropic Claude API-ге сұраныс, күнделікті лимит, шығын есебі.
// API кілті тек сервердің ANTHROPIC_API_KEY ортасының айнымалысынан алынады; кілт болмаса,
// ЖИ функциялары «бапталмаған» күйінде көрсетіледі және сұраныс жіберілмейді.
import Anthropic from '@anthropic-ai/sdk';
import { many, one, q } from './db.js';
import { getSettings } from './settings.js';
import { toInt } from './util.js';

// [идентификатор, атауы, кіріс $/1 млн токен, шығыс $/1 млн токен]
export const AI_MODELS = [
  ['claude-opus-5-5', 'Opus 5.5 — ең сапалы (ұсынылады)', 4, 20],
  ['claude-sonnet-5-5', 'Sonnet 5.5 — сапа мен бағаның теңгерімі', 2, 10],
  ['claude-haiku-5-5', 'Haiku 5.5 — ең арзан әрі жылдам', 0.1, 0.5],
];
const MODEL = Object.fromEntries(AI_MODELS.map((m) => [m[0], m]));
export const DEFAULT_MODEL = AI_MODELS[0][0];

export const FEATURE_NAME = {
  tutor: 'Оқушыға көмекші', analyze: 'Нәтижелерді талдау', grade: 'Ашық жауапты бағалау', generate: 'Тапсырма генераторы',
};

export class AiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Тесттерде нақты API-ге бармау үшін орнына функция қоюға болады: runner(params, onText) → {text, stop, usage, model}.
let runner = null;
export function setAiRunner(fn) { runner = fn; }
export const aiConfigured = () => !!runner || !!process.env.ANTHROPIC_API_KEY;

let client = null;
const getClient = () => (client ||= new Anthropic({ maxRetries: 2, timeout: 5 * 60_000 }));

export async function aiSettings() {
  const s = await getSettings();
  return {
    enabled: s.ai_enabled !== '0',
    model: MODEL[s.ai_model] ? s.ai_model : DEFAULT_MODEL,
    student: Math.max(0, toInt(s.ai_student_limit, 20)),
    teacher: Math.max(0, toInt(s.ai_teacher_limit, 200)),
  };
}

// Алматы уақыты бойынша бүгінгі күннің басы (лимит түн ортасында жаңарады).
const DAY_START = `((date_trunc('day', (now() AT TIME ZONE 'UTC') + interval '5 hours') - interval '5 hours') AT TIME ZONE 'UTC')`;

export async function quota(user) {
  const st = await aiSettings();
  const limit = user.role === 'admin' ? null : user.role === 'teacher' && user.status === 'active' ? st.teacher : st.student;
  const { n } = await one(`SELECT count(*)::int AS n FROM ai_usage WHERE user_id = $1 AND ok IS NOT FALSE AND created_at >= ${DAY_START}`, [user.id]);
  return { used: n, limit, left: limit === null ? null : Math.max(0, limit - n) };
}

// ЖИ-дің қазіргі күйі (бет үшін): бапталған ба, қосулы ма, қанша сұраныс қалды.
export async function aiState(user) {
  const st = await aiSettings();
  const ready = aiConfigured() && st.enabled;
  return { configured: aiConfigured(), enabled: st.enabled, ready, quota: user && ready ? await quota(user) : null };
}

function friendlyError(e) {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return new AiError(503, 'ЖИ қызметінің API кілті жарамсыз немесе рұқсаты жоқ. Әкімші кілтті тексеруі керек.');
  }
  if (e instanceof Anthropic.RateLimitError) return new AiError(429, 'ЖИ қызметіне сұраныс тым көп. Бір минуттан кейін қайталап көріңіз.');
  if (e instanceof Anthropic.BadRequestError && /credit|balance|billing/i.test(e.message)) {
    return new AiError(503, 'ЖИ қызметінің балансы таусылған. Әкімші Anthropic Console-да балансты толтыруы керек.');
  }
  if (e instanceof Anthropic.APIConnectionError) return new AiError(503, 'ЖИ қызметіне қосылу мүмкін болмады. Сәлден соң қайталаңыз.');
  if (e instanceof Anthropic.APIError) return new AiError(502, 'ЖИ қызметі уақытша қолжетімсіз. Сәлден соң қайталаңыз.');
  return new AiError(500, 'ЖИ сұранысын орындау кезінде қате шықты.');
}

// Бір сұраныс: модельге жіберіп, мәтінді (ағынмен) қайтарады.
async function callModel({ model, system, messages, maxTokens, effort, schema }, onText) {
  if (runner) return runner({ model, system, messages, maxTokens, effort, schema }, onText);
  const params = {
    model, max_tokens: maxTokens, system, messages,
    output_config: { effort, ...(schema ? { format: { type: 'json_schema', schema } } : {}) },
  };
  // Қауіпсіздік сүзгісі сұранысты қабылдамаса, сервер оны ұсынылған басқа модельде қайта орындайды
  // (Haiku үшін бұл мүмкіндік жоқ).
  if (!model.includes('haiku')) { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
  const stream = getClient().beta.messages.stream(params);
  if (onText) {
    stream.on('streamEvent', (ev) => { if (ev.type === 'content_block_start' && ev.content_block.type === 'fallback') onText(null); });
    stream.on('text', (d) => onText(d));
  }
  const msg = await stream.finalMessage();
  // Ауысу болса, тек соңғы модельдің мәтінін аламыз.
  const last = msg.content.map((b) => b.type).lastIndexOf('fallback');
  const text = msg.content.slice(last + 1).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, stop: msg.stop_reason, usage: msg.usage, model: msg.model };
}

const busy = new Set();

// Негізгі функция: лимитті тексереді, сұранысты орындайды, есепке жазады.
//   onText(delta) — ағынмен келген мәтін бөлігі (null — мәтінді басынан бастау керек).
export async function runAi(user, feature, opts, onText = null) {
  const st = await aiSettings();
  if (!aiConfigured()) throw new AiError(503, 'ЖИ құралы әлі бапталмаған: әкімші серверге API кілтін қосуы керек.');
  if (!st.enabled) throw new AiError(503, 'ЖИ құралын әкімші уақытша өшірген.');
  const qt = await quota(user);
  if (qt.left !== null && qt.left <= 0) throw new AiError(429, `Бүгінгі ЖИ лимиті таусылды (${qt.limit} сұраныс). Ертең қайта жаңарады.`);
  if (busy.has(user.id)) throw new AiError(429, 'Алдыңғы сұраныс әлі орындалуда. Біраз күтіңіз.');
  busy.add(user.id);
  const row = await one('INSERT INTO ai_usage(user_id, role, feature, model) VALUES ($1,$2,$3,$4) RETURNING id', [user.id, user.role, feature, st.model]);
  try {
    const r = await callModel({ model: st.model, effort: 'medium', maxTokens: 16000, ...opts }, onText);
    const u = r.usage || {};
    const input = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    await q('UPDATE ai_usage SET ok = true, model = $1, input_tokens = $2, output_tokens = $3 WHERE id = $4', [r.model || st.model, input, u.output_tokens || 0, row.id]);
    if (r.stop === 'refusal') return { text: '', refused: true, left: qt.left === null ? null : qt.left - 1 };
    if (r.stop === 'max_tokens' && !r.text) throw new AiError(502, 'Жауап тым ұзақ болып шықты. Сұранысты қысқартып көріңіз.');
    return { text: r.text, refused: false, truncated: r.stop === 'max_tokens', left: qt.left === null ? null : qt.left - 1 };
  } catch (e) {
    await q('UPDATE ai_usage SET ok = false WHERE id = $1', [row.id]);
    const fe = friendlyError(e);
    if (fe.status >= 500 && !(e instanceof AiError)) console.error('ЖИ қатесі:', e?.status || '', e?.message || e);
    throw fe;
  } finally {
    busy.delete(user.id);
  }
}

// Әкімшіге: соңғы 30 күндегі пайдалану және болжамды шығын (АҚШ долларымен).
export async function usageReport() {
  const byModel = await many(`SELECT model, count(*)::int AS n, sum(input_tokens)::bigint AS inp, sum(output_tokens)::bigint AS outp
                                FROM ai_usage WHERE ok AND created_at > now() - interval '30 days' GROUP BY model ORDER BY n DESC`);
  const byFeature = await many(`SELECT feature, role, count(*)::int AS n FROM ai_usage WHERE ok AND created_at > now() - interval '30 days'
                                 GROUP BY feature, role ORDER BY n DESC`);
  const today = await one(`SELECT count(*)::int AS n, count(DISTINCT user_id)::int AS users FROM ai_usage WHERE ok AND created_at >= ${DAY_START}`);
  const failed = await one(`SELECT count(*)::int AS n FROM ai_usage WHERE ok = false AND created_at > now() - interval '30 days'`);
  const top = await many(`SELECT u.full_name, u.role, count(*)::int AS n FROM ai_usage a JOIN users u ON u.id = a.user_id
                           WHERE a.ok AND a.created_at > now() - interval '30 days' GROUP BY u.id ORDER BY n DESC LIMIT 10`);
  let cost = 0;
  for (const m of byModel) {
    const [, , pin, pout] = MODEL[m.model] || Object.values(MODEL).find((x) => m.model.startsWith(x[0])) || AI_MODELS[0];
    m.cost = (Number(m.inp) * pin + Number(m.outp) * pout) / 1e6;
    cost += m.cost;
  }
  return { byModel, byFeature, today, failed: failed.n, top, cost };
}

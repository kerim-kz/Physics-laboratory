// ЖИ құралының негізі: Anthropic Claude API-ге немесе тегін OpenAI-үйлесімді провайдерге сұраныс, күнделікті лимит, шығын есебі.
// Кілттер тек сервердің орта айнымалыларынан алынады (ANTHROPIC_API_KEY немесе AI_BASE_URL + AI_API_KEY + AI_MODEL); кілт болмаса,
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

// Тегін / басқа провайдер: OpenAI-үйлесімді кез келген API (FreeLLMAPI, Google AI Studio, Groq, OpenRouter т.б.).
// AI_BASE_URL (мысалы, https://…/v1), AI_API_KEY және AI_MODEL берілсе, Anthropic-тің орнына соны қолданамыз.
export function compatConfig() {
  const base = String(process.env.AI_BASE_URL || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  const key = String(process.env.AI_API_KEY || '').trim();
  if (!base || !key) return null;
  // AI_MODEL-ге үтір арқылы бірнеше модель жазуға болады: біріншісі бос болмаса, келесісі қолданылады.
  const models = String(process.env.AI_MODEL || '').split(',').map((m) => m.trim().replace(/^models\//, '')).filter(Boolean);
  if (!models.length) models.push('auto');
  return { base, key, models, model: models[0], host: (() => { try { return new URL(base).host; } catch { return base; } })() };
}
// Қай провайдер қосулы: 'compat' (тегін / OpenAI-үйлесімді), 'anthropic' немесе null.
export const aiProvider = () => (compatConfig() ? 'compat' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : null);
export const aiConfigured = () => !!runner || !!aiProvider();

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
  if (aiProvider() === 'compat') return callCompat({ system, messages, maxTokens, schema }, onText);
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

// ---------------- OpenAI-үйлесімді провайдер (тегін жол) ----------------
const COMPAT_MAX_TOKENS = 8192; // тегін модельдердің көбінде шығыс шектеулі
const JSON_HINT = (schema) => `\n\nЖауапты ТЕК жарамды JSON түрінде бер — алдында да, соңында да басқа мәтін, түсініктеме немесе \`\`\` белгісі болмасын. JSON схемасы:\n${JSON.stringify(schema)}`;

let RETRY_MS = 2000;
export function setRetryDelay(ms) { RETRY_MS = ms; } // тесттер үшін
function compatError(status, body) {
  const e = compatErrorMsg(status, body);
  e.httpStatus = status === 400 && /api.?key/i.test(body) ? 401 : status;
  return e;
}
function compatErrorMsg(status, body) {
  if (status === 401 || status === 403 || (status === 400 && /api.?key/i.test(body))) return new AiError(503, 'Тегін ЖИ провайдерінің кілті (AI_API_KEY) жарамсыз немесе рұқсаты жоқ. Әкімші кілтті тексеруі керек.');
  if (status === 429) return new AiError(429, 'Тегін ЖИ провайдерінің лимиті уақытша таусылды. Бірнеше минуттан кейін қайталап көріңіз.');
  if (status === 404) return new AiError(503, 'ЖИ моделі табылмады: AI_MODEL атауын немесе AI_BASE_URL мекенжайын тексеру керек.');
  if (status === 400 && /model/i.test(body)) return new AiError(503, 'ЖИ моделінің атауы (AI_MODEL) қате болуы мүмкін. Әкімші тексеруі керек.');
  if (status === 503 || status === 500 || status === 502 || status === 504) return new AiError(503, 'Тегін ЖИ моделі қазір қатты жүктелген (Google жағында). Бір-екі минуттан кейін қайталаңыз.');
  return new AiError(502, 'Тегін ЖИ провайдері уақытша қолжетімсіз. Сәлден соң қайталаңыз.');
}

// <think>…</think> ойлау бөлігін көрсетпейміз (кейбір ашық модельдер оны мәтінге қосады).
const visibleText = (raw) => raw.replace(/<think>[\s\S]*?(<\/think>\s*|$)/g, '').replace(/^\s+/, '');

async function callCompat({ system, messages, maxTokens, schema }, onText) {
  const c = compatConfig();
  const msgs = [{ role: 'system', content: schema ? system + JSON_HINT(schema) : system }, ...messages];
  const send = (model) => fetch(`${c.base}/chat/completions`, {
    method: 'POST', headers: { authorization: `Bearer ${c.key}`, 'content-type': 'application/json', accept: 'text/event-stream, application/json' },
    body: JSON.stringify({ model, stream: true, max_tokens: Math.min(maxTokens || 4000, COMPAT_MAX_TOKENS), messages: msgs }),
    signal: AbortSignal.timeout(4 * 60_000), // тегін сервер «ұйықтап» тұрса, оянуына уақыт керек
  });
  // Уақытша қате (жүктеме, лимит) болса — сәл күтіп қайталаймыз, сосын тізімдегі келесі модельге көшеміз.
  let res = null, used = c.models[0], lastErr = null;
  outer: for (const m of c.models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { res = await send(m); } catch { lastErr = new AiError(503, 'Тегін ЖИ провайдеріне қосылу мүмкін болмады. Сервер «ұйықтап» тұрған болуы мүмкін — бір минуттан кейін қайталаңыз.'); res = null; break; }
      if (res.ok) { used = m; break outer; }
      const t = await res.text().catch(() => '');
      console.error('ЖИ провайдерінің қатесі:', m, res.status, t.slice(0, 300));
      lastErr = compatError(res.status, t);
      res = null;
      if (![429, 500, 502, 503, 504].includes(lastErr.httpStatus)) break; // 404 т.б. — бірден келесі модель
      if (attempt === 0) await new Promise((r) => setTimeout(r, RETRY_MS));
    }
    if (lastErr && [401, 403].includes(lastErr.httpStatus)) break; // кілт қате — басқа модель көмектеспейді
  }
  if (!res) throw lastErr;
  let raw = '', sent = '', finish = null, usage = null, model = res.headers.get('x-routed-via') || used;
  const emit = () => {
    if (!onText) return;
    const vis = visibleText(raw);
    if (vis.startsWith(sent)) { if (vis.length > sent.length) onText(vis.slice(sent.length)); } else { onText(null); onText(vis); }
    sent = vis;
  };
  const take = (o) => {
    if (o.error) throw compatError(Number(o.error.code) || 502, JSON.stringify(o.error));
    const ch = o.choices && o.choices[0];
    const piece = ch ? (ch.delta?.content ?? ch.message?.content ?? '') : '';
    if (typeof piece === 'string' && piece) { raw += piece; emit(); }
    if (ch?.finish_reason) finish = ch.finish_reason;
    if (o.usage) usage = o.usage;
    if (o.model && !res.headers.get('x-routed-via')) model = o.model;
  };
  if ((res.headers.get('content-type') || '').includes('application/json')) {
    take(await res.json()); // провайдер ағынсыз жауап берсе
  } else {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const m = line.match(/^data:\s?(.*)$/);
          if (!m || !m[1].trim() || m[1].trim() === '[DONE]') continue;
          let o;
          try { o = JSON.parse(m[1]); } catch { continue; }
          take(o);
        }
      }
    } catch (e) {
      if (e instanceof AiError) throw e;
      throw new AiError(502, 'Тегін ЖИ провайдерімен байланыс үзілді. Қайталап көріңіз.');
    }
  }
  const text = visibleText(raw).trim();
  if (!text) throw new AiError(502, 'Тегін ЖИ бос жауап қайтарды. Қайталап көріңіз.');
  return {
    text, model,
    stop: finish === 'length' ? 'max_tokens' : finish === 'content_filter' ? 'refusal' : 'end_turn',
    usage: { input_tokens: usage?.prompt_tokens || 0, output_tokens: usage?.completion_tokens || 0 },
  };
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
  const model = !runner && aiProvider() === 'compat' ? compatConfig().model : st.model;
  const row = await one('INSERT INTO ai_usage(user_id, role, feature, model) VALUES ($1,$2,$3,$4) RETURNING id', [user.id, user.role, feature, model]);
  try {
    const r = await callModel({ model, effort: 'medium', maxTokens: 16000, ...opts }, onText);
    const u = r.usage || {};
    const input = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    await q('UPDATE ai_usage SET ok = true, model = $1, input_tokens = $2, output_tokens = $3 WHERE id = $4', [String(r.model || model).slice(0, 120), input, u.output_tokens || 0, row.id]);
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
    // Тізімде жоқ модель — тегін провайдердікі, шығыны 0.
    const [, , pin, pout] = MODEL[m.model] || Object.values(MODEL).find((x) => m.model.startsWith(x[0])) || [0, 0, 0, 0];
    m.cost = (Number(m.inp) * pin + Number(m.outp) * pout) / 1e6;
    m.free = !pin;
    cost += m.cost;
  }
  return { byModel, byFeature, today, failed: failed.n, top, cost };
}

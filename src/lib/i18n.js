// Үш тіл: қазақша (негізгі), орысша, ағылшынша.
// Сайттың мәтіні қазақша жазылған; аударма — «қазақша мәтін → аударма» сөздігі (src/i18n/<тіл>/*.json).
// Сервер дайын HTML-дің мәтін түйіндері мен атрибуттарын сөздік бойынша ауыстырады, ал браузердегі
// динамикалық мәтін мен canvas-тағы жазуларды public/js/i18n.js сол сөздікпен аударады.
// Сөздікте жоқ мәтін (мысалы, пайдаланушы жазған атаулар) қазақша қалады.
//
// Кілттегі {0}, {1} … — айнымалы бөліктер (сан немесе кез келген мәтін); аудармада сол белгілер қайталанады.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LANGS = ['kk', 'ru', 'en'];
export const LANG_LABEL = { kk: 'ҚАЗ', ru: 'РУС', en: 'ENG' };
export const LANG_NAME = { kk: 'Қазақша', ru: 'Русский', en: 'English' };
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'i18n');

const HAS_KZ = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
const NUM = /\d+(?:[.,]\d+)*/g;
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Сөздік: src/i18n/*.tsv — әр жолда «қазақша<TAB>орысша<TAB>ағылшынша» (Excel-де ашып түзетуге болады).
// {#} — ретімен {0}, {1} … болып нөмірленеді; аудармада сөз тәртібі өзгерсе, {0}, {1} деп нақты жазуға болады.
// Жол басындағы «<>» — HTML белгілері бар тұтас сөйлем (белгілер аудармада сақталады). # — түсініктеме.
const COLS = { ru: 1, en: 2 };
const GENERIC = new Set();
const numberize = (s) => { let i = 0; return s.replace(/\{#\}/g, () => `{${i++}}`); };
function loadDict(lang) {
  const out = {};
  let files = [];
  try { files = fs.readdirSync(DIR).filter((f) => f.endsWith('.tsv')).sort(); } catch { return out; }
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(DIR, f), 'utf8').split(/\r?\n/)) {
      if (!line.trim() || line.startsWith('#') || line.startsWith('kk\t')) continue;
      const cells = line.split('\t');
      const k = cells[0].replace(/^<>/, '');
      const v = (cells[COLS[lang]] || '').trim();
      if (!k || !v) continue;
      const key = norm(numberize(k));
      out[key] = numberize(v);
      // {0}, {1} деп нақты жазылған кілт — кез келген мәтінді қамтитын үлгі (аты-жөн, сынып әрпі т.б.);
      // {#} — тек сан. Осылайша «{#} оқушы» үлгісі «тест тапсырған оқушы» сияқты жолдарға жабыспайды.
      if (/\{\d+\}/.test(k)) GENERIC.add(key);
    }
  }
  return out;
}

// Іздеу құрылымы: дәл сәйкестік + үлгілер ({0} …).
function compile(dict) {
  const exact = new Map();
  const patterns = [];
  for (const [k, v] of Object.entries(dict)) {
    exact.set(k, v);
    if (GENERIC.has(k)) {
      const parts = k.split(/\{\d+\}/);
      const anchor = parts.reduce((a, b) => (b.trim().length > a.length ? b.trim() : a), '');
      const order = [...k.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
      const re = new RegExp(`^${parts.map(escRe).join('([^·]+?)')}$`, 's');
      patterns.push({ re, v, order, anchor });
    }
  }
  return { exact, patterns, dict };
}

const fill = (tpl, vals) => tpl.replace(/\{(\d+)\}/g, (m, i) => (vals[i] !== undefined ? vals[i] : m));

// Бір мәтінді аудару (табылмаса — null).
export function lookup(c, text) {
  const s = norm(text);
  if (!s || !HAS_KZ.test(s)) return null;
  const hit = c.exact.get(s);
  if (hit !== undefined) return hit;
  // Сандарды {0}, {1} … деп ауыстырып іздеу
  const nums = [];
  const key = s.replace(NUM, (m) => `{${nums.push(m) - 1}}`);
  if (nums.length) {
    const h = c.exact.get(key);
    if (h !== undefined) return fill(h, nums);
  }
  // «А · Б · В» түріндегі құрама жол — әр бөлігі жеке аударылады
  if (s.includes(' · ')) {
    let any = false;
    const out = s.split(' · ').map((part) => { const r = lookup(c, part); if (r !== null) { any = true; return r; } return part; });
    if (any) return out.join(' · ');
  }
  // Кез келген мәтінді қамтитын үлгілер
  for (const p of c.patterns) {
    if (p.anchor && !s.includes(p.anchor)) continue;
    const m = s.match(p.re);
    if (m) {
      const vals = [];
      p.order.forEach((idx, j) => { const v = m[j + 1]; const r = HAS_KZ.test(v) ? lookup(c, v) : null; vals[idx] = r === null ? v : r; });
      return fill(p.v, vals);
    }
  }
  return null;
}

const cache = {};
let missLog = null; // жинау режимі: аудармасы жоқ мәтіндер (I18N_COLLECT=1)
export function compiled(lang) {
  if (!cache[lang]) cache[lang] = compile(loadDict(lang));
  return cache[lang];
}
export function reloadDicts() { for (const k of Object.keys(cache)) delete cache[k]; }
export function startCollect() { missLog = new Map(); }
export function collected() { return missLog; }

function tr(c, text) {
  const r = lookup(c, text);
  if (missLog && HAS_KZ.test(text)) {
    // жинау режимі: «А · Б» жолының аударылмаған бөліктерін жеке жазамыз
    for (const part of norm(text).split(' · ')) {
      if (!HAS_KZ.test(part) || lookup(c, part) !== null) continue;
      const k = part.replace(NUM, '{#}');
      missLog.set(k, (missLog.get(k) || 0) + 1);
    }
  }
  return r;
}

// Бір жолды аудару (сервер кодынан тікелей қолдану үшін).
export function t(lang, text) {
  if (lang === 'kk' || !text) return text;
  const r = lookup(compiled(lang), String(text));
  return r === null ? text : r;
}

// ---------------- HTML аудару ----------------
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#039;': "'", '&nbsp;': ' ' };
const unesc = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|#039|nbsp);/g, (m) => ENT[m]);
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');
const SKIP_TAGS = new Set(['script', 'style', 'textarea', 'pre', 'code', 'math']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ATTRS = /(\s(?:placeholder|title|aria-label|alt|data-confirm|label|content)=")([^"]*)(")/g;

function trText(c, raw) {
  if (!HAS_KZ.test(raw)) return raw;
  const plain = unesc(raw);
  const r = tr(c, plain);
  if (r === null) return raw;
  const lead = plain.match(/^\s*/)[0], tail = plain.match(/\s*$/)[0];
  return escText(lead + r + tail);
}

const INLINE = new Set(['b', 'i', 'em', 'strong', 'code', 'a', 'small', 'br', 'sub', 'sup', 'kbd', 'mark', 'u', 'wbr']);
const BLOCKISH = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'label', 'summary', 'dt', 'dd', 'legend', 'figcaption', 'small', 'div', 'span', 'a', 'b', 'button']);
const TOKEN = /<!--[\s\S]*?-->|<[^>]+>|[^<]+/g;
const tagName = (tok) => { const m = tok.match(/^<\/?([a-zA-Z][\w-]*)/); return m ? m[1].toLowerCase() : ''; };

// Ішінде тек «жолішілік» тегтер (b, code, a …) бар элементтің мазмұнын тұтас сөйлем ретінде аудару:
// сөздік кілтінде сол тегтер сақталады (мысалы, «<b>Settings</b> бөлімінде …»).
function wholeInner(c, toks, i, name) {
  let depth = 1, pieces = 0, j = i + 1;
  for (; j < toks.length && j < i + 80; j++) {
    const t = toks[j];
    if (t[0] !== '<') { if (HAS_KZ.test(t)) pieces++; continue; }
    const n = tagName(t);
    if (!n) continue;
    if (n === name && !VOID.has(n)) { if (t[1] === '/') { if (--depth === 0) break; } else depth++; continue; }
    if (!INLINE.has(n) || /\s(class|style|id)=/.test(t)) return null; // құрылымдық элементтер — сөйлем емес
  }
  if (depth !== 0 || j - i < 3) return null;
  const innerToks = toks.slice(i + 1, j);
  if (!innerToks.some((t) => t[0] === '<') || pieces === 0) return null;
  // Сілтемелердің мекенжайы кілтке кірмейді: href="{H}" деп ауыстырылып, аудармаға қайта қойылады
  const hrefs = [];
  const key = norm(innerToks.join('')).replace(/href="[^"]*"/g, (m) => { hrefs.push(m); return 'href="{H}"'; });
  const r = lookup(c, key);
  if (r !== null) { let k = 0; return { j, out: r.replace(/href="\{H\}"/g, () => hrefs[k++] || 'href="#"') }; }
  if (missLog && pieces > 1) { const mk = `<>${key.replace(NUM, '{#}')}`; missLog.set(mk, (missLog.get(mk) || 0) + 1); }
  return { j: -1 };
}

export function translateHtml(html, lang) {
  if (lang === 'kk') return html;
  const c = compiled(lang);
  const toks = String(html).match(TOKEN) || [];
  const out = [];
  let skip = null, depth = 0, quietUntil = -1; // skip: аударылмайтын элемент; quietUntil: тұтас кілті жазылған бөлік
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    if (tok[0] !== '<') {
      if (skip) { out.push(tok); continue; }
      const saved = missLog;
      if (i < quietUntil) missLog = null;
      out.push(trText(c, tok));
      missLog = saved;
      continue;
    }
    if (tok.startsWith('<!')) { out.push(tok); continue; }
    const name = tagName(tok);
    if (!name) { out.push(tok); continue; }
    const closing = tok[1] === '/';
    if (skip) {
      if (!VOID.has(name) && !tok.endsWith('/>')) { if (closing) { if (--depth === 0) skip = null; } else depth++; }
      out.push(tok);
      continue;
    }
    if (!closing && !VOID.has(name) && !tok.endsWith('/>')
      && (SKIP_TAGS.has(name) || /\stranslate="no"|\sclass="[^"]*\bkatex\b/.test(tok))) {
      skip = name; depth = 1;
      out.push(tok);
      continue;
    }
    const opened = closing || !HAS_KZ.test(tok) ? tok : tok.replace(ATTRS, (all, a, v, b) => {
      if (!HAS_KZ.test(v)) return all;
      const r = tr(c, unesc(v));
      return r === null ? all : a + escAttr(r) + b;
    });
    out.push(opened);
    if (!closing && BLOCKISH.has(name) && i >= quietUntil) {
      const w = wholeInner(c, toks, i, name);
      if (w && w.j > 0) { out.push(w.out); i = w.j - 1; continue; }
      if (w && w.j === -1) { const end = toks.indexOf(`</${name}>`, i); quietUntil = end > 0 ? end : quietUntil; }
    }
  }
  return out.join('');
}

// ---------------- Браузерге арналған сөздік ----------------
// window.I18N = {lang, m: {кілт: аударма}} — public/js/i18n.js оны қолданады.
const clientCache = {};
export function clientDict(lang) {
  if (!clientCache[lang]) {
    const dict = compiled(lang).dict;
    const g = Object.keys(dict).filter((k) => GENERIC.has(k));
    const body = `window.I18N=${JSON.stringify({ lang, m: dict, g }).replace(/</g, '\\u003c')};`;
    clientCache[lang] = { body, etag: `"${lang}-${Buffer.byteLength(body)}-${Object.keys(compiled(lang).dict).length}"` };
  }
  return clientCache[lang];
}

// ---------------- Тілді анықтау ----------------
export function pickLang(req) {
  const q = String(req.query?.lang || '');
  if (LANGS.includes(q)) return q;
  const c = String(req.cookies?.lang || '');
  return LANGS.includes(c) ? c : 'kk';
}

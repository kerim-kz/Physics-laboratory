import katex from 'katex';
import { esc, raw } from './html.js';

// Формулаларды серверде бір рет салып, кэште сақтаймыз.
const cache = new Map();

export function tex(src, display = false) {
  const key = (display ? 'D' : 'I') + src;
  let out = cache.get(key);
  if (out === undefined) {
    out = katex.renderToString(src, { throwOnError: false, strict: 'ignore', displayMode: display, output: 'html' });
    cache.set(key, out);
  }
  return raw(out);
}

// Мәтін ішіндегі $...$ (жолішілік) және $$...$$ (бөлек жол) формулаларын салады, қалғанын экрандайды.
export function texText(src) {
  const s = String(src ?? '');
  let out = '';
  let last = 0;
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let m;
  while ((m = re.exec(s))) {
    out += esc(s.slice(last, m.index));
    out += m[1] !== undefined ? `<span class="tex-d">${tex(m[1], true)}</span>` : String(tex(m[2]));
    last = re.lastIndex;
  }
  out += esc(s.slice(last));
  return raw(out);
}

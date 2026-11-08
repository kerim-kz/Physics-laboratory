import katex from 'katex';
import { raw } from './html.js';

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

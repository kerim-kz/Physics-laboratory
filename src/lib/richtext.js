// Тапсырма мәтінін (контекст, сұрақ) HTML-ге айналдыру. Қолдайтын белгілеулер:
//   «| A | B |» деп басталатын қатар жолдар — кесте (бірінші жол — тақырып);
//   «• » немесе «- » деп басталатын жолдар — тізім; «# » — шағын тақырып;
//   қалғаны — абзацтар. Барлық мәтін экрандалады.
import { esc, raw } from './html.js';

export function richText(src) {
  const lines = String(src ?? '').replace(/\r/g, '').split('\n');
  let out = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      out += `<div class="tblwrap rt-tbl"><table><thead><tr>${head.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`
        + `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td class="wrap">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      continue;
    }
    if (/^[•-]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[•-]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[•-]\s+/, '')); i++; }
      out += `<ul class="rt-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
      continue;
    }
    if (line.startsWith('# ')) { out += `<h3 class="rt-h">${esc(line.slice(2))}</h3>`; i++; continue; }
    out += `<p>${esc(line)}</p>`;
    i++;
  }
  return raw(out);
}

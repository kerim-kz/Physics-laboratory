// Статикалық файлдардың нұсқасы: сілтемеге файл мазмұнының хэші қосылады (/css/app.css?v=…).
// Сайт жаңарғанда сілтеме өзгереді, сондықтан браузер ескі сақталған файлды қолданбайды.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');
const cache = new Map();

export function asset(url) {
  if (!url.startsWith('/') || url.startsWith('/vendor/')) return url;
  let v = config.isProd ? cache.get(url) : undefined;
  if (v === undefined) {
    try {
      v = crypto.createHash('sha1').update(fs.readFileSync(path.join(PUBLIC, path.normalize(url)))).digest('hex').slice(0, 10);
    } catch {
      v = '';
    }
    if (config.isProd) cache.set(url, v);
  }
  return v ? `${url}?v=${v}` : url;
}

// Жүктелген файлдарды сақтау: дискіде (Railway томы, VPS) немесе дерекқорда (тегін хостинг,
// мысалы Render — онда диск әр қайта іске қосылғанда тазаланады).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { one, q } from './db.js';

const extOf = (name) => path.extname(String(name || '')).slice(1).toLowerCase();
const newKey = (originalName) => `${crypto.randomBytes(16).toString('hex')}.${extOf(originalName)}`;
const diskPath = (key) => path.join(config.uploadDir, path.basename(String(key || '')));

export const usesDatabase = () => config.fileStorage === 'db';

export function multerStorage() {
  if (usesDatabase()) return multer.memoryStorage();
  return multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(config.uploadDir, { recursive: true }); cb(null, config.uploadDir); },
    filename: (req, file, cb) => cb(null, newKey(file.originalname)),
  });
}

// multer қабылдаған файлды тұрақты сақтайды да, оның кілтін қайтарады.
export async function persistUpload(file) {
  if (!usesDatabase()) return file.filename;
  const key = newKey(file.originalname);
  await q('INSERT INTO stored_files(key, data, size) VALUES ($1, $2, $3)', [key, file.buffer, file.size]);
  return key;
}

// Сақталмай қалған (мысалы, форма қатесі) жүктемені тазалау.
export function discardUpload(file) {
  if (file && file.path) fs.unlink(file.path, () => {});
}

export async function sendStored(res, key) {
  if (usesDatabase()) {
    const row = await one('SELECT data FROM stored_files WHERE key = $1', [key]);
    if (!row) return false;
    res.end(row.data);
    return true;
  }
  const file = diskPath(key);
  if (!key || !fs.existsSync(file)) return false;
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  return true;
}

export async function deleteStored(key) {
  if (!key) return;
  await q('DELETE FROM stored_files WHERE key = $1', [key]);
  fs.unlink(diskPath(key), () => {});
}

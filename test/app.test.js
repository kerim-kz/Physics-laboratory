// Интеграциялық тесттер: нақты PostgreSQL-дағы бос тест базасында HTTP арқылы тексереді.
// Іске қосу: TEST_DATABASE_URL=postgres://... npm test
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';

const DB = process.env.TEST_DATABASE_URL || 'postgres://postgres@localhost:5433/fizika_test';
const OWNER = { login: 'owner', password: 'owner-password-1' };

let server, base, mod, labs, exams;

// ---------- шағын HTTP-клиент (cookie сақтайды) ----------
class Client {
  constructor() { this.jar = {}; }
  cookieHeader() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; '); }
  async req(method, url, { form, json, multipart, headers = {} } = {}) {
    const opts = { method, redirect: 'manual', headers: { cookie: this.cookieHeader(), ...headers } };
    if (form) { opts.body = new URLSearchParams(form).toString(); opts.headers['content-type'] = 'application/x-www-form-urlencoded'; }
    if (json) { opts.body = JSON.stringify(json); opts.headers['content-type'] = 'application/json'; }
    if (multipart) opts.body = multipart;
    const res = await fetch(base + url, opts);
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i), v = pair.slice(i + 1);
      if (v === '' || /Expires=Thu, 01 Jan 1970/i.test(c)) delete this.jar[k]; else this.jar[k] = v;
    }
    const text = res.headers.get('content-type')?.includes('json') ? null : await res.text();
    return { status: res.status, location: res.headers.get('location'), text, res };
  }
  get(url) { return this.req('GET', url); }
  async csrf(url = '/login') {
    const r = await this.get(url);
    const m = r.text.match(/name="_csrf" value="([^"]+)"/) || r.text.match(/data-csrf="([^"]+)"/);
    assert.ok(m, `CSRF белгісі табылмады: ${url}`);
    return m[1];
  }
  async post(url, form = {}, from = '/login') {
    const token = await this.csrf(from);
    return this.req('POST', url, { form: { ...form, _csrf: token } });
  }
  async api(url, json) {
    const token = await this.csrf('/games/quiz');
    const r = await fetch(base + url, { method: 'POST', headers: { cookie: this.cookieHeader(), 'content-type': 'application/json', 'x-csrf-token': token }, body: JSON.stringify(json) });
    return { status: r.status, body: await r.json() };
  }
  async json(method, url, body) {
    const token = await this.csrf('/games/quiz');
    const r = await fetch(base + url, { method, headers: { cookie: this.cookieHeader(), 'content-type': 'application/json', 'x-csrf-token': token }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: r.status === 204 ? null : await r.json().catch(() => null) };
  }
  async login(login, password) {
    const r = await this.post('/login', { login, password });
    assert.equal(r.status, 302, `кіру сәтсіз: ${login}`);
    return r;
  }
}

before(async () => {
  const admin = new pg.Client({ connectionString: DB });
  await admin.connect();
  await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await admin.end();
  process.env.DATABASE_URL = DB;
  process.env.ADMIN_LOGIN = OWNER.login;
  process.env.ADMIN_PASSWORD = OWNER.password;
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fizika-uploads-'));
  process.env.NODE_ENV = 'test';
  const db = await import('../src/lib/db.js');
  const seed = await import('../src/seed.js');
  await db.migrate();
  await seed.bootstrap();
  mod = await import('../src/server.js');
  labs = await import('../src/data/labs.js');
  exams = await import('../src/features/exams.js');
  server = mod.createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  const db = await import('../src/lib/db.js');
  await db.pool.end();
});

describe('ашық беттер', () => {
  test('негізгі беттер ашылады', async () => {
    const c = new Client();
    for (const url of ['/', '/library', '/formulas', '/formulas?section=opt', '/games', '/games/quiz', '/sims', '/sims/lens', '/labs', '/exams', '/exams/pisa', '/exams/ubt/test?mode=exam&n=20', '/shop', '/schools', '/register', '/register/teacher', '/units', '/healthz']) {
      const r = await c.get(url);
      assert.equal(r.status, 200, url);
    }
    assert.equal((await c.get('/sims/nope')).status, 404);
    assert.equal((await c.get('/nope')).status, 404);
  });

  test('2-нұсқа: бүйір мәзір, басты беттегі симуляция, ғалымдар, олимпиада, формула терезесі', async () => {
    const c = new Client();
    const home = await c.get('/');
    assert.match(home.text, /id="drawer"/);
    assert.match(home.text, /id="heroSim"/);
    assert.match(home.text, /data-game="scientist"/);
    assert.match(home.text, /\/js\/hero\.js\?v=[0-9a-f]{10}/);
    assert.match(home.text, /\/css\/app\.css\?v=[0-9a-f]{10}/); // нұсқасы бар сілтеме: ескі стиль кэштен алынбайды
    const { SIMS } = await import('../src/data/sims.js');
    assert.ok(SIMS.length >= 38);
    for (const s of SIMS) assert.equal((await c.get(`/sims/${s.k}`)).status, 200, s.k);
    const sci = await c.get('/scientists');
    assert.equal(sci.status, 200);
    assert.match(sci.text, /Әл-Фараби|әл-Фараби/);
    assert.equal((await c.get('/games/scientist')).status, 200);
    const ol = await c.get('/olympiad?grade=9&level=hard');
    assert.equal(ol.status, 200);
    assert.match(ol.text, /Баллистикалық маятник/);
    assert.doesNotMatch(ol.text, /Мұзды суға|Соңғы секундтағы жол/); // 9-сынып, тек күрделі
    assert.match(ol.text, /class="katex/);
    const olAll = await c.get('/olympiad');
    assert.match(olAll.text, /Ресми олимпиада тапсырмалары: онлайн тест/);
    assert.match(olAll.text, /href="\/olympiad\/test\/2025-audan-7"/);
    assert.doesNotMatch((await c.get('/olympiad?grade=9')).text, /olympiad\/test\/2025-audan-7/);
    assert.equal((await c.get('/files/olympiad/2025-2026-audan-7-tapsyrmalar.pdf')).status, 404); // PDF жүктеуге берілмейді
    const f = await c.get('/formulas');
    assert.match(f.text, /data-formula="kin-1"/);
    assert.match(f.text, /7-сынып/);
    const part = await c.get('/formulas/kin-4?part=1');
    assert.equal(part.status, 200);
    assert.match(part.text, /Анықтамасы/);
    assert.match(part.text, /жылдамдықтың өзгеру шапшаңдығын/);
    assert.doesNotMatch(part.text, /<html/);
    assert.equal((await c.get('/formulas/kin-4')).status, 200);
    assert.equal((await c.get('/formulas/nope-1')).status, 404);
    assert.equal((await c.get('/formulas?grade=8&upto=1&view=section')).status, 200);
    const ubt = await c.get('/exams/ubt');
    assert.match(ubt.text, /толық нұсқа/);
    assert.equal((await c.get('/exams/ubt/test?mode=exam&n=40')).status, 200);
  });

  test('ресми олимпиада онлайн тесті: суреттер, бағалау, жауаптар тек тексергеннен кейін', async () => {
    const { OLYMPIAD_TESTS } = await import('../src/data/olympiad-tests.js');
    const c = new Client();
    for (const t of OLYMPIAD_TESTS) {
      const r = await c.get(`/olympiad/test/${t.k}`);
      assert.equal(r.status, 200, t.k);
      assert.equal((r.text.match(/class="otq-img"/g) || []).length, 30);
      assert.doesNotMatch(r.text, new RegExp(t.key)); // кілт бетке шықпайды
      for (const qq of t.questions.slice(0, 3)) assert.equal((await c.get(`${t.dir}/${qq.img}`)).status, 200);
      // бәрі дұрыс → 50 ұпай
      const all = Object.fromEntries(t.questions.map((qq, i) => [`q${qq.n}`, t.key[i]]));
      const good = await c.post(`/olympiad/test/${t.k}`, all, `/olympiad/test/${t.k}`);
      assert.equal(good.status, 200);
      assert.match(good.text, /<b>50<\/b><span>\/ 50 ұпай/);
      // тек 1 және 16-тапсырма дұрыс → 1 + 2 = 3 ұпай, жарамсыз жауап есепке алынбайды
      const part = await c.post(`/olympiad/test/${t.k}`, { q1: t.key[0], q16: t.key[15], q2: 'Z' }, `/olympiad/test/${t.k}`);
      assert.match(part.text, /<b>3<\/b><span>\/ 50 ұпай/);
      assert.match(part.text, /Жауап берілмеді, дұрысы/);
    }
    assert.equal((await c.get('/olympiad/test/nope')).status, 404);
    const noCsrf = await c.req('POST', '/olympiad/test/2025-audan-7', { form: { q1: 'A' } });
    assert.equal(noCsrf.status, 403);
  });

  test('әр формулада анықтама бар, симуляциялардың формулалары мен файлдары бар', async () => {
    const fs = await import('node:fs');
    const { FORMULAS } = await import('../src/data/formulas.js');
    const { SIMS } = await import('../src/data/sims.js');
    const { OLYMPIAD } = await import('../src/data/olympiad.js');
    const { SCIENTISTS } = await import('../src/data/scientists.js');
    const names = new Set(FORMULAS.map((x) => x.name));
    for (const x of FORMULAS) assert.ok(x.def && x.def.length > 30, x.name);
    for (const s of SIMS) {
      assert.ok(fs.existsSync(new URL(`../public/js/sims/${s.k}.js`, import.meta.url)), s.k);
      for (const n of s.f) assert.ok(names.has(n), `${s.k}: ${n}`);
    }
    const simKeys = new Set(SIMS.map((s) => s.k));
    for (const o of OLYMPIAD) {
      assert.ok(o.steps.length && o.ans && o.tip && o.idea, o.k);
      if (o.sim) assert.ok(simKeys.has(o.sim), o.k);
    }
    for (const g of [7, 8, 9, 10, 11]) for (const lvl of ['easy', 'hard']) assert.ok(OLYMPIAD.some((o) => o.g === g && o.lvl === lvl), `${g} ${lvl}`);
    for (const s of SCIENTISTS) { assert.ok(s.q.length, s.k); if (s.sim) assert.ok(simKeys.has(s.sim), s.k); }
  });

  test('7–11-сынып оқулық құрылымы: формулалар тарауларға бөлінген, симуляциялар бар', async () => {
    const fs = await import('node:fs');
    const { FORMULAS } = await import('../src/data/formulas.js');
    const { SIM } = await import('../src/data/sims.js');
    const { TEXTBOOK, FORMULA_CHAPTER } = await import('../src/data/textbook.js');
    const byName = new Map(FORMULAS.map((f) => [f.name, f]));
    for (const g of [7, 8, 9, 10, 11]) {
      for (const ch of TEXTBOOK[g]) for (const n of ch.f) { assert.ok(byName.has(n), n); assert.equal(byName.get(n).g, g, n); }
      for (const f of FORMULAS.filter((x) => x.g === g)) assert.ok(FORMULA_CHAPTER.has(f.name), `тарауы жоқ: ${f.name}`);
    }
    for (const g of [7, 8, 9, 10, 11]) for (const ch of TEXTBOOK[g]) for (const [, , keys] of [...ch.p, ...(ch.labs || [])]) for (const k of keys) assert.ok(SIM[k], `${g}-сынып симуляциясы жоқ: ${k}`);
    for (const k of Object.keys(SIM)) assert.ok(fs.existsSync(new URL(`../public/js/sims/${k}.js`, import.meta.url)), k);
    const c = new Client();
    const f7 = await c.get('/formulas?grade=7');
    assert.match(f7.text, /7-сынып · VI тарау\. Қысым/);
    const b8 = await c.get('/sims?book=8');
    assert.match(b8.text, /§24/);
    const f9 = await c.get('/formulas?grade=9');
    assert.match(f9.text, /9-сынып · 1-тарау\. Кинематика негіздері/);
    assert.match(f9.text, /9-сынып · 7-тарау\. Атом ядросы/);
    const b9 = await c.get('/sims?book=9');
    assert.match(b9.text, /§41/);
    assert.match(b9.text, /Қорытынды\. Әлемнің қазіргі физикалық бейнесі/);
    const s9 = await c.get('/sims/river');
    assert.match(s9.text, /9-сынып · §1/);
    const f10 = await c.get('/formulas?grade=10');
    assert.match(f10.text, /10-сынып · 1-тарау\. Кинематика/);
    assert.match(f10.text, /10-сынып · 14-тарау\. Электромагниттік индукция/);
    const b10 = await c.get('/sims?book=10');
    assert.match(b10.text, /§52/);
    const s10 = await c.get('/sims/errors');
    assert.match(s10.text, /10-сынып · §2/);
    const f11 = await c.get('/formulas?grade=11');
    assert.match(f11.text, /11-сынып · 1-тарау\. Механикалық тербелістер/);
    assert.match(f11.text, /11-сынып · 12-тарау\. Космология/);
    const b11 = await c.get('/sims?book=11');
    assert.match(b11.text, /§51/);
    const s11 = await c.get('/sims/rlc');
    assert.match(s11.text, /11-сынып · §7/);
    const sim = await c.get('/sims/torricelli');
    assert.match(sim.text, /real\.js\?v=/);
    assert.match(sim.text, /7-сынып · §26/);
  });

  test('CSRF белгісіз POST қабылданбайды', async () => {
    const c = new Client();
    await c.get('/login');
    const r = await c.req('POST', '/login', { form: { login: 'owner', password: OWNER.password } });
    assert.equal(r.status, 403);
  });

  test('жабық беттер кіруді талап етеді', async () => {
    const c = new Client();
    const r = await c.get('/cabinet');
    assert.equal(r.status, 302);
    assert.match(r.location, /^\/login\?next=/);
    assert.equal((await c.get('/admin')).status, 302);
    assert.equal((await c.get('/results')).status, 302);
    const u = await c.get('/units');
    assert.match(u.text, /id="rail"/);
    assert.match(u.text, /\/js\/units\.js/);
    assert.doesNotMatch((await c.get('/labs')).text, /claude\.ai\/artifact\/VNmeiF8wBHof4mGZ8LNyYW/);
  });
});

describe('тіркелу, рөлдер және сыныптар', () => {
  const owner = new Client();
  const teacher = new Client();
  const student = new Client();
  let joinCode;

  test('мұғалім жаңа мектеппен тіркеледі және растауды күтеді', async () => {
    const r = await teacher.post('/register/teacher', {
      full_name: 'Сейітова Айгүл Маратқызы', school_id: 'new', school_name: '№7 жалпы білім беретін мектеп',
      school_region: 'Астана қаласы', school_locality: 'Астана', login: 'aigul.t', password: 'teacher-pass', password2: 'teacher-pass',
    }, '/register/teacher');
    assert.equal(r.status, 302);
    const cab = await teacher.get('/cabinet');
    assert.match(cab.text, /растауын күтуде/);
    const cls = await teacher.post('/teacher/classes', { grade: 8, letter: 'А' }, '/cabinet');
    assert.equal(cls.status, 302);
    assert.equal(cls.location, '/cabinet');
    const schools = await new Client().get('/schools');
    assert.doesNotMatch(schools.text, /№7 жалпы білім/, 'расталмаған мектеп тізімде көрінбеуі керек');
  });

  test('әкімші мұғалімді растайды, мектеп те бекітіледі', async () => {
    await owner.login(OWNER.login, OWNER.password);
    const list = await owner.get('/admin/teachers');
    const id = list.text.match(/\/admin\/users\/(\d+)\/approve/)[1];
    const r = await owner.post(`/admin/users/${id}/approve`, {}, '/admin/teachers');
    assert.equal(r.status, 302);
    const schools = await new Client().get('/schools');
    assert.match(schools.text, /№7 жалпы білім/);
  });

  test('мұғалім сынып ашып, код алады', async () => {
    const r = await teacher.post('/teacher/classes', { grade: 8, letter: 'А' }, '/cabinet');
    assert.equal(r.status, 302);
    const cab = await teacher.get('/cabinet');
    joinCode = cab.text.match(/class="code-big">([A-Z0-9]{6})</)[1];
    assert.ok(joinCode);
  });

  test('оқушы сынып кодымен тіркеледі', async () => {
    const bad = await student.get('/register/student?code=ZZZZZZ');
    assert.match(bad.text, /сынып коды табылмады/);
    const step = await student.get(`/register/student?code=${joinCode}`);
    assert.match(step.text, /8А сынып/);
    const weak = await student.post('/register/student', { code: joinCode, full_name: 'Нұрлан', login: 'nurlan.s', password: '123456', password2: '123456' }, `/register/student?code=${joinCode}`);
    assert.equal(weak.status, 400, 'бір сөзден тұратын аты-жөні қабылданбауы керек');
    const r = await student.post('/register/student', { code: joinCode, full_name: 'Сейітов Нұрлан', login: 'nurlan.s', password: '123456', password2: '123456' }, `/register/student?code=${joinCode}`);
    assert.equal(r.status, 302);
    const cab = await student.get('/cabinet');
    assert.match(cab.text, /Сейітов Нұрлан/);
    assert.match(cab.text, /Сейітова Айгүл/);
  });

  test('логин бір рет қана алынады (регистрге тәуелсіз)', async () => {
    const c = new Client();
    const r = await c.post('/register/student', { code: joinCode, full_name: 'Басқа Оқушы', login: 'NURLAN.S', password: '123456', password2: '123456' }, `/register/student?code=${joinCode}`);
    assert.equal(r.status, 400);
    assert.match(r.text, /логин бос емес/);
  });

  test('оқушыға әкімші және мұғалім беттері жабық', async () => {
    assert.equal((await student.get('/admin')).status, 403);
    assert.equal((await student.get('/teacher/labs')).status, 403);
    assert.equal((await student.get('/materials/new')).status, 403);
  });

  test('мұғалім оқушы құпиясөзін жаңартады, оқушы жаңасын қоюға міндетті', async () => {
    const page = await teacher.get('/cabinet');
    const classId = page.text.match(/\/teacher\/classes\/(\d+)"/)[1];
    const cls = await teacher.get(`/teacher/classes/${classId}`);
    const sid = cls.text.match(/\/teacher\/students\/(\d+)\/reset/)[1];
    const r = await teacher.post(`/teacher/students/${sid}/reset`, {}, `/teacher/classes/${classId}`);
    assert.equal(r.status, 302);
    const flash = await teacher.get(`/teacher/classes/${classId}`);
    const temp = flash.text.match(/уақытша құпиясөз «([a-z0-9]{8})»/)[1];
    const s2 = new Client();
    await s2.login('nurlan.s', temp);
    const forced = await s2.get('/cabinet');
    assert.equal(forced.status, 302);
    assert.equal(forced.location, '/password');
    const ch = await s2.post('/password', { current: temp, password: 'new-pass-1', password2: 'new-pass-1' }, '/password');
    assert.equal(ch.status, 302);
    assert.equal((await s2.get('/cabinet')).status, 200);
    await student.login('nurlan.s', 'new-pass-1');
  });

  test('ойын ұпайы сақталады және шектеледі', async () => {
    const r = await student.api('/api/games/score', { game: 'quiz', score: 999999, section: 'kin' });
    assert.equal(r.status, 200);
    assert.equal(r.body.saved, true);
    assert.equal(r.body.best, 5000);
    const sc = await student.api('/api/games/score', { game: 'scientist', score: 99999 });
    assert.equal(sc.body.best, 1000);
    const anon = await new Client().api('/api/games/score', { game: 'quiz', score: 10 });
    assert.equal(anon.body.saved, false);
    const games = await new Client().get('/games');
    assert.match(games.text, /Сейітов Нұрлан/);
  });

  test('тест тапсырылып, нәтиже сақталады', async () => {
    const pool = new pg.Pool({ connectionString: DB });
    const { rows } = await pool.query(`SELECT q.id, q.correct FROM exam_questions q JOIN exam_units u ON u.id = q.unit_id WHERE u.exam = 'ubt' ORDER BY q.id LIMIT 5`);
    await pool.end();
    const answers = Object.fromEntries(rows.map((r) => [r.id, r.correct]));
    const r = await student.api('/api/exams/submit', { exam: 'ubt', mode: 'exam', answers, duration: 120 });
    assert.equal(r.status, 200);
    assert.equal(r.body.right, 5);
    assert.equal(r.body.score, r.body.max);
    assert.equal(r.body.saved, true);
    const check = await student.api('/api/exams/check', { id: rows[0].id, answer: [] });
    assert.equal(check.body.points, 0);
    const cab = await student.get('/cabinet');
    assert.match(cab.text, /Сынақ/);
  });

  test('PISA үш бағытқа бөлінген, жаңа сұрақ түрлері көрсетіледі', async () => {
    const c = new Client();
    const pisa = await c.get('/exams/pisa');
    assert.match(pisa.text, /Оқу сауаттылығы/);
    assert.match(pisa.text, /Математикалық сауаттылық/);
    assert.match(pisa.text, /Жаратылыстану сауаттылығы/);
    const bb = await c.get('/exams/bbzhm');
    assert.match(bb.text, /Математикалық сауаттылық/);
    const read = await c.get('/exams/pisa/test?domain=reading&mode=practice&n=0');
    assert.equal(read.status, 200);
    assert.match(read.text, /data-kind="matrix"/);
    assert.match(read.text, /data-kind="open"/);
    assert.match(read.text, /Автобус кестесі/);
    const math = await c.get('/exams/pisa/test?domain=math&mode=exam&n=0');
    assert.match(math.text, /data-kind="number"/);
    assert.match(math.text, /\/img\/pisa\/[a-z-]+\.(jpg|png)\?v=/);
    assert.doesNotMatch(math.text, /Мұнайдың төгілуі/, 'математика бағытында жаратылыстану тапсырмасы болмауы керек');
    assert.equal((await c.get('/exams/pisa/test?domain=xxx&mode=practice')).status, 404);
  });

  test('халықаралық зерттеулер, ББЖМ және ҰБТ бөлек бөлімдер; әрқайсысында анықтама мен мақсат бар', async () => {
    const c = new Client();
    const intl = await c.get('/intl');
    assert.equal(intl.status, 200);
    for (const n of ['PISA', 'TIMSS', 'PIRLS', 'ICILS', 'TALIS']) assert.match(intl.text, new RegExp(`href="/exams/${n.toLowerCase()}"`));
    for (const k of ['pisa', 'timss', 'pirls', 'icils', 'talis', 'bbzhm', 'ubt']) {
      const r = await c.get(`/exams/${k}`);
      assert.equal(r.status, 200, k);
      assert.match(r.text, /Анықтамасы\./, k);
      assert.match(r.text, /Мақсаты\./, k);
    }
    const menu = (await c.get('/')).text;
    assert.match(menu, /href="\/intl"/);
    assert.match(menu, /href="\/exams\/bbzhm"/);
    assert.match(menu, /href="\/exams\/ubt"/);
    assert.match((await c.get('/exams/talis')).text, /id="talisForm"/);
    assert.equal((await c.get('/exams/talis/test')).status, 404);
    assert.equal((await c.get('/exams/pirls/test?domain=math')).status, 404, 'PIRLS-те математика бағыты жоқ');
    for (const [k, d] of [['timss', 'science'], ['timss', 'math'], ['pirls', 'literary'], ['pirls', 'info'], ['icils', 'cil'], ['icils', 'ct']]) {
      const t = await c.get(`/exams/${k}/test?domain=${d}&mode=practice&n=0`);
      assert.equal(t.status, 200, `${k}/${d}`);
      assert.match(t.text, /data-kind=/, `${k}/${d} бағытында тапсырма бар`);
    }
  });

  test('мұғалім тест тағайындайды, оқушыға хабарлама барады, мұғалім ашық жауапты бағалайды', async () => {
    const cab = await teacher.get('/cabinet');
    const classId = cab.text.match(/\/teacher\/classes\/(\d+)"/)[1];
    const cls = await teacher.get(`/teacher/classes/${classId}`);
    assert.match(cls.text, /Тест тағайындау/);
    const form = await teacher.get(`/teacher/assignments/new?class=${classId}`);
    assert.equal(form.status, 200);
    const sid = form.text.match(/name="students" value="(\d+)"/)[1];
    assert.equal((await student.get(`/teacher/assignments/new?class=${classId}`)).status, 403);

    const r = await teacher.post('/teacher/assignments', { class_id: classId, target: 'pisa:reading', n: '0', title: 'PISA дайындық', students: sid }, `/teacher/assignments/new?class=${classId}`);
    assert.equal(r.status, 302);
    const aid = r.location.match(/\/teacher\/assignments\/(\d+)$/)[1];
    const res0 = await teacher.get(`/teacher/assignments/${aid}`);
    assert.match(res0.text, /тапсырмады/);
    assert.match(res0.text, /Сейітов Нұрлан/);

    // Оқушыға хат (сайт ішіндегі хабарлама)
    const home = await student.get('/exams');
    assert.match(home.text, /class="badge">1</);
    assert.match(home.text, /PISA дайындық/);
    const ntf = await student.get('/notifications');
    assert.match(ntf.text, /Сізді тестке қосты/);
    assert.match(ntf.text, new RegExp(`/exams/assigned/${aid}`));
    assert.doesNotMatch((await student.get('/exams')).text, /class="badge"/, 'оқылған хабарлама саналмауы керек');

    // Бөтен оқушы тағайындалған тестті аша алмайды
    const other = new Client();
    const reg = await other.post('/register/student', { code: joinCode, full_name: 'Басқа Оқушы', login: 'other.s', password: '123456', password2: '123456' }, `/register/student?code=${joinCode}`);
    assert.equal(reg.status, 302);
    assert.equal((await other.get(`/exams/assigned/${aid}`)).status, 404);

    // Оқушы тапсырады
    const pageT = await student.get(`/exams/assigned/${aid}`);
    assert.equal(pageT.status, 200);
    const ids = [...pageT.text.matchAll(/data-id="(\d+)" data-kind="(\w+)"/g)].map((m) => [+m[1], m[2]]);
    assert.ok(ids.length >= 5);
    const pool = new pg.Pool({ connectionString: DB });
    const { rows } = await pool.query('SELECT id, kind, correct, points FROM exam_questions WHERE id = ANY($1)', [ids.map((x) => x[0])]);
    const answers = {};
    let openMax = 0;
    for (const qq of rows) {
      if (qq.kind === 'open') { answers[qq.id] = 'Менің жауабым'; openMax += qq.points; } else if (qq.kind === 'number') answers[qq.id] = String(qq.correct[0]).replace('.', ',');
      else answers[qq.id] = qq.correct;
    }
    const sub = await student.api('/api/exams/submit', { exam: 'pisa', mode: 'assigned', domain: 'reading', assignment: aid, answers, duration: 300 });
    assert.equal(sub.status, 200);
    assert.ok(sub.body.pending > 0);
    assert.equal(sub.body.score, sub.body.max - openMax);
    const again = await student.api('/api/exams/submit', { exam: 'pisa', mode: 'assigned', domain: 'reading', assignment: aid, answers, duration: 300 });
    assert.equal(again.status, 409);
    assert.ok(Object.values(sub.body.results).every((x) => x.correct === undefined), 'тағайындалған тестте дұрыс жауап оқушыға жіберілмеуі керек');
    const attemptId = sub.body.attemptId;
    assert.equal((await other.get(`/exams/attempts/${attemptId}`)).status, 404);
    const own = await student.get(`/exams/attempts/${attemptId}`);
    assert.match(own.text, /мұғалімнің тексеруін күтуде/);
    assert.doesNotMatch(own.text, /Ашық жауаптарды бағалау/);
    assert.doesNotMatch(own.text, /qopt right/, 'оқушы тағайындалған тесттің кілтін көрмеуі керек');
    assert.equal((await student.post(`/teacher/attempts/${attemptId}/grade`, {}, `/exams/attempts/${attemptId}`)).status, 403);

    // Мұғалім нәтижені көреді және бағалайды
    const res1 = await teacher.get(`/teacher/assignments/${aid}`);
    assert.match(res1.text, /тексеруді күтеді/);
    const csv = await teacher.get(`/teacher/assignments/${aid}/export.csv`);
    assert.match(csv.text, /Сейітов Нұрлан/);
    const rev = await teacher.get(`/exams/attempts/${attemptId}`);
    assert.match(rev.text, /Ашық жауаптарды бағалау/);
    assert.match(rev.text, /Менің жауабым/);
    assert.match(rev.text, /qopt right|td class="num right"/);
    const grades = {};
    for (const qq of rows) if (qq.kind === 'open') grades[`g${qq.id}`] = String(qq.points);
    const g = await teacher.post(`/teacher/attempts/${attemptId}/grade`, grades, `/exams/attempts/${attemptId}`);
    assert.equal(g.status, 302);
    const { rows: [att] } = await pool.query('SELECT score, max_score, pending FROM exam_attempts WHERE id = $1', [attemptId]);
    await pool.end();
    assert.equal(att.pending, 0);
    assert.equal(att.score, att.max_score);
    assert.match((await student.get('/notifications')).text, /Мұғалім жауаптарыңды тексерді/);
    assert.match((await student.get('/cabinet')).text, /Мұғалім тағайындаған тесттер/);
    // «Нәтижелер» бөлімі: мұғалім сыныптың кестесін, оқушы өз нәтижесін көреді
    const rt = await teacher.get(`/results?class=${classId}&exam=pisa`);
    assert.equal(rt.status, 200);
    assert.match(rt.text, /Оқушылар × тесттер/);
    assert.match(rt.text, /PISA дайындық/);
    assert.match(rt.text, /Сейітов Нұрлан/);
    const rcsv = await teacher.get(`/results/export.csv?class=${classId}&exam=pisa`);
    assert.match(rcsv.text, /Сейітов Нұрлан/);
    const rs = await student.get('/results?exam=pisa');
    assert.equal(rs.status, 200);
    assert.match(rs.text, /Менің нәтижелерім/);
    assert.match(rs.text, /Бағыттар бойынша орташа нәтиже/);
    assert.equal((await student.get(`/results/export.csv?class=${classId}`)).status, 403);
  });

  test('ЖИ құралы: кілтсіз — «бапталмаған»; модельмен — көмекші, лимит, талдау, бағалау, генератор', async () => {
    const ai = await import('../src/lib/ai.js');
    delete process.env.ANTHROPIC_API_KEY;
    ai.setAiRunner(null);
    // NDJSON ағынын оқу
    const nd = async (c, url, body) => {
      const token = await c.csrf('/games/quiz');
      const r = await fetch(base + url, { method: 'POST', headers: { cookie: c.cookieHeader(), 'content-type': 'application/json', 'x-csrf-token': token }, body: JSON.stringify(body) });
      const text = await r.text();
      const lines = text.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
      return { status: r.status, lines, last: lines[lines.length - 1] || {}, text: lines.map((x) => x.t || '').join('') };
    };
    const ask = { messages: [{ role: 'user', content: 'Орташа жылдамдықты қалай табамын?' }], ctx: 'olymp:o7-1' };

    // 1) API кілті жоқ: бет ашылады, бірақ сұраныс жіберілмейді
    const p0 = await student.get('/ai');
    assert.equal(p0.status, 200);
    assert.match(p0.text, /бапталмаған/);
    assert.match((await student.get('/sims/lens')).text, /\/ai\?ctx=sim:lens/);
    assert.match((await student.get('/olympiad')).text, /\/ai\?ctx=olymp:/);
    const r0 = await nd(student, '/api/ai/tutor', ask);
    assert.match(r0.last.error, /бапталмаған/);
    assert.equal((await new Client().get('/ai')).status, 200, 'қонақ бетті көреді (кіру ұсынылады)');

    // 2) Жалған модель
    const seen = [];
    ai.setAiRunner(async (p, onText) => {
      seen.push(p);
      if (p.refuse) return { text: '', stop: 'refusal', usage: {}, model: p.model };
      if (p.schema) {
        const items = [...p.messages[0].content.matchAll(/id=(\d+) \(ең көбі (\d+)/g)].map(([, id]) => ({ id: +id, points: 99, reason: 'Толық жауап.' }));
        return { text: JSON.stringify({ items: [...items, { id: 999999, points: 1, reason: 'бөтен' }] }), stop: 'end_turn', usage: { input_tokens: 50, output_tokens: 20 }, model: p.model };
      }
      onText('Қай '); onText(null); onText('Қандай '); onText('заң қолданылады?');
      return { text: 'Қандай заң қолданылады?', stop: 'end_turn', usage: { input_tokens: 100, output_tokens: 10 }, model: p.model };
    });
    const r1 = await nd(student, '/api/ai/tutor', ask);
    assert.equal(r1.status, 200);
    assert.ok(r1.lines.some((x) => x.reset));
    assert.equal(r1.lines.slice(r1.lines.findIndex((x) => x.reset) + 1).map((x) => x.t || '').join(''), 'Қандай заң қолданылады?');
    assert.equal(r1.last.done, true);
    assert.equal(r1.last.left, 19);
    assert.match(seen[0].system, /сократтық/);
    assert.match(seen[0].system, /<эталон>/);
    assert.equal(seen[0].model, 'claude-opus-5-5');
    assert.equal((await nd(student, '/api/ai/tutor', { messages: [{ role: 'assistant', content: 'x' }] })).status, 400);

    // 3) Әкімші: модель мен лимит; лимит таусылса — сұраныс жіберілмейді
    assert.match((await owner.get('/admin/ai')).text, /ЖИ құралының күйі/);
    assert.equal((await student.get('/admin/ai')).status, 403);
    assert.equal((await owner.post('/admin/ai', { ai_enabled: '1', ai_model: 'claude-haiku-5-5', ai_student_limit: '1', ai_teacher_limit: '50' }, '/admin/ai')).status, 302);
    const n = seen.length;
    const r2 = await nd(student, '/api/ai/tutor', ask);
    assert.match(r2.last.error, /лимиті таусылды/);
    assert.equal(seen.length, n);

    // 4) Оқушыға мұғалім функциялары жабық
    assert.equal((await student.json('POST', '/api/ai/analyze', { class: 1 })).status, 403);
    assert.equal((await student.json('POST', '/api/ai/generate', { topic: 'x' })).status, 403);
    assert.equal((await student.get('/ai/teacher')).status, 403);

    // 5) Мұғалім: талдау — оқушылардың аты-жөні жіберілмейді
    const cab = await teacher.get('/cabinet');
    const classId = cab.text.match(/\/teacher\/classes\/(\d+)"/)[1];
    assert.match((await teacher.get(`/results?class=${classId}&exam=pisa`)).text, /id="aiAnalyze"/);
    const ra = await nd(teacher, '/api/ai/analyze', { class: classId, exam: 'pisa', src: 'all' });
    assert.equal(ra.last.done, true);
    const sent = JSON.stringify(seen[seen.length - 1].messages);
    assert.equal(seen[seen.length - 1].model, 'claude-haiku-5-5');
    assert.doesNotMatch(sent, /Сейітов|Нұрлан|Басқа Оқушы/);
    assert.match(sent, /№1/);
    assert.equal((await teacher.json('POST', '/api/ai/analyze', { class: 999999 })).status, 404);

    // 6) Ашық жауапқа ұсыныс: ұпай шектеледі, бөтен сұрақ алынып тасталады
    const pool = new pg.Pool({ connectionString: DB });
    const { rows: [att] } = await pool.query('SELECT id FROM exam_attempts WHERE assignment_id IS NOT NULL ORDER BY id DESC LIMIT 1');
    const { rows: openQs } = await pool.query(`SELECT q.id, q.points FROM exam_attempts a, jsonb_object_keys(a.answers) k JOIN exam_questions q ON q.id = k::int WHERE a.id = $1 AND q.kind = 'open'`, [att.id]);
    assert.match((await teacher.get(`/exams/attempts/${att.id}`)).text, /id="aiGradeBtn"/);
    const rg = await teacher.json('POST', `/api/ai/grade/${att.id}`, {});
    assert.equal(rg.status, 200);
    assert.equal(rg.body.items.length, openQs.length);
    for (const it of rg.body.items) assert.equal(it.points, it.max);
    assert.doesNotMatch(JSON.stringify(seen[seen.length - 1].messages), /Сейітов/);
    assert.equal((await student.json('POST', `/api/ai/grade/${att.id}`, {})).status, 403);

    // 7) Генератор
    const gp = await teacher.get('/ai/teacher');
    assert.equal(gp.status, 200);
    assert.match(gp.text, /id="aiTopicData"/);
    const rgn = await nd(teacher, '/api/ai/generate', { type: 'pisa', grade: '9', topic: '§3. Үдеу', minutes: '45', level: 'high', notes: 'Тәжірибе қосылсын' });
    assert.equal(rgn.last.done, true);
    assert.match(seen[seen.length - 1].messages[0].content, /PISA[\s\S]*9-сынып[\s\S]*§3\. Үдеу[\s\S]*Тәжірибе қосылсын/);
    assert.equal((await nd(teacher, '/api/ai/generate', { type: 'kmj', topic: '' })).status, 400);

    // 8) Модель бас тартса — түсінікті хабар; есеп әкімші бетінде
    ai.setAiRunner(async (p) => ({ text: '', stop: 'refusal', usage: {}, model: p.model }));
    assert.match((await nd(teacher, '/api/ai/generate', { type: 'kmj', topic: 'x' })).last.error, /жауап бере алмады/);
    const adm = await owner.get('/admin/ai');
    assert.match(adm.text, /Оқушыға көмекші/);
    assert.match(adm.text, /Тапсырма генераторы/);
    const { rows: [u] } = await pool.query(`SELECT count(*)::int AS n FROM ai_usage WHERE ok`);
    assert.ok(u.n >= 5);
    await pool.end();

    ai.setAiRunner(null);
    await owner.post('/admin/ai', { ai_enabled: '1', ai_model: 'claude-opus-5-5', ai_student_limit: '20', ai_teacher_limit: '200' }, '/admin/ai');
  });

  test('ЖИ: тегін OpenAI-үйлесімді провайдер (FreeLLMAPI / Google AI Studio) ағынмен жұмыс істейді', async () => {
    const ai = await import('../src/lib/ai.js');
    ai.setAiRunner(null);
    const calls = [];
    let mode = 'ok';
    // Жалған провайдер: /v1/chat/completions, SSE ағыны
    const fake = http.createServer((req, res) => {
      let body = '';
      req.on('data', (d) => { body += d; });
      req.on('end', () => {
        const j = JSON.parse(body || '{}');
        calls.push({ url: req.url, auth: req.headers.authorization, body: j });
        if (req.headers.authorization !== 'Bearer free-key') { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"bad key"}}'); }
        if (mode === 'limit') { res.writeHead(429, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"quota"}}'); }
        if (j.model === 'busy-model') { res.writeHead(503, { 'content-type': 'application/json' }); return res.end('[{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}]'); }
        res.writeHead(200, { 'content-type': 'text/event-stream', 'x-routed-via': 'google/free-flash' });
        const isJson = /JSON схемасы/.test(j.messages[0].content);
        const ids = isJson ? [...j.messages[1].content.matchAll(/id=(\d+) \(ең көбі (\d+)/g)].map(([, id]) => +id) : [];
        const text = isJson ? '```json\n' + JSON.stringify({ items: ids.map((id) => ({ id, points: 1, reason: 'Жартылай дұрыс.' })) }) + '\n```'
          : '<think>оқушыға жауапты айтпау керек</think>Жылдамдықтың анықтамасын еске түсірші: $v = s/t$. Бүкіл жолға қанша уақыт кетті?';
        for (const part of text.match(/[\s\S]{1,7}/g)) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: part } }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 321, completion_tokens: 45 } })}\n\n`);
        res.end('data: [DONE]\n\n');
      });
    });
    await new Promise((r) => fake.listen(0, '127.0.0.1', r));
    process.env.AI_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1/`;
    process.env.AI_API_KEY = 'free-key';
    process.env.AI_MODEL = 'free-flash';
    ai.setRetryDelay(5);
    const nd = async (c, url, body) => {
      const token = await c.csrf('/games/quiz');
      const r = await fetch(base + url, { method: 'POST', headers: { cookie: c.cookieHeader(), 'content-type': 'application/json', 'x-csrf-token': token }, body: JSON.stringify(body) });
      const lines = (await r.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l));
      let text = '';
      for (const x of lines) { if (x.reset) text = ''; else if (x.t) text += x.t; }
      return { status: r.status, lines, last: lines[lines.length - 1], text };
    };
    try {
      assert.equal(ai.aiProvider(), 'compat');
      const r1 = await nd(student, '/api/ai/tutor', { messages: [{ role: 'user', content: 'Орташа жылдамдық қалай табылады?' }], ctx: 'olymp:o7-1' });
      assert.equal(r1.last.done, true, JSON.stringify(r1.last));
      assert.equal(r1.text, 'Жылдамдықтың анықтамасын еске түсірші: $v = s/t$. Бүкіл жолға қанша уақыт кетті?');
      assert.doesNotMatch(r1.text, /think|айтпау керек/, 'ойлау бөлігі оқушыға көрсетілмеуі керек');
      const c1 = calls[calls.length - 1];
      assert.equal(c1.url, '/v1/chat/completions');
      assert.equal(c1.body.model, 'free-flash');
      assert.equal(c1.body.stream, true);
      assert.equal(c1.body.messages[0].role, 'system');
      assert.match(c1.body.messages[0].content, /сократтық/);
      assert.ok(c1.body.max_tokens <= 8192);

      // Ашық жауапқа ұсыныс: ```json ішіндегі жауап та оқылады
      const pool = new pg.Pool({ connectionString: DB });
      const { rows: [att] } = await pool.query('SELECT id FROM exam_attempts WHERE assignment_id IS NOT NULL ORDER BY id DESC LIMIT 1');
      const rg = await teacher.json('POST', `/api/ai/grade/${att.id}`, {});
      assert.equal(rg.status, 200, JSON.stringify(rg.body));
      assert.ok(rg.body.items.length > 0);
      assert.ok(rg.body.items.every((x) => x.points === Math.min(1, x.max) && x.reason === 'Жартылай дұрыс.'));
      const { rows: [u] } = await pool.query(`SELECT model, input_tokens, output_tokens FROM ai_usage WHERE ok ORDER BY id DESC LIMIT 1`);
      assert.equal(u.model, 'google/free-flash');
      assert.equal(u.input_tokens, 321);

      // Әкімші беті: тегін провайдер, шығын «тегін»
      const adm = await owner.get('/admin/ai');
      assert.match(adm.text, /тегін провайдер қосылған/);
      assert.match(adm.text, /google\/free-flash/);
      assert.doesNotMatch(adm.text, /name="ai_model">/, 'тегін провайдерде Claude моделін таңдау көрсетілмейді');

      // Провайдер қателері түсінікті хабарға айналады; сәтсіз сұраныс лимитке есептелмейді
      mode = 'limit';
      const before = (await pool.query(`SELECT count(*)::int AS n FROM ai_usage WHERE ok IS NOT FALSE`)).rows[0].n;
      assert.match((await nd(student, '/api/ai/tutor', { messages: [{ role: 'user', content: 'сәлем' }] })).last.error, /лимиті уақытша таусылды/);
      assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ai_usage WHERE ok IS NOT FALSE`)).rows[0].n, before);
      mode = 'ok';
      // Негізгі модель жүктелген (503): бір рет қайталап, қосалқы модельге көшеді
      process.env.AI_MODEL = 'models/busy-model, free-flash';
      const n0 = calls.length;
      const rb = await nd(student, '/api/ai/tutor', { messages: [{ role: 'user', content: 'сәлем' }] });
      assert.equal(rb.last.done, true, JSON.stringify(rb.last));
      assert.deepEqual(calls.slice(n0).map((x) => x.body.model), ['busy-model', 'busy-model', 'free-flash']);
      assert.match((await owner.get('/admin/ai')).text, /busy-model, free-flash/);
      process.env.AI_MODEL = 'busy-model';
      assert.match((await nd(student, '/api/ai/tutor', { messages: [{ role: 'user', content: 'сәлем' }] })).last.error, /қатты жүктелген/);
      process.env.AI_API_KEY = 'wrong';
      assert.match((await nd(student, '/api/ai/tutor', { messages: [{ role: 'user', content: 'сәлем' }] })).last.error, /AI_API_KEY/);
      await pool.end();
    } finally {
      delete process.env.AI_BASE_URL; delete process.env.AI_API_KEY; delete process.env.AI_MODEL;
      fake.close();
    }
    assert.equal(ai.aiProvider(), null);
  });

  test('әкімші бағыт, сурет және жаңа сұрақ түрлерімен тапсырма қосады', async () => {
    const form = await owner.get('/admin/questions?exam=bbzhm&domain=math');
    assert.equal(form.status, 200);
    assert.match(form.text, /Математикалық сауаттылық/);
    const token = form.text.match(/name="_csrf" value="([^"]+)"/)[1];
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const fd = new FormData();
    for (const [k, v] of Object.entries({ _csrf: token, exam: 'bbzhm', domain: 'math', unit_id: '', title: 'Дүкендегі жеңілдік', context: '| Тауар | Бағасы |\n| Дәптер | 200 ₸ |',
      kind: 'matrix', stem: 'Тұжырымдар дұрыс па?', rows: 'Дәптер 200 ₸ тұрады\nДәптер тегін', cols: 'Иә, Жоқ', matrix_correct: '1, 2' })) fd.append(k, v);
    fd.append('image', new Blob([png], { type: 'image/png' }), 'shop.png');
    const r = await owner.req('POST', '/admin/questions', { multipart: fd });
    assert.equal(r.status, 302);
    assert.match(r.location, /domain=math/);
    const pool = new pg.Pool({ connectionString: DB });
    const { rows: [u] } = await pool.query(`SELECT id, image, domain FROM exam_units WHERE title = 'Дүкендегі жеңілдік'`);
    assert.equal(u.domain, 'math');
    assert.match(u.image, /^[a-f0-9]{32}\.png$/);
    const img = await new Client().get(`/exams/img/${u.image}`);
    assert.equal(img.status, 200);
    // Бар блокқа сан жауапты сұрақ
    const fd2 = new FormData();
    for (const [k, v] of Object.entries({ _csrf: token, exam: 'bbzhm', domain: 'math', unit_id: String(u.id), kind: 'number', stem: '3 дәптер қанша тұрады?', value: '600', tol: '0', unit: '₸' })) fd2.append(k, v);
    assert.equal((await owner.req('POST', '/admin/questions', { multipart: fd2 })).status, 302);
    const { rows: qs } = await pool.query('SELECT kind, correct, options FROM exam_questions WHERE unit_id = $1 ORDER BY ord', [u.id]);
    await pool.end();
    assert.deepEqual(qs.map((x) => x.kind), ['matrix', 'number']);
    assert.deepEqual(qs[0].correct, [0, 1]);
    assert.deepEqual(qs[1].correct, [600]);
    const page = await new Client().get('/exams/bbzhm/test?domain=math&mode=practice&n=0');
    assert.match(page.text, /Дүкендегі жеңілдік/);
    assert.match(page.text, /<table>/);
    // Қате кесте қабылданбайды; CSRF-сіз жүктеу тыйым салынған
    const fd3 = new FormData();
    for (const [k, v] of Object.entries({ _csrf: token, exam: 'bbzhm', kind: 'matrix', stem: 'Қате кесте', rows: 'a\nb', cols: 'Иә, Жоқ', matrix_correct: '1' })) fd3.append(k, v);
    const bad = await owner.req('POST', '/admin/questions', { multipart: fd3 });
    assert.equal(bad.status, 302);
    assert.match((await owner.get(bad.location)).text, /әр тұжырымға дұрыс бағанның/);
    const fd4 = new FormData();
    fd4.append('exam', 'bbzhm'); fd4.append('stem', 'xxx');
    assert.equal((await owner.req('POST', '/admin/questions', { multipart: fd4 })).status, 403);
  });

  test('зертхана коды тексеріліп, журналға жазылады', async () => {
    const code = labs.makeCode('om', { n: 'Сейітов Нұрлан', c: '8А', v: '2', s: 9, k: '1111111110', t: '08.11.2026 10:15' });
    const fake = code.slice(0, -1) + (code.endsWith('a') ? 'b' : 'a');
    const token = await teacher.csrf('/teacher/labs');
    const chk = await teacher.req('POST', '/teacher/labs/check', { form: { _csrf: token, codes: `${code}\n${fake}` } });
    assert.equal(chk.status, 200);
    assert.match(chk.text, /pill ok">дұрыс/);
    assert.match(chk.text, /қолмен өзгертілген/);
    const save = await teacher.req('POST', '/teacher/labs/save', { form: [['_csrf', token], ['codes', code], ['codes', fake]] });
    assert.equal(save.status, 302);
    const j = await teacher.get('/teacher/labs');
    assert.match(j.text, /Сейітов Нұрлан/);
    assert.match(j.text, /9 \/ 10/);
    const csv = await teacher.get('/teacher/labs/export.csv');
    assert.match(csv.text, /Сейітов Нұрлан;8А;8;4;/);
  });

  test('ақылы материал: жүктеу, жариялау, сатып алу, рұқсат', async () => {
    const token = await teacher.csrf('/materials/new');
    const fd = new FormData();
    fd.set('_csrf', token);
    fd.set('title', 'Ом заңы: презентация');
    fd.set('description', '8-сыныпқа арналған сабақ');
    fd.set('type', 'ppt');
    fd.set('grade', '8');
    fd.set('section', 'dc');
    fd.append('exams', 'ubt');
    fd.set('price', '500');
    fd.set('file', new Blob([Buffer.from('PPTX-DEMO')]), 'Ом заңы.pptx');
    const up = await teacher.req('POST', '/materials/new', { multipart: fd });
    assert.equal(up.status, 302);
    const id = up.location.match(/\/materials\/(\d+)/)[1];

    // CSRF белгісіз файл жүктеуге болмайды
    const fd2 = new FormData();
    fd2.set('title', 'x'); fd2.set('type', 'ppt'); fd2.set('file', new Blob(['x']), 'x.pdf');
    assert.equal((await teacher.req('POST', '/materials/new', { multipart: fd2 })).status, 403);

    // тыйым салынған файл түрі
    const fd3 = new FormData();
    fd3.set('_csrf', token); fd3.set('title', 'Скрипт'); fd3.set('type', 'other'); fd3.set('file', new Blob(['<script>']), 'evil.html');
    const bad = await teacher.req('POST', '/materials/new', { multipart: fd3 });
    assert.equal(bad.status, 400);
    assert.match(bad.text, /файл түріне рұқсат жоқ/);

    assert.equal((await student.get(`/materials/${id}`)).status, 404, 'тексерілмеген материал оқушыға көрінбейді');
    const pub = await owner.post(`/admin/materials/${id}/publish`, { price: 500 }, '/admin/materials');
    assert.equal(pub.status, 302);

    const denied = await student.get(`/materials/${id}/download`);
    assert.equal(denied.status, 302);
    assert.equal(denied.location, `/materials/${id}`);

    const order = await student.post(`/materials/${id}/order`, { note: 'Kaspi, 08.11' }, `/materials/${id}`);
    assert.equal(order.status, 302);
    const orders = await owner.get('/admin/orders');
    const oid = orders.text.match(/\/admin\/orders\/(\d+)\/approve/)[1];
    await owner.post(`/admin/orders/${oid}/approve`, {}, '/admin/orders');

    const dl = await student.req('GET', `/materials/${id}/download`);
    assert.equal(dl.status, 200);
    assert.equal(dl.text, 'PPTX-DEMO');
    assert.match(dl.res.headers.get('content-disposition'), /filename\*=UTF-8''%D0%9E%D0%BC/);
  });

  test('әкімшілер саны 4-тен аспайды, көмекші әкімші әкімші қоса алмайды', async () => {
    for (let i = 1; i <= 3; i++) {
      const r = await owner.post('/admin/admins', { full_name: `Көмекші Әкімші${'а'.repeat(i)}`, login: `helper${i}`, password: 'helper-pass-123' }, '/admin/admins');
      assert.equal(r.status, 302);
    }
    const fourth = await owner.post('/admin/admins', { full_name: 'Артық Әкімші', login: 'helper4', password: 'helper-pass-123' }, '/admin/admins');
    assert.equal(fourth.status, 400);
    const helper = new Client();
    await helper.login('helper1', 'helper-pass-123');
    const pw = await helper.post('/password', { current: 'helper-pass-123', password: 'helper-new-pass', password2: 'helper-new-pass' }, '/password');
    assert.equal(pw.status, 302);
    assert.equal((await helper.get('/admin')).status, 200);
    const add = await helper.post('/admin/admins', { full_name: 'Тағы Біреу', login: 'helper9', password: 'helper-pass-123' }, '/admin/admins');
    assert.equal(add.status, 403);
  });
  test('зертхана платформада: қонақ — офлайн, оқушы — онлайн, нәтиже журналға өзі түседі', async () => {
    const guest = await new Client().req('GET', '/labs/om/app');
    assert.equal(guest.status, 200);
    assert.match(guest.res.headers.get('content-security-policy'), /script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
    assert.match(guest.text, /"uid":null/);
    assert.match(guest.text, /<script src="\/js\/lab-runtime\.js\?v=[0-9a-f]{10}"><\/script><script>/);
    assert.equal((await new Client().get('/labs/nope')).status, 404);

    const app = await student.get('/labs/om/app');
    const cfg = JSON.parse(app.text.match(/id="labRuntimeConfig">([^<]+)</)[1]);
    assert.match(cfg.uid, /^u\d+$/);
    assert.equal(cfg.name, 'Сейітов Нұрлан');
    assert.equal(cfg.cls, '8 «А»');
    assert.equal(cfg.owner, false);

    const anon = await new Client().json('POST', `/api/labs/om/subs/${cfg.uid}`, { score: 10 });
    assert.equal(anon.status, 401);
    const foreign = await student.json('POST', '/api/labs/om/subs/u999999', { score: 10 });
    assert.equal(foreign.status, 403);

    const sub = { name: 'басқа есім', cls: '8 «А»', variant: 'B3', score: 8, crit: [1, 1, 1, 0, 1, 1, 1, 1, 1, 0], at: '08.11.2026 12:00', app: 'lab8-4' };
    const put = await student.json('POST', `/api/labs/om/subs/${cfg.uid}`, sub);
    assert.equal(put.status, 200);
    const own = await student.json('GET', `/api/labs/om/subs/${cfg.uid}`);
    assert.equal(own.body.exists, true);
    assert.equal(own.body.data.name, 'Сейітов Нұрлан', 'аты аккаунттан алынуы керек');
    assert.equal(own.body.data.grade, 4);

    const col = await teacher.json('GET', '/api/labs/om/subs');
    assert.equal(col.status, 200);
    assert.ok(col.body.docs.some((d) => d.id === cfg.uid && d.data.score === 8));
    assert.equal((await student.json('GET', '/api/labs/om/subs')).status, 403);

    const journal = await teacher.get('/teacher/labs');
    assert.match(journal.text, /Сейітов Нұрлан<\/td><td>8 «А»<\/td>/);
    assert.match(journal.text, /pill ok">платформа/);
    const cab = await student.get('/cabinet');
    assert.match(cab.text, /8 \/ 10/);
    // «Нәтижелер → Зертханалар»: мұғалім сынып кестесінде, оқушы өз бетінде көреді
    const rl = await teacher.get('/results?exam=labs');
    assert.match(rl.text, /Оқушылар × жұмыстар/);
    assert.match(rl.text, /Сейітов Нұрлан/);
    assert.match(rl.text, /\d+ \/ 10 \(\d\)/);
    assert.match((await student.get('/results?exam=labs')).text, /8 \/ 10 · баға 4/);
    assert.equal((await teacher.get('/results?exam=olymp')).status, 200);

    assert.equal((await student.json('DELETE', `/api/labs/om/subs/${cfg.uid}`)).status, 403, 'оқушы өз нәтижесін өшіре алмайды');
    assert.equal((await teacher.json('DELETE', `/api/labs/om/subs/${cfg.uid}`)).status, 204);
    assert.equal((await student.json('GET', `/api/labs/om/subs/${cfg.uid}`)).body.exists, false);
    assert.doesNotMatch((await teacher.get('/teacher/labs')).text, /pill ok">платформа/);
  });
});

describe('бағалау және код ережелері', () => {
  test('бірнеше дұрыс жауапты тапсырма: 2 / 1 / 0 балл', () => {
    const q = { kind: 'multi', options: [1, 2, 3, 4, 5, 6], correct: [1, 3, 5] };
    assert.equal(exams.gradeAnswer(q, [1, 3, 5]).points, 2);
    assert.equal(exams.gradeAnswer(q, [1, 3]).points, 1);
    assert.equal(exams.gradeAnswer(q, [1, 3, 5, 0]).points, 1);
    assert.equal(exams.gradeAnswer(q, [1]).points, 0);
    const s = { kind: 'single', options: [1, 2, 3, 4], correct: [2] };
    assert.equal(exams.gradeAnswer(s, [2]).points, 1);
    assert.equal(exams.gradeAnswer(s, [2, 1]).points, 0);
    assert.equal(exams.gradeAnswer(s, ['x']).points, 0);
  });

  test('жаңа сұрақ түрлері: кесте, сан, ашық жауап', () => {
    const m = { kind: 'matrix', options: { rows: ['a', 'b', 'c'], cols: ['Иә', 'Жоқ'] }, correct: [0, 1, 0] };
    assert.equal(exams.gradeAnswer(m, [0, 1, 0]).points, 1);
    assert.equal(exams.gradeAnswer(m, [0, 1, 1]).points, 0);
    assert.equal(exams.gradeAnswer(m, [0, 1]).points, 0);
    const n = { kind: 'number', options: { tol: 0.06 }, correct: [22.95] };
    assert.equal(exams.gradeAnswer(n, '22,95 км').points, 1);
    assert.equal(exams.gradeAnswer(n, '23').points, 1);
    assert.equal(exams.gradeAnswer(n, '23.1').points, 0);
    assert.equal(exams.gradeAnswer(n, 'білмеймін').points, 0);
    assert.equal(exams.gradeAnswer({ kind: 'number', options: {}, correct: [0.25] }, '1/4').points, 1);
    const o = exams.gradeAnswer({ kind: 'open', points: 2 }, ' жауап ');
    assert.equal(o.open, true);
    assert.equal(o.max, 2);
    assert.equal(o.text, 'жауап');
  });

  test('зертхана кодының құрылымы тексеріледі', () => {
    assert.match(labs.readCode('').bad, /енгізілмеген/);
    assert.match(labs.readCode('abc').bad, /толық/);
    assert.match(labs.readCode('ZZ.e30.1').bad, /жатпайды/);
    const ok = labs.readCode(labs.makeCode('linza', { n: 'Ахметова Дана', c: '8Б', s: 7.5, k: '1101', t: 'бүгін' }));
    assert.equal(ok.lab.k, 'linza');
    assert.equal(ok.score, 7.5);
    assert.equal(labs.grade5(7.5), 4);
  });
});

describe('платформа иесін жасау', () => {
  test('баптау қате болса, себебі кіру бетінде көрінеді; түзетілгенде иесі жасалады', async () => {
    const { config } = await import('../src/config.js');
    const seed = await import('../src/seed.js');
    const db = await import('../src/lib/db.js');
    const saved = { ...config.owner };
    await db.q('UPDATE users SET is_owner = false WHERE is_owner');
    try {
      Object.assign(config.owner, { login: 'Керим', password: 'qysqa' });
      await seed.ensureOwner();
      assert.match(seed.ownerSetupProblem, /8 таңба/);
      assert.match((await new Client().get('/login')).text, /аккаунты әлі жасалмаған/);

      Object.assign(config.owner, { login: ' Керим ', password: 'kerim-pass-1 ' });
      await seed.ensureOwner();
      assert.equal(seed.ownerSetupProblem, null);
      assert.doesNotMatch((await new Client().get('/login')).text, /аккаунты әлі жасалмаған/);
      const c = new Client();
      await c.login('Керим', 'kerim-pass-1');
      assert.equal((await c.get('/admin')).status, 200);
    } finally {
      Object.assign(config.owner, saved);
      await db.q("UPDATE users SET is_owner = false WHERE login = 'Керим'");
      await db.q("UPDATE users SET is_owner = true WHERE login = 'owner'");
    }
  });
});

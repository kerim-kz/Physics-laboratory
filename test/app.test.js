// Интеграциялық тесттер: нақты PostgreSQL-дағы бос тест базасында HTTP арқылы тексереді.
// Іске қосу: TEST_DATABASE_URL=postgres://... npm test
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
    for (const url of ['/', '/library', '/formulas', '/formulas?section=opt', '/games', '/games/quiz', '/sims', '/sims/lens', '/labs', '/exams', '/exams/pisa', '/exams/ubt/test?mode=exam&n=20', '/shop', '/schools', '/register', '/register/teacher', '/healthz']) {
      const r = await c.get(url);
      assert.equal(r.status, 200, url);
    }
    assert.equal((await c.get('/sims/nope')).status, 404);
    assert.equal((await c.get('/nope')).status, 404);
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

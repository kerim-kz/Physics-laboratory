// «Ғылым Ордасы» артефактісіндегі 16 виртуалды зертхана.
// Әр зертхана оқушыға нәтиже коды береді: ПРЕФИКС.base64url(JSON).хэш.
// Хэш тексеру алгоритмі артефактідегімен бірдей (FNV-1a, 32 бит), сондықтан бұрынғы кодтар да жарайды.

export const LABS = [
  { k: 'tygyzdyq', g: 7, no: 3, pre: 'D3', salt: 'D3|fizika7|tygyzdyk', u: 'https://claude.ai/artifact/Qjk62Jp6Bg4KRTQnr4ENhS', s: 'stat',
    t: 'Сұйықтар мен қатты денелердің тығыздығын анықтау',
    d: 'Таразымен массаны, мензуркамен көлемді өлшеп, дененің тығыздығын тауып, кестелік мәнмен салыстырады.', o: ['7.2.2.14', '7.1.3.3'] },
  { k: 'arhimed', g: 7, no: 6, pre: 'A76', salt: 'A76|fizika7|arhimed', u: 'https://claude.ai/artifact/2j8xMyFYP1CmptfesTLRU8', s: 'stat',
    t: 'Архимед заңын зерделеу',
    d: 'Денені ауада және сұйықта динамометрмен өлшеп, ығыстырушы күшті тауып, ρgV есебімен салыстырады.', o: ['7.3.1.11', '7.1.3.3'] },
  { k: 'juzu', g: 7, no: 7, pre: 'J77', salt: 'J77|fizika7|juzu', u: 'https://claude.ai/artifact/Vy6w5M18BdW2GGEMwN9vX1', s: 'stat',
    t: 'Дененің сұйықта жүзу шарттарын анықтау',
    d: 'Үш пробирканы екі сұйыққа батырып, Fа мен Fы қатысы бойынша батуын, жүзуін, қалқуын алдын ала болжап тексереді.', o: ['7.3.1.14', '7.1.3.3'] },
  { k: 'jylu', g: 8, no: 1, pre: 'T8', salt: 'T8|fizika8|jylu', u: 'https://claude.ai/artifact/MxEudpbWWPwsVx6R1ixbkc', s: 'thermo',
    t: 'Температуралары әртүрлі суды араластырғандағы жылу мөлшерін салыстыру',
    d: 'Калориметрде ыстық пен суық суды араластырып, берілген және алынған жылу мөлшерін есептеп салыстырады.', o: ['8.3.2.8', '8.1.3.2', '8.1.3.3'] },
  { k: 'muz', g: 8, no: 2, pre: 'M8', salt: 'M8|fizika8|balqu', u: 'https://claude.ai/artifact/L8T2Y2hpRpkwjZS7HwKgg5', s: 'thermo',
    t: 'Мұздың меншікті балқу жылуын анықтау',
    d: 'Калориметрдегі жылы суға мұз салып, жылулық тепе-теңдік теңдеуінен λ мәнін табады.', o: ['8.3.2.12', '8.1.3.3'] },
  { k: 'tizbek', g: 8, no: 3, pre: 'E8', salt: 'E8|fizika8|tizbek', u: 'https://claude.ai/artifact/5DT4v1dqVJzfZqs8nPZb1e', s: 'dc',
    t: 'Электр тізбегін құрастыру, ток күші мен кернеуді өлшеу',
    d: 'Сұлба бойынша тізбекті жинап, амперметрді тізбектей, вольтметрді параллель қосып өлшеу жүргізеді.', o: ['8.4.2.4', '8.1.3.3'] },
  { k: 'om', g: 8, no: 4, pre: 'O8', salt: 'O8|fizika8|om', u: 'https://claude.ai/artifact/Xyo1xhrMCmxKVZdisgfXxZ', s: 'dc',
    t: 'Тізбек бөлігі үшін ток күшінің кернеуге және кедергіге тәуелділігі',
    d: 'I(U) және I(R) тәуелділігін өлшеп, график тұрғызып, кедергіні графиктен анықтайды.', o: ['8.4.2.5', '8.1.3.1', '8.1.3.3'] },
  { k: 'tizbektey', g: 8, no: 5, pre: 'S8', salt: 'S8|fizika8|tizbektei', u: 'https://claude.ai/artifact/ByQ42nEeQz8bGK1Ta28xGM', s: 'dc',
    t: 'Өткізгіштерді тізбектей жалғауды зерттеу',
    d: 'Тізбектей жалғауда ток күші бірдей, кернеулер мен кедергілер қосылатынын өлшеумен тексереді.', o: ['8.4.2.9', '8.1.3.3'] },
  { k: 'parallel', g: 8, no: 6, pre: 'P8', salt: 'P8|fizika8|parallel', u: 'https://claude.ai/artifact/EddEcMFPzd1ENVFKeN4Dcy', s: 'dc',
    t: 'Өткізгіштерді параллель жалғауды зерттеу',
    d: 'Параллель жалғауда кернеу бірдей, тармақтардағы ток күштері қосылатынын тексереді.', o: ['8.4.2.10', '8.1.3.3'] },
  { k: 'magnit', g: 8, no: 8, pre: 'M8', salt: 'M8|fizika8|magnit', u: 'https://claude.ai/artifact/BDPZX6xk47byXHRWwmN1ZR', s: 'mag',
    t: 'Тұрақты магнит және магнит өрісі',
    d: 'Магнит инесінің бағыты бойынша өріс сызықтарын салып, полюстерді және өрістің әсер ету аймағын анықтайды.', o: ['8.4.3.1'] },
  { k: 'emagnit', g: 8, no: 9, pre: 'E9', salt: 'E9|fizika8|elmag', u: 'https://claude.ai/artifact/TYUsAZK17Gjywz43VMnXXt', s: 'mag',
    t: 'Электромагнитті жинау және оның әрекетін тексеру',
    d: 'Катушка, өзек және кілттен электромагнит жинап, күшінің ток күші мен орам санына тәуелділігін зерттейді.', o: ['8.4.3.2', '8.4.3.3', '8.4.3.4', '8.1.3.3'] },
  { k: 'synu', g: 8, no: 10, pre: 'L10', salt: 'L10|fizika8|synu', u: 'https://claude.ai/artifact/666mTiUxtZd66Gk5kpL6uP', s: 'opt',
    t: 'Шынының сыну көрсеткішін анықтау',
    d: 'Шыны пластинкадан өткен сәуленің жолын салып, бұрыштарды өлшеп, n = sin α / sin β есептейді.', o: ['8.5.1.9', '8.5.1.10'] },
  { k: 'linza', g: 8, no: 11, pre: 'L11', salt: 'L11|fizika8|linza', u: 'https://claude.ai/artifact/FHNpcharfe4KLgBGD9TBAM', s: 'opt',
    t: 'Жұқа линзаның фокустық қашықтығы мен оптикалық күші',
    d: 'Экрандағы айқын кескін бойынша d мен f өлшеп, линза формуласынан F және D табады.', o: ['8.5.1.14', '8.1.3.3'] },
  { k: 'laqtyru', g: 9, no: 2, pre: 'Z2', salt: 'Z2|fizika9|zerthana', u: 'https://claude.ai/artifact/Fpj3wCRCjwCr8SaVZ95LzQ', s: 'kin',
    t: 'Горизонталь лақтырылған дененің қозғалысын зерделеу',
    d: 'Науадан лақтырылған шардың ұшу қашықтығы мен биіктігінен бастапқы жылдамдықты тауып, қателікті бағалайды.', o: ['9.2.1.10', '9.2.1.11', '9.2.1.12'] },
  { k: 'mayatnik', g: 9, no: 3, pre: 'Z3', salt: 'Z3|fizika9|mayatnik', u: 'https://claude.ai/artifact/P2vAT4qNWoZr67qHFkTA6p', s: 'osc',
    t: 'Математикалық маятниктің көмегімен еркін түсу үдеуін анықтау',
    d: 'Маятниктің ұзындығы мен тербеліс периодын өлшеп, g мәнін тауып, T²(l) графигін тұрғызады.', o: ['9.2.5.8', '9.2.5.9', '9.1.3.1'] },
  { k: 'tolqyn', g: 9, no: 4, pre: 'L94', salt: 'L94|fizika9|tolqyn', u: 'https://claude.ai/artifact/RgKc5Y4gKDtWzNSxqx1xNG', s: 'osc',
    t: 'Беттік толқындардың таралу жылдамдығын анықтау',
    d: 'Су бетіндегі толқынның ұзындығы мен жиілігін өлшеп, v = λν жылдамдығын табады.', o: ['9.2.5.14'] },
];

export const TOOLS = [
  { k: 'birlik', u: 'https://claude.ai/artifact/VNmeiF8wBHof4mGZ8LNyYW',
    t: 'Физика бірліктер түрлендіргіші', d: 'Ұзындық, масса, көлем, қысым, жұмыс пен қуат бірліктерін бір-біріне аударады — есеп шығарғанда да, зертханада да қажет.' },
];

export const labByKey = (k) => LABS.find((L) => L.k === k) || null;

// FNV-1a хэші — артефактідегі hashStr-пен дәл бірдей.
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// 10 балдық нәтижені 5 балдық бағаға аудару (артефактідегідей).
export const grade5 = (score) => {
  const p = (Number(score) || 0) * 10;
  return p < 40 ? 2 : p < 65 ? 3 : p < 85 ? 4 : 5;
};

export function readCode(code) {
  const raw = String(code || '').trim().replace(/\s+/g, '');
  if (!raw) return { bad: 'Код енгізілмеген' };
  const p = raw.split('.');
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return { bad: 'Код толық көшірілмеген (үш бөліктен тұруы керек)' };
  const cands = LABS.filter((L) => L.pre === p[0]);
  if (!cands.length) return { bad: `Бұл код жинақтағы зертханаға жатпайды: «${p[0].slice(0, 12)}»` };
  const lab = cands.find((L) => hashStr(L.salt + p[1]).toString(36) === p[2]);
  if (!lab) return { bad: 'Код қате көшірілген немесе қолмен өзгертілген' };
  let d;
  try {
    d = JSON.parse(Buffer.from(p[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return { bad: 'Кодтың ішін оқу мүмкін болмады' };
  }
  const name = String(d.n || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!name) return { bad: 'Кодта оқушының аты жоқ' };
  return {
    lab,
    code: raw,
    name,
    cls: String(d.c || '').replace(/\s+/g, ' ').trim().slice(0, 20),
    variant: String(d.v ?? '').slice(0, 20),
    score: Math.max(0, Math.min(10, Number(d.s) || 0)),
    crit: String(d.k || '').replace(/[^01]/g, '').slice(0, 20),
    at: String(d.t || '').slice(0, 40),
  };
}

// Тест үшін: зертхана беретін кодты жасау (оқушы бетіндегі алгоритммен бірдей).
export function makeCode(labKey, payload) {
  const lab = labByKey(labKey);
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${lab.pre}.${body}.${hashStr(lab.salt + body).toString(36)}`;
}

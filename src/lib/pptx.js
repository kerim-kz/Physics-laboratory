// ЖИ жасаған презентация құрылымынан (JSON) PowerPoint (.pptx) файлын құрастыру — pptxgenjs.
// Слайд түрлері: goals, hook, content, formula, example, table, experiment, quiz, summary, reflection.
import PptxGenJS from 'pptxgenjs';

export const THEMES = {
  blue: { name: 'Көк', p: '1F5FD1', d: '14213D', a: 'FFB02E', l: 'EAF1FF' },
  green: { name: 'Жасыл', p: '1D8A5B', d: '12352A', a: 'F2B134', l: 'E6F6EE' },
  orange: { name: 'Қызғылт сары', p: 'D9622B', d: '3A1D10', a: '2B7BD6', l: 'FDEEE5' },
  purple: { name: 'Күлгін', p: '6A3FC8', d: '231646', a: 'FFD34D', l: 'F0EAFD' },
};
const FONT = 'Arial', MATH = 'Cambria Math';
const S = (v, n = 400) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
const arr = (v, n = 8) => (Array.isArray(v) ? v : []).slice(0, n);

// Модель жіберген құрылымды тексеріп, қауіпсіз түрге келтіру
export function cleanDeck(d) {
  const deck = { title: S(d && d.title, 160) || 'Презентация', subtitle: S(d && d.subtitle, 200), slides: [] };
  for (const s of arr(d && d.slides, 30)) {
    if (!s || typeof s !== 'object') continue;
    const t = String(s.type || 'content');
    const o = { type: ['goals', 'hook', 'content', 'formula', 'example', 'table', 'experiment', 'quiz', 'summary', 'reflection'].includes(t) ? t : 'content', title: S(s.title, 120), notes: S(s.notes, 1500) };
    if (s.text) o.text = S(s.text, 500);
    if (s.bullets) o.bullets = arr(s.bullets).map((b) => S(b, 260)).filter(Boolean);
    if (o.type === 'formula') { o.latex = S(s.latex, 200); o.plain = S(s.plain || s.latex, 120); o.legend = arr(s.legend, 8).map((r) => arr(r, 3).map((c) => S(c, 80))).filter((r) => r.length >= 2); }
    if (o.type === 'example') { o.problem = S(s.problem, 600); o.steps = arr(s.steps, 8).map((x) => S(x, 240)).filter(Boolean); o.answer = S(s.answer, 160); }
    if (o.type === 'table') { o.headers = arr(s.headers, 6).map((x) => S(x, 60)); o.rows = arr(s.rows, 10).map((r) => arr(r, 6).map((c) => S(c, 90))); }
    if (o.type === 'quiz') o.questions = arr(s.questions, 6).map((q) => ({ q: S(q && q.q, 260), options: arr(q && q.options, 4).map((x) => S(x, 120)), answer: Math.max(0, Math.min(3, Number(q && q.answer) || 0)) })).filter((q) => q.q && q.options.length >= 2);
    deck.slides.push(o);
  }
  return deck;
}

export async function buildPptx(deckIn, themeKey = 'blue', meta = {}) {
  const deck = cleanDeck(deckIn), T = THEMES[themeKey] || THEMES.blue;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13,33 × 7,5 дюйм
  pres.title = deck.title; pres.author = meta.author || 'Ғылым Ордасы'; pres.company = 'Ғылым Ордасы';
  const W = 13.333, H = 7.5;
  let n = 0;
  const footer = (sl) => {
    sl.addText(`${meta.footer || 'Ғылым Ордасы'}`, { x: 0.5, y: H - 0.45, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: '8A94A6' });
    sl.addText(String(++n), { x: W - 1.0, y: H - 0.45, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 10, color: '8A94A6', align: 'right' });
  };
  const head = (sl, title, kind) => {
    sl.background = { color: 'FFFFFF' };
    sl.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.15, fill: { color: T.p } });
    sl.addShape(pres.ShapeType.ellipse, { x: W - 2.2, y: -1.0, w: 3.0, h: 3.0, fill: { color: 'FFFFFF', transparency: 88 }, line: { type: 'none' } });
    if (kind) sl.addText(kind, { x: 0.55, y: 0.12, w: 6, h: 0.3, fontFace: FONT, fontSize: 11, color: 'FFFFFF', bold: true, charSpacing: 2 });
    sl.addText(title || '', { x: 0.55, y: kind ? 0.38 : 0.2, w: W - 3, h: 0.7, fontFace: FONT, fontSize: 28, bold: true, color: 'FFFFFF', fit: 'shrink' });
  };
  const bullets = (sl, items, box) => {
    if (!items || !items.length) return;
    // пункт аз болса — ірі қаріп, слайдтың ортасында (бос орын қалмасын)
    const fs = items.length <= 3 ? 28 : items.length <= 5 ? 24 : 20;
    sl.addText(items.map((b) => ({ text: b, options: { bullet: { code: '25CF' }, paraSpaceAfter: 14 } })), { x: box.x, y: box.y, w: box.w, h: box.h, fontFace: FONT, fontSize: fs, color: T.d, valign: box.top ? 'top' : 'middle', fit: 'shrink' });
  };
  const KIND = { goals: 'МАҚСАТ', hook: 'ОЙЛАН', content: 'ТЕОРИЯ', formula: 'ФОРМУЛА', example: 'ЕСЕП ШЫҒАРУ', table: 'САЛЫСТЫР', experiment: 'ТӘЖІРИБЕ', quiz: 'ӨЗІҢДІ ТЕКСЕР', summary: 'ҚОРЫТЫНДЫ', reflection: 'РЕФЛЕКСИЯ' };

  // 1. Титул слайды
  const t0 = pres.addSlide();
  t0.background = { color: T.p };
  t0.addShape(pres.ShapeType.ellipse, { x: W - 4.2, y: -1.6, w: 6, h: 6, fill: { color: 'FFFFFF', transparency: 86 }, line: { type: 'none' } });
  t0.addShape(pres.ShapeType.ellipse, { x: -1.5, y: H - 2.8, w: 4, h: 4, fill: { color: T.a, transparency: 55 }, line: { type: 'none' } });
  t0.addShape(pres.ShapeType.rect, { x: 0.8, y: 3.55, w: 1.6, h: 0.08, fill: { color: T.a }, line: { type: 'none' } });
  t0.addText(deck.title, { x: 0.8, y: 1.4, w: W - 2.4, h: 2.0, fontFace: FONT, fontSize: 44, bold: true, color: 'FFFFFF', valign: 'bottom', fit: 'shrink' });
  if (deck.subtitle) t0.addText(deck.subtitle, { x: 0.8, y: 3.8, w: W - 2.4, h: 1.0, fontFace: FONT, fontSize: 22, color: 'FFFFFF', valign: 'top' });
  t0.addText(meta.byline || 'Ғылым Ордасы — физика пәнінің платформасы', { x: 0.8, y: H - 1.0, w: W - 1.6, h: 0.4, fontFace: FONT, fontSize: 14, color: 'FFFFFF' });
  n++;

  const answers = [];
  for (const s of deck.slides) {
    const sl = pres.addSlide();
    head(sl, s.title, KIND[s.type]);
    const box = { x: 0.7, y: 1.5, w: W - 1.4, h: H - 2.3 };
    if (s.type === 'hook') {
      sl.addShape(pres.ShapeType.roundRect, { x: 1.2, y: 1.7, w: W - 2.4, h: 2.6, fill: { color: T.l }, line: { color: T.p, width: 2 }, rectRadius: 0.2 });
      sl.addText('?', { x: W - 2.6, y: 1.25, w: 1.4, h: 1.4, fontFace: FONT, fontSize: 96, bold: true, color: T.a, align: 'center' });
      sl.addText(s.text || (s.bullets || [])[0] || '', { x: 1.6, y: 1.9, w: W - 4.4, h: 2.2, fontFace: FONT, fontSize: 30, bold: true, color: T.d, valign: 'middle', fit: 'shrink' });
      bullets(sl, s.text ? s.bullets : (s.bullets || []).slice(1), { x: 1.2, y: 4.6, w: W - 2.4, h: 2.1 });
    } else if (s.type === 'formula') {
      sl.addShape(pres.ShapeType.roundRect, { x: 2.2, y: 1.6, w: W - 4.4, h: 1.9, fill: { color: T.l }, line: { color: T.p, width: 2 }, rectRadius: 0.25 });
      sl.addText(s.plain || s.latex, { x: 2.2, y: 1.6, w: W - 4.4, h: 1.9, fontFace: MATH, fontSize: 48, color: T.d, align: 'center', valign: 'middle', fit: 'shrink' });
      if (s.legend && s.legend.length) {
        const rows = [[{ text: 'Белгі', options: { bold: true, color: 'FFFFFF', fill: { color: T.p } } }, { text: 'Шама', options: { bold: true, color: 'FFFFFF', fill: { color: T.p } } }, { text: 'Бірлігі', options: { bold: true, color: 'FFFFFF', fill: { color: T.p } } }]]
          .concat(s.legend.map((r, i) => [r[0], r[1], r[2] || '—'].map((c, j) => ({ text: c, options: { fontFace: j === 0 ? MATH : FONT, fill: { color: i % 2 ? 'FFFFFF' : 'F6F8FB' } } }))));
        sl.addTable(rows, { x: 2.2, y: 3.8, w: W - 4.4, colW: [1.6, (W - 4.4) - 3.6, 2.0], fontFace: FONT, fontSize: 16, color: T.d, border: { type: 'solid', pt: 0.75, color: 'D5DCE6' }, rowH: 0.42 });
      } else bullets(sl, s.bullets, { x: 2.2, y: 3.8, w: W - 4.4, h: 2.8 });
    } else if (s.type === 'example') {
      sl.addShape(pres.ShapeType.roundRect, { x: 0.7, y: 1.45, w: W - 1.4, h: 1.5, fill: { color: T.l }, line: { type: 'none' }, rectRadius: 0.15 });
      sl.addText([{ text: 'Есеп. ', options: { bold: true, color: T.p } }, { text: s.problem || '' }], { x: 0.95, y: 1.5, w: W - 1.9, h: 1.4, fontFace: FONT, fontSize: 18, color: T.d, valign: 'middle', fit: 'shrink' });
      sl.addText((s.steps || []).map((st) => ({ text: st, options: { bullet: { type: 'number' }, paraSpaceAfter: 6 } })), { x: 0.9, y: 3.1, w: W - 1.8, h: 2.9, fontFace: FONT, fontSize: 18, color: T.d, valign: 'top', fit: 'shrink' });
      if (s.answer) {
        sl.addShape(pres.ShapeType.roundRect, { x: W - 5.2, y: H - 1.45, w: 4.5, h: 0.75, fill: { color: T.a }, line: { type: 'none' }, rectRadius: 0.15 });
        sl.addText('Жауабы: ' + s.answer, { x: W - 5.1, y: H - 1.45, w: 4.3, h: 0.75, fontFace: FONT, fontSize: 18, bold: true, color: T.d, valign: 'middle', fit: 'shrink' });
      }
    } else if (s.type === 'table' && s.headers && s.headers.length) {
      const cols = s.headers.length;
      const rows = [s.headers.map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: T.p }, align: 'center' } }))]
        .concat((s.rows || []).map((r, i) => s.headers.map((_, j) => ({ text: r[j] || '', options: { fill: { color: i % 2 ? 'FFFFFF' : 'F6F8FB' } } }))));
      sl.addTable(rows, { x: 0.7, y: 1.6, w: W - 1.4, colW: Array(cols).fill((W - 1.4) / cols), fontFace: FONT, fontSize: rows.length > 6 ? 14 : 16, color: T.d, border: { type: 'solid', pt: 0.75, color: 'D5DCE6' }, valign: 'middle' });
      bullets(sl, s.bullets, { x: 0.7, y: 5.6, w: W - 1.4, h: 1.2 });
    } else if (s.type === 'quiz' && s.questions && s.questions.length) {
      const per = s.questions.length, h = (H - 2.2) / per;
      s.questions.forEach((q, i) => {
        const y = 1.45 + i * h;
        sl.addText(`${i + 1}. ${q.q}`, { x: 0.7, y, w: W - 1.4, h: h * 0.45, fontFace: FONT, fontSize: per > 3 ? 15 : 18, bold: true, color: T.d, valign: 'bottom', fit: 'shrink' });
        sl.addText(q.options.map((o, k) => `${'ABCD'[k]}) ${o}`).join('     '), { x: 0.9, y: y + h * 0.45, w: W - 1.8, h: h * 0.5, fontFace: FONT, fontSize: per > 3 ? 13 : 16, color: '44506A', valign: 'top', fit: 'shrink' });
        answers.push(`${answers.length + 1}. ${'ABCD'[q.answer]}) ${q.options[q.answer] || ''}`);
      });
    } else {
      // content, goals, experiment, summary, reflection
      if (s.text) { sl.addText(s.text, { x: box.x, y: box.y, w: box.w, h: 1.0, fontFace: FONT, fontSize: 20, italic: true, color: '44506A', fit: 'shrink' }); box.y += 1.1; box.h -= 1.1; }
      if (s.type === 'goals' || s.type === 'summary' || s.type === 'reflection') sl.addShape(pres.ShapeType.rect, { x: 0.7, y: box.y, w: 0.09, h: box.h - 0.2, fill: { color: T.a }, line: { type: 'none' } });
      bullets(sl, s.bullets, { x: box.x + 0.3, y: box.y, w: box.w - 0.3, h: box.h });
    }
    if (s.notes) sl.addNotes(s.notes);
    footer(sl);
  }
  if (answers.length) {
    const sl = pres.addSlide();
    head(sl, 'Тест жауаптары', 'МҰҒАЛІМГЕ');
    bullets(sl, answers.slice(0, 12), { x: 1.0, y: 1.5, w: W - 2, h: H - 2.3 });
    footer(sl);
  }
  return pres.write({ outputType: 'nodebuffer' });
}

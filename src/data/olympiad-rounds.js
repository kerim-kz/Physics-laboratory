// Олимпиаданың ресми онлайн турлары бір тізімде: тест (A–E таңдау) және теориялық тур (сан/формула жауап).
import { OLYMPIAD_TEST, OLYMPIAD_TESTS, testMax } from './olympiad-tests.js';
import { autoMax, THEORY_ROUND, THEORY_ROUNDS } from './olympiad-theory.js';

export const ROUNDS = [...OLYMPIAD_TESTS, ...THEORY_ROUNDS].sort((a, b) => a.g - b.g);
export const ROUND = { ...OLYMPIAD_TEST, ...THEORY_ROUND };
export const isTheory = (r) => r && r.kind === 'theory';
export const roundMax = (r) => (isTheory(r) ? autoMax(r) : testMax(r));
export const roundTitle = (r) => `${r.g}-сынып · ${r.stage}${isTheory(r) ? ', теориялық тур' : ''} ${r.year}`;
export const roundHref = (r) => (isTheory(r) ? `/olympiad/round/${r.k}` : `/olympiad/test/${r.k}`);
export const roundSize = (r) => (isTheory(r) ? `${r.problems.length} есеп` : `${r.questions.length} тапсырма`);

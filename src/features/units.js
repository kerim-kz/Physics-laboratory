// Физика бірліктер түрлендіргіші: бұрын claude.ai артефактісі болған құрал енді сайттың өз беті.
import fs from 'node:fs';
import express from 'express';
import { html, raw } from '../lib/html.js';
import { page } from '../lib/layout.js';
import { asyncH } from '../lib/util.js';

export const router = express.Router();

// Белгілеу (разметка) бір рет оқылады; мәтіндерін units.js қазақ/орыс тілінде толтырады.
const MARKUP = fs.readFileSync(new URL('./units.html', import.meta.url), 'utf8');

router.get('/units', asyncH(async (req, res) => {
  await page(req, res, {
    title: 'Бірліктер түрлендіргіші', active: 'units',
    description: 'Физикалық шамалардың бірліктерін түрлендіргіш: шешу қадамдары, жаттығу тапсырмалары, ХБЖ қосымшалары.',
    styles: ['/css/units.css'], scripts: ['/js/units.js'],
    body: html`<div class="view">${raw(MARKUP)}</div>`,
  });
}));

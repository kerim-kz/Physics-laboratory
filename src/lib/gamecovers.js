// Ойын карточкаларының суреттері (SVG, 320×170). Әр ойынның өз түсі және сюжеті бар.
import { raw } from './html.js';

const W = 320, H = 170;
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
const star = (x, y, r, fill = '#ffd34d') => {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`; }
  return `<path d="${d}Z" fill="${fill}"/>`;
};

const SCENES = {
  cannon: () => `<path d="M0 140 Q160 120 320 140 V170 H0Z" fill="#3e8a3a"/><rect x="230" y="96" width="44" height="46" rx="4" fill="#fff" opacity=".9"/><circle cx="252" cy="119" r="15" fill="#e2553d"/><circle cx="252" cy="119" r="9" fill="#fff"/><circle cx="252" cy="119" r="4" fill="#e2553d"/>
    <path d="M52 128 Q150 -10 246 112" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 6"/><circle cx="196" cy="62" r="7" fill="#222"/>
    <g transform="translate(40 128) rotate(-40)"><rect x="0" y="-9" width="46" height="18" rx="6" fill="#2b2f36"/></g><circle cx="40" cy="132" r="14" fill="#5b4632"/>`,
  mirrors: () => `<rect width="${W}" height="${H}" fill="#1b1340" opacity=".55"/><circle cx="34" cy="40" r="10" fill="#ff4d6d"/>
    <path d="M44 40 H150 V120 H262" fill="none" stroke="#ff4d6d" stroke-width="4"/><path d="M44 40 H150 V120 H262" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7"/>
    <rect x="138" y="28" width="24" height="5" fill="#cfe7ff" transform="rotate(45 150 40)"/><rect x="138" y="114" width="24" height="5" fill="#cfe7ff" transform="rotate(45 150 120)"/>
    <path d="M262 104 l14 16 -14 16 -14 -16z" fill="#7cf2ff"/><path d="M262 104 l14 16 -14 16 -14 -16z" fill="none" stroke="#fff" stroke-width="2"/>`,
  lamp: () => `<g stroke="#2b2f36" stroke-width="7" fill="none" stroke-linecap="round"><path d="M60 120 H140 V60 H250 V120 H200"/></g>
    <g stroke="#ffd34d" stroke-width="3" fill="none" stroke-dasharray="4 8"><path d="M60 120 H140 V60 H250 V120 H200"/></g>
    <rect x="36" y="104" width="34" height="34" rx="6" fill="#2b2f36"/><text x="53" y="127" font-size="18" text-anchor="middle" fill="#ffd34d" font-family="sans-serif" font-weight="700">+</text>
    <circle cx="250" cy="44" r="26" fill="#fff6c2"/><circle cx="250" cy="44" r="38" fill="#fff6c2" opacity=".35"/><rect x="241" y="66" width="18" height="12" fill="#9aa1a8"/>`,
  lander: () => `<rect width="${W}" height="${H}" fill="#0c1633" opacity=".6"/>${[30, 80, 140, 210, 290, 60, 180, 260].map((x, i) => `<circle cx="${x}" cy="${(i * 37) % 90 + 10}" r="1.6" fill="#fff"/>`).join('')}
    <path d="M0 150 Q60 130 120 148 T240 140 T320 150 V170 H0Z" fill="#b9bec6"/><rect x="140" y="138" width="60" height="6" fill="#ffd34d"/>
    <g transform="translate(170 70)"><path d="M0 -34 C12 -24 14 -6 12 10 H-12 C-14 -6 -12 -24 0 -34Z" fill="#fff"/><circle cx="0" cy="-12" r="5" fill="#2b7bd6"/><path d="M-12 4 L-20 18 H-10Z M12 4 L20 18 H10Z" fill="#e2553d"/><path d="M-7 12 Q0 40 7 12Z" fill="#ffb02e"/></g>`,
  density: () => `<rect x="40" y="60" width="240" height="100" fill="#5fc4e8" opacity=".85"/><path d="M40 60 Q80 52 120 60 T200 60 T280 60" fill="none" stroke="#fff" stroke-width="2"/>
    <rect x="76" y="48" width="36" height="22" rx="4" fill="#c99a5b"/><circle cx="210" cy="142" r="13" fill="#7d858e"/><circle cx="206" cy="138" r="4" fill="#fff" opacity=".5"/>
    <path d="M150 30 l8 12 h-16z" fill="#fff" opacity=".9"/><text x="160" y="22" font-size="13" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">ρ ?</text>`,
  millionaire: () => `<circle cx="160" cy="85" r="70" fill="${'#1d1f6e'}" opacity=".55"/><circle cx="160" cy="85" r="52" fill="none" stroke="#ffd34d" stroke-width="3"/>
    <text x="160" y="80" font-size="26" text-anchor="middle" fill="#ffd34d" font-family="sans-serif" font-weight="800">1 000 000</text><text x="160" y="106" font-size="16" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">Дж</text>
    ${star(56, 40, 12)}${star(268, 46, 9)}${star(280, 130, 12)}${star(40, 128, 8)}`,
  teams: () => `<rect x="40" y="96" width="70" height="50" fill="#9aa1a8"/><rect x="125" y="70" width="70" height="76" fill="#ffd34d"/><rect x="210" y="110" width="70" height="36" fill="#c98a4e"/>
    <text x="160" y="114" font-size="30" text-anchor="middle" fill="#7a5a00" font-family="sans-serif" font-weight="800">1</text><text x="75" y="128" font-size="22" text-anchor="middle" fill="#444" font-family="sans-serif" font-weight="800">2</text><text x="245" y="136" font-size="20" text-anchor="middle" fill="#5a3410" font-family="sans-serif" font-weight="800">3</text>
    <circle cx="160" cy="48" r="14" fill="#fff"/><circle cx="75" cy="76" r="12" fill="#fff"/><circle cx="245" cy="92" r="11" fill="#fff"/>${star(120, 30, 8)}${star(205, 26, 10)}`,
  crossword: () => {
    // «ЖОЛ» көлденең, «ТОК» тігінен — «О» әрпінде қиылысады; «КҮШ» — «К» әрпінен
    const cells = [[2, 1, 'Т'], [2, 2, 'О'], [2, 3, 'К'], [1, 2, 'Ж'], [3, 2, 'Л'], [3, 3, 'Ү'], [4, 3, 'Ш']];
    return cells.map(([x, y, ch]) => `<rect x="${70 + x * 32}" y="${12 + y * 34}" width="30" height="30" rx="4" fill="#fff"/>${ch ? `<text x="${85 + x * 32}" y="${34 + y * 34}" font-size="17" text-anchor="middle" fill="#2c5e2e" font-family="sans-serif" font-weight="800">${ch}</text>` : ''}`).join('') + '<rect x="230" y="80" width="30" height="30" rx="4" fill="#fff" opacity=".6"/>';
  },
  oddone: () => `${[[60, '#fff'], [130, '#fff'], [200, '#fff'], [270, '#ffd34d']].map(([x, f], i) => `<circle cx="${x - 10}" cy="85" r="28" fill="${f}" opacity="${i === 3 ? 1 : 0.9}"/>`).join('')}
    <text x="50" y="92" font-size="18" text-anchor="middle" fill="#7a3416" font-family="sans-serif" font-weight="800">Дж</text><text x="120" y="92" font-size="18" text-anchor="middle" fill="#7a3416" font-family="sans-serif" font-weight="800">эВ</text><text x="190" y="92" font-size="15" text-anchor="middle" fill="#7a3416" font-family="sans-serif" font-weight="800">кВт·с</text><text x="260" y="92" font-size="18" text-anchor="middle" fill="#7a3416" font-family="sans-serif" font-weight="800">Вт</text>
    <path d="M240 50 l40 70 M280 50 l-40 70" stroke="#c0392b" stroke-width="5" stroke-linecap="round" opacity=".85"/>`,
  buildf: () => `${['F', '=', 'm', '·', 'a'].map((t, i) => `<rect x="${44 + i * 48}" y="62" width="42" height="46" rx="8" fill="#fff"/><text x="${65 + i * 48}" y="94" font-size="24" text-anchor="middle" fill="#5a3a10" font-family="serif" font-style="italic" font-weight="700">${t}</text>`).join('')}
    <rect x="120" y="122" width="42" height="34" rx="8" fill="#fff" opacity=".55" transform="rotate(-8 140 140)"/><rect x="190" y="124" width="42" height="34" rx="8" fill="#fff" opacity=".55" transform="rotate(10 210 140)"/>`,
  cards: () => `<rect x="70" y="30" width="110" height="120" rx="12" fill="#fff" opacity=".6" transform="rotate(-10 125 90)"/><rect x="130" y="26" width="120" height="124" rx="12" fill="#fff"/><text x="190" y="96" font-size="24" text-anchor="middle" fill="#2c4a75" font-family="serif" font-style="italic" font-weight="700">E = mc²</text>`,
  pairs: () => `${[0, 1, 2].map((i) => `<rect x="50" y="${24 + i * 44}" width="90" height="34" rx="8" fill="#fff"/><rect x="180" y="${24 + i * 44}" width="90" height="34" rx="8" fill="#fff" opacity=".85"/>`).join('')}<path d="M140 41 C160 41 160 85 180 85 M140 85 C160 85 160 129 180 129 M140 129 C160 129 160 41 180 41" stroke="#ffd34d" stroke-width="3" fill="none"/>`,
  quiz: () => `<circle cx="160" cy="85" r="56" fill="#fff"/><circle cx="160" cy="85" r="46" fill="none" stroke="${'#e0662a'}" stroke-width="6" stroke-dasharray="210 300" transform="rotate(-90 160 85)"/><text x="160" y="97" font-size="34" text-anchor="middle" fill="#e0662a" font-family="sans-serif" font-weight="800">60</text>`,
  symbol: () => `<text x="160" y="110" font-size="60" text-anchor="middle" fill="#fff" font-family="serif" font-style="italic">p = ρgh</text><rect x="196" y="50" width="38" height="70" rx="6" fill="none" stroke="#ffd34d" stroke-width="4"/>`,
  units: () => `<rect x="40" y="70" width="240" height="40" rx="6" fill="#fff"/>${Array.from({ length: 25 }, (_, i) => `<rect x="${48 + i * 9.6}" y="70" width="1.6" height="${i % 5 ? 10 : 18}" fill="#7a3a1a"/>`).join('')}<text x="160" y="56" font-size="22" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="800">м · кг · с · А</text>`,
  convert: () => `<rect x="34" y="60" width="104" height="50" rx="10" fill="#fff"/><rect x="182" y="60" width="104" height="50" rx="10" fill="#fff"/><text x="86" y="92" font-size="18" text-anchor="middle" fill="#1f5f8a" font-family="sans-serif" font-weight="800">72 км/сағ</text><text x="234" y="92" font-size="18" text-anchor="middle" fill="#1f5f8a" font-family="sans-serif" font-weight="800">20 м/с</text><path d="M144 85 h30 m-10 -10 l10 10 -10 10" stroke="#fff" stroke-width="4" fill="none"/>`,
  scientist: () => `<circle cx="160" cy="70" r="34" fill="#fff"/><path d="M118 150 a42 42 0 0 1 84 0Z" fill="#fff"/><path d="M130 58 q30 -38 60 0" fill="#e8e1cf"/><circle cx="148" cy="72" r="3.5" fill="#333"/><circle cx="172" cy="72" r="3.5" fill="#333"/><path d="M150 88 q10 8 20 0" stroke="#333" stroke-width="2.5" fill="none"/>${star(232, 40, 10)}`,
};

export function cover(g) {
  const c = g.color || '#4a6fa5';
  const scene = (SCENES[g.k] || (() => ''))();
  return raw(`<svg class="gcover" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false">
  <defs><linearGradient id="gc-${g.k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(c, 0.25)}"/><stop offset="1" stop-color="${shade(c, -0.25)}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#gc-${g.k})"/>
  <circle cx="292" cy="22" r="54" fill="#fff" opacity=".08"/><circle cx="20" cy="160" r="70" fill="#fff" opacity=".06"/>
  ${scene}</svg>`);
}

// Маскот — «Атомжан»: ойынның бастау және соңғы экранында
export function mascot(size = 96) {
  return raw(`<svg class="mascot" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="50" cy="50" rx="46" ry="17" fill="none" stroke="#5aa0ff" stroke-width="4" transform="rotate(30 50 50)"/>
  <ellipse cx="50" cy="50" rx="46" ry="17" fill="none" stroke="#ff7aa8" stroke-width="4" transform="rotate(-30 50 50)"/>
  <circle cx="50" cy="50" r="24" fill="#ffd34d"/><circle cx="42" cy="46" r="4" fill="#1b2329"/><circle cx="58" cy="46" r="4" fill="#1b2329"/>
  <circle cx="43.5" cy="44.5" r="1.3" fill="#fff"/><circle cx="59.5" cy="44.5" r="1.3" fill="#fff"/>
  <path d="M41 57 q9 8 18 0" stroke="#1b2329" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="35" cy="55" r="3.5" fill="#ff9a7a" opacity=".7"/><circle cx="65" cy="55" r="3.5" fill="#ff9a7a" opacity=".7"/>
  <circle cx="91" cy="73" r="4.5" fill="#5aa0ff"/><circle cx="9" cy="73" r="4.5" fill="#ff7aa8"/></svg>`);
}

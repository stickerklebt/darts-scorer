/* Comic-Grafiken für die Animationen. Alles eigene SVGs. */
import { starPath, sparkPath, bladeDart, COLORS } from './svg.js';

const K = '#0e1211'; // Konturfarbe
const sv = (vb, body, cls = '') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;

export const egg = () => sv('0 0 120 100', `
  <path d="M14 52 C6 30 30 10 52 16 C66 4 96 10 100 30 C118 38 116 66 98 74 C92 94 60 96 46 86 C24 92 4 76 14 52 Z" fill="#f8f5ea" stroke="${K}" stroke-width="4"/>
  <path d="M24 56 C22 44 30 34 40 32" fill="none" stroke="#d9d3c0" stroke-width="4" stroke-linecap="round"/>
  <circle cx="60" cy="50" r="20" fill="#e6e9ee" stroke="${K}" stroke-width="4"/>
  <ellipse cx="53" cy="43" rx="6" ry="4" fill="#fff4c4" transform="rotate(-30 53 43)"/>`);

export const toast = () => sv('0 0 100 100', `
  <path d="M14 40 C4 14 34 2 50 12 C66 2 96 14 86 40 L84 92 L16 92 Z" fill="#c98a3a" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M24 42 C18 24 38 16 50 24 C62 16 82 24 76 42 L74 84 L26 84 Z" fill="#f0c784"/>
  <path d="M34 50 l4 4 M56 60 l5 3 M44 72 l3 5 M62 44 l4 -2" stroke="#c98a3a" stroke-width="3" stroke-linecap="round"/>`);

export const toaster = () => sv('0 0 180 120', `
  <rect x="10" y="30" width="160" height="80" rx="18" fill="#b9c2c0" stroke="${K}" stroke-width="5"/>
  <rect x="22" y="40" width="40" height="60" rx="10" fill="#e8eeec" opacity=".7"/>
  <rect x="40" y="22" width="44" height="14" fill="${K}"/><rect x="98" y="22" width="44" height="14" fill="${K}"/>
  <rect x="160" y="50" width="16" height="10" fill="${K}"/>
  <circle cx="148" cy="90" r="7" fill="${COLORS.red}" stroke="${K}" stroke-width="3"/>
  <rect x="20" y="106" width="20" height="10" fill="${K}"/><rect x="140" y="106" width="20" height="10" fill="${K}"/>`);

export const bacon = () => sv('0 0 160 50', `
  <path d="M6 26 C26 6 40 44 60 24 C80 4 94 44 114 24 C130 8 144 30 154 22 L156 34 C146 42 132 22 116 36 C96 56 82 16 62 36 C42 56 28 18 8 38 Z" fill="#c2453a" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M10 31 C28 14 42 50 61 30 C80 10 95 50 115 30 C131 15 144 34 153 28" fill="none" stroke="#f3c2a8" stroke-width="5"/>`);

export const teacup = () => sv('0 0 150 120', `
  <path d="M40 40 C44 30 48 20 44 10 M64 40 C68 28 72 22 66 8 M88 40 C92 30 96 22 90 10" fill="none" stroke="#e8eeec" stroke-width="4" stroke-linecap="round" class="steam"/>
  <path d="M110 58 C134 52 136 86 108 84" fill="none" stroke="${K}" stroke-width="12"/><path d="M110 58 C134 52 136 86 108 84" fill="none" stroke="#f3efe2" stroke-width="5"/>
  <path d="M24 46 H116 C116 84 100 100 70 100 C40 100 24 84 24 46 Z" fill="#f3efe2" stroke="${K}" stroke-width="5"/>
  <ellipse cx="70" cy="47" rx="44" ry="6" fill="#8a4d22" stroke="${K}" stroke-width="3"/>
  <path d="M44 66 h52" stroke="${COLORS.blue}" stroke-width="5"/>
  <ellipse cx="70" cy="108" rx="62" ry="9" fill="#f3efe2" stroke="${K}" stroke-width="5"/>`);

/** 30-60-90-Geodreieck mit Skala und 60°-Bogen */
export const setSquare = () => {
  let ticks = '';
  for (let i = 1; i < 20; i++) ticks += `<path d="M${14 + i * 9.6} 196 v${i % 5 ? -7 : -14}" stroke="${K}" stroke-width="1.6"/>`;
  return sv('0 0 220 210', `
  <path d="M10 200 L210 200 L10 20 Z" fill="rgba(140,214,255,.55)" stroke="${K}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M40 180 L150 180 L40 81 Z" fill="none" stroke="${K}" stroke-width="2.5" stroke-dasharray="6 5"/>
  ${ticks}
  <path d="M168 200 A42 42 0 0 0 179 172" fill="none" stroke="${COLORS.red}" stroke-width="6"/>
  <path d="M10 170 H40 V200" fill="none" stroke="${K}" stroke-width="3"/>`);
};

export const balloon = (c) => sv('0 0 80 160', `
  <path d="M40 106 C36 120 46 130 40 144 C34 156 44 160 40 160" fill="none" stroke="${K}" stroke-width="2.5"/>
  <path d="M40 4 C64 4 76 26 76 48 C76 78 54 98 40 104 C26 98 4 78 4 48 C4 26 16 4 40 4 Z" fill="${c}" stroke="${K}" stroke-width="4"/>
  <path d="M34 104 L46 104 L42 112 L38 112 Z" fill="${c}" stroke="${K}" stroke-width="3"/>
  <path d="M22 26 C26 18 32 14 40 13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>`);

export const hand = (flip = false) => sv('0 0 100 130', `<g ${flip ? 'transform="translate(100 0) scale(-1 1)"' : ''}>
  <path d="M30 124 L28 92 C14 84 10 64 16 46 L22 22 C24 14 34 14 35 23 L36 44 L38 12 C39 3 51 3 51 12 L52 42 L56 10 C57 2 69 2 69 11 L68 44 L74 20 C76 12 87 14 86 22 L82 56 C88 52 96 54 96 62 C94 74 84 88 72 96 L70 124 Z" fill="#f2c9a0" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M30 116 H70" stroke="${K}" stroke-width="3"/><path d="M28 112 H72 V128 H28 Z" fill="${COLORS.blue}" stroke="${K}" stroke-width="4"/>
  <path d="M44 70 C50 74 58 74 64 70" fill="none" stroke="#c99974" stroke-width="3" stroke-linecap="round"/></g>`);

export const camera = (flash = true) => sv('0 0 160 140', `
  ${flash ? `<path d="M24 6 L64 6 L58 36 L30 36 Z" fill="#e8eeec" stroke="${K}" stroke-width="4"/><circle cx="44" cy="20" r="9" fill="#fffbe0" stroke="${K}" stroke-width="3"/><rect x="40" y="36" width="8" height="18" fill="${K}"/>` : ''}
  <rect x="12" y="52" width="136" height="80" rx="8" fill="#2a302e" stroke="${K}" stroke-width="5"/>
  <rect x="12" y="52" width="136" height="16" fill="#6b7470"/>
  <rect x="104" y="40" width="34" height="14" fill="#2a302e" stroke="${K}" stroke-width="4"/>
  <circle cx="80" cy="96" r="30" fill="#6b7470" stroke="${K}" stroke-width="5"/>
  <circle cx="80" cy="96" r="20" fill="#14304d" stroke="${K}" stroke-width="4"/>
  <circle cx="72" cy="88" r="6" fill="#9fd8ff"/>`);

/** Atomrakete, Spitze rechts */
export const nukeRocket = () => sv('-130 -50 260 100', `
  <path d="M-128 0 L-98 -22 L-104 0 L-98 22 Z" fill="#e6e9ee" class="flame"/>
  <path d="M-114 0 L-96 -12 L-98 0 L-96 12 Z" fill="#fff4c4" class="flame"/>
  <path d="M-92 -26 L-60 -20 L-60 20 L-92 26 L-80 0 Z" fill="${COLORS.red}" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M-80 -22 H70 C100 -22 122 -10 130 0 C122 10 100 22 70 22 H-80 Z" fill="#c9cdc2" stroke="${K}" stroke-width="5"/>
  <path d="M86 -20 C108 -16 122 -8 130 0 C122 8 108 16 86 20 Z" fill="${COLORS.red}" stroke="${K}" stroke-width="4"/>
  <circle cx="20" cy="0" r="17" fill="#ffd45c" stroke="${K}" stroke-width="4"/>
  <circle cx="20" cy="0" r="4" fill="${K}"/>
  ${[0, 120, 240].map((a) => `<path d="M20 0 L${20 + 15 * Math.cos(((a - 30) * Math.PI) / 180)} ${15 * Math.sin(((a - 30) * Math.PI) / 180)} A15 15 0 0 1 ${20 + 15 * Math.cos(((a + 30) * Math.PI) / 180)} ${15 * Math.sin(((a + 30) * Math.PI) / 180)} Z" fill="${K}"/>`).join('')}
  <path d="M-60 -22 V22 M-40 -22 V22" stroke="${K}" stroke-width="3"/>
  <path d="M-20 -36 L-50 -22 H-10 Z M-20 36 L-50 22 H-10 Z" fill="${COLORS.red}" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>`);

/** Schatztruhe: Unterteil und Deckel getrennt (für die Öffnen-Animation) */
export const chestBase = () => sv('0 0 240 150', `
  <rect x="10" y="10" width="220" height="132" rx="8" fill="#7a4a22" stroke="${K}" stroke-width="6"/>
  ${[44, 84, 124].map((y) => `<path d="M12 ${y} H228" stroke="#5a3415" stroke-width="5"/>`).join('')}
  <rect x="10" y="10" width="30" height="132" fill="#c9a34e" stroke="${K}" stroke-width="5"/><rect x="200" y="10" width="30" height="132" fill="#c9a34e" stroke="${K}" stroke-width="5"/>
  <rect x="96" y="4" width="48" height="56" rx="6" fill="#e2c47e" stroke="${K}" stroke-width="5"/>
  <path d="M120 22 a7 7 0 1 1 0.1 0 M116 34 h8 v12 h-8 z" fill="${K}"/>
  ${[24, 216].map((x) => [30, 74, 118].map((y) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${K}"/>`).join('')).join('')}`, 'chest-base');
export const chestLid = () => sv('0 0 240 110', `
  <path d="M10 100 V52 C10 18 50 6 120 6 C190 6 230 18 230 52 V100 Z" fill="#8a5528" stroke="${K}" stroke-width="6"/>
  <path d="M12 70 C60 60 180 60 228 70" fill="none" stroke="#5a3415" stroke-width="5"/>
  <path d="M10 100 V52 C10 26 24 14 40 10 V100 Z M230 100 V52 C230 26 216 14 200 10 V100 Z" fill="#c9a34e" stroke="${K}" stroke-width="5"/>
  <path d="M100 100 V84 H140 V100" fill="#e2c47e" stroke="${K}" stroke-width="5"/>
  <path d="${sparkPath(70, 36, 9)}" fill="#ffd45c"/>`, 'chest-lid');

/** Großer Fisch, Maul rechts */
export const bigFish = () => {
  let scales = '';
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) scales += `<path d="M${30 + i * 26 + (r % 2) * 13} ${-24 + r * 22} a12 12 0 0 1 0 22" fill="none" stroke="#1f5f6f" stroke-width="3"/>`;
  return sv('-140 -90 300 180', `
  <path d="M-96 0 L-138 -58 C-126 -20 -126 20 -138 58 Z" fill="#3fa7b5" stroke="${K}" stroke-width="6" stroke-linejoin="round" class="tail"/>
  <path d="M-110 0 C-80 -76 70 -86 130 -14 C140 -4 140 6 130 14 C70 86 -80 76 -110 0 Z" fill="#5cc6cf" stroke="${K}" stroke-width="7"/>
  <path d="M-96 6 C-60 56 60 66 120 18 C70 44 -40 46 -96 6 Z" fill="#e8f4ea"/>
  <path d="M-10 -58 C10 -96 50 -92 66 -62 Z" fill="#3fa7b5" stroke="${K}" stroke-width="6" stroke-linejoin="round"/>
  ${scales}
  <path d="M10 26 C26 46 46 48 60 36 C44 34 28 30 10 26 Z" fill="#3fa7b5" stroke="${K}" stroke-width="4"/>
  <circle cx="92" cy="-18" r="17" fill="#fff" stroke="${K}" stroke-width="5"/><circle cx="97" cy="-18" r="8" fill="${K}"/><circle cx="100" cy="-22" r="3" fill="#fff"/>
  <path d="M138 2 C126 6 116 8 104 6" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>
  <path d="M70 -46 C82 -40 92 -40 102 -44" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/>`);
};

export const fist = () => sv('0 0 160 140', `
  <path d="M8 60 H50 V100 H8 Z" fill="${COLORS.red}" stroke="${K}" stroke-width="5"/>
  <path d="M46 40 C46 30 56 26 64 30 C66 18 82 16 88 26 C92 16 108 16 112 28 C118 20 134 22 136 36 C150 40 154 60 148 76 C144 104 124 124 92 124 C66 124 48 110 46 92 Z" fill="#f2c9a0" stroke="${K}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M64 30 C62 46 66 56 72 60 M88 26 C86 44 90 56 96 60 M112 28 C110 44 114 56 120 60 M136 36 C134 50 136 60 140 64" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
  <path d="M60 70 C76 66 96 70 106 82 C94 80 76 80 64 86" fill="#e8b48a" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>`);

export const dartBig = () => sv('-100 -30 200 60', bladeDart(COLORS, COLORS.red));
export const target = () => sv('-60 -60 120 120', `
  <circle r="58" fill="${K}"/><circle r="50" fill="#e8e4d4"/><circle r="40" fill="${COLORS.red}"/><circle r="30" fill="#e8e4d4"/><circle r="20" fill="${COLORS.green}"/><circle r="10" fill="${COLORS.red}"/>`);

/** Strahlen (harte Kanten) */
export const rays = (n = 18, c1 = 'rgba(255,212,92,.35)') => {
  let p = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i * 360) / n, a1 = a0 + 360 / n / 2.2;
    const r = 1000, x0 = r * Math.cos((a0 * Math.PI) / 180), y0 = r * Math.sin((a0 * Math.PI) / 180), x1 = r * Math.cos((a1 * Math.PI) / 180), y1 = r * Math.sin((a1 * Math.PI) / 180);
    p += `<path d="M0 0 L${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${c1}"/>`;
  }
  return sv('-1000 -1000 2000 2000', p, 'rays');
};

/** Comic-Explosion (Zacken) */
export const boom = (fill = '#ffd45c', fill2 = COLORS.red) => {
  const pts = (R, r, n) => { let d = ''; for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r : R * (i % 4 ? 0.86 : 1); const a = (i * Math.PI) / n; d += `${i ? 'L' : 'M'}${(rr * Math.cos(a)).toFixed(1)},${(rr * Math.sin(a)).toFixed(1)}`; } return `${d}Z`; };
  return sv('-210 -210 420 420', `<path d="${pts(204, 120, 16)}" fill="${fill2}" stroke="${K}" stroke-width="8" stroke-linejoin="round"/><path d="${pts(160, 96, 16)}" fill="${fill}"/>`);
};

export const star = (c = '#ffd45c') => sv('0 0 40 40', `<path d="${starPath(20, 20, 19, 8)}" fill="${c}" stroke="${K}" stroke-width="2.5"/>`);

/** Eiskristall-Rand (Frost) */
export const frost = () => {
  let p = '';
  const flake = (x, y, s) => [0, 60, 120].map((a) => `<path d="M${x - s * Math.cos((a * Math.PI) / 180)} ${y - s * Math.sin((a * Math.PI) / 180)} L${x + s * Math.cos((a * Math.PI) / 180)} ${y + s * Math.sin((a * Math.PI) / 180)}"/>`).join('');
  for (let i = 0; i < 26; i++) {
    const edge = i % 4, t = (i * 37) % 100;
    const x = edge === 0 ? t : edge === 1 ? 100 - (i % 3) * 4 : edge === 2 ? t : (i % 3) * 4;
    const y = edge === 0 ? (i % 3) * 4 : edge === 1 ? t : edge === 2 ? 100 - (i % 3) * 4 : t;
    p += flake(x, y, 3 + (i % 4) * 1.6);
  }
  return sv('0 0 100 100', `<g stroke="#fff" stroke-width=".7" stroke-linecap="round" opacity=".9">${p}</g>`, 'frostsvg');
};

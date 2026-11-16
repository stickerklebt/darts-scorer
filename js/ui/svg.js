/* Eigene SVG-Grafiken: Wappen, Ornamente, Badges, Comic-Elemente, Icons. Alles selbst entworfen. */

export const COLORS = {
  ink: '#0e1211', cream: '#dedcd0', cream2: '#b5b8aa', gold: '#c9a34e', goldL: '#e2c47e',
  red: '#c4452f', blue: '#3f6ea6', yellow: '#ddbd55', green: '#4f9a5e', violet: '#8c6fc4', teal: '#6fa59b',
  stone: '#6b7470', stoneD: '#454d4a', stoneL: '#9aa29b',
  pink: '#ff4fb3', cyan: '#52e4ff', magic: '#a66bff', spark: '#ffd45c',
};
export const PLAYER_COLORS = ['#c4452f', '#3f6ea6', '#d9b84e', '#4f9a5e', '#8c6fc4', '#d6d3c4'];
export const PLAYER_INK = ['#f4efe4', '#f4efe4', '#0e1211', '#f4efe4', '#f4efe4', '#0e1211'];

const r2 = (x) => Math.round(x * 100) / 100;
const polar = (cx, cy, r, deg) => [r2(cx + r * Math.cos((deg * Math.PI) / 180)), r2(cy + r * Math.sin((deg * Math.PI) / 180))];

export function starPath(cx, cy, R, r, n = 5, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) pts.push(polar(cx, cy, i % 2 ? r : R, rot + (i * 180) / n).join(','));
  return `M${pts.join('L')}Z`;
}
export function burstPath(cx, cy, R, r, n = 18) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const jitter = i % 2 ? r : R * (i % 4 === 0 ? 1 : 0.88);
    pts.push(polar(cx, cy, jitter, -90 + (i * 180) / n).join(','));
  }
  return `M${pts.join('L')}Z`;
}

/* ---------- Lorbeerzweig (links), entlang eines Bogens ---------- */
function laurelBranch(cx, cy, R, from, to, n, color) {
  let out = `<path d="M${polar(cx, cy, R, from).join(',')} A${R},${R} 0 0,1 ${polar(cx, cy, R, to).join(',')}" fill="none" stroke="${color}" stroke-width="2"/>`;
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * (i + 0.5)) / n;
    for (const side of [-1, 1]) {
      const [x, y] = polar(cx, cy, R + side * 5, a);
      out += `<ellipse cx="${x}" cy="${y}" rx="8" ry="3.4" fill="${color}" transform="rotate(${r2(a + 90 + side * 35)} ${x} ${y})"/>`;
    }
  }
  return out;
}
export function laurelWreath(cx, cy, R, color = COLORS.gold, n = 8) {
  const left = laurelBranch(cx, cy, R, 100, 235, n, color);
  return `<g>${left}</g><g transform="translate(${cx * 2} 0) scale(-1 1)">${left}</g>`;
}

/* ---------- Funke (4-zackig, Comic-Magie) ---------- */
export const sparkPath = (cx, cy, R, r = R * 0.22) => starPath(cx, cy, R, r, 4, -90);
/** Elektrische Zickzack-Linie von (x0,y0) nach (x1,y1) */
export function zigzag(x0, y0, x1, y1, n = 6, amp = 6, seed = 1) {
  let d = `M${r2(x0)},${r2(y0)}`;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  for (let i = 1; i < n; i++) {
    const t = i / n, off = (i % 2 ? 1 : -1) * amp * (0.6 + ((seed * 7 + i * 13) % 5) / 10);
    d += ` L${r2(x0 + dx * t + nx * off)},${r2(y0 + dy * t + ny * off)}`;
  }
  return `${d} L${r2(x1)},${r2(y1)}`;
}

/* ---------- Klingen-Pfeil (liegend, Spitze rechts) ---------- */
export function bladeDart(C = COLORS, flight = COLORS.red) {
  return `<path d="M96 0 L62 -4 L62 4 Z" fill="${C.cream}"/>
    <path d="M62 -6 L30 -5 L22 0 L30 5 L62 6 Z" fill="${C.stoneL}" stroke="${C.ink}" stroke-width="1.5"/>
    <path d="M36 -5v10M44 -5.4v10.8M52 -5.7v11.4" stroke="${C.ink}" stroke-width="1.4"/>
    <rect x="-46" y="-2" width="70" height="4" fill="${C.cream2}"/>
    <path d="M-44 0 L-92 -26 L-74 0 L-92 26 Z" fill="${flight}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M-48 0 L-82 -18 M-48 0 L-82 18" stroke="${C.ink}" stroke-width="1.2"/>`;
}

/* ---------- Mini-Dartscheibe (für Wappen, Platzhalter) ---------- */
export function miniBoard(cx, cy, R, C = COLORS) {
  const k = R / 41;
  let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.ink}"/>`;
  for (let i = 0; i < 20; i++) {
    const a0 = -99 + i * 18, a1 = a0 + 18, dark = i % 2 === 0;
    const seg = (r0, r1, fill) => {
      const [x0, y0] = polar(cx, cy, r1 * k, a0), [x1, y1] = polar(cx, cy, r1 * k, a1), [x2, y2] = polar(cx, cy, r0 * k, a1), [x3, y3] = polar(cx, cy, r0 * k, a0);
      return `<path d="M${x0},${y0} A${r1 * k},${r1 * k} 0 0,1 ${x1},${y1} L${x2},${y2} A${r0 * k},${r0 * k} 0 0,0 ${x3},${y3} Z" fill="${fill}"/>`;
    };
    s += seg(6, 33, dark ? C.ink : C.cream) + seg(20, 24, dark ? C.red : C.green) + seg(33, 37, dark ? C.red : C.green);
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="${6.5 * k}" fill="${C.green}"/><circle cx="${cx}" cy="${cy}" r="${3.2 * k}" fill="${C.red}"/>
    <circle cx="${cx}" cy="${cy}" r="${39.5 * k}" fill="none" stroke="${C.cream2}" stroke-width="${1.2 * k}"/>`;
}

/* ---------- Wappen (App-Logo): Stein-Schild, Scheibe, Klingen-Pfeile, Funken, Zebra-Band ---------- */
export function crest({ size = 200, banner = 'DARTS', bg = null } = {}) {
  const C = COLORS;
  const shield = 'M40 46 L62 38 L100 30 L138 38 L160 46 L164 104 L154 150 L128 184 L100 204 L72 184 L46 150 L36 104 Z';
  const cracks = `<g fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="bevel" opacity=".7">
    <path d="M62 38 L66 52 L58 63 L64 74"/><path d="M160 46 L150 58 L154 70 L145 79"/><path d="M46 150 L58 146 L63 158 L75 160"/>
    <path d="M154 150 L143 144 L139 156"/><path d="M100 204 L102 192 L96 184"/></g>`;
  const sparks = [[28, 36, 9, C.spark], [174, 58, 7, C.cyan], [22, 140, 6, C.pink], [178, 146, 8, C.spark], [100, 13, 7, C.cyan]]
    .map(([x, y, R, c]) => `<path d="${sparkPath(x, y, R)}" fill="${c}"/>`).join('');
  const bolts = `<g fill="none" stroke-linejoin="bevel" stroke-linecap="square">
    <path d="${zigzag(10, 98, 32, 66, 5, 5, 2)}" stroke="${C.cyan}" stroke-width="2.4"/>
    <path d="${zigzag(190, 96, 168, 126, 5, 5, 3)}" stroke="${C.pink}" stroke-width="2.4"/></g>`;
  const ban = banner ? `<g>
      <path d="M16 196 L44 190 L44 220 L16 226 L26 208 Z" fill="${C.stoneD}"/>
      <path d="M184 196 L156 190 L156 220 L184 226 L174 208 Z" fill="${C.stoneD}"/>
      <rect x="34" y="184" width="132" height="38" fill="${C.ink}" stroke="${C.cream}" stroke-width="2"/>
      <g fill="${C.cream}" opacity=".85">${Array.from({ length: 8 }, (_, i) => `<rect x="${40 + i * 16}" y="188" width="8" height="3.5"/><rect x="${40 + i * 16}" y="214.5" width="8" height="3.5"/>`).join('')}</g>
      <text x="100" y="210" text-anchor="middle" font-family="'Metal Mania', serif" font-size="22" letter-spacing="2" fill="${C.cream}">${banner}</text>
    </g>` : '';
  return `<svg viewBox="0 0 200 240" width="${size}" height="${size * 1.2}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><filter id="crestGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".05 .09" numOctaves="3" seed="4"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 -.3"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
    ${bg ? `<rect x="-20" y="-20" width="240" height="280" fill="${bg}"/>` : ''}
    ${bolts}
    <g transform="translate(100 112) rotate(-42) scale(1.25)">${bladeDart(C)}</g>
    <g transform="translate(100 112) rotate(-138) scale(1.25)">${bladeDart(C)}</g>
    <path d="${shield}" fill="${C.stone}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="bevel"/>
    <path d="${shield}" fill="${C.stone}" filter="url(#crestGrain)"/>
    <path d="M46 52 L64 45 L100 38 L136 45 L154 52 L157 104 L148 146 L124 177 L100 195 L76 177 L52 146 L43 104 Z" fill="none" stroke="${C.stoneL}" stroke-width="1.4" stroke-linejoin="bevel"/>
    ${cracks}
    ${miniBoard(100, 114, 42, C)}
    ${sparks}
    ${ban}
  </svg>`;
}

/* ---------- Ornamente ---------- */
export const cornerOrnament = (color = COLORS.gold) => `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path d="M2 38 V8 Q2 2 8 2 H38" fill="none" stroke="${color}" stroke-width="2"/>
  <path d="M8 38 V14 Q8 8 14 8 H38" fill="none" stroke="${color}" stroke-width="1"/>
  <path d="M14 14 q8 0 8 8 q-6 0 -8 -8z" fill="${color}"/>
  <path d="M2 2 l5 0 -5 5z" fill="${color}"/>
  <circle cx="26" cy="5" r="1.6" fill="${color}"/><circle cx="5" cy="26" r="1.6" fill="${color}"/>
</svg>`;

/* Trenner: Zebra-Balken links/rechts, in der Mitte eine Klinge */
export const divider = (color = COLORS.cream2) => `<svg class="divider" viewBox="0 0 240 16" aria-hidden="true">
  <g fill="${color}" opacity=".5">${[0, 1, 2, 3, 4].map((i) => `<rect x="${8 + i * 18}" y="6" width="10" height="4"/><rect x="${222 - i * 18}" y="6" width="10" height="4"/>`).join('')}</g>
  <path d="M100 8 L116 3 L120 0 L124 3 L140 8 L124 13 L120 16 L116 13 Z" fill="${color}"/>
  <path d="M112 8 L120 5 L128 8 L120 11 Z" fill="${COLORS.ink}"/>
</svg>`;

export const stars = (n = 3, color = COLORS.gold, size = 12) =>
  `<span class="stars">${Array.from({ length: n }, () => `<svg viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true"><path d="${starPath(10, 10, 9.5, 4)}" fill="${color}"/></svg>`).join('')}</span>`;

export const ribbon = (text, fill = COLORS.red, ink = COLORS.cream) => `<svg class="ribbon" viewBox="0 0 220 40" aria-hidden="true">
  <path d="M0 10 L20 6 L20 36 L0 40 L8 23 Z M220 10 L200 6 L200 36 L220 40 L212 23 Z" fill="${fill}" opacity=".7"/>
  <path d="M14 2 H206 V32 H14 Z" fill="${fill}" stroke="${COLORS.ink}" stroke-width="2"/>
  <text x="110" y="23" text-anchor="middle" font-family="'Metal Mania', serif" font-size="18" letter-spacing="2" fill="${ink}">${text}</text>
</svg>`;

/* ---------- Spielmodus-Badges ---------- */
const SYMBOLS = {
  x01: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
  highscore: '<path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 1.6-4.6 3-6 0 2 1 3 2 3-1-4 0-7 1-9z" fill="currentColor"/><path d="M12 14c.6 1.6 2.4 2 2.4 4a2.4 2.4 0 01-4.8 0c0-1.2.8-1.6 1.4-2.4z" fill="var(--badge-bg)"/>',
  shanghai: '<path d="M3 20h5v-5h5v-5h5V5h3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter"/><path d="M3 20h18" stroke="currentColor" stroke-width="2.2"/>',
  halveit: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 3.5a8.5 8.5 0 010 17z" fill="currentColor"/>',
  atc: '<path d="M20 12a8 8 0 11-2.6-5.9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M19.5 2.5v4.5H15" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2.2"/>',
};
export const MODE_COLORS = { x01: COLORS.red, highscore: COLORS.yellow, shanghai: COLORS.green, halveit: COLORS.blue, atc: COLORS.violet };
export const badge = (game, size = 44) =>
  `<span class="badge-mode" style="--badge-bg:${MODE_COLORS[game]};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" aria-hidden="true">${SYMBOLS[game]}</svg></span>`;

/* ---------- Comic: Dartpfeil als Raumschiff ---------- */
export const rocketDart = () => `<svg class="rocket" viewBox="-110 -40 220 80" aria-hidden="true">
  <path d="M-110 -14 H-74 M-104 0 H-66 M-110 14 H-74" stroke="${COLORS.cream}" stroke-width="4" stroke-linecap="square"/>
  <path d="M-72 0 L-96 -12 L-88 0 L-96 12 Z" fill="${COLORS.yellow}" stroke="${COLORS.ink}" stroke-width="2"/>
  <path d="M-70 0 L-84 -7 L-80 0 L-84 7 Z" fill="${COLORS.red}"/>
  <g transform="scale(1.1)">
    <path d="M70 0 L48 -4 L48 4 Z" fill="${COLORS.cream}" stroke="${COLORS.ink}" stroke-width="2"/>
    <rect x="12" y="-8" width="38" height="16" fill="${COLORS.red}" stroke="${COLORS.ink}" stroke-width="2.5"/>
    <path d="M20 -8v16M28 -8v16M36 -8v16M44 -8v16" stroke="${COLORS.ink}" stroke-width="2"/>
    <rect x="-46" y="-3.5" width="58" height="7" fill="${COLORS.cream}" stroke="${COLORS.ink}" stroke-width="2"/>
    <path d="M-40 0 L-66 -26 L-54 0 L-66 26 Z" fill="${COLORS.blue}" stroke="${COLORS.ink}" stroke-width="2.5"/>
    <circle cx="30" cy="0" r="3" fill="${COLORS.yellow}"/>
  </g>
</svg>`;

export const burst = (fill = COLORS.red) => `<svg class="burst" viewBox="0 0 400 400" aria-hidden="true">
  <path d="${burstPath(210, 210, 196, 120, 20)}" fill="${COLORS.ink}"/>
  <path d="${burstPath(200, 200, 196, 120, 20)}" fill="${fill}" stroke="${COLORS.ink}" stroke-width="6" stroke-linejoin="miter"/>
  <path d="${burstPath(200, 200, 150, 104, 20)}" fill="${COLORS.yellow}"/>
</svg>`;

/* ---------- Icons (Linien, eckig) ---------- */
const P = {
  chevR: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M6 12h12"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  gear: '<path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/><path d="M10.5 2h3l.6 2.6 2 .9 2.3-1.4 2.1 2.1-1.4 2.3.9 2 2.6.6v3l-2.6.6-.9 2 1.4 2.3-2.1 2.1-2.3-1.4-2 .9-.6 2.6h-3l-.6-2.6-2-.9-2.3 1.4-2.1-2.1 1.4-2.3-.9-2L2 13.5v-3l2.6-.6.9-2-1.4-2.3 2.1-2.1 2.3 1.4 2-.9z"/>',
  dart: '<path d="M21 3l-7.5 7.5"/><path d="M13.5 10.5L5 19"/><path d="M5 19l-2 2"/><path d="M21 3l-5 1 1 1-1 4 4-1 1 1z" fill="currentColor"/><path d="M8 14l2 2"/>',
  chart: '<path d="M3 21h18"/><path d="M6 17V11M11 17V6M16 17v-8M21 17v-4"/>',
  board: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
  keys: '<rect x="3" y="4" width="18" height="16"/><path d="M3 9.3h18M3 14.7h18M9 4v16M15 4v16"/>',
};
export const icon = (k, w = 2.2, size = 20) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${P[k]}</svg>`;

/* ---------- Magie-Ecke: Blitz + Funken (Hero, Sieger) ---------- */
export const magicCorner = (c1 = COLORS.cyan, c2 = COLORS.pink, c3 = COLORS.spark) => `<svg viewBox="0 0 90 64" aria-hidden="true">
  <path d="${zigzag(4, 58, 60, 8, 5, 5, 4)}" fill="none" stroke="${c1}" stroke-width="2.6" stroke-linejoin="bevel"/>
  <path d="${zigzag(2, 40, 34, 4, 4, 3, 2)}" fill="none" stroke="${c2}" stroke-width="1.6" stroke-linejoin="bevel"/>
  <path d="${sparkPath(72, 12, 9)}" fill="${c3}"/><path d="${sparkPath(46, 40, 5)}" fill="${c2}"/><path d="${sparkPath(84, 40, 4)}" fill="${c1}"/>
</svg>`;

/* ---------- Pokal ---------- */
export const trophy = (C = COLORS) => `<svg viewBox="0 0 120 140" aria-hidden="true">
  <path d="M30 16 H90 V44 C90 70 76 84 60 88 C44 84 30 70 30 44 Z" fill="${C.spark}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="bevel"/>
  <path d="M38 22 V44 C38 62 46 74 56 79" fill="none" stroke="#fff6cf" stroke-width="5" opacity=".8"/>
  <path d="M30 26 H14 V38 C14 52 24 60 34 62 M90 26 H106 V38 C106 52 96 60 86 62" fill="none" stroke="${C.ink}" stroke-width="9"/>
  <path d="M30 26 H14 V38 C14 52 24 60 34 62 M90 26 H106 V38 C106 52 96 60 86 62" fill="none" stroke="${C.spark}" stroke-width="4"/>
  <path d="M52 88 H68 L72 106 H48 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="bevel"/>
  <path d="M32 106 H88 L94 128 H26 Z" fill="${C.stone}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="bevel"/>
  <path d="M40 114 H80" stroke="${C.stoneL}" stroke-width="3"/>
  <path d="M30 12 H90" stroke="${C.ink}" stroke-width="5"/>
  <path d="${starPath(60, 44, 13, 5.5)}" fill="${C.red}" stroke="${C.ink}" stroke-width="2.5"/>
</svg>`;

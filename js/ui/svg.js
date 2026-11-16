/* Eigene SVG-Grafiken: Wappen, Ornamente, Badges, Comic-Elemente, Icons. Alles selbst entworfen. */

export const COLORS = {
  ink: '#0b0a08', cream: '#f3e9d2', cream2: '#d9c9a3', gold: '#d4a63a', goldL: '#ecc96a',
  red: '#e5402c', blue: '#2f6fe4', yellow: '#ffd23f', green: '#1f9a4c', violet: '#8b5cf6', teal: '#d4a63a',
  stone: '#5b4f3e', stoneD: '#3a3229', stoneL: '#a89d87',
  pink: '#e5402c', cyan: '#2f6fe4', magic: '#8b5cf6', spark: '#ffd23f',
};
export const PLAYER_COLORS = ['#e5402c', '#2f6fe4', '#ffd23f', '#1f9a4c', '#8b5cf6', '#f3e9d2'];
export const PLAYER_INK = ['#f3e9d2', '#f3e9d2', '#0b0a08', '#f3e9d2', '#f3e9d2', '#0b0a08'];

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

/* ---------- Dartpfeil (liegend, Spitze rechts), Länge 140 ---------- */
function dartShape(color, ink) {
  return `<g>
    <path d="M70 0 L52 -2.6 L52 2.6 Z" fill="${color}"/>
    <rect x="18" y="-5" width="34" height="10" rx="1" fill="${color}"/>
    <path d="M22 -5v10M28 -5v10M34 -5v10M40 -5v10M46 -5v10" stroke="${ink}" stroke-width="1.6"/>
    <rect x="-40" y="-2" width="58" height="4" fill="${color}"/>
    <path d="M-40 0 L-70 -16 L-58 0 L-70 16 Z" fill="${color}"/>
    <path d="M-40 0 L-66 -12 M-40 0 L-66 12" stroke="${ink}" stroke-width="1.4"/>
  </g>`;
}

/* ---------- Wappen (App-Logo) ---------- */
export function crest({ size = 200, banner = 'DARTS', bg = null } = {}) {
  const C = COLORS, cx = 100, cy = 122;
  // Dartscheibe im Schild: 20 Segmente creme/schwarz, Goldring, rotes Bull
  let board = '';
  for (let i = 0; i < 20; i++) {
    const a0 = -99 + i * 18, a1 = a0 + 18;
    const [x0, y0] = polar(cx, cy, 34, a0), [x1, y1] = polar(cx, cy, 34, a1);
    board += `<path d="M${cx},${cy} L${x0},${y0} A34,34 0 0,1 ${x1},${y1} Z" fill="${i % 2 ? C.cream : C.ink}"/>`;
  }
  board += `<circle cx="${cx}" cy="${cy}" r="35.5" fill="none" stroke="${C.gold}" stroke-width="5"/>
    <circle cx="${cx}" cy="${cy}" r="21" fill="none" stroke="${C.gold}" stroke-width="3.5"/>
    <circle cx="${cx}" cy="${cy}" r="8" fill="${C.gold}"/><circle cx="${cx}" cy="${cy}" r="4" fill="${C.red}"/>`;
  const shield = 'M44 58 H156 V118 C156 166 128 190 100 206 C72 190 44 166 44 118 Z';
  // Krone aus Pfeilspitzen
  let crown = `<rect x="62" y="40" width="76" height="9" fill="${C.gold}"/>`;
  [[70, 26], [85, 18], [100, 10], [115, 18], [130, 26]].forEach(([x, top]) => {
    crown += `<path d="M${x - 6} 40 L${x} ${top} L${x + 6} 40 Z" fill="${C.gold}"/><path d="M${x} ${top - 7} l3 4 -3 4 -3 -4z" fill="${C.cream}"/>`;
  });
  crown += `<path d="M66 44.5h68" stroke="${C.ink}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  // Spruchband
  const ban = banner ? `<g>
      <path d="M22 206 L40 200 L40 228 L22 234 L30 220 Z" fill="${C.cream2}"/>
      <path d="M178 206 L160 200 L160 228 L178 234 L170 220 Z" fill="${C.cream2}"/>
      <path d="M36 198 Q100 186 164 198 L164 226 Q100 214 36 226 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="1.5"/>
      <text x="100" y="218" text-anchor="middle" font-family="Cinzel, 'Times New Roman', serif" font-weight="900" font-size="20" letter-spacing="5" fill="${C.ink}">${banner}</text>
    </g>` : '';
  return `<svg viewBox="0 0 200 240" width="${size}" height="${size * 1.2}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${bg ? `<rect x="-20" y="-20" width="240" height="280" fill="${bg}"/>` : ''}
    <g stroke="${C.gold}" stroke-width=".6" opacity=".45">${Array.from({ length: 48 }, (_, i) => { const a = (i * 7.5 * Math.PI) / 180, r0 = 70, r1 = i % 2 ? 98 : 108; return `<path d="M${r2(100 + r0 * Math.cos(a))} ${r2(124 + r0 * Math.sin(a))} L${r2(100 + r1 * Math.cos(a))} ${r2(124 + r1 * Math.sin(a))}"/>`; }).join('')}</g>
    <g transform="translate(100 120) rotate(-38)">${dartShape(C.gold, C.ink).replace('<g>', '<g transform="scale(1.62)">')}</g>
    <g transform="translate(100 120) rotate(-142)">${dartShape(C.gold, C.ink).replace('<g>', '<g transform="scale(1.62)">')}</g>
    ${laurelWreath(100, 128, 84, C.gold, 7)}
    <path d="${shield}" fill="${C.ink}" stroke="${C.gold}" stroke-width="4"/>
    <path d="M51 64 H149 V118 C149 161 124 183 100 198 C76 183 51 161 51 118 Z" fill="none" stroke="${C.cream}" stroke-width="1"/>
    ${board}
    ${crown}
    <path d="${starPath(62, 74, 4, 1.7)}" fill="${C.gold}"/><path d="${starPath(138, 74, 4, 1.7)}" fill="${C.gold}"/>
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

export const divider = (color = COLORS.gold) => `<svg class="divider" viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 8 H96 M144 8 H240" stroke="${color}" stroke-width="1"/>
  <path d="M0 11 H90 M150 11 H240" stroke="${color}" stroke-width="0.5"/>
  <path d="M104 8 l6 -6 6 6 -6 6z M124 8 l6 -6 6 6 -6 6z" fill="${color}"/>
  <path d="${starPath(120, 8, 6, 2.6)}" fill="${color}"/>
</svg>`;

export const stars = (n = 3, color = COLORS.gold, size = 12) =>
  `<span class="stars">${Array.from({ length: n }, () => `<svg viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true"><path d="${starPath(10, 10, 9.5, 4)}" fill="${color}"/></svg>`).join('')}</span>`;

export const ribbon = (text, fill = COLORS.red, ink = COLORS.cream) => `<svg class="ribbon" viewBox="0 0 220 40" aria-hidden="true">
  <path d="M0 10 L20 6 L20 36 L0 40 L8 23 Z M220 10 L200 6 L200 36 L220 40 L212 23 Z" fill="${fill}" opacity=".7"/>
  <path d="M14 2 H206 V32 H14 Z" fill="${fill}" stroke="${COLORS.ink}" stroke-width="2"/>
  <text x="110" y="23" text-anchor="middle" font-family="Cinzel, serif" font-weight="900" font-size="15" letter-spacing="3" fill="${ink}">${text}</text>
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

/* ---------- Funke an der Zündschnur: Lichtpunkt wandert eine Rahmenlinie entlang ---------- */
export const fuse = (inset = 6, secs = 9, rx = 3) => `<span class="fuse" style="inset:${inset}px;--fuse-t:${secs}s" aria-hidden="true"><svg><rect x="0" y="0" width="100%" height="100%" rx="${rx}" pathLength="100"/><rect class="tail" x="0" y="0" width="100%" height="100%" rx="${rx}" pathLength="100"/></svg></span>`;

/* ---------- Hero-Kulisse: feiner Strahlenkranz, Lorbeer, Sterne, Bogen-Inschrift (Kupferstich-Linien) ---------- */
export function heroArt() {
  const C = COLORS;
  let rays = '';
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180, r0 = i % 2 ? 108 : 96, r1 = i % 6 === 0 ? 196 : i % 2 ? 170 : 184;
    rays += `<path d="M${r2(200 + r0 * Math.cos(a))} ${r2(200 + r0 * Math.sin(a))} L${r2(200 + r1 * Math.cos(a))} ${r2(200 + r1 * Math.sin(a))}"/>`;
  }
  let dots = '';
  for (let i = 0; i < 36; i++) { const a = (i * 10 * Math.PI) / 180; dots += `<circle cx="${r2(200 + 90 * Math.cos(a))}" cy="${r2(200 + 90 * Math.sin(a))}" r="1.3"/>`; }
  return `<svg viewBox="0 0 400 400" aria-hidden="true">
    <g stroke="${C.gold}" stroke-width=".7" opacity=".32">${rays}</g>
    <circle cx="200" cy="200" r="92" fill="none" stroke="${C.gold}" stroke-width=".8" opacity=".45"/>
    <circle cx="200" cy="200" r="86" fill="none" stroke="${C.gold}" stroke-width=".5" opacity=".35" stroke-dasharray="2 3"/>
    <g fill="${C.gold}" opacity=".45">${dots}</g>
    <g opacity=".5">${laurelWreath(200, 214, 118, C.gold, 9)}</g>
    <path d="${starPath(200, 62, 9, 3.8)}" fill="${C.gold}" opacity=".8"/>
    <path d="${starPath(150, 74, 5, 2.1)}" fill="${C.gold}" opacity=".6"/><path d="${starPath(250, 74, 5, 2.1)}" fill="${C.gold}" opacity=".6"/>
  </svg>`;
}

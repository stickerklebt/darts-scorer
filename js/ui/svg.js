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

export function starPath(cx, cy, R, r, n = 5, rot = -90, wob = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const j = wob ? Math.sin(i * 12.9898 + cx * 0.7 + cy * 0.3) * wob : 0;   // wob > 0: von Hand gezeichnet, Spitzen ungleich
    pts.push(polar(cx, cy, (i % 2 ? r : R) * (1 + j), rot + (i * 180) / n + j * 18).join(','));
  }
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

/* ---------- Lorbeerzweig (links), entlang eines Bogens – Blätter von Hand: ungleich groß, leicht verdreht, mit Ader ---------- */
const jit = (i, k = 1) => (((i * 9301 + 49297 * k) % 233280) / 233280 - 0.5);   // fester Zufall je Index
function leaf(x, y, len, w, rot, color) {
  const h = len / 2;
  return `<g transform="translate(${x} ${y}) rotate(${r2(rot)})">
    <path d="M${-h},0 C${r2(-h * 0.4)},${r2(-w * 1.15)} ${r2(h * 0.45)},${r2(-w * 0.95)} ${h},${r2(w * 0.12)} C${r2(h * 0.35)},${r2(w * 0.95)} ${r2(-h * 0.45)},${r2(w * 1.05)} ${-h},0Z" fill="${color}"/>
    <path d="M${r2(-h * 0.85)},0 Q0,${r2(-w * 0.18)} ${r2(h * 0.8)},${r2(w * 0.08)}" fill="none" stroke="#0b0a08" stroke-opacity=".55" stroke-width=".7"/>
  </g>`;
}
function laurelBranch(cx, cy, R, from, to, n, color) {
  let out = `<path d="M${polar(cx, cy, R, from).join(',')} A${R},${R} 0 0,1 ${polar(cx, cy, R, to).join(',')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * (i + 0.5 + jit(i, 2) * 0.25)) / n;
    for (const side of [-1, 1]) {
      const [x, y] = polar(cx, cy, R + side * (5 + jit(i, side + 3) * 1.6), a);
      out += leaf(x, y, 17 * (0.85 + jit(i, side + 5) * 0.3), 3.6 * (0.9 + jit(i, 7) * 0.3), a + 90 + side * (35 + jit(i, side + 9) * 14), color);
    }
  }
  const [bx, by] = polar(cx, cy, R, to + 4);
  return out + `<circle cx="${bx}" cy="${by}" r="2.6" fill="${color}"/>`;
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
let crestN = 0;
export function crest({ size = 200, banner = 'DARTS', bg = null } = {}) {
  const C = COLORS, cx = 100, cy = 122, cid = `crc${++crestN}`;
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
      <path d="M44 203 Q100 192 156 203 M44 221 Q100 210 156 221" fill="none" stroke="${C.ink}" stroke-width=".5" stroke-opacity=".35" stroke-dasharray="1.6 2.4"/>
      <path d="M40 200 L40 228 M160 200 L160 228" stroke="${C.ink}" stroke-width=".8" stroke-opacity=".5"/>
      <path d="M24 210 L36 206 M26 222 L36 219 M176 210 L164 206 M174 222 L164 219" stroke="${C.ink}" stroke-width=".6" stroke-opacity=".45"/>
      <text x="100" y="218" text-anchor="middle" font-family="'Fell Digits', 'IM Fell English SC', 'Times New Roman', serif" font-size="20" letter-spacing="5" fill="${C.ink}">${banner}</text>
    </g>` : '';
  return `<svg viewBox="0 0 200 240" width="${size}" height="${size * 1.2}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${bg ? `<rect x="-20" y="-20" width="240" height="280" fill="${bg}"/>` : ''}
    <g stroke="${C.gold}" stroke-width=".6" opacity=".45">${Array.from({ length: 48 }, (_, i) => { const a = (i * 7.5 * Math.PI) / 180, r0 = 70, r1 = i % 2 ? 98 : 108; return `<path d="M${r2(100 + r0 * Math.cos(a))} ${r2(124 + r0 * Math.sin(a))} L${r2(100 + r1 * Math.cos(a))} ${r2(124 + r1 * Math.sin(a))}"/>`; }).join('')}</g>
    <g transform="translate(100 120) rotate(-38)">${dartShape(C.gold, C.ink).replace('<g>', '<g transform="scale(1.62)">')}</g>
    <g transform="translate(100 120) rotate(-142)">${dartShape(C.gold, C.ink).replace('<g>', '<g transform="scale(1.62)">')}</g>
    ${laurelWreath(100, 128, 84, C.gold, 7)}
    <path d="${shield}" fill="${C.ink}" stroke="${C.gold}" stroke-width="4"/>
    <clipPath id="${cid}"><path d="${shield}"/></clipPath>
    <g clip-path="url(#${cid})" stroke="${C.gold}" stroke-width=".55" opacity=".32">${Array.from({ length: 34 }, (_, i) => `<path d="M${40 + i * 6} 56 L${r2(-30 + i * 6 + jit(i, 3) * 3)} 212"/>`).join('')}</g>
    <path d="M51 64 H149 V118 C149 161 124 183 100 198 C76 183 51 161 51 118 Z" fill="none" stroke="${C.cream}" stroke-width="1"/>
    ${board}
    ${crown}
    <path d="${starPath(62, 74, 4, 1.7)}" fill="${C.gold}"/><path d="${starPath(138, 74, 4, 1.7)}" fill="${C.gold}"/>
    ${ban}
  </svg>`;
}

/* ---------- Ornamente ---------- */
export const cornerOrnament = (color = COLORS.gold) => `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path d="M2 38 V9 Q2.4 2.2 9 2 H38" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  <path d="M8 38 V15 Q8.3 8.4 14.6 8 H38" fill="none" stroke="${color}" stroke-width=".9" stroke-linecap="round"/>
  <path d="M14 14 C20 13.4 22.4 17 21.6 20.6 C20.9 23.6 17.2 23.8 16.4 21.4 C15.8 19.6 17.6 18.4 18.8 19.4" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M22 9.5 C26 10.5 27.5 13.6 26 16.2 C24.4 14.6 22.6 12.8 22 9.5Z" fill="${color}"/>
  <path d="M9.5 22 C10.5 26 13.6 27.5 16.2 26 C14.6 24.4 12.8 22.6 9.5 22Z" fill="${color}"/>
  <path d="M2 2 l5.4 .4 -5 5.2z" fill="${color}"/>
  <circle cx="31" cy="5" r="1.5" fill="${color}"/><circle cx="35.5" cy="5.3" r=".9" fill="${color}"/>
  <circle cx="5" cy="31" r="1.5" fill="${color}"/><circle cx="5.3" cy="35.5" r=".9" fill="${color}"/>
</svg>`;

export const divider = (color = COLORS.gold) => `<svg class="divider" viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">
  <path d="M2 8.4 C30 7.2 60 9 88 7.8" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M152 7.8 C180 9 210 7.2 238 8.4" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M14 11.2 C40 10.4 66 11.8 86 10.6 M154 10.6 C174 11.8 200 10.4 226 11.2" fill="none" stroke="${color}" stroke-width=".5"/>
  <path d="M88 7.8 C93 7.4 95 3.6 99 4.4 C101.6 5 100.8 8.4 98.2 8 M152 7.8 C147 7.4 145 3.6 141 4.4 C138.4 5 139.2 8.4 141.8 8" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round"/>
  <path d="M104.5 8.2 l5.6 -5.8 6 6 -5.8 5.6z M124 7.8 l6 -5.6 5.6 6 -6 5.8z" fill="${color}"/>
  <path d="${starPath(120, 8, 6.4, 2.6, 5, -90, 0.08)}" fill="${color}"/>
</svg>`;

export const stars = (n = 3, color = COLORS.gold, size = 12) =>
  `<span class="stars">${Array.from({ length: n }, (_, i) => `<svg viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true" style="transform:rotate(${(i % 2 ? 7 : -5) + i * 2}deg)"><path d="${starPath(10, 10, 9.5, 4, 5, -90, 0.09)}" fill="${color}"/></svg>`).join('')}</span>`;

export const ribbon = (text, fill = COLORS.red, ink = COLORS.cream) => `<svg class="ribbon" viewBox="0 0 220 40" aria-hidden="true">
  <path d="M0 10 L20 6 L20 36 L0 40 L8 23 Z M220 10 L200 6 L200 36 L220 40 L212 23 Z" fill="${fill}" opacity=".7"/>
  <path d="M14 2 H206 V32 H14 Z" fill="${fill}" stroke="${COLORS.ink}" stroke-width="2"/>
  <text x="110" y="23" text-anchor="middle" font-family="'Fell Digits', 'IM Fell English SC', serif" font-size="15" letter-spacing="3" fill="${ink}">${text}</text>
</svg>`;

/* ---------- Spielmodus-Badges ---------- */
const SYMBOLS = {
  x01: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
  highscore: '<path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 1.6-4.6 3-6 0 2 1 3 2 3-1-4 0-7 1-9z" fill="currentColor"/><path d="M12 14c.6 1.6 2.4 2 2.4 4a2.4 2.4 0 01-4.8 0c0-1.2.8-1.6 1.4-2.4z" fill="var(--badge-bg)"/>',
  shanghai: '<path d="M3 20h5v-5h5v-5h5V5h3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter"/><path d="M3 20h18" stroke="currentColor" stroke-width="2.2"/>',
  halveit: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 3.5a8.5 8.5 0 010 17z" fill="currentColor"/>',
  cricket: '<path d="M5 4l14 16M19 4L5 20" stroke="currentColor" stroke-width="2.6" fill="none"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  atc: '<path d="M20 12a8 8 0 11-2.6-5.9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M19.5 2.5v4.5H15" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2.2"/>',
};
export const MODE_COLORS = { x01: COLORS.red, highscore: COLORS.yellow, shanghai: COLORS.green, halveit: COLORS.blue, atc: COLORS.violet, cricket: COLORS.cream };
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
  people: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20.5c0-3.8 2.9-6.3 6.5-6.3s6.5 2.5 6.5 6.3"/><path d="M15.6 4.6a3.4 3.4 0 010 6.6M17.8 14.6c2.3.7 3.7 2.8 3.7 5.9"/>',
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

/* ---------- Pokal (detailreich: Bänder, Lorbeer, Edelsteine, Sockel mit Plakette) ---------- */
export const trophy = (C = COLORS) => {
  const K = '#0b0a08', G = '#ffd23f', D = '#d4a63a', L = '#fff4c4';
  let beads = ''; for (let i = 0; i < 9; i++) beads += `<circle cx="${34 + i * 6.5}" cy="22" r="1.6" fill="${K}"/>`;
  return `<svg viewBox="0 0 120 150" aria-hidden="true">
  <path d="M30 26 H14 C8 26 6 32 7 38 C9 52 20 60 34 62 M90 26 H106 C112 26 114 32 113 38 C111 52 100 60 86 62" fill="none" stroke="${K}" stroke-width="9" stroke-linecap="round"/>
  <path d="M30 26 H14 C8 26 6 32 7 38 C9 52 20 60 34 62 M90 26 H106 C112 26 114 32 113 38 C111 52 100 60 86 62" fill="none" stroke="${D}" stroke-width="4" stroke-linecap="round"/>
  <path d="M28 14 H92 V44 C92 72 78 86 60 90 C42 86 28 72 28 44 Z" fill="${G}" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M28 18 H92 V26 H28 Z" fill="${D}" stroke="${K}" stroke-width="2.5"/>${beads}
  <path d="M36 30 V46 C36 64 44 76 54 81" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round" opacity=".85"/>
  <path d="M84 32 V46 C84 60 79 70 72 76" fill="none" stroke="${D}" stroke-width="3" opacity=".8"/>
  ${laurelBranch(60, 54, 22, 120, 230, 5, D)}<g transform="translate(120 0) scale(-1 1)">${laurelBranch(60, 54, 22, 120, 230, 5, D)}</g>
  <path d="${starPath(60, 50, 13, 5.5)}" fill="${C.red}" stroke="${K}" stroke-width="2.5"/>
  <circle cx="60" cy="50" r="2.4" fill="${L}"/>
  <path d="M26 12 H94" stroke="${K}" stroke-width="5" stroke-linecap="round"/>
  <path d="M52 90 H68 L71 100 H49 Z" fill="${D}" stroke="${K}" stroke-width="3.5" stroke-linejoin="round"/>
  <ellipse cx="60" cy="102" rx="16" ry="4.5" fill="${G}" stroke="${K}" stroke-width="3"/>
  <path d="M55 106 H65 L67 114 H53 Z" fill="${D}" stroke="${K}" stroke-width="3"/>
  <path d="M28 116 H92 L98 140 H22 Z" fill="#2a241c" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M32 120 H88" stroke="${D}" stroke-width="2"/>
  <rect x="42" y="124" width="36" height="11" fill="${G}" stroke="${K}" stroke-width="2"/>
  <path d="M46 129.5 H74" stroke="${K}" stroke-width="1.4" stroke-dasharray="3 2"/>
  <path d="${starPath(32, 131, 3.4, 1.4)}" fill="${G}"/><path d="${starPath(88, 131, 3.4, 1.4)}" fill="${G}"/>
  <circle cx="22" cy="16" r="2" fill="${L}"/><path d="${starPath(104, 10, 5, 1.2, 4)}" fill="${L}"/><path d="${starPath(14, 70, 4, 1, 4)}" fill="${L}"/>
</svg>`;
};


/* ---------- Funke an der Zündschnur: Lichtpunkt wandert eine Rahmenlinie entlang ---------- */
export const fuse = (inset = 6, secs = 24, rx = 3) => {
  // [Länge in % des Umfangs, Deckkraft]: kurzer heller Kopf, lange, immer schwächere Schleppe (Köpfe bündig)
  const layers = [[32, 0.14], [22, 0.2], [14, 0.3], [8, 0.45], [4, 0.65], [1.6, 1]];
  const dur = Math.round(secs * 2.2);
  return `<span class="fuse" style="inset:${inset}px" aria-hidden="true"><svg>${layers.map(([l, o]) => `<rect x="0" y="0" width="100%" height="100%" rx="${rx}" pathLength="100" stroke-dasharray="${l} ${100 - l}" opacity="${o}"><animate attributeName="stroke-dashoffset" from="${l - 30}" to="${l - 130}" dur="${dur}s" repeatCount="indefinite"/></rect>`).join('')}</svg></span>`;
};

/* ---------- Hero-Kulisse: feiner Strahlenkranz, Lorbeer, Sterne, Bogen-Inschrift (Kupferstich-Linien) ---------- */
/**
 * Hintergrund der Hero-Karte: Strahlenkranz im Stil der Siebziger-Plakate – weiche Rosa-, Himmelblau- und Cremestrahlen
 * in einem Kreis, zur Mitte abgedunkelt (die Zahl bleibt lesbar), außen ausgefranst. Darüber Lorbeer und Sterne in Gold.
 * Nur Stilmittel: keine Figuren, kein Wappen, kein Schriftzug.
 */
export function heroArt() {
  const C = COLORS;
  const tint = ['#ee93ae', '#f6ecd6', '#86bce8', '#f6ecd6'];
  let wedges = '';
  const n = 40;
  for (let i = 0; i < n; i++) {
    const w = 360 / n, a0 = ((i * w - 90 + jit(i, 3) * 1.2) * Math.PI) / 180, a1 = (((i + 1) * w - 90 + jit(i + 1, 3) * 1.2) * Math.PI) / 180;
    const R = 196 + jit(i, 7) * 8; // ausgefranster Rand
    wedges += `<path d="M200 200 L${r2(200 + R * Math.cos(a0))} ${r2(200 + R * Math.sin(a0))} L${r2(200 + R * Math.cos(a1))} ${r2(200 + R * Math.sin(a1))} Z" fill="${tint[i % 4]}"/>`;
  }
  let dots = '';
  for (let i = 0; i < 36; i++) { const a = (i * 10 * Math.PI) / 180; dots += `<circle cx="${r2(200 + 96 * Math.cos(a))}" cy="${r2(200 + 96 * Math.sin(a))}" r="1.4"/>`; }
  return `<svg viewBox="0 0 400 400" aria-hidden="true">
    <defs>
      <radialGradient id="heroShade" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#0b0a08" stop-opacity=".9"/><stop offset=".3" stop-color="#0b0a08" stop-opacity=".72"/>
        <stop offset=".55" stop-color="#0b0a08" stop-opacity=".28"/><stop offset=".86" stop-color="#0b0a08" stop-opacity=".1"/><stop offset="1" stop-color="#0b0a08" stop-opacity=".75"/>
      </radialGradient>
      <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".22"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient>
    </defs>
    <g class="hero-rays" opacity=".78">${wedges}</g>
    <circle cx="200" cy="200" r="206" fill="url(#heroShade)"/>
    <circle cx="200" cy="200" r="120" fill="url(#heroGlow)"/>
    <circle cx="200" cy="200" r="100" fill="none" stroke="${C.gold}" stroke-width=".9" opacity=".55"/>
    <circle cx="200" cy="200" r="92" fill="none" stroke="${C.gold}" stroke-width=".5" opacity=".4" stroke-dasharray="2 3"/>
    <g fill="${C.gold}" opacity=".55">${dots}</g>
    <g opacity=".55">${laurelWreath(200, 214, 122, C.gold, 9)}</g>
    <path d="${starPath(200, 58, 9, 3.8)}" fill="${C.gold}" opacity=".85"/>
    <path d="${starPath(150, 70, 5, 2.1)}" fill="${C.gold}" opacity=".65"/><path d="${starPath(250, 70, 5, 2.1)}" fill="${C.gold}" opacity=".65"/>
  </svg>`;
}

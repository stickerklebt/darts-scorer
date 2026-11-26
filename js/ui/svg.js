/* Eigene SVG-Grafiken: Wappen, Ornamente, Badges, Comic-Elemente, Icons. Alles selbst entworfen. */

export const COLORS = {
  ink: '#08080a', cream: '#eef0f3', cream2: '#c4c8cf', gold: '#cfd3d9', goldL: '#f2f4f7',
  red: '#b3243f', blue: '#c8ccd0', yellow: '#eef1f6', green: '#1f9a4c', violet: '#c8ccd0', teal: '#cfd3d9',
  stone: '#4a4a52', stoneD: '#303036', stoneL: '#9a9ea6',
  pink: '#b3243f', cyan: '#c8ccd0', magic: '#c8ccd0', spark: '#eef1f6',
};
export const PLAYER_COLORS = ['#b3243f', '#c8ccd0', '#cfd3d9', '#eef0f3', '#a8743a', '#e8b07a']; // Orange · Silber · Gold · Creme · Bronze · Pfirsich
export const PLAYER_INK = ['#eef0f3', '#eef0f3', '#08080a', '#eef0f3', '#eef0f3', '#08080a'];

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
    <path d="M${r2(-h * 0.85)},0 Q0,${r2(-w * 0.18)} ${r2(h * 0.8)},${r2(w * 0.08)}" fill="none" stroke="#08080a" stroke-opacity=".55" stroke-width=".7"/>
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
export function crest({ size = 200, banner = 'DARTS', bg = null, lite = false } = {}) {
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
      <text x="100" y="218" text-anchor="middle" font-family="'Fell Digits', 'Cinzel', 'Times New Roman', serif" font-size="${banner.length > 6 ? 14.5 : 20}" letter-spacing="${banner.length > 6 ? 2.2 : 5}" fill="${C.ink}">${banner}</text>
    </g>` : '';
  return `<svg viewBox="0 0 200 240" width="${size}" height="${size * 1.2}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${bg ? `<rect x="-20" y="-20" width="240" height="280" fill="${bg}"/>` : ''}
    ${lite ? '' : `<g stroke="${C.gold}" stroke-width=".6" opacity=".45">${Array.from({ length: 48 }, (_, i) => { const a = (i * 7.5 * Math.PI) / 180, r0 = 70, r1 = i % 2 ? 98 : 108; return `<path d="M${r2(100 + r0 * Math.cos(a))} ${r2(124 + r0 * Math.sin(a))} L${r2(100 + r1 * Math.cos(a))} ${r2(124 + r1 * Math.sin(a))}"/>`; }).join('')}</g>`}
    <g transform="translate(100 120) rotate(-38)">${dartShape(C.gold, C.ink).replace('<g>', '<g transform="scale(1.62)">')}</g>
    <g transform="translate(100 120) rotate(-142)">${dartShape(C.gold, C.ink).replace('<g>', '<g transform="scale(1.62)">')}</g>
    ${lite ? '' : laurelWreath(100, 128, 84, C.gold, 7)}
    <path d="${shield}" fill="${C.ink}" stroke="${C.gold}" stroke-width="4"/>
    <clipPath id="${cid}"><path d="${shield}"/></clipPath>
    ${lite ? '' : `<g clip-path="url(#${cid})" stroke="${C.gold}" stroke-width=".55" opacity=".32">${Array.from({ length: 34 }, (_, i) => `<path d="M${40 + i * 6} 56 L${r2(-30 + i * 6 + jit(i, 3) * 3)} 212"/>`).join('')}</g>`}
    <path d="M51 64 H149 V118 C149 161 124 183 100 198 C76 183 51 161 51 118 Z" fill="none" stroke="${C.cream}" stroke-width="1"/>
    ${board}
    ${crown}
    <path d="${starPath(62, 74, 4, 1.7)}" fill="${C.gold}"/><path d="${starPath(138, 74, 4, 1.7)}" fill="${C.gold}"/>
    ${ban}
  </svg>`;
}

/**
 * Wappen im Stil der Reiter-Leiste unten: dunkle Flächen, feine Konturen mit Verlauf Gold → Orange → Rot (wie das aktive Reiter-Symbol).
 * Baut auf crest() auf und tauscht nur die Farben: Gold-Flächen werden dunkel mit Verlaufs-Kontur, Creme-Flächen gedämpft.
 */
let lineN = 0;
/** Start-Logo/Anmeldung: Stern aus Titan wie ein iPhone-Rahmen – feine, gestrahlte Körnung (feTurbulence, sehr hohe Frequenz),
    mehrstufiger grauer Metallverlauf, polierte Fase (helle Außenkante, dunkle Innenkante, Glanz per feSpecularLighting),
    darunter „DARTVADER“ clean im selben Titan. */
export function crestLine(opts = {}) {
  const w = opts.size || 200, g = `ti${++starN}`;
  const d = chromeStarPath(100, 58, 46, 46, 46, 46); // alle vier Arme gleich weit von der Mitte
  return `<svg class="brand" viewBox="0 0 200 150" width="${w}" aria-label="DartVader"><defs>
    <linearGradient id="${g}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".2" stop-color="#e4e7ec"/><stop offset=".36" stop-color="#a9aeb6"/><stop offset=".47" stop-color="#7c818a"/><stop offset=".56" stop-color="#d3d7dd"/><stop offset=".68" stop-color="#ffffff"/><stop offset=".84" stop-color="#c3c7ce"/><stop offset="1" stop-color="#8d929a"/></linearGradient>
    <radialGradient id="${g}c"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${g}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a9ea5"/><stop offset=".3" stop-color="#f1f2f4"/><stop offset=".5" stop-color="#7d8188"/><stop offset=".72" stop-color="#e6e8eb"/><stop offset="1" stop-color="#8a8e95"/></linearGradient>
    <filter id="${g}f" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .9 .9 .9 0 -1.1" result="grain"/>
      <feComposite in="grain" in2="SourceAlpha" operator="in" result="g2"/>
      <feBlend in="g2" in2="SourceGraphic" mode="overlay" result="textured"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="bl"/>
      <feSpecularLighting in="bl" surfaceScale="2.6" specularConstant="1.05" specularExponent="34" lighting-color="#ffffff" result="sp"><feDistantLight azimuth="235" elevation="38"/></feSpecularLighting>
      <feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>
      <feComposite in="sp2" in2="textured" operator="arithmetic" k2=".7" k3="1"/>
    </filter>
    <filter id="${g}s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${g}w" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="14"/></filter></defs>
    <path class="brand-glow" d="${d}" fill="#e9eef5" opacity=".38" filter="url(#${g}w)"/>
    <path d="${d}" fill="#fff" opacity=".55" filter="url(#${g}s)"/>
    <path d="${d}" fill="url(#${g}a)" filter="url(#${g}f)"/>
    <path d="${d}" fill="none" stroke="#ffffff" stroke-opacity=".9" stroke-width=".9"/>
    <path d="${d}" transform="translate(100 58) scale(.9) translate(-100 -58)" fill="none" stroke="#1d1f23" stroke-opacity=".35" stroke-width=".7"/>
    <circle class="brand-core" cx="100" cy="58" r="22" fill="url(#${g}c)"/>
    <text x="104" y="134" text-anchor="middle" class="brand-name" style="fill:url(#${g}t)">DARTVADER</text></svg>`;
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
  <text x="110" y="23" text-anchor="middle" font-family="'Fell Digits', 'Cinzel', serif" font-size="15" letter-spacing="3" fill="${ink}">${text}</text>
</svg>`;

/* ---------- Spielmodus-Badges ---------- */
const SYMBOLS = {
  x01: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
  highscore: '<path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 1.6-4.6 3-6 0 2 1 3 2 3-1-4 0-7 1-9z" fill="currentColor"/><path d="M12 14c.6 1.6 2.4 2 2.4 4a2.4 2.4 0 01-4.8 0c0-1.2.8-1.6 1.4-2.4z" fill="var(--badge-bg)"/>',
  shanghai: '<path d="M3 20h5v-5h5v-5h5V5h3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter"/><path d="M3 20h18" stroke="currentColor" stroke-width="2.2"/>',
  halveit: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 3.5a8.5 8.5 0 010 17z" fill="currentColor"/>',
  cricket: '<path d="M5 4l14 16M19 4L5 20" stroke="currentColor" stroke-width="2.6" fill="none"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  bruch: '<path d="M13.5 2.5 6 13.2h5l-1.5 8.3L18 10.6h-5.2z" fill="currentColor"/>',
  // Fußball: Fünfeck in der Mitte, Nähte zu den Sechsecken, angeschnittene Fünfecke am Rand
  football: '<defs><clipPath id="fbclip"><circle cx="12" cy="12" r="9.6"/></clipPath></defs><circle cx="12" cy="12" r="9.6" fill="#f6f1e4"/><g clip-path="url(#fbclip)"><path d="M12.00,8.50L12.00,6.50M8.77,4.15L20.46,12.65M15.33,10.92L17.23,10.30M18.47,6.50L14.00,20.25M14.06,14.83L15.23,16.45M19.23,16.45L4.77,16.45M9.94,14.83L8.77,16.45M10.00,20.25L5.53,6.50M8.67,10.92L6.77,10.30M3.54,12.65L15.23,4.15" fill="none" stroke="#08080a" stroke-width=".7" stroke-opacity=".7"/><polygon points="12.00,6.50 8.77,4.15 10.00,0.35 14.00,0.35 15.23,4.15" fill="#08080a"/><polygon points="17.23,10.30 18.47,6.50 22.46,6.50 23.70,10.30 20.46,12.65" fill="#08080a"/><polygon points="15.23,16.45 19.23,16.45 20.46,20.25 17.23,22.60 14.00,20.25" fill="#08080a"/><polygon points="8.77,16.45 10.00,20.25 6.77,22.60 3.54,20.25 4.77,16.45" fill="#08080a"/><polygon points="6.77,10.30 3.54,12.65 0.30,10.30 1.54,6.50 5.53,6.50" fill="#08080a"/></g><polygon points="12.00,8.50 15.33,10.92 14.06,14.83 9.94,14.83 8.67,10.92" fill="#08080a"/><circle cx="12" cy="12" r="9.6" fill="none" stroke="#08080a" stroke-width="1.2"/>',
  atc: '<path d="M20 12a8 8 0 11-2.6-5.9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M19.5 2.5v4.5H15" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2.2"/>',
};
/* Spielmodi: nur Gold · Schwarz · Orange (X01 bleibt rot). Jeder Modus anders kombiniert, damit er erkennbar bleibt:
   [Hintergrund des Abzeichens, Farbe des Symbols, Rand] – die Kachel auf „Spielen“ hat dazu ein eigenes Muster (screens.css). */
const MODE_STYLE = { // Kristall · Silber · Bordeaux
  x01: ['#7a1430', '#f2f4f7', '#f2f4f7'],
  highscore: ['#0c0c0f', '#e6e9ee', '#e6e9ee'],
  shanghai: ['#c8ccd0', '#08080a', '#08080a'],
  halveit: ['#0c0c0f', '#c42a4b', '#c42a4b'],
  cricket: ['#7a1430', '#f2f4f7', '#f2f4f7'],
  atc: ['#3a0a18', '#f2f4f7', '#f2f4f7'],
  bruch: ['#0c0c0f', '#e6e9ee', '#c42a4b'],
  football: ['#c8ccd0', '#08080a', '#08080a'],
};
export const MODE_COLORS = Object.fromEntries(Object.entries(MODE_STYLE).map(([k, v]) => [k, v[0]]));
export const badge = (game, size = 44) => {
  const [bg, ink, line] = MODE_STYLE[game] || MODE_STYLE.x01;
  return `<span class="badge-mode" style="--badge-bg:${bg};--badge-ink:${ink};--badge-line:${line};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" aria-hidden="true">${SYMBOLS[game]}</svg></span>`;
};

/** Partyspiel-Logo aus hart glänzendem Chrom: polierte dunkle Scheibe mit Chrom-Ring, das Symbol selbst aus Silber
    (Verlauf mit harten Hell/Dunkel-Wechseln, Fase per feSpecularLighting, Glanzlicht oben). text statt Symbol für „Bald“-Kacheln. */
export const metalBadge = (game, size = 52, text = '') => {
  const k = `mb-${String(game).replace(/[^a-z0-9]/gi, '')}`;
  const chrome = `url(#${k}g)`;
  const sym = text ? '' : (SYMBOLS[game] || SYMBOLS.x01)
    .replace(/currentColor/g, chrome).replace(/var\(--badge-bg\)/g, '#0b0b0e')
    .replace(/#f6f1e4/g, chrome).replace(/id="fbclip"/g, `id="${k}c"`).replace(/url\(#fbclip\)/g, `url(#${k}c)`);
  const fs = text.length > 3 ? 6.2 : text.length > 2 ? 7.4 : 9.5;
  return `<span class="badge-mode metal" style="width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" aria-hidden="true"><defs>
    <linearGradient id="${k}g" gradientUnits="userSpaceOnUse" x1="4" y1="3" x2="20" y2="21"><stop offset="0" stop-color="#ffffff"/><stop offset=".2" stop-color="#e4e7ec"/><stop offset=".38" stop-color="#7b818a"/><stop offset=".47" stop-color="#2f3238"/><stop offset=".55" stop-color="#f7f8fa"/><stop offset=".68" stop-color="#b4b9c1"/><stop offset=".84" stop-color="#5d626a"/><stop offset="1" stop-color="#eef0f3"/></linearGradient>
    <linearGradient id="${k}r" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#8d939b"/><stop offset=".5" stop-color="#f2f4f7"/><stop offset=".72" stop-color="#3b3e44"/><stop offset="1" stop-color="#d7dbe0"/></linearGradient>
    <radialGradient id="${k}d" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#2a2c31"/><stop offset=".55" stop-color="#0f1013"/><stop offset="1" stop-color="#040405"/></radialGradient>
    <filter id="${k}f" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation=".45" result="b"/>
      <feSpecularLighting in="b" surfaceScale="1.6" specularConstant="1.1" specularExponent="26" lighting-color="#fff" result="sp"><feDistantLight azimuth="235" elevation="42"/></feSpecularLighting>
      <feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>
      <feComposite in="sp2" in2="SourceGraphic" operator="arithmetic" k2=".75" k3="1" result="lit"/>
      <feDropShadow in="lit" dx="0" dy=".5" stdDeviation=".45" flood-color="#000" flood-opacity=".8"/></filter></defs>
    <circle cx="12" cy="12" r="11.2" fill="url(#${k}d)"/>
    <circle cx="12" cy="12" r="11.2" fill="none" stroke="url(#${k}r)" stroke-width="1.1"/>
    <circle cx="12" cy="12" r="10.1" fill="none" stroke="#000" stroke-opacity=".7" stroke-width=".5"/>
    <g filter="url(#${k}f)">${text ? `<text x="12" y="12" text-anchor="middle" dominant-baseline="central" font-family="'League Gothic', sans-serif" font-size="${fs}" fill="${chrome}">${text}</text>` : `<g transform="translate(12 12) scale(.66) translate(-12 -12)">${sym}</g>`}</g>
    <path d="M4.6 8.2 A8.6 8.6 0 0 1 19.4 8.2" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.4" stroke-linecap="round"/>
  </svg></span>`;
};

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
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M6 12h12"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  gear: '<path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/><path d="M10.5 2h3l.6 2.6 2 .9 2.3-1.4 2.1 2.1-1.4 2.3.9 2 2.6.6v3l-2.6.6-.9 2 1.4 2.3-2.1 2.1-2.3-1.4-2 .9-.6 2.6h-3l-.6-2.6-2-.9-2.3 1.4-2.1-2.1 1.4-2.3-.9-2L2 13.5v-3l2.6-.6.9-2-1.4-2.3 2.1-2.1 2.3 1.4 2-.9z"/>',
  // Dartpfeil schräg (Spitze unten links, Flights oben rechts): Spitze, Barrel mit Griffrillen, Schaft, zwei Flights
  dart: '<g transform="rotate(-45 12 12)" stroke-linecap="round"><path d="M0.6 12H6" stroke-width="1.2"/>'
    + '<path d="M6 10.5h2v3H6zM8.7 10.3h1.6v3.4H8.7zM11 10.5h1.8a1.5 1.5 0 0 1 0 3H11z" fill="currentColor" stroke="none"/>'
    + '<path d="M13.5 12H16.6" stroke-width="1.3"/>'
    + '<path d="M16 12L18.4 6.6H23.2L21.4 12Z" fill="currentColor" stroke="none"/><path d="M16 12L18.4 17.4H23.2L21.4 12Z" fill="currentColor" stroke="none" opacity=".6"/>'
    + '<path d="M16 12H22.6" stroke-width=".8" opacity=".5"/></g>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round"/>',
  ticket: '<path d="M3.5 6.5h17v3.6a2 2 0 000 3.8v3.6h-17v-3.6a2 2 0 000-3.8z"/><path d="M12 9.3l.85 1.75 1.95.3-1.4 1.35.33 1.95L12 13.7l-1.73.9.33-1.95-1.4-1.35 1.95-.3z" fill="currentColor" stroke="none"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7"/>',
  people: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20.5c0-3.8 2.9-6.3 6.5-6.3s6.5 2.5 6.5 6.3"/><path d="M15.6 4.6a3.4 3.4 0 010 6.6M17.8 14.6c2.3.7 3.7 2.8 3.7 5.9"/>',
  vip: '<path d="M4 18.5h16"/><path d="M4.6 15.5L3.2 7.2l4.9 3.6L12 4.6l3.9 6.2 4.9-3.6-1.4 8.3z"/><circle cx="12" cy="12.4" r="1.3" fill="currentColor"/>',
  pen: '<path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M13.8 6.8l3.4 3.4"/>',
  trash: '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  chart: '<path d="M3 21h18"/><path d="M6 17V11M11 17V6M16 17v-8M21 17v-4"/>',
  board: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
  cam: '<path d="M3 7.5h4l2-2.5h6l2 2.5h4v12H3z"/><circle cx="12" cy="13" r="3.6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  signal: '<path d="M5 12.5a10 10 0 0114 0M8 15.5a5.5 5.5 0 018 0"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/><path d="M2 9.5a14.5 14.5 0 0120 0"/>',
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
  const K = '#08080a', G = '#eef1f6', D = '#cfd3d9', L = '#fff4c4';
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
/**
 * Glitzer: kleine vierzackige Sterne, die an festen, leicht zufälligen Stellen kurz aufblitzen (je Stern eigener Takt).
 * Für die eine wichtigste Zahl (Average) – nie im laufenden Spiel.
 */
export function sparkles(n = 6, seed = 1) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = (k) => { const v = Math.sin((i + 1) * 12.9898 * (seed + k) + 78.233) * 43758.5453; return v - Math.floor(v); };
    const x = Math.round(-6 + r(1) * 112), y = Math.round(-10 + r(2) * 110), d = (r(3) * 6).toFixed(2), s = (0.55 + r(4) * 0.7).toFixed(2), t = (3.2 + r(5) * 3).toFixed(2);
    out += `<i style="left:${x}%;top:${y}%;--d:-${d}s;--s:${s};--t:${t}s"><svg viewBox="-10 -10 20 20"><path d="M0-10C1 -2 2-1 10 0C2 1 1 2 0 10C-1 2-2 1-10 0C-2-1-1-2 0-10Z"/></svg></i>`;
  }
  return `<span class="sparkles" aria-hidden="true">${out}</span>`;
}

/** Goldener Rauch: ganz leichte, stark verschwommene Schwaden aus Rauschen (feTurbulence, kräftiger Weichzeichner, weiche Kanten).
    Links und rechts der Zahl eigene Schichten, die sacht in verschiedene Richtungen treiben (CSS). Nur Hintergrund. */
export const goldSmoke = (id = 'gs') => {
  const layer = (cls, freq, seed) => `<svg class="${cls}" viewBox="0 0 600 300" preserveAspectRatio="none"><defs><filter id="${id}${cls}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.93  0 0 0 0 0.76  0 0 0 0 0.36  0 0 0 2.2 -1.0"/>
    <feGaussianBlur stdDeviation="9"/></filter></defs><rect width="600" height="300" filter="url(#${id}${cls})"/></svg>`;
  return `<span class="smoke" aria-hidden="true"><span class="sm-side sm-l">${layer('l1', '0.006 0.01', 8)}${layer('l2', '0.009 0.007', 21)}</span><span class="sm-side sm-r">${layer('r1', '0.007 0.009', 5)}${layer('r2', '0.01 0.006', 33)}</span></span>`;
};

/** Lichtstrich, der ab und zu um eine Zahl läuft (gerundetes Rechteck, Strich gleitet entlang) */
export const numRing = () => '<span class="num-ring" aria-hidden="true"></span>';

export const fuse = (inset = 6, secs = 24, rx = 3) => {
  // [Länge in % des Umfangs, Deckkraft]: kurzer heller Kopf, lange, immer schwächere Schleppe (Köpfe bündig)
  const layers = [[32, 0.14], [22, 0.2], [14, 0.3], [8, 0.45], [4, 0.65], [1.6, 1]];
  const dur = Math.max(4, Math.round(secs * 0.9)); // schneller als früher (war × 2,2)
  return `<span class="fuse" style="inset:${inset}px" aria-hidden="true"><svg>${layers.map(([l, o]) => `<rect x="0" y="0" width="100%" height="100%" rx="${rx}" pathLength="100" stroke-dasharray="${l} ${100 - l}" opacity="${o}"><animate attributeName="stroke-dashoffset" from="${l - 30}" to="${l - 130}" dur="${dur}s" repeatCount="indefinite"/></rect>`).join('')}</svg></span>`;
};

/* ---------- Hero-Kulisse: feiner Strahlenkranz, Lorbeer, Sterne, Bogen-Inschrift (Kupferstich-Linien) ---------- */
/** Hintergrund der Hero-Karte: goldener Strahlenkranz, Punktkreis, Lorbeer und Sterne (ruhig, ohne Bildmotiv). */
/** Lang gezogener 4-Zack-Stern aus Chrom/Glas (konkave Flanken, spitze Enden) */
export function chromeStarPath(cx, cy, up, right, down, left, w = 0.16) {
  const P = (x, y) => `${r2(cx + x)} ${r2(cy + y)}`;
  const k = (a, b) => Math.min(a, b) * w;
  return `M${P(0, -up)} C${P(k(up, right) * .25, -k(up, right) * 1.2)} ${P(k(up, right) * 1.2, -k(up, right) * .25)} ${P(right, 0)}`
    + ` C${P(k(down, right) * 1.2, k(down, right) * .25)} ${P(k(down, right) * .25, k(down, right) * 1.2)} ${P(0, down)}`
    + ` C${P(-k(down, left) * .25, k(down, left) * 1.2)} ${P(-k(down, left) * 1.2, k(down, left) * .25)} ${P(-left, 0)}`
    + ` C${P(-k(up, left) * 1.2, -k(up, left) * .25)} ${P(-k(up, left) * .25, -k(up, left) * 1.2)} ${P(0, -up)}Z`;
}
let starN = 0;
/** Chrom-Stern als SVG-Gruppe: Glas-Körper mit Verlauf, helle Kante, Glühen (ids eindeutig) */
export function chromeStar(cx, cy, up, right, down, left, { rot = 0, glow = 1 } = {}) {
  const g = `cs${++starN}`, d = chromeStarPath(cx, cy, up, right, down, left);
  return `<defs>
    <linearGradient id="${g}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".28" stop-color="#d9dee6"/><stop offset=".46" stop-color="#5d626c"/><stop offset=".55" stop-color="#f4f6fa"/><stop offset=".7" stop-color="#8b9099"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
    <radialGradient id="${g}b" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="#e9edf3" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="${g}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${6 * glow}"/></filter></defs>
  <g transform="rotate(${rot} ${cx} ${cy})">
    <path d="${d}" fill="#fff" opacity=".55" filter="url(#${g}f)"/>
    <path d="${d}" fill="url(#${g}a)"/>
    <path d="${d}" fill="none" stroke="#fff" stroke-width="1.4" stroke-opacity=".95"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${Math.min(right, left) * .55}" ry="${Math.min(up, down) * .55}" fill="url(#${g}b)"/>
  </g>`;
}

/** 501-Karte: Bordeaux-Flüssigkeit aus großen, glasigen Blasen (Vorlage: rote Öltropfen). Körper in einer „Goo“-Ebene, damit
    benachbarte Blasen beim Treiben über flüssige Brücken verschmelzen; darüber Glas: helle Lichtkante, dunkles Brechungsband,
    Glanzfleck, Spiegelbogen gegenüber. Alles bewegt sich per CSS (.bb, gleiche Werte für Körper und Glas → bleibt deckungsgleich). */
export function heroArt() {
  const B = [ // cx, cy, r, mx, my, scale, Dauer
    [40, 330, 215, 22, -16, 1.04, 14], [560, 60, 200, -20, 14, 1.05, 16], [600, 390, 150, -14, -12, 1.06, 12], [255, -70, 150, 16, 12, 1.04, 18],
    [-40, 30, 105, 14, 16, 1.05, 13], [395, 340, 52, -14, -18, 1.08, 10], [205, 205, 26, 12, -14, 1.1, 8], [452, 210, 18, -8, 12, 1.12, 7],
    [320, 405, 34, 12, -10, 1.08, 9], [140, 70, 14, -8, 10, 1.15, 6.5], [488, 318, 11, 8, -10, 1.2, 6], [310, 38, 12, -10, 8, 1.15, 8],
  ];
  const f = (v) => Math.round(v * 10) / 10;
  const st = ([, , , mx, my, sc, t], k) => `style="--mx:${mx}px;--my:${my}px;--s:${sc};--t:${t}s;animation-delay:-${f((k * 1.7) % t)}s"`;
  const arc = (cx, cy, rr, d0, d1) => {
    const a0 = (d0 * Math.PI) / 180, a1 = (d1 * Math.PI) / 180;
    return `M${f(cx + rr * Math.cos(a0))} ${f(cy + rr * Math.sin(a0))}A${f(rr)} ${f(rr)} 0 0 1 ${f(cx + rr * Math.cos(a1))} ${f(cy + rr * Math.sin(a1))}`;
  };
  const body = B.map((b, k) => `<g class="bb" ${st(b, k)}><circle cx="${b[0]}" cy="${b[1]}" r="${b[2]}" fill="#4a0a1a"/></g>`).join('');
  const glass = B.map((b, k) => {
    const [cx, cy, r] = b, w = Math.max(1.2, r * 0.018);
    return `<g class="bb" ${st(b, k)}>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bbIn)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bbLow)"/>
      <circle cx="${cx}" cy="${cy}" r="${f(r * .93)}" fill="none" stroke="#12020a" stroke-opacity=".55" stroke-width="${f(r * .06)}"/>
      <circle cx="${cx}" cy="${cy}" r="${f(r - w / 2)}" fill="none" stroke="url(#bbRim)" stroke-width="${f(w)}"/>
      <path d="${arc(cx, cy, r * .9, 196, 262)}" fill="none" stroke="#ffe3ea" stroke-opacity=".8" stroke-width="${f(w * 1.3)}" stroke-linecap="round" filter="url(#bbSoft)"/>
      <path d="${arc(cx, cy, r * .88, 20, 70)}" fill="none" stroke="#ff8fa6" stroke-opacity=".45" stroke-width="${f(w)}" stroke-linecap="round" filter="url(#bbSoft)"/>
      <ellipse cx="${f(cx - r * .38)}" cy="${f(cy - r * .42)}" rx="${f(r * .22)}" ry="${f(r * .11)}" transform="rotate(-38 ${f(cx - r * .38)} ${f(cy - r * .42)})" fill="#fff" opacity="${r < 60 ? .5 : .16}" filter="url(#bbBlur)"/>
    </g>`;
  }).join('');
  return `<svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="bbBg" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#1a040c"/><stop offset="1" stop-color="#0a0105"/></radialGradient>
      <filter id="bbGoo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" result="b"/>
        <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter>
      <radialGradient id="bbIn" cx=".55" cy=".45" r=".6"><stop offset="0" stop-color="#0a0105" stop-opacity=".9"/><stop offset=".55" stop-color="#1e030b" stop-opacity=".6"/><stop offset="1" stop-color="#1e030b" stop-opacity="0"/></radialGradient>
      <radialGradient id="bbLow" cx=".25" cy=".85" r=".6"><stop offset="0" stop-color="#d0405f" stop-opacity=".75"/><stop offset=".45" stop-color="#9c1c37" stop-opacity=".35"/><stop offset="1" stop-color="#7a1430" stop-opacity="0"/></radialGradient>
      <linearGradient id="bbRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd2dc"/><stop offset=".28" stop-color="#e0607c" stop-opacity=".5"/><stop offset=".55" stop-color="#3a0a18" stop-opacity=".3"/><stop offset=".85" stop-color="#d9405f" stop-opacity=".8"/><stop offset="1" stop-color="#ffc2cf"/></linearGradient>
      <filter id="bbSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".9"/></filter>
      <filter id="bbBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
      <pattern id="bbGrid" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M6 0H0V6" fill="none" stroke="#000" stroke-opacity=".18" stroke-width=".6"/></pattern>
      <radialGradient id="bbV" cx=".5" cy=".52" r=".5"><stop offset="0" stop-color="#050103" stop-opacity=".55"/><stop offset=".7" stop-color="#050103" stop-opacity=".2"/><stop offset="1" stop-color="#050103" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="600" height="400" fill="url(#bbBg)"/>
    <g filter="url(#bbGoo)">${body}</g>
    <g>${glass}</g>
    <rect width="600" height="400" fill="url(#bbGrid)"/>
    <ellipse cx="300" cy="212" rx="160" ry="115" fill="url(#bbV)"/>
  </svg>`;
}

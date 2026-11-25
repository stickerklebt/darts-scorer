/* Wo genau im Doppel? Ein Doppelfeld groß (außen = oben, innen = unten), Nachbarfelder blass daneben.
   Position eines Treffers: { a, r } – a = −1 … 1 quer übers Feld (links → rechts), r = 0 (innerer Rand) … 1 (äußerer Rand).
   Gespeichert am Checkout-Dart als throw.spot; Statistik › Doppel zeigt alle Treffer als kleine Punkte. */
import { ORDER } from '../board-geometry.js';

const R2 = 1000, R1 = R2 * 104 / 122, HALF = 9; // Radien wie die echte Scheibe (Double-Ring 104–122 von 146)
const rad = (d) => (d * Math.PI) / 180;
const pt = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];
const f1 = (v) => Math.round(v * 10) / 10;
function band(r1, r2, a0, a1) {
  const [x1, y1] = pt(r2, a0), [x2, y2] = pt(r2, a1), [x3, y3] = pt(r1, a1), [x4, y4] = pt(r1, a0);
  return `M${f1(x1)} ${f1(y1)}A${r2} ${r2} 0 0 1 ${f1(x2)} ${f1(y2)}L${f1(x3)} ${f1(y3)}A${r1} ${r1} 0 0 0 ${f1(x4)} ${f1(y4)}Z`;
}
/** Feldfarbe wie auf der Scheibe: D20 rot, dann abwechselnd grün/rot */
const isRed = (n) => ORDER.indexOf(n) % 2 === 0;
export const spotXY = ({ a, r }) => pt(R1 + (R2 - R1) * r, a * HALF);

/** SVG des Doppels n mit Punkten (spots). tap = großes Antipp-Feld (Eingabe nach dem Checkout). */
export function spotSVG(n, spots = [], { tap = false, last = null } = {}) {
  const i = ORDER.indexOf(n), nb = [ORDER[(i + 19) % 20], ORDER[(i + 1) % 20]];
  const red = '#c8402c', green = '#2c8a4a';
  const col = (k) => (isRed(k) ? red : green);
  let s = '';
  // Nachbarfelder (blass) und Single darunter, Rand außen
  for (const [k, off] of [[nb[0], -18], [nb[1], 18]]) {
    s += `<path d="${band(R1, R2, off - HALF, off + HALF)}" fill="${col(k)}" opacity=".28"/>`;
    s += `<path d="${band(R1 - 230, R1, off - HALF, off + HALF)}" fill="#1a1713" opacity=".6"/>`;
    const [lx, ly] = pt(R2 + 70, off); s += `<text x="${f1(lx)}" y="${f1(ly)}" class="ds-nb" text-anchor="middle" dominant-baseline="central">${k}</text>`;
  }
  s += `<path d="${band(R1 - 230, R1, -HALF, HALF)}" fill="#26211b"/>`;
  s += `<path class="ds-field" d="${band(R1, R2, -HALF, HALF)}" fill="${col(n)}"/>`;
  s += `<path d="${band(R1, R2, -HALF, HALF)}" fill="none" stroke="#d4a63a" stroke-width="4"/>`;
  const [nx, ny] = pt(R2 + 72, 0); s += `<text x="${f1(nx)}" y="${f1(ny)}" class="ds-n" text-anchor="middle" dominant-baseline="central">D${n}</text>`;
  const [ox, oy] = pt(R2 + 18, 0), [ix, iy] = pt(R1 - 22, 0);
  s += `<text x="${f1(ox + 175)}" y="${f1(oy - 10)}" class="ds-lab" text-anchor="middle">Outside</text><text x="${f1(ix + 150)}" y="${f1(iy + 36)}" class="ds-lab" text-anchor="middle">Inside</text>`;
  for (const p of spots) { const [x, y] = spotXY(p); s += `<circle class="ds-dot" cx="${f1(x)}" cy="${f1(y)}" r="${tap ? 11 : 7}"/>`; }
  if (last) { const [x, y] = spotXY(last); s += `<circle class="ds-dot last" cx="${f1(x)}" cy="${f1(y)}" r="13"/>`; }
  const [, top] = pt(R2 + 125, 0), w = 2 * Math.sin(rad(27)) * R2 + 40;
  return `<svg class="dspot ${tap ? 'tap' : ''}" viewBox="${f1(-w / 2)} ${f1(top)} ${f1(w)} ${f1(-(top) - (R1 - 260) * Math.cos(rad(27)) + 0)}" ${tap ? 'data-dspot="1"' : ''} role="img" aria-label="Doppel ${n}">${s}</svg>`;
}

/** Antippen im großen Feld → { a, r } (auf das Feld begrenzt) */
export function spotFromEvent(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  const dist = Math.hypot(q.x, q.y), ang = (Math.atan2(q.x, -q.y) * 180) / Math.PI;
  const c = (v) => Math.max(0, Math.min(1, v));
  return { a: Math.round(Math.max(-1, Math.min(1, ang / HALF)) * 100) / 100, r: Math.round(c((dist - R1) / (R2 - R1)) * 100) / 100 };
}

/** Vollbild-Abfrage nach dem Checkout auf ein Doppel */
export function spotAskView(sp) {
  if (!sp) return '';
  return `<div class="dspot-ask" role="dialog" aria-label="Wo genau getroffen?">
    <div class="dspot-in"><h2>Wo hast du genau getroffen?</h2><p>Tippe genau dahin, wo dein Dart im D${sp.n} steckt.</p>
    ${spotSVG(sp.n, [], { tap: true, last: sp.picked || null })}
    <button class="btn line dspot-skip" data-act="spotSkip">Überspringen</button></div></div>`;
}

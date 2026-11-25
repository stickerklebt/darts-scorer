/* Wo genau im Doppel? Ein Doppelfeld groß, immer so schräg wie auf der Scheibe (Statistik: Nachbarfelder blass daneben, Outside/Inside).
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
/** Winkel des Feldes auf der Scheibe (im Uhrzeigersinn von oben, 20 oben) – das Feld wird immer so schräg gezeigt wie im Board */
export const rotOf = (n) => ORDER.indexOf(n) * 18;
export const spotXY = ({ a, r }, rot = 0) => pt(R1 + (R2 - R1) * r, rot + a * HALF);
/** viewBox um eine Punktmenge (Ring-Ausschnitt r0…r1, Winkel a0…a1) */
function box(r0, r1, a0, a1, m) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of [r0, r1]) for (let k = 0; k <= 24; k++) { const [x, y] = pt(r, a0 + ((a1 - a0) * k) / 24); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return `${f1(x0 - m)} ${f1(y0 - m)} ${f1(x1 - x0 + 2 * m)} ${f1(y1 - y0 + 2 * m)}`;
}

/** SVG des Doppels n mit Punkten (spots). tap = großes Antipp-Feld (Eingabe nach dem Checkout). */
export function spotSVG(n, spots = [], { tap = false, last = null } = {}) {
  const i = ORDER.indexOf(n), th = rotOf(n), nb = [ORDER[(i + 19) % 20], ORDER[(i + 1) % 20]];
  const red = '#c8402c', green = '#2c8a4a';
  const col = (k) => (isRed(k) ? red : green);
  const fld = band(R1, R2, th - HALF, th + HALF);
  let s = '';
  // Eingabe nach dem Checkout: nur das Feld selbst, groß und schräg wie im Board – keine Nachbarn, keine Beschriftung
  if (tap) {
    s += `<path class="ds-field" d="${fld}" fill="${col(n)}"/><path d="${fld}" fill="none" stroke="#d4a63a" stroke-width="3"/>`;
    if (last) { const [x, y] = spotXY(last, th); s += `<circle class="ds-dot last" cx="${f1(x)}" cy="${f1(y)}" r="9"/>`; }
    return `<svg class="dspot tap" viewBox="${box(R1, R2, th - HALF, th + HALF, 16)}" data-dspot="1" data-rot="${th}" role="img" aria-label="Doppel ${n}">${s}</svg>`;
  }
  // Statistik: Nachbarfelder blass, Single darunter, Beschriftung waagerecht
  for (const off of [-18, 18]) {
    const k = off < 0 ? nb[0] : nb[1];
    s += `<path d="${band(R1, R2, th + off - HALF, th + off + HALF)}" fill="${col(k)}" opacity=".28"/>`;
    s += `<path d="${band(R1 - 230, R1, th + off - HALF, th + off + HALF)}" fill="#1a1713" opacity=".6"/>`;
  }
  s += `<path d="${band(R1 - 230, R1, th - HALF, th + HALF)}" fill="#26211b"/>`;
  s += `<path class="ds-field" d="${fld}" fill="${col(n)}"/><path d="${fld}" fill="none" stroke="#d4a63a" stroke-width="4"/>`;
  const tx = (r, cls, txt) => { const [x, y] = pt(r, th); return `<text x="${f1(x)}" y="${f1(y)}" class="${cls}" text-anchor="middle" dominant-baseline="central">${txt}</text>`; };
  s += tx(R2 + 60, 'ds-lab', 'Outside') + tx(R1 - 60, 'ds-lab', 'Inside') + tx(R1 - 160, 'ds-n', `D${n}`);
  for (const p of spots) { const [x, y] = spotXY(p, th); s += `<circle class="ds-dot" cx="${f1(x)}" cy="${f1(y)}" r="7"/>`; }
  if (last) { const [x, y] = spotXY(last, th); s += `<circle class="ds-dot last" cx="${f1(x)}" cy="${f1(y)}" r="13"/>`; }
  return `<svg class="dspot" viewBox="${box(R1 - 230, R2 + 100, th - 27, th + 27, 30)}" role="img" aria-label="Doppel ${n}">${s}</svg>`;
}

/** Antippen im großen Feld → { a, r } (auf das Feld begrenzt; Schräglage des Feldes herausgerechnet) */
export function spotFromEvent(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  const rot = Number(svg.dataset.rot) || 0;
  const dist = Math.hypot(q.x, q.y);
  let ang = (Math.atan2(q.x, -q.y) * 180) / Math.PI - rot;
  ang = ((ang + 540) % 360) - 180;
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

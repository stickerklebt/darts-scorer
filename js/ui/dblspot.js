/* Wo genau im Doppel? Eingabe: nur das Doppelfeld, groß und so schräg wie auf der Scheibe. Statistik: das Doppel erscheint an Stelle der Heatmap-Scheibe (die blendet aus), Treffer als schwarze Punkte.
   Position eines Treffers: { a, r } – a = −1 … 1 quer übers Feld (links → rechts), r = 0 (innerer Rand) … 1 (äußerer Rand).
   Gespeichert am Checkout-Dart als throw.spot; Statistik › Doppel zeigt alle Treffer als kleine Punkte. */
import { ORDER } from '../board-geometry.js';
import { cornerOrnament, stars, sparkles } from './svg.js';

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
  const th = rotOf(n);
  const red = '#c8402c', green = '#2c8a4a';
  const col = (k) => (isRed(k) ? red : green);
  const fld = band(R1, R2, th - HALF, th + HALF);
  let s = '';
  // Eingabe nach dem Checkout: nur das Feld selbst, groß und schräg wie im Board – keine Nachbarn, keine Beschriftung
  if (tap) {
    const inner = band(R1 + 9, R2 - 9, th - HALF + 0.55, th + HALF - 0.55);
    s += `<defs><pattern id="dsDots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2.2" cy="2.2" r="1.5" fill="#000" fill-opacity=".22"/><circle cx="6.7" cy="6.7" r="1.5" fill="#000" fill-opacity=".22"/></pattern>
      <linearGradient id="dsShine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>
      <path d="${fld}" transform="translate(5 6)" fill="#08080a" opacity=".85"/>
      <path class="ds-field" d="${fld}" fill="${col(n)}"/><path d="${fld}" fill="url(#dsDots)"/><path d="${fld}" fill="url(#dsShine)"/>
      <path d="${fld}" fill="none" stroke="#cfd3d9" stroke-width="4" filter="url(#rough-s)"/><path d="${inner}" fill="none" stroke="#f2f4f7" stroke-width="1.4" stroke-opacity=".75"/>`;
    if (last) { const [x, y] = spotXY(last, th); s += `<circle class="ds-dot last" cx="${f1(x)}" cy="${f1(y)}" r="9"/>`; }
    return `<svg class="dspot tap" viewBox="${box(R1, R2, th - HALF, th + HALF, 16)}" data-dspot="1" data-rot="${th}" role="img" aria-label="Doppel ${n}">${s}</svg>`;
  }
  // Statistik: nur das Doppel selbst, jeder Treffer ein schwarzer Punkt an seiner Stelle
  s += `<path d="${fld}" transform="translate(4 5)" fill="#08080a" opacity=".8"/><path d="${fld}" fill="${col(n)}"/>`;
  // Leuchten + Glitzern: Glanzverlauf, ein Lichtstreif zieht langsam übers Feld, Goldrand mit Schein (Funkeln als HTML drumherum)
  s += `<defs><linearGradient id="dsSh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="dsSw" x1="0" y1="0" x2="1" y2=".35"><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/>
    <animateTransform attributeName="gradientTransform" type="translate" values="-1.2 0;1.2 0;1.2 0" keyTimes="0;.45;1" dur="4.5s" repeatCount="indefinite"/></linearGradient></defs>`;
  s += `<path d="${fld}" fill="url(#dsSh)"/><path d="${fld}" fill="url(#dsSw)"/>`;
  s += `<path class="ds-rim" d="${fld}" fill="none" stroke="#f2f4f7" stroke-width="4"/>`;
  for (const p of spots) { const [x, y] = spotXY(p, th); s += `<circle class="ds-dot blk" cx="${f1(x)}" cy="${f1(y)}" r="8"/>`; }
  return `<svg class="dspot" viewBox="${box(R1, R2, th - HALF, th + HALF, 14)}" role="img" aria-label="Doppel ${n}: ${spots.length} Treffer">${s}</svg>`;
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
    <div class="ds-rays" aria-hidden="true"></div>
    <div class="dspot-in">${['tl', 'tr', 'bl', 'br'].map((c) => `<span class="corner ${c}">${cornerOrnament()}</span>`).join('')}
      <div class="ds-crown" aria-hidden="true">${stars(5, '#cfd3d9', 14)}</div>
      <h2 class="ds-title" data-t="Wo hast du genau getroffen?">Wo hast du genau getroffen?</h2>
      <div class="ds-field-wrap">${sparkles(7, 5)}${spotSVG(sp.n, [], { tap: true, last: sp.picked || null })}</div>
      <button class="dspot-skip" data-act="spotSkip">Überspringen</button></div></div>`;
}

/* Wo genau im Doppel? Eingabe: nur das Doppelfeld, groß und so schräg wie auf der Scheibe. Statistik: das Doppel erscheint an Stelle der Heatmap-Scheibe (die blendet aus), Treffer als schwarze Punkte.
   Position eines Treffers: { a, r } – a = −1 … 1 quer übers Feld (links → rechts), r = 0 (innerer Rand) … 1 (äußerer Rand).
   Gespeichert am Checkout-Dart als throw.spot; Statistik › Doppel zeigt alle Treffer als kleine Punkte. */
import { ORDER } from '../board-geometry.js';

const R2 = 1000, R1 = R2 * 162 / 170, HALF = 9; // genau wie die echte Scheibe: Doppelring 162–170 mm (8 mm dick, 18° breit)
const RB = 6.35 / 170 * R2; // Bull (Bullseye) im selben Maßstab: Radius 6,35 mm
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
/** Bull: Treffer als { x, y } von −1 … 1 (Anteil vom Bull-Radius) */
const bullXY = ({ x = 0, y = 0 }) => [x * RB, y * RB];
/** viewBox um eine Punktmenge (Ring-Ausschnitt r0…r1, Winkel a0…a1) */
function box(r0, r1, a0, a1, m) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of [r0, r1]) for (let k = 0; k <= 24; k++) { const [x, y] = pt(r, a0 + ((a1 - a0) * k) / 24); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return `${f1(x0 - m)} ${f1(y0 - m)} ${f1(x1 - x0 + 2 * m)} ${f1(y1 - y0 + 2 * m)}`;
}

/** Bull groß: nur das Bullseye (Kreis), Treffer als Punkte. Im Spiel rot, in der Statistik in der Farbe der eigenen Quote. */
function bullSVG(spots, { tap, last, color }) {
  const m = RB * 0.5, vb = `${f1(-RB - m)} ${f1(-RB - m)} ${f1(2 * (RB + m))} ${f1(2 * (RB + m))}`;
  const fill = tap ? '#9c1d3d' : color || '#8d939b', dotR = RB * 0.06;
  let s = `<circle r="${f1(RB)}" transform="translate(${f1(RB * 0.05)} ${f1(RB * 0.06)})" fill="#08080a" opacity=".8"/><circle class="ds-field" r="${f1(RB)}" fill="${fill}"/>
    <defs><radialGradient id="dsBg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>
    ${tap ? '' : `<circle r="${f1(RB)}" fill="url(#dsBg)"/><circle class="ds-rim" r="${f1(RB)}" fill="none" stroke="#f2f4f7" stroke-width="${f1(RB * 0.025)}"/>`}`;
  if (tap) { if (last) { const [x, y] = bullXY(last); s += `<circle class="ds-dot last" cx="${f1(x)}" cy="${f1(y)}" r="${f1(dotR * 1.6)}"/>`; } }
  else for (const p of spots) { const [x, y] = bullXY(p); s += `<circle class="ds-dot blk" cx="${f1(x)}" cy="${f1(y)}" r="${f1(dotR)}"/>`; }
  return `<svg class="dspot bull ${tap ? 'tap' : ''}" viewBox="${vb}" ${tap ? 'data-dspot="1" data-bull="1"' : ''} role="img" aria-label="Bull${tap ? '' : `: ${spots.length} Treffer`}">${s}</svg>`;
}

/** SVG des Doppels n mit Punkten (spots). tap = großes Antipp-Feld (Eingabe nach dem Checkout, Farbe wie auf der Scheibe rot/grün).
    In der Statistik (ohne tap) trägt das Feld die Farbe der eigenen Quote (color, wie in Heatmap und Liste). n = 25 → Bull. */
export function spotSVG(n, spots = [], { tap = false, last = null, color = null } = {}) {
  if (n === 25) return bullSVG(spots, { tap, last, color });
  const th = rotOf(n);
  const red = '#7d1631', green = '#1d5a43'; // wie die Eingabe-Scheibe: Bordeaux + passendes Grün
  const col = (k) => (isRed(k) ? red : green);
  const fld = band(R1, R2, th - HALF, th + HALF);
  let s = '';
  // Eingabe nach dem Checkout: nur das Feld selbst, groß und schräg wie im Board – keine Nachbarn, keine Beschriftung
  if (tap) {
    // wie auf der Scheibe: sauberes Bordeaux bzw. Grün, ohne Rand, mit ganz feinen Punkten und leichter Körnung
    s += `<defs><pattern id="dsDots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.8" r=".9" fill="#000" fill-opacity=".2"/><circle cx="5.3" cy="5.3" r=".9" fill="#000" fill-opacity=".2"/></pattern>
      <filter id="dsGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .14 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
      <path class="ds-field" d="${fld}" fill="${col(n)}"/><path d="${fld}" fill="url(#dsDots)"/><path d="${fld}" fill="#fff" filter="url(#dsGrain)"/>`;
    if (last) { const [x, y] = spotXY(last, th); s += `<circle class="ds-dot last" cx="${f1(x)}" cy="${f1(y)}" r="7"/>`; }
    return `<svg class="dspot tap" viewBox="${box(R1, R2, th - HALF, th + HALF, 30)}" data-dspot="1" data-rot="${th}" role="img" aria-label="Doppel ${n}">${s}</svg>`;
  }
  // Statistik: nur das Doppel selbst, jeder Treffer ein schwarzer Punkt an seiner Stelle
  s += `<path d="${fld}" transform="translate(3 4)" fill="#08080a" opacity=".8"/><path d="${fld}" fill="${color || '#8d939b'}"/>`;
  // Leuchten + Glitzern: Glanzverlauf, ein Lichtstreif zieht langsam übers Feld, Goldrand mit Schein (Funkeln als HTML drumherum)
  s += `<defs><linearGradient id="dsSh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="dsSw" x1="0" y1="0" x2="1" y2=".35"><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/>
    <animateTransform attributeName="gradientTransform" type="translate" values="-1.2 0;1.2 0;1.2 0" keyTimes="0;.45;1" dur="4.5s" repeatCount="indefinite"/></linearGradient></defs>`;
  s += `<path d="${fld}" fill="url(#dsSh)"/>`;
  s += `<path class="ds-rim" d="${fld}" fill="none" stroke="#f2f4f7" stroke-width="3"/>`;
  for (const p of spots) { const [x, y] = spotXY(p, th); s += `<circle class="ds-dot blk" cx="${f1(x)}" cy="${f1(y)}" r="5"/>`; }
  return `<svg class="dspot" viewBox="${box(R1, R2, th - HALF, th + HALF, 14)}" role="img" aria-label="Doppel ${n}: ${spots.length} Treffer">${s}</svg>`;
}

/** Antippen im großen Feld → { a, r } (auf das Feld begrenzt; Schräglage des Feldes herausgerechnet) */
export function spotFromEvent(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  if (svg.dataset.bull) { // Bull: Position im Kreis (−1 … 1), außerhalb auf den Rand gezogen
    const d = Math.hypot(q.x, q.y) / RB, k = d > 1 ? 1 / d : 1, r2 = (v) => Math.round(v * 100) / 100;
    return { x: r2((q.x / RB) * k), y: r2((q.y / RB) * k) };
  }
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
    <div class="dspot-in">
      <h2 class="ds-title" data-t="Wo hast du genau getroffen?">Wo hast du genau getroffen?</h2>
      <div class="ds-field-wrap">${spotSVG(sp.n, [], { tap: true, last: sp.picked || null })}</div>
      <button class="dspot-skip" data-act="spotSkip">Überspringen</button></div></div>`;
}

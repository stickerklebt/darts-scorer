/* Eingabe-Scheibe: Finger auf die Stelle, wo der Dart steckt. Halten → Lupe mit Fadenkreuz und Feldname,
   loslassen setzt den Dart. Getroffene Felder der laufenden Aufnahme leuchten. Stil wie die App
   (dunkle, warme Felder, leichte Grün-/Rottöne, goldene Drähte) – kein Nachbau einer echten Scheibe.
   Koordinaten in Scheiben-Einheiten: Mitte (0,0), 20 oben. Ringe für Finger breiter als echt. */
import { label } from '../checkout.js';

export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
/** Radien: Bull, 25er, Triple innen/außen, Double innen/außen (= Rand des Spielfelds), Zahlenring, Rand */
export const AR = { bull: 10, outer: 23, triIn: 62, triOut: 80, dblIn: 104, dblOut: 122, num: 134, edge: 146 };

/**
 * Feld an (x,y) → { n, m, z } – n = 0 heißt daneben.
 * z unterscheidet bei Single das innere ('i') und äußere ('o') Feld (nur für die Markierung).
 */
export function fieldAt(x, y) {
  const r = Math.hypot(x, y);
  if (r <= AR.bull) return { n: 25, m: 2, z: '' };
  if (r <= AR.outer) return { n: 25, m: 1, z: '' };
  if (r > AR.dblOut) return { n: 0, m: 1, z: '' };
  const a = ((Math.atan2(x, -y) * 180) / Math.PI + 360 + 9) % 360;
  const n = ORDER[Math.floor(a / 18) % 20];
  if (r >= AR.triIn && r <= AR.triOut) return { n, m: 3, z: '' };
  if (r >= AR.dblIn) return { n, m: 2, z: '' };
  return { n, m: 1, z: r < AR.triIn ? 'i' : 'o' };
}
/** Schlüssel eines Feldes für die SVG-Markierung */
/** Board-mm (Kamera) → Koordinaten dieser Scheibe (Ringe sind hier breiter gezeichnet, darum stückweise umrechnen) */
const MMR = [0, 6.35, 15.9, 99, 107, 162, 170, 225];
export function mmToAim(x, y) {
  const ARR = [0, AR.bull, AR.outer, AR.triIn, AR.triOut, AR.dblIn, AR.dblOut, AR.edge], r = Math.hypot(x, y);
  if (!r) return [0, 0];
  let rr = AR.edge;
  for (let i = 0; i < MMR.length - 1; i++) if (r <= MMR[i + 1]) { rr = ARR[i] + ((r - MMR[i]) / (MMR[i + 1] - MMR[i])) * (ARR[i + 1] - ARR[i]); break; }
  return [(x * rr) / r, (y * rr) / r];
}
export const fieldKey = (d) => (d.n === 0 ? 'miss' : d.n === 25 ? `b${d.m}` : `${d.n}-${d.m}${d.m === 1 ? d.z || 'o' : ''}`);
/** Feldname für Anzeige: „T20“, „S13“, „D16“, „Bull“, „25“, „Daneben“ */
export const fieldName = (d) => (d.n === 0 ? 'Daneben' : label(d));

const r2 = (v) => Math.round(v * 100) / 100;

/** Kleiner Dartpfeil, Spitze bei (0,0), Flights schräg nach oben rechts – für Treffer und Lupe */
/** Dart-Nummern in der ganzen App römisch */
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export const dartGlyph = (k = 1) => `<g class="adart" transform="scale(${k}) rotate(-45)">
  <path d="M0 0H5" stroke="#f3e9d2" stroke-width=".9" stroke-linecap="round"/>
  <rect x="5" y="-1.35" width="7.5" height="2.7" rx="1.1" fill="#f3e9d2"/><path d="M7 -1.35V1.35M9 -1.35V1.35" stroke="#0b0a08" stroke-width=".45" opacity=".55"/>
  <path d="M12.5 0H16.5" stroke="#d9c9a3" stroke-width="1"/>
  <path d="M15.6 0L18.4 -4.4H23L21.2 0Z" fill="#e5402c"/><path d="M15.6 0L18.4 4.4H23L21.2 0Z" fill="#a92a1b"/></g>`;
const pt = (r, deg) => `${r2(r * Math.cos((deg * Math.PI) / 180))},${r2(r * Math.sin((deg * Math.PI) / 180))}`;
const ring = (r0, r1, a0, a1) => `M${pt(r1, a0)} A${r1},${r1} 0 0,1 ${pt(r1, a1)} L${pt(r0, a1)} A${r0},${r0} 0 0,0 ${pt(r0, a0)} Z`;

/* Farben: warm-dunkle Felder, leicht getönte Ringe (nicht grell) */
const F = {
  sA: '#221d16', sB: '#2f281d', rA: '#8a3326', rB: '#2a6b45', b25: '#2f7d4f', b50: '#c4452f',
  wire: '#d4a63a', num: '#ecc96a', rim: '#12100d',
};

/**
 * hits: [{ n, m, z, x?, y? }] – Darts der laufenden Aufnahme (leuchten, mit Nummer an der Wurfstelle)
 */
export function aimBoard(hits = []) {
  const lit = new Map();
  hits.forEach((h, i) => { if (h.n) lit.set(fieldKey(h), i + 1); });
  const cls = (k) => `af${lit.has(k) ? ' hit' : ''}`;
  let segs = '', glow = '', nums = '';
  ORDER.forEach((n, i) => {
    const a0 = -99 + i * 18, a1 = -81 + i * 18, even = i % 2 === 0;
    const parts = [
      [AR.outer, AR.triIn, even ? F.sA : F.sB, `${n}-1i`],
      [AR.triIn, AR.triOut, even ? F.rA : F.rB, `${n}-3`],
      [AR.triOut, AR.dblIn, even ? F.sA : F.sB, `${n}-1o`],
      [AR.dblIn, AR.dblOut, even ? F.rA : F.rB, `${n}-2`],
    ];
    for (const [r0, r1, fill, k] of parts) {
      const d = ring(r0, r1, a0, a1);
      segs += `<path class="${cls(k)}" data-k="${k}" d="${d}" fill="${fill}"/>`;
      if (lit.has(k)) glow += `<path class="aglow" d="${d}"/>`;
    }
    const [x, y] = pt((AR.dblOut + AR.edge) / 2, (a0 + a1) / 2).split(',');
    nums += `<text x="${x}" y="${y}" class="anum" text-anchor="middle" dominant-baseline="central">${n}</text>`;
  });
  segs += `<circle class="${cls('b1')}" data-k="b1" r="${AR.outer}" fill="${F.b25}"/><circle class="${cls('b2')}" data-k="b2" r="${AR.bull}" fill="${F.b50}"/>`;
  if (lit.has('b1')) glow += `<circle class="aglow" r="${AR.outer}"/>`;
  if (lit.has('b2')) glow += `<circle class="aglow" r="${AR.bull}"/>`;
  const wires = `<g class="awire">${[AR.bull, AR.outer, AR.triIn, AR.triOut, AR.dblIn, AR.dblOut].map((r) => `<circle r="${r}"/>`).join('')}
    ${ORDER.map((_, i) => `<path d="M${pt(AR.outer, -99 + i * 18)}L${pt(AR.dblOut, -99 + i * 18)}"/>`).join('')}</g>`;
  // Steckende Darts an der Wurfstelle (mit kleiner Nummer)
  const marks = hits.map((h, i) => (h.x === undefined ? '' : `<g class="amark" transform="translate(${r2(h.x)} ${r2(h.y)})"><circle class="hole" r="1.6"/>${dartGlyph(0.95)}<text class="anr" x="13.2" y="-12.6" text-anchor="middle" dominant-baseline="central">${ROMAN[i] || i + 1}</text></g>`)).join(''); // Nummer (römisch) steht auf der Flight
  return `<svg class="aimboard" viewBox="-${AR.edge} -${AR.edge} ${AR.edge * 2} ${AR.edge * 2}" role="img" aria-label="Dartscheibe – Finger auf die Stelle, wo der Dart steckt">
    <defs><filter id="aGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>
    <circle r="${AR.edge}" class="arim"/><circle r="${AR.dblOut + 1}" fill="${F.rim}"/>
    ${segs}${wires}<g class="aglows" filter="url(#aGlow)">${glow}</g><g class="aedges">${glow.replace(/aglow/g, 'aedge')}</g>${nums}${marks}
  </svg>`;
}

/* ---------- Lupe (direkt am DOM, ohne Neuzeichnen) ---------- */
const ZOOM = 52; // sichtbarer Ausschnitt in Scheiben-Einheiten
export function aimLoupe(svg, x, y, clientX, clientY) {
  let lp = document.querySelector('.loupe.aim');
  if (!lp) {
    lp = document.createElement('div');
    lp.className = 'loupe aim';
    lp.innerHTML = `<div class="lp-glass"><svg class="aimboard lp">${svg.innerHTML}</svg><svg class="lp-dart" viewBox="-30 -30 60 60">${dartGlyph(1.9)}<circle r="1.2" fill="#fff6dc"/></svg></div><span class="lp-t"></span>`;
    lp.querySelectorAll('.amark').forEach((n) => n.remove());
    document.body.appendChild(lp);
  }
  const size = 156, above = clientY - size - 70 > 0;
  lp.style.left = `${Math.min(window.innerWidth - size - 6, Math.max(6, clientX - size / 2))}px`;
  lp.style.top = `${above ? clientY - size - 70 : clientY + 56}px`;
  lp.querySelector('svg').setAttribute('viewBox', `${x - ZOOM / 2} ${y - ZOOM / 2} ${ZOOM} ${ZOOM}`);
  const d = fieldAt(x, y);
  const t = lp.querySelector('.lp-t');
  t.textContent = fieldName(d);
  t.className = `lp-t m${d.n === 0 ? 0 : d.m}`;
}
export function aimLoupeHide() { document.querySelector('.loupe.aim')?.remove(); }

/** Feld unter dem Finger auf der großen Scheibe hervorheben (ohne Neuzeichnen) */
export function aimHover(svg, d) {
  svg.querySelectorAll('.af.aim').forEach((n) => n.classList.remove('aim'));
  if (d && d.n) svg.querySelector(`[data-k="${fieldKey(d)}"]`)?.classList.add('aim');
}

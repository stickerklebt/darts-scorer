/* Dartscheibe als SVG: antippbare Eingabe (und später die Heatmap). Ringe für Finger etwas breiter als echt. */
import { COLORS } from './svg.js';
import { MM } from '../bulloff.js';

export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const R = { bull: 9, outerBull: 20, triIn: 58, triOut: 74, dblIn: 98, dblOut: 114, edge: 136 };

const r2 = (x) => Math.round(x * 100) / 100;
const pt = (r, deg) => `${r2(r * Math.cos((deg * Math.PI) / 180))},${r2(r * Math.sin((deg * Math.PI) / 180))}`;
/** Ringsegment zwischen Radien r0..r1 und Winkeln a0..a1 (Grad, 0 = rechts, im Uhrzeigersinn). */
export const ringPath = (r0, r1, a0, a1) =>
  `M${pt(r1, a0)} A${r1},${r1} 0 0,1 ${pt(r1, a1)} L${pt(r0, a1)} A${r0},${r0} 0 0,0 ${pt(r0, a0)} Z`;
export const segAngles = (i) => [-99 + i * 18, -81 + i * 18];

/** Antippbare Scheibe. Jedes Feld hat data-act="board" data-n data-m. */
export function inputBoard() {
  const C = COLORS;
  let s = `<circle r="${R.edge}" fill="${C.ink}" data-act="board" data-n="0" data-m="1"/>`;
  ORDER.forEach((n, i) => {
    const [a0, a1] = segAngles(i);
    const dark = i % 2 === 0;
    const single = dark ? C.ink : C.cream, ring = dark ? C.red : C.green;
    const seg = (r0, r1, fill, m) => `<path class="bf" d="${ringPath(r0, r1, a0, a1)}" fill="${fill}" data-act="board" data-n="${n}" data-m="${m}"/>`;
    s += seg(R.outerBull, R.triIn, single, 1) + seg(R.triIn, R.triOut, ring, 3) + seg(R.triOut, R.dblIn, single, 1) + seg(R.dblIn, R.dblOut, ring, 2);
    const mid = (a0 + a1) / 2, [x, y] = pt(125, mid).split(',');
    s += `<text x="${x}" y="${y}" class="bn" text-anchor="middle" dominant-baseline="central" pointer-events="none">${n}</text>`;
  });
  s += `<circle class="bf" r="${R.outerBull}" fill="${C.green}" data-act="board" data-n="25" data-m="1"/>`;
  s += `<circle class="bf" r="${R.bull}" fill="${C.red}" data-act="board" data-n="25" data-m="2"/>`;
  // Feine Metall-Drähte
  s += `<g fill="none" stroke="${C.cream2}" stroke-opacity=".55" stroke-width=".8" pointer-events="none">
    ${[R.bull, R.outerBull, R.triIn, R.triOut, R.dblIn, R.dblOut].map((r) => `<circle r="${r}"/>`).join('')}
    ${ORDER.map((_, i) => `<path d="M${pt(R.outerBull, segAngles(i)[0])} L${pt(R.dblOut, segAngles(i)[0])}"/>`).join('')}
  </g>`;
  return `<svg class="inboard" viewBox="-${R.edge} -${R.edge} ${R.edge * 2} ${R.edge * 2}" aria-label="Dartscheibe">${s}</svg>`;
}

/* ---------- Doppelfelder-Heatmap im Kupferstich-Stil ---------- */
/** Farben je Stufe (relativ zur eigenen Gesamt-Doppelquote, siehe stats.js → TIERS) */
export const TIER_COLORS = { great: '#3f9a52', good: '#93b04a', avg: '#c9a34e', weak: '#d27a3a', bad: '#c4452f' };
export const tierColor = (t) => (t ? TIER_COLORS[t] : null);

/** Medaillen-Farben für die drei besten Doppel */
export const MEDALS = ['#dfe4ea', '#dfe4ea', '#dfe4ea']; // Top 3 einheitlich in Silber

/**
 * Doppel-Heatmap im Stil der Eingabe-Scheibe: dunkle Felder, Doppel in der Farbe ihrer Stufe
 * (relativ zur eigenen Gesamtquote), die drei besten mit Gold-/Silber-/Bronze-Rand.
 * rating: { feld: { tier, top } } aus doubleRating()
 */
export function heatBoard(fields, sel, rating = {}) {
  const dark = ['#1d1913', '#28221a'], tri = ['#2c251c', '#352d22'];
  const fillFor = (key) => tierColor(rating[key]?.tier) || (fields[key]?.attempts ? '#5b5140' : '#15120e');
  let s = `<defs><filter id="hGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
    <circle r="${R.edge}" class="hrim"/><circle r="${R.dblOut + 1}" fill="#0f0d0a"/>`;
  let medals = '', glow = '', nums = '';
  ORDER.forEach((n, i) => {
    const [a0, a1] = segAngles(i), k = i % 2;
    s += `<path d="${ringPath(R.outerBull, R.triIn, a0, a1)}" fill="${dark[k]}"/><path d="${ringPath(R.triIn, R.triOut, a0, a1)}" fill="${tri[k]}"/>`;
    s += `<path d="${ringPath(R.triOut, R.dblIn, a0, a1)}" fill="${dark[k]}"/>`;
    const key = `D${n}`, d = ringPath(R.dblIn, R.dblOut, a0, a1);
    s += `<path class="hd ${sel === key ? 'sel' : ''}" d="${d}" fill="${fillFor(key)}" data-act="heat" data-v="${key}"/>`;
    const [x, y] = pt(125, (a0 + a1) / 2).split(',');
    nums += `<text x="${x}" y="${y}" class="hn" text-anchor="middle" dominant-baseline="central">${n}</text>`;
  });
  s += `<circle r="${R.outerBull}" fill="#2c251c"/>`;
  s += `<circle class="hd ${sel === 'Bull' ? 'sel' : ''}" r="${R.bull + 3}" fill="${fillFor('Bull')}" data-act="heat" data-v="Bull"/>`;
  s += `<g class="hwire">${[R.outerBull, R.triIn, R.triOut, R.dblIn, R.dblOut].map((r) => `<circle r="${r}"/>`).join('')}
    ${ORDER.map((_, i) => `<path d="M${pt(R.outerBull, segAngles(i)[0])} L${pt(R.dblOut, segAngles(i)[0])}"/>`).join('')}</g>`;
  return `<svg class="heatboard" viewBox="-${R.edge} -${R.edge} ${R.edge * 2} ${R.edge * 2}" aria-label="Doppelquote je Feld">${s}<g filter="url(#hGlow)">${glow}</g>${medals}${nums}</svg>`;
}

/* ---------- Echte Scheibe (mm) fürs Ausbullen: ganze Scheibe inkl. Zahlenring ---------- */
const N_R = 198;
export function realBoardInner() {
  const C = COLORS;
  let s = `<circle r="${MM.edge}" fill="#0b0e0d"/><circle r="${MM.dblOut + 2}" fill="${C.ink}"/>`;
  ORDER.forEach((n, i) => {
    const [a0, a1] = segAngles(i), dark = i % 2 === 0;
    const single = dark ? '#151a19' : '#d9d5c4', ring = dark ? C.red : C.green;
    s += `<path d="${ringPath(MM.outer, MM.triIn, a0, a1)}" fill="${single}"/><path d="${ringPath(MM.triIn, MM.triOut, a0, a1)}" fill="${ring}"/>`;
    s += `<path d="${ringPath(MM.triOut, MM.dblIn, a0, a1)}" fill="${single}"/><path d="${ringPath(MM.dblIn, MM.dblOut, a0, a1)}" fill="${ring}"/>`;
    const [x, y] = pt(N_R, (a0 + a1) / 2).split(',');
    s += `<text x="${x}" y="${y}" class="rbn" text-anchor="middle" dominant-baseline="central">${n}</text>`;
  });
  s += `<circle r="${MM.outer}" fill="${C.green}"/><circle r="${MM.bull}" fill="${C.red}"/>`;
  s += `<g fill="none" stroke="#c9ccc2" stroke-opacity=".6" stroke-width=".9">${[MM.bull, MM.outer, MM.triIn, MM.triOut, MM.dblIn, MM.dblOut].map((r) => `<circle r="${r}"/>`).join('')}
    ${ORDER.map((_, i) => `<path d="M${pt(MM.outer, segAngles(i)[0])} L${pt(MM.dblOut, segAngles(i)[0])}"/>`).join('')}</g>`;
  return s;
}
/** Ganze Scheibe mit Darts: darts = [{ x, y, color, win?, pending? }] */
export function realBoard(darts = [], dot = 7.5) {
  const d = darts.map((t) => `<g class="rbd ${t.win ? 'win' : ''} ${t.pending ? 'pending' : ''} ${t.fly ? 'fly' : ''}" transform="translate(${t.x} ${t.y})" style="--dc:${t.color}">
    ${t.win ? '<circle class="halo" r="16"/>' : ''}<circle r="${dot}" fill="${t.color}" stroke="#0b0e0d" stroke-width="${dot / 2.9}"/><circle r="${dot / 3.7}" fill="#0b0e0d"/></g>`).join('');
  return `<svg class="realboard" viewBox="-230 -230 460 460" aria-label="Dartscheibe">${realBoardInner()}${d}</svg>`;
}

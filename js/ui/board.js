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
export const HEAT_STEPS = [
  { max: 0.2, color: '#e5402c', label: 'unter 20 %' },
  { max: 0.4, color: '#d4a63a', label: '20–40 %' },
  { max: 1.01, color: '#1f9a4c', label: 'ab 40 %' },
];
export const heatColor = (rate) => (rate === null ? null : HEAT_STEPS.find((s) => rate < s.max).color);

export function heatBoard(fields, sel) {
  const C = COLORS, ink = C.ink, paper = C.cream;
  const defs = `<defs>
    <pattern id="hA" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V4" stroke="${ink}" stroke-width="1.1" opacity=".55"/></pattern>
    <pattern id="hB" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 0V4" stroke="${ink}" stroke-width="1.1" opacity=".55"/></pattern>
    <pattern id="hX" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0L5 5M5 0L0 5" stroke="${ink}" stroke-width=".7" opacity=".5"/></pattern>
    <pattern id="hN" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V3" stroke="${ink}" stroke-width=".8" opacity=".35"/></pattern>
  </defs>`;
  let s = `${defs}<circle r="${R.edge}" fill="${ink}"/><circle r="${R.dblOut}" fill="${paper}"/>`;
  ORDER.forEach((n, i) => {
    const [a0, a1] = segAngles(i);
    const hatch = i % 2 ? 'url(#hA)' : 'url(#hB)';
    s += `<path d="${ringPath(R.outerBull, R.triIn, a0, a1)}" fill="${hatch}"/>`;
    s += `<path d="${ringPath(R.triIn, R.triOut, a0, a1)}" fill="url(#hX)"/>`;
    s += `<path d="${ringPath(R.triOut, R.dblIn, a0, a1)}" fill="${hatch}"/>`;
    const key = `D${n}`, f = fields[key], rate = f ? f.hits / f.attempts : null, col = heatColor(rate);
    s += `<path d="${ringPath(R.dblIn, R.dblOut, a0, a1)}" fill="${col || 'url(#hN)'}" ${col ? '' : `style="fill:${paper}"`} data-act="heat" data-v="${key}"
      stroke="${ink}" stroke-width="${sel === key ? 3.5 : 1}"/>`;
    if (!col) s += `<path d="${ringPath(R.dblIn, R.dblOut, a0, a1)}" fill="url(#hN)" pointer-events="none"/>`;
    const mid = (a0 + a1) / 2, [x, y] = pt(125, mid).split(',');
    s += `<text x="${x}" y="${y}" class="hn" text-anchor="middle" dominant-baseline="central" pointer-events="none">${n}</text>`;
  });
  const fb = fields.Bull, rb = fb ? fb.hits / fb.attempts : null, cb = heatColor(rb);
  s += `<circle r="${R.outerBull}" fill="url(#hX)"/>`;
  s += `<circle r="${R.bull + 3}" fill="${cb || paper}" stroke="${ink}" stroke-width="${sel === 'Bull' ? 3.5 : 1}" data-act="heat" data-v="Bull"/>`;
  s += `<g fill="none" stroke="${ink}" stroke-width="1" pointer-events="none">${[R.outerBull, R.triIn, R.triOut, R.dblIn, R.dblOut].map((r) => `<circle r="${r}"/>`).join('')}
    ${ORDER.map((_, i) => `<path d="M${pt(R.outerBull, segAngles(i)[0])} L${pt(R.dblOut, segAngles(i)[0])}"/>`).join('')}</g>`;
  return `<svg class="heatboard" viewBox="-${R.edge} -${R.edge} ${R.edge * 2} ${R.edge * 2}" aria-label="Doppelquote je Feld">${s}</svg>`;
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

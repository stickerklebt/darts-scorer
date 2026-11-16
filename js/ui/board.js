/* Dartscheibe als SVG: antippbare Eingabe (und später die Heatmap). Ringe für Finger etwas breiter als echt. */
import { COLORS } from './svg.js';

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

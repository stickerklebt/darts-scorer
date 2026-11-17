/* Diagramme als eigene SVGs: Linie (mit gleitendem Schnitt) und Balken. Flach, harte Kanten. */
import { COLORS } from './svg.js';

const W = 340, H = 170, PAD = { l: 34, r: 10, t: 12, b: 24 };
const r1 = (x) => Math.round(x * 10) / 10;
/** Schöne Schrittweite (1, 2, 2,5, 5 × 10^n) */
const niceStep = (raw) => { const p = 10 ** Math.floor(Math.log10(raw)); const f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
/**
 * Achsenbereich passend zu den Werten (nicht immer ab 0 bzw. bis 100): etwas Luft ober- und unterhalb,
 * auf runde Schritte gerundet, nie unter 0 und – falls angegeben – nie über cap (z. B. 100 %).
 */
export function axisRange(vals, cap = null) {
  let a = Math.min(...vals), b = Math.max(...vals);
  if (!(b > a)) { const pad = Math.max(Math.abs(a) * 0.15, 1); a -= pad; b += pad; }
  const step = niceStep((b - a) / 4);
  let lo = Math.max(0, Math.floor((a - step * 0.5) / step) * step);
  let hi = Math.ceil((b + step * 0.5) / step) * step;
  if (cap !== null) hi = Math.min(cap, hi);
  if (hi <= lo) hi = lo + step;
  return { lo, hi };
}
const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p * 2) / 2 * p; };

/**
 * values: Zahlen oder null (Lücke), avg: gleitender Schnitt (gleiche Länge)
 * fmt: Beschriftung der y-Achse, maxHint: feste Obergrenze (z. B. 1 für Quoten)
 */
export function lineChart(values, avg, { fmt = (v) => Math.round(v), maxHint = null, labelL = '', labelR = '' } = {}) {
  const pts = values.map((v, i) => ({ v, a: avg[i], i })).filter((p) => p.v !== null);
  if (!pts.length) return '<p class="chart-empty">Noch keine Daten in diesem Zeitraum.</p>';
  const { lo, hi } = axisRange([...pts.map((p) => p.v), ...avg.filter((a) => a !== null && a !== undefined)], maxHint);
  const min = lo, max = hi;
  const n = values.length, iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const x = (i) => r1(PAD.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw));
  const y = (v) => r1(PAD.t + ih - ((v - min) / (max - min)) * ih);
  let g = '';
  for (let k = 0; k <= 4; k++) {
    const v = min + ((max - min) * k) / 4, yy = y(v);
    g += `<path d="M${PAD.l} ${yy}H${W - PAD.r}" stroke="${k ? COLORS.gold : COLORS.cream2}" stroke-opacity="${k ? 0.22 : 0.6}" stroke-width="1" ${k ? 'stroke-dasharray="2 3"' : ''}/>`;
    g += `<text x="${PAD.l - 6}" y="${yy}" class="ax" text-anchor="end" dominant-baseline="central">${fmt(v)}</text>`;
  }
  const raw = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i)} ${y(p.v)}`).join('');
  const mv = values.map((_, i) => avg[i]).map((a, i) => (a === null ? null : `${x(i)} ${y(a)}`)).filter(Boolean);
  const dots = pts.map((p) => `<rect x="${x(p.i) - 3}" y="${y(p.v) - 3}" width="6" height="6" fill="${COLORS.cream}" stroke="${COLORS.ink}" stroke-width="1"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    ${g}
    <path d="${raw}" fill="none" stroke="${COLORS.cream}" stroke-opacity=".55" stroke-width="1.5"/>
    ${mv.length > 1 ? `<path d="M${mv.join('L')}" fill="none" stroke="${COLORS.red}" stroke-width="3.5" stroke-linejoin="miter"/>` : ''}
    ${dots}
    <text x="${PAD.l}" y="${H - 6}" class="ax">${labelL}</text><text x="${W - PAD.r}" y="${H - 6}" class="ax" text-anchor="end">${labelR}</text>
  </svg>
  <div class="chart-key"><span><i style="background:${COLORS.cream}"></i>pro Match</span><span><i style="background:${COLORS.red}"></i>gleitender Schnitt (5)</span></div>`;
}

/** Balken: items [[label, count]] – der letzte (180) wird rot hervorgehoben. */
export function barChart(items) {
  const total = items.reduce((a, [, c]) => a + c, 0);
  if (!total) return '<p class="chart-empty">Noch keine Daten in diesem Zeitraum.</p>';
  const max = Math.max(...items.map(([, c]) => c));
  const n = items.length, iw = W - 12, ih = H - PAD.t - 34, bw = iw / n;
  let s = `<path d="M6 ${PAD.t + ih}H${W - 6}" stroke="${COLORS.cream2}" stroke-opacity=".6"/>`;
  items.forEach(([lbl, c], i) => {
    const h = max ? (c / max) * ih : 0, x0 = r1(6 + i * bw + 4), w = r1(bw - 8), y0 = r1(PAD.t + ih - h);
    const col = i === n - 1 ? COLORS.red : i >= n - 3 ? COLORS.gold : COLORS.cream;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${r1(h)}" fill="${col}" stroke="${COLORS.ink}" stroke-width="1"/>`;
    s += `<text x="${r1(x0 + w / 2)}" y="${y0 - 4}" class="bv" text-anchor="middle">${c}</text>`;
    s += `<text x="${r1(x0 + w / 2)}" y="${H - 14}" class="ax" text-anchor="middle">${lbl}</text>`;
    s += `<text x="${r1(x0 + w / 2)}" y="${H - 2}" class="ax dim" text-anchor="middle">${Math.round((c / total) * 100)}%</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
}

/* Diagramme als eigene SVGs: Linie (mit gleitendem Schnitt) und Balken. Flach, harte Kanten. */
import { COLORS } from './svg.js';

/** Diagramm mit Titel: Zahlen, Achsen, Legende und Erklärung erst nach Antippen (5 s, nochmal tippen blendet aus – reveal.js) */
export const chartBox = (title, sub, chart) => `<div class="chartbox has-tg"><h3 class="ch-h">${title}${sub ? ` <small>${sub}</small>` : ''}</h3>${chart}</div>`;

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
let gid = 0;
const AVG_INK = [[0, '#f7751f'], [.18, '#d0661f'], [.33, '#ef8238'], [.5, '#c95f1c'], [.64, '#ea7a30'], [.8, '#b85618'], [1, '#e8792f']]
  .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
export function lineChart(values, avg, { fmt = (v) => Math.round(v), maxHint = null, labelL = '', labelR = '', taps = null, key = null } = {}) {
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
  // taps[i]: data-Attribute zum Antippen des Punkts (z. B. Match öffnen) – unsichtbare, größere Trefferfläche
  const dots = pts.map((p, k) => {
    const d = `<rect class="dt" style="--k:${k}" x="${r1(x(p.i) - 2)}" y="${r1(y(p.v) - 2)}" width="4" height="4" fill="${COLORS.cream}" stroke="${COLORS.ink}" stroke-width=".8"/>`;
    return taps?.[p.i] ? `<g class="dt-tap" ${taps[p.i]}><circle cx="${x(p.i)}" cy="${y(p.v)}" r="${Math.min(10, Math.max(5, iw / n / 2))}" fill="transparent"/><circle class="dt-ring" cx="${x(p.i)}" cy="${y(p.v)}" r="5" fill="none" stroke="${COLORS.gold}" stroke-width="1.4"/>${d}</g>` : d;
  }).join('');
  // Ohne Zahlen: auf die Fläche der Linien gezoomt (data-crop); Antippen zoomt weich heraus und zeigt Achsen (reveal.js)
  const crop = `${PAD.l - 6} ${PAD.t - 6} ${W - PAD.r - PAD.l + 12} ${H - PAD.b - PAD.t + 12}`;
  return `<svg class="chart" viewBox="${crop}" data-crop="${crop}" data-full="12 0 ${W - 12} ${H}" role="img">
    ${g}
    <path class="ln" pathLength="1" d="${raw}" fill="none" stroke="${COLORS.cream}" stroke-opacity=".5" stroke-width="1"/>
    ${mv.length > 1 ? `<defs><linearGradient id="avgInk${++gid}" x1="0" x2="1" y1="0" y2="0">${AVG_INK}</linearGradient></defs>
      <path class="ln avg-under" pathLength="1" d="M${mv.join('L')}" transform="translate(.8 1)" fill="none" stroke="#6e3a12" stroke-opacity=".7" stroke-width="2.6" stroke-linejoin="round"/>
      <path class="ln avg" pathLength="1" d="M${mv.join('L')}" fill="none" stroke="url(#avgInk${gid})" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    ${dots}
    <text x="${PAD.l}" y="${H - 6}" class="ax">${labelL}</text><text x="${W - PAD.r}" y="${H - 6}" class="ax" text-anchor="end">${labelR}</text>
  </svg>
  <div class="chart-key">${key !== null ? key : `<span><i style="background:${COLORS.cream}"></i>pro Match</span><span><i style="background:${COLORS.red}"></i>gleitender Schnitt (5)</span>${taps ? '<span class="ck-tap">Punkt antippen = Match</span>' : ''}`}</div>`;
}

/** Balken: items [[label, count]] – der letzte (180) wird rot hervorgehoben. */
export function barChart(items) {
  const total = items.reduce((a, [, c]) => a + c, 0);
  if (!total) return '<p class="chart-empty">Noch keine Daten in diesem Zeitraum.</p>';
  const max = Math.max(...items.map(([, c]) => c));
  const n = items.length, iw = W - 12, ih = H - PAD.t - 34, bw = iw / n;
  let s = `<path d="M6 ${PAD.t + ih}H${W - 6}" stroke="${COLORS.cream2}" stroke-opacity=".6"/>`;
  items.forEach(([lbl, c], i) => {
    const h = max ? (c / max) * (ih - 24) : 0, x0 = r1(6 + i * bw + 4), w = r1(bw - 8), y0 = r1(PAD.t + ih - h);
    const col = i === n - 1 ? COLORS.red : i >= n - 3 ? COLORS.gold : COLORS.cream;
    s += `<rect class="bar" style="--k:${i}" x="${x0}" y="${y0}" width="${w}" height="${r1(h)}" fill="${col}" stroke="${COLORS.ink}" stroke-width="1"/>`;
    s += `<text x="${r1(x0 + w / 2)}" y="${y0 - 4}" class="bv pc" text-anchor="middle">${Math.round((c / total) * 100)}%</text>`;
    s += `<text x="${r1(x0 + w / 2)}" y="${H - 14}" class="ax keep" text-anchor="middle">${lbl}</text>`; // Bereich immer sichtbar
    s += `<text x="${r1(x0 + w / 2)}" y="${H - 2}" class="ax dim" text-anchor="middle">${c}×</text>`;
  });
  const crop = `0 ${PAD.t - 2} ${W} ${H - 9 - (PAD.t - 2)}`; // Balken, Prozente und Bereich; die Anzahl erst beim Herauszoomen
  return `<svg class="chart" viewBox="${crop}" data-crop="${crop}" data-full="0 0 ${W} ${H}" role="img">${s}</svg>`;
}

/**
 * Verlauf im Leg: Ø Punkte je Aufnahme (1., 2., 3. …) von 501 bis zum Finish-Bereich. Beste Aufnahme gold hervorgehoben,
 * Werte über den Punkten, unten „501“ links und „170“ rechts.
 */
export function legCurveChart(points) {
  if (points.length < 2) return '<p class="chart-empty">Noch zu wenige Legs für diesen Verlauf.</p>';
  const H2 = 190, pad = { l: 34, r: 16, t: 26, b: 42 };
  const { lo, hi } = axisRange(points.map((p) => p.avg));
  const n = points.length, iw = W - pad.l - pad.r, ih = H2 - pad.t - pad.b;
  const x = (i) => r1(pad.l + (i / (n - 1)) * iw), y = (v) => r1(pad.t + ih - ((v - lo) / (hi - lo)) * ih);
  const best = points.reduce((b, p) => (p.avg > b.avg ? p : b), points[0]);
  let g = '';
  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4, yy = y(v);
    g += `<path d="M${pad.l} ${yy}H${W - pad.r}" stroke="${k ? COLORS.gold : COLORS.cream2}" stroke-opacity="${k ? 0.22 : 0.6}" stroke-width="1" ${k ? 'stroke-dasharray="2 3"' : ''}/>`;
    g += `<text x="${pad.l - 6}" y="${yy}" class="ax" text-anchor="end" dominant-baseline="central">${Math.round(v)}</text>`;
  }
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.avg)}`).join('');
  const dots = points.map((p, i) => {
    const top = p === best;
    return `<rect class="dt" style="--k:${i}" x="${r1(x(i) - 2.5)}" y="${r1(y(p.avg) - 2.5)}" width="5" height="5" fill="${top ? COLORS.gold : COLORS.cream}" stroke="${COLORS.ink}" stroke-width=".8"/>
      ${top ? `<circle cx="${x(i)}" cy="${y(p.avg)}" r="7" fill="none" stroke="${COLORS.gold}" stroke-width="1.4"/>` : ''}
      <text x="${x(i)}" y="${r1(y(p.avg) - (top ? 11 : 8))}" class="bv pc${top ? ' top' : ''}" text-anchor="middle">${Math.round(p.avg)}</text>
      <text x="${x(i)}" y="${H2 - pad.b + 14}" class="ax" text-anchor="middle">${p.n}.</text>`;
  }).join('');
  const crop = `${pad.l - 8} ${pad.t - 20} ${iw + 16} ${ih + 26}`;
  return `<svg class="chart" viewBox="${crop}" data-crop="${crop}" data-full="12 0 ${W - 12} ${H2}" role="img">
    ${g}
    <defs><linearGradient id="avgInk${++gid}" x1="0" x2="1" y1="0" y2="0">${AVG_INK}</linearGradient></defs>
    <path class="ln avg-under" pathLength="1" d="${d}" transform="translate(.8 1)" fill="none" stroke="#6e3a12" stroke-opacity=".7" stroke-width="2.6" stroke-linejoin="round"/>
    <path class="ln avg" pathLength="1" d="${d}" fill="none" stroke="url(#avgInk${gid})" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${pad.l}" y="${H2 - 6}" class="ax dim">501</text>
    <text x="${r1(pad.l + iw / 2)}" y="${H2 - 6}" class="ax dim" text-anchor="middle">Aufnahme im Leg</text>
    <text x="${W - pad.r}" y="${H2 - 6}" class="ax dim" text-anchor="end">170</text>
  </svg>`;
}

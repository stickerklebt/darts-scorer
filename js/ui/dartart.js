/* Dart zeichnen aus dem Steckbrief (js/dartspec.js): immer derselbe Stil – waagerecht, Flight links, gleiche Umrisslinie,
   gleicher Chrom-Glanz und Lichtstreif; übernommen werden nur die echten Merkmale (Längen, Barrel-Form, Rillen, Metall, Farben, Flight-Form).
   Ergebnis: SVG-Text, viewBox 600 × 90 wie der frühere Standard-Dart. */
import { cleanSpec, DEFAULT_SPEC, FLIGHT_TPL } from '../dartspec.js';

const X0 = 8, X1 = 592, SPAN = X1 - X0, CY = 45;
const OUT = 'stroke="#eef0f3" stroke-opacity=".45" stroke-width="1.3" stroke-linejoin="round"';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const f1 = (v) => Math.round(v * 10) / 10;

function mix(hex, to, f) {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join('');
}
const METAL = {
  silver: ['#6c7078', '#f2f4f7', '#9da3ab', '#3a3d43', '#c9ced5', '#5d6168'],
  titan: ['#45484e', '#d3d6db', '#7c8189', '#26282c', '#a3a8b0', '#3f4247'],
  black: ['#111215', '#6a6e76', '#2a2c31', '#060708', '#484c53', '#141518'],
  gold: ['#6e5018', '#f7e3a1', '#c9a14a', '#4f370d', '#e0c070', '#644815'],
};
const metalStops = (s) => METAL[s.metal] || [mix(s.tone, '#000000', 0.5), mix(s.tone, '#ffffff', 0.7), s.tone, mix(s.tone, '#000000', 0.65), mix(s.tone, '#ffffff', 0.35), mix(s.tone, '#000000', 0.45)];
const vGrad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map((c, i) => `<stop offset="${f1(i / (stops.length - 1) * 100) / 100}" stop-color="${c}"/>`).join('')}</linearGradient>`;

/** glatte Linie durch Punkte (Catmull-Rom → kubische Bézier) */
function curve(p) {
  let d = '';
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    d += ` C${f1(b[0] + (c[0] - a[0]) / 6)} ${f1(b[1] + (c[1] - a[1]) / 6)} ${f1(c[0] - (e[0] - b[0]) / 6)} ${f1(c[1] - (e[1] - b[1]) / 6)} ${f1(c[0])} ${f1(c[1])}`;
  }
  return d;
}

/** Flight-Umriss: hinten bei X0, vorne bei x1, halbe Höhe h – aus dem Breitenprofil der Vorlage (oder alter Foto-Umriss).
    Harte Regeln: bis zur breitesten Stelle nur steigend, danach nur fallend → nie ein dünner Strich nach links, nie eine Einschnürung. */
function flightPath(shape, x1, h, outline) {
  const L = x1 - X0, photo = shape === 'photo' && outline;
  const prof = photo ? outline : FLIGHT_TPL[shape === 'slim' ? 'standard' : shape] || FLIGHT_TPL.standard;
  const n = prof.length; let pk = 0; prof.forEach((o, i) => { if (o > prof[pk]) pk = i; });
  const o2 = prof.slice();
  for (let i = pk - 1; i >= 0; i--) {
    o2[i] = Math.min(o2[i], o2[i + 1]);
    if (photo) o2[i] = Math.max(0.35, o2[i]);   // alter Foto-Umriss: hinten nie dünner als 35 % (Kite-Vorlage darf hinten spitz sein)
  }
  for (let i = pk + 1; i < n; i++) o2[i] = Math.min(o2[i], o2[i - 1]);
  const pts = o2.map((o, i) => [X0 + i / (n - 1) * L, CY - Math.max(i === n - 1 ? 5 : 1, o * h)]);
  const top = curve(pts), bot = curve(pts.map(([x, y]) => [x, 2 * CY - y]).reverse());
  return `M${f1(pts[0][0])} ${f1(pts[0][1])}${top} L${f1(pts[n - 1][0])} ${f1(2 * CY - pts[n - 1][1])}${bot} Z`;
}

let n = 0;
/** Steckbrief → SVG (ungültige/fehlende Werte → Standard) */
export function renderDart(spec, label = 'Dart', cls = 'ddart') {
  const s = cleanSpec(spec) || cleanSpec(DEFAULT_SPEC), k = `da${++n}`;
  // Längen in sinnvolle Grenzen, damit jeder Dart gut aussieht, dann auf die volle Breite verteilen
  const raw = [clamp(s.len.flight, 0.16, 0.34), clamp(s.len.shaft, 0.1, 0.32), clamp(s.len.barrel, 0.2, 0.42), clamp(s.len.tip, 0.12, 0.28)];
  const sum = raw.reduce((a, b) => a + b, 0), [lf, ls, lb] = raw.map((v) => v / sum * SPAN);
  const fx1 = X0 + lf, sx1 = fx1 + ls, bx1 = sx1 + lb;
  const hb = clamp(s.thick * SPAN / 2, 9, 17);
  const hf = s.flight.shape === 'slim' ? clamp(s.flight.aspect * lf / 2, 18, 28) : clamp(s.flight.aspect * lf / 2, 26, 42);
  // Barrel: Profilpunkte, Enden etwas eingezogen (Übergang zu Schaft und Spitze)
  const P = s.profile, pts = [[sx1, Math.max(6.5, P[0] * hb * 0.75)], ...P.map((p, i) => [sx1 + (i + 0.5) / P.length * lb, Math.max(6.5, p * hb)]), [bx1, Math.max(4, P[P.length - 1] * hb * 0.7)]];
  const top = pts.map(([x, r]) => [x, CY - r]), bot = pts.map(([x, r]) => [x, CY + r]).reverse();
  const barrel = `M${f1(top[0][0])} ${f1(top[0][1])}${curve(top)} L${f1(bot[0][0])} ${f1(bot[0][1])}${curve(bot)} Z`;
  const fc = s.flight.colors, fd = flightPath(s.flight.shape, fx1, hf, s.flight.outline), tex = !s.flight.texOff && s.flight.tex;
  const rings = s.rings.map((r) => { const x = f1(sx1 + (0.04 + r * 0.92) * lb); return `<path d="M${x} ${CY - hb}V${CY + hb}" stroke="#0c0d10" stroke-opacity=".6" stroke-width="2.2"/><path d="M${f1(x + 1.7)} ${CY - hb}V${CY + hb}" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>`; }).join('');
  const shaftHi = mix(s.shaft, '#ffffff', 0.35), shaftLo = mix(s.shaft, '#000000', 0.4);
  return `<svg class="${cls}" viewBox="0 0 600 90" role="img" aria-label="${label}">
  <defs>${vGrad(`${k}b`, metalStops(s))}${vGrad(`${k}s`, [shaftHi, s.shaft, shaftLo])}${vGrad(`${k}t`, ['#8d939b', '#f2f4f7', '#7a7f87'])}
    <linearGradient id="${k}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(fc[0], '#ffffff', 0.3)}"/><stop offset=".5" stop-color="${fc[0]}"/><stop offset="1" stop-color="${mix(fc[0], '#000000', 0.5)}"/></linearGradient>
    <linearGradient id="${k}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="${k}c"><path d="${barrel}"/></clipPath><clipPath id="${k}fc"><path d="${fd}"/></clipPath></defs>
  <path d="${fd}" fill="url(#${k}f)"/>
  ${tex ? `<image href="${tex}" x="${X0}" y="${f1(CY - hf)}" width="${f1(lf)}" height="${f1(2 * hf)}" preserveAspectRatio="none" clip-path="url(#${k}fc)"/>` : ''}
  <path d="${fd}" fill="url(#${k}g)" ${OUT}/>
  <path d="M${X0 + 14} ${CY}H${f1(fx1)}" stroke="#000" stroke-opacity=".45" stroke-width="2"/>
  <rect x="${f1(fx1 - 10)}" y="${CY - 6}" width="${f1(sx1 - fx1 + 12)}" height="12" rx="4" fill="url(#${k}s)" ${OUT}/>
  <path d="M${f1(fx1 - 6)} ${CY - 3}H${f1(sx1 - 2)}" stroke="#fff" stroke-opacity=".25" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M${f1(bx1 - 1)} ${CY - 3.4} L${X1 - 14} ${CY - 1.2} L${X1} ${CY} L${X1 - 14} ${CY + 1.2} L${f1(bx1 - 1)} ${CY + 3.4} Z" fill="url(#${k}t)" ${OUT}/>
  <path d="${barrel}" fill="url(#${k}b)"/>
  <g clip-path="url(#${k}c)">${rings}<path d="M${f1(sx1 + 6)} ${f1(CY - hb * 0.55)}H${f1(bx1 - 6)}" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/></g>
  <path d="${barrel}" fill="none" ${OUT}/>
</svg>`;
}

/* Dart-Steckbrief: aus dem ausgerichteten Foto-Dart (dartscan.straighten → Flight links, Spitze rechts) werden nur MERKMALE gemessen –
   Längenverhältnisse, Barrel-Form, Grip-Rillen, Metall, Farben, Flight-Form. Gezeichnet wird daraus immer im selben Stil
   (ui/dartart.js), deshalb sehen alle Darts einheitlich aus und behalten trotzdem ihre echten Merkmale.
   Rein, ohne DOM; auch der Server benutzt cleanSpec (Freundes-Darts). Gespeichert in prefs.myDart (wenige hundert Bytes). */

export const FLIGHTS = ['standard', 'slim', 'kite', 'pear'];
export const METALS = ['silver', 'titan', 'black', 'gold', 'color'];
export const MAX_RINGS = 24;
const N_PROFILE = 12;

/** Standard-Dart für alle ohne Foto: Silber-Barrel mit Rillen, dunkler Schaft, Bordeaux-Flight */
export const DEFAULT_SPEC = Object.freeze({
  v: 1, len: { flight: 0.22, shaft: 0.2, barrel: 0.32, tip: 0.26 },
  profile: [0.82, 0.92, 0.97, 1, 1, 1, 1, 1, 1, 0.98, 0.93, 0.84], thick: 0.05,
  rings: Array.from({ length: 12 }, (_, i) => +(0.18 + i * 0.06).toFixed(2)),
  metal: 'silver', tone: '#9da3ab', shaft: '#1b1c20', flight: { shape: 'standard', colors: ['#b3243f'], aspect: 1.25 },
});

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const HEX = /^#[0-9a-f]{6}$/;
const hex = (v, d) => (typeof v === 'string' && HEX.test(v.toLowerCase()) ? v.toLowerCase() : d);
const toHex = ([r, g, b]) => '#' + [r, g, b].map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('');

/** Steckbrief prüfen und auf gültige Werte bringen (fremde/alte Daten können nichts kaputt machen). Kein Objekt → null. */
export function cleanSpec(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const D = DEFAULT_SPEC, l = x.len || {};
  const prof = Array.isArray(x.profile) && x.profile.length >= 4 ? x.profile.slice(0, 32).map((p) => +clamp(num(p, 1), 0.3, 1).toFixed(2)) : D.profile.slice();
  const rings = Array.isArray(x.rings) ? x.rings.slice(0, MAX_RINGS).map((r) => +clamp(num(r, 0.5), 0, 1).toFixed(3)).sort((a, b) => a - b) : [];
  const f = x.flight || {};
  const colors = (Array.isArray(f.colors) ? f.colors : []).slice(0, 2).map((c) => hex(c, null)).filter(Boolean);
  return {
    v: 1,
    len: { flight: clamp(num(l.flight, D.len.flight), 0.05, 0.6), shaft: clamp(num(l.shaft, D.len.shaft), 0.02, 0.6),
      barrel: clamp(num(l.barrel, D.len.barrel), 0.05, 0.7), tip: clamp(num(l.tip, D.len.tip), 0.03, 0.5) },
    profile: prof, thick: clamp(num(x.thick, D.thick), 0.02, 0.12), rings,
    metal: METALS.includes(x.metal) ? x.metal : 'silver', tone: hex(x.tone, D.tone), shaft: hex(x.shaft, D.shaft),
    flight: { shape: FLIGHTS.includes(f.shape) ? f.shape : 'standard', colors: colors.length ? colors : D.flight.colors.slice(), aspect: clamp(num(f.aspect, 1.25), 0.4, 2.5) },
  };
}

/* ---------- Messen ---------- */
const lumOf = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
const smooth = (a, r) => a.map((_, i) => { let s = 0, n = 0; for (let k = i - r; k <= i + r; k++) if (k >= 0 && k < a.length) { s += a[k]; n++; } return s / n; });

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Pixel (RGB) einer Spaltenspanne des ausgerichteten Darts; core = nur die Mitte (ohne Kanten/Schatten) */
function pixels(st, a, b, core = 0.6) {
  const { width: W, height: H, data, alpha, thick } = st, cy = (H - 1) / 2, out = [];
  for (let X = Math.max(0, a); X <= Math.min(W - 1, b); X++) {
    const hw = Math.max(1, thick[X] / 2) * core;
    for (let Y = Math.floor(cy - hw); Y <= Math.ceil(cy + hw); Y++) {
      if (Y < 0 || Y >= H || !alpha[Y * W + X]) continue;
      const i = (Y * W + X) * 4; out.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return out;
}
const medColor = (px) => (px.length ? [0, 1, 2].map((c) => median(px.map((p) => p[c]))) : null);

/** Zwei Hauptfarben (k-means, Start bei dunkelstem/hellstem Pixel) → nach Anteil sortiert; fast gleich → nur eine */
function twoColors(px) {
  if (px.length < 8) return [];
  const step = Math.max(1, Math.floor(px.length / 4000)), P = px.filter((_, i) => i % step === 0);
  const byL = P.slice().sort((a, b) => lumOf(a, 0) - lumOf(b, 0));
  let c = [byL[Math.floor(byL.length * 0.1)], byL[Math.floor(byL.length * 0.9)]].map((x) => x.slice()), n = [0, 0];
  for (let it = 0; it < 8; it++) {
    const s = [[0, 0, 0], [0, 0, 0]]; n = [0, 0];
    for (const p of P) {
      const k = (p[0] - c[0][0]) ** 2 + (p[1] - c[0][1]) ** 2 + (p[2] - c[0][2]) ** 2 <= (p[0] - c[1][0]) ** 2 + (p[1] - c[1][1]) ** 2 + (p[2] - c[1][2]) ** 2 ? 0 : 1;
      n[k]++; for (let j = 0; j < 3; j++) s[k][j] += p[j];
    }
    c = c.map((old, k) => (n[k] ? s[k].map((v) => v / n[k]) : old));
  }
  const order = n[0] >= n[1] ? [0, 1] : [1, 0], main = c[order[0]], sec = c[order[1]];
  const far = Math.hypot(main[0] - sec[0], main[1] - sec[1], main[2] - sec[2]) > 55 && n[order[1]] > P.length * 0.18;
  return far ? [toHex(main), toHex(sec)] : [toHex(main)];
}

/** Barrel-Farbe → Metallart (Silber, Titan, Schwarz, Gold) oder farbig beschichtet */
export function metalOf(rgb) {
  const [h, s, l] = rgbToHsl(rgb);
  if (s > 0.25 && h >= 30 && h <= 60 && l > 0.25) return 'gold';
  if (s > 0.3 && l > 0.15 && l < 0.85) return 'color';
  return l < 0.28 ? 'black' : l > 0.55 ? 'silver' : 'titan';
}

/** Flight-Form aus dem Breitenprofil (links = hinten): schmal → Slim, spitz hinten → Kite, gerade hinten → Standard, rund → Pear */
export function flightShape(prof) {
  const L = prof.length, mx = Math.max(...prof, 1), aspect = mx / Math.max(1, L);
  const back = prof.slice(0, Math.max(1, Math.round(L * 0.06))).reduce((a, b) => a + b, 0) / Math.max(1, Math.round(L * 0.06)) / mx;
  const shape = aspect < 0.7 ? 'slim' : back < 0.45 ? 'kite' : back > 0.85 ? 'standard' : 'pear';
  return { shape, aspect: +aspect.toFixed(2) };
}

/** Grip-Rillen: Helligkeit entlang der Barrel-Mitte, Trend abziehen, deutliche Täler zählen → Positionen 0…1 */
export function findRings(lum) {
  const n = lum.length;
  if (n < 12) return [];
  const trend = smooth(lum, Math.max(3, Math.round(n / 8))), det = lum.map((v, i) => v - trend[i]);
  const sd = Math.sqrt(det.reduce((a, v) => a + v * v, 0) / n);
  if (sd < 4) return [];
  const gap = Math.max(2, Math.round(n / 40)), out = [];
  for (let i = 1; i < n - 1; i++) {
    if (det[i] > -0.7 * sd || det[i] > det[i - 1] || det[i] > det[i + 1]) continue;
    if (out.length && i - out[out.length - 1] < gap) { if (det[i] < det[out[out.length - 1]]) out[out.length - 1] = i; continue; }
    out.push(i);
  }
  return out.slice(0, MAX_RINGS).map((i) => +(i / (n - 1)).toFixed(3));
}

/** Ausgerichteter Dart ({ width, height, data, alpha, thick }, Flight links) → Steckbrief */
export function features(st) {
  const t0 = st.thick, W = t0.length;
  let x0 = 0, x1 = W - 1; while (x0 < W && !t0[x0]) x0++; while (x1 > x0 && !t0[x1]) x1--;
  const L = x1 - x0 + 1;
  if (L < 30) return null;
  const t = t0.map((v, i) => { const a = [t0[i - 1] ?? v, v, t0[i + 1] ?? v].sort((p, q) => p - q); return a[1]; });
  const maxW = Math.max(...t.slice(x0, x1 + 1));
  const rest = t.slice(x0 + Math.round(L * 0.35), x1 + 1).slice().sort((a, b) => a - b);
  const bw = Math.max(2, rest[Math.floor(rest.length * 0.9)] || 2);
  // Flight-Ende: letzte breite Spalte in der linken Hälfte
  let fE = -1;
  for (let x = x0; x <= x0 + L * 0.55; x++) if (t[x] > Math.max(bw * 1.5, maxW * 0.3)) fE = x;
  if (fE < 0) fE = x0 + Math.round(L * 0.25);
  // Spitze: von rechts, solange deutlich schmaler als das Barrel
  let bE = x1; while (bE > fE && t[bE] < bw * 0.5) bE--;
  // Barrel: nach links, solange breit (kurze Einschnitte = Rillen werden übersprungen)
  let bS = bE, low = 0;
  for (let x = bE; x > fE; x--) { if (t[x] >= bw * 0.55) { bS = x; low = 0; } else if (++low > L * 0.03) break; }
  const fl = fE - x0 + 1, bl = bE - bS + 1, tl = x1 - bE, sl = Math.max(1, bS - fE - 1);
  if (bl < L * 0.08 || tl < L * 0.03) return null;
  const bt = t.slice(bS, bE + 1), bmx = Math.max(...bt, 1);
  const profile = Array.from({ length: N_PROFILE }, (_, i) => {
    const a = Math.floor(i * bl / N_PROFILE), b = Math.max(a + 1, Math.floor((i + 1) * bl / N_PROFILE));
    return Math.max(...bt.slice(a, b)) / bmx;
  });
  // Helligkeit je Barrel-Spalte (nur die Mitte, ohne Glanzkante oben/unten)
  const lum = [];
  for (let X = bS; X <= bE; X++) { const px = pixels(st, X, X, 0.5); lum.push(px.length ? px.reduce((a, p) => a + lumOf(p, 0), 0) / px.length : 0); }
  const barrelRgb = medColor(pixels(st, bS, bE)) || [157, 163, 171];
  const shaftRgb = medColor(pixels(st, fE + 1, bS - 1, 0.8)) || [27, 28, 32];
  const fp = flightShape(t.slice(x0, fE + 1));
  return cleanSpec({
    v: 1, len: { flight: fl / L, shaft: sl / L, barrel: bl / L, tip: tl / L },
    profile: smooth(profile, 1), thick: bmx / L, rings: findRings(lum),
    metal: metalOf(barrelRgb), tone: toHex(barrelRgb), shaft: toHex(shaftRgb),
    flight: { shape: fp.shape, aspect: fp.aspect, colors: twoColors(pixels(st, x0, fE, 0.9)) },
  });
}

/* Dart-Steckbrief: aus dem ausgerichteten Foto-Dart (dartscan.straighten → Flight links, Spitze rechts) werden nur MERKMALE gemessen –
   Längenverhältnisse, Barrel-Form, Grip-Rillen, Metall, Farben, Flight-Form. Gezeichnet wird daraus immer im selben Stil
   (ui/dartart.js), deshalb sehen alle Darts einheitlich aus und behalten trotzdem ihre echten Merkmale.
   Flight: echter Umriss (outline) + Muster aus dem Foto, auf wenige Farben reduziert (flightTexture → PNG in flight.tex, wenige KB) –
   sieht damit wie ein gedrucktes Icon aus, nicht wie ein Foto-Ausschnitt.
   Rein, ohne DOM; auch der Server benutzt cleanSpec (Freundes-Darts). Gespeichert in prefs.myDart. */

export const FLIGHTS = ['photo', 'standard', 'slim', 'kite', 'pear'];
const TEX_MAX = 24000; // Zeichen der data-URL
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
  const outline = Array.isArray(f.outline) && f.outline.length >= 8 && f.outline.length <= 32 ? f.outline.map((p) => +clamp(num(p, 0.5), 0, 1).toFixed(3)) : null;
  const tex = typeof f.tex === 'string' && f.tex.length <= TEX_MAX && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(f.tex) ? f.tex : null;
  return {
    v: 1,
    len: { flight: clamp(num(l.flight, D.len.flight), 0.05, 0.6), shaft: clamp(num(l.shaft, D.len.shaft), 0.02, 0.6),
      barrel: clamp(num(l.barrel, D.len.barrel), 0.05, 0.7), tip: clamp(num(l.tip, D.len.tip), 0.03, 0.5) },
    profile: prof, thick: clamp(num(x.thick, D.thick), 0.02, 0.12), rings,
    metal: METALS.includes(x.metal) ? x.metal : 'silver', tone: hex(x.tone, D.tone), shaft: hex(x.shaft, D.shaft),
    flight: { shape: FLIGHTS.includes(f.shape) && (f.shape !== 'photo' || outline) ? f.shape : 'standard', colors: colors.length ? colors : D.flight.colors.slice(), aspect: clamp(num(f.aspect, 1.25), 0.4, 2.5),
      ...(outline ? { outline } : {}), ...(tex ? { tex } : {}), ...(f.texOff === true ? { texOff: true } : {}) },
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
      const i = (Y * W + X) * 4;
      if (isBg(st, data, i)) continue;
      out.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  return out;
}
/** Pixel sieht aus wie der Untergrund (z. B. Lücke zwischen den Flügeln, Schatten-Saum)? */
const BG_DIST = 42;
const isBg = (st, d, i) => !!st.bg && Math.hypot(d[i] - st.bg[0], d[i + 1] - st.bg[1], d[i + 2] - st.bg[2]) < BG_DIST;
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
  const at = (f) => prof[Math.min(L - 1, Math.round(f * (L - 1)))] / mx;
  // Kite: wird erst zur Mitte hin breit (bei 15 % noch schmal); Standard: hinten sofort voll; dazwischen (runde Ecken) Pear
  const shape = aspect < 0.7 ? 'slim' : at(0.15) < 0.55 ? 'kite' : at(0.04) > 0.85 ? 'standard' : 'pear';
  return { shape, aspect: +aspect.toFixed(2) };
}
/**
 * Flight-Umriss (Breite je Stelle, 0…1, hinten → vorne) → 16 Punkte, sauber wie gezeichnet: bis zur breitesten Stelle nie schmaler,
 * danach nie wieder breiter (Flügel in Schräglage, Schatten, Tisch-Krümel ergeben sonst Fliegen- oder Klumpenformen), geglättet.
 */
export function flightOutline(w) {
  const n = w.length, sm = smooth(w, Math.max(1, Math.round(n * 0.04)));
  let pk = 0; sm.forEach((v, i) => { if (v > sm[pk]) pk = i; });
  const u = sm.slice();
  for (let i = pk - 1; i >= 0; i--) u[i] = Math.min(u[i], u[i + 1]);         // hinten: zur Spitze hin nie schmaler …
  for (let i = 1; i <= pk; i++) u[i] = Math.max(u[i], u[i - 1]);             // … d. h. von hinten steigend
  for (let i = pk + 1; i < n; i++) u[i] = Math.min(u[i], u[i - 1]);          // vorne: nur noch schmaler
  const mx = Math.max(...u, 1e-6);
  return smooth(Array.from({ length: 16 }, (_, i) => u[Math.round(i / 15 * (n - 1))] / mx), 1);
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
  // an den Enden ist es die Verjüngung zu Schaft/Spitze, keine Rille
  return out.map((i) => i / (n - 1)).filter((r) => r > 0.06 && r < 0.94).slice(0, MAX_RINGS).map((r) => +r.toFixed(3));
}

/** Ausgerichteter Dart ({ width, height, data, alpha, thick }, Flight links) → Steckbrief (null = nicht erkannt).
    dbg (optional) bekommt die gemessenen Zonen und ggf. den Grund fürs Scheitern – fürs Scan-Protokoll. */
export function features(st, dbg = {}) {
  const t0 = st.thick, W = t0.length;
  let x0 = 0, x1 = W - 1; while (x0 < W && !t0[x0]) x0++; while (x1 > x0 && !t0[x1]) x1--;
  const L = x1 - x0 + 1;
  dbg.L = L;
  if (L < 30) { dbg.fail = 'zu kurz'; return null; }
  const t = t0.map((v, i) => { const a = [t0[i - 1] ?? v, v, t0[i + 1] ?? v].sort((p, q) => p - q); return a[1]; });
  const maxW = Math.max(...t.slice(x0, x1 + 1));
  const rest = t.slice(x0 + Math.round(L * 0.35), x1 + 1).slice().sort((a, b) => a - b);
  const bw = Math.max(2, rest[Math.floor(rest.length * 0.9)] || 2);
  // Flight-Ende: letzte breite Spalte in der linken Hälfte
  let fE = -1;
  for (let x = x0; x <= x0 + L * 0.55; x++) if (t[x] > Math.max(bw * 1.5, maxW * 0.3)) fE = x;
  if (fE < 0) fE = x0 + Math.round(L * 0.25);
  // Barrel = längster zusammenhängender dicker Abschnitt hinter der Flight (kurze Einschnitte = Rillen zählen mit).
  // Rechts davon die Spitze, links der Schaft – egal wie dick die sind (Soft-Darts: Spitze halb so dick wie der Barrel).
  const thick = bw * 0.7, gap = Math.max(2, Math.round(L * 0.02));
  let bS = x1, bE = x1 - 1;
  for (let x = fE + 1, s0 = -1, last = -1; x <= x1 + 1; x++) {
    if (x <= x1 && t[x] >= thick) { if (s0 < 0 || x - last > gap + 1) s0 = x; last = x; if (last - s0 > bE - bS) { bS = s0; bE = last; } }
  }
  let fl = fE - x0 + 1, bl = bE - bS + 1, tl = x1 - bE, sl = Math.max(1, bS - fE - 1);
  Object.assign(dbg, { x0, x1, fE, bS, bE, bw, maxW, fl, sl, bl, tl });
  // Unplausibel (z. B. gemusterter Tisch, Spitze kaum sichtbar)? Dann nicht abbrechen, sondern typische Proportionen hinter der Flight –
  // Farben, Metall und Flight bleiben echt; Rillen/Barrel-Form dann wie beim Standard-Dart.
  const ok = (v, a, b) => v / L >= a && v / L <= b;
  const guess = !(ok(fl, 0.12, 0.45) && ok(sl, 0.04, 0.4) && ok(bl, 0.12, 0.5) && ok(tl, 0.06, 0.32));
  if (guess) {
    if (!ok(fl, 0.12, 0.45)) fE = x0 + Math.round(L * 0.25);
    const r = x1 - fE;
    bS = fE + 1 + Math.round(r * 0.26); bE = bS + Math.round(r * 0.42) - 1;
    fl = fE - x0 + 1; sl = bS - fE - 1; bl = bE - bS + 1; tl = x1 - bE;
    Object.assign(dbg, { guess: true, gfE: fE, gbS: bS, gbE: bE });
  }
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
  const fw = t.slice(x0, fE + 1), fmx = Math.max(...fw, 1);
  const outline = flightOutline(fw.map((v) => v / fmx));
  return cleanSpec({
    v: 1, len: { flight: fl / L, shaft: sl / L, barrel: bl / L, tip: tl / L },
    profile: guess ? DEFAULT_SPEC.profile : smooth(profile, 1), thick: guess ? Math.min(bw, maxW * 0.35) / L : bmx / L,
    rings: guess ? DEFAULT_SPEC.rings : findRings(lum),
    metal: metalOf(barrelRgb), tone: toHex(barrelRgb), shaft: toHex(shaftRgb),
    flight: { shape: 'photo', outline, aspect: fp.aspect, colors: twoColors(pixels(st, x0, fE, 0.7)) },
  });
}

/* ---------- Flight-Muster: aus dem Foto abgerollt, entrauscht, auf wenige Farben reduziert (wie gedruckt) ---------- */
/**
 * Flight-Bereich (Spalten x0…fE des ausgerichteten Darts) als kleines Bild in Kastenform: x = entlang der Flight, y = quer, bezogen auf
 * die breiteste Stelle (wie die gezeichnete Flight). Außerhalb der Flight wird die Randfarbe fortgesetzt (der Umriss schneidet später ab).
 * Dann Median 3×3, k-means auf ≤ 5 Farben, Krümel per Mehrheitsfilter weg. → { w, h, pal: [[r,g,b]…], idx: Uint8Array } oder null
 */
export function flightTexture(st, x0, fE, TW = 96) {
  const { width: W, height: H, data, alpha, thick } = st, cy = (H - 1) / 2, fl = fE - x0 + 1;
  const mxH = Math.max(1, ...thick.slice(x0, fE + 1)) / 2;
  if (fl < 8 || mxH < 4) return null;
  const TH = Math.round(clamp(TW * (2 * mxH) / fl, 32, 96));
  const raw = new Float32Array(TW * TH * 3), vis = new Uint8Array(TW * TH);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const X = Math.min(W - 1, Math.round(x0 + (i + 0.5) / TW * fl)), hw = Math.max(0, thick[X] / 2 - 1);
    let v = ((j + 0.5) / TH * 2 - 1) * mxH; v = clamp(v, -hw, hw);
    const Y0 = Math.round(cy + ((j + 0.5) / TH * 2 - 1) * mxH);
    let Y = Math.round(cy + v), o = (j * TW + i) * 3;
    while (Y !== Math.round(cy) && !alpha[Y * W + X]) Y += Y > cy ? -1 : 1;   // bis in die Flight hinein
    const p = (Y * W + X) * 4;
    raw[o] = data[p]; raw[o + 1] = data[p + 1]; raw[o + 2] = data[p + 2];
    // sichtbar nur, was zur Flight gehört: innerhalb der Fläche und nicht in Untergrundfarbe
    const q = (Y0 * W + X) * 4;
    vis[j * TW + i] = Y0 >= 0 && Y0 < H && alpha[Y0 * W + X] && !isBg(st, data, q) ? 1 : 0;
  }
  // Median 3×3 je Kanal (Rauschen, JPEG-Kanten)
  const med = new Float32Array(raw.length);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) for (let k = 0; k < 3; k++) {
    const a = [];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const jj = clamp(j + dj, 0, TH - 1), ii = clamp(i + di, 0, TW - 1); a.push(raw[(jj * TW + ii) * 3 + k]); }
    a.sort((p, q) => p - q); med[(j * TW + i) * 3 + k] = a[4];
  }
  // k-means (Start: Helligkeits-Quantile), ähnliche Farben zusammenlegen
  const N = TW * TH, px = (n) => [med[n * 3], med[n * 3 + 1], med[n * 3 + 2]];
  const order = [...Array(N).keys()].sort((a, b) => lumOf(med, a * 3) - lumOf(med, b * 3));
  let pal = [0.08, 0.3, 0.5, 0.7, 0.92].map((q) => px(order[Math.floor(q * (N - 1))]));
  const idx = new Uint8Array(N);
  const nearest = (p) => { let b = 0, bd = Infinity; pal.forEach((c, k) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; b = k; } }); return b; };
  for (let it = 0; it < 10; it++) {
    const sum = pal.map(() => [0, 0, 0, 0]);
    for (let n = 0; n < N; n++) { const p = px(n), k = nearest(p); idx[n] = k; sum[k][0] += p[0]; sum[k][1] += p[1]; sum[k][2] += p[2]; sum[k][3]++; }
    pal = pal.map((c, k) => (sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c));
    if (it === 5) { // fast gleiche Farben verschmelzen, leere entfernen
      const keep = [];
      pal.forEach((c, k) => { if (sum[k][3] && !keep.some((d) => Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]) < 38)) keep.push(c); });
      pal = keep;
    }
  }
  for (let n = 0; n < N; n++) idx[n] = nearest(px(n));
  // Krümel weg: zweimal Mehrheitsfilter 3×3
  for (let pass = 0; pass < 2; pass++) {
    const cp = idx.slice();
    for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
      const cnt = new Uint8Array(pal.length);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) cnt[cp[clamp(j + dj, 0, TH - 1) * TW + clamp(i + di, 0, TW - 1)]]++;
      let b = cp[j * TW + i]; cnt.forEach((c, k) => { if (c > cnt[b]) b = k; }); if (cnt[b] >= 5) idx[j * TW + i] = b;
    }
  }
  // Farben etwas kräftiger (wie gedruckt)
  pal = pal.map((c) => { const m = (c[0] + c[1] + c[2]) / 3; return c.map((v) => clamp(m + (v - m) * 1.2, 0, 255)); });
  // Sichtbarkeit glätten (Mehrheit 3×3) und Löcher in der Mitte der Spalte schließen (Muster in Untergrundfarbe, z. B. weißes Logo auf weißem Tisch)
  const vm = vis.slice();
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    let n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) n += vis[clamp(j + dj, 0, TH - 1) * TW + clamp(i + di, 0, TW - 1)];
    vm[j * TW + i] = n >= 5 ? 1 : 0;
  }
  const ext = [];   // je Spalte: halbe sichtbare Breite (symmetrisch zur Mitte) → Umriss
  for (let i = 0; i < TW; i++) {
    let a = -1, b = -1; for (let j = 0; j < TH; j++) if (vm[j * TW + i]) { if (a < 0) a = j; b = j; }
    if (a >= 0) for (let j = a; j <= b; j++) vm[j * TW + i] = 1;
    ext.push(a < 0 ? 0 : Math.max(TH / 2 - a, b + 1 - TH / 2) / (TH / 2));
  }
  // auf die sichtbare Höhe zuschneiden, damit Muster und Umriss gleich groß gezeichnet werden
  const E = Math.max(...ext);
  if (E < 0.2) return { w: TW, h: TH, pal, idx, alpha: vm, outline: null, E: 1 };
  const r0 = Math.max(0, Math.floor(TH / 2 * (1 - E))), r1 = Math.min(TH, Math.ceil(TH / 2 * (1 + E))), h2 = r1 - r0;
  return { w: TW, h: h2, pal, idx: idx.slice(r0 * TW, r1 * TW), alpha: vm.slice(r0 * TW, r1 * TW), outline: flightOutline(ext), E };
}

/* Eigener Dart aus einem Foto: Dart auf einen ruhigen Untergrund legen (schwarz, weiß, braun …), fotografieren →
   die App findet den Dart, dreht ihn waagerecht (Flight links, Spitze rechts), stellt ihn frei und zeichnet ihn im Stil der App nach:
   Helligkeit in wenigen Stufen der App-Farben (Navy · Stahl · Silber · Gold-Hell) – so bleiben Barrel-Ringe, Schaft und Flight-Muster
   (z. B. ein X) erkennbar –, dazu eine feine Goldkontur. Ergebnis: kleines PNG (transparent) als data-URL.
   Kern ohne DOM (ImageData-artige Objekte { width, height, data }), damit er testbar ist. */

const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Hintergrundfarbe = Median der Randpixel; Maske = Pixel, die deutlich davon abweichen */
export function segment(img) {
  const { width: w, height: h, data: d } = img;
  const border = [];
  const m = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= m && y >= m && x < w - m && y < h - m) { x = w - m - 1; continue; }
    const i = (y * w + x) * 4; border.push([d[i], d[i + 1], d[i + 2]]);
  }
  const med = [0, 1, 2].map((k) => { const v = border.map((p) => p[k]).sort((a, b) => a - b); return v[v.length >> 1]; });
  const dist = (i) => Math.hypot(d[i] - med[0], d[i + 1] - med[1], d[i + 2] - med[2]);
  const bd = border.map((p) => Math.hypot(p[0] - med[0], p[1] - med[1], p[2] - med[2])).sort((a, b) => a - b);
  const thr = Math.max(38, bd[Math.floor(bd.length * 0.95)] * 1.6);
  const mask = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) mask[p] = dist(p * 4) > thr ? 1 : 0;
  return { mask: largest(clean(mask, w, h), w, h), bg: med };
}

/** Lücken schließen (kein Öffnen: das würde die dünne Spitze wegfressen; Krümel entfernt danach die größte-Fläche-Auswahl) */
function morph(mask, w, h, grow) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = grow ? 0 : 1;
    for (let dy = -1; dy <= 1 && (grow ? !v : v); dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : mask[yy * w + xx];
      if (grow && s) { v = 1; break; }
      if (!grow && !s) { v = 0; break; }
    }
    out[y * w + x] = v;
  }
  return out;
}
const clean = (m, w, h) => morph(morph(m, w, h, true), w, h, false);

/** Größte zusammenhängende Fläche = der Dart */
function largest(mask, w, h) {
  const lab = new Int32Array(w * h); let best = 0, bestN = 0, id = 0;
  const stack = [];
  for (let p = 0; p < w * h; p++) {
    if (!mask[p] || lab[p]) continue;
    id++; let n = 0; stack.push(p); lab[p] = id;
    while (stack.length) {
      const q = stack.pop(); n++;
      const x = q % w, y = (q / w) | 0;
      for (const [xx, yy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const r = yy * w + xx; if (mask[r] && !lab[r]) { lab[r] = id; stack.push(r); }
      }
    }
    if (n > bestN) { bestN = n; best = id; }
  }
  const out = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) out[p] = lab[p] === best ? 1 : 0;
  return out;
}

/** Hauptachse (PCA) der Maske → Winkel, Mittelpunkt */
export function axis(mask, w) {
  let n = 0, mx = 0, my = 0;
  for (let p = 0; p < mask.length; p++) if (mask[p]) { n++; mx += p % w; my += (p / w) | 0; }
  if (!n) return null;
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let p = 0; p < mask.length; p++) if (mask[p]) { const x = p % w - mx, y = ((p / w) | 0) - my; sxx += x * x; syy += y * y; sxy += x * y; }
  return { cx: mx, cy: my, angle: 0.5 * Math.atan2(2 * sxy, sxx - syy), n };
}

/**
 * Dart waagerecht ausrichten und freistellen. → { width, height, data (RGBA), alpha (Uint8Array) }
 * Flight (die breiteste Stelle) kommt nach links, die Spitze nach rechts.
 */
export function straighten(img, mask) {
  const { width: w, height: h, data: d } = img;
  const ax = axis(mask, w);
  if (!ax || ax.n < 60) return null;
  const c = Math.cos(ax.angle), s = Math.sin(ax.angle);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let p = 0; p < mask.length; p++) if (mask[p]) {
    const x = p % w - ax.cx, y = ((p / w) | 0) - ax.cy, u = x * c + y * s, v = -x * s + y * c;
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
  }
  const pad = 2, W = Math.ceil(u1 - u0) + pad * 2, H = Math.ceil(v1 - v0) + pad * 2;
  const out = new Uint8ClampedArray(W * H * 4), alpha = new Uint8Array(W * H), thick = new Float64Array(W);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const u = X - pad + u0, v = Y - pad + v0;
    const x = Math.round(ax.cx + u * c - v * s), y = Math.round(ax.cy + u * s + v * c);
    if (x < 0 || y < 0 || x >= w || y >= h || !mask[y * w + x]) continue;
    const i = (y * w + x) * 4, o = (Y * W + X) * 4;
    out[o] = d[i]; out[o + 1] = d[i + 1]; out[o + 2] = d[i + 2]; out[o + 3] = 255; alpha[Y * W + X] = 1; thick[X]++;
  }
  // Flight = breiteste Stelle: liegt sie rechts, spiegeln (Flight links, Spitze rechts)
  let maxX = 0; for (let X = 1; X < W; X++) if (thick[X] > thick[maxX]) maxX = X;
  if (maxX > W / 2) {
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W >> 1; X++) {
      const a = (Y * W + X), b = (Y * W + (W - 1 - X));
      [alpha[a], alpha[b]] = [alpha[b], alpha[a]];
      for (let k = 0; k < 4; k++) { const t = out[a * 4 + k]; out[a * 4 + k] = out[b * 4 + k]; out[b * 4 + k] = t; }
    }
    thick.reverse();
  }
  return { width: W, height: H, data: out, alpha, thick: [...thick] };
}

/** Farbstufen der App (dunkel → hell) */
export const TONES = [[15, 27, 46], [74, 93, 115], [200, 204, 208], [240, 217, 140]];

/** Im App-Stil nachzeichnen: Helligkeit in Stufen (nach Quantilen des Darts) + Goldkontur am Rand */
export function stylize(st) {
  const { width: W, height: H, data, alpha } = st;
  const ls = [];
  for (let p = 0; p < W * H; p++) if (alpha[p]) ls.push(lum(data, p * 4));
  ls.sort((a, b) => a - b);
  const q = [0.28, 0.6, 0.86].map((f) => ls[Math.floor(ls.length * f)] ?? 128);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    if (!alpha[p]) continue;
    const x = p % W, y = (p / W) | 0;
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !alpha[p - 1] || !alpha[p + 1] || !alpha[p - W] || !alpha[p + W];
    const L = lum(data, p * 4), k = L < q[0] ? 0 : L < q[1] ? 1 : L < q[2] ? 2 : 3;
    const c = edge ? [212, 166, 58] : TONES[k];
    out[p * 4] = c[0]; out[p * 4 + 1] = c[1]; out[p * 4 + 2] = c[2]; out[p * 4 + 3] = 255;
  }
  return { width: W, height: H, data: out };
}

/* ---------- Im Browser: Foto → fertiges PNG (data-URL) ---------- */
export async function dartFromFile(file) {
  // createImageBitmap kann manche iPhone-Fotos (HEIC) nicht – dann über ein <img>
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch {
    bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Foto konnte nicht gelesen werden')); im.src = URL.createObjectURL(file); });
  }
  const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const cw = Math.round(bmp.width * scale), ch = Math.round(bmp.height * scale);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0, cw, ch);
  const img = cx.getImageData(0, 0, cw, ch);
  const { mask } = segment(img);
  const st = straighten(img, mask);
  if (!st || st.width < 40) throw new Error('Kein Dart erkannt. Leg ihn auf einen ruhigen, einfarbigen Untergrund und fotografiere ihn von oben.');
  const sy = stylize(st);
  // auf 600 px Länge bringen
  const tmp = document.createElement('canvas'); tmp.width = sy.width; tmp.height = sy.height;
  tmp.getContext('2d').putImageData(new ImageData(sy.data, sy.width, sy.height), 0, 0);
  const L = 600, f = L / sy.width;
  const out = document.createElement('canvas'); out.width = L; out.height = Math.max(8, Math.round(sy.height * f));
  const ox = out.getContext('2d'); ox.imageSmoothingEnabled = true; ox.drawImage(tmp, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

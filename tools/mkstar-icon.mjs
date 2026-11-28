/* App-Icon aus dem Start-Logo (Chrom-Stern, alle vier Arme gleich lang, hell silbern mit Schein) als PNG –
   ohne Grafikprogramm: Pfad wie chromeStarPath (svg.js) abtasten, 4×4-Überabtastung, Chrom-Verlauf, weicher Schein, PNG über zlib.
   Aufruf: node tools/mkstar-icon.mjs  → dartvader-180.png, dartvader-512.png, dartvader.svg, favicon.ico */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [10, 10, 12];
// Chrom-Verlauf diagonal (wie chromeStar in svg.js)
const STOPS = [[0, [255, 255, 255]], [0.28, [228, 231, 236]], [0.46, [150, 155, 164]], [0.55, [250, 251, 253]], [0.7, [190, 195, 203]], [1, [255, 255, 255]]];
const grad = (t) => {
  t = Math.max(0, Math.min(1, t));
  let i = 1; while (i < STOPS.length - 1 && STOPS[i][0] < t) i++;
  const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], f = (t - a) / (b - a || 1);
  return ca.map((v, k) => v + (cb[k] - v) * f);
};

/** Stern als Polygon (wie chromeStarPath: kubische Kurven mit konkaven Flanken) */
function starPoly(cx, cy, up, right, down, left, w = 0.16) {
  const k = (a, b) => Math.min(a, b) * w;
  const segs = [
    [[0, -up], [k(up, right) * 0.25, -k(up, right) * 1.2], [k(up, right) * 1.2, -k(up, right) * 0.25], [right, 0]],
    [[right, 0], [k(down, right) * 1.2, k(down, right) * 0.25], [k(down, right) * 0.25, k(down, right) * 1.2], [0, down]],
    [[0, down], [-k(down, left) * 0.25, k(down, left) * 1.2], [-k(down, left) * 1.2, k(down, left) * 0.25], [-left, 0]],
    [[-left, 0], [-k(up, left) * 1.2, -k(up, left) * 0.25], [-k(up, left) * 0.25, -k(up, left) * 1.2], [0, -up]],
  ];
  const pts = [];
  for (const [p0, p1, p2, p3] of segs) for (let i = 0; i < 64; i++) {
    const t = i / 64, u = 1 - t;
    pts.push([cx + u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      cy + u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return pts;
}
const inside = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const distTo = (pts, x, y) => {
  let d = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
};

function render(S) {
  const c = S / 2, up = S * 0.33, side = up;
  const pts = starPoly(c, c, up, side, up, side);
  const px = Buffer.alloc(S * S * 3);
  const glowR = S * 0.075;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let cov = 0, col = [0, 0, 0];
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const X = x + (sx + 0.5) / 4, Y = y + (sy + 0.5) / 4;
      if (inside(pts, X, Y)) {
        cov++;
        const g = grad((X + Y) / (2 * S) * 1.1 - 0.05);
        // heller Kern in der Mitte
        const r = Math.hypot(X - c, Y - c) / (side * 0.6), h = Math.max(0, 1 - r) ** 2 * 0.7;
        col = col.map((v, k) => v + Math.min(255, g[k] + (255 - g[k]) * h));
      }
    }
    let out;
    if (cov === 16) out = col.map((v) => v / 16);
    else {
      // weicher weißer Schein um den Stern (+ ganz leichtes Bordeaux weiter außen)
      const d = cov ? 0 : distTo(pts, x + 0.5, y + 0.5);
      const glow = cov ? 0 : Math.exp(-d / glowR) * 0.75, bord = cov ? 0 : Math.exp(-d / (S * 0.18)) * 0.12;
      const base = BG.map((v, k) => v + (255 - v) * glow + ([122, 20, 48][k] - v) * bord);
      out = base.map((v, k) => (v * (16 - cov) + col[k]) / 16);
    }
    const o = (y * S + x) * 3; px[o] = out[0]; px[o + 1] = out[1]; px[o + 2] = out[2];
  }
  return png(S, S, px);
}

function png(w, h, rgb) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('dartvader-180.png', render(180));
writeFileSync('dartvader-512.png', render(512));
{ const p = render(64), h = Buffer.alloc(22); h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);
  h[6] = 64; h[7] = 64; h[8] = 0; h[9] = 0; h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12); h.writeUInt32LE(p.length, 14); h.writeUInt32LE(22, 18);
  writeFileSync('favicon.ico', Buffer.concat([h, p])); }
// Favicon als SVG (gleiche Form)
const pts = starPoly(32, 32, 22, 22, 22, 22);
writeFileSync('dartvader.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${STOPS.map(([o, c]) => `<stop offset="${o}" stop-color="rgb(${c.join(',')})"/>`).join('')}</linearGradient></defs><defs><radialGradient id="h"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" rx="14" fill="#0a0a0c"/><circle cx="32" cy="32" r="26" fill="url(#h)"/><path d="M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z" fill="url(#g)" stroke="#fff" stroke-width=".6"/></svg>\n`);
console.log('dartvader-180.png, dartvader-512.png, dartvader.svg, favicon.ico geschrieben');

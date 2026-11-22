import assert from 'node:assert/strict';
import { Detector, dartAxis, components, bestShift, mergeDart } from '../js/detect-core.js';
import { homography, CALIB_TARGETS } from '../js/homography.js';

const W = 200, Hh = 200;
// Ausschnitt: Board-Mitte bei (100,100), 85 px = 170 mm → 1 px = 2 mm
const H = homography([[100, 15], [185, 100], [100, 185], [15, 100]], CALIB_TARGETS);
const blank = () => new Uint8Array(W * Hh).fill(120);
/** Dart: Spitze bei (tx,ty), dünner Schaft nach rechts unten, breite Flight am Ende */
function drawDart(img, tx, ty) {
  for (let k = 0; k <= 34; k++) {
    const x = tx + k * 0.8, y = ty + k * 0.6, half = k < 22 ? 1 : 4;
    for (let d = -half; d <= half; d++) img[Math.round(y + d * 0.8) * W + Math.round(x - d * 0.6)] = 30;
  }
  return img;
}

test('Erkennung: Spitze am schmalen Ende der Hauptachse', () => {
  const img = drawDart(blank(), 100, 48);
  const m = img.map((v) => (v < 60 ? 1 : 0));
  const ax = dartAxis(components(m, W, Hh)[0], W);
  assert.ok(Math.hypot(ax.tip[0] - 100, ax.tip[1] - 48) < 2.5, `Spitze bei ${ax.tip}`);
  assert.ok(ax.elong > 2);
});

test('Erkennung: Ruhe → Dart (T20) → zweiter Dart → Darts ziehen', () => {
  const d = new Detector(W, Hh, H, null, { stableMs: 300 });
  let t = 0;
  const run = (img, n = 6) => { const ev = []; for (let i = 0; i < n; i++) { const r = d.feed(img, (t += 120)); if (r.event) ev.push(r); } return ev; };
  run(blank());
  const one = drawDart(blank(), 100, 48);           // 52 px über der Mitte = 104 mm → Triple 20
  run(blank().fill(40), 1);                         // Arm im Bild → Bewegung
  const e1 = run(one);
  assert.equal(e1.length, 1); assert.equal(e1[0].event, 'dart'); assert.equal(e1[0].score.label, 'T20');
  assert.ok(e1[0].confidence > 0 && e1[0].confidence <= 1);
  const two = drawDart(one.slice(), 60, 100);       // links: 40 px = 80 mm → S11
  run(blank().fill(40), 1);
  const e2 = run(two);
  assert.equal(e2.length, 1); assert.equal(e2[0].score.label, 'S11');
  run(blank().fill(40), 1);
  const e3 = run(blank());                          // Darts gezogen → wieder leeres Board
  assert.deepEqual(e3.map((e) => e.event), ['takeout']);
});

test('Erkennung: verschobenes Bild wird als verschoben erkannt', () => {
  const a = blank(); for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) a[y * W + x] = (x * 7 + y * 3) % 255;
  const b = blank(); for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) b[y * W + x] = a[y * W + Math.min(W - 1, x + 4)];
  const s = bestShift(a, b, W, Hh);
  assert.equal(s.dx, -4); assert.ok(s.gain > 0.5);
});

test('Erkennung: Dart ohne erkennbare Bewegung wird trotzdem gefunden, Helligkeit wird ausgeglichen', () => {
  const d = new Detector(W, Hh, H, null, { stableMs: 300 });
  let t = 0;
  for (let i = 0; i < 6; i++) d.feed(blank(), (t += 120));
  // Kamera regelt etwas heller nach + kleiner Dart, ohne dass vorher Bewegung erkannt wurde
  const lit = drawDart(blank().fill(130), 100, 48);
  const ev = []; for (let i = 0; i < 12; i++) { const r = d.feed(lit, (t += 120)); if (r.event) ev.push(r); }
  assert.equal(ev.length, 1); assert.equal(ev[0].score.label, 'T20');
});

test('Erkennung: liegt das breite Ende auf dem Board und das schmale daneben, zählt das Ende auf dem Board', () => {
  const d = new Detector(W, Hh, H, null, { stableMs: 300 });
  let t = 0;
  for (let i = 0; i < 6; i++) d.feed(blank(), (t += 120));
  // „Dart“ im Bull: dickes Ende in der Mitte, dünner Strich weit nach außen (über den Rand hinaus)
  const img = blank();
  for (let k = 0; k <= 80; k++) { const x = 100 + k, half = k < 20 ? 3 : 0; for (let dy = -half; dy <= half; dy++) img[(100 + dy) * W + x] = 30; }
  const ev = []; for (let i = 0; i < 12; i++) { const r = d.feed(img, (t += 120)); if (r.event) ev.push(r); }
  assert.equal(ev.length, 1); assert.notEqual(ev[0].score.label, 'MISS');
});

test('Erkennung: Dart in Stücken (Flight getrennt vom Barrel) → zusammengefasst, Spitze gegenüber der Flight', () => {
  const img = blank();
  // Barrel: dünn, von (100,48) nach rechts unten; Lücke (Schaft fehlt); Flight: breit weiter hinten
  for (let k = 0; k <= 14; k++) img[Math.round(48 + k * 0.6) * W + Math.round(100 + k * 0.8)] = 30;
  for (let k = 22; k <= 34; k++) for (let d = -5; d <= 5; d++) img[Math.round(48 + k * 0.6 + d * 0.8) * W + Math.round(100 + k * 0.8 - d * 0.6)] = 30;
  const m = img.map((v) => (v < 60 ? 1 : 0));
  const comps = components(m, W, Hh);
  assert.ok(comps.length >= 2);
  const ax = dartAxis(mergeDart(comps, W), W);
  assert.ok(Math.hypot(ax.tip[0] - 100, ax.tip[1] - 48) < 3, `Spitze bei ${ax.tip}`);
});

test('Feinstufe: Spitze im Vollbild-Ausschnitt auf Subpixel genau (Rauschen, Unschärfe, Flight im Bild)', async () => {
  const { refineTip } = await import('../js/detect-core.js');
  const W2 = 160, H2 = 160;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const bg = new Float32Array(W2 * H2).map((_, i) => 110 + ((i * 37) % 23));
  const errs = [];
  for (let trial = 0; trial < 12; trial++) {
    const tx = 50 + rnd() * 20, ty = 90 + rnd() * 20, a = -0.5 - rnd() * 0.4, ux = Math.cos(a), uy = Math.sin(a);
    const cur = new Float32Array(bg), ref = new Float32Array(bg);
    // Spitze (dünn) 10 px, Barrel (5 px breit) 40 px, Flight (breit) danach – weich gezeichnet (Abdeckung je Pixel)
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const ox = x - tx, oy = y - ty, t = ox * ux + oy * uy, s = Math.abs(-ox * uy + oy * ux);
      const half = t < 10 ? 0.5 + t * 0.08 : t < 50 ? 2.5 : t < 80 ? 9 : -1;
      const cov = Math.max(0, Math.min(1, half + 0.5 - s)) * Math.max(0, Math.min(1, t + 0.5));
      cur[y * W2 + x] = cur[y * W2 + x] * (1 - cov) + 30 * cov;
    }
    for (let i = 0; i < cur.length; i++) { cur[i] += (rnd() - 0.5) * 8; ref[i] += (rnd() - 0.5) * 8; }
    const r = refineTip(cur, ref, W2, H2, [tx + 4 * ux + 2, ty + 4 * uy - 2], [ux, uy], rnd);
    assert.ok(r.ok, 'Feinstufe ohne Ergebnis');
    errs.push(Math.hypot(r.tip[0] - tx, r.tip[1] - ty));
  }
  const mean = errs.reduce((a, b) => a + b, 0) / errs.length, max = Math.max(...errs);
  assert.ok(mean < 1.0 && max < 2.0, `Fehler Spitze: mittel ${mean.toFixed(2)} px, max ${max.toFixed(2)} px`);
});

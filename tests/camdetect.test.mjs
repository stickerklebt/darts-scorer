import assert from 'node:assert/strict';
import { homography, project, changeBlob, fieldOf, CALIB_TARGETS, step, boardMask } from '../js/camdetect.js';

test('Kamera: Homographie bildet die 4 Kalibrierpunkte genau auf die Scheibe ab', () => {
  const src = [[100, 20], [180, 95], [104, 170], [22, 92]]; // leicht schräg aufgenommen
  const H = homography(src, CALIB_TARGETS);
  src.forEach(([x, y], i) => { const [u, v] = project(H, x, y); assert.ok(Math.abs(u - CALIB_TARGETS[i][0]) < 1e-6 && Math.abs(v - CALIB_TARGETS[i][1]) < 1e-6); });
});

test('Kamera: neue Änderung im Bild → Spitze oben → richtiges Feld; Darts ziehen setzt zurück', () => {
  const w = 200, h = 200, H = homography([[100, 15], [185, 100], [100, 185], [15, 100]], CALIB_TARGETS);
  const empty = new Uint8Array(w * h).fill(120);
  // Dart: Spitze im Triple 20 (oben, Radius ~103 mm → Bild y ≈ 100 - 103/170*85 ≈ 48), Schaft nach unten
  const withDart = empty.slice();
  for (let y = 48; y < 60; y++) for (let x = 98; x < 102; x++) withDart[y * w + x] = 20;
  const blob = changeBlob(empty, withDart, w, h);
  assert.ok(Math.abs(blob.tip[1] - 48) < 1.5);
  assert.deepEqual((({ n, m }) => ({ n, m }))(fieldOf(H, blob.tip[0], blob.tip[1])), { n: 20, m: 3 });
  const mask = boardMask(H, w, h), st = { ref: null, prev: null, still: 0, darts: [] };
  step(st, empty, w, h, H, mask); step(st, empty, w, h, H, mask); step(st, empty, w, h, H, mask);
  const ev = []; for (let i = 0; i < 3; i++) ev.push(step(st, withDart, w, h, H, mask).event);
  assert.deepEqual(ev.filter(Boolean), ['dart']); assert.equal(st.darts[0].n, 20);  // genau einmal gemeldet
  const pulled = new Uint8Array(w * h).fill(40); // jemand steht vor der Scheibe
  const ev2 = []; for (let i = 0; i < 3; i++) ev2.push(step(st, pulled, w, h, H, mask).event);
  assert.ok(ev2.includes('clear')); assert.equal(st.darts.length, 0);
});

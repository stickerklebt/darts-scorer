import assert from 'node:assert/strict';
import { scoreFromBoardMM, wireDistance, ORDER } from '../js/board-geometry.js';
import { homography, project, calibrate, CALIB_TARGETS } from '../js/homography.js';

const at = (deg, r) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

test('Board: Mittelpunkt, Bull-Grenzen, Ringe', () => {
  assert.equal(scoreFromBoardMM(0, 0).label, 'BULL');
  assert.equal(scoreFromBoardMM(...at(0, 6.35)).label, 'BULL');
  assert.equal(scoreFromBoardMM(...at(0, 6.4)).label, '25');
  assert.equal(scoreFromBoardMM(...at(0, 15.9)).label, '25');
  assert.equal(scoreFromBoardMM(...at(0, 16)).label, 'S20');
  assert.equal(scoreFromBoardMM(...at(0, 98.9)).label, 'S20');
  assert.equal(scoreFromBoardMM(...at(0, 99)).label, 'T20');
  assert.equal(scoreFromBoardMM(...at(0, 107)).label, 'T20');
  assert.equal(scoreFromBoardMM(...at(0, 107.1)).label, 'S20');
  assert.equal(scoreFromBoardMM(...at(0, 162)).label, 'D20');
  assert.equal(scoreFromBoardMM(...at(0, 170)).label, 'D20');
  assert.equal(scoreFromBoardMM(...at(0, 170.1)).label, 'MISS');
  assert.deepEqual((({ segment, multiplier, points }) => ({ segment, multiplier, points }))(scoreFromBoardMM(...at(0, 103))), { segment: 20, multiplier: 3, points: 60 });
});

test('Board: alle 20 Segmente in der Mitte und an den Grenzen (±9°)', () => {
  ORDER.forEach((n, i) => {
    assert.equal(scoreFromBoardMM(...at(i * 18, 130)).segment, n);
    assert.equal(scoreFromBoardMM(...at(i * 18 + 8.9, 130)).segment, n);
    assert.equal(scoreFromBoardMM(...at(i * 18 - 8.9, 130)).segment, n);
    assert.equal(scoreFromBoardMM(...at(i * 18 + 9.1, 130)).segment, ORDER[(i + 1) % 20]);
  });
  assert.equal(scoreFromBoardMM(170, 0).label, 'D6');
  assert.equal(scoreFromBoardMM(0, 165).label, 'D3');
  assert.equal(scoreFromBoardMM(-165, 0).label, 'D11');
});

test('Board: Abstand zum Draht', () => {
  assert.ok(wireDistance(...at(0, 103)) > 3.5);
  assert.ok(wireDistance(...at(9, 130)) < 0.01);
  assert.ok(Math.abs(wireDistance(...at(0, 100)) - 1) < 1e-9);
});

test('Homographie: bekannte Punkte → erwartete Board-Koordinaten, hin und zurück', () => {
  const img = [[512, 80], [900, 400], [520, 760], [130, 390]];
  const { toBoard, toImage } = calibrate(img);
  img.forEach(([x, y], i) => { const [u, v] = project(toBoard, x, y); assert.ok(Math.hypot(u - CALIB_TARGETS[i][0], v - CALIB_TARGETS[i][1]) < 1e-6); });
  const [cx, cy] = project(toImage, 0, 0), [bx, by] = project(toBoard, cx, cy);
  assert.ok(Math.hypot(bx, by) < 1e-6);
  assert.equal(homography([[0, 0], [1, 1], [2, 2], [3, 3]], CALIB_TARGETS), null); // entartet
});

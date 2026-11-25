import assert from 'node:assert/strict';
import { TUNE, introPlan, span, lerpRect, ease } from '../js/intro-config.js';

test('Intro: Zeitplan voll ~3,5 s, kurz ~1,5 s, slow = 4-fach; Hilfsfunktionen', () => {
  const f = introPlan('full'), s = introPlan('short'), sl = introPlan('full', 4);
  assert.ok(f.total > 3.2 && f.total < 4, `voll ${f.total}`);
  assert.ok(s.total > 1.2 && s.total < 1.8, `kurz ${s.total}`);
  assert.equal(sl.gather[1], f.gather[1] * 4);
  assert.ok(f.digits >= f.gather[1], '501 erst nach der Übergabe des Stoffs an die Kachel');
  assert.equal(span(5, 2, 4), 1); assert.equal(span(1, 2, 4), 0); assert.equal(span(3, 2, 4), 0.5);
  assert.deepEqual(lerpRect({ x: 0, y: 0, w: 10, h: 10, r: 0 }, { x: 10, y: 10, w: 20, h: 30, r: 8 }, 0.5), { x: 5, y: 5, w: 15, h: 20, r: 4 });
  assert.equal(ease.inOut(0), 0); assert.equal(ease.inOut(1), 1);
  assert.match(TUNE.silkUrl, /assets\/intro\/silk\./);
});

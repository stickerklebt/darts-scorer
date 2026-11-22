import assert from 'node:assert/strict';
import { fuseThrows } from '../js/camfuse.js';

test('Zwei Kameras: gleiches Feld wird sicherer, verschiedene Felder werden geprüft', () => {
  const a = { label: 'T20', segment: 20, multiplier: 3, boardX: 0, boardY: -103, confidence: 0.7 };
  const b = { label: 'T20', segment: 20, multiplier: 3, boardX: 1, boardY: -104, confidence: 0.8 };
  const f = fuseThrows([a, b]);
  assert.equal(f.label, 'T20'); assert.ok(f.confidence > 0.9);
  const c = { label: 'S20', segment: 20, multiplier: 1, boardX: 0, boardY: -112, confidence: 0.4 };
  const d = { label: 'T20', segment: 20, multiplier: 3, boardX: 0, boardY: -103, confidence: 0.9 };
  assert.equal(fuseThrows([c, d]).label, 'T20');                 // deutlich sicherere Kamera gewinnt
  const e = fuseThrows([{ ...c, confidence: 0.6 }, { ...d, confidence: 0.6 }]);
  assert.ok(e.confidence < 0.7);                                 // uneinig → gelb, bitte prüfen
});

import assert from 'node:assert/strict';
import { trimNormalize, encodeWav, wavDuration, peaksOf } from '../js/caller.js';

test('Caller: Stille abschneiden, normalisieren, WAV schreiben', () => {
  const rate = 1000, d = new Float32Array(3000);
  for (let i = 1000; i < 2000; i++) d[i] = 0.25 * Math.sin(i / 3);
  const out = trimNormalize(d, rate);
  assert.ok(out.length > 1000 && out.length < 1200, `Länge ${out.length}`);
  const peak = Math.max(...out.map(Math.abs));
  assert.ok(Math.abs(peak - 0.9) < 0.02, `Spitze ${peak}`);
  const wav = encodeWav(out, rate);
  assert.equal(Buffer.from(wav).toString('ascii', 0, 4), 'RIFF');
  assert.ok(Math.abs(wavDuration(wav) - out.length / rate) < 1e-9);
  assert.equal(peaksOf(out, 10).length, 10);
  assert.equal(trimNormalize(new Float32Array(500), rate).length, 0); // nur Stille → nichts
});

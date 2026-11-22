import assert from 'node:assert/strict';
import { parseScores, wordNumber } from '../js/voice.js';

test('Mikrofon: Zahlen als Ziffern und Wörter, Bust/nichts/null = 0, alles andere ignoriert', () => {
  assert.deepEqual(parseScores('37'), [37]);
  assert.deepEqual(parseScores('Ich hab 52 geworfen, dann 100'), [52, 100]);
  assert.deepEqual(parseScores('Bust'), [0]);
  assert.deepEqual(parseScores('nichts'), [0]);
  assert.deepEqual(parseScores('Null'), [0]);
  assert.deepEqual(parseScores('siebenunddreißig'), [37]);
  assert.deepEqual(parseScores('hundertvierzig'), [140]);
  assert.deepEqual(parseScores('einhundertachtzig'), [180]);
  assert.deepEqual(parseScores('kein Score'), [0]);
  assert.deepEqual(parseScores('was geht ab heute'), []);
  assert.deepEqual(parseScores('250'), []);
  assert.equal(wordNumber('neunundneunzig'), 99);
  assert.equal(wordNumber('hundertundeins'), 101);
});

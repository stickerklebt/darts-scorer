import assert from 'node:assert/strict';
import { parseScores, wordNumber, parseDarts } from '../js/voice.js';

test('Mikrofon: Zahlen als Ziffern und Wörter, Bust/nichts/null = 0, alles andere ignoriert', () => {
  assert.deepEqual(parseScores('37'), [37]);
  assert.deepEqual(parseScores('1'), [1]);
  assert.deepEqual(parseScores('Eins'), [1]);
  assert.deepEqual(parseScores('eins, eins, eins'), [1, 1, 1]);
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

test('Mikrofon im Checkout: Dart für Dart mit Single/Double/Doppel/Triple, Bull, daneben', () => {
  assert.deepEqual(parseDarts('Triple 20, Single 5, Double 16'), [{ n: 20, m: 3 }, { n: 5, m: 1 }, { n: 16, m: 2 }]);
  assert.deepEqual(parseDarts('Doppel sechzehn'), [{ n: 16, m: 2 }]);
  assert.deepEqual(parseDarts('T20 D10'), [{ n: 20, m: 3 }, { n: 10, m: 2 }]);
  assert.deepEqual(parseDarts('Bull'), [{ n: 25, m: 2 }]);
  assert.deepEqual(parseDarts('Single Bull'), [{ n: 25, m: 1 }]);
  assert.deepEqual(parseDarts('25'), [{ n: 25, m: 1 }]);
  assert.deepEqual(parseDarts('daneben, 19, Doppel 1'), [{ n: 0, m: 1 }, { n: 19, m: 1 }, { n: 1, m: 2 }]);
  assert.deepEqual(parseDarts('ähm was'), []);
});

test('Mikrofon: unmögliche Aufnahmen (169, 179 …) werden ignoriert, 159/162 gehen', async () => {
  const { parseScores } = await import('../js/voice.js');
  assert.deepEqual(parseScores('169 159 162 163 179 hundertneunundsechzig 180'), [159, 162, 180]);
});

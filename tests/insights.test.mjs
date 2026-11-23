import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import { insights } from '../js/insights.js';

const d = (m, n, mult) => X.throwDart(m, n, mult);

/* Best of 3 (First to 2): a gewinnt Leg 1, b Leg 2 → Leg 3 ist das Entscheidungsleg und hat Matchdarts.
   Kurze Legs mit Start 40 (alles Doppelversuche). */
function bo3(t0) {
  const m = createMatch('x01', [['a'], ['b']], { start: 40, out: 'double', mode: 'legs', target: 2 }, 0, t0);
  d(m, 20, 2);                                   // Leg 1: a checkt D20 (Matchdart? nein, a hat 0 Legs)
  d(m, 0, 1); d(m, 0, 1); d(m, 0, 1);            // Leg 2 (b fängt an): b drei Fehlwürfe
  d(m, 10, 1); d(m, 0, 1); d(m, 0, 1);           // a: S10 (Rest 30), danach 2 Fehlwürfe auf D15 → Matchdarts
  d(m, 20, 2);                                   // b checkt → 1:1
  d(m, 20, 2);                                   // Leg 3 (a fängt an): a checkt D20 = Matchdart getroffen
  m.endedAt = t0;
  return m;
}

test('Auffällig: Matchdarts gegenüber normalen Legdarts, Entscheidungsleg', () => {
  const m = bo3(new Date(2026, 10, 20, 23).getTime());
  assert.equal(m.done, true); assert.deepEqual(m.winners, [0]);
  const r = insights([m, m, m, m, m, m], 'a');   // 6× dasselbe Match, damit die Mindestmengen erreicht sind
  // Matchdarts von a: Leg 2 (a hätte mit Leg 2 gewonnen): D20 bei 40 verfehlt? – nein: S10 ist Versuch auf D20, dann 2 auf D15; Leg 3: D20 Treffer
  assert.equal(r.matchdart.mdA, 6 * 4); assert.equal(r.matchdart.md, 1 / 4);
  assert.equal(r.matchdart.otherA, 6 * 1); assert.equal(r.matchdart.other, 1);
  assert.equal(r.decider, null);                 // nur 6 Aufnahmen im Entscheidungsleg (< 10)
  const r2 = insights(Array(12).fill(m), 'a');
  assert.equal(r2.decider.n, 12); assert.equal(Math.round(r2.decider.avg), 120); // 40 Punkte mit 1 Dart
});

test('Auffällig: erster Versuch oder Nachwerfen, Tageszeit, Wochentag', () => {
  const m = bo3(new Date(2026, 10, 20, 23).getTime()); // Freitag, 23 Uhr = nachts
  const r = insights(Array(8).fill(m), 'a');
  // a: Leg 1 D20 erster Versuch Treffer · Leg 2 S10 erster Versuch daneben, dann 2× Nachwerfen daneben · Leg 3 erster Versuch Treffer
  assert.equal(r.firstTry.first, 2 / 3); assert.equal(r.firstTry.retry, 0);
  assert.equal(r.daytime, null);                // nur eine Tageszeit
  assert.equal(r.weekday, null);
  const m2 = bo3(new Date(2026, 10, 22, 10).getTime()); // Sonntag, 10 Uhr
  const r2 = insights([...Array(8).fill(m), ...Array(8).fill(m2)], 'a');
  assert.ok(r2.daytime.best && r2.daytime.night); assert.equal(r2.weekday.best.n >= 10, true);
});

test('Auffällig: Bust-Schock = Aufnahme direkt nach einem Bust', () => {
  const t0 = Date.now();
  const ms = [];
  for (let k = 0; k < 6; k++) {
    const m = createMatch('x01', [['a']], { start: 32, out: 'double', mode: 'legs', target: 1 }, 0, t0);
    d(m, 20, 2);                                   // Bust (40 > 32)
    d(m, 8, 1); d(m, 0, 1); d(m, 0, 1);            // nach dem Bust: 8 Punkte
    d(m, 12, 2);                                   // Check
    m.endedAt = t0; ms.push(m);
  }
  const r = insights(ms, 'a');
  assert.equal(r.bust.n, 6); assert.equal(r.bust.avg, 8);
});

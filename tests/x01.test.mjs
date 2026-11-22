import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';

const OPTS = { start: 501, out: 'double', mode: 'legs', target: 1 };
const D = (tok) => { // 'T20' → [20,3], 'Bull' → [25,2], 'Miss' → [0,1]
  if (tok === 'Bull') return [25, 2]; if (tok === '25') return [25, 1]; if (tok === 'Miss') return [0, 1];
  return [Number(tok.slice(1)), { S: 1, D: 2, T: 3 }[tok[0]]];
};
const darts = (m, ...toks) => toks.map((t) => X.throwDart(m, ...D(t))).at(-1);

test('Summen-Eingabe über 170, Einzeldart ab der nächsten Aufnahme', () => {
  const m = createMatch('x01', [['a'], ['b']], OPTS);
  assert.equal(X.inputMode(m), 'sum');
  X.submitSum(m, 140); X.submitSum(m, 100);           // a: 361, b: 401
  X.submitSum(m, 180); X.submitSum(m, 60);            // a: 181, b: 341
  assert.equal(X.inputMode(m), 'sum');                // a steht bei 181 > 170
  X.submitSum(m, 60);                                  // a: 121 – Aufnahme begann bei 181 → Summe ok
  X.submitSum(m, 60);                                  // b: 281
  assert.equal(X.curRem(m), 121);
  assert.equal(X.inputMode(m), 'darts');
  assert.equal(X.submitSum(m, 60).type, 'error');     // Summe jetzt nicht mehr erlaubt
});

test('Einzeldarts: Checkout nur auf Doppel, Bust bei Single-Finish', () => {
  const m = createMatch('x01', [['a']], { ...OPTS, start: 101 });
  let r = darts(m, 'T17', 'S18', 'S32'.replace('S32', 'S16'));  // 51+18+16=85 → Rest 16
  assert.equal(r.type, 'turn'); assert.equal(X.curRem(m), 16);
  r = darts(m, 'S16');                                   // Single auf 0 → Bust
  assert.equal(r.type, 'bust'); assert.equal(X.curRem(m), 16);
  r = darts(m, 'S8', 'D4');                              // 8 + 8 = 16 → Out mit 2 Darts
  assert.equal(r.type, 'match');
  const t = X.leg(m).turns.at(-1);
  assert.equal(t.darts, 2); assert.equal(t.score, 16); assert.ok(t.out);
});

test('Rest 1 ist Bust, Undo stellt Darts einzeln wieder her', () => {
  const m = createMatch('x01', [['a']], { ...OPTS, start: 41 });
  assert.equal(darts(m, 'S20', 'S20').type, 'bust');  // Rest 1
  assert.equal(X.curRem(m), 41);
  assert.ok(X.undo(m));                                  // Bust-Aufnahme zurück → erster Dart bleibt
  assert.equal(m.pending.length, 1);
  assert.equal(X.pendingSum(m), 20);
  assert.ok(X.undo(m)); assert.equal(m.pending.length, 0);
});

test('Ziel und Doppelversuch werden pro Dart gespeichert', () => {
  const m = createMatch('x01', [['a']], { ...OPTS, start: 32 });
  darts(m, 'S16', 'S8', 'D4');                           // Ziel D16 → S16, dann Ziel D8 → S8, dann D4 Treffer
  const th = X.leg(m).turns[0].throws;
  assert.deepEqual(th.map((x) => x.target), ['D16', 'D8', 'D4']);
  assert.deepEqual(th.map((x) => x.before), [32, 16, 8]);
});

test('Sets: Set an den, der zuerst 3 Legs holt; Anwurf wechselt', () => {
  const m = createMatch('x01', [['a'], ['b']], { start: 40, out: 'double', mode: 'sets', target: 2 });
  const winLeg = (winner) => {
    while (X.curSide(m) !== winner) darts(m, 'Miss', 'Miss', 'Miss');
    return darts(m, 'D20');
  };
  const types = [winLeg(0), winLeg(0), winLeg(1), winLeg(0)].map((r) => r.type);
  assert.deepEqual(types, ['leg', 'leg', 'leg', 'set']);
  assert.equal(X.setsWon(m, 0), 1);
  assert.equal(X.leg(m).set, 2);
  assert.equal(X.leg(m).starter, 0); // Legs 1..4 starteten 0,1,0,1 → Leg 5 startet 0
  winLeg(0); winLeg(0);
  assert.equal(winLeg(0).type, 'match');
  assert.deepEqual(m.winners, [0]);
});

test('Teams: Werfer reihum, gemeinsamer Rest, Statistik pro Profil', () => {
  const m = createMatch('x01', [['tim', 'ben', 'andi'], ['lasse']], OPTS);
  const order = [];
  for (let i = 0; i < 8; i++) { order.push(X.curThrower(m)); X.submitSum(m, 26); }
  assert.deepEqual(order, ['tim', 'lasse', 'ben', 'lasse', 'andi', 'lasse', 'tim', 'lasse']);
  assert.equal(X.rem(m, X.leg(m), 0), 501 - 4 * 26);
  assert.equal(X.matchStats(m, { pid: 'tim' }).darts, 6);
  assert.equal(X.matchStats(m, { pid: 'ben' }).darts, 3);
  assert.equal(X.matchStats(m, { s: 0 }).darts, 12);
});

test('Undo über Leg-Grenze hinweg', () => {
  const m = createMatch('x01', [['a'], ['b']], { start: 40, out: 'double', mode: 'legs', target: 3 });
  assert.equal(darts(m, 'D20').type, 'leg');
  assert.equal(m.legs.length, 2);
  X.undo(m);
  assert.equal(m.legs.length, 1);
  assert.equal(X.leg(m).winner, undefined);
  assert.equal(X.curRem(m), 40);
});

test('Mikrofon: Summe auch unter 170 Rest, Finish über die Checkout-Tabelle, „0“ = keine Punkte', () => {
  const m = createMatch('x01', [['a'], ['b']], { start: 101, out: 'double', mode: 'legs', target: 1 }, 0);
  assert.equal(X.submitSum(m, 41).type, 'error');            // ohne Mikrofon: unter 170 nur Einzeldarts
  assert.equal(X.submitSum(m, 41, { voice: true }).type, 'turn');
  assert.equal(X.submitSum(m, 0, { voice: true }).type, 'turn');
  const r = X.submitSum(m, 60, { voice: true });              // a hat 60 Rest → Finish
  assert.equal(r.type, 'match'); assert.equal(r.turn.out, true); assert.equal(r.turn.input, 'voice');
});

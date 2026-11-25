/* Checkout-Wege als feste Tabelle (170–41: Dartcoach-Checkout-Tabelle, D25 = Bull, S25 = 25; 40–2 eigene Tabelle) + Hilfsfunktionen rund um Darts. */

export const val = (d) => d.n * d.m;
export const label = (d) => (d.n === 0 ? 'Miss' : d.n === 25 ? (d.m === 2 ? 'Bull' : '25') : (d.m === 3 ? 'T' : d.m === 2 ? 'D' : 'S') + d.n);
export const isDouble = (d) => d.m === 2;
export function parseDart(tok) {
  if (tok === 'Bull') return { n: 25, m: 2 };
  if (tok === '25') return { n: 25, m: 1 };
  return { n: Number(tok.slice(1)), m: { S: 1, D: 2, T: 3 }[tok[0]] };
}

export const BOGEYS = [159, 162, 163, 165, 166, 168, 169];
/* Bevorzugte Doppel, beste zuerst */
export const DPREF = [20, 16, 8, 18, 12, 10, 14, 6, 4, 19, 17, 15, 13, 11, 9, 7, 5, 25, 3, 2, 1];

/* ---- Tabelle: 3 Darts übrig (2–170, ohne Bogeys) ---- */
const RAW3 = `
170 T20 T20 Bull | 167 T20 T19 Bull | 164 T20 T18 Bull | 161 T20 T17 Bull | 160 T20 T20 D20
158 T20 T20 D19 | 157 T20 T19 D20 | 156 T20 T20 D18 | 155 T20 T19 D19 | 154 T20 T18 D20
153 T20 T19 D18 | 152 T20 T20 D16 | 151 T20 T17 D20 | 150 T20 T18 D18 | 149 T20 T19 D16
148 T20 T16 D20 | 147 T20 T17 D18 | 146 T19 T19 D16 | 145 T19 T20 D14 | 144 T20 T20 D12
143 T20 T17 D16 | 142 T18 T20 D14 | 141 T20 T19 D12 | 140 T20 T20 D10 | 139 T19 T14 D20
138 T20 T18 D12 | 137 T20 T15 D16 | 136 T20 T20 D8 | 135 25 T20 Bull | 134 T20 T14 D16
133 T20 T11 D20 | 132 Bull T14 D20 | 131 T20 T13 D16 | 130 T20 T20 D5 | 129 T19 T16 D12
128 T18 T14 D16 | 127 T20 T17 D8 | 126 T19 T19 D6 | 125 Bull T17 D12 | 124 T20 T16 D8
123 T19 T16 D9 | 122 T18 T18 D7 | 121 T20 T11 D14 | 120 T20 S20 D20 | 119 T19 T12 D13
118 T20 S18 D20 | 117 T20 S17 D20 | 116 T20 S16 D20 | 115 T20 S15 D20 | 114 T20 S14 D20
113 T19 S16 D20 | 112 T20 S12 D20 | 111 T20 S11 D20 | 110 T20 S10 D20 | 109 T20 S9 D20
108 T20 S16 D16 | 107 T19 S18 D16 | 106 T20 S14 D16 | 105 T20 S13 D16 | 104 T18 S18 D16
103 T19 S14 D16 | 102 T20 S10 D16 | 101 T20 S9 D16 | 100 T20 D20 | 99 T19 S10 D16
98 T20 D19 | 97 T19 D20 | 96 T20 D18 | 95 T19 D19 | 94 T18 D20
93 T19 D18 | 92 T20 D16 | 91 T17 D20 | 90 T20 D15 | 89 T19 D16
88 T20 D14 | 87 T17 D18 | 86 T18 D16 | 85 T15 D20 | 84 T20 D12
83 T17 D16 | 82 Bull D16 | 81 T19 D12 | 80 T20 D10 | 79 T19 D11
78 T18 D12 | 77 T19 D10 | 76 T20 D8 | 75 T17 D12 | 74 T14 D16
73 T17 D11 | 72 T16 D12 | 71 T13 D16 | 70 T18 D8 | 69 T15 D12
68 T20 D4 | 67 T17 D8 | 66 T10 D18 | 65 T11 D16 | 64 T16 D8
63 T13 D12 | 62 T10 D16 | 61 T15 D8 | 60 S20 D20 | 59 S19 D20
58 S18 D20 | 57 S17 D20 | 56 S16 D20 | 55 S15 D20 | 54 S14 D20
53 S13 D20 | 52 S12 D20 | 51 S19 D16 | 50 S18 D16 | 49 S9 D20
48 S16 D16 | 47 S15 D16 | 46 S14 D16 | 45 S13 D16 | 44 S12 D16
43 S11 D16 | 42 S10 D16 | 41 S9 D16
40 D20 | 39 S7 D16 | 38 D19 | 37 S5 D16 | 36 D18 | 35 S3 D16 | 34 D17 | 33 S1 D16
32 D16 | 31 S15 D8 | 30 D15 | 29 S13 D8 | 28 D14 | 27 S11 D8 | 26 D13 | 25 S9 D8
24 D12 | 23 S7 D8  | 22 D11 | 21 S5 D8  | 20 D10 | 19 S3 D8  | 18 D9  | 17 S1 D8
16 D8  | 15 S7 D4  | 14 D7  | 13 S5 D4  | 12 D6  | 11 S3 D4  | 10 D5  | 9 S1 D4
8 D4   | 7 S3 D2   | 6 D3   | 5 S1 D2   | 4 D2   | 3 S1 D1   | 2 D1`;

/* ---- Tabelle: 1 Dart übrig ---- */
const RAW1 = `
40 D20 | 38 D19 | 36 D18 | 34 D17 | 32 D16 | 30 D15 | 28 D14 | 26 D13 | 24 D12 | 22 D11
20 D10 | 18 D9  | 16 D8  | 14 D7  | 12 D6  | 10 D5  | 8 D4   | 6 D3   | 4 D2   | 2 D1 | 50 Bull`;

const parseTable = (raw) => {
  const map = new Map();
  for (const entry of raw.split(/[|\n]/)) {
    const parts = entry.trim().split(/\s+/);
    if (parts.length < 2) continue;
    map.set(Number(parts[0]), Object.freeze(parts.slice(1).map(parseDart)));
  }
  return map;
};
const T3 = parseTable(RAW3);
const T1 = parseTable(RAW1);
/* 2 Darts übrig: alle Wege der 3-Dart-Tabelle, die mit höchstens 2 Darts auskommen */
const T2 = new Map([...T3].filter(([, r]) => r.length <= 2));
/* Mit nur 2 Darts gehen 110 · 107 · 104 · 101 noch übers Bull (die Tabelle spielt sie mit 3 Darts über ein Doppel) */
for (const [rem, a] of [[110, 'T20'], [107, 'T19'], [104, 'T18'], [101, 'T17']]) if (!T2.has(rem)) T2.set(rem, Object.freeze([parseDart(a), parseDart('Bull')]));
export const TABLE = { 1: T1, 2: T2, 3: T3 };

/* Lieblingsdoppel (Einstellungen: D16 · D18 · D20, Standard D20). Bei D16/D18 werden Wege mit gleich vielen Darts bevorzugt,
   die auf dem Lieblingsdoppel enden (Vorbereitung lieber Single als Triple, nie über ein Doppel). */
let FAV = 20;
export function setFavDouble(n) { const v = [16, 18, 20].includes(Number(n)) ? Number(n) : 20; if (v !== FAV) { FAV = v; favCache.clear(); } }
export const favDouble = () => FAV;
const favCache = new Map();
const ONE_SETUP = [ // ein Dart, der genau x Punkte bringt – Single zuerst, dann 25, Triple, Bull
  (x) => (x >= 1 && x <= 20 ? { n: x, m: 1 } : null),
  (x) => (x === 25 ? { n: 25, m: 1 } : null),
  (x) => (x % 3 === 0 && x / 3 >= 1 && x / 3 <= 20 ? { n: x / 3, m: 3 } : null),
  (x) => (x === 50 ? { n: 25, m: 2 } : null),
];
const oneSetup = (x) => { for (const f of ONE_SETUP) { const d = f(x); if (d) return d; } return null; };
const FIRST = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10].map((n) => ({ n, m: 3 })).concat([{ n: 25, m: 1 }, { n: 25, m: 2 }]);
function favRoute(rem, base) {
  const k = base.length, last = base[k - 1];
  if (last.m === 2 && last.n === FAV) return base;
  if (last.n === 25) return base; // Bull-Finish (170, 110 …) bleibt
  const x = rem - FAV * 2;
  if (x < 0) return base;
  if (k === 1) return base;
  if (k === 2) { const a = oneSetup(x); return a ? Object.freeze([a, { n: FAV, m: 2 }]) : base; }
  for (const a of FIRST) { const b = oneSetup(x - val(a)); if (b) return Object.freeze([a, b, { n: FAV, m: 2 }]); }
  return base;
}
/** Empfohlener Checkout-Weg für Rest `rem` mit `left` übrigen Darts, oder null. */
export function route(rem, left) {
  const base = TABLE[left]?.get(rem) || null;
  if (!base || FAV === 20) return base;
  const key = rem * 4 + left;
  if (!favCache.has(key)) favCache.set(key, favRoute(rem, base));
  return favCache.get(key);
}

/* ---- Setup-Wurf, wenn kein Checkout möglich ist ---- */
const SETUP_CANDIDATES = ['T20', 'T19', 'T18', 'T17', 'T16', 'T15', '25',
  ...Array.from({ length: 20 }, (_, i) => 'S' + (20 - i))].map(parseDart);
function leaveScore(r) {
  if (r < 2) return -1;
  if (T1.has(r)) { const n = T1.get(r)[0].n; return n === FAV ? 400 : 300 - DPREF.indexOf(n) * 5; }
  if (T2.has(r)) return 200;
  if (T3.has(r)) return 100;
  return 0;
}
/** Sinnvoller nächster Dart, wenn mit `left` Darts kein Checkout geht: { dart, leave } oder null. */
export function setupFor(rem, left) {
  if (rem < 2 || route(rem, left)) return null;
  let best = null, bs = -1;
  for (const d of SETUP_CANDIDATES) {
    const sc = leaveScore(rem - val(d));
    if (sc > bs) { bs = sc; best = { dart: d, leave: rem - val(d) }; }
  }
  return bs > 0 ? best : null;
}

/* ---- Ziel eines Darts & Doppelversuch ---- */
/** Worauf man bei Rest `before` mit `left` übrigen Darts zielt (erster Dart des Wegs bzw. Setup). */
export function targetFor(before, left) {
  const r = route(before, left);
  if (r) return r[0];
  const s = setupFor(before, left);
  return s ? s.dart : null;
}
/** Ist ein Dart bei diesem Rest ein Doppelversuch? (Rest mit einem einzigen Doppel checkbar) */
export const isDoubleAttempt = (before) => (before >= 2 && before <= 40 && before % 2 === 0) || before === 50;
export const attemptField = (before) => (before === 50 ? { n: 25, m: 2 } : { n: before / 2, m: 2 });
export const hitsField = (d, f) => d.n === f.n && d.m === f.m;

/* ---- Mögliche Summen (für Validierung der Summen-Eingabe) ---- */
const ALL = [];
for (let n = 1; n <= 20; n++) for (let m = 1; m <= 3; m++) ALL.push({ n, m });
ALL.push({ n: 25, m: 1 }, { n: 25, m: 2 });
const VALS = [0, ...new Set(ALL.map(val))];
export const POSS = new Set();
for (const a of VALS) for (const b of VALS) for (const c of VALS) POSS.add(a + b + c);
export const upTo3 = (vals) => { const s = new Set([0]); for (let i = 0; i < 3; i++) for (const a of [...s]) for (const v of vals) s.add(a + v); return s; };
export const ALL_DARTS = ALL;

/** Summen-Eingabe fertig? Ja, wenn keine weitere Ziffer mehr eine mögliche Aufnahme ergibt
    (z. B. „43“: 430–439 gibt es nicht → sofort übernehmen; „18“: 180 geht noch → warten). */
export const entryDone = (str) => str !== '' && POSS.has(Number(str)) && ![0, 1, 2, 3, 4, 5, 6, 7, 8, 9].some((d) => str !== '0' && POSS.has(Number(str + d)));
/** Kann aus dieser Eingabe noch eine mögliche Aufnahme werden? (sonst Tippfehler, z. B. „179“) */
export const entryPossible = (str) => POSS.has(Number(str)) || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].some((d) => POSS.has(Number(str + d)));

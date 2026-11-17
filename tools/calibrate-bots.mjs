// Kalibriert die Bots per Simulation: node tools/calibrate-bots.mjs
// Zwei Werte pro Bot:
//   dsigma – Streuung auf Doppel → Doppelquote passend zum Average (dblTarget)
//   sigma  – Streuung beim Scoring → Ø pro Leg, gemittelt über viele Legs = Ziel-Average
//            (so wie man ihn nach jedem Leg sieht; der Schnitt über alle Darts liegt etwas darunter,
//            weil lange Legs mehr Darts haben)
// Gesucht wird per Bisektion (501, Double Out, viele Legs), abwechselnd, bis beides passt.
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import { x01BotDart, rng } from '../js/botsim.js';
import { isDoubleAttempt } from '../js/checkout.js';
import { BOTS } from '../js/bots.js';

/** Ziel-Doppelquote (Treffer pro Dart aufs Doppel) zu einem Average: Ø 40 → 15 %, Ø 60 → 24 %, Ø 100 → 42 %. */
export const dblTarget = (avg) => 0.15 + (avg - 40) * 0.0045;

/** Simuliert `legs` Legs 501 Double Out → { avg (Ø pro Leg, gemittelt), all (Ø über alle Darts), dbl (Doppelquote pro Dart) }. */
export function simStats(sigma, dsigma = sigma, legs = 2000, seed = 1) {
  const r = rng(seed);
  let pts = 0, darts = 0, att = 0, hits = 0, legSum = 0;
  for (let i = 0; i < legs; i++) {
    const m = createMatch('x01', [['b']], { start: 501, out: 'double', mode: 'legs', target: 1 });
    let guard = 0;
    while (!m.done && guard++ < 400) {
      const before = X.curRem(m) - X.pendingSum(m);
      const d = x01BotDart(m, sigma, r, dsigma);
      if (isDoubleAttempt(before)) { att++; if (d.m === 2 && d.n * 2 === before) hits++; }
      X.throwDart(m, d.n, d.m, { any: true });
    }
    let lp = 0, ld = 0;
    for (const t of m.legs[0].turns) { lp += t.score; ld += t.darts; }
    pts += lp; darts += ld; legSum += (lp / ld) * 3;
  }
  return { avg: legSum / legs, all: (pts / darts) * 3, dbl: att ? hits / att : 0 };
}
export const simAverage = (sigma, legs, seed, dsigma = sigma) => simStats(sigma, dsigma, legs, seed).avg;

function bisect(fn, target, lo, hi, falling = true) {
  for (let k = 0; k < 16; k++) { const mid = (lo + hi) / 2; if ((fn(mid) > target) === falling) lo = mid; else hi = mid; }
  return Math.round(((lo + hi) / 2) * 100) / 100;
}

export function calibrate(avg, legs = 4000) {
  let sigma = 20, dsigma = 20;
  for (let round = 0; round < 3; round++) {
    dsigma = bisect((d) => simStats(sigma, d, legs, 7).dbl, dblTarget(avg), 2, 60);
    sigma = bisect((s) => simStats(s, dsigma, legs, 7).avg, avg, 2, 80);
  }
  return { sigma, dsigma };
}

if (process.argv[1]?.endsWith('calibrate-bots.mjs')) {
  const avgs = process.argv.slice(2).map(Number);
  const list = avgs.length ? avgs.map((a) => ({ name: `Ø ${a}`, avg: a })) : BOTS;
  for (const b of list) {
    const { sigma, dsigma } = calibrate(b.avg);
    const chk = simStats(sigma, dsigma, 4000, 99);
    console.log(`${b.name}: Ziel Ø ${b.avg}, Doppel ${(dblTarget(b.avg) * 100).toFixed(1)} % → sigma ${sigma}, dsigma ${dsigma} (Kontrolle: Ø/Leg ${chk.avg.toFixed(2)}, Ø gesamt ${chk.all.toFixed(2)}, Doppel ${(chk.dbl * 100).toFixed(1)} %)`);
  }
}

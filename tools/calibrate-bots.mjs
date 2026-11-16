// Kalibriert die Streuung (sigma) der Bots per Simulation: node tools/calibrate-bots.mjs
// Für jeden Ziel-Average wird sigma per Bisektion gesucht (501, Double Out, viele Legs).
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import { x01BotDart, rng } from '../js/botsim.js';
import { BOTS } from '../js/bots.js';

export function simAverage(sigma, legs = 2000, seed = 1) {
  const r = rng(seed);
  let pts = 0, darts = 0;
  for (let i = 0; i < legs; i++) {
    const m = createMatch('x01', [['b']], { start: 501, out: 'double', mode: 'legs', target: 1 });
    let guard = 0;
    while (!m.done && guard++ < 400) {
      const d = x01BotDart(m, sigma, r);
      X.throwDart(m, d.n, d.m, { any: true });
    }
    for (const t of m.legs[0].turns) { pts += t.score; darts += t.darts; }
  }
  return (pts / darts) * 3;
}

if (process.argv[1]?.endsWith("calibrate-bots.mjs")) {
  for (const b of BOTS) {
    let lo = 10, hi = 80;
    for (let k = 0; k < 18; k++) { const mid = (lo + hi) / 2; if (simAverage(mid, 1500, 7) > b.avg) lo = mid; else hi = mid; }
    const sigma = Math.round(((lo + hi) / 2) * 10) / 10;
    console.log(`${b.name}: Ziel ${b.avg} → sigma ${sigma} mm (Kontrolle: ${simAverage(sigma, 3000, 99).toFixed(2)})`);
  }
}

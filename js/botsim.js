/* Bot-Wurfmodell: zielt wie ein echter Spieler, jeder Dart streut 2D-normalverteilt um den Zielpunkt
   (echte Scheibengeometrie in mm). Reine Logik ohne DOM. */
import { segmentAt, aimPoint } from './bulloff.js';
import { targetFor, val } from './checkout.js';
import * as X from './x01.js';
import * as G from './party.js';

/** Kleiner, schneller Zufallsgenerator mit Startwert (für reproduzierbare Tests). */
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Standardnormalverteilt (Box-Muller) */
export function gauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }

/** Einen Dart auf das Ziel { n, m } werfen → { n, m, x, y } (getroffenes Feld + Position in mm) */
export function throwAt(aim, sigma, r = Math.random) {
  const p = aimPoint(aim);
  const x = p.x + gauss(r) * sigma, y = p.y + gauss(r) * sigma;
  return { ...segmentAt(x, y), x, y };
}
/** Ausbullen: Wurf aufs Bull → Position */
export function throwBull(sigma, r = Math.random) { return { x: gauss(r) * sigma, y: gauss(r) * sigma }; }

const T20 = { n: 20, m: 3 };

/** X01: Ziel bei Rest `before` mit `left` übrigen Darts (Scoring T20, im Finish nach Checkout-Tabelle). */
export function x01Aim(before, left, out = 'double') {
  if (before > 170) return T20;
  if (out === 'single') {
    if (before <= 20) return { n: before, m: 1 };
    if (before === 25) return { n: 25, m: 1 };
    if (before === 50) return { n: 25, m: 2 };
    if (before <= 60 && before % 3 === 0) return { n: before / 3, m: 3 };
    if (before <= 40 && before % 2 === 0) return { n: before / 2, m: 2 };
  }
  return targetFor(before, left) || (before > 60 ? T20 : { n: Math.min(20, before - 2 > 0 ? before - 2 : 1), m: 1 });
}

/** Nächster Bot-Dart im laufenden X01-Match. */
export function x01BotDart(m, sigma, r = Math.random) {
  const before = X.curRem(m) - X.pendingSum(m), left = 3 - m.pending.length;
  return throwAt(x01Aim(before, left, m.opts.out), sigma, r);
}

/* ---------------- Partyspiele ---------------- */
/** Ziel eines Bots im Partyspiel. `pos` = Fortschritt bei Around the Clock (inkl. Treffer dieser Aufnahme). */
export function partyAim(m, pos = 0) {
  const round = G.round(m);
  if (m.game === 'highscore') return T20;
  if (m.game === 'shanghai') return { n: round + 1, m: 3 };
  if (m.game === 'halveit') {
    const t = G.HALF[round];
    if (typeof t === 'number') return { n: t, m: 3 };
    return t === 'D' ? { n: 20, m: 2 } : t === 'T' ? T20 : { n: 25, m: 2 };
  }
  if (m.game === 'atc') return pos >= 20 ? { n: 25, m: 1 } : { n: pos + 1, m: 1 };
  return T20;
}

/** Wert einer Bot-Aufnahme im Partyspiel (wie ein Mensch ihn eintippen würde). */
export function partyValue(m, s, darts) {
  const round = G.round(m);
  if (m.game === 'highscore') return darts.reduce((a, d) => a + val(d), 0);
  if (m.game === 'shanghai') return darts.filter((d) => d.n === round + 1).reduce((a, d) => a + val(d), 0);
  if (m.game === 'halveit') {
    const t = G.HALF[round];
    const ok = (d) => (typeof t === 'number' ? d.n === t : t === 'D' ? d.m === 2 : t === 'T' ? d.m === 3 : d.n === 25);
    return darts.filter(ok).reduce((a, d) => a + val(d), 0);
  }
  if (m.game === 'atc') {
    let pos = G.atcPos(m, s), hits = 0;
    const total = G.atcTotal(m);
    for (const d of darts) {
      if (pos >= total) break;
      const want = pos >= 20 ? 25 : pos + 1;
      if (d.n === want) { pos++; hits++; }
    }
    return hits;
  }
  return 0;
}

/** Nächster Bot-Dart im Partyspiel; `darts` = bisherige Darts dieser Aufnahme. */
export function partyBotDart(m, s, darts, sigma, r = Math.random) {
  let pos = 0;
  if (m.game === 'atc') pos = G.atcPos(m, s) + partyValue(m, s, darts);
  return throwAt(partyAim(m, pos), sigma, r);
}
/** Ist die Bot-Aufnahme fertig? (3 Darts oder Around the Clock geschafft) */
export const partyTurnDone = (m, s, darts) => darts.length >= 3 || (m.game === 'atc' && G.atcPos(m, s) + partyValue(m, s, darts) >= G.atcTotal(m));

/* Testdaten: realistische Demo-Matches (501 + ein paar Partyspiele) für Statistik, Heatmap, Vergleich.
   Deterministisch (fester Seed). Alles trägt `demo: true` und lässt sich gezielt wieder entfernen.
   Würfe kommen aus dem Bot-Wurfmodell (2D-Streuung auf echter Scheibe) – über 170 Rest als Summe,
   darunter Dart für Dart, wie ein Mensch es eingeben würde. Reine Logik ohne DOM. */
import { createMatch } from './match.js';
import * as X from './x01.js';
import * as G from './party.js';
import { rng, throwAt, x01Aim, partyBotDart, partyValue, partyTurnDone } from './botsim.js';
import { val } from './checkout.js';

export const DEMO_SEED = 502;
const DAY = 864e5;
/** Spielertypen: sigma steuert die Stärke (≈ Ø 37 / 44 / 48), fav = Lieblingsdoppel beim Stellen */
export const DEMO_PLAYERS = [
  { key: 'tim', name: 'Test-Tim', sigma: 25.5, fav: 16 },
  { key: 'ben', name: 'Test-Ben', sigma: 17.9, fav: 20 },
];
const MAIN = { sigma: 20.2, fav: 8 };

/** Ziel wie ein Mensch, aber mit eigenem Lieblingsdoppel: wenn möglich auf dieses Doppel stellen. */
function aim(before, left, fav) {
  if (left >= 2 && before <= 60 && before > 2 * fav && before - 2 * fav <= 20 && !(before <= 40 && before % 2 === 0)) return { n: before - 2 * fav, m: 1 };
  return x01Aim(before, left, 'double');
}

function playX01(sides, cfg, startedAt, target, r) {
  const m = createMatch('x01', sides, { start: 501, out: 'double', mode: 'legs', target }, Math.floor(r() * sides.length), startedAt);
  const form = Object.fromEntries(sides.flat().map((id) => [id, 1 + (r() - 0.5) * 0.12])); // Tagesform ±6 %
  for (let guard = 0; !m.done && guard < 3000; guard++) {
    const pid = X.curThrower(m), c = cfg[pid], sig = c.sigma * form[pid];
    const rem = X.curRem(m);
    if (rem > 170 && !m.pending.length) {
      let sum = 0;
      for (let i = 0; i < 3; i++) sum += val(throwAt({ n: 20, m: 3 }, sig, r));
      X.submitSum(m, sum);
    } else {
      const before = rem - X.pendingSum(m), left = 3 - m.pending.length;
      const d = throwAt(aim(before, left, c.fav), sig, r);
      X.throwDart(m, d.n, d.m);
    }
  }
  return m;
}

function playParty(game, sides, cfg, startedAt, opts, r) {
  const m = createMatch(game, sides, opts, 0, startedAt);
  for (let guard = 0; !m.done && guard < 500; guard++) {
    const s = G.curSide(m), pid = G.curThrower(m), darts = [];
    while (!partyTurnDone(m, s, darts)) darts.push(partyBotDart(m, s, darts, cfg[pid].sigma, r));
    G.submit(m, partyValue(m, s, darts));
  }
  return m;
}

/**
 * Erzeugt Demo-Profile und -Matches.
 * @returns { profiles: [{ id, name, createdAt, demo }], matches: [Match] }
 */
export function generateDemo({ mainId, now = Date.now(), seed = DEMO_SEED } = {}) {
  const r = rng(seed);
  const created = now - 92 * DAY;
  const profiles = DEMO_PLAYERS.map((p) => ({ id: `p_demo_${p.key}`, name: p.name, createdAt: created, demo: true }));
  const [tim, ben] = profiles.map((p) => p.id);
  const cfg = { [mainId]: MAIN, [tim]: DEMO_PLAYERS[0], [ben]: DEMO_PLAYERS[1] };
  // 60 × 501 über die letzten 90 Tage: Hauptspieler gegen Tim/Ben, Tim gegen Ben, ein paar zu dritt
  const lineups = [];
  for (let i = 0; i < 60; i++) {
    const k = i % 10;
    lineups.push(k < 4 ? [[mainId], [tim]] : k < 7 ? [[mainId], [ben]] : k < 9 ? [[tim], [ben]] : [[mainId], [tim], [ben]]);
  }
  const matches = [];
  lineups.forEach((sides, i) => {
    const daysAgo = 90 - (i / 59) * 89.5 + r() * 0.4;                 // gleichmäßig, die neuesten in den letzten Tagen
    const start = Math.round(now - daysAgo * DAY);
    const m = playX01(sides, cfg, start, sides.length > 2 ? 2 : r() < 0.7 ? 2 : 3, r);
    m.endedAt = start + (25 + Math.round(r() * 20)) * 6e4;
    m.demo = true;
    matches.push(m);
  });
  // Ein paar Partyspiele
  [['highscore', { rounds: 10 }], ['shanghai', { rounds: 7 }], ['atc', { bull: 1 }], ['highscore', { rounds: 5 }], ['halveit', {}]].forEach(([game, opts], i) => {
    const start = Math.round(now - (70 - i * 15) * DAY);
    const m = playParty(game, i % 2 ? [[mainId], [tim], [ben]] : [[mainId], [ben]], cfg, start, opts, r);
    m.endedAt = start + 20 * 6e4;
    m.demo = true;
    matches.push(m);
  });
  matches.forEach((m, i) => { m.id = `m_demo_${String(i).padStart(2, '0')}`; m.pending = []; delete m.bull; });
  return { profiles, matches };
}

/** Einmalig einfügen (wenn noch nie geschehen und ein Hauptspieler existiert). Gibt true zurück, wenn eingefügt. */
export function seedDemo(S, now = Date.now()) {
  if (S.demoSeeded || !S.mainId) return false;
  S.demoSeeded = true;
  if (S.matches.some((m) => m.demo)) return false;
  const { profiles, matches } = generateDemo({ mainId: S.mainId, now });
  const taken = new Set(S.profiles.map((p) => p.name.toLowerCase()));
  for (const p of profiles) if (!taken.has(p.name.toLowerCase()) && !S.profiles.some((x) => x.id === p.id)) S.profiles.push(p);
  S.matches.push(...matches);
  return true;
}

/** Nur Demo-Matches und Demo-Spieler entfernen – echte Daten bleiben. */
export function removeDemo(S) {
  const ids = new Set(S.profiles.filter((p) => p.demo).map((p) => p.id));
  S.matches = S.matches.filter((m) => !m.demo);
  S.profiles = S.profiles.filter((p) => !p.demo);
  S.lineup = S.lineup.filter((e) => !ids.has(e.id));
  if (ids.has(S.statsPid)) S.statsPid = null;
  if (ids.has(S.cmpA)) S.cmpA = null;
  if (ids.has(S.cmpB)) S.cmpB = null;
  if (S.current && S.current.playerIds.some((id) => ids.has(id))) S.current = null;
}

/* Trophäen (Abzeichen fürs Spieler-Banner) – wie alle Statistik immer aus den gespeicherten Matches berechnet.
   Reine Logik ohne DOM, läuft auch auf dem Server (Banner der Freunde).
   Jede Trophäe hat eine oder mehrere Stufen; erreicht ist die höchste Stufe, deren Bedingung erfüllt ist.
   Seltenheit: bronze · silver · gold · royal (Königsrot, Sonderstufe) · legendary (nur 9-Darter). */
import { label, route } from './checkout.js';
import { BOTS } from './bots.js';

export const TIERS = ['bronze', 'silver', 'gold', 'royal', 'legendary'];
export const TIER_NAMES = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold', royal: 'Königsrot', legendary: 'Legendär' };
export const BADGE_SLOTS = 3;

export const CATEGORIES = [
  ['scoring', 'Scoring'], ['finish', 'Finishes'], ['legs', 'Legs'], ['darts', 'Einzeldart-Spezialitäten'], ['career', 'Spielerlaufbahn'], ['bots', 'Bots'],
];

const lv = (tier, need, text) => ({ tier, need, text });
/** Katalog: id, Kategorie, Name, Stufen [{ tier, need, text }], key = Messwert aus measure() (Zahl; Stufe erreicht bei Wert ≥ need) */
export const TROPHIES = [
  { id: 'ton', cat: 'scoring', name: 'Ton-Jäger', key: 'tons', levels: [lv('bronze', 1, 'Erste Aufnahme mit 100+'), lv('silver', 25, '25 Aufnahmen mit 100+'), lv('gold', 100, '100 Aufnahmen mit 100+'), lv('royal', 500, '500 Aufnahmen mit 100+')] },
  { id: 'ton40', cat: 'scoring', name: 'Ton-Vierzig', key: 't140', levels: [lv('silver', 1, 'Eine Aufnahme mit 140+')] },
  { id: 'ton80', cat: 'scoring', name: 'Ton-Achtzig', key: 't180', levels: [lv('gold', 1, 'Die erste 180')] },
  { id: 'series180', cat: 'scoring', name: '180er-Serie', key: 'series180', levels: [lv('royal', 1, 'Zwei 180er in einem Leg oder zwei hintereinander')] },
  { id: 'highavg', cat: 'scoring', name: 'Hoch hinaus', key: 'bestAvg', levels: [lv('bronze', 60.001, 'Match-Average über 60'), lv('silver', 70.001, 'Match-Average über 70'), lv('gold', 80.001, 'Match-Average über 80')] },
  { id: 'constant', cat: 'scoring', name: 'Konstanz', key: 'run60', levels: [lv('silver', 10, '10 Aufnahmen in Folge über 60')] },

  { id: 'firstco', cat: 'finish', name: 'Erster Checkout', key: 'outs', levels: [lv('bronze', 1, 'Das erste gewonnene Leg')] },
  { id: 'bigfish', cat: 'finish', name: 'Big Fish', key: 'co170', levels: [lv('royal', 1, 'Finish mit 170 – das höchste Finish')] },
  { id: 'highco', cat: 'finish', name: 'Hohe Finishes', key: 'bestCo', levels: [lv('bronze', 101, 'Checkout über 100'), lv('silver', 121, 'Checkout über 120'), lv('gold', 151, 'Checkout über 150')] },
  { id: 'bullfinish', cat: 'finish', name: 'Bullseye-Finish', key: 'bullOut', levels: [lv('silver', 1, 'Leg mit dem Bull beendet')] },
  { id: 'shanghaifin', cat: 'finish', name: 'Shanghai-Finish', key: 'shanghaiOut', levels: [lv('gold', 1, 'Finish mit Single, Double und Triple desselben Feldes')] },
  { id: 'dblrate', cat: 'finish', name: 'Doppelquote', key: 'bestDbl', levels: [lv('bronze', 30.001, 'Über 30 % Doppelquote in einem Match'), lv('silver', 40.001, 'Über 40 % Doppelquote in einem Match'), lv('gold', 50.001, 'Über 50 % Doppelquote in einem Match')] },
  { id: 'coldblood', cat: 'finish', name: 'Kaltblütig', key: 'coldOut', levels: [lv('gold', 1, 'Leg gewonnen, obwohl der Gegner schon auf einem Finish stand')] },

  { id: 'nine', cat: 'legs', name: '9-Darter', key: 'bestLegInv', levels: [lv('legendary', 1000 - 9, 'Ein Leg mit 9 Darts – das Ziel aller Ziele')] },
  { id: 'quickleg', cat: 'legs', name: 'Schnelles Leg', key: 'bestLegInv', levels: [lv('silver', 1000 - 15, '15-Darter: Leg mit höchstens 15 Darts'), lv('gold', 1000 - 12, '12-Darter: Leg mit höchstens 12 Darts')] },
  { id: 'whitewash', cat: 'legs', name: 'Whitewash', key: 'whitewash', levels: [lv('silver', 1, 'Match 3:0 gewonnen')] },
  { id: 'comeback', cat: 'legs', name: 'Comeback-König', key: 'comeback', levels: [lv('silver', 2, 'Match nach 0:2 Rückstand gedreht'), lv('gold', 3, 'Match nach 0:3 Rückstand gedreht')] },
  { id: 'decider', cat: 'legs', name: 'Decider-Nerven', key: 'deciders', levels: [lv('gold', 10, '10 Entscheidungs-Legs gewonnen')] },

  { id: 'hattrick', cat: 'darts', name: 'Hattrick', key: 'hattrick', levels: [lv('gold', 1, '3 × Triple 20 in einer Aufnahme, Dart für Dart')] },
  { id: 'bullmaster', cat: 'darts', name: 'Bull-Meister', key: 'bullRun', levels: [lv('gold', 3, '3 Bullseyes in Serie')] },
  { id: 'robinhood', cat: 'darts', name: 'Robin Hood', key: 'robin', levels: [lv('royal', 1, 'Beim Ausbullen einen eigenen Dart getroffen (unter 2 mm)')] },
  { id: 'madhouse', cat: 'darts', name: 'Madhouse', key: 'madhouse', levels: [lv('silver', 1, 'Finish auf Doppel 1')] },
  { id: 'bnb', cat: 'darts', name: 'Bed & Breakfast', key: 'bnb', levels: [lv('bronze', 1, '26 mit Single 20, Single 5 und Single 1')] },
  { id: 'dblbull', cat: 'darts', name: 'Doppel-Bullseye', key: 'dblBull', levels: [lv('silver', 1, 'Zwei Bullseyes in einer Aufnahme')] },

  { id: 'tenure', cat: 'career', name: 'Spielzeit', key: 'years', levels: [lv('bronze', 1, '1 Jahr dabei'), lv('silver', 5, '5 Jahre dabei'), lv('gold', 10, '10 Jahre dabei')] },
  { id: 'matchcount', cat: 'career', name: 'Match-Zähler', key: 'matches', levels: [lv('bronze', 10, '10 Matches gespielt'), lv('silver', 100, '100 Matches gespielt'), lv('gold', 1000, '1.000 Matches gespielt')] },
  { id: 'streak', cat: 'career', name: 'Siegesserie', key: 'streak', levels: [lv('bronze', 3, '3 Siege in Folge'), lv('silver', 10, '10 Siege in Folge'), lv('gold', 25, '25 Siege in Folge')] },
  { id: 'variety', cat: 'career', name: 'Gegner-Vielfalt', key: 'opponents', levels: [lv('silver', 10, 'Gegen 10 verschiedene Gegner gespielt')] },
  { id: 'nemesis', cat: 'career', name: 'Erzfeind', key: 'nemesis', levels: [lv('silver', 20, '20 Duelle gegen denselben Gegner')] },
  { id: 'favfield', cat: 'career', name: 'Lieblingsfeld', key: 'favField', levels: [lv('gold', 1000, '1.000 Pfeile auf dasselbe Feld')] },

  ...BOTS.map((b) => ({ id: `bot-${b.id}`, cat: 'bots', name: `${b.name}-Bezwinger`, key: `beat:${b.id}`, levels: [lv('bronze', 1, `${b.name} in einem Match geschlagen`)] })),
  { id: 'botslayer', cat: 'bots', name: 'Bot-Slayer', key: 'botsBeaten', levels: [lv('gold', BOTS.length, 'Alle Bots mindestens einmal geschlagen')] },
  { id: 'botperfect', cat: 'bots', name: 'Perfekter Sieg', key: 'botPerfect', levels: [lv('silver', 1, 'Gegen einen Bot zu Null gewonnen')] },
];
export const trophyById = (id) => TROPHIES.find((t) => t.id === id) || null;

const when = (m) => m.endedAt ?? m.startedAt ?? 0;
const sideOf = (m, pid) => m.sides.findIndex((s) => s.includes(pid));
const isBull = (d) => d.n === 25 && d.m === 2;
const legsBySide = (m, upTo) => { const c = m.sides.map(() => 0); for (const l of m.legs.slice(0, upTo)) if (l.winner !== undefined) c[l.winner]++; return c; };

/** Leg-Stände einer Seite über das Match (Legs-Modus) bzw. Sätze (Sets-Modus): Folge von [eigene, beste gegnerische] */
function scoreline(m, s) {
  const out = [], sets = m.opts.mode === 'sets';
  const c = m.sides.map(() => 0), legsInSet = m.sides.map(() => 0);
  for (const l of m.legs) {
    if (l.winner === undefined) continue;
    if (sets) {
      legsInSet[l.winner]++;
      if (legsInSet[l.winner] >= 3) { c[l.winner]++; legsInSet.fill(0); } else continue;
    } else c[l.winner]++;
    out.push([c[s], Math.max(...c.filter((_, k) => k !== s))]);
  }
  return out;
}

/** Messwerte des Spielers pid aus allen fertigen Matches. since = Beginn (Konto/Profil) für „Spielzeit“. */
export function measure(matches, pid, { since = null, now = Date.now() } = {}) {
  const v = { tons: 0, t140: 0, t180: 0, series180: 0, bestAvg: 0, run60: 0, outs: 0, co170: 0, bestCo: 0, bullOut: 0, shanghaiOut: 0,
    bestDbl: 0, coldOut: 0, bestLegInv: 0, whitewash: 0, comeback: 0, deciders: 0, hattrick: 0, bullRun: 0, robin: 0, madhouse: 0,
    bnb: 0, dblBull: 0, years: 0, matches: 0, streak: 0, opponents: 0, nemesis: 0, favField: 0, botsBeaten: 0, botPerfect: 0 };
  const ms = matches.filter((m) => m && m.done && Array.isArray(m.playerIds) && m.playerIds.includes(pid)).sort((a, b) => when(a) - when(b));
  const opp = new Map(), fields = new Map(), beaten = new Set();
  let streak = 0, bullRun = 0, first = since ?? null;
  for (const m of ms) {
    v.matches++;
    if (first === null || when(m) < first) first = m.startedAt ?? when(m);
    const s = sideOf(m, pid), versus = m.sides.length > 1, won = versus && !!m.winners?.includes(s);
    const others = m.sides.filter((_, k) => k !== s).flat();
    if (versus) {
      for (const o of others) opp.set(o, (opp.get(o) || 0) + 1);
      streak = won ? streak + 1 : 0; v.streak = Math.max(v.streak, streak);
      if (won) for (const o of others) if (BOTS.some((b) => b.id === o)) beaten.add(o);
    }
    // Robin Hood: beim Ausbullen zwei eigene Darts (fast) an derselben Stelle
    const bt = (m.bull?.rounds || []).flatMap((r) => r.throws || []);
    const mineB = bt.filter((t) => t && t.s === s && Number.isFinite(t.x));
    for (let i = 0; i < mineB.length; i++) for (let j = i + 1; j < mineB.length; j++) if (Math.hypot(mineB[i].x - mineB[j].x, mineB[i].y - mineB[j].y) < 2) v.robin = 1;
    if (m.game !== 'x01' || !Array.isArray(m.legs)) continue;

    const dbl = m.opts.out === 'double';
    let pts = 0, darts = 0, att = 0, hits = 0, run = 0;
    m.legs.forEach((l, li) => {
      let leg180 = 0, prev180 = false;
      const rems = m.sides.map(() => m.opts.start);
      for (const t of l.turns) {
        if (t.s !== s) { rems[t.s] -= t.score; continue; }
        const mine = t.pid === pid;
        if (mine) {
          pts += t.score; darts += t.darts;
          if (!t.bust) {
            if (t.score >= 100) v.tons++;
            if (t.score >= 140) v.t140++;
            if (t.score === 180) { v.t180++; leg180++; if (prev180 || leg180 >= 2) v.series180 = 1; }
          }
          prev180 = !t.bust && t.score === 180;
          run = !t.bust && t.score > 60 ? run + 1 : 0; v.run60 = Math.max(v.run60, run);
          const th = t.throws || [];
          for (const d of th) {
            if (d.n) { const k = label(d); fields.set(k, (fields.get(k) || 0) + 1); }
            bullRun = isBull(d) ? bullRun + 1 : 0; v.bullRun = Math.max(v.bullRun, bullRun);
            if (dbl && ((d.before >= 2 && d.before <= 40 && d.before % 2 === 0) || d.before === 50)) {
              att++; const f = d.before === 50 ? { n: 25, m: 2 } : { n: d.before / 2, m: 2 };
              if (d.n === f.n && d.m === f.m) hits++;
            }
          }
          if (th.length === 3 && th.every((d) => d.n === 20 && d.m === 3)) v.hattrick = 1;
          if (th.filter(isBull).length >= 2) v.dblBull = 1;
          if (!t.bust && th.length === 3 && t.score === 26 && [20, 5, 1].every((n) => th.some((d) => d.n === n && d.m === 1))) v.bnb = 1;
          if (t.out) {
            v.outs++;
            v.bestCo = Math.max(v.bestCo, t.score);
            if (t.score === 170) v.co170 = 1;
            const last = th[th.length - 1];
            if (last && isBull(last)) v.bullOut = 1;
            if ((last && last.n === 1 && last.m === 2) || (!th.length && dbl && t.startRem === 2)) v.madhouse = 1;
            if (th.length === 3 && th[0].n !== 25 && th.every((d) => d.n === th[0].n) && new Set(th.map((d) => d.m)).size === 3) v.shanghaiOut = 1;
            if (dbl && m.sides.some((_, k) => k !== s && rems[k] <= 170 && route(rems[k], 3))) v.coldOut = 1;
          }
        }
        rems[s] -= t.score;
      }
      // Legs: eigene Seite gewinnt, Darts der Seite im Leg (nur 501)
      if (l.winner === s && m.opts.start === 501) {
        const d = l.turns.filter((t) => t.s === s).reduce((a, t) => a + t.darts, 0);
        if (l.turns.some((t) => t.s === s && t.pid === pid)) v.bestLegInv = Math.max(v.bestLegInv, 1000 - d);
      }
      // Entscheidungs-Leg: vor dem Leg stehen alle Seiten eins vor dem Ziel (Legs-Modus) bzw. 2:2 im entscheidenden Satz
      if (l.winner === s && m.sides.length === 2) {
        if (m.opts.mode !== 'sets') { const c = legsBySide(m, li); if (c.every((x) => x === m.opts.target - 1) && m.opts.target > 1) v.deciders++; }
        else {
          const before = m.legs.slice(0, li), setNo = l.set;
          const inSet = m.sides.map((_, k) => before.filter((x) => x.set === setNo && x.winner === k).length);
          const sets = m.sides.map((_, k) => { let c = 0; for (let n = 1; n < setNo; n++) if (before.filter((x) => x.set === n && x.winner === k).length >= 3) c++; return c; });
          if (inSet.every((x) => x === 2) && sets.every((x) => x === m.opts.target - 1)) v.deciders++;
        }
      }
    });
    if (darts) v.bestAvg = Math.max(v.bestAvg, (pts / darts) * 3);
    if (att >= 3) v.bestDbl = Math.max(v.bestDbl, (hits / att) * 100);
    if (won) {
      const line = scoreline(m, s);
      const fin = line[line.length - 1];
      if (fin && fin[0] >= 3 && fin[1] === 0) v.whitewash = 1;
      const worst = line.reduce((a, [me, o]) => (me === 0 ? Math.max(a, o) : a), 0);
      v.comeback = Math.max(v.comeback, worst);
      if (fin && fin[1] === 0 && others.some((o) => BOTS.some((b) => b.id === o))) v.botPerfect = 1;
    }
  }
  if (first !== null) v.years = Math.floor((now - first) / (365.25 * 864e5));
  v.opponents = opp.size;
  v.nemesis = Math.max(0, ...opp.values());
  v.favField = Math.max(0, ...fields.values());
  for (const b of BOTS) v[`beat:${b.id}`] = beaten.has(b.id) ? 1 : 0;
  v.botsBeaten = beaten.size;
  return v;
}

/** Stand jeder Trophäe: { id → { tier | null, level (Index) | -1, value, next (nächste Stufe) | null } } */
export function trophies(matches, pid, opts = {}) {
  const v = measure(matches, pid, opts), out = {};
  for (const t of TROPHIES) {
    const value = v[t.key] ?? 0;
    let level = -1;
    t.levels.forEach((l, i) => { if (value >= l.need) level = i; });
    out[t.id] = { tier: level >= 0 ? t.levels[level].tier : null, level, value, next: t.levels[level + 1] || null };
  }
  return out;
}

/** Gewählte Abzeichen (prefs.badges) bereinigen: nur erreichte, keine doppelten, genau BADGE_SLOTS Plätze (null = leer) */
export function badgeSlots(chosen, state) {
  const seen = new Set();
  return Array.from({ length: BADGE_SLOTS }, (_, i) => {
    const id = Array.isArray(chosen) ? chosen[i] : null;
    if (!id || seen.has(id) || !state[id]?.tier) return null;
    seen.add(id); return id;
  });
}

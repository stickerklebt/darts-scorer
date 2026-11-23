/* „Auffällig“ (Statistik › Zahlen): kleine Auswertungen aus den 501-Matches. Reine Funktionen ohne DOM.
   Matchdart-Nerven · Entscheidungsleg · Bust-Schock · Erster Versuch oder Nachwerfen · Tageszeit · Wochentag */
import { isDoubleAttempt, attemptField, hitsField } from './checkout.js';

const LEGS_PER_SET = 3;
const acc = () => ({ pts: 0, darts: 0, n: 0 });
const avgOf = (a) => (a.darts ? (a.pts / a.darts) * 3 : null);
const rate = (r) => (r.a ? r.h / r.a : null);

export const DAYPARTS = [['morgens', 5, 12], ['nachmittags', 12, 17], ['abends', 17, 22], ['nachts', 22, 29]];
export const daypart = (ts) => { const h = new Date(ts).getHours(), x = h < 5 ? h + 24 : h; return DAYPARTS.find(([, a, b]) => x >= a && x < b)[0]; };
export const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
/** Mindestmenge, damit ein Wert zählt (Aufnahmen bzw. Doppelversuche) */
export const MIN_TURNS = 10, MIN_DBL = 6;

/** Legs vor diesem Leg (für Matchdarts/Entscheidungsleg) – je Seite gewonnene Legs im Match bzw. im laufenden Set */
function legsBefore(m, li) {
  const won = m.sides.map(() => 0), sets = m.sides.map(() => 0);
  for (let i = 0; i < li; i++) {
    const l = m.legs[i];
    if (l.winner === undefined) continue;
    won[l.winner]++;
    if (m.opts.mode === 'sets' && won[l.winner] >= LEGS_PER_SET) { sets[l.winner]++; won.fill(0); }
  }
  return { won, sets };
}
/** Würde ein Leg-Gewinn von Seite s in Leg li das Match entscheiden? */
function matchLeg(m, li, s) {
  const { won, sets } = legsBefore(m, li), t = m.opts.target || 1;
  return m.opts.mode === 'sets' ? won[s] + 1 >= LEGS_PER_SET && sets[s] + 1 >= t : won[s] + 1 >= t;
}
/** Entscheidungsleg: beide (alle) Seiten stehen einen Leg-/Set-Gewinn vor dem Matchgewinn */
function deciderLeg(m, li) {
  if (m.sides.length < 2) return false;
  return m.sides.every((_, s) => matchLeg(m, li, s));
}

export function insights(matches, pid) {
  const all = acc(), decider = acc(), afterBust = acc();
  const md = { a: 0, h: 0 }, other = { a: 0, h: 0 }, first = { a: 0, h: 0 }, retry = { a: 0, h: 0 };
  const parts = Object.fromEntries(DAYPARTS.map(([k]) => [k, acc()]));
  const days = WEEKDAYS.map(() => acc());
  for (const m of matches) {
    const s = m.sides.findIndex((x) => x.includes(pid));
    if (s < 0) continue;
    const part = parts[daypart(m.startedAt)], day = days[new Date(m.startedAt).getDay()];
    for (const [li, l] of m.legs.entries()) {
      const dec = deciderLeg(m, li), isMatchLeg = matchLeg(m, li, s);
      let bustBefore = false;
      for (const t of l.turns) {
        if (t.pid !== pid) continue;
        for (const a of [all, part, day]) { a.pts += t.score; a.darts += t.darts; a.n++; }
        if (dec) { decider.pts += t.score; decider.darts += t.darts; decider.n++; }
        if (bustBefore) { afterBust.pts += t.score; afterBust.darts += t.darts; afterBust.n++; }
        bustBefore = !!t.bust;
        // Doppelversuche: Matchdart oder normaler Legdart · erster Versuch der Aufnahme oder Nachwerfen nach einem Fehlwurf
        if (m.opts.out !== 'double') continue;
        let missed = false;
        for (const th of t.throws || []) {
          if (!isDoubleAttempt(th.before)) continue;
          const hit = hitsField(th, attemptField(th.before));
          const g = isMatchLeg ? md : other; g.a++; if (hit) g.h++;
          const f = missed ? retry : first; f.a++; if (hit) f.h++;
          if (!hit) missed = true;
        }
      }
    }
  }
  const base = avgOf(all);
  const ok = (a) => a.n >= MIN_TURNS;
  const partList = DAYPARTS.map(([k]) => ({ k, avg: avgOf(parts[k]), n: parts[k].n })).filter((p) => p.n >= MIN_TURNS);
  const dayList = WEEKDAYS.map((k, i) => ({ k, i, avg: avgOf(days[i]), n: days[i].n })).filter((d) => d.n >= MIN_TURNS);
  const by = (list) => list.slice().sort((a, b) => b.avg - a.avg);
  return {
    base,
    matchdart: md.a >= MIN_DBL && other.a >= MIN_DBL ? { md: rate(md), other: rate(other), mdA: md.a, otherA: other.a } : null,
    decider: ok(decider) && base !== null ? { avg: avgOf(decider), delta: avgOf(decider) - base, n: decider.n } : null,
    bust: afterBust.n >= 5 && base !== null ? { avg: avgOf(afterBust), delta: avgOf(afterBust) - base, n: afterBust.n } : null,
    firstTry: first.a >= MIN_DBL && retry.a >= MIN_DBL ? { first: rate(first), retry: rate(retry), firstA: first.a, retryA: retry.a } : null,
    daytime: partList.length >= 2 && base !== null ? { best: by(partList)[0], worst: by(partList).at(-1), night: partList.find((p) => p.k === 'nachts') || null, base } : null,
    weekday: dayList.length >= 2 ? { best: by(dayList)[0], worst: by(dayList).at(-1) } : null,
  };
}

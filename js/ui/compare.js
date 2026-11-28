/* Vergleichsansicht im Pop-Art-Stil: zwei Spieler als Farbblöcke, Werte mittig */
import { S, nameOf, profile } from '../store.js';
import { fullStats, is501, RANGES } from '../stats.js';
import { esc, fmt, seg, pcVars } from './common.js';
import { icon } from './svg.js';
import { PERIOD_OPTS, pct, statsPid, doublesBlock } from './stats-view.js';

export function comparePair() {
  const a = S.cmpA && profile(S.cmpA) ? S.cmpA : statsPid();
  let b = S.cmpB && profile(S.cmpB) && S.cmpB !== a ? S.cmpB : null;
  if (!b) b = S.profiles.find((p) => p.id !== a)?.id ?? null;
  return [a, b];
}

const METRICS = [
  ['Überblick'],
  ['Average', (s) => s.avg, (v) => fmt(v, 2), 'max'],
  ['Bester Match-Ø', (s) => s.bestMatchAvg, (v) => fmt(v, 2), 'max'],
  ['First 9 Ø', (s) => s.f9, (v) => fmt(v, 2), 'max'],
  ['Matches', (s) => s.matches, String, null],
  ['Siege', (s) => s.wins, String, 'max'],
  ['Siegquote', (s) => s.winRate, pct, 'max'],
  ['Längste Serie', (s) => s.bestStreak, String, 'max'],
  ['Legs gewonnen', (s) => s.legsWon, String, 'max'],
  ['Scoring'],
  ['180', (s) => s.counts.t180, String, 'max'],
  ['140+', (s) => s.counts.t140, String, 'max'],
  ['100+', (s) => s.counts.t100, String, 'max'],
  ['60+', (s) => s.counts.t60, String, 'max'],
  ['Ø Aufnahme', (s) => s.perTurn, (v) => fmt(v), 'max'],
  ['Bust-Quote', (s) => s.bustRate, pct, 'min'],
  ['Checkout'],
  ['Höchstes Checkout', (s) => s.highestCo, (v) => v ?? '–', 'max'],
  ['Doppelquote', (s) => s.doubles.rate, pct, 'max'],
  ['Darts aufs Doppel', (s) => s.dartsPerCheckout, (v) => fmt(v), 'min'],
  ...RANGES.map(([name], i) => [`Checkout ${name}`, (s) => s.ranges[i].rate, pct, 'max']),
  ['Legs'],
  ['Bestes Leg', (s) => s.bestLeg, (v) => (v ? `${v} D` : '–'), 'min'],
  ['Ø Darts/Leg', (s) => s.avgLegDarts, (v) => fmt(v), 'min'],
  ['9-Darter', (s) => s.nine, String, 'max'],
  ['Legs ≤ 15 Darts', (s) => s.le15, String, 'max'],
];

function headToHead(a, b) {
  let wa = 0, wb = 0;
  for (const m of S.matches) {
    if (!is501(m)) continue;
    const sa = m.sides.findIndex((s) => s.includes(a)), sb = m.sides.findIndex((s) => s.includes(b));
    if (sa < 0 || sb < 0 || sa === sb) continue;
    if (m.winners?.includes(sa)) wa++; else if (m.winners?.includes(sb)) wb++;
  }
  return [wa, wb];
}

export function compareView() {
  const [a, b] = comparePair();
  const head = `<header class="bar"><button class="sq" data-act="backStats" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Vergleich</span><span class="sq ghost"></span></header>`;
  if (!b) return `${head}<main class="page"><p class="foot">Für einen Vergleich braucht es mindestens zwei Spieler.</p></main>`;
  const A = fullStats(S.matches, a, S.statsPeriod), B = fullStats(S.matches, b, S.statsPeriod);
  const [ha, hb] = headToHead(a, b);
  const ia = S.profiles.findIndex((p) => p.id === a), ib = S.profiles.findIndex((p) => p.id === b);
  const ca = pcVars(ia === ib ? 0 : ia), cb = pcVars(ia === ib ? 1 : ib === ia ? 1 : ib);
  const rows = METRICS.map(([lbl, get, show, dir]) => {
    if (!get) return `<div class="cm-sec">${lbl}</div>`;
    const va = get(A), vb = get(B);
    let wa = false, wb = false;
    if (dir && va !== null && vb !== null && va !== vb && !(dir === 'min' && (!va || !vb))) {
      wa = dir === 'max' ? va > vb : va < vb; wb = !wa;
    }
    return `<div class="cm-row"><span class="cm-v ${wa ? 'best' : ''}">${show(va)}</span><span class="cm-l">${lbl}</span><span class="cm-v r ${wb ? 'best' : ''}">${show(vb)}</span></div>`;
  }).join('');
  return `${head}<main class="page compare">
    <div class="cm-head">
      <button class="cm-p" style="${ca}" data-act="cmpWho" data-k="a"><small>Spieler 1</small><b>${esc(nameOf(a))}</b></button>
      <span class="cm-vs">VS</span>
      <button class="cm-p r" style="${cb}" data-act="cmpWho" data-k="b"><small>Spieler 2</small><b>${esc(nameOf(b))}</b></button>
    </div>
    <div class="cm-h2h"><span>${ha}</span><small>Direkte Duelle (501)</small><span>${hb}</span></div>
    ${seg('period', 'v', PERIOD_OPTS, S.statsPeriod)}
    <div class="cm-table">${rows}</div>
    <p class="foot">Gold = besserer Wert. Grundlage: abgeschlossene 501-Matches im gewählten Zeitraum.</p>
    <h2 class="label">Doppelfelder</h2>
    <div class="cm-dbl">${[[a, A, ca], [b, B, cb]].map(([pid, st, cv]) => `<div class="cm-dcol"><div class="cm-dname" style="${cv}">${esc(nameOf(pid))}</div>${st.matches ? doublesBlock(st, null, false) : '<p class="foot">Keine 501-Matches im Zeitraum.</p>'}</div>`).join('')}</div>
    <p class="foot">Jede Scheibe ist relativ zur eigenen Doppelquote des Spielers eingefärbt.</p>
  </main>`;
}

export function comparePicker(k) {
  const [a, b] = comparePair(), cur = k === 'a' ? a : b, other = k === 'a' ? b : a;
  return `<h3>Spieler ${k === 'a' ? 1 : 2}</h3><p>Wen möchtest du vergleichen?</p>
    <div class="slist plist-pick">${S.profiles.filter((p) => p.id !== other).map((p) => `<button class="srow" data-act="cmpPick" data-k="${k}" data-v="${p.id}">
      <span class="pc sm" style="${pcVars(S.profiles.indexOf(p))}">${esc(p.name.slice(0, 1).toUpperCase())}</span><span class="lbl">${esc(p.name)}</span>${p.id === cur ? '<span class="val">✓</span>' : ''}</button>`).join('')}</div>
    <div class="sbtns"><button class="btn line" data-act="closeModal">Schließen</button></div>`;
}

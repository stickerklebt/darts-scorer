/* Tab „Statistiken“: Spielerwahl, Zeitfilter, Vergleichen – darunter Unter-Reiter
   Überblick · Scoring · Checkout · Doppel · Verlauf. Eine große Zahl pro Karte, Beschriftung klein. */
import { S, ui, nameOf, profile } from '../store.js';
import { fullStats, matchesOf, doubleRating, TIERS, MIN_ATTEMPTS } from '../stats.js';
import { esc, fmt, seg, pcVars } from './common.js';
import { icon, stars, fuse, sparkles } from './svg.js';
import { heatBoard, TIER_COLORS, tierColor } from './board.js';
import { historyCharts, distChart, matchList } from './stats-extra.js';

export const PERIOD_OPTS = [['7d', '7 Tage'], ['30d', '30 Tage'], ['1y', '1 Jahr'], ['all', 'Gesamt']];
export const SUBTABS = [['overview', 'Überblick'], ['doubles', 'Doppel'], ['more', 'Verlauf & mehr']];
/** Frühere Unter-Reiter landen in „Verlauf & mehr“ */
const subOf = (k) => (k === 'scoring' || k === 'checkout' || k === 'history' ? 'more' : SUBTABS.some(([x]) => x === k) ? k : 'overview');
export const PERIOD_LONG = { '7d': 'Letzte 7 Tage', '30d': 'Letzte 30 Tage', '1y': 'Letztes Jahr', all: 'Gesamt' };
export const pct = (x) => (x === null || x === undefined ? '–' : `${fmt(x * 100)} %`);
export const dateStr = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const oppStr = (ids) => ids.map(nameOf).join(' · ');

export const statsPid = () => (profile(S.statsPid) ? S.statsPid : S.mainId);

const block = (title, body) => `<section class="sblock">${title ? `<h2 class="label">${title}</h2>` : ''}${body}</section>`;
/** Karten: [Beschriftung, große Zahl, kleine Zusatzzeile] */
const cards = (items, cls = '') => `<div class="kv ${cls}">${items.map(([k, v, sub], i) => `<div class="kv-c glint" style="--gd:-${(i * 2.3 + 1.1) % 11}s;--i:${i}"><small>${k}</small><b>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`).join('')}</div>`;
const record = (title, value, sub) => `<div class="record">${fuse(4, 10)}<div><small>${title}</small><b class="pop shimmer" data-t="${value}">${value}</b>${sub ? `<em>${sub}</em>` : ''}</div></div>`;
const rankList = (title, rows) => `<div class="rlist"><h3>${title}</h3>${rows.length ? rows.map((r, i) => `<div class="rl"><span class="rl-i">${i + 1}</span><span class="rl-v">${r.score}</span><span class="rl-s">${dateStr(r.date)}${r.opp.length ? ` · gegen ${esc(oppStr(r.opp))}` : ''}</span></div>`).join('') : '<p class="rl-empty">Noch nichts eingetragen</p>'}</div>`;

export function statsHeader(pid) {
  const name = nameOf(pid);
  const pi = S.profiles.findIndex((p) => p.id === pid);
  return `<div class="st-head">
    <button class="st-who glint" data-act="statsWho" style="--gd:-6s">
      <span class="st-name"><small>Statistik von</small><b>${esc(name)}</b></span>${icon('chevR', 2.4, 18)}</button>
    <button class="sq st-clock ${S.statsPeriod !== 'all' ? 'on' : ''}" data-act="periodPick" aria-label="Zeitraum wählen">${icon('clock', 2, 22)}</button>
    ${S.profiles.length > 1 ? `<button class="btn line st-cmp" data-act="compare">Vergleichen</button>` : ''}
  </div>
  ${S.statsPeriod !== 'all' ? `<button class="period-chip" data-act="period" data-v="all">${icon('clock', 2, 15)}<span>${PERIOD_LONG[S.statsPeriod]}</span><b aria-label="Zurück auf Gesamt">×</b></button>` : ''}`;
}

/* ---------------- Unter-Reiter ---------------- */
function overviewTab(st) {
  const c = st.counts;
  return `<div class="hero-stat">${fuse(5, 12)}<small>Overall-Average · 501</small><span class="glitter"><b class="shimmer" data-t="${fmt(st.avg, 2)}">${fmt(st.avg, 2)}</b>${sparkles(9, 7)}</span><em>${st.darts} Darts · ${st.points} Punkte</em></div>
    ${cards([
      ['Bester Average', fmt(st.bestMatchAvg, 2)], ['First 9', fmt(st.f9, 2)],
      ['Höchste Aufnahme', st.top5[0]?.score ?? '–'], ['Höchstes Checkout', st.highestCo ?? '–'],
      ['Doppelquote', pct(st.doubles.rate)], ['Siegquote', pct(st.winRate)], ['180er', c.t180], ['Legs', `${st.legsWon}/${st.legsTotal}`],
    ])}
    <div class="minirow"><span><small>Matches</small><b>${st.matches}</b></span><span><small>Siege</small><b>${st.wins}</b></span><span><small>Längste Serie</small><b>${st.bestStreak}</b></span></div>`;
}

function scoringTab(st) {
  const c = st.counts;
  return block('', rankList('Top 5 Aufnahmen', st.top5))
    + block('Anzahl', cards([['180', c.t180], ['140+', c.t140], ['100+', c.t100], ['60+', c.t60]], 'four'))
    + block('Pro Aufnahme', cards([['Ø Aufnahme', fmt(st.perTurn)], ['Bust-Quote', pct(st.bustRate)]]))
    + block('', distChart(st));
}

function checkoutTab(st) {
  return record('Höchstes Checkout', st.highestCo ?? '–', st.favourite ? `Lieblingsdoppel ${st.favourite.field} (${st.favourite.count}×)` : '')
    + block('Doppel', cards([['Doppelquote', pct(st.doubles.rate), `${st.doubles.hits} / ${st.doubles.attempts}`], ['Ø Darts aufs Doppel', fmt(st.dartsPerCheckout), 'pro Checkout']]))
    + block('Quote nach Bereich', cards(st.ranges.map((r) => [`Rest ${r.name}`, pct(r.rate), `${r.hits} / ${r.chances}`]), 'three'))
    + rankList('Top 5 Checkouts', st.topCo);
}

/** Heatmap + Doppelliste. Farben relativ zur eigenen Gesamtquote, Top 3 mit Gold-/Silber-/Bronze-Rand.
    Liste: beste Quote zuerst oder nach Zahl; Erklärung der Farben klein am Ende. */
export function doublesBlock(st, sel, withList = true) {
  const fields = st.doubles.fields, rating = doubleRating(st.doubles);
  const f = sel && fields[sel] ? fields[sel] : null;
  const rows = Object.entries(fields).map(([k, v]) => ({ k, ...v, rate: v.hits / v.attempts }));
  const sort = ui.heatSort === 'field' ? 'field' : 'rate';
  const num = (k) => (k === 'Bull' ? 25 : Number(k.slice(1)));
  const rated = (r) => (r.attempts >= MIN_ATTEMPTS ? 1 : 0);
  rows.sort((a, b) => (sort === 'field' ? num(a.k) - num(b.k) : rated(b) - rated(a) || b.rate - a.rate || b.attempts - a.attempts));
  const dot = (k) => { const c = tierColor(rating[k]?.tier); return `<i class="dot ${c ? '' : 'none'}" ${c ? `style="background:${c}"` : ''}></i>`; };
  const medal = (k) => (rating[k]?.top ? `<span class="medal m${rating[k].top}" title="Platz ${rating[k].top}"></span>` : '');
  const legend = `<div class="heat-key">
      <span class="hk-scale"><small>schwächer</small>${['bad', 'weak', 'avg', 'good', 'great'].map((t) => `<i style="background:${TIER_COLORS[t]}"></i>`).join('')}<small>besser</small></span>
      <span class="hk-med"><span class="medal m1"></span><span class="medal m2"></span><span class="medal m3"></span><small>deine 3 besten</small></span>
      <span class="hk-none"><i></i><small>unter ${MIN_ATTEMPTS} Versuchen</small></span>
    </div>
    <p class="foot heat-note">Farben im Vergleich zu deiner Gesamt-Doppelquote von ${pct(st.doubles.rate)}.</p>`;
  return `<div class="${withList ? 'dbl-layout' : ''}"><div class="heat">
      <div class="heat-board">${heatBoard(fields, f ? sel : null, rating)}</div>
    </div>
    ${withList ? '<div class="dbl-right">' : ''}
      ${withList ? `<div class="heat-sel">${f ? `<b>${sel}</b><span>${f.attempts} ${f.attempts === 1 ? 'Versuch' : 'Versuche'} · ${f.hits} Treffer · ${pct(f.hits / f.attempts)}</span>` : '<span>Tippe auf ein Doppel für Details.</span>'}</div>` : ''}
    ${withList && rows.length ? `<div class="dbl-head"><h2 class="label">Deine Doppel</h2>${seg('heatSort', 'v', [['rate', 'Beste zuerst'], ['field', 'Nach Zahl']], sort, 'seg sm')}</div>
      <div class="sbtable-wrap"><table class="sbtable dbl"><tr><th><div>Feld</div></th><th><div>Versuche</div></th><th><div>Treffer</div></th><th><div>Quote</div></th></tr>
      ${rows.map((r) => `<tr class="${r.k === sel ? 'sel' : ''}" data-act="heat" data-v="${r.k}"><td>${dot(r.k)}${r.k}${medal(r.k)}</td><td>${r.attempts}</td><td>${r.hits}</td><td>${pct(r.rate)}</td></tr>`).join('')}</table></div>` : ''}
    ${withList ? '</div>' : ''}</div>
    ${withList ? legend : ''}`;
}

/** Einklappbarer Abschnitt (zu Beginn zu), mit kurzer Zusammenfassung im Kopf */
function fold(key, title, summary, body) {
  const open = ui.statsOpen?.has(key);
  return `<section class="fold ${open ? 'open' : ''}">
    <button class="fold-h" data-act="statsFold" data-v="${key}"><span><b>${title}</b>${summary ? `<small>${summary}</small>` : ''}</span>${icon('chevR', 2.4, 18)}</button>
    ${open ? `<div class="fold-b">${body}</div>` : ''}
  </section>`;
}

/** „Verlauf & mehr“: zuerst die Verläufe, darunter alles Weitere eingeklappt */
function moreTab(st) {
  const c = st.counts;
  return block('', historyCharts(st))
    + fold('scoring', 'Scoring', `Höchste ${st.top5[0]?.score ?? '–'} · 180er ${c.t180} · Ø Aufnahme ${fmt(st.perTurn)}`, scoringTab(st))
    + fold('checkout', 'Checkout', `Höchstes ${st.highestCo ?? '–'} · Doppelquote ${pct(st.doubles.rate)}`, checkoutTab(st))
    + fold('legs', 'Legs', `Bestes ${st.bestLeg ? `${st.bestLeg} Darts` : '–'} · Ø ${fmt(st.avgLegDarts)} Darts`,
      cards([['Bestes Leg', st.bestLeg ? `${st.bestLeg} D` : '–'], ['Ø Darts/Leg', fmt(st.avgLegDarts)], ['9-Darter', st.nine], ['Legs ≤ 15 Darts', st.le15]], 'four'))
    + fold('matches', 'Matches', `${st.matches} ${st.matches === 1 ? 'Match' : 'Matches'} · ${st.wins} Siege`,
      matchList(st) + '<button class="btn line hist-link" data-act="history">Alle Spiele · löschen</button>');
}

export function emptyState(pid, any) {
  return `<div class="empty">
    <div class="empty-card"><div>
      ${stars(3, '#0b0a08', 14)}
      <h2 class="display">${any ? 'Ruhige Zeiten' : 'Die Bühne ist frei'}</h2>
      <p>${any ? 'In diesem Zeitraum wurde kein 501-Match gespielt.' : `${esc(nameOf(pid))} hat noch kein 501-Match gespielt. Nach dem ersten Match steht hier alles: Average, Doppelquote, Rekorde und mehr.`}</p>
    </div></div>
    <button class="btn red big" data-act="play501">501 spielen</button>
  </div>`;
}

export function statsView() {
  const pid = statsPid();
  const st = fullStats(S.matches, pid, S.statsPeriod);
  const head = `<main class="page stats">${statsHeader(pid)}`;
  if (!st.matches) return `${head}${emptyState(pid, matchesOf(S.matches, pid).length > 0)}</main>`;
  const sub = subOf(S.statsSub);
  const body = sub === 'doubles' ? doublesBlock(st, ui.heatSel) : sub === 'more' ? moreTab(st) : overviewTab(st);
  return `${head}
    <nav class="subtabs three" style="--n:${SUBTABS.findIndex(([k]) => k === sub)}">${SUBTABS.map(([k, l]) => `<button class="${k === sub ? 'on' : ''}" data-act="statsSub" data-v="${k}">${l}</button>`).join('')}<i class="sub-line"></i></nav>
    <div class="subbody sub-${sub}">${body}</div>
  </main>`;
}

export function profilePicker() {
  const cur = statsPid();
  return `<h3>Spieler wählen</h3><p>Wessen Statistik möchtest du sehen?</p>
    <div class="slist plist-pick">${S.profiles.map((p, i) => `<button class="srow" data-act="statsPick" data-v="${p.id}">
      <span class="pc sm" style="${pcVars(i)}">${esc(p.name.slice(0, 1).toUpperCase())}</span><span class="lbl">${esc(p.name)}${p.id === S.mainId ? ' <span class="tag">Du</span>' : ''}</span>
      ${p.id === cur ? '<span class="val">✓</span>' : ''}</button>`).join('')}</div>
    <div class="sbtns"><button class="btn line" data-act="closeModal">Schließen</button></div>`;
}

/* Tab „Statistiken“: Spielerwahl, Zeitfilter, Vergleichen – darunter Unter-Reiter
   Überblick · Scoring · Checkout · Doppel · Verlauf. Eine große Zahl pro Karte, Beschriftung klein. */
import { S, ui, nameOf, profile } from '../store.js';
import { fullStats, matchesOf, doubleRating, doubleSides, TIERS, MIN_ATTEMPTS } from '../stats.js';
import { esc, fmt, pcVars } from './common.js';
import { icon, stars, fuse, sparkles, goldSmoke, numRing } from './svg.js';
import { heatBoard, tierColor } from './board.js';
import { historyCharts, distChart, doubleChart } from './stats-extra.js';
import { recAttrs } from './legdetail.js';
import { rv } from './reveal.js';
import { situations, legCurve, MIN_N, GOOD, BAD } from '../situations.js';
import { legCurveChart, chartBox } from './charts.js';

export const PERIOD_OPTS = [['7d', '7 Tage'], ['30d', '30 Tage'], ['1y', '1 Jahr'], ['all', 'Gesamt']];
/** Symbole statt Text in der Unter-Reiter-Leiste (hier direkt gezeichnet): Krone · Scheibe · Kurve */
const SUB_ICONS = {
  overview: '<path d="M4 19h16"/><path d="M4.5 16L3 7.5l5 4L12 5l4 6.5 5-4L19.5 16z"/><circle cx="12" cy="5" r=".6" fill="currentColor"/>',
  // Doppel (nach Skizze): zwei Bögen des Doppelrings über die ganze Breite, zwei Segmentlinien, dazwischen das Doppelfeld orange
  doubles: '<defs><linearGradient id="dblFadeX" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset=".28" stop-color="currentColor"/><stop offset=".72" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient><linearGradient id="dblFade" gradientUnits="userSpaceOnUse" x1="0" y1="9" x2="0" y2="22.5"><stop offset="0" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="M4.8 8.83A32 32 0 0 1 19.2 8.83L18.41 12.23A28.5 28.5 0 0 0 5.59 12.23Z" fill="#ea6a2e" stroke="none"/><path d="M-1 10.77A32 32 0 0 1 25 10.77M0.4 13.97A28.5 28.5 0 0 1 23.6 13.97" stroke="url(#dblFadeX)"/><path d="M4.8 8.83L7.95 22.47M19.2 8.83L16.05 22.47" stroke="url(#dblFade)"/>',
  more: '<path d="M3 21h18"/><path d="M4 16l5-5 4 3 7-7"/><path d="M15 7h5v5"/>',
};
const subIcon = (k) => `<svg class="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SUB_ICONS[k]}</svg>`;
export const SUBTABS = [['overview', 'Überblick'], ['doubles', 'Doppel'], ['more', 'Scoring']];
/** Frühere Unter-Reiter landen in „Scoring“ */
const subOf = (k) => (k === 'scoring' || k === 'checkout' || k === 'history' ? 'more' : SUBTABS.some(([x]) => x === k) ? k : 'overview');
export const PERIOD_LONG = { '7d': 'Letzte 7 Tage', '30d': 'Letzte 30 Tage', '1y': 'Letztes Jahr', all: 'Gesamt' };
export const pct = (x) => (x === null || x === undefined ? '–' : `${fmt(x * 100)} %`);
export const dateStr = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const oppStr = (ids) => ids.map(nameOf).join(' · ');

export const statsPid = () => S.mainId; // Statistik immer vom Hauptspieler

const block = (title, body) => `<section class="sblock">${title ? `<h2 class="label">${title}</h2>` : ''}${body}</section>`;
/** Karten: [Beschriftung, große Zahl, kleine Zusatzzeile] */
const cards = (items, cls = '', pid = '') => `<div class="kv ${cls}">${items.map(([k, v, sub, ref], i) => {
  const tap = ref && v !== '–';
  return `<${tap ? 'button' : 'div'} class="kv-c glint ${tap ? 'tap' : ''} ${String(sub).includes('class="rv"') ? 'has-rv' : ''}" ${tap ? recAttrs(ref, pid) : ''} style="--gd:-${(i * 2.3 + 1.1) % 11}s;--i:${i}"><small>${k}</small>${tap ? '<i class="kv-go" aria-hidden="true">›</i>' : ''}${String(sub).includes('class="rv"') ? `<span class="kv-row"><b>${v}</b><em>${sub}</em></span>` : `<b>${v}</b>${sub ? `<em>${sub}</em>` : ''}`}</${tap ? 'button' : 'div'}>`;
}).join('')}</div>`;
const record = (title, value, sub) => `<div class="record">${fuse(4, 10)}<div><small>${title}</small><b class="pop shimmer" data-t="${value}">${value}</b>${sub ? `<em>${sub}</em>` : ''}</div></div>`;
const rankList = (title, rows, pid = '') => `<div class="rlist"><h3>${title}</h3>${rows.length ? rows.map((r, i) => `<${r.mid ? 'button' : 'div'} class="rl ${r.mid ? 'tap' : ''}" ${r.mid ? recAttrs(r, pid) : ''}><span class="rl-i">${i + 1}</span><span class="rl-v">${r.score}</span><span class="rl-s">${dateStr(r.date)}${r.opp.length ? ` · gegen ${esc(oppStr(r.opp))}` : ''}</span></${r.mid ? 'button' : 'div'}>`).join('') : '<p class="rl-empty">Noch nichts eingetragen</p>'}</div>`;

export function statsHeader(pid) {
  const name = nameOf(pid);
  const pi = S.profiles.findIndex((p) => p.id === pid);
  // Der Zeitraum-Knopf steht jetzt in der oberen Symbol-Leiste (statsView); hier nur noch der Chip bei anderem Zeitraum
  return `${S.profiles.length > 1 ? `<div class="st-head"><button class="btn line st-cmp" data-act="compare">Vergleichen</button></div>` : ''}
  ${S.statsPeriod !== 'all' ? `<button class="period-chip" data-act="period" data-v="all">${icon('clock', 2, 15)}<span>${PERIOD_LONG[S.statsPeriod]}</span><b aria-label="Zurück auf Gesamt">×</b></button>` : ''}`;
}

/* ---------------- Unter-Reiter ---------------- */
function overviewTab(st, pid) {
  const c = st.counts;
  // Lieblingsdoppel = Doppel mit der besten Trefferquote (erst ab MIN_ATTEMPTS Versuchen, mindestens ein Treffer)
  const rating = doubleRating(st.doubles);
  const favK = Object.keys(rating).find((k) => rating[k].top === 1);
  const favDbl = favK ? { k: favK, ...st.doubles.fields[favK], rate: st.doubles.fields[favK].hits / st.doubles.fields[favK].attempts } : null;
  return `<div class="hero-stat">${goldSmoke('gsS')}${fuse(5, 12)}<small>Overall-Average · 501</small><span class="glitter">${numRing()}<b class="shimmer" data-t="${fmt(st.avg, 2)}">${fmt(st.avg, 2)}</b>${sparkles(9, 7)}</span><em>Höchste Aufnahme ${st.top5[0]?.score ?? '–'}</em></div>
    ${cards([
      ['Lieblingsdoppel', favDbl ? favDbl.k : '–', favDbl ? rv(`${pct(favDbl.rate)} · ${favDbl.hits} / ${favDbl.attempts}`) : `ab ${MIN_ATTEMPTS} Versuchen`], ['First 9', fmt(st.f9, 2)],
      ['Darts geworfen', st.darts, `${st.points} Punkte`], ['Höchstes Checkout', st.highestCo ?? '–', '', st.topCo[0]],
      ['Doppelquote', pct(st.doubles.rate), rv(`${st.doubles.hits} / ${st.doubles.attempts}`)], ['Ø Darts aufs Doppel', fmt(st.dartsPerCheckout), 'pro Checkout'],
      ['180er', c.t180], ['Bestes Leg', st.bestLeg ? `${st.bestLeg} D` : '–', '', st.bestLegRef],
    ], '', pid)}`;
}

function checkoutTab(st, pid) {
  // Breit: links Höchstes Checkout + Quote nach Bereich, rechts Top 5 Checkouts
  return `<div class="co-layout"><div class="co-left">${record('Höchstes Checkout', st.highestCo ?? '–', '')
    + block('Quote nach Bereich', cards(st.ranges.map((r) => [`Rest ${r.name}`, pct(r.rate), rv(`${r.hits} / ${r.chances}`)]), 'three'))}</div>
    <div class="co-right">${rankList('Top 5 Checkouts', st.topCo, pid)}</div></div>`;
}

/** Fenster unter der Scheibe für das angetippte Doppel: Quote und – bei Fehlwürfen – inside/outside in Prozent */
function dblInfo(st, key) {
  const f = st.doubles.fields[key];
  const head = `<div class="di-head"><b>${key}</b>${f ? `<span class="has-rv"><small>Treffer</small><strong>${pct(f.hits / f.attempts)}</strong><em>${rv(`${f.hits} / ${f.attempts}`)}</em></span>` : ''}
    <button class="di-x" data-act="heat" data-v="${key}" aria-label="Schließen">×</button></div>`;
  if (!f) return `<div class="dbl-info">${head}<p class="di-none">Noch kein Versuch auf ${key}.</p></div>`;
  // Wenn du nicht triffst: inside (ins Board, nicht das Doppel) gegen outside (daneben, 0) – als geteilte Linie in Prozent
  const sd = doubleSides(st.doubles, key);
  if (key === 'Bull') return `<div class="dbl-info"><span class="di-arrow"></span>${head}</div>`; // beim Bull gibt es kein inside/outside
  if (!sd.misses) return `<div class="dbl-info"><span class="di-arrow"></span>${head}<p class="di-none">Jeder Versuch auf ${key} war ein Treffer.</p></div>`;
  const ip = Math.round(sd.insideRate * 100), op = 100 - ip;
  // Seiten mit 0 % werden gar nicht gezeichnet – die andere Seite füllt dann die ganze Linie
  return `<div class="dbl-info"><span class="di-arrow"></span>${head}
    <h4>Wenn du nicht triffst, wirfst du</h4>
    <div class="io-line">
      ${ip > 0 ? `<span class="io-side in ${op === 0 ? 'full' : ''}" style="flex:${ip}"><b>${ip} %</b><small>Inside</small></span>` : ''}
      ${op > 0 ? `<span class="io-side out ${ip === 0 ? 'full' : ''}" style="flex:${op}"><b>${op} %</b><small>Outside</small></span>` : ''}
    </div>
    <div class="io-key"><span>← ins Board (alles außer ${key})</span><span>daneben (0) →</span></div>
    <p class="di-n">${sd.misses} Fehlwürfe · ${sd.inside}× inside · ${sd.outside}× outside</p></div>`;
}

/** Heatmap + Doppelliste. Farben relativ zur eigenen Gesamtquote, Top 3 mit Gold-/Silber-/Bronze-Rand.
    Liste: immer beste Quote zuerst; keine Farb-Erklärung. */
export function doublesBlock(st, sel, withList = true) {
  const fields = st.doubles.fields, rating = doubleRating(st.doubles);
  const rows = Object.entries(fields).map(([k, v]) => ({ k, ...v, rate: v.hits / v.attempts }));
  const rated = (r) => (r.attempts >= MIN_ATTEMPTS ? 1 : 0);
  rows.sort((a, b) => rated(b) - rated(a) || b.rate - a.rate || b.attempts - a.attempts); // immer: beste zuerst
  const dot = (k) => { const c = tierColor(rating[k]?.tier); return `<i class="dot ${c ? '' : 'none'}" ${c ? `style="background:${c}"` : ''}></i>`; };
  return `<div class="${withList ? 'dbl-layout' : ''}"><div class="heat">
      <div class="heat-board">${heatBoard(fields, sel || null, rating)}</div>
      ${withList && sel ? dblInfo(st, sel) : ''}
    </div>
    ${withList ? `<div class="dbl-right">
      <div class="hero-stat dbl-hero has-rv">${fuse(5, 12)}<small>Doppelquote</small><b>${pct(st.doubles.rate)}</b><em>${rv(`${st.doubles.hits} Treffer / ${st.doubles.attempts} Versuche · Ø ${fmt(st.dartsPerCheckout)} Darts pro Checkout`)}</em></div>` : ''}
    ${withList && rows.length ? `<div class="dbl-head"><h2 class="label">Deine Doppel</h2></div>
      <div class="sbtable-wrap dbl-scroll"><table class="sbtable dbl"><tr><th><div>Feld</div></th><th><div>Versuche</div></th><th><div>Treffer</div></th><th><div>Quote</div></th></tr>
      ${rows.map((r) => `<tr class="${r.k === sel ? 'sel' : ''}" data-act="heat" data-v="${r.k}"><td>${dot(r.k)}${r.k}</td><td>${r.attempts}</td><td>${r.hits}</td><td>${pct(r.rate)}</td></tr>`).join('')}</table></div>` : ''}
    ${withList ? '</div>' : ''}</div>`;
}

/** „Scoring“: zuerst die Verläufe, darunter alles Weitere eingeklappt */
function moreTab(st, pid) {
  // Average-Verlauf, Aufnahmen im Leg, Doppelquote-Verlauf, Verteilung der Aufnahmen, dann „Wann du gut wirfst“. Checkout steht im Reiter Doppel.
  const lc = legCurve(matchesOf(S.matches, pid, S.statsPeriod), pid);
  const lcBox = chartBox('Aufnahmen im Leg', `Ø Punkte je Aufnahme von 501 bis 170${lc.avgTurns ? ` · im Schnitt ${fmt(lc.avgTurns, 1)} Aufnahmen` : ''}`, legCurveChart(lc.points));
  return block('', historyCharts(st, pid, lcBox) + doubleChart(st, pid) + distChart(st))
    + situationsBlock(situations(matchesOf(S.matches, pid, S.statsPeriod), pid));
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
  // Unter-Reiter als kleine Symbol-Pille, die über dem Haupt-Reiter „Statistik“ unten auftaucht; Wechsel auch per Wischen (main.js)
  const nav = `<div class="subpop"><nav class="subtabs three" style="--n:${SUBTABS.findIndex(([k]) => k === sub)}">${SUBTABS.map(([k, l]) => `<button class="${k === sub ? 'on' : ''}" data-act="statsSub" data-v="${k}" aria-label="${l}" title="${l}">${subIcon(k)}</button>`).join('')}<i class="sub-line"></i></nav></div>`; // Zeitraum: lange auf den Reiter „Statistik“ drücken (main.js)
  const body = sub === 'doubles' ? doublesBlock(st, ui.heatSel) + checkoutTab(st, pid) : sub === 'more' ? moreTab(st, pid) : overviewTab(st, pid);
  return `${head}
    <div class="subbody sub-${sub}">${body}</div>
  </main>${nav}`;
}

export function profilePicker() {
  const cur = statsPid();
  return `<h3>Spieler wählen</h3><p>Wessen Statistik möchtest du sehen?</p>
    <div class="slist plist-pick">${S.profiles.map((p, i) => `<button class="srow" data-act="statsPick" data-v="${p.id}">
      <span class="pc sm" style="${pcVars(i)}">${esc(p.name.slice(0, 1).toUpperCase())}</span><span class="lbl">${esc(p.name)}${p.id === S.mainId ? ' <span class="tag">Du</span>' : ''}</span>
      ${p.id === cur ? '<span class="val">✓</span>' : ''}</button>`).join('')}</div>
    <div class="sbtns"><button class="btn line" data-act="closeModal">Schließen</button></div>`;
}

/* „Wann du gut wirfst“: Scoring-Aufnahmen nach Umständen (js/situations.js). Oben Kurzfassung, darunter je Gruppe
   eine Zeile pro Umstand: Balken = Abweichung vom eigenen Scoring-Ø, Ø, Chance auf gut/schlecht. Aufnahmen erst auf Tippen. */
const sign = (d) => `${d >= 0 ? '+' : '−'}${fmt(Math.abs(d), 1)}`;
function situationsBlock(r) {
  if (!r.base.n) return block('Wann du gut wirfst', '<p class="chart-empty">Noch keine Scoring-Aufnahmen in diesem Zeitraum.</p>');
  const h = r.highlights, b = r.base;
  const hl = [
    ['Comeback', h.comeback ? pct(h.comeback.rate) : '–', h.comeback ? `nach unter ${BAD} gleich ${GOOD}+ (sonst ${pct(b.good)})` : `ab ${MIN_N} Fällen`],
    ['Clutch', h.clutch ? sign(h.clutch.delta) : '–', h.clutch ? `Ø ${fmt(h.clutch.avg, 1)}, wenn der Gegner im Finish steht` : 'noch zu wenig Fälle'],
    ['Heiße Hand', h.hot ? sign(h.hot.delta) : '–', h.hot ? `Ø ${fmt(h.hot.avg, 1)} nach einer ${GOOD}+` : 'noch zu wenig Fälle'],
    ['Am stärksten', h.best ? fmt(h.best.avg, 1) : '–', h.best ? h.best.label : ''],
    ['Am schwächsten', h.worst ? fmt(h.worst.avg, 1) : '–', h.worst ? h.worst.label : ''],
    ['Start ins Leg', h.start ? sign(h.start.delta) : '–', h.start ? `Ø ${fmt(h.start.avg, 1)} mit der 1. Aufnahme` : 'noch zu wenig Fälle'],
  ];
  // Balken-Maßstab: größte Abweichung füllt die halbe Breite (mind. ±5)
  const ds = Object.values(r.rows).filter((x) => x.n >= MIN_N).map((x) => Math.abs(x.avg - b.avg));
  const scale = Math.max(5, ...ds);
  const row = (k, label) => {
    const x = r.rows[k];
    if (!x || x.n < MIN_N) return `<div class="sit-r off"><span class="sit-l">${label}</span><span class="sit-bar"><span class="sit-few">zu wenig</span></span></div>`;
    const d = x.avg - b.avg, w = Math.min(34, (Math.abs(d) / scale) * 34), up = d >= 0; // max 34 %, damit die Zahl daneben noch Platz hat
    // Nur der Balken; Antippen blendet Ø und Abweichung (grün/rot) an seinem Ende ein
    return `<div class="sit-r has-rv"><span class="sit-l">${label}</span>
      <span class="sit-bar"><i class="${up ? 'up' : 'dn'}" style="${up ? 'left:50%' : `left:${50 - w}%`};width:${w}%"></i>
      <span class="sit-num rv ${up ? 'up' : 'dn'}" style="${up ? `left:calc(${50 + w}% + 8px)` : `right:calc(${50 + w}% + 8px)`}">${sign(d)} <small>Ø ${fmt(x.avg, 1)}</small></span></span></div>`;
  };
  return block('Wann du gut wirfst', `<p class="foot sit-note">Nur Scoring (Rest über 170). Dein Scoring-Ø: <b>${fmt(b.avg, 1)}</b>. Grün = besser als sonst, rot = schlechter – Zeile antippen zeigt die Zahl.</p>
    ${cards(hl, 'three sit-hl')}
    ${r.groups.map(([title, rows]) => `<div class="sit-g"><h3>${title}</h3>${rows.map(([k, l]) => row(k, l)).join('')}</div>`).join('')}`);
}

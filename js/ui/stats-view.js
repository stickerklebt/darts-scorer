/* Tab „Statistiken“ im Programmheft-Stil */
import { S, ui, nameOf, profile } from '../store.js';
import { fullStats, matchesOf } from '../stats.js';
import { esc, fmt, seg, pcVars } from './common.js';
import { divider, icon, stars } from './svg.js';
import { heatBoard, HEAT_STEPS, heatColor } from './board.js';

export const PERIOD_OPTS = [['7d', '7 Tage'], ['30d', '30 Tage'], ['1y', '1 Jahr'], ['all', 'Gesamt']];
export const pct = (x) => (x === null || x === undefined ? '–' : `${fmt(x * 100)} %`);
export const dateStr = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const oppStr = (ids) => ids.map(nameOf).join(' · ');

export const statsPid = () => (profile(S.statsPid) ? S.statsPid : S.mainId);

const section = (title, body, extra = '') => `<section class="pg ${extra}">
  <h2 class="pg-h"><span>${title}</span></h2>${divider()}${body}</section>`;
const kv = (items) => `<div class="kv">${items.map(([k, v, sub]) => `<div class="kv-c"><small>${k}</small><b>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`).join('')}</div>`;
const record = (title, value, sub) => `<div class="record"><div><small>${title}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div></div>`;
const rankList = (title, rows) => `<div class="rlist"><h3>${title}</h3>${rows.length ? rows.map((r, i) => `<div class="rl"><span class="rl-i">${i + 1}</span><span class="rl-v">${r.score}</span><span class="rl-s">${dateStr(r.date)}${r.opp.length ? ` · gegen ${esc(oppStr(r.opp))}` : ''}</span></div>`).join('') : '<p class="rl-empty">Noch nichts eingetragen</p>'}</div>`;

export function statsHeader(pid) {
  const name = nameOf(pid);
  const pi = S.profiles.findIndex((p) => p.id === pid);
  return `<div class="st-head">
    <button class="st-who" data-act="statsWho"><span class="pfblock" style="${pcVars(Math.max(0, pi))}">${esc(name.slice(0, 1).toUpperCase())}</span>
      <span class="st-name"><small>Statistik von</small><b>${esc(name)}</b></span>${icon('chevR', 2.4, 18)}</button>
    ${S.profiles.length > 1 ? `<button class="btn line st-cmp" data-act="compare">Vergleichen</button>` : ""}
  </div>
  ${seg('period', 'v', PERIOD_OPTS, S.statsPeriod)}`;
}

function heatSection(st) {
  const fields = st.doubles.fields;
  const sel = ui.heatSel && fields[ui.heatSel] ? ui.heatSel : null;
  const f = sel ? fields[sel] : null;
  const rows = Object.entries(fields).map(([k, v]) => ({ k, ...v, rate: v.hits / v.attempts }));
  const sort = ui.heatSort || 'attempts';
  const num = (k) => (k === 'Bull' ? 25 : Number(k.slice(1)));
  rows.sort((a, b) => (sort === 'field' ? num(a.k) - num(b.k) : sort === 'rate' ? b.rate - a.rate || b.attempts - a.attempts : b.attempts - a.attempts));
  const th = (k, l) => `<th><button data-act="heatSort" data-v="${k}" class="${sort === k ? 'on' : ''}">${l}${sort === k ? ' ▾' : ''}</button></th>`;
  return section('Doppelfelder', `
    <div class="heat">
      <div class="heat-board">${heatBoard(fields, sel)}</div>
      <div class="heat-legend">${HEAT_STEPS.map((s) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}<span><i class="none"></i>keine Versuche</span></div>
      <div class="heat-sel">${f ? `<b>${sel}</b><span>${f.attempts} ${f.attempts === 1 ? 'Versuch' : 'Versuche'} · ${f.hits} Treffer · ${pct(f.hits / f.attempts)}</span>` : '<span>Tippe auf ein Doppel für Details.</span>'}</div>
    </div>
    ${rows.length ? `<div class="sbtable-wrap"><table class="sbtable dbl"><tr>${th('field', 'Feld')}${th('attempts', 'Versuche')}<th><div>Treffer</div></th>${th('rate', 'Quote')}</tr>
      ${rows.map((r) => `<tr class="${r.k === sel ? 'sel' : ''}" data-act="heat" data-v="${r.k}"><td><i class="dot" style="background:${heatColor(r.rate)}"></i>${r.k}</td><td>${r.attempts}</td><td>${r.hits}</td><td>${pct(r.rate)}</td></tr>`).join('')}</table></div>` : ''}`, 'wide');
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

/** extras: zusätzliche Sektionen (Diagramme, Matchliste) aus Meilenstein 4 */
export function statsView(extras = () => '') {
  const pid = statsPid();
  const st = fullStats(S.matches, pid, S.statsPeriod);
  const head = `<main class="page stats">${statsHeader(pid)}`;
  if (!st.matches) return `${head}${emptyState(pid, matchesOf(S.matches, pid).length > 0)}</main>`;
  const c = st.counts;
  return `${head}<div class="pgs">
    ${section('Überblick', kv([
      ['Average', fmt(st.avg, 2)], ['Bester Match-Ø', fmt(st.bestMatchAvg, 2)], ['First 9 Ø', fmt(st.f9, 2)],
      ['Matches', st.matches], ['Siege', st.wins, pct(st.winRate)], ['Längste Serie', st.bestStreak],
      ['Legs', `${st.legsWon}/${st.legsTotal}`], ['Darts', st.darts], ['Punkte', st.points],
    ]))}
    ${section('Scoring', `${rankList('Top 5 Aufnahmen', st.top5)}${kv([
      ['180', c.t180], ['140+', c.t140], ['100+', c.t100], ['60+', c.t60], ['Ø Aufnahme', fmt(st.perTurn)], ['Bust-Quote', pct(st.bustRate)],
    ])}`)}
    ${section('Checkout', `${record('Höchstes Checkout', st.highestCo ?? '–', st.favourite ? `Lieblingsdoppel ${st.favourite.field} (${st.favourite.count}×)` : '')}
      ${kv([['Doppelquote', pct(st.doubles.rate), `${st.doubles.hits} / ${st.doubles.attempts}`], ['Darts aufs Doppel', fmt(st.dartsPerCheckout), 'pro Checkout'],
        ...st.ranges.map((r) => [`Checkout ${r.name}`, pct(r.rate), `${r.hits} / ${r.chances}`])])}
      ${rankList('Top 5 Checkouts', st.topCo)}`)}
    ${section('Legs', kv([
      ['Bestes Leg', st.bestLeg ? `${st.bestLeg} Darts` : '–'], ['Ø Darts/Leg', fmt(st.avgLegDarts)], ['9-Darter', st.nine], ['Legs ≤ 15 Darts', st.le15],
    ]))}
    ${heatSection(st)}
    ${extras(st, pid)}
  </div></main>`;
}

export function profilePicker() {
  const cur = statsPid();
  return `<h3>Spieler wählen</h3><p>Wessen Statistik möchtest du sehen?</p>
    <div class="slist plist-pick">${S.profiles.map((p, i) => `<button class="srow" data-act="statsPick" data-v="${p.id}">
      <span class="pc sm" style="${pcVars(i)}">${esc(p.name.slice(0, 1).toUpperCase())}</span><span class="lbl">${esc(p.name)}${p.id === S.mainId ? ' <span class="tag">Du</span>' : ''}</span>
      ${p.id === cur ? '<span class="val">✓</span>' : ''}</button>`).join('')}</div>
    <div class="sbtns"><button class="btn line" data-act="closeModal">Schließen</button></div>`;
}

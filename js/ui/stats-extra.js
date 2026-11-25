/* Statistik-Erweiterungen: Verlaufsdiagramme und aufklappbare Matchliste */
import { S, ui, nameOf } from '../store.js';
import { movingAvg, BUCKETS } from '../stats.js';
import { label } from '../checkout.js';
import { lineChart, barChart, chartBox } from './charts.js';
import { x01Table } from './result.js';
import { esc, fmt, pcVars } from './common.js';
import { dateStr } from './stats-view.js';
import { recAttrs } from './legdetail.js';


function legsDetail(m) {
  return m.legs.filter((l) => l.turns.length).map((l, li) => {
    const rounds = Math.max(...m.sides.map((_, s) => l.turns.filter((t) => t.s === s).length));
    const rem = m.sides.map(() => m.opts.start);
    let rows = '';
    for (let r = 0; r < rounds; r++) {
      rows += `<tr><td>${r + 1}</td>${m.sides.map((_, s) => {
        const t = l.turns.filter((x) => x.s === s)[r];
        if (!t) return '<td></td>';
        rem[s] -= t.score;
        const who = m.sides[s].length > 1 ? `<i>${esc(nameOf(t.pid))}</i>` : '';
        if (t.bust) return `<td class="bust">Bust<small>${rem[s]}</small>${who}</td>`;
        if (t.out) return `<td class="out">${t.score}<small>${(t.throws || []).map(label).join(' ')}</small>${who}</td>`;
        return `<td>${t.score}<small>${rem[s]}</small>${who}</td>`;
      }).join('')}</tr>`;
    }
    const setTxt = m.opts.mode === 'sets' ? ` · Set ${l.set}` : '';
    return `<div class="legd"><h4>Leg ${li + 1}${setTxt}${l.winner !== undefined ? ` · an ${esc(m.sides[l.winner].map(nameOf).join(' · '))}` : ''}</h4>
      <table class="turns"><tr><th>#</th>${m.sides.map((side, s) => `<th style="${pcVars(s)}">${esc(side.map(nameOf).join(' · '))}</th>`).join('')}</tr>${rows}</table></div>`;
  }).join('');
}

const ends = (st) => (st.series.length ? { labelL: dateStr(st.series[0].date), labelR: dateStr(st.series[st.series.length - 1].date) } : {});

/** Titel mit Umschalt-Menü (lange drücken → kleines Menü oben links, `ui.chMenu` = welches Menü offen ist) */
export function pickTitle(id, kinds, kind, label) {
  const menu = ui.chMenu === id ? `<span class="ch-menu" role="menu">${kinds.map(([k, l]) => `<button role="menuitemradio" aria-checked="${k === kind}" class="${k === kind ? 'on' : ''}" data-act="chKind" data-m="${id}" data-v="${k}">${l}</button>`).join('')}</span>` : '';
  return `<span class="ch-pick" data-m="${id}" title="Lange drücken zum Umschalten">${label}<i aria-hidden="true">▾</i></span>${menu}`;
}

/** Verlauf: ein Kasten „Average pro Match“ – lange auf den Titel drücken → kleines Menü oben links: Average · First 9 Average (Standard: Average) */
export const AVG_KINDS = [['avg', 'Average pro Match'], ['f9', 'First 9 Average pro Match']];
export function historyCharts(st, pid = '') {
  const kind = ui.avgKind === 'f9' ? 'f9' : 'avg';
  const taps = pid ? st.series.map((s) => recAttrs({ mid: s.id }, pid)) : null;
  const vals = st.series.map((s) => (kind === 'f9' ? s.f9 ?? null : s.avg));
  const label = AVG_KINDS.find(([k]) => k === kind)[1];
  return chartBox(pickTitle('avg', AVG_KINDS, kind, label), kind === 'f9' ? 'Ø der ersten drei Aufnahmen jedes Legs' : '',
    lineChart(vals, movingAvg(vals), { ...ends(st), taps }));
}
/** Doppelquote insgesamt im Verlauf: nach jedem Match die Gesamtquote bis dahin (kumuliert, nicht pro Match).
    Die Kurve beginnt erst ab DBL_MIN Doppelversuchen – vorher springt sie zu stark (100 % … 0 %). */
export const DBL_MIN = 100;
export function cumulativeDoubles(series, min = DBL_MIN) {
  let h = 0, a = 0;
  const vals = series.map((s) => { h += s.dh || 0; a += s.da || 0; return a >= min ? (h / a) * 100 : null; });
  return { vals, attempts: a, first: vals.findIndex((v) => v !== null) };
}
export function doubleChart(st, pid = '') {
  const { vals, attempts, first } = cumulativeDoubles(st.series);
  const title = 'Doppelquote gesamt';
  if (first < 0) return chartBox(title, '', `<p class="chart-empty">Die Kurve startet ab ${DBL_MIN} Doppelversuchen – bisher ${attempts}.</p>`);
  const ser = st.series.slice(first), v = vals.slice(first);
  const taps = pid ? ser.map((s) => recAttrs({ mid: s.id }, pid)) : null;
  return chartBox(title, `Gesamtquote nach jedem Match · ab ${DBL_MIN} Versuchen`, lineChart(v, v, { ...ends({ series: ser }), taps, maxHint: 100, fmt: (x) => `${Math.round(x)}%`,
    key: `<span><i style="background:var(--red)"></i>Doppelquote insgesamt bis zu diesem Match</span>${taps ? '<span class="ck-tap">Punkt antippen = Match</span>' : ''}` }));
}
/** Scoring: Verteilung der Aufnahmen */
export const distChart = (st, title = 'Verteilung der Aufnahmen') => chartBox(title, 'nur Scoring – Rest über 170', barChart(BUCKETS.map(([, lo, hi], i) => [lo === hi ? String(lo) : `${lo}+`, st.buckets[i]])));

/** Aufklappbare Matchliste */
export function matchList(st) {
  return `<div class="mlist">${st.list.map((r) => {
    const open = ui.openMatch === r.id;
    const m = open ? S.matches.find((x) => x.id === r.id) : null;
    return `<div class="ml ${open ? 'open' : ''}">
      <button class="ml-row" data-act="openMatch" data-v="${r.id}">
        <span class="ml-res ${r.solo ? 't' : r.won ? 'w' : 'l'}">${r.solo ? 'T' : r.won ? 'S' : 'N'}</span>
        <span class="ml-mid"><b>${r.solo ? 'Training' : `gegen ${esc(r.opp.map(nameOf).join(' · '))}`}</b><small>${dateStr(r.date)} · ${r.result}</small></span>
        <span class="ml-avg"><small>Ø</small><b>${fmt(r.avg)}</b></span>
      </button>
      ${m ? `<div class="ml-detail">${x01Table(m)}<h2 class="label">Aufnahmen</h2>${legsDetail(m)}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

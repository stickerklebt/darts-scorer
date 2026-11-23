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

/** Verlauf: Average pro Match, darunter optional weiterer Inhalt (Verteilung) */
export function historyCharts(st, pid = '', middle = '') {
  const taps = pid ? st.series.map((s) => recAttrs({ mid: s.id }, pid)) : null;
  const avgs = st.series.map((s) => s.avg);
  return chartBox('Average pro Match', '', lineChart(avgs, movingAvg(avgs), { ...ends(st), taps })) + middle;
}
/** Verlauf der Doppelquote pro Match (steht im Reiter Doppel ganz unten) */
export function doubleChart(st, pid = '') {
  const taps = pid ? st.series.map((s) => recAttrs({ mid: s.id }, pid)) : null;
  const dbl = st.series.map((s) => (s.dbl === null ? null : s.dbl * 100));
  return chartBox('Doppelquote pro Match', '', lineChart(dbl, movingAvg(dbl), { ...ends(st), taps, maxHint: 100, fmt: (v) => `${Math.round(v)}%` }));
}
/** Scoring: Verteilung der Aufnahmen */
export const distChart = (st) => chartBox('Verteilung der Aufnahmen', 'nur Scoring – Rest über 170', barChart(BUCKETS.map(([, lo, hi], i) => [lo === hi ? String(lo) : `${lo}+`, st.buckets[i]])));

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

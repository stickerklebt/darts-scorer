/* Statistik-Erweiterungen: Verlaufsdiagramme und aufklappbare Matchliste */
import { S, ui, nameOf } from '../store.js';
import { movingAvg, BUCKETS } from '../stats.js';
import { label } from '../checkout.js';
import { lineChart, barChart } from './charts.js';
import { x01Table } from './result.js';
import { esc, fmt, pcVars } from './common.js';
import { divider } from './svg.js';
import { dateStr } from './stats-view.js';

const section = (title, body, extra = '') => `<section class="pg ${extra}"><h2 class="pg-h"><span>${title}</span></h2>${divider()}${body}</section>`;

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

export function statsExtras(st) {
  const avgs = st.series.map((s) => s.avg);
  const dbl = st.series.map((s) => (s.dbl === null ? null : s.dbl * 100));
  const ends = st.series.length ? { labelL: dateStr(st.series[0].date), labelR: dateStr(st.series[st.series.length - 1].date) } : {};
  const charts = section('Verlauf', `
    <h3 class="ch-h">Average pro Match</h3>${lineChart(avgs, movingAvg(avgs), ends)}
    <h3 class="ch-h">Doppelquote pro Match</h3>${lineChart(dbl, movingAvg(dbl), { ...ends, maxHint: 100, fmt: (v) => `${Math.round(v)}%` })}
    <h3 class="ch-h">Verteilung der Aufnahmen</h3>${barChart(BUCKETS.map(([l], i) => [l, st.buckets[i]]))}`, 'wide');
  const list = section('Matches', `<div class="mlist">${st.list.map((r) => {
    const open = ui.openMatch === r.id;
    const m = open ? S.matches.find((x) => x.id === r.id) : null;
    return `<div class="ml ${open ? 'open' : ''}">
      <button class="ml-row" data-act="openMatch" data-v="${r.id}">
        <span class="ml-res ${r.won ? 'w' : 'l'}">${r.won ? 'S' : 'N'}</span>
        <span class="ml-mid"><b>gegen ${esc(r.opp.map(nameOf).join(' · '))}</b><small>${dateStr(r.date)} · ${r.result}</small></span>
        <span class="ml-avg"><small>Ø</small><b>${fmt(r.avg)}</b></span>
      </button>
      ${m ? `<div class="ml-detail">${x01Table(m)}<h2 class="label">Aufnahmen</h2>${legsDetail(m)}</div>` : ''}
    </div>`;
  }).join('')}</div>`, 'wide');
  return charts + list;
}

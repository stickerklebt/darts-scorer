/* Screen „Spielhistorie“: alle gespielten Spiele, neueste zuerst, nach Monat gruppiert, Filter nach Modus.
   Antippen öffnet ein Fenster in der Mitte mit den Details (Statistik-Tabelle bzw. Platzierung) – dort lässt sich das Spiel löschen. */
import { S, ui, nameOf, sideName } from '../store.js';
import { historyRows } from '../history.js';
import { GAMES } from '../games.js';
import { esc, fmt, seg } from './common.js';
import { icon, badge } from './svg.js';
import { x01Table, partyRanks } from './result.js';
import { dateStr } from './stats-view.js';

export const HISTORY_FILTER_OPTS = [['all', 'Alle'], ['x01', 'X01'], ['cricket', 'Cricket'], ['party', 'Party']];
const OUT = { win: ['w', 'S'], loss: ['l', 'N'], draw: ['d', '='], solo: ['t', 'T'] };
const month = (t) => new Date(t).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
const time = (t) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

function row(r) {
  const [cls, mark] = OUT[r.outcome] || ['n', '·'];
  const title = GAMES[r.game]?.title || r.game;
  return `<div class="ml hist">
    <button class="ml-row" data-act="histOpen" data-v="${esc(r.id)}">
      <span class="ml-res ${cls}">${mark}</span>
      <span class="hist-badge">${badge(r.game, 30)}</span>
      <span class="ml-mid"><b>${whoText(r)}</b><small>${r.game === 'x01' && r.start ? r.start : title} · ${dateStr(r.date)} ${time(r.date)} · ${esc(r.result)}${r.demo ? ' · Test' : ''}</small></span>
      ${r.game === 'x01' && r.avg !== null ? `<span class="ml-avg"><small>Ø</small><b>${fmt(r.avg)}</b></span>` : ''}
    </button>
  </div>`;
}
const whoText = (r) => (r.side < 0 ? `${esc(r.winners.map(sideName).join(' · '))} gewinnt`
  : r.opp.length ? `gegen ${esc(r.opp.map(nameOf).join(' · '))}` : 'Training');

/** Fenster in der Mitte mit den Details eines Spiels (statt Aufklappen in der Liste) */
export function histSheet(id) {
  const r = historyRows(S.matches, S.mainId).find((x) => x.id === id), m = S.matches.find((x) => x.id === id);
  if (!r || !m) return '<h3>Spiel nicht gefunden</h3><div class="sbtns"><button class="btn red" data-act="closeModal">Schließen</button></div>';
  const title = GAMES[r.game]?.title || r.game;
  const body = m.game === 'x01' ? x01Table(m)
    : m.game === 'bruch' ? `<h2 class="label">Herausforderungen</h2><ul class="br-hist">${(m.bruch?.items || []).map((x) => `<li class="${x.done ? 'ok' : ''}">${x.done ? '✓' : '✕'} ${esc(x.text)}</li>`).join('')}</ul>`
    : `<h2 class="label">Platzierung</h2>${partyRanks(m)}`;
  return `<h3>${whoText(r)}</h3><p>${r.game === 'x01' && r.start ? r.start : title} · ${dateStr(r.date)} ${time(r.date)} · ${esc(r.result)}</p>
    <div class="hist-sheet">${body}</div>
    <div class="sbtns"><button class="btn line hist-del" data-act="histDel" data-v="${esc(r.id)}">${icon('minus', 2.6, 16)} Spiel löschen</button><button class="btn red" data-act="closeModal">Schließen</button></div>`;
}

export function historyView() {
  const filter = HISTORY_FILTER_OPTS.some(([k]) => k === ui.histFilter) ? ui.histFilter : 'all';
  const rows = historyRows(S.matches, S.mainId, filter);
  const head = `<header class="bar"><button class="sq" data-act="histBack" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Spielhistorie</span><span class="sq ghost"></span></header>`;
  let body = '', cur = null, group = [];
  const flush = () => { if (group.length) body += `<h2 class="label">${cur}</h2><div class="mlist">${group.join('')}</div>`; group = []; };
  for (const r of rows) {
    const mo = month(r.date);
    if (mo !== cur) { flush(); cur = mo; }
    group.push(row(r));
  }
  flush();
  if (!rows.length) {
    body = `<div class="empty-card"><div><h2 class="display">${filter === 'all' ? 'Noch keine Spiele' : 'Nichts in dieser Auswahl'}</h2>
      <p>Jedes fertig gespielte Spiel landet hier. Gelöschte Spiele zählen nicht mehr in der Statistik.</p></div></div>`;
  }
  return `${head}<main class="page history">
    ${seg('histFilter', 'v', HISTORY_FILTER_OPTS, filter)}
    <p class="foot hist-note">${rows.length} ${rows.length === 1 ? 'Spiel' : 'Spiele'}. Antippen für Details – dort kannst du ein Spiel löschen. Gelöschte Spiele zählen nicht mehr in der Statistik.</p>
    ${body}
  </main>`;
}

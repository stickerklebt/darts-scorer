/* Ergebnis-/Sieger-Screen */
import { S, ui, nameOf, sideName, isTeam } from '../store.js';
import { avatar } from './avatar.js';
import * as X from '../x01.js';
import * as G from '../party.js';
import * as C from '../cricket.js';
import { GAMES } from '../games.js';
import { esc, fmt, pcVars } from './common.js';
import { ribbon, trophy, cornerOrnament, laurelWreath, fuse, COLORS } from './svg.js';

export function x01Table(m) {
  const w = m.winners, n = m.sides.length;
  const st = m.sides.map((_, s) => X.matchStats(m, { s }));
  const rows = [
    ['Ø 3 Darts', (s) => st[s].avg, (v) => fmt(v, 2), 'max'], ['First 9 Ø', (s) => st[s].f9, (v) => fmt(v, 2), 'max'],
    ...(X.isSets(m) ? [['Sets', (s) => X.setsWon(m, s), String, 'max']] : []), ['Legs', (s) => X.legsWon(m, s), String, 'max'],
    ['Höchste Aufnahme', (s) => st[s].high, String, 'max'], ['100+', (s) => st[s].t100, String, 'max'], ['140+', (s) => st[s].t140, String, 'max'],
    ['180', (s) => st[s].t180, String, 'max'], ['Höchstes Finish', (s) => st[s].hco, (v) => v || '–', 'max'],
    ['Bestes Leg', (s) => st[s].best, (v) => (v ? `${v} Darts` : '–'), 'min'], ['Darts', (s) => st[s].darts, String, null],
  ];
  const body = rows.map(([l, get, show, dir]) => {
    const vals = m.sides.map((_, s) => get(s));
    let best = null;
    if (dir && n > 1) {
      const valid = vals.filter((v) => v !== null && v !== 0);
      if (valid.length) best = dir === 'max' ? Math.max(...valid) : Math.min(...valid);
    }
    return `<tr><td>${l}</td>${vals.map((v) => `<td class="${best !== null && v === best ? 'best' : ''}">${show(v)}</td>`).join('')}</tr>`;
  }).join('');
  const head = `<tr><th><div></div></th>${m.sides.map((side, s) => `<th class="${w.includes(s) ? 'win' : ''}" style="${pcVars(s)}"><div>${esc(isTeam(side) ? `Team ${side.map(nameOf).join(' · ')}` : nameOf(side[0]))}</div></th>`).join('')}</tr>`;
  let per = '';
  if (m.sides.some(isTeam)) {
    per = `<h2 class="label">Pro Spieler</h2><div class="sbtable-wrap"><table class="sbtable"><tr><th><div></div></th><th><div>Ø</div></th><th><div>Höchste</div></th><th><div>Darts</div></th></tr>
      ${m.playerIds.map((pid) => { const p = X.matchStats(m, { pid }); return `<tr><td>${esc(nameOf(pid))}</td><td>${fmt(p.avg)}</td><td>${p.high}</td><td>${p.darts}</td></tr>`; }).join('')}</table></div>`;
  }
  return `<h2 class="label">Statistik</h2><div class="sbtable-wrap"><table class="sbtable">${head}${body}</table></div>${per}`;
}

function partyRanks(m) {
  const ck = m.game === 'cricket' ? C.state(m, false) : null;
  const val = (s) => (ck ? (m.opts.mode === 'close' ? C.TARGETS.filter((t) => ck.marks[s][t] >= 3).length : ck.pts[s]) : G.score(m, s));
  const order = m.sides.map((side, s) => ({ side, s, v: val(s) })).sort((a, b) => b.v - a.v);
  const unit = m.game === 'atc' ? ` / ${G.atcTotal(m)}` : m.game === 'cricket' && m.opts.mode === 'close' ? ' / 7' : m.game === 'cricket' ? ' Pkt' : '';
  return `<div class="ranks">${order.map((o, i) => `<div class="rk ${m.winners.includes(o.s) ? 'first' : ''}" style="${pcVars(o.s)}">
    <span class="rk-pos">${i + 1}</span><span class="rk-name">${esc(sideName(o.side))}</span><span class="rk-val">${o.v}${unit}</span></div>`).join('')}</div>`;
}

export function resultView() {
  const m = S.current, w = m.winners;
  const name = w.length > 1 ? 'Unentschieden' : sideName(m.sides[w[0]]);
  let sub;
  if (m.game === 'x01') {
    sub = m.sides.length > 1
      ? (X.isSets(m) ? m.sides.map((_, s) => X.setsWon(m, s)).join(' : ') + ' Sets' : m.sides.map((_, s) => X.legsWon(m, s)).join(' : ') + ' Legs')
      : `${X.matchStats(m, { s: 0 }).darts} Darts · Ø ${fmt(X.matchStats(m, { s: 0 }).avg)}`;
  } else sub = GAMES[m.game].title;
  return `<main class="page">
    <section class="victory">
      <span class="vic-fx tl">${cornerOrnament(COLORS.ink)}</span><span class="vic-fx tr">${cornerOrnament(COLORS.ink)}</span>${fuse(-4, 12)}
      <div class="vic-cup"><svg class="wreath" viewBox="0 0 200 170" aria-hidden="true">${laurelWreath(100, 92, 72, COLORS.gold, 8)}</svg><span class="cup">${trophy()}</span></div>
      ${ribbon(w.length > 1 ? 'GLEICHSTAND' : 'SIEGER', COLORS.ink, COLORS.gold)}
      <h1 class="display vic-name">${esc(name)}</h1>
      <div class="vic-score num">${sub}</div>
    </section>
    ${ui.endLines?.length ? `<div class="endlines">${ui.endLines.map((l) => `<div class="endline">${avatar(l.id, 52)}<div class="speech in"><b>${esc(nameOf(l.id))}</b>${esc(l.text)}</div></div>`).join('')}</div>` : ''}
    ${m.game === 'x01' ? x01Table(m) : partyRanks(m)}
    <div class="result-btns">
      <button class="btn red big" data-act="rematch">Revanche</button>
      <button class="btn line big" data-act="home">Zur Übersicht</button>
      <button class="btn textonly" data-act="undo">Letzte Eingabe zurücknehmen</button>
    </div>
  </main>`;
}

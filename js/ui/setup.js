/* Setup-Seite im Plakat-Stil */
import { S, nameOf } from '../store.js';
import * as X from '../x01.js';
import * as G from '../party.js';
import { GAMES, MAX_PLAYERS } from '../games.js';
import { esc, pcVars, seg, optRow } from './common.js';
import { badge, divider, icon } from './svg.js';

const TEAM_LETTERS = 'ABCDEF';

function gameOptions(id) {
  const o = S.opts[id];
  if (id === 'x01') {
    const tOpts = o.mode === 'sets' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 7];
    return `<div class="opts">
      ${optRow('Startpunkte', seg('opt', 'start', [[301, '301'], [501, '501'], [701, '701']], o.start))}
      ${optRow('Check-Out', seg('opt', 'out', [['double', 'Double Out'], ['single', 'Single Out']], o.out))}
      ${optRow('Modus', seg('opt', 'mode', [['legs', 'Legs'], ['sets', 'Sets']], o.mode))}
      ${optRow(o.mode === 'sets' ? 'First to … Sets' : 'First to … Legs', seg('opt', 'target', tOpts.map((v) => [v, String(v)]), o.target))}
    </div>
    <p class="foot">${o.mode === 'sets' ? `Ein Set gewinnt, wer zuerst ${X.LEGS_PER_SET} Legs holt. ` : ''}Nur 501-Matches zählen für die Statistik.</p>`;
  }
  if (id === 'highscore') return `<div class="opts">${optRow('Runden', seg('opt', 'rounds', [[5, '5'], [10, '10'], [15, '15'], [20, '20']], o.rounds))}</div>`;
  if (id === 'shanghai') return `<div class="opts">${optRow('Ziele', seg('opt', 'rounds', [[7, '1–7'], [10, '1–10'], [20, '1–20']], o.rounds))}</div>`;
  if (id === 'atc') return `<div class="opts">${optRow('Ende', seg('opt', 'bull', [[1, 'Mit Bull'], [0, 'Bis 20']], o.bull))}</div>`;
  return `<div class="opts">${optRow('Ziele', `<div style="font-size:19px;font-weight:700;letter-spacing:.06em">${G.HALF.map(G.halfLabel).join(' · ')}</div>`)}</div>`;
}

export function setupView() {
  const id = S.game, g = GAMES[id], L = S.lineup, full = L.length >= MAX_PLAYERS;
  const inLineup = new Set(L.map((e) => e.id));
  const saved = S.profiles.filter((p) => !inLineup.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const rows = L.map((e, i) => {
    const ci = S.teamMode ? TEAM_LETTERS.indexOf(e.team) : i;
    return `<div class="prow" style="${pcVars(ci)}">
      <span class="pc">${S.teamMode ? e.team : i + 1}</span>
      <span class="pname">${esc(nameOf(e.id))}</span>
      ${e.id === S.mainId ? '<span class="tag">Du</span>' : ''}
      ${S.teamMode ? `<button class="teambtn" data-act="team" data-v="${i}">Team ${e.team}</button>` : ''}
      <button class="sq sm" data-act="pup" data-v="${i}" ${i ? '' : 'disabled'} aria-label="Nach oben">${icon('up', 2.4, 18)}</button>
      <button class="sq sm del" data-act="pdel" data-v="${i}" aria-label="Entfernen">${icon('minus', 2.8, 18)}</button>
    </div>`;
  }).join('');
  return `<header class="bar"><button class="sq" data-act="home" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Spiel einrichten</span><span class="sq ghost"></span></header>
  <main class="page with-dock">
    <section class="poster"><div class="poster-in">
      ${badge(id, 52)}
      <span class="overline">★ Die Spielregeln ★</span>
      <h1 class="display">${g.title}</h1>
      ${divider('#0b0a08')}
      <p style="margin-top:10px">${g.desc}</p>
    </div></section>
    <h2 class="label">Spieler</h2>
    ${seg('teamMode', 'v', [[0, 'Jeder für sich'], [1, 'Teams']], S.teamMode ? 1 : 0)}
    <div style="height:10px"></div>
    ${L.length ? `<div class="plist">${rows}</div>` : '<p class="foot">Noch keine Spieler ausgewählt.</p>'}
    <div class="addrow">
      <input id="newPlayer" placeholder="Neuer Spieler" maxlength="16" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" ${full ? 'disabled' : ''}>
      <button class="sq" data-act="addNew" ${full ? 'disabled' : ''} aria-label="Hinzufügen">${icon('plus', 2.6)}</button>
    </div>
    ${saved.length ? `<div class="pchips">${saved.map((p) => `<button data-act="addProfile" data-v="${p.id}" ${full ? 'disabled' : ''}>${esc(p.name)}</button>`).join('')}</div>` : ''}
    <button class="btn dark shuffle" data-act="pshuffle" ${L.length < 2 ? 'disabled' : ''}>${icon('shuffle', 2.2, 18)} Reihenfolge mischen</button>
    <p class="foot">Bis zu ${MAX_PLAYERS} Spieler. ${S.teamMode ? 'Tippe auf „Team“, um Spieler zuzuordnen. Im Team wird reihum geworfen, in der Reihenfolge dieser Liste.' : 'Wer oben steht, wirft zuerst.'}</p>
    <h2 class="label">Einstellungen</h2>
    ${gameOptions(id)}
  </main>
  <div class="dock"><div><button class="btn red big" data-act="start">Spiel starten</button></div></div>`;
}

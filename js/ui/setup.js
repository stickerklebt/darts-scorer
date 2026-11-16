/* Setup: ein Screen mit allem, was man vor dem Spiel braucht. Reihenfolge:
   Team-Modus · Spieler & Bots · Startpunkte/Runden · First to X · Anwurf · Start. Rest unter „Mehr Optionen“. */
import { S, ui, nameOf } from '../store.js';
import * as X from '../x01.js';
import * as G from '../party.js';
import { GAMES, MAX_PLAYERS } from '../games.js';
import { BOTS, isBot } from '../bots.js';
import { esc, pcVars, seg, optRow } from './common.js';
import { badge, divider, icon } from './svg.js';
import { avatar } from './avatar.js';

const TEAM_LETTERS = 'ABCDEF';
const SHOW_BOTS = false; // wird mit den Bots (Meilenstein 5) eingeschaltet

/** Punkt 3 + 4: Startpunkte bzw. Runden/Ziele und First to X */
function mainOptions(id) {
  const o = S.opts[id];
  if (id === 'x01') {
    const tOpts = o.mode === 'sets' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 7];
    return optRow('Startpunkte', seg('opt', 'start', [[301, '301'], [501, '501'], [701, '701']], o.start))
      + optRow(o.mode === 'sets' ? 'First to … Sets' : 'First to … Legs', seg('opt', 'target', tOpts.map((v) => [v, String(v)]), o.target));
  }
  if (id === 'highscore') return optRow('Runden', seg('opt', 'rounds', [[5, '5'], [10, '10'], [15, '15'], [20, '20']], o.rounds));
  if (id === 'shanghai') return optRow('Ziele', seg('opt', 'rounds', [[7, '1–7'], [10, '1–10'], [20, '1–20']], o.rounds));
  if (id === 'atc') return optRow('Ende', seg('opt', 'bull', [[1, 'Mit Bull'], [0, 'Bis 20']], o.bull));
  return optRow('Ziele', `<div class="optfix">${G.HALF.map(G.halfLabel).join(' · ')}</div>`);
}

/** Klappfenster „Mehr Optionen“ */
function moreOptions(id) {
  const o = S.opts[id], g = GAMES[id], L = S.lineup;
  const x01 = id === 'x01' ? optRow('Check-Out', seg('opt', 'out', [['double', 'Double Out'], ['single', 'Single Out']], o.out))
    + optRow('Modus', seg('opt', 'mode', [['legs', 'Legs'], ['sets', 'Sets']], o.mode)) : '';
  return `<div class="more ${ui.moreOpen ? 'open' : ''}">
    <button class="more-h" data-act="more"><span>Mehr Optionen</span>${icon('chevR', 2.4, 18)}</button>
    ${ui.moreOpen ? `<div class="more-b">
      ${x01 ? `<div class="opts">${x01}</div>` : ''}
      ${id === 'x01' && o.mode === 'sets' ? `<p class="foot">Ein Set gewinnt, wer zuerst ${X.LEGS_PER_SET} Legs holt.</p>` : ''}
      <button class="btn dark shuffle" data-act="pshuffle" ${L.length < 2 ? 'disabled' : ''}>${icon('shuffle', 2.2, 18)} Reihenfolge mischen</button>
      <section class="rules"><div class="rules-in">
        ${badge(id, 40)}<span class="overline">Die Spielregeln</span>
        <h2 class="display">${g.title}</h2>${divider('#1f2523')}<p>${g.desc}</p>
        ${id === 'x01' ? '<p class="small">Nur 501-Matches zählen für die Statistik.</p>' : ''}
      </div></section>
    </div>` : ''}
  </div>`;
}

export function setupView() {
  const id = S.game, g = GAMES[id], L = S.lineup, full = L.length >= MAX_PLAYERS;
  const inLineup = new Set(L.map((e) => e.id));
  const saved = S.profiles.filter((p) => !inLineup.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const bots = SHOW_BOTS ? BOTS.filter((b) => !inLineup.has(b.id)) : [];
  const rows = L.map((e, i) => {
    const ci = S.teamMode ? TEAM_LETTERS.indexOf(e.team) : i;
    const bot = isBot(e.id);
    return `<div class="prow ${bot ? 'isbot' : ''}" style="${pcVars(ci)}">
      <span class="pc">${S.teamMode ? e.team : i + 1}</span>
      ${bot ? `<span class="pav">${avatar(e.id, 34)}</span>` : ''}
      <span class="pname">${esc(nameOf(e.id))}${bot ? `<small>Bot · Ø ${BOTS.find((b) => b.id === e.id).avg}</small>` : ''}</span>
      ${e.id === S.mainId ? '<span class="tag">Du</span>' : ''}
      ${S.teamMode ? `<button class="teambtn" data-act="team" data-v="${i}">Team ${e.team}</button>` : ''}
      <button class="sq sm" data-act="pup" data-v="${i}" ${i ? '' : 'disabled'} aria-label="Nach oben">${icon('up', 2.4, 18)}</button>
      <button class="sq sm del" data-act="pdel" data-v="${i}" aria-label="Entfernen">${icon('minus', 2.8, 18)}</button>
    </div>`;
  }).join('');
  const nSides = S.teamMode ? new Set(L.map((e) => e.team)).size : L.length;
  return `<header class="bar"><button class="sq" data-act="home" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">${g.title}</span><span class="sq ghost"></span></header>
  <main class="page with-dock setup">
    <div class="su-head">${badge(id, 40)}<div><b class="display">${g.title}</b><small>${id === 'x01' ? 'Der Klassiker' : 'Partyspiel'}</small></div></div>
    <h2 class="label"><i class="stepn">1</i>Modus</h2>
    ${seg('teamMode', 'v', [[0, 'Jeder für sich'], [1, 'Teams']], S.teamMode ? 1 : 0)}
    <h2 class="label"><i class="stepn">2</i>${SHOW_BOTS ? 'Spieler &amp; Bots' : 'Spieler'}</h2>
    ${L.length ? `<div class="plist">${rows}</div>` : '<p class="foot">Noch keine Spieler ausgewählt.</p>'}
    <div class="addrow">
      <input id="newPlayer" placeholder="Neuer Spieler" maxlength="16" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" ${full ? 'disabled' : ''}>
      <button class="sq" data-act="addNew" ${full ? 'disabled' : ''} aria-label="Hinzufügen">${icon('plus', 2.6)}</button>
    </div>
    ${saved.length ? `<div class="pchips">${saved.map((p) => `<button data-act="addProfile" data-v="${p.id}" ${full ? 'disabled' : ''}>${esc(p.name)}</button>`).join('')}</div>` : ''}
    ${bots.length ? `<div class="botchips">${bots.map((b) => `<button data-act="addProfile" data-v="${b.id}" ${full ? 'disabled' : ''}>${avatar(b.id, 30)}<span><b>${esc(b.name)}</b><small>Bot · Ø ${b.avg}</small></span>${icon('plus', 2.6, 16)}</button>`).join('')}</div>` : ''}
    <p class="foot">Bis zu ${MAX_PLAYERS} Spieler. ${S.teamMode ? 'Tippe auf „Team“, um Spieler zuzuordnen. Im Team wird reihum geworfen, in der Reihenfolge dieser Liste.' : ''}</p>
    <h2 class="label"><i class="stepn">3</i>Spiel</h2>
    <div class="opts">${mainOptions(id)}</div>
    <h2 class="label"><i class="stepn">4</i>Anwurf</h2>
    ${seg('anwurf', 'v', [['bull', 'Ausbullen'], ['list', 'Wer oben steht']], S.anwurf)}
    <p class="foot">${nSides < 2 ? 'Bei nur einer Seite entfällt der Anwurf.' : S.anwurf === 'bull' ? 'Vor dem Match wirft jede Seite einen Dart aufs Bull. Wer am nächsten dran ist, fängt an.' : 'Der erste Spieler bzw. das erste Team der Liste fängt an.'}</p>
    ${moreOptions(id)}
  </main>
  <div class="dock"><div><button class="btn red big start" data-act="start">Start</button></div></div>`;
}

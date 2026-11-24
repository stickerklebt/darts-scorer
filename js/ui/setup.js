/* Setup: ein Screen mit allem, was man vor dem Spiel braucht. Sichtbar: Spieler & Bots · Spiel (First to X bzw. Runden)
   · Start. Seltenes unter „Mehr Optionen“: Anwurf (Ausbullen), Teams, Startpunkte, Check-Out, Legs/Sets, Mischen, Regeln. */
import { S, ui, nameOf } from '../store.js';
import * as X from '../x01.js';
import * as G from '../party.js';
import * as F from '../football.js';
import { GAMES, MAX_PLAYERS } from '../games.js';
import { BOTS, isBot } from '../bots.js';
import { esc, pcVars, seg, optRow } from './common.js';
import { badge, divider, icon, fuse } from './svg.js';
import { avatar } from './avatar.js';
import { camReady } from './camstation.js';
import { wheelHTML } from './wheel.js';

const TEAM_LETTERS = 'ABCDEF';

/** Punkt 3 + 4: Startpunkte bzw. Runden/Ziele und First to X */
function mainOptions(id) {
  const o = S.opts[id];
  if (id === 'x01') {
    // 501 nur über die große Karte; die X01-Kachel wählt einen anderen Startwert
    if (ui.x01Var !== 'other' && o.start !== 501) o.start = 501; // große Karte: immer 501, nicht umstellbar
    const start = ui.x01Var === 'other' ? optRow('Startpunkte', seg('opt', 'start', [[101, '101'], [301, '301'], [701, '701'], [1001, '1001']], o.start)) : '';
    // Drehrad: Legs 1–20, Sets 1–10
    return start + optRow(o.mode === 'sets' ? 'First to … Sets' : 'First to … Legs', wheelHTML('target', 1, o.mode === 'sets' ? 10 : 20, o.target));
  }
  if (id === 'highscore') return optRow('Runden', seg('opt', 'rounds', [[5, '5'], [10, '10'], [15, '15'], [20, '20']], o.rounds));
  if (id === 'shanghai') return optRow('Ziele', seg('opt', 'rounds', [[7, '1–7'], [10, '1–10'], [20, '1–20']], o.rounds));
  if (id === 'atc') return optRow('Ende', seg('opt', 'bull', [[1, 'Mit Bull'], [0, 'Bis 20']], o.bull));
  if (id === 'cricket') return optRow('Variante', seg('opt', 'mode', [['points', 'Mit Punkten'], ['close', 'Nur Schließen']], o.mode))
    + optRow('Runden (max.)', seg('opt', 'rounds', [[15, '15'], [20, '20'], [25, '25']], o.rounds));
  if (id === 'football') return optRow('Tore bis zum Sieg', seg('opt', 'target', [[3, '3'], [5, '5'], [7, '7']], o.target))
    + optRow('Tore (Seite 1 · Seite 2)', seg('opt', 'goal', [16, 20, 6, 19].map((g) => [g, `D${g} · D${F.opposite(g)}`]), o.goal))
    + '<p class="foot">Fußball spielt man immer einer gegen einen – genau zwei Spieler in der Liste.</p>';
  return optRow('Ziele', `<div class="optfix">${G.HALF.map(G.halfLabel).join(' · ')}</div>`);
}

/** Klappfenster „Mehr Optionen“ */
function moreOptions(id) {
  const o = S.opts[id], g = GAMES[id], L = S.lineup;
  const x01 = id === 'x01' ? optRow('Check-Out', seg('opt', 'out', [['double', 'Double Out'], ['single', 'Single Out']], o.out))
    + optRow('Gespielt wird in', seg('opt', 'mode', [['legs', 'Legs'], ['sets', 'Sets']], o.mode)) : '';
  // Teams erst ab 2 Spielern (im Team spielen sie zusammen eine Punktzahl herunter) – vorher ausgegraut
  if (L.length < 2 && S.teamMode) S.teamMode = false;
  // Anwurf: Standard „wer oben steht, fängt an“; Ausbullen nur hier unter „Mehr Optionen“ (ab zwei Seiten, nicht online)
  const sides = S.teamMode ? new Set(L.map((e) => e.team)).size : L.length, online = L.some((e) => e.friend?.mode === 'remote');
  const anwurf = sides >= 2 && !online ? optRow('Anwurf', seg('anwurf', 'v', [['list', 'Wer oben steht'], ['bull', 'Ausbullen']], S.anwurf))
    + `<p class="foot">${S.anwurf === 'bull' ? 'Vor dem Match wirft jede Seite einen Dart aufs Bull. Wer am nächsten dran ist, fängt an.' : 'Der erste Spieler bzw. das erste Team der Liste fängt an.'}</p>` : '';
  const team = optRow('Spielweise', `<div class="${L.length < 2 ? 'seg-off' : ''}">${seg('teamMode', 'v', [[0, 'Jeder für sich'], [1, 'Teams']], S.teamMode ? 1 : 0)}</div>`)
    + (L.length < 2 ? '<p class="foot">Teams gibt es ab 2 Spielern – im Team spielt ihr zusammen von 501 herunter.</p>' : '');
  return `<div class="more ${ui.moreOpen ? 'open' : ''}">
    <button class="more-h" data-act="more"><span>Mehr Optionen</span>${icon('chevR', 2.4, 18)}</button>
    ${ui.moreOpen ? `<div class="more-b">
      <div class="opts">${anwurf}${team}${x01}</div>
      ${S.teamMode ? '<p class="foot">Tippe bei den Spielern auf „Team“, um sie zuzuordnen. Im Team wird reihum geworfen, in der Reihenfolge der Liste.</p>' : ''}
      ${id === 'x01' && o.mode === 'sets' ? `<p class="foot">Ein Set gewinnt, wer zuerst ${X.LEGS_PER_SET} Legs holt.</p>` : ''}
      <button class="btn dark shuffle" data-act="pshuffle" ${L.length < 2 ? 'disabled' : ''}>${icon('shuffle', 2.2, 18)} Reihenfolge mischen</button>
      <section class="rules"><div class="rules-in">
        ${badge(id, 40)}<span class="overline">Die Spielregeln</span>
        <h2 class="display">${g.title}</h2>${divider('#0b0a08')}<p>${g.desc}</p>
        ${id === 'x01' ? '<p class="small">Nur 501-Matches zählen für die Statistik.</p>' : ''}
      </div></section>
    </div>` : ''}
  </div>`;
}

/** „Mit Kamera-Erkennung spielen“: nur wenn ein Kamera-Gerät verbunden ist (bzw. Ein-Geräte-Modus) und der Modus einzelne Darts zählt */
function camRow(id) {
  const c = camReady();
  if (!c.connected || !['x01', 'cricket'].includes(id)) return '';
  if (!c.calibrated) return '<div class="cam-opt off"><span>Kamera verbunden – bitte am Kamera-Gerät kalibrieren</span></div>';
  return `<button class="cam-opt" data-act="pref" data-k="camPlay"><span><b>Mit Kamera-Erkennung spielen</b><small>Würfe kommen von der Kamera, du kannst sie korrigieren</small></span><span class="tog ${S.prefs.camPlay !== false ? 'on' : ''}"></span></button>`;
}

export function setupView() {
  const id = S.game, g = GAMES[id], L = S.lineup, full = L.length >= MAX_PLAYERS;
  const rows = L.map((e, i) => {
    const ci = S.teamMode ? TEAM_LETTERS.indexOf(e.team) : i;
    const bot = isBot(e.id);
    const open = ui.prowSel === i; // Hoch/Entfernen erst nach Antippen des Spielers
    return `<div class="prow ${bot ? 'isbot' : ''} ${open ? 'open' : ''}" style="${pcVars(ci)}" data-act="prowSel" data-v="${i}">
      <span class="pc">${S.teamMode ? e.team : i + 1}</span>
      ${bot ? `<span class="pav">${avatar(e.id, 34)}</span>` : ''}
      <span class="pname">${esc(nameOf(e.id))}${bot ? `<small>Bot · Ø ${BOTS.find((b) => b.id === e.id).avg}</small>` : e.friend ? `<small>Freund · ${e.friend.mode === 'remote' ? 'spielt auf seinem Gerät' : 'spielt hier mit, bestätigt danach'}</small>` : e.guest ? '<small>Gast · nur dieses Spiel, ohne Statistik</small>' : ''}</span>
      ${S.teamMode ? `<button class="teambtn" data-act="team" data-v="${i}">Team ${e.team}</button>` : ''}
      ${open ? `<button class="sq sm" data-act="pup" data-v="${i}" ${i ? '' : 'disabled'} aria-label="Nach oben">${icon('up', 2.4, 18)}</button>
      <button class="sq sm del" data-act="pdel" data-v="${i}" aria-label="Entfernen">${icon('minus', 2.8, 18)}</button>` : ''}
    </div>`;
  }).join('');
  const remote = L.find((e) => e.friend?.mode === 'remote');
  return `<header class="bar"><button class="sq" data-act="home" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title"></span><span class="sq ghost"></span></header>
  <main class="page with-dock setup">
    <div class="su-title">${badge(id, 44)}<h1>${id === 'x01' && ui.x01Var !== 'other' ? '501' : g.title}</h1></div>
    ${L.length ? `<div class="plist">${rows}</div>` : '<p class="foot">Noch keine Spieler ausgewählt.</p>'}
    <button class="btn line addp" data-act="addPlayer" ${full ? 'disabled' : ''}>${icon('plus', 2.6, 18)} Spieler hinzufügen</button>
    ${remote ? `<p class="foot"><b class="solo-hint">Online gegen ${esc(remote.name)}:</b> jeder an seinem Gerät, der Anwurf wird ausgelost.</p>` : ''}
    <div class="opts">${mainOptions(id)}</div>
    ${camRow(id)}
    ${moreOptions(id)}
  </main>
  <div class="dock su-dock"><div><button class="start-pill" data-act="start"><span>${remote ? `${esc(remote.name)} einladen` : !S.teamMode && L.length === 1 ? 'Solo starten' : 'Start'}</span></button></div></div>`;
}

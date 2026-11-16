/* Dialoge: Zahnrad, Einstellungen, Daten löschen, Name, Bestätigungen */
import { S, ui, nameOf } from '../store.js';
import { BOTS } from '../bots.js';
import { avatar } from './avatar.js';
import { icon, divider } from './svg.js';
import { pcVars } from './common.js';
import * as G from '../party.js';
import { GAMES } from '../games.js';
import { esc, seg, matchSummary } from './common.js';
import { profilePicker } from './stats-view.js';
import { comparePicker } from './compare.js';

const tog = (k, lbl) => `<button class="srow" data-act="pref" data-k="${k}"><span class="lbl">${lbl}</span><span class="tog ${S.prefs[k] ? 'on' : ''}"></span></button>`;

export function sheetView() {
  const md = ui.modal, m = S.current;
  if (!md) return '';
  let inner = '';
  if (md.type === 'gear') {
    const o = m.opts;
    const info = m.game === 'x01'
      ? [['Startpunkte', o.start], ['Check-Out', o.out === 'double' ? 'Double Out' : 'Single Out'], ['Modus', `First to ${o.target} ${o.mode === 'sets' ? 'Sets' : 'Legs'}`]]
      : m.game === 'cricket' ? [['Spiel', 'Cricket'], ['Variante', o.mode === 'close' ? 'Nur Schließen' : 'Mit Punkten'], ['Runden (max.)', o.rounds]]
      : [['Spiel', GAMES[m.game].title], ...(m.game === 'atc' ? [] : [['Runden', G.rounds(m)]])];
    inner = `<h3>Einstellungen</h3><p>${matchSummary(m)}</p>
      <div class="slist">
        ${m.game === 'x01' || m.game === 'cricket' ? `<div class="srow col"><span class="lbl">Einzeldart-Eingabe</span>${seg('dartInput', 'v', [['keys', 'Tastatur'], ['board', 'Dartscheibe']], S.prefs.dartInput)}</div>` : ''}
        ${tog('voice', 'Ansage')}${m.game === 'x01' ? tog('hints', 'Checkout-Hilfe') : ''}${tog('anim', 'Animationen')}
      </div>
      <div class="slist">${info.map(([a, b]) => `<div class="srow"><span class="lbl">${a}</span><span class="val">${b}</span></div>`).join('')}</div>
      <div class="sbtns"><button class="btn line" data-act="abort" style="color:var(--red);border-color:var(--red)">Spiel beenden</button><button class="btn red" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'settings') {
    inner = `<h3>Einstellungen</h3><p>${S.profiles.length} Spieler · ${S.matches.length} gespeicherte Spiele</p>
      <div class="slist">${tog('voice', 'Ansage')}${tog('hints', 'Checkout-Hilfe')}${tog('anim', 'Animationen')}
        <div class="srow col"><span class="lbl">Einzeldart-Eingabe</span>${seg('dartInput', 'v', [['keys', 'Tastatur'], ['board', 'Dartscheibe']], S.prefs.dartInput)}</div></div>
      ${S.matches.some((x) => x.demo) || S.profiles.some((x) => x.demo) ? '<button class="btn dark demo-btn" data-act="demoWipe">Testdaten entfernen</button>' : ''}
      <div class="sbtns"><button class="btn line" data-act="wipe" style="color:var(--red);border-color:var(--red)">Alle Daten löschen</button><button class="btn red" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'addPlayer') {
    inner = addPlayerSheet();
  } else if (md.type === 'pickCmp') {
    inner = comparePicker(md.k);
  } else if (md.type === 'pickStats') {
    inner = profilePicker();
  } else if (md.type === 'wipe') {
    inner = `<h3>Alle Daten löschen?</h3><p>Alle Spieler, Spiele und Statistiken werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.</p>
      <div class="sbtns"><button class="btn line" data-act="settings">Abbrechen</button><button class="btn red" data-act="wipeForce">Löschen</button></div>`;
  } else if (md.type === 'rename') {
    inner = `<h3>Dein Name</h3><p>Der Hauptspieler dieser App.</p>
      <input id="nameField" class="field" value="${esc(nameOf(S.mainId))}" maxlength="16" autocapitalize="words" spellcheck="false" enterkeyhint="done">
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="saveName">Sichern</button></div>`;
  } else if (md.type === 'confirmNew') {
    inner = `<h3>Neues Spiel?</h3><p>Das laufende Spiel (${matchSummary(m)}) wird beendet und nicht gespeichert.</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="startForce">Starten</button></div>`;
  } else if (md.type === 'demoWipe') {
    inner = `<h3>Testdaten entfernen?</h3><p>Alle Test-Matches und die Testspieler werden gelöscht. Deine echten Spiele und Spieler bleiben erhalten.</p>
      <div class="sbtns"><button class="btn line" data-act="settings">Abbrechen</button><button class="btn red" data-act="demoWipeForce">Entfernen</button></div>`;
  } else if (md.type === 'abort') {
    inner = `<h3>Spiel beenden?</h3><p>Der Spielstand geht verloren und zählt nicht für die Statistik.</p>
      <div class="sbtns"><button class="btn line" data-act="gear">Abbrechen</button><button class="btn red" data-act="abortForce">Beenden</button></div>`;
  }
  return `<div class="scrim" data-act="scrim"><div class="sheet">${inner}</div></div>`;
}

/** Spieler hinzufügen: drei Wege – neuer Spieler, bekannter Spieler (mit Suche), Bot */
function addPlayerSheet() {
  const tab = ui.addTab || 'new';
  const inLineup = new Set(S.lineup.map((e) => e.id));
  const saved = S.profiles.filter((p) => !inLineup.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const bots = BOTS.filter((b) => !inLineup.has(b.id));
  const tabs = [['new', 'Neuer Spieler'], ['known', 'Bekannter Spieler'], ['bot', 'Bot als Gegner']];
  let body;
  if (tab === 'new') {
    body = `<p class="ap-hint">Wie heißt der neue Mitspieler? Jeder Name gibt es nur einmal.</p>
      <input id="newPlayer" class="field" placeholder="Name" maxlength="16" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done">
      <p id="nameHint" class="name-hint" aria-live="polite"></p>
      <button class="btn red big" id="addNewBtn" data-act="addNew" disabled>Hinzufügen</button>`;
  } else if (tab === 'known') {
    body = saved.length ? `${saved.length > 5 ? `<input id="pSearch" class="field search" placeholder="Suchen …" autocomplete="off" autocorrect="off" spellcheck="false">` : ''}
      <div class="slist plist-pick">${saved.map((p) => `<button class="srow" data-act="addProfile" data-v="${p.id}" data-name="${esc(p.name.toLowerCase())}">
        <span class="pc sm" style="${pcVars(S.profiles.indexOf(p))}">${esc(p.name.slice(0, 1).toUpperCase())}</span><span class="lbl">${esc(p.name)}</span>${icon('plus', 2.6, 18)}</button>`).join('')}</div>
      <p class="foot nores" hidden>Kein Spieler gefunden.</p>`
      : '<p class="ap-hint">Alle gespeicherten Spieler sind schon dabei – oder es gibt noch keine. Lege einfach einen neuen an.</p>';
  } else {
    body = bots.length ? `<div class="slist">${bots.map((b) => `<button class="srow botrow" data-act="addProfile" data-v="${b.id}">${avatar(b.id, 44)}
        <span class="lbl">${esc(b.name)}<small>Bot · Average ${b.avg}</small></span>${icon('plus', 2.6, 18)}</button>`).join('')}</div>`
      : '<p class="ap-hint">Alle Bots spielen schon mit.</p>';
  }
  return `<div class="ap-head"><h3>Spieler hinzufügen</h3>${divider()}<p>Wer wirft heute mit?</p></div>
    <div class="seg ap-tabs">${tabs.map(([k, l]) => `<button data-act="addTab" data-v="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="ap-body">${body}</div>
    <div class="sbtns"><button class="btn line" data-act="closeModal">Fertig</button></div>`;
}

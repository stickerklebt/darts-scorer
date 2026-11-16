/* Dialoge: Zahnrad, Einstellungen, Daten löschen, Name, Bestätigungen */
import { S, ui, nameOf } from '../store.js';
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
      : [['Spiel', GAMES[m.game].title], ...(m.game === 'atc' ? [] : [['Runden', G.rounds(m)]])];
    inner = `<h3>Einstellungen</h3><p>${matchSummary(m)}</p>
      <div class="slist">
        ${m.game === 'x01' ? `<div class="srow col"><span class="lbl">Einzeldart-Eingabe</span>${seg('dartInput', 'v', [['keys', 'Tastatur'], ['board', 'Dartscheibe']], S.prefs.dartInput)}</div>` : ''}
        ${tog('voice', 'Ansage')}${m.game === 'x01' ? tog('hints', 'Checkout-Hilfe') : ''}${tog('anim', 'Animationen')}
      </div>
      <div class="slist">${info.map(([a, b]) => `<div class="srow"><span class="lbl">${a}</span><span class="val">${b}</span></div>`).join('')}</div>
      <div class="sbtns"><button class="btn line" data-act="abort" style="color:var(--red);border-color:var(--red)">Spiel beenden</button><button class="btn red" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'settings') {
    inner = `<h3>Einstellungen</h3><p>${S.profiles.length} Spieler · ${S.matches.length} gespeicherte Spiele</p>
      <div class="slist">${tog('voice', 'Ansage')}${tog('hints', 'Checkout-Hilfe')}${tog('anim', 'Animationen')}
        <div class="srow col"><span class="lbl">Einzeldart-Eingabe</span>${seg('dartInput', 'v', [['keys', 'Tastatur'], ['board', 'Dartscheibe']], S.prefs.dartInput)}</div></div>
      <div class="sbtns"><button class="btn line" data-act="wipe" style="color:var(--red);border-color:var(--red)">Alle Daten löschen</button><button class="btn red" data-act="closeModal">Fertig</button></div>`;
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
  } else if (md.type === 'abort') {
    inner = `<h3>Spiel beenden?</h3><p>Der Spielstand geht verloren und zählt nicht für die Statistik.</p>
      <div class="sbtns"><button class="btn line" data-act="gear">Abbrechen</button><button class="btn red" data-act="abortForce">Beenden</button></div>`;
  }
  return `<div class="scrim" data-act="scrim"><div class="sheet">${inner}</div></div>`;
}

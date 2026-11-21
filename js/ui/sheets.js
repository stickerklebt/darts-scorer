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
import { auth, sync } from '../sync.js';
import { dateStr } from './stats-view.js';
import { legSheet } from './legdetail.js';

/** Sync-Stand in Worten */
function syncText() {
  if (sync.state === 'busy') return 'Wird gesichert …';
  if (sync.state === 'ok') return `Gesichert${sync.at ? ` · ${new Date(sync.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}`;
  if (sync.state === 'offline') return 'Offline – wird nachgeholt';
  if (sync.state === 'error') return 'Fehler – wird erneut versucht';
  return '–';
}
const pwField = (id, ph, ac) => `<input id="${id}" class="field plain" type="password" placeholder="${ph}" autocomplete="${ac}">`;

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
        ${tog('voice', 'Ansage')}${m.game === 'x01' ? tog('hints', 'Checkout-Hilfe') : ''}${tog('showAvg', 'Average anzeigen')}${tog('anim', 'Animationen')}
      </div>
      <div class="slist">${info.map(([a, b]) => `<div class="srow"><span class="lbl">${a}</span><span class="val">${b}</span></div>`).join('')}</div>
      <div class="sbtns"><button class="btn line" data-act="abort" style="color:var(--red);border-color:var(--red)">Spiel beenden</button><button class="btn red" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'settings') {
    const u = auth.user;
    inner = `<h3>Einstellungen</h3><p>${S.profiles.length} Spieler · ${S.matches.length} gespeicherte Spiele</p>
      ${u ? `<div class="slist acct">
        <button class="srow" data-act="rename"><span class="lbl">Name<small>Freunde finden dich darüber</small></span><span class="val">${esc(u.username)}</span>${icon('chevR', 2.4, 16)}</button>
        <div class="srow"><span class="lbl">E-Mail<small>Konto seit ${dateStr(u.createdAt)}</small></span><span class="val mail">${esc(u.email)}</span></div>
        <div class="srow"><span class="lbl">Daten</span><span class="val sync-${sync.state}">${syncText()}</span></div>
      </div>
      <div class="sbtns acct-btns"><button class="btn dark" data-act="pwOpen">Passwort ändern</button><button class="btn dark" data-act="logout">Abmelden</button></div>` : ''}
      <div class="slist">${tog('voice', 'Ansage')}${tog('hints', 'Checkout-Hilfe')}${tog('showAvg', 'Average im Spiel anzeigen')}${tog('anim', 'Animationen')}
        <div class="srow col"><span class="lbl">Einzeldart-Eingabe</span>${seg('dartInput', 'v', [['keys', 'Tastatur'], ['board', 'Dartscheibe']], S.prefs.dartInput)}</div></div>
      ${S.matches.some((x) => x.demo) || S.profiles.some((x) => x.demo) ? '<button class="btn dark demo-btn" data-act="demoWipe">Testdaten entfernen</button>' : ''}
      <div class="sbtns"><button class="btn line" data-act="wipe" style="color:var(--red);border-color:var(--red)">Alle Daten löschen</button><button class="btn red" data-act="closeModal">Fertig</button></div>
      ${u ? '<button class="btn textonly del-acct" data-act="delAcct">Konto löschen</button>' : ''}`;
  } else if (md.type === 'addPlayer') {
    inner = addPlayerSheet();
  } else if (md.type === 'pickCmp') {
    inner = comparePicker(md.k);
  } else if (md.type === 'leg') {
    inner = legSheet(md);
  } else if (md.type === 'pickStats') {
    inner = profilePicker();
  } else if (md.type === 'wipe') {
    inner = `<h3>Alle Daten löschen?</h3><p>Alle Spieler, Spiele und Statistiken werden endgültig gelöscht – auch in deinem Konto auf allen Geräten. Dein Konto und deine Freunde bleiben. Das lässt sich nicht rückgängig machen.</p>
      <div class="sbtns"><button class="btn line" data-act="settings">Abbrechen</button><button class="btn red" data-act="wipeForce">Löschen</button></div>`;
  } else if (md.type === 'rename') {
    inner = `<h3>Dein Name</h3><p>Eindeutig – Freunde finden dich darüber. 3–20 Zeichen, ohne Leerzeichen.</p>
      <input id="nameField" class="field name" value="${esc(auth.user?.username || nameOf(S.mainId))}" maxlength="20" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done">
      <p id="nameHint" class="name-hint" aria-live="polite">${esc(md.error || '')}</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="saveName">Sichern</button></div>`;
  } else if (md.type === 'confirmNew') {
    inner = `<h3>Neues Spiel?</h3><p>Das laufende Spiel (${matchSummary(m)}) wird beendet und nicht gespeichert.</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="startForce">Starten</button></div>`;
  } else if (md.type === 'demoWipe') {
    inner = `<h3>Testdaten entfernen?</h3><p>Alle Test-Matches und die Testspieler werden gelöscht. Deine echten Spiele und Spieler bleiben erhalten.</p>
      <div class="sbtns"><button class="btn line" data-act="settings">Abbrechen</button><button class="btn red" data-act="demoWipeForce">Entfernen</button></div>`;
  } else if (md.type === 'logoutUnsynced') {
    inner = `<h3>Nicht gesichert</h3><p>${esc(sync.msg || 'Der Server ist gerade nicht erreichbar.')} Beim Abmelden werden die Daten von diesem Gerät entfernt – was noch nicht gesichert ist, geht verloren.</p>
      <div class="sbtns"><button class="btn line" data-act="settings">Abbrechen</button><button class="btn red" data-act="logoutForce">Trotzdem abmelden</button></div>`;
  } else if (md.type === 'password') {
    inner = `<h3>Passwort ändern</h3><p>Andere Geräte werden danach abgemeldet.</p>
      ${pwField('pwOld', 'Aktuelles Passwort', 'current-password')}${pwField('pwNew', 'Neues Passwort (mind. 8 Zeichen)', 'new-password')}
      ${md.error ? `<p class="auth-err">${esc(md.error)}</p>` : ''}
      <div class="sbtns"><button class="btn line" data-act="settings">Abbrechen</button><button class="btn red" data-act="pwSave" ${md.busy ? 'disabled' : ''}>Sichern</button></div>`;
  } else if (md.type === 'delAcct') {
    inner = `<h3>Konto löschen?</h3><p>Dein Konto, alle gespeicherten Spiele und deine Freundschaften werden endgültig gelöscht. Zur Bestätigung dein Passwort:</p>
      ${pwField('delPw', 'Passwort', 'current-password')}
      ${md.error ? `<p class="auth-err">${esc(md.error)}</p>` : ''}
      <div class="sbtns"><button class="btn line" data-act="settings">Abbrechen</button><button class="btn red" data-act="delAcctForce" ${md.busy ? 'disabled' : ''}>Endgültig löschen</button></div>`;
  } else if (md.type === 'period') {
    const opts = [['all', 'Gesamt', 'Alle gespeicherten Spiele'], ['1y', 'Letztes Jahr', ''], ['30d', 'Letzte 30 Tage', ''], ['7d', 'Letzte 7 Tage', '']];
    inner = `<h3>Zeitraum</h3><p>Welche Spiele sollen in die Statistik?</p>
      <div class="slist">${opts.map(([v, l, sub]) => `<button class="srow" data-act="period" data-v="${v}"><span class="lbl">${l}${sub ? `<small>${sub}</small>` : ''}</span>${S.statsPeriod === v ? '<span class="val">✓</span>' : ''}</button>`).join('')}</div>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Schließen</button></div>`;
  } else if (md.type === 'histDel') {
    inner = `<h3>Spiel löschen?</h3><p>${esc(md.label)}<br>Das Spiel verschwindet aus der Historie und zählt nicht mehr in der Statistik – auch auf deinen anderen Geräten und bei deinen Freunden. Das lässt sich nicht rückgängig machen.</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="histDelForce">Löschen</button></div>`;
  } else if (md.type === 'friendRemove') {
    inner = `<h3>Freund entfernen?</h3><p>${esc(md.name)} verschwindet aus deiner Freundesliste, und ihr seht gegenseitig keine Statistik mehr.</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="friendRemoveForce">Entfernen</button></div>`;
  } else if (md.type === 'invite') {
    const v = md.inv, o = v.opts || {};
    const what = v.game === 'x01' ? `${o.start} ${o.out === 'double' ? 'Double Out' : 'Single Out'} · First to ${o.target} ${o.mode === 'sets' ? 'Sets' : 'Legs'}` : (GAMES[v.game]?.title || 'Spiel');
    inner = `<div class="inv-head">${icon('signal', 2, 34)}<h3>${esc(v.host)} möchte gegen dich spielen</h3></div>
      <p>${esc(what)} · jeder an seinem Gerät</p>
      <div class="sbtns"><button class="btn line" data-act="inviteNo" data-v="${esc(v.id)}">Ablehnen</button><button class="btn red" data-act="inviteYes" data-v="${esc(v.id)}">Annehmen</button></div>`;
  } else if (md.type === 'abort') {
    inner = `<h3>Spiel beenden?</h3><p>Der Spielstand geht verloren und zählt nicht für die Statistik.${m?.online ? ` Das Spiel endet auch bei ${esc(m.online.other || 'deinem Freund')}.` : ''}</p>
      <div class="sbtns"><button class="btn line" data-act="gear">Abbrechen</button><button class="btn red" data-act="abortForce">Beenden</button></div>`;
  }
  return `<div class="scrim" data-act="scrim"><div class="sheet ${md.type === 'leg' ? 'wide' : ''}">${inner}</div></div>`;
}

/** Spieler hinzufügen: drei Wege – neuer Spieler, bekannter Spieler (mit Suche), Bot */
function addPlayerSheet() {
  const tab = ui.addTab || 'new';
  const inLineup = new Set(S.lineup.map((e) => e.id));
  const saved = S.profiles.filter((p) => !inLineup.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const bots = BOTS.filter((b) => !inLineup.has(b.id));
  const tabs = [['new', 'Neuer Spieler'], ['known', 'Bekannt'], ['bot', 'Bot'], ['friend', 'Freunde']];
  let body;
  if (tab === 'friend') {
    const fr = (ui.friends?.data?.friends || []).filter((f) => f.pid);
    const pick = ui.addFriend && fr.find((f) => f.id === ui.addFriend);
    if (pick) {
      body = `<p class="ap-hint">Wie spielt <b>${esc(pick.username)}</b> mit?</p>
        <div class="fmode">
          <button class="fm-btn" data-act="addFriend" data-v="${esc(pick.id)}" data-mode="local">${icon('user', 2, 28)}<b>Spielt auf meinem Gerät mit</b>
            <small>Ihr gebt beide hier ein. Am Ende bestätigt ${esc(pick.username)} das Spiel in seiner App – erst dann zählt es für seine Statistik.</small></button>
          <button class="fm-btn" data-act="addFriend" data-v="${esc(pick.id)}" data-mode="remote">${icon('signal', 2, 28)}<b>Spielt auf seinem Gerät mit</b>
            <small>${esc(pick.username)} bekommt eine Einladung. Jeder wirft bei sich zu Hause und gibt seine Würfe selbst ein.</small></button>
        </div>
        <button class="btn line" data-act="addFriendBack">Anderen Freund wählen</button>`;
    } else body = fr.length ? `<div class="slist">${fr.map((f) => `<button class="srow" data-act="addFriendPick" data-v="${esc(f.id)}" ${inLineup.has(f.pid) ? 'disabled' : ''}>
        <span class="pc sm" style="${pcVars(3)}">${esc(f.username.slice(0, 1).toUpperCase())}</span><span class="lbl">${esc(f.username)}<small>${inLineup.has(f.pid) ? 'spielt schon mit' : f.avg ? `Ø 501 ${String(Math.round(f.avg * 10) / 10).replace('.', ',')}` : 'Freund'}</small></span>${icon('chevR', 2.4, 18)}</button>`).join('')}</div>`
      : `<p class="ap-hint">${ui.friends?.data ? 'Du hast noch keine Freunde – füge sie im Backstage hinzu.' : 'Lade Freunde …'}</p>`;
  } else if (tab === 'new') {
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

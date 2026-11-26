/* Dialoge: Zahnrad, Einstellungen, Daten löschen, Name, Bestätigungen */
import { availableModes, statsModes, modeLabel } from '../stats.js';
import { S, ui, nameOf } from '../store.js';
import { BOTS } from '../bots.js';
import { avatar } from './avatar.js';
import { icon, divider } from './svg.js';
import { pcVars } from './common.js';
import * as G from '../party.js';
import * as F from '../football.js';
import { GAMES } from '../games.js';
import { esc, seg, matchSummary } from './common.js';
import { profilePicker } from './stats-view.js';
import { comparePicker } from './compare.js';
import { auth, sync } from '../sync.js';
import { USERNAME_MIN, USERNAME_MAX } from '../limits.js';
import { dateStr } from './stats-view.js';
import { legSheet } from './legdetail.js';
import { bruchResult } from './bruch.js';
import { histSheet } from './history.js';
import { link } from '../camera-link.js';
import { stationMode } from './camstation.js';
import { camBigView } from './camview.js';

/** Sync-Stand in Worten */
function syncText() {
  if (sync.state === 'busy') return 'Wird gesichert …';
  if (sync.state === 'ok') return `Gesichert${sync.at ? ` · ${new Date(sync.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}`;
  if (sync.state === 'offline') return 'Offline – wird nachgeholt';
  if (sync.state === 'error') return 'Fehler – wird erneut versucht';
  return '–';
}
const pwField = (id, ph, ac) => `<input id="${id}" class="field plain" type="password" placeholder="${ph}" autocomplete="${ac}">`;

const tog = (k, lbl, sub = '') => `<button class="srow" data-act="pref" data-k="${k}"><span class="lbl">${lbl}${sub ? `<small>${sub}</small>` : ''}</span><span class="tog ${S.prefs[k] !== false && S.prefs[k] ? 'on' : ''}"></span></button>`;

export function sheetView() {
  const md = ui.modal, m = S.current;
  if (!md) return '';
  let inner = '';
  if (md.type === 'gear') {
    const o = m.opts;
    const info = m.game === 'x01'
      ? [['Startpunkte', o.start], ['Check-Out', o.out === 'double' ? 'Double Out' : 'Single Out'], ['Modus', `First to ${o.target} ${o.mode === 'sets' ? 'Sets' : 'Legs'}`]]
      : m.game === 'cricket' ? [['Spiel', 'Cricket'], ['Variante', o.mode === 'close' ? 'Nur Schließen' : 'Mit Punkten'], ['Runden (max.)', o.rounds]]
      : m.game === 'football' ? [['Spiel', 'Fußball'], ['Tore', `D${o.goal || 16} gegen D${F.opposite(o.goal || 16)}`], ['Sieg bei', `${o.target || 3} Toren`]]
      : [['Spiel', GAMES[m.game].title], ...(m.game === 'atc' ? [] : [['Runden', G.rounds(m)]])];
    inner = `<h3>Einstellungen</h3><p>${matchSummary(m)}</p>
      <div class="slist">
        ${m.game === 'x01' ? `<div class="srow col"><span class="lbl">Einzeldart-Eingabe</span>${seg('dartInput', 'v', [['keys', 'Tastatur'], ['board', 'Dartscheibe']], S.prefs.dartInput)}</div>` : ''}
        ${tog('voice', 'Ansage')}${m.game === 'x01' ? tog('hints', 'Checkout-Hilfe') : ''}${tog('showAvg', 'Average anzeigen')}${m.game === 'x01' && m.opts.out === 'double' ? tog('showDbl', 'Doppelquote anzeigen', 'in diesem Spiel – neben Letzte und Average') : ''}${m.game === 'x01' || m.game === 'highscore' ? tog('quick', 'Zahl-Vorschläge', 'deine häufigsten Aufnahmen über der Tastatur') : ''}
      </div>
      <div class="slist">${info.map(([a, b]) => `<div class="srow"><span class="lbl">${a}</span><span class="val">${b}</span></div>`).join('')}</div>
      <div class="sbtns"><button class="btn line" data-act="abort" style="color:var(--red);border-color:var(--red)">Spiel beenden</button><button class="btn red" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'profile') {
    // Profil (VIP › Name antippen): Name, E-Mail, Daten-Stand, Passwort, Abmelden, Konto löschen
    const u = auth.user;
    inner = `<h3>Dein Profil</h3>
      ${u ? `<div class="slist acct">
        <button class="srow" data-act="rename"><span class="lbl">Name<small>Freunde finden dich darüber</small></span><span class="val">${esc(u.username)}</span>${icon('chevR', 2.4, 16)}</button>
        <div class="srow"><span class="lbl">E-Mail<small>Konto seit ${dateStr(u.createdAt)}</small></span><span class="val mail">${esc(u.email)}</span></div>
        <div class="srow"><span class="lbl">Daten</span><span class="val sync-${sync.state}">${syncText()}</span></div>
      </div>
      <div class="sbtns acct-btns"><button class="btn dark" data-act="pwOpen">Passwort ändern</button><button class="btn dark" data-act="logout">Abmelden</button></div>` : ''}
      <div class="slist dart-edit"><div class="srow col"><span class="lbl">Dein Dart<small>Leg ihn auf einen ruhigen, einfarbigen Tisch und fotografiere ihn von oben – die App schneidet ihn aus, der Tisch verschwindet.</small></span>
        <div class="dart-btns"><label class="btn dark dart-cam" ${ui.dartBusy ? 'aria-disabled="true"' : ''}>${ui.dartBusy ? 'Erkenne Dart …' : S.prefs.myDart ? 'Neues Foto' : 'Dart fotografieren'}<input id="dartFile" type="file" accept="image/*" capture="environment" hidden></label>
        ${S.prefs.myDart ? '<button class="btn line" data-act="dartRemove">Entfernen</button>' : ''}</div></div></div>
      <div class="sbtns"><button class="btn red" data-act="closeModal">Fertig</button></div>
      ${u ? '<button class="btn textonly del-acct" data-act="delAcct">Konto löschen</button>' : ''}`;
  } else if (md.type === 'settings') {
    const u = auth.user;
    inner = `<h3>Einstellungen</h3><p>${S.profiles.length} Spieler · ${S.matches.length} gespeicherte Spiele</p>
      <div class="slist">${tog('voice', 'Ansage')}${tog('hints', 'Checkout-Hilfe')}${tog('showAvg', 'Average im Spiel anzeigen')}${tog('showDbl', 'Doppelquote im Spiel anzeigen')}${tog('quick', 'Zahl-Vorschläge im Spiel', 'deine häufigsten Aufnahmen über der Tastatur')}${tog('camAuto', 'Kamera: Würfe automatisch übernehmen')}${tog('camDebug', 'Kamera: Debug-Ansicht')}${tog('motion', 'Bewegung in den Kästen', 'Lichter, Glanz und Funkeln an Karten, Kacheln und Leisten')}
        <div class="srow col"><span class="lbl">Sprache</span>${seg('lang', 'v', [['de', 'Deutsch'], ['en', 'English']], S.prefs.lang === 'en' ? 'en' : 'de')}</div>
        <div class="srow col"><span class="lbl">Lieblingsdoppel<small>Checkout-Vorschläge enden, wenn möglich, auf diesem Doppel</small></span>${seg('favDbl', 'v', [[16, 'D16'], [18, 'D18'], [20, 'D20']], S.prefs.favDbl || 20)}</div>
        <div class="srow col"><span class="lbl">Einzeldart-Eingabe</span>${seg('dartInput', 'v', [['keys', 'Tastatur'], ['board', 'Dartscheibe']], S.prefs.dartInput)}</div>
        <button class="srow set-link" data-act="callerOpen">${icon('mic', 1.9, 20)}<span class="lbl">Eigener Caller<small>Zahlen selbst einsprechen</small></span>${icon('chevR', 2.4, 16)}</button></div>
      ${!auth.user?.demo && (S.matches.some((x) => x.demo) || S.profiles.some((x) => x.demo)) ? '<button class="btn dark demo-btn" data-act="demoWipe">Testdaten entfernen</button>' : ''}
      <div class="sbtns"><button class="btn red" data-act="closeModal">Fertig</button></div>
`;
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
    inner = `<h3>Dein Name</h3><p>Eindeutig – Freunde finden dich darüber. ${USERNAME_MIN}–${USERNAME_MAX} Zeichen, ohne Leerzeichen.</p>
      <input id="nameField" class="field name" value="${esc(auth.user?.username || nameOf(S.mainId))}" maxlength="40" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done">
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
      <div class="sbtns"><button class="btn line" data-act="profileOpen">Abbrechen</button><button class="btn red" data-act="logoutForce">Trotzdem abmelden</button></div>`;
  } else if (md.type === 'password') {
    inner = `<h3>Passwort ändern</h3><p>Andere Geräte werden danach abgemeldet.</p>
      ${pwField('pwOld', 'Aktuelles Passwort', 'current-password')}${pwField('pwNew', 'Neues Passwort (mind. 8 Zeichen)', 'new-password')}
      ${md.error ? `<p class="auth-err">${esc(md.error)}</p>` : ''}
      <div class="sbtns"><button class="btn line" data-act="profileOpen">Abbrechen</button><button class="btn red" data-act="pwSave" ${md.busy ? 'disabled' : ''}>Sichern</button></div>`;
  } else if (md.type === 'delAcct') {
    inner = `<h3>Konto löschen?</h3><p>Dein Konto, alle gespeicherten Spiele und deine Freundschaften werden endgültig gelöscht. Zur Bestätigung dein Passwort:</p>
      ${pwField('delPw', 'Passwort', 'current-password')}
      ${md.error ? `<p class="auth-err">${esc(md.error)}</p>` : ''}
      <div class="sbtns"><button class="btn line" data-act="profileOpen">Abbrechen</button><button class="btn red" data-act="delAcctForce" ${md.busy ? 'disabled' : ''}>Endgültig löschen</button></div>`;
  } else if (md.type === 'period') {
    const opts = [['all', 'Gesamt', 'Alle gespeicherten Spiele'], ['1y', 'Letztes Jahr', ''], ['30d', 'Letzte 30 Tage', ''], ['7d', 'Letzte 7 Tage', '']];
    inner = `<h3>Zeitraum</h3><p>Welche Spiele sollen in die Statistik?</p>
      <div class="slist">${opts.map(([v, l, sub]) => `<button class="srow" data-act="period" data-v="${v}"><span class="lbl">${l}${sub ? `<small>${sub}</small>` : ''}</span>${S.statsPeriod === v ? '<span class="val">✓</span>' : ''}</button>`).join('')}</div>
      <h3 class="sh-sub">Modi</h3><p>Standard ist nur 501. Weitere X01-Modi aus deiner Spielhistorie kannst du dazunehmen – sonst verändern sie deine Statistik nicht.</p>
      <div class="slist">${availableModes(S.matches, S.mainId).map((k) => `<button class="srow" data-act="statsMode" data-v="${k}"><span class="lbl">${modeLabel(k)}${k === '501' ? '<small>Standard</small>' : ''}</span><span class="tog ${statsModes().includes(k) ? 'on' : ''}"></span></button>`).join('')}</div>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Schließen</button></div>`;
  } else if (md.type === 'hist') {
    inner = histSheet(md.id);
  } else if (md.type === 'histDel') {
    inner = `<h3>Spiel löschen?</h3><p>${esc(md.label)}<br>Das Spiel verschwindet aus der Historie und zählt nicht mehr in der Statistik – auch auf deinen anderen Geräten und bei deinen Freunden. Das lässt sich nicht rückgängig machen.</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="histDelForce">Löschen</button></div>`;
  } else if (md.type === 'friendRemove') {
    inner = `<h3>Freund entfernen?</h3><p>${esc(md.name)} verschwindet aus deiner Freundesliste, und ihr seht gegenseitig keine Statistik mehr.</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="friendRemoveForce">Entfernen</button></div>`;
  } else if (md.type === 'camMenu') {
    const on = link.role || stationMode();
    inner = `<h3>Kamera</h3><p>Würfe automatisch erkennen lassen – du siehst jeden Wurf und kannst ihn korrigieren.</p>
      <div class="slist">
        <button class="srow" data-act="camAsDevice"><span class="lbl">Als Kamera-Gerät nutzen<small>Dieses Handy filmt das Board und schickt die Würfe an das Scoreboard (z. B. iPad)</small></span>${icon('chevR', 2.4, 16)}</button>
        <button class="srow" data-act="camConnect"><span class="lbl">Kamera-Gerät verbinden<small>Dieses Gerät ist das Scoreboard – Code vom Kamera-Gerät eingeben</small></span>${icon('chevR', 2.4, 16)}</button>
        <button class="srow" data-act="camSingle"><span class="lbl">Nur dieses Gerät<small>Kamera und Scoreboard auf demselben Gerät</small></span>${icon('chevR', 2.4, 16)}</button>
      </div>
      <div class="sbtns">${on ? '<button class="btn line" data-act="camOff">Kamera trennen</button>' : ''}<button class="btn red" data-act="closeModal">Schließen</button></div>`;
  } else if (md.type === 'camCtl') {
    const c = link.cams.find((x) => x.code === md.code);
    if (!c) inner = '<h3>Kamera getrennt</h3><div class="sbtns"><button class="btn red" data-act="closeModal">Schließen</button></div>';
    else inner = `<h3>Kamera ${c.n}${c.device ? ` · ${esc(c.device)}` : ''}</h3><p class="cc-state">${esc(c.text || (c.status === 'connected' ? 'verbunden' : 'verbinde …'))}</p>
      ${c.lenses.length > 1 ? `<h4 class="cc-h">Objektiv</h4><div class="cc-lens">${c.lenses.map((l) => `<button class="${l.id === c.lens ? 'on' : ''}" data-act="camLens" data-v="${esc(l.id)}">${esc(l.label)}</button>`).join('')}</div>` : ''}
      <div class="slist">
        <button class="srow" data-act="camRemote" data-v="${c.code}"><span class="lbl">${c.calibrated ? 'Neu einrichten' : 'Einrichten'}<small>Livebild, 4 Punkte, Kontrolle, Testdart</small></span>${icon('chevR', 2.4, 16)}</button>
        <button class="srow" data-act="camPause"><span class="lbl">${c.paused ? 'Erkennung fortsetzen' : 'Erkennung pausieren'}</span></button>
        <button class="srow" data-act="camDbg"><span class="lbl">Debug-Ansicht am Handy<small>Differenzbild, Achse und Spitze</small></span><span class="tog ${S.prefs.camDebug ? 'on' : ''}"></span></button>
        <button class="srow" data-act="camStopRemote"><span class="lbl" style="color:var(--red)">Kamera am Handy beenden</span></button>
      </div>
      <div class="sbtns"><button class="btn red" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'camBig') {
    inner = camBigView();
  } else if (md.type === 'camConnect') {
    inner = `<h3>Kamera-Gerät verbinden</h3><p>Am Kamera-Gerät: Kamera › „Als Kamera-Gerät nutzen“. Dort steht ein 6-stelliger Code.</p>
      <input id="camCode" class="field cam-code" inputmode="numeric" maxlength="7" placeholder="000 000" autocomplete="off" value="${esc(link.role === 'ctl' ? link.code || '' : '')}">
      ${md.error ? `<p class="auth-err">${esc(md.error)}</p>` : ''}
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="camJoin" ${md.busy ? 'disabled' : ''}>Verbinden</button></div>`;
  } else if (md.type === 'camResume') {
    inner = `<h3>Kamera-Gerät fortsetzen?</h3><p>Dieses Gerät war als Kamera-Gerät verbunden (Code ${esc(link.code || '')}). Kamera wieder starten?</p>
      <div class="sbtns"><button class="btn line" data-act="camResumeNo">Nein, trennen</button><button class="btn red" data-act="camResumeYes">Kamera starten</button></div>`;
  } else if (md.type === 'camFix') {
    const d = ui.ct?.darts?.[md.i];
    if (!d) inner = '<h3>Wurf nicht mehr da</h3><div class="sbtns"><button class="btn red" data-act="closeModal">Schließen</button></div>';
    else {
      const fm = ui.fixMult || 1, nums = Array.from({ length: 20 }, (_, i) => i + 1);
      inner = `<h3>Dart ${md.i + 1} korrigieren</h3><p>Erkannt: <b>${esc(d.label)}</b>${d.conf < 1 ? ` · ${Math.round(d.conf * 100)} % sicher` : ''}</p>
        ${d.snapshot ? `<img class="cf-snap" src="${d.snapshot}" alt="Bild vom Wurf">` : ''}
        ${seg('camFixMult', 'v', [[1, 'Single'], [2, 'Double'], [3, 'Triple']], fm, 'seg')}
        <div class="cf-grid">${nums.map((n) => `<button data-act="camFixSet" data-n="${n}">${n}</button>`).join('')}
          <button data-act="camFixSet" data-n="25" data-m="1">25</button><button data-act="camFixSet" data-n="25" data-m="2">Bull</button>
          <button class="miss" data-act="camFixSet" data-n="0">Miss</button></div>
        <div class="sbtns"><button class="btn line" data-act="closeModal">So lassen</button></div>`;
    }
  } else if (md.type === 'bruchCancel') {
    inner = `<h3>Challenge abbrechen?</h3><p>Die drei Herausforderungen verschwinden und nichts wird in der Historie gespeichert.</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Weiterspielen</button><button class="btn red" data-act="bruchCancelForce">Abbrechen</button></div>`;
  } else if (md.type === 'bruchResult') {
    inner = bruchResult(md);
  } else if (md.type === 'invite') {
    const v = md.inv, o = v.opts || {};
    const what = v.game === 'x01' ? `${o.start} ${o.out === 'double' ? 'Double Out' : 'Single Out'} · First to ${o.target} ${o.mode === 'sets' ? 'Sets' : 'Legs'}` : (GAMES[v.game]?.title || 'Spiel');
    inner = `<div class="inv-head">${icon('signal', 2, 34)}<h3>${esc(v.host)} möchte gegen dich spielen</h3></div>
      <p>${esc(what)} · jeder an seinem Gerät</p>
      <div class="sbtns"><button class="btn line" data-act="inviteNo" data-v="${esc(v.id)}">Ablehnen</button><button class="btn red" data-act="inviteYes" data-v="${esc(v.id)}">Annehmen</button></div>`;
  } else if (md.type === 'discard') {
    const dm = [m, ...(S.parked || [])].find((x) => x && x.id === md.id) || m;
    inner = `<h3>Spiel wirklich löschen?</h3><p>${dm ? matchSummary(dm) : ''}<br>Der Spielstand geht verloren und zählt nicht für die Statistik. Das lässt sich nicht rückgängig machen.${dm?.online ? ` Das Spiel endet auch bei ${esc(dm.online.other || 'deinem Freund')}.` : ''}</p>
      <div class="sbtns"><button class="btn line" data-act="closeModal">Abbrechen</button><button class="btn red" data-act="discardForce">Löschen</button></div>`;
  } else if (md.type === 'tooMany') {
    inner = `<h3>Du hast noch 3 Spiele offen</h3><p>Spiel eins davon zu Ende oder lösche eins auf der Play-Seite (Mülleimer) – dann kannst du ein neues starten.</p>
      <div class="sbtns"><button class="btn red" data-act="home">Zu den offenen Spielen</button><button class="btn line" data-act="closeModal">Abbrechen</button></div>`;
  } else if (md.type === 'abort') {
    inner = `<h3>Spiel beenden?</h3><p>Der Spielstand geht verloren und zählt nicht für die Statistik.${m?.online ? ` Das Spiel endet auch bei ${esc(m.online.other || 'deinem Freund')}.` : ''}</p>
      <div class="sbtns"><button class="btn line" data-act="gear">Abbrechen</button><button class="btn red" data-act="abortForce">Beenden</button></div>`;
  }
  return `<div class="scrim" data-act="scrim"><div class="sheet ${md.type === 'leg' || md.type === 'camBig' ? 'wide' : md.type === 'hist' ? 'wide pop' : ['profile', 'rename', 'password', 'logoutUnsynced', 'delAcct'].includes(md.type) ? 'vipsheet pop' : ''}">${inner}</div></div>`;
}

/** Spieler hinzufügen: drei Wege – Freund, Gast (nur dieses Spiel), Bot */
function addPlayerSheet() {
  const tab = ['friend', 'guest', 'bot'].includes(ui.addTab) ? ui.addTab : 'friend';
  const inLineup = new Set(S.lineup.map((e) => e.id));
  const bots = BOTS.filter((b) => !inLineup.has(b.id));
  const tabs = [['friend', 'Freunde'], ['guest', 'Gast'], ['bot', 'Bot']];
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
      : `<p class="ap-hint">${ui.friends?.data ? 'Du hast noch keine Freunde – füge sie unter „More“ hinzu.' : 'Lade Freunde …'}</p>`;
  } else if (tab === 'guest') {
    body = `<p class="ap-hint">Wie heißt dein Gast? Er spielt nur dieses Spiel mit – nichts wird für ihn gespeichert, beim nächsten Spiel gibst du den Namen neu ein. Wer seine Statistik behalten will, legt ein Konto an und wird dein Freund.</p>
      <input id="newPlayer" class="field" placeholder="Name" maxlength="16" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done">
      <p id="nameHint" class="name-hint" aria-live="polite"></p>
      <button class="btn red big" id="addNewBtn" data-act="addNew" disabled>Hinzufügen</button>`;
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

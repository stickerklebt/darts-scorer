/* Tabs (Spielen · Statistik · Freunde) und Tab „Spielen“. Die Anmeldung steht in ui/auth.js. */
import { S, ui } from '../store.js';
import { GAMES } from '../games.js';
import { esc, fmt, pcVars, matchSummary } from './common.js';
import { incomingCount } from './friends.js';
import { link } from '../camera-link.js';
import { cornerOrnament, badge, stars, icon, heroArt, fuse, sparkles, MODE_COLORS } from './svg.js';

export const TABS = ['play', 'stats', 'friends'];
export const tabIndex = () => Math.max(0, TABS.indexOf(S.tab));

export function tabsBar() {
  const i = tabIndex(), n = incomingCount();
  return `<nav class="tabs"><div class="tabs-in">
    <button class="tab ${i === 0 ? 'on' : ''}" data-act="tab" data-v="play">${icon('dart', 2)}<span>Play</span></button>
    <button class="tab ${i === 1 ? 'on' : ''}" data-act="tab" data-v="stats">${icon('chart', 2)}<span>Stats</span></button>
    <button class="tab ${i === 2 ? 'on' : ''}" data-act="tab" data-v="friends">${icon('ticket', 2)}<span>Backstage</span>${n ? `<i class="tab-badge">${n}</i>` : ''}</button>
    <i class="tabline" style="--i:${ui.tabFrom ?? i}"></i>
  </div></nav>`;
}

/** Kamera auf dem Startbildschirm. Regie: alle Kameras mit Stand und „Einrichten“. Läuft im Konto schon eine Kamera und dieses
    Gerät ist noch nichts: wählen – Regie (hier wird gespielt) oder weitere Kamera (filmt mit). */
export function camBlock() {
  if (link.role === 'ctl') {
    const rows = link.cams.map((c) => {
      const st = c.status !== 'connected' ? (c.status === 'lost' ? 'getrennt' : 'verbinde …') : c.moved ? 'verrutscht' : c.calibrated ? 'bereit' : 'nicht eingerichtet';
      const ok = c.status === 'connected' && c.calibrated && !c.moved;
      return `<div class="cam-li ${ok ? 'ok' : ''}"><span>${icon('cam', 1.9, 20)} Kamera ${c.n}${c.device ? ` · ${c.device}` : ''}<small>${st}${c.paused ? ' · pausiert' : ''}</small></span>
        <button class="cam-x" data-act="camCtl" data-v="${c.code}" aria-label="Kamera steuern">${icon('gear', 1.8, 18)}</button>
        <button class="btn ${ok ? 'line' : 'red'}" data-act="camRemote" data-v="${c.code}">${ok ? 'Neu einrichten' : 'Einrichten'}</button>
        <button class="cam-x" data-act="camDrop" data-v="${c.code}" aria-label="Kamera trennen">×</button></div>`;
    }).join('');
    return `<div class="cam-card main">${icon('board', 1.9, 30)}<span><b>Regie</b><small>Hier wird gespielt. Weitere Kamera: an einem anderen Gerät anmelden › Kamera wählen.</small></span></div>
      <div class="cam-list">${rows}</div>`;
  }
  if (ui.camMine?.length) return `<div class="cam-card big pick">${icon('cam', 1.9, 34)}<span><b>${ui.camMine.length > 1 ? `${ui.camMine.length} Kameras laufen` : 'Eine Kamera läuft'} in deinem Konto</b>
      <small>Wie soll dieses Gerät mitmachen?</small></span></div>
    <div class="cam-pick"><button class="btn red" data-act="camBeMain"><b>Regie</b><small>Hier wird gespielt</small></button>
      <button class="btn line" data-act="camAsDevice"><b>Kamera</b><small>Dieses Gerät filmt mit</small></button></div>`;
  return ''; // kein extra Kamera-Knopf – dafür gibt es die Kachel „Kamera“
}

export function playView() {
  const m = S.current, o = S.opts.x01;
  const corners = ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="corner ${c}">${cornerOrnament()}</span>`).join('');
  // Partyspiele, X01 (andere Startwerte) als letzte Kachel – die große 501-Karte startet direkt 501
  const others = [...Object.keys(GAMES).filter((id) => id !== 'x01' && !GAMES[id].retired), 'x01'];
  return `<main class="page">
    ${m && !m.done ? `<div class="resume-wrap"><button class="resume" data-act="resume"><span class="live">Live</span><span class="ct"><b>Spiel fortsetzen</b><small>${matchSummary(m)}</small></span>${icon('chevR')}</button>
      <button class="resume-del" data-act="discardCurrent" aria-label="Laufendes Spiel löschen" title="Spiel löschen">${icon('trash', 1.8, 22)}</button></div>` : ''}
    <section class="hero hero-go" data-act="pick" data-v="x01" role="button" tabindex="0" aria-label="X01 spielen">
      <div class="hero-art">${heroArt()}</div>
      ${corners}${fuse(6, 11)}
      <div class="hero-main">
        <div class="hero-num">501${sparkles(5, 11)}</div>
      </div>
    </section>
    <h2 class="label">Partyspiel</h2>
    <div class="modes ${others.length === 1 ? 'one' : ''}">${others.map((id, i) => `<button class="mode" data-act="pick" data-v="${id}" ${id === 'x01' ? 'data-var="other"' : ''} style="--mc:${MODE_COLORS[id]};--bi:${i}" aria-label="${GAMES[id].title}" title="${GAMES[id].title}">
      <span class="mode-art">${badge(id, 52)}</span></button>`).join('')}</div>
  </main>`;
}

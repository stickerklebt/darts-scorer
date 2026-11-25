/* Tabs (Spielen · Statistik · Freunde) und Tab „Spielen“. Die Anmeldung steht in ui/auth.js. */
import { S, ui } from '../store.js';
import { GAMES } from '../games.js';
import { esc, fmt, pcVars, matchSummary } from './common.js';
import { incomingCount } from './friends.js';
import { link } from '../camera-link.js';
import { partyTiles, partyInfo } from '../partygames.js';
import { tileArt } from './partybrowse.js';
import { metal501 } from './metal501.js';
import { cornerOrnament, badge, stars, icon, heroArt, fuse, sparkles, MODE_COLORS } from './svg.js';

export const TABS = ['play', 'stats', 'friends'];
export const tabIndex = () => Math.max(0, TABS.indexOf(S.tab));

export function tabsBar() {
  const i = tabIndex(), n = incomingCount();
  return `<nav class="tabs"><div class="tabs-in">
    <button class="tab ${i === 0 ? 'on' : ''}" data-act="tab" data-v="play">${icon('dart', 2)}<span>Play</span></button>
    <button class="tab ${i === 1 ? 'on' : ''}" data-act="tab" data-v="stats">${icon('chart', 2)}<span>Stats</span></button>
    <button class="tab ${i === 2 ? 'on' : ''}" data-act="tab" data-v="friends">${icon('vip', 2)}<span>VIP</span>${n ? `<i class="tab-badge">${n}</i>` : ''}</button>
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

/** Zwei metallische Linien in der 501-Kachel: laufen nur durch die Ecken (nie durch die Zahl) und sehen bei jedem Neuladen
    etwas anders aus (Zufall einmal pro Seitenaufruf, damit sie beim Neuzeichnen nicht springen). Box 1000 × 560. */
const r = (a, b) => a + Math.random() * (b - a);
const CORNERS = ['tl', 'tr', 'bl', 'br'].sort(() => Math.random() - 0.5).slice(0, 2);
function cornerCurve(c) {
  // Grundform für oben links; die anderen Ecken gespiegelt
  const p = [[r(300, 520), -20], [r(70, 170), r(0, 45)], [r(0, 40), r(70, 150)], [-20, r(240, 420)]];
  const fx = c[1] === 'r', fy = c[0] === 'b';
  const q = p.map(([x, y]) => [fx ? 1000 - x : x, fy ? 560 - y : y]).map(([x, y]) => `${x.toFixed(0)} ${y.toFixed(0)}`);
  return `M${q[0]} C${q[1]} ${q[2]} ${q[3]}`;
}
const LINES = CORNERS.map(cornerCurve);
const silkLines = () => `<svg class="silk-lines" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true"><defs>
  <linearGradient id="slG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="560"><stop offset="0" stop-color="#5d6168"/><stop offset=".18" stop-color="#e9edf1"/><stop offset=".3" stop-color="#8a9098"/><stop offset=".42" stop-color="#2e2a2d"/><stop offset=".55" stop-color="#c9ced5"/><stop offset=".68" stop-color="#ffffff"/><stop offset=".8" stop-color="#7d838d"/><stop offset="1" stop-color="#d6dae0"/></linearGradient>
  <radialGradient id="slL" gradientUnits="userSpaceOnUse" cx="500" cy="-100" r="190"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  ${LINES.map((d, i) => `<path class="sl-sh" d="${d}"/><path class="sl" d="${d}"/><path class="sl-hi" d="${d}"/><path class="sl-lit" d="${d}"/><path class="sl-run" d="${d}" pathLength="100" style="animation-delay:-${i * 6}s"/>`).join('')}</svg>`;

export function playView() {
  const m = S.current, o = S.opts.x01;
  // Partyspiele, X01 (andere Startwerte) als letzte Kachel – die große 501-Karte startet direkt 501
  const others = partyTiles(S.prefs);
  return `<main class="page">
    ${m && !m.done ? `<div class="resume-wrap"><button class="resume" data-act="resume"><span class="live">Live</span><span class="ct"><b>Spiel fortsetzen</b><small>${matchSummary(m)}</small></span>${icon('chevR')}</button>
      <button class="resume-del" data-act="discardCurrent" aria-label="Laufendes Spiel löschen" title="Spiel löschen">${icon('trash', 1.8, 22)}</button></div>` : ''}
    <section class="hero hero-go silk-hero" data-act="pick" data-v="x01" role="button" tabindex="0" aria-label="501 spielen">
      <div class="silk" aria-hidden="true"><div class="silk-img"></div><div class="silk-vig"></div></div>
      ${silkLines()}
      ${metal501()}
    </section>
    <h2 class="label">Partyspiele</h2>
    <div class="modes">${others.map((id, i) => {
      const p = partyInfo(id), soon = !p.playable;
      return `<button class="mode ${soon ? 'soon' : ''}" ${soon ? 'disabled' : `data-act="pick" data-v="${id}"`} ${id === 'x01' ? 'data-var="other"' : ''} style="--mc:${soon ? '#232328' : MODE_COLORS[id]};--bi:${i}" aria-label="${p.title}${soon ? ' (bald)' : ''}" title="${p.title}">
      <span class="mode-art">${tileArt(id, 52)}</span>${soon ? `<span class="mode-soon"><b>${p.title}</b><small>Bald</small></span>` : ''}</button>`;
    }).join('')}
      <button class="mode mode-plus" data-act="partyBrowse" style="--mc:#08080a;--bi:${others.length}" aria-label="Partyspiele entdecken" title="Partyspiele entdecken"><span class="mode-art"><span class="badge-mode" style="--badge-bg:#cfd3d9;--badge-ink:#08080a;--badge-line:#08080a;width:52px;height:52px"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg></span></span></button></div>
  </main>`;
}

/* Screen „Partyspiele entdecken“ (Plus-Kachel auf Play): oben alle Modi, die noch nicht auf Play stehen, zum Hinzufügen;
   ganz unten „Auf deinem Play-Reiter“ mit Stift → Minus auf jeder Kachel zum Entfernen. */
import { S, ui } from '../store.js';
import { ALL_PARTY, partyInfo } from '../partygames.js';
import { icon, metalBadge, hasSymbol, MODE_COLORS } from './svg.js';
import { esc } from './common.js';
import { GAMES } from '../games.js';

/** Kachel-Bild: spielbare Modi mit ihrem Abzeichen, kommende mit ihrem Kurzzeichen */
export function tileArt(id, size = 52) {
  // alle Partyspiele mit eigenem Chrom-Symbol (wie Cricket und Fußball); Kurzzeichen nur, falls es keins gibt
  return hasSymbol(id) ? metalBadge(id, size) : metalBadge(id, size, esc(partyInfo(id)?.tile || '?'));
}
const tileBg = (id) => (partyInfo(id)?.playable ? MODE_COLORS[id] : '#232328');

function card(id) {
  const p = partyInfo(id);
  const name = id === 'x01' ? 'X01 / Double In / Single Out' : p.title;
  // spielbar: antippen startet das Spiel; kommende: antippen zeigt die Erklärung
  const act = p.playable ? `data-act="pick" data-v="${id}" ${id === 'x01' ? 'data-var="other"' : ''} role="button" tabindex="0"` : `data-act="pbInfo" data-v="${id}"`;
  return `<div class="pb-card ${p.playable ? 'pb-mine' : 'pb-soon'} ${ui.pbOpen === id ? 'open' : ''}" ${act}>
    <span class="mode pb-tile" style="--mc:${tileBg(id)}"><span class="mode-art">${tileArt(id, 52)}<i class="mode-ring" aria-hidden="true"></i></span></span>
    <span class="pb-txt"><b>${name}</b>${p.playable ? '' : '<em>Bald spielbar</em>'}${!p.playable && ui.pbOpen === id ? `<small>${p.desc}</small>` : ''}</span></div>`;
}

export function partyBrowseView() {
  // Alle Partyspiele auf einen Blick (kein Hinzufügen/Entfernen mehr): oben die spielbaren, silberner Strich, darunter die kommenden
  const play = ALL_PARTY.filter((id) => partyInfo(id).playable), soon = ALL_PARTY.filter((id) => !partyInfo(id).playable);
  return `<header class="bar"><button class="sq" data-act="home" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Partyspiele</span><span class="sq ghost"></span></header>
  <main class="page pbrowse">
    <div class="pb-list pb-mine-list">${play.map(card).join('')}</div>
    ${soon.length ? `<hr class="pb-sep"><div class="pb-list">${soon.map(card).join('')}</div>` : ''}
  </main>`;
}

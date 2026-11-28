/* Screen „Partyspiele entdecken“ (Plus-Kachel auf Play): oben alle Modi, die noch nicht auf Play stehen, zum Hinzufügen;
   ganz unten „Auf deinem Play-Reiter“ mit Stift → Minus auf jeder Kachel zum Entfernen. */
import { S, ui } from '../store.js';
import { ALL_PARTY, partyTiles, partyInfo } from '../partygames.js';
import { icon, metalBadge, hasSymbol, MODE_COLORS } from './svg.js';
import { esc } from './common.js';
import { GAMES } from '../games.js';

/** Kachel-Bild: spielbare Modi mit ihrem Abzeichen, kommende mit ihrem Kurzzeichen */
export function tileArt(id, size = 52) {
  // alle Partyspiele mit eigenem Chrom-Symbol (wie Cricket und Fußball); Kurzzeichen nur, falls es keins gibt
  return hasSymbol(id) ? metalBadge(id, size) : metalBadge(id, size, esc(partyInfo(id)?.tile || '?'));
}
const tileBg = (id) => (partyInfo(id)?.playable ? MODE_COLORS[id] : '#232328');

function card(id, mode) {
  const p = partyInfo(id);
  const name = id === 'x01' ? 'X01 / Double In' : p.title;
  const btn = mode === 'add'
    ? `<button class="pb-add" data-act="partyAdd" data-v="${id}" aria-label="${name} hinzufügen">${icon('plus', 2.6, 18)}</button>`
    : ui.partyEdit ? `<button class="pb-del" data-act="partyDel" data-v="${id}" aria-label="${name} entfernen">${icon('minus', 2.8, 18)}</button>` : '';
  // Eigene Spiele (oben): antippen startet das Spiel. Unter dem Strich: antippen zeigt die Erklärung, Plus fügt hinzu.
  const act = mode === 'add' ? `data-act="pbInfo" data-v="${id}"` : !ui.partyEdit && p.playable ? `data-act="pick" data-v="${id}" ${id === 'x01' ? 'data-var="other"' : ''} role="button" tabindex="0"` : '';
  return `<div class="pb-card ${mode === 'mine' ? 'pb-mine' : ''} ${p.playable ? '' : 'pb-soon'} ${ui.pbOpen === id ? 'open' : ''}" ${act}>
    <span class="mode pb-tile" style="--mc:${tileBg(id)}"><span class="mode-art">${tileArt(id, 52)}<i class="mode-ring" aria-hidden="true"></i></span></span>
    <span class="pb-txt"><b>${name}</b>${p.playable ? '' : '<em>Bald spielbar</em>'}${mode === 'add' && ui.pbOpen === id ? `<small>${p.desc}</small>` : ''}</span>${btn}</div>`;
}

export function partyBrowseView() {
  const mine = partyTiles(S.prefs), more = ALL_PARTY.filter((id) => !mine.includes(id));
  // Oben deine Spiele (direkt spielbar), dann ein silberner Strich, darunter alle, die man hinzufügen kann
  return `<header class="bar"><button class="sq" data-act="home" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Partyspiele</span>
    <button class="sq pb-pen ${ui.partyEdit ? 'on' : ''}" data-act="partyEdit" aria-label="Bearbeiten">${ui.partyEdit ? icon('check', 2.6, 18) : icon('pen', 1.8, 18)}</button></header>
  <main class="page pbrowse">
    ${mine.length ? `<div class="pb-list pb-mine-list">${mine.map((id) => card(id, 'mine')).join('')}</div>` : '<p class="foot">Noch keine eigenen Partyspiele – füge unten welche hinzu.</p>'}
    <hr class="pb-sep">
    ${more.length ? `<div class="pb-list">${more.map((id) => card(id, 'add')).join('')}</div>` : '<p class="foot">Du hast schon alle Partyspiele.</p>'}
  </main>`;
}

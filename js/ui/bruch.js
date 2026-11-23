/* Screen „Bruchchallenge“: Level wählen → 3 Herausforderungen, 1 Stunde Countdown, selbst abhaken. */
import { S } from '../store.js';
import { LEVELS, challenge, left } from '../bruch.js';
import { esc } from './common.js';
import { icon, stars } from './svg.js';

export const clock = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

export function bruchView() {
  const b = S.bruch, head = `<header class="bar"><button class="sq" data-act="home" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Challenge</span><span class="sq ghost"></span></header>`;
  if (!b) {
    return `${head}<main class="page bruch">
      <div class="br-intro">${stars(3)}<h2 class="display">Challenge</h2>
        <p>Drei zufällige Herausforderungen, eine Stunde Zeit. Hake ab, was du geschafft hast – nur alle drei zählen als Sieg.</p></div>
      <h2 class="label">Level wählen</h2>
      <div class="br-levels">${LEVELS.map((l) => `<button class="br-lvl l${l.id}" data-act="bruchStart" data-v="${l.id}">
        <span class="br-pips">${'★'.repeat(l.id)}</span><b>${l.name}</b><small>${l.sub}</small></button>`).join('')}</div>
    </main>`;
  }
  const lvl = LEVELS.find((l) => l.id === b.level);
  const ms = left(b);
  return `${head}<main class="page bruch">
    <div class="br-timer ${ms < 5 * 60e3 ? 'late' : ''}"><small>Noch</small><b id="brClock">${clock(ms)}</b><em>${lvl.name} · ${b.done.filter(Boolean).length} / 3 geschafft</em></div>
    <div class="br-list">${b.ids.map((id, i) => `<div class="br-c ${b.done[i] ? 'ok' : ''}" style="--i:${i}">
      <span class="br-n">${i + 1}</span><p>${esc(challenge(id)?.text || '')}</p>
      <button class="br-tick" data-act="bruchTick" data-v="${i}" aria-label="${b.done[i] ? 'Doch nicht geschafft' : 'Geschafft'}">${b.done[i] ? '✓' : ''}</button></div>`).join('')}</div>
    <div class="br-btns"><button class="btn line" data-act="bruchCancel">Abbrechen</button><button class="btn line br-quit" data-act="bruchQuit">Aufgeben</button></div>
    <p class="foot">Abbrechen: die Challenge verschwindet, ohne in der Historie zu landen. Aufgeben: sie wird mit deinem Stand gespeichert.</p>
  </main>`;
}

/** Ergebnis-Fenster nach dem Ende (geschafft, Zeit abgelaufen oder aufgegeben) */
export function bruchResult(md) {
  const won = md.won;
  return `<h3>${won ? 'Challenge geschafft!' : md.reason === 'time' ? 'Zeit abgelaufen' : 'Challenge beendet'}</h3>
    <p>${md.done} von 3 Herausforderungen${won ? ` in ${clock(md.took)} Minuten` : ''}. Das Spiel steht in deiner Historie.</p>
    <div class="sbtns"><button class="btn line" data-act="closeModal">Fertig</button><button class="btn red" data-act="bruchAgain">Neue Challenge</button></div>`;
}

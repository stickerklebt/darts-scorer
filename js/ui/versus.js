/* Spiele mit Freunden: VS-Intro mit den Bannern beider Spieler und der Warte-Bildschirm, bis der Freund die Einladung annimmt. */
import { S, nameOf } from '../store.js';
import { esc, matchSummary } from './common.js';
import { playerBanner } from './banner.js';
import { icon } from './svg.js';

const bannerOf = (m, pid, mine) => {
  const b = m.banners?.[pid];
  // eigenes Banner rot, Gegner weiß
  return playerBanner({ name: b?.name || nameOf(pid), avg: b?.avg ?? null, badges: b?.badges || [null, null, null], variant: mine ? '' : 'white', pic: b?.bot || null });
};

/** Vollbild: Banner oben, großes VS, Banner unten (bei mehr Spielern alle untereinander). Antippen schließt. */
export function vsView(m) {
  const parts = m.sides.map((side, i) => `<div class="vs-b" style="--i:${i}">${bannerOf(m, side[0], side.includes(S.mainId))}</div>`);
  return `<div class="vs-intro" data-act="vsClose">
    <div class="vs-in">${parts.join('<div class="vs-mid"><span>VS</span></div>')}</div>
    <p class="vs-tap">Antippen zum Starten</p>
  </div>`;
}

/** Gastgeber wartet, bis der Freund annimmt */
export function onlineWaitView(m) {
  const o = m.online;
  return `<main class="page onl-wait">
    <div class="ow-card">
      <div class="ow-pulse">${icon('signal', 2, 46)}</div>
      <h2 class="display">Warte auf ${esc(o.other || 'deinen Freund')}</h2>
      <p>${esc(matchSummary(m))} · jeder an seinem Gerät</p>
      <p class="foot">Die Einladung ist bei ${esc(o.other || 'deinem Freund')} angekommen, sobald er die App öffnet. Sie gilt 10 Minuten.</p>
    </div>
    <button class="btn line" data-act="abortForce">Einladung zurückziehen</button>
  </main>`;
}

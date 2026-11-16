/* Comic-Vollbild-Momente: 180, High Finish, Leg/Set gewonnen */
import { S, ui, nameOf, sideName } from '../store.js';
import * as X from '../x01.js';
import { esc } from './common.js';
import { burst, rocketDart } from './svg.js';

export function momentView() {
  const mo = ui.moment;
  if (!mo) return '';
  const m = S.current;
  if (mo.kind === '180') {
    return `<div class="moment" data-act="momentClose">
      ${burst()}<div>${rocketDart()}</div>
      <div class="mo-text"><div class="mo-big">180</div><div class="mo-sub">Maximum!</div><div class="mo-name">${esc(nameOf(mo.pid))}</div></div>
      <div class="mo-hint">Antippen zum Schließen</div>
    </div>`;
  }
  // Leg oder Set gewonnen (ggf. als High Finish)
  const sets = X.isSets(m);
  const prevSet = m.legs[m.legs.length - 2]?.set ?? 1;
  const stand = sets
    ? m.sides.map((_, s) => X.setsWon(m, s)).join(' : ') + ' Sets' + (mo.set ? '' : ` · ${m.sides.map((_, s) => X.legsInSet(m, s, prevSet)).join(' : ')} Legs`)
    : m.sides.map((_, s) => X.legsWon(m, s)).join(' : ') + ' Legs';
  const high = mo.score >= 100;
  const word = mo.set ? 'Set!' : 'Leg!';
  return `<div class="moment ${mo.set ? 'red' : ''}">
    ${burst(mo.set ? '#2f6fe4' : '#e5402c')}<div>${rocketDart()}</div>
    <div class="mo-text">
      <div class="mo-big ${high ? '' : 'word'}">${high ? mo.score : word}</div>
      <div class="mo-sub">${high ? `High Finish · ${word}` : `Checkout ${mo.score}`}</div>
      <div class="mo-name">${esc(sideName(m.sides[mo.s]))}</div>
      <div class="mo-info num">${m.sides[mo.s].length > 1 ? `${esc(nameOf(mo.pid))} · ` : ''}${mo.darts} Dart${mo.darts > 1 ? 's' : ''} · ${stand}</div>
    </div>
    <div class="mo-btns"><button class="btn gold" data-act="momentClose">Weiter</button><button class="btn textonly" data-act="undo">Rückgängig</button></div>
  </div>`;
}

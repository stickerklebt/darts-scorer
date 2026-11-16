/* Leg-/Set-Info nach einem Checkout (nach der Finish-Animation): Stand, Darts, Weiter, Rückgängig */
import { S, ui, nameOf, sideName } from '../store.js';
import * as X from '../x01.js';
import { esc, pcVars } from './common.js';
import { magicCorner, COLORS } from './svg.js';

export function momentView() {
  const mo = ui.moment;
  if (!mo || mo.kind !== 'leg') return '';
  const m = S.current;
  const sets = X.isSets(m);
  const prevSet = m.legs[m.legs.length - 2]?.set ?? 1;
  const stand = sets
    ? m.sides.map((_, s) => X.setsWon(m, s)).join(' : ') + ' Sets' + (mo.set ? '' : ` · ${m.sides.map((_, s) => X.legsInSet(m, s, prevSet)).join(' : ')} Legs`)
    : m.sides.map((_, s) => X.legsWon(m, s)).join(' : ') + ' Legs';
  return `<div class="moment" style="${pcVars(mo.s)}">
    <div class="mo-card">
      <span class="mo-fx l">${magicCorner()}</span><span class="mo-fx r">${magicCorner(COLORS.pink, COLORS.cyan)}</span>
      <div class="mo-big display">${mo.set ? 'Set!' : 'Leg!'}</div>
      <div class="mo-name">${esc(sideName(m.sides[mo.s]))}</div>
      <div class="mo-info num">Checkout ${mo.score} · ${m.sides[mo.s].length > 1 ? `${esc(nameOf(mo.pid))} · ` : ''}${mo.darts} Dart${mo.darts > 1 ? 's' : ''}</div>
      <div class="mo-stand num">${stand}</div>
    </div>
    <div class="mo-btns"><button class="btn red big" data-act="momentClose">Weiter</button><button class="btn textonly" data-act="undo">Rückgängig</button></div>
  </div>`;
}

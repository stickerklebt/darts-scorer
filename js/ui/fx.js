/* Animationen abspielen: Auswahl (js/fx.js) + Aufbau (fx-anims.js) + Ebene (fx-core.js). */
import * as A from './fx-anims.js';
import { play, stopFx, fxRunning } from './fx-core.js';
import { DURATION, pickAnim, poolFor } from '../fx.js';

let last = null;
export { stopFx, fxRunning };

/** Spielt die passende Animation zu einer Aufnahme. Gibt ein Promise zurück (sofort erfüllt, wenn keine passt). */
export function fxForTurn(game, turn, ctx) {
  const pool = poolFor(game, turn);
  if (!pool) return null;
  const name = pickAnim(pool, last);
  if (!name) return null;
  last = name;
  return play(name, A[name], DURATION[name], ctx);
}

/** Direkt eine bestimmte Animation abspielen (für Tests/Vorschau). */
export const fxPlay = (name, ctx) => play(name, A[name], DURATION[name], ctx);
